import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import { SUPABASE_CONFIG } from '../utils/config';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  level?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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

  // 실시간 사용자 정보 업데이트 구독
  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime subscription for user:', user.id);

    // users 테이블의 변경사항 구독
    const userSubscription = supabase
      .channel(`user_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('User data updated in realtime:', payload);
          const newData = payload.new as any;
          
          // user 상태 업데이트
          const updatedUser: User = {
            id: newData.user_id,
            email: newData.email,
            username: newData.username,
            role: newData.role || 'user',
            level: newData.level
          };
          
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('User state updated:', updatedUser);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from user changes');
      userSubscription.unsubscribe();
    };
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    const currentPath = window.location.pathname;
    const isAdminPage = currentPath.startsWith('/admin');
    
    try {
      // Backend API로 로그인 처리
      const backendUrl = 'https://mzoeeqmtvlnyonicycvg.supabase.co/functions/v1/make-server-b6d5667f';
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        },
        body: JSON.stringify({ email, password })
      });

      console.log('Login response status:', response.status);
      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        console.error('Login failed with status:', response.status, data);
        throw new Error(data.error || '로그인에 실패했습니다');
      }

      if (!data.success) {
        console.error('Login not successful:', data);
        throw new Error(data.error || '로그인에 실패했습니다');
      }

      const userData = data.user;
      
      const loggedInUser: User = {
        id: userData.user_id,
        email: userData.email,
        username: userData.username,
        role: userData.role || 'user',
        level: userData.level
      };
      
      // 역할 검증: 관리자 페이지에서는 관리자만 로그인 가능
      if (isAdminPage && loggedInUser.role !== 'admin') {
        throw new Error('관리자 권한이 필요합니다');
      }
      
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      
      console.log('Login successful:', loggedInUser);
      return loggedInUser;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const refreshUser = async () => {
    if (!user) return;

    try {
      // DB에서 최신 사용자 정보 가져오기
      const { data, error } = await supabase
        .from('users')
        .select('user_id, email, username, role, level')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const updatedUser: User = {
          id: data.user_id,
          email: data.email,
          username: data.username,
          role: data.role || 'user',
          level: data.level
        };

        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('User info refreshed:', updatedUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isLoading }}>
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