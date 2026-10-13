import React, { useState, useEffect } from 'react';
import { adminGetDonations, adminApproveDonation, adminEraseDonorData, adminDeleteDonation } from '../../api';
import type { Donation } from '../../types';
import { Search, Filter, AlertCircle, Trash2, CheckCircle2, Clock, XCircle, UserX, AlertTriangle } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Donation | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const loadData = async () => {
    setLoading(true);
    try {
      const donationsRes = await adminGetDonations({ status: statusFilter || undefined, search: searchTerm || undefined, limit: 100 });
      setDonations(donationsRes.items);
    } catch (err) {
      console.error('Lỗi tải dữ liệu admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (!deleteTarget) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) setDeleteTarget(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [deleteTarget, deleting]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleEraseDonorData = async (id: string, code: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa dữ liệu cá nhân của người ủng hộ cho mã ${code} theo yêu cầu (Nghị định 13/2023)? Hành động này sẽ chuyển tên thành "Ẩn danh" và xóa SĐT/Email.`)) {
      try {
        await adminEraseDonorData(id);
        alert('Đã xóa dữ liệu cá nhân thành công.');
        loadData();
      } catch (err: any) {
        alert(err.message || 'Lỗi khi xóa dữ liệu');
      }
    }
  };

  const handleApproveDonation = async (donation: Donation) => {
    if (!confirm(`Duyệt khoản ủng hộ ${donation.code} với số tiền ${(donation.actual_amount ?? donation.expected_amount).toLocaleString('vi-VN')}đ?`)) return;
    try {
      await adminApproveDonation(donation.id, donation.actual_amount ?? donation.expected_amount);
      alert(`Đã duyệt khoản ủng hộ ${donation.code}.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Không thể duyệt khoản ủng hộ.');
    }
  };

  const handleDeleteDonation = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminDeleteDonation(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Không thể xóa bản ghi ủng hộ.');
    } finally {
      setDeleting(false);
    }
  };

  // Tính thống kê nhanh
  const approvedCount = donations.filter((d) => d.status === 'approved').length;
  const reviewCount = donations.filter((d) => d.status === 'manual_review').length;
  const pendingCount = donations.filter((d) => d.status === 'pending_payment').length;

  return (
    <div className="space-y-8">
      {/* Bộ đếm nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-brand-border flex items-center justify-between">
          <div>
            <span className="text-xs text-brand-textMuted font-medium block">Đã Duyệt Thành Công</span>
            <span className="font-display font-bold text-2xl text-green-600">{approvedCount}</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-green-500/30" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-border flex items-center justify-between">
          <div>
            <span className="text-xs text-brand-textMuted font-medium block">Giao Dịch Cần Đối Chiếu</span>
            <span className="font-display font-bold text-2xl text-amber-600">{reviewCount}</span>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-500/30" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-border flex items-center justify-between">
          <div>
            <span className="text-xs text-brand-textMuted font-medium block">Chưa Chuyển</span>
            <span className="font-display font-bold text-2xl text-brand-textMuted">{pendingCount}</span>
          </div>
          <Clock className="w-8 h-8 text-brand-orange/30" />
        </div>
      </div>

      {/* Bảng danh sách & Bộ lọc */}
      <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="font-display font-bold text-xl text-brand-text">
            Tất Cả Bản Ghi Quyên Góp ({donations.length})
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Lọc trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-brand-border text-xs font-semibold bg-brand-bg min-h-touch outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="approved">Đã duyệt (approved)</option>
              <option value="manual_review">Cần đối chiếu (manual_review)</option>
              <option value="pending_payment">Chưa chuyển</option>
              <option value="rejected">Từ chối (rejected)</option>
              <option value="expired">Đã hết hạn (expired)</option>
            </select>

            {/* Tìm kiếm */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Tìm mã / tên / email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 rounded-xl border border-brand-border text-xs bg-brand-bg min-h-touch outline-none w-48"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-brand-orange text-white hover:bg-brand-orangeHover min-h-touch min-w-touch flex items-center justify-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-sm text-brand-textMuted">Đang tải danh sách...</div>
        ) : donations.length === 0 ? (
          <div className="text-center py-12 text-sm text-brand-textMuted">Không tìm thấy bản ghi nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-brand-text font-bold border-b border-brand-border">
                <tr>
                  <th className="py-3 px-3">Mã</th>
                  <th className="py-3 px-3">Người Ủng Hộ</th>
                  <th className="py-3 px-3">Số Tiền</th>
                  <th className="py-3 px-3">Trạng Thái</th>
                  <th className="py-3 px-3">Thời Gian</th>
                  <th className="py-3 px-3">Mã Giao Dịch</th>
                  <th className="py-3 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y border-brand-border/60">
                {donations.map((d) => {
                  const statusInfo = {
                    approved: { label: 'Đã duyệt', bg: 'bg-green-100 text-green-800' },
                    manual_review: { label: 'Cần review', bg: 'bg-amber-100 text-amber-800' },
                    pending_payment: { label: 'Chưa chuyển', bg: 'bg-blue-100 text-blue-800' },
                    rejected: { label: 'Từ chối', bg: 'bg-red-100 text-red-800' },
                    expired: { label: 'Hết hạn', bg: 'bg-gray-100 text-gray-800' },
                    cancelled: { label: 'Đã hủy', bg: 'bg-gray-100 text-gray-800' },
                  }[d.status] || { label: d.status, bg: 'bg-gray-100 text-gray-800' };

                  return (
                    <tr key={d.id} className="hover:bg-brand-bg/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-orange">{d.code}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold">{d.title} {d.display_name}</div>
                        <div className="text-brand-textMuted text-[11px]">{d.email || '(Không có email)'}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-brand-text">
                        {(d.actual_amount ?? d.expected_amount).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-brand-textMuted">
                        {new Date(d.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-brand-textMuted">
                        {d.provider_reference || d.provider_order_code || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {d.status === 'manual_review' && (
                          <button
                            onClick={() => handleApproveDonation(d)}
                            title="Duyệt khoản ủng hộ"
                            className="px-2.5 py-1.5 mr-1 rounded-lg bg-green-600 text-white hover:bg-green-700 text-[11px] font-bold transition-colors"
                          >
                            Duyệt
                          </button>
                        )}
                        {/* Nút xóa dữ liệu cá nhân theo NĐ 13/2023 */}
                        <button
                          onClick={() => handleEraseDonorData(d.id, d.code)}
                          title="Xóa thông tin cá nhân theo NĐ 13/2023"
                          className="p-1.5 rounded-lg text-brand-textMuted hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeleteError(null); setDeleteTarget(d); }}
                          title="Xóa toàn bộ bản ghi ủng hộ"
                          aria-label={`Xóa bản ghi ủng hộ ${d.code}`}
                          className="p-1.5 rounded-lg text-brand-textMuted hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null); }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-donation-title"
            aria-describedby="delete-donation-description"
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-brand-border shadow-xl"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 id="delete-donation-title" className="font-display font-bold text-xl text-brand-text">
                  Xóa bản ghi {deleteTarget.code}?
                </h3>
                <p id="delete-donation-description" className="mt-3 text-sm text-brand-textMuted leading-relaxed">
                  Thao tác này xóa hẳn bản ghi người ủng hộ và lịch sử email liên quan. Bản ghi đã duyệt sẽ không còn được tính vào tổng quỹ và nhật ký công khai. Không thể hoàn tác.
                </p>
                <p className="mt-3 text-sm font-semibold text-brand-text">
                  {deleteTarget.title} {deleteTarget.display_name} · {(deleteTarget.actual_amount ?? deleteTarget.expected_amount).toLocaleString('vi-VN')}đ
                </p>
                {deleteError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{deleteError}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-7">
              <button
                type="button"
                autoFocus
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-text hover:bg-brand-bg focus:outline-none focus:ring-2 focus:ring-brand-orange"
              >
                Giữ lại
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteDonation}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Đang xóa…' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

