/**
 * GET /api/platform-admin/users
 * 用户列表（平台管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error, count } = await (supabase as any)
      .from('profiles')
      .select('id, email, credits, credits_expire_at, stripe_customer_id, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (users || []).map((u: Record<string, unknown>) => ({
      id: u.id,
      email: u.email,
      credits: u.credits,
      creditsExpireAt: u.credits_expire_at,
      stripeCustomerId: u.stripe_customer_id,
      createdAt: u.created_at,
    }));

    return NextResponse.json({
      items,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    console.error('[Platform Admin Users GET]', e);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
