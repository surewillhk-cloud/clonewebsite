/**
 * POST /api/referral/bind
 * 新用户注册后绑定推荐关系
 * body: { ref: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { bindReferral } from '@/lib/referral';

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const refCode = body?.ref?.trim();
  if (!refCode) {
    return NextResponse.json({ error: 'Missing ref code' }, { status: 400 });
  }

  const result = await bindReferral(userId, refCode);
  return NextResponse.json({
    success: result.success,
    rewarded: result.rewarded,
  });
}
