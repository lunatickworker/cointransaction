import { useState, useEffect } from 'react';
import { Login } from "./components/Login";
import { AdminApp } from "./components/AdminApp";
import { UserApp } from "./user/App";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner@2.0.3";

type Page = 'admin' | 'user';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const path = window.location.pathname;
    return path.startsWith('/transaction') ? 'admin' : 'user';
  });

  // URL 변경 감지 및 페이지 업데이트
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/transaction')) {
        setCurrentPage('admin');
      } else {
        setCurrentPage('user');
      }
    };

    // popstate 이벤트 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', handleLocationChange);
    
    // 초기 로드 시 URL 확인
    handleLocationChange();
    
    return () => window.removeEventListener('popstate', handleLocationChange);
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
    if (!user) {
      return <Login />;
    }
    return <AdminApp />;
  }

  // 사용자 페이지 (/)
  return <UserApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
