import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { donationRoutes } from './routes/donations.js';
import { fundRoutes } from './routes/fund.js';
import { receiptRoutes } from './routes/receipts.js';
import { webhookRoutes } from './routes/webhooks.js';
import { adminRoutes } from './routes/admin.js';
import { config } from './config.js';

export function createApp(): Hono {
  const app = new Hono();

  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'no-referrer');
  });

  // Logging & CORS
  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: config.publicBaseUrl,
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Token', 'X-CSRF-Token'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

  // Gắn các routes theo base /api/v1 (SRS §5.1)
  app.route('/api/v1/donations', donationRoutes);
  app.route('/api/v1/fund', fundRoutes);
  app.route('/api/v1/receipts', receiptRoutes);
  app.route('/api/v1/webhooks', webhookRoutes);
  app.route('/api/v1/admin', adminRoutes);

  // Xử lý route không tồn tại (404)
  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Đường dẫn yêu cầu không tồn tại trên hệ thống.',
        },
      },
      404
    );
  });

  // Xử lý lỗi toàn cục (SRS §5.1: Mọi response lỗi { error: { code: "X", message: "..." } })
  app.onError((err, c) => {
    console.error('[Hono Server Error]:', err.name, err.message);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Đã có lỗi xảy ra trên máy chủ.',
        },
      },
      500
    );
  });

  return app;
}

