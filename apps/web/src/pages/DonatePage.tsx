import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Sparkles,
  Heart,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { fetchFundSummary, submitDonation } from '../api';
import type { FundSummary, PaymentIntentData } from '../types';
import { BankAppPaymentModal } from '../components/BankAppPaymentModal';

interface DonatePageProps {
  navigate: (path: string, state?: any) => void;
}

export interface PendingDonationSession {
  donationCode: string;
  orderCode: number;
  statusToken?: string;
  amount: number;
  quantity: number;
  displayName: string;
  title: string;
  email?: string;
  phone?: string;
  isAnonymous?: boolean;
  message?: string;
  payment: PaymentIntentData;
  createdAt: number;
}

const PENDING_STORAGE_KEY = 'ketvong:active-pending-donation';

const getPendingSession = (): PendingDonationSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed: PendingDonationSession = JSON.parse(raw);
    // Hết hạn sau 15 phút (900.000 ms) theo vòng đời tiêu chuẩn của link PayOS
    if (!parsed.createdAt || Date.now() - parsed.createdAt > 15 * 60 * 1000) {
      window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const savePendingSession = (session: PendingDonationSession) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(session));
  } catch {}
};

const clearPendingSession = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
  } catch {}
};

export const DonatePage: React.FC<DonatePageProps> = ({ navigate }) => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customQuantity, setCustomQuantity] = useState('1');
  const [title, setTitle] = useState('Bạn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activePayment, setActivePayment] = useState<PaymentIntentData | null>(null);
  const [pendingSession, setPendingSession] = useState<PendingDonationSession | null>(null);

  // Tải thông tin quỹ và khôi phục đơn đang chờ thanh toán nếu có
  useEffect(() => {
    fetchFundSummary()
      .then((data) => {
        setSummary(data);
        const preset = data.presets?.[0] || 1;
        
        // Kiểm tra xem có đơn cũ chưa thanh toán trong vòng 15 phút không
        const existing = getPendingSession();
        if (existing) {
          setPendingSession(existing);
          setQuantity(existing.quantity);
          setCustomQuantity(String(existing.quantity));
          if (existing.displayName) setDisplayName(existing.displayName);
          if (existing.title) setTitle(existing.title);
          if (existing.email) setEmail(existing.email);
          if (existing.phone) setPhone(existing.phone);
          if (existing.message) setMessage(existing.message);
          if (typeof existing.isAnonymous === 'boolean') setIsAnonymous(existing.isAnonymous);
        } else {
          setQuantity(preset);
          setCustomQuantity(String(preset));
        }
      })
      .catch(() => setError('Không thể tải thông tin chiến dịch. Vui lòng thử lại sau.'));
  }, []);

  const unitPrice = summary?.unit_price || 10000;
  const amount = quantity * unitPrice;
  const presets = summary?.presets || [1];

  const chooseQuantity = (value: number) => {
    setQuantity(value);
    setCustomQuantity(String(value));
    setQuantityError(null);
    setError(null);
  };

  const handleCustomQuantityChange = (value: string) => {
    setCustomQuantity(value);
    const parsed = Number(value);
    const maxQuantity = summary?.max_quantity ?? 0;

    if (!value || !Number.isSafeInteger(parsed) || parsed <= 0) {
      setQuantity(0);
      setQuantityError('Vui lòng nhập số nguyên dương lớn hơn 0.');
      return;
    }

    setQuantity(parsed);
    setQuantityError(maxQuantity > 0 && parsed > maxQuantity ? `Số lượng tối đa là ${maxQuantity} chiếc.` : null);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hủy phiên đơn chờ cũ để bắt đầu tạo đơn hoàn toàn mới
  const handleDiscardPending = () => {
    clearPendingSession();
    setPendingSession(null);
    setActivePayment(null);
    setSuccessCode(null);
  };

  // Mở lại popup thanh toán của đơn đang chờ
  const handleResumePending = () => {
    if (!pendingSession) return;
    setSuccessCode(pendingSession.donationCode);
    setActivePayment(pendingSession.payment);
  };

  // Kiểm tra xem đơn hiện tại có trùng với đơn đang chờ trong session không
  const isPendingReusable = Boolean(
    pendingSession &&
    pendingSession.quantity === quantity &&
    pendingSession.amount === amount &&
    pendingSession.displayName.trim().toLowerCase() === displayName.trim().toLowerCase()
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessCode(null);
    const maxQuantity = summary?.max_quantity ?? 0;
    if (!summary || quantity <= 0 || !Number.isSafeInteger(quantity) || (maxQuantity > 0 && quantity > maxQuantity)) {
      setQuantityError(maxQuantity > 0 && quantity > maxQuantity ? `Số lượng tối đa là ${maxQuantity} chiếc.` : 'Vui lòng nhập số nguyên dương lớn hơn 0.');
      setError('Vui lòng chọn số lượng vòng tay hợp lệ.');
      return;
    }
    if (!displayName.trim()) {
      setError('Vui lòng nhập họ và tên hoặc tên hiển thị.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Địa chỉ email chưa đúng định dạng.');
      return;
    }
    if (!consent) {
      setError('Bạn cần đồng ý với chính sách xử lý dữ liệu cá nhân để tiếp tục.');
      return;
    }

    // 1. TÁI SỬ DỤNG MÃ ĐÃ TẠO (SMART SESSION REUSE)
    // Nếu đơn cũ có cùng số tiền và tên người ủng hộ -> Mở lại ngay popup cũ, không gọi API tạo mã mới!
    const existing = getPendingSession();
    if (
      existing &&
      existing.quantity === quantity &&
      existing.amount === amount &&
      existing.displayName.trim().toLowerCase() === displayName.trim().toLowerCase()
    ) {
      setSuccessCode(existing.donationCode);
      setActivePayment(existing.payment);
      setPendingSession(existing);
      return;
    }

    // 2. TẠO MÃ MỚI QUA API KHI THÔNG TIN THAY ĐỔI HOẶC CHƯA CÓ ĐƠN NÀO
    setSubmitting(true);
    try {
      const result = await submitDonation({
        quantity,
        displayName: displayName.trim(),
        title,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        publicMessage: message.trim() || undefined,
        isAnonymous,
        consent: true,
      });

      if (result.donation?.code) {
        setSuccessCode(result.donation.code);
        setSubmitting(false);
        if (result.statusToken && result.payment?.orderCode) {
          window.localStorage.setItem(`ketvong:payment-status:${result.payment.orderCode}`, result.statusToken);
        }

        // Trường hợp đã được duyệt trước (bypass mode)
        if (result.donation.status === 'approved') {
          clearPendingSession();
          navigate(`/thanh-toan/ket-qua?orderCode=${result.payment?.orderCode || result.donation.code}`);
          return;
        }

        // Mở Màn hình Thanh toán Deeplink ngân hàng & Ví MoMo
        if (result.payment) {
          const paymentData: PaymentIntentData = {
            orderCode: result.payment.orderCode,
            paymentLinkId: result.payment.paymentLinkId,
            checkoutUrl: result.payment.checkoutUrl,
            qrCode: result.payment.qrCode,
            bin: result.payment.bin || summary?.bank_bin || '970422',
            bankName: result.payment.bankName || summary?.bank_name,
            accountNumber: result.payment.accountNumber || summary?.bank_account_number,
            accountName: result.payment.accountName || summary?.bank_account_name,
            amount,
            code: result.donation.code,
            expiresAt: result.payment.expiresAt,
          };

          const newSession: PendingDonationSession = {
            donationCode: result.donation.code,
            orderCode: result.payment.orderCode,
            statusToken: result.statusToken,
            amount,
            quantity,
            displayName: displayName.trim(),
            title,
            email: email.trim(),
            phone: phone.trim(),
            isAnonymous,
            message: message.trim(),
            payment: paymentData,
            createdAt: Date.now(),
          };

          savePendingSession(newSession);
          setPendingSession(newSession);
          setActivePayment(paymentData);
          return;
        }

        // Fallback: nếu không có đối tượng payment chi tiết thì chuyển hướng checkoutUrl
        if (result.payment?.checkoutUrl) {
          window.location.assign(result.payment.checkoutUrl);
        }
        return;
      }
      setSubmitting(false);
    } catch (submissionError: any) {
      setError(submissionError.message || 'Không thể tạo liên kết ủng hộ. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Tiêu đề trang */}
      <div className="text-center space-y-2">
        <div className="kv-pill bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 font-display">
          <Heart className="w-3.5 h-3.5 fill-[var(--kv-pink)] text-[var(--kv-pink)]" />
          <span>{summary?.campaign_name || 'Ủng hộ Kết Vòng'}</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[var(--kv-ink)] mt-2">
          Ủng hộ dự án
        </h1>
        <p className="text-sm text-[var(--kv-text-soft)] font-body max-w-xl mx-auto text-center">
          Điền thông tin và hoàn tất ủng hộ an toàn qua PayOS.
        </p>
      </div>

      {/* BANNER THÔNG BÁO ĐƠN CHỜ THANH TOÁN (KHI ĐÃ TẠO MÃ NHƯNG CHƯA HOÀN TẤT) */}
      {pendingSession && !activePayment && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50/70 border-2 border-dashed border-[var(--kv-orange)]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[var(--kv-orange)] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-black text-sm sm:text-base text-[var(--kv-ink)]">
                  Bạn đang có đơn ủng hộ chưa thanh toán
                </span>
                <code className="text-xs font-mono font-black text-[var(--kv-orange)] bg-white px-2.5 py-0.5 rounded-lg border border-[var(--color-border)] shadow-2xs">
                  {pendingSession.donationCode}
                </code>
              </div>
              <p className="text-xs text-[var(--kv-text-soft)] font-body mt-0.5">
                Số tiền: <strong className="text-[var(--color-number)] font-display font-bold">{pendingSession.amount.toLocaleString('vi-VN')}đ</strong> ({pendingSession.quantity} chiếc vòng) • Đã tạo lúc {new Date(pendingSession.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleResumePending}
              className="kv-btn kv-btn--primary text-xs py-2 px-4 shadow-xs"
            >
              <span>Mở lại thanh toán</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardPending}
              className="text-xs font-bold text-[var(--kv-text-soft)] hover:text-red-600 px-2.5 py-1.5 transition-colors font-display flex items-center gap-1"
              title="Hủy đơn này để tạo mã mới hoàn toàn"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hủy & Tạo mới</span>
            </button>
          </div>
        </div>
      )}

      {/* Form quyên góp */}
      <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] rounded-3xl border-2 border-[var(--color-border-strong)] shadow-sm p-6 sm:p-10 space-y-6">
        {/* Lựa chọn số lượng vòng */}
        <div>
          <label className="block text-sm font-bold text-[var(--kv-ink)] mb-3 font-display">
            Số lượng vòng tay ủng hộ
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => chooseQuantity(preset)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold font-display transition-all ${
                  quantity === preset
                    ? 'bg-[var(--kv-pink)] text-white shadow-sm ring-2 ring-[var(--kv-pink)]/30'
                    : 'bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] hover:bg-[var(--kv-blue-bg)]/80'
                }`}
              >
                {preset} chiếc ({((preset * unitPrice)).toLocaleString('vi-VN')}đ)
              </button>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--kv-text-soft)] font-display">Hoặc:</span>
              <input
                type="number"
                min="1"
                step="1"
                value={customQuantity}
                onChange={(event) => handleCustomQuantityChange(event.target.value)}
                className="w-24 px-3 py-2 rounded-xl border-1.5 border-[var(--color-border-strong)] text-sm text-center font-bold font-display focus:border-[var(--kv-ink)] focus:outline-none"
                placeholder="Số khác"
              />
              <span className="text-xs font-medium text-[var(--kv-text-soft)]">chiếc</span>
            </div>
          </div>
          {quantityError && <p className="mt-2 text-xs font-semibold text-red-600">{quantityError}</p>}

          {/* Hộp tổng số tiền */}
          <div className="mt-4 p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] flex justify-between items-center">
            <span className="text-sm font-semibold text-[var(--kv-text-soft)] font-display">
              Số tiền tương ứng ({quantity} × {unitPrice.toLocaleString('vi-VN')}đ)
            </span>
            <div className="flex items-baseline gap-1">
              <strong className="text-2xl font-extrabold text-[var(--color-number)] font-display">
                {amount.toLocaleString('vi-VN')}
              </strong>
              <span className="text-sm font-bold text-[var(--color-number)] font-display">đ</span>
            </div>
          </div>
        </div>

        {/* Thông tin cá nhân */}
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--kv-text)] font-display">Xưng hô</label>
            <select
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm bg-white focus:outline-none focus:border-[var(--kv-ink)]"
            >
              {['Bạn', 'Anh', 'Chị', 'Cô', 'Chú'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold mb-1 text-[var(--kv-text)] font-display">
              Họ và tên / Tên hiển thị *
            </label>
            <input
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm bg-white focus:outline-none focus:border-[var(--kv-ink)]"
              placeholder="Ví dụ: Nguyễn Văn An"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--kv-text)] font-display">
              Email nhận thư cảm ơn (không bắt buộc)
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm bg-white focus:outline-none focus:border-[var(--kv-ink)]"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--kv-text)] font-display">
              Số điện thoại (không bắt buộc)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm bg-white focus:outline-none focus:border-[var(--kv-ink)]"
              placeholder="0912345678"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--kv-text)] font-display">
            Lời chúc / Lời nhắn gửi đến các em nhỏ (công khai nếu không ẩn danh)
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm bg-white focus:outline-none focus:border-[var(--kv-ink)]"
            placeholder="Chúc các em bệnh nhi luôn mạnh mẽ và nhiều niềm vui..."
          />
        </div>

        {/* Checkbox ẩn danh */}
        <label className="flex items-start gap-3 text-xs leading-relaxed text-[var(--kv-text-soft)] cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(event) => setIsAnonymous(event.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-[var(--kv-pink)] focus:ring-[var(--kv-pink)]"
          />
          <span>Ẩn danh trên nhật ký minh bạch (Hệ thống vẫn bảo mật thông tin để đối soát và gửi thư cảm ơn).</span>
        </label>

        {/* Checkbox Consent NĐ 13/2023 */}
        <label className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--kv-paper-deep)] border border-[var(--color-border)] text-xs leading-relaxed text-[var(--kv-text)] cursor-pointer">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-[var(--kv-pink)] focus:ring-[var(--kv-pink)] shrink-0"
          />
          <span>
            Tôi đồng ý cho Ban tổ chức xử lý dữ liệu cá nhân để cấp thông tin ủng hộ, đối soát khoản ủng hộ và gửi thư cảm ơn (theo Nghị định 13/2023/NĐ-CP). Xem <a href="/chinh-sach-bao-mat" className="text-[var(--kv-pink)] font-bold underline">Chính sách bảo mật</a>.
          </span>
        </label>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successCode && (
          <div className="p-5 rounded-2xl bg-[var(--kv-green-bg)] border border-[var(--kv-green)]/30 text-[var(--kv-green-fg)] space-y-3">
            <div className="flex items-center gap-2 font-bold font-display">
              <CheckCircle2 className="w-5 h-5" /> Đã tạo yêu cầu ủng hộ thành công!
            </div>
            <p className="text-xs leading-relaxed">
              Vui lòng chuyển khoản đúng số tiền <strong>{amount.toLocaleString('vi-VN')}đ</strong> với nội dung chuyển khoản là mã dưới đây:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 rounded-xl bg-white border border-[var(--kv-green)]/30 text-center font-mono font-extrabold tracking-wider text-[var(--color-number)] text-lg">
                {successCode}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(successCode)}
                className="kv-btn kv-btn--primary text-xs py-3 px-4 shadow-sm"
                title="Sao chép mã ủng hộ"
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !summary || !consent || quantity <= 0 || Boolean(quantityError)}
          className="w-full kv-btn kv-btn--primary py-4 text-base font-bold shadow-md disabled:opacity-50"
        >
          {submitting ? (
            'Đang xử lý đơn ủng hộ…'
          ) : isPendingReusable ? (
            <>
              <span>Tiếp tục thanh toán mã {pendingSession?.donationCode} ({amount.toLocaleString('vi-VN')}đ)</span>
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <span>Ủng hộ {amount.toLocaleString('vi-VN')}đ</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-[var(--kv-text-soft)] flex items-center justify-center gap-1.5 font-body">
          <ShieldCheck className="w-4 h-4 text-[var(--kv-pink)]" />
          <span>Hệ thống ghi nhận ủng hộ tự động minh bạch qua PayOS.</span>
        </p>
      </form>

      {/* POPUP THANH TOÁN DEEPLINK & VIETQR */}
      {activePayment && (
        <BankAppPaymentModal
          isOpen={Boolean(activePayment)}
          onClose={() => setActivePayment(null)}
          payment={activePayment}
          donorName={displayName.trim() || pendingSession?.displayName || 'Nhà hảo tâm'}
          donorTitle={title || pendingSession?.title}
          quantity={quantity}
          onNewDonation={handleDiscardPending}
          onPaymentSuccess={(approvedData) => {
            const orderCode = approvedData?.orderCode || activePayment.orderCode;
            clearPendingSession();
            setPendingSession(null);
            setActivePayment(null);
            navigate(`/thanh-toan/ket-qua?orderCode=${orderCode}`);
          }}
        />
      )}
    </div>
  );
};
