import { ChevronRight, Copy, QrCode, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Screen, WalletData, Transaction, CoinType } from '../App';
import { getCoinRate } from '../utils/helpers';
import { toast } from 'sonner@2.0.3';

interface WalletDetailProps {
  wallets: WalletData[];
  transactions: Transaction[];
  selectedCoin: CoinType;
  onNavigate: (screen: Screen) => void;
}

export function WalletDetail({ wallets, transactions, selectedCoin, onNavigate }: WalletDetailProps) {
  const wallet = wallets.find(w => w.coin_type === selectedCoin);
  
  if (!wallet) {
    return (
      <div className="text-slate-400 text-center p-8">
        지갑을 찾을 수 없습니다
      </div>
    );
  }

  const value = parseFloat(wallet.balance.toString()) * getCoinRate(wallet.coin_type);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('주소가 복사되었습니다');
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('home')} 
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span>뒤로</span>
      </button>

      <div className="text-center py-8">
        <div 
          className="w-20 h-20 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center mx-auto mb-4"
          style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.6), inset 0 0 20px rgba(6, 182, 212, 0.2)' }}
        >
          <span className="text-cyan-400 text-2xl" style={{ filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 1))' }}>{wallet.coin_type}</span>
        </div>
        <div className="text-3xl text-white mb-2">{wallet.balance.toString()} {wallet.coin_type}</div>
        <div className="text-slate-400">≈ ₩{value.toLocaleString()}</div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onNavigate('deposit')}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl hover:shadow-lg transition-all"
        >
          입금하기
        </button>
        <button
          onClick={() => onNavigate('withdrawal')}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl hover:shadow-lg transition-all"
        >
          출금하기
        </button>
      </div>

      <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4">
        <div className="text-slate-300 mb-3">내 지갑 주소</div>
        <div className="bg-slate-900/50 rounded-lg p-4 mb-3">
          <div className="w-32 h-32 bg-white rounded-lg mx-auto mb-3 flex items-center justify-center">
            <QrCode className="w-24 h-24 text-slate-900" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-900/50 rounded-lg p-3 text-slate-300 text-sm truncate">
            {wallet.address}
          </div>
          <button
            onClick={() => copyAddress(wallet.address)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 px-4 py-3 rounded-lg transition-all"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-slate-300 mb-3">최근 거래</h3>
        <div className="space-y-2">
          {transactions
            .filter(tx => tx.coin_type === selectedCoin)
            .slice(0, 5)
            .map((tx) => (
              <div key={tx.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white">
                      {tx.type === 'deposit' ? '입금' : '출금'} {tx.status === 'confirmed' || tx.status === 'completed' ? '완료' : '대기'}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}