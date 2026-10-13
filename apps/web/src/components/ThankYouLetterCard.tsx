import React, { useState } from 'react';
import { Download, Printer, Share2, Check, ArrowLeft, ExternalLink } from 'lucide-react';
import { API_BASE, apiFetch } from '../api';

export interface ThankYouLetterCardProps {
  code: string;
  title?: string;
  displayName: string;
  amount: number;
  quantity: number;
  dateStr?: string;
  token?: string;
  showActions?: boolean;
  onNavigateHome?: () => void;
  onViewReceipt?: () => void;
}

export const ThankYouLetterCard: React.FC<ThankYouLetterCardProps> = ({
  code,
  title = 'Bạn',
  displayName,
  amount,
  quantity,
  dateStr,
  token,
  showActions = true,
  onNavigateHome,
  onViewReceipt,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const formattedDate = dateStr || new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedAmount = `${amount.toLocaleString('vi-VN')}đ`;

  // Tải ảnh PNG độ nét cao (1446 x 2048 px) qua Canvas HTML5
  const downloadPng = async () => {
    setDownloading(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Không thể tải phôi thư cảm ơn.'));
        img.src = '/images/thank-you-template-clean.png';
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1446;
      canvas.height = 2048;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D');

      // Vẽ hình nền phôi thư
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2; // 723

      // 1. Tên người hảo tâm (Y: 684, căn giữa tuyệt đối)
      ctx.font = 'bold 56px Nunito, "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#DE833A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayName, centerX, 684);

      // 2. Số tiền ủng hộ (Y: 778, điền sau 'Đã chung tay ủng hộ')
      ctx.font = 'bold 42px Nunito, "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#DE833A';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formattedAmount, 882, 778);

      // 3. Số lượng vòng (Y: 827, điền vào khe giữa '(Tương ứng ' và ' chiếc vòng...')
      ctx.font = 'bold 42px Nunito, "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#DE833A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(quantity), 489, 827);

      // 4. Mã ủng hộ (Y: 879, điền sau 'Mã ủng hộ: ')
      ctx.font = '600 42px Nunito, "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#2c2520';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(code, 604, 879);

      // 5. Ngày xác nhận (Y: 879, điền sau 'Ngày: ')
      ctx.fillText(formattedDate, 954, 879);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Không thể tạo file ảnh PNG');

      // Thử chia sẻ trực tiếp trên điện thoại di động
      if (typeof navigator !== 'undefined' && navigator.canShare && typeof navigator.share === 'function') {
        try {
          const pngFile = new File([blob], `Thu-Cam-On-${code}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [pngFile] })) {
            await navigator.share({
              files: [pngFile],
              title: 'Thư Cảm Ơn Kết Vòng',
              text: `Thư cảm ơn đóng góp thiện nguyện dự án Kết Vòng (Mã ${code})`,
            });
            return;
          }
        } catch {
          // Người dùng đóng menu share hoặc trình duyệt từ chối -> tiếp tục tải dạng file
        }
      }

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Thu-Cam-On-${code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    } catch (err) {
      console.error('Lỗi xuất ảnh PNG:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  // Tải bản in Vector SVG từ backend nếu có token
  const downloadSvg = async () => {
    if (!token) {
      downloadPng();
      return;
    }
    setDownloading(true);
    try {
      const response = await apiFetch(`${API_BASE}/receipts/${encodeURIComponent(code)}/letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Không thể tải bản in từ máy chủ.');
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
    } catch (err) {
      console.warn('Lỗi tải SVG:', err);
      downloadPng();
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const currentUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Thư Cảm Ơn - Dự Án Workshop Kết Vòng',
          text: `Tôi vừa đồng hành ủng hộ ${quantity} chiếc vòng tay cùng các em nhỏ tại Workshop Kết Vòng!`,
          url: currentUrl,
        });
        return;
      } catch {
        // người dùng hủy chia sẻ
      }
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* KHUNG THƯ CẢM ƠN - KHỚP 100% MẪU THIẾT KẾ MỚI */}
      <div className="relative mx-auto max-w-xl sm:max-w-2xl rounded-3xl shadow-xl overflow-hidden border border-[#E8DCC8] bg-[#FAF6EE] select-none">
        {/* Khung bao tỷ lệ 723 / 1024 */}
        <div className="relative w-full aspect-[723/1024]" style={{ containerType: 'inline-size' }}>
          {/* Phôi nền sạch */}
          <img
            src="/images/thank-you-template-clean.png"
            alt="Thư cảm ơn chứng nhận đóng góp thiện nguyện Kết Vòng"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* CÁC TRƯỜNG DỮ LIỆU ĐỘNG ĐIỀN VÀO CÁC Ô TRỐNG CỦA PHÔI */}
          <div className="absolute inset-0 pointer-events-auto">
            {/* 1. Tên người hảo tâm - bold orange, căn giữa tuyệt đối */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] text-center flex items-center justify-center"
              style={{ top: '33.4%' }}
            >
              <h2
                className="font-display font-bold text-[#DE833A] tracking-tight leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] truncate"
                style={{ fontSize: 'clamp(14px, 3.87cqw, 28px)' }}
              >
                {displayName}
              </h2>
            </div>

            {/* 2. Giá trị số tiền - điền tiếp sau chữ "Đã chung tay ủng hộ" */}
            <span
              className="absolute font-display font-bold text-[#DE833A] leading-none whitespace-nowrap -translate-y-1/2"
              style={{
                top: '37.99%',
                left: '61%',
                fontSize: 'clamp(11px, 4cqw, 21px)',
              }}
            >
              {formattedAmount}
            </span>

            {/* 3. Số lượng vòng - điền vào khe giữa "(Tương ứng " và " chiếc vòng..." */}
            <span
              className="absolute font-display font-bold text-[#DE833A] leading-none text-center -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
              style={{
                top: '40.4%',
                left: '33.8%',
                fontSize: 'clamp(11px, 4cqw, 21px)',
              }}
            >
              {quantity}
            </span>

            {/* 4. Mã ủng hộ (9 ký tự KV-XXXXXX) - điền sau "Mã ủng hộ: " */}
            <span
              className="absolute font-display font-semibold text-[#2c2520] leading-none whitespace-nowrap -translate-y-1/2"
              style={{
                top: '42.9%',
                left: '41.77%',
                fontSize: 'clamp(11px, 4cqw, 21px)',
              }}
            >
              {code}
            </span>

            {/* 5. Ngày (DD/MM/YYYY) - điền sau "Ngày: " */}
            <span
              className="absolute font-display font-semibold text-[#2c2520] leading-none whitespace-nowrap -translate-y-1/2"
              style={{
                top: '42.9%',
                left: '65.98%',
                fontSize: 'clamp(11px, 4cqw, 21px)',
              }}
            >
              {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* THANH CÔNG CỤ THAO TÁC TIỆN LỢI */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={downloadPng}
            disabled={downloading}
            className="kv-btn kv-btn--primary px-5 py-2.5 text-xs sm:text-sm shadow-md"
            title="Lưu ảnh Thư Cảm Ơn dạng PNG độ phân giải cao"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Đang tạo ảnh…' : 'Lưu Thư Cảm Ơn (PNG)'}</span>
          </button>

          {token && (
            <button
              type="button"
              onClick={downloadSvg}
              disabled={downloading}
              className="kv-btn kv-btn--secondary px-4 py-2.5 text-xs sm:text-sm shadow-xs"
              title="Tải tệp vector SVG sắc nét dùng để in ấn"
            >
              <Download className="w-4 h-4 text-[var(--kv-ink)]" />
              <span>Bản in (SVG)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="kv-btn kv-btn--secondary px-4 py-2.5 text-xs sm:text-sm shadow-xs"
            title="In thư cảm ơn"
          >
            <Printer className="w-4 h-4 text-[var(--kv-ink)]" />
            <span>In Thư</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-[var(--kv-blue-bg)] border border-[var(--color-border)] text-[var(--kv-ink)] text-xs sm:text-sm font-semibold transition-all min-h-touch font-display shadow-xs"
            title="Chia sẻ hoặc sao chép liên kết thư cảm ơn"
          >
            {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4 text-[var(--kv-ink)]" />}
            <span>{copiedLink ? 'Đã chép link!' : 'Chia sẻ'}</span>
          </button>

          {onViewReceipt && (
            <button
              type="button"
              onClick={onViewReceipt}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--kv-blue-bg)] hover:bg-[var(--kv-blue-bg)]/80 text-[var(--kv-blue-fg)] text-xs sm:text-sm font-bold transition-all min-h-touch font-display"
              title="Xem trang biên nhận điện tử & đối soát sao kê minh bạch"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Xem chi tiết biên nhận</span>
            </button>
          )}

          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-neutral-50 text-[var(--kv-text-soft)] border border-[var(--color-border)] text-xs sm:text-sm font-semibold transition-all min-h-touch font-display"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về trang chủ</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
