import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { config } from './config.js';
import { expireOverdueDonations } from './services/donation-service.js';

const app = createApp();

// Quét mã chờ chuyển khoản mỗi giờ để thực hiện chính sách hết hạn 48 giờ.
setInterval(() => {
  expireOverdueDonations().catch((error) => console.error('[Expiry] Không thể cập nhật mã hết hạn.', error));
}, 60 * 60 * 1000).unref();

console.log(`[API Server] Đang khởi động Hono backend tại cổng ${config.port}...`);

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`[API Server] Hono service đang chạy tại http://localhost:${info.port}`);
    console.log(`[API Server] Base API URL: http://localhost:${info.port}/api/v1`);
  }
);

