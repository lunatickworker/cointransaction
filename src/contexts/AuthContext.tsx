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
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const currentPath = window.location.pathname;
    const isAdminPage = currentPath.startsWith('/transaction');
    
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
      .eq('user_id', dbUser.user_id);
    
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