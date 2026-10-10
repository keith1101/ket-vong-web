import { getDb } from '../db.js';
import { extractDonationCode } from '../utils/code-generator.js';
import { generateReceiptToken, hashSha256, verifyHmacSha256 } from '../utils/hmac.js';
import { sendThankYouEmail } from './email-service.js';
import { config } from '../config.js';
import type { DatabaseAdapter, Donation } from '@ketvong/db';

export interface SepayWebhookPayload {
  id?: number | string;
  transaction_id?: number | string;
  transferAmount?: number;
  amount?: number;
  content?: string;
  description?: string;
  transactionDate?: string;
  accountNumber?: string;
  gateway?: string;
  referenceCode?: string;
}

export interface WebhookProcessResult {
  success: boolean;
  action: 'approved' | 'idempotent_skip' | 'manual_review' | 'rejected';
  reason?: string;
  donationId?: string;
  code?: string;
}

export async function processSepayWebhook(
  payload: SepayWebhookPayload,
  rawBody: string,
  signatureHeader?: string | null,
  apiKeyOrDb?: string | null | DatabaseAdapter,
  db?: DatabaseAdapter
): Promise<WebhookProcessResult> {
  // Tham số thứ tư được giữ tương thích với simulator cũ; API key không còn
  // được dùng để vượt qua bước xác thực HMAC theo SRS-010.
  const database = db || (typeof apiKeyOrDb === 'object' && apiKeyOrDb ? apiKeyOrDb : null) || getDb();

  // 1. Xác thực HMAC trước mọi xử lý (SRS-010)
  const isValidHmac = await verifyHmacSha256(rawBody, signatureHeader, config.sepayWebhookSecret);

  if (!isValidHmac) {
    console.warn('[Sepay Webhook] Cảnh báo: chữ ký không hợp lệ.');
    return {
      success: false,
      action: 'rejected',
      reason: 'invalid_signature',
    };
  }

  // 2. Chuẩn hóa các trường theo hợp đồng SePay (SRS §5.2)
  const transactionId = String(payload.id ?? payload.transaction_id ?? '');
  const transferAmount = Number(payload.transferAmount ?? payload.amount ?? 0);
  const transferContent = String(payload.content ?? payload.description ?? '').trim();
  const transactionDate = payload.transactionDate || new Date().toISOString();

  if (!transactionId) {
    throw new Error('Payload SePay thiếu transaction ID');
  }

  // 3. Chống ghi trùng (Idempotency - SRS-011, NFR-04)
  const existingTx = await database.queryOne<Donation>(
    'SELECT id, code, status FROM donations WHERE sepay_transaction_id = ?',
    [transactionId]
  );
  if (existingTx) {
    console.log(`[Sepay Webhook] Giao dịch ${transactionId} đã xử lý trước đó, bỏ qua (idempotent).`);
    return {
      success: true,
      action: 'idempotent_skip',
      donationId: existingTx.id,
      code: existingTx.code,
    };
  }

  // 4. Bóc tách mã KV-XXXXXX từ nội dung chuyển khoản (SRS-012)
  const extractedCode = extractDonationCode(transferContent);
  const now = new Date().toISOString();

  // Đảm bảo mã quá 48 giờ được chuyển sang expired trước khi đối chiếu.
  await database.execute(
    "UPDATE donations SET status = 'expired' WHERE status = 'awaiting_transfer' AND created_at < ?",
    [new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()]
  );

  if (extractedCode) {
    const donation = await database.queryOne<Donation>(
      'SELECT * FROM donations WHERE code = ?',
      [extractedCode]
    );

    if (donation) {
      // Trường hợp 4A: Trạng thái đang là awaiting_transfer
      if (donation.status === 'awaiting_transfer') {
        // So khớp số tiền tuyệt đối (SRS-012)
        if (transferAmount === donation.expected_amount) {
          // KHỚP CHUẨN -> APPROVED (Happy path)
          const receiptToken = generateReceiptToken();
          const tokenHash = await hashSha256(receiptToken);

          await database.execute(
            `UPDATE donations SET
              status = 'approved',
              actual_amount = ?,
              sepay_transaction_id = ?,
              receipt_token_hash = ?,
              approved_at = ?,
              transaction_at = ?,
              approved_by = 'system',
              raw_transfer_content = ?
             WHERE id = ?`,
            [
              transferAmount,
              transactionId,
              tokenHash,
              now,
              transactionDate,
              transferContent,
              donation.id,
            ]
          );

          // Trigger gửi mail cảm ơn tự động kèm receipt token (SRS-050)
          sendThankYouEmail(
            {
              donationId: donation.id,
              code: donation.code,
              email: donation.email,
              title: donation.title,
              name: donation.display_name,
              amount: transferAmount,
              quantity: donation.quantity,
              receiptToken,
            },
            database
          ).catch((err) => {
            console.error('[Sepay Webhook] Lỗi ngầm khi gửi email cảm ơn:', err);
          });

          return {
            success: true,
            action: 'approved',
            donationId: donation.id,
            code: donation.code,
          };
        } else {
          // LỆCH TIỀN -> MANUAL_REVIEW (SRS-012)
          await database.execute(
            `UPDATE donations SET
              status = 'manual_review',
              actual_amount = ?,
              sepay_transaction_id = ?,
              review_reason = 'amount_mismatch',
              transaction_at = ?,
              raw_transfer_content = ?
             WHERE id = ?`,
            [transferAmount, transactionId, transactionDate, transferContent, donation.id]
          );

          return {
            success: true,
            action: 'manual_review',
            reason: 'amount_mismatch',
            donationId: donation.id,
            code: donation.code,
          };
        }
      } else if (donation.status === 'approved') {
        // Trường hợp 4B: Mã đã được approved trước đó nhưng nhận thêm giao dịch thứ 2 (SRS-013)
        const duplicateId = crypto.randomUUID();
        await database.execute(
          `INSERT INTO donations (
            id, code, expected_amount, actual_amount, quantity, unit_price,
            display_name, title, email, phone, public_message,
            is_anonymous, consent, status, sepay_transaction_id,
            review_reason, created_at, transaction_at, raw_transfer_content
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'manual_review', ?, 'possible_duplicate', ?, ?, ?)`,
          [
            duplicateId,
            `${donation.code}-DUP-${crypto.randomUUID().slice(0, 8)}`,
            donation.expected_amount,
            transferAmount,
            donation.quantity,
            donation.unit_price,
            donation.display_name,
            donation.title,
            donation.email,
            donation.phone,
            donation.public_message,
            donation.is_anonymous,
            transactionId,
            now,
            transactionDate,
            transferContent,
          ]
        );

        return {
          success: true,
          action: 'manual_review',
          reason: 'possible_duplicate',
          donationId: duplicateId,
          code: donation.code,
        };
      } else if (donation.status === 'expired') {
        // Trường hợp 4C: Mã đã hết hạn 48h nhưng tiền mới về (SRS-004)
        await database.execute(
          `UPDATE donations SET
            status = 'manual_review',
            actual_amount = ?,
            sepay_transaction_id = ?,
      transaction_at = ?,
            review_reason = 'expired_code',
            raw_transfer_content = ?
           WHERE id = ?`,
      [transferAmount, transactionId, transactionDate, transferContent, donation.id]
        );

        return {
          success: true,
          action: 'manual_review',
          reason: 'expired_code',
          donationId: donation.id,
          code: donation.code,
        };
      }
    }
  }

  // 5. Nếu không tách được mã hoặc mã không tồn tại trong hệ thống (SRS-012, SRS-013)
  const unknownId = crypto.randomUUID();
  const unknownCode = extractedCode || `UNMATCHED-${transactionId}-${crypto.randomUUID().slice(0, 8)}`;
  const reviewReason = extractedCode ? 'unmatched' : 'missing_code';
  const unitPriceRow = await database.queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'unit_price'");
  const configuredUnitPrice = Number(unitPriceRow?.value) || 0;

  await database.execute(
    `INSERT INTO donations (
      id, code, expected_amount, actual_amount, quantity, unit_price,
      display_name, title, email, is_anonymous, consent,
      status, sepay_transaction_id, review_reason, created_at, transaction_at, raw_transfer_content
    ) VALUES (?, ?, ?, ?, 1, ?, 'Chưa xác định', 'Bạn', '', 0, 0, 'manual_review', ?, ?, ?, ?, ?)`,
    [
      unknownId,
      unknownCode,
      transferAmount,
      transferAmount,
      configuredUnitPrice,
      transactionId,
      reviewReason,
      now,
      transactionDate,
      transferContent,
    ]
  );

  return {
    success: true,
    action: 'manual_review',
    reason: reviewReason,
    donationId: unknownId,
    code: unknownCode,
  };
}

/**
 * Đếm số giao dịch SePay đã nhận trong tháng hiện tại (phục vụ cảnh báo mốc 50 giao dịch/tháng gói free)
 */
export async function getMonthlySepayCount(db?: DatabaseAdapter): Promise<number> {
  const database = db || getDb();
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  
  const row = await database.queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM donations
     WHERE sepay_transaction_id IS NOT NULL AND COALESCE(transaction_at, created_at) >= ?`,
    [currentMonthStart]
  );
  return row?.count || 0;
}

