import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { setDbForTesting } from '../db.js';
import { createInMemoryDbAdapter } from '@ketvong/db/sqlite';
import { hashSha256 } from '../utils/hmac.js';
import { getSession } from '../services/auth-service.js';
import { config } from '../config.js';

async function setupTestDb() {
  const db = createInMemoryDbAdapter();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      cover_image TEXT,
      category TEXT NOT NULL DEFAULT 'Hoạt động',
      status TEXT NOT NULL DEFAULT 'draft',
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      admin_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed 1 admin user and session
  const adminId = 'admin-test-id';
  const token = 'test-token-12345';
  const tokenHash = await hashSha256(token);
  const now = new Date().toISOString();
  const expiresAt = Date.now() + 86400000;

  await db.execute(
    'INSERT INTO admins (id, email, password_hash, name, role, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [adminId, 'admin@ketvong.vn', 'hash', 'Admin Tester', 'super-admin', 0, now]
  );

  await db.execute(
    'INSERT INTO admin_sessions (token_hash, admin_id, email, name, role, must_change_password, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [tokenHash, adminId, 'admin@ketvong.vn', 'Admin Tester', 'super-admin', 0, expiresAt, now]
  );

  const session = await getSession(token, db);

  // Seed 1 published post and 1 draft post
  await db.execute(
    `INSERT INTO posts (id, slug, title, excerpt, content_markdown, cover_image, category, status, author_id, author_name, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'post-pub-1',
      'bai-viet-cong-khai-1',
      'Bài viết công khai số 1',
      'Tóm tắt bài 1',
      '## Nội dung bài 1',
      '/images/coming-soon.png',
      'Hoạt động',
      'published',
      adminId,
      'Admin Tester',
      now,
      now,
      now,
    ]
  );

  await db.execute(
    `INSERT INTO posts (id, slug, title, excerpt, content_markdown, cover_image, category, status, author_id, author_name, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'post-draft-1',
      'bai-viet-nhap-1',
      'Bài viết nháp chưa xuất bản',
      'Tóm tắt bài nháp',
      '## Nội dung bài nháp bí mật',
      null,
      'Thông báo',
      'draft',
      adminId,
      'Admin Tester',
      null,
      now,
      now,
    ]
  );

  return { db, token, csrfToken: session!.csrfToken };
}

test('Public Posts API: returns only published posts and excludes drafts', async () => {
  const { db } = await setupTestDb();
  setDbForTesting(db);
  const app = createApp();

  const res = await app.request('/api/v1/posts');
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.items.length, 1);
  assert.equal(json.data.items[0].slug, 'bai-viet-cong-khai-1');
  assert.equal(json.data.pagination.total_items, 1);
});

test('Public Posts API: detail returns post and related; draft returns 404', async () => {
  const { db } = await setupTestDb();
  setDbForTesting(db);
  const app = createApp();

  // Published post
  const resPub = await app.request('/api/v1/posts/bai-viet-cong-khai-1');
  assert.equal(resPub.status, 200);
  const jsonPub = await resPub.json();
  assert.equal(jsonPub.data.post.title, 'Bài viết công khai số 1');

  // Draft post should return 404
  const resDraft = await app.request('/api/v1/posts/bai-viet-nhap-1');
  assert.equal(resDraft.status, 404);
});

test('Admin Posts API: requires authentication', async () => {
  const { db } = await setupTestDb();
  setDbForTesting(db);
  const app = createApp();

  const res = await app.request('/api/v1/admin/posts');
  assert.equal(res.status, 401);
});

test('Admin Posts API: full CRUD lifecycle (create, read, update, delete)', async () => {
  const { db, token, csrfToken } = await setupTestDb();
  setDbForTesting(db);
  const app = createApp();

  const authHeader = { 'x-admin-token': token };
  const origin = new URL(config.publicBaseUrl).origin;
  const authMutationHeader = {
    'x-admin-token': token,
    'x-csrf-token': csrfToken,
    'Origin': origin,
  };

  // 1. Read all posts as admin
  const resList = await app.request('/api/v1/admin/posts', { headers: authHeader });
  assert.equal(resList.status, 200);
  const jsonList = await resList.json();
  assert.equal(jsonList.data.length, 2); // 1 published + 1 draft

  // 2. Create a new post
  const resCreate = await app.request('/api/v1/admin/posts', {
    method: 'POST',
    headers: { ...authMutationHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Workshop thứ hai cùng các em',
      content_markdown: '## Chi tiết buổi workshop thứ hai diễn ra thật vui vẻ!',
      category: 'Hoạt động',
      status: 'published',
      cover_image: '/images/workshop-1.jpg',
    }),
  });
  assert.equal(resCreate.status, 200);
  const jsonCreate = await resCreate.json();
  assert.equal(jsonCreate.success, true);
  assert.equal(jsonCreate.data.status, 'published');
  assert.ok(jsonCreate.data.slug.includes('workshop-thu-hai'));

  const createdId = jsonCreate.data.id;

  // 3. Update the post
  const resUpdate = await app.request(`/api/v1/admin/posts/${createdId}`, {
    method: 'PUT',
    headers: { ...authMutationHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Workshop thứ hai đã hoàn thành xuất sắc',
      status: 'draft',
    }),
  });
  assert.equal(resUpdate.status, 200);
  const jsonUpdate = await resUpdate.json();
  assert.equal(jsonUpdate.data.title, 'Workshop thứ hai đã hoàn thành xuất sắc');
  assert.equal(jsonUpdate.data.status, 'draft');

  // 4. Delete the post
  const resDelete = await app.request(`/api/v1/admin/posts/${createdId}`, {
    method: 'DELETE',
    headers: authMutationHeader,
  });
  assert.equal(resDelete.status, 200);

  // 5. Verify deleted
  const postInDb = await db.queryOne('SELECT * FROM posts WHERE id = ?', [createdId]);
  assert.equal(postInDb, null);

  // 6. Verify audit logs recorded
  const auditLogs = await db.query<{ action: string }>('SELECT action FROM audit_logs WHERE action LIKE ?', ['%POST%']);
  assert.ok(auditLogs.some((l) => l.action === 'CREATE_POST'));
  assert.ok(auditLogs.some((l) => l.action === 'UPDATE_POST'));
  assert.ok(auditLogs.some((l) => l.action === 'DELETE_POST'));
});
