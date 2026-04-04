/**
 * GET /api/dashboard/stats
 * 控制台概览统计（本月克隆、托管数、平均还原度、任务趋势）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { query, isDbConfigured } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req) ?? 'anon';

    if (!isDbConfigured()) {
      return NextResponse.json({
        cloneCountThisMonth: 0,
        hostedSiteCount: 0,
        avgQualityScore: null,
        tasksPerDay: [],
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().slice(0, 10);

    const days = 14;
    const startDaysAgo = new Date(now);
    startDaysAgo.setDate(startDaysAgo.getDate() - days);
    const startStr = startDaysAgo.toISOString().slice(0, 10);

    const [tasksRes, hostedRes] = await Promise.all([
      query<{ id: string; created_at: string; quality_score: number | null; status: string }>(
        'SELECT id, created_at, quality_score, status FROM clone_tasks WHERE user_id = $1 AND created_at >= $2',
        [userId, `${startStr}T00:00:00Z`]
      ),
      query<{ count: number }>(
        'SELECT COUNT(*) as count FROM hosted_sites WHERE user_id = $1',
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
            doneTasks.reduce((s, t) => s + (t.quality_score ?? 0), 0) /
              doneTasks.length
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

    return NextResponse.json({
      cloneCountThisMonth,
      hostedSiteCount: Number(hostedRes.rows[0]?.count ?? 0),
      avgQualityScore,
      tasksPerDay,
    });
  } catch (err) {
    console.error('[api/dashboard/stats]', err);
    return NextResponse.json(
      {
        cloneCountThisMonth: 0,
        hostedSiteCount: 0,
        avgQualityScore: null,
        tasksPerDay: [],
      },
      { status: 500 }
    );
  }
}
