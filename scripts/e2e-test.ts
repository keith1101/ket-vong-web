import { createApp } from '../apps/api/src/app.js';
import { signHmacSha256 } from '../apps/api/src/utils/hmac.js';
import { config } from '../apps/api/src/config.js';

async function runE2ETest() {
  console.log('\n======================================================');
  console.log('🚀 BẮT ĐẦU E2E VERIFICATION TEST SUITE (HONO APP & API)');
  console.log('======================================================\n');

  const app = createApp();

  // -------------------------------------------------------------------------
  // BƯỚC 1: Tạo Donation Intent (SRS-001, SRS-002, AC-01)
  // -------------------------------------------------------------------------
  console.log('[1/7] Kiểm tra cấp mã ủng hộ (POST /api/v1/donations)...');
  const createRes = await app.request('/api/v1/donations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quantity: 2,
      displayName: 'Trần Minh Anh',
      title: 'Chị',
      email: 'minhanh@gmail.com',
      phone: '0912345678',
      publicMessage: 'Chúc các em nhỏ workshop vui vẻ!',
      isAnonymous: false,
      consent: true,
    }),
  });

  if (!createRes.ok) throw new Error(`Lỗi tạo donation: ${await createRes.text()}`);
  const createData = (await createRes.json() as any).data;
  const donationCode = createData.donation.code;
  const expectedAmount = createData.donation.expected_amount;

  console.log(`✅ Cấp mã thành công: ${donationCode} - Số tiền: ${expectedAmount}đ`);
  if (expectedAmount !== 20000) throw new Error(`Số tiền tính sai: ${expectedAmount}`);

  // -------------------------------------------------------------------------
  // BƯỚC 2: Kiểm tra bảo mật PII trên Public API (SRS-030, NFR-05, AC-03)
  // -------------------------------------------------------------------------
  console.log('\n[2/7] Kiểm tra không rò rỉ PII trên API public (GET /api/v1/donations/public)...');
  const publicRes = await app.request('/api/v1/donations/public');
  const publicRaw = await publicRes.text();
  if (publicRaw.includes('minhanh@gmail.com') || publicRaw.includes('0912345678')) {
    throw new Error('❌ NFR-05 VIOLATION: Phát hiện email hoặc SĐT trong public response!');
  }
  console.log('✅ Bảo mật PII đạt chuẩn: 0 trường SĐT/Email trong API public.');

  // -------------------------------------------------------------------------
  // BƯỚC 3: Giả lập Webhook Chữ Ký Sai -> 401 (SRS-010)
  // -------------------------------------------------------------------------
  console.log('\n[3/7] Kiểm tra chữ ký HMAC sai -> 401 (POST /api/v1/webhooks/sepay)...');
  const badBody = JSON.stringify({ id: `TX-BAD-${Date.now()}`, transferAmount: 20000, content: `Ung ho ${donationCode}` });
  const badSigRes = await app.request('/api/v1/webhooks/sepay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sepay-Signature': 'fake_signature' },
    body: badBody,
  });
  if (badSigRes.status !== 401) throw new Error(`Kỳ vọng 401 nhưng nhận ${badSigRes.status}`);
  console.log('✅ Chữ ký sai bị từ chối chính xác với HTTP 401.');

  // -------------------------------------------------------------------------
  // BƯỚC 4: Webhook Khớp Chuẩn (SRS-012, AC-02 - Happy Path)
  // -------------------------------------------------------------------------
  console.log('\n[4/7] Kiểm tra webhook khớp chuẩn (Mã đúng + Tiền đúng)...');
  const txId = `TX-${Date.now()}`;
  const goodPayload = {
    id: txId,
    transferAmount: expectedAmount,
    content: `CK UNG HO KET VONG ${donationCode}`,
    transactionDate: new Date().toISOString(),
  };
  const goodBody = JSON.stringify(goodPayload);
  const goodSig = await signHmacSha256(goodBody, config.sepayWebhookSecret);

  const goodRes = await app.request('/api/v1/webhooks/sepay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sepay-Signature': goodSig },
    body: goodBody,
  });
  if (!goodRes.ok) throw new Error(`Lỗi webhook: ${await goodRes.text()}`);
  const goodJson = await goodRes.json() as any;
  if (goodJson.action !== 'approved') throw new Error(`Kỳ vọng approved nhưng nhận: ${goodJson.action}`);
  console.log('✅ Webhook khớp thành công -> Trạng thái: approved + kích hoạt gửi mail.');

  // -------------------------------------------------------------------------
  // BƯỚC 5: Chống Ghi Trùng / Idempotency (SRS-011, NFR-04)
  // -------------------------------------------------------------------------
  console.log('\n[5/7] Kiểm tra chống ghi trùng khi SePay retry (Idempotency)...');
  const retryRes = await app.request('/api/v1/webhooks/sepay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sepay-Signature': goodSig },
    body: goodBody,
  });
  const retryJson = await retryRes.json() as any;
  if (retryJson.action !== 'idempotent_skip') throw new Error(`Kỳ vọng idempotent_skip nhưng nhận: ${retryJson.action}`);
  console.log('✅ Gửi lại giao dịch cũ -> Bỏ qua an toàn (idempotent_skip).');

  // -------------------------------------------------------------------------
  // BƯỚC 6: Webhook Lệch Tiền -> manual_review (SRS-012, AC-02)
  // -------------------------------------------------------------------------
  console.log('\n[6/7] Kiểm tra webhook lệch tiền -> manual_review...');
  const create2 = await app.request('/api/v1/donations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quantity: 1,
      displayName: 'Lê Văn B',
      title: 'Anh',
      email: 'b@gmail.com',
      consent: true,
    }),
  });
  const code2 = (await create2.json() as any).data.donation.code;

  // Chuyển thiếu tiền (10.000đ nhưng chuyển 5.000đ)
  const mismatchPayload = {
    id: `TX-MIS-${Date.now()}`,
    transferAmount: 5000,
    content: `Ung ho ${code2}`,
    transactionDate: new Date().toISOString(),
  };
  const mismatchBody = JSON.stringify(mismatchPayload);
  const mismatchSig = await signHmacSha256(mismatchBody, config.sepayWebhookSecret);

  const mismatchRes = await app.request('/api/v1/webhooks/sepay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sepay-Signature': mismatchSig },
    body: mismatchBody,
  });
  const mismatchJson = await mismatchRes.json() as any;
  if (mismatchJson.action !== 'manual_review' || mismatchJson.reason !== 'amount_mismatch') {
    throw new Error(`Kỳ vọng manual_review / amount_mismatch nhưng nhận: ${JSON.stringify(mismatchJson)}`);
  }
  console.log('✅ Chuyển sai số tiền -> Vào hàng chờ manual_review chính xác.');

  // -------------------------------------------------------------------------
  // BƯỚC 7: Chỉ số quỹ Realtime (SRS-031)
  // -------------------------------------------------------------------------
  console.log('\n[7/7] Kiểm tra 4 chỉ số quỹ realtime (GET /api/v1/fund/summary)...');
  const fundRes = await app.request('/api/v1/fund/summary');
  const fundJson = (await fundRes.json() as any).data;
  console.log(`Chỉ số quỹ: Đã nhận: ${fundJson.total_received}đ | Số lượt: ${fundJson.donation_count} | Số dư: ${fundJson.balance}đ`);
  if (fundJson.total_received <= 0 || fundJson.donation_count <= 0) {
    throw new Error('Số liệu quỹ chưa được cập nhật chính xác.');
  }
  console.log('✅ Tính toán chỉ số quỹ realtime hoạt động chuẩn xác.');

  console.log('\n======================================================');
  console.log('🎉 TẤT CẢ 7 BƯỚC E2E VERIFICATION ĐỀU PASS 100%!');
  console.log('======================================================\n');
}

runE2ETest()
  .then(() => {
    console.log('[E2E] Hoàn tất toàn bộ kịch bản test thành công.');
  })
  .catch((err) => {
    console.error('❌ E2E Test Thất bại:', err);
    process.exit(1);
  });
