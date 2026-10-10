import { Hono } from 'hono';
import { donationSubmitLimiter } from '../utils/rate-limiter.js';
import { createDonationIntent, getPublicDonations } from '../services/donation-service.js';
import { getDb } from '../db.js';

export const donationRoutes = new Hono();

// POST /api/v1/donations - Cấp mã ủng hộ (SRS-002)
donationRoutes.post('/', async (c) => {
  const clientIp = c.req.header('x-forwarded-for') || '127.0.0.1';

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
    const body = await c.req.json();
    const result = await createDonationIntent({
      quantity: Number(body.quantity),
      displayName: body.displayName,
      title: body.title || 'Bạn',
      email: body.email,
      phone: body.phone,
      publicMessage: body.publicMessage,
      isAnonymous: Boolean(body.isAnonymous),
      consent: Boolean(body.consent),
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
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

// Lấy lại hướng dẫn chuyển khoản sau khi donor tải lại trang; không trả PII.
donationRoutes.get('/:code/transfer', async (c) => {
  const donation = await getDb().queryOne<{
    code: string; expected_amount: number; status: string;
  }>('SELECT code, expected_amount, status FROM donations WHERE code = ?', [c.req.param('code').toUpperCase()]);
  if (!donation || donation.status !== 'awaiting_transfer') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Mã ủng hộ không còn ở trạng thái chờ chuyển khoản.' } }, 404);
  }
  const rows = await getDb().query<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key IN ('bank_name', 'bank_account_number', 'bank_account_name', 'bank_qr_image')"
  );
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return c.json({ success: true, data: {
    bank_name: settings.bank_name || '',
    bank_account_number: settings.bank_account_number || '',
    bank_account_name: settings.bank_account_name || '',
    bank_qr_image: settings.bank_qr_image || '',
    expected_amount: donation.expected_amount,
    code: donation.code,
  }});
});

