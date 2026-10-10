import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { SqliteDatabaseAdapter } from './adapter.js';
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
      return path.join(currentDir, 'data', 'ketvong.db');
    }
    currentDir = path.dirname(currentDir);
  }
  return path.resolve(process.cwd(), 'data', 'ketvong.db');
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
    const migrationFile = path.resolve(moduleDir, 'migrations/001_initial_schema.sql');
    let sql: string;
    if (fs.existsSync(migrationFile)) {
      sql = fs.readFileSync(migrationFile, 'utf8');
    } else {
      // In case running from dist
      const srcMigration = path.resolve(moduleDir, '../src/migrations/001_initial_schema.sql');
      sql = fs.readFileSync(srcMigration, 'utf8');
    }

    const rawDb = adapter.getRawDb();
    rawDb.exec(sql);
    try {
      rawDb.exec('ALTER TABLE donations ADD COLUMN transaction_at TEXT');
    } catch (error) {
      if (!String(error).toLowerCase().includes('duplicate column')) throw error;
    }
    console.log('[DB Migrate] Chạy initial schema thành công!');

    // Khởi tạo cài đặt mặc định nếu chưa có (SRS-001, SRS-062)
    const now = new Date().toISOString();
    const defaultSettings: Record<string, string> = {
      unit_price: '10000',
      max_quantity: '1000',
      presets: JSON.stringify([1]),
      campaign_name: 'Workshop Thủ Công Kết Vòng',
      campaign_deadline: '',
      campaign_target: '2300000',
      bank_name: 'MBBank (Ngân hàng Quân Đội)',
      bank_account_number: '0987654321',
      bank_account_name: 'BUI ANH HUY',
      bank_qr_image: '',
      bank_qr_image_secondary: '',
      contact_email: 'ketvong.workshop@gmail.com',
      contact_phone: '0901234567',
      campaign_intro: 'Dự án gây quỹ workshop kết vòng nhằm kết nối cộng đồng và mang lại những giá trị ý nghĩa cho các em nhỏ.',
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
