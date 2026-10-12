import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { adminLoginLimiter } from '../utils/rate-limiter.js';
import { hashSha256, signHmacSha256 } from '../utils/hmac.js';
import { config } from '../config.js';
import type { DatabaseAdapter, Admin, AdminRole } from '@ketvong/db';

export interface AdminSession {
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
  mustChangePassword: boolean;
  expiresAt: number;
  csrfToken: string;
}

interface AdminSessionRow {
  token_hash: string;
  admin_id: string;
  email: string;
  name: string;
  role: AdminRole;
  must_change_password: number;
  expires_at: number;
  created_at: string;
}

export async function loginAdmin(
  email: string,
  password: string,
  ip: string,
  db?: DatabaseAdapter
): Promise<{ sessionToken: string; admin: Omit<Admin, 'password_hash'> }> {
  // Kiểm tra rate limit: 5 lần sai / 15 phút / IP (SRS-060)
  if (adminLoginLimiter.isRateLimited(ip)) {
    throw new Error('Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
  }

  const database = db || getDb();
  const normalizedEmail = email.trim().toLowerCase();

  const admin = await database.queryOne<Admin>(
    'SELECT * FROM admins WHERE email = ?',
    [normalizedEmail]
  );

  // Message chung chung không lộ email có tồn tại (SRS-060)
  const GENERIC_ERROR = 'Thông tin email hoặc mật khẩu không chính xác.';

  if (!admin) {
    throw new Error(GENERIC_ERROR);
  }

  const isMatch = await bcrypt.compare(password, admin.password_hash);
  if (!isMatch) {
    throw new Error(GENERIC_ERROR);
  }

  // Đăng nhập thành công -> Reset rate limit
  adminLoginLimiter.reset(ip);

  // Tạo token session (12 giờ theo SRS-060)
  const sessionToken = crypto.randomUUID();
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;

  await database.execute(
    `INSERT INTO admin_sessions
      (token_hash, admin_id, email, name, role, must_change_password, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      await hashSha256(sessionToken),
      admin.id,
      admin.email,
      admin.name,
      admin.role,
      admin.must_change_password,
      expiresAt,
      new Date().toISOString(),
    ]
  );

  const { password_hash, ...safeAdmin } = admin;
  return { sessionToken, admin: safeAdmin };
}

export async function getSession(
  sessionToken: string | null | undefined,
  db?: DatabaseAdapter
): Promise<AdminSession | null> {
  if (!sessionToken) return null;
  const database = db || getDb();
  const session = await database.queryOne<AdminSessionRow>(
    `SELECT s.token_hash, s.admin_id, a.email, a.name, a.role, a.must_change_password, s.expires_at, s.created_at
     FROM admin_sessions s
     JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = ?`,
    [await hashSha256(sessionToken)]
  );
  if (!session) return null;

  if (Date.now() > Number(session.expires_at)) {
    await database.execute('DELETE FROM admin_sessions WHERE token_hash = ?', [session.token_hash]);
    return null;
  }

  return {
    adminId: session.admin_id,
    email: session.email,
    name: session.name,
    role: session.role,
    mustChangePassword: session.must_change_password === 1,
    expiresAt: Number(session.expires_at),
    csrfToken: await signHmacSha256(`${session.token_hash}:${session.expires_at}`, config.sessionSecret || 'local-development-session-secret'),
  };
}

export async function logoutAdmin(sessionToken: string, db?: DatabaseAdapter): Promise<void> {
  const database = db || getDb();
  await database.execute('DELETE FROM admin_sessions WHERE token_hash = ?', [await hashSha256(sessionToken)]);
}

export async function changeAdminPassword(
  adminId: string,
  newPassword: string,
  db?: DatabaseAdapter
): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Mật khẩu mới phải có tối thiểu 8 ký tự.');
  }

  const database = db || getDb();
  const hash = await bcrypt.hash(newPassword, 12); // cost 12

  await database.execute(
    'UPDATE admins SET password_hash = ?, must_change_password = 0 WHERE id = ?',
    [hash, adminId]
  );
  // Đổi mật khẩu phải vô hiệu hóa toàn bộ phiên cũ, kể cả phiên hiện tại.
  await database.execute('DELETE FROM admin_sessions WHERE admin_id = ?', [adminId]);
}

export async function recordAuditLog(
  adminId: string,
  adminName: string,
  action: string,
  target: string,
  details?: string | null,
  db?: DatabaseAdapter
): Promise<void> {
  const database = db || getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await database.execute(
    `INSERT INTO audit_logs (id, admin_id, admin_name, action, target, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, adminId, adminName, action, target, details ?? null, now]
  );
}

