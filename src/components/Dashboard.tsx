import { TrendingUp, TrendingDown, Users, AlertTriangle, Wallet, Activity } from "lucide-react";
import { NeonCard } from "./NeonCard";
import { StatCard } from "./StatCard";

export function Dashboard() {
  const stats = [
    {
      title: "총 사용자",
      value: "12,847",
      change: "+12.5%",
      trend: "up",
      icon: Users,
      color: "cyan"
    },
    {
      title: "오늘 입금",
      value: "₩284.5M",
      change: "+8.2%",
      trend: "up",
      icon: TrendingUp,
      color: "green"
    },
    {
      title: "오늘 출금",
      value: "₩156.2M",
      change: "-3.1%",
      trend: "down",
      icon: TrendingDown,
      color: "purple"
    },
    {
      title: "대기 승인",
      value: "47",
      change: "처리 필요",
      trend: "warning",
      icon: AlertTriangle,
      color: "amber"
    }
  ];

  const recentTransactions = [
    { id: "TX001", user: "user_1234", type: "입금", coin: "BTC", amount: "0.5", status: "confirmed", time: "2분 전" },
    { id: "TX002", user: "user_5678", type: "출금", coin: "ETH", amount: "2.3", status: "pending", time: "5분 전" },
    { id: "TX003", user: "user_9012", type: "입금", coin: "USDT", amount: "10,000", status: "confirmed", time: "12분 전" },
    { id: "TX004", user: "user_3456", type: "출금", coin: "BTC", amount: "0.15", status: "processing", time: "18분 전" },
    { id: "TX005", user: "user_7890", type: "입금", coin: "ETH", amount: "5.2", status: "confirmed", time: "25분 전" },
  ];

  const walletStatus = [
    { type: "Hot Wallet", balance: "₩1.2B", percentage: 15, color: "from-orange-500 to-red-500" },
    { type: "Cold Wallet", balance: "₩6.8B", percentage: 85, color: "from-cyan-500 to-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-cyan-400 mb-1">시스템 대시보드</h2>
        <p className="text-slate-400 text-sm">실시간 운영 현황 모니터링</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <NeonCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h3 className="text-slate-200">최근 거래</h3>
            </div>
            <button className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
              전체보기
            </button>
          </div>

          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.type === "입금" 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {tx.coin}
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm">{tx.user}</p>
                    <p className="text-slate-500 text-xs">{tx.id}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-sm ${
                    tx.type === "입금" ? "text-green-400" : "text-purple-400"
                  }`}>
                    {tx.type === "입금" ? "+" : "-"}{tx.amount} {tx.coin}
                  </p>
                  <p className="text-slate-500 text-xs">{tx.time}</p>
                </div>

                <div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    tx.status === "confirmed"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : tx.status === "pending"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  }`}>
                    {tx.status === "confirmed" ? "완료" : tx.status === "pending" ? "대기" : "처리중"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </NeonCard>

        {/* Wallet Status */}
        <NeonCard>
          <div className="flex items-center gap-2 mb-6">
            <Wallet className="w-5 h-5 text-cyan-400" />
            <h3 className="text-slate-200">지갑 현황</h3>
          </div>

          <div className="space-y-6">
            {walletStatus.map((wallet, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">{wallet.type}</span>
                  <span className="text-slate-200">{wallet.balance}</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${wallet.color} rounded-full shadow-lg`}
                    style={{ width: `${wallet.percentage}%` }}
                  ></div>
                </div>
                <p className="text-slate-500 text-xs mt-1">{wallet.percentage}% of total</p>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">총 보유액</span>
                <span className="text-cyan-400">₩8.0B</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-slate-300 text-sm">시스템 상태</span>
              </div>
              <p className="text-slate-400 text-xs">모든 노드 정상 작동 중</p>
            </div>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}
