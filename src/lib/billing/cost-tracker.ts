/**
 * 任务成本追踪
 * 任务完成后写入 task_costs 表，供平台管理后台与定价引擎使用
 * 当前为预估成本，后续可接入各模块实际用量（Claude tokens、Firecrawl 等）
 */

import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

/** 预估成本（美分/次）- 基于 PROJECT.md 真实成本拆解 */
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
  /** 实际 Claude 输入 token（可选，后续接入） */
  claudeInputTokens?: number;
  /** 实际 Claude 输出 token（可选） */
  claudeOutputTokens?: number;
  /** 爬虫层 1/2/3 */
  scraperLayer?: number;
}

/**
 * 记录任务成本到 task_costs 表
 * 任务完成（done）时调用
 */
export async function recordTaskCost(input: TaskCostInput): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const estCents =
      ESTIMATED_COST_CENTS[input.complexity] ??
      ESTIMATED_COST_CENTS.static_single;
    const profitMultiplier = 5.0;
    const chargedCents = input.creditsUsed * 100; // 1 额度 ≈ $1 简化
    const profitCents = Math.max(0, chargedCents - estCents);

    const row = {
      task_id: input.taskId,
      firecrawl_cost_cents: 0,
      decodo_cost_cents: 0,
      playwright_cost_cents: 0,
      claude_input_tokens: input.claudeInputTokens ?? 0,
      claude_output_tokens: input.claudeOutputTokens ?? 0,
      claude_input_cost_cents: 0,
      claude_output_cost_cents: 0,
      docker_cost_cents: 0,
      r2_cost_cents: 0,
      total_cost_cents: estCents,
      charged_cents: chargedCents,
      profit_cents: profitCents,
      profit_multiplier: profitMultiplier,
    };

    const supabase = createAdminClient();
    await (supabase as unknown as { from: (t: string) => { insert: (d: object) => Promise<unknown> } })
      .from('task_costs')
      .insert(row);
  } catch (e) {
    console.warn('[cost-tracker] Failed to record:', e);
  }
}
