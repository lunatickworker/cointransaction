/**
 * 가스비 정책 헬퍼 함수
 * 
 * 사용자 레벨에 따른 가스비 스폰서십 정책을 자동으로 가져옵니다.
 */

import { supabase } from '../supabase/client';

export interface GasPaymentConfig {
  sponsor: boolean;
  token?: string;
  maxUserPayment?: string;
}

/**
 * 사용자 레벨에 따른 가스비 정책 가져오기
 */
export async function getGasPolicyForUser(userId: string): Promise<GasPaymentConfig> {
  try {
    // 1. 사용자 레벨 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('level')
      .eq('user_id', userId)
      .single();

    if (userError || !userData) {
      console.error('User fetch error:', userError);
      // 기본값: 사용자가 100% 부담
      return {
        sponsor: false,
        token: 'USDC'
      };
    }

    const userLevel = userData.level || 'Basic';

    // 2. 해당 레벨의 가스비 정책 가져오기
    const { data: policyData, error: policyError } = await supabase
      .from('gas_sponsorship_policies')
      .select('*')
      .eq('user_level', userLevel)
      .eq('is_active', true)
      .single();

    if (policyError || !policyData) {
      console.error('Policy fetch error:', policyError);
      // 기본값: 사용자가 100% 부담
      return {
        sponsor: false,
        token: 'USDC'
      };
    }

    // 3. 정책에 따라 gasPayment 설정
    switch (policyData.sponsor_mode) {
      case 'operator':
        // 100% 운영자 부담
        return {
          sponsor: true
        };

      case 'partial':
        // 부분 지원: 사용자는 maxUserPayment까지만 부담
        return {
          sponsor: true,
          token: policyData.gas_token,
          maxUserPayment: policyData.max_user_payment?.toString() || '1'
        };

      case 'user':
      default:
        // 100% 사용자 부담
        return {
          sponsor: false,
          token: policyData.gas_token
        };
    }
  } catch (error) {
    console.error('Gas policy fetch error:', error);
    // 에러 발생 시 기본값
    return {
      sponsor: false,
      token: 'USDC'
    };
  }
}

/**
 * 가스비 정책을 사용자 친화적인 텍스트로 변환
 */
export function getGasPolicyDescription(config: GasPaymentConfig, userLevel: string): string {
  if (config.sponsor && !config.maxUserPayment) {
    return `${userLevel} 회원 혜택: 가스비 100% 무료 🎉`;
  }
  
  if (config.sponsor && config.maxUserPayment) {
    return `${userLevel} 회원 혜택: 최대 ${config.maxUserPayment} ${config.token}까지만 부담 ✨`;
  }
  
  return `가스비는 ${config.token}로 지불됩니다`;
}

/**
 * 사용자 레벨 배지 색상 가져오기
 */
export function getLevelBadgeColor(level: string): string {
  switch (level) {
    case 'VIP':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Premium':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Standard':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'Basic':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}