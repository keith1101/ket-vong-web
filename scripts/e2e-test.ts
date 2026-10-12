import { createApp } from '../apps/api/src/app.js';
import { setDbForTesting } from '../apps/api/src/db.js';
import { signHmacSha256 } from '../apps/api/src/utils/hmac.js';
import { config } from '../apps/api/src/config.js';
import { createInMemoryDbAdapter } from '../packages/db/src/adapter.js';

async function runE2ETest() {
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
    CREATE TABLE email_logs (id TEXT PRIMARY KEY, donation_id TEXT NOT NULL, recipient_email TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL, error_message TEXT, message_id TEXT, sent_at TEXT NOT NULL);
    CREATE TABLE templates (key TEXT PRIMARY KEY, subject TEXT, content TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE daily_reports (id TEXT PRIMARY KEY, total_expense INTEGER NOT NULL DEFAULT 0);
    INSERT INTO settings (key, value, updated_at) VALUES ('unit_price', '10000', '2026-10-10');
    INSERT INTO settings (key, value, updated_at) VALUES ('max_quantity', '1000', '2026-10-10');
    INSERT INTO settings (key, value, updated_at) VALUES ('presets', '[1]', '2026-10-10');
    INSERT INTO templates (key, subject, content, updated_at) VALUES ('email_thank_you', 'Cảm ơn {{name}}', 'Cảm ơn {{name}} {{amount}} {{code}} {{receipt_url}}', '2026-10-10');
  `);
  setDbForTesting(db);
  config.payos.clientId = 'test-client';
  config.payos.apiKey = 'test-api';
  config.payos.checksumKey = 'test-checksum';
  config.bypassPayment = false;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('/v2/payment-requests')) {
      return new Response(JSON.stringify({ code: '00', data: { orderCode: 202610100001, paymentLinkId: 'plink-1', checkoutUrl: 'https://pay.payos.vn/web/plink-1', qrCode: 'qr', status: 'PENDING' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return originalFetch(input);
  }) as typeof fetch;

  try {
    const app = createApp();
    const createRes = await app.request('/api/v1/donations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 2, displayName: 'Trần Minh Anh', title: 'Chị', email: 'minhanh@gmail.com', consent: true }),
    });
    if (!createRes.ok) throw new Error(await createRes.text());
    const created = (await createRes.json() as any).data;
    if (created.donation.expected_amount !== 20000 || !created.payment.checkoutUrl) throw new Error('PayOS payment link không hợp lệ.');

    const data = { orderCode: 202610100001, amount: 20000, description: created.donation.code, reference: 'REF-E2E', transactionDateTime: new Date().toISOString(), paymentLinkId: 'plink-1' };
    const canonical = Object.keys(data).sort().map((key) => `${key}=${(data as any)[key]}`).join('&');
    const payload = { code: '00', desc: 'success', success: true, data, signature: await signHmacSha256(canonical, config.payos.checksumKey) };
    const body = JSON.stringify(payload);

    const bad = await app.request('/api/v1/webhooks/payos', { method: 'POST', body: JSON.stringify({ ...payload, signature: 'bad' }) });
    if (bad.status !== 401) throw new Error(`Sai signature không bị từ chối: ${bad.status}`);
    const paid = await app.request('/api/v1/webhooks/payos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (!paid.ok || (await paid.json() as any).action !== 'approved') throw new Error('Webhook PayOS hợp lệ không approve.');
    const retry = await app.request('/api/v1/webhooks/payos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if ((await retry.json() as any).action !== 'idempotent_skip') throw new Error('Webhook PayOS trùng không được bỏ qua.');

    const publicResponse = await app.request('/api/v1/donations/public');
    if ((await publicResponse.text()).includes('minhanh@gmail.com')) throw new Error('Public API làm lộ email.');
    const unauth = await app.request('/api/v1/admin/donations');
    if (unauth.status !== 401) throw new Error('Admin route không chặn unauthenticated request.');
    console.log('[E2E] PayOS hosted checkout, webhook signature, idempotency, PII và admin auth: PASS');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runE2ETest().catch((error) => { console.error('[E2E] FAIL:', error); process.exit(1); });
