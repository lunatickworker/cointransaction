import { useState, useRef } from 'react';
import { ChevronRight, QrCode, Camera } from 'lucide-react';
import { Screen, WalletData, CoinType } from '../App';
import { getCoinRate } from '../utils/helpers';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import jsQR from 'jsqr';

interface WithdrawalProps {
  wallets: WalletData[];
  selectedCoin: CoinType;
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: CoinType) => void;
}

export function Withdrawal({ wallets, selectedCoin, onNavigate }: WithdrawalProps) {
  const { user } = useAuth();
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallet = wallets.find(w => w.coin_type === selectedCoin);

  const networkFee = 0.0001; // 네트워크 수수료

  const validateAddress = (address: string): boolean => {
    if (!address || address.length < 26) return false;
    
    // 간단한 주소 형식 검증
    const addressPatterns: Record<CoinType, RegExp> = {
      BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
      ETH: /^0x[a-fA-F0-9]{40}$/,
      USDT: /^0x[a-fA-F0-9]{40}$/,
      USDC: /^0x[a-fA-F0-9]{40}$/,
      BNB: /^0x[a-fA-F0-9]{40}$/,
    };

    return addressPatterns[selectedCoin]?.test(address) || false;
  };

  const handleQRScan = async () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            // QR 코드에서 주소 추출 (bitcoin:, ethereum: 등의 프로토콜 제거)
            let address = code.data;
            if (address.includes(':')) {
              address = address.split(':')[1].split('?')[0];
            }
            setToAddress(address);
            toast.success('QR 코드에서 주소를 읽었습니다');
          } else {
            toast.error('QR 코드를 인식할 수 없습니다');
          }
        };
        img.src = event.target?.result as string;
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('QR scan error:', error);
      toast.error('QR 코드 스캔에 실패했습니다');
    }
  };

  const handleMaxAmount = () => {
    if (!wallet) return;
    // 수수료를 제외한 최대 금액
    const maxAmount = Math.max(0, wallet.balance - networkFee);
    setAmount(maxAmount.toFixed(8));
  };

  const calculateReceivedAmount = (): number => {
    const amountNum = parseFloat(amount || '0');
    return Math.max(0, amountNum - networkFee);
  };

  const handleSubmit = async () => {
    // 유효성 검증
    if (!toAddress) {
      toast.error('받는 주소를 입력해주세요');
      return;
    }

    if (!validateAddress(toAddress)) {
      toast.error('올바른 주소 형식이 아닙니다');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('출금 수량을 입력해주세요');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!wallet || amountNum > wallet.balance) {
      toast.error('출금 가능 금액을 초과했습니다');
      return;
    }

    if (amountNum < 0.0001) {
      toast.error('최소 출금 금액은 0.0001입니다');
      return;
    }

    setIsSubmitting(true);

    try {
      // Supabase에 출금 신청 저장
      const { data, error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user?.id,
          coin_type: selectedCoin,
          to_address: toAddress,
          amount: amount,
          network_fee: networkFee.toString(),
          status: 'pending',
          tx_hash: null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('출금 신청이 완료되었습니다');
      setToAddress('');
      setAmount('');
      
      // 잠시 후 홈으로 이동
      setTimeout(() => {
        onNavigate('home');
      }, 1500);
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('출금 신청에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('home')} 
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
        style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.5))' }}
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span>뒤로</span>
      </button>

      <h2 className="text-2xl text-white">{selectedCoin} 출금</h2>

      <div 
        className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4"
        style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.1)' }}
      >
        <div className="text-slate-400 text-sm">출금 가능</div>
        <div className="text-white text-xl">
          {wallet?.balance.toFixed(8) || '0'} {selectedCoin}
        </div>
      </div>

      <div>
        <label className="block text-slate-300 mb-2">받는 주소</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="주소 입력"
            className="flex-1 bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button 
            onClick={handleQRScan}
            className="bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 px-4 rounded-lg hover:bg-cyan-500/30 transition-all"
            style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' }}
          >
            <QrCode className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {toAddress && !validateAddress(toAddress) && (
          <div className="text-red-400 text-sm mt-1">올바른 주소 형식이 아닙니다</div>
        )}
      </div>

      <div>
        <label className="block text-slate-300 mb-2">출금 수량</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.00000001"
            min="0"
            className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 pr-20 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button 
            onClick={handleMaxAmount}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-500/20 border border-purple-500/50 text-purple-400 px-4 py-1.5 rounded-lg hover:bg-purple-500/30 transition-all text-sm"
          >
            전액
          </button>
        </div>
        <div className="text-slate-400 text-sm mt-1">
          ≈ ₩{(parseFloat(amount || '0') * getCoinRate(selectedCoin)).toLocaleString()}
        </div>
      </div>

      <div 
        className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400">네트워크 수수료</span>
          <span className="text-white">{networkFee.toFixed(4)} {selectedCoin}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">받는 금액</span>
          <span className="text-cyan-400">{calculateReceivedAmount().toFixed(4)} {selectedCoin}</span>
        </div>
      </div>

      <button 
        onClick={handleSubmit}
        disabled={isSubmitting || !toAddress || !amount || !validateAddress(toAddress)}
        className="w-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 py-4 rounded-xl hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '처리 중...' : '출금 신청하기'}
      </button>
    </div>
  );
}