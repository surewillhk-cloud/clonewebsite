/**
 * profiles 表操作
 * 用户额度管理
 */

import { query, isDbConfigured } from '@/lib/db';

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

export async function ensureProfile(
  userId: string,
  email?: string | null
): Promise<ProfileRow | null> {
  if (!isDbConfigured()) return null;

  try {
    const existing = await query(
      `SELECT id, email, credits, credits_expire_at, stripe_customer_id, 
              preferred_language, referral_code, referred_by 
       FROM profiles WHERE id = $1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0] as ProfileRow;
    }

    await query(
      `INSERT INTO profiles (id, email, credits, preferred_language, created_at, updated_at)
       VALUES ($1, $2, 0, 'zh', NOW(), NOW())`,
      [userId, email ?? null]
    );

    const inserted = await query(
      `SELECT id, email, credits, credits_expire_at, stripe_customer_id, 
              preferred_language, referral_code, referred_by 
       FROM profiles WHERE id = $1`,
      [userId]
    );

    return inserted.rows[0] as ProfileRow;
  } catch (err) {
    console.error('[profiles] ensureProfile error:', err);
    return null;
  }
}

export async function getCredits(userId: string): Promise<number> {
  const profile = await ensureProfile(userId);
  return profile?.credits ?? 0;
}

export async function updateCredits(
  userId: string,
  delta: number
): Promise<boolean> {
  if (!isDbConfigured()) return false;

  try {
    await query(
      `UPDATE profiles SET credits = credits + $1, updated_at = NOW() WHERE id = $2`,
      [delta, userId]
    );
    return true;
  } catch (err) {
    console.error('[profiles] updateCredits error:', err);
    return false;
  }
}
