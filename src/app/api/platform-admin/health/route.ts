/**
 * GET /api/platform-admin/health
 * 外部服务健康检查（需管理员鉴权）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { runHealthChecks } from '@/lib/monitoring/health-check';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fresh = searchParams.get('refresh') === '1';

    const results = await runHealthChecks(!fresh);
    const allOk = results.every((r) => r.ok);

    return NextResponse.json({
      ok: allOk,
      results,
      cached: !fresh,
    });
  } catch (e) {
    console.error('[Platform Admin Health]', e);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
