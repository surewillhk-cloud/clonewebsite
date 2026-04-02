/**
 * 平台管理 - 单用户详情（服务端调用）
 */

import { createAdminClient } from '@/lib/supabase/admin';

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
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, email, credits, credits_expire_at, stripe_customer_id, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return null;
  }

  const { data: tasks } = await db
    .from('clone_tasks')
    .select('id, target_url, complexity, status, credits_used, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const taskList = tasks ?? [];

  const [totalRes, doneRes, failedRes] = await Promise.all([
    db.from('clone_tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('clone_tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'done'),
    db.from('clone_tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'failed'),
  ]);

  const taskStats = {
    total: (totalRes as { count?: number })?.count ?? 0,
    done: (doneRes as { count?: number })?.count ?? 0,
    failed: (failedRes as { count?: number })?.count ?? 0,
  };

  return {
    user: {
      id: profile.id,
      email: profile.email,
      credits: profile.credits ?? 0,
      creditsExpireAt: profile.credits_expire_at,
      stripeCustomerId: profile.stripe_customer_id,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    },
    taskStats,
    recentTasks: taskList.map((t: Record<string, unknown>) => ({
      id: t.id,
      targetUrl: t.target_url,
      complexity: t.complexity,
      status: t.status,
      creditsUsed: t.credits_used,
      createdAt: t.created_at,
    })),
  };
}
