/**
 * 任务成本追踪
 */

import { query, isDbConfigured } from '@/lib/db';

const ESTIMATED_COST_CENTS: Record<string, number> = {
  static_single: 53,
  static_multi: 113,
  dynamic_basic: 344,
  dynamic_complex: 745,
};

export interface TaskCostInput {
  taskId: string;
  complexity: string;
  creditsUsed: number;
  claudeInputTokens?: number;
  claudeOutputTokens?: number;
  scraperLayer?: number;
}

export async function recordTaskCost(input: TaskCostInput): Promise<void> {
  if (!isDbConfigured()) return;

  try {
    const estCents =
      ESTIMATED_COST_CENTS[input.complexity] ??
      ESTIMATED_COST_CENTS.static_single;
    const profitMultiplier = 5.0;
    const chargedCents = input.creditsUsed * 100;
    const profitCents = Math.max(0, chargedCents - estCents);

    await query(
      `INSERT INTO task_costs 
       (task_id, firecrawl_cost_cents, decodo_cost_cents, playwright_cost_cents,
        claude_input_tokens, claude_output_tokens, claude_input_cost_cents,
        claude_output_cost_cents, docker_cost_cents, r2_cost_cents,
        total_cost_cents, charged_cents, profit_cents, profit_multiplier, calculated_at)
       VALUES ($1, 0, 0, 0, $2, $3, 0, 0, 0, 0, $4, $5, $6, $7, NOW())`,
      [
        input.taskId,
        input.claudeInputTokens ?? 0,
        input.claudeOutputTokens ?? 0,
        estCents,
        chargedCents,
        profitCents,
        profitMultiplier,
      ]
    );
  } catch (e) {
    console.warn('[cost-tracker] Failed to record:', e);
  }
}
