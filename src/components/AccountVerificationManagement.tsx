import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Wallet, AlertTriangle, Zap, Send, Key } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { createSmartAccount } from '../utils/biconomy/smartAccount';

interface Verification {
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
  smart_account_chain_id?: number;
  created_at: string;
  verified_at?: string;
  rejection_reason?: string;
  users?: {
    username: string;
    email: string;
  };
}

export function AccountVerificationManagement() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(false); // 즉시 UI 표시
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'code_sent' | 'code_submitted' | 'verified' | 'rejected'>('all');
  
  // 코드 전송 모달 상태
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCodeToSend, setVerificationCodeToSend] = useState('');

  useEffect(() => {
    fetchVerifications();

    // 실시간 구독
    const subscription = supabase
      .channel('account_verifications_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'account_verifications' },
        () => {
          fetchVerifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('account_verifications')
        .select(`
          *,
          users (
            username,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('데이터 로드 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (verification: Verification) => {
    if (!confirm(`${verification.users?.username}의 계좌인증을 승인하시겠습니까?\nSmart Account가 자동으로 생성됩니다.`)) {
      return;
    }

    setProcessingId(verification.verification_id);

    try {
      toast.info('⚡ Smart Account 생성 중...');

      // Step 1: Smart Account 생성
      const smartAccount = await createSmartAccount({
        userId: verification.user_id,
        username: verification.users?.username || 'Unknown',
        chainId: 8453, // Base Mainnet
      });

      toast.success(`✅ Smart Account 생성 완료: ${smartAccount.address.slice(0, 10)}...`);

      // Step 2: 인증 상태 업데이트
      const { error: updateError } = await supabase
        .from('account_verifications')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          smart_account_address: smartAccount.address,
          smart_account_chain_id: smartAccount.chainId,
        })
        .eq('verification_id', verification.verification_id);

      if (updateError) throw updateError;

      // Step 3: 기본 지갑들 생성 (KRWQ, USDT)
      const walletsToCreate = [
        {
          user_id: verification.user_id,
          coin_type: 'KRWQ',
          address: smartAccount.address,
          balance: 0,
          status: 'active',
        },
        {
          user_id: verification.user_id,
          coin_type: 'USDT',
          address: smartAccount.address,
          balance: 0,
          status: 'active',
        },
      ];

      const { error: walletError } = await supabase
        .from('wallets')
        .insert(walletsToCreate);

      if (walletError) {
        console.error('Wallet creation error:', walletError);
        // 지갑 생성 실패해도 인증은 완료된 상태로 유지
      }

      toast.success('계좌인증 승인 및 지갑 생성 완료!');
      await fetchVerifications();

    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(`승인 실패: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectionReason.trim()) {
      toast.error('거부 사유를 입력해주세요');
      return;
    }

    setProcessingId(selectedVerification.verification_id);

    try {
      const { error } = await supabase
        .from('account_verifications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
        })
        .eq('verification_id', selectedVerification.verification_id);

      if (error) throw error;

      toast.success('계좌인증이 거부되었습니다');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedVerification(null);
      await fetchVerifications();

    } catch (error: any) {
      console.error('Rejection error:', error);
      toast.error('거부 처리 실패');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (verification: Verification) => {
    setSelectedVerification(verification);
    setShowRejectModal(true);
  };

  // 랜덤 인증 코드 생성 (영문+숫자 조합)
  const generateVerificationCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'VERIFY';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // 인증 처리 모달 열기
  const openCodeModal = (verification: Verification) => {
    setSelectedVerification(verification);
    setVerificationCodeToSend(generateVerificationCode());
    setShowCodeModal(true);
  };

  // 인증 코드 전송 (외부 API 호출 예정)
  const handleSendVerificationCode = async () => {
    if (!selectedVerification || !verificationCodeToSend.trim()) {
      toast.error('인증 코드를 입력해주세요');
      return;
    }

    setProcessingId(selectedVerification.verification_id);

    try {
      // TODO: 외부 API 호출하여 실제 계좌로 1원 입금 (입금자명: verificationCodeToSend)
      // 예: await sendBankTransfer(selectedVerification.account_number, verificationCodeToSend);
      
      // 시뮬레이션: 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));

      // DB 업데이트
      const { error } = await supabase
        .from('account_verifications')
        .update({
          status: 'code_sent',
          verification_code_sent: verificationCodeToSend,
          code_sent_at: new Date().toISOString(),
        })
        .eq('verification_id', selectedVerification.verification_id);

      if (error) throw error;

      toast.success(`인증 코드가 전송되었습니다: ${verificationCodeToSend}`);
      setShowCodeModal(false);
      setVerificationCodeToSend('');
      setSelectedVerification(null);
      await fetchVerifications();

    } catch (error: any) {
      console.error('Code send error:', error);
      toast.error('코드 전송 실패');
    } finally {
      setProcessingId(null);
    }
  };

  // 코드 검증 및 최종 승인
  const handleFinalApprove = async (verification: Verification) => {
    // 코드 일치 여부 확인
    const isCodeMatched = verification.verification_code_sent === verification.user_input_code;

    if (!isCodeMatched) {
      toast.error('인증 코드가 일치하지 않습니다');
      return;
    }

    if (!confirm(`${verification.users?.username}의 계좌인증을 최종 승인하시겠습니까?\nSmart Account가 자동으로 생성됩니다.`)) {
      return;
    }

    setProcessingId(verification.verification_id);

    try {
      toast.info('⚡ Smart Account 생성 중...');

      // Step 1: Smart Account 생성
      const smartAccount = await createSmartAccount({
        userId: verification.user_id,
        username: verification.users?.username || 'Unknown',
        chainId: 8453, // Base Mainnet
      });

      toast.success(`✅ Smart Account 생성 완료: ${smartAccount.address.slice(0, 10)}...`);

      // Step 2: 인증 상태 업데이트
      const { error: updateError } = await supabase
        .from('account_verifications')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          code_verified: true,
          smart_account_address: smartAccount.address,
          smart_account_chain_id: smartAccount.chainId,
        })
        .eq('verification_id', verification.verification_id);

      if (updateError) throw updateError;

      // Step 3: users 테이블의 account_verification_status 업데이트
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ account_verification_status: 'verified' })
        .eq('user_id', verification.user_id);

      if (userUpdateError) {
        console.error('User status update error:', userUpdateError);
      }

      // Step 4: 기본 지갑들 생성 (KRWQ, USDT)
      const walletsToCreate = [
        {
          user_id: verification.user_id,
          coin_type: 'KRWQ',
          address: smartAccount.address,
          balance: 0,
          status: 'active',
        },
        {
          user_id: verification.user_id,
          coin_type: 'USDT',
          address: smartAccount.address,
          balance: 0,
          status: 'active',
        },
      ];

      const { error: walletError } = await supabase
        .from('wallets')
        .insert(walletsToCreate);

      if (walletError) {
        console.error('Wallet creation error:', walletError);
        // 지갑 생성 실패해도 인증은 완료된 상태로 유지
      }

      toast.success('계좌인증 승인 및 지갑 생성 완료!');
      await fetchVerifications();

    } catch (error: any) {
      console.error('Final approval error:', error);
      toast.error(`승인 실패: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
            승인됨
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            대기중
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
            거부됨
          </span>
        );
      default:
        return null;
    }
  };

  const filteredVerifications = verifications.filter(v => 
    filter === 'all' ? true : v.status === filter
  );

  const stats = {
    total: verifications.length,
    pending: verifications.filter(v => v.status === 'pending').length,
    verified: verifications.filter(v => v.status === 'verified').length,
    rejected: verifications.filter(v => v.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white text-3xl mb-2">계좌인증 관리</h1>
        <p className="text-slate-400">1원 계좌인증 요청을 검토하고 Smart Account를 생성합니다</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">전체</span>
            <Wallet className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-white text-2xl">{stats.total}</div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-400 text-sm">대기중</span>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-white text-2xl">{stats.pending}</div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-400 text-sm">승인됨</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-white text-2xl">{stats.verified}</div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-400 text-sm">거부됨</span>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-white text-2xl">{stats.rejected}</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {(['all', 'pending', 'code_sent', 'code_submitted', 'verified', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === f
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            {f === 'all' ? '전체' : f === 'pending' ? '대기중' : f === 'code_sent' ? '코드 전송됨' : f === 'code_submitted' ? '코드 제출됨' : f === 'verified' ? '승인됨' : '거부됨'}
          </button>
        ))}
      </div>

      {/* 인증 요청 목록 */}
      <div className="space-y-4">
        {filteredVerifications.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-12 text-center">
            <p className="text-slate-400">표시할 인증 요청이 없습니다</p>
          </div>
        ) : (
          filteredVerifications.map((verification) => (
            <div
              key={verification.verification_id}
              className="bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 rounded-xl p-6 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white text-lg">{verification.users?.username}</h3>
                    {getStatusBadge(verification.status)}
                    {verification.smart_account_address && (
                      <div className="flex items-center gap-1 text-xs text-purple-400">
                        <Zap className="w-3 h-3" />
                        <span>Smart Account</span>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">{verification.users?.email}</p>
                </div>
                <span className="text-slate-500 text-sm">
                  {new Date(verification.created_at).toLocaleString('ko-KR')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">은행</span>
                    <span className="text-white">{verification.bank_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">계좌번호</span>
                    <span className="text-white font-mono">{verification.account_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">예금주</span>
                    <span className="text-white">{verification.account_holder}</span>
                  </div>
                  {verification.verification_code && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">입금자명</span>
                      <span className="text-cyan-400">{verification.verification_code}</span>
                    </div>
                  )}
                </div>

                {verification.smart_account_address && (
                  <div className="bg-slate-900/50 border border-cyan-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-cyan-400" />
                      <span className="text-cyan-400 text-sm">Smart Account Address</span>
                    </div>
                    <p className="text-slate-300 text-xs break-all font-mono">
                      {verification.smart_account_address}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Chain ID: {verification.smart_account_chain_id || 8453}
                    </p>
                  </div>
                )}
              </div>

              {verification.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm mb-1">거부 사유:</p>
                  <p className="text-slate-300 text-sm">{verification.rejection_reason}</p>
                </div>
              )}

              {verification.status === 'code_sent' && (
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-400 text-sm">인증 코드 전송됨</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">전송한 코드:</span>
                      <span className="text-white font-mono">{verification.verification_code_sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">전송 시간:</span>
                      <span className="text-white">{verification.code_sent_at ? new Date(verification.code_sent_at).toLocaleString('ko-KR') : '-'}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-cyan-300">
                    ⏳ 사용자의 코드 입력을 기다리는 중입니다...
                  </div>
                </div>
              )}

              {verification.status === 'code_submitted' && (
                <div className={`border rounded-lg p-3 mb-4 ${
                  verification.verification_code_sent === verification.user_input_code
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verification.verification_code_sent === verification.user_input_code ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm">✅ 인증 코드 일치</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm">❌ 인증 코드 불일치</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">전송한 코드:</span>
                      <span className="text-white font-mono">{verification.verification_code_sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">사용자 입력:</span>
                      <span className={`font-mono ${
                        verification.verification_code_sent === verification.user_input_code
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {verification.user_input_code}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {verification.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => openCodeModal(verification)}
                    disabled={processingId === verification.verification_id}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    {processingId === verification.verification_id ? '처리 중...' : '인증 처리 (코드 전송)'}
                  </button>
                  <button
                    onClick={() => openRejectModal(verification)}
                    disabled={processingId === verification.verification_id}
                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    거부
                  </button>
                </div>
              )}

              {verification.status === 'code_sent' && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                  <Clock className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-slate-300 text-sm">사용자가 코드를 입력하면 자동으로 업데이트됩니다</p>
                </div>
              )}

              {verification.status === 'code_submitted' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleFinalApprove(verification)}
                    disabled={
                      processingId === verification.verification_id ||
                      verification.verification_code_sent !== verification.user_input_code
                    }
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {processingId === verification.verification_id ? '처리 중...' : '최종 승인 및 Smart Account 생성'}
                  </button>
                  <button
                    onClick={() => openRejectModal(verification)}
                    disabled={processingId === verification.verification_id}
                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    거부
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 거부 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white text-lg">계좌인증 거부</h3>
                <p className="text-slate-400 text-sm">{selectedVerification?.users?.username}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 mb-2">거부 사유</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="거부 사유를 입력하세요 (예: 계좌번호 불일치)"
                className="w-full bg-slate-900/50 border border-red-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedVerification(null);
                }}
                className="flex-1 bg-slate-700 text-white py-3 rounded-lg hover:bg-slate-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId !== null}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId ? '처리 중...' : '거부하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 코드 전송 모달 */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Send className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white text-lg">인증 코드 전송</h3>
                <p className="text-slate-400 text-sm">{selectedVerification?.users?.username}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 mb-2">인증 코드</label>
              <input
                value={verificationCodeToSend}
                readOnly
                className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCodeModal(false);
                  setVerificationCodeToSend('');
                  setSelectedVerification(null);
                }}
                className="flex-1 bg-slate-700 text-white py-3 rounded-lg hover:bg-slate-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSendVerificationCode}
                disabled={processingId !== null}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId ? '처리 중...' : '전송하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}