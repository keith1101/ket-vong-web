import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
dotenv.config({ path: path.resolve(repoRoot, '.env') });
dotenv.config();

const { serve } = await import('@hono/node-server');
const { createApp } = await import('./app.js');
const { config, configureConfig } = await import('./config.js');
const { setDbForRuntime } = await import('./db.js');
const { SqliteDatabaseAdapter } = await import('@ketvong/db/sqlite');
const { expireOverdueDonations } = await import('./services/donation-service.js');

configureConfig(process.env);
setDbForRuntime(new SqliteDatabaseAdapter(path.resolve(repoRoot, config.dbPath)));

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

