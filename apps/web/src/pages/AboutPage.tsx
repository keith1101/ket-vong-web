import React from 'react';
import { 
  Heart, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Coins, 
  Package, 
  Users, 
  FileText,
  ChevronRight
} from 'lucide-react';

interface AboutPageProps {
  navigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ navigate }) => {
  const budgetItems = [
    { name: '1. Vật tư hoạt động', detail: 'Hạt cườm, charm, dây cước co giãn, kéo an toàn, khay đựng, hộp/bao bì làm vòng tay, giấy A5, bút màu, sticker', amount: 1200000 },
    { name: '2. Vật phẩm thiết yếu & quà tặng', detail: 'Sữa tươi dinh dưỡng tiệt trùng, bánh kẹo mềm dinh dưỡng, khăn giấy ướt, nước rửa tay và vật phẩm hỗ trợ nhu cầu thiết yếu cho bệnh nhi', amount: 1300000 },
    { name: '3. Setup & trang trí không gian', detail: 'Backdrop sân khấu, bảng tên/signage chào đón, standee, khăn bàn, decor ấm cúng, thiết bị loa mini', amount: 700000 },
    { name: '4. Chi phí in ấn & truyền thông', detail: 'Thiệp mời, bảng hướng dẫn xâu vòng A3, bảng tên BTC/tình nguyện viên, ấn phẩm & sticker lưu niệm', amount: 500000 },
    { name: '5. Vận chuyển & dự phòng phát sinh', detail: 'Vận chuyển vật tư, chi phí dự phòng phát sinh thực tế', amount: 300000 },
  ];

  const totalBudget = budgetItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
      {/* 1. Header & Giới thiệu chung */}
      <section className="space-y-4">
        <div className="kv-pill bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 font-display">
          <Heart className="w-3.5 h-3.5 fill-[var(--kv-pink)] text-[var(--kv-pink)]" />
          <span>Giới thiệu chi tiết dự án</span>
        </div>

        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[var(--kv-ink)] tracking-tight">
          Dự Án Workshop Thiện Nguyện Kết Vòng
        </h1>

        <p className="text-base sm:text-lg text-[var(--kv-text)] leading-relaxed pt-2 font-body">
          Kết Vòng là dự án workshop thiện nguyện của nhóm Tình, tổ chức hoạt động làm vòng tay thủ công cho bệnh nhi ung thư từ 6-15 tuổi đang điều trị nội trú, hiện tạm trú tại Ngôi nhà chung Ba Thùy.
        </p>

        <p className="text-base text-[var(--kv-text-soft)] leading-relaxed font-body">
          Trong buổi workshop, các em được hướng dẫn xỏ vòng tay hạt cườm cùng phụ huynh hoặc người chăm sóc, viết thiệp trao gửi lời chúc yêu thương và đóng gói quà tặng kỷ niệm mang về.
        </p>

        {/* Banner chính thức FPT University & Kết Vòng */}
        <div className="pt-2 rounded-3xl overflow-hidden border-2 border-[var(--color-border-strong)] shadow-sm">
          <img
            src="/images/workshop-banner.jpg"
            alt="FPT University & Dự án thiện nguyện Kết Vòng"
            className="w-full h-auto object-cover"
          />
        </div>
      </section>

      {/* 2. Vì sao là vòng tay */}
      <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-6">
        <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
          Vì Sao Là Vòng Tay?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] flex items-center justify-center font-bold text-sm font-display">
              1
            </div>
            <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">
              Sân chơi vừa sức &amp; tự chủ
            </h3>
            <p className="text-xs sm:text-sm text-[var(--kv-text-soft)] leading-relaxed font-body">
              Trẻ 6-15 tuổi cần sân chơi vừa sức, được tôn trọng quyền tự chủ (tự chọn màu sắc, tự làm) thay vì chỉ nhận quà thụ động.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] flex items-center justify-center font-bold text-sm font-display">
              2
            </div>
            <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">
              An toàn chuẩn vệ sinh nơi lưu trú
            </h3>
            <p className="text-xs sm:text-sm text-[var(--kv-text-soft)] leading-relaxed font-body">
              Hoạt động thủ công khô, sạch, không nhiệt, không bụi - đáp ứng tiêu chuẩn vệ sinh nghiêm ngặt của nơi lưu trú (nhiều workshop khác như nến thơm, tô tượng không đạt được điều này).
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] flex items-center justify-center font-bold text-sm font-display">
              3
            </div>
            <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">
              Kỷ niệm mang theo mỗi ngày
            </h3>
            <p className="text-xs sm:text-sm text-[var(--kv-text-soft)] leading-relaxed font-body">
              Thành phẩm là vật kỷ niệm các em đeo mỗi ngày, gợi nhớ một trải nghiệm tích cực giữa quá trình điều trị dài ngày.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Mục tiêu cụ thể */}
      <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-6">
        <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
          Mục Tiêu Cụ Thể
        </h2>

        <ul className="space-y-3.5 text-sm sm:text-base text-[var(--kv-text)] font-body">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--kv-pink)] shrink-0 mt-0.5" />
            <span>Mang lại niềm vui và tâm lý thoải mái cho ít nhất 20 bệnh nhi trong buổi workshop.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--kv-pink)] shrink-0 mt-0.5" />
            <span>Mỗi em hoàn thành 1-2 chiếc vòng tay để đeo hoặc tặng bố mẹ, người chăm sóc, bạn bè.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--kv-pink)] shrink-0 mt-0.5" />
            <span>Rèn sự khéo léo, khả năng tập trung và niềm tự hào khi tự tay hoàn thành sản phẩm.</span>
          </li>
        </ul>
      </section>

      {/* 4. Ngân sách dự kiến 4.000.000đ */}
      <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
              Ngân Sách Dự Kiến: 4.000.000đ
            </h2>
            <p className="text-xs sm:text-sm text-[var(--kv-text-soft)]">
              Dự toán chi tiết từng hạng mục phục vụ workshop và quà tặng, vật phẩm thiết yếu bệnh nhi
            </p>
          </div>
          <span className="font-display font-extrabold text-xl text-[var(--color-number)] self-start sm:self-auto">
            Tổng: {totalBudget.toLocaleString('vi-VN')}đ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--kv-ink)] font-bold font-display">
                <th className="py-3 pr-4">Hạng mục</th>
                <th className="py-3 px-4">Chi tiết</th>
                <th className="py-3 pl-4 text-right">Dự kiến</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60 font-body">
              {budgetItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-[var(--kv-paper)] transition-colors">
                  <td className="py-3.5 pr-4 font-bold text-[var(--kv-text)] font-display">{item.name}</td>
                  <td className="py-3.5 px-4 text-[var(--kv-text-soft)]">{item.detail}</td>
                  <td className="py-3.5 pl-4 text-right font-mono font-bold text-[var(--color-number)]">
                    {item.amount.toLocaleString('vi-VN')}đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[var(--kv-yellow-bg)]/60 rounded-2xl border border-[var(--kv-yellow-fg)]/20 text-xs sm:text-sm text-[var(--kv-text)] font-body leading-relaxed">
          💛 <strong>Cam kết kinh phí:</strong> Toàn bộ kinh phí còn dư sau chương trình sẽ được gửi tặng quỹ của cơ sở lưu trú, nhằm tiếp tục hỗ trợ các em nhỏ trong quá trình điều trị và sinh hoạt sau này.
        </div>
      </section>

      {/* 5. Hình thức đồng hành */}
      <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-6">
        <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
          Hình Thức Đồng Hành
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-2">
            <div className="flex items-center gap-2 font-bold text-base text-[var(--kv-ink)] font-display">
              <Coins className="w-5 h-5 text-[var(--kv-orange)]" />
              <span>Tài trợ hiện kim</span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--kv-text)]/85 leading-relaxed font-body">
              Hỗ trợ chi phí vật liệu, in ấn, đóng gói và tổ chức (ủng hộ trực tiếp qua website này với mã quyên góp tự động).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-2">
            <div className="flex items-center gap-2 font-bold text-base text-[var(--kv-ink)] font-display">
              <Package className="w-5 h-5 text-[var(--kv-pink)]" />
              <span>Tài trợ hiện vật</span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--kv-text)]/85 leading-relaxed font-body">
              Hạt, dây, charm, phụ kiện thủ công; túi/hộp giấy gói quà; bánh kẹo, sữa, đồ ăn nhẹ đóng gói; sách truyện, đồ dùng học tập làm quà cho các em.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Cam kết của nhóm */}
      <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-6">
        <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
          Cam Kết Của Nhóm Tình
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-[var(--kv-blue-bg)]/60 border border-[var(--kv-blue-fg)]/20 space-y-1">
            <strong className="text-[var(--kv-blue-fg)] block font-bold font-display">1. An toàn:</strong>
            <span className="text-[var(--kv-text)]/90 leading-relaxed font-body">
              Tuân thủ mọi quy định của Ngôi nhà chung Ba Thùy và yêu cầu y tế bệnh viện.
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--kv-orange-bg)]/60 border border-[var(--kv-orange-fg)]/20 space-y-1">
            <strong className="text-[var(--kv-orange-fg)] block font-bold font-display">2. Minh bạch:</strong>
            <span className="text-[var(--kv-text)]/90 leading-relaxed font-body">
              Công khai nguồn thu và mọi khoản chi, báo cáo đầy đủ sau sự kiện.
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--kv-pink-bg)]/60 border border-[var(--kv-pink-fg)]/20 space-y-1">
            <strong className="text-[var(--kv-pink-fg)] block font-bold font-display">3. Tôn trọng:</strong>
            <span className="text-[var(--kv-text)]/90 leading-relaxed font-body">
              Bảo vệ quyền riêng tư của trẻ (đặc biệt hình ảnh), mọi tham gia đều tự nguyện.
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--kv-green-bg)]/60 border border-[var(--kv-green-fg)]/20 space-y-1">
            <strong className="text-[var(--kv-green-fg)] block font-bold font-display">4. Trách nhiệm:</strong>
            <span className="text-[var(--kv-text)]/90 leading-relaxed font-body">
              Theo sát từ chuẩn bị, tổ chức đến tổng kết và đối soát công khai.
            </span>
          </div>
        </div>
      </section>

      {/* 7. Thông tin tổ chức & Lớp học thực tế */}
      <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
              Thông Tin Tổ Chức Workshop
            </h2>
            <p className="text-xs sm:text-sm text-[var(--kv-text-soft)]">
              Buổi gặp gỡ, xâu vòng và lan tỏa yêu thương cùng các em nhỏ
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-xs font-bold self-start sm:self-auto font-display">
            <span>Thứ Bảy, 24/10/2026</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-4 text-xs sm:text-sm text-[var(--kv-text)] font-body">
            <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
              <strong className="text-[var(--kv-ink)] block font-bold font-display">⏰ Thời gian:</strong>
              <p className="text-[var(--kv-text)]/90">08:00, Thứ Bảy, ngày 24/10/2026</p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
              <strong className="text-[var(--kv-ink)] block font-bold font-display">📍 Địa điểm:</strong>
              <p className="text-[var(--kv-text)]/90">Ngôi nhà chung Ba Thùy, Tăng Nhơn Phú, TP. Hồ Chí Minh</p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
              <strong className="text-[var(--kv-ink)] block font-bold font-display">👶 Đối tượng tham gia:</strong>
              <p className="text-[var(--kv-text)]/90">Các bệnh nhi từ 6-15 tuổi (đang điều trị tại Bệnh viện Ung Bướu cơ sở 2), cùng phụ huynh hoặc người chăm sóc đi cùng.</p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border-2 border-[var(--color-border-strong)] shadow-sm group">
            <img
              src="/images/workshop-group.jpg"
              alt="Hoạt động cùng các em tại Ngôi nhà chung Ba Thùy"
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="p-3 bg-[var(--kv-paper-deep)] text-center text-[11px] text-[var(--kv-text-soft)] font-semibold font-display">
              💛 Ngôi nhà chung Ba Thùy - Nơi lan tỏa yêu thương
            </div>
          </div>
        </div>
      </section>

      {/* 8. Thư viện hình ảnh hoạt động */}
      <section id="album" className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
              Thư Viện Khoảnh Khắc Workshop
            </h2>
            <p className="text-xs sm:text-sm text-[var(--kv-text-soft)]">
              Những hình ảnh chân thực ghi lại niềm vui và sự gắn kết của các em nhỏ
            </p>
          </div>
          <span className="kv-pill bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] text-xs font-bold font-display">
            Ảnh hoạt động thực tế
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white shadow-xs group">
            <div className="h-48 overflow-hidden">
              <img
                src="/images/workshop-1.jpg"
                alt="Các em nhỏ xâu vòng tay"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3 text-xs text-[var(--kv-text)] font-body">
              <strong>Hoạt động thủ công:</strong> Từng hạt cườm được các em tự tay chọn lựa, xâu chuỗi sự kiên nhẫn và niềm vui.
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white shadow-xs group">
            <div className="h-48 overflow-hidden">
              <img
                src="/images/workshop-group.jpg"
                alt="Nụ cười của các em tại Ngôi nhà chung"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3 text-xs text-[var(--kv-text)] font-body">
              <strong>Nụ cười rạng rỡ:</strong> Niềm vui và năng lượng tích cực lan tỏa giữa không gian Ngôi nhà chung Ba Thùy.
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white shadow-xs group">
            <div className="h-48 overflow-hidden">
              <img
                src="/images/workshop-banner.jpg"
                alt="Banner nhóm Tình FPTU"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3 text-xs text-[var(--kv-text)] font-body">
              <strong>Nhóm Tình đồng hành:</strong> Dự án học tập thiện nguyện môn SSG105 - FPT University TP. Hồ Chí Minh.
            </div>
          </div>
        </div>
      </section>

      {/* 8. Đội ngũ thực hiện */}
      <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-6">
        <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
          Đội Ngũ Thực Hiện (Nhóm Tình)
        </h2>

        <div className="space-y-4 text-xs sm:text-sm text-[var(--kv-text)] leading-relaxed font-body">
          <p>
            <strong className="text-[var(--kv-ink)] font-display">Trưởng dự án / Thủ quỹ:</strong> Nguyễn Thanh Trúc (chịu trách nhiệm chung và quản lý tài khoản riêng chiến dịch).
          </p>
          <p>
            <strong className="text-[var(--kv-ink)] font-display">Phụ trách Kỹ thuật &amp; Website:</strong> Bùi Anh Huy.
          </p>
          <p>
            <strong className="text-[var(--kv-ink)] font-display">Thành viên nhóm:</strong> Phan Viên Thành Luân, Nguyễn Hoàng Hưng, Nguyễn Duy Tài, Đinh Tấn Tài, Huỳnh Trần Gia Bảo, Hồ Tuấn Kiệt, Dương Bình.
          </p>
          <p className="text-[11px] text-[var(--kv-text-soft)] italic pt-2 border-t border-[var(--color-border)]/60">
            * Thông tin thành viên được đăng tải trên tinh thần phụng sự và đồng hành minh bạch cùng dự án.
          </p>
        </div>
      </section>

      {/* 9. Kêu gọi hành động cuối trang */}
      <section className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] p-8 sm:p-12 text-center shadow-sm space-y-6">
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--kv-ink)]">
          Chung Tay Cùng Kết Vòng
        </h2>
        <p className="text-sm sm:text-base text-[var(--kv-text-soft)] max-w-xl mx-auto leading-relaxed font-body">
          Hãy đồng hành cùng Kết Vòng để biến một workshop nhỏ thành một trải nghiệm ý nghĩa cho các em và gia đình trong thời gian điều trị. Mọi sự đóng góp, dù nhỏ, đều được trân trọng và công khai minh bạch.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/ung-ho')}
            className="w-full sm:w-auto kv-btn kv-btn--primary px-8 py-3.5 text-base shadow-sm"
          >
            <span>Ủng hộ ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/minh-bach')}
            className="w-full sm:w-auto kv-btn kv-btn--secondary px-8 py-3.5 text-base shadow-sm"
          >
            <span>Xem minh bạch thu/chi</span>
            <ChevronRight className="w-4 h-4 text-[var(--kv-ink)]" />
          </button>
        </div>
      </section>
    </div>
  );
};
