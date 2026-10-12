import React, { useEffect, useState } from 'react';
import { Mail, Phone, ShieldCheck, MapPin, HelpCircle, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchFundSummary } from '../api';
import type { FundSummary } from '../types';

type InfoKind = 'contact' | 'privacy';

export const InfoPage: React.FC<{ kind: InfoKind }> = ({ kind }) => {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFundSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  const contactEmail = summary?.contact_email || 'vongtayganket2006@gmail.com';
  const contactPhone = summary?.contact_phone || '0919 670 831';

  if (kind === 'contact') {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="kv-pill bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 font-display">
            <Mail className="w-3.5 h-3.5 text-[var(--kv-ink)]" />
            <span>Kênh hỗ trợ trực tiếp</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[var(--kv-ink)]">
            Thông Tin Liên Hệ
          </h1>
          <p className="text-sm text-[var(--kv-text-soft)] leading-relaxed font-body max-w-xl mx-auto text-center">
            Ban tổ chức luôn sẵn sàng hỗ trợ, giải đáp thắc mắc và tiếp nhận các yêu cầu đối chiếu giao dịch từ quý vị hảo tâm.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hộp liên hệ */}
          <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="font-display font-bold text-lg text-[var(--kv-ink)] flex items-center gap-2">
              <Phone className="w-5 h-5 text-[var(--kv-pink)]" />
              <span>Kênh Tiếp Nhận Thông Tin</span>
            </h2>

            <div className="space-y-4 text-xs sm:text-sm font-body">
              <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
                <span className="text-[var(--kv-text-soft)] block text-xs font-display">Hòm thư điện tử (Email)</span>
                <a href={`mailto:${contactEmail}`} className="font-bold text-[var(--kv-pink)] text-base hover:underline font-display">
                  {contactEmail}
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
                <span className="text-[var(--kv-text-soft)] block text-xs font-display">Số điện thoại / Zalo hỗ trợ</span>
                <a href={`tel:${contactPhone.replace(/\s+/g, '')}`} className="font-bold text-[var(--kv-text)] text-base hover:text-[var(--kv-pink)] font-display transition-colors">
                  {contactPhone}
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] space-y-1">
                <span className="text-[var(--kv-text-soft)] block text-xs font-display">Địa điểm tổ chức workshop</span>
                <span className="font-semibold text-[var(--kv-text)] block font-display">
                  Ngôi nhà chung Ba Thùy
                </span>
                <span className="text-xs text-[var(--kv-text-soft)] block">
                  (Nơi tạm trú của các bệnh nhi ung thư từ các tỉnh về điều trị)
                </span>
              </div>
            </div>
          </div>

          {/* Hướng dẫn đối chiếu giao dịch */}
          <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-8 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg text-[var(--kv-ink)] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[var(--kv-orange)]" />
                <span>Hỗ Trợ Đối Chiếu Giao Dịch</span>
              </h2>

              <p className="text-xs sm:text-sm text-[var(--kv-text-soft)] leading-relaxed font-body">
                Nếu bạn gặp phải một trong các trường hợp sau, vui lòng nhắn tin hoặc gửi email kèm ảnh chụp biên lai ngân hàng:
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-[var(--kv-text)]/90 font-body">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--kv-pink)] shrink-0 mt-0.5" />
                  <span>Quên ghi hoặc ghi chưa đúng mã <code className="bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] px-1.5 py-0.5 rounded font-mono font-bold">KV-XXXXXX</code> trong nội dung ủng hộ.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--kv-pink)] shrink-0 mt-0.5" />
                  <span>Chuyển lệch số tiền so với số lượng vòng tay đã đăng ký ban đầu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--kv-pink)] shrink-0 mt-0.5" />
                  <span>Cần hỗ trợ nhận lại link thư cảm ơn hoặc yêu cầu xóa dữ liệu cá nhân.</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--kv-blue-bg)]/60 border border-[var(--kv-blue-fg)]/20 text-xs text-[var(--kv-blue-fg)] font-body">
              Ban tổ chức sẽ kiểm tra đối chiếu qua sổ phụ ngân hàng và phản hồi trong vòng 24 giờ.
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Trang Chính sách bảo mật (/chinh-sach-bao-mat)
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="kv-pill bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 font-display">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--kv-ink)]" />
          <span>Tuân thủ pháp luật</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[var(--kv-ink)]">
          Chính Sách Bảo Mật Dữ Liệu
        </h1>
        <p className="text-sm text-[var(--kv-text-soft)] font-body max-w-xl mx-auto text-center">
          Cam kết bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP
        </p>
      </div>

      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 shadow-sm space-y-6 text-sm leading-relaxed text-[var(--kv-text)] font-body">
        <div className="space-y-3">
          <h2 className="font-display font-bold text-lg text-[var(--kv-ink)]">
            1. Nguyên Tắc Thu Thập Dữ Liệu
          </h2>
          <p className="text-[var(--kv-text-soft)]">
            Dự án Kết Vòng tôn trọng tuyệt đối quyền riêng tư của mọi cá nhân đóng góp. Chúng tôi chỉ thu thập các thông tin tối thiểu cần thiết phục vụ mục đích vận động thiện nguyện, bao gồm: Họ tên / Tên hiển thị, Địa chỉ Email và Số điện thoại (tùy chọn).
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-display font-bold text-lg text-[var(--kv-ink)]">
            2. Mục Đích Sử Dụng Dữ Liệu
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-[var(--kv-text-soft)] pl-2">
            <li>Cấp mã quyên góp duy nhất để tự động đối chiếu với giao dịch ủng hộ.</li>
            <li>Gửi biên nhận điện tử và Thư cảm ơn đến địa chỉ email của người đóng góp.</li>
            <li>Liên hệ đối chiếu trong trường hợp có sai sót về số tiền hoặc nội dung ủng hộ.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="font-display font-bold text-lg text-[var(--kv-ink)]">
            3. Bảo Mật Thông Tin Cá Nhân &amp; Công Khai Minh Bạch
          </h2>
          <p className="text-[var(--kv-text-soft)]">
            Theo tiêu chuẩn an toàn thông tin: <strong>Tuyệt đối không có bất kỳ thông tin số điện thoại, email hay nội dung giao dịch thô nào được xuất hiện trên bảng minh bạch công khai</strong>.
          </p>
          <p className="text-[var(--kv-text-soft)]">
            Bảng minh bạch chỉ hiển thị: Tên hiển thị (hoặc &quot;Ẩn danh&quot; nếu người ủng hộ chọn ẩn danh), Số tiền đóng góp và Thời gian giao dịch được duyệt.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-display font-bold text-lg text-[var(--kv-ink)]">
            4. Quyền Yêu Cầu Xóa Dữ Liệu Cá Nhân
          </h2>
          <p className="text-[var(--kv-text-soft)]">
            Người ủng hộ có quyền yêu cầu Ban tổ chức xóa toàn bộ dữ liệu cá nhân (email, số điện thoại, tên) khỏi hệ thống bất cứ lúc nào. Khi dữ liệu được xóa, khoản đóng góp trên bảng minh bạch sẽ chuyển vĩnh viễn sang trạng thái &quot;Ẩn danh&quot; để bảo lưu tính chính xác của tổng quỹ.
          </p>
          <div className="p-4 rounded-2xl bg-[var(--kv-paper)] border border-[var(--color-border)] mt-2">
            <span>Để yêu cầu xóa dữ liệu, vui lòng gửi email về: </span>
            <a href={`mailto:${contactEmail}`} className="font-bold text-[var(--kv-pink)] hover:underline font-display">
              {contactEmail}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
