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

export interface PublicDonationItem {
  display_name: string;
  amount: number;
  approved_at: string;
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
  status: 'awaiting_transfer' | 'approved' | 'manual_review' | 'rejected' | 'expired';
  sepay_transaction_id: string | null;
  receipt_token_hash: string | null;
  review_reason: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  raw_transfer_content: string | null;
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

