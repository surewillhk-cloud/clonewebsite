/**
 * 推荐计划
 */

import { query, isDbConfigured } from '@/lib/db';
import { REFERRAL_REWARD_CREDITS } from '@/constants/plans';

const REFERRAL_CODE_LENGTH = 8;

function generateCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export async function getOrCreateReferralCode(userId: string): Promise<string | null> {
  if (!isDbConfigured()) return null;

  try {
    const existing = await query(
      'SELECT referral_code FROM profiles WHERE id = $1',
      [userId]
    );

    if (existing.rows[0]?.referral_code) {
      return existing.rows[0].referral_code;
    }

    let code = generateCode();
    for (let retry = 0; retry < 5; retry++) {
      const result = await query(
        `UPDATE profiles SET referral_code = $1, updated_at = NOW() 
         WHERE id = $2 AND referral_code IS NULL RETURNING referral_code`,
        [code, userId]
      );

      if (result.rows.length > 0) return code;

      const conflict = await query(
        'SELECT id FROM profiles WHERE referral_code = $1',
        [code]
      );
      if (conflict.rows.length > 0) {
        code = generateCode();
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function getReferrerByCode(code: string): Promise<string | null> {
  if (!isDbConfigured() || !code?.trim()) return null;

  try {
    const result = await query(
      'SELECT id FROM profiles WHERE referral_code = $1',
      [code.trim().toLowerCase()]
    );
    return result.rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function bindReferral(newUserId: string, refCode: string): Promise<{
  success: boolean;
  referrerId?: string;
  rewarded?: boolean;
}> {
  if (!isDbConfigured()) return { success: false };

  const referrerId = await getReferrerByCode(refCode);
  if (!referrerId || referrerId === newUserId) return { success: false };

  try {
    await query(
      'UPDATE profiles SET referred_by = $1, updated_at = NOW() WHERE id = $2',
      [referrerId, newUserId]
    );

    const rewarded = await grantReferralReward(referrerId, newUserId);
    return { success: true, referrerId, rewarded };
  } catch {
    return { success: false };
  }
}

async function grantReferralReward(referrerId: string, referredUserId: string): Promise<boolean> {
  if (!isDbConfigured()) return false;

  try {
    const profile = await query(
      'SELECT credits FROM profiles WHERE id = $1',
      [referrerId]
    );

    if (profile.rows.length === 0) return false;

    await query(
      'UPDATE profiles SET credits = credits + $1, updated_at = NOW() WHERE id = $2',
      [REFERRAL_REWARD_CREDITS, referrerId]
    );

    await query(
      `INSERT INTO billing_events 
       (user_id, event_type, credits_delta, metadata, created_at)
       VALUES ($1, 'credit_referral', $2, $3, NOW())`,
      [referrerId, REFERRAL_REWARD_CREDITS, JSON.stringify({ referredUserId })]
    );

    return true;
  } catch {
    return false;
  }
}

export async function getReferredCount(userId: string): Promise<number> {
  if (!isDbConfigured()) return 0;

  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM profiles WHERE referred_by = $1',
      [userId]
    );
    return parseInt(result.rows[0]?.count ?? '0', 10);
  } catch {
    return 0;
  }
}
