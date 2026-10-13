import { execSync } from 'node:child_process';

console.log('[Test Suite] Đang chạy toàn bộ test cho Monorepo...');

try {
  console.log('\n--- 1. Testing @ketvong/db & @ketvong/api ---');
  execSync('node node_modules/tsx/dist/cli.mjs --test packages/db/src/__tests__/db.test.ts apps/api/src/__tests__/api.test.ts apps/api/src/__tests__/d1-webhook.test.ts apps/api/src/__tests__/email-service.test.ts apps/api/src/__tests__/letter-service.test.ts', { stdio: 'inherit' });

  console.log('\n--- 2. Running E2E Verification Test Suite ---');
  execSync('node node_modules/tsx/dist/cli.mjs ../../scripts/e2e-test.ts', { stdio: 'inherit', cwd: 'apps/api' });

  console.log('\n✅ TẤT CẢ TEST SUITES (UNIT + INTEGRATION + E2E) ĐỀU PASS 100%!\n');
} catch (error: any) {
  console.error('\n❌ Có test bị fail:', error.message);
  process.exit(1);
}

