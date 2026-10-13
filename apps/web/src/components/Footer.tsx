import React, { useEffect, useState } from 'react';
import { ShieldCheck, Mail, Phone } from 'lucide-react';
import { fetchFundSummary } from '../api';
import type { FundSummary } from '../types';

export const Footer: React.FC = () => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  useEffect(() => { fetchFundSummary().then(setSummary).catch(() => undefined); }, []);

  return (
    <footer className="w-full bg-[var(--kv-paper-deep)] border-t border-[var(--color-border)] mt-16 py-12 text-sm text-[var(--kv-text-soft)]">
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-8">
          {/* Cột 1: Giới thiệu */}
          <div className="max-w-md">
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src="/images/avatar.png"
                alt="Logo Kết Vòng"
                className="w-8 h-8 rounded-full object-cover border border-[var(--kv-ink)]/30 shadow-sm"
              />
              <span className="font-display font-extrabold text-xl text-[var(--kv-ink)]">Kết Vòng</span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--kv-text-soft)] font-body">
              {summary?.campaign_intro || 'Dự án workshop thiện nguyện làm vòng tay hạt cườm, kết nối yêu thương và gây quỹ minh bạch cho các em nhỏ.'}
            </p>
          </div>

          {/* Cột 2: Tuân thủ pháp luật */}
          <div className="max-w-md md:justify-self-center">
            <h4 className="font-display font-bold text-sm text-[var(--kv-ink)] mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--kv-pink)]" />
              Cam Kết Minh Bạch &amp; Bảo Mật
            </h4>
            <p className="text-xs leading-relaxed text-[var(--kv-text-soft)] mb-2 font-body">
              Hoạt động vận động tài trợ tuân thủ Nghị định 93/2021/NĐ-CP về vận động, tiếp nhận và sử dụng các nguồn đóng góp tự nguyện.
            </p>
            <p className="text-xs leading-relaxed text-[var(--kv-text-soft)] font-body">
              Dữ liệu cá nhân của người ủng hộ được bảo vệ theo Nghị định 13/2023/NĐ-CP.
            </p>
          </div>

          {/* Cột 3: Liên hệ */}
          <div className="md:justify-self-end">
            <h4 className="font-display font-bold text-sm text-[var(--kv-ink)] mb-3">Thông Tin Liên Hệ</h4>
            <div className="space-y-2 text-xs font-body">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[var(--kv-pink)] shrink-0" />
                <a href={`mailto:${summary?.contact_email || 'vongtayganket2006@gmail.com'}`} className="hover:text-[var(--kv-pink)] transition-colors">
                  {summary?.contact_email || 'vongtayganket2006@gmail.com'}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[var(--kv-pink)] shrink-0" />
                <a href={`tel:${(summary?.contact_phone || '0374519443').replace(/\s+/g, '')}`} className="hover:text-[var(--kv-pink)] transition-colors">
                  {summary?.contact_phone || '0919 670 831'}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--color-border-strong)]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--kv-text-soft)]">
          <p>© 2026 Dự án Workshop Kết Vòng. Mọi quyền được bảo lưu.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="/chinh-sach-bao-mat" className="hover:text-[var(--kv-pink)] transition-colors">Chính sách bảo mật</a>
            <span>Hệ thống ghi nhận ủng hộ trực tuyến tự động 24/7.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
