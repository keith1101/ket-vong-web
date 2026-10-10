import React, { useState, useEffect } from 'react';
import { adminGetDonations, adminGetSepayUsage, adminEraseDonorData } from '../../api';
import type { Donation } from '../../types';
import { Search, Filter, AlertCircle, Trash2, CheckCircle2, Clock, XCircle, UserX, AlertTriangle } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sepayUsage, setSepayUsage] = useState<{ used: number; limit: number; isNearLimit: boolean; isOverLimit: boolean }>({
    used: 0,
    limit: 50,
    isNearLimit: false,
    isOverLimit: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [donationsRes, usageRes] = await Promise.all([
        adminGetDonations({ status: statusFilter || undefined, search: searchTerm || undefined, limit: 100 }),
        adminGetSepayUsage(),
      ]);
      setDonations(donationsRes.items);
      setSepayUsage(usageRes);
    } catch (err) {
      console.error('Lỗi tải dữ liệu admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

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

  // Tính thống kê nhanh
  const approvedCount = donations.filter((d) => d.status === 'approved').length;
  const reviewCount = donations.filter((d) => d.status === 'manual_review').length;
  const pendingCount = donations.filter((d) => d.status === 'awaiting_transfer').length;

  return (
    <div className="space-y-8">
      {/* Cảnh báo hạn mức SePay (SRS §11 & §12) */}
      <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
        sepayUsage.isOverLimit
          ? 'bg-red-50 border-red-200 text-red-900'
          : sepayUsage.isNearLimit
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-white border-brand-border text-brand-text'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-accent text-brand-orange">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Gói SePay Miễn Phí (50 Giao dịch / Tháng)</h4>
            <p className="text-xs text-brand-textMuted">
              Đã dùng: <span className="font-extrabold text-brand-orange">{sepayUsage.used}</span> / {sepayUsage.limit} giao dịch trong tháng này.
            </p>
          </div>
        </div>
        {sepayUsage.isNearLimit && (
          <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
            Cận Hạn Mức Gói Free!
          </span>
        )}
      </div>

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
            <span className="text-xs text-brand-textMuted font-medium block">Ca Lệch Cần Review</span>
            <span className="font-display font-bold text-2xl text-amber-600">{reviewCount}</span>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-500/30" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-border flex items-center justify-between">
          <div>
            <span className="text-xs text-brand-textMuted font-medium block">Đang Chờ Chuyển Khoản</span>
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
              <option value="awaiting_transfer">Chờ chuyển (awaiting_transfer)</option>
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
                  <th className="py-3 px-3">Tx SePay</th>
                  <th className="py-3 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {donations.map((d) => {
                  const statusInfo = {
                    approved: { label: 'Đã duyệt', bg: 'bg-green-100 text-green-800' },
                    manual_review: { label: 'Cần review', bg: 'bg-amber-100 text-amber-800' },
                    awaiting_transfer: { label: 'Chờ CK', bg: 'bg-blue-100 text-blue-800' },
                    rejected: { label: 'Từ chối', bg: 'bg-red-100 text-red-800' },
                    expired: { label: 'Hết hạn', bg: 'bg-gray-100 text-gray-800' },
                  }[d.status] || { label: d.status, bg: 'bg-gray-100 text-gray-800' };

                  return (
                    <tr key={d.id} className="hover:bg-brand-bg/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-orange">{d.code}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold">{d.title} {d.display_name}</div>
                        <div className="text-brand-textMuted text-[11px]">{d.email}</div>
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
                        {d.sepay_transaction_id || '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {/* Nút xóa dữ liệu cá nhân theo NĐ 13/2023 (SRS-070) */}
                        <button
                          onClick={() => handleEraseDonorData(d.id, d.code)}
                          title="Xóa thông tin cá nhân theo NĐ 13/2023"
                          className="p-1.5 rounded-lg text-brand-textMuted hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <UserX className="w-4 h-4" />
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
    </div>
  );
};

