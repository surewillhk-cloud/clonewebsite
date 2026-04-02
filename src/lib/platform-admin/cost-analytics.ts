/**
 * 平台管理 - 成本与收入聚合
 * 从 task_costs、billing_events 表统计收入、成本、利润、退款
 */

import { query } from '@/lib/db';

export interface FinanceSummary {
  totalRevenueCents: number;
  totalCostCents: number;
  totalProfitCents: number;
  totalRefundCents: number;
  taskCount: number;
}

export interface CostBreakdown {
  firecrawlCents: number;
  decodoCents: number;
  playwrightCents: number;
  claudeInputCents: number;
  claudeOutputCents: number;
  dockerCents: number;
  r2Cents: number;
}

export interface DailyFinanceRow {
  date: string;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  refundCents: number;
  taskCount: number;
}

/**
 * 获取指定时间范围内的退款总额（billing_events credit_refund）
 */
async function getRefundTotal(startDate: string, endDate: string): Promise<number> {
  const result = await query(
    `SELECT amount, credits_delta FROM billing_events 
     WHERE event_type = 'credit_refund' 
     AND created_at >= $1 AND created_at <= $2`,
    [`${startDate}T00:00:00Z`, `${endDate}T23:59:59.999Z`]
  );

  const rows = result.rows as Array<{ amount?: number; credits_delta?: number }>;
  let total = 0;
  for (const r of rows) {
    if (r.amount && r.amount < 0) total += Math.abs(r.amount);
    if ((r.credits_delta ?? 0) > 0) total += r.credits_delta! * 100; // 1 额度 ≈ $1
  }
  return total;
}

/**
 * 获取指定时间范围内的成本分项
 */
export async function getCostBreakdown(
  startDate: string,
  endDate: string
): Promise<CostBreakdown> {
  const result = await query(
    `SELECT firecrawl_cost_cents, decodo_cost_cents, playwright_cost_cents, 
            claude_input_cost_cents, claude_output_cost_cents, docker_cost_cents, r2_cost_cents
     FROM task_costs 
     WHERE calculated_at >= $1 AND calculated_at <= $2`,
    [`${startDate}T00:00:00Z`, `${endDate}T23:59:59.999Z`]
  );

  const rows = result.rows as Array<{
    firecrawl_cost_cents?: number;
    decodo_cost_cents?: number;
    playwright_cost_cents?: number;
    claude_input_cost_cents?: number;
    claude_output_cost_cents?: number;
    docker_cost_cents?: number;
    r2_cost_cents?: number;
  }>;

  const out: CostBreakdown = {
    firecrawlCents: 0,
    decodoCents: 0,
    playwrightCents: 0,
    claudeInputCents: 0,
    claudeOutputCents: 0,
    dockerCents: 0,
    r2Cents: 0,
  };
  for (const r of rows) {
    out.firecrawlCents += r.firecrawl_cost_cents ?? 0;
    out.decodoCents += r.decodo_cost_cents ?? 0;
    out.playwrightCents += r.playwright_cost_cents ?? 0;
    out.claudeInputCents += r.claude_input_cost_cents ?? 0;
    out.claudeOutputCents += r.claude_output_cost_cents ?? 0;
    out.dockerCents += r.docker_cost_cents ?? 0;
    out.r2Cents += r.r2_cost_cents ?? 0;
  }
  return out;
}

/**
 * 获取指定时间范围内的财务汇总
 */
export async function getFinanceSummary(
  startDate: string,
  endDate: string
): Promise<FinanceSummary> {
  const result = await query(
    `SELECT charged_cents, total_cost_cents, profit_cents 
     FROM task_costs 
     WHERE calculated_at >= $1 AND calculated_at <= $2`,
    [`${startDate}T00:00:00Z`, `${endDate}T23:59:59.999Z`]
  );

  const rows = result.rows as Array<{
    charged_cents?: number;
    total_cost_cents?: number;
    profit_cents?: number;
  }>;

  let totalRevenueCents = 0;
  let totalCostCents = 0;
  let totalProfitCents = 0;

  for (const r of rows) {
    totalRevenueCents += r.charged_cents ?? 0;
    totalCostCents += r.total_cost_cents ?? 0;
    totalProfitCents += r.profit_cents ?? 0;
  }

  const totalRefundCents = await getRefundTotal(startDate, endDate);

  return {
    totalRevenueCents,
    totalCostCents,
    totalProfitCents,
    totalRefundCents,
    taskCount: rows.length,
  };
}

/**
 * 按日聚合财务数据（最近 N 天）
 */
export async function getDailyFinance(
  days: number = 30
): Promise<DailyFinanceRow[]> {
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().slice(0, 10);

  const taskResult = await query(
    `SELECT calculated_at, charged_cents, total_cost_cents, profit_cents 
     FROM task_costs WHERE calculated_at >= $1`,
    [`${startStr}T00:00:00Z`]
  );

  const refundResult = await query(
    `SELECT created_at, amount, credits_delta FROM billing_events 
     WHERE event_type = 'credit_refund' AND created_at >= $1`,
    [`${startStr}T00:00:00Z`]
  );

  const taskRows = taskResult.rows as Array<{
    calculated_at: string;
    charged_cents?: number;
    total_cost_cents?: number;
    profit_cents?: number;
  }>;
  const refundRows = refundResult.rows as Array<{
    created_at: string;
    amount?: number;
    credits_delta?: number;
  }>;

  const byDate: Record<string, DailyFinanceRow> = {};

  for (const r of taskRows) {
    const date = r.calculated_at?.slice(0, 10) ?? 'unknown';
    if (!byDate[date]) {
      byDate[date] = {
        date,
        revenueCents: 0,
        costCents: 0,
        profitCents: 0,
        refundCents: 0,
        taskCount: 0,
      };
    }
    byDate[date].revenueCents += r.charged_cents ?? 0;
    byDate[date].costCents += r.total_cost_cents ?? 0;
    byDate[date].profitCents += r.profit_cents ?? 0;
    byDate[date].taskCount += 1;
  }

  for (const r of refundRows) {
    const date = r.created_at?.slice(0, 10) ?? 'unknown';
    if (!byDate[date]) {
      byDate[date] = {
        date,
        revenueCents: 0,
        costCents: 0,
        profitCents: 0,
        refundCents: 0,
        taskCount: 0,
      };
    }
    if (r.amount && r.amount < 0) byDate[date].refundCents += Math.abs(r.amount);
    if ((r.credits_delta ?? 0) > 0) byDate[date].refundCents += (r.credits_delta ?? 0) * 100;
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}
