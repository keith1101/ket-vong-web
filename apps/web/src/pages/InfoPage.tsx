import React, { useEffect, useState } from 'react';
import { fetchFundSummary } from '../api';
import type { FundSummary } from '../types';

type InfoKind = 'about' | 'contact' | 'privacy';

export const InfoPage: React.FC<{ kind: InfoKind }> = ({ kind }) => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFundSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  const title = kind === 'about' ? 'Giới thiệu' : kind === 'contact' ? 'Liên hệ' : 'Chính sách bảo mật';

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-3xl border border-brand-border shadow-sm p-6 sm:p-10">
        <h1 className="font-display font-extrabold text-3xl text-brand-text mb-6">{title}</h1>
        {loading ? (
          <p className="text-sm text-brand-textMuted">Đang tải nội dung…</p>
        ) : kind === 'about' ? (
          <div className="whitespace-pre-wrap text-base leading-relaxed text-brand-text">
            {summary?.campaign_intro || 'Nội dung giới thiệu chưa được cập nhật.'}
          </div>
        ) : kind === 'privacy' ? (
          <div className="space-y-5 text-sm leading-relaxed text-brand-text">
            <div className="whitespace-pre-wrap">{summary?.privacy_policy || 'Chính sách bảo mật chưa được cập nhật.'}</div>
            <p>
              Nếu muốn yêu cầu xóa dữ liệu cá nhân, vui lòng gửi email cho ban tổ chức theo địa chỉ{' '}
              <a className="text-brand-orange font-bold" href={`mailto:${summary?.contact_email || ''}`}>
                {summary?.contact_email || 'email hỗ trợ'}
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-base text-brand-text">
            <p>Ban tổ chức luôn sẵn sàng hỗ trợ các câu hỏi về khoản ủng hộ và việc đối chiếu giao dịch.</p>
            <p>Email: <a className="text-brand-orange font-bold" href={`mailto:${summary?.contact_email || ''}`}>{summary?.contact_email || 'Chưa cập nhật'}</a></p>
            <p>Số điện thoại: <span className="font-bold">{summary?.contact_phone || 'Chưa cập nhật'}</span></p>
          </div>
        )}
      </div>
    </section>
  );
};
