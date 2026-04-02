/**
 * GET /api/platform-admin/stats/task-metrics
 * 任务成功率与趋势
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import {
  getTaskMetricsSummary,
  getDailyTaskMetrics,
} from '@/lib/platform-admin/task-metrics';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10)));

    const [summary, daily] = await Promise.all([
      getTaskMetricsSummary(days),
      getDailyTaskMetrics(Math.min(14, days)),
    ]);

    return NextResponse.json({ summary, daily });
  } catch (e) {
    console.error('[Platform Admin Task Metrics]', e);
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 });
  }
}
