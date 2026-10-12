import React from 'react';
import type { AdminUser } from '../../types';
import { adminLogout } from '../../api';
import { LayoutDashboard, AlertCircle, FileText, Settings, Mail, Shield, LogOut, ArrowLeft } from 'lucide-react';

interface AdminLayoutProps {
  admin: AdminUser;
  currentSubPage: string;
  setSubPage: (page: string) => void;
  navigate: (path: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  admin,
  currentSubPage,
  setSubPage,
  navigate,
  onLogout,
  children,
}) => {
  const isSuperAdmin = admin.role === 'super-admin';

  const menuItems = [
    { id: 'dashboard', label: 'Tổng Quan & Danh Sách', icon: LayoutDashboard },
    { id: 'review', label: 'Hàng Chờ Ca Lệch', icon: AlertCircle },
    { id: 'reports', label: 'Báo Cáo Hàng Ngày', icon: FileText },
    ...(isSuperAdmin
      ? [
          { id: 'settings', label: 'Cài Đặt Hệ Thống', icon: Settings },
          { id: 'templates', label: 'Mẫu Thư & Email', icon: Mail },
        ]
      : []),
    ...(isSuperAdmin ? [{ id: 'logs', label: 'Nhật Ký hệ thống', icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    await adminLogout();
    onLogout();
    navigate('/admin/login');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Admin Header */}
      <div className="bg-[var(--color-surface)] rounded-3xl p-6 border border-[var(--color-border)] shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] flex items-center justify-center font-display font-extrabold text-xl">
            {admin.name.slice(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-[var(--kv-ink)]">{admin.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--kv-ink)] text-white font-display">
                {admin.role}
              </span>
            </div>
            <span className="text-xs text-[var(--kv-text-soft)] font-body">{admin.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)] hover:bg-[var(--kv-blue-bg)] flex items-center gap-1.5 transition-colors min-h-touch font-display"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Xem Website</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors min-h-touch font-display"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Bar */}
      <div className="flex flex-wrap gap-2 mb-8 bg-[var(--color-surface)] p-2 rounded-2xl border border-[var(--color-border)] shadow-sm">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSubPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setSubPage(item.id);
                navigate(item.id === 'dashboard' ? '/admin' : `/admin/${item.id}`);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-touch font-display ${
                isActive
                  ? 'bg-[var(--kv-pink)] text-white shadow-sm'
                  : 'text-[var(--kv-text)] hover:bg-[var(--kv-blue-bg)] hover:text-[var(--kv-ink)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
};
