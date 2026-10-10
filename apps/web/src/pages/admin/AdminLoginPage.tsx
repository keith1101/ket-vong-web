import React, { useState } from 'react';
import { adminChangePassword, adminLogin } from '../../api';
import type { AdminUser } from '../../types';
import { Lock, Mail, ShieldAlert, ArrowLeft } from 'lucide-react';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
  onLoginSuccess: (admin: AdminUser) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mustChangePassword) {
        await adminChangePassword(newPassword);
        const data = await adminLogin(email, newPassword);
        onLoginSuccess(data.admin);
        navigate('/admin');
      } else {
        const data = await adminLogin(email, password);
        if (data.admin.must_change_password) {
          setMustChangePassword(true);
          setErrorMsg('Vui lòng đặt mật khẩu mới trước khi tiếp tục.');
        } else {
          onLoginSuccess(data.admin);
          navigate('/admin');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-brand-border shadow-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-bold text-brand-textMuted hover:text-brand-orange mb-6 min-h-touch"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-accent text-brand-orange flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-brand-text">
            Đăng Nhập Quản Trị
          </h1>
          <p className="text-xs text-brand-textMuted mt-1">
            Dành cho Ban tổ chức dự án Kết Vòng (SRS-060)
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2 mb-6">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mustChangePassword && (
            <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs">Đây là lần đăng nhập đầu tiên. Hãy đặt mật khẩu mới dài ít nhất 8 ký tự.</div>
          )}
          {!mustChangePassword && <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">
              Email Quản Trị
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                placeholder="Nhập email quản trị"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none min-h-touch"
              />
            </div>
          </div>}

          {mustChangePassword && <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">Mật khẩu mới</label>
            <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm min-h-touch" />
          </div>}

          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">
              Mật Khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none min-h-touch"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-brand-orange hover:bg-brand-orangeHover text-white font-display font-bold text-base shadow-lg shadow-brand-orange/20 transition-all min-h-touch flex items-center justify-center gap-2"
          >
            {loading ? 'Đang xử lý...' : mustChangePassword ? 'Lưu mật khẩu mới' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-brand-border/60 text-center text-[11px] text-brand-textMuted leading-relaxed">
          Tài khoản mặc định được seed qua lệnh CLI: <code className="bg-brand-bg px-1.5 py-0.5 rounded font-mono">pnpm seed:admin</code>
        </div>
      </div>
    </div>
  );
};

