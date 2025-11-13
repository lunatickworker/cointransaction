import { ChevronRight, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Screen, Transaction } from '../App';

interface TransactionsProps {
  transactions: Transaction[];
  onNavigate: (screen: Screen) => void;
}

export function Transactions({ transactions, onNavigate }: TransactionsProps) {
  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('home')} 
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span>뒤로</span>
      </button>

      <h2 className="text-2xl text-white">거래 내역</h2>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div key={tx.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {tx.type === 'deposit' ? (
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <ArrowDownToLine className="w-5 h-5 text-green-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ArrowUpFromLine className="w-5 h-5 text-red-400" />
                  </div>
                )}
                <div>
                  <div className="text-white">
                    {tx.type === 'deposit' ? '입금' : '출금'} {tx.status === 'confirmed' || tx.status === 'completed' ? '완료' : '대기'}
                  </div>
                  <div className="text-sm text-slate-400">{tx.coin_type}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}>
                  {tx.type === 'deposit' ? '+' : '-'}{tx.amount}
                </div>
                <div className="text-sm text-slate-400">
                  {new Date(tx.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
