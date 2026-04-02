/**
 * GET /api/hosting/list
 * 当前用户托管站点列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ sites: [] });
    }

    const admin = createAdminClient();
    const { data: rows, error } = await (admin.from('hosted_sites') as any)
      .select('id, clone_task_id, railway_deployment_url, custom_domain, status, hosting_plan, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ sites: [] });
    }

    return NextResponse.json({
      sites: (rows ?? []).map((r: Record<string, unknown>) => ({
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
