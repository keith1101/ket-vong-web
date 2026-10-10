import React, { useState, useEffect } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { fetchFundSummary, fetchPublicDonations, fetchDailyReports } from '../api';
import type { FundSummary, PublicDonationItem, DailyReport } from '../types';
import { ShieldCheck, Heart, Calendar, FileText, ChevronLeft, ChevronRight, Image } from 'lucide-react';

export const TransparencyPage: React.FC = () => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'donations' | 'reports'>('donations');

  // Tab 1: Donations state (SRS-030)
  const [donations, setDonations] = useState<PublicDonationItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingDonations, setLoadingDonations] = useState(true);

  // Tab 2: Reports state (SRS-063)
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    fetchFundSummary().then(setSummary).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'donations') {
      setLoadingDonations(true);
      fetchPublicDonations(currentPage, 15)
        .then((res) => {
          setDonations(res.items);
          setTotalPages(res.pagination.total_pages);
        })
        .catch(console.error)
        .finally(() => setLoadingDonations(false));
    } else {
      setLoadingReports(true);
      fetchDailyReports()
        .then(setReports)
        .catch(console.error)
        .finally(() => setLoadingReports(false));
    }
  }, [activeTab, currentPage]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent text-brand-orange text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-4 h-4" />
          Minh Bạch 100% Thu &amp; Chi
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-text">
          Nhật Ký Minh Bạch Quỹ
        </h1>
        <p className="text-sm sm:text-base text-brand-textMuted max-w-xl mx-auto mt-2">
          Mọi khoản đóng góp và chi tiêu đều được hệ thống tự động ghi nhận và công khai minh bạch đến từng đồng.
        </p>
      </div>

      {/* 4 Chỉ số quỹ (SRS-031) */}
      <ProgressBar summary={summary} />

      {/* Tabs */}
      <div className="flex border-b border-brand-border mb-8">
        <button
          onClick={() => {
            setActiveTab('donations');
            setCurrentPage(1);
          }}
          className={`px-6 py-3 font-display font-bold text-base transition-colors border-b-2 min-h-touch ${
            activeTab === 'donations'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-brand-textMuted hover:text-brand-text'
          }`}
        >
          Khoản Ủng Hộ Đã Nhận ({summary?.donation_count || 0})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-3 font-display font-bold text-base transition-colors border-b-2 min-h-touch ${
            activeTab === 'reports'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-brand-textMuted hover:text-brand-text'
          }`}
        >
          Báo Cáo Thu / Chi Hàng Ngày ({reports.length})
        </button>
      </div>

      {/* TAB 1: Danh sách đóng góp (SRS-030, NFR-05) */}
      {activeTab === 'donations' && (
        <div>
          {loadingDonations ? (
            <div className="text-center py-12 text-sm text-brand-textMuted">Đang tải danh sách...</div>
          ) : donations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-brand-border">
              <Heart className="w-12 h-12 text-brand-orange/40 mx-auto mb-3" />
              <p className="font-bold text-brand-text">Chưa có khoản quyên góp nào được duyệt.</p>
              <p className="text-xs text-brand-textMuted mt-1">Hãy là người đầu tiên chung tay cùng workshop!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {donations.map((item, index) => {
                const date = new Date(item.approved_at).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={index}
                    className="p-4 sm:p-5 bg-white rounded-2xl border border-brand-border hover:border-brand-orange/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base sm:text-lg text-brand-text">
                          {item.display_name}
                        </span>
                        {item.display_name === 'Ẩn danh' && (
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            Ẩn danh
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-brand-textMuted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{date}</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="font-display font-extrabold text-xl text-brand-orange">
                        +{item.amount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-xl border border-brand-border bg-white disabled:opacity-40 min-h-touch min-w-touch flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-semibold px-4 text-brand-textMuted">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-xl border border-brand-border bg-white disabled:opacity-40 min-h-touch min-w-touch flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Báo cáo thu chi hàng ngày (SRS-063) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {loadingReports ? (
            <div className="text-center py-12 text-sm text-brand-textMuted">Đang tải báo cáo...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-brand-border">
              <FileText className="w-12 h-12 text-brand-orange/40 mx-auto mb-3" />
              <p className="font-bold text-brand-text">Chưa có báo cáo nào được đăng.</p>
              <p className="text-xs text-brand-textMuted mt-1">Ban tổ chức sẽ cập nhật báo cáo thu/chi sau mỗi ngày diễn ra hoạt động.</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border/60 pb-4 mb-4">
                  <div>
                    <span className="text-xs font-bold text-brand-orange bg-brand-accent px-2.5 py-1 rounded-full">
                      Ngày {report.report_date}
                    </span>
                    <h3 className="font-display font-bold text-xl text-brand-text mt-2">
                      {report.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="text-green-600">Thu: +{report.total_income.toLocaleString('vi-VN')} đ</span>
                    <span className="text-red-600">Chi: -{report.total_expense.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                {/* Markdown content */}
                <div className="prose prose-sm max-w-none text-brand-text leading-relaxed whitespace-pre-wrap">
                  {report.content_markdown}
                </div>

                {/* Hóa đơn nếu có */}
                {report.invoice_images && (
                  <div className="mt-4 pt-4 border-t border-brand-border/60">
                    <span className="text-xs font-bold text-brand-textMuted flex items-center gap-1 mb-2">
                      <Image className="w-4 h-4" /> Hóa đơn / Chứng từ đính kèm
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(report.invoice_images).map((imgUrl: string, idx: number) => (
                        <a
                          key={idx}
                          href={imgUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-brand-accent text-brand-orange text-xs font-semibold hover:underline"
                        >
                          Xem chứng từ {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

