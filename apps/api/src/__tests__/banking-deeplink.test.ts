import test from 'node:test';
import assert from 'node:assert/strict';
import { getFundSummary } from '../services/donation-service.js';
import { createInMemoryDbAdapter } from '@ketvong/db/sqlite';

test('Fund Summary: retrieves bank account settings including bank_bin, bank_name, bank_account_number', async () => {
  const db = createInMemoryDbAdapter();
  await db.execute('CREATE TABLE IF NOT EXISTS donations (id TEXT PRIMARY KEY, status TEXT, actual_amount INTEGER, expected_amount INTEGER)');
  await db.execute('CREATE TABLE IF NOT EXISTS daily_reports (id TEXT PRIMARY KEY, total_expense INTEGER)');
  await db.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)');

  await db.execute("INSERT INTO settings (key, value) VALUES ('bank_name', 'MB Bank')");
  await db.execute("INSERT INTO settings (key, value) VALUES ('bank_bin', '970422')");
  await db.execute("INSERT INTO settings (key, value) VALUES ('bank_account_number', '0374519443')");
  await db.execute("INSERT INTO settings (key, value) VALUES ('bank_account_name', 'BUI ANH HUY')");
  await db.execute("INSERT INTO settings (key, value) VALUES ('unit_price', '10000')");

  const summary = await getFundSummary(db);
  assert.equal(summary.bank_name, 'MB Bank');
  assert.equal(summary.bank_bin, '970422');
  assert.equal(summary.bank_account_number, '0374519443');
  assert.equal(summary.bank_account_name, 'BUI ANH HUY');
  assert.equal(summary.unit_price, 10000);
});
