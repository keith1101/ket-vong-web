import path from 'node:path';
import dotenv from 'dotenv';

// Tải biến môi trường từ .env ở root hoặc local
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: process.env.DATABASE_PATH || path.resolve(process.cwd(), '../../data/ketvong.db'),
  sessionSecret: process.env.SESSION_SECRET || '',
  sepayWebhookSecret: process.env.SEPAY_WEBHOOK_SECRET || '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    senderEmail: process.env.GMAIL_SENDER_EMAIL || '',
  },
};

