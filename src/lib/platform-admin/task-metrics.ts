/**
 * 任务统计
 */

import { query, isDbConfigured } from '@/lib/db';

export interface TaskMetricsSummary {
  totalTasks: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  failedRate: number;
}

export interface DailyTaskRow {
  date: string;
  total: number;
  success: number;
  failed: number;
  successRate: number;
}

export async function getTaskMetricsSummary(days: number = 30): Promise<TaskMetricsSummary> {
  if (!isDbConfigured()) {
    return { totalTasks: 0, successCount: 0, failedCount: 0, successRate: 0, failedRate: 0 };
  }

  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().slice(0, 10);

  const result = await query(
    `SELECT status FROM clone_tasks WHERE created_at >= $1`,
    [`${startStr}T00:00:00Z`]
  );

  const rows = result.rows as { status: string }[];
  const successCount = rows.filter((r) => r.status === 'done').length;
  const failedCount = rows.filter((r) => r.status === 'failed').length;
  const totalTasks = rows.length;
  const successRate = totalTasks > 0 ? successCount / totalTasks : 0;
  const failedRate = totalTasks > 0 ? failedCount / totalTasks : 0;

  return {
    totalTasks,
    successCount,
    failedCount,
    successRate,
    failedRate,
  };
}

export async function getDailyTaskMetrics(days: number = 14): Promise<DailyTaskRow[]> {
  if (!isDbConfigured()) return [];

  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().slice(0, 10);

  const result = await query(
    `SELECT created_at, status FROM clone_tasks WHERE created_at >= $1`,
    [`${startStr}T00:00:00Z`]
  );

  const rows = result.rows as { created_at: string; status: string }[];
  const byDate: Record<string, { total: number; success: number; failed: number }> = {};

  for (const r of rows) {
    const date = r.created_at?.slice(0, 10) ?? 'unknown';
    if (!byDate[date]) {
      byDate[date] = { total: 0, success: 0, failed: 0 };
    }
    byDate[date].total += 1;
    if (r.status === 'done') byDate[date].success += 1;
    if (r.status === 'failed') byDate[date].failed += 1;
  }

  return Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      total: v.total,
      success: v.success,
      failed: v.failed,
      successRate: v.total > 0 ? v.success / v.total : 0,
    }));
}
