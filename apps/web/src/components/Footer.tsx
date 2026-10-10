import React, { useEffect, useState } from 'react';
import { Heart, ShieldCheck, Mail, Phone } from 'lucide-react';
import { fetchFundSummary } from '../api';
import type { FundSummary } from '../types';

export const Footer: React.FC = () => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  useEffect(() => { fetchFundSummary().then(setSummary).catch(() => undefined); }, []);
  return (
    <footer className="bg-[#fbf7f0] border-t border-brand-border mt-16 py-12 text-sm text-brand-textMuted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Cột 1: Giới thiệu */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-brand-orange text-white flex items-center justify-center">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <span className="font-display font-extrabold text-xl text-brand-orange">Kết Vòng</span>
            </div>
            <p className="text-xs leading-relaxed text-brand-textMuted">
              {summary?.campaign_intro || 'Thông tin chiến dịch đang được cập nhật.'}
            </p>
          </div>

          {/* Cột 2: Tuân thủ pháp luật */}
          <div>
            <h4 className="font-display font-bold text-sm text-brand-text mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-orange" />
              Cam Kết Minh Bạch &amp; Bảo Mật
            </h4>
            <p className="text-xs leading-relaxed text-brand-textMuted mb-2">
              Hoạt động vận động tài trợ tuân thủ Nghị định 93/2021/NĐ-CP về vận động, tiếp nhận và sử dụng các nguồn đóng góp tự nguyện.
            </p>
            <p className="text-xs leading-relaxed text-brand-textMuted">
              Dữ liệu cá nhân của người ủng hộ được bảo vệ theo Nghị định 13/2023/NĐ-CP.
            </p>
          </div>

          {/* Cột 3: Liên hệ */}
          <div>
            <h4 className="font-display font-bold text-sm text-brand-text mb-3">Thông Tin Liên Hệ</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-orange shrink-0" />
                <a href={`mailto:${summary?.contact_email || ''}`} className="hover:underline">
                  {summary?.contact_email || 'Chưa cập nhật'}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-orange shrink-0" />
                <span>{summary?.contact_phone || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-brand-border/60 flex flex-col sm:flex-row items-center justify-between text-xs text-brand-textMuted">
          <p>© 2026 Dự án Workshop Kết Vòng. Mọi quyền được bảo lưu.</p>
          <div className="mt-2 sm:mt-0 flex gap-3">
            <a href="/chinh-sach-bao-mat" className="hover:text-brand-orange">Chính sách bảo mật</a>
            <span>Hệ thống ghi nhận ủng hộ tự động qua SePay.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

