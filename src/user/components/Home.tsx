import { Shield, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Wallet, ChevronRight, Repeat } from 'lucide-react';
import { Screen, WalletData, Transaction, CoinType } from '../App';
import { getCoinRate } from '../utils/helpers';

interface HomeProps {
  wallets: WalletData[];
  transactions: Transaction[];
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: CoinType) => void;
}

export function Home({ wallets, transactions, onNavigate, onSelectCoin }: HomeProps) {
  const getTotalBalance = () => {
    return wallets.reduce((sum, wallet) => {
      const rate = getCoinRate(wallet.coin_type);
      return sum + parseFloat(wallet.balance.toString()) * rate;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Total Assets */}
      <div 
        className="bg-slate-800/30 border border-cyan-500/30 rounded-2xl p-6"
        style={{
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.15), inset 0 0 20px rgba(6, 182, 212, 0.05)'
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400">총 자산</span>
          <button className="text-cyan-400 hover:text-cyan-300" style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.5))' }}>
            <Shield className="w-4 h-4" />
          </button>
        </div>
        <div className="text-3xl text-white mb-1" style={{ textShadow: '0 0 10px rgba(6, 182, 212, 0.3)' }}>
          ₩ {getTotalBalance().toLocaleString()}
        </div>
        <div className="text-green-400 text-sm">+2.5% ↑</div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-slate-300 mb-3">빠른 메뉴</h3>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('deposit')}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl border border-cyan-500/30 hover:border-cyan-400 transition-all"
            style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' }}
          >
            <ArrowDownToLine className="w-6 h-6 text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.8))' }} />
            <span className="text-xs text-slate-300">입금</span>
          </button>
          <button
            onClick={() => onNavigate('withdrawal')}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl border border-cyan-500/30 hover:border-cyan-400 transition-all"
            style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' }}
          >
            <ArrowUpFromLine className="w-6 h-6 text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.8))' }} />
            <span className="text-xs text-slate-300">출금</span>
          </button>
          <button
            onClick={() => onNavigate('swap')}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl border border-cyan-500/30 hover:border-cyan-400 transition-all"
            style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' }}
          >
            <Repeat className="w-6 h-6 text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.8))' }} />
            <span className="text-xs text-slate-300">교환</span>
          </button>
          <button
            onClick={() => onNavigate('wallet')}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl border border-cyan-500/30 hover:border-cyan-400 transition-all"
            style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' }}
          >
            <Wallet className="w-6 h-6 text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.8))' }} />
            <span className="text-xs text-slate-300">지갑</span>
          </button>
        </div>
      </div>

      {/* Holdings */}
      <div>
        <h3 className="text-slate-300 mb-3">보유 코인</h3>
        <div className="space-y-2">
          {wallets.map((wallet) => {
            const value = parseFloat(wallet.balance.toString()) * getCoinRate(wallet.coin_type);
            return (
              <button
                key={wallet.wallet_id}
                onClick={() => {
                  onSelectCoin(wallet.coin_type);
                  onNavigate('wallet');
                }}
                className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4 hover:border-cyan-400 transition-all text-left"
                style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full bg-slate-800 border border-cyan-500 flex items-center justify-center"
                      style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.5), inset 0 0 10px rgba(6, 182, 212, 0.2)' }}
                    >
                      <span className="text-cyan-400 text-sm" style={{ filter: 'drop-shadow(0 0 2px rgba(6, 182, 212, 0.8))' }}>{wallet.coin_type}</span>
                    </div>
                    <div>
                      <div className="text-white">{wallet.balance.toString()} {wallet.coin_type}</div>
                      <div className="text-sm text-slate-400">≈ ₩{value.toLocaleString()}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-slate-300 mb-3">최근 거래</h3>
        <div className="space-y-2">
          {transactions.slice(0, 3).map((tx) => (
            <div key={tx.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {tx.type === 'deposit' ? (
                    <ArrowDownToLine className="w-5 h-5 text-green-400" />
                  ) : (
                    <ArrowUpFromLine className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <div className="text-white">
                      {tx.type === 'deposit' ? '입금' : '출금'} {tx.status === 'confirmed' || tx.status === 'completed' ? '완료' : '대기'}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={`text-right ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'deposit' ? '+' : '-'}{tx.amount} {tx.coin_type}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}