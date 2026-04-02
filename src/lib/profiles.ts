/**
 * profiles 表操作
 * 用户额度、自动创建/更新
 */

import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

export interface ProfileRow {
  id: string;
  email: string | null;
  credits: number;
  credits_expire_at: string | null;
  stripe_customer_id: string | null;
  preferred_language: string;
  referral_code?: string | null;
  referred_by?: string | null;
}

/**
 * 确保用户有 profile 记录，若无则创建
 */
export async function ensureProfile(
  userId: string,
  email?: string | null
): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const { data: existing } = await (supabase.from('profiles') as any)
      .select('id, email, credits, credits_expire_at, stripe_customer_id, preferred_language, referral_code, referred_by')
      .eq('id', userId)
      .single();

    if (existing) return existing as ProfileRow;

    const { data: inserted, error } = await (supabase.from('profiles') as any)
      .insert({
        id: userId,
        email: email ?? null,
        credits: 0,
        preferred_language: 'zh',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, email, credits, credits_expire_at, stripe_customer_id, preferred_language, referral_code, referred_by')
      .single();

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return ((await (supabase.from('profiles') as any).select('*').eq('id', userId).single()) as { data: ProfileRow }).data;
      }
      throw error;
    }
    return inserted as ProfileRow;
  } catch {
    return null;
  }
}

/**
 * 获取用户当前额度
 */
export async function getCredits(userId: string): Promise<number> {
  const profile = await ensureProfile(userId);
  return profile?.credits ?? 0;
}
