import { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { WalletDetail } from './components/WalletDetail';
import { Deposit } from './components/Deposit';
import { Withdrawal } from './components/Withdrawal';
import { Transactions } from './components/Transactions';
import { Swap } from './components/Swap';
import { Settings } from './components/Settings';
import { BottomNav } from './components/BottomNav';
import { TopBar } from './components/TopBar';
import { MobileLogin } from './components/MobileLogin';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';

export type Screen = 'home' | 'wallet' | 'deposit' | 'withdrawal' | 'swap' | 'transactions' | 'settings';
export type CoinType = 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'BNB';

export interface WalletData {
  wallet_id: string;
  coin_type: CoinType;
  address: string;
  balance: number;
  status: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  coin_type: CoinType;
  amount: number;
  status: string;
  created_at: string;
}

export function UserApp() {
  const { user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinType>('BTC');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'user') {
      fetchWallets();
      fetchTransactions();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchWallets = async () => {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user?.id);

    if (!error && data) {
      setWallets(data);
    }
    setIsLoading(false);
  };

  const fetchTransactions = async () => {
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const allTransactions: Transaction[] = [
      ...(deposits || []).map(d => ({
        id: d.deposit_id,
        type: 'deposit' as const,
        coin_type: d.coin_type,
        amount: parseFloat(d.amount),
        status: d.status,
        created_at: d.created_at
      })),
      ...(withdrawals || []).map(w => ({
        id: w.withdrawal_id,
        type: 'withdrawal' as const,
        coin_type: w.coin_type,
        amount: parseFloat(w.amount),
        status: w.status,
        created_at: w.created_at
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setTransactions(allTransactions);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 로그인하지 않은 경우 모바일 로그인 페이지 표시
  if (!user) {
    return <MobileLogin />;
  }

  // 관리자인 경우 사용자 페이지 로그인 화면 표시
  if (user.role === 'admin') {
    return <MobileLogin />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Mobile Container */}
      <div className="relative max-w-md mx-auto min-h-screen bg-slate-900/30 backdrop-blur-xl border-x border-slate-700/50">
        <TopBar currentScreen={currentScreen} />

        {/* Content */}
        <div className="p-4 pb-24 overflow-y-auto">
          {currentScreen === 'home' && (
            <Home
              wallets={wallets}
              transactions={transactions}
              onNavigate={setCurrentScreen}
              onSelectCoin={setSelectedCoin}
            />
          )}
          {currentScreen === 'wallet' && (
            <WalletDetail
              wallets={wallets}
              transactions={transactions}
              selectedCoin={selectedCoin}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === 'deposit' && (
            <Deposit
              selectedCoin={selectedCoin}
              walletAddress={wallets.find(w => w.coin_type === selectedCoin)?.address || ''}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === 'withdrawal' && (
            <Withdrawal
              selectedCoin={selectedCoin}
              balance={wallets.find(w => w.coin_type === selectedCoin)?.balance || 0}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === 'swap' && (
            <Swap
              wallets={wallets}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === 'transactions' && (
            <Transactions
              transactions={transactions}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === 'settings' && (
            <Settings onNavigate={setCurrentScreen} />
          )}
        </div>
      </div>
      
      {/* Bottom Nav - Outside mobile container for proper fixed positioning */}
      <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
    </div>
  );
}