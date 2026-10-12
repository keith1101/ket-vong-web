# NHẬT KÝ QUYẾT ĐỊNH KỸ THUẬT (DECISIONS.MD)
## Website Kết Vòng — Quyên góp tự động qua SePay

Tài liệu ghi nhận các quyết định kiến trúc và kỹ thuật tuân thủ quy tắc: *Chỗ nào SRS im lặng: chọn phương án đơn giản nhất phù hợp với SRS và ghi vào `DECISIONS.md` (ngày, vấn đề, lựa chọn, lý do).*

---

### Quyết định 1: Cấu trúc Monorepo & Công cụ quản lý
- **Ngày:** 2026-10-10
- **Vấn đề:** Lựa chọn cấu trúc quản lý mã nguồn đáp ứng yêu cầu SRS mục 10 (`apps/web`, `apps/api`, `packages/db`).
- **Lựa chọn:** Sử dụng **pnpm workspace** kết hợp TypeScript project references.
  - Root: Điều phối scripts (`dev`, `build`, `test`, `db:migrate`, `seed:admin`, `webhook:simulate`).
  - `packages/db`: Chứa adapter pattern cho SQLite (`better-sqlite3`), migration runner, schema types và seed data.
  - `apps/api`: Hono framework với `@hono/node-server` cho localhost development, cấm Node-only API trong request handlers để sẵn sàng cho Cloudflare Workers.
  - `apps/web`: React + Vite + TypeScript + Tailwind CSS + Lucide React, tuân thủ Design Tokens từ SRS §8.
- **Lý do:** Tách biệt rõ ràng tầng DB, API và UI; dễ kiểm thử độc lập; pnpm tốc độ nhanh và quản lý dependency nghiêm ngặt.

---

### Quyết định 2: Hợp đồng Webhook SePay & Xác thực chữ ký HMAC
- **Ngày:** 2026-10-10
- **Vấn đề:** SRS §5.2 quy định webhook SePay dùng HMAC-SHA256 và mapping tên trường theo thực tế SePay.
- **Lựa chọn:** 
  - Trường webhook nhận từ SePay:
    - ID giao dịch: `id` (ánh xạ vào `sepay_transaction_id`).
    - Số tiền: `transferAmount` (hoặc fallback `amount`).
    - Nội dung chuyển khoản: `content` (hoặc fallback `description`).
    - Thời gian giao dịch: `transactionDate`.
    - Số tài khoản: `accountNumber`.
    - Cổng/Ngân hàng: `gateway`.
    - Mã tham chiếu: `referenceCode`.
  - Xác thực chữ ký: Kiểm tra header `x-sepay-signature` (hoặc `X-Signature`) sử dụng HMAC-SHA256 với `SEPAY_WEBHOOK_SECRET` trên toàn bộ raw request body (hoặc kiểm tra `Authorization: Apikey <secret>` nếu cấu hình dạng SePay API Key).
  - Web Standard Crypto: Sử dụng `crypto.subtle` để tính toán HMAC-SHA256 nhằm đảm bảo tính di động 100% giữa Node.js và Cloudflare Workers.
- **Lý do:** Khớp chuẩn định dạng webhook của SePay; hỗ trợ HMAC chuẩn và không phụ thuộc thư viện native crypto của riêng Node.

---

### Quyết định 3: Lớp Database Adapter & Tương thích Cloudflare D1
- **Ngày:** 2026-10-10
- **Vấn đề:** SRS-080 yêu cầu DB access qua adapter, không dùng API chỉ-chạy-trên-Node trong request handlers.
- **Lựa chọn:** 
  - Thiết kế interface `DatabaseAdapter` trong `packages/db`:
    ```typescript
    export interface DatabaseAdapter {
      query<T>(sql: string, params?: any[]): Promise<T[]>;
      queryOne<T>(sql: string, params?: any[]): Promise<T | null>;
      execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
      transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T>;
    }
    ```
  - Hiện thực `SqliteDatabaseAdapter` sử dụng `better-sqlite3` cho môi trường dev localhost.
  - Khi chuyển sang Cloudflare Workers, chỉ cần thay bằng `D1DatabaseAdapter` bọc `env.DB` mà không cần sửa bất kỳ service hay route nào.
- **Lý do:** Tuân thủ nguyên tắc Clean Architecture, đảm bảo tính trừu tượng của cơ sở dữ liệu.

---

### Quyết định 4: Bóc tách mã quyên góp `KV-XXXXXX` từ nội dung chuyển khoản
- **Ngày:** 2026-10-10
- **Vấn đề:** Donor có thể gõ chữ hoa, chữ thường, khoảng trắng hoặc kèm lời nhắn khi chuyển khoản.
- **Lựa chọn:** 
  - Regex chuẩn: `/KV[-_\s]?([A-HJ-NP-Z2-9]{6})/i` (bỏ ký tự dễ nhầm 0/O, 1/I theo SRS-004).
  - Chuẩn hóa mã tìm được về dạng `KV-` + 6 ký tự in hoa.
  - So khớp số tiền: Phải bằng tuyệt đối (`=== expected_amount`).
- **Lý do:** Đáp ứng SRS-004 và SRS-012, chống sai lệch và tự động đẩy vào `manual_review` khi không khớp.

---

### Quyết định 5: Tạo biên nhận không cần đăng nhập & Thư cảm ơn PNG
- **Ngày:** 2026-10-10
- **Vấn đề:** SRS-040 quy định donor mở `/dong-gop/:code#access=:token`, đọc fragment phía client; SRS-041 render thư PNG khổ dọc ≥1240px đắp mã QR bằng code, cấm AI gen ảnh.
- **Lựa chọn:** 
  - Token biên nhận được sinh bằng `crypto.randomBytes(32).toString('hex')` (256-bit entropy).
  - Cơ sở dữ liệu chỉ lưu SHA-256 hash của token (`receipt_token_hash`).
  - Phía web: URL chứa `#access=<token>`. JavaScript phía client lấy hash fragment (không gửi lên server qua URL) và gửi trong body `POST /api/v1/receipts/verify`.
  - Thư cảm ơn: Sinh SVG vector chuẩn kích thước 1240 x 1754 (tỷ lệ A4 / khổ dọc chuẩn poster), nhúng font chữ, đắp SVG QR code tạo bằng thư viện mã hóa QR thuần, render ra Canvas/PNG chất lượng cao để donor tải về.
- **Lý do:** An toàn bảo mật tối đa, không rò rỉ token trên server access log, đáp ứng chính xác SRS-040 và SRS-041.

---

### Quyết định 6: Chuyển đổi sang `node:sqlite` DatabaseSync trên Node 24+
- **Ngày:** 2026-10-10
- **Vấn đề:** Trên Node.js v24.19.0, native C++ addon `better-sqlite3` gặp lỗi assertion `RemoveEnvironmentCleanupHook: (env) != nullptr` khi V8 thực hiện dọn dẹp bộ nhớ (garbage collection).
- **Lựa chọn:** 
  - Nâng cấp `SqliteDatabaseAdapter` sử dụng module chuẩn tích hợp sẵn `node:sqlite` (`DatabaseSync` và `StatementSync`) có sẵn trong Node.js (từ v22.13+).
  - Giữ nguyên vẹn interface `DatabaseAdapter` và toàn bộ logic gọi SQL của API và services.
- **Lý do:** Loại bỏ 100% rủi ro crash native C++ trên Node 24, không cần compile build tool phụ thuộc hệ điều hành, sẵn sàng cho cả runtime Node và adapter D1.

---

### Quyết định 7: Chính sách Pre-push Audit & Bảo vệ Dữ liệu Nhạy cảm
- **Ngày:** 2026-10-10
- **Vấn đề:** Đảm bảo không lộ lọt bất kỳ secret, token, mật khẩu hay dữ liệu cá nhân (PII) người ủng hộ lên kho mã nguồn công khai GitHub.
- **Lựa chọn:** 
  - Thiết lập `.gitignore` cấp root chặn triệt để `.env*` (trừ `.env.example`), mọi file database `*.db*`, `*.sqlite*`, `node_modules/`, `dist/`.
  - Mọi trường trong `.env.example` chuyển thành placeholder `your_..._here` kèm hướng dẫn rõ ràng.
  - Test suites và migration không hardcode credentials thật; mật khẩu seed admin yêu cầu đổi ngay trong lần đăng nhập đầu tiên.
- **Lý do:** Đáp ứng NFR-05, NFR-06, NFR-07 và quy định pre-push audit nghiêm ngặt.

---

### Quyết định 8: Pháp lý NĐ 93/2021/NĐ-CP & Quản lý Tài khoản Ngân hàng Động
- **Ngày:** 2026-10-10
- **Vấn đề:** Tuân thủ Nghị định 93/2021/NĐ-CP Điều 17(2) quy định vận động quyên góp thiện nguyện phải mở tài khoản riêng biệt cho từng cuộc vận động.
- **Lựa chọn:** 
  - Tài khoản thụ hưởng thuộc về Thủ quỹ Nguyễn Thị Thanh Trúc.
  - Tuyệt đối KHÔNG hardcode tài khoản cá nhân Bùi Anh Huy trong code, schema hoặc seed database.
  - Thông tin ngân hàng (`bank_id`, `bank_account_number`, `bank_account_name`) được lưu trong bảng `settings` và tải động qua API. Mặc định seed: `bank_account_name = 'NGUYEN THI THANH TRUC'`, `bank_account_number = ''` (sẽ được Trúc cập nhật qua trang Quản trị ngay khi mở tài khoản thành công).
- **Lý do:** Tuân thủ 100% cơ sở pháp lý tại `Legal_KetVong.md`, đảm bảo tính minh bạch và tránh rủi ro pháp lý cho nhóm dự án.

---

### Quyết định 9: Chuẩn hóa UI/UX, Luồng Quyên góp 2 Bước & Copy Chuẩn UAT
- **Ngày:** 2026-10-10
- **Vấn đề:** Đáp ứng Gói bàn giao UAT (Phần 1, 2, 3), hoàn thiện giao diện truyền cảm hứng và tinh gọn hành trình người ủng hộ.
- **Lựa chọn:** 
  - Trang `/ung-ho` quản lý trọn vẹn luồng 2 bước (Bước 1: Form chọn preset [1] + ô nhập tùy ý + tick cam kết NĐ 13/2023; Bước 2: QR Code VietQR, thông tin chuyển khoản, mã `KV-XXXXXX`, các nút sao chép) và bước 3 chúc mừng realtime mà không tạo thêm route `/chuyen-khoan/:code` thừa.
  - Polling trạng thái: Sử dụng endpoint an toàn `GET /api/v1/donations/:code/status` (0 PII), lặp mỗi 3s và tự động hủy timer (`clearInterval`) ngay khi trạng thái chuyển sang `approved`/`rejected`/`expired` hoặc khi rời trang (unmount).
  - Bảng tiến độ quỹ: Ghi rõ nhãn *"so với ngân sách dự kiến (2.300.000đ)"* để người ủng hộ không hiểu lầm chiến dịch đóng theo số tiền (chiến dịch đóng theo mốc thời gian ngày 20/10/2026).
  - Copywriting: Áp dụng chuẩn 100% nội dung Phần 2 (Bản ngắn trên LandingPage, Bản đầy đủ kèm bảng ngân sách 6 dòng 2.300.000đ và danh sách nhóm Tình trên AboutPage).
- **Lý do:** Trải nghiệm người dùng mượt mà, chính xác về pháp lý và thống nhất văn phong thiện nguyện của dự án.



