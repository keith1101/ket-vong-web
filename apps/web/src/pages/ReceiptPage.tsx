import React, { useState, useEffect } from 'react';
import { fetchDonationStatus, verifyReceipt, API_BASE, apiFetch } from '../api';
import {
  Heart,
  Download,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Printer,
  Copy,
  Check,
  Share2,
  Sparkles,
  QrCode,
} from 'lucide-react';

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
  const [downloading, setDownloading] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    // JS đọc fragment #access=<token> (không bao giờ gửi lên server qua URL)
    const hash = window.location.hash;
    const match = hash.match(/access=([a-f0-9]+)/i);

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

  const copyToClipboard = (text: string, type: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Thư Cảm Ơn — Dự Án Workshop Kết Vòng',
          text: `Tôi vừa đồng hành ủng hộ ${receiptData?.quantity || 1} chiếc vòng tay cùng các em nhỏ tại Workshop Kết Vòng!`,
          url: window.location.href,
        });
      } catch {
        // người dùng hủy chia sẻ
      }
    } else {
      copyToClipboard(window.location.href, 'link');
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

  const downloadLetterPng = async () => {
    if (!token) {
      setErrorMsg('Thiếu liên kết bảo mật hợp lệ để tải thư cảm ơn.');
      return;
    }
    setDownloading(true);
    try {
      const letterEndpoint = `${API_BASE}/receipts/${encodeURIComponent(code)}/letter`;
      const response = await apiFetch(letterEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error?.message || 'Không thể tải tệp thư cảm ơn từ máy chủ.');
      }
      const svgText = await response.text();
      if (!svgText.includes('<svg')) {
        throw new Error('Dữ liệu thư cảm ơn trả về từ máy chủ không hợp lệ.');
      }

      // Loại bỏ @import url bên ngoài để tránh trình duyệt chặn cross-origin / tainted canvas
      const cleanSvgText = svgText.replace(/@import\s+url\([^)]+\);?/gi, '').trim();
      const svgBlob = new Blob([cleanSvgText], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      try {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Trình duyệt không thể dựng hình từ SVG.'));
          image.src = svgUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = 1240;
        canvas.height = 1754;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D.');

        ctx.fillStyle = '#fffdf9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(svgUrl);

        const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!pngBlob) throw new Error('Không thể tạo tệp PNG.');

        // Kiểm tra hỗ trợ chia sẻ/lưu ảnh trực tiếp trên thiết bị di động (iOS / Android)
        if (typeof navigator !== 'undefined' && navigator.canShare && typeof navigator.share === 'function') {
          try {
            const pngFile = new File([pngBlob], `Thu-Cam-On-${code}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [pngFile] })) {
              await navigator.share({
                files: [pngFile],
                title: 'Thư Cảm Ơn Kết Vòng',
                text: `Thư cảm ơn đóng góp thiện nguyện dự án Kết Vòng (Mã ${code})`,
              });
              return;
            }
          } catch {
            // Người dùng đóng menu share hoặc trình duyệt từ chối share file -> tiếp tục tải dạng file thông thường
          }
        }

        const downloadUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `Thu-Cam-On-${code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
      } catch (canvasErr) {
        console.warn('Lỗi kết xuất Canvas PNG, tự động chuyển sang tải file Vector SVG:', canvasErr);
        // Fallback an toàn tuyệt đối: tải trực tiếp file SVG chất lượng cao
        const rawBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const downloadUrl = URL.createObjectURL(rawBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `Thu-Cam-On-${code}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Không thể tải thư cảm ơn. Vui lòng thử lại.');
    } finally {
      setDownloading(false);
    }
  };

  const downloadLetterSvg = async () => {
    if (!token) {
      setErrorMsg('Thiếu liên kết bảo mật hợp lệ để tải thư cảm ơn.');
      return;
    }
    setDownloading(true);
    try {
      const letterEndpoint = `${API_BASE}/receipts/${encodeURIComponent(code)}/letter`;
      const response = await apiFetch(letterEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error?.message || 'Không thể tải tệp thư cảm ơn từ máy chủ.');
      }
      const svgText = await response.text();
      const rawBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(rawBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Thu-Cam-On-${code}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    } catch (error: any) {
      setErrorMsg(error.message || 'Không thể tải thư cảm ơn. Vui lòng thử lại.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Thanh điều hướng và hành động trên */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)] transition-colors min-h-touch font-display"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang chủ</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadLetterPng}
            disabled={downloading}
            className="kv-btn kv-btn--primary px-4 py-2.5 text-xs shadow-sm"
            title="Lưu ảnh Thư Cảm Ơn dạng PNG độ phân giải cao"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Đang tạo ảnh…' : 'Lưu Thư Cảm Ơn (PNG)'}</span>
          </button>

          <button
            type="button"
            onClick={downloadLetterSvg}
            disabled={downloading}
            className="kv-btn kv-btn--secondary px-4 py-2.5 text-xs shadow-xs"
            title="Tải tệp vector SVG sắc nét dùng để in ấn"
          >
            <Download className="w-4 h-4 text-[var(--kv-ink)]" />
            <span>Bản in (SVG)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="kv-btn kv-btn--secondary px-4 py-2.5 text-xs shadow-xs"
          >
            <Printer className="w-4 h-4 text-[var(--kv-ink)]" />
            <span>In Thư</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white hover:bg-[var(--kv-blue-bg)] border border-[var(--color-border)] text-[var(--kv-ink)] text-xs font-semibold transition-all min-h-touch font-display"
            title="Chia sẻ hoặc sao chép liên kết thư cảm ơn"
          >
            {copiedType === 'link' ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4 text-[var(--kv-ink)]" />}
            <span>{copiedType === 'link' ? 'Đã chép link' : 'Chia sẻ'}</span>
          </button>
        </div>
      </div>

      {/* KHỐI THƯ CẢM ƠN THIẾT KẾ THEO TÔNG GIẤY KEM CRAYON */}
      <div className="bg-[var(--kv-paper)] rounded-3xl border-2 border-[var(--color-border-strong)] shadow-lg p-6 sm:p-12 text-center relative overflow-hidden transition-all">
        {/* Họa tiết hạt cườm 4 góc theo màu Crayon */}
        <div className="absolute top-4 left-4 flex gap-1.5 opacity-80 pointer-events-none">
          <span className="w-3 h-3 rounded-full bg-[var(--kv-pink)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--kv-yellow)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--kv-green)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--kv-ink)]" />
        </div>
        <div className="absolute top-4 right-4 flex gap-1.5 opacity-80 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-[var(--kv-ink)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--kv-green)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--kv-yellow)]" />
          <span className="w-3 h-3 rounded-full bg-[var(--kv-pink)]" />
        </div>

        {/* Khung viền đứt nét thủ công bên trong */}
        <div className="border border-dashed border-[var(--color-border-strong)] rounded-2xl p-6 sm:p-10 relative bg-white/80 backdrop-blur-[2px]">
          {/* Băng dán phong cách Washi Tape */}
          <div className="inline-flex items-center gap-2 px-6 py-1.5 rounded-full bg-[var(--kv-blue-bg)] border border-[var(--kv-blue-fg)]/20 shadow-xs text-[var(--kv-blue-fg)] font-display font-extrabold text-xs uppercase tracking-widest -mt-10 sm:-mt-14 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workshop Thiện Nguyện Kết Vòng</span>
          </div>

          {/* Biểu tượng trái tim hạt cườm */}
          <div className="w-16 h-16 rounded-full bg-[var(--kv-pink-bg)] border-2 border-[var(--kv-pink)]/30 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Heart className="w-8 h-8 text-[var(--kv-pink)] fill-[var(--kv-pink)] animate-pulse" />
          </div>

          {/* Tiêu đề thư cảm ơn */}
          <h1 className="font-display font-black text-3xl sm:text-5xl text-[var(--kv-ink)] tracking-wide">
            THƯ CẢM ƠN
          </h1>
          <p className="font-display font-bold text-xs sm:text-sm text-[var(--kv-text-soft)] tracking-[0.25em] uppercase mt-1 mx-auto text-center">
            CHỨNG NHẬN ĐÓNG GÓP THIỆN NGUYỆN
          </p>

          {/* Dải phân cách hạt cườm */}
          <div className="flex items-center justify-center gap-2 my-5">
            <span className="h-0.5 w-16 sm:w-28 bg-[var(--color-border)]" />
            <span className="w-2 h-2 rounded-full bg-[var(--kv-pink)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--kv-yellow)]" />
            <span className="w-3 h-3 rounded-full bg-[var(--kv-ink)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--kv-green)]" />
            <span className="w-2 h-2 rounded-full bg-[var(--kv-sky)]" />
            <span className="h-0.5 w-16 sm:w-28 bg-[var(--color-border)]" />
          </div>

          {/* Vinh danh người ủng hộ */}
          <div className="space-y-1 mb-5">
            <p className="text-xs sm:text-sm font-bold text-[var(--kv-text-soft)] uppercase tracking-wider font-display mx-auto text-center">
              Trân trọng tri ân tấm lòng vàng của
            </p>
            <h2 className="font-display font-black text-2xl sm:text-4xl text-[var(--kv-ink)]">
              {receiptData.title} {receiptData.display_name}
            </h2>
          </div>

          {/* Khung số tiền nổi bật */}
          <div className="my-5 inline-block">
            <div className="px-6 sm:px-10 py-3 sm:py-4 rounded-full bg-[var(--kv-pink)] text-white font-display font-black text-xl sm:text-3xl shadow-lg shadow-[var(--kv-pink)]/25 tracking-wide">
              ĐÃ CHUNG TAY ỦNG HỘ {receiptData.amount.toLocaleString('vi-VN')} VNĐ
            </div>
            <p className="text-xs sm:text-sm font-bold text-[var(--color-number)] mt-2 font-display">
              (Tương ứng {receiptData.quantity} chiếc vòng tay yêu thương gửi trao)
            </p>
          </div>

          {/* Tag mã định danh và ngày */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 my-4 text-xs font-mono">
            <span className="px-3.5 py-1.5 rounded-full bg-[var(--kv-paper)] border border-[var(--color-border)] text-[var(--kv-text)] font-bold">
              MÃ ỦNG HỘ: <strong className="text-[var(--color-number)] font-extrabold">{receiptData.code}</strong>
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-[var(--kv-paper)] border border-[var(--color-border)] text-[var(--kv-text-soft)]">
              NGÀY XÁC NHẬN: <strong>{dateStr}</strong>
            </span>
          </div>

          {/* Nội dung thư cảm ơn */}
          <div className="max-w-xl mx-auto my-6 text-sm sm:text-base leading-relaxed text-[var(--kv-text)] text-center font-body space-y-3">
            <p>
              Ban tổ chức Dự án Workshop Kết Vòng xin chân thành cảm ơn sự sẻ chia ấm áp và tấm lòng nhân ái của{' '}
              <strong className="text-[var(--kv-ink)]">{receiptData.title} {receiptData.display_name}</strong>.
            </p>
            <p className="text-[var(--kv-text-soft)] text-xs sm:text-sm">
              Mỗi chiếc vòng tay thủ công được xâu kết hôm nay là một nhịp cầu yêu thương gửi trao, góp phần mang đến niềm vui, nụ cười và thắp sáng niềm tin hy vọng cho các em nhỏ đang điều trị.
            </p>
          </div>

          {/* Khẩu hiệu workshop */}
          <div className="max-w-lg mx-auto p-3 sm:p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] text-[var(--kv-pink)] font-display italic font-bold text-xs sm:text-sm my-6">
            “Mỗi hạt cườm gửi trao — Một nhịp cầu yêu thương kết nối”
          </div>

          {/* Phần chân thư: QR Code, Con dấu, Chữ ký */}
          <div className="pt-6 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            {/* Khung QR Code */}
            <div className="flex flex-col items-center">
              <div className="p-2 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] shadow-xs">
                {receiptData.qr_svg ? (
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: receiptData.qr_svg }}
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center bg-white rounded-xl">
                    <QrCode className="w-16 h-16 text-[var(--kv-text-soft)]" />
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold text-[var(--kv-ink)] uppercase tracking-wider mt-2 font-display">
                Quét mã đối chiếu
              </span>
              <span className="text-[10px] text-[var(--kv-text-soft)] font-body">
                Xác thực tại ketvong.vn
              </span>
            </div>

            {/* Con dấu tròn đỏ chứng nhận đối soát */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-red-500/80 p-1 flex items-center justify-center -rotate-6">
                <div className="w-full h-full rounded-full border border-red-500/80 flex flex-col items-center justify-center text-red-600 bg-red-50/40">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider">Dự Án Kết Vòng</span>
                  <div className="w-3.5 h-3.5 my-0.5 text-red-600">★</div>
                  <span className="text-[9px] font-extrabold uppercase leading-tight">ĐÃ ĐỐI SOÁT</span>
                  <span className="text-[7px] font-semibold text-red-500">NGHỊ ĐỊNH 93</span>
                </div>
              </div>
              <span className="text-[10px] text-red-600 font-semibold mt-1 font-display">Đã kiểm toán minh bạch</span>
            </div>

            {/* Chữ ký Ban tổ chức */}
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
              <span className="text-xs font-bold text-[var(--kv-ink)] uppercase tracking-wider font-display">
                Đại diện Ban Tổ Chức
              </span>
              <span className="text-[11px] text-[var(--kv-text-soft)] italic mb-1 font-body">
                Dự án Workshop Kết Vòng
              </span>
              {/* Chữ ký đồ họa cách điệu */}
              <div className="h-10 flex items-center justify-center sm:justify-end my-1 opacity-80">
                <svg width="120" height="36" viewBox="0 0 120 36" fill="none">
                  <path d="M10 24 Q35 8 55 26 T95 18" stroke="#1F3F9E" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M25 30 Q50 16 85 28" stroke="#D81B7A" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-display font-extrabold text-sm text-[var(--kv-ink)]">
                Nguyễn Thanh Trúc
              </span>
              <span className="text-[11px] text-[var(--kv-text-soft)] font-body">
                Trưởng Ban Tổ Chức Dự Án
              </span>
            </div>
          </div>

          {/* Dòng ghi chú chân thư */}
          <div className="mt-8 pt-4 border-t border-[var(--color-border)] text-[11px] text-[var(--kv-text-soft)] space-y-1 font-body">
            <p>Workshop Dự Án Sinh Viên SSG105 • Đại học FPT TP.HCM • Ngày tổ chức: 24/10/2026</p>
            <p className="text-[10px]">
              Tuân thủ quy chế vận động thiện nguyện Nghị định 93/2021/NĐ-CP &amp; Bảo vệ dữ liệu Nghị định 13/2023/NĐ-CP
            </p>
          </div>
        </div>
      </div>

      {/* Thanh nút tải ảnh & in ấn tiện lợi ngay dưới Thư Cảm Ơn */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-1">
        <button
          type="button"
          onClick={downloadLetterPng}
          disabled={downloading}
          className="kv-btn kv-btn--primary px-6 py-3 text-xs sm:text-sm shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Đang tạo ảnh…' : 'Lưu Thư Cảm Ơn (Ảnh PNG)'}</span>
        </button>

        <button
          type="button"
          onClick={downloadLetterSvg}
          disabled={downloading}
          className="kv-btn kv-btn--secondary px-5 py-3 text-xs sm:text-sm shadow-xs"
        >
          <Download className="w-4 h-4 text-[var(--kv-ink)]" />
          <span>Tải Vector (SVG)</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="kv-btn kv-btn--secondary px-5 py-3 text-xs sm:text-sm shadow-xs"
        >
          <Printer className="w-4 h-4 text-[var(--kv-ink)]" />
          <span>In Thư</span>
        </button>
      </div>

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
