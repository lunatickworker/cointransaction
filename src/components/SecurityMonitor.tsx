import { Shield, AlertTriangle, Activity, Globe, Lock, Eye } from "lucide-react";
import { NeonCard } from "./NeonCard";

export function SecurityMonitor() {
  const securityAlerts = [
    {
      id: "SA001",
      type: "suspicious",
      severity: "high",
      title: "의심스러운 출금 패턴 감지",
      description: "user_5678이 비정상적으로 높은 금액(10 BTC)을 출금 요청했습니다.",
      timestamp: "2024-11-11 14:30:22",
      status: "pending"
    },
    {
      id: "SA002",
      type: "ip_whitelist",
      severity: "medium",
      title: "화이트리스트 외 IP 접근 시도",
      description: "관리자 계정에 등록되지 않은 IP(192.168.1.100)에서 접근을 시도했습니다.",
      timestamp: "2024-11-11 14:15:10",
      status: "blocked"
    },
    {
      id: "SA003",
      type: "2fa_failure",
      severity: "low",
      title: "2FA 인증 실패",
      description: "user_9012가 3회 연속 2FA 인증에 실패했습니다.",
      timestamp: "2024-11-11 13:45:33",
      status: "monitoring"
    },
    {
      id: "SA004",
      type: "withdrawal_limit",
      severity: "high",
      title: "일일 출금 한도 초과 시도",
      description: "user_3456이 일일 한도(1.0 BTC)를 초과하는 출금(1.5 BTC)을 요청했습니다.",
      timestamp: "2024-11-11 13:20:15",
      status: "resolved"
    }
  ];

  const ipWhitelist = [
    { ip: "203.123.45.67", label: "본사 오피스", status: "active", lastAccess: "2024-11-11 14:30" },
    { ip: "211.234.56.78", label: "데이터센터", status: "active", lastAccess: "2024-11-11 14:25" },
    { ip: "192.168.1.1", label: "VPN 서버", status: "active", lastAccess: "2024-11-11 13:50" },
    { ip: "175.123.89.90", label: "관리자 자택", status: "inactive", lastAccess: "2024-11-10 18:30" }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "low":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "blocked":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "resolved":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "monitoring":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cyan-400 mb-1">보안 모니터</h2>
          <p className="text-slate-400 text-sm">실시간 보안 이벤트 및 이상 거래 탐지</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm">시스템 정상</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-2xl">2</span>
            </div>
            <p className="text-slate-400 text-sm">높은 위험도</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 text-2xl">1</span>
            </div>
            <p className="text-slate-400 text-sm">중간 위험도</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-2xl">1</span>
            </div>
            <p className="text-slate-400 text-sm">해결됨</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 text-2xl">4</span>
            </div>
            <p className="text-slate-400 text-sm">활성 IP</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Alerts */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            보안 알림
          </h3>

          {securityAlerts.map((alert) => (
            <NeonCard key={alert.id}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity === "high" ? "높음" : alert.severity === "medium" ? "중간" : "낮음"}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(alert.status)}`}>
                        {alert.status === "pending" ? "대기중" : 
                         alert.status === "blocked" ? "차단됨" :
                         alert.status === "resolved" ? "해결됨" : "모니터링"}
                      </span>
                    </div>
                    <h4 className="text-slate-200 mb-1">{alert.title}</h4>
                    <p className="text-slate-400 text-sm">{alert.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <span className="text-slate-500 text-xs">{alert.timestamp}</span>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all text-xs">
                      상세보기
                    </button>
                    {alert.status === "pending" && (
                      <button className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all text-xs">
                        해결
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </NeonCard>
          ))}
        </div>

        {/* IP Whitelist */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-200 flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              IP 화이트리스트
            </h3>
            <button className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all text-xs">
              추가
            </button>
          </div>

          <NeonCard>
            <div className="space-y-3">
              {ipWhitelist.map((ip, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    ip.status === "active"
                      ? "bg-slate-800/30 border-slate-700/50"
                      : "bg-slate-800/20 border-slate-700/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        ip.status === "active" ? "bg-green-400 animate-pulse" : "bg-slate-500"
                      }`}></div>
                      <code className="text-cyan-400 text-sm">{ip.ip}</code>
                    </div>
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-xs mb-1">{ip.label}</p>
                  <p className="text-slate-500 text-xs">마지막 접근: {ip.lastAccess}</p>
                </div>
              ))}
            </div>
          </NeonCard>

          <NeonCard>
            <div className="space-y-3">
              <h4 className="text-slate-200 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                보안 설정
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                  <span className="text-slate-400">2FA 필수</span>
                  <span className="text-green-400">활성화</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                  <span className="text-slate-400">IP 제한</span>
                  <span className="text-green-400">활성화</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                  <span className="text-slate-400">다중 서명</span>
                  <span className="text-green-400">활성화</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                  <span className="text-slate-400">자동 탐지</span>
                  <span className="text-green-400">활성화</span>
                </div>
              </div>

              <button className="w-full px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all text-sm">
                보안 설정 관리
              </button>
            </div>
          </NeonCard>
        </div>
      </div>
    </div>
  );
}
