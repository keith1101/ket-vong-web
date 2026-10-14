import React, { useEffect, useState } from 'react';
import type { FundSummary } from '../types';
import { Target, TrendingUp, Users, Wallet } from 'lucide-react';
import { fetchSheetLedger } from '../services/google-sheets';

export interface ProgressBarProps {
  summary: FundSummary | null;
  totalSpent?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ summary, totalSpent: overrideSpent }) => {
  const [sheetSpent, setSheetSpent] = useState<number | null>(null);

  useEffect(() => {
    if (overrideSpent === undefined && summary?.google_sheet_url) {
      fetchSheetLedger(summary.google_sheet_url)
        .then((data) => setSheetSpent(data.totalSpent))
        .catch(() => {});
    }
  }, [overrideSpent, summary?.google_sheet_url]);

  if (!summary) return null;

  const target = summary.target_amount;
  const received = summary.total_received || 0;
  const percentage = Math.min(100, Math.round((received / target) * 100));

  // Đồng bộ Tổng Đã Chi từ sổ quỹ (hoặc fallback summary.total_spent)
  const spent = overrideSpent !== undefined ? overrideSpent : (sheetSpent ?? summary.total_spent ?? 0);
  // Số dư quỹ = Tổng đã thu trừ đi tổng đã chi
  const balance = received - spent;

  return (
    <div className="bg-[var(--color-surface)] rounded-3xl p-6 sm:p-8 border border-[var(--color-border)] shadow-sm mb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <span className="kv-pill bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] font-display text-xs px-3.5 py-1">
            Tiến độ gây quỹ
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display font-bold text-3xl sm:text-4xl text-[var(--color-number)] leading-none">
              {received.toLocaleString('vi-VN')}
            </span>
            <span className="text-xl font-bold text-[var(--color-number)] font-display">đ</span>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--kv-text-soft)] font-medium">Ngân sách dự kiến</span>
            <span className="text-[11px] text-[var(--kv-orange-fg)] bg-[var(--kv-orange-bg)] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
              Đóng theo thời hạn
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 text-[var(--kv-ink)]">
            <span className="font-display font-bold text-3xl sm:text-4xl leading-none">
              {target.toLocaleString('vi-VN')}
            </span>
            <span className="text-xl font-bold font-display">đ</span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Crayon Token styling) */}
      <div className="w-full bg-[var(--color-progress-track)] h-4 rounded-full overflow-hidden p-0.5 mb-2">
        <div
          className="bg-[var(--color-progress-fill)] h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(4, percentage)}%` }}
        />
      </div>
      <p className="text-[11px] text-[var(--kv-text-soft)] text-center sm:text-left italic mb-6">
        * Tiến độ đo lường so với ngân sách dự kiến ({target.toLocaleString('vi-VN')}đ). Chiến dịch đóng theo thời hạn tổ chức workshop.
      </p>

      {/* 4 Chỉ số quỹ màu sắc sáp crayon hạt cườm */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[var(--color-border)]/60">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)]/40 hover:scale-[1.02] transition-transform">
          <div className="w-10 h-10 rounded-2xl bg-[var(--kv-orange-bg)] flex items-center justify-center text-[var(--kv-orange-fg)] shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--kv-text-soft)] font-medium">So Với Dự Kiến</div>
            <div className="font-display font-bold text-base text-[var(--kv-ink)]">{percentage}%</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)]/40 hover:scale-[1.02] transition-transform">
          <div className="w-10 h-10 rounded-2xl bg-[var(--kv-blue-bg)] flex items-center justify-center text-[var(--kv-blue-fg)] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--kv-text-soft)] font-medium">Lượt Ủng Hộ</div>
            <div className="font-display font-bold text-base text-[var(--kv-ink)]">{summary.donation_count} lượt</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)]/40 hover:scale-[1.02] transition-transform">
          <div className="w-10 h-10 rounded-2xl bg-[var(--kv-pink-bg)] flex items-center justify-center text-[var(--kv-pink-fg)] shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--kv-text-soft)] font-medium">Tổng Đã Chi</div>
            <div className="font-display font-bold text-base text-[var(--kv-ink)]">{spent.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)]/40 hover:scale-[1.02] transition-transform">
          <div className="w-10 h-10 rounded-2xl bg-[var(--kv-green-bg)] flex items-center justify-center text-[var(--kv-green-fg)] shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--kv-text-soft)] font-medium">Số Dư Quỹ</div>
            <div className="font-display font-bold text-base text-[var(--kv-green-fg)]">{balance.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>
      </div>
    </div>
  );
};
