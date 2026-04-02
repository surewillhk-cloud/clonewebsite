/**
 * 定价历史快照与回滚
 * 每次保存定价时写入完整快照，支持回滚到任意历史配置
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logConfigChange } from './config-logs';
import type { PricingConfig } from './pricing-config';

export interface PricingHistoryEntry {
  id: string;
  config: PricingConfig;
  createdBy: string;
  createdAt: string;
}

export async function savePricingSnapshot(
  config: PricingConfig,
  createdBy: string
): Promise<void> {
  const supabase = createAdminClient();
  await (supabase as any).from('pricing_history').insert({
    config,
    created_by: createdBy,
  });
}

export async function getPricingHistory(params?: {
  limit?: number;
  offset?: number;
}): Promise<PricingHistoryEntry[]> {
  const limit = params?.limit ?? 30;
  const offset = params?.offset ?? 0;
  try {
    const supabase = createAdminClient();
    const { data } = await (supabase as any)
      .from('pricing_history')
      .select('id, config, created_by, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return (data || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      config: r.config as PricingConfig,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}

/** 回滚到指定历史快照，将 config 写回 platform_config */
export async function rollbackToSnapshot(
  snapshotId: string,
  updatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { data: snapshot, error: fetchErr } = await (supabase as any)
      .from('pricing_history')
      .select('config')
      .eq('id', snapshotId)
      .single();
    if (fetchErr || !snapshot?.config) {
      return { ok: false, error: 'Snapshot not found' };
    }
    const config = snapshot.config as PricingConfig;

    const keys = [
      { key: 'pricing.profitMultiplier', value: config.profitMultiplier },
      { key: 'pricing.multiplierByComplexity', value: config.multiplierByComplexity },
      { key: 'pricing.minPriceCents', value: config.minPriceCents },
      { key: 'pricing.maxPriceCents', value: config.maxPriceCents },
      { key: 'pricing.clonePriceItems', value: config.clonePriceItems },
      { key: 'pricing.hostingPlans', value: config.hostingPlans },
      { key: 'pricing.onboardingPriceCents', value: config.onboardingPriceCents },
      { key: 'pricing.appPriceItems', value: config.appPriceItems },
    ];

    for (const k of keys) {
      await (supabase as any).from('platform_config').upsert(
        {
          key: k.key,
          value: k.value,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    }

    await logConfigChange({
      action: 'pricing.rollback',
      configKey: 'pricing',
      oldValue: null,
      newValue: config,
      updatedBy: `${updatedBy} (rollback from ${snapshotId})`,
    });
    await savePricingSnapshot(config, updatedBy);

    return { ok: true };
  } catch (e) {
    console.error('[pricing-history] Rollback failed:', e);
    return { ok: false, error: String(e) };
  }
}
