import { Search, UserCheck, UserX, Lock, Wallet, Plus, Loader2, Copy, Check, Shield, Activity, TrendingUp, Coins, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { NeonCard } from "./NeonCard";
import { useAuth } from "../contexts/AuthContext";

interface UserData {
  user_id: string;
  username: string;
  email: string;
  account_verification_status: string;
  status: string;
  created_at: string;
  last_login: string;
  role?: string;
  level?: string;
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
  const { user } = useAuth();
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

  // 사용자 정보 편집
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    newPassword: ''
  });
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

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
    
    try {
      // Backend API로 사용자 데이터 가져오기 (RLS 우회)
      const backendUrl = 'https://mzoeeqmtvlnyonicycvg.supabase.co/functions/v1/make-server-b6d5667f';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b2VlcW10dmxueW9uaWN5Y3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjIyNzcsImV4cCI6MjA3ODQ5ODI3N30.oo7FsWjthtBtM-Xa1VFJieMGQ4mG__V8w7r9qGBPzaI';
      
      console.log('🔍 Fetching users from Backend API:', `${backendUrl}/api/admin/users`);
      
      const response = await fetch(`${backendUrl}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('📡 Response status:', response.status);
      
      const result = await response.json();
      console.log('📦 Response data:', result);

      if (result.success && result.users) {
        console.log('✅ Users loaded:', result.users.length);
        setUsers(result.users);
        
        // 통계 계산
        const totalUsers = result.users.length;
        const verifiedUsers = result.users.filter((u: any) => u.account_verification_status === 'verified').length;
        
        // 지갑 데이터도 Backend API로 가져오기
        const { data: walletsData } = await supabase
          .from('wallets')
          .select('balance, coin_type');
        
        const totalWallets = walletsData?.length || 0;
        const totalValue = walletsData?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;

        setStats({
          totalUsers,
          verifiedUsers,
          totalWallets,
          totalValue
        });
      } else {
        console.error('❌ Backend API error:', result);
        toast.error(result.error || '사용자 데이터를 가져오는데 실패했습니다');
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      toast.error('사용자 데이터를 가져오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
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
    setIsEditMode(false); // 편집 모드 초기화
    setShowPasswordReset(false); // 비밀번호 모달 초기화
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

  const handleEditUser = () => {
    if (!selectedUser) return;
    setEditForm({
      username: selectedUser.username,
      email: selectedUser.email,
      newPassword: ''
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditForm({ username: '', email: '', newPassword: '' });
  };

  const handleSaveUserInfo = async () => {
    if (!selectedUser) return;

    try {
      // 사용자 기본 정보 업데이트
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: editForm.username,
          email: editForm.email
        })
        .eq('user_id', selectedUser.user_id);

      if (updateError) throw updateError;

      toast.success('사용자 정보가 업데이트되었습니다');
      
      // 선택된 사용자 업데이트
      setSelectedUser({
        ...selectedUser,
        username: editForm.username,
        email: editForm.email
      });
      
      await fetchData();
      setIsEditMode(false);
    } catch (error) {
      console.error('Update error:', error);
      toast.error('정보 업데이트에 실패했습니다');
    }
  };

  const handleGeneratePassword = () => {
    // 안전한 임시 비밀번호 생성 (12자리: 대문자+소문자+숫자+특수문자)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    const length = 12;
    let password = '';
    
    // 각 카테고리에서 최소 1개씩
    password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]; // 대문자
    password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 24)]; // 소문자
    password += '23456789'[Math.floor(Math.random() * 8)]; // 숫자
    password += '!@#$%'[Math.floor(Math.random() * 5)]; // 특수문자
    
    // 나머지 랜덤
    for (let i = 4; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // 섞기
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setGeneratedPassword(password);
    setShowPasswordReset(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !generatedPassword) return;

    try {
      // users 테이블에 임시 비밀번호 저장 (해시화는 로그인 시 처리)
      const { error } = await supabase
        .from('users')
        .update({ 
          password_hash: generatedPassword // 실제로는 bcrypt 해시 필요
        })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      toast.success('비밀번호가 초기화되었습니다. 새 비밀번호를 사용자에게 안전하게 전달하세요.');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('비밀번호 초기화에 실패했습니다');
    }
  };

  const handleCopyPassword = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(generatedPassword);
        toast.success('비밀번호가 클립보드에 복사되었습니다');
      } else {
        // Fallback: 텍스트 선택 및 수동 복사
        const textArea = document.createElement('textarea');
        textArea.value = generatedPassword;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('비밀번호가 클립보드에 복사되었습니다');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('복사에 실패했습니다. 수동으로 복사해주세요.');
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

  const copyToClipboard = async (address: string, walletId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(walletId);
        toast.success('주소가 복사되었습니다');
        setTimeout(() => setCopiedAddress(null), 2000);
      } else {
        // Fallback: 텍스트 선택 및 수동 복사
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedAddress(walletId);
        toast.success('주소가 복사되었습니다');
        setTimeout(() => setCopiedAddress(null), 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('복사에 실패했습니다. 수동으로 복사해주세요.');
    }
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
            <NeonCard className="p-12 h-[calc(100vh-300px)] flex items-center justify-center">
              <div className="text-center text-slate-400">
                <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>사용자를 선택해주세요</p>
              </div>
            </NeonCard>
          ) : (
            <NeonCard className="p-6 h-[calc(100vh-300px)]">
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
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg text-cyan-400 flex items-center gap-2">
                          <UserCheck className="w-5 h-5" />
                          기본 정보
                        </h3>
                        {!isEditMode ? (
                          <button
                            onClick={handleEditUser}
                            className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all border border-purple-500/50 text-sm"
                          >
                            정보 수정
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveUserInfo}
                              className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all border border-green-500/50 text-sm"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500 transition-all text-sm"
                            >
                              취소
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 text-sm mb-1">사용자명</p>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={editForm.username}
                              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-300 focus:outline-none focus:border-cyan-500"
                            />
                          ) : (
                            <p className="text-slate-300">{selectedUser.username}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">이메일</p>
                          {isEditMode ? (
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-300 focus:outline-none focus:border-cyan-500"
                            />
                          ) : (
                            <p className="text-slate-300">{selectedUser.email}</p>
                          )}
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
                        <div>
                          <p className="text-slate-400 text-sm mb-1">
                            회원 등급
                            <span className="ml-2 text-xs text-cyan-400">💡 가스비 정책 자동 적용</span>
                          </p>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedUser.level || 'Basic'}
                              onChange={async (e) => {
                                const newLevel = e.target.value;
                                
                                try {
                                  // Backend API로 등급 업데이트
                                  const backendUrl = 'https://mzoeeqmtvlnyonicycvg.supabase.co/functions/v1/make-server-b6d5667f';
                                  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b2VlcW10dmxueW9uaWN5Y3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjIyNzcsImV4cCI6MjA3ODQ5ODI3N30.oo7FsWjthtBtM-Xa1VFJieMGQ4mG__V8w7r9qGBPzaI';
                                  
                                  const response = await fetch(`${backendUrl}/api/admin/users/${selectedUser.user_id}/level`, {
                                    method: 'PUT',
                                    headers: {
                                      'Authorization': `Bearer ${anonKey}`,
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ level: newLevel })
                                  });

                                  const result = await response.json();
                                  
                                  if (!result.success) {
                                    throw new Error(result.error || '등급 변경 실패');
                                  }
                                  
                                  toast.success(`등급이 ${newLevel}로 변경되었습니다. 가스비 정책이 자동으로 적용됩니다.`);
                                  setSelectedUser({ ...selectedUser, level: newLevel });
                                  await fetchData();
                                } catch (error: any) {
                                  console.error('Level update error:', error);
                                  toast.error(error.message || '등급 변경 실패');
                                }
                              }}
                              className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                            >
                              <option value="Basic">Basic (100% 사용자 부담)</option>
                              <option value="Standard">Standard (부분 지원)</option>
                              <option value="Premium">Premium (대부분 지원)</option>
                              <option value="VIP">VIP (100% 운영자 부담)</option>
                            </select>
                            {selectedUser.level === 'VIP' && <span className="text-yellow-400">👑</span>}
                            {selectedUser.level === 'Premium' && <span className="text-purple-400">💎</span>}
                            {selectedUser.level === 'Standard' && <span className="text-cyan-400">⭐</span>}
                          </div>
                        </div>
                      </div>

                      {/* 비밀번호 초기화 - 기본 정보 카드 내부 */}
                      <div className="mt-6 pt-6 border-t border-slate-700/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-orange-400" />
                            <p className="text-slate-400 text-sm">비밀번호 초기화</p>
                          </div>
                          <button
                            onClick={handleGeneratePassword}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all border border-orange-500/50 text-sm"
                          >
                            <Shield className="w-4 h-4" />
                            임시 비밀번호 생성
                          </button>
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

      {/* 비밀번호 초기화 모달 */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg border border-orange-500/30 shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl text-orange-400 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                임시 비밀번호
              </h3>
              
              <div className="space-y-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-950 px-3 py-2 rounded text-cyan-400 font-mono text-lg">
                      {generatedPassword}
                    </code>
                    <button
                      onClick={handleCopyPassword}
                      className="p-2 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-all"
                      title="복사"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <p className="text-slate-400 text-sm text-center">
                  사용자에게 전달 후 모바일 앱에서 직접 변경할 수 있습니다
                </p>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowPasswordReset(false);
                    setGeneratedPassword('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    await handleResetPassword();
                    setShowPasswordReset(false);
                  }}
                  className="flex-1 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all border border-orange-500/50"
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}