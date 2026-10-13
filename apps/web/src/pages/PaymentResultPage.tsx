import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle, Heart, Sparkles } from 'lucide-react';
import { fetchPaymentStatus } from '../api';
import { ThankYouLetterCard } from '../components/ThankYouLetterCard';

interface PaymentResultPageProps {
  cancelled?: boolean;
  navigate: (path: string) => void;
}

export const PaymentResultPage: React.FC<PaymentResultPageProps> = ({ cancelled, navigate }) => {
  const orderCode = new URLSearchParams(window.location.search).get('orderCode');
  const [status, setStatus] = useState<string | null>(cancelled ? 'cancelled' : null);
  const [paymentData, setPaymentData] = useState<{
    code: string;
    status: string;
    approved_at: string | null;
    title?: string;
    display_name?: string;
    amount?: number;
    quantity?: number;
  } | null>(null);

  useEffect(() => {
    if (cancelled) return;
    if (!orderCode) {
      const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isDevDemo = isLocalDev && new URLSearchParams(window.location.search).get('demo') === '1';
      if (isDevDemo) {
        setStatus('approved');
        setPaymentData({
          code: 'KV-6889AB',
          status: 'approved',
          approved_at: '2026-10-24T10:00:00Z',
          title: 'Bạn',
          display_name: 'Bùi Anh Huy',
          amount: 10000,
          quantity: 1,
        });
        return;
      }
      setStatus('missing_order');
      return;
    }
    let active = true;
    fetchPaymentStatus(orderCode)
      .then((result) => {
        if (active) {
          setStatus(result.status);
          setPaymentData(result);
        }
      })
      .catch(() => active && setStatus('unknown'));
    return () => {
      active = false;
    };
  }, [cancelled, orderCode]);

  const isApproved = status === 'approved';
  const isCancelled = status === 'cancelled' || status === 'expired' || status === 'unknown';

  if (status === 'missing_order') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] shadow-sm p-8 space-y-5">
          <XCircle className="w-16 h-16 mx-auto text-[var(--kv-ink)]" />
          <h1 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
            Không tìm thấy thông tin lượt ủng hộ
          </h1>
          <p className="text-sm text-[var(--kv-text-soft)] font-body max-w-md mx-auto text-center">
            Vui lòng thực hiện ủng hộ trực tiếp qua cổng thanh toán hoặc kiểm tra lại đường dẫn.
          </p>
          <button
            onClick={() => navigate('/ung-ho')}
            className="kv-btn kv-btn--primary px-6 py-3 font-bold"
          >
            Đến trang ủng hộ
          </button>
        </div>
      </div>
    );
  }

  // Khi thanh toán thành công: Hiển thị Thư Cảm Ơn mới trực tiếp trên trang
  if (isApproved && paymentData) {
    const dateFormatted = paymentData.approved_at
      ? new Date(paymentData.approved_at).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('vi-VN');

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Banner thông báo chúc mừng */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] text-xs font-bold uppercase tracking-wider font-display">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ủng hộ thành công</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-4xl text-[var(--kv-ink)]">
            Cảm Ơn Tấm Lòng Vàng Của Bạn!
          </h1>
          <p className="text-sm text-[var(--kv-text-soft)] font-body max-w-lg mx-auto">
            Hệ thống đã tự động ghi nhận lượt ủng hộ của bạn vào quỹ Workshop Kết Vòng. Dưới đây là Thư cảm ơn chứng nhận đóng góp dành riêng cho bạn.
          </p>
        </div>

        {/* Khối Thư Cảm Ơn Mẫu Mới */}
        <ThankYouLetterCard
          code={paymentData.code}
          title={paymentData.title || 'Bạn'}
          displayName={paymentData.display_name || 'Quý Nhà Hảo Tâm'}
          amount={paymentData.amount || 10000}
          quantity={paymentData.quantity || 1}
          dateStr={dateFormatted}
          onNavigateHome={() => navigate('/')}
          onViewReceipt={() => navigate(`/dong-gop/${paymentData.code}`)}
        />
      </div>
    );
  }

  // Trường hợp đang chờ xử lý hoặc đã hủy
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] shadow-sm p-8 space-y-5">
        {isCancelled ? (
          <XCircle className="w-16 h-16 mx-auto text-[var(--kv-red)]" />
        ) : (
          <Clock3 className="w-16 h-16 mx-auto text-[var(--kv-pink)] animate-pulse" />
        )}
        <h1 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
          {isCancelled ? 'Lượt ủng hộ đã hủy hoặc hết hạn' : 'Đang xác nhận lượt ủng hộ'}
        </h1>
        <p className="text-sm text-[var(--kv-text-soft)] font-body max-w-md mx-auto text-center">
          {isCancelled
            ? 'Bạn có thể quay lại để tạo lượt ủng hộ mới.'
            : 'PayOS đang gửi kết quả về máy chủ. Vui lòng tải lại trang sau ít giây nếu trạng thái chưa cập nhật.'}
        </p>
        <button
          onClick={() => navigate('/ung-ho')}
          className="kv-btn kv-btn--primary px-6 py-3 font-bold"
        >
          Quay lại trang ủng hộ
        </button>
      </div>
    </div>
  );
};
