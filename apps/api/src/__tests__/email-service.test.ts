import test from 'node:test';
import assert from 'node:assert/strict';
import { renderThankYouHtml, renderCheckoutHtml } from '../services/email-service.js';

test('renderThankYouHtml produces certificate-styled HTML with metadata and Crayon tokens', () => {
  const receiptUrl = 'https://ketvong.vn/dong-gop/KV-TEST99#access=secrettoken123';
  const content = `Chào Bạn Trần Thị B,

Ban tổ chức Dự án Kết Vòng xin chân thành cảm ơn sự đóng góp quý báu của Bạn với số tiền 30.000đ (tương ứng 3 chiếc vòng tay) vào ngày 11/10/2026.

Mã ủng hộ của bạn: KV-TEST99
Xem biên nhận minh bạch và tải Thư cảm ơn tại:
${receiptUrl}

Trân trọng,
Ban Tổ Chức Workshop Kết Vòng`;

  const html = renderThankYouHtml(content, receiptUrl, {
    title: 'Bạn',
    name: 'Trần Thị B',
    amount: 30000,
    quantity: 3,
    code: 'KV-TEST99',
    dateStr: '11/10/2026',
  });

  // Cấu trúc HTML cơ bản
  assert.ok(html.includes('<!doctype html>'));
  assert.ok(html.includes('<html lang="vi"'));
  assert.ok(html.includes('</html>'));

  // Bảng màu Crayon & Tông giấy kem
  assert.ok(html.includes('#FFF8EE'), 'Phải chứa màu nền kem ấm #FFF8EE');
  assert.ok(html.includes('#FBF6EE'), 'Phải chứa màu giấy ngà #FBF6EE');
  assert.ok(html.includes('#D81B7A'), 'Phải chứa màu hồng Crayon #D81B7A');
  assert.ok(html.includes('#1F3F9E'), 'Phải chứa màu mực xanh navy #1F3F9E');

  // Tiêu đề chứng nhận
  assert.ok(html.includes('THƯ CẢM ƠN'), 'Phải chứa tiêu đề THƯ CẢM ƠN');
  assert.ok(html.includes('CHỨNG NHẬN ĐÓNG GÓP THIỆN NGUYỆN'), 'Phải chứa dòng phụ đề chứng nhận');

  // Thông tin người đóng góp và số tiền
  assert.ok(html.includes('Bạn Trần Thị B'), 'Phải chứa danh xưng và tên người ủng hộ');
  assert.ok(html.includes('ĐÃ CHUNG TAY ỦNG HỘ 30.000 VNĐ'), 'Phải có badge số tiền nổi bật');
  assert.ok(html.includes('3 chiếc vòng tay'), 'Phải có số lượng chiếc vòng tay');
  assert.ok(html.includes('KV-TEST99'), 'Phải có mã ủng hộ');
  assert.ok(html.includes('11/10/2026'), 'Phải có ngày xác nhận');

  // Khẩu hiệu và nút bấm CTA
  assert.ok(html.includes('Mỗi hạt cườm gửi trao — Một nhịp cầu yêu thương kết nối'), 'Phải có khẩu hiệu workshop');
  assert.ok(html.includes(receiptUrl), 'Phải chứa liên kết biên nhận');
  assert.ok(html.includes('Xem Thư Cảm Ơn &amp; Biên Nhận Điện Tử'), 'Phải có nút CTA');

  // Con dấu đỏ kiểm toán Nghị định 93 và Chữ ký đại diện BTC
  assert.ok(html.includes('ĐÃ ĐỐI SOÁT'), 'Phải có con dấu ĐÃ ĐỐI SOÁT');
  assert.ok(html.includes('NGHỊ ĐỊNH 93'), 'Phải có căn cứ NGHỊ ĐỊNH 93');
  assert.ok(html.includes('Nguyễn Thanh Trúc'), 'Phải có chữ ký Trưởng BTC Nguyễn Thanh Trúc');
  assert.ok(html.includes('Trưởng Ban Tổ Chức Dự Án'), 'Phải có chức danh Trưởng Ban Tổ Chức');
  assert.ok(html.includes('Nghị định 13/2023/NĐ-CP'), 'Phải có lưu ý bảo vệ dữ liệu cá nhân');
});

test('renderThankYouHtml falls back gracefully when called without metadata', () => {
  const receiptUrl = 'https://ketvong.vn/dong-gop/KV-FALL01#access=tok999';
  const content = `Chào Anh Lê Văn C,

Ban tổ chức Dự án Kết Vòng xin chân thành cảm ơn sự đóng góp quý báu của Anh với số tiền 50.000đ (tương ứng 5 chiếc vòng tay) vào ngày 11/10/2026.

Mã ủng hộ của bạn: KV-FALL01
Xem biên nhận minh bạch và tải Thư cảm ơn tại:
${receiptUrl}

Trân trọng,
Ban Tổ Chức Workshop Kết Vòng`;

  const html = renderThankYouHtml(content, receiptUrl);

  assert.ok(html.includes('Anh Lê Văn C'), 'Phải tự trích xuất được tên người ủng hộ');
  assert.ok(html.includes('KV-FALL01'), 'Phải tự trích xuất được mã ủng hộ');
  assert.ok(html.includes('50.000 VNĐ'), 'Phải tự trích xuất được số tiền');
  assert.ok(html.includes('5 chiếc vòng tay'), 'Phải tự trích xuất được số lượng vòng tay');
  assert.ok(html.includes('THƯ CẢM ƠN'));
  assert.ok(html.includes(receiptUrl));
});

test('renderCheckoutHtml formats checkout notification email cleanly', () => {
  const statusUrl = 'https://ketvong.vn/dong-gop/KV-CHECK1';
  const body = `Chào Bạn Nguyễn Văn D,

Hệ thống đã tạo yêu cầu ủng hộ 1 chiếc vòng tay, số tiền 10.000đ.
Mã ủng hộ: KV-CHECK1`;

  const html = renderCheckoutHtml(body, statusUrl);

  assert.ok(html.includes('YÊU CẦU ỦNG HỘ ĐÃ ĐƯỢC TẠO'));
  assert.ok(html.includes(statusUrl));
  assert.ok(html.includes('#D81B7A'));
  assert.ok(html.includes('#1F3F9E'));
  assert.ok(html.includes('Xem Trạng Thái Yêu Cầu Ủng Hộ'));
});
