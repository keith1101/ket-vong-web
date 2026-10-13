import { getDb } from '../db.js';
import { generateDonationCode } from '../utils/code-generator.js';
import { generateReceiptToken, hashSha256 } from '../utils/hmac.js';
import { createPayOSPayment } from './payos-provider.js';
import type { DatabaseAdapter, Donation, PublicDonationItem, FundSummary } from '@ketvong/db';

export interface CreateDonationInput {
  quantity: number;
  displayName: string;
  title: string;
  email?: string | null;
  phone?: string | null;
  publicMessage?: string | null;
  isAnonymous?: boolean;
  consent: boolean;
}

export async function createDonationIntent(
  input: CreateDonationInput,
  db?: DatabaseAdapter,
  options: { createPayment?: boolean; skipPayment?: boolean } = {}
): Promise<{
  donation: {
    id: string;
    code: string;
    expected_amount: number;
    quantity: number;
    unit_price: number;
    status: string;
    created_at: string;
  };
  statusToken: string;
  payment: {
    provider: 'payos';
    orderCode: number;
    paymentLinkId: string;
    checkoutUrl: string;
    qrCode: string;
    expiresAt: string;
  } | null;
}> {
  const database = db || getDb();

  // Kiểm tra consent (SRS-002, SRS-070, NFR-07)
  if (!input.consent) {
    throw new Error('Bạn cần đồng ý với chính sách xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP để tiếp tục.');
  }

  if (input.quantity <= 0 || !Number.isInteger(input.quantity)) {
    throw new Error('Số lượng vòng tay ủng hộ phải là số nguyên dương lớn hơn 0.');
  }

  if (!input.displayName || input.displayName.trim().length === 0) {
    throw new Error('Vui lòng nhập họ và tên hoặc tên hiển thị của bạn.');
  }

  if (input.email && input.email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    throw new Error('Địa chỉ email chưa đúng định dạng.');
  }
  if (!['Cô', 'Chú', 'Anh', 'Chị', 'Bạn'].includes(input.title)) {
    throw new Error('Vui lòng chọn cách xưng hô hợp lệ.');
  }
  if (input.phone && !/^[0-9+().\s-]{8,20}$/.test(input.phone.trim())) {
    throw new Error('Số điện thoại chưa đúng định dạng.');
  }

  // Đọc cài đặt đơn giá từ DB (SRS-001, SRS-062)
  const settingsRows = await database.query<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key IN ('unit_price', 'max_quantity')"
  );
  const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value]));

  const unitPrice = Number(settingsMap.get('unit_price'));
  if (!Number.isSafeInteger(unitPrice) || unitPrice <= 0) {
    throw new Error('Cấu hình đơn giá chưa sẵn sàng. Vui lòng liên hệ ban tổ chức.');
  }
  const maxQuantity = Number(settingsMap.get('max_quantity'));
  const effectiveMaxQuantity = Number.isSafeInteger(maxQuantity) && maxQuantity > 0 ? maxQuantity : 1000;
  if (input.quantity > effectiveMaxQuantity) {
    throw new Error(`Số lượng tối đa cho một lần ủng hộ là ${effectiveMaxQuantity} chiếc.`);
  }
  const expectedAmount = input.quantity * unitPrice;

  // Sinh mã KV-XXXXXX duy nhất (SRS-004)
  let code = '';
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 10) {
    attempts++;
    code = generateDonationCode();
    const existing = await database.queryOne('SELECT id FROM donations WHERE code = ?', [code]);
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new Error('Hệ thống tạm thời không thể cấp mã ủng hộ mới, vui lòng thử lại sau giây lát.');
  }

  const id = crypto.randomUUID();
  const statusToken = generateReceiptToken();
  const now = new Date().toISOString();
  const isAnonymous = input.isAnonymous ? 1 : 0;
  const consent = input.consent ? 1 : 0;

  const initialStatus = options.skipPayment
    ? 'pending_payment'
    : options.createPayment === false
      ? 'approved'
      : 'pending_payment';
  await database.execute(
    `INSERT INTO donations (
      id, code, expected_amount, quantity, unit_price,
      display_name, title, email, phone, public_message,
      is_anonymous, consent, status, public_status_token_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      expectedAmount,
      input.quantity,
      unitPrice,
      input.displayName.trim(),
      input.title || 'Bạn',
      input.email?.trim() ? input.email.trim().toLowerCase() : '',
      input.phone ? input.phone.trim() : null,
      input.publicMessage ? input.publicMessage.trim() : null,
      isAnonymous,
      consent,
      initialStatus,
      await hashSha256(statusToken),
      now,
    ]
  );

  let payment: {
    provider: 'payos';
    orderCode: number;
    paymentLinkId: string;
    checkoutUrl: string;
    qrCode: string;
    expiresAt: string;
  } | null = null;

  if (options.createPayment !== false) {
    let orderCode = Number(`${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`);
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await database.queryOne('SELECT id FROM donations WHERE provider_order_code = ?', [orderCode]);
      if (!existing) break;
      orderCode++;
    }
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + 48 * 60 * 60;
    let payos;
    try {
      payos = await createPayOSPayment({
        orderCode,
        amount: expectedAmount,
        description: code,
        expiresAt: expiresAtSeconds,
      });
    } catch (error) {
      await database.execute('DELETE FROM donations WHERE id = ? AND status = \'pending_payment\'', [id]);
      throw error;
    }
    const expiresAt = payos.expiresAt;
    await database.execute(
      `UPDATE donations SET
        provider_order_code = ?, provider_payment_link_id = ?, payment_checkout_url = ?,
        payment_qr_code = ?, payment_expires_at = ?
       WHERE id = ?`,
      [payos.orderCode, payos.paymentLinkId, payos.checkoutUrl, payos.qrCode, expiresAt, id]
    );
    payment = { provider: 'payos', ...payos };
  }

  return {
    donation: {
      id,
      code,
      expected_amount: expectedAmount,
      quantity: input.quantity,
      unit_price: unitPrice,
      status: initialStatus,
      created_at: now,
    },
    statusToken,
    payment,
  };
}

/**
 * Lấy danh sách công khai trên trang minh bạch (SRS-030, NFR-05)
 * Cấm rò rỉ SĐT, Email, nội dung chuyển khoản dưới mọi hình thức!
 */
export async function getPublicDonations(
  page = 1,
  limit = 20,
  db?: DatabaseAdapter
): Promise<{
  items: PublicDonationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}> {
  const database = db || getDb();
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  // Đếm tổng số bản ghi approved
  const countRow = await database.queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM donations WHERE status = 'approved'"
  );
  const total = countRow?.count || 0;
  const totalPages = Math.ceil(total / safeLimit);

  // Chỉ lấy các trường công khai, sắp xếp mới nhất trước
  const rows = await database.query<{
    display_name: string;
    actual_amount: number | null;
    expected_amount: number;
    approved_at: string | null;
    created_at: string;
    is_anonymous: number;
    public_message: string | null;
  }>(
    `SELECT display_name, actual_amount, expected_amount, approved_at, created_at, is_anonymous, public_message
     FROM donations
     WHERE status = 'approved'
     ORDER BY approved_at DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, offset]
  );

  const items: PublicDonationItem[] = rows.map((r) => ({
    display_name: r.is_anonymous === 1 ? 'Ẩn danh' : r.display_name,
    amount: r.actual_amount ?? r.expected_amount,
    approved_at: r.approved_at ?? r.created_at,
    public_message: r.public_message || null,
  }));

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: totalPages,
    },
  };
}

/**
 * Tính toán 4 chỉ số quỹ realtime từ database (SRS-031)
 */
export async function getFundSummary(db?: DatabaseAdapter): Promise<FundSummary & {
  unit_price: number;
  presets: number[];
  campaign_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  bank_qr_image: string;
}> {
  const database = db || getDb();

  // 1. Tổng tiền đã nhận (SUM) và số lượt ủng hộ (COUNT) từ donations approved
  const donationStats = await database.queryOne<{ total_received: number | null; count: number }>(
    "SELECT SUM(COALESCE(actual_amount, expected_amount)) as total_received, COUNT(*) as count FROM donations WHERE status = 'approved'"
  );

  // 2. Tổng đã chi từ báo cáo hàng ngày (SUM total_expense)
  const expenseStats = await database.queryOne<{ total_spent: number | null }>(
    'SELECT SUM(total_expense) as total_spent FROM daily_reports'
  );

  // Đọc cài đặt
  const settingsRows = await database.query<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key IN ('campaign_target', 'unit_price', 'max_quantity', 'presets', 'campaign_name', 'campaign_intro', 'privacy_policy', 'contact_email', 'contact_phone', 'google_sheet_url')"
  );
  const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value]));

  const totalReceived = donationStats?.total_received || 0;
  const donationCount = donationStats?.count || 0;
  const totalSpent = expenseStats?.total_spent || 0;
  const balance = totalReceived - totalSpent;
  const targetAmount = Number(settingsMap.get('campaign_target')) || 0;
  const unitPrice = Number(settingsMap.get('unit_price')) || 0;
  
  let presets: number[] = [];
  try {
    const parsed = JSON.parse(settingsMap.get('presets') || '[]');
    presets = Array.isArray(parsed)
      ? parsed.filter((value): value is number => Number.isSafeInteger(value) && value > 0)
      : [];
  } catch {
    presets = [];
  }

  return {
    total_received: totalReceived,
    donation_count: donationCount,
    total_spent: totalSpent,
    balance,
    target_amount: targetAmount,
    unit_price: unitPrice,
    max_quantity: Number(settingsMap.get('max_quantity')) || 0,
    presets,
    campaign_name: settingsMap.get('campaign_name') || '',
    campaign_intro: settingsMap.get('campaign_intro') || '',
    privacy_policy: settingsMap.get('privacy_policy') || '',
    contact_email: settingsMap.get('contact_email') || '',
    contact_phone: settingsMap.get('contact_phone') || '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    bank_qr_image: '',
    google_sheet_url: settingsMap.get('google_sheet_url') || 'https://docs.google.com/spreadsheets/d/12nNrIjXdsfFGHyvdfN9VF3Bo_kUV3ls2I52JjOVbm9M/edit?usp=sharing',
  };
}

/**
 * Xác thực biên nhận không cần đăng nhập qua token (SRS-040)
 */
export async function verifyReceiptToken(
  code: string,
  token: string,
  db?: DatabaseAdapter
): Promise<Donation | null> {
  const database = db || getDb();
  const tokenHash = await hashSha256(token);

  const donation = await database.queryOne<Donation>(
    "SELECT * FROM donations WHERE code = ? AND status = 'approved'",
    [code]
  );

  if (!donation || !donation.receipt_token_hash) {
    return null;
  }

  // So sánh hash
  if (donation.receipt_token_hash !== tokenHash) {
    return null;
  }

  return donation;
}

/**
 * Quét và hết hạn các mã quá 48 giờ chưa chuyển khoản (SRS-004)
 */
export async function expireOverdueDonations(db?: DatabaseAdapter): Promise<number> {
  const database = db || getDb();
  const result = await database.execute(
    "UPDATE donations SET status = 'expired' WHERE status = 'pending_payment' AND payment_expires_at IS NOT NULL AND payment_expires_at <= ?",
    [new Date().toISOString()]
  );
  return result.changes;
}

