import { LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Shield, Repeat, Zap, Coins, CheckCircle, ShoppingCart, Activity, Users } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  
  const menuItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "users-wallets", label: "사용자 & 지갑", icon: Users },
    { id: "deposit-withdrawal", label: "구매 요청 관리", icon: ShoppingCart },
    { id: "swaps", label: "스왑 관리", icon: Repeat },
    { id: "account-verifications", label: "계좌인증 관리", icon: CheckCircle },
    { id: "coins", label: "코인 관리", icon: Coins },
    { id: "gas-policy", label: "가스비 정책", icon: Zap },
    { id: "security", label: "보안 모니터", icon: Shield },
  ];

  return (
    <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-cyan-500/20">
      <div className="p-6">
        <button 
          onClick={() => {
            window.location.hash = '#';
            window.location.reload();
          }}
          className="flex items-center gap-3 mb-8 group w-full hover:scale-105 transition-transform"
        >
          <div 
            className="w-10 h-10 rounded-lg bg-slate-800 border-2 border-cyan-500 flex items-center justify-center transition-all"
            style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.6), inset 0 0 15px rgba(6, 182, 212, 0.2)' }}
          >
            <Activity className="w-6 h-6 text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 1))' }} />
          </div>
          <div>
            <h1 className="text-cyan-400 group-hover:text-cyan-300 transition-colors">GMS</h1>
            <p className="text-slate-400 text-xs">Crypto Management</p>
          </div>
        </button>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-cyan-500/20 border border-cyan-500/50 shadow-lg shadow-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-cyan-300 border border-transparent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}