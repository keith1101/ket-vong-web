import { Hono } from 'hono';
import { processSepayWebhook, type SepayWebhookPayload } from '../services/webhook-service.js';
import { verifyHmacSha256 } from '../utils/hmac.js';
import { config } from '../config.js';

export const webhookRoutes = new Hono();

// POST /api/v1/webhooks/sepay - Nhận webhook SePay (SRS-010, SRS-011, SRS-012, SRS-013)
webhookRoutes.post('/sepay', async (c) => {
  try {
    const rawBody = await c.req.text();
    const signature = 
      c.req.header('x-sepay-signature') || 
      c.req.header('X-Sepay-Signature') || 
      c.req.header('x-signature') || 
      c.req.header('X-Signature');

    // Xác thực raw body trước khi parse hoặc chạm vào dữ liệu webhook.
    if (!(await verifyHmacSha256(rawBody, signature, config.sepayWebhookSecret))) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Chữ ký webhook không hợp lệ.' } }, 401);
    }

    let payload: SepayWebhookPayload = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return c.json(
        {
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Không thể phân tích dữ liệu JSON từ webhook SePay.',
          },
        },
        400
      );
    }

    if (payload.id == null && payload.transaction_id == null) {
      return c.json({ error: { code: 'INVALID_PAYLOAD', message: 'Webhook thiếu mã giao dịch.' } }, 400);
    }
    const amount = Number(payload.transferAmount ?? payload.amount);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      return c.json({ error: { code: 'INVALID_PAYLOAD', message: 'Webhook có số tiền không hợp lệ.' } }, 400);
    }

    const result = await processSepayWebhook(payload, rawBody, signature);

    if (result.action === 'rejected') {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Chữ ký webhook không hợp lệ.',
          },
        },
        401
      );
    }

    // SePay yêu cầu HTTP 200 {"success": true} (SRS-010)
    return c.json({
      success: true,
      action: result.action,
      reason: result.reason,
      code: result.code,
    });
  } catch (error: any) {
    console.error('[Webhook Route] Lỗi hệ thống khi xử lý webhook SePay:', error);
    // Trả về 500 để SePay retry nếu lỗi nội bộ chưa giải quyết được (SRS-010)
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Lỗi máy chủ khi xử lý giao dịch.',
        },
      },
      500
    );
  }
});

