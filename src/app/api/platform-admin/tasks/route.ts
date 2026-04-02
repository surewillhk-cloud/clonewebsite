/**
 * GET /api/platform-admin/tasks
 * 任务总览（平台管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { query } from '@/lib/db';

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

    let countResult;
    let tasksResult;

    if (status) {
      countResult = await query(
        'SELECT COUNT(*) as count FROM clone_tasks WHERE status = $1',
        [status]
      );
      tasksResult = await query(
        `SELECT id, user_id, target_url, complexity, credits_used, status, quality_score, created_at, completed_at 
         FROM clone_tasks WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );
    } else {
      countResult = await query('SELECT COUNT(*) as count FROM clone_tasks');
      tasksResult = await query(
        `SELECT id, user_id, target_url, complexity, credits_used, status, quality_score, created_at, completed_at 
         FROM clone_tasks ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }

    const count = parseInt(countResult.rows[0]?.count ?? '0', 10);
    const tasks = tasksResult.rows;

    // 批量获取 task_costs（用于显示成本/利润）
    const taskIds = tasks.map((t) => (t as { id: string }).id);
    const costsMap: Record<string, { total_cost_cents: number; charged_cents: number; profit_cents: number }> = {};
    if (taskIds.length > 0) {
      const costsResult = await query(
        'SELECT task_id, total_cost_cents, charged_cents, profit_cents FROM task_costs WHERE task_id = ANY($1)',
        [taskIds]
      );
      for (const c of costsResult.rows) {
        const row = c as { task_id: string; total_cost_cents: number; charged_cents: number; profit_cents: number };
        costsMap[row.task_id] = {
          total_cost_cents: row.total_cost_cents,
          charged_cents: row.charged_cents,
          profit_cents: row.profit_cents,
        };
      }
    }

    const items = tasks.map((t: Record<string, unknown>) => ({
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
      total: count,
      page,
      limit,
    });
  } catch (e) {
    console.error('[Platform Admin Tasks GET]', e);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}
