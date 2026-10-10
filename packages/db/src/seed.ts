import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { SqliteDatabaseAdapter } from './adapter.js';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.cwd(), process.env.DATABASE_PATH);
  }
  let currentDir = process.cwd();
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return path.join(currentDir, 'data', 'ketvong.db');
    }
    currentDir = path.dirname(currentDir);
  }
  return path.resolve(process.cwd(), 'data', 'ketvong.db');
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name}; không tạo tài khoản với mật khẩu mặc định.`);
  return value;
}

const dbPath = getDatabasePath();

export async function seedAdmins() {
  console.log(`[DB Seed] Kết nối cơ sở dữ liệu tại: ${dbPath}`);
  const adapter = new SqliteDatabaseAdapter(path.resolve(dbPath));

  const BCRYPT_SALT_ROUNDS = 12; // Tuân thủ NFR-06: bcrypt cost >= 12

  const adminsToSeed = [
    {
      name: 'Bùi Anh Huy',
      email: requiredEnv('ADMIN_HUY_EMAIL'),
      password: requiredEnv('ADMIN_HUY_PASSWORD'),
      role: 'super-admin' as const,
    },
    {
      name: 'Nguyễn Thị Trúc',
      email: requiredEnv('ADMIN_TRUC_EMAIL'),
      password: requiredEnv('ADMIN_TRUC_PASSWORD'),
      role: 'admin' as const,
    },
    {
      name: 'Lê Quốc Hưng',
      email: requiredEnv('ADMIN_HUNG_EMAIL'),
      password: requiredEnv('ADMIN_HUNG_PASSWORD'),
      role: 'admin' as const,
    },
  ];

  try {
    const now = new Date().toISOString();

    for (const admin of adminsToSeed) {
      const existing = await adapter.queryOne('SELECT id, email FROM admins WHERE email = ?', [admin.email]);
      const passwordHash = await bcrypt.hash(admin.password, BCRYPT_SALT_ROUNDS);

      if (existing) {
        // Cập nhật lại mật khẩu hash nếu chạy lại seed
        await adapter.execute(
          'UPDATE admins SET password_hash = ?, role = ?, name = ? WHERE email = ?',
          [passwordHash, admin.role, admin.name, admin.email]
        );
        console.log(`[DB Seed] Đã cập nhật tài khoản: ${admin.email} (${admin.role})`);
      } else {
        const id = crypto.randomUUID();
        await adapter.execute(
          `INSERT INTO admins (id, email, password_hash, name, role, must_change_password, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          [id, admin.email, passwordHash, admin.name, admin.role, now]
        );
        console.log(`[DB Seed] Đã tạo mới tài khoản: ${admin.email} (${admin.role})`);
      }
    }

    console.log('[DB Seed] Hoàn tất seed 3 tài khoản Admin!');
  } finally {
    adapter.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedAdmins()
    .then(() => {
      console.log('[DB Seed] Đã hoàn tất seeding thành công.');
    })
    .catch((err) => {
      console.error('[DB Seed] Lỗi seeding:', err);
      process.exit(1);
    });
}
