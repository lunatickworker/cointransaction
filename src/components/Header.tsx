import { Bell, User, LogOut, Wallet } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner@2.0.3";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { NotificationCenter } from "./NotificationCenter";
import { NotificationIcons } from "./NotificationIcons";
import { useNotifications } from "../hooks/useNotifications";

interface WalletBalance {
  coin_type: string;
  balance: number;
  wallet_type: string;
}

interface HeaderProps {
  onNavigate?: (tab: string) => void;
}

export function Header({ onNavigate }: HeaderProps) {
  const { user, logout } = useAuth();
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'signup' | 'verification' | 'purchase' | null>(null);
  const { notifications } = useNotifications(user?.id, user?.role === 'admin');

  useEffect(() => {
    if (user?.id) {
      fetchWalletBalances();
      
      // 실시간 업데이트
      const channel = supabase
        .channel('wallet-balance-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wallets' },
          () => fetchWalletBalances()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchWalletBalances = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('wallets')
      .select('coin_type, balance, wallet_type')
      .eq('user_id', user.id)
      .order('balance', { ascending: false });

    if (data) {
      setWalletBalances(data);
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다');
  };

  const handleCategoryClick = (category: 'signup' | 'verification' | 'purchase' | null) => {
    if (!onNavigate || !category) return;
    
    // 해당 관리 페이지로 이동
    if (category === 'signup') {
      onNavigate('users-wallets'); // 사용자 관리 페이지
    } else if (category === 'verification') {
      onNavigate('account-verifications'); // 계좌 인증 관리 페이지
    } else if (category === 'purchase') {
      onNavigate('deposit-withdrawal'); // 입출금 관리 페이지
    }
    
    setCategoryFilter(null); // 필터 초기화
  };

  // Hot/Cold Wallet 합계 계산
  const hotWalletTotal = walletBalances
    .filter(w => w.wallet_type === 'hot')
    .reduce((sum, w) => sum + w.balance, 0);
  
  const coldWalletTotal = walletBalances
    .filter(w => w.wallet_type === 'cold')
    .reduce((sum, w) => sum + w.balance, 0);

  return (
    <header className="h-16 bg-slate-900/50 backdrop-blur-xl border-b border-cyan-500/20 flex items-center justify-between px-6" style={{ position: 'relative', zIndex: 9999 }}>
      <div className="flex items-center gap-6">
        {/* 관리자 지갑 잔액 */}
        {!isLoading && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-xs text-slate-400">Hot Wallet</p>
                <p className="text-sm text-orange-400 font-mono">
                  {hotWalletTotal > 0 ? `₩${hotWalletTotal.toLocaleString()}` : '₩0'}
                </p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700"></div>

            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-xs text-slate-400">Cold Wallet</p>
                <p className="text-sm text-blue-400 font-mono">
                  {coldWalletTotal > 0 ? `₩${coldWalletTotal.toLocaleString()}` : '₩0'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* 카테고리별 실시간 알림 아이콘 */}
        {user?.id && user.role === 'admin' && (
          <NotificationIcons 
            notifications={notifications} 
            selectedCategory={categoryFilter}
            onCategoryClick={handleCategoryClick}
            isAdmin={true}
          />
        )}
        
        {/* 실시간 알림 센터 */}
        {user?.id && (
          <NotificationCenter 
            userId={user.id} 
            isAdmin={user.role === 'admin'}
            categoryFilter={categoryFilter}
          />
        )}
        
        <div className="h-8 w-px bg-slate-700"></div>
        
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center"
            style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.6), inset 0 0 10px rgba(6, 182, 212, 0.2)' }}
          >
            <User className="w-4 h-4 text-cyan-400" style={{ filter: 'drop-shadow(0 0 2px rgba(6, 182, 212, 1))' }} />
          </div>
          <div>
            <p className="text-sm text-slate-300">{user?.username || 'Admin'}</p>
            <p className="text-xs text-slate-500">관리자</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}