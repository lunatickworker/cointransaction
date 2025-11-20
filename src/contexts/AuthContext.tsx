import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 복원
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const currentPath = window.location.pathname;
    const isAdminPage = currentPath.startsWith('/admin');
    
    // 1. 이메일로 사용자 조회
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Login error:', error);
      throw new Error('로그인 중 오류가 발생했습니다');
    }

    if (!userData) {
      throw new Error('등록되지 않은 이메일입니다');
    }

    // 2. 비밀번호 확인
    if (userData.password_hash !== password) {
      throw new Error('비밀번호가 올바르지 않습니다');
    }

    const loggedInUser: User = {
      id: userData.user_id,
      email: userData.email,
      username: userData.username,
      role: userData.role || 'user'
    };
    
    // 역할 검증: 관리자 페이지에서는 관리자만 로그인 가능
    if (isAdminPage && loggedInUser.role !== 'admin') {
      throw new Error('관리자 권한이 필요합니다');
    }
    
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    
    // Update last_login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', userData.user_id);
    
    console.log('Login successful:', loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}