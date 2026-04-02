/**
 * GET /api/hosting/[siteId]/status
 * 查询托管站点部署状态
 * ?sync=1 时从 Railway 同步最新状态并更新数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { getServiceStatus, isRailwayConfigured } from '@/lib/deployer/railway';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const sync = req.nextUrl.searchParams.get('sync') === '1';

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Hosted sites require Supabase' },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { data: site, error } = await admin
      .from('hosted_sites')
      .select('*')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (error || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const s = site as {
      railway_service_id: string | null;
      status: string;
      railway_deployment_url: string | null;
      custom_domain: string | null;
      domain_verified: boolean;
      github_repo_url: string | null;
      railway_budget_used: number | null;
    };

    if (sync && isRailwayConfigured() && s.railway_service_id) {
      const rail = await getServiceStatus(s.railway_service_id);
      const updates: Record<string, unknown> = {};
      if (rail.deploymentUrl !== s.railway_deployment_url) {
        updates.railway_deployment_url = rail.deploymentUrl;
      }
      if (rail.status !== s.status) {
        updates.status = rail.status;
      }
      if (Object.keys(updates).length > 0) {
        await (admin.from('hosted_sites') as any)
          .update(updates)
          .eq('id', siteId)
          .eq('user_id', user.id);
        Object.assign(s, updates);
      }
    }

    return NextResponse.json({
      status: s.status,
      deploymentUrl: s.railway_deployment_url,
      customDomain: s.custom_domain,
      domainVerified: s.domain_verified,
      githubRepoUrl: s.github_repo_url,
      railwayBudgetUsed: s.railway_budget_used ?? 0,
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
