import React, { useEffect, useState } from 'react';
import { 
  Heart, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  ZoomIn,
  MessageSquare,
  Package,
  Sparkle
} from 'lucide-react';
import { fetchFundSummary, fetchPublicDonations } from '../api';
import type { FundSummary, PublicDonationItem } from '../types';
import { DoodleHeart, DoodleStar, SparkleDoodle, WashiTape } from '../components/DoodleDecorations';
import { TeamMembersSection } from '../components/TeamMembersSection';

interface LandingPageProps {
  navigate: (path: string) => void;
}

interface CostDetailItem {
  name: string;
  spec: string;
  whereToBuy: string;
}

interface CostCategoryModalData {
  title: string;
  icon: string;
  badge: string;
  description: string;
  items: CostDetailItem[];
  note: string;
}

const WORKSHOP_PHOTOS = [
  {
    src: '/images/workshop-1.jpg',
    badge: 'Hoạt động thủ công',
    title: 'Hoạt động xâu vòng tay thủ công cùng các em nhỏ',
    desc: 'Từng hạt cườm được các em tự tay chọn lựa, mang theo niềm vui, sự kiên nhẫn và xua tan căng thẳng trong những ngày điều trị.',
  },
  {
    src: '/images/workshop-group.jpg',
    badge: 'Ngôi nhà chung Ba Thùy',
    title: 'Nụ cười tại Ngôi nhà chung Ba Thùy',
    desc: 'Ngôi nhà chung Ba Thùy là nơi tạm trú ấm áp của các em nhỏ ung thư và gia đình trong suốt quá trình điều trị.',
  },
  {
    src: '/images/workshop-banner.jpg',
    badge: 'Nhóm Tình · FPT University',
    title: 'Dự án thiện nguyện Kết Vòng — Nhóm Tình FPT University',
    desc: 'Trao một vòng tay, kết một yêu thương — thông điệp lan tỏa tình yêu thương và sự sẻ chia của cộng đồng sinh viên.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [recentDonations, setRecentDonations] = useState<PublicDonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCostCategory, setSelectedCostCategory] = useState<CostCategoryModalData | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetchFundSummary().catch(() => null),
      fetchPublicDonations(1, 5).catch(() => ({ items: [] })),
    ]).then(([sumData, donData]) => {
      if (sumData) setSummary(sumData);
      if (donData?.items) setRecentDonations(donData.items);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i !== null ? (i - 1 + WORKSHOP_PHOTOS.length) % WORKSHOP_PHOTOS.length : 0));
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i !== null ? (i + 1) % WORKSHOP_PHOTOS.length : 0));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex]);

  const totalReceived = summary?.total_received || 0;
  const donationCount = summary?.donation_count || 0;
  const targetBudget = summary?.target_amount || 4000000;
  const unitPrice = summary?.unit_price || 10000;
  const progressPercent = Math.min(100, Math.round((totalReceived / targetBudget) * 100));

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6 relative">
          {/* Doodles góc trên */}
          <div className="hidden sm:block absolute -top-4 -left-6 pointer-events-none">
            <DoodleStar className="w-8 h-8 text-[#FFC20E]" />
          </div>
          <div className="hidden sm:block absolute top-12 -right-8 pointer-events-none">
            <SparkleDoodle className="w-7 h-7 text-[#D81B7A]" />
          </div>

          {/* Logo Chính Thức Dự Án Kết Vòng (Crayon Rainbow) */}
          <div className="flex flex-col items-center justify-center py-2 sm:py-4">
            <div className="relative group max-w-sm sm:max-w-md md:max-w-lg mx-auto">
              <img
                src="/images/logo.png"
                alt="Logo Dự án Thiện nguyện Kết Vòng"
                className="w-full max-w-[320px] sm:max-w-[420px] md:max-w-[480px] h-auto object-contain mx-auto hover:scale-105 transition-transform duration-300 drop-shadow-sm select-none"
              />
              <h1 className="sr-only">Kết Vòng — Trao một vòng tay, kết một yêu thương</h1>
            </div>
          </div>

          <p className="font-display font-bold text-xl sm:text-2xl text-[var(--kv-orange-text)]">
            Trao một vòng tay, kết một yêu thương
          </p>

          <p className="text-base sm:text-lg text-[var(--kv-text)] leading-relaxed max-w-2xl mx-auto font-body">
            Kết Vòng là workshop làm vòng tay thủ công dành cho bệnh nhi ung thư (6–15 tuổi) đang điều trị tại Ngôi nhà chung Ba Thùy. Mỗi vòng tay các em tự tay xâu là một giờ phút quên đi bệnh tật, và một kỷ niệm mang về cho gia đình.
          </p>

          {/* Cặp nút hành động theo Theme Crayon Rainbow */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
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
              <span>Xem minh bạch</span>
              <ChevronRight className="w-4 h-4 text-[var(--kv-ink)]" />
            </button>
          </div>
        </div>

        {/* Featured Official Background Banner với kẹp giấy Washi Tape */}
        <div className="mt-10 sm:mt-14 max-w-4xl mx-auto rounded-3xl overflow-hidden border-2 border-[var(--color-border-strong)] shadow-md bg-white hover:shadow-xl transition-all group relative">
          <div className="absolute top-3 left-4 z-10 pointer-events-none">
            <WashiTape color="amber" className="w-20 h-5" />
          </div>
          <div className="absolute top-3 right-4 z-10 pointer-events-none">
            <WashiTape color="sky" className="w-20 h-5" />
          </div>
          <img
            src="/images/background.png"
            alt="Trao một vòng tay, kết một yêu thương - Banner chính thức Kết Vòng"
            className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-300"
          />
        </div>
      </section>

      {/* 2. DẢI SỐ LIỆU ĐỘNG */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)]/60">
            <div className="pt-4 lg:pt-0">
              <span className="block font-display font-extrabold text-2xl sm:text-4xl text-[var(--color-number)]">
                {unitPrice.toLocaleString('vi-VN')}đ
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[var(--kv-text-soft)] mt-1 block">
                một lượt ủng hộ
              </span>
            </div>

            <div className="pt-4 lg:pt-0">
              <span className="block font-display font-extrabold text-2xl sm:text-4xl text-[var(--kv-ink)]">
                {loading ? '…' : `${totalReceived.toLocaleString('vi-VN')}đ`}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[var(--kv-text-soft)] mt-1 block">
                đã được ủng hộ
              </span>
            </div>

            <div className="pt-4 lg:pt-0">
              <span className="block font-display font-extrabold text-2xl sm:text-4xl text-[var(--kv-ink)]">
                {loading ? '…' : donationCount}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[var(--kv-text-soft)] mt-1 block">
                lượt ủng hộ
              </span>
            </div>

            <div className="pt-4 lg:pt-0">
              <span className="block font-display font-extrabold text-2xl sm:text-4xl text-[var(--color-number)]">
                20–30
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[var(--kv-text-soft)] mt-1 block">
                bệnh nhi tham gia workshop
              </span>
            </div>
          </div>

          {/* Thanh tiến độ ngân sách dự kiến */}
          <div className="pt-4 border-t border-[var(--color-border)]/60 max-w-2xl mx-auto space-y-2">
            <div className="flex justify-between text-xs sm:text-sm font-semibold font-display">
              <span className="text-[var(--kv-text-soft)]">Tiến độ vận động:</span>
              <span className="font-bold text-[var(--color-number)]">
                {progressPercent}% so với ngân sách dự kiến ({targetBudget.toLocaleString('vi-VN')}đ)
              </span>
            </div>
            <div className="w-full bg-[var(--color-progress-track)] h-3 rounded-full overflow-hidden">
              <div 
                className="bg-[var(--color-progress-fill)] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--kv-text-soft)] text-center italic pt-1 font-body">
              * Chiến dịch kết thúc theo thời hạn tổ chức, tính theo ngân sách dự kiến 4.000.000đ.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CÂU CHUYỆN: VẤN ĐỀ → GIẢI PHÁP → KẾT QUẢ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--kv-ink)]">
            Câu Chuyện Của Kết Vòng
          </h2>
          <p className="text-sm text-[var(--kv-text-soft)] max-w-xl mx-auto text-center font-body">
            Hành trình thắp lên niềm vui nhỏ bé giữa những ngày điều trị dài ngày
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vấn đề */}
          <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] flex items-center justify-center font-display font-extrabold text-base">
                1
              </div>
              <h3 className="font-display font-bold text-lg text-[var(--kv-ink)]">
                Vấn đề
              </h3>
              <p className="text-sm text-[var(--kv-text)]/90 leading-relaxed font-body">
                Trẻ em ung thư phải điều trị dài ngày trong bệnh viện. Việc học, vui chơi, giao tiếp của các em bị thu hẹp, và bệnh viện dần trở thành một phần quen thuộc trong cuộc sống thường ngày.
              </p>
            </div>
          </div>

          {/* Giải pháp */}
          <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--kv-ink)] p-6 sm:p-8 shadow-sticker flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--kv-pink)] text-white flex items-center justify-center font-display font-extrabold text-base shadow-sm">
                2
              </div>
              <h3 className="font-display font-bold text-lg text-[var(--kv-pink)]">
                Giải pháp
              </h3>
              <p className="text-sm text-[var(--kv-text)]/90 leading-relaxed font-body">
                Một workshop xâu vòng tay hạt cườm ngay tại Ngôi nhà chung Ba Thùy, nơi các em tạm trú để điều trị. Các em tự chọn màu, tự tay làm vòng cho mình hoặc tặng bố mẹ, người chăm sóc, bạn bè — vừa sáng tạo vừa xả stress, an toàn, phù hợp với không gian lưu trú của các em.
              </p>
            </div>
          </div>

          {/* Kết quả */}
          <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] flex items-center justify-center font-display font-extrabold text-base">
                3
              </div>
              <h3 className="font-display font-bold text-lg text-[var(--kv-ink)]">
                Kết quả mong đợi
              </h3>
              <p className="text-sm text-[var(--kv-text)]/90 leading-relaxed font-body">
                Ít nhất 20 bệnh nhi có một buổi sáng đầy tiếng cười, mỗi em mang về 1–2 chiếc vòng tay do chính tay mình làm.
              </p>
            </div>
          </div>
        </div>

        {/* Khoảnh khắc từ hoạt động thực tế */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] overflow-hidden shadow-sm hover:shadow-md transition-all group relative">
            <div className="absolute top-3 left-4 z-10 pointer-events-none">
              <WashiTape color="rose" className="w-16 h-4" />
            </div>
            <div className="relative h-64 sm:h-72 overflow-hidden cursor-pointer" onClick={() => setLightboxIndex(0)}>
              <img
                src="/images/workshop-1.jpg"
                alt="Các em nhỏ tự tay chọn hạt và xâu vòng tại workshop"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-5">
                <p className="text-white text-xs sm:text-sm font-semibold leading-relaxed font-body">
                  ✨ Từng hạt cườm đầy màu sắc được các em tự tay chọn lựa, mang theo niềm vui và sự kiên trì.
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between text-xs text-[var(--kv-text-soft)] bg-white">
              <span className="font-bold text-[var(--kv-pink)] flex items-center gap-1 font-display">
                <span>Hoạt động workshop thủ công</span>
              </span>
              <button
                onClick={() => setLightboxIndex(0)}
                className="text-[var(--kv-ink)] hover:text-[var(--kv-pink)] font-semibold flex items-center gap-1 font-display"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Xem ảnh lớn</span>
              </button>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] overflow-hidden shadow-sm hover:shadow-md transition-all group relative">
            <div className="absolute top-3 right-4 z-10 pointer-events-none">
              <WashiTape color="emerald" className="w-16 h-4" />
            </div>
            <div className="relative h-64 sm:h-72 overflow-hidden cursor-pointer" onClick={() => setLightboxIndex(1)}>
              <img
                src="/images/workshop-group.jpg"
                alt="Nụ cười của các em nhỏ tại Ngôi nhà chung Ba Thùy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-5">
                <p className="text-white text-xs sm:text-sm font-semibold leading-relaxed font-body">
                  💛 Nụ cười hồn nhiên của các em tại Ngôi nhà chung Ba Thùy — động lực lớn nhất của nhóm Tình.
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between text-xs text-[var(--kv-text-soft)] bg-white">
              <span className="font-bold text-[var(--kv-ink)] flex items-center gap-1 font-display">
                <span>Địa điểm tổ chức</span>
              </span>
              <span className="bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] px-2.5 py-0.5 rounded-full font-semibold border border-[var(--kv-blue-fg)]/20 font-display">
                Ngôi nhà chung Ba Thùy
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MỖI 10.000Đ CỦA BẠN ĐI ĐÂU - 4 HẠNG MỤC MỚI KÈM MODAL CHI TIẾT */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] p-6 sm:p-10 shadow-sm space-y-6 relative">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--kv-ink)]">
                Mỗi 10.000đ Của Bạn Đi Đâu?
              </h2>
              <DoodleHeart className="w-5 h-5 text-[#D81B7A] hidden sm:inline-block" />
            </div>
            <p className="text-base text-[var(--kv-text)] leading-relaxed font-body">
              Tiền ủng hộ dùng cho nguyên vật liệu workshop (hạt cườm, dây, charm, dụng cụ), quà tặng thiết yếu, in ấn và tổ chức sự kiện. Tổng ngân sách dự kiến: <strong>4.000.000đ</strong>.
            </p>
            <p className="text-xs sm:text-sm text-[var(--kv-text-soft)] leading-relaxed font-body">
              👉 <em>Nhấp vào từng thẻ bên dưới để xem chi tiết danh mục vật tư, quy cách và định hướng nơi mua:</em>
            </p>
          </div>

          {/* 4 hạng mục chi phí mới */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {/* 1. Vật tư hoạt động */}
            <div 
              onClick={() => setSelectedCostCategory({
                title: 'Vật tư hoạt động',
                icon: '🧵',
                badge: 'Hoạt động thủ công chính',
                description: 'Toàn bộ vật tư cho workshop xâu vòng tay và sáng tạo nghệ thuật dành cho các em.',
                items: [
                  { name: 'Dây cước co giãn chuyên dụng', spec: 'Cuộn cước co giãn 0.6mm - 0.8mm dẻo dai, dễ xâu, nút thắt chắc chắn', whereToBuy: 'Chợ phụ liệu may mặc Đại Quang Minh / Shopee Mall' },
                  { name: 'Hạt cườm acrylic pastel & hạt chữ', spec: 'Hạt tròn đủ màu sắc, hạt chữ cái, hạt ngôi sao/trái tim an toàn', whereToBuy: 'Cửa hàng phụ kiện handmade Chợ Lớn' },
                  { name: 'Charm trang trí & mặt đeo', spec: 'Charm kim loại tráng men hình hoa, thú cưng, trái tim đáng yêu', whereToBuy: 'Phụ kiện handmade Sài Gòn / Shopee' },
                  { name: 'Hộp/Bao bì làm vòng tay mang về', spec: 'Hộp giấy kraft xinh xắn hoặc túi bóng kính thắt nơ kèm thiệp nhỏ', whereToBuy: 'Xưởng bao bì giấy Sài Gòn' },
                  { name: 'Giấy A5, bút màu, sticker', spec: 'Giấy vẽ A5 120gsm, hộp bút sáp/bút lông màu, sticker sticker bóc dán', whereToBuy: 'Nhà sách Fahasa / Văn phòng phẩm Phương Nam' },
                ],
                note: 'Tất cả vật tư được làm sạch, khử khuẩn bề mặt trước buổi workshop để đảm bảo an toàn tối đa cho các em.'
              })}
              className="p-5 rounded-2xl bg-[var(--kv-orange-bg)] border-2 border-[var(--kv-orange-fg)]/25 space-y-2.5 text-left cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[var(--kv-orange)] text-white flex items-center justify-center font-bold text-base shadow-xs">
                  🧵
                </div>
                <span className="text-[11px] font-bold text-[var(--kv-orange-fg)] bg-white/80 px-2 py-0.5 rounded-full font-display border border-[var(--kv-orange-fg)]/20">
                  Xem chi tiết ↗
                </span>
              </div>
              <h3 className="font-display font-bold text-base text-[var(--kv-ink)] group-hover:text-[var(--kv-orange-fg)] transition-colors">
                1. Vật tư hoạt động
              </h3>
              <p className="text-xs text-[var(--kv-text)]/85 leading-relaxed font-body">
                Dây, hạt, charm, hộp/bao bì làm vòng tay; giấy A5; bút màu; sticker.
              </p>
            </div>

            {/* 2. Vật phẩm thiết yếu cho bệnh nhi */}
            <div 
              onClick={() => setSelectedCostCategory({
                title: 'Vật phẩm thiết yếu cho bệnh nhi',
                icon: '💝',
                badge: 'Hỗ trợ thiết thực',
                description: 'Các vật phẩm chăm sóc nhu cầu sinh hoạt và dinh dưỡng hỗ trợ các bệnh nhi.',
                items: [
                  { name: 'Vật phẩm hỗ trợ nhu cầu thiết yếu', spec: 'Khăn giấy ướt không cồn, nước rửa tay khô sát khuẩn, khẩu trang y tế 4 lớp', whereToBuy: 'Hệ thống nhà thuốc Long Châu / Pharmacity' },
                  { name: 'Sữa tươi & thức uống dinh dưỡng', spec: 'Sữa tươi tiệt trùng Vinamilk / TH True Milk bổ sung canxi và kháng thể', whereToBuy: 'Siêu thị Co.opmart / Bách Hóa Xanh' },
                  { name: 'Bánh kẹo dinh dưỡng mềm', spec: 'Bánh xốp dinh dưỡng mềm dễ ăn, đóng gói tiệt trùng riêng từng gói', whereToBuy: 'Siêu thị Co.opmart / WinMart' },
                ],
                note: 'Ưu tiên các sản phẩm chính hãng, rõ nguồn gốc, hạn dùng xa, phù hợp thể trạng của bệnh nhi đang điều trị.'
              })}
              className="p-5 rounded-2xl bg-[var(--kv-pink-bg)] border-2 border-[var(--kv-pink-fg)]/25 space-y-2.5 text-left cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[var(--kv-pink)] text-white flex items-center justify-center font-bold text-base shadow-xs">
                  💝
                </div>
                <span className="text-[11px] font-bold text-[var(--kv-pink-fg)] bg-white/80 px-2 py-0.5 rounded-full font-display border border-[var(--kv-pink-fg)]/20">
                  Xem chi tiết ↗
                </span>
              </div>
              <h3 className="font-display font-bold text-base text-[var(--kv-ink)] group-hover:text-[var(--kv-pink)] transition-colors">
                2. Vật phẩm thiết yếu
              </h3>
              <p className="text-xs text-[var(--kv-text)]/85 leading-relaxed font-body">
                Các vật phẩm hỗ trợ nhu cầu thiết yếu và dinh dưỡng cho bệnh nhi.
              </p>
            </div>

            {/* 3. Setup & trang trí */}
            <div 
              onClick={() => setSelectedCostCategory({
                title: 'Setup & trang trí',
                icon: '🎪',
                badge: 'Không gian workshop',
                description: 'Tổ chức và bày trí không gian ấm cúng, thân thiện tại Ngôi nhà chung Ba Thùy.',
                items: [
                  { name: 'Backdrop sân khấu & phông chụp ảnh', spec: 'Bạt Hiflex / PP cán formex in thiết kế nhận diện Crayon Rainbow', whereToBuy: 'Xưởng in ấn quảng cáo nhanh' },
                  { name: 'Bảng tên / Signage & Standee chào đón', spec: 'Standee chữ X hướng dẫn và bảng tên đón tiếp các gia đình', whereToBuy: 'Xưởng in quảng cáo' },
                  { name: 'Khăn bàn & Khay chia hạt cườm', spec: 'Khăn trải bàn màu pastel, khay nhựa chia nhiều ô phân loại hạt', whereToBuy: 'Cửa hàng đồ gia dụng / Chợ Kim Biên' },
                  { name: 'Đồ decor, bàn ghế, loa, bạt che', spec: 'Loa kéo phát nhạc thiếu nhi, phụ kiện decor bóng bay, bàn ghế thuê bổ sung (nếu cần)', whereToBuy: 'Dịch vụ thuê âm thanh & thiết bị sự kiện' },
                ],
                note: 'Bố trí không gian gọn gàng, thoáng khí, đảm bảo an toàn tuyệt đối cho các em nhỏ di chuyển.'
              })}
              className="p-5 rounded-2xl bg-[var(--kv-blue-bg)] border-2 border-[var(--kv-blue-fg)]/25 space-y-2.5 text-left cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[var(--kv-ink)] text-white flex items-center justify-center font-bold text-base shadow-xs">
                  🎪
                </div>
                <span className="text-[11px] font-bold text-[var(--kv-blue-fg)] bg-white/80 px-2 py-0.5 rounded-full font-display border border-[var(--kv-blue-fg)]/20">
                  Xem chi tiết ↗
                </span>
              </div>
              <h3 className="font-display font-bold text-base text-[var(--kv-ink)] group-hover:text-[var(--kv-blue-fg)] transition-colors">
                3. Setup &amp; trang trí
              </h3>
              <p className="text-xs text-[var(--kv-text)]/85 leading-relaxed font-body">
                Backdrop, signage, khăn bàn, standee, decor, bàn ghế, loa, bạt che.
              </p>
            </div>

            {/* 4. Chi phí in ấn & truyền thông */}
            <div 
              onClick={() => setSelectedCostCategory({
                title: 'Chi phí in ấn & truyền thông',
                icon: '💌',
                badge: 'Truyền thông & Ấn phẩm',
                description: 'Ấn phẩm cầm tay, thẻ tên và hướng dẫn trực quan phục vụ buổi workshop.',
                items: [
                  { name: 'Thiệp mời trao tay', spec: 'Giấy mỹ thuật cao cấp in 2 mặt có chỗ viết tay lời chúc gửi các bé', whereToBuy: 'Xưởng in kỹ thuật số nhanh' },
                  { name: 'Bảng hướng dẫn các bước làm vòng tay', spec: 'Infographic minh họa các bước xâu vòng bằng hình vẽ trực quan khổ A3', whereToBuy: 'Xưởng in ấn FPTU' },
                  { name: 'Bảng tên BTC & Tình nguyện viên', spec: 'Thẻ đeo cổ in tên và phân công vai trò phụ trách từng nhóm em nhỏ', whereToBuy: 'Nhà in văn phòng phẩm' },
                  { name: 'Ấn phẩm phục vụ chương trình & Sticker', spec: 'Bộ sticker Kết Vòng làm quà lưu niệm cho bệnh nhi và người ủng hộ', whereToBuy: 'Xưởng in decal sticker' },
                ],
                note: 'Toàn bộ ấn phẩm được thiết kế chỉn chu, mang phong cách Crayon Rainbow ấm áp và gần gũi.'
              })}
              className="p-5 rounded-2xl bg-[var(--kv-green-bg)] border-2 border-[var(--kv-green-fg)]/25 space-y-2.5 text-left cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[var(--kv-green)] text-white flex items-center justify-center font-bold text-base shadow-xs">
                  💌
                </div>
                <span className="text-[11px] font-bold text-[var(--kv-green-fg)] bg-white/80 px-2 py-0.5 rounded-full font-display border border-[var(--kv-green-fg)]/20">
                  Xem chi tiết ↗
                </span>
              </div>
              <h3 className="font-display font-bold text-base text-[var(--kv-ink)] group-hover:text-[var(--kv-green-fg)] transition-colors">
                4. In ấn &amp; truyền thông
              </h3>
              <p className="text-xs text-[var(--kv-text)]/85 leading-relaxed font-body">
                Thiệp mời, bảng hướng dẫn, bảng tên và các ấn phẩm chương trình.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => navigate('/minh-bach')}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--kv-ink)] hover:text-[var(--kv-pink)] transition-colors min-h-touch font-display"
            >
              <span>Xem chi tiết sao kê &amp; báo cáo thu/chi tại trang Minh bạch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-[var(--kv-text-soft)] italic font-body">
              * Kinh phí còn dư sẽ được gửi tặng trực tiếp quỹ của cơ sở lưu trú Ba Thùy.
            </span>
          </div>
        </div>
      </section>

      {/* SECTION MỚI: KHOẢNH KHẮC WORKSHOP & LIGHTBOX TƯƠNG TÁC */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="kv-pill bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 font-display mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[var(--kv-pink)]" />
            <span>Hình ảnh hoạt động</span>
          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--kv-ink)]">
            Khoảnh Khắc Workshop Kết Vòng
          </h2>
          <p className="text-sm text-[var(--kv-text-soft)] max-w-xl mx-auto text-center font-body">
            Nhấp vào từng ảnh để phóng to và cảm nhận những khoảnh khắc đáng yêu
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ảnh 1 */}
          <div 
            onClick={() => setLightboxIndex(0)}
            className="bg-white rounded-3xl border-2 border-[var(--color-border-strong)] p-3.5 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative"
          >
            <div className="absolute top-2 left-6 z-10 pointer-events-none">
              <WashiTape color="rose" className="w-16 h-4" />
            </div>
            <div className="h-56 sm:h-64 rounded-2xl overflow-hidden relative">
              <img
                src="/images/workshop-1.jpg"
                alt="Workshop làm vòng tay cùng các em nhỏ"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/95 text-[var(--kv-ink)] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md font-display">
                  <ZoomIn className="w-3.5 h-3.5 text-[var(--kv-pink)]" /> Phóng to ảnh
                </span>
              </div>
            </div>
            <div className="pt-3 px-1 space-y-1">
              <h4 className="font-display font-bold text-sm text-[var(--kv-ink)]">
                Hoạt động xâu vòng tay
              </h4>
              <p className="text-xs text-[var(--kv-text-soft)] line-clamp-2 font-body">
                Từng hạt cườm được các em tự tay chọn lựa, rèn luyện sự khéo léo và mang lại nụ cười rạng rỡ.
              </p>
            </div>
          </div>

          {/* Ảnh 2 */}
          <div 
            onClick={() => setLightboxIndex(1)}
            className="bg-white rounded-3xl border-2 border-[var(--color-border-strong)] p-3.5 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative"
          >
            <div className="absolute top-2 right-6 z-10 pointer-events-none">
              <WashiTape color="emerald" className="w-16 h-4" />
            </div>
            <div className="h-56 sm:h-64 rounded-2xl overflow-hidden relative">
              <img
                src="/images/workshop-group.jpg"
                alt="Nụ cười của các em tại Ngôi nhà chung Ba Thùy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/95 text-[var(--kv-ink)] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md font-display">
                  <ZoomIn className="w-3.5 h-3.5 text-[var(--kv-green)]" /> Phóng to ảnh
                </span>
              </div>
            </div>
            <div className="pt-3 px-1 space-y-1">
              <h4 className="font-display font-bold text-sm text-[var(--kv-ink)]">
                Ngôi nhà chung Ba Thùy
              </h4>
              <p className="text-xs text-[var(--kv-text-soft)] line-clamp-2 font-body">
                Nơi lưu trú yêu thương của các bệnh nhi trong những tháng ngày điều trị tại viện.
              </p>
            </div>
          </div>

          {/* Ảnh 3 */}
          <div 
            onClick={() => setLightboxIndex(2)}
            className="bg-white rounded-3xl border-2 border-[var(--color-border-strong)] p-3.5 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative"
          >
            <div className="absolute top-2 left-6 z-10 pointer-events-none">
              <WashiTape color="sky" className="w-16 h-4" />
            </div>
            <div className="h-56 sm:h-64 rounded-2xl overflow-hidden relative">
              <img
                src="/images/workshop-banner.jpg"
                alt="Banner dự án Kết Vòng FPT University"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/95 text-[var(--kv-ink)] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md font-display">
                  <ZoomIn className="w-3.5 h-3.5 text-[var(--kv-ink)]" /> Phóng to ảnh
                </span>
              </div>
            </div>
            <div className="pt-3 px-1 space-y-1">
              <h4 className="font-display font-bold text-sm text-[var(--kv-ink)]">
                Nhóm Tình · FPT University
              </h4>
              <p className="text-xs text-[var(--kv-text-soft)] line-clamp-2 font-body">
                Trao một vòng tay, kết một yêu thương — tấm lòng của các bạn sinh viên gửi đến các em.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center pt-6">
          <button
            onClick={() => navigate('/gioi-thieu')}
            className="kv-btn kv-btn--secondary px-6 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <span>Xem đầy đủ câu chuyện và album ảnh tại trang Giới thiệu</span>
            <ChevronRight className="w-4 h-4 text-[var(--kv-ink)]" />
          </button>
        </div>
      </section>

      {/* 5. ỦNG HỘ CHỈ VỚI 3 BƯỚC */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--kv-ink)]">
            Ủng Hộ Chỉ Với 3 Bước
          </h2>
          <p className="text-sm text-[var(--kv-text-soft)] max-w-xl mx-auto text-center font-body">
            Quy trình hoàn toàn tự động, minh bạch và thuận tiện
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bước 1 */}
          <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--kv-blue-bg)] hover:border-[var(--kv-sky)] p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-200 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--kv-ink)] text-white flex items-center justify-center font-display font-extrabold text-lg shadow-sm">
                1
              </div>
              <span className="kv-pill bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] uppercase tracking-wider text-xs">
                Bước 1
              </span>
            </div>
            <h3 className="font-display font-bold text-lg text-[var(--kv-ink)]">
              Điền thông tin &amp; Nhận mã
            </h3>
            <p className="text-sm text-[var(--kv-text-soft)] leading-relaxed font-body">
              Chọn số lượng vòng, điền thông tin và nhận mã quyên góp tự động dạng <code className="bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] px-2 py-0.5 rounded-lg font-mono text-xs font-bold">KV-XXXXXX</code>.
            </p>
          </div>

          {/* Bước 2 */}
          <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--kv-green-bg)] hover:border-[var(--kv-green)]/40 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-200 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--kv-green)] text-white flex items-center justify-center font-display font-extrabold text-lg shadow-sm">
                2
              </div>
              <span className="kv-pill bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] uppercase tracking-wider text-xs">
                Bước 2
              </span>
            </div>
            <h3 className="font-display font-bold text-lg text-[var(--kv-ink)]">
              Thanh toán PayOS tự động
            </h3>
            <p className="text-sm text-[var(--kv-text-soft)] leading-relaxed font-body">
              Thanh toán qua PayOS theo mã <code className="bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] px-1.5 py-0.5 rounded font-mono text-xs font-bold">KV-XXXXXX</code>, hệ thống sẽ tự động đối soát và cập nhật trạng thái.
            </p>
          </div>

          {/* Bước 3 */}
          <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--kv-pink-bg)] hover:border-[var(--kv-pink)]/40 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-200 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--kv-pink)] text-white flex items-center justify-center font-display font-extrabold text-lg shadow-sm">
                3
              </div>
              <span className="kv-pill bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] uppercase tracking-wider text-xs">
                Bước 3
              </span>
            </div>
            <h3 className="font-display font-bold text-lg text-[var(--kv-ink)]">
              Tự động ghi nhận tức thì
            </h3>
            <p className="text-sm text-[var(--kv-text-soft)] leading-relaxed font-body">
              Hệ thống tự động duyệt trong 3 giây — tên bạn xuất hiện trên bảng minh bạch và thư cảm ơn kèm biên nhận gửi về hộp thư tức thì.
            </p>
          </div>
        </div>
      </section>

      {/* 6. 4 THẺ CAM KẾT CỦA NHÓM */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--kv-ink)]">
            Cam Kết Của Nhóm Tình
          </h2>
          <p className="text-sm text-[var(--kv-text-soft)] max-w-xl mx-auto text-center font-body">
            Bốn nguyên tắc hoạt động xuyên suốt chiến dịch
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--kv-ink)]/40 p-5 shadow-sm hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">An toàn</h3>
            <p className="text-xs text-[var(--kv-text-soft)] leading-relaxed font-body">
              Tuân thủ quy định vệ sinh, y tế của Ngôi nhà chung Ba Thùy.
            </p>
          </div>

          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--kv-orange)]/40 p-5 shadow-sm hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--kv-orange-bg)] text-[var(--kv-orange-fg)] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">Minh bạch</h3>
            <p className="text-xs text-[var(--kv-text-soft)] leading-relaxed font-body">
              Công khai mọi nguồn thu và chi phí, cập nhật tự động và báo cáo định kỳ.
            </p>
          </div>

          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--kv-pink)]/40 p-5 shadow-sm hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">Tôn trọng</h3>
            <p className="text-xs text-[var(--kv-text-soft)] leading-relaxed font-body">
              Bảo vệ riêng tư của trẻ, tham gia hoàn toàn trên tinh thần tự nguyện.
            </p>
          </div>

          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--kv-green)]/40 p-5 shadow-sm hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">Trách nhiệm</h3>
            <p className="text-xs text-[var(--kv-text-soft)] leading-relaxed font-body">
              Theo sát từ khâu chuẩn bị, tổ chức đến tổng kết và đối soát công khai.
            </p>
          </div>
        </div>
      </section>

      {/* 7. ĐỘI NGŨ 9 THÀNH VIÊN NHÓM TÌNH */}
      <TeamMembersSection />

      {/* 8. CTA CUỐI TRANG & PREVIEW MINH BẠCH MỚI NHẤT */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] p-8 sm:p-12 text-center shadow-sm space-y-5 relative">
          <div className="hidden sm:block absolute top-4 left-6 pointer-events-none">
            <DoodleStar className="w-6 h-6 text-[#FFC20E]" />
          </div>
          <div className="hidden sm:block absolute top-4 right-6 pointer-events-none">
            <SparkleDoodle className="w-6 h-6 text-[#D81B7A]" />
          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--kv-ink)]">
            Một vòng tay nhỏ, một yêu thương lớn.
          </h2>
          <p className="text-sm text-[var(--kv-text-soft)] max-w-xl mx-auto leading-relaxed font-body">
            Mỗi đóng góp của bạn, dù là 1 chiếc vòng tay 10.000đ, đều là nguồn động viên ý nghĩa dành cho các bệnh nhi và gia đình.
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
        </div>

        {/* Live preview 5 khoản ủng hộ gần nhất */}
        <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
            <div>
              <h3 className="font-display font-bold text-lg text-[var(--kv-ink)]">
                Khoản Ủng Hộ Mới Nhất
              </h3>
              <p className="text-xs text-[var(--kv-text-soft)]">
                Tự động cập nhật trực tiếp từ hệ thống
              </p>
            </div>
            <button
              onClick={() => navigate('/minh-bach')}
              className="text-xs font-bold text-[var(--kv-ink)] hover:text-[var(--kv-pink)] hover:underline flex items-center gap-1 min-h-touch font-display"
            >
              <span>Xem toàn bộ bảng minh bạch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentDonations.length === 0 ? (
            <p className="text-xs text-[var(--kv-text-soft)] text-center py-6 italic font-body">
              Chưa có dữ liệu đóng góp công khai.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]/60">
              {recentDonations.map((item, index) => (
                <div key={index} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm font-body">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--kv-text)]">
                        {item.display_name}
                      </span>
                      {item.display_name === 'Ẩn danh' && (
                        <span className="text-[10px] font-semibold bg-[var(--kv-paper-deep)] text-[var(--kv-text-soft)] px-2 py-0.5 rounded-full font-display">
                          Ẩn danh
                        </span>
                      )}
                    </div>
                    {item.public_message && (
                      <p className="text-xs text-[var(--kv-pink)] italic flex items-center gap-1 font-body">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--kv-pink)]" />
                        <span>"{item.public_message}"</span>
                      </p>
                    )}
                    <span className="text-[11px] text-[var(--kv-text-soft)] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--kv-ink)]" />
                      {new Date(item.approved_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="font-display font-extrabold text-sm sm:text-base text-[var(--color-number)] shrink-0 self-start sm:self-auto">
                    +{item.amount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MODAL CHI TIẾT HẠNG MỤC CHI PHÍ */}
      {selectedCostCategory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedCostCategory(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-2 border-[var(--kv-ink)] space-y-5 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedCostCategory(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[var(--kv-paper)] text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)] transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedCostCategory.icon}</span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--kv-orange-fg)] font-display">
                  {selectedCostCategory.badge}
                </span>
                <h3 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--kv-ink)]">
                  {selectedCostCategory.title}
                </h3>
              </div>
            </div>

            <p className="text-sm text-[var(--kv-text-soft)] font-body leading-relaxed">
              {selectedCostCategory.description}
            </p>

            <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[var(--kv-paper-deep)] font-display font-bold text-[var(--kv-ink)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="p-3">Tên vật phẩm</th>
                    <th className="p-3">Quy cách / Mô tả</th>
                    <th className="p-3">Định hướng nơi mua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/60 font-body">
                  {selectedCostCategory.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-[var(--kv-paper)] transition-colors">
                      <td className="p-3 font-semibold text-[var(--kv-ink)] font-display">{it.name}</td>
                      <td className="p-3 text-[var(--kv-text)]/90">{it.spec}</td>
                      <td className="p-3 text-[var(--kv-text-soft)] italic">{it.whereToBuy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-[var(--kv-blue-bg)]/60 rounded-xl border border-[var(--kv-blue-fg)]/20 text-xs text-[var(--kv-blue-fg)] font-body">
              💡 <strong>Lưu ý:</strong> {selectedCostCategory.note}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCostCategory(null)}
                className="kv-btn kv-btn--secondary px-6 py-2.5 text-xs font-display"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PHÓNG TO HÌNH ẢNH CÓ SLIDER & THANH CUỘN CHO PC */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          <div 
            className="max-w-4xl w-full max-h-[92vh] bg-white rounded-3xl overflow-hidden shadow-2xl relative flex flex-col border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng góc phải */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-3.5 right-3.5 z-30 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/85 hover:scale-105 transition-all shadow-md cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Vùng thanh cuộn slider trên web PC & Mobile */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {/* Khung ảnh Slider với nút chuyển ảnh trái/phải trực tiếp */}
              <div className="relative bg-black flex items-center justify-center min-h-[240px] sm:min-h-[320px] max-h-[48vh] sm:max-h-[52vh] overflow-hidden select-none group">
                <img
                  src={WORKSHOP_PHOTOS[lightboxIndex].src}
                  alt={WORKSHOP_PHOTOS[lightboxIndex].title}
                  className="w-auto h-full max-h-[48vh] sm:max-h-[52vh] max-w-full object-contain mx-auto transition-all duration-300"
                />

                {/* Nút Slider trượt trước (Trái) */}
                <button
                  onClick={() => setLightboxIndex((i) => (i !== null ? (i - 1 + WORKSHOP_PHOTOS.length) % WORKSHOP_PHOTOS.length : 0))}
                  className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/55 text-white hover:bg-black/85 hover:scale-110 transition-all shadow-lg backdrop-blur-xs flex items-center justify-center cursor-pointer"
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* Nút Slider trượt tiếp theo (Phải) */}
                <button
                  onClick={() => setLightboxIndex((i) => (i !== null ? (i + 1) % WORKSHOP_PHOTOS.length : 0))}
                  className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/55 text-white hover:bg-black/85 hover:scale-110 transition-all shadow-lg backdrop-blur-xs flex items-center justify-center cursor-pointer"
                  aria-label="Ảnh tiếp theo"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* Dải chỉ số vị trí ảnh */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-mono font-bold tracking-wider backdrop-blur-xs">
                  {lightboxIndex + 1} / {WORKSHOP_PHOTOS.length}
                </div>
              </div>

              {/* Dải Slider Thumbnails (Ảnh thu nhỏ có thể click chuyển ngay) */}
              <div className="bg-[#111827] p-2.5 sm:p-3 flex items-center justify-center gap-3 overflow-x-auto border-b border-[var(--color-border)] select-none">
                {WORKSHOP_PHOTOS.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative rounded-xl overflow-hidden transition-all duration-200 shrink-0 cursor-pointer ${
                      lightboxIndex === idx
                        ? 'ring-2 ring-[var(--kv-pink)] ring-offset-2 ring-offset-black scale-105 opacity-100'
                        : 'opacity-40 hover:opacity-80'
                    }`}
                    aria-label={`Chuyển đến ảnh ${idx + 1}`}
                  >
                    <img
                      src={photo.src}
                      alt={photo.title}
                      className="w-16 h-10 sm:w-20 sm:h-12 object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Phần thông tin bài viết & nút điều hướng bên dưới */}
              <div className="p-5 sm:p-6 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--kv-pink)] font-display bg-[var(--kv-pink-bg)] px-2.5 py-1 rounded-full border border-[var(--kv-pink-fg)]/20">
                    {WORKSHOP_PHOTOS[lightboxIndex].badge}
                  </span>
                  <span className="text-xs text-[var(--kv-text-soft)] font-display">
                    Ảnh {lightboxIndex + 1} / {WORKSHOP_PHOTOS.length}
                  </span>
                </div>

                <h3 className="font-display font-extrabold text-lg sm:text-xl text-[var(--kv-ink)]">
                  {WORKSHOP_PHOTOS[lightboxIndex].title}
                </h3>

                <p className="text-xs sm:text-sm text-[var(--kv-text-soft)] font-body leading-relaxed">
                  {WORKSHOP_PHOTOS[lightboxIndex].desc}
                </p>

                <div className="pt-3 flex items-center justify-between border-t border-[var(--color-border)]/60">
                  <button
                    onClick={() => setLightboxIndex((i) => (i !== null ? (i - 1 + WORKSHOP_PHOTOS.length) % WORKSHOP_PHOTOS.length : 0))}
                    className="kv-btn kv-btn--secondary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Ảnh trước</span>
                  </button>
                  
                  {/* Chấm tròn slider indicator */}
                  <div className="flex items-center gap-1.5">
                    {WORKSHOP_PHOTOS.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={() => setLightboxIndex(dotIdx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                          lightboxIndex === dotIdx 
                            ? 'bg-[var(--kv-pink)] w-6' 
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Ảnh ${dotIdx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setLightboxIndex((i) => (i !== null ? (i + 1) % WORKSHOP_PHOTOS.length : 0))}
                    className="kv-btn kv-btn--secondary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Ảnh tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
