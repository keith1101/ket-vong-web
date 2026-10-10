import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryDbAdapter } from '@ketvong/db';
import { generateDonationCode, extractDonationCode } from '../utils/code-generator.js';
import { signHmacSha256, verifyHmacSha256, hashSha256, generateReceiptToken } from '../utils/hmac.js';
import { MemoryRateLimiter } from '../utils/rate-limiter.js';
import { processSepayWebhook } from '../services/webhook-service.js';
import { createDonationIntent, getPublicDonations, verifyReceiptToken } from '../services/donation-service.js';
import { generateThankYouLetterSvg } from '../services/letter-service.js';
import { config } from '../config.js';

test('SRS-004: generateDonationCode & extractDonationCode', () => {
  const code = generateDonationCode();
  assert.match(code, /^KV-[2-9A-HJ-NP-Z]{6}$/);

  // Không chứa ký tự dễ nhầm 0, O, 1, I
  assert.ok(!code.includes('0'));
  assert.ok(!code.includes('1'));
  assert.ok(!code.includes('O'));
  assert.ok(!code.includes('I'));

  // Test extract
  assert.equal(extractDonationCode('Ung ho KV-A2B3C4'), 'KV-A2B3C4');
  assert.equal(extractDonationCode('k v - a 2 b 3 c 4'), 'KV-A2B3C4');
  assert.equal(extractDonationCode('no code here'), null);
});

test('SRS-010: Web Crypto HMAC-SHA256 signature', async () => {
  const secret = 'my_super_secret_key';
  const body = JSON.stringify({ id: 123, amount: 50000 });
  const signature = await signHmacSha256(body, secret);

  assert.equal(await verifyHmacSha256(body, signature, secret), true);
  assert.equal(await verifyHmacSha256(body, 'wrong_signature', secret), false);
  assert.equal(await verifyHmacSha256('tampered_body', signature, secret), false);
});

test('SRS-002: Rate limiter sliding window', () => {
  const limiter = new MemoryRateLimiter(2, 1000);
  assert.equal(limiter.isRateLimited('user-ip'), false); // 1st
  assert.equal(limiter.isRateLimited('user-ip'), false); // 2nd
  assert.equal(limiter.isRateLimited('user-ip'), true);  // 3rd -> limited!
});

test('SRS-002 & NFR-07: Consent validation for donations', async () => {
  const adapter = createInMemoryDbAdapter();
  await adapter.exec(`
    CREATE TABLE donations (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, expected_amount INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1, unit_price INTEGER NOT NULL DEFAULT 10000,
      display_name TEXT NOT NULL, title TEXT NOT NULL, email TEXT NOT NULL,
      phone TEXT, public_message TEXT, is_anonymous INTEGER NOT NULL DEFAULT 0,
      consent INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'awaiting_transfer',
      created_at TEXT NOT NULL
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT INTO settings (key, value, updated_at) VALUES ('unit_price', '10000', '2026-10-10');
  `);

  // Phải từ chối khi consent = false (NFR-07: 100% submit thiếu consent bị từ chối)
  await assert.rejects(
    async () => {
      await createDonationIntent(
        {
          quantity: 1,
          displayName: 'Nguyễn Văn A',
          title: 'Anh',
          email: 'test@gmail.com',
          consent: false,
        },
        adapter
      );
    },
    { message: /đồng ý với chính sách xử lý dữ liệu cá nhân/ }
  );

  // Cho phép khi consent = true
  const res = await createDonationIntent(
    {
      quantity: 2,
      displayName: 'Nguyễn Văn A',
      title: 'Anh',
      email: 'test@gmail.com',
      consent: true,
    },
    adapter
  );
  assert.ok(res.donation.code);
  assert.equal(res.donation.expected_amount, 20000);
});

test('SRS-030 & NFR-05: Public API does not leak PII', async () => {
  const adapter = createInMemoryDbAdapter();
  await adapter.execute(`
    CREATE TABLE donations (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, expected_amount INTEGER NOT NULL,
      actual_amount INTEGER, display_name TEXT NOT NULL, email TEXT NOT NULL,
      phone TEXT, public_message TEXT, is_anonymous INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL, approved_at TEXT, created_at TEXT NOT NULL
    );
  `);

  await adapter.execute(
    `INSERT INTO donations (id, code, expected_amount, actual_amount, display_name, email, phone, public_message, is_anonymous, status, approved_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)`,
    ['1', 'KV-AAA111', 10000, 10000, 'Người Thật', 'secret@email.com', '0912345678', 'Lời nhắn đẹp', 0, '2026-10-10T10:00:00Z', '2026-10-10T10:00:00Z']
  );

  await adapter.execute(
    `INSERT INTO donations (id, code, expected_amount, actual_amount, display_name, email, phone, public_message, is_anonymous, status, approved_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)`,
    ['2', 'KV-BBB222', 20000, 20000, 'Tên Bị Ẩn', 'secret2@email.com', '0987654321', null, 1, '2026-10-10T11:00:00Z', '2026-10-10T11:00:00Z']
  );

  const publicData = await getPublicDonations(1, 10, adapter);
  assert.equal(publicData.items.length, 2);

  // Kiểm tra tính ẩn danh
  const anonItem = publicData.items.find((i) => i.amount === 20000);
  assert.equal(anonItem?.display_name, 'Ẩn danh');

  // NFR-05: Kiểm tra cấu trúc JSON không có email, phone, code, token
  const jsonDump = JSON.stringify(publicData.items);
  assert.ok(!jsonDump.includes('secret@email.com'));
  assert.ok(!jsonDump.includes('0912345678'));
  assert.ok(!jsonDump.includes('secret2@email.com'));
  assert.ok(!jsonDump.includes('0987654321'));
  assert.ok(!jsonDump.includes('Lời nhắn đẹp'));
});

test('SRS-010 đến SRS-013: Webhook SePay Verification Engine', async () => {
  const adapter = createInMemoryDbAdapter();
  await adapter.exec(`
    CREATE TABLE donations (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, expected_amount INTEGER NOT NULL,
      actual_amount INTEGER, quantity INTEGER NOT NULL DEFAULT 1, unit_price INTEGER NOT NULL DEFAULT 10000,
      display_name TEXT NOT NULL, title TEXT NOT NULL, email TEXT NOT NULL,
      phone TEXT, public_message TEXT, is_anonymous INTEGER NOT NULL DEFAULT 0,
      consent INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'awaiting_transfer',
      sepay_transaction_id TEXT UNIQUE, receipt_token_hash TEXT, review_reason TEXT,
      approved_by TEXT, created_at TEXT NOT NULL, transaction_at TEXT, approved_at TEXT, raw_transfer_content TEXT
    );
    CREATE TABLE email_logs (
      id TEXT PRIMARY KEY, donation_id TEXT NOT NULL, recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL, status TEXT NOT NULL, error_message TEXT,
      message_id TEXT, sent_at TEXT NOT NULL
    );
    CREATE TABLE templates (
      key TEXT PRIMARY KEY, subject TEXT, content TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT INTO settings (key, value, updated_at) VALUES ('unit_price', '10000', '2026-10-10');
  `);

  // Tạo một donation đang chờ
  const code = 'KV-HAPPY2';
  await adapter.execute(
    `INSERT INTO donations (id, code, expected_amount, display_name, title, email, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'awaiting_transfer', ?)`,
    ['d-1', code, 20000, 'Test Donor', 'Bạn', 'donor@test.com', '2026-10-10T00:00:00Z']
  );

  const rawSecret = 'sepay_webhook_hmac_secret_test_key_123456';
  config.sepayWebhookSecret = rawSecret;

  // 1. Chữ ký sai -> rejected
  const badBody = JSON.stringify({ id: 101, transferAmount: 20000, content: `Ung ho ${code}` });
  const badRes = await processSepayWebhook(
    JSON.parse(badBody),
    badBody,
    'invalid_sig',
    null,
    adapter
  );
  assert.equal(badRes.action, 'rejected');

  // 2. Happy Path: Chữ ký đúng, Khớp mã + Tiền đúng tuyệt đối (SRS-012)
  const goodBody = JSON.stringify({ id: 102, transferAmount: 20000, content: `Ung ho ${code}` });
  const goodSig = await signHmacSha256(goodBody, rawSecret);
  const goodRes = await processSepayWebhook(
    JSON.parse(goodBody),
    goodBody,
    goodSig,
    null,
    adapter
  );
  assert.equal(goodRes.action, 'approved');

  // Kiểm tra DB đã cập nhật approved và có hash receipt token
  const approvedItem = await adapter.queryOne<any>('SELECT * FROM donations WHERE id = ?', ['d-1']);
  assert.equal(approvedItem.status, 'approved');
  assert.equal(approvedItem.actual_amount, 20000);
  assert.ok(approvedItem.receipt_token_hash);

  // 3. Idempotency (SRS-011): Gửi lại cùng transaction 102 -> Bỏ qua
  const retryRes = await processSepayWebhook(
    JSON.parse(goodBody),
    goodBody,
    goodSig,
    null,
    adapter
  );
  assert.equal(retryRes.action, 'idempotent_skip');

  // 4. Lệch số tiền (SRS-012): Mã đúng nhưng chuyển 15.000đ thay vì 20.000đ
  const code2 = 'KV-MESMAT';
  await adapter.execute(
    `INSERT INTO donations (id, code, expected_amount, display_name, title, email, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'awaiting_transfer', ?)`,
    ['d-2', code2, 20000, 'Mismatch Donor', 'Bạn', 'donor2@test.com', '2026-10-10T00:00:00Z']
  );
  const mismatchBody = JSON.stringify({ id: 103, transferAmount: 15000, content: `Ung ho ${code2}` });
  const mismatchSig = await signHmacSha256(mismatchBody, rawSecret);
  const mismatchRes = await processSepayWebhook(
    JSON.parse(mismatchBody),
    mismatchBody,
    mismatchSig,
    null,
    adapter
  );
  assert.equal(mismatchRes.action, 'manual_review');
  assert.equal(mismatchRes.reason, 'amount_mismatch');

  // 5. Thiếu mã chuyển khoản (SRS-012):
  const noCodeBody = JSON.stringify({ id: 104, transferAmount: 50000, content: 'Chuyen tien khong ghi ma' });
  const noCodeSig = await signHmacSha256(noCodeBody, rawSecret);
  const noCodeRes = await processSepayWebhook(
    JSON.parse(noCodeBody),
    noCodeBody,
    noCodeSig,
    null,
    adapter
  );
  assert.equal(noCodeRes.action, 'manual_review');
  assert.equal(noCodeRes.reason, 'missing_code');
});

test('SRS-041: Thank You Letter SVG generation', async () => {
  const svg = await generateThankYouLetterSvg({
    code: 'KV-TEST99',
    title: 'Chị',
    displayName: 'Ngọc Lan',
    amount: 50000,
    quantity: 5,
    approvedAt: '2026-10-10T12:00:00Z',
    receiptToken: 'sample_token_123',
  });

  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('THƯ CẢM ƠN'));
  assert.ok(svg.includes('Ngọc Lan'));
  assert.ok(svg.includes('KV-TEST99'));
  assert.ok(svg.includes('50.000 VNĐ'));
  // Chứa path QR code
  assert.ok(svg.includes('path') || svg.includes('rect'));
});
