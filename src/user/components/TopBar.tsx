import { Bell, Wallet } from 'lucide-react';
import { Screen } from '../App';

interface TopBarProps {
  currentScreen: Screen;
  onNavigateToAdmin: () => void;
}

export function TopBar({ currentScreen, onNavigateToAdmin }: TopBarProps) {
  const getTitle = () => {
    switch (currentScreen) {
      case 'home': return '홈';
      case 'wallet': return '지갑';
      case 'deposit': return '입금';
      case 'withdrawal': return '출금';
      case 'transactions': return '거래 내역';
      case 'settings': return '설정';
      default: return '';
    }
  };

  return (
    <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-cyan-500/20 p-4 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={onNavigateToAdmin}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-cyan-500/50 flex items-center justify-center hover:border-cyan-400 transition-all active:scale-95"
            style={{
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 10px rgba(6, 182, 212, 0.1)'
            }}
          >
            <Wallet className="w-5 h-5 text-cyan-400" style={{ filter: 'drop-shadow(0 0 2px rgba(6, 182, 212, 0.8))' }} />
          </button>
          <span className="text-white">{getTitle()}</span>
        </div>
        <button 
          className="text-cyan-400 hover:text-cyan-300 transition-all"
          style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.5))' }}
        >
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}