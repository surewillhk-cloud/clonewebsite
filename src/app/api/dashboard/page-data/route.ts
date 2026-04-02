/**
 * GET /api/dashboard/page-data
 * 合并控制台首页所需数据（stats + tasks + sites），减少 HTTP 往返
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { query, isDbConfigured } from '@/lib/db';

const COMPLEXITY_LABELS: Record<string, string> = {
  static_single: '静态单页',
  static_multi: '静态多页',
  dynamic_basic: '动态有后台',
  dynamic_complex: '复杂 SaaS',
};

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDbConfigured()) {
      return NextResponse.json({
        stats: { cloneCountThisMonth: 0, hostedSiteCount: 0, avgQualityScore: null, tasksPerDay: [] },
        tasks: [],
        sites: [],
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().slice(0, 10);
    const days = 14;
    const startDaysAgo = new Date(now);
    startDaysAgo.setDate(startDaysAgo.getDate() - days);
    const startStr = startDaysAgo.toISOString().slice(0, 10);

    const [tasksRes, hostedRes, listRes] = await Promise.all([
      query<{ id: string; created_at: string; quality_score: number | null; status: string }>(
        'SELECT id, created_at, quality_score, status FROM clone_tasks WHERE user_id = $1 AND created_at >= $2',
        [userId, `${startStr}T00:00:00Z`]
      ),
      query<{ id: string; clone_task_id: string; railway_deployment_url: string; custom_domain: string; status: string; hosting_plan: string; created_at: string }>(
        'SELECT id, clone_task_id, railway_deployment_url, custom_domain, status, hosting_plan, created_at FROM hosted_sites WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      ),
      query<{ id: string; target_url: string; complexity: string; status: string; progress: number; quality_score: number; created_at: string; current_step: string }>(
        'SELECT id, target_url, complexity, status, progress, quality_score, created_at, current_step FROM clone_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
        [userId]
      ),
    ]);

    const tasks = tasksRes.rows;

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

    const sites = hostedRes.rows;

    const taskList = listRes.rows.map((row) => {
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
        hostedSiteCount: sites.length,
        avgQualityScore,
        tasksPerDay,
      },
      tasks: taskList,
      sites: sites.map((r) => ({
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
