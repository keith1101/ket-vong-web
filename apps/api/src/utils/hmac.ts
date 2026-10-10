/**
 * Tiện ích mã hóa HMAC-SHA256 và SHA-256 hoàn toàn bằng Web Standard Crypto
 * Đáp ứng SRS-010, SRS-040, SRS-080 (100% di động trên Node.js và Cloudflare Workers)
 */

export async function signHmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyHmacSha256(
  message: string,
  providedSignature: string | null | undefined,
  secret: string
): Promise<boolean> {
  if (!providedSignature) return false;
  try {
    const expectedSignature = await signHmacSha256(message, secret);
    return timingSafeEqual(expectedSignature.toLowerCase(), providedSignature.toLowerCase());
  } catch {
    return false;
  }
}

export async function hashSha256(data: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateReceiptToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32)); // 256-bit entropy (SRS §7)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * So sánh an toàn chống tấn công timing attack
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

