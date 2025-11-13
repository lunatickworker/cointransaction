import { useState } from 'react';
import { Activity, Mail, Lock, LogIn, Eye, EyeOff, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';

export function MobileLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [signUpData, setSignUpData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      
      // 로그인 유지 체크 시 localStorage에 저장
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('savedEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('savedEmail');
      }
      
      toast.success('로그인 성공! 환영합니다 🎉');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '로그인에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('이메일을 입력해주세요');
      return;
    }

    // 비밀번호 재설정 이메일 발송 시뮬레이션
    toast.success('비밀번호 재설정 링크가 이메일로 전송되었습니다');
    setShowForgotPassword(false);
    setResetEmail('');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다');
      return;
    }

    if (signUpData.password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다');
      return;
    }

    // 회원가입 처리 (실제로는 Supabase API 호출)
    toast.success('회원가입이 완료되었습니다! 로그인해주세요');
    setShowSignUp(false);
    setSignUpData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center p-6">
        {/* Logo Section */}
        <div className="text-center mb-10 animate-fade-in">
          <div 
            className="relative inline-block mb-5 cursor-pointer active:scale-95 transition-transform"
            onClick={() => {
              window.location.href = '/admin';
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-2xl blur-lg opacity-40 animate-pulse"></div>
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-xl">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl text-white mb-1.5 tracking-tight">
            GMS Wallet
          </h1>
          <p className="text-slate-400 text-sm flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>안전하고 쉬운 암호화폐 관리</span>
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 text-xs pl-0.5">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 z-10" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-900/80 transition-all"
                  placeholder="이메일을 입력하세요"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 text-xs pl-0.5">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-11 pr-11 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-900/80 transition-all"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-0" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                />
                <span>로그인 유지</span>
              </label>
              <button 
                type="button" 
                className="text-cyan-400 hover:text-cyan-300 transition-colors" 
                onClick={() => setShowForgotPassword(true)}
              >
                비밀번호 찾기
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3.5 rounded-xl hover:from-cyan-400 hover:to-purple-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium mt-6 active:scale-[0.99] shadow-lg shadow-cyan-500/20"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>로그인 중...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>로그인</span>
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-xs">
              계정이 없으신가요?{' '}
              <button className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium" onClick={() => setShowSignUp(true)}>
                회원가입
              </button>
            </p>
          </div>

          {/* Security Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-400/50 animate-pulse"></div>
            <span>256-bit SSL 보안 연결</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-white">비밀번호 찾기</h2>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                  가입하신 이메일 주소를 입력해주세요. 비밀번호 재설정 링크를 보내드립니다.
                </p>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 z-10" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-800/80 transition-all"
                    placeholder="이메일을 입력하세요"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3.5 rounded-xl hover:from-cyan-400 hover:to-purple-400 transition-all duration-200 text-sm font-medium shadow-lg flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                재설정 링크 전송
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {showSignUp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl my-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-white">회원가입</h2>
              <button
                onClick={() => setShowSignUp(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs mb-1.5">사용자명</label>
                <input
                  type="text"
                  value={signUpData.username}
                  onChange={(e) => setSignUpData({ ...signUpData, username: e.target.value })}
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-800/80 transition-all"
                  placeholder="사용자명을 입력하세요"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs mb-1.5">이메일</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 z-10" />
                  <input
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-800/80 transition-all"
                    placeholder="이메일을 입력하세요"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-xs mb-1.5">비밀번호</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 z-10" />
                  <input
                    type="password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-800/80 transition-all"
                    placeholder="비밀번호 (8자 이상)"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-xs mb-1.5">비밀번호 확인</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 z-10" />
                  <input
                    type="password"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-800/80 transition-all"
                    placeholder="비밀번호 확인"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3.5 rounded-xl hover:from-cyan-400 hover:to-purple-400 transition-all duration-200 text-sm font-medium shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
              >
                회원가입
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        /* Touch feedback */
        button:active {
          transform: scale(0.98);
        }

        /* Smooth transitions */
        * {
          -webkit-tap-highlight-color: transparent;
        }

        /* Custom checkbox */
        input[type="checkbox"]:checked {
          background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
        }
      `}</style>
    </div>
  );
}