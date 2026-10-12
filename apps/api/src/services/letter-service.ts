import QRCode from 'qrcode';
import { getDb } from '../db.js';
import { config } from '../config.js';
import type { DatabaseAdapter } from '@ketvong/db';

interface GenerateLetterParams {
  code: string;
  title: string;
  displayName: string;
  amount: number;
  quantity: number;
  approvedAt: string | null;
  receiptToken: string;
}

function wrapTextToLines(text: string, maxCharsPerLine = 62): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Sinh thư cảm ơn SVG chuẩn vector khổ dọc độ phân giải cao (1240 x 1754 px)
 * Đáp ứng SRS-041: 1 template duy nhất, biến động, QR code đắp bằng code, cấm AI gen ảnh
 */
export async function generateThankYouLetterSvg(params: GenerateLetterParams, db?: DatabaseAdapter): Promise<string> {
  const database = db || getDb();

  // URL biên nhận để đắp vào QR code
  const receiptUrl = `${config.publicBaseUrl}/dong-gop/${params.code}#access=${params.receiptToken}`;

  // Sinh QR Code dạng SVG path thuần
  const qrSvgRaw = await QRCode.toString(receiptUrl, {
    type: 'svg',
    margin: 1,
    color: {
      dark: '#483426',
      light: '#ffffff',
    },
  });

  // Tách lấy phần nội dung SVG của QR code
  const qrSvgMatch = qrSvgRaw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  const qrInnerContent = qrSvgMatch ? qrSvgMatch[1] : '';

  // Lấy template từ database
  const templateRow = await database.queryOne<{ content: string }>(
    "SELECT content FROM templates WHERE key = 'letter_thank_you'"
  );

  const templateText = templateRow?.content ||
    'Ban tổ chức Workshop Kết Vòng xin chân thành tri ân tấm lòng hảo tâm của {{title}} {{name}} đã chung tay đóng góp {{amount}}đ vào quỹ workshop. Sự sẻ chia của {{title}} là nguồn động viên to lớn cho dự án.';

  const dateStr = params.approvedAt
    ? new Date(params.approvedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formattedAmount = `${params.amount.toLocaleString('vi-VN')} VNĐ`;

  const dynamicBody = templateText
    .replace(/{{title}}/g, params.title)
    .replace(/{{pronoun}}/g, params.title)
    .replace(/{{name}}/g, params.displayName)
    .replace(/{{amount}}/g, formattedAmount)
    .replace(/{{unit}}/g, params.quantity.toString())
    .replace(/{{code}}/g, params.code)
    .replace(/{{receipt_url}}/g, receiptUrl)
    .replace(/{{receiptUrl}}/g, receiptUrl)
    .replace(/{{date}}/g, dateStr);

  const bodyLines = wrapTextToLines(dynamicBody, 60);
  const bodyTspans = bodyLines
    .map((line, idx) => `<tspan x="620" dy="${idx === 0 ? 0 : 38}">${escapeXml(line)}</tspan>`)
    .join('\n      ');

  // SVG Khổ dọc: 1240 x 1754 (Tỷ lệ A4 chuẩn 150 DPI)
  // Palette từ SRS: Nền #fffdf9, Cam #ed7838, Chữ #483426, Viền #f2e8dc
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754" width="1240" height="1754">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito+Sans:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap');
      .title { font-family: 'Baloo 2', 'Nunito Sans', cursive, sans-serif; font-weight: 800; fill: #ed7838; text-anchor: middle; }
      .subtitle { font-family: 'Baloo 2', 'Nunito Sans', cursive, sans-serif; font-weight: 700; fill: #483426; text-anchor: middle; }
      .body-text { font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-weight: 400; fill: #483426; font-size: 24px; text-anchor: middle; }
      .donor-name { font-family: 'Baloo 2', 'Nunito Sans', cursive, sans-serif; font-weight: 800; fill: #483426; font-size: 46px; text-anchor: middle; }
      .amount-badge { font-family: 'Baloo 2', 'Nunito Sans', cursive, sans-serif; font-weight: 800; fill: #ffffff; font-size: 34px; text-anchor: middle; }
      .code-badge { font-family: 'Nunito Sans', monospace, sans-serif; font-weight: 700; fill: #796050; font-size: 17px; text-anchor: middle; }
      .footer-note { font-family: 'Nunito Sans', sans-serif; font-weight: 400; fill: #8c7362; font-size: 15px; text-anchor: middle; }
    </style>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ed7838" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#483426" flood-opacity="0.08" />
    </filter>
    <filter id="badgeShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#ed7838" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Nền giấy ngà ấm áp -->
  <rect width="1240" height="1754" fill="#fffdf9" />

  <!-- Khung viền ngoài thủ công -->
  <rect x="36" y="36" width="1168" height="1682" rx="32" fill="#faf6f0" stroke="#e6d7c3" stroke-width="2" />
  <rect x="52" y="52" width="1136" height="1650" rx="24" fill="#ffffff" stroke="#483426" stroke-width="2" />
  <rect x="64" y="64" width="1112" height="1626" rx="18" fill="none" stroke="#ed7838" stroke-width="1.5" stroke-dasharray="10 8" opacity="0.7" />

  <!-- Chuỗi hạt cườm trang trí 4 góc (Workshop theme) -->
  <!-- Góc trên trái -->
  <g transform="translate(74, 74)">
    <circle cx="12" cy="12" r="7" fill="#ed7838" />
    <circle cx="28" cy="12" r="5" fill="#f59e0b" />
    <circle cx="12" cy="28" r="5" fill="#10b981" />
    <circle cx="44" cy="12" r="4" fill="#0284c7" />
    <circle cx="12" cy="44" r="4" fill="#f43f5e" />
  </g>
  <!-- Góc trên phải -->
  <g transform="translate(1166, 74)">
    <circle cx="-12" cy="12" r="7" fill="#ed7838" />
    <circle cx="-28" cy="12" r="5" fill="#f59e0b" />
    <circle cx="-12" cy="28" r="5" fill="#10b981" />
    <circle cx="-44" cy="12" r="4" fill="#0284c7" />
    <circle cx="-12" cy="44" r="4" fill="#f43f5e" />
  </g>
  <!-- Góc dưới trái -->
  <g transform="translate(74, 1680)">
    <circle cx="12" cy="-12" r="7" fill="#ed7838" />
    <circle cx="28" cy="-12" r="5" fill="#f59e0b" />
    <circle cx="12" cy="-28" r="5" fill="#10b981" />
    <circle cx="44" cy="-12" r="4" fill="#0284c7" />
    <circle cx="12" cy="-44" r="4" fill="#f43f5e" />
  </g>
  <!-- Góc dưới phải -->
  <g transform="translate(1166, 1680)">
    <circle cx="-12" cy="-12" r="7" fill="#ed7838" />
    <circle cx="-28" cy="-12" r="5" fill="#f59e0b" />
    <circle cx="-12" cy="-28" r="5" fill="#10b981" />
    <circle cx="-44" cy="-12" r="4" fill="#0284c7" />
    <circle cx="-12" cy="-44" r="4" fill="#f43f5e" />
  </g>

  <!-- Khung Card Trung Tâm -->
  <rect x="96" y="96" width="1048" height="1562" rx="20" fill="#ffffff" filter="url(#cardShadow)" />

  <!-- Băng dán Washi Tape phong cách thủ công ở đỉnh card -->
  <g transform="translate(420, 80)">
    <rect x="0" y="0" width="400" height="40" rx="4" fill="#f4ebe1" stroke="#dfcebd" stroke-width="1" />
    <text x="200" y="26" font-family="'Nunito Sans', sans-serif" font-weight="800" font-size="15" fill="#b45309" letter-spacing="3" text-anchor="middle">WORKSHOP THIỆN NGUYỆN KẾT VÒNG</text>
  </g>

  <!-- Biểu tượng Logo Kết Vòng & Trái Tim Hạt Cườm -->
  <g transform="translate(620, 200)">
    <circle cx="0" cy="0" r="46" fill="#fef2f2" />
    <circle cx="0" cy="0" r="38" fill="none" stroke="#ed7838" stroke-width="2.5" stroke-dasharray="6 4" />
    <!-- Vòng hạt cườm mini xung quanh -->
    <circle cx="-24" cy="-18" r="4" fill="#f59e0b" />
    <circle cx="24" cy="-18" r="4" fill="#0284c7" />
    <circle cx="-28" cy="10" r="4" fill="#10b981" />
    <circle cx="28" cy="10" r="4" fill="#f43f5e" />
    <!-- Trái tim đỏ/cam ở tâm -->
    <path d="M-14 -6 C -14 -16, 0 -18, 0 -6 C 0 -18, 14 -16, 14 -6 C 14 8, 0 18, 0 18 C 0 18, -14 8, -14 -6 Z" fill="#ed7838" />
  </g>

  <!-- Tiêu đề Thư Cảm Ơn -->
  <text x="620" y="295" class="title" font-size="56" letter-spacing="2">THƯ CẢM ƠN</text>
  <text x="620" y="340" class="subtitle" font-size="22" letter-spacing="4" fill="#796050">CHỨNG NHẬN ĐÓNG GÓP THIỆN NGUYỆN</text>

  <!-- Dải hạt cườm phân cách -->
  <line x1="260" y1="375" x2="980" y2="375" stroke="#f2e8dc" stroke-width="2" />
  <circle cx="560" cy="375" r="5" fill="#ed7838" />
  <circle cx="590" cy="375" r="5" fill="#f59e0b" />
  <circle cx="620" cy="375" r="6" fill="#ed7838" />
  <circle cx="650" cy="375" r="5" fill="#10b981" />
  <circle cx="680" cy="375" r="5" fill="#0284c7" />

  <!-- Phần Tri Ân Người Ủng Hộ -->
  <text x="620" y="440" font-family="'Nunito Sans', sans-serif" font-weight="700" font-size="18" fill="#8c7362" letter-spacing="3" text-anchor="middle">TRÂN TRỌNG TRI ÂN TẤM LÒNG VÀNG CỦA</text>
  <text x="620" y="505" class="donor-name">${escapeXml(params.title)} ${escapeXml(params.displayName)}</text>

  <!-- Khung Badge Số Tiền Đóng Góp Nổi Bật -->
  <rect x="270" y="545" width="700" height="84" rx="42" fill="url(#headerGrad)" filter="url(#badgeShadow)" />
  <text x="620" y="600" class="amount-badge">ĐÃ CHUNG TAY ỦNG HỘ ${formattedAmount}</text>
  <text x="620" y="662" font-family="'Nunito Sans', sans-serif" font-weight="700" font-size="20" fill="#ed7838" text-anchor="middle">(Tương ứng ${params.quantity} chiếc vòng tay yêu thương gửi trao)</text>

  <!-- Tag Mã Định Danh & Ngày Xác Nhận -->
  <rect x="360" y="695" width="520" height="38" rx="19" fill="#faf6f0" stroke="#e6d7c3" stroke-width="1.5" />
  <text x="620" y="720" class="code-badge">MÃ ỦNG HỘ: ${params.code} &bull; NGÀY: ${dateStr}</text>

  <!-- Nội dung lời cảm ơn vector thuần (Không dùng foreignObject để tương thích 100% canvas) -->
  <text x="620" y="795" class="body-text">
      ${bodyTspans}
  </text>

  <!-- Trích dẫn / Khẩu hiệu workshop -->
  <rect x="180" y="990" width="880" height="66" rx="18" fill="#fdfaf6" stroke="#f2e8dc" stroke-width="1.5" />
  <text x="620" y="1032" font-family="'Nunito Sans', sans-serif" font-style="italic" font-weight="700" font-size="21" fill="#ed7838" text-anchor="middle">&ldquo;Mỗi hạt cườm gửi trao &mdash; Một nhịp cầu yêu thương kết nối&rdquo;</text>

  <!-- Khung Chân Trang: QR Code, Con Dấu, Chữ Ký -->
  <!-- Khung QR Code bên trái -->
  <g transform="translate(180, 1100)">
    <rect x="0" y="0" width="260" height="320" rx="20" fill="#ffffff" stroke="#e6d7c3" stroke-width="2" />
    <g transform="translate(25, 20) scale(4.4)">
      ${qrInnerContent}
    </g>
    <text x="130" y="275" font-family="'Nunito Sans', sans-serif" font-weight="700" font-size="14" fill="#483426" text-anchor="middle">QUÉT MÃ ĐỐI CHIẾU</text>
    <text x="130" y="297" font-family="'Nunito Sans', sans-serif" font-size="12" fill="#8c7362" text-anchor="middle">Xác thực tại ketvong.vn</text>
  </g>

  <!-- Con dấu tròn chứng nhận đỏ ở giữa (Vector Stamp) -->
  <g transform="translate(620, 1260) rotate(-5)">
    <circle cx="0" cy="0" r="78" fill="none" stroke="#dc2626" stroke-width="4" stroke-dasharray="8 4" opacity="0.85" />
    <circle cx="0" cy="0" r="70" fill="none" stroke="#dc2626" stroke-width="2" opacity="0.85" />
    <circle cx="0" cy="0" r="48" fill="none" stroke="#dc2626" stroke-width="1.5" opacity="0.85" />
    <!-- Ngôi sao đỏ ở giữa -->
    <path d="M0 -14 L4 -4 L14 -4 L6 2 L9 12 L0 6 L-9 12 L-6 2 L-14 -4 L-4 -4 Z" fill="#dc2626" opacity="0.9" />
    <text x="0" y="-22" font-family="'Nunito Sans', sans-serif" font-weight="800" font-size="11" fill="#dc2626" text-anchor="middle" letter-spacing="1">DỰ ÁN KẾT VÒNG</text>
    <text x="0" y="24" font-family="'Nunito Sans', sans-serif" font-weight="800" font-size="10" fill="#dc2626" text-anchor="middle" letter-spacing="1">ĐÃ ĐỐI SOÁT</text>
    <text x="0" y="38" font-family="'Nunito Sans', sans-serif" font-weight="700" font-size="9" fill="#dc2626" text-anchor="middle" letter-spacing="1">NGHỊ ĐỊNH 93</text>
  </g>

  <!-- Khối Chữ Ký Ban Tổ Chức bên phải -->
  <g transform="translate(920, 1120)">
    <text x="0" y="0" font-family="'Nunito Sans', sans-serif" font-weight="700" font-size="17" fill="#796050" text-anchor="middle">ĐẠI DIỆN BAN TỔ CHỨC</text>
    <!-- Nét ký cách điệu nghệ thuật -->
    <path d="M-50 85 Q-15 45 15 90 T75 70" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
    <path d="M-30 105 Q15 75 55 110" fill="none" stroke="#ed7838" stroke-width="2" stroke-linecap="round" opacity="0.75" />
    <text x="0" y="160" font-family="'Nunito Sans', sans-serif" font-weight="800" font-size="20" fill="#483426" text-anchor="middle">NGUYỄN THANH TRÚC</text>
    <text x="0" y="188" font-family="'Nunito Sans', sans-serif" font-weight="600" font-size="15" fill="#796050" text-anchor="middle">Trưởng Ban Tổ Chức Dự Án</text>
  </g>

  <!-- Dòng thông tin chân trang -->
  <line x1="160" y1="1480" x2="1080" y2="1480" stroke="#f2e8dc" stroke-width="1.5" />
  <text x="620" y="1525" class="footer-note">Workshop Dự Án Sinh Viên SSG105 &bull; Đại học FPT TP.HCM &bull; Ngày tổ chức: 24/10/2026</text>
  <text x="620" y="1550" class="footer-note" font-size="13" fill="#a89485">Tuân thủ quy chế vận động thiện nguyện Nghị định 93/2021/NĐ-CP &amp; Bảo vệ dữ liệu Nghị định 13/2023/NĐ-CP</text>
</svg>`;

  return svg;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
