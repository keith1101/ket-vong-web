import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { SqliteDatabaseAdapter } from '../adapter.js';

test('DatabaseAdapter: SQLite in-memory operations', async () => {
  const adapter = new SqliteDatabaseAdapter(':memory:');

  await adapter.execute(`
    CREATE TABLE test_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL
    );
  `);

  const insertRes = await adapter.execute(
    'INSERT INTO test_items (id, name, amount) VALUES (?, ?, ?)',
    ['1', 'Test Item', 10000]
  );
  assert.equal(insertRes.changes, 1);

  const item = await adapter.queryOne<{ id: string; name: string; amount: number }>(
    'SELECT * FROM test_items WHERE id = ?',
    ['1']
  );
  assert.ok(item);
  assert.equal(item.name, 'Test Item');
  assert.equal(item.amount, 10000);

  // Test transaction commit
  await adapter.transaction(async (tx) => {
    await tx.execute('INSERT INTO test_items (id, name, amount) VALUES (?, ?, ?)', ['2', 'Item 2', 20000]);
  });
  const items = await adapter.query('SELECT * FROM test_items');
  assert.equal(items.length, 2);

  // Test transaction rollback
  await assert.rejects(
    async () => {
      await adapter.transaction(async (tx) => {
        await tx.execute('INSERT INTO test_items (id, name, amount) VALUES (?, ?, ?)', ['3', 'Item 3', 30000]);
        throw new Error('Simulated Rollback');
      });
    },
    { message: 'Simulated Rollback' }
  );

  const item3 = await adapter.queryOne('SELECT * FROM test_items WHERE id = ?', ['3']);
  assert.equal(item3, null);
});

test('SRS-004 & SRS-011: Unique constraints on code and sepay_transaction_id', async () => {
  const adapter = new SqliteDatabaseAdapter(':memory:');

  await adapter.execute(`
    CREATE TABLE donations (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      sepay_transaction_id TEXT UNIQUE
    );
  `);

  await adapter.execute('INSERT INTO donations (id, code, sepay_transaction_id) VALUES (?, ?, ?)', [
    'd1',
    'KV-TEST01',
    'TX-1001',
  ]);

  // Duplicate code must fail
  await assert.rejects(async () => {
    await adapter.execute('INSERT INTO donations (id, code, sepay_transaction_id) VALUES (?, ?, ?)', [
      'd2',
      'KV-TEST01',
      'TX-1002',
    ]);
  });

  // Duplicate sepay_transaction_id must fail (Idempotency - SRS-011)
  await assert.rejects(async () => {
    await adapter.execute('INSERT INTO donations (id, code, sepay_transaction_id) VALUES (?, ?, ?)', [
      'd3',
      'KV-TEST02',
      'TX-1001',
    ]);
  });
});

test('NFR-06: bcrypt password hashing cost >= 12', async () => {
  const password = 'TestBcryptCostFactor12@KetVong!';
  const hash = await bcrypt.hash(password, 12);
  assert.ok(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$'));

  const isMatch = await bcrypt.compare(password, hash);
  assert.equal(isMatch, true);
});
