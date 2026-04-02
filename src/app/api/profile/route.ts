/**
 * GET /api/profile
 * 获取当前用户 profile（credits、email、referral 等）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthUserId } from '@/lib/api-auth';
import { ensureProfile } from '@/lib/profiles';
import { getOrCreateReferralCode, getReferredCount } from '@/lib/referral';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ch007.ai';

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? undefined;

  const profile = await ensureProfile(userId, email);
  const [referralCode, referredCount] = await Promise.all([
    getOrCreateReferralCode(userId),
    getReferredCount(userId),
  ]);

  if (!profile) {
    return NextResponse.json({
      id: userId,
      email: email ?? 'unknown',
      credits: 0,
      preferredLanguage: 'zh',
      referralCode: referralCode ?? undefined,
      referralLink: referralCode ? `${baseUrl}/register?ref=${referralCode}` : undefined,
      referredCount: referredCount ?? 0,
    });
  }

  return NextResponse.json({
    id: profile.id,
    email: profile.email ?? email ?? 'unknown',
    credits: profile.credits,
    preferredLanguage: profile.preferred_language ?? 'zh',
    referralCode: referralCode ?? profile.referral_code ?? undefined,
    referralLink: (referralCode ?? profile.referral_code)
      ? `${baseUrl}/register?ref=${referralCode ?? profile.referral_code}`
      : undefined,
    referredCount: referredCount ?? 0,
  });
}
