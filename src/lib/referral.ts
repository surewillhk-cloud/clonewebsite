/**
 * 推荐计划：推荐码生成、绑定、奖励
 */

import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { REFERRAL_REWARD_CREDITS } from '@/constants/plans';

const REFERRAL_CODE_LENGTH = 8;

function generateCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // 易读，无混淆字符
  let s = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

/**
 * 生成或获取用户推荐码（幂等）
 */
export async function getOrCreateReferralCode(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const { data: existing } = await (supabase.from('profiles') as any)
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (existing?.referral_code) return existing.referral_code;

    let code = generateCode();
    for (let retry = 0; retry < 5; retry++) {
      const { error } = await (supabase.from('profiles') as any)
        .update({ referral_code: code, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .is('referral_code', null);

      if (!error) return code;
      if ((error as { code?: string }).code === '23505') code = generateCode();
      else throw error;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 根据推荐码查找推荐人 user id
 */
export async function getReferrerByCode(code: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !code?.trim()) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await (supabase.from('profiles') as any)
      .select('id')
      .eq('referral_code', code.trim().toLowerCase())
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * 绑定推荐关系：新用户通过推荐链接注册后调用
 */
export async function bindReferral(newUserId: string, refCode: string): Promise<{
  success: boolean;
  referrerId?: string;
  rewarded?: boolean;
}> {
  if (!isSupabaseConfigured()) return { success: false };
  const referrerId = await getReferrerByCode(refCode);
  if (!referrerId || referrerId === newUserId) return { success: false };

  try {
    const supabase = createAdminClient();
    const { error } = await (supabase.from('profiles') as any)
      .update({ referred_by: referrerId, updated_at: new Date().toISOString() })
      .eq('id', newUserId);

    if (error) return { success: false };

    const rewarded = await grantReferralReward(referrerId, newUserId);
    return { success: true, referrerId, rewarded };
  } catch {
    return { success: false };
  }
}

/**
 * 发放推荐奖励给推荐人
 */
async function grantReferralReward(referrerId: string, referredUserId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = createAdminClient();
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('credits')
      .eq('id', referrerId)
      .single();

    if (!profile) return false;

    await (supabase.from('profiles') as any)
      .update({
        credits: (profile.credits ?? 0) + REFERRAL_REWARD_CREDITS,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referrerId);

    await (supabase.from('billing_events') as any).insert({
      user_id: referrerId,
      event_type: 'credit_referral',
      credits_delta: REFERRAL_REWARD_CREDITS,
      metadata: { referredUserId },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * 获取用户推荐成功人数
 */
export async function getReferredCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const supabase = createAdminClient();
    const { count } = await (supabase.from('profiles') as any)
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', userId);
    return count ?? 0;
  } catch {
    return 0;
  }
}
