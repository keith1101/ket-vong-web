import path from 'node:path';
import dotenv from 'dotenv';
import { signHmacSha256 } from '../utils/hmac.js';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET || 'sepay_webhook_hmac_secret_test_key_123456';
const targetUrl = process.env.API_URL 
  ? `${process.env.API_URL}/api/v1/webhooks/sepay`
  : 'http://localhost:3001/api/v1/webhooks/sepay';

async function runSimulator() {
  const args = process.argv.slice(2);
  console.log('\n======================================================');
  console.log('🤖 BỘ GIẢ LẬP WEBHOOK SEPAY (LOCAL TESTING - SRS-010–013)');
  console.log(`Mục tiêu: ${targetUrl}`);
  console.log('======================================================\n');

  // Đọc arguments
  let code = '';
  let amount = 10000;
  let customContent = '';
  let invalidSignature = false;
  let duplicateCount = 1;
  let txId = `SIM-TX-${Date.now().toString().slice(-6)}`;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--code' && args[i + 1]) {
      code = args[i + 1];
      i++;
    } else if (args[i] === '--amount' && args[i + 1]) {
      amount = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--content' && args[i + 1]) {
      customContent = args[i + 1];
      i++;
    } else if (args[i] === '--invalid-signature') {
      invalidSignature = true;
    } else if (args[i] === '--duplicate') {
      duplicateCount = 3;
    } else if (args[i] === '--tx' && args[i + 1]) {
      txId = args[i + 1];
      i++;
    }
  }

  // Tạo content chuyển khoản
  const content = customContent || (code ? `Ung ho Ket Vong ${code}` : 'Chuyen tien ung ho');

  const payload = {
    id: txId,
    gateway: 'MBBank',
    transactionDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
    accountNumber: '0987654321',
    subAccount: null,
    code: null,
    content: content,
    transferType: 'in',
    description: content,
    transferAmount: amount,
    accumulated: 1000000,
    referenceCode: `FT${Date.now()}`,
  };

  const rawBody = JSON.stringify(payload);
  let signature = await signHmacSha256(rawBody, webhookSecret);

  if (invalidSignature) {
    signature = 'invalid_hmac_signature_for_testing';
    console.log('⚠️ Đang gửi với CHỮ KÝ HMAC SAI (Kỳ vọng HTTP 401)...');
  }

  for (let attempt = 1; attempt <= duplicateCount; attempt++) {
    if (duplicateCount > 1) {
      console.log(`\n--- Lần gửi ${attempt}/${duplicateCount} (Kiểm thử Idempotency SRS-011) ---`);
    }

    try {
      const startTime = Date.now();
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sepay-Signature': signature,
        },
        body: rawBody,
      });
      const duration = Date.now() - startTime;
      const json = await res.json().catch(() => null);

      console.log(`Status code: ${res.status} (${res.statusText})`);
      console.log(`Thời gian phản hồi: ${duration}ms (NFR-01 yêu cầu < 2000ms)`);
      console.log('Response body:', JSON.stringify(json, null, 2));

      if (res.status === 200) {
        console.log('✅ Thành công: Server trả lời HTTP 200!');
      } else if (res.status === 401 && invalidSignature) {
        console.log('✅ Thành công: Server từ chối chữ ký sai với HTTP 401 chuẩn!');
      } else {
        console.log(`ℹ️ Phản hồi từ server: HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error('❌ Lỗi kết nối tới server:', err.message);
      console.log('Gợi ý: Hãy đảm bảo bạn đã khởi động server backend bằng lệnh: pnpm dev');
      break;
    }
  }

  console.log('\n======================================================\n');
}

runSimulator();

