import React, { useEffect, useState, useId } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Heart,
  ArrowRight,
  Download,
} from 'lucide-react';
import QRCode from 'qrcode';
import { fetchPaymentStatus } from '../api';
import type { PaymentIntentData } from '../types';
import {
  VIETNAM_BANKS,
  generateBankingDeeplink,
  isMobileBrowser,
  getBankByBinOrCode,
  isBankAutofillSupported,
} from '../utils/banking';

export interface BankAppPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentIntentData;
  donorName: string;
  donorTitle?: string;
  quantity: number;
  onPaymentSuccess: (paymentData: any) => void;
  onNewDonation?: () => void;
}

export const BankAppPaymentModal: React.FC<BankAppPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  donorName,
  donorTitle = 'Bạn',
  quantity,
  onPaymentSuccess,
  onNewDonation,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [checking, setChecking] = useState<boolean>(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [showQrOnMobile, setShowQrOnMobile] = useState<boolean>(false);
  const isMobile = isMobileBrowser();
  const modalTitleId = useId();

  // Xác định thông tin ngân hàng thụ hưởng
  const bankBin = payment.bin || '970422'; // Mặc định MB Bank nếu chưa có
  const matchedBank = getBankByBinOrCode(bankBin);
  const defaultAppCode = matchedBank?.appCode || 'mb';
  const [selectedBankApp, setSelectedBankApp] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('ketvong:preferred-bank-app');
        if (saved && VIETNAM_BANKS.some((b) => b.appCode === saved)) {
          return saved;
        }
      } catch {}
    }
    return defaultAppCode;
  });
  const bankDisplay = payment.bankName || matchedBank?.shortName || matchedBank?.fullName || 'Ngân hàng nhận';
  const accountNumber = payment.accountNumber || '';
  const accountName = payment.accountName || 'DỰ ÁN KẾT VÒNG';
  const selectedBank = VIETNAM_BANKS.find((b) => b.appCode === selectedBankApp);

  // Ưu tiên chuỗi VietQR EMVCo từ PayOS nếu có, ngược lại dùng VietQR QuickLink
  const qrPayload =
    payment.qrCode && payment.qrCode.length > 20
      ? payment.qrCode
      : generateBankingDeeplink({
          accountNumber,
          bankBinOrCode: bankBin,
          amount: payment.amount,
          memo: payment.code,
          accountName,
        });

  const handleDownloadQrImage = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(qrPayload, {
        width: 600,
        margin: 2,
        color: {
          dark: '#162E78',
          light: '#ffffff',
        },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `vietqr-${payment.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setCheckMessage('Đã tải ảnh mã VietQR về máy! Bạn hãy mở app ngân hàng > chọn "Quét QR từ Thư viện ảnh".');
    } catch (err) {
      console.warn('[PaymentModal] Lỗi tải ảnh QR:', err);
    }
  };

  // Sinh mã QR SVG hiển thị sắc nét với gam màu Deep Ink đồng bộ thương hiệu
  useEffect(() => {
    if (!isOpen) return;

    QRCode.toString(qrPayload, {
      type: 'svg',
      margin: 1,
      width: 240,
      color: {
        dark: '#162E78', // Deep Ink chuẩn Crayon Rainbow tokens
        light: '#ffffff',
      },
    })
      .then((svg) => setQrSvg(svg))
      .catch((err) => console.warn('[PaymentModal] Lỗi sinh mã QR:', err));
  }, [isOpen, qrPayload]);

  // Cơ chế Tự Động Lắng Nghe Kết Quả Realtime (Polling mỗi 3 giây)
  useEffect(() => {
    if (!isOpen || !payment.orderCode) return;

    let active = true;
    const intervalId = setInterval(async () => {
      if (!active) return;
      try {
        const result = await fetchPaymentStatus(String(payment.orderCode));
        if (result && result.status === 'approved') {
          active = false;
          clearInterval(intervalId);
          onPaymentSuccess(result);
        }
      } catch {
        // Tiếp tục thử lại ở chu kỳ kế tiếp
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [isOpen, payment.orderCode, onPaymentSuccess]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleManualCheck = async () => {
    setChecking(true);
    setCheckMessage(null);
    try {
      const result = await fetchPaymentStatus(String(payment.orderCode));
      if (result && result.status === 'approved') {
        onPaymentSuccess(result);
      } else {
        setCheckMessage('Hệ thống chưa ghi nhận biến động số dư. Vui lòng hoàn tất xác nhận chuyển khoản trên ứng dụng ngân hàng rồi thử lại sau ít giây.');
      }
    } catch {
      setCheckMessage('Chưa ghi nhận giao dịch khớp mã. Vui lòng đảm bảo bạn đã bấm xác nhận chuyển tiền trên app.');
    } finally {
      setChecking(false);
    }
  };

  const openBankDeeplink = (appCode?: string) => {
    const targetApp = appCode || selectedBankApp || defaultAppCode;
    setSelectedBankApp(targetApp);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('ketvong:preferred-bank-app', targetApp);
      } catch {}
    }

    const targetBank = VIETNAM_BANKS.find((b) => b.appCode === targetApp);
    const supportsAutofill = Boolean(targetBank?.supportsAutofill);

    // Đối với các ngân hàng không hỗ trợ Autofill (như Agribank, Vietcombank, Techcombank, MoMo...):
    // Tự động sao chép mã đối soát để người dùng tiện dán hoặc đối chiếu
    if (!supportsAutofill && payment.code) {
      copyToClipboard(payment.code, 'memo');
    }

    if (targetApp === 'momo') {
      if (!isMobile) {
        // Trên desktop: Không gọi momo:// vì PC không có app MoMo, thông báo hướng dẫn quét QR trên màn hình
        setCheckMessage('Đã sao chép mã đối soát! Bạn đang ở máy tính: vui lòng mở app MoMo trên điện thoại và quét mã VietQR bên dưới.');
        return;
      }
    }

    const returnUrl = typeof window !== 'undefined' ? window.location.href : '';
    const deeplink = generateBankingDeeplink({
      app: targetApp,
      accountNumber,
      bankBinOrCode: bankBin,
      amount: payment.amount,
      memo: payment.code,
      accountName,
      returnUrl,
    });

    // Mở liên kết sâu: Kích hoạt ứng dụng ngân hàng / ví MoMo trên điện thoại
    try {
      window.location.href = deeplink;
    } catch {
      window.location.assign(deeplink);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl sm:rounded-[32px] border-2 border-[var(--color-border-strong)] shadow-2xl overflow-hidden my-6">
        {/* Đường viền cầu vồng 6 màu đặc trưng của Kết Vòng */}
        <div className="kv-rainbow-rule" />

        {/* Thanh tiêu đề Modal phong cách Giấy Kem & Crayon */}
        <div className="bg-[var(--kv-paper)] border-b border-[var(--color-border)] px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="kv-pill bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] font-display text-xs font-bold gap-1 shadow-xs">
                <Heart className="w-3.5 h-3.5 fill-[var(--kv-pink)] text-[var(--kv-pink)]" />
                <span>Ủng Hộ Kết Vòng</span>
              </span>
            </div>
            <h2 id={modalTitleId} className="font-display font-black text-xl sm:text-2xl text-[var(--kv-ink)] leading-tight">
              Ủng Hộ Qua Ngân Hàng
            </h2>
            <p className="font-hand text-xs sm:text-sm text-[var(--kv-pink-fg)]">
              Trao một vòng tay, kết một yêu thương
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-[var(--kv-pink-bg)] hover:text-[var(--kv-pink-fg)] text-[var(--kv-text-soft)] border border-[var(--color-border-strong)] flex items-center justify-center transition-all shadow-xs shrink-0"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Hộp tóm tắt đơn ủng hộ - Giấy kem viền nét đứt */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--kv-paper)] border-2 border-dashed border-[var(--color-border-strong)] flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <span className="text-xs text-[var(--kv-text-soft)] block font-body">
                Nhà hảo tâm:{' '}
                <strong className="text-[var(--kv-ink)] font-bold">
                  {donorTitle} {donorName}
                </strong>{' '}
                ({quantity} chiếc vòng tay)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold text-[var(--kv-text-soft)] font-display">Số tiền ủng hộ:</span>
                <strong className="text-2xl sm:text-3xl font-black text-[var(--color-number)] font-display tracking-tight">
                  {payment.amount.toLocaleString('vi-VN')}
                </strong>
                <span className="text-sm font-bold text-[var(--color-number)] font-display">đ</span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-[var(--kv-text-soft)] block uppercase tracking-wider font-display mb-1">
                Mã Giao Dịch Đối Soát
              </span>
              <code className="text-base sm:text-lg font-black font-mono text-[var(--kv-ink)] bg-white px-3 py-1.5 rounded-xl border border-[var(--color-border-strong)] shadow-xs inline-block tracking-wider">
                {payment.code}
              </code>
            </div>
          </div>

          {/* KHỐI ƯU TIÊN: MỞ ỨNG DỤNG NGÂN HÀNG / VÍ MOMO (APP-TO-APP DEEPLINK) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FFF8EE] to-[#FFF1E0] border-2 border-[var(--kv-orange)]/40 shadow-xs space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[var(--kv-orange)] text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-black text-base sm:text-lg text-[var(--kv-ink)]">
                    Mở Trực Tiếp Ứng Dụng Ngân Hàng / Ví MoMo
                  </h3>
                </div>
                <p className="text-xs text-[var(--kv-text)] font-body mt-1 leading-relaxed">
                  {selectedBankApp === 'momo' ? (
                    <>
                      Mở app MoMo để <strong>quét mã VietQR</strong> hoặc chọn <strong>Chuyển tiền đến ngân hàng</strong>. Bạn có thể bấm <strong>"Lưu Mã QR Vào Máy"</strong> bên dưới để quét từ Album ảnh, mã nội dung{' '}
                      <strong className="font-mono text-[var(--color-number)]">{payment.code}</strong> đã được sao chép sẵn.
                    </>
                  ) : selectedBank?.supportsAutofill ? (
                    <>
                      ⚡ <strong>Hỗ trợ tự động điền 100%!</strong> Mở app {selectedBank.shortName}, hệ thống sẽ kẹp sẵn STK, số tiền và nội dung{' '}
                      <strong className="font-mono text-[var(--color-number)]">{payment.code}</strong> vào lệnh chuyển tiền. (Bạn cũng có thể tải mã QR bên dưới để quét nếu muốn).
                    </>
                  ) : (
                    <>
                      📷 <strong>App {selectedBank?.shortName || 'ngân hàng'} chỉ mở app (không tự điền):</strong> Do chính sách an ninh của ngân hàng, ứng dụng không cho phép web ngoài tự điền lệnh chuyển trực tiếp. Hãy bấm{' '}
                      <strong>"Lưu Mã QR Vào Máy"</strong> &gt; mở app chọn <strong>'Quét QR từ Thư viện ảnh'</strong> (mã đối soát{' '}
                      <strong className="font-mono text-[var(--color-number)]">{payment.code}</strong> đã được sao chép sẵn).
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Hàng nút hành động chính: Mở App + Luôn có nút Lưu Mã QR */}
            <div className="grid sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => openBankDeeplink(selectedBankApp)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[var(--kv-pink)] hover:bg-[var(--kv-pink-hover)] text-white font-display font-black text-sm shadow-md shadow-pink-600/20 hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-white text-white shrink-0" />
                <span className="truncate">
                  {selectedBankApp === 'momo' && !isMobile
                    ? 'QUÉT VÍ MOMO (TRÊN ĐT)'
                    : selectedBank?.supportsAutofill
                    ? `MỞ APP ${selectedBank.shortName.toUpperCase()} (TỰ ĐIỀN)`
                    : `MỞ APP ${selectedBank?.shortName?.toUpperCase() || 'NGÂN HÀNG'}`}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={handleDownloadQrImage}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-[#FFF7ED] text-[var(--kv-orange)] border-2 border-[var(--kv-orange)] font-display font-black text-sm shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                title="Tải ảnh mã VietQR để mở app chọn 'Quét QR từ Album ảnh'"
              >
                <Download className="w-4 h-4 shrink-0 text-[var(--kv-orange)]" />
                <span>LƯU MÃ QR VÀO MÁY</span>
              </button>
            </div>

            {/* Hướng dẫn chuyển tiền dành riêng cho Ví MoMo */}
            {selectedBankApp === 'momo' && (
              <div className="p-3.5 rounded-2xl bg-[#FFF0F6] border border-[#F687B3]/60 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-[#A50064] font-display">
                  <span>💡 Hướng dẫn chuyển tiền bằng Ví MoMo:</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-[var(--kv-text)] font-body text-[11px] sm:text-xs">
                  <li>
                    <strong>Cách 1 (Quét mã VietQR):</strong> Bấm nút <strong>Lưu Mã QR Vào Máy</strong> &gt; Mở app MoMo &gt; Chọn Quét mã &gt; Chọn ảnh từ Album/Thư viện.
                  </li>
                  <li>
                    <strong>Cách 2 (Chuyển khoản đến Ngân hàng 24/7):</strong> Mở app MoMo &gt; Chọn <strong>Chuyển tiền đến Ngân hàng</strong> &gt; Chọn <strong>{bankDisplay}</strong> &gt; Nhập STK <code className="font-mono font-bold bg-white px-1 rounded">{accountNumber}</code> &gt; Dán nội dung <code className="font-mono font-bold bg-white px-1 text-[var(--color-number)] rounded">{payment.code}</code> (hệ thống đã tự động sao chép).
                  </li>
                </ul>
                <div className="pt-0.5 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                  <a
                    href="https://momo.vn/download"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#A50064] hover:underline font-bold font-display"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Tải ứng dụng MoMo (App Store / Google Play)</span>
                  </a>
                </div>
              </div>
            )}

            {/* Hướng dẫn chuyển tiền dành riêng cho các ngân hàng yêu cầu quét QR (Agribank, Vietcombank, Techcombank...) */}
            {selectedBankApp !== 'momo' && !selectedBank?.supportsAutofill && (
              <div className="p-3.5 rounded-2xl bg-[#FFF8EE] border border-[#F6AD55]/60 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-[#C05621] font-display">
                  <span>💡 Hướng dẫn chuyển tiền bằng {selectedBank?.shortName || 'ngân hàng'}:</span>
                </div>
                <p className="text-[var(--kv-text)] font-body text-[11px] sm:text-xs leading-relaxed">
                  Ứng dụng <strong>{selectedBank?.shortName || 'này'}</strong> tăng cường bảo mật nên chỉ mở màn hình chính (chưa hỗ trợ web tự động điền lệnh chuyển). Để kẹp thông tin chuẩn xác nhất:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[var(--kv-text)] font-body text-[11px] sm:text-xs">
                  <li>
                    <strong>Cách 1 (Quét QR tiện nhất):</strong> Bấm nút <strong>Lưu Mã QR Vào Máy</strong> ở trên &gt; mở app {selectedBank?.shortName} &gt; chọn <strong>Quét mã QR từ Thư viện ảnh</strong>.
                  </li>
                  <li>
                    <strong>Cách 2 (Chuyển khoản thường):</strong> Mở app &gt; chuyển đến <strong>{bankDisplay}</strong>, STK <code className="font-mono font-bold bg-white px-1 rounded">{accountNumber}</code> và dán nội dung <code className="font-mono font-bold bg-white px-1 text-[var(--color-number)] rounded">{payment.code}</code> (hệ thống đã sao chép sẵn).
                  </li>
                </ul>
              </div>
            )}

            {/* Lưới chọn nhanh ngân hàng phổ biến (Quick Bank Selector) */}
            <div className="pt-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="kv-dot bg-[var(--kv-orange)]" />
                <p className="text-xs font-bold text-[var(--kv-ink)] uppercase tracking-wider font-display">
                  Chọn ứng dụng ngân hàng hoặc ví bạn đang dùng:
                </p>
              </div>

              <div className="mb-2.5 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 font-body leading-relaxed">
                💡 <strong>Lưu ý:</strong> Tự động điền sẵn thông tin chỉ hỗ trợ trên một số ngân hàng có nhãn <strong className="text-green-700 bg-green-100 px-1 rounded font-bold">⚡ Tự điền</strong> (MB, VietinBank, BIDV, ACB, OCB). Các ngân hàng còn lại có nhãn <strong className="text-amber-800 bg-amber-100 px-1 rounded font-bold">📷 Quét QR</strong> yêu cầu bấm <strong>"Lưu Mã QR Vào Máy"</strong> để quét từ Thư viện ảnh.
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
                {VIETNAM_BANKS.map((bank) => {
                  const isSelected = selectedBankApp === bank.appCode;
                  return (
                    <button
                      key={bank.appCode}
                      type="button"
                      onClick={() => openBankDeeplink(bank.appCode)}
                      className={`p-2 sm:p-2.5 rounded-2xl border transition-all flex flex-col items-center justify-between text-center group active:scale-95 min-h-[76px] ${
                        isSelected
                          ? 'border-[var(--kv-pink)] bg-[#FFF5F9] ring-2 ring-[var(--kv-pink)]/40 shadow-xs'
                          : 'border-[var(--color-border)] bg-white hover:border-[var(--kv-pink)] hover:bg-[#FFF5F9] hover:shadow-xs'
                      }`}
                    >
                      <div className="h-7 w-full flex items-center justify-center">
                        <img
                          src={bank.logo}
                          alt={bank.shortName}
                          className="max-h-6 max-w-[85%] object-contain group-hover:scale-110 transition-transform"
                          loading="lazy"
                        />
                      </div>
                      <span
                        className="text-[11px] font-black font-display tracking-tight leading-tight line-clamp-1 mt-1"
                        style={{ color: bank.color }}
                      >
                        {bank.shortName}
                      </span>
                      <span
                        className={`text-[9px] font-bold font-display px-1.5 py-0.5 rounded-md mt-0.5 ${
                          bank.supportsAutofill
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {bank.supportsAutofill ? '⚡ Tự điền' : '📷 Quét QR'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* KHỐI MÃ VIETQR VECTOR THÔNG MINH - LUÔN HIỂN THỊ */}
          <div className="bg-[var(--kv-paper)] rounded-3xl border border-[var(--color-border)] p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[var(--kv-ink)]" />
                <span className="font-display font-bold text-xs sm:text-sm text-[var(--kv-ink)]">
                  Mã VietQR Quét Nhanh Bằng Camera / App Ngân Hàng
                </span>
              </div>
              <span className="kv-pill bg-[var(--kv-green-bg)] text-[var(--kv-green-fg)] text-[10px] font-bold">
                Tương thích 100% ngân hàng & Ví MoMo
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-[var(--color-border-strong)] shadow-xs flex flex-col items-center shrink-0">
                {qrSvg ? (
                  <div
                    className="w-48 h-48 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-400 font-display">
                    Đang tạo mã QR…
                  </div>
                )}
                <div className="mt-2.5 flex flex-col items-center gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={handleDownloadQrImage}
                    className="w-full py-2 px-3 rounded-xl bg-[var(--kv-orange)] hover:bg-orange-600 text-white text-xs font-bold font-display flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Lưu mã QR về máy để quét</span>
                  </button>
                  <span className="text-[10px] text-[var(--kv-text-soft)] font-body text-center">
                    Mở app ngân hàng &gt; chọn "Quét QR từ Album"
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-[var(--kv-text)] max-w-xs text-center sm:text-left">
                <p className="font-bold text-[var(--kv-ink)] font-display text-sm">
                  📱 Quét mã QR trực tiếp:
                </p>
                <p className="leading-relaxed font-body">
                  - <strong>Trên máy tính:</strong> Mở app ngân hàng bất kỳ trên điện thoại quét trực tiếp mã QR trên màn hình.<br />
                  - <strong>Trên điện thoại:</strong> Bấm <strong>Lưu mã QR về máy</strong>, sau đó mở app ngân hàng chọn <strong>Quét QR từ Thư viện ảnh</strong> (Mã đối soát đã được sao chép sẵn).
                </p>
                {payment.checkoutUrl && (
                  <div className="pt-1">
                    <a
                      href={payment.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--kv-pink)] hover:underline font-display"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở cổng ủng hộ PayOS</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KHỐI THÔNG TIN CHUYỂN KHOẢN CHI TIẾT (COPY 1-CLICK) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="kv-dot bg-[var(--kv-ink)]" />
                <h4 className="font-display font-bold text-xs sm:text-sm text-[var(--kv-ink)] uppercase tracking-wider">
                  Thông Tin Chuyển Khoản Thủ Công
                </h4>
              </div>
              <span className="text-[11px] text-[var(--kv-text-soft)] font-hand">
                (Dành cho trường hợp chuyển khoản thông thường)
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {/* Ngân hàng */}
              <div className="p-3.5 rounded-2xl bg-white border border-[var(--color-border)] flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {matchedBank?.logo && (
                    <div className="w-10 h-10 rounded-xl bg-[var(--kv-paper)] border border-[var(--color-border)] p-1 flex items-center justify-center shrink-0">
                      <img
                        src={matchedBank.logo}
                        alt={bankDisplay}
                        className="max-h-7 max-w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] text-[var(--kv-text-soft)] block font-semibold font-display">
                      Ngân hàng thụ hưởng
                    </span>
                    <strong className="text-[var(--kv-ink)] font-extrabold text-sm font-display truncate block">
                      {bankDisplay}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Chủ tài khoản */}
              <div className="p-3.5 rounded-2xl bg-white border border-[var(--color-border)] flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] text-[var(--kv-text-soft)] block font-semibold font-display">
                    Chủ tài khoản
                  </span>
                  <strong className="text-[var(--kv-ink)] font-extrabold text-sm font-display uppercase">
                    {accountName}
                  </strong>
                </div>
              </div>

              {/* Số tài khoản */}
              <div className="p-3.5 rounded-2xl bg-white border border-[var(--color-border)] flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] text-[var(--kv-text-soft)] block font-semibold font-display">
                    Số tài khoản
                  </span>
                  <code className="text-base font-black font-mono text-[var(--kv-ink)]">
                    {accountNumber}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(accountNumber, 'stk')}
                  className="px-3 py-1.5 rounded-xl bg-[var(--kv-paper)] hover:bg-[var(--kv-pink-bg)] hover:text-[var(--kv-pink-fg)] border border-[var(--color-border)] text-xs font-bold font-display text-[var(--kv-text)] flex items-center gap-1.5 transition-all"
                >
                  {copiedField === 'stk' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'stk' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* Số tiền */}
              <div className="p-3.5 rounded-2xl bg-white border border-[var(--color-border)] flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] text-[var(--kv-text-soft)] block font-semibold font-display">
                    Số tiền
                  </span>
                  <strong className="text-base font-black text-[var(--color-number)] font-display">
                    {payment.amount.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(payment.amount), 'amount')}
                  className="px-3 py-1.5 rounded-xl bg-[var(--kv-paper)] hover:bg-[var(--kv-pink-bg)] hover:text-[var(--kv-pink-fg)] border border-[var(--color-border)] text-xs font-bold font-display text-[var(--kv-text)] flex items-center gap-1.5 transition-all"
                >
                  {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'amount' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            {/* Nội dung chuyển khoản - Nổi bật nhất với sắc vàng hoàng yến */}
            <div className="p-4 rounded-2xl bg-[#FFF7D9] border-2 border-[#F7C948] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-[#6B5200] uppercase tracking-wider block font-display">
                  Nội dung chuyển khoản (Bắt buộc giữ nguyên để đối soát tự động):
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <code className="text-lg font-black font-mono text-[#6B5200] tracking-wider">
                    {payment.code}
                  </code>
                  <span className="text-[11px] text-[#8C6D00] font-hand">
                    (hoặc <strong className="font-mono">{payment.code.replace(/[^a-zA-Z0-9]/g, '')}</strong> nếu app ngân hàng cấm dấu gạch nối)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(payment.code, 'memo')}
                className="kv-btn kv-btn--primary text-xs py-2 px-4 shadow-sm self-start sm:self-auto shrink-0"
              >
                {copiedField === 'memo' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedField === 'memo' ? 'Đã chép mã!' : 'Sao chép nội dung'}</span>
              </button>
            </div>
          </div>

          {/* NÚT XÁC NHẬN KIỂM TRA GIAO DỊCH */}
          <div className="p-4 rounded-2xl sm:rounded-3xl bg-[var(--kv-green-bg)] border border-[var(--kv-green)]/40 space-y-3 text-center">
            {checkMessage && (
              <div className="p-3 rounded-xl bg-white border border-amber-200 text-amber-800 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{checkMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-center">
              <button
                type="button"
                disabled={checking}
                onClick={handleManualCheck}
                className="kv-btn kv-btn--secondary text-xs sm:text-sm py-2.5 px-6 border-[var(--kv-green)] text-[var(--kv-green-fg)] hover:bg-white transition-all shadow-xs disabled:opacity-50 inline-flex items-center gap-2 font-display font-bold"
              >
                {checking ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[var(--kv-green)]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{checking ? 'Đang kiểm tra...' : 'Tôi đã chuyển tiền xong (Kiểm tra ngay)'}</span>
              </button>
            </div>
          </div>

          {/* Chân modal bảo mật & cảm ơn */}
          <div className="space-y-1.5 pt-1 text-center">
            {onNewDonation && (
              <div className="pb-1">
                <button
                  type="button"
                  onClick={onNewDonation}
                  className="text-xs font-display font-semibold text-[var(--kv-text-soft)] hover:text-[var(--kv-pink)] underline transition-colors"
                >
                  Muốn thay đổi số lượng hoặc tạo mã ủng hộ mới? Bấm vào đây
                </button>
              </div>
            )}
            <p className="text-[11px] text-[var(--kv-text-soft)] flex items-center justify-center gap-1.5 font-body">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--kv-green)]" />
              <span>Giao dịch an toàn, bảo mật dữ liệu và tự động ghi nhận minh bạch vào quỹ Kết Vòng.</span>
            </p>
            <p className="font-hand text-sm text-[var(--kv-pink-fg)] flex items-center justify-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-[var(--kv-pink)] text-[var(--kv-pink)] inline" />
              <span>Cảm ơn tấm lòng của bạn dành cho các em nhỏ tại Ngôi nhà chung Ba Thùy!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
