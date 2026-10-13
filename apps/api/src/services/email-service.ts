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
 * - Khẩu hiệu “Mỗi hạt cườm gửi trao - Một nhịp cầu yêu thương kết nối”
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
  <title>Thư Cảm Ơn - Dự Án Workshop Kết Vòng</title>
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
              <!-- Header Logos: FPT University & Kết Vòng -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="padding-left:8px;font-size:12px;font-weight:800;color:#0284c7;font-family:'Segoe UI',sans-serif;">
                    <span style="color:#f26522;font-size:13px;">FPT</span> Education &bull; <span style="color:#0284c7;">FPT UNIVERSITY</span>
                  </td>
                  <td align="right" style="padding-right:8px;font-size:12px;font-weight:800;color:#D81B7A;font-family:'Segoe UI',sans-serif;">
                    Workshop <span style="color:#DE833A;">Kết Vòng</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 14px 20px 14px;">
              <!-- Khung giấy viền thủ công bên trong -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:2px solid #EAE0D2;border-radius:18px;text-align:center;">
                <tr>
                  <td style="padding:28px 20px 24px 20px;text-align:center;">

                    <!-- Tiêu đề Thư Cảm Ơn -->
                    <h1 style="margin:0;font-size:28px;font-weight:900;color:#D81B7A;letter-spacing:2px;text-transform:uppercase;font-family:'Segoe UI',Arial,sans-serif;">
                      THƯ CẢM ƠN
                    </h1>
                    <div style="margin:4px 0 10px 0;font-size:12px;font-weight:800;color:#1F3F9E;letter-spacing:3px;text-transform:uppercase;">
                      CHỨNG NHẬN ĐÓNG GÓP THIỆN NGUYỆN
                    </div>

                    <!-- 5 Bông hoa cúc pastel trang trí -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:8px auto 18px auto;">
                      <tr>
                        <td align="center">
                          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#BAE6FD;margin:0 3px;"></span>
                          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#FBCFE8;margin:0 3px;"></span>
                          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#FEF08A;margin:0 3px;"></span>
                          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#DDD6FE;margin:0 3px;"></span>
                          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#F472B6;margin:0 3px;"></span>
                        </td>
                      </tr>
                    </table>

                    <!-- Tri ân người ủng hộ -->
                    <div style="font-size:13px;font-weight:600;color:#6B5D52;margin-bottom:6px;">
                      Trân trọng tri ân tấm lòng vàng của:
                    </div>
                    <div style="font-size:24px;font-weight:900;color:#DE833A;line-height:1.3;margin-bottom:14px;font-family:'Segoe UI',Arial,sans-serif;">
                      ${escapeHtml(donorName)}
                    </div>

                    <!-- Số tiền & quy mô đóng góp -->
                    <div style="font-size:15px;color:#2c2520;margin-bottom:4px;">
                      Đã chung tay ủng hộ <strong style="color:#DE833A;font-size:17px;">${escapeHtml(amountStr)} VNĐ</strong>
                    </div>
                    <div style="font-size:13px;color:#52473E;margin-bottom:14px;">
                      (Tương ứng <strong style="color:#DE833A;">${escapeHtml(quantity)}</strong> chiếc vòng tay yêu thương gửi trao)
                    </div>

                    <!-- Tag Mã định danh và Ngày xác nhận -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 20px auto;">
                      <tr>
                        <td style="background-color:#FBF6EE;border:1px solid #E8DCC8;border-radius:9999px;padding:6px 16px;font-size:11px;color:#3D2B1F;font-family:'Consolas',monospace;">
                          MÃ ỦNG HỘ: <strong>${escapeHtml(code)}</strong> &nbsp;&bull;&nbsp; NGÀY: <strong>${escapeHtml(dateStr)}</strong>
                        </td>
                      </tr>
                    </table>

                    <!-- Nội dung lời cảm ơn -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto 16px auto;">
                      <tr>
                        <td style="text-align:center;font-size:14px;color:#3D2B1F;line-height:1.7;">
                          <p style="margin:0 0 8px 0;">Sự đóng góp của Bạn đã mang niềm vui đến các em.</p>
                          <p style="margin:0;font-size:13px;color:#6B5D52;">Khoản đóng góp sẽ được dùng cho vật liệu thiết yếu, in ấn, đóng gói và tổ chức Workshop. Báo cáo tổng kết sẽ được gửi đến bạn sau chương trình.</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Khẩu hiệu workshop -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;margin:16px auto 22px auto;">
                      <tr>
                        <td style="background-color:#FFF5ED;border:1px solid #FCD9BD;border-radius:12px;padding:12px 16px;text-align:center;color:#DE833A;font-style:italic;font-weight:700;font-size:14px;">
                          “Trao một vòng tay - Kết một yêu thương”
                        </td>
                      </tr>
                    </table>

                    <!-- Phần đại diện Ban tổ chức & Chữ ký -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
                      <tr>
                        <td align="center">
                          <div style="font-size:11px;font-weight:800;color:#D84315;letter-spacing:1px;text-transform:uppercase;">
                            ĐẠI DIỆN BAN TỔ CHỨC
                          </div>
                          <div style="font-size:10px;color:#7A6A5E;margin-top:2px;">
                            Dự án Workshop Kết Vòng
                          </div>
                          <div style="font-family:'Brush Script MT','Segoe Script',cursive,sans-serif;font-size:28px;color:#1F3F9E;font-weight:700;margin:6px 0 2px 0;line-height:1.2;">
                            Thanh Trúc
                          </div>
                          <div style="font-size:13px;font-weight:800;color:#1F3F9E;">
                            Nguyễn Thanh Trúc
                          </div>
                          <div style="font-size:10px;color:#7A6A5E;margin-top:2px;">
                            Trưởng Ban tổ chức dự án
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Nút bấm Call-To-Action xem biên nhận trực tuyến -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 10px auto;">
                      <tr>
                        <td style="background-color:#D81B7A;border-radius:9999px;text-align:center;box-shadow:0 4px 14px rgba(216,27,122,0.25);">
                          <a href="${escapeHtml(receiptUrl)}" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:14px;font-weight:800;text-decoration:none;border-radius:9999px;letter-spacing:0.5px;">
                            Mở Thư Cảm Ơn &amp; Biên Nhận Trực Tuyến
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Đường link phụ -->
                    <div style="font-size:11px;color:#7A6A5E;margin:6px auto 16px auto;max-width:460px;word-break:break-all;line-height:1.5;">
                      Nếu nút không mở được, bạn vui lòng mở liên kết này:<br>
                      <a href="${escapeHtml(receiptUrl)}" style="color:#1F3F9E;text-decoration:underline;">${escapeHtml(receiptUrl)}</a>
                    </div>

                    <!-- Dòng pháp lý & Thông tin sự kiện -->
                    <div style="margin-top:20px;padding-top:14px;border-top:1px solid #E8DCC8;font-size:10px;color:#7A6A5E;line-height:1.6;">
                      <div>Dự Án Sinh Viên SSG105 • Đại học FPT TP.HCM • Ngày tổ chức: 24/10/2026</div>
                      <div>Liên Hệ: vongtayganket2026@gmail.com - Fanpage Kết Vòng</div>
                      <div style="margin-top:4px;color:#948577;">Thông tin cá nhân của Bạn chỉ dùng để xác nhận đóng góp và được bảo mật theo quy định của pháp luật hiện hành (Nghị định 13/2023/NĐ-CP).</div>
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
  <title>Yêu Cầu Ủng Hộ - Dự Án Kết Vòng</title>
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

