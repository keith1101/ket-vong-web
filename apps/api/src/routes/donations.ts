import { Hono } from 'hono';
import { donationSubmitLimiter } from '../utils/rate-limiter.js';
import { createDonationIntent, getPublicDonations } from '../services/donation-service.js';
import { sendCheckoutStartedEmail, sendThankYouEmail } from '../services/email-service.js';
import { getDb } from '../db.js';
import { config } from '../config.js';
import { generateReceiptToken, hashSha256 } from '../utils/hmac.js';
import { z } from 'zod';
import { getTrustedClientIp, readJsonBody, RequestPayloadError } from '../utils/request-security.js';

const donationBodySchema = z.object({
  quantity: z.number().int().positive().max(100_000),
  displayName: z.string().trim().min(1).max(120),
  title: z.enum(['Cô', 'Chú', 'Anh', 'Chị', 'Bạn']).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  publicMessage: z.string().trim().max(500).optional().nullable(),
  isAnonymous: z.boolean().optional(),
  consent: z.literal(true),
}).strict();

export const donationRoutes = new Hono();

// POST /api/v1/donations - Cấp mã ủng hộ (SRS-002)
donationRoutes.post('/', async (c) => {
  const clientIp = getTrustedClientIp(c);

  // Rate limit: 10 submit / giờ / IP (SRS-002)
  if (donationSubmitLimiter.isRateLimited(clientIp)) {
    return c.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Bạn đã thực hiện quá nhiều yêu cầu cấp mã. Vui lòng thử lại sau 1 giờ.',
        },
      },
      429
    );
  }

  try {
    const rawBody = await readJsonBody<unknown>(c, 16 * 1024);
    const parsed = donationBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Vui lòng kiểm tra lại thông tin ủng hộ và xác nhận đồng ý xử lý dữ liệu.' } }, 400);
    }
    const body = parsed.data;
    const result = await createDonationIntent({
      quantity: Number(body.quantity),
      displayName: body.displayName,
      title: body.title || 'Bạn',
      email: body.email?.trim() ? body.email.trim().toLowerCase() : '',
      phone: body.phone,
      publicMessage: body.publicMessage,
      isAnonymous: Boolean(body.isAnonymous),
      consent: body.consent,
    }, undefined, {
      createPayment: !config.bypassPayment,
      skipPayment: false,
    });

    if (config.bypassPayment) {
      const db = getDb();
      const receiptToken = generateReceiptToken();
      const now = new Date().toISOString();
      await db.execute(
        `UPDATE donations SET
          status = 'approved',
          actual_amount = ?,
          receipt_token_hash = ?,
          approved_at = ?
         WHERE id = ?`,
        [result.donation.expected_amount, await hashSha256(receiptToken), now, result.donation.id]
      );

      if (body.email?.trim()) {
        void sendThankYouEmail({
          donationId: result.donation.id,
          code: result.donation.code,
          email: body.email.trim(),
          title: body.title || 'Bạn',
          name: body.displayName,
          amount: result.donation.expected_amount,
          quantity: result.donation.quantity,
          receiptToken,
        }, db).catch((error) => console.error('[Bypass Payment] Không thể gửi email cảm ơn:', error));
      }
    } else if (config.sendCheckoutEmail && body.email?.trim()) {
      void sendCheckoutStartedEmail({
        donationId: result.donation.id,
        code: result.donation.code,
        email: body.email.trim(),
        title: body.title || 'Bạn',
        name: body.displayName,
        amount: result.donation.expected_amount,
        quantity: result.donation.quantity,
        checkoutUrl: result.payment?.checkoutUrl,
      }).catch((error) => console.error('[Checkout Email] Không thể gửi email kiểm thử:', error));
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof RequestPayloadError) {
      return c.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: error.message } }, 413);
    }
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: error.message || 'Dữ liệu ủng hộ không hợp lệ.',
        },
      },
      400
    );
  }
});

// GET /api/v1/donations/public - Log minh bạch công khai (SRS-030)
donationRoutes.get('/public', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);

    const result = await getPublicDonations(page, limit);
    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Không thể lấy danh sách minh bạch vào lúc này.',
        },
      },
      500
    );
  }
});

donationRoutes.post('/status', async (c) => {
  const body = await readJsonBody<{ orderCode?: unknown; statusToken?: unknown }>(c, 4 * 1024);
  if (!Number.isSafeInteger(body.orderCode) || typeof body.statusToken !== 'string' || !/^[a-f0-9]{64}$/i.test(body.statusToken)) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy giao dịch ủng hộ.' } }, 404);
  }
  const orderCode = Number(body.orderCode);
  const statusTokenHash = await hashSha256(body.statusToken);
  const donation = await getDb().queryOne<{
    code: string; status: string; approved_at: string | null; payment_expires_at: string | null;
  }>('SELECT code, status, approved_at, payment_expires_at FROM donations WHERE provider_order_code = ? AND public_status_token_hash = ?', [orderCode, statusTokenHash]);
  if (!donation) return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy giao dịch ủng hộ.' } }, 404);
  return c.json({ success: true, data: donation });
});

// Endpoint cũ bị vô hiệu hóa vì mã giao dịch PayOS có thể đoán được.
donationRoutes.get('/by-order/:orderCode/status', (c) => c.json({ error: { code: 'GONE', message: 'Vui lòng mở lại trang thanh toán để kiểm tra trạng thái.' } }, 410));
donationRoutes.get('/:code/status', (c) => c.json({ error: { code: 'GONE', message: 'Vui lòng dùng liên kết xác thực được cấp riêng cho lượt ủng hộ.' } }, 410));
