import { useState, useEffect } from 'react';
import { Zap, Save, AlertCircle, Info, Crown, Star, Award, Users } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface Policy {
  policy_id: string;
  user_level: 'VIP' | 'Premium' | 'Standard' | 'Basic';
  sponsor_mode: 'user' | 'partial' | 'operator';
  max_user_payment: number | null;
  gas_token: string;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export function GasSponsorshipPolicy() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('gas_sponsorship_policies')
        .select('*')
        .order('user_level', { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('정책 로드 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (policy: Policy) => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('gas_sponsorship_policies')
        .update({
          sponsor_mode: policy.sponsor_mode,
          max_user_payment: policy.max_user_payment,
          gas_token: policy.gas_token,
          description: policy.description,
          is_active: policy.is_active,
        })
        .eq('policy_id', policy.policy_id);

      if (error) throw error;

      toast.success('정책이 저장되었습니다');
      setEditingPolicy(null);
      // DB에서 다시 불러오지 않고 로컬 상태만 유지 (이미 policies에 업데이트되어 있음)
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('저장 실패');
      // 실패 시 원래 데이터로 롤백
      await fetchPolicies();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (policy: Policy, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('gas_sponsorship_policies')
        .update({ is_active: isActive })
        .eq('policy_id', policy.policy_id);

      if (error) throw error;

      // 로컬 상태 업데이트
      setPolicies(policies.map(p => 
        p.policy_id === policy.policy_id 
          ? { ...p, is_active: isActive } 
          : p
      ));

      toast.success(isActive ? '정책이 활성화되었습니다' : '정책이 비활성화되었습니다');
    } catch (error: any) {
      console.error('Toggle error:', error);
      toast.error('상태 변경 실패');
      // 실패 시 원래 데이터로 복원
      await fetchPolicies();
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'VIP':
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 'Premium':
        return <Star className="w-6 h-6 text-purple-400" />;
      case 'Standard':
        return <Award className="w-6 h-6 text-cyan-400" />;
      case 'Basic':
        return <Users className="w-6 h-6 text-slate-400" />;
      default:
        return null;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'VIP':
        return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
      case 'Premium':
        return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'Standard':
        return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30';
      case 'Basic':
        return 'from-slate-500/20 to-slate-600/20 border-slate-500/30';
      default:
        return 'from-slate-500/20 to-slate-600/20 border-slate-500/30';
    }
  };

  const getSponsorModeText = (mode: string) => {
    switch (mode) {
      case 'operator':
        return '100% 운영자 부담';
      case 'partial':
        return '부분 지원';
      case 'user':
        return '100% 사용자 부담';
      default:
        return mode;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white text-3xl mb-2">가스비 스폰서십 정책</h1>
        <p className="text-slate-400">사용자 레벨별 가스비 지원 정책을 설정합니다</p>
      </div>

      {/* 안내 카드 */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-cyan-400 mb-2">가스비 스폰서십이란?</h3>
            <ul className="space-y-1 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>100% 운영자 부담:</strong> 사용자는 가스비를 전혀 지불하지 않음</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>부분 지원:</strong> 사용자는 일정 금액까지만 부담, 초과분은 운영자가 부담</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>100% 사용자 부담:</strong> 사용자가 USDT 등 ERC-20 토큰으로 가스비 지불</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">활성 정책</span>
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-white text-2xl">
            {policies.filter(p => p.is_active).length} / {policies.length}
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-400 text-sm">100% 스폰서</span>
            <Crown className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-white text-2xl">
            {policies.filter(p => p.sponsor_mode === 'operator' && p.is_active).length}개
          </div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-400 text-sm">부분 스폰서</span>
            <Star className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-white text-2xl">
            {policies.filter(p => p.sponsor_mode === 'partial' && p.is_active).length}개
          </div>
        </div>
      </div>

      {/* 정책 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {policies.map((policy) => (
          <div
            key={policy.policy_id}
            className={`bg-gradient-to-br ${getLevelColor(policy.user_level)} border rounded-2xl p-6 transition-all hover:shadow-lg`}
          >
            {/* 레벨 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getLevelIcon(policy.user_level)}
                <div>
                  <h3 className="text-white text-xl">{policy.user_level}</h3>
                  <p className="text-slate-400 text-sm">{policy.description}</p>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={policy.is_active}
                  onChange={(e) => handleToggleActive(policy, e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-slate-300 text-sm">활성</span>
              </label>
            </div>

            {/* 정책 설정 */}
            <div className="space-y-4">
              {/* 스폰서 모드 */}
              <div>
                <label className="block text-slate-300 mb-2 text-sm">스폰서 모드</label>
                <select
                  value={policy.sponsor_mode}
                  onChange={(e) => {
                    const updated = { 
                      ...policy, 
                      sponsor_mode: e.target.value as Policy['sponsor_mode'],
                      max_user_payment: e.target.value === 'partial' ? policy.max_user_payment || 1.0 : null
                    };
                    setPolicies(policies.map(p => p.policy_id === policy.policy_id ? updated : p));
                    setEditingPolicy(updated);
                  }}
                  className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="operator">100% 운영자 부담</option>
                  <option value="partial">부분 지원</option>
                  <option value="user">100% 사용자 부담</option>
                </select>
              </div>

              {/* 최대 사용자 부담액 (partial 모드일 때만) */}
              {policy.sponsor_mode === 'partial' && (
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">
                    최대 사용자 부담액 ({policy.gas_token})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={policy.max_user_payment || 0}
                    onChange={(e) => {
                      const updated = { ...policy, max_user_payment: parseFloat(e.target.value) };
                      setPolicies(policies.map(p => p.policy_id === policy.policy_id ? updated : p));
                      setEditingPolicy(updated);
                    }}
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    초과분은 운영자가 부담합니다
                  </p>
                </div>
              )}

              {/* 가스 토큰 */}
              {policy.sponsor_mode !== 'operator' && (
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">가스비 토큰</label>
                  <select
                    value={policy.gas_token}
                    onChange={(e) => {
                      const updated = { ...policy, gas_token: e.target.value };
                      setPolicies(policies.map(p => p.policy_id === policy.policy_id ? updated : p));
                      setEditingPolicy(updated);
                    }}
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="USDC">USDC (Biconomy 지원)</option>
                  </select>
                  <p className="text-slate-500 text-xs mt-1">
                    Biconomy는 USDC만 가스비 토큰으로 지원합니다
                  </p>
                </div>
              )}

              {/* 설명 */}
              <div>
                <label className="block text-slate-300 mb-2 text-sm">설명</label>
                <textarea
                  value={policy.description}
                  onChange={(e) => {
                    const updated = { ...policy, description: e.target.value };
                    setPolicies(policies.map(p => p.policy_id === policy.policy_id ? updated : p));
                    setEditingPolicy(updated);
                  }}
                  rows={2}
                  className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              </div>

              {/* 저장 버튼 */}
              {editingPolicy?.policy_id === policy.policy_id && (
                <button
                  onClick={() => handleSave(policy)}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? '저장 중...' : '저장하기'}
                </button>
              )}
            </div>

            {/* 정책 요약 */}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">현재 정책:</span>
                <span className="text-white">
                  {getSponsorModeText(policy.sponsor_mode)}
                  {policy.sponsor_mode === 'partial' && policy.max_user_payment && (
                    <span className="text-cyan-400 ml-1">
                      (최대 {policy.max_user_payment} {policy.gas_token})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 주의사항 */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 mb-2">주의사항</p>
            <ul className="space-y-1 text-amber-300 text-sm">
              <li>• 정책 변경은 즉시 적용됩니다</li>
              <li>• VIP/Premium 회원의 가스비는 운영자 부담이 권장됩니다</li>
              <li>• 부분 지원 시 최대 부담액을 적절히 설정하세요</li>
              <li>• 가스비 토큰은 사용자가 보유한 토큰으로 설정하세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}