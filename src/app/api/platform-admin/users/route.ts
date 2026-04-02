/**
 * GET /api/platform-admin/users
 * 用户列表（平台管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { query } from '@/lib/db';

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

    const countResult = await query('SELECT COUNT(*) as count FROM profiles');
    const count = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const usersResult = await query(
      `SELECT id, email, credits, credits_expire_at, stripe_customer_id, created_at 
       FROM profiles ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const users = usersResult.rows;

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
      total: count,
      page,
      limit,
    });
  } catch (e) {
    console.error('[Platform Admin Users GET]', e);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
