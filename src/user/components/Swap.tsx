import { useState } from 'react';
import { ChevronRight, ArrowDownUp, Info } from 'lucide-react';
import { Screen, WalletData } from '../App';
import { toast } from 'sonner@2.0.3';

interface SwapProps {
  wallets: WalletData[];
  selectedCoin: string;
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: any) => void;
}

// 샘플 환율 데이터 (실제로는 coin_prices 테이블에서 가져와야 함)
const EXCHANGE_RATES: Record<string, number> = {
  'BTC': 67500.00,
  'ETH': 3200.00,
  'USDT': 1.00,
  'USDC': 1.00,
  'BNB': 580.00,
};

export function Swap({ wallets, selectedCoin, onNavigate, onSelectCoin }: SwapProps) {
  const [fromCoin, setFromCoin] = useState('BTC');
  const [toCoin, setToCoin] = useState('ETH');
  const [fromAmount, setFromAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  const fromWallet = wallets.find(w => w.coin_type === fromCoin);
  const toWallet = wallets.find(w => w.coin_type === toCoin);

  // 환율 계산
  const calculateToAmount = (amount: string) => {
    if (!amount || isNaN(parseFloat(amount))) return '0';
    const fromRate = EXCHANGE_RATES[fromCoin] || 1;
    const toRate = EXCHANGE_RATES[toCoin] || 1;
    const exchangeRate = fromRate / toRate;
    const toAmount = parseFloat(amount) * exchangeRate;
    const fee = toAmount * 0.001; // 0.1% 수수료
    return (toAmount - fee).toFixed(8);
  };

  const toAmount = calculateToAmount(fromAmount);
  const fee = fromAmount ? (parseFloat(toAmount) * 0.001).toFixed(8) : '0';

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error('교환할 금액을 입력하세요');
      return;
    }

    if (!fromWallet || parseFloat(fromAmount) > fromWallet.balance) {
      toast.error('잔액이 부족합니다');
      return;
    }

    if (fromCoin === toCoin) {
      toast.error('같은 코인으로는 교환할 수 없습니다');
      return;
    }

    setIsSwapping(true);
    
    try {
      // TODO: Supabase에 스왑 요청 저장
      // const { data, error } = await supabase
      //   .from('coin_swaps')
      //   .insert({
      //     user_id: currentUserId,
      //     from_coin: fromCoin,
      //     to_coin: toCoin,
      //     from_amount: parseFloat(fromAmount),
      //     to_amount: parseFloat(toAmount),
      //     exchange_rate: EXCHANGE_RATES[fromCoin] / EXCHANGE_RATES[toCoin],
      //     fee: parseFloat(fee),
      //     fee_coin: toCoin,
      //     status: 'processing'
      //   });

      // 시뮬레이션: 2초 후 완료
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`${fromAmount} ${fromCoin}를 ${toAmount} ${toCoin}로 교환했습니다`);
      setFromAmount('');
      
      // 실제로는 wallets 데이터를 새로고침해야 함
    } catch (error) {
      toast.error('코인 교환에 실패했습니다');
    } finally {
      setIsSwapping(false);
    }
  };

  const swapCoins = () => {
    const temp = fromCoin;
    setFromCoin(toCoin);
    setToCoin(temp);
  };

  const availableCoins = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB'];

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('home')} 
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span>뒤로</span>
      </button>

      <div className="text-center">
        <h2 className="text-2xl text-white mb-2">코인 교환</h2>
        <p className="text-slate-400 text-sm">다른 코인으로 빠르게 교환하세요</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
        {/* From Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-slate-400 text-sm">보내는 코인</label>
            <span className="text-slate-400 text-sm">
              잔액: {fromWallet?.balance.toFixed(8) || '0'} {fromCoin}
            </span>
          </div>
          <div className="flex gap-3">
            <select
              value={fromCoin}
              onChange={(e) => setFromCoin(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            >
              {availableCoins.map(coin => (
                <option key={coin} value={coin}>{coin}</option>
              ))}
            </select>
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white text-right focus:outline-none focus:border-cyan-500"
            />
          </div>
          {fromWallet && (
            <button
              onClick={() => setFromAmount(fromWallet.balance.toString())}
              className="text-cyan-400 text-sm hover:text-cyan-300"
            >
              최대
            </button>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={swapCoins}
            className="bg-slate-700 hover:bg-slate-600 rounded-full p-3 transition-colors"
          >
            <ArrowDownUp className="w-5 h-5 text-cyan-400" />
          </button>
        </div>

        {/* To Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-slate-400 text-sm">받는 코인</label>
            <span className="text-slate-400 text-sm">
              잔액: {toWallet?.balance.toFixed(8) || '0'} {toCoin}
            </span>
          </div>
          <div className="flex gap-3">
            <select
              value={toCoin}
              onChange={(e) => setToCoin(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            >
              {availableCoins.map(coin => (
                <option key={coin} value={coin}>{coin}</option>
              ))}
            </select>
            <input
              type="text"
              value={toAmount}
              readOnly
              placeholder="0.00"
              className="flex-1 bg-slate-700/30 border border-slate-600 rounded-lg px-4 py-3 text-white text-right cursor-not-allowed"
            />
          </div>
        </div>

        {/* Exchange Info */}
        {fromAmount && parseFloat(fromAmount) > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 mt-0.5" />
              <div className="flex-1 space-y-1 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>환율</span>
                  <span>1 {fromCoin} = {(EXCHANGE_RATES[fromCoin] / EXCHANGE_RATES[toCoin]).toFixed(8)} {toCoin}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>수수료 (0.1%)</span>
                  <span>{fee} {toCoin}</span>
                </div>
                <div className="flex justify-between text-cyan-400 pt-2 border-t border-slate-600">
                  <span>예상 받을 금액</span>
                  <span>{toAmount} {toCoin}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-4 rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSwapping ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>교환 중...</span>
            </>
          ) : (
            <span>교환하기</span>
          )}
        </button>
      </div>

      {/* Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <p className="text-yellow-400 text-sm">
          💡 코인 교환은 실시간 환율을 기반으로 처리되며, 시장 상황에 따라 최종 금액이 달라질 수 있습니다.
        </p>
      </div>
    </div>
  );
}