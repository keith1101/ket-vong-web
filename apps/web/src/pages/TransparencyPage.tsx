import React, { useState, useEffect } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { fetchFundSummary, fetchPublicDonations, fetchDailyReports } from '../api';
import type { FundSummary, PublicDonationItem, DailyReport } from '../types';
import { 
  ShieldCheck, 
  Heart, 
  Calendar, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Image,
  FileSpreadsheet,
  MessageSquare,
  CheckCircle2,
  Table
} from 'lucide-react';

interface LedgerRow {
  id: number;
  category: 'materials' | 'essentials' | 'setup' | 'printing' | 'logistics';
  categoryLabel: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  statusLabel: string;
  note: string;
}

const LEDGER_DATA: LedgerRow[] = [
  { id: 1, category: 'materials', categoryLabel: '1. Vật tư hoạt động', name: 'Cuộn cước co giãn chuyên dụng 0.7mm', unit: 'Cuộn', quantity: 10, unitPrice: 25000, total: 250000, statusLabel: 'Đã khảo sát giá', note: 'Chợ Đại Quang Minh' },
  { id: 2, category: 'materials', categoryLabel: '1. Vật tư hoạt động', name: 'Hạt cườm pastel & hạt chữ cái an toàn', unit: 'Kg', quantity: 1.5, unitPrice: 350000, total: 525000, statusLabel: 'Đã khảo sát giá', note: 'Phụ liệu hạt Chợ Lớn' },
  { id: 3, category: 'materials', categoryLabel: '1. Vật tư hoạt động', name: 'Charm kim loại tráng men đa dạng hình', unit: 'Cái', quantity: 50, unitPrice: 5000, total: 250000, statusLabel: 'Đã khảo sát giá', note: 'Shopee Mall phụ kiện' },
  { id: 4, category: 'materials', categoryLabel: '1. Vật tư hoạt động', name: 'Hộp giấy kraft & bao bì làm vòng tay', unit: 'Bộ', quantity: 25, unitPrice: 7000, total: 175000, statusLabel: 'Đã khảo sát giá', note: 'Bao bì Sài Gòn' },
  { id: 5, category: 'materials', categoryLabel: '1. Vật tư hoạt động', name: 'Giấy A5, bút màu sáp, sticker trang trí', unit: 'Gói', quantity: 1, unitPrice: 100000, total: 100000, statusLabel: 'Đã khảo sát giá', note: 'Nhà sách Fahasa' },

  { id: 6, category: 'essentials', categoryLabel: '2. Vật phẩm thiết yếu', name: 'Sữa tươi dinh dưỡng tiệt trùng đóng hộp', unit: 'Thùng', quantity: 2, unitPrice: 380000, total: 760000, statusLabel: 'Đã khảo sát giá', note: 'Vinamilk / Co.opmart' },
  { id: 7, category: 'essentials', categoryLabel: '2. Vật phẩm thiết yếu', name: 'Bánh kẹo dinh dưỡng mềm an toàn', unit: 'Phần', quantity: 30, unitPrice: 14000, total: 420000, statusLabel: 'Đã khảo sát giá', note: 'Co.opmart' },
  { id: 8, category: 'essentials', categoryLabel: '2. Vật phẩm thiết yếu', name: 'Khăn giấy ướt không cồn & nước rửa tay khô', unit: 'Bộ', quantity: 1, unitPrice: 120000, total: 120000, statusLabel: 'Đã khảo sát giá', note: 'Nhà thuốc Long Châu' },

  { id: 9, category: 'setup', categoryLabel: '3. Setup & trang trí', name: 'Backdrop sân khấu bạt Hiflex 3m x 2m', unit: 'Tấm', quantity: 1, unitPrice: 350000, total: 350000, statusLabel: 'Đã khảo sát giá', note: 'Nhà in quảng cáo' },
  { id: 10, category: 'setup', categoryLabel: '3. Setup & trang trí', name: 'Standee chữ X và bảng tên đón tiếp', unit: 'Bộ', quantity: 2, unitPrice: 100000, total: 200000, statusLabel: 'Đã khảo sát giá', note: 'Nhà in quảng cáo' },
  { id: 11, category: 'setup', categoryLabel: '3. Setup & trang trí', name: 'Khăn trải bàn & khay nhựa chia ngăn cườm', unit: 'Bộ', quantity: 1, unitPrice: 150000, total: 150000, statusLabel: 'Đã khảo sát giá', note: 'Cửa hàng gia dụng' },

  { id: 12, category: 'printing', categoryLabel: '4. In ấn & truyền thông', name: 'Thiệp mời trao tay và thiệp chúc viết tay', unit: 'Cái', quantity: 30, unitPrice: 5000, total: 150000, statusLabel: 'Đã khảo sát giá', note: 'Nhà in kỹ thuật số' },
  { id: 13, category: 'printing', categoryLabel: '4. In ấn & truyền thông', name: 'Bảng infographic các bước xâu vòng A3', unit: 'Tấm', quantity: 5, unitPrice: 30000, total: 150000, statusLabel: 'Đã khảo sát giá', note: 'Nhà in kỹ thuật số' },
  { id: 14, category: 'printing', categoryLabel: '4. In ấn & truyền thông', name: 'Bảng tên BTC, tình nguyện viên & sticker', unit: 'Trọn gói', quantity: 1, unitPrice: 200000, total: 200000, statusLabel: 'Đã khảo sát giá', note: 'Xưởng in ấn FPTU' },

  { id: 15, category: 'logistics', categoryLabel: '5. Vận chuyển & dự phòng', name: 'Chi phí vận chuyển vật tư & thiết bị', unit: 'Chuyến', quantity: 2, unitPrice: 100000, total: 200000, statusLabel: 'Đã dự toán', note: 'Giao hàng công nghệ' },
  { id: 16, category: 'logistics', categoryLabel: '5. Vận chuyển & dự phòng', name: 'Dự phòng phát sinh thực tế', unit: 'Khoản', quantity: 1, unitPrice: 100000, total: 100000, statusLabel: 'Đã dự toán', note: 'Quỹ dự phòng' },
];

// Đặt SHOW_EXCEL_SHEET = true khi sẵn sàng tích hợp chính thức
const SHOW_EXCEL_SHEET = false;

export const TransparencyPage: React.FC = () => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'donations' | 'reports' | 'sheet'>('donations');
  const [sheetCategoryFilter, setSheetCategoryFilter] = useState<string>('all');

  // Tab 1: Donations state
  const [donations, setDonations] = useState<PublicDonationItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingDonations, setLoadingDonations] = useState(true);

  // Tab 2: Reports state
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
    } else if (activeTab === 'reports') {
      setLoadingReports(true);
      fetchDailyReports()
        .then(setReports)
        .catch(console.error)
        .finally(() => setLoadingReports(false));
    }
  }, [activeTab, currentPage]);

  const filteredLedger = sheetCategoryFilter === 'all' 
    ? LEDGER_DATA 
    : LEDGER_DATA.filter((row) => row.category === sheetCategoryFilter);

  const totalFilteredBudget = filteredLedger.reduce((acc, row) => acc + row.total, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="text-center mb-8 space-y-2">
        <div className="kv-pill bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 font-display mb-1">
          <ShieldCheck className="w-4 h-4 text-[var(--kv-ink)]" />
          <span>Minh Bạch 100% Thu &amp; Chi</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[var(--kv-ink)]">
          Nhật Ký Minh Bạch Quỹ
        </h1>
        <p className="text-sm sm:text-base text-[var(--kv-text-soft)] max-w-xl mx-auto font-body text-center">
          Mọi khoản đóng góp và chi tiêu đều được hệ thống tự động ghi nhận và công khai minh bạch đến từng đồng.
        </p>
      </div>

      {/* 4 Chỉ số quỹ & tiến độ */}
      <ProgressBar summary={summary} />

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] mb-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setActiveTab('donations');
            setCurrentPage(1);
          }}
          className={`px-4 sm:px-6 py-3 font-display font-bold text-sm sm:text-base whitespace-nowrap transition-colors border-b-2 min-h-touch ${
            activeTab === 'donations'
              ? 'border-[var(--kv-pink)] text-[var(--kv-pink)]'
              : 'border-transparent text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)]'
          }`}
        >
          Khoản Ủng Hộ Đã Nhận ({summary?.donation_count || 0})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 sm:px-6 py-3 font-display font-bold text-sm sm:text-base whitespace-nowrap transition-colors border-b-2 min-h-touch ${
            activeTab === 'reports'
              ? 'border-[var(--kv-pink)] text-[var(--kv-pink)]'
              : 'border-transparent text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)]'
          }`}
        >
          Báo Cáo Thu / Chi Hàng Ngày ({reports.length})
        </button>
        {SHOW_EXCEL_SHEET && (
          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-4 sm:px-6 py-3 font-display font-bold text-sm sm:text-base whitespace-nowrap transition-colors border-b-2 min-h-touch flex items-center gap-1.5 ${
              activeTab === 'sheet'
                ? 'border-[var(--kv-green)] text-[var(--kv-green)]'
                : 'border-transparent text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bảng Kê Thu Chi (Excel)</span>
          </button>
        )}
      </div>

      {/* TAB 1: Danh sách đóng góp */}
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
                    className="p-4 sm:p-5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--kv-ink)]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base sm:text-lg text-[var(--kv-ink)]">
                          {item.display_name}
                        </span>
                        {item.display_name === 'Ẩn danh' && (
                          <span className="text-[10px] font-semibold bg-[var(--kv-paper-deep)] text-[var(--kv-text-soft)] px-2 py-0.5 rounded-full font-display">
                            Ẩn danh
                          </span>
                        )}
                      </div>

                      {/* Hiển thị lời nhắn của người ủng hộ */}
                      {item.public_message && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] rounded-xl border border-[var(--kv-pink-fg)]/20 text-xs italic font-body">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--kv-pink)]" />
                          <span>"{item.public_message}"</span>
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

      {/* TAB 2: Báo cáo thu chi hàng ngày */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {loadingReports ? (
            <div className="text-center py-12 text-sm text-[var(--kv-text-soft)]">Đang tải báo cáo...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[var(--color-border)]">
              <FileText className="w-12 h-12 text-[var(--kv-pink)]/40 mx-auto mb-3" />
              <p className="font-bold text-[var(--kv-ink)] font-display">Chưa có báo cáo nào được đăng.</p>
              <p className="text-xs text-[var(--kv-text-soft)] mt-1 font-body">Ban tổ chức sẽ cập nhật báo cáo thu/chi sau mỗi ngày diễn ra hoạt động.</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="bg-[var(--color-surface)] rounded-3xl p-6 sm:p-8 border border-[var(--color-border)] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)]/60 pb-4 mb-4">
                  <div>
                    <span className="text-xs font-bold text-[var(--kv-orange-fg)] bg-[var(--kv-orange-bg)] px-2.5 py-1 rounded-full font-display">
                      Ngày {report.report_date}
                    </span>
                    <h3 className="font-display font-bold text-xl text-[var(--kv-ink)] mt-2">
                      {report.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold font-display">
                    <span className="text-[var(--kv-green-fg)]">Thu: +{report.total_income.toLocaleString('vi-VN')} đ</span>
                    <span className="text-[var(--kv-red)]">Chi: -{report.total_expense.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                {/* Markdown content */}
                <div className="prose prose-sm max-w-none text-[var(--kv-text)] leading-relaxed whitespace-pre-wrap font-body">
                  {report.content_markdown}
                </div>

                {/* Hóa đơn nếu có */}
                {report.invoice_images && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)]/60">
                    <span className="text-xs font-bold text-[var(--kv-text-soft)] flex items-center gap-1 mb-2 font-display">
                      <Image className="w-4 h-4 text-[var(--kv-ink)]" /> Hóa đơn / Chứng từ đính kèm
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(report.invoice_images).map((imgUrl: string, idx: number) => (
                        <a
                          key={idx}
                          href={imgUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-xs font-semibold hover:underline font-display"
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

      {/* TAB 3: Bảng kê chi tiết thu chi mô phỏng Excel (Ẩn để tích hợp sau) */}
      {SHOW_EXCEL_SHEET && activeTab === 'sheet' && (
        <div className="space-y-6">
          {/* Thanh công cụ mô phỏng Excel */}
          <div className="bg-[#107c41] text-white rounded-t-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-extrabold text-base sm:text-lg">
                    KetVong_KeHoachThuChi_2026.xlsx
                  </h3>
                  <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-semibold">
                    Chỉ đọc
                  </span>
                </div>
                <p className="text-xs text-white/80 font-body">
                  Bảng tính kế hoạch ngân sách dự toán &amp; thực tế chiến dịch Kết Vòng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                Đồng bộ ngân sách 4.000.000đ
              </span>
            </div>
          </div>

          {/* Thanh công thức Excel & Bộ lọc danh mục */}
          <div className="bg-[var(--kv-paper-deep)] p-3.5 border-x border-b border-[var(--color-border)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--kv-text-soft)] bg-white px-3 py-1.5 rounded-xl border border-[var(--color-border)] grow max-w-md">
              <span className="font-bold text-[var(--kv-ink)]">fx</span>
              <span className="text-[var(--color-border-strong)]">|</span>
              <span className="text-[var(--kv-ink)]">=SUM(G2:G17) [Ngân sách dự toán: 4.000.000đ]</span>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              <button
                onClick={() => setSheetCategoryFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-display transition-all ${
                  sheetCategoryFilter === 'all'
                    ? 'bg-[var(--kv-ink)] text-white shadow-xs'
                    : 'bg-white text-[var(--kv-text-soft)] hover:bg-[var(--kv-paper)] border border-[var(--color-border)]'
                }`}
              >
                Tất cả (16)
              </button>
              <button
                onClick={() => setSheetCategoryFilter('materials')}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap ${
                  sheetCategoryFilter === 'materials'
                    ? 'bg-[var(--kv-orange)] text-white shadow-xs'
                    : 'bg-white text-[var(--kv-text-soft)] hover:bg-[var(--kv-paper)] border border-[var(--color-border)]'
                }`}
              >
                1. Vật tư (5)
              </button>
              <button
                onClick={() => setSheetCategoryFilter('essentials')}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap ${
                  sheetCategoryFilter === 'essentials'
                    ? 'bg-[var(--kv-pink)] text-white shadow-xs'
                    : 'bg-white text-[var(--kv-text-soft)] hover:bg-[var(--kv-paper)] border border-[var(--color-border)]'
                }`}
              >
                2. Thiết yếu (3)
              </button>
              <button
                onClick={() => setSheetCategoryFilter('setup')}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap ${
                  sheetCategoryFilter === 'setup'
                    ? 'bg-[var(--kv-ink)] text-white shadow-xs'
                    : 'bg-white text-[var(--kv-text-soft)] hover:bg-[var(--kv-paper)] border border-[var(--color-border)]'
                }`}
              >
                3. Setup (3)
              </button>
              <button
                onClick={() => setSheetCategoryFilter('printing')}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap ${
                  sheetCategoryFilter === 'printing'
                    ? 'bg-[var(--kv-green)] text-white shadow-xs'
                    : 'bg-white text-[var(--kv-text-soft)] hover:bg-[var(--kv-paper)] border border-[var(--color-border)]'
                }`}
              >
                4. In ấn (3)
              </button>
              <button
                onClick={() => setSheetCategoryFilter('logistics')}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap ${
                  sheetCategoryFilter === 'logistics'
                    ? 'bg-[var(--kv-blue-fg)] text-white shadow-xs'
                    : 'bg-white text-[var(--kv-text-soft)] hover:bg-[var(--kv-paper)] border border-[var(--color-border)]'
                }`}
              >
                5. Vận chuyển &amp; DP (2)
              </button>
            </div>
          </div>

          {/* Bảng tính Excel Sheet */}
          <div className="bg-white rounded-b-3xl border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  {/* Excel Column Letters: A, B, C, D, E, F, G, H, I */}
                  <tr className="bg-[#f3f2f1] text-[var(--kv-text-soft)] font-mono text-[10px] border-b border-[var(--color-border)] select-none">
                    <th className="w-10 p-2 text-center border-r border-[var(--color-border)]">#</th>
                    <th className="p-2 border-r border-[var(--color-border)]">A (Phân loại)</th>
                    <th className="p-2 border-r border-[var(--color-border)]">B (Tên vật phẩm / Hàng hóa)</th>
                    <th className="p-2 text-center border-r border-[var(--color-border)]">C (ĐVT)</th>
                    <th className="p-2 text-right border-r border-[var(--color-border)]">D (Số lượng)</th>
                    <th className="p-2 text-right border-r border-[var(--color-border)]">E (Đơn giá)</th>
                    <th className="p-2 text-right border-r border-[var(--color-border)]">F (Thành tiền)</th>
                    <th className="p-2 border-r border-[var(--color-border)]">G (Trạng thái)</th>
                    <th className="p-2">H (Ghi chú / Nơi mua)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] font-body">
                  {filteredLedger.map((row, index) => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-[#f8f9fa] transition-colors group"
                    >
                      <td className="p-2.5 text-center font-mono text-[11px] text-[var(--kv-text-soft)] bg-[#fbfbfb] border-r border-[var(--color-border)] select-none">
                        {index + 1}
                      </td>
                      <td className="p-2.5 border-r border-[var(--color-border)] font-semibold text-[var(--kv-ink)] whitespace-nowrap">
                        {row.categoryLabel}
                      </td>
                      <td className="p-2.5 border-r border-[var(--color-border)] font-medium text-[var(--kv-text)]">
                        {row.name}
                      </td>
                      <td className="p-2.5 text-center border-r border-[var(--color-border)] text-[var(--kv-text-soft)]">
                        {row.unit}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-[var(--color-border)]">
                        {row.quantity}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-[var(--color-border)] text-[var(--kv-text-soft)]">
                        {row.unitPrice.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-[var(--color-number)] border-r border-[var(--color-border)]">
                        {row.total.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-2.5 border-r border-[var(--color-border)] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="p-2.5 text-[var(--kv-text-soft)] italic">
                        {row.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f0f9f3] font-bold border-t-2 border-[#107c41] text-[var(--kv-ink)]">
                    <td colSpan={6} className="p-3 text-right font-display text-sm">
                      TỔNG CỘNG DỰ TOÁN ({filteredLedger.length} MỤC):
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-sm sm:text-base text-[var(--kv-green)] border-r border-[var(--color-border)]">
                      {totalFilteredBudget.toLocaleString('vi-VN')} đ
                    </td>
                    <td colSpan={2} className="p-3 text-xs text-[var(--kv-text-soft)] italic font-body">
                      * Ngân sách chuẩn toàn dự án: 4.000.000đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Chú thích phía dưới bảng tính */}
            <div className="p-4 sm:p-5 bg-[var(--kv-paper)] border-t border-[var(--color-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--kv-text-soft)]">
              <div className="space-y-1 font-body">
                <p>
                  💛 <strong>Ghi chú cam kết:</strong> Toàn bộ kinh phí còn dư sau chương trình sẽ được gửi tặng quỹ của cơ sở lưu trú Ba Thùy, nhằm tiếp tục hỗ trợ các em nhỏ trong quá trình điều trị và sinh hoạt sau này.
                </p>
                <p>
                  🧾 <strong>Chứng từ thực tế:</strong> Các hóa đơn đỏ, phiếu thu và hình ảnh chứng từ thực tế sau khi mua sắm sẽ được tải lên công khai tại tab <em>"Báo Cáo Thu / Chi Hàng Ngày"</em>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
