import { Hono } from 'hono';
import { getFundSummary } from '../services/donation-service.js';
import { getDb } from '../db.js';

export const fundRoutes = new Hono();

// GET /api/v1/fund/summary - 4 chỉ số quỹ realtime (SRS-031)
fundRoutes.get('/summary', async (c) => {
  try {
    const summary = await getFundSummary();
    return c.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Không thể tính toán số liệu quỹ vào lúc này.',
        },
      },
      500
    );
  }
});

// Báo cáo đã đăng là dữ liệu công khai, tách khỏi khu vực quản trị.
fundRoutes.get('/reports', async (c) => {
  try {
    const reports = await getDb().query(
      'SELECT id, report_date, title, content_markdown, total_income, total_expense, invoice_images, created_at, updated_at FROM daily_reports ORDER BY report_date DESC, created_at DESC'
    );
    return c.json({ success: true, data: reports });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Không thể tải báo cáo công khai.' } }, 500);
  }
});

