/**
 * 平台管理 - 单任务详情（服务端调用）
 */

import { createAdminClient } from '@/lib/supabase/admin';

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
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: task, error: taskError } = await db
    .from('clone_tasks')
    .select(
      'id, user_id, target_url, clone_type, complexity, credits_used, status, quality_score, ' +
        'delivery_mode, target_language, scraper_layer, error_message, created_at, completed_at, stripe_payment_intent_id'
    )
    .eq('id', taskId)
    .single();

  if (taskError || !task) return null;

  const { data: cost } = await db.from('task_costs').select('*').eq('task_id', taskId).single();

  return {
    task: {
      id: task.id,
      userId: task.user_id,
      targetUrl: task.target_url,
      cloneType: task.clone_type,
      complexity: task.complexity,
      creditsUsed: task.credits_used,
      status: task.status,
      qualityScore: task.quality_score,
      deliveryMode: task.delivery_mode,
      targetLanguage: task.target_language,
      scraperLayer: task.scraper_layer,
      errorMessage: task.error_message,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      stripePaymentIntentId: task.stripe_payment_intent_id,
    },
    cost: cost
      ? {
          firecrawlCostCents: cost.firecrawl_cost_cents ?? 0,
          decodoCostCents: cost.decodo_cost_cents ?? 0,
          playwrightCostCents: cost.playwright_cost_cents ?? 0,
          claudeInputTokens: cost.claude_input_tokens ?? 0,
          claudeOutputTokens: cost.claude_output_tokens ?? 0,
          claudeInputCostCents: cost.claude_input_cost_cents ?? 0,
          claudeOutputCostCents: cost.claude_output_cost_cents ?? 0,
          dockerCostCents: cost.docker_cost_cents ?? 0,
          r2CostCents: cost.r2_cost_cents ?? 0,
          totalCostCents: cost.total_cost_cents ?? 0,
          chargedCents: cost.charged_cents ?? 0,
          profitCents: cost.profit_cents ?? 0,
          profitMultiplier: cost.profit_multiplier ?? 5,
          calculatedAt: cost.calculated_at,
        }
      : null,
  };
}
