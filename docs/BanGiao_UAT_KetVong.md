# GÓI BÀN GIAO UAT — Website Kết Vòng

> 3 tài liệu gộp thành 1 (gộp ngày 2026-10-10). Thứ tự sử dụng:
> 1. **Phần 1** — dán cho coding agent để review + sửa UI/UX (làm trước).
> 2. **Phần 2** — nội dung giới thiệu chuẩn (input cho agent ở Phần 1).
> 3. **Phần 3** — yêu cầu UAT, Huy thực hiện sau khi agent xong Phần 1.

---

# PHẦN 1: PROMPT CHO AGENT — REVIEW VÀ SỬA UI/UX

> Dán prompt này cho coding agent. Bối cảnh: trang chủ hiện tại CHƯA phải là trang giới thiệu dự án — đây là vấn đề lớn nhất cần sửa.

---

Bạn là UI/UX designer + frontend developer. Nhiệm vụ: review toàn bộ UI/UX website Kết Vòng và tự sửa.

## 0. Đọc trước khi làm
- Đọc `SRS_KetVong.md` để hiểu luồng và yêu cầu.
- Đọc **Phần 2** của tài liệu này — đây là nội dung chuẩn đã được owner chốt cho trang chủ (bản ngắn) và trang `/gioi-thieu` (bản đầy đủ).
- Brand tokens (kế thừa từ site tham khảo, đã verify): nền `#fffdf9`, primary `#ed7838`, chữ `#483426`, font tiêu đề Baloo 2, font nội dung Nunito Sans. Giữ nhất quán toàn site.

## 1. Việc bắt buộc: trang chủ phải LÀ giới thiệu dự án
Restructure trang `/` theo đúng bản ngắn trong `NoiDung_GioiThieu_KetVong.md`, theo thứ tự:
1. Hero: eyebrow + H1 "Kết Vòng" + tagline "Trao một vòng tay, kết một yêu thương" + 2 câu sub + 2 CTA (Ủng hộ ngay / Xem minh bạch).
2. Dải số liệu động (tổng đã nhận, số lượt ủng hộ từ DB; mục tiêu và đơn giá từ settings).
3. Câu chuyện: vấn đề → giải pháp → kết quả (3 đoạn ngắn, có thể kèm ảnh minh họa nếu có).
4. "Mỗi 10.000đ của bạn đi đâu" + link trang minh bạch.
5. "Ủng hộ chỉ với 3 bước".
6. 4 thẻ cam kết (An toàn / Minh bạch / Tôn trọng / Trách nhiệm).
7. CTA cuối trang + preview ngắn bảng minh bạch mới nhất.
- Trang `/gioi-thieu` giữ bản đầy đủ. Hai trang không được trùng lặp nguyên văn — trang chủ ngắn gọn, truyền cảm, dẫn về CTA; `/gioi-thieu` chi tiết.
- Nội dung đưa vào settings/seed (sửa được qua admin UI), không hardcode trong component.

## 2. Checklist review toàn site (tự sửa khi phát hiện)
- **Visual hierarchy:** mỗi trang có đúng 1 H1; CTA chính nổi bật nhất trang; không có 2 nút primary cạnh nhau.
- **Copy tiếng Việt:** không còn text kiểu dev/comment code, không tiếng Anh lẫn lộn, chính tả chuẩn, giọng thân thiện hướng người dùng (xem lại toàn bộ helper text, placeholder, message lỗi, empty state).
- **Luồng ủng hộ:** donor luôn biết mình đang ở bước nào; màn hình QR hiển thị mã + số tiền + nút copy rõ ràng; hướng dẫn "ghi đúng mã vào nội dung chuyển khoản" không thể bỏ qua.
- **States:** mọi trang có loading, empty (chưa có dữ liệu) và error state với câu chữ thân thiện — cấm trang trắng, cấm stack trace lộ ra UI.
- **Mobile:** kiểm tra ở 390px — không vỡ layout, CTA luôn trong tầm tay, QR đủ lớn để quét.
- **Tương phản & đọc được:** chữ trên nền màu phải đủ tương phản; font-size body tối thiểu 16px.
- **Nhất quán:** spacing, border-radius, màu nút, style card giống nhau toàn site; không mỗi trang một kiểu.

## 3. Ranh giới
- Không đổi luồng nghiệp vụ đã chốt trong SRS (chỉ sửa trình bày).
- Không đổi brand tokens khi chưa hỏi owner.
- Không push khi chưa được duyệt.

## 4. Báo cáo
- Liệt kê từng vấn đề tìm thấy (trang nào, vấn đề gì, ảnh hưởng UX ra sao), cách đã sửa, và trước/sau bằng screenshot nếu có thể.
- Những điểm đề xuất nhưng chưa sửa (cần owner quyết) ghi riêng.
- Kết thúc: hỏi có commit không.

---

# PHẦN 2: NỘI DUNG GIỚI THIỆU DỰ ÁN (ĐÃ CHỐT)

> Soạn từ proposal `SSG105_0_ossa.pdf` (2026-10-10). Gồm 2 bản: NGẮN cho trang chủ, ĐẦY ĐỦ cho trang `/gioi-thieu`.
> Nội dung phải đưa vào settings (sửa được qua admin UI), không hardcode. Các số liệu động (tổng đã nhận, số lượt) lấy từ DB theo SRS-031.

---

## BẢN NGẮN — Trang chủ (homepage = giới thiệu dự án)

### Hero
- **Eyebrow:** Dự án thiện nguyện · Nhóm Tình
- **H1:** Kết Vòng
- **Tagline:** Trao một vòng tay, kết một yêu thương
- **Sub (2 câu):** Kết Vòng là workshop làm vòng tay thủ công dành cho bệnh nhi ung thư (11–15 tuổi) đang điều trị tại Ngôi nhà chung Ba Thùy. Mỗi vòng tay các em tự tay xâu là một giờ phút quên đi bệnh tật, và một kỷ niệm mang về cho gia đình.
- **CTA chính:** Ủng hộ ngay → `/ung-ho`
- **CTA phụ:** Xem minh bạch → `/minh-bach`

### Dải số liệu (động từ DB, riêng mục tiêu lấy từ settings)
- 10.000đ — một lượt ủng hộ
- [tổng đã nhận]đ — đã được ủng hộ (động)
- [số lượt] — lượt ủng hộ (động)
- 20–30 — bệnh nhi tham gia workshop

### Câu chuyện (3 đoạn ngắn)
1. **Vấn đề:** Trẻ em ung thư phải điều trị dài ngày trong bệnh viện. Việc học, vui chơi, giao tiếp của các em bị thu hẹp, và bệnh viện dần trở thành một phần quen thuộc trong cuộc sống thường ngày.
2. **Giải pháp:** Một workshop xâu vòng tay hạt cườm ngay tại Ngôi nhà chung Ba Thùy, nơi các em tạm trú để điều trị. Các em tự chọn màu, tự tay làm vòng cho mình hoặc tặng bố mẹ, người chăm sóc, bạn bè — vừa sáng tạo vừa xả stress, an toàn với tiêu chuẩn vệ sinh bệnh viện.
3. **Kết quả mong đợi:** Ít nhất 20 bệnh nhi có một buổi sáng đầy tiếng cười, mỗi em mang về 1–2 chiếc vòng tay do chính tay mình làm.

### Mỗi 10.000đ của bạn đi đâu
- Tiền ủng hộ dùng cho nguyên vật liệu workshop (hạt cườm, dây, charm, dụng cụ), in ấn, đóng gói quà và tổ chức sự kiện. Tổng ngân sách dự kiến: 2.300.000đ.
- Mọi khoản thu/chi được đăng công khai mỗi ngày tại trang Minh bạch.

### Ủng hộ chỉ với 3 bước
1. Chọn số lượng, điền thông tin, nhận mã `KV-XXXXXX`.
2. Quét QR và chuyển khoản đúng số tiền, ghi đúng mã vào nội dung.
3. Hệ thống tự động ghi nhận — tên bạn xuất hiện trên bảng minh bạch, mail cảm ơn gửi đến hộp thư của bạn.

### Cam kết của nhóm (4 thẻ)
- **An toàn:** tuân thủ quy định vệ sinh, y tế của nơi tổ chức.
- **Minh bạch:** công khai mọi nguồn thu và chi phí.
- **Tôn trọng:** bảo vệ riêng tư của trẻ, tham gia hoàn toàn tự nguyện.
- **Trách nhiệm:** theo sát từ chuẩn bị đến tổng kết và báo cáo.

### CTA cuối trang
- H1 nhỏ: "Một vòng tay nhỏ, một yêu thương lớn."
- Nút: Ủng hộ ngay

---

## BẢN ĐẦY ĐỦ — Trang `/gioi-thieu`

### Kết Vòng là gì
Kết Vòng là dự án workshop thiện nguyện của nhóm Tình, tổ chức hoạt động làm vòng tay thủ công cho bệnh nhi ung thư từ 11–15 tuổi đang điều trị nội trú, hiện tạm trú tại Ngôi nhà chung Ba Thùy.

Trong buổi workshop, các em được hướng dẫn xỏ vòng tay hạt cườm cùng phụ huynh hoặc người chăm sóc, viết thiệp trao gửi lời chúc yêu thương và đóng gói quà tặng kỷ niệm mang về.

### Vì sao là vòng tay
- Trẻ 11–15 tuổi cần sân chơi vừa sức, được tôn trọng quyền tự chủ (tự chọn màu sắc, tự làm) thay vì chỉ nhận quà thụ động.
- Hoạt động thủ công khô, sạch, không nhiệt, không bụi — đáp ứng tiêu chuẩn vệ sinh nghiêm ngặt của bệnh viện (nhiều workshop khác như nến thơm, tô tượng không đạt được điều này).
- Thành phẩm là vật kỷ niệm các em đeo mỗi ngày, gợi nhớ một trải nghiệm tích cực giữa quá trình điều trị.

### Mục tiêu cụ thể
- Mang lại niềm vui và tâm lý thoải mái cho ít nhất 20 bệnh nhi trong buổi workshop.
- Mỗi em hoàn thành 1–2 chiếc vòng tay để đeo hoặc tặng bố mẹ, người chăm sóc, bạn bè.
- Rèn sự khéo léo, khả năng tập trung và niềm tự hào khi tự tay hoàn thành sản phẩm.

### Ngân sách dự kiến: 2.300.000đ
| Hạng mục | Chi tiết | Dự kiến |
|---|---|---|
| Nguyên vật liệu | Hạt cườm, charm, dây cước, kéo, khay đựng | 800.000đ |
| Bánh kẹo, nước uống | Cho các em trong buổi workshop | 400.000đ |
| In ấn | Thẻ tên, thiệp mời, backdrop | 400.000đ |
| Đóng gói | Túi/hộp giấy, ruy-băng, sticker (20 phần) | 200.000đ |
| Vận chuyển | Vật tư, standee, banner | 200.000đ |
| Dự phòng | Phát sinh (10–15%) | 300.000đ |

### Hình thức đồng hành
- **Tài trợ hiện kim:** hỗ trợ chi phí vật liệu, in ấn, đóng gói và tổ chức (ủng hộ trực tiếp qua website).
- **Tài trợ hiện vật:** hạt, dây, charm, phụ kiện thủ công; túi/hộp giấy gói quà; bánh kẹo, sữa, đồ ăn nhẹ đóng gói; sách truyện, đồ dùng học tập làm quà cho các em.

### Cam kết của nhóm
1. **An toàn:** tuân thủ mọi quy định của Ngôi nhà chung Ba Thùy và yêu cầu y tế.
2. **Minh bạch:** công khai nguồn thu và mọi khoản chi, báo cáo đầy đủ sau sự kiện.
3. **Tôn trọng:** bảo vệ quyền riêng tư của trẻ (đặc biệt hình ảnh), mọi tham gia đều tự nguyện.
4. **Trách nhiệm:** theo sát từ chuẩn bị, tổ chức đến tổng kết.

### Đội ngũ thực hiện
- **Trưởng dự án / Thủ quỹ:** Thanh Trúc
- **Thành viên:** Thành Luân, Hoàng Hưng, Duy Tài, Tấn Tài, Anh Huy, Huỳnh Bảo, Tuấn Kiệt, Dương Bình
- (Website: Anh Huy phụ trách kỹ thuật.)

### Kêu gọi hành động
Hãy đồng hành cùng Kết Vòng để biến một workshop nhỏ thành một trải nghiệm ý nghĩa cho các em và gia đình trong thời gian điều trị. Mọi sự đóng góp, dù nhỏ, đều được trân trọng và công khai minh bạch.

- Nút: Ủng hộ ngay → `/ung-ho`
- Nút: Xem minh bạch thu/chi → `/minh-bach`

---

# PHẦN 3: YÊU CẦU UAT TRÊN LOCALHOST

> Tài liệu này dành cho cả agents (review code, hỗ trợ kỹ thuật) và người thực hiện UAT (click luồng, đánh giá UX). Trạng thái: ĐÃ CHỐT (2026-10-10).

## 1. Mục tiêu và phạm vi

**Mục tiêu:** xác nhận website hoạt động đúng SRS trên localhost trước khi deploy, bắt lỗi nghiệp vụ/UI/bảo mật khi sửa còn rẻ.

**Trong phạm vi:** toàn bộ luồng donor, webhook SePay (giả lập), admin vận hành, trang công khai, biên nhận + thư cảm ơn, consent/riêng tư, bảo mật cơ bản.

**Ngoài phạm vi (để giai đoạn sau):** gửi mail Gmail thật (chưa có OAuth2 production — test ở go-live), migrate Cloudflare/D1, kiểm thử tải (load test).

## 2. Điều kiện tiên quyết

- [ ] `pnpm install` + `pnpm dev` chạy được cả `apps/web` và `apps/api`; `pnpm build` pass.
- [ ] DB đã migrate + seed xong (đơn giá 10.000đ, preset [1], QR mẫu, nội dung trang mẫu).
- [ ] Đã seed 3 tài khoản admin (Huy super-admin, Trúc, Hưng); mỗi người tự đổi mật khẩu ở lần đăng nhập đầu.
- [ ] Agent đã viết script `simulate-webhook.ts`: nhận `(code, amount, content)` → ký HMAC bằng `SEPAY_SECRET` trong `.env` → POST vào webhook endpoint. (SePay thật không gọi được vào localhost nên bắt buộc có script này.)
- [ ] Chuẩn bị 1 điện thoại có app ngân hàng hoặc MoMo để quét thử QR (chỉ quét xem đọc đúng thông tin, KHÔNG chuyển tiền thật).

## 3. Phân vai

| Vai | Việc |
|---|---|
| Agents | Review code theo checklist bảo mật (mục 5 nhóm F), chạy `pnpm test`/`pnpm build`, viết script giả lập webhook, hỗ trợ reproduce lỗi, ghi issue kỹ thuật. |
| Huy (UAT một mình) | Thực hiện các case click UI, đánh giá chữ nghĩa tiếng Việt có thân thiện không, quét QR bằng điện thoại thật, chấm pass/fail theo cảm nhận người dùng thật. |

## 4. Kịch bản UAT

Quy ước cột "Kỳ vọng" là điều kiện pass. Case nào fail thì ghi issue theo mẫu ở mục 6.

### Nhóm A — Luồng donor (AC-01)

| ID | Tên case | Bước | Kỳ vọng |
|---|---|---|---|
| A1 | Chọn số lượng | Chọn preset 1 → nhập tay 3 | Số tiền hiển thị live: 10.000đ rồi 30.000đ |
| A2 | Số lượng không hợp lệ | Nhập 0, -1, chữ | Báo lỗi tiếng Việt thân thiện, không cho đi tiếp |
| A3 | Điền form và nhận mã | Điền tên, xưng hô, email, SĐT, lời nhắn, tick consent → tiếp tục | Nhận mã `KV-XXXXXX`; màn hình hiện QR + số tiền + mã + nút copy từng phần |
| A4 | Không tick consent | Bỏ trống checkbox đồng ý | Không cho đi tiếp, báo rõ lý do |
| A5 | Quét QR thật | Quét QR màn hình bằng điện thoại | App ngân hàng/MoMo đọc đúng số TK, đúng số tiền, nội dung = mã vừa nhận |
| A6 | Ủng hộ ẩn danh | Tick "Ẩn danh" rồi làm lại A3 | Vẫn nhận mã bình thường |

### Nhóm B — Webhook SePay giả lập (AC-02)

| ID | Tên case | Bước (dùng script giả lập) | Kỳ vọng |
|---|---|---|---|
| B1 | Khớp chuẩn | Đúng mã + đúng tiền + HMAC hợp lệ | Donation → `approved`; lên log công khai trong 1 phút; `EMAIL_LOG` có bản ghi |
| B2 | Sai số tiền | Đúng mã, tiền lệch (vd 20.000đ cho mã 10.000đ) | → `manual_review`, lý do `amount_mismatch`; KHÔNG lên log |
| B3 | Thiếu mã | Nội dung CK không chứa mã | → `manual_review`, lý do `missing_code`/`unmatched` |
| B4 | Chữ ký sai | HMAC ký bằng secret khác | Trả 401; không thay đổi dữ liệu gì |
| B5 | Webhook gửi lặp | Gửi cùng payload B1 lần 2 (trùng `sepay_transaction_id`) | Trả 200 nhưng bỏ qua; chỉ có 1 bản ghi `approved` |
| B6 | Một mã 2 giao dịch | Giao dịch thứ 2 khác `transaction_id` nhưng cùng mã đã approved | → `manual_review`, lý do `possible_duplicate` |
| B7 | Mã hết hạn | Tạo donation, chỉnh DB cho quá 48h, gửi webhook đúng mã + tiền | → `manual_review` (hết hạn); KHÔNG tự approve |

### Nhóm C — Admin vận hành (AC-05)

| ID | Tên case | Bước | Kỳ vọng |
|---|---|---|---|
| C1 | Rate limit đăng nhập | Nhập sai pass 5 lần trong 15 phút | Bị khóa tạm; message lỗi chung chung (không lộ email có tồn tại) |
| C2 | Đổi pass lần đầu | Đăng nhập lần đầu bằng pass seed | Bắt buộc đổi mật khẩu mới cho vào |
| C3 | Phân quyền | Đăng nhập Trúc/Hưng, gọi `/admin/settings` | Trả 403 |
| C4 | Duyệt tay: gán mã | Trong hàng chờ, "Gán vào mã..." cho 1 ca B2 | Donation → `approved`; lên log; `EMAIL_LOG` có bản ghi |
| C5 | Duyệt tay: từ chối | "Từ chối" 1 ca, bỏ trống lý do rồi nhập lý do | Bắt nhập lý do; → `rejected`; không lên log, không gửi mail |
| C6 | Đăng báo cáo | Soạn báo cáo markdown có bảng thu/chi → Đăng | Hiện ở trang minh bạch, render đúng định dạng |
| C7 | Sửa báo cáo | Sửa báo cáo đã đăng | Lưu version; xem được lịch sử phiên bản |
| C8 | Đổi settings | Đổi đơn giá/preset/QR trong settings → load lại trang ủng hộ | Cập nhật ngay, không cần rebuild |
| C9 | Gửi lại mail | Giả lập 1 mail lỗi trong `EMAIL_LOG` → bấm gửi lại | Mail được gửi lại, log cập nhật |

### Nhóm D — Công khai, biên nhận, thư cảm ơn (AC-03, AC-04)

| ID | Tên case | Bước | Kỳ vọng |
|---|---|---|---|
| D1 | Log không rò PII | Mở trang minh bạch; kiểm tra JSON thô của API public | Chỉ có tên (hoặc "Ẩn danh") + số tiền + thời gian; không có email/SĐT/lời nhắn/nội dung CK/token |
| D2 | Tổng quỹ đúng | So số trên trang với query DB trực tiếp | Tổng = SUM(`approved`); lượt = COUNT; khớp tuyệt đối |
| D3 | Biên nhận | Mở link `#access=<token>` đúng rồi sai | Đúng → xem được; sai → 404 chung chung (không lộ donation có tồn tại) |
| D4 | Thư cảm ơn | Bấm "Tải thư cảm ơn" → mở PNG | File PNG dọc ≥1240px; đúng tên/xưng hô/số tiền/ngày; QR trên thư quét được |
| D5 | Trang tĩnh | Mở `/gioi-thieu`, `/lien-he`, `/chinh-sach-bao-mat` | Đầy đủ nội dung, tiếng Việt đúng chính tả, không còn text kiểu dev |

### Nhóm E — Riêng tư và consent (AC-06)

| ID | Tên case | Bước | Kỳ vọng |
|---|---|---|---|
| E1 | Consent bắt buộc | (đã cover ở A4) | Không tick → không tạo được donation |
| E2 | Ẩn danh trên log | Donation ẩn danh được duyệt | Log hiện "Ẩn danh", không hiện tên thật |
| E3 | Xóa dữ liệu | Admin xóa PII 1 donation theo yêu cầu | SĐT/email/nội dung CK bị xóa; log thành "Ẩn danh"; tổng quỹ không đổi |
| E4 | Email log sạch PII | Kiểm tra `EMAIL_LOG` sau E3 | Không còn PII của donor đã xóa |

### Nhóm F — Bảo mật cơ bản (agents review + người thử)

| ID | Tên case | Bước | Kỳ vọng |
|---|---|---|---|
| F1 | Chặn truy cập admin | Mở `/admin` chưa đăng nhập | Đá về trang login |
| F2 | Session timeout | Kiểm tra config + test (xóa cookie → gọi API admin) | Hết hạn/không cookie → 401, đá về login |
| F3 | XSS | Nhập `<script>alert(1)</script>` vào tên/lời nhắn | Hiển thị dạng text thường, không thực thi |
| F4 | SQLi cơ bản | Nhập `' OR '1'='1` vào các ô tìm kiếm/form | Không lỗi lộ DB, xử lý như text thường |
| F5 | Brute force token | Gọi API biên nhận với token sai nhiều lần liên tiếp | Bị rate limit |

## 5. Checklist smoke test 15 phút (chạy đầu mỗi buổi UAT)

A1 → A3 → B1 → D1 → C1. Cả 5 xanh mới chạy tiếp các case còn lại.

## 6. Ghi nhận lỗi

Mỗi lỗi một issue với: tiêu đề ngắn; bước tái hiện; kỳ vọng vs thực tế; mức độ (**Blocker**: sai tiền/sai người/rò PII — phải sửa trước deploy; **Major**: luồng gãy nhưng có đường vòng; **Minor**: chính tả/UI); ảnh chụp màn hình nếu là lỗi UI.

## 7. Tiêu chí nghiệm thu (ĐÃ CHỐT 2026-10-10)

- [ ] 100% nhóm A, B, D pass.
- [ ] Nhóm C pass tối thiểu C1–C6 và C8 (C7, C9: pass hoặc đã ghi vào `TECH_DEBT.md`).
- [ ] 100% nhóm E, F pass (riêng tư và bảo mật không thỏa hiệp).
- [ ] Không phát sinh Blocker mới; mọi issue đã có người nhận và deadline.
- [ ] `pnpm test` + `pnpm build` xanh sau mọi bản sửa trong quá trình UAT.
