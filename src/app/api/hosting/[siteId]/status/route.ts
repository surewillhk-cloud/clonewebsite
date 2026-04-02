/**
 * GET /api/hosting/[siteId]/status
 * 查询托管站点部署状态
 * ?sync=1 时从 Railway 同步最新状态并更新数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { query, isDbConfigured } from '@/lib/db';
import { getServiceStatus, isRailwayConfigured } from '@/lib/deployer/railway';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const sync = req.nextUrl.searchParams.get('sync') === '1';

    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: 'Hosted sites require Supabase' },
        { status: 503 }
      );
    }

    const { rows: [site], } = await query<{
      railway_service_id: string | null;
      status: string;
      railway_deployment_url: string | null;
      custom_domain: string | null;
      domain_verified: boolean;
      github_repo_url: string | null;
      railway_budget_used: number | null;
    }>(
      'SELECT * FROM hosted_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    if (sync && isRailwayConfigured() && site.railway_service_id) {
      const rail = await getServiceStatus(site.railway_service_id);
      const updates: Record<string, unknown> = {};
      if (rail.deploymentUrl !== site.railway_deployment_url) {
        updates.railway_deployment_url = rail.deploymentUrl;
      }
      if (rail.status !== site.status) {
        updates.status = rail.status;
      }
      if (Object.keys(updates).length > 0) {
        await query(
          'UPDATE hosted_sites SET railway_deployment_url = $1, status = $2 WHERE id = $3 AND user_id = $4',
          [updates.railway_deployment_url, updates.status, siteId, userId]
        );
        Object.assign(site, updates);
      }
    }

    return NextResponse.json({
      status: site.status,
      deploymentUrl: site.railway_deployment_url,
      customDomain: site.custom_domain,
      domainVerified: site.domain_verified,
      githubRepoUrl: site.github_repo_url,
      railwayBudgetUsed: site.railway_budget_used ?? 0,
      railwayBudgetLimit: 5000,
    });
  } catch (err) {
    console.error('[api/hosting/status]', err);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
