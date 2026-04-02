/**
 * POST /api/referral/bind
 * 新用户注册后绑定推荐关系
 * body: { ref: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bindReferral } from '@/lib/referral';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
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

  const result = await bindReferral(user.id, refCode);
  return NextResponse.json({
    success: result.success,
    rewarded: result.rewarded,
  });
}
