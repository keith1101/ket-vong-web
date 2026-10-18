import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { DonatePage } from './pages/DonatePage';
import { AboutPage } from './pages/AboutPage';
import { PaymentResultPage } from './pages/PaymentResultPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { InfoPage } from './pages/InfoPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminReviewQueuePage } from './pages/admin/AdminReviewQueuePage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminPostsPage } from './pages/admin/AdminPostsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminTemplatesPage } from './pages/admin/AdminTemplatesPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { PostsPage } from './pages/PostsPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { adminGetMe } from './api';
import type { AdminUser } from './types';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [routeState, setRouteState] = useState<any>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminSubPage, setAdminSubPage] = useState<string>('dashboard');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);

    // Kiểm tra session admin
    adminGetMe()
      .then((user) => setAdminUser(user))
      .catch(() => setAdminUser(null))
      .finally(() => setCheckingAuth(false));

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const adminRoute = currentPath.match(/^\/admin(?:\/([^/]+))?/);
    const routeToPage: Record<string, string> = {
      review: 'review',
      reports: 'reports',
      posts: 'posts',
      settings: 'settings',
      templates: 'templates',
      logs: 'logs',
    };
    setAdminSubPage(adminRoute?.[1] ? routeToPage[adminRoute[1]] || 'dashboard' : 'dashboard');
  }, [currentPath]);

  const navigate = (path: string, state?: any) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
    if (state) setRouteState(state);
    if (path.startsWith('/admin/')) {
      const page = path.split('/')[2];
      setAdminSubPage(page || 'dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route matching
  const renderRoute = () => {
    if (currentPath === '/thanh-toan/ket-qua') return <PaymentResultPage navigate={navigate} />;
    if (currentPath === '/thanh-toan/da-huy') return <PaymentResultPage cancelled navigate={navigate} />;

    // 2. Màn hình biên nhận: /dong-gop/:code
    const receiptMatch = currentPath.match(/^\/dong-gop\/([a-zA-Z0-9-_]+)/);
    if (receiptMatch) {
      return <ReceiptPage code={receiptMatch[1]} navigate={navigate} />;
    }

    // 3. Các trang công khai bắt buộc
    if (currentPath === '/minh-bach') {
      return <TransparencyPage />;
    }
    if (currentPath === '/ung-ho') return <DonatePage navigate={navigate} />;
    if (currentPath === '/gioi-thieu') return <AboutPage navigate={navigate} />;
    if (currentPath === '/lien-he') return <InfoPage kind="contact" />;
    if (currentPath === '/chinh-sach-bao-mat') return <InfoPage kind="privacy" />;
    if (currentPath === '/bai-viet') return <PostsPage navigate={navigate} />;

    const postMatch = currentPath.match(/^\/bai-viet\/([a-zA-Z0-9-_]+)/);
    if (postMatch) {
      return <PostDetailPage slug={postMatch[1]} navigate={navigate} />;
    }

    // 4. Khu vực Admin Login: /admin/login
    if (currentPath === '/admin/login') {
      return (
        <AdminLoginPage
          navigate={navigate}
          onLoginSuccess={(user) => {
            setAdminUser(user);
          }}
        />
      );
    }

    // 5. Khu vực Admin Dashboard & Quản lý: /admin/*
    if (currentPath.startsWith('/admin')) {
      if (checkingAuth) {
        return <div className="text-center py-20 text-sm text-brand-textMuted">Đang xác thực phiên làm việc...</div>;
      }

      if (!adminUser) {
        return (
          <AdminLoginPage
            navigate={navigate}
            onLoginSuccess={(user) => {
              setAdminUser(user);
            }}
          />
        );
      }

      return (
        <AdminLayout
          admin={adminUser}
          currentSubPage={adminSubPage}
          setSubPage={setAdminSubPage}
          navigate={navigate}
          onLogout={() => setAdminUser(null)}
        >
          {adminSubPage === 'dashboard' && <AdminDashboardPage />}
          {adminSubPage === 'review' && <AdminReviewQueuePage />}
          {adminSubPage === 'reports' && <AdminReportsPage />}
          {adminSubPage === 'posts' && <AdminPostsPage />}
          {adminSubPage === 'settings' && <AdminSettingsPage />}
          {adminSubPage === 'templates' && <AdminTemplatesPage />}
          {adminSubPage === 'logs' && <AdminLogsPage />}
        </AdminLayout>
      );
    }

    // Default: Trang chủ (/) - Giới thiệu dự án theo Phần 2
    return <LandingPage navigate={navigate} />;
  };

  const isAdminArea = currentPath.startsWith('/admin') && adminUser;

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text font-body selection:bg-brand-orange selection:text-white">
      {!isAdminArea && <Navbar currentPath={currentPath} navigate={navigate} />}
      <main className="flex-1">{renderRoute()}</main>
      {!isAdminArea && <Footer />}
    </div>
  );
};

