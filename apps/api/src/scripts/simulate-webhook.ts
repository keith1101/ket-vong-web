import { signHmacSha256 } from '../utils/hmac.js';
import { config } from '../config.js';

const orderCode = Number(process.argv[2]);
const amount = Number(process.argv[3]);
const reference = process.argv[4] || `SIM-${Date.now()}`;

if (!Number.isSafeInteger(orderCode) || !Number.isSafeInteger(amount)) {
  console.error('Dùng: pnpm webhook:simulate <orderCode> <amount> [reference]');
  process.exit(1);
}

const data = {
  orderCode,
  amount,
  description: `PAYOS-${orderCode}`,
  reference,
  transactionDateTime: new Date().toISOString(),
  paymentLinkId: `sim-${orderCode}`,
};
const canonical = Object.keys(data).sort().map((key) => `${key}=${(data as any)[key]}`).join('&');
const payload = {
  code: '00',
  desc: 'success',
  success: true,
  data,
  signature: await signHmacSha256(canonical, config.payos.checksumKey || 'local-test-checksum'),
};

const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/v1/webhooks/payos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
console.log(await response.text());
if (!response.ok) process.exit(1);
