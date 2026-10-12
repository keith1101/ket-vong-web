import { spawnSync } from 'node:child_process';
import path from 'node:path';

async function main() {
  const wranglerCli = path.resolve('apps/web/node_modules/wrangler/bin/wrangler.js');
  const result = spawnSync(process.execPath, [wranglerCli, 'deploy', '--config', 'wrangler.staging.jsonc'], {
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Wrangler kết thúc với mã ${result.status ?? 'không xác định'}.`);
}

main().catch((error) => {
  console.error('[Cloudflare Staging] Lỗi:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
