# PROMPT CHO CODING AGENT - Website Kết Vòng (giai đoạn localhost)

> Dán toàn bộ prompt này cho coding agent (Claude Code, Codex, Copilot agent...). Agent PHẢI đọc file `SRS_KetVong.md` trong cùng thư mục trước khi viết bất kỳ dòng code nào.

---

Bạn là senior fullstack developer. Nhiệm vụ: triển khai website Kết Vòng **trên localhost** theo đúng tài liệu `SRS_KetVong.md` v2.0 (luồng tự động qua SePay, cùng thư mục với prompt này). Tài liệu SRS là nguồn chân lý duy nhất cho yêu cầu; mọi quyết định đã chốt trong đó, không được tự ý thay đổi.

## Đầu vào bắt buộc
1. Đọc kỹ toàn bộ `SRS_KetVong.md` v2.0, đặc biệt: mục 3 (từng requirement card `SRS-*`), mục 4 (functional flows), mục 5 (API + SePay webhook contract), mục 6 (NFR có ngưỡng số), mục 9 (verification matrix).
2. Tuân thủ tuyệt đối các ràng buộc: backend bằng **Hono** (không dùng API chỉ có trên Node trong request handler); DB qua lớp adapter trong `packages/db`; giao diện **tiếng Việt 100%**; mobile-first; webhook SePay verify HMAC + chống ghi trùng theo đúng SRS-010/SRS-011.

## Cách thực hiện (theo thứ tự)
1. Dựng monorepo đúng cấu trúc mục 10 SRS (`apps/web`, `apps/api`, `packages/db`), file `.env.example`, `README.md`, `DECISIONS.md`.
2. Triển khai theo từng module: DB schema + migration → API public (tạo donation + cấp mã, log minh bạch, receipt verify) → **endpoint webhook SePay + script `pnpm webhook:simulate`** → trang công khai (chọn số lượng, form, màn hình chuyển khoản) → admin auth + dashboard + **hàng chờ xử lý ca lệch** → mail cảm ơn (Gmail API, credential giả trong `.env.example`, code đọc từ env) → render thư cảm ơn PNG → báo cáo hàng ngày → template editor → settings (QR, đơn giá, preset).
3. Mỗi module xong: chạy `pnpm build` và test theo **verification lane** ghi trong thẻ `SRS-*` tương ứng (unit/integration/E2E). Riêng SRS-010-013 bắt buộc test bằng webhook simulator: chữ ký đúng/sai, gửi trùng, khớp/mismatch mã và tiền. Không sang module tiếp theo khi build còn đỏ.
4. Viết `README.md` sao cho người mới clone về chỉ làm theo README là chạy được `pnpm dev` trong 10 phút (ghi rõ cách seed tài khoản admin, cách lấy Gmail OAuth2 token, cách chạy webhook simulator).

## Quy tắc (từ skill common-software-requirements)
- Mỗi `SRS-*` là một requirement card độc lập: không trộn yêu cầu với task implement trong cùng một câu.
- Mọi NFR phải có ngưỡng số (mục 6 SRS); mọi interface phải có schema input/output/error.
- Không chỉ test happy path: mỗi flow phức tạp phải có test cho alternate và exception course (mục 4 SRS).
- Chỗ nào SRS im lặng: chọn phương án đơn giản nhất phù hợp với SRS và **ghi vào `DECISIONS.md`** (ngày, vấn đề, lựa chọn, lý do). Đặc biệt: tên trường webhook SePay map theo tài liệu SePay tại thời điểm implement.
- Cấm hardcode secret, cấm hardcode nội dung marketing vào component (đi qua settings/template), cấm nối chuỗi SQL.
- Design tokens lấy từ SRS (palette đã verify từ web mẫu). Áp dụng quy tắc ui-ux-pro-max mức CRITICAL/HIGH.
- Không làm bất kỳ thứ gì trong mục "Ngoài phạm vi" của SRS (deploy Cloudflare, MoMo/ZaloPay merchant gateway, tài khoản donor...).

## Bàn giao
Khi xong, báo cáo ngắn gọn: đã làm được những `SRS-*` nào, test nào đã chạy và pass theo từng verification lane, còn thiếu gì (nếu có), và danh sách các quyết định đã ghi vào `DECISIONS.md`. Đính kèm lệnh chạy để kiểm chứng.
