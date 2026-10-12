import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createInMemoryDbAdapter } from '@ketvong/db/sqlite';
import { generateDonationCode, extractDonationCode } from '../utils/code-generator.js';
import { signHmacSha256, verifyHmacSha256 } from '../utils/hmac.js';
import { MemoryRateLimiter } from '../utils/rate-limiter.js';
import { processPayOSWebhook } from '../services/webhook-service.js';
import { createDonationIntent, getPublicDonations } from '../services/donation-service.js';
import { config, createConfig } from '../config.js';
import { changeAdminPassword, getSession, loginAdmin, logoutAdmin } from '../services/auth-service.js';
import { sendThankYouEmail, renderThankYouHtml } from '../services/email-service.js';

async function createPaymentDb() {
  const db = createInMemoryDbAdapter();
  await db.exec(`
    CREATE TABLE donations (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, expected_amount INTEGER NOT NULL, actual_amount INTEGER,
      quantity INTEGER NOT NULL DEFAULT 1, unit_price INTEGER NOT NULL DEFAULT 10000, display_name TEXT NOT NULL,
      title TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, public_message TEXT, is_anonymous INTEGER NOT NULL DEFAULT 0,
      consent INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'pending_payment', payment_provider TEXT NOT NULL DEFAULT 'payos',
      provider_order_code INTEGER UNIQUE, provider_payment_link_id TEXT UNIQUE, provider_reference TEXT UNIQUE,
      payment_checkout_url TEXT, payment_qr_code TEXT, payment_expires_at TEXT, payment_received_at TEXT,
      payment_raw_event TEXT, receipt_token_hash TEXT, public_status_token_hash TEXT, review_reason TEXT, approved_by TEXT, created_at TEXT NOT NULL,
      transaction_at TEXT, approved_at TEXT, review_notes TEXT
    );
    CREATE TABLE payment_events (
      id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_order_code INTEGER, provider_reference TEXT,
      payment_link_id TEXT, event_signature TEXT NOT NULL UNIQUE, payload TEXT NOT NULL, received_at TEXT NOT NULL
    );
    CREATE TABLE email_logs (
      id TEXT PRIMARY KEY, donation_id TEXT NOT NULL, recipient_email TEXT NOT NULL, subject TEXT NOT NULL,
      status TEXT NOT NULL, error_message TEXT, message_id TEXT, sent_at TEXT NOT NULL
    );
    CREATE TABLE templates (key TEXT PRIMARY KEY, subject TEXT, content TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE admins (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin', must_change_password INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
    );
    CREATE TABLE admin_sessions (
      token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL, email TEXT NOT NULL, name TEXT NOT NULL,
      role TEXT NOT NULL, must_change_password INTEGER NOT NULL DEFAULT 1, expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    INSERT INTO settings (key, value, updated_at) VALUES ('unit_price', '10000', '2026-10-10');
    INSERT INTO templates (key, subject, content, updated_at) VALUES ('email_thank_you', 'Cảm ơn {{name}}', 'Cảm ơn {{name}} {{amount}} {{code}} {{receipt_url}}', '2026-10-10');
  `);
  return db;
}

test('Payment utilities: code, HMAC, rate limiter', async () => {
  const code = generateDonationCode();
  assert.match(code, /^KV-[2-9A-HJ-NP-Z]{6}$/);
  assert.equal(extractDonationCode('Ung ho KV-A2B3C4'), 'KV-A2B3C4');
  const signature = await signHmacSha256('payload', 'secret');
  assert.equal(await verifyHmacSha256('payload', signature, 'secret'), true);
  assert.equal(await verifyHmacSha256('tampered', signature, 'secret'), false);
  const limiter = new MemoryRateLimiter(1, 1000);
  assert.equal(limiter.isRateLimited('ip'), false);
  assert.equal(limiter.isRateLimited('ip'), true);
});
test('Security config fails closed outside explicit local mode', () => {
  assert.throws(() => createConfig({ BYPASS_PAYMENT: 'true' }), /DEPLOYMENT_ENV=local/);
  assert.throws(() => createConfig({ BYPASS_PAYMENT: 'true', DEPLOYMENT_ENV: 'staging' }), /chỉ được phép/);
  assert.equal(createConfig({ BYPASS_PAYMENT: 'true', DEPLOYMENT_ENV: 'local' }).bypassPayment, true);
});

test('Admin sessions persist in the database and survive request boundaries', async () => {
  const db = await createPaymentDb();
  const passwordHash = await bcrypt.hash('SeedPassword123!', 12);
  await db.execute(
    `INSERT INTO admins (id, email, password_hash, name, role, must_change_password, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['admin-1', 'admin@test.com', passwordHash, 'Admin Test', 'admin', 1, '2026-10-10T00:00:00Z']
  );

  const { sessionToken } = await loginAdmin('admin@test.com', 'SeedPassword123!', '127.0.0.1', db);
  assert.equal((await getSession(sessionToken, db))?.mustChangePassword, true);

  await changeAdminPassword('admin-1', 'NewPassword123!', db);
  assert.equal(await getSession(sessionToken, db), null);

  await logoutAdmin(sessionToken, db);
  assert.equal(await getSession(sessionToken, db), null);
});

test('Donation consent is mandatory', async () => {
  const db = await createPaymentDb();
  await assert.rejects(
    () => createDonationIntent({ quantity: 1, displayName: 'Nguyễn Văn A', title: 'Anh', email: 'test@example.com', consent: false }, db, { createPayment: false }),
    /đồng ý với chính sách xử lý dữ liệu cá nhân/
  );
});

test('Donation quantity must be a positive integer', async () => {
  const db = await createPaymentDb();
  await assert.rejects(
    () => createDonationIntent({ quantity: 0, displayName: 'Nguyễn Văn A', title: 'Anh', email: 'test@example.com', consent: true }, db, { createPayment: false }),
    /Số lượng vòng tay ủng hộ phải là số nguyên dương/
  );
  assert.equal((await db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM donations'))?.count, 0);
});

test('Donation email is optional', async () => {
  const db = await createPaymentDb();
  const res = await createDonationIntent(
    { quantity: 1, displayName: 'Người Không Email', title: 'Bạn', consent: true },
    db,
    { createPayment: false }
  );
  assert.ok(res.donation.code.startsWith('KV-'));
  const saved = await db.queryOne<any>('SELECT email FROM donations WHERE id = ?', [res.donation.id]);
  assert.equal(saved?.email, '');
});

test('PayOS webhook approves exact payment and skips duplicate', async () => {
  const db = await createPaymentDb();
  config.payos.checksumKey = 'payos_test_checksum_key';
  await db.execute(
    `INSERT INTO donations (id, code, expected_amount, quantity, unit_price, display_name, title, email, status, provider_order_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`,
    ['d-1', 'KV-HAPPY2', 20000, 2, 10000, 'Test Donor', 'Bạn', 'donor@test.com', 202610100001, '2026-10-10T00:00:00Z']
  );
  const data = { orderCode: 202610100001, amount: 20000, description: 'KV-HAPPY2', reference: 'REF-1', transactionDateTime: '2026-10-10T01:00:00Z', paymentLinkId: 'plink-1' };
  const canonical = Object.keys(data).sort().map((key) => `${key}=${(data as any)[key]}`).join('&');
  const payload = { code: '00', desc: 'success', success: true, data, signature: await signHmacSha256(canonical, config.payos.checksumKey) };
  const raw = JSON.stringify(payload);
  const first = await processPayOSWebhook(payload, raw, db);
  assert.equal(first.action, 'approved');
  assert.equal((await db.queryOne<any>('SELECT status, actual_amount FROM donations WHERE id = ?', ['d-1'])).status, 'approved');
  const second = await processPayOSWebhook(payload, raw, db);
  assert.equal(second.action, 'idempotent_skip');
});

test('PayOS webhook accepts confirmation payload without success field', async () => {
  const db = await createPaymentDb();
  config.payos.checksumKey = 'payos_test_checksum_key';
  await db.execute(
    `INSERT INTO donations (id, code, expected_amount, quantity, unit_price, display_name, title, email, status, provider_order_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`,
    ['d-confirm', 'KV-C2NF2R', 10000, 1, 10000, 'Confirm Test', 'Bạn', 'confirm@test.com', 202610100003, '2026-10-10T00:00:00Z']
  );
  const data = { orderCode: 202610100003, amount: 10000, description: 'KV-C2NF2R', reference: 'REF-CONFIRM' };
  const canonical = Object.keys(data).sort().map((key) => `${key}=${(data as any)[key]}`).join('&');
  const payload = { code: '00', data, signature: await signHmacSha256(canonical, config.payos.checksumKey) };

  const result = await processPayOSWebhook(payload, JSON.stringify(payload), db);
  assert.equal(result.action, 'approved');
  assert.equal((await db.queryOne<any>('SELECT status FROM donations WHERE id = ?', ['d-confirm'])).status, 'approved');
});

test('PayOS webhook sends amount mismatch to manual review and public API hides PII', async () => {
  const db = await createPaymentDb();
  config.payos.checksumKey = 'payos_test_checksum_key';
  await db.execute(`INSERT INTO donations (id, code, expected_amount, display_name, title, email, status, provider_order_code, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`, ['d-2', 'KV-MISMAT', 20000, 'Người Thật', 'Bạn', 'secret@example.com', 202610100002, '2026-10-10T00:00:00Z']);
  const data = { orderCode: 202610100002, amount: 15000, description: 'KV-MISMAT', reference: 'REF-2' };
  const canonical = Object.keys(data).sort().map((key) => `${key}=${(data as any)[key]}`).join('&');
  const payload = { code: '00', desc: 'success', success: true, data, signature: await signHmacSha256(canonical, config.payos.checksumKey) };
  const result = await processPayOSWebhook(payload, JSON.stringify(payload), db);
  assert.equal(result.reason, 'amount_mismatch');
  assert.equal((await db.queryOne<any>('SELECT status FROM donations WHERE id = ?', ['d-2'])).status, 'manual_review');
  const publicData = await getPublicDonations(1, 10, db);
  assert.ok(!JSON.stringify(publicData).includes('secret@example.com'));
});

test('getPublicDonations returns public_message when present', async () => {
  const db = await createPaymentDb();
  await db.execute(
    `INSERT INTO donations (id, code, expected_amount, display_name, title, email, status, public_message, created_at, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, '2026-10-10T00:00:00Z', '2026-10-10T00:01:00Z')`,
    ['d-msg', 'KV-MSG001', 20000, 'Bạn Hảo Tâm', 'Bạn', 'msg@example.com', 'Chúc các bé mau khỏi bệnh!']
  );
  const publicData = await getPublicDonations(1, 10, db);
  const found = publicData.items.find((i) => i.display_name === 'Bạn Hảo Tâm');
  assert.equal(found?.public_message, 'Chúc các bé mau khỏi bệnh!');
});

test('sendThankYouEmail replaces {{receipt_url}} and {{receiptUrl}} properly', async () => {
  const db = await createPaymentDb();
  await db.execute(
    "UPDATE templates SET content = 'Chào {{title}} {{name}}, mã {{code}}, số tiền {{amount}}đ. Xem biên nhận tại {{receipt_url}}' WHERE key = 'email_thank_you'"
  );

  const sent = await sendThankYouEmail({
    donationId: 'd-test-email',
    code: 'KV-TEST01',
    email: 'recipient@test.com',
    title: 'Anh',
    name: 'Nguyễn Văn B',
    amount: 50000,
    quantity: 5,
    receiptToken: 'token123456',
  }, db);

  assert.equal(sent, true);
  const log = await db.queryOne<any>('SELECT * FROM email_logs WHERE donation_id = ?', ['d-test-email']);
  assert.ok(log);
  assert.equal(log.status, 'success');

  // Verify renderThankYouHtml cleans receipt_url and renders valid html
  const rawTemplate = 'Chào {{title}} {{name}},\n\nCảm ơn bạn đã ủng hộ {{amount}}đ.\n\nMã ủng hộ: {{code}}\nXem biên nhận minh bạch và tải Thư cảm ơn tại:\n{{receipt_url}}\n\nTrân trọng,\nBan Tổ Chức Workshop Kết Vòng';
  const receiptUrl = `${config.publicBaseUrl}/dong-gop/KV-TEST01#access=token123456`;
  const resolvedContent = rawTemplate
    .replace(/{{title}}/g, 'Anh')
    .replace(/{{name}}/g, 'Nguyễn Văn B')
    .replace(/{{amount}}/g, '50.000')
    .replace(/{{code}}/g, 'KV-TEST01')
    .replace(/{{receipt_url}}/g, receiptUrl);

  const html = renderThankYouHtml(resolvedContent, receiptUrl, {
    title: 'Anh',
    name: 'Nguyễn Văn B',
    amount: 50000,
    quantity: 5,
    code: 'KV-TEST01',
  });

  assert.ok(!html.includes('{{receipt_url}}'));
  assert.ok(!html.includes('{{receiptUrl}}'));
  assert.ok(html.includes(receiptUrl));
});

