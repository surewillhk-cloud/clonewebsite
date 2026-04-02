/**
 * GET /api/platform-admin/tasks/[taskId]
 * 单任务成本详情（平台管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }

    const taskResult = await query(
      `SELECT id, user_id, target_url, clone_type, complexity, credits_used, status, quality_score, 
       delivery_mode, target_language, scraper_layer, error_message, created_at, completed_at, stripe_payment_intent_id 
       FROM clone_tasks WHERE id = $1`,
      [taskId]
    );
    const task = taskResult.rows[0];

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const costResult = await query(
      'SELECT * FROM task_costs WHERE task_id = $1',
      [taskId]
    );
    const cost = costResult.rows[0];

    return NextResponse.json({
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
            firecrawlCostCents: cost.firecrawl_cost_cents,
            decodoCostCents: cost.decodo_cost_cents,
            playwrightCostCents: cost.playwright_cost_cents,
            claudeInputTokens: cost.claude_input_tokens,
            claudeOutputTokens: cost.claude_output_tokens,
            claudeInputCostCents: cost.claude_input_cost_cents,
            claudeOutputCostCents: cost.claude_output_cost_cents,
            dockerCostCents: cost.docker_cost_cents,
            r2CostCents: cost.r2_cost_cents,
            totalCostCents: cost.total_cost_cents,
            chargedCents: cost.charged_cents,
            profitCents: cost.profit_cents,
            profitMultiplier: cost.profit_multiplier,
            calculatedAt: cost.calculated_at,
          }
        : null,
    });
  } catch (e) {
    console.error('[Platform Admin Task GET]', e);
    return NextResponse.json({ error: 'Failed to load task' }, { status: 500 });
  }
}
