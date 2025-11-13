import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { WithdrawalManagement } from "./WithdrawalManagement";
import { DepositManagement } from "./DepositManagement";
import { UserManagement } from "./UserManagement";
import { SecurityMonitor } from "./SecurityMonitor";
import { WalletManagement } from "./WalletManagement";
import { SwapManagement } from "./SwapManagement";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AdminAppProps {
  onNavigateToUser: () => void;
}

export function AdminApp({ onNavigateToUser }: AdminAppProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex h-screen">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onNavigateToUser={onNavigateToUser} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          
          <main className="flex-1 overflow-y-auto p-6">
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "withdrawals" && <WithdrawalManagement />}
            {activeTab === "deposits" && <DepositManagement />}
            {activeTab === "users" && <UserManagement />}
            {activeTab === "wallets" && <WalletManagement />}
            {activeTab === "swaps" && <SwapManagement />}
            {activeTab === "security" && <SecurityMonitor />}
          </main>
        </div>
      </div>
    </div>
  );
}