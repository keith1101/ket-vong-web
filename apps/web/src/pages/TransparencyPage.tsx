import React, { useState, useEffect } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { fetchFundSummary, fetchPublicDonations } from '../api';
import type { FundSummary, PublicDonationItem } from '../types';
import {
  fetchSheetLedger,
  getGoogleSheetCsvUrl,
  type SheetLedgerData,
  type SheetExpenseItem,
} from '../services/google-sheets';
import {
  ShieldCheck,
  Heart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  MessageSquare,
  Search,
  ExternalLink,
  Download,
  RefreshCw,
  Table as TableIcon,
  LayoutGrid,
  CheckCircle2,
  Wallet,
  Coins,
  TrendingDown,
  Sparkles,
} from 'lucide-react';

export const TransparencyPage: React.FC = () => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'donations' | 'sheet'>('donations');

  // Tab 1: Donations state
  const [donations, setDonations] = useState<PublicDonationItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingDonations, setLoadingDonations] = useState(true);

  // Tab 2: Google Sheets Ledger state
  const [sheetData, setSheetData] = useState<SheetLedgerData | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(true);
  const [refreshingSheet, setRefreshingSheet] = useState(false);
  const [viewMode, setViewMode] = useState<'crayon' | 'embed'>('crayon');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchFundSummary()
      .then((data) => {
        setSummary(data);
        // Tải trước dữ liệu sổ quỹ Google Sheets
        fetchSheetLedger(data.google_sheet_url)
          .then(setSheetData)
          .catch(console.error)
          .finally(() => setLoadingSheet(false));
      })
      .catch((err) => {
        console.error('Lỗi tải thông tin quỹ:', err);
        // Fallback tải sheet mặc định
        fetchSheetLedger()
          .then(setSheetData)
          .catch(console.error)
          .finally(() => setLoadingSheet(false));
      });
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
    }
  }, [activeTab, currentPage]);

  const handleRefreshSheet = async () => {
    setRefreshingSheet(true);
    try {
      const refreshed = await fetchSheetLedger(summary?.google_sheet_url, true);
      setSheetData(refreshed);
    } catch (err) {
      console.error('Lỗi khi làm mới sổ quỹ:', err);
    } finally {
      setRefreshingSheet(false);
    }
  };

  // Lọc dữ liệu bảng tính
  const filteredItems: SheetExpenseItem[] = (sheetData?.items || []).filter((item) => {
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchSearch =
      !query ||
      item.item.toLowerCase().includes(query) ||
      item.note.toLowerCase().includes(query) ||
      item.paymentMethod.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    return matchCategory && matchSearch;
  });

  const totalFilteredExpense = filteredItems.reduce((sum, it) => sum + it.amount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8 space-y-2">
        <div className="kv-pill bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 font-display mb-1">
          <ShieldCheck className="w-4 h-4 text-[var(--kv-ink)]" />
          <span>Minh Bạch 100% Thu &amp; Chi</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[var(--kv-ink)]">
          Nhật Ký Minh Bạch Quỹ
        </h1>
        <p className="text-sm sm:text-base text-[var(--kv-text-soft)] max-w-xl mx-auto font-body text-center">
          Mọi khoản đóng góp qua cổng và chi tiêu thực tế đều được hệ thống tự động ghi nhận và công khai minh bạch.
        </p>
      </div>

      {/* 4 Chỉ số quỹ & tiến độ */}
      <ProgressBar summary={summary} />

      {/* Tabs chuyển đổi: Chỉ Tab 1 và Tab 2 */}
      <div className="flex border-b border-[var(--color-border)] mb-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setActiveTab('donations');
            setCurrentPage(1);
          }}
          className={`px-4 sm:px-6 py-3 font-display font-bold text-sm sm:text-base whitespace-nowrap transition-colors border-b-2 min-h-touch flex items-center gap-2 ${
            activeTab === 'donations'
              ? 'border-[var(--kv-pink)] text-[var(--kv-pink)]'
              : 'border-transparent text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)]'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Khoản Ủng Hộ Đã Nhận ({summary?.donation_count || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('sheet')}
          className={`px-4 sm:px-6 py-3 font-display font-bold text-sm sm:text-base whitespace-nowrap transition-colors border-b-2 min-h-touch flex items-center gap-2 ${
            activeTab === 'sheet'
              ? 'border-[var(--kv-green)] text-[var(--kv-green)]'
              : 'border-transparent text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Sổ Quỹ Thu Chi (Google Sheets)</span>
        </button>
      </div>

      {/* TAB 1: Danh sách đóng góp (Từ cổng PayOS) */}
      {activeTab === 'donations' && (
        <div>
          {loadingDonations ? (
            <div className="text-center py-12 text-sm text-[var(--kv-text-soft)]">Đang tải danh sách...</div>
          ) : donations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[var(--color-border)]">
              <Heart className="w-12 h-12 text-[var(--kv-pink)]/40 mx-auto mb-3" />
              <p className="font-bold text-[var(--kv-ink)] font-display">Chưa có khoản quyên góp nào được duyệt.</p>
              <p className="text-xs text-[var(--kv-text-soft)] mt-1 font-body">Hãy là người đầu tiên chung tay cùng workshop!</p>
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
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--color-border-strong)] transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base text-[var(--kv-ink)]">
                          {item.display_name}
                        </span>
                        {item.display_name === 'Ẩn danh' && (
                          <span className="text-[10px] font-semibold bg-[var(--kv-paper-deep)] text-[var(--kv-text-soft)] px-2 py-0.5 rounded-full font-display">
                            Ẩn danh
                          </span>
                        )}
                      </div>

                      {item.public_message && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] rounded-xl border border-[var(--kv-pink-fg)]/20 text-xs italic font-body">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--kv-pink)]" />
                          <span>&quot;{item.public_message}&quot;</span>
                        </div>
                      )}

                      <div className="text-[11px] text-[var(--kv-text-soft)] flex items-center gap-1 font-body">
                        <Calendar className="w-3.5 h-3.5 text-[var(--kv-ink)]" />
                        <span>{date}</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="font-display font-extrabold text-xl text-[var(--color-number)]">
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
                    className="p-2 rounded-xl border border-[var(--color-border-strong)] bg-white disabled:opacity-40 min-h-touch min-w-touch flex items-center justify-center hover:bg-[var(--kv-blue-bg)] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-[var(--kv-ink)]" />
                  </button>
                  <span className="text-xs font-semibold px-4 text-[var(--kv-text-soft)] font-display">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-xl border border-[var(--color-border-strong)] bg-white disabled:opacity-40 min-h-touch min-w-touch flex items-center justify-center hover:bg-[var(--kv-blue-bg)] transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-[var(--kv-ink)]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Sổ Quỹ Thu Chi (Liên kết Google Sheets) */}
      {activeTab === 'sheet' && (
        <div className="space-y-6">
          {/* Thanh tiêu đề liên kết Google Sheets */}
          <div className="bg-[#107c41] text-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display font-extrabold text-lg sm:text-xl tracking-tight">
                    {sheetData?.title || 'Sổ Quỹ Thu Chi Chi Tiết'}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    Live Google Sheets
                  </span>
                </div>
                <p className="text-xs text-white/80 mt-1 font-body">
                  Bảng kê khai minh bạch từng hóa đơn, khoản mục mua sắm và chi phí vận hành workshop.
                </p>
              </div>
            </div>

            {/* Các nút thao tác với Google Sheets */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={handleRefreshSheet}
                disabled={refreshingSheet}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Đồng bộ lại dữ liệu mới nhất từ Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingSheet ? 'animate-spin' : ''}`} />
                <span>{refreshingSheet ? 'Đang tải...' : 'Làm mới'}</span>
              </button>

              {sheetData?.sheetUrl && (
                <a
                  href={sheetData.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white text-[#107c41] hover:bg-emerald-50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Google Sheets</span>
                </a>
              )}

              {sheetData?.sheetUrl && (
                <a
                  href={getGoogleSheetCsvUrl(sheetData.sheetUrl)}
                  download="KetVong_ThuChi.csv"
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Tải file CSV dữ liệu"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CSV</span>
                </a>
              )}
            </div>
          </div>

          {/* 4 Thẻ chỉ số lấy từ Google Sheets */}
          {sheetData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold text-[var(--kv-text-soft)] flex items-center gap-1 font-display">
                  <Coins className="w-3.5 h-3.5 text-[var(--kv-ink)]" /> Ngân Sách Dự Toán
                </span>
                <div className="font-display font-extrabold text-lg sm:text-xl text-[var(--kv-ink)]">
                  {sheetData.targetBudget.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold text-[var(--kv-text-soft)] flex items-center gap-1 font-display">
                  <TrendingDown className="w-3.5 h-3.5 text-[var(--kv-orange-fg)]" /> Đã Chi Thực Tế
                </span>
                <div className="font-display font-extrabold text-lg sm:text-xl text-[var(--color-number)]">
                  {sheetData.totalSpent.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold text-[var(--kv-text-soft)] flex items-center gap-1 font-display">
                  <Wallet className="w-3.5 h-3.5 text-[var(--kv-green-fg)]" /> Ngân Sách Còn Lại
                </span>
                <div className="font-display font-extrabold text-lg sm:text-xl text-[var(--kv-green-fg)]">
                  {sheetData.remainingBudget.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold text-[var(--kv-text-soft)] flex items-center gap-1 font-display">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--kv-purple-fg)]" /> Tỷ Lệ Sử Dụng
                </span>
                <div className="font-display font-extrabold text-lg sm:text-xl text-[var(--kv-purple-fg)]">
                  {sheetData.usageRate}
                </div>
              </div>
            </div>
          )}

          {/* Thanh công cụ tìm kiếm, lọc danh mục & chuyển chế độ xem */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Tìm kiếm */}
            <div className="relative grow max-w-md">
              <Search className="w-4 h-4 text-[var(--kv-text-soft)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên vật dụng, món đồ, nơi mua..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border-strong)] text-xs bg-[var(--kv-paper)] focus:outline-none focus:border-[var(--kv-ink)]"
              />
            </div>

            {/* Toggle chuyển đổi chế độ xem */}
            <div className="flex items-center gap-1.5 bg-[var(--kv-paper)] p-1 rounded-xl border border-[var(--color-border)] shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('crayon')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display transition-all flex items-center gap-1.5 ${
                  viewMode === 'crayon'
                    ? 'bg-white text-[var(--kv-ink)] shadow-xs'
                    : 'text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Bảng Giao Diện</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('embed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display transition-all flex items-center gap-1.5 ${
                  viewMode === 'embed'
                    ? 'bg-white text-[var(--kv-ink)] shadow-xs'
                    : 'text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Google Sheet Gốc</span>
              </button>
            </div>
          </div>

          {/* CHẾ ĐỘ 1: BẢNG GIAO DIỆN CRAYON (TABLE VIEW) */}
          {viewMode === 'crayon' && (
            <div className="space-y-4">
              {/* Bộ lọc danh mục */}
              {sheetData && sheetData.categories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap ${
                      selectedCategory === 'all'
                        ? 'bg-[var(--kv-ink)] text-white shadow-xs'
                        : 'bg-white text-[var(--kv-text-soft)] hover:bg-[var(--kv-paper)] border border-[var(--color-border)]'
                    }`}
                  >
                    Tất cả ({sheetData.items.length})
                  </button>
                  {sheetData.categories.map((cat) => {
                    const count = sheetData.items.filter((it) => it.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-[var(--kv-orange)] text-white shadow-xs'
                            : 'bg-white text-[var(--kv-text-soft)] hover:bg-[var(--kv-paper)] border border-[var(--color-border)]'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bảng dữ liệu trên Desktop */}
              <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--kv-paper)] text-[var(--kv-ink)] font-display text-[11px] font-bold border-b border-[var(--color-border)] select-none">
                        <th className="w-12 p-3 text-center border-r border-[var(--color-border)]">STT</th>
                        <th className="p-3 border-r border-[var(--color-border)] w-28">Ngày</th>
                        <th className="p-3 border-r border-[var(--color-border)] w-36">Phân Loại</th>
                        <th className="p-3 border-r border-[var(--color-border)]">Tên Món / Vật Phẩm</th>
                        <th className="p-3 text-right border-r border-[var(--color-border)] w-32">Số Tiền</th>
                        <th className="p-3 text-center border-r border-[var(--color-border)] w-32">Phương Thức</th>
                        <th className="p-3">Ghi Chú / Nơi Mua</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] font-body">
                      {loadingSheet ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-[var(--kv-text-soft)]">
                            Đang kết nối và đồng bộ dữ liệu từ Google Sheets...
                          </td>
                        </tr>
                      ) : filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-[var(--kv-text-soft)]">
                            Không tìm thấy khoản chi tiêu nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[var(--kv-paper)]/50 transition-colors group">
                            <td className="p-3 text-center font-mono font-bold text-[var(--kv-text-soft)] bg-[var(--kv-paper)]/30 border-r border-[var(--color-border)]">
                              {item.stt}
                            </td>
                            <td className="p-3 border-r border-[var(--color-border)] text-[var(--kv-text-soft)] whitespace-nowrap">
                              {item.date || '-'}
                            </td>
                            <td className="p-3 border-r border-[var(--color-border)] font-semibold text-[var(--kv-ink)] whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-lg bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-[11px] font-display">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-3 border-r border-[var(--color-border)] font-medium text-[var(--kv-text)]">
                              {item.item ? (
                                <span>{item.item}</span>
                              ) : (
                                <span className="text-[var(--kv-text-soft)] italic font-body">
                                  (Dự thảo khoản chi mục {item.category})
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-display font-extrabold text-sm text-[var(--color-number)] border-r border-[var(--color-border)] whitespace-nowrap">
                              {item.amount > 0 ? `${item.amount.toLocaleString('vi-VN')} đ` : '0 đ'}
                            </td>
                            <td className="p-3 text-center border-r border-[var(--color-border)] whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--kv-paper-deep)] text-[var(--kv-text-soft)] border border-[var(--color-border)]">
                                {item.paymentMethod || 'Chuyển khoản'}
                              </span>
                            </td>
                            <td className="p-3 text-[var(--kv-text-soft)] italic">
                              {item.note || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] font-bold border-t-2 border-[var(--kv-green)]">
                        <td colSpan={4} className="p-3.5 text-right font-display text-xs sm:text-sm">
                          TỔNG CỘNG CHI TIÊU ({filteredItems.length} MỤC):
                        </td>
                        <td className="p-3.5 text-right font-display font-extrabold text-sm sm:text-base border-r border-[var(--color-border)] whitespace-nowrap">
                          {totalFilteredExpense.toLocaleString('vi-VN')} đ
                        </td>
                        <td colSpan={2} className="p-3.5 text-xs font-body italic text-[var(--kv-green-fg)]/80">
                          * Tự động đồng bộ thời gian thực từ Google Sheets
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Ghi chú chân bảng */}
                <div className="p-4 sm:p-5 bg-[var(--kv-paper)] border-t border-[var(--color-border)] text-xs text-[var(--kv-text-soft)] space-y-1 font-body">
                  <p>
                    💛 <strong>Cam kết minh bạch:</strong> Mọi khoản chi mua sắm đều có hóa đơn, chứng từ đối soát. Toàn bộ kinh phí còn dư sau workshop sẽ được gửi tặng quỹ của cơ sở lưu trú Ba Thùy hỗ trợ sinh hoạt cho các em bệnh nhi.
                  </p>
                  <p>
                    📊 <strong>Nguồn dữ liệu:</strong> Dữ liệu trên bảng được cập nhật trực tiếp từ file Google Sheets của Ban tổ chức. Bạn có thể bấm nút <em>&quot;Mở Google Sheets&quot;</em> phía trên để đối chiếu.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CHẾ ĐỘ 2: NHÚNG GOOGLE SHEETS GỐC (EMBED VIEW) */}
          {viewMode === 'embed' && sheetData?.embedUrl && (
            <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-xs overflow-hidden space-y-3 p-3 sm:p-4">
              <div className="flex items-center justify-between px-2 pt-1 text-xs text-[var(--kv-text-soft)]">
                <span className="font-display font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đang hiển thị bản nhúng trực tiếp Google Sheets (Chỉ đọc)
                </span>
                <a
                  href={sheetData.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[var(--kv-pink)] hover:underline flex items-center gap-1"
                >
                  <span>Mở toàn màn hình</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-gray-50">
                <iframe
                  title="Sổ Quỹ Thu Chi Kết Vòng"
                  src={sheetData.embedUrl}
                  className="w-full h-[600px] sm:h-[750px] border-0"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
