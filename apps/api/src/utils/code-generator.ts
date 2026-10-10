// Ký tự loại trừ 0, O, 1, I để tránh nhầm lẫn theo SRS-004
const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Sinh mã ủng hộ dạng KV-XXXXXX (6 ký tự)
 */
export function generateDonationCode(): string {
  let result = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) {
    result += SAFE_ALPHABET[bytes[i] % SAFE_ALPHABET.length];
  }
  return `KV-${result}`;
}

/**
 * Bóc tách mã KV-XXXXXX từ nội dung chuyển khoản ngân hàng (SRS-012)
 * Hỗ trợ các biến thể: KV-XXXXXX, KVXXXXXX, kv-xxxxxx, k v - x x x x x x
 */
export function extractDonationCode(content: string | null | undefined): string | null {
  if (!content) return null;
  
  // Loại bỏ khoảng trắng thừa hoặc ký tự nối không cần thiết để dò
  const cleaned = content.toUpperCase().replace(/\s+/g, '');
  
  // Regex bắt mã bắt đầu bằng KV tiếp nối bằng 6 ký tự hợp lệ
  const match = cleaned.match(/KV[-_]?([2-9A-HJ-NP-Z]{6})/);
  if (match && match[1]) {
    return `KV-${match[1]}`;
  }

  return null;
}

