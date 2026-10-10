import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { getDb } from '../db.js';
import {
  loginAdmin,
  getSession,
  logoutAdmin,
  changeAdminPassword,
  recordAuditLog,
  type AdminSession,
} from '../services/auth-service.js';
import { sendThankYouEmail } from '../services/email-service.js';
import { createDonationIntent } from '../services/donation-service.js';
import { getMonthlySepayCount } from '../services/webhook-service.js';
import { generateReceiptToken, hashSha256 } from '../utils/hmac.js';
import type { Donation, DailyReport, Template } from '@ketvong/db';
import type { Context } from 'hono';

type AdminEnv = {
  Variables: {
    admin: AdminSession;
  };
};

export const adminRoutes = new Hono<AdminEnv>();

// Middleware xác thực Admin Session (SRS-060, SRS-061)
async function requireAuth(c: Context<AdminEnv>, next: () => Promise<void>) {
  const token = getCookie(c, 'admin_session') || c.req.header('x-admin-token');
  const session = getSession(token);

  if (!session) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Phiên làm việc đã hết hạn hoặc chưa đăng nhập.',
        },
      },
      401
    );
  }

  c.set('admin', session);
  if (session.mustChangePassword && !c.req.path.endsWith('/change-password')) {
    return c.json({ error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'Vui lòng đổi mật khẩu trước khi sử dụng khu vực quản trị.' } }, 403);
  }
  await next();
}

// Middleware kiểm tra quyền Super Admin (SRS-061)
async function requireSuperAdmin(c: Context<AdminEnv>, next: () => Promise<void>) {
  const admin = c.get('admin');
  if (!admin || admin.role !== 'super-admin') {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền super-admin để thực hiện hành động này.',
        },
      },
      403
    );
  }
  await next();
}

// -----------------------------------------------------------------------------
// XÁC THỰC (AUTH)
// -----------------------------------------------------------------------------

// POST /api/v1/admin/login
adminRoutes.post('/login', async (c) => {
  try {
    const clientIp = c.req.header('x-forwarded-for') || '127.0.0.1';
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Vui lòng nhập đầy đủ email và mật khẩu.',
          },
        },
        400
      );
    }

    const { sessionToken, admin } = await loginAdmin(email, password, clientIp);

    // Lưu session cookie: 12 giờ, httpOnly, SameSite=Lax (SRS-060)
    setCookie(c, 'admin_session', sessionToken, {
      httpOnly: true,
      secure: c.req.url.startsWith('https:'),
      sameSite: 'Lax',
      maxAge: 12 * 60 * 60,
      path: '/',
    });

    return c.json({
      success: true,
      data: {
        admin,
      },
    });
  } catch (error: any) {
    return c.json(
      {
        error: {
          code: 'AUTH_FAILED',
          message: error.message || 'Đăng nhập không thành công.',
        },
      },
      401
    );
  }
});

// POST /api/v1/admin/logout
adminRoutes.post('/logout', async (c) => {
  const token = getCookie(c, 'admin_session');
  if (token) {
    logoutAdmin(token);
  }
  deleteCookie(c, 'admin_session', { path: '/' });
  return c.json({ success: true });
});

// GET /api/v1/admin/me
adminRoutes.get('/me', requireAuth, async (c) => {
  const admin = c.get('admin') as AdminSession;
  return c.json({ success: true, data: admin });
});

// POST /api/v1/admin/change-password
adminRoutes.post('/change-password', requireAuth, async (c) => {
  try {
    const admin = c.get('admin') as AdminSession;
    const body = await c.req.json();
    const { newPassword } = body;

    await changeAdminPassword(admin.adminId, newPassword);
    await recordAuditLog(admin.adminId, admin.name, 'CHANGE_PASSWORD', 'admin', `Đổi mật khẩu tài khoản ${admin.email}`);

    return c.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (error: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: error.message } }, 400);
  }
});

// -----------------------------------------------------------------------------
// QUẢN LÝ QUYÊN GÓP & CA LỆCH (SRS-020)
// -----------------------------------------------------------------------------

// GET /api/v1/admin/donations
adminRoutes.get('/donations', requireAuth, async (c) => {
  const db = getDb();
  const status = c.req.query('status'); // awaiting_transfer, approved, manual_review, rejected, expired
  const search = c.req.query('search');
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = (page - 1) * limit;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }

  if (search) {
    whereClauses.push('(code LIKE ? OR display_name LIKE ? OR email LIKE ? OR raw_transfer_content LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await db.queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM donations ${whereSql}`,
    params
  );
  const total = countRow?.count || 0;

  const rows = await db.query<Donation>(
    `SELECT * FROM donations ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return c.json({
    success: true,
    data: {
      items: rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    },
  });
});

// POST /api/v1/admin/donations - Tạo mới và duyệt khoản ủng hộ nhập tay (SRS-020)
adminRoutes.post('/donations', requireAuth, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const body = await c.req.json().catch(() => ({}));
  if (!body.consent) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Cần xác nhận donor đã đồng ý xử lý dữ liệu trước khi tạo bản ghi.' } }, 400);
  }
  try {
    const created = await createDonationIntent({
      quantity: Number(body.quantity),
      displayName: body.displayName,
      title: body.title || 'Bạn',
      email: body.email,
      phone: body.phone,
      publicMessage: body.publicMessage,
      isAnonymous: Boolean(body.isAnonymous),
      consent: true,
    }, db);
    const receiptToken = generateReceiptToken();
    const now = new Date().toISOString();
    await db.execute(
      "UPDATE donations SET status = 'approved', actual_amount = ?, receipt_token_hash = ?, approved_at = ?, approved_by = ? WHERE id = ?",
      [created.donation.expected_amount, await hashSha256(receiptToken), now, admin.adminId, created.donation.id]
    );
    await recordAuditLog(admin.adminId, admin.name, 'CREATE_MANUAL_DONATION', `donation:${created.donation.code}`, `Tạo và duyệt khoản ủng hộ nhập tay`);
    await sendThankYouEmail({
      donationId: created.donation.id, code: created.donation.code, email: body.email,
      title: body.title || 'Bạn', name: body.displayName, amount: created.donation.expected_amount,
      quantity: created.donation.quantity, receiptToken,
    }, db);
    return c.json({ success: true, data: { code: created.donation.code }, message: 'Đã tạo và duyệt khoản ủng hộ nhập tay.' });
  } catch (error: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: error.message || 'Không thể tạo khoản ủng hộ nhập tay.' } }, 400);
  }
});

// POST /api/v1/admin/donations/:id/approve - Xử lý duyệt ca lệch (SRS-020)
adminRoutes.post('/donations/:id/approve', requireAuth, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const donation = await db.queryOne<Donation>('SELECT * FROM donations WHERE id = ?', [id]);
  if (!donation) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy bản ghi quyên góp.' } }, 404);
  }

  const now = new Date().toISOString();
  const receiptToken = generateReceiptToken();
  const tokenHash = await hashSha256(receiptToken);

  const finalAmount = body.actualAmount ? Number(body.actualAmount) : (donation.actual_amount || donation.expected_amount);

  await db.execute(
    `UPDATE donations SET
      status = 'approved',
      actual_amount = ?,
      receipt_token_hash = ?,
      approved_at = ?,
      approved_by = ?,
      review_reason = NULL
     WHERE id = ?`,
    [finalAmount, tokenHash, now, admin.adminId, id]
  );

  // Ghi audit log (SRS-064)
  await recordAuditLog(
    admin.adminId,
    admin.name,
    'APPROVE_DONATION',
    `donation:${donation.code}`,
    `Duyệt thủ công mã ${donation.code} số tiền ${finalAmount}đ`
  );

  // Gửi mail cảm ơn (SRS-050)
  if (donation.email) {
    sendThankYouEmail(
      {
        donationId: donation.id,
        code: donation.code,
        email: donation.email,
        title: donation.title,
        name: donation.display_name,
        amount: finalAmount,
        quantity: donation.quantity,
        receiptToken,
      },
      db
    ).catch(console.error);
  }

  return c.json({ success: true, message: `Đã duyệt thành công mã ${donation.code}` });
});

// POST /api/v1/admin/donations/:id/reject - Từ chối ca lệch (SRS-020)
adminRoutes.post('/donations/:id/reject', requireAuth, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const id = c.req.param('id');
  const body = await c.req.json();
  const reason = body.reason;

  if (!reason || reason.trim().length === 0) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Bắt buộc phải nhập lý do từ chối.' } }, 400);
  }

  const donation = await db.queryOne<Donation>('SELECT * FROM donations WHERE id = ?', [id]);
  if (!donation) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy bản ghi quyên góp.' } }, 404);
  }

  await db.execute(
    "UPDATE donations SET status = 'rejected', review_reason = ? WHERE id = ?",
    [reason.trim(), id]
  );

  await recordAuditLog(
    admin.adminId,
    admin.name,
    'REJECT_DONATION',
    `donation:${donation.code}`,
    `Từ chối mã ${donation.code} với lý do: ${reason}`
  );

  return c.json({ success: true, message: 'Đã từ chối giao dịch.' });
});

// POST /api/v1/admin/donations/:id/assign - Gán giao dịch lệch vào một mã có sẵn (SRS-020)
adminRoutes.post('/donations/:id/assign', requireAuth, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const id = c.req.param('id');
  const body = await c.req.json();
  const targetCode = body.targetCode;

  if (!targetCode) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Vui lòng cung cấp mã đích cần gán.' } }, 400);
  }

  const sourceDonation = await db.queryOne<Donation>('SELECT * FROM donations WHERE id = ?', [id]);
  const targetDonation = await db.queryOne<Donation>('SELECT * FROM donations WHERE code = ?', [targetCode]);

  if (!sourceDonation || !targetDonation) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy bản ghi nguồn hoặc đích.' } }, 404);
  }

  const now = new Date().toISOString();
  const receiptToken = generateReceiptToken();
  const tokenHash = await hashSha256(receiptToken);

  // Cập nhật targetDonation thành approved với tiền và thông tin giao dịch từ nguồn
  await db.execute(
    `UPDATE donations SET
      status = 'approved',
      actual_amount = ?,
      sepay_transaction_id = ?,
      receipt_token_hash = ?,
      approved_at = ?,
      approved_by = ?,
      raw_transfer_content = ?
     WHERE id = ?`,
    [
      sourceDonation.actual_amount || sourceDonation.expected_amount,
      sourceDonation.sepay_transaction_id,
      tokenHash,
      now,
      admin.adminId,
      sourceDonation.raw_transfer_content,
      targetDonation.id,
    ]
  );

  // Xóa hoặc đánh dấu bản ghi nguồn đã gán
  // Cột giao dịch là UNIQUE: chuyển quyền sở hữu giao dịch sang bản ghi đích
  // trước khi đánh dấu bản ghi hàng chờ đã được gán.
  await db.execute("UPDATE donations SET status = 'rejected', review_reason = 'assigned_to_other', sepay_transaction_id = NULL WHERE id = ?", [id]);

  await recordAuditLog(
    admin.adminId,
    admin.name,
    'ASSIGN_DONATION',
    `donation:${targetDonation.code}`,
    `Gán giao dịch ${sourceDonation.sepay_transaction_id} vào mã ${targetDonation.code}`
  );

  if (targetDonation.email) {
    sendThankYouEmail(
      {
        donationId: targetDonation.id,
        code: targetDonation.code,
        email: targetDonation.email,
        title: targetDonation.title,
        name: targetDonation.display_name,
        amount: sourceDonation.actual_amount || targetDonation.expected_amount,
        quantity: targetDonation.quantity,
        receiptToken,
      },
      db
    ).catch(console.error);
  }

  return c.json({ success: true, message: `Đã gán thành công vào mã ${targetDonation.code}` });
});

// DELETE /api/v1/admin/donations/:id/donor-data - Quyền xóa dữ liệu cá nhân theo NĐ 13/2023 (SRS-070)
adminRoutes.delete('/donations/:id/donor-data', requireAuth, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const id = c.req.param('id');

  const donation = await db.queryOne<Donation>('SELECT * FROM donations WHERE id = ?', [id]);
  if (!donation) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy bản ghi quyên góp.' } }, 404);
  }

  // Xóa mềm: ẩn khỏi log công khai, xóa phone/email/tin nhắn, giữ lại số tiền và ngày duyệt
  await db.execute(
    `UPDATE donations SET
      display_name = 'Ẩn danh',
      email = '',
      phone = NULL,
      public_message = NULL,
      is_anonymous = 1,
      raw_transfer_content = NULL
     WHERE id = ?`,
    [id]
  );
  await db.execute(
    "UPDATE email_logs SET recipient_email = '', subject = 'Đã xóa theo yêu cầu', error_message = NULL WHERE donation_id = ?",
    [id]
  );

  await recordAuditLog(
    admin.adminId,
    admin.name,
    'ERASE_DONOR_DATA',
    `donation:${donation.code}`,
    `Xóa dữ liệu cá nhân của donor theo yêu cầu (NĐ 13/2023)`
  );

  return c.json({ success: true, message: 'Đã xóa dữ liệu cá nhân của người ủng hộ thành công.' });
});

// -----------------------------------------------------------------------------
// BÁO CÁO THU / CHI HÀNG NGÀY (SRS-063)
// -----------------------------------------------------------------------------

// GET /api/v1/admin/reports
adminRoutes.get('/reports', requireAuth, async (c) => {
  const db = getDb();
  const reports = await db.query<DailyReport>(
    'SELECT * FROM daily_reports ORDER BY report_date DESC, created_at DESC'
  );
  return c.json({ success: true, data: reports });
});

// POST /api/v1/admin/reports
adminRoutes.post('/reports', requireAuth, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const body = await c.req.json();
  const { report_date, title, content_markdown, total_income, total_expense, invoice_images } = body;

  if (!report_date || !title || !content_markdown) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Vui lòng điền đủ ngày, tiêu đề và nội dung markdown.' } }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO daily_reports (
      id, report_date, title, content_markdown,
      total_income, total_expense, invoice_images,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      report_date,
      title,
      content_markdown,
      Number(total_income || 0),
      Number(total_expense || 0),
      invoice_images ? JSON.stringify(invoice_images) : null,
      admin.name,
      now,
      now,
    ]
  );

  await db.execute(
    `INSERT INTO daily_report_versions (id, report_id, title, content_markdown, total_income, total_expense, invoice_images, saved_by, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), id, title, content_markdown, Number(total_income || 0), Number(total_expense || 0), invoice_images ? JSON.stringify(invoice_images) : null, admin.name, now]
  );

  await recordAuditLog(admin.adminId, admin.name, 'CREATE_REPORT', `report:${report_date}`, `Tạo báo cáo ngày ${report_date}`);
  return c.json({ success: true, message: 'Đăng báo cáo thành công.' });
});

// PUT /api/v1/admin/reports/:id - Sửa báo cáo và lưu phiên bản (SRS-063)
adminRoutes.put('/reports/:id', requireAuth, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const id = c.req.param('id');
  const body = await c.req.json();
  const current = await db.queryOne<DailyReport>('SELECT * FROM daily_reports WHERE id = ?', [id]);
  if (!current) return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy báo cáo cần sửa.' } }, 404);
  if (!body.title || !body.content_markdown) return c.json({ error: { code: 'BAD_REQUEST', message: 'Vui lòng điền tiêu đề và nội dung báo cáo.' } }, 400);
  const now = new Date().toISOString();
  const images = Array.isArray(body.invoice_images) ? JSON.stringify(body.invoice_images) : current.invoice_images;
  await db.execute(
    'UPDATE daily_reports SET title = ?, content_markdown = ?, total_income = ?, total_expense = ?, invoice_images = ?, updated_at = ? WHERE id = ?',
    [body.title, body.content_markdown, Number(body.total_income || 0), Number(body.total_expense || 0), images, now, id]
  );
  await db.execute(
    `INSERT INTO daily_report_versions (id, report_id, title, content_markdown, total_income, total_expense, invoice_images, saved_by, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), id, body.title, body.content_markdown, Number(body.total_income || 0), Number(body.total_expense || 0), images, admin.name, now]
  );
  await recordAuditLog(admin.adminId, admin.name, 'UPDATE_REPORT', `report:${id}`, 'Sửa báo cáo thu chi');
  return c.json({ success: true, message: 'Đã cập nhật báo cáo.' });
});

// -----------------------------------------------------------------------------
// CÀI ĐẶT & TEMPLATES (SRS-061, SRS-062, SUPER-ADMIN ONLY)
// -----------------------------------------------------------------------------

// GET /api/v1/admin/settings
adminRoutes.get('/settings', requireAuth, requireSuperAdmin, async (c) => {
  const db = getDb();
  const rows = await db.query<{ key: string; value: string; updated_at: string }>('SELECT * FROM settings');
  const settingsObj = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return c.json({ success: true, data: settingsObj });
});

// PUT /api/v1/admin/settings
adminRoutes.put('/settings', requireAuth, requireSuperAdmin, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const body = await c.req.json();
  const now = new Date().toISOString();

  const allowedKeys = new Set([
    'unit_price', 'max_quantity', 'presets', 'campaign_name', 'campaign_target', 'campaign_deadline',
    'bank_name', 'bank_account_number', 'bank_account_name', 'bank_qr_image', 'bank_qr_image_secondary',
    'contact_email', 'contact_phone', 'campaign_intro', 'privacy_policy',
  ]);
  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.has(key)) continue;
    if ((key === 'bank_qr_image' || key === 'bank_qr_image_secondary') && value) {
      const image = String(value);
      if (!/^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 7_000_000) {
        return c.json({ error: { code: 'BAD_REQUEST', message: 'Ảnh QR phải là PNG/JPG và không vượt quá 5MB.' } }, 400);
      }
    }
    const stringVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const existing = await db.queryOne('SELECT key FROM settings WHERE key = ?', [key]);
    if (existing) {
      await db.execute('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [stringVal, now, key]);
    } else {
      await db.execute('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [key, stringVal, now]);
    }
  }

  await recordAuditLog(admin.adminId, admin.name, 'UPDATE_SETTINGS', 'settings', 'Cập nhật cấu hình website');
  return c.json({ success: true, message: 'Cập nhật cài đặt thành công.' });
});

// GET /api/v1/admin/templates
adminRoutes.get('/templates', requireAuth, requireSuperAdmin, async (c) => {
  const db = getDb();
  const rows = await db.query<Template>('SELECT * FROM templates');
  return c.json({ success: true, data: rows });
});

// PUT /api/v1/admin/templates/:key
adminRoutes.put('/templates/:key', requireAuth, requireSuperAdmin, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const key = c.req.param('key');
  const body = await c.req.json();
  const now = new Date().toISOString();

  await db.execute(
    'UPDATE templates SET subject = ?, content = ?, updated_at = ? WHERE key = ?',
    [body.subject || null, body.content, now, key]
  );

  await recordAuditLog(admin.adminId, admin.name, 'UPDATE_TEMPLATE', `template:${key}`, `Sửa template ${key}`);
  return c.json({ success: true, message: 'Cập nhật template thành công.' });
});

// -----------------------------------------------------------------------------
// LOGS & GIÁM SÁT SEPAY
// -----------------------------------------------------------------------------

// GET /api/v1/admin/logs
adminRoutes.get('/logs', requireAuth, requireSuperAdmin, async (c) => {
  const db = getDb();
  const auditLogs = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
  const emailLogs = await db.query('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 50');
  return c.json({ success: true, data: { auditLogs, emailLogs } });
});

// POST /api/v1/admin/emails/:id/resend - Gửi lại email lỗi (SRS-050)
adminRoutes.post('/emails/:id/resend', requireAuth, async (c) => {
  const db = getDb();
  const admin = c.get('admin') as AdminSession;
  const emailLog = await db.queryOne<any>('SELECT * FROM email_logs WHERE id = ?', [c.req.param('id')]);
  if (!emailLog || emailLog.status !== 'failed') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy email lỗi cần gửi lại.' } }, 404);
  }
  const donation = await db.queryOne<Donation>('SELECT * FROM donations WHERE id = ? AND status = \'approved\'', [emailLog.donation_id]);
  if (!donation || !donation.email) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy người ủng hộ hợp lệ để gửi lại.' } }, 404);
  }
  const receiptToken = generateReceiptToken();
  await db.execute('UPDATE donations SET receipt_token_hash = ? WHERE id = ?', [await hashSha256(receiptToken), donation.id]);
  const sent = await sendThankYouEmail({
    donationId: donation.id,
    code: donation.code,
    email: donation.email,
    title: donation.title,
    name: donation.display_name,
    amount: donation.actual_amount ?? donation.expected_amount,
    quantity: donation.quantity,
    receiptToken,
  }, db);
  await recordAuditLog(admin.adminId, admin.name, 'RESEND_EMAIL', `email:${emailLog.id}`, `Gửi lại email cho mã ${donation.code}`);
  return c.json({ success: sent, message: sent ? 'Đã gửi lại email cảm ơn.' : 'Gửi lại email chưa thành công.' });
});

// GET /api/v1/admin/sepay-usage
adminRoutes.get('/sepay-usage', requireAuth, async (c) => {
  const monthlyCount = await getMonthlySepayCount();
  return c.json({
    success: true,
    data: {
      used: monthlyCount,
      limit: 50,
      isNearLimit: monthlyCount >= 40,
      isOverLimit: monthlyCount >= 50,
    },
  });
});
