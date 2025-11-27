import { ChevronRight, User, LogOut, CheckCircle, Crown, Bell, BellOff, MessageCircle, Send, X, Lock } from 'lucide-react';
import { Screen } from '../App';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase/client';
import { getGasPolicyForUser, getGasPolicyDescription, type GasPaymentConfig } from '../../utils/biconomy/gasPolicy';

interface SettingsProps {
  onNavigate: (screen: Screen) => void;
}

interface Message {
  message_id: string;
  user_id: string;
  admin_id: string | null;
  message: string;
  sender_type: 'user' | 'admin';
  created_at: string;
  is_read: boolean;
}

export function Settings({ onNavigate }: SettingsProps) {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userLevel, setUserLevel] = useState<string>('Basic');
  const [gasPolicy, setGasPolicy] = useState<GasPaymentConfig | null>(null);
  const [isLoadingNotification, setIsLoadingNotification] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 비밀번호 변경
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 사용자 레벨 및 가스비 정책 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        // AuthContext의 user.level 사용
        setUserLevel(user.level || 'Basic');

        // 가스비 정책 로드
        const policy = await getGasPolicyForUser(user.id);
        setGasPolicy(policy);
      } catch (error) {
        console.error('User data load error:', error);
      }
    };

    loadUserData();

    // 실시간 가스비 정책 업데이트 구독
    const policySubscription = supabase
      .channel('gas_policy_changes_settings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gas_sponsorship_policies'
        },
        async (payload) => {
          console.log('Gas policy updated:', payload);
          const policy = await getGasPolicyForUser(user.id);
          setGasPolicy(policy);
          toast.success('가스비 정책이 업데이트되었습니다');
        }
      )
      .subscribe();

    return () => {
      policySubscription.unsubscribe();
    };
  }, [user]);

  // AuthContext의 user.level 변경 감지
  useEffect(() => {
    if (user?.level) {
      setUserLevel(user.level);
    }
  }, [user?.level]);

  // 알림 설정 로드
  useEffect(() => {
    const savedNotification = localStorage.getItem('notifications_enabled');
    if (savedNotification !== null) {
      setNotificationsEnabled(savedNotification === 'true');
    }
  }, []);

  // 메시지 로드 및 실시간 업데이트
  useEffect(() => {
    if (!showChat || !user) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
        // 읽지 않은 관리자 메시지 읽음 처리
        const unreadAdminMessages = data.filter(m => m.sender_type === 'admin' && !m.is_read);
        if (unreadAdminMessages.length > 0) {
          await supabase
            .from('support_messages')
            .update({ is_read: true })
            .in('message_id', unreadAdminMessages.map(m => m.message_id));
        }
      }
    };

    loadMessages();

    // 실시간 메시지 구독
    const messageSubscription = supabase
      .channel('support_messages_user')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          
          if (newMsg.sender_type === 'admin') {
            toast.success('관리자로부터 새 메시지가 도착했습니다');
            // 읽음 처리
            supabase
              .from('support_messages')
              .update({ is_read: true })
              .eq('message_id', newMsg.message_id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [showChat, user]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다');
  };

  const handleToggleNotifications = async () => {
    setIsLoadingNotification(true);
    try {
      const newValue = !notificationsEnabled;
      setNotificationsEnabled(newValue);
      localStorage.setItem('notifications_enabled', String(newValue));
      
      if (newValue) {
        toast.success('알림이 활성화되었습니다');
      } else {
        toast.success('알림이 비활성화되었습니다');
      }
    } catch (error) {
      toast.error('설정 변경에 실패했습니다');
    } finally {
      setIsLoadingNotification(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          message: newMessage.trim(),
          sender_type: 'user',
          is_read: false
        });

      if (error) throw error;

      setNewMessage('');
      toast.success('메시지가 전송되었습니다');
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('메시지 전송에 실패했습니다');
    } finally {
      setIsSending(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (newPassword.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Backend API로 비밀번호 변경 처리 (RLS 우회)
      const backendUrl = 'https://mzoeeqmtvlnyonicycvg.supabase.co/functions/v1/make-server-b6d5667f';
      const response = await fetch(`${backendUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b2VlcW10dmxueW9uaWN5Y3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjIyNzcsImV4cCI6MjA3ODQ5ODI3N30.oo7FsWjthtBtM-Xa1VFJieMGQ4mG__V8w7r9qGBPzaI`,
        },
        body: JSON.stringify({ 
          user_id: user.id,
          new_password: newPassword 
        })
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('서버 응답을 처리할 수 없습니다');
      }

      if (!response.ok) {
        throw new Error(data.error || '비밀번호 변경에 실패했습니다');
      }

      toast.success('비밀번호가 변경되었습니다 🎉');
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || '비밀번호 변경에 실패했습니다');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getLevelBadgeStyle = (level: string) => {
    switch (level) {
      case 'VIP':
        return {
          bg: 'rgba(234, 179, 8, 0.1)',
          border: 'rgba(234, 179, 8, 0.3)',
          text: 'rgb(234, 179, 8)',
          icon: 'text-yellow-400'
        };
      case 'Premium':
        return {
          bg: 'rgba(168, 85, 247, 0.1)',
          border: 'rgba(168, 85, 247, 0.3)',
          text: 'rgb(168, 85, 247)',
          icon: 'text-purple-400'
        };
      case 'Standard':
        return {
          bg: 'rgba(6, 182, 212, 0.1)',
          border: 'rgba(6, 182, 212, 0.3)',
          text: 'rgb(6, 182, 212)',
          icon: 'text-cyan-400'
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.1)',
          border: 'rgba(148, 163, 184, 0.3)',
          text: 'rgb(148, 163, 184)',
          icon: 'text-slate-400'
        };
    }
  };

  const levelStyle = getLevelBadgeStyle(userLevel);

  // 가스비 정책 텍스트 가져오기
  const getGasBenefitText = () => {
    if (!gasPolicy) return '로딩 중...';
    return getGasPolicyDescription(gasPolicy);
  };

  // 가스비 지원 상태 가져오기
  const getGasSupportStatus = () => {
    if (!gasPolicy) return { text: '로딩 중...', color: 'text-slate-400' };
    
    if (gasPolicy.sponsor) {
      return { text: '✓ 전액 지원', color: 'text-green-400' };
    }
    
    if (gasPolicy.maxUserPayment && parseFloat(gasPolicy.maxUserPayment) < 999) {
      return { text: '⚡ 분할 지원', color: 'text-yellow-400' };
    }
    
    return { text: '✗ 지원 불가', color: 'text-slate-400' };
  };

  // 채팅 모달
  if (showChat) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
        {/* 헤더 */}
        <div className="bg-slate-800/80 backdrop-blur border-b border-cyan-500/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowChat(false)}
                className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors"
              >
                <X className="w-5 h-5 text-cyan-400" />
              </button>
              <div>
                <h2 className="text-white">고객센터</h2>
                <p className="text-slate-400 text-sm">실시간 문의</p>
              </div>
            </div>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">아직 대화 내역이 없습니다</p>
              <p className="text-slate-500 text-sm mt-1">궁금하신 점을 문의해주세요</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.message_id}
                className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.sender_type === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.sender_type === 'user' ? 'text-cyan-100' : 'text-slate-500'
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="bg-slate-800/80 backdrop-blur border-t border-cyan-500/30 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* 프로필 섹션 */}
      <div className="text-center py-6">
        <div 
          className="w-20 h-20 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center mx-auto mb-4"
          style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.6), inset 0 0 20px rgba(6, 182, 212, 0.2)' }}
        >
          <User className="w-10 h-10 text-cyan-400" style={{ filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 1))' }} />
        </div>
        <div className="text-white text-xl mb-1">{user?.username}</div>
        <div className="text-slate-400 text-sm">{user?.email}</div>
        
        {/* 계좌인증 상태 배지 */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {user?.account_verified && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderWidth: '1px',
              borderColor: 'rgba(34, 197, 94, 0.3)',
              color: 'rgb(34, 197, 94)'
            }}>
              <CheckCircle className="w-4 h-4" />
              인증완료
            </div>
          )}
          
          {/* 회원 등급 배지 */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{
            backgroundColor: levelStyle.bg,
            borderWidth: '1px',
            borderColor: levelStyle.border,
            color: levelStyle.text
          }}>
            <Crown className={`w-4 h-4 ${levelStyle.icon}`} />
            {userLevel}
          </div>
        </div>
      </div>

      {/* 회원 혜택 카드 */}
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Crown className={`w-5 h-5 ${levelStyle.icon}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-white">내 혜택</h3>
            <p className="text-purple-300 text-sm">{getGasBenefitText()}</p>
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">회원 등급</span>
            <span className="text-white">{userLevel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">출금 가스비</span>
            <span className={getGasSupportStatus().color}>{getGasSupportStatus().text}</span>
          </div>
        </div>
      </div>

      {/* 계정 관리 섹션 */}
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

        <button
          onClick={() => setShowPasswordChange(true)}
          className="w-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4 hover:border-orange-500/50 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-white">비밀번호 변경</h3>
                <p className="text-slate-400 text-sm">새로운 비밀번호로 변경</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-orange-400" />
          </div>
        </button>
      </div>

      {/* 앱 설정 */}
      <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4" style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)' }}>
        <div className="text-slate-300 mb-3">앱 설정</div>
        <div className="space-y-3">
          {/* 알림 토글 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {notificationsEnabled ? (
                <Bell className="w-5 h-5 text-cyan-400" />
              ) : (
                <BellOff className="w-5 h-5 text-slate-500" />
              )}
              <span className="text-slate-300">알림</span>
            </div>
            <button
              onClick={handleToggleNotifications}
              disabled={isLoadingNotification}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationsEnabled ? 'bg-cyan-500' : 'bg-slate-600'
              } ${isLoadingNotification ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 고객센터 */}
      <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl overflow-hidden" style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)' }}>
        <div className="p-4 pb-2">
          <div className="text-slate-300">고객 지원</div>
        </div>
        <button 
          onClick={() => setShowChat(true)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors border-t border-slate-700/50"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-300">실시간 문의</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* 버전 정보 */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">앱 버전</span>
          <span className="text-slate-300">1.0.0</span>
        </div>
      </div>

      {/* 로그아웃 버튼 */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-500/20 border border-red-500/50 text-red-400 py-4 rounded-xl hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
        style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)' }}
      >
        <LogOut className="w-5 h-5" />
        <span>로그아웃</span>
      </button>

      {/* 비밀번호 변경 모달 */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-orange-500/30 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-white">비밀번호 변경</h2>
              <button
                onClick={() => {
                  setShowPasswordChange(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500/40 focus:bg-slate-800/80 transition-all"
                  placeholder="새 비밀번호 (8자 이상)"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500/40 focus:bg-slate-800/80 transition-all"
                  placeholder="비밀번호 확인"
                />
              </div>

              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !newPassword || !confirmPassword}
                className="w-full bg-orange-500/20 border border-orange-500/50 text-orange-400 py-3 rounded-xl hover:bg-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>변경 중...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>변경하기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}