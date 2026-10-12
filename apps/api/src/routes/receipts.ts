import { Hono } from 'hono';
import QRCode from 'qrcode';
import { verifyReceiptToken } from '../services/donation-service.js';
import { generateThankYouLetterSvg } from '../services/letter-service.js';
import { MemoryRateLimiter } from '../utils/rate-limiter.js';
import { config } from '../config.js';
import { getTrustedClientIp, readJsonBody } from '../utils/request-security.js';

export const receiptRoutes = new Hono();
const receiptVerifyLimiter = new MemoryRateLimiter(20, 15 * 60 * 1000);

// POST /api/v1/receipts/verify - Kiểm tra token biên nhận (SRS-040)
receiptRoutes.post('/verify', async (c) => {
  const clientIp = getTrustedClientIp(c);
  if (receiptVerifyLimiter.isRateLimited(clientIp)) {
    return c.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.' } }, 429);
  }
  try {
    const body = await readJsonBody<{ code?: unknown; token?: unknown }>(c, 4 * 1024);
    const { code, token } = body;

    if (typeof code !== 'string' || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy thông tin biên nhận hợp lệ.',
          },
        },
        404
      );
    }

    const donation = await verifyReceiptToken(code, token);
    if (!donation) {
      // 404 chung chung theo SRS-040 (không lộ donation có tồn tại)
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy thông tin biên nhận hợp lệ.',
          },
        },
        404
      );
    }

    const receiptUrl = `${config.publicBaseUrl}/dong-gop/${donation.code}#access=${token}`;
    const qrSvgRaw = await QRCode.toString(receiptUrl, {
      type: 'svg',
      margin: 1,
      color: { dark: '#483426', light: '#ffffff' },
    });

    return c.json({
      success: true,
      data: {
        code: donation.code,
        title: donation.title,
        display_name: donation.display_name,
        amount: donation.actual_amount ?? donation.expected_amount,
        quantity: donation.quantity,
        unit_price: donation.unit_price,
        created_at: donation.created_at,
        approved_at: donation.approved_at,
        is_anonymous: donation.is_anonymous === 1,
        qr_svg: qrSvgRaw,
      },
    });
  } catch (error: any) {
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: 'Yêu cầu xác thực biên nhận không hợp lệ.',
        },
      },
      400
    );
  }
});

// POST /api/v1/receipts/:code/letter - token nằm trong body, không lọt vào URL/log/referrer.
receiptRoutes.post('/:code/letter', async (c) => {
  try {
    const code = c.req.param('code');
    const body = await readJsonBody<{ token?: unknown }>(c, 4 * 1024);
    const token = body.token;

    if (!code || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy thư cảm ơn hợp lệ.' } }, 404);
    }

    const donation = await verifyReceiptToken(code, token);
    if (!donation) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy thư cảm ơn hợp lệ.' } }, 404);
    }

    const svg = await generateThankYouLetterSvg({
      code: donation.code,
      title: donation.title,
      displayName: donation.display_name,
      amount: donation.actual_amount ?? donation.expected_amount,
      quantity: donation.quantity,
      approvedAt: donation.approved_at,
      receiptToken: token,
    });

    c.header('Content-Type', 'image/svg+xml; charset=utf-8');
    c.header('Cache-Control', 'no-store, private');
    c.header('Content-Disposition', `attachment; filename="Thu-Cam-On-${donation.code}.svg"`);
    return c.body(svg);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Không thể tạo thư cảm ơn lúc này. Vui lòng thử lại sau.' } }, 500);
  }
});

// Không chấp nhận token trong query string nữa.
receiptRoutes.get('/:code/letter', (c) => c.json({ error: { code: 'GONE', message: 'Vui lòng mở liên kết thư cảm ơn mới nhất.' } }, 410));

