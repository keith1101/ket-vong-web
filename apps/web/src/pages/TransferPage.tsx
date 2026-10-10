import React, { useState, useEffect } from 'react';
import { Copy, Check, QrCode, AlertTriangle, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { fetchDonationTransfer } from '../api';

interface TransferPageProps {
  code: string;
  navigate: (path: string) => void;
  state?: {
    donation?: any;
    instructions?: any;
  };
}

export const TransferPage: React.FC<TransferPageProps> = ({ code, navigate, state }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loadedInstructions, setLoadedInstructions] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Lấy dữ liệu từ state hoặc fallback
  const instructions = state?.instructions || loadedInstructions;

  const amount = instructions?.expected_amount || 0;

  useEffect(() => {
    if (state?.instructions) return;
    fetchDonationTransfer(code).then(setLoadedInstructions).catch((error) => setLoadError(error.message));
  }, [code, state?.instructions]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Tự động kiểm tra trạng thái mỗi 5 giây xem đã được duyệt chưa
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        // Kiểm tra xem mã này đã lên public approved chưa
        const res = await fetch(`/api/v1/donations/public?limit=5`);
        const json = await res.json();
        // Nếu muốn kiểm tra trạng thái nội bộ hoặc receipt
      } catch (err) {
        // ignore
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [code]);

  if (loadError || !instructions) {
    return <div className="max-w-xl mx-auto px-4 py-20 text-center text-sm text-brand-textMuted">{loadError || 'Đang tải thông tin chuyển khoản…'}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-xs font-bold text-brand-textMuted hover:text-brand-orange mb-6 min-h-touch"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại trang chủ</span>
      </button>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-accent text-brand-orange mb-3">
            <QrCode className="w-6 h-6" />
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-brand-text">
            Hướng Dẫn Chuyển Khoản
          </h1>
          <p className="text-sm text-brand-textMuted mt-1">
            Mã ủng hộ của bạn: <span className="font-display font-extrabold text-brand-orange text-lg">{code}</span>
          </p>
        </div>

        {/* Hướng Dẫn Quan Trọng */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-950">LƯU Ý CỰC KỲ QUAN TRỌNG:</span> Hãy nhập chính xác mã{' '}
            <span className="font-extrabold text-amber-900 underline">{code}</span> vào phần{' '}
            <span className="font-bold">Nội dung chuyển khoản</span>. Hệ thống SePay sẽ tự động quét mã và xác nhận ủng hộ trong 1 - 2 phút!
          </div>
        </div>

        {/* Thông tin chuyển khoản chi tiết */}
        <div className="space-y-4 mb-8">
          {/* Ngân hàng */}
          <div className="p-4 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-textMuted block">Ngân Hàng</span>
              <span className="font-bold text-sm sm:text-base text-brand-text">{instructions.bank_name}</span>
            </div>
            <button
              onClick={() => copyToClipboard(instructions.bank_name, 'bank')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-brand-border hover:bg-brand-accent text-brand-text flex items-center gap-1 min-h-touch"
            >
              {copiedField === 'bank' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'bank' ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
          </div>

          {/* Số tài khoản */}
          <div className="p-4 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-textMuted block">Số Tài Khoản</span>
              <span className="font-mono font-bold text-lg text-brand-text">{instructions.bank_account_number}</span>
            </div>
            <button
              onClick={() => copyToClipboard(instructions.bank_account_number, 'stk')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-brand-border hover:bg-brand-accent text-brand-text flex items-center gap-1 min-h-touch"
            >
              {copiedField === 'stk' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'stk' ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
          </div>

          {/* Chủ tài khoản */}
          <div className="p-4 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-textMuted block">Chủ Tài Khoản</span>
              <span className="font-bold text-sm sm:text-base text-brand-text">{instructions.bank_account_name}</span>
            </div>
          </div>

          {/* Số tiền */}
          <div className="p-4 rounded-2xl bg-brand-accent border border-brand-orange/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-textMuted block">Số Tiền Cần Chuyển</span>
              <span className="font-display font-extrabold text-xl sm:text-2xl text-brand-orange">
                {amount.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(amount.toString(), 'amount')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-brand-border hover:bg-brand-orange/10 text-brand-orange flex items-center gap-1 min-h-touch"
            >
              {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'amount' ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
          </div>

          {/* Nội dung chuyển khoản - Nổi bật nhất */}
          <div className="p-4 rounded-2xl bg-[#fff8f2] border-2 border-brand-orange flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-brand-orange uppercase block tracking-wider">
                Nội Dung Chuyển Khoản (Bắt buộc)
              </span>
              <span className="font-mono font-extrabold text-2xl text-brand-text tracking-wider">{code}</span>
            </div>
            <button
              onClick={() => copyToClipboard(code, 'code')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-orange text-white hover:bg-brand-orangeHover shadow-md shadow-brand-orange/20 flex items-center gap-1.5 min-h-touch"
            >
              {copiedField === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedField === 'code' ? 'Đã chép mã!' : 'Sao chép mã'}</span>
            </button>
          </div>
        </div>

        {/* Mã QR ngân hàng */}
        <div className="text-center p-6 bg-brand-bg rounded-2xl border border-brand-border mb-6">
          <p className="text-xs font-bold text-brand-text mb-3">
            Hoặc mở App Ngân Hàng / Ví MoMo để quét mã VietQR:
          </p>
          <div className="inline-block p-4 bg-white rounded-2xl shadow-sm border border-brand-border">
            <img
              src={instructions.bank_qr_image}
              alt="Mã QR chuyển khoản do ban tổ chức cung cấp"
              className="w-56 h-auto mx-auto rounded-lg"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-[11px] text-brand-textMuted block mt-2">
              Quét bằng app ngân hàng bất kỳ (nội dung &amp; số tiền tự động điền)
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="text-center space-y-3">
          <button
            onClick={() => navigate('/minh-bach')}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-brand-orange hover:bg-brand-accent transition-colors min-h-touch"
          >
            Xem danh sách quyên góp trên Trang Minh Bạch
          </button>
        </div>
      </div>
    </div>
  );
};

