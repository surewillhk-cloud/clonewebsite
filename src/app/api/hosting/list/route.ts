/**
 * GET /api/hosting/list
 * 当前用户托管站点列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { query, isDbConfigured } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDbConfigured()) {
      return NextResponse.json({ sites: [] });
    }

    const result = await query(
      `SELECT id, clone_task_id, railway_deployment_url, custom_domain, status, hosting_plan, created_at
       FROM hosted_sites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({
      sites: result.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        cloneTaskId: r.clone_task_id,
        deploymentUrl: r.railway_deployment_url,
        customDomain: r.custom_domain,
        status: r.status,
        hostingPlan: r.hosting_plan,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('[api/hosting/list]', err);
    return NextResponse.json({ sites: [] });
  }
}
