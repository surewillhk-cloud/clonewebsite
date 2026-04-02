/**
 * 定价历史快照与回滚
 */

import { query, isDbConfigured } from '@/lib/db';
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
  if (!isDbConfigured()) return;

  await query(
    `INSERT INTO pricing_history (config, created_by, created_at) VALUES ($1, $2, NOW())`,
    [JSON.stringify(config), createdBy]
  );
}

export async function getPricingHistory(params?: {
  limit?: number;
  offset?: number;
}): Promise<PricingHistoryEntry[]> {
  if (!isDbConfigured()) return [];

  const limit = params?.limit ?? 30;
  const offset = params?.offset ?? 0;

  try {
    const result = await query(
      `SELECT id, config, created_by, created_at FROM pricing_history 
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}

export async function rollbackToSnapshot(
  snapshotId: string,
  updatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isDbConfigured()) return { ok: false, error: 'Database not configured' };

  try {
    const snapshotResult = await query(
      'SELECT config FROM pricing_history WHERE id = $1',
      [snapshotId]
    );

    if (snapshotResult.rows.length === 0) {
      return { ok: false, error: 'Snapshot not found' };
    }

    const snapshot = snapshotResult.rows[0];
    const config = typeof snapshot.config === 'string' 
      ? JSON.parse(snapshot.config) 
      : snapshot.config as PricingConfig;

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
      await query(
        `INSERT INTO platform_config (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
        [k.key, JSON.stringify(k.value), updatedBy]
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
