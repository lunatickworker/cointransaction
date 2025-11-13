import { ChevronRight, Copy, QrCode, Share2 } from 'lucide-react';
import { Screen, WalletData, CoinType } from '../App';
import { toast } from 'sonner@2.0.3';
import { QRCodeSVG } from 'qrcode.react';

interface DepositProps {
  wallets: WalletData[];
  selectedCoin: CoinType;
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: CoinType) => void;
}

export function Deposit({ wallets, selectedCoin, onNavigate }: DepositProps) {
  const wallet = wallets.find(w => w.coin_type === selectedCoin);

  const copyAddress = (address: string) => {
    // Fallback method for copying text
    const textArea = document.createElement('textarea');
    textArea.value = address;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.success('주소가 복사되었습니다');
    } catch (err) {
      toast.error('복사에 실패했습니다');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const shareAddress = async (address: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedCoin} 입금 주소`,
          text: `${selectedCoin} 입금 주소:\n${address}`,
        });
        // 공유가 성공하면 아무것도 하지 않음 (사용자가 취소한 경우에만 에러 발생)
      } catch (err) {
        // AbortError는 사용자가 공유를 취소한 경우이므로 무시
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
          // 공유가 실패한 경우에만 복사로 fallback
          copyAddress(address);
          toast.info('공유가 지원되지 않아 주소를 복사했습니다');
        }
      }
    } else {
      // Web Share API를 지원하지 않는 브라우저
      copyAddress(address);
      toast.info('공유가 지원되지 않아 주소를 복사했습니다');
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-10)}`;
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

      <h2 className="text-2xl text-white">{selectedCoin} 입금</h2>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <span className="text-xl">⚠️</span>
          <span>주의사항</span>
        </div>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>• 최소 입금: 0.0001 {selectedCoin}</li>
          <li>• 확인: 3 confirmations</li>
          <li>• 예상 시간: 30분</li>
        </ul>
      </div>

      {wallet && (
        <div 
          className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-6"
          style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.1)' }}
        >
          <div className="text-center">
            <div className="w-52 h-52 bg-white rounded-xl mx-auto mb-4 p-4 flex items-center justify-center">
              <QRCodeSVG
                value={wallet.address}
                size={176}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
            <div className="text-slate-400 text-sm mb-2">입금 주소</div>
            <div className="bg-slate-900/50 rounded-lg p-3 mb-3 border border-cyan-500/20">
              <div className="text-cyan-400 text-sm font-mono overflow-hidden">
                {truncateAddress(wallet.address)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyAddress(wallet.address)}
                className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' }}
              >
                <Copy className="w-4 h-4" />
                주소 복사
              </button>
              <button 
                onClick={() => shareAddress(wallet.address)}
                className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                style={{ boxShadow: '0 0 10px rgba(168, 85, 247, 0.2)' }}
              >
                <Share2 className="w-4 h-4" />
                공유
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}