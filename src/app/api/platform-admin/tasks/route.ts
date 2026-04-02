/**
 * GET /api/platform-admin/tasks
 * 任务总览（平台管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const status = searchParams.get('status') || undefined;
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    let query = db
      .from('clone_tasks')
      .select('id, user_id, target_url, complexity, credits_used, status, quality_score, created_at, completed_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tasks, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 批量获取 task_costs（用于显示成本/利润）
    const taskIds = (tasks || []).map((t: { id: string }) => t.id);
    const costsMap: Record<string, { total_cost_cents: number; charged_cents: number; profit_cents: number }> = {};
    if (taskIds.length > 0) {
      const { data: costs } = await db
        .from('task_costs')
        .select('task_id, total_cost_cents, charged_cents, profit_cents')
        .in('task_id', taskIds);
      for (const c of costs || []) {
        const row = c as { task_id: string; total_cost_cents: number; charged_cents: number; profit_cents: number };
        costsMap[row.task_id] = {
          total_cost_cents: row.total_cost_cents,
          charged_cents: row.charged_cents,
          profit_cents: row.profit_cents,
        };
      }
    }

    const items = (tasks || []).map((t: Record<string, unknown>) => ({
      id: t.id,
      userId: t.user_id,
      targetUrl: t.target_url,
      complexity: t.complexity,
      creditsUsed: t.credits_used,
      status: t.status,
      qualityScore: t.quality_score,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      cost: costsMap[t.id as string] ?? null,
    }));

    return NextResponse.json({
      items,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    console.error('[Platform Admin Tasks GET]', e);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}
