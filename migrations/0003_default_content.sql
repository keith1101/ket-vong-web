INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('unit_price', '10000', datetime('now')),
  ('max_quantity', '1000', datetime('now')),
  ('presets', '[1]', datetime('now')),
  ('campaign_name', 'Workshop Thủ Công Kết Vòng', datetime('now')),
  ('campaign_deadline', '', datetime('now')),
  ('campaign_target', '4000000', datetime('now')),
  ('contact_email', 'vongtayganket2006@gmail.com', datetime('now')),
  ('contact_phone', '0374519443', datetime('now')),
  ('campaign_intro', 'Kết Vòng là workshop làm vòng tay thủ công dành cho bệnh nhi ung thư (6-15 tuổi) đang điều trị tại Ngôi nhà chung Ba Thùy. Mỗi vòng tay các em tự tay xâu là một giờ phút quên đi bệnh tật, và một kỷ niệm mang về cho gia đình.', datetime('now')),
  ('privacy_policy', 'Chúng tôi cam kết bảo vệ dữ liệu cá nhân của người ủng hộ theo Nghị định 13/2023/NĐ-CP. Thông tin liên hệ chỉ dùng để đối chiếu khi cần thiết và không bao giờ công khai.', datetime('now')),
  ('google_sheet_url', 'https://docs.google.com/spreadsheets/d/12nNrIjXdsfFGHyvdfN9VF3Bo_kUV3ls2I52JjOVbm9M/edit?usp=sharing', datetime('now'));

INSERT OR IGNORE INTO templates (key, subject, content, updated_at) VALUES
  ('email_thank_you', '[Kết Vòng] Cảm ơn {{title}} {{name}} đã ủng hộ {{amount}}đ',
   'Chào {{title}} {{name}},

Ban tổ chức Dự án Kết Vòng xin chân thành cảm ơn sự đóng góp quý báu của {{title}} với số tiền {{amount}}đ (tương ứng {{unit}} chiếc vòng tay) vào ngày {{date}}.

Mã ủng hộ của bạn: {{code}}
Xem biên nhận minh bạch và tải Thư cảm ơn tại:
{{receipt_url}}

Trân trọng,
Ban Tổ Chức Workshop Kết Vòng', datetime('now')),
  ('letter_thank_you', 'Thư Cảm Ơn Kết Vòng',
   'Ban tổ chức Workshop Kết Vòng xin chân thành tri ân tấm lòng hảo tâm của {{title}} {{name}} đã chung tay đóng góp {{amount}}đ vào quỹ workshop. Sự sẻ chia của {{title}} là nguồn động viên to lớn cho dự án.', datetime('now'));
