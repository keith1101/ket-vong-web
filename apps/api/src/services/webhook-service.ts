import { getDb } from '../db.js';
import { generateReceiptToken, hashSha256, signHmacSha256 } from '../utils/hmac.js';
import { sendThankYouEmail } from './email-service.js';
import { config } from '../config.js';
import type { DatabaseAdapter, Donation } from '@ketvong/db';
import { D1DatabaseAdapter } from '@ketvong/db/d1';
import { extractDonationCode } from '../utils/code-generator.js';

export interface PayOSWebhookData {
  orderCode?: number;
  amount?: number;
  description?: string;
  accountNumber?: string;
  reference?: string;
  transactionDateTime?: string;
  paymentLinkId?: string;
  currency?: string;
  [key: string]: unknown;
}

export interface PayOSWebhookPayload {
  code?: string;
  desc?: string;
  success?: boolean;
  data?: PayOSWebhookData | null;
  signature?: string;
}

export interface WebhookProcessResult {
  success: boolean;
  action: 'approved' | 'idempotent_skip' | 'manual_review' | 'rejected';
  reason?: string;
  donationId?: string;
  code?: string;
}

export interface WebhookRuntime {
  waitUntil?: (promise: Promise<unknown>) => void;
}

function paymentBindingReason(
  donation: Donation,
  data: PayOSWebhookData,
  amount: number,
  now: string
): string | null {
  if (amount !== donation.expected_amount) return 'amount_mismatch';
  if (donation.provider_payment_link_id && String(data.paymentLinkId || '') !== donation.provider_payment_link_id) {
    return 'payment_link_mismatch';
  }
  if (data.currency && String(data.currency).toUpperCase() !== 'VND') return 'currency_mismatch';
  const description = typeof data.description === 'string' ? data.description : '';
  if (!description || extractDonationCode(description) !== donation.code) return 'missing_code';
  if (donation.payment_expires_at && Date.parse(donation.payment_expires_at) <= Date.parse(now)) return 'late_payment';
  return null;
}

function serializePayOSData(data: PayOSWebhookData): string {
  return Object.keys(data)
    .sort()
    .map((key) => {
      const value = data[key];
      let normalized: string;
      if (value === null || value === undefined) normalized = '';
      else if (Array.isArray(value)) normalized = JSON.stringify([...value].sort());
      else if (typeof value === 'object') normalized = JSON.stringify(value);
      else normalized = String(value);
      return `${key}=${normalized}`;
    })
    .join('&');
}

export async function verifyPayOSWebhook(data: PayOSWebhookData, signature?: string | null): Promise<boolean> {
  if (!signature || !config.payos.checksumKey) return false;
  return (await signHmacSha256(serializePayOSData(data), config.payos.checksumKey)).toLowerCase() === signature.toLowerCase();
}

export async function processPayOSWebhook(
  payload: PayOSWebhookPayload,
  rawBody: string,
  db?: DatabaseAdapter,
  runtime?: WebhookRuntime
): Promise<WebhookProcessResult> {
  const database = db || getDb();
  const data = payload.data;
  const successFieldIsValid =
    payload.success === undefined || payload.success === null || payload.success === true;
  if (!data || !successFieldIsValid || payload.code !== '00' || !payload.signature) {
    return { success: false, action: 'rejected', reason: 'invalid_payload' };
  }
  if (!(await verifyPayOSWebhook(data, payload.signature))) {
    return { success: false, action: 'rejected', reason: 'invalid_signature' };
  }

  const orderCode = Number(data.orderCode);
  const amount = Number(data.amount);
  const reference = String(data.reference || data.paymentLinkId || `order-${orderCode}`);
  if (!Number.isSafeInteger(orderCode) || !Number.isSafeInteger(amount) || amount < 0) {
    return { success: false, action: 'rejected', reason: 'invalid_payment_data' };
  }

  if (database instanceof D1DatabaseAdapter) {
    const result = await processPayOSWebhookOnD1(database, payload, rawBody, data, orderCode, amount, reference);
    sendApprovedWebhookEmail(result, database, runtime?.waitUntil);
    return result;
  }

  const result = await database.transaction(async (tx) => {
    const eventInsert = await tx.execute(
      `INSERT OR IGNORE INTO payment_events
       (id, provider, provider_order_code, provider_reference, payment_link_id, event_signature, payload, received_at)
       VALUES (?, 'payos', ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        orderCode,
        reference,
        data.paymentLinkId ? String(data.paymentLinkId) : null,
        payload.signature,
        rawBody,
        new Date().toISOString(),
      ]
    );
    if (eventInsert.changes === 0) {
      const existing = await tx.queryOne<Donation>('SELECT id, code FROM donations WHERE provider_order_code = ?', [orderCode]);
      return { success: true, action: 'idempotent_skip' as const, donationId: existing?.id, code: existing?.code };
    }

    const donation = await tx.queryOne<Donation>('SELECT * FROM donations WHERE provider_order_code = ?', [orderCode]);
    const now = new Date().toISOString();
    const transactionAt = String(data.transactionDateTime || now);

    if (!donation) {
      const unknownId = crypto.randomUUID();
      const unknownCode = `UNMATCHED-PAYOS-${orderCode}`;
      await tx.execute(
        `INSERT INTO donations (
          id, code, expected_amount, actual_amount, quantity, unit_price,
          display_name, title, email, is_anonymous, consent, status,
          payment_provider, provider_order_code, provider_reference,
          payment_received_at, payment_raw_event, review_reason, created_at, transaction_at
        ) VALUES (?, ?, ?, ?, 1, 0, 'Chưa xác định', 'Bạn', '', 0, 0, 'manual_review',
          'payos', ?, ?, ?, ?, 'unmatched_payment', ?, ?)`,
        [unknownId, unknownCode, amount, amount, orderCode, reference, transactionAt, rawBody, now, transactionAt]
      );
      return { success: true, action: 'manual_review' as const, reason: 'unmatched_payment', donationId: unknownId, code: unknownCode };
    }

    if (donation.status === 'approved') {
      await tx.execute(
        `UPDATE donations SET status = 'manual_review', review_reason = 'duplicate_payment',
         actual_amount = ?, payment_raw_event = ?, transaction_at = ? WHERE id = ?`,
        [amount, rawBody, transactionAt, donation.id]
      );
      return { success: true, action: 'manual_review' as const, reason: 'duplicate_payment', donationId: donation.id, code: donation.code };
    }

    if (donation.status === 'expired' || donation.status === 'cancelled') {
      await tx.execute(
        `UPDATE donations SET status = 'manual_review', actual_amount = ?, provider_reference = ?,
         payment_received_at = ?, payment_raw_event = ?, transaction_at = ?, review_reason = 'late_payment'
         WHERE id = ?`,
        [amount, reference, transactionAt, rawBody, transactionAt, donation.id]
      );
      return { success: true, action: 'manual_review' as const, reason: 'late_payment', donationId: donation.id, code: donation.code };
    }

    if (donation.status !== 'pending_payment') {
      return { success: true, action: 'manual_review' as const, reason: 'already_under_review', donationId: donation.id, code: donation.code };
    }

    const bindingReason = paymentBindingReason(donation, data, amount, now);
    if (bindingReason) {
      await tx.execute(
        `UPDATE donations SET status = 'manual_review', actual_amount = ?, provider_reference = ?,
         payment_received_at = ?, payment_raw_event = ?, transaction_at = ?, review_reason = ?
         WHERE id = ?`,
        [amount, reference, transactionAt, rawBody, transactionAt, bindingReason, donation.id]
      );
      return { success: true, action: 'manual_review' as const, reason: bindingReason, donationId: donation.id, code: donation.code };
    }

    const receiptToken = generateReceiptToken();
    await tx.execute(
      `UPDATE donations SET status = 'approved', actual_amount = ?, provider_reference = ?,
       receipt_token_hash = ?, approved_at = ?, transaction_at = ?, payment_received_at = ?,
       payment_raw_event = ?, approved_by = 'system', review_reason = NULL
       WHERE id = ? AND status = 'pending_payment'
         AND (payment_expires_at IS NULL OR payment_expires_at > ?)`,
      [amount, reference, await hashSha256(receiptToken), now, transactionAt, transactionAt, rawBody, donation.id, now]
    );
    const changed = await tx.queryOne<{ status: string }>('SELECT status FROM donations WHERE id = ?', [donation.id]);
    if (changed?.status !== 'approved') {
      return { success: true, action: 'idempotent_skip' as const, donationId: donation.id, code: donation.code };
    }
    return {
      success: true,
      action: 'approved' as const,
      donationId: donation.id,
      code: donation.code,
      email: {
        donationId: donation.id,
        code: donation.code,
        email: donation.email,
        title: donation.title,
        name: donation.display_name,
        amount,
        quantity: donation.quantity,
        receiptToken,
      },
    };
  });

  sendApprovedWebhookEmail(result, database, runtime?.waitUntil);
  return result;
}

type ApprovedWebhookResult = WebhookProcessResult & {
  email?: {
    donationId: string;
    code: string;
    email: string;
    title: string;
    name: string;
    amount: number;
    quantity: number;
    receiptToken: string;
  };
};

function sendApprovedWebhookEmail(
  result: ApprovedWebhookResult,
  database: DatabaseAdapter,
  waitUntil?: (promise: Promise<unknown>) => void
): void {
  if (result.action === 'approved' && result.email) {
    const emailPromise = sendThankYouEmail(result.email, database).catch((error) => {
      console.error('[PayOS Webhook] Không thể gửi email cảm ơn:', error);
    });
    if (waitUntil) waitUntil(emailPromise);
    else void emailPromise;
  }
}

/**
 * D1 path: INSERT payment event và trạng thái donation được đưa vào cùng
 * một D1 batch. D1 batch là transaction atomic; không dùng transaction
 * callback của SQLite vì callback đó không tồn tại trên Workers.
 */
async function processPayOSWebhookOnD1(
  database: D1DatabaseAdapter,
  payload: PayOSWebhookPayload,
  rawBody: string,
  data: PayOSWebhookData,
  orderCode: number,
  amount: number,
  reference: string,
): Promise<ApprovedWebhookResult> {
  const eventSignature = payload.signature as string;
  const eventInsert = {
    sql: `INSERT OR IGNORE INTO payment_events
      (id, provider, provider_order_code, provider_reference, payment_link_id, event_signature, payload, received_at)
      VALUES (?, 'payos', ?, ?, ?, ?, ?, ?)`,
    params: [
      crypto.randomUUID(),
      orderCode,
      reference,
      data.paymentLinkId ? String(data.paymentLinkId) : null,
      eventSignature,
      rawBody,
      new Date().toISOString(),
    ],
  };

  const alreadyRecorded = await database.queryOne<{ id: string }>(
    'SELECT id FROM payment_events WHERE provider = ? AND event_signature = ?',
    ['payos', eventSignature]
  );
  if (alreadyRecorded) {
    const existing = await database.queryOne<Donation>('SELECT id, code FROM donations WHERE provider_order_code = ?', [orderCode]);
    return { success: true, action: 'idempotent_skip', donationId: existing?.id, code: existing?.code };
  }

  const donation = await database.queryOne<Donation>('SELECT * FROM donations WHERE provider_order_code = ?', [orderCode]);
  const now = new Date().toISOString();
  const transactionAt = String(data.transactionDateTime || now);

  if (!donation) {
    const unknownId = crypto.randomUUID();
    const unknownCode = `UNMATCHED-PAYOS-${orderCode}`;
    const batch = await database.batchExecute([
      eventInsert,
      {
        sql: `INSERT OR IGNORE INTO donations (
          id, code, expected_amount, actual_amount, quantity, unit_price,
          display_name, title, email, is_anonymous, consent, status,
          payment_provider, provider_order_code, provider_reference,
          payment_received_at, payment_raw_event, review_reason, created_at, transaction_at
        ) VALUES (?, ?, ?, ?, 1, 0, 'Chưa xác định', 'Bạn', '', 0, 0, 'manual_review',
          'payos', ?, ?, ?, ?, 'unmatched_payment', ?, ?)`,
        params: [unknownId, unknownCode, amount, amount, orderCode, reference, transactionAt, rawBody, now, transactionAt],
      },
    ]);
    if (batch[0].changes === 0) {
      const existing = await database.queryOne<Donation>('SELECT id, code FROM donations WHERE provider_order_code = ?', [orderCode]);
      return { success: true, action: 'idempotent_skip', donationId: existing?.id, code: existing?.code };
    }
    return { success: true, action: 'manual_review', reason: 'unmatched_payment', donationId: unknownId, code: unknownCode };
  }

  if (donation.status === 'approved') {
    const batch = await database.batchExecute([
      eventInsert,
      {
        sql: `UPDATE donations SET status = 'manual_review', review_reason = 'duplicate_payment',
          actual_amount = ?, payment_raw_event = ?, transaction_at = ?
          WHERE id = ? AND status = 'approved'`,
        params: [amount, rawBody, transactionAt, donation.id],
      },
    ]);
    if (batch[0].changes === 0) return { success: true, action: 'idempotent_skip', donationId: donation.id, code: donation.code };
    return { success: true, action: 'manual_review', reason: 'duplicate_payment', donationId: donation.id, code: donation.code };
  }

  if (donation.status === 'expired' || donation.status === 'cancelled') {
    const batch = await database.batchExecute([
      eventInsert,
      {
        sql: `UPDATE donations SET status = 'manual_review', actual_amount = ?, provider_reference = ?,
          payment_received_at = ?, payment_raw_event = ?, transaction_at = ?, review_reason = 'late_payment'
          WHERE id = ? AND status IN ('expired', 'cancelled')`,
        params: [amount, reference, transactionAt, rawBody, transactionAt, donation.id],
      },
    ]);
    if (batch[0].changes === 0) return { success: true, action: 'idempotent_skip', donationId: donation.id, code: donation.code };
    return { success: true, action: 'manual_review', reason: 'late_payment', donationId: donation.id, code: donation.code };
  }

  if (donation.status !== 'pending_payment') {
    const eventResult = await database.batchExecute([eventInsert]);
    if (eventResult[0].changes === 0) return { success: true, action: 'idempotent_skip', donationId: donation.id, code: donation.code };
    return { success: true, action: 'manual_review', reason: 'already_under_review', donationId: donation.id, code: donation.code };
  }

  const bindingReason = paymentBindingReason(donation, data, amount, now);
  if (bindingReason) {
    const batch = await database.batchExecute([
      eventInsert,
      {
        sql: `UPDATE donations SET status = 'manual_review', actual_amount = ?, provider_reference = ?,
          payment_received_at = ?, payment_raw_event = ?, transaction_at = ?, review_reason = ?
          WHERE id = ? AND status = 'pending_payment'`,
        params: [amount, reference, transactionAt, rawBody, transactionAt, bindingReason, donation.id],
      },
    ]);
    if (batch[0].changes === 0) return { success: true, action: 'idempotent_skip', donationId: donation.id, code: donation.code };
    if (batch[1].changes === 1) return { success: true, action: 'manual_review', reason: bindingReason, donationId: donation.id, code: donation.code };
    return { success: true, action: 'manual_review', reason: 'already_under_review', donationId: donation.id, code: donation.code };
  }

  const receiptToken = generateReceiptToken();
  const batch = await database.batchExecute([
    eventInsert,
    {
      sql: `UPDATE donations SET status = 'approved', actual_amount = ?, provider_reference = ?,
        receipt_token_hash = ?, approved_at = ?, transaction_at = ?, payment_received_at = ?,
        payment_raw_event = ?, approved_by = 'system', review_reason = NULL
        WHERE id = ? AND status = 'pending_payment' AND expected_amount = ?
          AND (payment_expires_at IS NULL OR payment_expires_at > ?)`,
      params: [amount, reference, await hashSha256(receiptToken), now, transactionAt, transactionAt, rawBody, donation.id, amount, now],
    },
  ]);

  if (batch[0].changes === 0) return { success: true, action: 'idempotent_skip', donationId: donation.id, code: donation.code };
  if (batch[1].changes === 0) {
    const current = await database.queryOne<Donation>('SELECT status FROM donations WHERE id = ?', [donation.id]);
    if (current?.status === 'approved') {
      await database.execute(
        `UPDATE donations SET status = 'manual_review', review_reason = 'duplicate_payment',
          actual_amount = ?, payment_raw_event = ?, transaction_at = ?
          WHERE id = ? AND status = 'approved'`,
        [amount, rawBody, transactionAt, donation.id]
      );
      return { success: true, action: 'manual_review', reason: 'duplicate_payment', donationId: donation.id, code: donation.code };
    }
    return { success: true, action: 'idempotent_skip', donationId: donation.id, code: donation.code };
  }

  return {
    success: true,
    action: 'approved',
    donationId: donation.id,
    code: donation.code,
    email: {
      donationId: donation.id,
      code: donation.code,
      email: donation.email,
      title: donation.title,
      name: donation.display_name,
      amount,
      quantity: donation.quantity,
      receiptToken,
    },
  };
}

export async function getMonthlyPaymentCount(db?: DatabaseAdapter): Promise<number> {
  const database = db || getDb();
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const row = await database.queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM payment_events WHERE provider = 'payos' AND received_at >= ?`,
    [start]
  );
  return row?.count || 0;
}
