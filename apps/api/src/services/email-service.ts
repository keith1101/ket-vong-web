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

export async function sendThankYouEmail(params: SendThankYouEmailParams, db?: DatabaseAdapter): Promise<boolean> {
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
    .replace(/{{date}}/g, dateStr);

  const content = rawContent
    .replace(/{{title}}/g, params.title)
    .replace(/{{pronoun}}/g, params.title)
    .replace(/{{name}}/g, params.name)
    .replace(/{{amount}}/g, formattedAmount)
    .replace(/{{unit}}/g, params.quantity.toString())
    .replace(/{{code}}/g, params.code)
    .replace(/{{date}}/g, dateStr)
    .replace(/{{receipt_url}}/g, receiptUrl);

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
      [logId, params.donationId, params.email, subject, error.message, messageId, now]
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

function makeRawEmail(args: { to: string; from: string; subject: string; body: string; messageId: string }): string {
  const utf8Subject = `=?utf-8?B?${base64Utf8(args.subject)}?=`;
  const emailLines = [
    `To: ${args.to}`,
    `From: Kết Vòng <${args.from}>`,
    `Subject: ${utf8Subject}`,
    `Message-ID: ${args.messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Utf8(args.body),
  ];

  return base64Utf8(emailLines.join('\r\n'))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

