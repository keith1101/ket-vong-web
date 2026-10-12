# Tích hợp thanh toán PayOS

## Luồng chính

1. Donor gửi form ủng hộ.
2. Backend tạo donation `pending_payment`.
3. Backend tạo PayOS payment link.
4. Frontend chuyển donor sang `checkoutUrl`.
5. PayOS gọi `POST /api/v1/webhooks/payos`.
6. Backend xác minh signature, khớp `orderCode` và số tiền.
7. Backend approve donation, ghi log minh bạch, tạo receipt và gửi email.

## Biến môi trường

```env
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYOS_BASE_URL=https://api-merchant.payos.vn
PAYOS_RETURN_URL=https://staging.example.vn/thanh-toan/ket-qua
PAYOS_CANCEL_URL=https://staging.example.vn/thanh-toan/da-huy
```

Không đưa các secret PayOS vào frontend hoặc Git.

## Webhook

PayOS signature được kiểm tra trên object `data` sau khi sắp xếp key. Webhook trùng được bỏ qua bởi `payment_events` và unique constraint.

Webhook production cần URL HTTPS public. Kiểm tra signature theo tài liệu PayOS trước khi bật production.

## Kiểm thử local

```powershell
pnpm db:migrate
pnpm test
pnpm webhook:simulate <orderCode> <amount> [reference]
```

Simulator chỉ dùng local. Staging vẫn phải kiểm tra webhook thật từ PayOS.
