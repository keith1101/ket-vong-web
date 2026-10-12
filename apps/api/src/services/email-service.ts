import { getDb } from '../db.js';
import { config } from '../config.js';
import type { DatabaseAdapter } from '@ketvong/db';

interface SendThankYouEmailParams {
  donationId: string;
  code: string;
  email: string;
  title: string;
  name: string;
  amount: number;
  quantity: number;
  receiptToken: string;
}

interface SendCheckoutStartedEmailParams {
  donationId: string;
  code: string;
  email: string;
  title: string;
  name: string;
  amount: number;
  quantity: number;
  checkoutUrl?: string;
}

/**
 * Email kiểm thử gửi ngay sau khi tạo link thanh toán.
 * Không phải email xác nhận đã nhận tiền và không chứa receipt token.
 */
export async function sendCheckoutStartedEmail(
  params: SendCheckoutStartedEmailParams,
  db?: DatabaseAdapter
): Promise<boolean> {
  if (!params.email || !params.email.trim()) return false;

  const database = db || getDb();
  const formattedAmount = params.amount.toLocaleString('vi-VN');
  const subject = '[Kết Vòng] Đã tạo yêu cầu ủng hộ của bạn';
  const body = `Chào ${params.title} ${params.name},

Hệ thống đã tạo yêu cầu ủng hộ ${params.quantity} chiếc vòng tay, số tiền ${formattedAmount}đ.

Mã ủng hộ: ${params.code}
${params.checkoutUrl
  ? `Bạn vui lòng hoàn tất ủng hộ qua liên kết bảo mật này:
${params.checkoutUrl}

Đây chưa phải xác nhận đã nhận tiền. Email cảm ơn và biên nhận sẽ được gửi sau khi hệ thống xác nhận lượt ủng hộ thành công.`
  : 'Đây là email kiểm thử trước khi tích hợp cổng ủng hộ. Hệ thống chưa xác nhận đã nhận tiền và chưa phát hành biên nhận.'}

Trân trọng,
Ban Tổ Chức Workshop Kết Vòng`;
  const messageId = `<checkout-${params.code}@ketvong.vn>`;
  const now = new Date().toISOString();
  const logId = crypto.randomUUID();

  const hasGmailConfig = Boolean(
    config.gmail.clientId &&
    config.gmail.clientSecret &&
    config.gmail.refreshToken &&
    config.gmail.senderEmail &&
    !config.gmail.clientId.includes('your_google_client_id_here') &&
    !config.gmail.clientId.includes('your-google-client-id')
  );

  if (!hasGmailConfig) {
    console.log(`[Email] Đã ghi nhận email checkout mô phỏng cho donation ${params.donationId}.`);
    await database.execute(
      `INSERT INTO email_logs (id, donation_id, recipient_email, subject, status, error_message, message_id, sent_at)
       VALUES (?, ?, ?, ?, 'success', 'Simulated on localhost (no OAuth2 token)', ?, ?)`,
      [logId, params.donationId, params.email, subject, messageId, now]
    );
    return true;
  }

  try {
    const accessToken = await getGmailAccessToken();
    const rawEmail = makeRawEmail({
      to: params.email,
      from: config.gmail.senderEmail,
      subject,
      body,
      htmlBody: renderCheckoutHtml(body, `${config.publicBaseUrl}/dong-gop/${params.code}`),
      messageId,
    });
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawEmail }),
    });
    if (!response.ok) throw new Error(`Gmail API HTTP ${response.status}: ${await response.text()}`);

    await database.execute(
      `INSERT INTO email_logs (id, donation_id, recipient_email, subject, status, error_message, message_id, sent_at)
       VALUES (?, ?, ?, ?, 'success', NULL, ?, ?)`,
      [logId, params.donationId, params.email, subject, messageId, now]
    );
    return true;
  } catch (error: any) {
    await database.execute(
      `INSERT INTO email_logs (id, donation_id, recipient_email, subject, status, error_message, message_id, sent_at)
       VALUES (?, ?, ?, ?, 'failed', ?, ?, ?)`,
      [logId, params.donationId, params.email, subject, error?.message || 'Lỗi không xác định', messageId, now]
    );
    console.error('[Checkout Email] Lỗi gửi Gmail:', error);
    return false;
  }
}

export async function sendThankYouEmail(params: SendThankYouEmailParams, db?: DatabaseAdapter): Promise<boolean> {
  if (!params.email || !params.email.trim()) {
    console.warn(`[Email] Bỏ qua gửi email cho donation ${params.donationId} do không có địa chỉ email.`);
    return false;
  }

  const database = db || getDb();
  const receiptUrl = `${config.publicBaseUrl}/dong-gop/${params.code}#access=${params.receiptToken}`;

  // Lấy template từ database (SRS-050)
  const templateRow = await database.queryOne<{ subject: string; content: string }>(
    "SELECT subject, content FROM templates WHERE key = 'email_thank_you'"
  );

  const rawSubject = templateRow?.subject || '';
  const rawContent = templateRow?.content || '';
  if (!rawSubject || !rawContent) throw new Error('Chưa cấu hình mẫu email cảm ơn trong trang quản trị.');

  const dateStr = new Date().toLocaleDateString('vi-VN');
  const formattedAmount = params.amount.toLocaleString('vi-VN');

  const subject = rawSubject
    .replace(/{{title}}/g, params.title)
    .replace(/{{pronoun}}/g, params.title)
    .replace(/{{name}}/g, params.name)
    .replace(/{{amount}}/g, formattedAmount)
    .replace(/{{unit}}/g, params.quantity.toString())
    .replace(/{{code}}/g, params.code)
    .replace(/{{date}}/g, dateStr)
    .replace(/{{receipt_url}}/g, receiptUrl)
    .replace(/{{receiptUrl}}/g, receiptUrl);

  const content = rawContent
    .replace(/{{title}}/g, params.title)
    .replace(/{{pronoun}}/g, params.title)
    .replace(/{{name}}/g, params.name)
    .replace(/{{amount}}/g, formattedAmount)
    .replace(/{{unit}}/g, params.quantity.toString())
    .replace(/{{code}}/g, params.code)
    .replace(/{{date}}/g, dateStr)
    .replace(/{{receipt_url}}/g, receiptUrl)
    .replace(/{{receiptUrl}}/g, receiptUrl);

  const htmlContent = renderThankYouHtml(content, receiptUrl, {
    title: params.title,
    name: params.name,
    amount: params.amount,
    quantity: params.quantity,
    code: params.code,
    dateStr,
  });

  const messageId = `<donation-${params.code}@ketvong.vn>`;
  const now = new Date().toISOString();
  const logId = crypto.randomUUID();

  // Kiểm tra xem cấu hình Gmail OAuth2 có thực sự sẵn sàng không
  const hasGmailConfig = 
    config.gmail.clientId && 
    config.gmail.clientSecret && 
    config.gmail.refreshToken &&
    !config.gmail.clientId.includes('your-google-client-id');

  if (!hasGmailConfig) {
    // Chế độ mô phỏng / Localhost dev: Ghi log console chi tiết và lưu EMAIL_LOG
    console.log(`[Email] Đã ghi nhận email mô phỏng cho donation ${params.donationId}.`);

    await database.execute(
      `INSERT INTO email_logs (id, donation_id, recipient_email, subject, status, error_message, message_id, sent_at)
       VALUES (?, ?, ?, ?, 'success', 'Simulated on localhost (no OAuth2 token)', ?, ?)`,
      [logId, params.donationId, params.email, subject, messageId, now]
    );

    return true;
  }

  // Nếu đã cấu hình Gmail OAuth2 thực tế:
  try {
    const accessToken = await getGmailAccessToken();
    const rawEmail = makeRawEmail({
      to: params.email,
      from: config.gmail.senderEmail,
      subject,
      body: content,
      htmlBody: htmlContent,
      messageId,
    });

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawEmail }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gmail API HTTP ${res.status}: ${errText}`);
    }

    await database.execute(
      `INSERT INTO email_logs (id, donation_id, recipient_email, subject, status, error_message, message_id, sent_at)
       VALUES (?, ?, ?, ?, 'success', NULL, ?, ?)`,
      [logId, params.donationId, params.email, subject, messageId, now]
    );
    return true;
  } catch (error: any) {
    console.error('[Email Service] Lỗi gửi mail qua Gmail API:', error);
    await database.execute(
      `INSERT INTO email_logs (id, donation_id, recipient_email, subject, status, error_message, message_id, sent_at)
       VALUES (?, ?, ?, ?, 'failed', ?, ?, ?)`,
      [logId, params.donationId, params.email, subject, 'EMAIL_PROVIDER_ERROR', messageId, now]
    );
    return false;
  }
}

async function getGmailAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.gmail.clientId,
      client_secret: config.gmail.clientSecret,
      refresh_token: config.gmail.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Không lấy được access token từ Google OAuth2: ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function makeRawEmail(args: {
  to: string;
  from: string;
  subject: string;
  body: string;
  htmlBody?: string;
  messageId: string;
}): string {
  const utf8Subject = `=?utf-8?B?${base64Utf8(args.subject)}?=`;
  const encodedFromName = `=?UTF-8?B?${base64Utf8('Kết Vòng')}?=`;
  const boundary = `=_KetVong_${crypto.randomUUID()}`;
  const emailLines = [
    `To: ${args.to}`,
    `From: ${encodedFromName} <${args.from}>`,
    `Subject: ${utf8Subject}`,
    `Message-ID: ${args.messageId}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Utf8(args.body),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Utf8(args.htmlBody || textToHtml(args.body)),
    `--${boundary}--`,
  ];

  return base64Utf8(emailLines.join('\r\n'))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface ThankYouEmailMeta {
  title?: string;
  name?: string;
  amount?: number | string;
  quantity?: number | string;
  code?: string;
  dateStr?: string;
}

/**
 * Thiết kế Thư Cảm Ơn dạng HTML gửi qua email, đồng bộ 100% với giao diện
 * Chứng nhận Thư Cảm Ơn (ReceiptPage / letter-service) và Bộ nhận diện Crayon Rainbow:
 * - Tông giấy ngà ấm (#FFF8EE, #FBF6EE) viền nét thủ công đứt nét (#DCCBB5)
 * - Hạt cườm Crayon 4 góc (#D81B7A, #E59E1A, #12A84B, #1F3F9E, #1E88E5)
 * - Washi tape Workshop Thiện Nguyện Kết Vòng & Trái tim hạt cườm
 * - Tiêu đề THƯ CẢM ƠN • CHỨNG NHẬN ĐÓNG GÓP THIỆN NGUYỆN
 * - Vinh danh người ủng hộ {{title}} {{name}}
 * - Pill badge màu hồng Crayon nổi bật số tiền đóng góp {{amount}} VNĐ
 * - Mã ủng hộ {{code}} & Ngày xác nhận {{date}}
 * - Khẩu hiệu “Mỗi hạt cườm gửi trao — Một nhịp cầu yêu thương kết nối”
 * - Nút bấm lớn xem Thư cảm ơn & Biên nhận điện tử
 * - Con dấu đỏ đối soát Nghị định 93 & Chữ ký đại diện BTC Nguyễn Thanh Trúc
 * - Ghi chú tuân thủ NĐ 93/2021/NĐ-CP & NĐ 13/2023/NĐ-CP
 * Sử dụng thẻ table lồng nhau và inline CSS an toàn tuyệt đối với mọi mail client (Gmail, Outlook, Apple Mail).
 */
export function renderThankYouHtml(
  content: string,
  receiptUrl: string,
  meta?: ThankYouEmailMeta
): string {
  // Trích xuất hoặc lấy thông tin người ủng hộ
  let donorName = meta?.name
    ? `${meta.title ? meta.title + ' ' : ''}${meta.name}`.trim()
    : '';
  let code = meta?.code || '';
  let amountStr = typeof meta?.amount === 'number'
    ? meta.amount.toLocaleString('vi-VN')
    : (meta?.amount ? String(meta.amount) : '');
  let quantity = meta?.quantity ? String(meta.quantity) : '';
  let dateStr = meta?.dateStr || new Date().toLocaleDateString('vi-VN');

  // Fallback nếu meta không được truyền
  if (!donorName) {
    const greetingMatch = content.match(/Chào\s+([^\n,]+)/i);
    if (greetingMatch) donorName = greetingMatch[1].trim();
    else donorName = 'Quý Nhà Hảo Tâm';
  }
  if (!code) {
    const codeMatch = content.match(/KV-[2-9A-HJ-NP-Z]{6}/i);
    if (codeMatch) code = codeMatch[0];
  }
  if (!amountStr) {
    const amountMatch = content.match(/([0-9]{1,3}(?:\.[0-9]{3})+)\s*(?:đ|VNĐ)/i);
    if (amountMatch) amountStr = amountMatch[1];
  }
  if (!quantity) {
    const unitMatch = content.match(/tương ứng\s*(\d+)\s*chiếc vòng/i);
    if (unitMatch) quantity = unitMatch[1];
    else quantity = '1';
  }

  // Làm sạch phần nội dung văn bản để không bị lặp các trường đã có trong thẻ chứng nhận
  let cleaned = content
    .replaceAll(receiptUrl, '')
    .replace(/{{receipt_url}}/gi, '')
    .replace(/{{receiptUrl}}/gi, '')
    .replace(/{{receipt_link}}/gi, '')
    .replace(/Xem biên nhận minh bạch và tải Thư cảm ơn tại:?/gi, '')
    .replace(/Nếu nút không hoạt động.*?(\r?\n|$)/gi, '')
    .replace(/Mã ủng hộ của bạn:?\s*[^\r\n]*/gi, '')
    .replace(/Trân trọng,?\s*Ban Tổ Chức Workshop Kết Vòng/gi, '')
    .trim();

  const rawParagraphs = cleaned
    .split(/\r?\n\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith('http') && !p.includes('{{receipt_url}}') && !p.includes('{{receiptUrl}}'));

  let messageHtml = '';
  if (rawParagraphs.length > 0) {
    messageHtml = rawParagraphs
      .map((p) => `<p style="margin:0 0 10px 0;font-size:14px;line-height:1.7;color:#3D2B1F;">${textToHtml(p)}</p>`)
      .join('');
  } else {
    messageHtml = `
      <p style="margin:0 0 10px 0;font-size:14px;line-height:1.7;color:#3D2B1F;">
        Ban tổ chức Dự án Workshop Kết Vòng xin chân thành cảm ơn sự sẻ chia ấm áp và tấm lòng nhân ái của <strong>${escapeHtml(donorName)}</strong>.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#7A6A5E;">
        Mỗi chiếc vòng tay thủ công được xâu kết hôm nay là một nhịp cầu yêu thương gửi trao, góp phần mang đến niềm vui, nụ cười và thắp sáng niềm tin hy vọng cho các em nhỏ đang điều trị.
      </p>
    `;
  }

  return `<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thư Cảm Ơn — Dự Án Workshop Kết Vòng</title>
</head>
<body style="margin:0;padding:0;background-color:#FFF8EE;color:#3D2B1F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;">
  <!-- Bọc ngoài toàn email -->
  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFF8EE" style="background-color:#FFF8EE;padding:32px 12px;">
    <tr>
      <td align="center">
        <!-- Khung Khổ Rộng 600px - Tông Giấy Kem Crayon -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FBF6EE;border:2px solid #E8DCC8;border-radius:24px;box-shadow:0 8px 24px rgba(61,43,31,0.06);overflow:hidden;">
          <tr>
            <td style="padding:16px 14px 6px 14px;">
              <!-- Hàng hạt cườm trang trí góc trên -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="padding-left:4px;">
                    <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background-color:#D81B7A;margin-right:3px;"></span>
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#E59E1A;margin-right:3px;"></span>
                    <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:#12A84B;margin-right:3px;"></span>
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:#1F3F9E;"></span>
                  </td>
                  <td align="right" style="padding-right:4px;">
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:#1F3F9E;margin-right:3px;"></span>
                    <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:#12A84B;margin-right:3px;"></span>
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#E59E1A;margin-right:3px;"></span>
                    <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background-color:#D81B7A;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 14px 20px 14px;">
              <!-- Khung giấy viền đứt nét thủ công bên trong -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:2px dashed #DCCBB5;border-radius:18px;text-align:center;">
                <tr>
                  <td style="padding:28px 20px 24px 20px;text-align:center;">

                    <!-- Băng dán Washi Tape phong cách Workshop -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 14px auto;">
                      <tr>
                        <td style="background-color:#EAF0FF;border:1px solid #C5D7FE;border-radius:9999px;padding:6px 18px;color:#1F3F9E;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">
                          ✦ Workshop Thiện Nguyện Kết Vòng ✦
                        </td>
                      </tr>
                    </table>

                    <!-- Biểu tượng trái tim hạt cườm -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 12px auto;">
                      <tr>
                        <td align="center" valign="middle" style="width:52px;height:52px;background-color:#FDF0F6;border:2px solid #F9A8D4;border-radius:50%;text-align:center;">
                          <span style="font-size:24px;color:#D81B7A;line-height:52px;display:inline-block;">&#10084;</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Tiêu đề Thư Cảm Ơn -->
                    <h1 style="margin:0;font-size:30px;font-weight:900;color:#1F3F9E;letter-spacing:2px;text-transform:uppercase;font-family:'Segoe UI',Arial,sans-serif;">
                      THƯ CẢM ƠN
                    </h1>
                    <div style="margin:4px 0 0 0;font-size:11px;font-weight:800;color:#7A6A5E;letter-spacing:3px;text-transform:uppercase;">
                      CHỨNG NHẬN ĐÓNG GÓP THIỆN NGUYỆN
                    </div>

                    <!-- Dải phân cách hạt cườm -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:16px auto;">
                      <tr>
                        <td valign="middle"><div style="height:1px;width:45px;background-color:#E8DCC8;"></div></td>
                        <td valign="middle" style="padding:0 8px;">
                          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:#D81B7A;margin:0 2px;"></span>
                          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:#E59E1A;margin:0 2px;"></span>
                          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#1F3F9E;margin:0 2px;"></span>
                          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:#12A84B;margin:0 2px;"></span>
                          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:#1E88E5;margin:0 2px;"></span>
                        </td>
                        <td valign="middle"><div style="height:1px;width:45px;background-color:#E8DCC8;"></div></td>
                      </tr>
                    </table>

                    <!-- Tri ân người ủng hộ -->
                    <div style="font-size:11px;font-weight:700;color:#7A6A5E;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">
                      TRÂN TRỌNG TRI ÂN TẤM LÒNG VÀNG CỦA
                    </div>
                    <div style="font-size:26px;font-weight:900;color:#1F3F9E;line-height:1.3;margin-bottom:16px;">
                      ${escapeHtml(donorName)}
                    </div>

                    <!-- Khung số tiền đóng góp nổi bật (Pink Crayon Pill Badge) -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 6px auto;">
                      <tr>
                        <td style="background-color:#D81B7A;border-radius:9999px;padding:12px 24px;text-align:center;box-shadow:0 4px 12px rgba(216,27,122,0.2);">
                          <span style="color:#FFFFFF;font-size:18px;font-weight:900;letter-spacing:0.5px;">
                            ĐÃ CHUNG TAY ỦNG HỘ ${escapeHtml(amountStr)} VNĐ
                          </span>
                        </td>
                      </tr>
                    </table>
                    <div style="font-size:13px;font-weight:700;color:#C9610A;margin-bottom:16px;">
                      (Tương ứng ${escapeHtml(quantity)} chiếc vòng tay yêu thương gửi trao)
                    </div>

                    <!-- Tag Mã định danh và Ngày xác nhận -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 18px auto;">
                      <tr>
                        <td style="background-color:#FBF6EE;border:1px solid #E8DCC8;border-radius:9999px;padding:6px 14px;font-size:11px;color:#3D2B1F;font-family:'Consolas',monospace;font-weight:700;">
                          MÃ ỦNG HỘ: <strong style="color:#C9610A;">${escapeHtml(code)}</strong>
                        </td>
                        <td style="width:8px;"></td>
                        <td style="background-color:#FBF6EE;border:1px solid #E8DCC8;border-radius:9999px;padding:6px 14px;font-size:11px;color:#7A6A5E;">
                          NGÀY: <strong>${escapeHtml(dateStr)}</strong>
                        </td>
                      </tr>
                    </table>

                    <!-- Nội dung thư cảm ơn -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto 16px auto;">
                      <tr>
                        <td style="text-align:center;">
                          ${messageHtml}
                        </td>
                      </tr>
                    </table>

                    <!-- Khẩu hiệu workshop -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;margin:0 auto 20px auto;">
                      <tr>
                        <td style="background-color:#FBF6EE;border:1px solid #E8DCC8;border-radius:12px;padding:12px 16px;text-align:center;color:#D81B7A;font-style:italic;font-weight:700;font-size:13px;">
                          “Mỗi hạt cườm gửi trao — Một nhịp cầu yêu thương kết nối”
                        </td>
                      </tr>
                    </table>

                    <!-- Nút bấm Call-To-Action xem biên nhận -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 10px auto;">
                      <tr>
                        <td style="background-color:#D81B7A;border-radius:9999px;text-align:center;box-shadow:0 4px 14px rgba(216,27,122,0.25);">
                          <a href="${escapeHtml(receiptUrl)}" style="display:inline-block;padding:15px 32px;color:#FFFFFF;font-size:15px;font-weight:800;text-decoration:none;border-radius:9999px;letter-spacing:0.5px;">
                            Xem Thư Cảm Ơn &amp; Biên Nhận Điện Tử
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Đường link phụ phòng trường hợp email client chặn nút -->
                    <div style="font-size:11px;color:#7A6A5E;margin:6px auto 20px auto;max-width:460px;word-break:break-all;line-height:1.5;">
                      Nếu nút không mở được, bạn vui lòng copy liên kết bảo mật này:<br>
                      <a href="${escapeHtml(receiptUrl)}" style="color:#1F3F9E;text-decoration:underline;">${escapeHtml(receiptUrl)}</a>
                    </div>

                    <!-- Đường phân cách chân thư -->
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:20px 0 16px 0;">
                      <tr>
                        <td style="border-top:1px solid #E8DCC8;height:1px;"></td>
                      </tr>
                    </table>

                    <!-- Phần chân thư: Con dấu đỏ kiểm toán & Chữ ký Ban tổ chức -->
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Cột 1: Con dấu đỏ kiểm toán Nghị định 93 -->
                        <td align="center" valign="middle" width="50%" style="padding:10px 8px;">
                          <table align="center" border="0" cellpadding="0" cellspacing="0" style="width:104px;height:104px;border:2px dashed #DC2626;border-radius:50%;background-color:#FEF2F2;text-align:center;">
                            <tr>
                              <td align="center" valign="middle" style="padding:4px;">
                                <div style="font-size:8px;font-weight:800;color:#DC2626;letter-spacing:0.5px;text-transform:uppercase;">DỰ ÁN KẾT VÒNG</div>
                                <div style="font-size:10px;color:#DC2626;margin:1px 0;">★</div>
                                <div style="font-size:9px;font-weight:800;color:#DC2626;letter-spacing:0.5px;text-transform:uppercase;line-height:1.1;">ĐÃ ĐỐI SOÁT</div>
                                <div style="font-size:7px;font-weight:700;color:#DC2626;margin-top:1px;">NGHỊ ĐỊNH 93</div>
                              </td>
                            </tr>
                          </table>
                          <div style="font-size:10px;font-weight:700;color:#DC2626;margin-top:4px;">
                            Đã kiểm toán minh bạch
                          </div>
                        </td>

                        <!-- Cột 2: Đại diện Ban Tổ Chức & Chữ ký -->
                        <td align="center" valign="middle" width="50%" style="padding:10px 8px;">
                          <div style="font-size:11px;font-weight:700;color:#1F3F9E;letter-spacing:1px;text-transform:uppercase;">
                            ĐẠI DIỆN BAN TỔ CHỨC
                          </div>
                          <div style="font-size:10px;color:#7A6A5E;font-style:italic;margin-top:2px;">
                            Dự án Workshop Kết Vòng
                          </div>
                          <div style="font-family:'Brush Script MT','Segoe Script',cursive,sans-serif;font-size:26px;color:#1F3F9E;font-weight:700;margin:4px 0;line-height:1.2;">
                            Thanh Trúc
                          </div>
                          <div style="font-size:13px;font-weight:800;color:#1F3F9E;">
                            Nguyễn Thanh Trúc
                          </div>
                          <div style="font-size:10px;color:#7A6A5E;margin-top:2px;">
                            Trưởng Ban Tổ Chức Dự Án
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Dòng pháp lý & Thông tin sự kiện -->
                    <div style="margin-top:20px;padding-top:14px;border-top:1px solid #E8DCC8;font-size:10px;color:#7A6A5E;line-height:1.5;">
                      <div style="margin-bottom:3px;">Workshop Dự Án Sinh Viên SSG105 • Đại học FPT TP.HCM • Ngày tổ chức: 24/10/2026</div>
                      <div>Tuân thủ quy chế vận động thiện nguyện Nghị định 93/2021/NĐ-CP &amp; Bảo vệ dữ liệu cá nhân Nghị định 13/2023/NĐ-CP</div>
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderCheckoutHtml(content: string, statusUrl: string): string {
  return `<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yêu Cầu Ủng Hộ — Dự Án Kết Vòng</title>
</head>
<body style="margin:0;padding:0;background-color:#FFF8EE;color:#3D2B1F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFF8EE" style="background-color:#FFF8EE;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FBF6EE;border:2px solid #E8DCC8;border-radius:24px;box-shadow:0 8px 24px rgba(61,43,31,0.06);overflow:hidden;">
          <tr>
            <td style="padding:16px 14px 6px 14px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="padding-left:4px;">
                    <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background-color:#D81B7A;margin-right:3px;"></span>
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#E59E1A;margin-right:3px;"></span>
                    <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:#12A84B;margin-right:3px;"></span>
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:#1F3F9E;"></span>
                  </td>
                  <td align="right" style="padding-right:4px;">
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:#1F3F9E;margin-right:3px;"></span>
                    <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:#12A84B;margin-right:3px;"></span>
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#E59E1A;margin-right:3px;"></span>
                    <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background-color:#D81B7A;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 14px 20px 14px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:2px dashed #DCCBB5;border-radius:18px;text-align:center;">
                <tr>
                  <td style="padding:28px 20px 24px 20px;text-align:center;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 14px auto;">
                      <tr>
                        <td style="background-color:#EAF0FF;border:1px solid #C5D7FE;border-radius:9999px;padding:6px 18px;color:#1F3F9E;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">
                          ✦ Workshop Thiện Nguyện Kết Vòng ✦
                        </td>
                      </tr>
                    </table>

                    <h1 style="margin:0;font-size:24px;font-weight:900;color:#1F3F9E;letter-spacing:1px;font-family:'Segoe UI',Arial,sans-serif;">
                      YÊU CẦU ỦNG HỘ ĐÃ ĐƯỢC TẠO
                    </h1>
                    <div style="margin:4px 0 16px 0;font-size:11px;font-weight:800;color:#7A6A5E;letter-spacing:2px;text-transform:uppercase;">
                      HỆ THỐNG GHI NHẬN TỰ ĐỘNG
                    </div>

                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto 20px auto;">
                      <tr>
                        <td style="font-size:14px;line-height:1.7;color:#3D2B1F;text-align:left;">
                          ${textToHtml(content)}
                        </td>
                      </tr>
                    </table>

                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 10px auto;">
                      <tr>
                        <td style="background-color:#D81B7A;border-radius:9999px;text-align:center;box-shadow:0 4px 14px rgba(216,27,122,0.25);">
                          <a href="${escapeHtml(statusUrl)}" style="display:inline-block;padding:14px 28px;color:#FFFFFF;font-size:14px;font-weight:800;text-decoration:none;border-radius:9999px;letter-spacing:0.5px;">
                            Xem Trạng Thái Yêu Cầu Ủng Hộ
                          </a>
                        </td>
                      </tr>
                    </table>

                    <div style="font-size:11px;color:#7A6A5E;margin:6px auto 16px auto;max-width:460px;word-break:break-all;line-height:1.5;">
                      Nếu nút không mở được, vui lòng truy cập:<br>
                      <a href="${escapeHtml(statusUrl)}" style="color:#1F3F9E;text-decoration:underline;">${escapeHtml(statusUrl)}</a>
                    </div>

                    <div style="margin-top:20px;padding-top:14px;border-top:1px solid #E8DCC8;font-size:10px;color:#7A6A5E;line-height:1.5;">
                      <div style="margin-bottom:3px;">Workshop Dự Án Sinh Viên SSG105 • Đại học FPT TP.HCM • Ngày tổ chức: 24/10/2026</div>
                      <div>Tuân thủ quy chế vận động thiện nguyện Nghị định 93/2021/NĐ-CP &amp; Bảo vệ dữ liệu cá nhân Nghị định 13/2023/NĐ-CP</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function textToHtml(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

