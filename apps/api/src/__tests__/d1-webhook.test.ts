import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryDbAdapter } from '@ketvong/db/sqlite';
import { D1DatabaseAdapter, type D1DatabaseLike, type D1PreparedStatementLike, type D1Result } from '@ketvong/db/d1';
import { config } from '../config.js';
import { processPayOSWebhook } from '../services/webhook-service.js';
import { signHmacSha256 } from '../utils/hmac.js';

class FakeD1PreparedStatement implements D1PreparedStatementLike {
  private readonly values: unknown[];

  constructor(private readonly db: ReturnType<typeof createInMemoryDbAdapter>, private readonly sql: string, values: unknown[] = []) {
    this.values = values;
  }

  bind(...values: unknown[]): D1PreparedStatementLike {
    return new FakeD1PreparedStatement(this.db, this.sql, values);
  }

  async all<T>(): Promise<D1Result<T>> {
    return { success: true, results: await this.db.query<T>(this.sql, this.values as any[]) };
  }

  async first<T>(): Promise<T | null> {
    return this.db.queryOne<T>(this.sql, this.values as any[]);
  }

  async run(): Promise<D1Result> {
    const result = await this.db.execute(this.sql, this.values as any[]);
    return { success: true, meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } };
  }
}

class FakeD1Database implements D1DatabaseLike {
  constructor(private readonly db: ReturnType<typeof createInMemoryDbAdapter>) {}

  prepare(query: string): D1PreparedStatementLike {
    return new FakeD1PreparedStatement(this.db, query);
  }

  async batch<T extends D1PreparedStatementLike>(statements: T[]): Promise<D1Result[]> {
    const results: D1Result[] = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  async exec(query: string): Promise<{ count?: number; duration?: number }> {
    await this.db.exec(query);
    return { count: 0 };
  }
}

async function createD1TestDb() {
  const sqlite = createInMemoryDbAdapter();
  await sqlite.exec(`
    CREATE TABLE donations (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, expected_amount INTEGER NOT NULL, actual_amount INTEGER,
      quantity INTEGER NOT NULL DEFAULT 1, unit_price INTEGER NOT NULL DEFAULT 10000, display_name TEXT NOT NULL,
      title TEXT NOT NULL, email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending_payment',
      provider_order_code INTEGER UNIQUE, provider_payment_link_id TEXT, provider_reference TEXT, payment_raw_event TEXT,
      payment_expires_at TEXT,
      receipt_token_hash TEXT, approved_at TEXT, transaction_at TEXT, payment_received_at TEXT,
      approved_by TEXT, review_reason TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE payment_events (
      id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_order_code INTEGER,
      provider_reference TEXT, payment_link_id TEXT, event_signature TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL, received_at TEXT NOT NULL
    );
    CREATE TABLE email_logs (
      id TEXT PRIMARY KEY, donation_id TEXT NOT NULL, recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL, status TEXT NOT NULL, error_message TEXT, message_id TEXT, sent_at TEXT NOT NULL
    );
    CREATE TABLE templates (key TEXT PRIMARY KEY, subject TEXT, content TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT INTO templates (key, subject, content, updated_at)
    VALUES ('email_thank_you', 'Cảm ơn {{name}}', 'Cảm ơn {{name}} {{amount}} {{code}} {{receipt_url}}', '2026-10-10');
  `);
  return sqlite;
}

test('D1 adapter: PayOS webhook dùng batch atomic path và idempotency', async () => {
  const sqlite = await createD1TestDb();
  const d1 = new D1DatabaseAdapter(new FakeD1Database(sqlite));
  config.payos.checksumKey = 'd1_test_checksum_key';

  await sqlite.execute(
    `INSERT INTO donations (id, code, expected_amount, quantity, unit_price, display_name, title, email, status, provider_order_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`,
    ['d1-donation', 'KV-D2TEST', 20000, 2, 10000, 'D1 Test', 'Bạn', 'd1@example.com', 202610100010, '2026-10-10T00:00:00Z']
  );

  const data = { orderCode: 202610100010, amount: 20000, description: 'KV-D2TEST', reference: 'D1-REF-1', paymentLinkId: 'd1-link' };
  const canonical = Object.keys(data).sort().map((key) => `${key}=${(data as any)[key]}`).join('&');
  const payload = { code: '00', success: true, data, signature: await signHmacSha256(canonical, config.payos.checksumKey) };

  const first = await processPayOSWebhook(payload, JSON.stringify(payload), d1);
  assert.equal(first.action, 'approved');
  assert.equal((await sqlite.queryOne<{ status: string }>('SELECT status FROM donations WHERE id = ?', ['d1-donation']))?.status, 'approved');

  const second = await processPayOSWebhook(payload, JSON.stringify(payload), d1);
  assert.equal(second.action, 'idempotent_skip');
});

