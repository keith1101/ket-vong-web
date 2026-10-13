# TECH_DEBT

Tài liệu này ghi lại các mục SRS/REQ/AC còn đạt một phần sau đợt audit-fix. Đây là phần việc còn lại cần xử lý hoặc xác nhận trước khi bàn giao/public.

### SRS-011
- **Hiện trạng:** Đã có unique constraint cho `sepay_transaction_id`, đường đi idempotent tuần tự và test gửi lặp thông thường.
- **Còn thiếu:** Chưa có transaction/row-claim bảo đảm hai webhook cùng lúc không cùng đọc trạng thái `awaiting_transfer`, duyệt hai lần và gửi hai email. Chưa có kiểm thử race-condition đồng thời.
- **Mức độ:** BLOCKER go-live (phải xong trước khi public)
- **Kế hoạch:** Bao transaction phần kiểm tra-trạng thái-cập nhật, xử lý lỗi unique/lock như idempotent skip, bổ sung test chạy đồng thời tối thiểu hai webhook trùng `sepay_transaction_id`; độ phức tạp trung bình.

### SRS-020
- **Hiện trạng:** API `POST /admin/donations` đã tạo và duyệt khoản ủng hộ nhập tay; hàng chờ đã có modal duyệt, gán mã và từ chối.
- **Còn thiếu:** Hàng chờ chưa có modal UI “Tạo mới” để admin nhập thông tin donor và tạo ca lệch ngay trong màn hình xử lý. Admin vẫn phải gọi API cho thao tác này.
- **Mức độ:** NÊN LÀM (xong trước khi bàn giao cho admin không kỹ thuật)
- **Kế hoạch:** Thêm modal “Tạo khoản ủng hộ thủ công”, gọi API hiện có, validate consent/số tiền/email và hiển thị kết quả; độ phức tạp trung bình.

### SRS-041
- **Hiện trạng:** Server tạo SVG từ template; trang biên nhận đã chuyển SVG sang PNG bằng canvas trong trình duyệt, kích thước tối thiểu 1240px và có QR theo mã.
- **Còn thiếu:** Cách triển khai hiện tại khác câu chữ SRS yêu cầu server render/xuất PNG; chưa có kiểm thử thủ công tự động hóa cho mọi trình duyệt và quét QR sau khi tải file.
- **Mức độ:** NÊN LÀM (xong trước khi bàn giao cho admin không kỹ thuật)
- **Kế hoạch:** Ưu tiên cập nhật SRS để ghi nhận browser-side SVG→PNG là quyết định triển khai; nếu giữ nguyên SRS thì thay bằng Sharp/Resvg ở server và bổ sung kiểm thử QR; độ phức tạp trung bình đến cao.

### SRS-050
- **Hiện trạng:** Gmail OAuth2 path, template từ settings, email log và nút gửi lại email lỗi đã có; test tự động kiểm tra luồng mock.
- **Còn thiếu:** Chưa kiểm thử với hộp thư Gmail thật, refresh token thật, Message-ID thật và thời gian nhận mail dưới 5 phút.
- **Mức độ:** BLOCKER go-live (phải xong trước khi public)
- **Kế hoạch:** Dùng mailbox test riêng để gửi một donation thật trong môi trường staging, kiểm tra nội dung/link/token, email log và resend; độ phức tạp thấp đến trung bình nhưng phụ thuộc credential/môi trường.

### SRS-062
- **Hiện trạng:** Super-admin đã chỉnh được đơn giá, preset, QR, thông tin chiến dịch, liên hệ, giới thiệu và chính sách qua UI; thay đổi có hiệu lực từ settings.
- **Còn thiếu:** Chưa có UI quản lý tài khoản admin (tạo, khóa/mở khóa, đổi role hoặc đặt lại mật khẩu). Hiện vẫn seed ba tài khoản qua CLI/env.
- **Mức độ:** TECH DEBT (để sau được)
- **Kế hoạch:** Thêm API và màn hình quản lý tài khoản, yêu cầu super-admin, audit log mọi thay đổi và luồng đặt lại mật khẩu; độ phức tạp trung bình.

### SRS-063
- **Hiện trạng:** Admin đã đăng/sửa báo cáo Markdown và lưu lịch sử phiên bản; dữ liệu công khai không dùng `dangerouslySetInnerHTML`.
- **Còn thiếu:** Nội dung hiện đang hiển thị như văn bản thô, chưa render Markdown bằng parser an toàn. Nếu thêm HTML không sanitize sẽ phát sinh stored XSS.
- **Mức độ:** BLOCKER go-live (phải xong trước khi public)
- **Kế hoạch:** Chọn parser Markdown cho phép render AST/React hoặc kết hợp parser với DOMPurify, tắt raw HTML nguy hiểm, thêm test payload XSS và test hiển thị heading/list/link; độ phức tạp trung bình.

### SRS-070
- **Hiện trạng:** Trang chính sách hướng donor gửi yêu cầu qua email hỗ trợ; admin có nút/API xóa mềm, ẩn tên, xóa email/SĐT/nội dung chuyển khoản và giữ số tiền/thời gian cho tổng quỹ.
- **Còn thiếu:** Chưa có workflow ghi nhận và xác minh yêu cầu đến từ email donor, chưa có xác nhận/biên bản xử lý riêng và chưa có E2E test chứng minh toàn bộ chuỗi yêu cầu → xóa → log ẩn danh.
- **Mức độ:** NÊN LÀM (xong trước khi bàn giao cho admin không kỹ thuật)
- **Kế hoạch:** Thêm checklist/xác nhận trong admin, lưu audit metadata tối thiểu không chứa PII, kiểm tra email yêu cầu với bản ghi donor và viết E2E test; độ phức tạp trung bình.

### SRS-080
- **Hiện trạng:** Request handler dùng `DatabaseAdapter`; localhost vẫn dùng SQLite. Đã thêm `D1DatabaseAdapter`, Worker entrypoint, D1 migration và nhánh webhook dùng `D1.batch()`.
- **Còn thiếu:** Chưa tạo/apply database D1 remote, chưa kiểm thử staging trên Workers với secret/domain thật và chưa hoàn tất race test webhook trên D1.
- **Mức độ:** TECH DEBT (để sau được)
- **Kế hoạch:** Tạo D1, apply migration, deploy Worker staging, kiểm thử PayOS/Gmail thật và đo race/idempotency trước khi chuyển production; độ phức tạp cao.

### REQ-12
- **Hiện trạng:** Checkbox consent đã có trong form, mặc định **không tick**, là bắt buộc trước khi gửi; trang `/chinh-sach-bao-mat` đã có route, link từ form/footer và nội dung đọc từ settings. Backend cũng từ chối submit thiếu consent.
- **Còn thiếu:** Phần SRS-070 mới có hướng dẫn gửi email và công cụ admin xóa mềm; chưa có workflow xác minh yêu cầu xóa và chưa có E2E test cho việc donor yêu cầu xóa dữ liệu. Nói cách khác, consent và trang chính sách đã đạt; phần quyền xóa dữ liệu mới đạt một phần.
- **Mức độ:** NÊN LÀM (xong trước khi bàn giao cho admin không kỹ thuật)
- **Kế hoạch:** Hoàn thiện quy trình tiếp nhận/xác minh/xác nhận yêu cầu xóa và test submit thiếu consent + xóa dữ liệu end-to-end; độ phức tạp trung bình.

### AC-02
- **Hiện trạng:** Đã có test các ca chữ ký hợp lệ, khớp mã + tiền, sai tiền, thiếu mã, mã hết hạn và webhook lặp tuần tự.
- **Còn thiếu:** Chưa chứng minh điều kiện “gửi trùng không ghi trùng” trong trường hợp hai request đến đồng thời; phụ thuộc phần transaction/lock còn thiếu của SRS-011.
- **Mức độ:** BLOCKER go-live (phải xong trước khi public)
- **Kế hoạch:** Bổ sung integration test đồng thời và kiểm tra số bản ghi, số lần duyệt, số email sau race; độ phức tạp trung bình.

### AC-04
- **Hiện trạng:** Có link biên nhận không cần đăng nhập, tải PNG phía browser và luồng gửi email mock; token được đọc từ fragment client-side.
- **Còn thiếu:** Chưa xác nhận hộp thư Gmail thật trong 5 phút, chưa kiểm tra quét QR từ PNG tải xuống ở môi trường trình duyệt thực tế, và server chưa xuất PNG trực tiếp như câu chữ SRS-041.
- **Mức độ:** BLOCKER go-live (phải xong trước khi public)
- **Kế hoạch:** Chạy checklist E2E trên staging: duyệt donation, nhận mail thật, mở link, tải PNG, quét QR, đối chiếu tên/số tiền; độ phức tạp trung bình.

### AC-05
- **Hiện trạng:** Admin login/phân quyền, hàng chờ, báo cáo, settings, templates, audit log và resend email đã có.
- **Còn thiếu:** Còn thiếu modal “Tạo mới” trong hàng chờ, UI quản lý tài khoản admin và render Markdown an toàn; do đó admin không kỹ thuật chưa hoàn tất toàn bộ thao tác theo SRS.
- **Mức độ:** NÊN LÀM (xong trước khi bàn giao cho admin không kỹ thuật)
- **Kế hoạch:** Hoàn thiện ba điểm còn thiếu theo SRS-020, SRS-062 và SRS-063, sau đó chạy lại kịch bản bàn giao AC-05; độ phức tạp trung bình.

### AC-06
- **Hiện trạng:** Submit thiếu consent bị từ chối; trang chính sách có hướng dẫn liên hệ xóa dữ liệu; admin có thao tác xóa mềm và audit log.
- **Còn thiếu:** Chưa có E2E test và quy trình xác minh email donor cho yêu cầu xóa dữ liệu.
- **Mức độ:** NÊN LÀM (xong trước khi bàn giao cho admin không kỹ thuật)
- **Kế hoạch:** Viết test và checklist vận hành cho yêu cầu xóa, bảo đảm log công khai chỉ còn “Ẩn danh” cùng số tiền/thời gian; độ phức tạp thấp đến trung bình.

### AC-07
- **Hiện trạng:** `pnpm build` pass và request handler đã phụ thuộc interface adapter thay vì gọi trực tiếp DB trong route.
- **Còn thiếu:** Chưa thể xác nhận deploy thực tế trên Cloudflare Workers + D1 vì chưa có database ID, secret/domain và staging run.
- **Mức độ:** TECH DEBT (để sau được)
- **Kế hoạch:** Chạy checklist trong `docs/CLOUDFLARE_MIGRATION.md` trên staging rồi ghi bằng chứng deploy/test; độ phức tạp cao.

### NFR-01-03
- **Hiện trạng:** Có script mô phỏng webhook và build/test tự động; các ngưỡng hiệu năng đã được ghi trong SRS.
- **Còn thiếu:** Chưa có bằng chứng đo p95 webhook < 2 giây, API public < 300ms và LCP trang chủ < 2,5 giây trên 4G giả lập.
- **Mức độ:** BLOCKER go-live (phải xong trước khi public)
- **Kế hoạch:** Đo trên môi trường staging gần production, lưu kết quả webhook/API và Lighthouse; xử lý regression nếu vượt ngưỡng; độ phức tạp thấp đến trung bình.

## Checklist trước go-live

- [ ] SRS-011 / NFR-04 / AC-02: hoàn tất transaction/row-claim và test hai webhook trùng đến đồng thời.
- [ ] SRS-050 / AC-04: gửi nhận bằng Gmail OAuth2 thật, kiểm tra email log, link/token và resend.
- [ ] SRS-063 / AC-05: render Markdown bằng parser an toàn, sanitize/tắt raw HTML và test XSS.
- [ ] SRS-041 / AC-04: kiểm tra PNG thực tế, kích thước, nội dung và quét QR sau khi tải.
- [ ] NFR-01-03: đo p95 webhook/API và LCP theo đúng ngưỡng SRS.

