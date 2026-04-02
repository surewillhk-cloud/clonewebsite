/**
 * GET /api/platform-admin/stats/slow-requests
 * 最近慢请求列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { getSlowRequests } from '@/lib/monitoring/slow-requests';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)));

    const items = getSlowRequests(limit);
    return NextResponse.json({ items });
  } catch (e) {
    console.error('[Platform Admin Slow Requests]', e);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
