import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import bcrypt from 'bcryptjs';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // DB에서 사용자 조회
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) throw new Error('로그인 실패');
    
    if (!users || users.length === 0) {
      throw new Error('사용자를 찾을 수 없습니다');
    }
    
    const dbUser = users[0];
    
    // bcrypt로 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, dbUser.password_hash);
    if (!isPasswordValid) {
      throw new Error('비밀번호가 일치하지 않습니다');
    }
    
    const loggedInUser: User = {
      id: dbUser.user_id,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role || 'user'
    };
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    
    // Update last_login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', dbUser.user_id);
  };

  const logout = () => {
    const currentPath = window.location.pathname;
    setUser(null);
    localStorage.removeItem('user');
    
    // 현재 페이지에 따라 적절한 경로로 리다이렉트 후 새로고침
    if (currentPath.startsWith('/admin')) {
      window.history.pushState({}, '', '/admin');
      window.location.reload();
    } else {
      window.history.pushState({}, '', '/mobile');
      window.location.reload();
    }
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