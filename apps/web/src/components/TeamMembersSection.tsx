import React, { useState } from 'react';
import { Users, Heart } from 'lucide-react';
import { DoodleHeart, DoodleStar, WashiTape } from './DoodleDecorations';

interface MemberInfo {
  id: string;
  name: string;
  role: string;
  badge: string;
  badgeColor: string;
  avatarFile: string;
  tapeColor: 'amber' | 'rose' | 'sky' | 'emerald' | 'orange' | 'purple';
}

const membersData: MemberInfo[] = [
  {
    id: 'truc',
    name: 'Nguyễn Thanh Trúc',
    role: 'Trưởng dự án · Thủ quỹ',
    badge: 'Quản lý tài khoản riêng NĐ 93',
    badgeColor: 'bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] border-[var(--kv-pink)]/30',
    avatarFile: 'truc.jpg',
    tapeColor: 'rose',
  },
  {
    id: 'huy',
    name: 'Bùi Anh Huy',
    role: 'Phụ trách Kỹ thuật & Website',
    badge: 'Hệ thống tự động PayOS',
    badgeColor: 'bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] border-[var(--kv-ink)]/30',
    avatarFile: 'huy.jpg',
    tapeColor: 'sky',
  },
  {
    id: 'luan',
    name: 'Phan Viên Thành Luân',
    role: 'Hậu cần & Điều phối',
    badge: 'Vật liệu hạt cườm',
    badgeColor: 'bg-[var(--kv-yellow-bg)] text-[var(--kv-yellow-fg)] border-[var(--kv-yellow)]/30',
    avatarFile: 'luan.jpg',
    tapeColor: 'amber',
  },
  {
    id: 'hung',
    name: 'Nguyễn Hoàng Hưng',
    role: 'Truyền thông & Hình ảnh',
    badge: 'Nhiếp ảnh & Thước phim',
    badgeColor: 'bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] border-[var(--kv-green)]/30',
    avatarFile: 'hung.jpg',
    tapeColor: 'emerald',
  },
  {
    id: 'duytai',
    name: 'Nguyễn Duy Tài',
    role: 'Điều phối hoạt động',
    badge: 'Workshop xâu chuỗi',
    badgeColor: 'bg-[var(--kv-orange-bg)] text-[var(--kv-orange-fg)] border-[var(--kv-orange)]/30',
    avatarFile: 'duytai.jpg',
    tapeColor: 'orange',
  },
  {
    id: 'tantai',
    name: 'Đinh Tấn Tài',
    role: 'Hậu cần & Vật tư',
    badge: 'Dụng cụ xâu cườm',
    badgeColor: 'bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] border-[var(--kv-sky)]/30',
    avatarFile: 'tantai.jpg',
    tapeColor: 'sky',
  },
  {
    id: 'bao',
    name: 'Huỳnh Trần Gia Bảo',
    role: 'Hỗ trợ Workshop',
    badge: 'Hướng dẫn xâu vòng',
    badgeColor: 'bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] border-[var(--kv-pink)]/30',
    avatarFile: 'bao.jpg',
    tapeColor: 'rose',
  },
  {
    id: 'kiet',
    name: 'Hồ Tuấn Kiệt',
    role: 'Kỹ thuật & Âm thanh',
    badge: 'Âm nhạc & Không khí',
    badgeColor: 'bg-[var(--kv-purple-bg)] text-[var(--kv-purple-fg)] border-[var(--kv-purple)]/30',
    avatarFile: 'kiet.jpg',
    tapeColor: 'purple',
  },
  {
    id: 'binh',
    name: 'Dương Bình',
    role: 'Chăm sóc & Phụ huynh',
    badge: 'Đồng hành cùng bệnh nhi',
    badgeColor: 'bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] border-[var(--kv-green)]/30',
    avatarFile: 'binh.jpg',
    tapeColor: 'emerald',
  },
];

/**
 * Avatar Figure chữ nhật (3:4) hỗ trợ chèn ảnh và auto-fallback minh họa
 */
const MemberFigureCard: React.FC<{ member: MemberInfo; index: number }> = ({ member, index }) => {
  const [imgError, setImgError] = useState(false);

  // Bộ màu pastel luân phiên cho fallback avatar
  const bgGradients = [
    'from-[var(--kv-orange-bg)] to-[var(--kv-yellow-bg)] text-[var(--kv-orange-fg)]',
    'from-[var(--kv-blue-bg)] to-[var(--kv-mint-bg)] text-[var(--kv-blue-fg)]',
    'from-[var(--kv-pink-bg)] to-[var(--kv-purple-bg)] text-[var(--kv-pink-fg)]',
    'from-[var(--kv-green-bg)] to-[var(--kv-mint-bg)] text-[var(--kv-green-fg)]',
    'from-[var(--kv-purple-bg)] to-[var(--kv-blue-bg)] text-[var(--kv-purple-fg)]',
  ];
  const colorPattern = bgGradients[index % bgGradients.length];

  return (
    <div className="bg-[var(--color-surface)] rounded-3xl p-3 sm:p-4 border-2 border-[var(--color-border-strong)] hover:border-[var(--kv-ink)] shadow-xs hover:shadow-sticker hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between relative group">
      {/* Sticker kẹp góc Washi Tape */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <WashiTape color={member.tapeColor} className="w-16 h-4" />
      </div>

      {/* Khung ảnh Figure chữ nhật đứng (3:4) */}
      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[var(--kv-paper)] border border-[var(--color-border)] shadow-inner mt-1">
        {!imgError ? (
          <img
            src={`/images/members/${member.avatarFile}`}
            alt={`Thành viên ${member.name} - Nhóm Tình`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${colorPattern} flex flex-col items-center justify-center p-3 text-center`}>
            {/* Chibi Icon Avatar Placeholder */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/95 shadow-xs border border-white flex items-center justify-center font-display font-extrabold text-2xl mb-2 text-[var(--kv-ink)]">
              {member.name.split(' ').slice(-1)[0][0]}
            </div>
            <span className="font-display font-bold text-xs uppercase tracking-wider opacity-85">
              Nhóm Tình
            </span>
            <span className="text-[10px] text-[var(--kv-text-soft)] mt-0.5 font-body">
              Chờ cập nhật ảnh
            </span>
          </div>
        )}

        {/* Nút sticker trái tim nhỏ góc ảnh */}
        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs shadow-xs flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
          <Heart className="w-3.5 h-3.5 fill-[var(--kv-pink)] text-[var(--kv-pink)]" />
        </div>
      </div>

      {/* Thông tin thành viên */}
      <div className="pt-3 text-center space-y-1">
        <h3 className="font-display font-bold text-xs sm:text-sm text-[var(--kv-text)] group-hover:text-[var(--kv-ink)] transition-colors min-h-[2.4rem] flex items-center justify-center leading-snug">
          {member.name}
        </h3>
        <p className="text-[11px] font-semibold text-[var(--kv-text-soft)] line-clamp-1 font-body">
          {member.role}
        </p>
        <div className="pt-1">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-display ${member.badgeColor}`}>
            {member.badge}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Section giới thiệu 9 thành viên trên trang chủ
 */
export const TeamMembersSection: React.FC = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Tiêu đề section */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-2 relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-xs font-bold font-display uppercase tracking-wider">
          <Users className="w-3.5 h-3.5" />
          <span>Sinh Viên FPT University</span>
        </div>
        
        <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-[var(--kv-ink)] flex items-center justify-center gap-2">
          <span>9 Gương Mặt Đồng Hành</span>
          <DoodleHeart className="w-6 h-6 text-[var(--kv-pink)] inline-block" />
        </h2>
        
        <p className="text-xs sm:text-sm text-[var(--kv-text-soft)] leading-relaxed max-w-xl mx-auto font-body">
          Các thành viên nhóm Tình trực tiếp chuẩn bị hạt cườm, tổ chức workshop và đối soát quỹ minh bạch từng đồng.
        </p>

        {/* Ngôi sao doodle trang trí bên góc */}
        <div className="hidden sm:block absolute -top-4 right-8 pointer-events-none">
          <DoodleStar className="w-6 h-6 text-[#FFC20E]" />
        </div>
      </div>

      {/* Lưới 9 Figure chữ nhật */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        {membersData.map((member, index) => (
          <MemberFigureCard key={member.id} member={member} index={index} />
        ))}
      </div>

      {/* Ghi chú minh bạch */}
      <div className="mt-8 text-center">
        <p className="text-[11px] text-[var(--kv-text-soft)] italic font-body">
          * Thông tin và hình ảnh thành viên được công khai trên tinh thần phụng sự và đồng hành minh bạch cùng dự án Kết Vòng.
        </p>
      </div>
    </section>
  );
};
