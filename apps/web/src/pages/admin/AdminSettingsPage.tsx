import React, { useState, useEffect } from 'react';
import { adminGetSettings, adminUpdateSettings } from '../../api';
import { Settings, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminGetSettings()
      .then(setSettings)
      .catch((err) => console.error('Lỗi tải cài đặt:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = (key: string, file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Ảnh QR phải là PNG/JPG và không vượt quá 5MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => handleChange(key, String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await adminUpdateSettings(settings);
      setMsg({ type: 'success', text: 'Đã lưu toàn bộ cài đặt thành công và có hiệu lực ngay lập tức!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi lưu cài đặt' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-sm text-brand-textMuted">Đang tải cấu hình hệ thống...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-display font-bold text-2xl text-brand-text">
          Cài Đặt Hệ Thống (SRS-062)
        </h2>
        <p className="text-xs text-brand-textMuted mt-1">
          Super-admin có thể cấu hình toàn bộ nội dung động mà không cần sửa mã nguồn hay build lại.
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

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-sm space-y-6">
        {/* Phần 1: Gây quỹ & Đơn giá */}
        <div>
          <h3 className="font-display font-bold text-base text-brand-text border-b border-brand-border/60 pb-2 mb-4">
            1. Cấu Hình Chiến Dịch &amp; Đơn Giá Ủng Hộ (REQ-02, SRS-001)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Đơn giá mỗi vòng tay (VNĐ):
              </label>
              <input
                type="number"
                value={settings.unit_price || ''}
                onChange={(e) => handleChange('unit_price', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Mục tiêu quỹ (VNĐ):
              </label>
              <input
                type="number"
                value={settings.campaign_target || ''}
                onChange={(e) => handleChange('campaign_target', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Mức Preset số lượng (JSON array):
              </label>
              <input
                type="text"
                value={settings.presets || ''}
                onChange={(e) => handleChange('presets', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-mono"
              />
              <span className="text-[10px] text-brand-textMuted">Ví dụ: [1] hoặc [1, 2, 5]</span>
            </div>
          </div>
        </div>

        {/* Phần 2: Tài khoản ngân hàng nhận tiền */}
        <div>
          <h3 className="font-display font-bold text-base text-brand-text border-b border-brand-border/60 pb-2 mb-4">
            2. Tài Khoản Ngân Hàng Tiếp Nhận &amp; QR Code (SRS-003, REQ-03)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Tên ngân hàng:
              </label>
              <input
                type="text"
                value={settings.bank_name || ''}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Số tài khoản:
              </label>
              <input
                type="text"
                value={settings.bank_account_number || ''}
                onChange={(e) => handleChange('bank_account_number', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Tên chủ tài khoản:
              </label>
              <input
                type="text"
                value={settings.bank_account_name || ''}
                onChange={(e) => handleChange('bank_account_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">Tên chiến dịch:</label>
              <input type="text" value={settings.campaign_name || ''} onChange={(e) => handleChange('campaign_name', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">Thời hạn chiến dịch:</label>
              <input type="date" value={settings.campaign_deadline || ''} onChange={(e) => handleChange('campaign_deadline', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs" />
            </div>
          </div>
        </div>

        {/* Phần 3: Thông tin liên hệ & Giới thiệu */}
        <div>
          <h3 className="font-display font-bold text-base text-brand-text border-b border-brand-border/60 pb-2 mb-4">
            3. Thông Tin Liên Hệ &amp; Nội Dung Giới Thiệu
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Email hỗ trợ / liên hệ:
              </label>
              <input
                type="email"
                value={settings.contact_email || ''}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Số điện thoại hotline:
              </label>
              <input
                type="text"
                value={settings.contact_phone || ''}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {(['bank_qr_image', 'bank_qr_image_secondary'] as const).map((key, index) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1">Ảnh QR {index + 1} (PNG/JPG, tối đa 5MB):</label>
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload(key, e.target.files?.[0])} className="w-full text-xs" />
                {settings[key] && <img src={settings[key]} alt={`Xem trước QR ${index + 1}`} className="mt-2 h-28 rounded-xl border border-brand-border object-contain" />}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1">
              Lời giới thiệu chiến dịch:
            </label>
            <textarea
              rows={3}
              value={settings.campaign_intro || ''}
              onChange={(e) => handleChange('campaign_intro', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
            />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-brand-textMuted mb-1">Chính sách bảo mật và hướng dẫn xóa dữ liệu:</label>
            <textarea rows={5} value={settings.privacy_policy || ''} onChange={(e) => handleChange('privacy_policy', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs" />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-2xl bg-brand-orange hover:bg-brand-orangeHover text-white text-xs font-bold transition-all min-h-touch flex items-center gap-2 shadow-md shadow-brand-orange/20"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : 'Lưu Tất Cả Cài Đặt'}</span>
        </button>
      </form>
    </div>
  );
};

