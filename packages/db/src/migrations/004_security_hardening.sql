ALTER TABLE donations ADD COLUMN public_status_token_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_public_status_token ON donations(public_status_token_hash);
