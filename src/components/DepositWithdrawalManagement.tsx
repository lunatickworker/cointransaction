import { ArrowDownCircle, ArrowUpCircle, CheckCircle, XCircle, Clock, Filter, Search, ChevronLeft, ChevronRight, Eye, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { SUPABASE_CONFIG } from "../utils/config";
import { toast } from "sonner@2.0.3";

interface TransferRequest {
  request_id: string;
  user_id: string;
  wallet_id: string;
  coin_type: string;
  amount: number;
  status: string;
  user_note: string | null;
  admin_note: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  username?: string;
  email?: string;
}

interface Deposit {
  deposit_id: string;
  user_id: string;
  wallet_id: string;
  coin_type: string;
  amount: number;
  tx_hash: string;
  confirmations: number;
  required_confirmations: number;
  status: string;
  from_address: string | null;
  method: string;
  created_at: string;
  confirmed_at: string | null;
  username?: string;
  email?: string;
}

interface Withdrawal {
  withdrawal_id: string;
  user_id: string;
  wallet_id: string;
  coin_type: string;
  amount: number;
  fee: number;
  to_address: string;
  tx_hash: string | null;
  status: string;
  rejection_reason: string | null;
  approved_by: string | null;
  method: string;
  created_at: string;
  completed_at: string | null;
  username?: string;
  email?: string;
}

type TabType = "transfer_requests" | "deposits" | "withdrawals";

export function DepositWithdrawalManagement() {
  const { user } = useAuth(); // 컴포넌트 최상위에서 호출
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("transfer_requests");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();

    // 실시간 업데이트
    const channel = supabase
      .channel('deposit-withdrawal-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfer_requests' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposits' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawals' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    // Transfer Requests
    const { data: transferData } = await supabase
      .from('transfer_requests')
      .select(`
        *,
        users!transfer_requests_user_id_fkey(username, email)
      `)
      .order('created_at', { ascending: false });

    if (transferData) {
      setTransferRequests(transferData.map((item: any) => ({
        ...item,
        username: item.users?.username,
        email: item.users?.email
      })));
    }

    // Deposits
    const { data: depositData } = await supabase
      .from('deposits')
      .select(`
        *,
        users!deposits_user_id_fkey(username, email)
      `)
      .order('created_at', { ascending: false });

    if (depositData) {
      setDeposits(depositData.map((item: any) => ({
        ...item,
        username: item.users?.username,
        email: item.users?.email
      })));
    }

    // Withdrawals
    const { data: withdrawalData } = await supabase
      .from('withdrawals')
      .select(`
        *,
        users!withdrawals_user_id_fkey(username, email)
      `)
      .order('created_at', { ascending: false });

    if (withdrawalData) {
      setWithdrawals(withdrawalData.map((item: any) => ({
        ...item,
        username: item.users?.username,
        email: item.users?.email
      })));
    }
  };

  // 코인 구매 요청 승인
  const handleApproveRequest = async (request: TransferRequest) => {
    if (!adminNote.trim()) {
      toast.error('관리자 메모를 입력해주세요');
      return;
    }

    if (!user?.id) {
      toast.error('로그인 정보를 찾을 수 없습니다');
      return;
    }

    setIsProcessing(true);

    try {
      const adminId = user.id; // AuthContext에서 가져온 사용자 ID

      console.log('🔍 관리자 지갑 조회:', { adminId, coin_type: request.coin_type });

      // 디버깅: 관리자의 모든 지갑 조회
      const { data: allAdminWallets } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', adminId);
      
      console.log('👛 관리자의 전체 지갑 목록:', allAdminWallets);

      // 1. 관리자 지갑 정보 조회
      const { data: adminWalletData, error: adminWalletError } = await supabase
        .from('wallets')
        .select('address')
        .eq('user_id', adminId)
        .eq('coin_type', request.coin_type)
        .single();

      console.log('📦 관리자 지갑 조회 결과:', { adminWalletData, adminWalletError });

      if (adminWalletError || !adminWalletData) {
        // 더 상세한 에러 메시지
        const errorMsg = `관리자의 ${request.coin_type} 지갑을 찾을 수 없습니다. 지갑 관리에서 ${request.coin_type} 지갑을 먼저 생성해주세요.`;
        console.error('❌ 관리자 지갑 없음:', errorMsg, { adminId, coin_type: request.coin_type });
        throw new Error(errorMsg);
      }

      // 2. 사용자 지갑 정보 조회
      const { data: userWalletData, error: userWalletError } = await supabase
        .from('wallets')
        .select('address, balance')
        .eq('wallet_id', request.wallet_id)
        .single();

      if (userWalletError || !userWalletData) {
        throw new Error('사용자 지갑을 찾을 수 없습니다');
      }

      // 3. 코인 정보 조회 (chain_id 필요)
      const { data: coinData, error: coinError } = await supabase
        .from('supported_tokens')
        .select('chain_id, contract_address, decimals')
        .eq('symbol', request.coin_type)
        .single();

      if (coinError || !coinData) {
        throw new Error('코인 정보를 찾을 수 없습니다');
      }

      toast.info('블록체인 전송을 시작합니다...');

      // 4. Biconomy Supertransaction API로 실제 전송 (Backend 호출)
      const backendUrl = `${SUPABASE_CONFIG.backendUrl}/api/biconomy/transfer`;
      console.log('🌐 Backend URL:', backendUrl);
      
      const transferResponse = await fetch(backendUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        },
        body: JSON.stringify({
          chainId: coinData.chain_id,
          from: adminWalletData.address,
          to: userWalletData.address,
          token: request.coin_type,
          amount: request.amount.toString(),
          gasPayment: {
            sponsor: true  // 관리자가 가스비 스폰서
          }
        })
      });

      console.log('📡 Transfer Response Status:', transferResponse.status);

      const transferResult = await transferResponse.json();
      console.log('📦 Transfer Result:', transferResult);

      if (!transferResponse.ok || !transferResult.success) {
        // 잔액 부족 에러 처리
        if (transferResult.code === 'INSUFFICIENT_BALANCE' && transferResult.details) {
          const { required, available, shortage, token } = transferResult.details;
          
          // 친절한 에러 메시지
          toast.error(
            <div className="space-y-2">
              <div className="font-semibold">💰 관리자 지갑 잔액 부족</div>
              <div className="text-sm space-y-1">
                <div>• 필요한 수량: <span className="font-mono">{required.toFixed(8)} {token}</span></div>
                <div>• 현재 보유: <span className="font-mono">{available.toFixed(8)} {token}</span></div>
                <div>• 부족한 수량: <span className="font-mono text-red-400">{shortage.toFixed(8)} {token}</span></div>
              </div>
              <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                💡 관리자 지갑 주소: <span className="font-mono">{adminWalletData.address}</span>
              </div>
            </div>,
            { duration: 10000 } // 10초 동안 표시
          );
          
          // 추가 정보 토스트
          setTimeout(() => {
            toast.info(
              `관리자 지갑에 ${shortage.toFixed(2)} ${token} 이상을 충전한 후 다시 승인해주세요.`,
              { duration: 8000 }
            );
          }, 500);
          
          return;
        }
        throw new Error(transferResult.error || '블록체인 전송에 실패했습니다');
      }

      const txHash = transferResult.txHash;
      toast.success('블록체인 전송 완료! 잔액을 업데이트합니다...');

      // 5. 요청 상태를 승인으로 변경
      const { error: requestError } = await supabase
        .from('transfer_requests')
        .update({
          status: 'approved',
          admin_note: adminNote,
          approved_by: adminId,
          approved_at: new Date().toISOString()
        })
        .eq('request_id', request.request_id);

      if (requestError) throw requestError;

      // 6. 지갑 잔액 업데이트
      const newBalance = parseFloat(userWalletData.balance) + request.amount;

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('wallet_id', request.wallet_id);

      if (updateError) throw updateError;

      // 7. deposits 테이블에 입금 기록 생성
      const { error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: request.user_id,
          wallet_id: request.wallet_id,
          coin_type: request.coin_type,
          amount: request.amount,
          tx_hash: txHash,
          confirmations: 1,
          required_confirmations: 1,
          status: 'confirmed',
          from_address: adminWalletData.address,
          method: 'supertransaction',
          created_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString()
        });

      if (depositError) throw depositError;

      // 8. 트랜잭션 기록 생성
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: request.user_id,
          wallet_id: request.wallet_id,
          type: 'deposit',
          coin_type: request.coin_type,
          amount: request.amount,
          balance_before: parseFloat(userWalletData.balance),
          balance_after: newBalance,
          reference_id: request.request_id,
          tx_hash: txHash,
          description: `코인 구매 승인 - ${adminNote}`,
          metadata: {
            method: 'supertransaction',
            gas_sponsored: true,
            admin_wallet: adminWalletData.address
          },
          created_at: new Date().toISOString()
        });

      if (txError) throw txError;

      toast.success(`✅ 승인 완료! TX: ${txHash.substring(0, 10)}...`);
      setSelectedRequest(null);
      setAdminNote('');
      fetchData();

    } catch (error: any) {
      console.error('Approve error:', error);
      toast.error(error.message || '승인 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  // 코인 구매 요청 거부
  const handleRejectRequest = async (request: TransferRequest) => {
    if (!adminNote.trim()) {
      toast.error('거부 사유를 입력해주세요');
      return;
    }

    setIsProcessing(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminId = authData.user?.id;

      const { error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'rejected',
          admin_note: adminNote,
          approved_by: adminId,
          approved_at: new Date().toISOString()
        })
        .eq('request_id', request.request_id);

      if (error) throw error;

      toast.success('코인 구매 요청이 거부되었습니다');
      setSelectedRequest(null);
      setAdminNote('');
      fetchData();

    } catch (error: any) {
      console.error('Reject error:', error);
      toast.error(error.message || '거부 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  // 필터링
  const getFilteredData = () => {
    let data: any[] = [];

    if (activeTab === "transfer_requests") {
      data = transferRequests;
    } else if (activeTab === "deposits") {
      data = deposits;
    } else {
      data = withdrawals;
    }

    return data.filter(item => {
      const matchesSearch = 
        item.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.coin_type?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // 통계 계산
  const stats = {
    pending: transferRequests.filter(r => r.status === 'pending').length,
    approved: transferRequests.filter(r => r.status === 'approved').length,
    rejected: transferRequests.filter(r => r.status === 'rejected').length,
    totalDeposits: deposits.length,
    totalWithdrawals: withdrawals.length
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
      confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
      processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      completed: "bg-green-500/20 text-green-400 border-green-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30"
    };

    const labels = {
      pending: "대기중",
      approved: "승인됨",
      rejected: "거부됨",
      confirmed: "확인됨",
      processing: "처리중",
      completed: "완료",
      failed: "실패"
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cyan-400 mb-1">구매 요청 관리</h2>
          <p className="text-slate-400 text-sm">사용자의 코인 구매 요청을 승인하고 입출금 내역을 확인합니다</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">대기중 요청</p>
            <p className="text-amber-400 text-2xl">{stats.pending}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">승인됨</p>
            <p className="text-green-400 text-2xl">{stats.approved}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">거부됨</p>
            <p className="text-red-400 text-2xl">{stats.rejected}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">총 입금</p>
            <p className="text-cyan-400 text-2xl">{stats.totalDeposits}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">총 출금</p>
            <p className="text-purple-400 text-2xl">{stats.totalWithdrawals}</p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-slate-700/50">
        <button
          onClick={() => {
            setActiveTab("transfer_requests");
            setCurrentPage(1);
            setStatusFilter("all");
          }}
          className={`px-6 py-3 border-b-2 transition-colors ${
            activeTab === "transfer_requests"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            <span>코인 구매 요청</span>
            {stats.pending > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                {stats.pending}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab("deposits");
            setCurrentPage(1);
            setStatusFilter("all");
          }}
          className={`px-6 py-3 border-b-2 transition-colors ${
            activeTab === "deposits"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5" />
            <span>입금 내역</span>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab("withdrawals");
            setCurrentPage(1);
            setStatusFilter("all");
          }}
          className={`px-6 py-3 border-b-2 transition-colors ${
            activeTab === "withdrawals"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5" />
            <span>출금 내역</span>
          </div>
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="사용자 이름, 이메일, 코인으로 검색..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
        >
          <option value="all">전체 상태</option>
          {activeTab === "transfer_requests" && (
            <>
              <option value="pending">대기중</option>
              <option value="approved">승인됨</option>
              <option value="rejected">거부됨</option>
            </>
          )}
          {activeTab === "deposits" && (
            <>
              <option value="pending">대기중</option>
              <option value="confirmed">확인됨</option>
              <option value="failed">실패</option>
            </>
          )}
          {activeTab === "withdrawals" && (
            <>
              <option value="pending">대기중</option>
              <option value="processing">처리중</option>
              <option value="completed">완료</option>
              <option value="rejected">거부됨</option>
              <option value="failed">실패</option>
            </>
          )}
        </select>
      </div>

      {/* 테이블 */}
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl opacity-20 blur"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-slate-300">사용자</th>
                  <th className="px-6 py-4 text-left text-slate-300">코인</th>
                  <th className="px-6 py-4 text-right text-slate-300">수량</th>
                  <th className="px-6 py-4 text-left text-slate-300">상태</th>
                  <th className="px-6 py-4 text-left text-slate-300">생성일</th>
                  <th className="px-6 py-4 text-right text-slate-300">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      데이터가 없습니다
                    </td>
                  </tr>
                ) : (
                  currentData.map((item: any) => (
                    <tr key={item.request_id || item.deposit_id || item.withdrawal_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-slate-200">{item.username || 'Unknown'}</p>
                          <p className="text-slate-400 text-sm">{item.email || ''}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <span className="text-cyan-400 text-xs">{item.coin_type}</span>
                          </div>
                          <span className="text-slate-200">{item.coin_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-slate-200">{parseFloat(item.amount).toFixed(8)}</p>
                        {item.fee && item.fee > 0 && (
                          <p className="text-slate-400 text-sm">수수료: {parseFloat(item.fee).toFixed(8)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-300 text-sm">
                          {new Date(item.created_at).toLocaleString('ko-KR')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === "transfer_requests" && item.status === "pending" && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRequest(item);
                                  setAdminNote('');
                                }}
                                className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all"
                                title="상세보기"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {activeTab !== "transfer_requests" && (
                            <button
                              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
                              title="상세보기"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
              <div className="text-slate-400 text-sm">
                {filteredData.length}개 중 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)}개 표시
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[40px] h-10 px-3 rounded-lg transition-all ${
                            currentPage === page
                              ? 'bg-cyan-500 text-white'
                              : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="text-slate-500">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 승인/거부 모달 */}
      {selectedRequest && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedRequest(null);
            setAdminNote('');
          }}
        >
          <div
            className="relative w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-30 blur"></div>
            <div className="relative bg-slate-900 border border-cyan-500/30 rounded-2xl p-6">
              <h3 className="text-white text-xl mb-6">코인 구매 요청 처리</h3>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">사용자</span>
                    <span className="text-white">{selectedRequest.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">이메일</span>
                    <span className="text-white">{selectedRequest.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">코인</span>
                    <span className="text-cyan-400">{selectedRequest.coin_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">수량</span>
                    <span className="text-white">{parseFloat(selectedRequest.amount.toString()).toFixed(8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">요청일시</span>
                    <span className="text-white">{new Date(selectedRequest.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                  {selectedRequest.user_note && (
                    <div>
                      <span className="text-slate-400 block mb-1">사용자 메모</span>
                      <p className="text-white bg-slate-900/50 rounded p-2 text-sm">{selectedRequest.user_note}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 mb-2 text-sm">관리자 메모 *</label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="승인/거부 사유를 입력하세요..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApproveRequest(selectedRequest)}
                  disabled={isProcessing}
                  className="flex-1 bg-green-500/20 border border-green-500 text-green-400 py-3 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>승인</span>
                </button>

                <button
                  onClick={() => handleRejectRequest(selectedRequest)}
                  disabled={isProcessing}
                  className="flex-1 bg-red-500/20 border border-red-500 text-red-400 py-3 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  <span>거부</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNote('');
                  }}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}