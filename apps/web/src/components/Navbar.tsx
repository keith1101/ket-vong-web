import React, { useState } from 'react';
import { Menu, X, UserCheck, Heart } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Trang Chủ', path: '/' },
    { label: 'Giới Thiệu', path: '/gioi-thieu' },
    { label: 'Tin Tức & Hoạt Động', path: '/bai-viet' },
    { label: 'Minh Bạch & Báo Cáo', path: '/minh-bach' },
    { label: 'Liên Hệ', path: '/lien-he' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[var(--kv-paper)]/95 backdrop-blur-md border-b border-[var(--color-border)] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-left group min-h-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kv-ink)] rounded-2xl py-1"
            aria-label="Về trang chủ Kết Vòng"
          >
            <img
              src="/images/logo-horizontal.png"
              alt="Logo dự án Kết Vòng"
              className="h-10 sm:h-11 w-auto max-w-[150px] sm:max-w-[185px] object-contain group-hover:scale-105 transition-transform duration-200 select-none"
            />
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-all min-h-touch font-display ${
                    isActive
                      ? 'bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] font-bold shadow-xs'
                      : 'text-[var(--kv-text)] hover:bg-[var(--kv-blue-bg)]/60 hover:text-[var(--kv-ink)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {/* Quick CTA button */}
            <button
              onClick={() => navigate('/ung-ho')}
              className={`ml-2 kv-btn kv-btn--primary text-sm py-1.5 px-4 shadow-sm ${
                currentPath === '/ung-ho' ? 'ring-2 ring-offset-2 ring-[var(--kv-orange)]' : ''
              }`}
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>Ủng hộ</span>
            </button>

            <button
              onClick={() => navigate('/admin')}
              className="ml-2 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)] hover:bg-[var(--kv-paper-deep)] rounded-lg transition-colors min-h-touch"
              title="Khu vực quản trị"
            >
              <UserCheck className="w-4 h-4" />
              <span>Quản trị</span>
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => navigate('/ung-ho')}
              className={`kv-btn kv-btn--primary text-xs py-1 px-3 ${
                currentPath === '/ung-ho' ? 'ring-2 ring-offset-2 ring-[var(--kv-orange)]' : ''
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span>Ủng hộ</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[var(--kv-text)] hover:bg-[var(--kv-blue-bg)] min-h-touch min-w-touch flex items-center justify-center"
              aria-label="Mở menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Crayon Rainbow rule border under header */}
      <div className="kv-rainbow-rule w-full" />

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-1 bg-[var(--kv-paper)] border-b border-[var(--color-border)] animate-in slide-in-from-top-2 duration-150 shadow-md">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-base font-semibold min-h-touch flex items-center font-display ${
                currentPath === item.path
                  ? 'bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] font-bold'
                  : 'text-[var(--kv-text)] hover:bg-[var(--kv-blue-bg)]/50'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => {
              navigate('/admin');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-[var(--kv-text-soft)] hover:bg-[var(--kv-paper-deep)] min-h-touch flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4 text-[var(--kv-ink)]" />
            <span>Khu vực Ban Quản Trị</span>
          </button>
        </div>
      )}
    </nav>
  );
};
