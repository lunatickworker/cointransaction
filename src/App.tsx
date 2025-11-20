import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { toast, Toaster } from 'sonner@2.0.3';
import { UserApp } from './user/App';
import { AdminApp } from './components/AdminApp';
import { Login } from './components/Login';
import './utils/debug-users';

// 라우팅 타입 정의
type Route = 'user' | 'admin' | 'admin-login';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<Route>('user');

  // URL 해시 기반 라우팅 (선택적)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('admin/login')) {
      setCurrentRoute('admin-login');
    } else if (hash.startsWith('admin')) {
      setCurrentRoute('admin');
    } else {
      setCurrentRoute('user');
    }

    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash.startsWith('admin/login')) {
        setCurrentRoute('admin-login');
      } else if (newHash.startsWith('admin')) {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('user');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 관리자 페이지 접근 제어
  useEffect(() => {
    if (currentRoute === 'admin' && !isLoading) {
      if (!user || user.role !== 'admin') {
        setCurrentRoute('admin-login');
        window.location.hash = '#admin/login';
        toast.error('관리자 권한이 필요합니다');
      }
    }
  }, [currentRoute, user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-cyan-400">Loading...</div>
      </div>
    );
  }

  // 라우팅 렌더링
  if (currentRoute === 'admin-login') {
    return <Login onLoginSuccess={() => {
      setCurrentRoute('admin');
      window.location.hash = '#admin';
    }} />;
  }

  if (currentRoute === 'admin') {
    if (!user || user.role !== 'admin') {
      setCurrentRoute('admin-login');
      window.location.hash = '#admin/login';
      return null;
    }
    return <AdminApp />;
  }

  // 기본은 사용자 앱
  return <UserApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: 'rgb(15 23 42)',
            color: 'rgb(148 163 184)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)',
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
