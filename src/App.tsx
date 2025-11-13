import { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { AdminApp } from "./components/AdminApp";
import { UserApp } from "./user/App";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner@2.0.3";

type Page = 'admin' | 'user' | 'mobile';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('user');

  // Check URL path to determine which app to show
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      setCurrentPage('admin');
    } else if (path.startsWith('/mobile') || path.startsWith('/user')) {
      setCurrentPage('mobile');
    } else {
      // 루트 경로나 기타 경로는 mobile로
      setCurrentPage('mobile');
    }
  }, []);

  // Listen to popstate event for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        setCurrentPage('admin');
      } else if (path.startsWith('/mobile') || path.startsWith('/user')) {
        setCurrentPage('mobile');
      } else {
        // 루트 경로나 기타 경로는 mobile로
        setCurrentPage('mobile');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!user) {
    // 관리자 페이지 접근 시도 시 관리자 로그인 페이지
    if (currentPage === 'admin') {
      return <Login />;
    }
    // 그 외에는 모바일 사용자 로그인 페이지 (UserApp 내부에서 처리)
    return <UserApp onNavigateToAdmin={() => {
      setCurrentPage('admin');
      window.history.pushState({}, '', '/admin');
    }} />;
  }

  // Route based on user role and current page
  if (user.role === 'user') {
    // 일반 사용자는 admin 페이지 접근 불가
    if (currentPage === 'admin') {
      setCurrentPage('mobile');
      window.history.pushState({}, '', '/mobile');
    }
    return <UserApp onNavigateToAdmin={() => {
      // 일반 사용자는 admin 접근 불가
      alert('관리자 권한이 필요합니다');
    }} />;
  }

  // Admin can access all pages
  if (currentPage === 'admin') {
    return <AdminApp onNavigateToUser={() => {
      setCurrentPage('mobile');
      window.history.pushState({}, '', '/mobile');
    }} />;
  }

  // Admin이 mobile 또는 user 페이지 접근
  return <UserApp onNavigateToAdmin={() => {
    setCurrentPage('admin');
    window.history.pushState({}, '', '/admin');
  }} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}