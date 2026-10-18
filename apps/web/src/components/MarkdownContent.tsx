import React from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Chuẩn hóa văn bản: giải mã \n chuỗi escape thành ký tự xuống dòng thực tế
export function normalizeMarkdown(text: string): string {
  if (!text) return '';
  let str = text;
  if (str.includes('\\n')) {
    str = str.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  }
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

type InlineToken =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'bold_italic'; content: string }
  | { type: 'code'; content: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'image'; alt: string; src: string };

const INLINE_REGEX =
  /(!?\[([^\]]*?)\]\(([^)]*?)\))|(\*\*\*([\s\S]*?)\*\*\*)|(_{3}([\s\S]*?)_{3})|(\*\*([\s\S]*?)\*\*)|(_{2}([\s\S]*?)_{2})|(\*([^*\n]+?)\*)|(_([^_\n]+?)_)|(`([^`\n]+?)`)/g;

function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_REGEX.lastIndex = 0;

  while ((match = INLINE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1] && match[1].startsWith('!')) {
      // Inline image ![alt](url)
      tokens.push({ type: 'image', alt: match[2] || '', src: match[3] || '' });
    } else if (match[1]) {
      // Link [text](url)
      tokens.push({ type: 'link', text: match[2] || '', href: match[3] || '' });
    } else if (match[4] || match[6]) {
      // Bold Italic ***text*** or ___text___
      tokens.push({ type: 'bold_italic', content: match[5] || match[7] || '' });
    } else if (match[8] || match[10]) {
      // Bold **text** or __text__
      tokens.push({ type: 'bold', content: match[9] || match[11] || '' });
    } else if (match[12] || match[14]) {
      // Italic *text* or _text_
      tokens.push({ type: 'italic', content: match[13] || match[15] || '' });
    } else if (match[16]) {
      // Inline code `code`
      tokens.push({ type: 'code', content: match[17] || '' });
    }

    lastIndex = INLINE_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return tokens;
}

export function renderInlineNodes(tokens: InlineToken[], parentKey = 'inline'): React.ReactNode[] {
  return tokens.map((token, idx) => {
    const key = `${parentKey}-${idx}`;
    switch (token.type) {
      case 'bold_italic':
        return (
          <strong key={key} className="font-extrabold text-[var(--kv-ink)]">
            <em className="italic">{renderInlineNodes(parseInlineTokens(token.content), `${key}-bi`)}</em>
          </strong>
        );
      case 'bold':
        return (
          <strong key={key} className="font-bold text-[var(--kv-ink)]">
            {renderInlineNodes(parseInlineTokens(token.content), `${key}-b`)}
          </strong>
        );
      case 'italic':
        return (
          <em key={key} className="italic">
            {renderInlineNodes(parseInlineTokens(token.content), `${key}-i`)}
          </em>
        );
      case 'code':
        return (
          <code
            key={key}
            className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[var(--kv-pink-fg)] font-mono text-[0.85em] border border-gray-200"
          >
            {token.content}
          </code>
        );
      case 'link': {
        const isExternal = token.href.startsWith('http://') || token.href.startsWith('https://');
        return (
          <a
            key={key}
            href={token.href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="text-[var(--kv-pink)] hover:underline font-semibold"
          >
            {renderInlineNodes(parseInlineTokens(token.text), `${key}-a`)}
          </a>
        );
      }
      case 'image':
        return (
          <img
            key={key}
            src={token.src}
            alt={token.alt}
            className="inline-block max-h-48 rounded-xl my-1 object-contain"
            loading="lazy"
          />
        );
      case 'text':
      default:
        return token.content;
    }
  });
}

type MarkdownBlock =
  | { type: 'heading'; level: number; content: string }
  | { type: 'blockquote'; content: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'image'; alt: string; src: string }
  | { type: 'code_block'; lang: string; content: string }
  | { type: 'hr' }
  | { type: 'paragraph'; content: string };

function parseBlocks(markdown: string): MarkdownBlock[] {
  const text = normalizeMarkdown(markdown);
  const rawLines = text.split('\n');
  const blocks: MarkdownBlock[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Dòng trống
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced code block (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++; // Bỏ qua dòng đóng ```
      blocks.push({ type: 'code_block', lang, content: codeLines.join('\n') });
      continue;
    }

    // 3. Headings (# H1, ## H2, ### H3, #### H4)
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        blocks.push({
          type: 'heading',
          level: match[1].length,
          content: match[2],
        });
        i++;
        continue;
      }
    }

    // 4. Ảnh độc lập dạng block: ![alt](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      blocks.push({
        type: 'image',
        alt: imgMatch[1],
        src: imgMatch[2],
      });
      i++;
      continue;
    }

    // 5. Đường kẻ ngang (--- hoặc *** hoặc ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 6. Trích dẫn Blockquote (hỗ trợ nhiều dòng liên tiếp)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        content: quoteLines.join('\n'),
      });
      continue;
    }

    // 7. Danh sách không thứ tự (- hoặc *)
    if (/^[\*\-]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < rawLines.length && /^[\*\-]\s+/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^[\*\-]\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'ul',
        items,
      });
      continue;
    }

    // 8. Danh sách có thứ tự (1. 2. 3.)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < rawLines.length && /^\d+\.\s+/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'ol',
        items,
      });
      continue;
    }

    // 9. Đoạn văn thường (gộp các dòng liền kề cho đến khi gặp dòng trống hoặc block khác)
    const pLines: string[] = [];
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !rawLines[i].trim().startsWith('#') &&
      !rawLines[i].trim().startsWith('>') &&
      !rawLines[i].trim().startsWith('```') &&
      !/^[\*\-]\s+/.test(rawLines[i].trim()) &&
      !/^\d+\.\s+/.test(rawLines[i].trim()) &&
      !rawLines[i].trim().match(/^!\[(.*?)\]\((.*?)\)$/) &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(rawLines[i].trim())
    ) {
      pLines.push(rawLines[i].trim());
      i++;
    }
    blocks.push({
      type: 'paragraph',
      content: pLines.join(' '),
    });
  }

  return blocks;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className={`prose-kv space-y-4 ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const inlineNodes = renderInlineNodes(parseInlineTokens(block.content), `h-${idx}`);
            if (block.level === 1) {
              return (
                <h1 key={idx} className="font-display font-black text-2xl sm:text-3xl text-[var(--kv-ink)] mt-8 mb-4">
                  {inlineNodes}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2
                  key={idx}
                  className="font-display font-extrabold text-xl sm:text-2xl text-[var(--kv-ink)] mt-8 mb-4 pb-2 border-b border-[var(--color-border)]"
                >
                  {inlineNodes}
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3 key={idx} className="font-display font-bold text-lg sm:text-xl text-[var(--kv-ink)] mt-6 mb-3">
                  {inlineNodes}
                </h3>
              );
            }
            return (
              <h4 key={idx} className="font-display font-bold text-base sm:text-lg text-[var(--kv-ink)] mt-4 mb-2">
                {inlineNodes}
              </h4>
            );
          }

          case 'blockquote': {
            const inlineNodes = renderInlineNodes(parseInlineTokens(block.content), `quote-${idx}`);
            return (
              <blockquote
                key={idx}
                className="pl-4 py-2.5 my-4 border-l-4 border-[var(--kv-pink)] bg-[var(--kv-pink-bg)] text-xs sm:text-sm font-medium text-[var(--kv-ink)] rounded-r-2xl italic leading-relaxed font-body"
              >
                {inlineNodes}
              </blockquote>
            );
          }

          case 'ul':
            return (
              <ul key={idx} className="list-disc pl-6 my-3 space-y-1.5 font-body">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="text-xs sm:text-sm text-[var(--kv-text)] leading-relaxed">
                    {renderInlineNodes(parseInlineTokens(item), `ul-${idx}-${itemIdx}`)}
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={idx} className="list-decimal pl-6 my-3 space-y-1.5 font-body">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="text-xs sm:text-sm text-[var(--kv-text)] leading-relaxed">
                    {renderInlineNodes(parseInlineTokens(item), `ol-${idx}-${itemIdx}`)}
                  </li>
                ))}
              </ol>
            );

          case 'image':
            return (
              <figure
                key={idx}
                className="my-6 rounded-3xl overflow-hidden border border-[var(--color-border)] shadow-xs bg-gray-50 max-w-2xl mx-auto"
              >
                <img
                  src={block.src}
                  alt={block.alt}
                  className="w-full h-auto object-cover max-h-[460px]"
                  loading="lazy"
                />
                {block.alt && (
                  <figcaption className="text-xs text-center text-[var(--kv-text-soft)] py-2.5 px-4 bg-[var(--kv-paper)] border-t border-[var(--color-border)] font-body italic">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );

          case 'code_block':
            return (
              <pre
                key={idx}
                className="bg-[#1E1E2E] text-[#CDD6F4] p-4 rounded-2xl overflow-x-auto text-xs font-mono my-4 border border-gray-700 shadow-inner"
              >
                <code>{block.content}</code>
              </pre>
            );

          case 'hr':
            return <hr key={idx} className="my-8 border-t-2 border-dashed border-[var(--color-border)]" />;

          case 'paragraph':
          default:
            return (
              <p
                key={idx}
                className="text-xs sm:text-sm text-[var(--kv-text)] leading-relaxed sm:leading-loose my-3 font-body"
              >
                {renderInlineNodes(parseInlineTokens(block.content), `p-${idx}`)}
              </p>
            );
        }
      })}
    </div>
  );
};
