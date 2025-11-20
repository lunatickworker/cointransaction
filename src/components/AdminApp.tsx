import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { DepositWithdrawalManagement } from "./DepositWithdrawalManagement";
import { UserWalletManagement } from "./UserWalletManagement";
import { SecurityMonitor } from "./SecurityMonitor";
import { SwapManagement } from "./SwapManagement";
import { CoinManagement } from "./CoinManagement";
import { AccountVerificationManagement } from "./AccountVerificationManagement";
import { GasSponsorshipPolicy } from "./GasSponsorshipPolicy";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background effects - 약화된 버전 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex h-screen">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onNavigate={setActiveTab} />
          
          <main className="flex-1 overflow-y-auto p-6">
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "users-wallets" && <UserWalletManagement />}
            {activeTab === "account-verifications" && <AccountVerificationManagement />}
            {activeTab === "gas-policy" && <GasSponsorshipPolicy />}
            {activeTab === "deposit-withdrawal" && <DepositWithdrawalManagement />}
            {activeTab === "swaps" && <SwapManagement />}
            {activeTab === "coins" && <CoinManagement />}
            {activeTab === "security" && <SecurityMonitor />}
          </main>
        </div>
      </div>
    </div>
  );
}