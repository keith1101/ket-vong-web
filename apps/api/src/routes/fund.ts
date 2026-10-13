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

// GET /api/v1/fund/sheet-ledger - Dữ liệu sổ quỹ thu chi từ Google Sheets
fundRoutes.get('/sheet-ledger', async (c) => {
  try {
    const db = getDb();
    const row = await db.queryOne<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'google_sheet_url'"
    );
    const sheetUrl = row?.value || 'https://docs.google.com/spreadsheets/d/12nNrIjXdsfFGHyvdfN9VF3Bo_kUV3ls2I52JjOVbm9M/edit?usp=sharing';
    
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match ? match[1] : '12nNrIjXdsfFGHyvdfN9VF3Bo_kUV3ls2I52JjOVbm9M';
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

    try {
      const response = await fetch(csvExportUrl, {
        headers: { 'User-Agent': 'KetVong-App/1.0' },
      });
      if (!response.ok) {
        throw new Error(`Google Sheets export returned status ${response.status}`);
      }
      const csvText = await response.text();
      
      c.header('Cache-Control', 'public, max-age=60');
      return c.json({
        success: true,
        data: {
          rawCsv: csvText,
          sheetUrl,
          spreadsheetId,
          embedUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlembed?widget=true&headers=false`,
          syncedAt: new Date().toISOString(),
        },
      });
    } catch (fetchError: any) {
      console.warn('[Sheet Ledger] Lỗi kết nối Google Sheets, trả về URL gốc:', fetchError?.message);
      return c.json({
        success: true,
        data: {
          rawCsv: null,
          sheetUrl,
          spreadsheetId,
          embedUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlembed?widget=true&headers=false`,
          syncedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Không thể tải sổ thu chi Google Sheets.' } }, 500);
  }
});


