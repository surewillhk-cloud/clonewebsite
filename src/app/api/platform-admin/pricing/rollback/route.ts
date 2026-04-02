/**
 * POST /api/platform-admin/pricing/rollback
 * 回滚到指定历史快照
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { rollbackToSnapshot } from '@/lib/platform-admin/pricing-history';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { snapshotId } = await req.json();
    if (!snapshotId || typeof snapshotId !== 'string') {
      return NextResponse.json({ error: 'snapshotId required' }, { status: 400 });
    }
    const result = await rollbackToSnapshot(snapshotId, admin.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Rollback failed' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Platform Admin Pricing Rollback]', e);
    return NextResponse.json({ error: 'Rollback failed' }, { status: 500 });
  }
}
