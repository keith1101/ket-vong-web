import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { fetchDonationStatus, verifyReceipt } from '../api';
import {
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
  QrCode,
} from 'lucide-react';
import { ThankYouLetterCard } from '../components/ThankYouLetterCard';

interface ReceiptPageProps {
  code: string;
  navigate: (path: string) => void;
}

export const ReceiptPage: React.FC<ReceiptPageProps> = ({ code, navigate }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [statusData, setStatusData] = useState<{ code: string; status: string; approved_at: string | null } | null>(null);
  const [token, setToken] = useState<string>('');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    // JS đọc fragment #access=<token> (không bao giờ gửi lên server qua URL)
    const hash = window.location.hash;
    const match = hash.match(/access=([a-f0-9]+)/i);

    // Hỗ trợ chế độ xem thử nghiệm Demo (chỉ cho phép trên localhost dev)
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isDemoCode = code.toLowerCase() === 'demo' || code.toLowerCase().startsWith('demo-') || code.toLowerCase() === 'kv-demo';
    if (isLocalDev && isDemoCode) {
      setReceiptData({
        code: 'KV-6889AB',
        title: 'Bạn',
        display_name: 'Bùi Anh Huy',
        amount: 10000,
        quantity: 1,
        unit_price: 10000,
        created_at: '2026-10-24T09:45:00Z',
        approved_at: '2026-10-24T10:00:00Z',
        is_anonymous: false,
      });
      setLoading(false);
      return;
    }

    if (!match || !match[1]) {
      fetchDonationStatus(code)
        .then((data) => setStatusData(data))
        .catch(() => setErrorMsg('Không tìm thấy yêu cầu ủng hộ hoặc đường dẫn không chính xác.'))
        .finally(() => setLoading(false));
      return;
    }

    const extractedToken = match[1];
    setToken(extractedToken);
    window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);

    // Gửi token trong body POST /receipts/verify
    verifyReceipt(code, extractedToken)
      .then((data) => setReceiptData(data))
      .catch(() => {
        setErrorMsg('Không tìm thấy biên nhận hợp lệ hoặc liên kết không chính xác.');
      })
      .finally(() => setLoading(false));
  }, [code]);

  // Tự động sinh mã QR SVG chuẩn xác dẫn trực tiếp đến Thư Cảm Ơn & Biên Nhận
  useEffect(() => {
    if (!receiptData) return;
    const targetUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/dong-gop/${encodeURIComponent(receiptData.code)}${token ? `#access=${token}` : ''}`
      : `/dong-gop/${receiptData.code}`;

    QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 1,
      color: { dark: '#483426', light: '#ffffff' },
    })
      .then((svg) => setQrSvg(svg))
      .catch((err) => {
        console.warn('Lỗi sinh mã QR phía client:', err);
        if (receiptData.qr_svg) setQrSvg(receiptData.qr_svg);
      });
  }, [receiptData, token]);

  const receiptUrl = receiptData
    ? (typeof window !== 'undefined'
        ? `${window.location.origin}/dong-gop/${encodeURIComponent(receiptData.code)}${token ? `#access=${token}` : ''}`
        : `/dong-gop/${receiptData.code}`)
    : '';

  const copyToClipboard = (text: string, type: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-[var(--kv-pink)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-[var(--kv-text-soft)] font-display">Đang xác thực biên nhận...</p>
      </div>
    );
  }

  if (errorMsg || !receiptData) {
    if (statusData) {
      const statusLabel: Record<string, string> = {
        pending_payment: 'Chưa chuyển',
        approved: 'Đã ghi nhận ủng hộ',
        manual_review: 'Đang chờ đối soát',
        expired: 'Mã ủng hộ đã hết hạn',
        rejected: 'Khoản ủng hộ chưa được duyệt',
      };
      return (
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-sm p-8 space-y-5">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[var(--kv-pink)]" />
            <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)]">Trạng thái yêu cầu ủng hộ</h2>
            <p className="text-sm text-[var(--kv-text-soft)] max-w-md mx-auto text-center">{statusLabel[statusData.status] || statusData.status}</p>
            <div className="px-4 py-3 rounded-xl bg-[var(--kv-blue-bg)] font-mono font-extrabold tracking-wider text-[var(--kv-ink)]">{statusData.code}</div>
            <p className="text-xs text-[var(--kv-text-soft)] font-body max-w-md mx-auto text-center">
              Khi lượt ủng hộ được xác nhận, email cảm ơn sẽ chứa nút mở biên nhận và thư cảm ơn của bạn.
            </p>
            <button onClick={() => navigate('/')} className="kv-btn kv-btn--primary px-6 py-3 text-sm">Về trang chủ</button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-8 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)] mb-2">
            Không Thể Tải Biên Nhận
          </h2>
          <p className="text-sm text-[var(--kv-text-soft)] mb-6 font-body max-w-md mx-auto text-center">{errorMsg}</p>
          <button
            onClick={() => navigate('/')}
            className="kv-btn kv-btn--primary px-6 py-3 text-sm"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  const dateStr = receiptData.approved_at
    ? new Date(receiptData.approved_at).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Nút quay lại trang chủ */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)] transition-colors min-h-touch font-display"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang chủ</span>
        </button>
      </div>

      {/* KHỐI THƯ CẢM ƠN - MẪU THIẾT KẾ MỚI */}
      <ThankYouLetterCard
        code={receiptData.code}
        title={receiptData.title}
        displayName={receiptData.display_name}
        amount={receiptData.amount}
        quantity={receiptData.quantity}
        dateStr={dateStr}
        token={token}
      />

      {/* BẢNG KÊ ĐỐI SOÁT & CHI TIẾT BIÊN NHẬN ĐIỆN TỬ */}
      <div className="bg-[var(--color-surface)] rounded-3xl p-6 sm:p-8 border border-[var(--color-border)] shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">
                Chi Tiết Bản Ghi Đối Soát Điện Tử
              </h3>
              <p className="text-xs text-[var(--kv-text-soft)] font-body">
                Lưu trữ an toàn phục vụ sao kê và đối soát theo quy định
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(receiptData.code, 'code')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--kv-blue-bg)] hover:bg-[var(--kv-blue-bg)]/80 text-[var(--kv-blue-fg)] text-xs font-bold transition-all min-h-touch font-display"
          >
            {copiedType === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedType === 'code' ? 'Đã chép' : 'Chép mã'}</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-xs font-body">
          <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--kv-text-soft)] block">Người đóng góp:</span>
            <span className="font-bold text-[var(--kv-text)] text-sm block font-display">
              {receiptData.title} {receiptData.display_name}
            </span>
            {receiptData.is_anonymous && (
              <span className="inline-block mt-1 text-[11px] font-semibold text-[var(--kv-orange-fg)] bg-[var(--kv-orange-bg)] px-2 py-0.5 rounded-md font-display">
                (Đã chọn hiển thị Ẩn danh trên bảng sao kê công khai)
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--kv-text-soft)] block">Số tiền &amp; Quy mô:</span>
            <span className="font-display font-extrabold text-[var(--color-number)] text-base block">
              {receiptData.amount.toLocaleString('vi-VN')} VNĐ
            </span>
            <span className="text-[var(--kv-text-soft)] block">
              Tương ứng {receiptData.quantity} chiếc vòng (10.000đ / chiếc)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--kv-text-soft)] block">Mã ủng hộ duy nhất:</span>
            <span className="font-mono font-extrabold text-[var(--kv-ink)] text-sm block">
              {receiptData.code}
            </span>
            <span className="text-[var(--kv-text-soft)] block">Phương thức: Chuyển khoản trực tuyến</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--kv-text-soft)] block">Thời gian ghi nhận:</span>
            <span className="font-medium text-[var(--kv-text)] text-sm block">{dateStr}</span>
            <span className="text-[var(--kv-text-soft)] block">Trạng thái: Đã ghi nhận vào quỹ</span>
          </div>
        </div>

        {/* Khung quét mã QR đối chiếu */}
        <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-4">
          <a
            href={receiptUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white border border-[var(--color-border)] shrink-0 shadow-xs hover:border-[var(--kv-ink)] transition-all block group"
            title="Nhấp để mở liên kết hoặc quét bằng camera điện thoại"
          >
            {qrSvg ? (
              <div
                className="w-24 h-24 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[var(--kv-pink)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </a>
          <div className="text-center sm:text-left space-y-1.5 text-xs flex-1 min-w-0">
            <h4 className="font-display font-bold text-sm text-[var(--kv-ink)]">
              Mã QR Tra Cứu &amp; Đối Chiếu Minh Bạch
            </h4>
            <p className="text-[var(--kv-text-soft)] font-body">
              Quét mã bằng camera điện thoại để xác thực hoặc{' '}
              <a
                href={receiptUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--kv-blue-fg)] underline font-bold hover:text-[var(--kv-ink)]"
              >
                nhấp vào đây để mở trực tiếp
              </a>.
            </p>
            {receiptUrl && (
              <div className="text-[11px] font-mono text-neutral-600 truncate bg-white/80 px-2 py-1 rounded-md border border-[var(--color-border)] select-all" title={receiptUrl}>
                {receiptUrl}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--kv-blue-bg)]/50 border border-[var(--kv-blue-fg)]/20 flex items-start gap-3 text-xs text-[var(--kv-text)] leading-relaxed font-body">
          <ShieldCheck className="w-5 h-5 text-[var(--kv-ink)] shrink-0 mt-0.5" />
          <span>
            Thông tin của bạn được bảo mật tuyệt đối theo Nghị định 13/2023/NĐ-CP. Số điện thoại và Email không bao giờ hiển thị công khai trên bảng sao kê minh bạch.
          </span>
        </div>
      </div>
    </div>
  );
};
