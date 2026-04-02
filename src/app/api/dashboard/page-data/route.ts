/**
 * GET /api/dashboard/page-data
 * 合并控制台首页所需数据（stats + tasks + sites），减少 HTTP 往返
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

const COMPLEXITY_LABELS: Record<string, string> = {
  static_single: '静态单页',
  static_multi: '静态多页',
  dynamic_basic: '动态有后台',
  dynamic_complex: '复杂 SaaS',
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? 'anon';

    if (!user && userId === 'anon') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        stats: { cloneCountThisMonth: 0, hostedSiteCount: 0, avgQualityScore: null, tasksPerDay: [] },
        tasks: [],
        sites: [],
      });
    }

    const admin = createAdminClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().slice(0, 10);
    const days = 14;
    const startDaysAgo = new Date(now);
    startDaysAgo.setDate(startDaysAgo.getDate() - days);
    const startStr = startDaysAgo.toISOString().slice(0, 10);

    const [tasksRes, hostedRes, listRes] = await Promise.all([
      admin
        .from('clone_tasks')
        .select('id, created_at, quality_score, status')
        .eq('user_id', userId)
        .gte('created_at', `${startStr}T00:00:00Z`),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin.from('hosted_sites') as any)
        .select('id, clone_task_id, railway_deployment_url, custom_domain, status, hosting_plan, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      admin
        .from('clone_tasks')
        .select('id, target_url, complexity, status, progress, quality_score, created_at, current_step')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const tasks = (tasksRes.data ?? []) as Array<{
      id: string;
      created_at: string;
      quality_score: number | null;
      status: string;
    }>;

    const cloneCountThisMonth = tasks.filter(
      (t) => t.created_at >= `${startOfMonthStr}T00:00:00Z`
    ).length;

    const doneTasks = tasks.filter((t) => t.status === 'done' && t.quality_score != null);
    const avgQualityScore =
      doneTasks.length > 0
        ? Math.round(
            doneTasks.reduce((s, t) => s + (t.quality_score ?? 0), 0) / doneTasks.length
          )
        : null;

    const byDate: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      byDate[d.toISOString().slice(0, 10)] = 0;
    }
    for (const t of tasks) {
      const date = t.created_at?.slice(0, 10);
      if (date && date in byDate) byDate[date]++;
    }
    const tasksPerDay = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const hostedData = hostedRes as { data: unknown[]; count: number | null };
    const sites = (hostedData.data ?? []) as Array<Record<string, unknown>>;

    const taskList = (listRes.data ?? []).map((row: Record<string, unknown>) => {
      let url = '—';
      if (row.target_url) {
        try {
          url = new URL(String(row.target_url)).hostname.replace('www.', '');
        } catch {
          url = String(row.target_url).slice(0, 30);
        }
      }
      return {
        id: row.id,
        targetUrl: row.target_url,
        url,
        complexity: row.complexity,
        complexityLabel: COMPLEXITY_LABELS[String(row.complexity ?? '')] ?? row.complexity,
        status: row.status,
        progress: row.progress,
        currentStep: row.current_step,
        qualityScore: row.quality_score,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({
      stats: {
        cloneCountThisMonth,
        hostedSiteCount: hostedData.count ?? sites.length,
        avgQualityScore,
        tasksPerDay,
      },
      tasks: taskList,
      sites: sites.map((r: Record<string, unknown>) => ({
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
    console.error('[api/dashboard/page-data]', err);
    return NextResponse.json(
      {
        stats: { cloneCountThisMonth: 0, hostedSiteCount: 0, avgQualityScore: null, tasksPerDay: [] },
        tasks: [],
        sites: [],
      },
      { status: 500 }
    );
  }
}
