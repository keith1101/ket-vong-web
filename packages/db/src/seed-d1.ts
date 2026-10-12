import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const databaseName = process.env.CF_D1_DATABASE?.trim() || 'ketvong-prod';

if (!/^[A-Za-z0-9_-]+$/.test(databaseName)) {
  throw new Error('CF_D1_DATABASE chỉ được chứa chữ, số, dấu gạch ngang hoặc gạch dưới.');
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name}.`);
  return value;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function main() {
  if (process.env.CONFIRM_D1_ADMIN_SEED !== 'YES') {
    throw new Error('Đặt CONFIRM_D1_ADMIN_SEED=YES trước khi seed D1 remote.');
  }

  const admins = [
    { name: 'Bùi Anh Huy', email: requiredEnv('ADMIN_HUY_EMAIL'), password: requiredEnv('ADMIN_HUY_PASSWORD'), role: 'super-admin' },
  ];

  const now = new Date().toISOString();
  const statements: string[] = [];
  for (const admin of admins) {
    const passwordHash = await bcrypt.hash(admin.password, 12);
    statements.push(`
INSERT INTO admins (id, email, password_hash, name, role, must_change_password, created_at)
VALUES (${sqlString(crypto.randomUUID())}, ${sqlString(admin.email)}, ${sqlString(passwordHash)}, ${sqlString(admin.name)}, ${sqlString(admin.role)}, 1, ${sqlString(now)})
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  name = excluded.name,
  role = excluded.role,
  must_change_password = 1;`);
  }

  const tempFile = path.join(os.tmpdir(), `ketvong-d1-admin-seed-${process.pid}.sql`);
  await fs.writeFile(tempFile, `${statements.join('\n')}\n`, 'utf8');
  try {
    console.log(`[D1 Seed] Seed 1 tài khoản super-admin vào database remote: ${databaseName}`);
    const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const result = spawnSync(command, ['exec', 'wrangler', 'd1', 'execute', databaseName, '--remote', `--file=${tempFile}`], {
      stdio: 'inherit',
      // Windows exposes pnpm as a .cmd shim, which requires a shell to spawn.
      shell: process.platform === 'win32',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Wrangler kết thúc với mã ${result.status ?? 'không xác định'}.`);
    console.log('[D1 Seed] Hoàn tất. Các tài khoản phải đổi mật khẩu ở lần đăng nhập đầu.');
  } finally {
    await fs.rm(tempFile, { force: true });
  }
}

main().catch((error) => {
  console.error('[D1 Seed] Lỗi:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
