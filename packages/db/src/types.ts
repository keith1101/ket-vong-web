export type DonationStatus = 'pending_payment' | 'approved' | 'manual_review' | 'rejected' | 'expired' | 'cancelled';

export type ReviewReason = 
  | 'amount_mismatch' 
  | 'missing_code' 
  | 'expired_code' 
  | 'possible_duplicate' 
  | 'unmatched' 
  | 'manual_entry';

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
  is_anonymous: number; // 0 or 1
  consent: number; // 0 or 1
  status: DonationStatus;
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
  transaction_at: string | null;
  approved_at: string | null;
  review_notes: string | null;
}

export type AdminRole = 'super-admin' | 'admin';

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: AdminRole;
  must_change_password: number; // 0 or 1
  created_at: string;
}

export interface EmailLog {
  id: string;
  donation_id: string;
  recipient_email: string;
  subject: string;
  status: 'success' | 'failed';
  error_message: string | null;
  message_id: string | null;
  sent_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target: string;
  details: string | null;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  title: string;
  content_markdown: string;
  total_income: number;
  total_expense: number;
  invoice_images: string | null; // JSON array of string URLs
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  key: string; // 'email_thank_you' | 'letter_thank_you'
  subject: string | null;
  content: string;
  updated_at: string;
}

// DTOs for Public API
export interface PublicDonationItem {
  display_name: string;
  amount: number;
  approved_at: string;
  public_message?: string | null;
}

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
}

