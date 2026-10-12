# Kế hoạch migrate Cloudflare Stack

## Trạng thái

Đã hoàn thành bước expand đầu tiên:

- PayOS là payment provider chính trong code.
- SQLite local và D1 dùng chung `DatabaseAdapter`.
- Đã thêm `D1DatabaseAdapter`, không import `node:sqlite` vào Worker.
- Đã thêm Worker entrypoint tại `apps/api/src/worker.ts`.
- Webhook PayOS trên D1 dùng `D1.batch()` cho event idempotency và cập nhật trạng thái atomic.
- Đã thêm migration Cloudflare tại `migrations/0001_initial_schema.sql`.
- Đã thêm cấu hình mẫu `wrangler.jsonc`; chưa chứa secret thật.
- Wrangler tự compile `packages/db` trước khi bundle Worker để package dist bị
  ignore bởi Git không làm hỏng deploy trên máy/CI mới.

Đường chạy local vẫn giữ nguyên: `pnpm dev`, SQLite và `packages/db/src/migrations`.

## Cách tạo D1 và chạy local

Cài Wrangler trong môi trường phát triển rồi đăng nhập Cloudflare:

```powershell
pnpm add -D wrangler
pnpm exec wrangler login
```

Tạo database production:

```powershell
pnpm exec wrangler d1 create ketvong-prod
```

Chép `database_id` trả về vào `wrangler.jsonc`, thay giá trị
`REPLACE_WITH_D1_DATABASE_ID`.

Chạy migration local:

```powershell
pnpm exec wrangler d1 migrations apply ketvong-prod --local
```

Chạy Worker local với D1 local:

```powershell
pnpm exec wrangler dev --config wrangler.jsonc
```

## Cấu hình secret production

Không commit giá trị thật vào `wrangler.jsonc` hoặc `.env`:

```powershell
pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler secret put PAYOS_CLIENT_ID
pnpm exec wrangler secret put PAYOS_API_KEY
pnpm exec wrangler secret put PAYOS_CHECKSUM_KEY
pnpm exec wrangler secret put GMAIL_CLIENT_ID
pnpm exec wrangler secret put GMAIL_CLIENT_SECRET
pnpm exec wrangler secret put GMAIL_REFRESH_TOKEN
pnpm exec wrangler secret put GMAIL_SENDER_EMAIL
```

Trước khi deploy cần bổ sung biến non-secret trong `wrangler.jsonc`:

- `PUBLIC_BASE_URL`: domain Pages production.
- `PAYOS_RETURN_URL`: URL trả về sau khi thanh toán.
- `PAYOS_CANCEL_URL`: URL khi hủy thanh toán.
- `BYPASS_PAYMENT=false`.

## Deploy theo thứ tự

1. `pnpm exec wrangler d1 migrations apply ketvong-prod --remote`
2. `pnpm exec wrangler deploy --config wrangler.jsonc`
3. Deploy `apps/web` lên Cloudflare Pages với output `dist`.
4. Trỏ PayOS webhook tới:
   `https://<api-domain>/api/v1/webhooks/payos`.
5. Kiểm tra `/health`, tạo một lượt ủng hộ staging và gửi webhook thật từ PayOS.

## Seed tài khoản admin trên D1 remote

`pnpm run seed:admin` chỉ seed SQLite local. Với D1 remote, đặt sáu biến môi trường
admin trong terminal hiện tại rồi chạy lệnh one-shot dưới đây. Script dùng bcrypt
cost 12, có thể chạy lại an toàn theo email, và luôn đặt `must_change_password = 1`.

```powershell
$env:ADMIN_HUY_EMAIL = "..."
$env:ADMIN_HUY_PASSWORD = "..."
$env:ADMIN_TRUC_EMAIL = "..."
$env:ADMIN_TRUC_PASSWORD = "..."
$env:ADMIN_HUNG_EMAIL = "..."
$env:ADMIN_HUNG_PASSWORD = "..."
$env:CONFIRM_D1_ADMIN_SEED = "YES"
pnpm run cf:seed:admin
```

Mặc định script dùng `ketvong-prod`. Để chỉ rõ database khác, đặt thêm
`$env:CF_D1_DATABASE = "ketvong-staging"`. Không ghi các biến mật khẩu vào Git.

## Blocker trước production

- Chưa có `database_id` thật trong `wrangler.jsonc`.
- Chưa chạy migration trên D1 remote.
- Chưa cấu hình domain production và PayOS webhook URL HTTPS.
- Chưa kiểm thử Gmail OAuth2 trên Worker với mailbox thật.
- Chưa chạy race test hai webhook PayOS đồng thời trên D1 remote.
- Chưa xác nhận route QR/SVG `qrcode` được bundler Workers chấp nhận.

Không được bật production khi `BYPASS_PAYMENT=true`.
