import { useState, useEffect } from 'react';
import { ArrowLeft, Send, CheckCircle, Clock, XCircle, Info, Wallet } from 'lucide-react';
import { Screen } from '../App';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface AccountVerificationProps {
  onNavigate: (screen: Screen) => void;
}

interface VerificationRequest {
  verification_id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  verification_code?: string;
  status: 'pending' | 'code_sent' | 'code_submitted' | 'verified' | 'rejected';
  verification_code_sent?: string;
  user_input_code?: string;
  code_verified?: boolean;
  code_sent_at?: string;
  smart_account_address?: string;
  created_at: string;
  verified_at?: string;
  rejection_reason?: string;
}

export function AccountVerification({ onNavigate }: AccountVerificationProps) {
  const { user } = useAuth();
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [userInputCode, setUserInputCode] = useState(''); // 사용자가 입력하는 인증 코드
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 기존 인증 상태 확인
  useEffect(() => {
    fetchVerificationStatus();

    // 실시간 업데이트 구독
    const channel = supabase
      .channel('user_verification_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_verifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Verification status changed:', payload);
          fetchVerificationStatus();
          
          // 코드 전송 알림
          if ((payload.new as any)?.status === 'code_sent') {
            toast.success('통장 인증을 확인해주세요!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchVerificationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('account_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setVerificationStatus(data);
      }
    } catch (error: any) {
      console.error('Verification status fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!bankName || !accountNumber || !accountHolder) {
      toast.error('모든 필수 정보를 입력해주세요');
      return;
    }

    // 계좌번호 형식 검증
    if (!/^\d{10,14}$/.test(accountNumber.replace(/-/g, ''))) {
      toast.error('올바른 계좌번호 형식이 아닙니다');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('account_verifications')
        .insert({
          user_id: user?.id,
          bank_name: bankName,
          account_number: accountNumber.replace(/-/g, ''),
          account_holder: accountHolder,
          verification_code: verificationCode || null,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('1원 계좌인증 신청이 완료되었습니다');
      
      // 상태 새로고침
      await fetchVerificationStatus();
      
      // 입력 필드 초기화
      setBankName('');
      setAccountNumber('');
      setAccountHolder('');
      setVerificationCode('');

    } catch (error: any) {
      console.error('Verification submit error:', error);
      toast.error('신청 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인증 코드 제출 (사용자가 통장 확인 후 입력)
  const handleSubmitCode = async () => {
    if (!userInputCode.trim()) {
      toast.error('인증 코드를 입력해주세요');
      return;
    }

    if (!verificationStatus) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('account_verifications')
        .update({
          user_input_code: userInputCode.trim(),
          status: 'code_submitted',
        })
        .eq('verification_id', verificationStatus.verification_id);

      if (error) throw error;

      toast.success('인증 코드가 제출되었습니다. 관리자 확인을 기다려주세요.');
      
      // 상태 새로고침
      await fetchVerificationStatus();
      setUserInputCode('');

    } catch (error: any) {
      console.error('Code submit error:', error);
      toast.error('코드 제출 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400">인증 완료</span>
          </div>
        );
      case 'code_submitted':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span className="text-cyan-400">승인 요청</span>
          </div>
        );
      case 'code_sent':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
            <Info className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400">코드 확인 필요</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400">검토 중</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">거부됨</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => onNavigate('settings')}
          className="w-10 h-10 rounded-full bg-slate-800/50 border border-cyan-500/30 flex items-center justify-center hover:bg-cyan-500/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-cyan-400" />
        </button>
        <div>
          <h1 className="text-white">1원 계좌인증</h1>
          <p className="text-slate-400 text-sm">KYC 대신 계좌인증으로 간편하게</p>
        </div>
      </div>

      {/* 인증 상태 카드 */}
      {verificationStatus && (
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-2xl blur"></div>
          <div className="relative bg-slate-800/90 border border-cyan-500/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white">인증 상태</h3>
              {getStatusBadge(verificationStatus.status)}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">은행</span>
                <span className="text-white">{verificationStatus.bank_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">계좌번호</span>
                <span className="text-white">{verificationStatus.account_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">예금주</span>
                <span className="text-white">{verificationStatus.account_holder}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">신청일</span>
                <span className="text-white">
                  {new Date(verificationStatus.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>

              {verificationStatus.status === 'verified' && verificationStatus.smart_account_address && (
                <>
                  <div className="pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-cyan-400" />
                      <span className="text-cyan-400 text-sm">Smart Account</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-slate-300 text-xs break-all font-mono">
                        {verificationStatus.smart_account_address}
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <p className="text-green-400 text-sm">
                      ✅ 코인 지갑이 자동으로 생성되었습니다!
                    </p>
                  </div>
                </>
              )}

              {verificationStatus.status === 'rejected' && verificationStatus.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm mb-1">거부 사유:</p>
                  <p className="text-slate-300 text-sm">{verificationStatus.rejection_reason}</p>
                </div>
              )}

              {verificationStatus.status === 'pending' && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    ⏳ 관리자 검토 중입니다. 잠시만 기다려주세요.
                  </p>
                </div>
              )}

              {verificationStatus.status === 'code_sent' && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-purple-400 text-sm mb-2">
                    📬 통장을 확인해주세요!
                  </p>
                  <p className="text-slate-300 text-sm">
                    1원이 입금되었습니다. 입금자명을 확인하고 아래에 입력해주세요.
                  </p>
                </div>
              )}

              {verificationStatus.status === 'code_submitted' && (
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                  <p className="text-cyan-400 text-sm">
                    ✅ 인증 코드가 제출되었습니다. 관리자가 확인 중입니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 신규 신청 또는 재신청 */}
      {(!verificationStatus || verificationStatus.status === 'rejected') && (
        <>
          {/* 입력 폼 */}
          <div className="space-y-4">
            {/* 은행 선택 */}
            <div>
              <label className="block text-slate-300 mb-3">은행 선택</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="">은행을 선택하세요</option>
                <option value="KB국민은행">KB국민은행</option>
                <option value="신한은행">신한은행</option>
                <option value="우리은행">우리은행</option>
                <option value="하나은행">하나은행</option>
                <option value="NH농협은행">NH농협은행</option>
                <option value="IBK기업은행">IBK기업은행</option>
                <option value="SC제일은행">SC제일은행</option>
                <option value="카카오뱅크">카카오뱅크</option>
                <option value="토스뱅크">토스뱅크</option>
                <option value="케이뱅크">케이뱅크</option>
              </select>
            </div>

            {/* 계좌번호 */}
            <div>
              <label className="block text-slate-300 mb-3">계좌번호</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="123-456-789012"
                className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* 예금주명 */}
            <div>
              <label className="block text-slate-300 mb-3">예금주명</label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="홍길동"
                className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* 인증코드 (선택사항) */}
            <div>
              <label className="block text-slate-300 mb-3">
                입금자명 (선택사항)
                <span className="text-slate-500 text-sm ml-2">관리자가 1원 입금 시 사용</span>
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="예: 홍길동123"
                className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* 신청 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !bankName || !accountNumber || !accountHolder}
            className="w-full bg-slate-800/50 border-2 border-cyan-500/50 text-cyan-400 py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-cyan-500/10 hover:border-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            <Send className="w-6 h-6" />
            {isSubmitting ? '신청 중...' : verificationStatus?.status === 'rejected' ? '재신청하기' : '인증 신청'}
          </button>

          {/* 절차 안내 */}
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-xl blur"></div>
            <div className="relative bg-slate-800/50 border border-purple-500/30 rounded-xl p-4">
              <h4 className="text-purple-400 mb-3">인증 절차</h4>
              <ol className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">1.</span>
                  <span>계좌 정보를 입력하고 신청</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">2.</span>
                  <span>관리자가 해당 계좌로 1원 입금 (입금자명 확인용)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">3.</span>
                  <span>관리자가 계좌 확인 후 승인</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">4.</span>
                  <span className="text-cyan-400">Smart Account 자동 생성 및 지갑 활성화 ✨</span>
                </li>
              </ol>
            </div>
          </div>
        </>
      )}

      {/* 코드 제출 폼 */}
      {verificationStatus && verificationStatus.status === 'code_sent' && (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-3">인증 코드 입력</label>
              <input
                type="text"
                value={userInputCode}
                onChange={(e) => setUserInputCode(e.target.value)}
                placeholder="인증 코드 입력"
                className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* 코드 제출 버튼 */}
          <button
            onClick={handleSubmitCode}
            disabled={isSubmitting || !userInputCode.trim()}
            className="w-full bg-slate-800/50 border-2 border-cyan-500/50 text-cyan-400 py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-cyan-500/10 hover:border-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            <Send className="w-6 h-6" />
            {isSubmitting ? '제출 중...' : '인증 코드 제출'}
          </button>
        </>
      )}
    </div>
  );
}