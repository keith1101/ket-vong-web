import { execSync } from 'node:child_process';
import path from 'node:path';

console.log('[Build] Bắt đầu build toàn bộ Monorepo...');

async function runBuild() {
  try {
    // 1. Build @ketvong/db
    console.log('[Build] 1/3: Đang compile @ketvong/db...');
    execSync('node node_modules/typescript/bin/tsc -p packages/db/tsconfig.json', { stdio: 'inherit' });

    // 2. Build @ketvong/api
    console.log('[Build] 2/3: Đang compile @ketvong/api...');
    execSync('node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json', { stdio: 'inherit' });

    // 3. Build @ketvong/web
    console.log('[Build] 3/3: Đang build @ketvong/web (Vite)...');
    execSync('node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json', { stdio: 'inherit' });

    execSync('node node_modules/vite/bin/vite.js build', {
      cwd: path.resolve('apps/web'),
      stdio: 'inherit',
    });

    console.log('[Build] ✅ Toàn bộ monorepo đã được build thành công!');
  } catch (error: any) {
    console.error('[Build] ❌ Lỗi trong quá trình build:', error.message);
    process.exit(1);
  }
}

runBuild();
