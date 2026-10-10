import React from 'react';
import type { FundSummary } from '../types';
import { Target, TrendingUp, Users, Wallet } from 'lucide-react';

interface ProgressBarProps {
  summary: FundSummary | null;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ summary }) => {
  if (!summary) return null;

  const target = summary.target_amount;
  const received = summary.total_received || 0;
  const percentage = Math.min(100, Math.round((received / target) * 100));

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-sm mb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-brand-orange bg-brand-accent px-3 py-1 rounded-full">
            Tiến độ gây quỹ
          </span>
          <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-brand-text mt-2">
            {received.toLocaleString('vi-VN')} <span className="text-lg font-normal text-brand-textMuted">đ</span>
          </h3>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-xs text-brand-textMuted block">Mục tiêu đợt 1</span>
          <span className="font-display font-bold text-xl text-brand-text">
            {target.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#f4ebe1] h-4 rounded-full overflow-hidden p-0.5 mb-6">
        <div
          className="bg-gradient-to-r from-brand-orange to-[#f59e0b] h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(4, percentage)}%` }}
        />
      </div>

      {/* 4 Chỉ số quỹ (SRS-031) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-brand-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-accent flex items-center justify-center text-brand-orange shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-brand-textMuted font-medium">Đã Đạt Được</div>
            <div className="font-display font-bold text-base text-brand-text">{percentage}%</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-accent flex items-center justify-center text-brand-orange shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-brand-textMuted font-medium">Lượt Ủng Hộ</div>
            <div className="font-display font-bold text-base text-brand-text">{summary.donation_count} lượt</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-accent flex items-center justify-center text-brand-orange shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-brand-textMuted font-medium">Tổng Đã Chi</div>
            <div className="font-display font-bold text-base text-brand-text">{summary.total_spent.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-accent flex items-center justify-center text-brand-orange shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-brand-textMuted font-medium">Số Dư Quỹ</div>
            <div className="font-display font-bold text-base text-brand-text">{summary.balance.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>
      </div>
    </div>
  );
};

