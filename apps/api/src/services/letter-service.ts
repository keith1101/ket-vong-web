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

  const templateText = templateRow?.content || '';
  if (!templateText) throw new Error('Chưa cấu hình mẫu thư cảm ơn trong trang quản trị.');

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
    .replace(/{{date}}/g, dateStr);

  // SVG Khổ dọc: 1240 x 1754 (Tỷ lệ A4 chuẩn 150 DPI)
  // Palette từ SRS: Nền #fffdf9, Cam #ed7838, Chữ #483426, Viền #f2e8dc
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754" width="1240" height="1754">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&amp;family=Nunito+Sans:wght@400;600;700&amp;display=swap');
      .title { font-family: 'Baloo 2', cursive, sans-serif; font-weight: 800; fill: #ed7838; text-anchor: middle; }
      .subtitle { font-family: 'Baloo 2', cursive, sans-serif; font-weight: 600; fill: #483426; text-anchor: middle; }
      .body-text { font-family: 'Nunito Sans', sans-serif; font-weight: 400; fill: #483426; font-size: 28px; line-height: 1.6; }
      .donor-name { font-family: 'Baloo 2', cursive, sans-serif; font-weight: 700; fill: #483426; font-size: 46px; text-anchor: middle; }
      .amount-badge { font-family: 'Baloo 2', cursive, sans-serif; font-weight: 700; fill: #ffffff; font-size: 38px; text-anchor: middle; }
      .code-badge { font-family: 'Nunito Sans', monospace, sans-serif; font-weight: 700; fill: #ed7838; font-size: 26px; text-anchor: middle; }
      .footer-note { font-family: 'Nunito Sans', sans-serif; font-weight: 400; fill: #796050; font-size: 20px; text-anchor: middle; }
    </style>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ed7838" />
      <stop offset="100%" stop-color="#f2994a" />
    </linearGradient>
    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#483426" flood-opacity="0.08" />
    </filter>
  </defs>

  <!-- Nền chính -->
  <rect width="1240" height="1754" fill="#fffdf9" />

  <!-- Viền trang trí ngoài -->
  <rect x="40" y="40" width="1160" height="1674" rx="32" fill="none" stroke="#f2e8dc" stroke-width="4" />
  <rect x="56" y="56" width="1128" height="1642" rx="24" fill="none" stroke="#ed7838" stroke-width="1.5" stroke-dasharray="10 6" opacity="0.6" />

  <!-- Họa tiết góc tròn cam -->
  <circle cx="80" cy="80" r="14" fill="#ed7838" opacity="0.3" />
  <circle cx="1160" cy="80" r="14" fill="#ed7838" opacity="0.3" />
  <circle cx="80" cy="1674" r="14" fill="#ed7838" opacity="0.3" />
  <circle cx="1160" cy="1674" r="14" fill="#ed7838" opacity="0.3" />

  <!-- Khung Card Trung Tâm -->
  <rect x="100" y="120" width="1040" height="1514" rx="24" fill="#ffffff" filter="url(#cardShadow)" />

  <!-- Header Card: Logo & Biểu tượng -->
  <g transform="translate(620, 240)">
    <!-- Vòng tròn biểu tượng -->
    <circle cx="0" cy="0" r="54" fill="#fdf3eb" />
    <circle cx="0" cy="0" r="42" fill="none" stroke="#ed7838" stroke-width="3" />
    <path d="M-18 -8 C -18 -20, 0 -24, 0 -8 C 0 -24, 18 -20, 18 -8 C 18 10, 0 22, 0 22 C 0 22, -18 10, -18 -8 Z" fill="#ed7838" />
  </g>

  <text x="620" y="360" class="title" font-size="60">THƯ CẢM ƠN</text>
  <text x="620" y="415" class="subtitle" font-size="28" letter-spacing="2">DỰ ÁN WORKSHOP KẾT VÒNG</text>

  <!-- Đường kẻ phân cách -->
  <line x1="320" y1="450" x2="920" y2="450" stroke="#f2e8dc" stroke-width="2" />
  <circle cx="620" cy="450" r="6" fill="#ed7838" />

  <!-- Thông tin Tri ân Người ủng hộ -->
  <text x="620" y="530" class="subtitle" font-size="24" fill="#796050">TRÂN TRỌNG TRI ÂN</text>
  <text x="620" y="595" class="donor-name">${escapeXml(params.title)} ${escapeXml(params.displayName)}</text>

  <!-- Khung Badge Số tiền đóng góp -->
  <rect x="360" y="640" width="520" height="74" rx="37" fill="url(#headerGrad)" />
  <text x="620" y="690" class="amount-badge">ĐÃ ỦNG HỘ ${formattedAmount}</text>

  <!-- Mã ủng hộ và ngày -->
  <text x="620" y="760" class="code-badge">MÃ ỦNG HỘ: ${params.code} &amp;bull; ${dateStr}</text>

  <!-- Lời cảm ơn chi tiết -->
  <foreignObject x="180" y="810" width="880" height="340">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Nunito Sans', sans-serif; font-size: 26px; line-height: 1.7; color: #483426; text-align: center; padding: 10px 20px;">
      ${escapeXml(dynamicBody)}
    </div>
  </foreignObject>

  <!-- Khung QR Code xác thực biên nhận (SRS-041) -->
  <g transform="translate(480, 1160)">
    <rect x="-10" y="-10" width="300" height="300" rx="20" fill="#fdf3eb" stroke="#f2e8dc" stroke-width="2" />
    <g transform="scale(6.2) translate(3, 3)">
      ${qrInnerContent}
    </g>
  </g>
  <text x="620" y="1490" class="subtitle" font-size="22">QUÉT MÃ ĐỂ XÁC THỰC BIÊN NHẬN MINH BẠCH</text>
  <text x="620" y="1525" class="footer-note">Hệ thống ghi nhận quyên góp tự động Kết Vòng &amp;bull; ketvong.vn</text>

  <!-- Chữ ký Ban tổ chức -->
  <line x1="260" y1="1575" x2="980" y2="1575" stroke="#f2e8dc" stroke-width="1.5" />
  <text x="620" y="1610" class="subtitle" font-size="20" fill="#796050">BAN TỔ CHỨC DỰ ÁN KẾT VÒNG</text>
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

