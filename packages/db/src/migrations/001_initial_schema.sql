-- ==============================================================================
-- SCHEMA KHỞI TẠO CƠ SỞ DỮ LIỆU KẾT VÒNG
-- Tương thích SQLite 3 và Cloudflare D1
-- ==============================================================================

CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    expected_amount INTEGER NOT NULL,
    actual_amount INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 10000,
    display_name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Bạn',
    email TEXT NOT NULL,
    phone TEXT,
    public_message TEXT,
    is_anonymous INTEGER NOT NULL DEFAULT 0,
    consent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'awaiting_transfer',
    sepay_transaction_id TEXT UNIQUE,
    receipt_token_hash TEXT,
    review_reason TEXT,
    approved_by TEXT,
    created_at TEXT NOT NULL,
    transaction_at TEXT,
    approved_at TEXT,
    raw_transfer_content TEXT
);

CREATE INDEX IF NOT EXISTS idx_donations_code ON donations(code);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_sepay_tx ON donations(sepay_transaction_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);

CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_logs (
    id TEXT PRIMARY KEY,
    donation_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    message_id TEXT,
    sent_at TEXT NOT NULL,
    FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_logs_donation_id ON email_logs(donation_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_reports (
    id TEXT PRIMARY KEY,
    report_date TEXT NOT NULL,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    total_income INTEGER NOT NULL DEFAULT 0,
    total_expense INTEGER NOT NULL DEFAULT 0,
    invoice_images TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);

CREATE TABLE IF NOT EXISTS daily_report_versions (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    total_income INTEGER NOT NULL DEFAULT 0,
    total_expense INTEGER NOT NULL DEFAULT 0,
    invoice_images TEXT,
    saved_by TEXT NOT NULL,
    saved_at TEXT NOT NULL,
    FOREIGN KEY(report_id) REFERENCES daily_reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_report_versions_report ON daily_report_versions(report_id, saved_at);

CREATE TABLE IF NOT EXISTS templates (
    key TEXT PRIMARY KEY,
    subject TEXT,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

