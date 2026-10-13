import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { SqliteDatabaseAdapter } from './sqlite-adapter.js';
import { fileURLToPath } from 'node:url';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.cwd(), process.env.DATABASE_PATH);
  }
  // Tìm thư mục gốc có pnpm-workspace.yaml
  let currentDir = process.cwd();
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return path.join(currentDir, 'data', 'ketvong-payos.db');
    }
    currentDir = path.dirname(currentDir);
  }
  return path.resolve(process.cwd(), 'data', 'ketvong-payos.db');
}

const dbPath = getDatabasePath();

export async function runMigrations() {
  const dbDir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[DB Migrate] Kết nối cơ sở dữ liệu tại: ${dbPath}`);
  const adapter = new SqliteDatabaseAdapter(path.resolve(dbPath));

  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    const migrationFiles = ['001_initial_schema.sql', '002_admin_sessions.sql', '003_default_content.sql', '004_security_hardening.sql'];
    const rawDb = adapter.getRawDb();
    rawDb.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`);

    for (const filename of migrationFiles) {
      const applied = await adapter.queryOne('SELECT filename FROM schema_migrations WHERE filename = ?', [filename]);
      if (applied) {
        console.log(`[DB Migrate] Bỏ qua migration ${filename} đã chạy.`);
        continue;
      }
      const workspaceMigration = path.resolve(process.cwd(), `packages/db/src/migrations/${filename}`);
      const moduleMigration = path.resolve(moduleDir, `migrations/${filename}`);
      const srcMigration = path.resolve(moduleDir, `../src/migrations/${filename}`);
      const migrationPath = [workspaceMigration, moduleMigration, srcMigration].find((candidate) => fs.existsSync(candidate));
      if (!migrationPath) throw new Error(`Không tìm thấy migration ${filename}.`);
      rawDb.exec(fs.readFileSync(migrationPath, 'utf8'));
      await adapter.execute('INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)', [filename, new Date().toISOString()]);
      console.log(`[DB Migrate] Chạy migration ${filename} thành công!`);
    }

    // Khởi tạo cài đặt mặc định nếu chưa có (SRS-001, SRS-062)
    const now = new Date().toISOString();
    const defaultSettings: Record<string, string> = {
      unit_price: '10000',
      max_quantity: '1000',
      presets: JSON.stringify([1]),
      campaign_name: 'Workshop Thủ Công Kết Vòng',
      campaign_deadline: '',
      campaign_target: '4000000',
      contact_email: 'vongtayganket2006@gmail.com',
      contact_phone: '0374519443',
      campaign_intro: 'Kết Vòng là workshop làm vòng tay thủ công dành cho bệnh nhi ung thư (6-15 tuổi) đang điều trị tại Ngôi nhà chung Ba Thùy. Mỗi vòng tay các em tự tay xâu là một giờ phút quên đi bệnh tật, và một kỷ niệm mang về cho gia đình.',
      privacy_policy: 'Chúng tôi cam kết bảo vệ dữ liệu cá nhân của người ủng hộ theo Nghị định 13/2023/NĐ-CP. Thông tin liên hệ chỉ dùng để đối chiếu khi cần thiết và không bao giờ công khai.'
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      const existing = await adapter.queryOne('SELECT key FROM settings WHERE key = ?', [key]);
      if (!existing) {
        await adapter.execute('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [key, value, now]);
      }
    }

    // Khởi tạo default templates (SRS-041, SRS-050)
    const defaultTemplates: Array<{ key: string; subject: string; content: string }> = [
      {
        key: 'email_thank_you',
        subject: '[Kết Vòng] Cảm ơn {{title}} {{name}} đã ủng hộ {{amount}}đ',
        content: `Chào {{title}} {{name}},

Ban tổ chức Dự án Kết Vòng xin chân thành cảm ơn sự đóng góp quý báu của {{title}} với số tiền {{amount}}đ (tương ứng {{unit}} chiếc vòng tay) vào ngày {{date}}.

Mã ủng hộ của bạn: {{code}}
Xem biên nhận minh bạch và tải Thư cảm ơn tại:
{{receipt_url}}

Trân trọng,
Ban Tổ Chức Workshop Kết Vòng`
      },
      {
        key: 'letter_thank_you',
        subject: 'Thư Cảm Ơn Kết Vòng',
        content: `Ban tổ chức Workshop Kết Vòng xin chân thành tri ân tấm lòng hảo tâm của {{title}} {{name}} đã chung tay đóng góp {{amount}}đ vào quỹ workshop. Sự sẻ chia của {{title}} là nguồn động viên to lớn cho dự án.`
      }
    ];

    for (const tpl of defaultTemplates) {
      const existing = await adapter.queryOne('SELECT key FROM templates WHERE key = ?', [tpl.key]);
      if (!existing) {
        await adapter.execute(
          'INSERT INTO templates (key, subject, content, updated_at) VALUES (?, ?, ?, ?)',
          [tpl.key, tpl.subject, tpl.content, now]
        );
      }
    }

    console.log('[DB Migrate] Cài đặt mặc định & Templates đã sẵn sàng.');
  } finally {
    adapter.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(() => {
      console.log('[DB Migrate] Hoàn tất quá trình migration.');
    })
    .catch((err) => {
      console.error('[DB Migrate] Lỗi migration:', err);
      process.exit(1);
    });
}
