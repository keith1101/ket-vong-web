import React, { useState, useEffect } from 'react';
import { adminGetReports } from '../../api';
import type { DailyReport } from '../../types';
import { Plus, FileText, Calendar, DollarSign, Image } from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [invoiceImages, setInvoiceImages] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await adminGetReports();
      setReports(data);
    } catch (err) {
      console.error('Lỗi tải báo cáo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);

    try {
      const imagesArray = invoiceImages
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(editingId ? `/api/v1/admin/reports/${editingId}` : '/api/v1/admin/reports', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_date: reportDate,
          title,
          content_markdown: contentMarkdown,
          total_income: Number(totalIncome),
          total_expense: Number(totalExpense),
          invoice_images: imagesArray.length > 0 ? imagesArray : null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || 'Không thể đăng báo cáo');
      }

      setSuccessMsg('Đã đăng báo cáo thành công!');
      setTitle('');
      setContentMarkdown('');
      setTotalIncome(0);
      setTotalExpense(0);
      setInvoiceImages('');
      setEditingId(null);
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Lỗi đăng báo cáo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-2xl text-brand-text">
          Quản Lý Báo Cáo Thu / Chi Hàng Ngày (SRS-063)
        </h2>
        <p className="text-xs text-brand-textMuted mt-1">
          Đăng bài báo cáo tài chính hàng ngày bằng Markdown để hiển thị công khai trên trang minh bạch.
        </p>
      </div>

      {/* Form tạo báo cáo mới */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-sm">
        <h3 className="font-display font-bold text-lg text-brand-text mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-brand-orange" />
          {editingId ? 'Chỉnh sửa báo cáo' : 'Soạn báo cáo mới'}
        </h3>

        {successMsg && (
          <div className="p-3 bg-green-50 text-green-700 text-xs font-bold rounded-xl mb-4">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Ngày báo cáo (YYYY-MM-DD):
              </label>
              <input
                type="date"
                required
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Tổng thu trong ngày (VNĐ):
              </label>
              <input
                type="number"
                min="0"
                value={totalIncome}
                onChange={(e) => setTotalIncome(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Tổng chi trong ngày (VNĐ):
              </label>
              <input
                type="number"
                min="0"
                value={totalExpense}
                onChange={(e) => setTotalExpense(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1">
              Tiêu đề bài báo cáo:
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Báo cáo thu chi ngày đầu tiên - Mua nguyên vật liệu làm vòng tay"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1">
              Nội dung chi tiết (Định dạng Markdown):
            </label>
            <textarea
              rows={6}
              required
              placeholder="### Các khoản chi trong ngày:&#10;- Mua dây cước và hạt cườm: 120.000đ&#10;- In ấn poster giới thiệu workshop: 80.000đ&#10;..."
              value={contentMarkdown}
              onChange={(e) => setContentMarkdown(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1">
              Link ảnh hóa đơn / chứng từ (mỗi link một dòng):
            </label>
            <textarea
              rows={2}
              placeholder="https://example.com/hoa-don-1.jpg&#10;https://example.com/hoa-don-2.jpg"
              value={invoiceImages}
              onChange={(e) => setInvoiceImages(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orangeHover text-white text-xs font-bold transition-colors min-h-touch"
          >
            {submitting ? 'Đang đăng...' : 'Đăng Báo Cáo Ngay'}
          </button>
        </form>
      </div>

      {/* Danh sách các báo cáo đã đăng */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-sm">
        <h3 className="font-display font-bold text-lg text-brand-text mb-4">
          Báo Cáo Đã Đăng ({reports.length})
        </h3>

        {loading ? (
          <div className="text-center py-8 text-sm text-brand-textMuted">Đang tải...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-sm text-brand-textMuted">Chưa có bài báo cáo nào.</div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="p-4 bg-brand-bg rounded-2xl border border-brand-border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-brand-orange bg-brand-accent px-2 py-0.5 rounded-full">
                      Ngày {r.report_date}
                    </span>
                    <h4 className="font-bold text-sm text-brand-text mt-1">{r.title}</h4>
                  </div>
                  <div className="text-xs font-semibold text-right">
                    <div className="text-green-600">Thu: +{r.total_income.toLocaleString('vi-VN')} đ</div>
                    <div className="text-red-600">Chi: -{r.total_expense.toLocaleString('vi-VN')} đ</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(r.id); setReportDate(r.report_date); setTitle(r.title); setContentMarkdown(r.content_markdown);
                    setTotalIncome(r.total_income); setTotalExpense(r.total_expense);
                    setInvoiceImages(r.invoice_images ? JSON.parse(r.invoice_images).join('\n') : '');
                  }}
                  className="mt-3 text-xs font-bold text-brand-orange hover:underline"
                >
                  Sửa báo cáo
                </button>
                <p className="text-xs text-brand-textMuted line-clamp-2">{r.content_markdown}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

