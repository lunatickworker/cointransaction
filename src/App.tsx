import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from "./components/Login";
import { AdminApp } from "./components/AdminApp";
import { UserApp } from "./user/App";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner@2.0.3";

// 관리자 페이지 보호 라우트
function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AdminApp />;
}

// 사용자 페이지 라우트
function UserRoute() {
  return <UserApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UserRoute />} />
          <Route path="/transaction" element={<AdminRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}