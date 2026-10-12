import React, { useState, useEffect } from 'react';
import { adminGetDonations, adminApproveDonation, adminRejectDonation, adminAssignDonation } from '../../api';
import type { Donation } from '../../types';
import { AlertTriangle, CheckCircle, XCircle, Link2, Search, ArrowRight, ShieldAlert } from 'lucide-react';

export const AdminReviewQueuePage: React.FC = () => {
  const [items, setItems] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Donation | null>(null);

  // Modal actions state
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'assign' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [targetCode, setTargetCode] = useState('');
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await adminGetDonations({ status: 'manual_review', limit: 50 });
      setItems(res.items);
    } catch (err) {
      console.error('Lỗi tải hàng chờ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const openApproveModal = (d: Donation) => {
    setSelectedItem(d);
    setActualAmount(d.actual_amount || d.expected_amount);
    setActionType('approve');
    setActionMsg(null);
  };

  const openRejectModal = (d: Donation) => {
    setSelectedItem(d);
    setRejectReason('');
    setActionType('reject');
    setActionMsg(null);
  };

  const openAssignModal = (d: Donation) => {
    setSelectedItem(d);
    setTargetCode('');
    setActionType('assign');
    setActionMsg(null);
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await adminApproveDonation(selectedItem.id, actualAmount);
      setActionMsg({ type: 'success', text: `Đã duyệt thành công giao dịch mã ${selectedItem.code}` });
      setTimeout(() => {
        setActionType(null);
        loadQueue();
      }, 1000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Lỗi duyệt giao dịch' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !rejectReason.trim()) {
      setActionMsg({ type: 'error', text: 'Vui lòng nhập lý do từ chối.' });
      return;
    }
    setActionLoading(true);
    try {
      await adminRejectDonation(selectedItem.id, rejectReason.trim());
      setActionMsg({ type: 'success', text: 'Đã từ chối giao dịch.' });
      setTimeout(() => {
        setActionType(null);
        loadQueue();
      }, 1000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Lỗi từ chối giao dịch' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedItem || !targetCode.trim()) {
      setActionMsg({ type: 'error', text: 'Vui lòng nhập mã đích cần gán.' });
      return;
    }
    setActionLoading(true);
    try {
      await adminAssignDonation(selectedItem.id, targetCode.trim().toUpperCase());
      setActionMsg({ type: 'success', text: `Đã gán thành công vào mã ${targetCode.trim().toUpperCase()}` });
      setTimeout(() => {
        setActionType(null);
        loadQueue();
      }, 1000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Lỗi gán giao dịch' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-brand-text">
            Hàng chờ xử lý giao dịch cần đối chiếu
          </h2>
          <p className="text-xs text-brand-textMuted mt-1">
            Các giao dịch đã thanh toán nhưng chưa khớp tự động cần được kiểm tra tại đây.
          </p>
        </div>
        <button
          onClick={loadQueue}
          className="px-4 py-2 rounded-xl bg-brand-accent text-brand-orange text-xs font-bold hover:bg-brand-orange/20 transition-colors min-h-touch"
        >
          Làm mới hàng chờ ({items.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-brand-textMuted">Đang tải danh sách ca lệch...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-brand-border">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-brand-text">Không Có Ca Lệch Nào Cần Xử Lý</h3>
          <p className="text-xs text-brand-textMuted mt-1">
            Tuyệt vời! Tất cả giao dịch đều đã được khớp tự động hoặc xử lý hoàn tất.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const date = new Date(item.created_at).toLocaleString('vi-VN');
            const reasonBadge = {
              amount_mismatch: { label: 'Lệch Số Tiền', bg: 'bg-amber-100 text-amber-800' },
              missing_code: { label: 'Thiếu Mã Ủng Hộ', bg: 'bg-red-100 text-red-800' },
              expired_code: { label: 'Mã Đã Hết Hạn', bg: 'bg-orange-100 text-orange-800' },
              possible_duplicate: { label: 'Nghi Gửi Trùng', bg: 'bg-purple-100 text-purple-800' },
              unmatched: { label: 'Không Khớp Mã Nào', bg: 'bg-gray-100 text-gray-800' },
            }[item.review_reason || ''] || { label: 'Cần Đối Chiếu', bg: 'bg-amber-100 text-amber-800' };

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-brand-border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-extrabold text-brand-orange text-lg">
                      {item.code}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${reasonBadge.bg}`}>
                      {reasonBadge.label}
                    </span>
                    <span className="text-xs text-brand-textMuted">| Mã giao dịch ngân hàng: {item.provider_reference || item.provider_order_code || 'Chưa có'}</span>
                  </div>

                  <div className="text-xs text-brand-text space-y-1">
                    <div>
                      <span className="text-brand-textMuted">Người đăng ký:</span>{' '}
                      <span className="font-bold">{item.display_name}</span> {item.email ? `(${item.email})` : '(Không có email)'}
                    </div>
                    <div>
                      <span className="text-brand-textMuted">Kỳ vọng:</span>{' '}
                      <span className="font-bold">{item.expected_amount.toLocaleString('vi-VN')} đ</span> |{' '}
                        <span className="text-brand-textMuted">Số tiền thực chuyển:</span>{' '}
                      <span className="font-extrabold text-brand-orange">
                        {(item.actual_amount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    {item.payment_raw_event && (
                      <div className="p-2 bg-brand-bg rounded-lg font-mono text-[11px] text-brand-text break-all border border-brand-border">
                        <span className="text-brand-textMuted font-sans">Dữ liệu đối chiếu: </span>
                        {item.payment_raw_event}
                      </div>
                    )}
                    <div className="text-[11px] text-brand-textMuted">Thời gian: {date}</div>
                  </div>
                </div>

                {/* Thao tác admin */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => openApproveModal(item)}
                    className="px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors min-h-touch flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Duyệt Giao Dịch</span>
                  </button>
                  <button
                    onClick={() => openAssignModal(item)}
                    className="px-3.5 py-2 rounded-xl bg-brand-accent hover:bg-brand-orange/20 text-brand-orange text-xs font-bold transition-colors min-h-touch flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Gán Vào Mã...</span>
                  </button>
                  <button
                    onClick={() => openRejectModal(item)}
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors min-h-touch flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Từ Chối</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL XỬ LÝ */}
      {actionType && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-brand-border shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="font-display font-bold text-xl text-brand-text mb-4">
              {actionType === 'approve' && `Xác Nhận Duyệt: ${selectedItem.code}`}
              {actionType === 'reject' && `Từ Chối Giao Dịch: ${selectedItem.code}`}
              {actionType === 'assign' && `Gán Giao Dịch Vào Mã Khác`}
            </h3>

            {actionMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold mb-4 ${
                  actionMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {actionMsg.text}
              </div>
            )}

            {actionType === 'approve' && (
              <div className="space-y-4">
                <p className="text-xs text-brand-textMuted">
                  Hệ thống sẽ cập nhật trạng thái <span className="font-bold text-green-600">Đã duyệt</span>, phát hành biên nhận và tự động gửi thư cảm ơn đến email người ủng hộ.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    Số tiền thực nhận (VNĐ):
                  </label>
                  <input
                    type="number"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-sm font-bold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-textMuted hover:bg-gray-100"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={handleApprove}
                    className="px-5 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                  >
                    {actionLoading ? 'Đang duyệt...' : 'Xác Nhận Duyệt'}
                  </button>
                </div>
              </div>
            )}

            {actionType === 'reject' && (
              <div className="space-y-4">
                <p className="text-xs text-brand-textMuted">
                  Bắt buộc nhập lý do từ chối. Giao dịch sẽ không được tính vào quỹ và không gửi mail.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    Lý do từ chối: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Ủng hộ nhầm nội dung / Hoàn tiền lại theo yêu cầu..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-textMuted hover:bg-gray-100"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                  >
                    {actionLoading ? 'Đang xử lý...' : 'Xác Nhận Từ Chối'}
                  </button>
                </div>
              </div>
            )}

            {actionType === 'assign' && (
              <div className="space-y-4">
                <p className="text-xs text-brand-textMuted">
                  Nhập mã quyên góp đích dạng <code className="font-mono bg-brand-bg px-1 rounded">KV-XXXXXX</code> để gán giao dịch này vào.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    Mã ủng hộ đích:
                  </label>
                  <input
                    type="text"
                    placeholder="KV-XXXXXX"
                    value={targetCode}
                    onChange={(e) => setTargetCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-sm font-mono font-bold uppercase"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-textMuted hover:bg-gray-100"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={handleAssign}
                    className="px-5 py-2 rounded-xl bg-brand-orange text-white text-xs font-bold hover:bg-brand-orangeHover"
                  >
                    {actionLoading ? 'Đang gán...' : 'Gán Giao Dịch'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

