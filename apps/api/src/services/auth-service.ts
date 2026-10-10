import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { adminLoginLimiter } from '../utils/rate-limiter.js';
import { config } from '../config.js';
import type { DatabaseAdapter, Admin, AdminRole } from '@ketvong/db';

export interface AdminSession {
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
  mustChangePassword: boolean;
  expiresAt: number;
}

// Map lưu active sessions (hoặc mã hóa HMAC cookie)
const activeSessions = new Map<string, AdminSession>();

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

  activeSessions.set(sessionToken, {
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    mustChangePassword: admin.must_change_password === 1,
    expiresAt,
  });

  const { password_hash, ...safeAdmin } = admin;
  return { sessionToken, admin: safeAdmin };
}

export function getSession(sessionToken: string | null | undefined): AdminSession | null {
  if (!sessionToken) return null;
  const session = activeSessions.get(sessionToken);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(sessionToken);
    return null;
  }
  return session;
}

export function logoutAdmin(sessionToken: string): void {
  activeSessions.delete(sessionToken);
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

