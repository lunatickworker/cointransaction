import { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { AdminApp } from "./components/AdminApp";
import { UserApp } from "./user/App";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner@2.0.3";

type Page = 'admin' | 'user';

function AppContent() {
  const { user, isLoading } = useAuth();
  // 초기 페이지 상태를 URL에서 결정
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const path = window.location.pathname;
    return path.startsWith('/transaction') ? 'admin' : 'user';
  });

  // URL 경로에 따라 페이지 결정
  useEffect(() => {
    const updatePage = () => {
      const path = window.location.pathname;
      if (path.startsWith('/transaction')) {
        setCurrentPage('admin');
      } else {
        setCurrentPage('user');
      }
    };
    
    // popstate 이벤트 리스너 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', updatePage);
    return () => window.removeEventListener('popstate', updatePage);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 관리자 페이지 (/transaction)
  if (currentPage === 'admin') {
    // 로그인 안됨 → 관리자 로그인 페이지
    if (!user) {
      return <Login />;
    }
    
    // 관리자로 로그인됨 → 관리자 앱
    return <AdminApp onNavigateToUser={() => {
      window.history.pushState({}, '', '/');
      setCurrentPage('user');
    }} />;
  }

  // 사용자 페이지 (/)
  return <UserApp onNavigateToAdmin={() => {
    window.history.pushState({}, '', '/transaction');
    setCurrentPage('admin');
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