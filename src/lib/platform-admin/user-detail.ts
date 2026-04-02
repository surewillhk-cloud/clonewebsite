/**
 * 平台管理 - 单用户详情
 */

import { query, isDbConfigured } from '@/lib/db';

export interface UserDetailResult {
  user: {
    id: string;
    email: string | null;
    credits: number;
    creditsExpireAt: string | null;
    stripeCustomerId: string | null;
    createdAt: string;
    updatedAt: string | null;
  };
  taskStats: {
    total: number;
    done: number;
    failed: number;
  };
  recentTasks: Array<{
    id: string;
    targetUrl: string | null;
    complexity: string | null;
    status: string;
    creditsUsed: number;
    createdAt: string;
  }>;
}

export async function getUserDetail(userId: string): Promise<UserDetailResult | null> {
  if (!isDbConfigured()) return null;

  const profileResult = await query(
    `SELECT id, email, credits, credits_expire_at, stripe_customer_id, created_at, updated_at
     FROM profiles WHERE id = $1`,
    [userId]
  );

  if (profileResult.rows.length === 0) return null;

  const profile = profileResult.rows[0] as Record<string, unknown>;

  const tasksResult = await query(
    `SELECT id, target_url, complexity, status, credits_used, created_at
     FROM clone_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );

  const totalResult = await query(
    'SELECT COUNT(*) as count FROM clone_tasks WHERE user_id = $1',
    [userId]
  );
  const doneResult = await query(
    'SELECT COUNT(*) as count FROM clone_tasks WHERE user_id = $1 AND status = $2',
    [userId, 'done']
  );
  const failedResult = await query(
    'SELECT COUNT(*) as count FROM clone_tasks WHERE user_id = $1 AND status = $2',
    [userId, 'failed']
  );

  return {
    user: {
      id: profile.id as string,
      email: profile.email as string | null,
      credits: (profile.credits as number) ?? 0,
      creditsExpireAt: profile.credits_expire_at as string | null,
      stripeCustomerId: profile.stripe_customer_id as string | null,
      createdAt: profile.created_at as string,
      updatedAt: profile.updated_at as string | null,
    },
    taskStats: {
      total: parseInt((totalResult.rows[0] as { count: string }).count ?? '0', 10),
      done: parseInt((doneResult.rows[0] as { count: string }).count ?? '0', 10),
      failed: parseInt((failedResult.rows[0] as { count: string }).count ?? '0', 10),
    },
    recentTasks: tasksResult.rows.map((t: Record<string, unknown>) => ({
      id: t.id as string,
      targetUrl: t.target_url as string | null,
      complexity: t.complexity as string | null,
      status: t.status as string,
      creditsUsed: t.credits_used as number,
      createdAt: t.created_at as string,
    })),
  };
}
