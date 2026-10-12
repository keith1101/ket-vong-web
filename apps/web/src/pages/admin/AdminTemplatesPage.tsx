import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle, Mail, FileText } from 'lucide-react';
import { API_BASE, apiFetch } from '../../api';

export const AdminTemplatesPage: React.FC = () => {
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/admin/templates`)
      .then((res) => res.json())
      .then((res) => {
        const rows = res.data || [];
        const emailTpl = rows.find((r: any) => r.key === 'email_thank_you');
        const letterTpl = rows.find((r: any) => r.key === 'letter_thank_you');
        if (emailTpl) {
          setEmailSubject(emailTpl.subject || '');
          setEmailContent(emailTpl.content || '');
        }
        if (letterTpl) {
          setLetterContent(letterTpl.content || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSaveEmail = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiFetch(`${API_BASE}/admin/templates/email_thank_you`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, content: emailContent }),
      });
      if (!res.ok) throw new Error('Không thể lưu template email');
      setMsg({ type: 'success', text: 'Đã cập nhật mẫu Email cảm ơn thành công!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi lưu' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLetter = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiFetch(`${API_BASE}/admin/templates/letter_thank_you`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: letterContent }),
      });
      if (!res.ok) throw new Error('Không thể lưu template thư');
      setMsg({ type: 'success', text: 'Đã cập nhật mẫu Thư cảm ơn thành công!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi lưu' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-sm text-brand-textMuted">Đang tải templates...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="font-display font-bold text-2xl text-brand-text">
          Quản Lý Mẫu Thư &amp; Email Tri Ân
        </h2>
        <p className="text-xs text-brand-textMuted mt-1">
          Tùy biến nội dung thư cảm ơn tải về và email gửi tự động kèm các biến động.
        </p>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Ghi chú biến động */}
      <div className="p-4 bg-brand-bg rounded-2xl border border-brand-border text-xs text-brand-text leading-relaxed">
        <span className="font-bold">Các từ khóa tự động thay thế:</span>{' '}
        <code className="bg-white px-1.5 py-0.5 rounded border border-brand-border font-mono">&#123;&#123;title&#125;&#125;</code> (Xưng hô),{' '}
        <code className="bg-white px-1.5 py-0.5 rounded border border-brand-border font-mono">&#123;&#123;name&#125;&#125;</code> (Họ tên),{' '}
        <code className="bg-white px-1.5 py-0.5 rounded border border-brand-border font-mono">&#123;&#123;amount&#125;&#125;</code> (Số tiền),{' '}
        <code className="bg-white px-1.5 py-0.5 rounded border border-brand-border font-mono">&#123;&#123;unit&#125;&#125;</code> (Số lượng vòng),{' '}
        <code className="bg-white px-1.5 py-0.5 rounded border border-brand-border font-mono">&#123;&#123;code&#125;&#125;</code> (Mã ủng hộ),{' '}
        <code className="bg-white px-1.5 py-0.5 rounded border border-brand-border font-mono">&#123;&#123;receipt_url&#125;&#125;</code> (Đường dẫn biên nhận).
      </div>

      {/* Mẫu Email Cảm Ơn */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-sm space-y-4">
        <h3 className="font-display font-bold text-lg text-brand-text flex items-center gap-2">
          <Mail className="w-5 h-5 text-brand-orange" />
          Mẫu Email Cảm Ơn Tự Động
        </h3>
        <div>
          <label className="block text-xs font-semibold text-brand-textMuted mb-1">
            Tiêu đề Email:
          </label>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-semibold"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-brand-textMuted mb-1">
            Nội dung Email:
          </label>
          <textarea
            rows={8}
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-mono"
          />
        </div>
        <button
          onClick={handleSaveEmail}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orangeHover text-white text-xs font-bold transition-colors min-h-touch"
        >
          Lưu Mẫu Email
        </button>
      </div>

      {/* Mẫu Thư Cảm Ơn SVG / PNG */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-sm space-y-4">
        <h3 className="font-display font-bold text-lg text-brand-text flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-orange" />
          Mẫu Lời Tri Ân Trên Thư Cảm Ơn (Bản In)
        </h3>
        <div>
          <label className="block text-xs font-semibold text-brand-textMuted mb-1">
            Đoạn văn tri ân hiển thị trên Thư Cảm Ơn:
          </label>
          <textarea
            rows={5}
            value={letterContent}
            onChange={(e) => setLetterContent(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs leading-relaxed"
          />
        </div>
        <button
          onClick={handleSaveLetter}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orangeHover text-white text-xs font-bold transition-colors min-h-touch"
        >
          Lưu Mẫu Thư Cảm Ơn
        </button>
      </div>
    </div>
  );
};

