import React, { useEffect, useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, Copy, ShieldCheck, Sparkles, Heart } from 'lucide-react';
import { fetchFundSummary, submitDonation } from '../api';
import type { FundSummary } from '../types';

interface DonatePageProps {
  navigate: (path: string, state?: any) => void;
}

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

  useEffect(() => {
    fetchFundSummary()
      .then((data) => {
        setSummary(data);
        const preset = data.presets?.[0] || 1;
        setQuantity(preset);
        setCustomQuantity(String(preset));
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
        // Nếu có checkoutUrl từ cổng, chuyển hướng hoặc điều hướng sang trang kết quả
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-8 space-y-2">
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
            <p className="text-[11px] text-[var(--kv-text-soft)] mt-1 font-body">
              Điền email nếu bạn muốn nhận biên nhận điện tử &amp; thư cảm ơn qua hòm thư.
            </p>
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
              placeholder="09xx xxx xxx"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--kv-text)] font-display">
            Lời chúc / Lời nhắn gửi workshop (không bắt buộc)
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
          {submitting ? 'Đang tạo mã ủng hộ…' : (
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
    </div>
  );
};
