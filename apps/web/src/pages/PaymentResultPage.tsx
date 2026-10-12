import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { fetchPaymentStatus } from '../api';

interface PaymentResultPageProps {
  cancelled?: boolean;
  navigate: (path: string) => void;
}

export const PaymentResultPage: React.FC<PaymentResultPageProps> = ({ cancelled, navigate }) => {
  const orderCode = new URLSearchParams(window.location.search).get('orderCode');
  const [status, setStatus] = useState<string | null>(cancelled ? 'cancelled' : null);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (cancelled || !orderCode) return;
    let active = true;
    fetchPaymentStatus(orderCode)
      .then((result) => {
        if (active) {
          setStatus(result.status);
          setCode(result.code);
        }
      })
      .catch(() => active && setStatus('unknown'));
    return () => { active = false; };
  }, [cancelled, orderCode]);

  const isApproved = status === 'approved';
  const isCancelled = status === 'cancelled' || status === 'expired' || status === 'unknown';

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] shadow-sm p-8 space-y-5">
        {isApproved ? (
          <CheckCircle2 className="w-16 h-16 mx-auto text-[var(--kv-green-fg)]" />
        ) : isCancelled ? (
          <XCircle className="w-16 h-16 mx-auto text-[var(--kv-red)]" />
        ) : (
          <Clock3 className="w-16 h-16 mx-auto text-[var(--kv-pink)] animate-pulse" />
        )}
        <h1 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">
          {isApproved ? 'Lượt ủng hộ đã được ghi nhận' : isCancelled ? 'Lượt ủng hộ đã hủy hoặc hết hạn' : 'Đang xác nhận lượt ủng hộ'}
        </h1>
        <p className="text-sm text-[var(--kv-text-soft)] font-body max-w-md mx-auto text-center">
          {isApproved ? `Cảm ơn bạn đã ủng hộ${code ? ` với mã ${code}` : ''}.` : isCancelled ? 'Bạn có thể quay lại để tạo lượt ủng hộ mới.' : 'PayOS đang gửi kết quả về máy chủ. Vui lòng tải lại sau ít giây nếu trạng thái chưa cập nhật.'}
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
