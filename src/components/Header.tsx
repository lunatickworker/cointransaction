import { Bell, User, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner@2.0.3";

export function Header() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다');
  };

  return (
    <header className="h-16 bg-slate-900/50 backdrop-blur-xl border-b border-cyan-500/20 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
          <span className="text-slate-400 text-sm">System Active</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-cyan-400 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-700"></div>
        
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center"
            style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.6), inset 0 0 10px rgba(6, 182, 212, 0.2)' }}
          >
            <User className="w-4 h-4 text-cyan-400" style={{ filter: 'drop-shadow(0 0 2px rgba(6, 182, 212, 1))' }} />
          </div>
          <div>
            <p className="text-sm text-slate-300">{user?.username || 'Admin'}</p>
            <p className="text-xs text-slate-500">관리자</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}