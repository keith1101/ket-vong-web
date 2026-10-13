import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { DatabaseAdapter } from '@ketvong/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface GenerateLetterParams {
  code: string;
  title: string;
  displayName: string;
  amount: number;
  quantity: number;
  approvedAt: string | null;
  receiptToken: string;
}

let cachedTemplateBase64: string | null = null;
function getTemplateBase64(): string {
  if (!cachedTemplateBase64) {
    const jpgPath = path.resolve(__dirname, '../assets/thank-you-template-clean.jpg');
    if (fs.existsSync(jpgPath)) {
      cachedTemplateBase64 = `data:image/jpeg;base64,${fs.readFileSync(jpgPath).toString('base64')}`;
    } else {
      const pngPath = path.resolve(__dirname, '../assets/thank-you-template-clean.png');
      if (fs.existsSync(pngPath)) {
        cachedTemplateBase64 = `data:image/png;base64,${fs.readFileSync(pngPath).toString('base64')}`;
      } else {
        cachedTemplateBase64 = '';
      }
    }
  }
  return cachedTemplateBase64;
}

/**
 * Sinh thư cảm ơn SVG chuẩn vector khổ dọc độ phân giải cao (723 x 1024 px)
 * Khớp 100% mẫu thiết kế mới: Logo FPT & Kết Vòng, viền hoa cúc, chữ ký Thanh Trúc.
 */
export async function generateThankYouLetterSvg(params: GenerateLetterParams, _db?: DatabaseAdapter): Promise<string> {
  const dateStr = params.approvedAt
    ? new Date(params.approvedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formattedAmount = `${params.amount.toLocaleString('vi-VN')}đ`;
  const bgDataUri = getTemplateBase64();

  // SVG Kích thước chuẩn 723 x 1024 px (tỷ lệ 1:1 với template ảnh gốc)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 723 1024" width="723" height="1024">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&amp;display=swap');
      .donor-name { font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-weight: 700; fill: #DE833A; font-size: 28px; text-anchor: middle; dominant-baseline: central; }
      .val-amount { font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-weight: 700; fill: #DE833A; font-size: 21px; text-anchor: start; dominant-baseline: central; }
      .val-qty { font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-weight: 700; fill: #DE833A; font-size: 21px; text-anchor: middle; dominant-baseline: central; }
      .val-meta { font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-weight: 600; fill: #2c2520; font-size: 21px; text-anchor: start; dominant-baseline: central; }
    </style>
  </defs>

  <!-- Hình nền phôi thư cảm ơn chuẩn sạch mới từ Designer -->
  ${bgDataUri ? `<image href="${bgDataUri}" x="0" y="0" width="723" height="1024" />` : ''}

  <!-- 1. Tên người hảo tâm -->
  <text x="361.5" y="342" class="donor-name">${escapeXml(params.displayName)}</text>

  <!-- 2. Số tiền ủng hộ (điền sau 'Đã chung tay ủng hộ') -->
  <text x="441" y="389" class="val-amount">${escapeXml(formattedAmount)}</text>

  <!-- 3. Số lượng vòng (điền giữa '(Tương ứng ' và ' chiếc vòng...') -->
  <text x="244.5" y="413.7" class="val-qty">${params.quantity}</text>

  <!-- 4. Mã ủng hộ (điền sau 'Mã ủng hộ: ') -->
  <text x="302" y="439.3" class="val-meta">${escapeXml(params.code)}</text>

  <!-- 5. Ngày xác nhận (điền sau 'Ngày: ') -->
  <text x="477" y="439.3" class="val-meta">${escapeXml(dateStr)}</text>
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
