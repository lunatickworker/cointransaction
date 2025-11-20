import { Search, UserCheck, UserX, Lock, Wallet, Plus, Loader2, Copy, Check, Shield, Activity, TrendingUp, Coins, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { NeonCard } from "./NeonCard";

interface UserData {
  user_id: string;
  username: string;
  email: string;
  account_verification_status: string;
  status: string;
  created_at: string;
  last_login: string;
  role?: string;
}

interface WalletData {
  wallet_id: string;
  coin_type: string;
  address: string;
  balance: number;
  wallet_type?: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  totalWallets: number;
  totalValue: number;
}

export function UserWalletManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userWallets, setUserWallets] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"info" | "wallets">("info");
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    verifiedUsers: 0,
    totalWallets: 0,
    totalValue: 0
  });
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showAddCoinModal, setShowAddCoinModal] = useState(false);
  const [availableCoins, setAvailableCoins] = useState<string[]>([]);
  const [selectedCoins, setSelectedCoins] = useState<string[]>([]);
  const [isAddingCoins, setIsAddingCoins] = useState(false);
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchData();
    
    // 실시간 업데이트
    const channel = supabase
      .channel('user-wallet-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => {
        fetchData();
        if (selectedUser) {
          fetchUserWallets(selectedUser.user_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // 사용자 데이터
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersData) {
      setUsers(usersData);
    }

    // 통계 계산
    const { data: walletsData } = await supabase
      .from('wallets')
      .select('balance, coin_type');

    const totalUsers = usersData?.length || 0;
    const verifiedUsers = usersData?.filter(u => u.account_verification_status === 'verified').length || 0;
    const totalWallets = walletsData?.length || 0;
    const totalValue = walletsData?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;

    setStats({
      totalUsers,
      verifiedUsers,
      totalWallets,
      totalValue
    });

    setIsLoading(false);
  };

  const fetchUserWallets = async (userId: string) => {
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setUserWallets(data);
    }
  };

  const handleUserSelect = async (user: UserData) => {
    setSelectedUser(user);
    setActiveTab("info");
    await fetchUserWallets(user.user_id);
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('user_id', userId);

    if (error) {
      toast.error('상태 변경 실패');
      console.error('Status change error:', error);
      return;
    }

    toast.success(`사용자 상태가 ${newStatus === 'active' ? '활성' : newStatus === 'suspended' ? '정지' : newStatus === 'blocked' ? '차단' : '비활성'}로 변경되었습니다`);
    
    // 데이터 새로고침
    await fetchData();
    
    // 선택된 사용자 업데이트
    if (selectedUser?.user_id === userId) {
      setSelectedUser({ ...selectedUser, status: newStatus });
    }
  };

  const handleAddCoins = async () => {
    if (!selectedUser) return;
    
    // 사용 가능한 코인 조회 (DB 테이블: supported_tokens, 컬럼: symbol)
    const { data: coins } = await supabase
      .from('supported_tokens')
      .select('symbol')
      .eq('is_active', true);

    // 이미 보유한 코인 제외
    const existingCoins = userWallets.map(w => w.coin_type);
    const available = coins?.map(c => c.symbol).filter(c => !existingCoins.includes(c)) || [];

    setAvailableCoins(available);
    setSelectedCoins([]);
    setShowAddCoinModal(true);
  };

  const handleConfirmAddCoins = async () => {
    if (!selectedUser || selectedCoins.length === 0) return;
    
    setIsAddingCoins(true);

    try {
      for (const coinType of selectedCoins) {
        const address = '0x' + Array.from({ length: 40 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('');

        await supabase.from('wallets').insert({
          user_id: selectedUser.user_id,
          coin_type: coinType,
          address: address,
          balance: 0,
          wallet_type: 'hot'
        });
      }

      toast.success(`${selectedCoins.length}개의 코인 지갑이 추가되었습니다`);
      setShowAddCoinModal(false);
      await fetchUserWallets(selectedUser.user_id);
    } catch (error) {
      toast.error('코인 추가 실패');
      console.error(error);
    } finally {
      setIsAddingCoins(false);
    }
  };

  const copyToClipboard = (address: string, walletId: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(walletId);
    toast.success('주소가 복사되었습니다');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // 필터링된 사용자 목록
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // 페이지 변경 시 첫 페이지로 리셋 (필터 변경 시)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'suspended': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'blocked': return 'text-red-400 bg-red-500/20 border-red-500/50';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'suspended': return '정지';
      case 'blocked': return '차단';
      default: return status;
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-400 bg-green-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getVerificationText = (status: string) => {
    switch (status) {
      case 'verified': return '인증';
      case 'pending': return '대기';
      case 'rejected': return '거절';
      case 'not_submitted': return '미제출';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">총 사용자</p>
            <p className="text-cyan-400 text-2xl">{stats.totalUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">인증 완료</p>
            <p className="text-green-400 text-2xl">{stats.verifiedUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">총 지갑</p>
            <p className="text-purple-400 text-2xl">{stats.totalWallets.toLocaleString()}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">총 자산 가치</p>
            <p className="text-yellow-400 text-2xl">₩{stats.totalValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 왼쪽: 사용자 목록 */}
        <div className="lg:col-span-2">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl opacity-20 blur"></div>
            <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 h-[calc(100vh-300px)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-cyan-400">사용자 목록</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value={20}>20개</option>
                    <option value={30}>30개</option>
                    <option value={50}>50개</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">전체</option>
                    <option value="active">활성</option>
                    <option value="suspended">정지</option>
                    <option value="blocked">차단</option>
                  </select>
                </div>
              </div>

              {/* 검색 */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="사용자명 또는 이메일 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* 사용자 리스트 - 총촘하게 */}
              <div className="space-y-1.5 overflow-y-auto h-[calc(100%-180px)]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                ) : currentUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    검색 결과가 없습니다
                  </div>
                ) : (
                  currentUsers.map(user => (
                    <button
                      key={user.user_id}
                      onClick={() => handleUserSelect(user)}
                      className={`w-full p-2.5 rounded-lg border transition-all text-left ${
                        selectedUser?.user_id === user.user_id
                          ? 'bg-cyan-500/20 border-cyan-500/50'
                          : 'bg-slate-800/70 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-300 text-sm font-medium truncate">{user.username}</p>
                          <p className="text-slate-500 text-xs truncate">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs border ${getStatusColor(user.status)}`}>
                            {getStatusText(user.status)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${getVerificationColor(user.account_verification_status)}`}>
                            {getVerificationText(user.account_verification_status)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-4">
                  <p className="text-sm text-slate-400">
                    {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} / {filteredUsers.length}명
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>
                    <span className="text-sm text-slate-300 px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 사용자 상세 정보 */}
        <div className="lg:col-span-3">
          {!selectedUser ? (
            <NeonCard className="p-12 h-[calc(100vh-300px)] flex items-center justify-center bg-slate-900/90">
              <div className="text-center text-slate-400">
                <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>사용자를 선택해주세요</p>
              </div>
            </NeonCard>
          ) : (
            <NeonCard className="p-6 h-[calc(100vh-300px)] bg-slate-900/90">
              {/* 탭 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("info")}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      activeTab === "info"
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    사용자 정보
                  </button>
                  <button
                    onClick={() => setActiveTab("wallets")}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      activeTab === "wallets"
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    지갑 관리 ({userWallets.length})
                  </button>
                </div>

                {activeTab === "wallets" && (
                  <button
                    onClick={handleAddCoins}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all border border-cyan-500/50"
                  >
                    <Plus className="w-4 h-4" />
                    코인 추가
                  </button>
                )}
              </div>

              {/* 탭 컨텐츠 */}
              <div className="overflow-y-auto h-[calc(100%-80px)]">
                {activeTab === "info" ? (
                  <div className="space-y-6">
                    {/* 기본 정보 */}
                    <div className="bg-slate-800/70 rounded-lg p-6 border border-slate-700">
                      <h3 className="text-lg text-cyan-400 mb-4 flex items-center gap-2">
                        <UserCheck className="w-5 h-5" />
                        기본 정보
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 text-sm mb-1">사용자명</p>
                          <p className="text-slate-300">{selectedUser.username}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">이메일</p>
                          <p className="text-slate-300">{selectedUser.email}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">계좌인증 상태</p>
                          <span className={`inline-block px-3 py-1 rounded text-sm ${getVerificationColor(selectedUser.account_verification_status)}`}>
                            {getVerificationText(selectedUser.account_verification_status)}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">계정 상태</p>
                          <span className={`inline-block px-3 py-1 rounded text-sm border ${getStatusColor(selectedUser.status)}`}>
                            {getStatusText(selectedUser.status)}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">가입일</p>
                          <p className="text-slate-300">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">마지막 로그인</p>
                          <p className="text-slate-300">
                            {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString() : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 상태 관리 */}
                    <div className="bg-slate-800/70 rounded-lg p-6 border border-slate-700">
                      <h3 className="text-lg text-cyan-400 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        상태 관리
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(selectedUser.user_id, 'active')}
                          disabled={selectedUser.status === 'active'}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all border border-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserCheck className="w-4 h-4" />
                          활성화
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedUser.user_id, 'suspended')}
                          disabled={selectedUser.status === 'suspended'}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-all border border-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Lock className="w-4 h-4" />
                          정지
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedUser.user_id, 'blocked')}
                          disabled={selectedUser.status === 'blocked'}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all border border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserX className="w-4 h-4" />
                          차단
                        </button>
                      </div>
                    </div>

                    {/* 지갑 요약 */}
                    <div className="bg-slate-800/70 rounded-lg p-6 border border-slate-700">
                      <h3 className="text-lg text-cyan-400 mb-4 flex items-center gap-2">
                        <Wallet className="w-5 h-5" />
                        지갑 요약
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-slate-400 text-sm mb-1">총 지갑 수</p>
                          <p className="text-2xl text-cyan-400">{userWallets.length}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">총 자산 가치</p>
                          <p className="text-2xl text-green-400">
                            ₩{userWallets.reduce((sum, w) => sum + w.balance, 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">보유 코인 종류</p>
                          <p className="text-2xl text-purple-400">{userWallets.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userWallets.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>지갑이 없습니다</p>
                        <button
                          onClick={handleAddCoins}
                          className="mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all border border-cyan-500/50"
                        >
                          코인 추가하기
                        </button>
                      </div>
                    ) : (
                      userWallets.map(wallet => (
                        <div
                          key={wallet.wallet_id}
                          className="bg-slate-800/70 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
                                <Coins className="w-5 h-5 text-cyan-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-slate-300 font-medium">{wallet.coin_type}</p>
                                  {wallet.wallet_type && (
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      wallet.wallet_type === 'hot' 
                                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                    }`}>
                                      {wallet.wallet_type === 'hot' ? 'Hot' : 'Cold'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-500 text-sm font-mono">{wallet.address.slice(0, 20)}...</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-lg text-cyan-400 font-mono">{wallet.balance.toFixed(8)}</p>
                                <p className="text-slate-500 text-sm">
                                  ≈ ₩{(wallet.balance * 1000).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(wallet.address, wallet.wallet_id)}
                                className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                              >
                                {copiedAddress === wallet.wallet_id ? (
                                  <Check className="w-5 h-5 text-green-400" />
                                ) : (
                                  <Copy className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </NeonCard>
          )}
        </div>
      </div>

      {/* 코인 추가 모달 */}
      {showAddCoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg border border-cyan-500/30 shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl text-cyan-400 mb-4">코인 추가</h3>
              
              {availableCoins.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  추가할 수 있는 코인이 없습니다
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableCoins.map(coin => (
                    <label
                      key={coin}
                      className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-cyan-500/50 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCoins.includes(coin)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCoins([...selectedCoins, coin]);
                          } else {
                            setSelectedCoins(selectedCoins.filter(c => c !== coin));
                          }
                        }}
                        className="w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
                      />
                      <span className="text-slate-300">{coin}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowAddCoinModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmAddCoins}
                  disabled={selectedCoins.length === 0 || isAddingCoins}
                  className="flex-1 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all border border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAddingCoins ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      추가 중...
                    </>
                  ) : (
                    `추가 (${selectedCoins.length})`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}