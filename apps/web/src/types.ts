export interface FundSummary {
  total_received: number;
  donation_count: number;
  total_spent: number;
  balance: number;
  target_amount: number;
  unit_price: number;
  max_quantity: number;
  presets: number[];
  campaign_name: string;
  campaign_intro: string;
  privacy_policy: string;
  contact_email: string;
  contact_phone: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  bank_qr_image: string;
  bank_bin?: string;
  google_sheet_url?: string;
}

export interface PaymentIntentData {
  orderCode: number;
  paymentLinkId?: string;
  checkoutUrl?: string;
  qrCode?: string;
  bin?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  amount: number;
  code: string;
  expiresAt?: string;
}

export interface PublicDonationItem {
  display_name: string;
  amount: number;
  approved_at: string;
  public_message?: string | null;
}

export interface Donation {
  id: string;
  code: string;
  expected_amount: number;
  actual_amount: number | null;
  quantity: number;
  unit_price: number;
  display_name: string;
  title: string;
  email: string;
  phone: string | null;
  public_message: string | null;
  is_anonymous: number;
  consent: number;
  status: 'pending_payment' | 'approved' | 'manual_review' | 'rejected' | 'expired' | 'cancelled';
  payment_provider: string;
  provider_order_code: number | null;
  provider_payment_link_id: string | null;
  provider_reference: string | null;
  payment_checkout_url: string | null;
  payment_qr_code: string | null;
  payment_expires_at: string | null;
  payment_received_at: string | null;
  payment_raw_event: string | null;
  receipt_token_hash: string | null;
  review_reason: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  review_notes: string | null;
}

export interface DailyReport {
  id: string;
  report_date: string;
  title: string;
  content_markdown: string;
  total_income: number;
  total_expense: number;
  invoice_images: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super-admin' | 'admin';
  must_change_password: number;
  mustChangePassword?: boolean;
}

