import React from 'react';

/**
 * Chuỗi hạt cườm mini uốn lượn trang trí (SVG thuần theo bảng màu Crayon Rainbow)
 */
export const BeadStringDoodle: React.FC<{ className?: string }> = ({ className = 'w-48 h-6' }) => {
  return (
    <svg
      viewBox="0 0 200 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Sợi dây cước luồn qua */}
      <path
        d="M 10 12 Q 55 4, 100 12 T 190 12"
        stroke="#cfc2ac"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      {/* Từng hạt cườm màu sáp: hồng, xanh mực, cam, vàng, xanh lá, tím, xanh mây */}
      <circle cx="20" cy="11" r="5" fill="#D81B7A" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="45" cy="8" r="6" fill="#1F3F9E" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="70" cy="9" r="5.5" fill="#F58220" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="95" cy="12" r="6" fill="#FFC20E" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="120" cy="14" r="5" fill="#12A84B" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="145" cy="13" r="6" fill="#8A5FC8" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="170" cy="11" r="5" fill="#A8C8FA" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  );
};

/**
 * Sticker băng keo Washi tape dán góc ảnh scrapbook thủ công
 */
export const WashiTape: React.FC<{
  className?: string;
  color?: 'amber' | 'rose' | 'sky' | 'emerald' | 'orange' | 'purple';
}> = ({ className = 'w-24 h-6', color = 'amber' }) => {
  const colorMap = {
    amber: 'bg-[#FFF0B3] border-[#FFC20E] text-[#6B5200]',
    rose: 'bg-[#FFD9E8] border-[#D81B7A] text-[#9C1259]',
    sky: 'bg-[#DCE9FD] border-[#A8C8FA] text-[#1F3F9E]',
    emerald: 'bg-[#D4F0DF] border-[#12A84B] text-[#0C6B30]',
    orange: 'bg-[#FFE3CC] border-[#F58220] text-[#8F4306]',
    purple: 'bg-[#E9DFF7] border-[#8A5FC8] text-[#5B3A99]',
  };

  return (
    <div
      className={`inline-block px-3 py-0.5 text-[10px] font-mono tracking-widest uppercase border-t border-b shadow-xs backdrop-blur-xs select-none pointer-events-none transform -rotate-2 ${colorMap[color]} ${className}`}
      style={{
        clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
      }}
      aria-hidden="true"
    />
  );
};

/**
 * Trái tim nét vẽ tay chì màu (Doodle Heart)
 */
export const DoodleHeart: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-5 h-5',
  color = '#D81B7A',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={color}
        fillOpacity="0.18"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="30 2"
      />
    </svg>
  );
};

/**
 * Ngôi sao nét vẽ tay lấp lánh (Doodle Star)
 */
export const DoodleStar: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-5 h-5',
  color = '#FFC20E',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2l2.6 6.9 7.4.6-5.6 4.9 1.7 7.2-6.1-3.7-6.1 3.7 1.7-7.2-5.6-4.9 7.4-.6L12 2z"
        fill={color}
        fillOpacity="0.25"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Tia sáng lấp lánh 4 cánh (Sparkle Doodle)
 */
export const SparkleDoodle: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-4 h-4',
  color = '#1F3F9E',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"
        fill={color}
      />
    </svg>
  );
};
