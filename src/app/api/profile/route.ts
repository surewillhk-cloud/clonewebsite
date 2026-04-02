/**
 * GET /api/profile
 * 获取当前用户 profile（credits、email、referral 等）
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/profiles';
import { getOrCreateReferralCode, getReferredCount } from '@/lib/referral';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://webecho.ai';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await ensureProfile(user.id, user.email);
  const [referralCode, referredCount] = await Promise.all([
    getOrCreateReferralCode(user.id),
    getReferredCount(user.id),
  ]);

  if (!profile) {
    return NextResponse.json({
      id: user.id,
      email: user.email,
      credits: 0,
      preferredLanguage: 'zh',
      referralCode: referralCode ?? undefined,
      referralLink: referralCode ? `${baseUrl}/register?ref=${referralCode}` : undefined,
      referredCount: referredCount ?? 0,
    });
  }

  return NextResponse.json({
    id: profile.id,
    email: profile.email ?? user.email,
    credits: profile.credits,
    preferredLanguage: profile.preferred_language ?? 'zh',
    referralCode: referralCode ?? profile.referral_code ?? undefined,
    referralLink: (referralCode ?? profile.referral_code)
      ? `${baseUrl}/register?ref=${referralCode ?? profile.referral_code}`
      : undefined,
    referredCount: referredCount ?? 0,
  });
}
