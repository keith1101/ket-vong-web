# WEBSITE KẾT VÒNG (QUYÊN GÓP TỰ ĐỘNG QUA SEPAY)

Dự án website gây quỹ minh bạch cho workshop Kết Vòng (mục tiêu 2.300.000đ), tự động ghi nhận chuyển khoản ngân hàng thông qua cổng SePay, xuất thư cảm ơn tự động và báo cáo thu/chi minh bạch.

---

## 🚀 HƯỚNG DẪN BẮT ĐẦU NHANH TRONG 10 PHÚT (LOCALHOST)

### 1. Yêu cầu môi trường
- **Node.js**: Phiên bản 20 LTS trở lên (`node -v`)
- **pnpm**: Phiên bản 9 hoặc 10 trở lên (`pnpm -v`)

### 2. Cài đặt các gói phụ thuộc
Tại thư mục gốc của dự án:
```bash
pnpm install
```

### 3. Thiết lập biến môi trường
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```
*(Trên Windows PowerShell: `Copy-Item .env.example .env`)*

### 4. Khởi tạo cơ sở dữ liệu và seed tài khoản Admin
Chạy migration tạo bảng và seed 3 tài khoản admin ban đầu:
```bash
# Chạy migration tạo các bảng SQLite
pnpm db:migrate

# Seed 3 tài khoản Admin: Huy (super-admin), Trúc (admin), Hưng (admin)
pnpm seed:admin
```

> Tài khoản và mật khẩu seed phải được điền qua các biến `ADMIN_*` trong `.env`; dự án không cung cấp thông tin đăng nhập mặc định.

### 5. Chạy dự án ở chế độ phát triển
Khởi động đồng thời cả Backend API (Hono) và Frontend Web (Vite + React):
```bash
pnpm dev
```
- **Website Donor / Minh bạch:** [http://localhost:3000](http://localhost:3000)
- **Khu vực Quản trị Admin:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **API Hono Service:** [http://localhost:3001](http://localhost:3001)

---

## 🧪 GIẢ LẬP WEBHOOK SEPAY TRÊN LOCALHOST (`pnpm webhook:simulate`)

Để kiểm thử toàn bộ luồng tự động nhận tiền ngân hàng, khớp mã, xử lý ca lệch mà không cần giao dịch ngân hàng thật:

```bash
# 1. Giả lập thanh toán KHỚP CHUẨN (Mã đúng + Tiền đúng -> Tự động duyệt + Gửi mail)
pnpm webhook:simulate --code KV-A1B2C3 --amount 10000

# 2. Giả lập LỆCH TIỀN (Mã đúng nhưng chuyển sai số tiền -> Vào hàng chờ manual_review)
pnpm webhook:simulate --code KV-A1B2C3 --amount 20000 --reason amount_mismatch

# 3. Giả lập THIẾU MÃ / SAI MÃ (Nội dung chuyển khoản không có mã -> Vào hàng chờ manual_review)
pnpm webhook:simulate --amount 50000 --content "Ung ho ket vong em Huy"

# 4. Giả lập CHỮ KÝ HMAC SAI (Hệ thống từ chối HTTP 401)
pnpm webhook:simulate --code KV-A1B2C3 --amount 10000 --invalid-signature

# 5. Giả lập GỬI TRÙNG GIAO DỊCH (Idempotency - Webhook gửi retry)
pnpm webhook:simulate --code KV-A1B2C3 --amount 10000 --duplicate
```

---

## 📧 HƯỚNG DẪN CẤU HÌNH GMAIL OAUTH2 (SRS-050)

Nếu muốn hệ thống gửi mail cảm ơn thực tế tới hòm thư donor qua tài khoản Google cá nhân:

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/) và tạo một Project mới.
2. Bật **Gmail API** trong mục *APIs & Services > Library*.
3. Vào *OAuth consent screen*: chọn User Type là **External**, điền tên ứng dụng và email hỗ trợ. Thêm email của bạn vào danh sách **Test Users**.
4. Vào *Credentials* > *Create Credentials* > **OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
5. Lấy **Client ID** và **Client Secret** điền vào `.env`.
6. Truy cập [OAuth 2.0 Playground](https://developers.google.com/oauthplayground):
   - Bấm icon bánh răng góc phải, tick chọn **Use your own OAuth credentials**, điền Client ID và Client Secret vừa tạo.
   - Ở danh sách API bên trái, chọn `https://mail.google.com/` (hoặc `https://www.googleapis.com/auth/gmail.send`).
   - Bấm **Authorize APIs** và đăng nhập tài khoản Gmail gửi thư.
   - Bấm **Exchange authorization code for tokens** và copy giá trị **Refresh token**.
7. Điền `GMAIL_REFRESH_TOKEN` và `GMAIL_SENDER_EMAIL` vào file `.env`.
*(Lưu ý: Nếu chưa cấu hình Gmail, hệ thống sẽ tự động log email ra console và lưu vào bảng EMAIL_LOG mà không làm gián đoạn luồng duyệt).*

---

## 📁 CẤU TRÚC THƯ MỤC MONOREPO

```text
├── apps/
│   ├── api/             # Backend API Hono, Webhook SePay, Auth, Receipt Engine
│   └── web/             # Frontend React (Vite + Tailwind CSS + Lucide Icons)
├── packages/
│   └── db/              # Database adapter, SQLite schema, Migrations, Seed
├── .env.example         # File mẫu các biến môi trường
├── DECISIONS.md         # Nhật ký các quyết định kỹ thuật theo SRS
├── README.md            # Tài liệu hướng dẫn sử dụng
└── SRS_KetVong.md       # Đặc tả yêu cầu phần mềm v2.0
```

---

## 🛡️ KIỂM TRA CHẤT LƯỢNG & BUILD

```bash
# Kiểm tra build toàn bộ packages & apps
pnpm build

# Chạy toàn bộ test suites
pnpm test
```

