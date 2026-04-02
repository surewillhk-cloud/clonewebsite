/**
 * PUT /api/platform-admin/users/[userId]/credits
 * 手动调整用户额度（平台管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const schema = z.object({
  delta: z.number().int(),
  reason: z.string().max(500).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { delta, reason } = parsed.data;
    if (delta === 0) {
      return NextResponse.json({ error: 'delta cannot be 0' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const db = supabase as any;

    // 获取当前 profile
    const { data: profile, error: fetchError } = await db
      .from('profiles')
      .select('id, credits')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newCredits = Math.max(0, (profile.credits ?? 0) + delta);

    // 更新 profiles
    const { error: updateError } = await db
      .from('profiles')
      .update({
        credits: newCredits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 记录 billing_events
    await db.from('billing_events').insert({
      user_id: userId,
      event_type: 'manual_credit',
      amount: 0,
      credits_delta: delta,
      metadata: {
        admin_email: admin.email,
        reason: reason || '平台管理员手动调整',
      },
    });

    return NextResponse.json({
      ok: true,
      userId,
      previousCredits: profile.credits ?? 0,
      newCredits,
      delta,
    });
  } catch (e) {
    console.error('[Platform Admin Credits PUT]', e);
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
  }
}
