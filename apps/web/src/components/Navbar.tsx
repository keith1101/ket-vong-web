import React, { useState } from 'react';
import { Heart, ShieldCheck, Menu, X, UserCheck } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Trang Chủ', path: '/' },
    { label: 'Giới Thiệu', path: '/gioi-thieu' },
    { label: 'Ủng Hộ', path: '/ung-ho' },
    { label: 'Minh Bạch & Báo Cáo', path: '/minh-bach' },
    { label: 'Liên Hệ', path: '/lien-he' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#fffdf9]/95 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left group min-h-touch focus:outline-none"
          >
            <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center border border-brand-orange text-brand-orange group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-brand-orange" />
            </div>
            <div>
              <span className="font-display font-extrabold text-2xl text-brand-orange tracking-tight leading-none block">
                Kết Vòng
              </span>
              <span className="text-[11px] font-semibold text-brand-textMuted tracking-wider uppercase block">
                Gây Quỹ Minh Bạch
              </span>
            </div>
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors min-h-touch ${
                    isActive
                      ? 'bg-brand-accent text-brand-orange font-bold'
                      : 'text-brand-text hover:bg-brand-accent/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            <button
              onClick={() => navigate('/admin')}
              className="ml-3 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-textMuted hover:text-brand-orange hover:bg-brand-accent/40 rounded-lg transition-colors min-h-touch"
              title="Khu vực quản trị"
            >
              <UserCheck className="w-4 h-4" />
              <span>Quản trị</span>
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-brand-text hover:bg-brand-accent min-h-touch min-w-touch flex items-center justify-center"
              aria-label="Mở menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-1 bg-[#fffdf9] border-b border-brand-border animate-in slide-in-from-top-2 duration-150">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-base font-semibold min-h-touch flex items-center ${
                currentPath === item.path
                  ? 'bg-brand-accent text-brand-orange font-bold'
                  : 'text-brand-text hover:bg-brand-accent/50'
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
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-brand-textMuted hover:bg-brand-accent/50 min-h-touch flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Khu vực Ban Quản Trị</span>
          </button>
        </div>
      )}
    </nav>
  );
};

