import { ChevronRight, User, LogOut, Shield, CheckCircle } from 'lucide-react';
import { Screen } from '../App';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';

interface SettingsProps {
  onNavigate: (screen: Screen) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다');
  };

  return (
    <div className="space-y-6 pb-20">
      <button 
        onClick={() => onNavigate('home')} 
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
        style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.5))' }}
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span>뒤로</span>
      </button>

      <div className="text-center py-6">
        <div 
          className="w-20 h-20 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center mx-auto mb-4"
          style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.6), inset 0 0 20px rgba(6, 182, 212, 0.2)' }}
        >
          <User className="w-10 h-10 text-cyan-400" style={{ filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 1))' }} />
        </div>
        <div className="text-white text-xl mb-1">{user?.username}</div>
        <div className="text-slate-400">{user?.email}</div>
        
        {/* 계좌인증 상태 배지 */}
        {user?.account_verified && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: '1px',
            borderColor: 'rgba(34, 197, 94, 0.3)',
            color: 'rgb(34, 197, 94)'
          }}>
            <CheckCircle className="w-4 h-4" />
            계좌인증 완료
          </div>
        )}
      </div>

      {/* 1원 계좌인증 섹션 */}
      <div className="space-y-3">
        <button
          onClick={() => onNavigate('account-verification')}
          className="w-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-4 hover:border-cyan-500/50 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white">1원 계좌인증</h3>
                <p className="text-slate-400 text-sm">
                  {user?.account_verified ? '인증 완료' : '출금을 위해 인증이 필요합니다'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-cyan-400" />
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4" style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)' }}>
          <div className="text-slate-300 mb-2">보안</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">비밀번호 변경</span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">2FA 인증</span>
              <div className="text-green-400">ON</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4" style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)' }}>
          <div className="text-slate-300 mb-2">앱 설정</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">알림 설정</span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">언어</span>
              <span className="text-slate-300">한국어</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-red-500/20 border border-red-500/50 text-red-400 py-4 rounded-xl hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
        style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)' }}
      >
        <LogOut className="w-5 h-5" />
        <span>로그아웃</span>
      </button>
    </div>
  );
}