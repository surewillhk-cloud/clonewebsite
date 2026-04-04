/**
 * PUT /api/platform-admin/users/[userId]/credits
 * 手动调整用户额度（平台管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  delta: z.number().int().min(-100000).max(100000),
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

    // 获取当前 profile
    const profileResult = await query(
      'SELECT id, credits FROM profiles WHERE id = $1',
      [userId]
    );
    const profile = profileResult.rows[0];

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newCredits = Math.max(0, (profile.credits ?? 0) + delta);

    // 更新 profiles
    const updateResult = await query(
      'UPDATE profiles SET credits = $1, updated_at = $2 WHERE id = $3 RETURNING credits',
      [newCredits, new Date().toISOString(), userId]
    );

    if (!updateResult.rows[0]) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    // 记录 billing_events
    await query(
      `INSERT INTO billing_events (user_id, event_type, amount, credits_delta, metadata) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'manual_credit',
        0,
        delta,
        JSON.stringify({
          admin_email: admin.email,
          reason: reason || '平台管理员手动调整',
        }),
      ]
    );

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
