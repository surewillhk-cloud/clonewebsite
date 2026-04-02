/**
 * GET /api/platform-admin/pricing/history
 * 定价历史列表（支持回滚）
 */

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { getPricingHistory } from '@/lib/platform-admin/pricing-history';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const history = await getPricingHistory({ limit: 50 });
    return NextResponse.json(history);
  } catch (e) {
    console.error('[Platform Admin Pricing History]', e);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
