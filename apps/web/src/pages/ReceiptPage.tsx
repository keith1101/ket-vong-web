import React, { useState, useEffect } from 'react';
import { verifyReceipt } from '../api';
import { Heart, Download, CheckCircle2, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

interface ReceiptPageProps {
  code: string;
  navigate: (path: string) => void;
}

export const ReceiptPage: React.FC<ReceiptPageProps> = ({ code, navigate }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [token, setToken] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // SRS-040: JS đọc fragment #access=<token> (không bao giờ gửi lên server qua URL)
    const hash = window.location.hash;
    const match = hash.match(/access=([a-f0-9]+)/i);

    if (!match || !match[1]) {
      setErrorMsg('Không tìm thấy mã truy cập biên nhận (access token). Vui lòng kiểm tra lại đường dẫn từ email cảm ơn.');
      setLoading(false);
      return;
    }

    const extractedToken = match[1];
    setToken(extractedToken);

    // Gửi token trong body POST /receipts/verify
    verifyReceipt(code, extractedToken)
      .then((data) => setReceiptData(data))
      .catch((err) => {
        // SRS-040: 404 chung chung
        setErrorMsg('Không tìm thấy biên nhận hợp lệ hoặc liên kết không chính xác.');
      })
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-brand-textMuted">Đang xác thực biên nhận...</p>
      </div>
    );
  }

  if (errorMsg || !receiptData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-8 bg-white rounded-3xl border border-brand-border shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-display font-extrabold text-2xl text-brand-text mb-2">
            Không Thể Tải Biên Nhận
          </h2>
          <p className="text-sm text-brand-textMuted mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-2xl bg-brand-orange text-white font-bold text-sm min-h-touch"
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

  const letterDownloadUrl = `/api/v1/receipts/${code}/letter?token=${token}`;

  const downloadLetterPng = async () => {
    setDownloading(true);
    try {
      const response = await fetch(letterDownloadUrl);
      if (!response.ok) throw new Error('Không thể tải thư cảm ơn.');
      const svgText = await response.text();
      const svgUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      const image = new Image();
      image.src = svgUrl;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Không thể dựng ảnh thư cảm ơn.')); });
      const canvas = document.createElement('canvas');
      canvas.width = 1240;
      canvas.height = 1754;
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!png) throw new Error('Không thể tạo tệp PNG.');
      const downloadUrl = URL.createObjectURL(png);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Thu-Cam-On-${code}.png`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      setErrorMsg(error.message || 'Không thể tải thư cảm ơn. Vui lòng thử lại.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-xs font-bold text-brand-textMuted hover:text-brand-orange mb-6 min-h-touch"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại trang chủ</span>
      </button>

      {/* Card Biên Nhận */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-border shadow-sm mb-8">
        <div className="text-center pb-6 border-b border-brand-border/60 mb-6">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <span className="text-xs uppercase tracking-wider font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full">
            Đã Xác Nhận Thành Công
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-brand-text mt-3">
            Biên Nhận Ủng Hộ
          </h1>
          <p className="text-xs text-brand-textMuted mt-1">
            Mã định danh: <span className="font-mono font-bold text-brand-orange">{receiptData.code}</span>
          </p>
        </div>

        {/* Thông tin biên nhận */}
        <div className="space-y-4 text-sm mb-8">
          <div className="flex justify-between py-2 border-b border-brand-border/40">
            <span className="text-brand-textMuted">Người ủng hộ:</span>
            <span className="font-bold text-brand-text">
              {receiptData.title} {receiptData.display_name}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-brand-border/40">
            <span className="text-brand-textMuted">Số tiền đóng góp:</span>
            <span className="font-display font-extrabold text-xl text-brand-orange">
              {receiptData.amount.toLocaleString('vi-VN')} VNĐ
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-brand-border/40">
            <span className="text-brand-textMuted">Số lượng vòng tay:</span>
            <span className="font-semibold text-brand-text">{receiptData.quantity} chiếc</span>
          </div>

          <div className="flex justify-between py-2 border-b border-brand-border/40">
            <span className="text-brand-textMuted">Thời gian xác nhận:</span>
            <span className="font-medium text-brand-text">{dateStr}</span>
          </div>

        </div>

        {/* Nút tải Thư Cảm Ơn PNG (SRS-041) */}
        <div className="p-6 rounded-2xl bg-brand-accent border border-brand-orange/20 text-center">
          <Heart className="w-8 h-8 text-brand-orange fill-brand-orange mx-auto mb-2" />
          <h3 className="font-display font-bold text-lg text-brand-text mb-1">
            Thư Cảm Ơn Tri Ân Tấm Lòng Vàng
          </h3>
          <p className="text-xs text-brand-textMuted max-w-md mx-auto mb-4">
            Ban tổ chức đã tạo sẵn Thư cảm ơn trang trọng khổ dọc (độ phân giải cao ≥1240px) có đắp mã QR quét trực tiếp để bạn lưu làm kỷ niệm.
          </p>

          <button
            type="button"
            onClick={downloadLetterPng}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orangeHover text-white font-display font-bold text-base shadow-lg shadow-brand-orange/25 transition-all min-h-touch"
          >
            <Download className="w-5 h-5" />
            <span>{downloading ? 'Đang tạo tệp PNG…' : 'Tải thư cảm ơn PNG (1240px)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

