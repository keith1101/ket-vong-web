import { Hono } from 'hono';
import { processPayOSWebhook, type PayOSWebhookPayload } from '../services/webhook-service.js';
import { config } from '../config.js';
import { readTextBody, RequestPayloadError } from '../utils/request-security.js';

export const webhookRoutes = new Hono();

// POST /api/v1/webhooks/payos
webhookRoutes.post('/payos', async (c) => {
  try {
    const rawBody = await readTextBody(c, 64 * 1024);
    let payload: PayOSWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return c.json({ error: { code: 'INVALID_PAYLOAD', message: 'Dữ liệu webhook PayOS không phải JSON hợp lệ.' } }, 400);
    }

    let waitUntil: ((promise: Promise<any>) => void) | undefined;
    try {
      const executionContext = (c as any).executionCtx;
      if (executionContext?.waitUntil) {
        waitUntil = executionContext.waitUntil.bind(executionContext);
      }
    } catch {
      // Môi trường Node.js / test không có executionCtx
    }

    const result = await processPayOSWebhook(payload, rawBody, undefined, {
      waitUntil,
    });
    if (result.action === 'rejected') {
      console.warn('[PayOS Webhook] Từ chối payload:', {
        reason: result.reason || 'unknown',
        payloadCode: payload.code || null,
        payloadSuccess: payload.success ?? null,
        hasData: Boolean(payload.data),
        dataKeys: payload.data ? Object.keys(payload.data).sort() : [],
        signatureLength: payload.signature?.length || 0,
        checksumConfigured: Boolean(config.payos.checksumKey),
        dataFieldTypes: payload.data
          ? {
              orderCode: typeof payload.data.orderCode,
              amount: typeof payload.data.amount,
              reference: typeof payload.data.reference,
            }
          : {},
      });
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Webhook PayOS không hợp lệ.' } }, 401);
    }
    return c.json({ success: true, action: result.action, reason: result.reason, code: result.code });
  } catch (error) {
    if (error instanceof RequestPayloadError) {
      return c.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: error.message } }, 413);
    }
    console.error('[PayOS Webhook] Lỗi hệ thống:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ khi xử lý giao dịch ủng hộ.' } }, 500);
  }
});
