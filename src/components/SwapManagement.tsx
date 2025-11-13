import { useState } from "react";
import { Search, Filter, CheckCircle, XCircle, Clock, Repeat } from "lucide-react";
import { NeonCard } from "./NeonCard";

interface CoinSwap {
  swap_id: string;
  user_id: string;
  username: string;
  from_coin: string;
  to_coin: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  fee: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  completed_at?: string;
}

// 샘플 데이터
const SAMPLE_SWAPS: CoinSwap[] = [
  {
    swap_id: 'swap-001',
    user_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    username: '홍길동',
    from_coin: 'BTC',
    to_coin: 'ETH',
    from_amount: 0.1,
    to_amount: 2.1,
    exchange_rate: 21.0,
    fee: 0.0021,
    status: 'completed',
    created_at: '2024-11-10T10:30:00Z',
    completed_at: '2024-11-10T10:30:15Z'
  },
  {
    swap_id: 'swap-002',
    user_id: 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    username: '김철수',
    from_coin: 'ETH',
    to_coin: 'USDT',
    from_amount: 1.0,
    to_amount: 3196.8,
    exchange_rate: 3200.0,
    fee: 3.2,
    status: 'processing',
    created_at: '2024-11-11T09:15:00Z'
  },
  {
    swap_id: 'swap-003',
    user_id: 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
    username: '이영희',
    from_coin: 'USDT',
    to_coin: 'BTC',
    from_amount: 5000.0,
    to_amount: 0.0739,
    exchange_rate: 0.0000148,
    fee: 0.000074,
    status: 'pending',
    created_at: '2024-11-11T14:20:00Z'
  },
  {
    swap_id: 'swap-004',
    user_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    username: '홍길동',
    from_coin: 'BNB',
    to_coin: 'USDT',
    from_amount: 5.0,
    to_amount: 2898.55,
    exchange_rate: 580.0,
    fee: 2.9,
    status: 'completed',
    created_at: '2024-11-11T13:45:00Z',
    completed_at: '2024-11-11T13:45:12Z'
  },
  {
    swap_id: 'swap-005',
    user_id: 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    username: '김철수',
    from_coin: 'BTC',
    to_coin: 'USDC',
    from_amount: 0.05,
    to_amount: 3374.5,
    exchange_rate: 67500.0,
    fee: 3.375,
    status: 'failed',
    created_at: '2024-11-11T11:30:00Z'
  },
];

export function SwapManagement() {
  const [swaps] = useState<CoinSwap[]>(SAMPLE_SWAPS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Repeat className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': '대기 중',
      'processing': '처리 중',
      'completed': '완료',
      'failed': '실패',
      'cancelled': '취소됨'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
      case 'processing':
        return 'text-yellow-400';
      case 'failed':
      case 'cancelled':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const filteredSwaps = swaps.filter(swap => {
    const matchesSearch = swap.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         swap.from_coin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         swap.to_coin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || swap.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: swaps.length,
    completed: swaps.filter(s => s.status === 'completed').length,
    pending: swaps.filter(s => s.status === 'pending' || s.status === 'processing').length,
    failed: swaps.filter(s => s.status === 'failed' || s.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">코인 스왑 관리</h2>
        <p className="text-slate-400">사용자의 코인 교환 내역을 관리합니다</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NeonCard color="cyan">
          <div className="text-slate-400 text-sm mb-1">전체 스왑</div>
          <div className="text-2xl text-white">{stats.total}</div>
        </NeonCard>
        <NeonCard color="green">
          <div className="text-slate-400 text-sm mb-1">완료</div>
          <div className="text-2xl text-green-400">{stats.completed}</div>
        </NeonCard>
        <NeonCard color="yellow">
          <div className="text-slate-400 text-sm mb-1">대기/처리 중</div>
          <div className="text-2xl text-yellow-400">{stats.pending}</div>
        </NeonCard>
        <NeonCard color="red">
          <div className="text-slate-400 text-sm mb-1">실패/취소</div>
          <div className="text-2xl text-red-400">{stats.failed}</div>
        </NeonCard>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="사용자명 또는 코인으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800/50 border border-cyan-500/20 rounded-lg pl-12 pr-8 py-3 text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="all">전체 상태</option>
            <option value="pending">대기 중</option>
            <option value="processing">처리 중</option>
            <option value="completed">완료</option>
            <option value="failed">실패</option>
            <option value="cancelled">취소됨</option>
          </select>
        </div>
      </div>

      {/* Swap List */}
      <div className="bg-slate-800/30 border border-cyan-500/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-cyan-500/20">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-slate-400">사용자</th>
                <th className="px-6 py-4 text-left text-sm text-slate-400">교환</th>
                <th className="px-6 py-4 text-right text-sm text-slate-400">보낸 금액</th>
                <th className="px-6 py-4 text-right text-sm text-slate-400">받은 금액</th>
                <th className="px-6 py-4 text-right text-sm text-slate-400">환율</th>
                <th className="px-6 py-4 text-right text-sm text-slate-400">수수료</th>
                <th className="px-6 py-4 text-center text-sm text-slate-400">상태</th>
                <th className="px-6 py-4 text-left text-sm text-slate-400">시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredSwaps.map((swap) => (
                <tr key={swap.swap_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-white">{swap.username}</div>
                    <div className="text-xs text-slate-400">{swap.user_id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm">
                        {swap.from_coin}
                      </span>
                      <Repeat className="w-4 h-4 text-slate-400" />
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                        {swap.to_coin}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-white">{swap.from_amount}</div>
                    <div className="text-xs text-slate-400">{swap.from_coin}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-white">{swap.to_amount.toFixed(8)}</div>
                    <div className="text-xs text-slate-400">{swap.to_coin}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-slate-300 text-sm">
                      {swap.exchange_rate.toFixed(8)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-orange-400">{swap.fee.toFixed(8)}</div>
                    <div className="text-xs text-slate-400">{swap.to_coin}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {getStatusIcon(swap.status)}
                      <span className={`text-sm ${getStatusColor(swap.status)}`}>
                        {getStatusText(swap.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-300 text-sm">
                      {new Date(swap.created_at).toLocaleString('ko-KR')}
                    </div>
                    {swap.completed_at && (
                      <div className="text-xs text-slate-500">
                        완료: {new Date(swap.completed_at).toLocaleString('ko-KR')}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSwaps.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
}
