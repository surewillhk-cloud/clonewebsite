/**
 * GET /api/clone/list
 * 获取当前用户的克隆任务列表（需 Supabase clone_tasks 表）
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, isDbConfigured } from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';

const COMPLEXITY_LABELS: Record<string, string> = {
  static_single: '静态单页',
  static_multi: '静态多页',
  dynamic_basic: '动态有后台',
  dynamic_complex: '复杂 SaaS',
};

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 50);
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0');

  if (!isDbConfigured()) {
    return NextResponse.json({ tasks: [], total: 0 });
  }

  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const countResult = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM clone_tasks WHERE user_id = $1',
      [userId]
    );
    const count = Number(countResult.rows[0]?.count ?? 0);

    const { rows: tasksData } = await query<{
      id: string;
      target_url: string;
      complexity: string;
      status: string;
      progress: number;
      quality_score: number;
      created_at: string;
      current_step: string;
    }>(
      'SELECT id, target_url, complexity, status, progress, quality_score, created_at, current_step FROM clone_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    const tasks = tasksData.map((row) => {
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
      tasks,
      total: count ?? tasks.length,
    });
  } catch (err) {
    console.error('[clone/list]', err);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
