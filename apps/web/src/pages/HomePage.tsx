import React, { useState, useEffect } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { fetchFundSummary, submitDonation } from '../api';
import type { FundSummary } from '../types';
import { Heart, Sparkles, Shield, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface HomePageProps {
  navigate: (path: string, state?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Form states (SRS-001, SRS-002)
  const [quantity, setQuantity] = useState<number>(0);
  const [customQtyInput, setCustomQtyInput] = useState<string>('');
  const [title, setTitle] = useState<string>('Bạn');
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [publicMessage, setPublicMessage] = useState<string>('');
  const [showNameOnLog, setShowNameOnLog] = useState<boolean>(true); // mặc định tick hiển thị tên
  const [consent, setConsent] = useState<boolean>(false); // SRS-002: mặc định KHÔNG tick (NĐ 13/2023)

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);

  useEffect(() => {
    fetchFundSummary()
      .then((data) => {
        setSummary(data);
        const firstPreset = data.presets[0];
        if (firstPreset) {
          setQuantity(firstPreset);
          setCustomQtyInput(String(firstPreset));
        }
      })
      .catch((err) => console.error('Lỗi tải tóm tắt quỹ:', err))
      .finally(() => setLoadingSummary(false));
  }, []);

  const unitPrice = summary?.unit_price || 0;
  const calculatedAmount = quantity * unitPrice;

  const handleSelectPreset = (p: number) => {
    setQuantity(p);
    setCustomQtyInput(p.toString());
    const maxQuantity = summary?.max_quantity ?? 0;
    setQuantityError(maxQuantity > 0 && p > maxQuantity ? `Số lượng tối đa là ${maxQuantity} chiếc.` : null);
  };

  const handleCustomQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomQtyInput(val);
    const parsed = Number(val);
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      setQuantity(parsed);
      const maxQuantity = summary?.max_quantity ?? 0;
      setQuantityError(maxQuantity > 0 && parsed > maxQuantity ? `Số lượng tối đa là ${maxQuantity} chiếc.` : null);
    } else {
      setQuantity(0);
      setQuantityError('Vui lòng nhập số nguyên dương.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate phía client trước khi gửi
    if (!consent) {
      setErrorMsg('Bạn cần đồng ý với điều khoản xử lý dữ liệu cá nhân (Nghị định 13/2023) để tiếp tục.');
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ để nhận biên nhận và thư cảm ơn.');
      return;
    }
    const maxQuantity = summary?.max_quantity ?? 0;
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || (maxQuantity > 0 && quantity > maxQuantity)) {
      setQuantityError(maxQuantity > 0 ? `Số lượng tối đa là ${maxQuantity} chiếc.` : 'Vui lòng nhập số nguyên dương.');
      setErrorMsg('Vui lòng kiểm tra lại số lượng vòng tay.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitDonation({
        quantity,
        displayName: displayName.trim(),
        title,
        email: email.trim(),
        phone: phone.trim() || undefined,
        publicMessage: publicMessage.trim() || undefined,
        isAnonymous: !showNameOnLog,
        consent,
      });

      // Điều hướng sang màn hình chuyển khoản (SRS-003)
      navigate(`/chuyen-khoan/${res.donation.code}`, {
        donation: res.donation,
        instructions: res.transferInstructions,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo yêu cầu ủng hộ. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const presets = summary?.presets || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-accent text-brand-orange text-xs font-bold tracking-wide uppercase mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          {summary?.campaign_name || 'Thông tin chiến dịch'}
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-brand-text tracking-tight mb-4 leading-tight">
          {summary?.campaign_name || 'Ủng hộ chiến dịch'}
        </h1>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-brand-textMuted leading-relaxed">
          {summary?.campaign_intro || 'Thông tin chiến dịch đang được cập nhật.'}
        </p>
      </div>

      {/* Progress Bar & 4 Metrics (SRS-031) */}
      <ProgressBar summary={summary} />

      {/* Donation Form Card (SRS-001, SRS-002) */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-border shadow-sm">
        <div className="border-b border-brand-border/60 pb-6 mb-8">
          <h2 className="font-display font-extrabold text-2xl text-brand-text mb-2">
            Ủng Hộ Workshop
          </h2>
          <p className="text-sm text-brand-textMuted">
            Đơn giá tương ứng: <span className="font-bold text-brand-orange">{unitPrice.toLocaleString('vi-VN')} đ / vòng tay</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Chọn số lượng (SRS-001) */}
          <div>
            <label className="block text-sm font-bold text-brand-text mb-3">
              1. Chọn số lượng vòng tay ủng hộ
            </label>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => handleSelectPreset(p)}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all min-h-touch ${
                    quantity === p && customQtyInput === p.toString()
                      ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20 scale-105'
                      : 'bg-[#fdf3eb] text-brand-text hover:bg-brand-orange/15'
                  }`}
                >
                  {p} chiếc
                </button>
              ))}

              {/* Ô tùy chỉnh */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-textMuted font-medium">Hoặc nhập:</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customQtyInput}
                  onChange={handleCustomQtyChange}
                  className="w-24 px-3 py-2 text-center text-sm font-bold rounded-xl border border-brand-border focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none bg-brand-bg min-h-touch"
                  placeholder="Khác"
                />
                <span className="text-xs text-brand-textMuted">chiếc</span>
              </div>
            </div>
            {quantityError && <p className="mt-2 text-xs font-semibold text-red-600">{quantityError}</p>}

            {/* Hiển thị số tiền tương ứng realtime */}
            <div className="p-4 rounded-2xl bg-brand-accent/70 border border-brand-orange/20 flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-text">Số tiền đóng góp tương ứng:</span>
              <span className="font-display font-extrabold text-2xl text-brand-orange">
                {calculatedAmount.toLocaleString('vi-VN')} <span className="text-base font-normal">VNĐ</span>
              </span>
            </div>
          </div>

          {/* 2. Thông tin người ủng hộ (SRS-002) */}
          <div className="space-y-5">
            <label className="block text-sm font-bold text-brand-text">
              2. Thông tin người ủng hộ
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Xưng hô */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">
                  Xưng hô
                </label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-border bg-white text-sm font-medium focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none min-h-touch"
                >
                  <option value="Anh">Anh</option>
                  <option value="Chị">Chị</option>
                  <option value="Cô">Cô</option>
                  <option value="Chú">Chú</option>
                  <option value="Bạn">Bạn</option>
                  <option value="Em">Em</option>
                </select>
              </div>

              {/* Tên hiển thị */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">
                  Họ và tên / Tên hiển thị <span className="text-brand-orange">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bùi Anh Huy"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none min-h-touch"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">
                  Email nhận Thư Cảm Ơn <span className="text-brand-orange">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="email.cua.ban@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none min-h-touch"
                />
                <p className="text-[11px] text-brand-textMuted mt-1">
                  Hệ thống tự động gửi biên nhận &amp; Thư cảm ơn đến hòm thư này.
                </p>
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">
                  Số điện thoại <span className="text-xs text-brand-textMuted/70">(không bắt buộc)</span>
                </label>
                <input
                  type="tel"
                  placeholder="09xx xxx xxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none min-h-touch"
                />
                <p className="text-[11px] text-brand-textMuted mt-1">
                  Chỉ dùng để đối chiếu khi phát sinh sai sót, không công khai.
                </p>
              </div>
            </div>

            {/* Lời nhắn công khai */}
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">
                Lời nhắn gửi workshop <span className="text-xs text-brand-textMuted/70">(không bắt buộc)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Chúc workshop Kết Vòng thành công rực rỡ..."
                value={publicMessage}
                onChange={(e) => setPublicMessage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none"
              />
            </div>

            {/* Checkbox ẩn danh */}
            <div className="flex items-start gap-3 pt-2">
              <input
                id="show-name"
                type="checkbox"
                checked={showNameOnLog}
                onChange={(e) => setShowNameOnLog(e.target.checked)}
                className="w-5 h-5 rounded text-brand-orange focus:ring-brand-orange border-brand-border mt-0.5"
              />
              <label htmlFor="show-name" className="text-xs text-brand-text leading-tight cursor-pointer">
                Hiển thị tên của tôi trên Trang Minh Bạch (Nếu bỏ chọn, tên bạn sẽ được hiển thị là <span className="font-semibold text-brand-orange">"Ẩn danh"</span>).
              </label>
            </div>

            {/* Checkbox Consent (SRS-002, NĐ 13/2023) - MẶC ĐỊNH KHÔNG TICK */}
            <div className="p-4 rounded-2xl bg-[#faf6f0] border border-brand-border flex items-start gap-3">
              <input
                id="consent-check"
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-5 h-5 rounded text-brand-orange focus:ring-brand-orange border-brand-border mt-0.5"
              />
              <label htmlFor="consent-check" className="text-xs text-brand-text leading-relaxed cursor-pointer">
                <span className="font-bold text-brand-text">Đồng ý xử lý dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP):</span> Tôi đồng ý cho phép Ban tổ chức Kết Vòng lưu trữ họ tên, email và thông tin chuyển khoản nhằm mục đích cấp mã, đối chiếu ủng hộ và gửi thư tri ân. Xem <a href="/chinh-sach-bao-mat" className="text-brand-orange font-bold underline">chính sách bảo mật</a>.
              </label>
            </div>
          </div>

          {/* Lỗi hiển thị nếu có */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nút bấm Submit */}
          <button
            type="submit"
            disabled={submitting || !consent || !summary || quantity <= 0}
            className={`w-full py-4 px-6 rounded-2xl font-display font-extrabold text-lg text-white transition-all flex items-center justify-center gap-2 shadow-lg min-h-touch ${
              submitting || !consent || !summary || quantity <= 0
                ? 'bg-brand-border text-brand-textMuted cursor-not-allowed shadow-none'
                : 'bg-brand-orange hover:bg-brand-orangeHover shadow-brand-orange/30 hover:scale-[1.01]'
            }`}
          >
            {submitting ? (
              <span>Đang xử lý cấp mã...</span>
            ) : (
              <>
                <span>Tiến Hành Ủng Hộ {calculatedAmount.toLocaleString('vi-VN')} đ</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

