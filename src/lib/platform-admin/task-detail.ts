/**
 * 平台管理 - 单任务详情
 */

import { query, isDbConfigured } from '@/lib/db';

export interface TaskDetailResult {
  task: {
    id: string;
    userId: string;
    targetUrl: string | null;
    cloneType: string | null;
    complexity: string | null;
    creditsUsed: number;
    status: string;
    qualityScore: number | null;
    deliveryMode: string | null;
    targetLanguage: string | null;
    scraperLayer: number | null;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
    stripePaymentIntentId: string | null;
  };
  cost: {
    firecrawlCostCents: number;
    decodoCostCents: number;
    playwrightCostCents: number;
    claudeInputTokens: number;
    claudeOutputTokens: number;
    claudeInputCostCents: number;
    claudeOutputCostCents: number;
    dockerCostCents: number;
    r2CostCents: number;
    totalCostCents: number;
    chargedCents: number;
    profitCents: number;
    profitMultiplier: number;
    calculatedAt: string;
  } | null;
}

export async function getTaskDetail(taskId: string): Promise<TaskDetailResult | null> {
  if (!isDbConfigured()) return null;

  const taskResult = await query(
    `SELECT id, user_id, target_url, clone_type, complexity, credits_used, status, quality_score,
            delivery_mode, target_language, scraper_layer, error_message, created_at, completed_at,
            stripe_payment_intent_id
     FROM clone_tasks WHERE id = $1`,
    [taskId]
  );

  if (taskResult.rows.length === 0) return null;

  const task = taskResult.rows[0] as Record<string, unknown>;

  const costResult = await query(
    'SELECT * FROM task_costs WHERE task_id = $1',
    [taskId]
  );

  const cost = costResult.rows[0] as Record<string, unknown> | undefined;

  return {
    task: {
      id: task.id as string,
      userId: task.user_id as string,
      targetUrl: task.target_url as string | null,
      cloneType: task.clone_type as string | null,
      complexity: task.complexity as string | null,
      creditsUsed: task.credits_used as number,
      status: task.status as string,
      qualityScore: task.quality_score as number | null,
      deliveryMode: task.delivery_mode as string | null,
      targetLanguage: task.target_language as string | null,
      scraperLayer: task.scraper_layer as number | null,
      errorMessage: task.error_message as string | null,
      createdAt: task.created_at as string,
      completedAt: task.completed_at as string | null,
      stripePaymentIntentId: task.stripe_payment_intent_id as string | null,
    },
    cost: cost
      ? {
          firecrawlCostCents: (cost.firecrawl_cost_cents as number) ?? 0,
          decodoCostCents: (cost.decodo_cost_cents as number) ?? 0,
          playwrightCostCents: (cost.playwright_cost_cents as number) ?? 0,
          claudeInputTokens: (cost.claude_input_tokens as number) ?? 0,
          claudeOutputTokens: (cost.claude_output_tokens as number) ?? 0,
          claudeInputCostCents: (cost.claude_input_cost_cents as number) ?? 0,
          claudeOutputCostCents: (cost.claude_output_cost_cents as number) ?? 0,
          dockerCostCents: (cost.docker_cost_cents as number) ?? 0,
          r2CostCents: (cost.r2_cost_cents as number) ?? 0,
          totalCostCents: (cost.total_cost_cents as number) ?? 0,
          chargedCents: (cost.charged_cents as number) ?? 0,
          profitCents: (cost.profit_cents as number) ?? 0,
          profitMultiplier: (cost.profit_multiplier as number) ?? 5,
          calculatedAt: cost.calculated_at as string,
        }
      : null,
  };
}
