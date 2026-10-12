import type { Context } from 'hono';
import { config } from '../config.js';

export class RequestPayloadError extends Error {
  readonly status = 413;

  constructor(message = 'Dữ liệu gửi lên vượt quá giới hạn cho phép.') {
    super(message);
    this.name = 'RequestPayloadError';
  }
}

/**
 * Chỉ tin header do Cloudflare thêm ở Worker. X-Forwarded-For chỉ được dùng
 * trong local để không biến header do client kiểm soát thành danh tính production.
 */
export function getTrustedClientIp(c: Context): string {
  const cloudflareIp = c.req.header('CF-Connecting-IP');
  if (cloudflareIp && /^[0-9a-fA-F:.]{3,64}$/.test(cloudflareIp)) return cloudflareIp;

  if (config.deploymentEnv === 'local') {
    const forwarded = c.req.header('X-Forwarded-For');
    if (forwarded) return forwarded.split(',')[0].trim().slice(0, 64) || 'local';
    return 'local';
  }

  return 'unknown';
}

export async function readJsonBody<T>(c: Context, maxBytes: number): Promise<T> {
  const declaredLength = Number(c.req.header('Content-Length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new RequestPayloadError();

  const raw = await readBodyBytes(c, maxBytes);
  try {
    return JSON.parse(new TextDecoder().decode(raw)) as T;
  } catch {
    throw new Error('Dữ liệu gửi lên không phải JSON hợp lệ.');
  }
}

export async function readTextBody(c: Context, maxBytes: number): Promise<string> {
  const declaredLength = Number(c.req.header('Content-Length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new RequestPayloadError();
  return new TextDecoder().decode(await readBodyBytes(c, maxBytes));
}

async function readBodyBytes(c: Context, maxBytes: number): Promise<Uint8Array> {
  const buffer = new Uint8Array(await c.req.raw.arrayBuffer());
  if (buffer.byteLength > maxBytes) throw new RequestPayloadError();
  return buffer;
}

export function isAllowedMutationOrigin(c: Context): boolean {
  const origin = c.req.header('Origin');
  if (!origin) return false;

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(config.publicBaseUrl).origin);
  } catch {
    // Invalid configuration is handled by deployment validation.
  }
  try {
    allowed.add(new URL(c.req.url).origin);
  } catch {
    // Ignore malformed request URLs.
  }
  return allowed.has(origin);
}
