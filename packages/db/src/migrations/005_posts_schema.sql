-- ==============================================================================
-- BẢNG BÀI VIẾT / TIN TỨC / HOẠT ĐỘNG (POSTS)
-- Tương thích SQLite 3 và Cloudflare D1
-- ==============================================================================

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    cover_image TEXT,
    category TEXT NOT NULL DEFAULT 'Hoạt động',
    status TEXT NOT NULL DEFAULT 'draft',
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- Khởi tạo 2 bài viết mẫu từ tư liệu thực tế dự án Kết Vòng
INSERT OR IGNORE INTO posts (
    id, slug, title, excerpt, content_markdown, cover_image, category, status, author_id, author_name, published_at, created_at, updated_at
) VALUES (
    'post-001',
    'khoi-dong-du-an-thien-nguyen-ket-vong',
    'Khởi động Dự án Thiện nguyện Kết Vòng - Trao một vòng tay, kết một yêu thương',
    'Dự án thiện nguyện Kết Vòng chính thức phát động với sứ mệnh mang đến niềm vui, nụ cười và sự đồng hành ấm áp cho các em nhỏ đang điều trị tại Ngôi nhà chung Ba Thùy.',
    replace('## Hành trình Kết Vòng chính thức bắt đầu!\n\n**Kết Vòng** là dự án thiện nguyện do Nhóm Tình (sinh viên Đại học FPT TP.HCM) khởi xướng trong khuôn khổ môn học SSG105.\n\n### Ý nghĩa thông điệp\n> *"Trao một vòng tay, kết một yêu thương"*\n\nChúng mình tin rằng mỗi chiếc vòng tay thủ công không chỉ đơn thuần là món trang sức xinh xắn, mà còn là chiếc cầu nối tình cảm, chở che những ước mơ ngây thơ và xua tan âu lo mỏi mệt trong những ngày điều trị dài của các em nhỏ ung thư.\n\n![Coming Soon](/images/coming-soon.png)\n\n### Mục tiêu chiến dịch\n- **Kinh phí mục tiêu:** 4.000.000 VNĐ phục vụ trọn vẹn chi phí nguyên vật liệu (hạt cườm, dây cước, charm, thiệp tay, quà tặng thiết yếu).\n- **Địa điểm tổ chức:** Ngôi nhà chung Ba Thùy - mái ấm tạm trú yêu thương của các gia đình bệnh nhi.\n- **Thời gian diễn ra:** Tháng 10/2026.\n\nCảm ơn tất cả quý nhà hảo tâm và các bạn trẻ đã luôn quan tâm và đồng hành cùng Kết Vòng!', '\n', char(10)),
    '/images/coming-soon.png',
    'Thông báo',
    'published',
    'admin-seed',
    'Ban Quản Trị Kết Vòng',
    datetime('now'),
    datetime('now'),
    datetime('now')
), (
    'post-002',
    'workshop-xau-vong-tay-yeu-thuong-tai-ba-thuy',
    'Workshop Xâu Vòng Tay Yêu Thương tại Ngôi nhà chung Ba Thùy',
    'Một buổi chiều ngập tràn sắc màu và tiếng cười rộn rã khi các em nhỏ tự tay chọn từng hạt cườm, xâu nên những chiếc vòng tay kỷ niệm đầy ý nghĩa.',
    replace('## Nụ cười trở lại trên gương mặt các em nhỏ\n\nBuổi workshop xâu vòng tay thủ công tại **Ngôi nhà chung Ba Thùy** đã diễn ra trong bầu không khí ấm cúng và đầy xúc động.\n\n### Từng hạt cườm chở theo hy vọng\nCác em nhỏ từ 6 đến 15 tuổi, dù mang trên mình những mũi tiêm hay những lần hóa trị mệt nhoài, nhưng khi nhìn thấy những khay hạt cườm rực rỡ sắc màu, đôi mắt các em đều sáng bừng lên niềm vui háo hức.\n\n![Hoạt động workshop xâu vòng tay](/images/workshop-1.jpg)\n\n> *"Con muốn xâu chiếc vòng màu xanh này tặng cho mẹ, vì mẹ đã chăm con suốt những ngày con nằm viện..."* - Lời chia sẻ ngây thơ của một bé gái 8 tuổi khiến cả nhóm không khỏi nghẹn ngào.\n\n![Các em nhỏ và thành viên tại Ngôi nhà chung Ba Thùy](/images/workshop-group.jpg)\n\n### Lời tri ấn từ Nhóm Tình\nToàn bộ kinh phí mua nguyên vật liệu, quà tặng thiết yếu và dụng cụ thủ công đã được sử dụng minh bạch 100% nhờ sự chung tay của quý nhà hảo tâm. Những chiếc vòng tay hoàn thiện không chỉ là thành quả của sự kiên nhẫn mà còn là minh chứng cho tình yêu thương gắn kết không biên giới.\n\n![Banner chương trình Kết Vòng](/images/workshop-banner.jpg)\n\nCảm ơn các nhà hảo tâm đã giúp chúng mình biến workshop này thành hiện thực!', '\n', char(10)),
    '/images/workshop-1.jpg',
    'Hoạt động',
    'published',
    'admin-seed',
    'Ban Quản Trị Kết Vòng',
    datetime('now'),
    datetime('now'),
    datetime('now')
);
