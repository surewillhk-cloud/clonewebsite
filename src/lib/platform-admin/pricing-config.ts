/**
 * 平台定价配置（读写 platform_config 表）
 * 管理员可实时修改，无需重启
 * 支持两种模式：固定价格 或 成本倍数
 * 所有修改写入操作日志，定价保存时写入历史快照支持回滚
 */

import { unstable_cache, revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { logConfigChange } from './config-logs';
import { savePricingSnapshot } from './pricing-history';

/** 预估成本（美分）- 用于倍数模式计算 */
const ESTIMATED_COST_CENTS: Record<string, number> = {
  static_single: 53,
  static_multi: 113,
  dynamic_basic: 344,
  dynamic_complex: 745,
};

export type PriceItemMode = 'fixed' | 'multiplier';

export interface ClonePriceItem {
  mode: PriceItemMode;
  minCents?: number;
  maxCents?: number;
  multiplier?: number;
}

export interface PricingConfig {
  profitMultiplier: number;
  multiplierByComplexity: Record<string, number>;
  minPriceCents: number;
  maxPriceCents: number;
  /** 克隆价格：按复杂度，每项可设固定价格或成本倍数 */
  clonePriceItems: Record<string, ClonePriceItem>;
  /** 托管套餐月费（美分） */
  hostingPlans: Record<string, number>;
  /** 新用户体验价（美分） */
  onboardingPriceCents: number;
  /** APP 克隆价格 */
  appPriceItems: {
    screenshot: { minCents: number; maxCents: number };
    apk: { minCents: number; maxCents: number };
    traffic?: { minCents: number; maxCents: number };
  };
}

const DEFAULT_CLONE_ITEMS: Record<string, ClonePriceItem> = {
  static_single: { mode: 'fixed', minCents: 300, maxCents: 500 },
  static_multi: { mode: 'fixed', minCents: 600, maxCents: 1200 },
  dynamic_basic: { mode: 'fixed', minCents: 1900, maxCents: 4900 },
  dynamic_complex: { mode: 'fixed', minCents: 3900, maxCents: 9900 },
};

const DEFAULT_HOSTING: Record<string, number> = {
  static_starter: 3000,
  static_growth: 5000,
  dynamic_basic: 50000,
  dynamic_pro: 100000,
};

const DEFAULT_PRICING: PricingConfig = {
  profitMultiplier: 5.0,
  multiplierByComplexity: {
    static_single: 5.0,
    static_multi: 5.0,
    dynamic_basic: 5.0,
    dynamic_complex: 5.0,
  },
  minPriceCents: 300,
  maxPriceCents: 9900,
  clonePriceItems: { ...DEFAULT_CLONE_ITEMS },
  hostingPlans: { ...DEFAULT_HOSTING },
  onboardingPriceCents: 900,
  appPriceItems: {
    screenshot: { minCents: 300, maxCents: 500 },
    apk: { minCents: 800, maxCents: 1200 },
    traffic: { minCents: 2000, maxCents: 3000 },
  },
};

export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const supabase = createAdminClient();
    const keys = [
      'pricing.profitMultiplier',
      'pricing.multiplierByComplexity',
      'pricing.minPriceCents',
      'pricing.maxPriceCents',
      'pricing.clonePriceItems',
      'pricing.hostingPlans',
      'pricing.onboardingPriceCents',
      'pricing.appPriceItems',
    ];
    const { data } = await supabase
      .from('platform_config')
      .select('key, value')
      .in('key', keys);

    const config = { ...DEFAULT_PRICING };
    const rows = (data || []) as { key: string; value: unknown }[];
    for (const row of rows) {
      const v = row.value;
      if (row.key === 'pricing.profitMultiplier')
        config.profitMultiplier = typeof v === 'number' ? v : Number(v) || config.profitMultiplier;
      if (row.key === 'pricing.multiplierByComplexity' && v && typeof v === 'object')
        config.multiplierByComplexity = { ...config.multiplierByComplexity, ...(v as Record<string, number>) };
      if (row.key === 'pricing.minPriceCents')
        config.minPriceCents = typeof v === 'number' ? v : Number(v) || config.minPriceCents;
      if (row.key === 'pricing.maxPriceCents')
        config.maxPriceCents = typeof v === 'number' ? v : Number(v) || config.maxPriceCents;
      if (row.key === 'pricing.clonePriceItems' && v && typeof v === 'object')
        config.clonePriceItems = { ...config.clonePriceItems, ...(v as Record<string, ClonePriceItem>) };
      if (row.key === 'pricing.hostingPlans' && v && typeof v === 'object')
        config.hostingPlans = { ...config.hostingPlans, ...(v as Record<string, number>) };
      if (row.key === 'pricing.onboardingPriceCents')
        config.onboardingPriceCents = typeof v === 'number' ? v : Number(v) ?? config.onboardingPriceCents;
      if (row.key === 'pricing.appPriceItems' && v && typeof v === 'object')
        config.appPriceItems = { ...config.appPriceItems, ...(v as PricingConfig['appPriceItems']) };
    }
    return config;
  } catch {
    return DEFAULT_PRICING;
  }
}

/** 获取克隆价格区间（美分）- 供 detect-complexity 和前端展示 */
export function getClonePriceRange(config: PricingConfig, complexity: string): { min: number; max: number } {
  const item = config.clonePriceItems[complexity];
  if (item?.mode === 'fixed' && item.minCents != null && item.maxCents != null) {
    return { min: item.minCents, max: item.maxCents };
  }
  const multiplier = item?.mode === 'multiplier' && item.multiplier != null
    ? item.multiplier
    : config.multiplierByComplexity[complexity] ?? config.profitMultiplier;
  const cost = ESTIMATED_COST_CENTS[complexity] ?? ESTIMATED_COST_CENTS.static_single;
  const price = Math.round(cost * multiplier);
  const min = Math.max(config.minPriceCents, Math.round(price * 0.8));
  const max = Math.min(config.maxPriceCents, Math.round(price * 1.2));
  return { min, max };
}

/** 获取 APP 克隆价格区间 */
export function getAppPriceRange(
  config: PricingConfig,
  mode: 'screenshot' | 'apk' | 'traffic'
): { minCents: number; maxCents: number } {
  const item = config.appPriceItems[mode as keyof typeof config.appPriceItems];
  if (item) return { minCents: item.minCents, maxCents: item.maxCents };
  return { minCents: 2000, maxCents: 3000 };
}

const PRICING_CACHE_TAG = 'pricing-config';

/** 获取定价配置（带缓存，减少 DB 查询） */
async function getPricingConfigCached(): Promise<PricingConfig> {
  return unstable_cache(getPricingConfig, [PRICING_CACHE_TAG], { revalidate: 60, tags: [PRICING_CACHE_TAG] })();
}

/** 公开展示用价格数据 - 供首页、定价页、clone/new 同步 */
export interface PublicPricing {
  cloneRanges: Record<string, { minCents: number; maxCents: number; minDollar: string; maxDollar: string }>;
  hostingPlans: Record<string, { monthlyFeeCents: number; monthlyDollar: string }>;
  onboardingPriceCents: number;
  onboardingDollar: string;
  appRanges: {
    screenshot: { minCents: number; maxCents: number; minDollar: string; maxDollar: string };
    apk: { minCents: number; maxCents: number; minDollar: string; maxDollar: string };
  };
}

export async function getPublicPricing(): Promise<PublicPricing> {
  const config = await getPricingConfigCached();
  const complexities = ['static_single', 'static_multi', 'dynamic_basic', 'dynamic_complex'];
  const cloneRanges: PublicPricing['cloneRanges'] = {};
  for (const c of complexities) {
    const r = getClonePriceRange(config, c);
    cloneRanges[c] = {
      minCents: r.min,
      maxCents: r.max,
      minDollar: (r.min / 100).toFixed(0),
      maxDollar: (r.max / 100).toFixed(0),
    };
  }
  const hostingPlans: PublicPricing['hostingPlans'] = {};
  for (const [k, cents] of Object.entries(config.hostingPlans)) {
    hostingPlans[k] = {
      monthlyFeeCents: cents,
      monthlyDollar: (cents / 100).toFixed(cents >= 10000 ? 0 : 2),
    };
  }
  return {
    cloneRanges,
    hostingPlans,
    onboardingPriceCents: config.onboardingPriceCents,
    onboardingDollar: (config.onboardingPriceCents / 100).toFixed(0),
    appRanges: {
      screenshot: (() => {
        const r = getAppPriceRange(config, 'screenshot');
        return { ...r, minDollar: (r.minCents / 100).toFixed(0), maxDollar: (r.maxCents / 100).toFixed(0) };
      })(),
      apk: (() => {
        const r = getAppPriceRange(config, 'apk');
        return { ...r, minDollar: (r.minCents / 100).toFixed(0), maxDollar: (r.maxCents / 100).toFixed(0) };
      })(),
    },
  };
}

export async function savePricingConfig(
  config: Partial<PricingConfig>,
  updatedBy: string
): Promise<void> {
  const supabase = createAdminClient();
  const oldConfig = await getPricingConfig();
  const updates: { key: string; value: unknown; updatedBy: string }[] = [];

  if (config.profitMultiplier != null)
    updates.push({ key: 'pricing.profitMultiplier', value: config.profitMultiplier, updatedBy });
  if (config.multiplierByComplexity)
    updates.push({ key: 'pricing.multiplierByComplexity', value: config.multiplierByComplexity, updatedBy });
  if (config.minPriceCents != null)
    updates.push({ key: 'pricing.minPriceCents', value: config.minPriceCents, updatedBy });
  if (config.maxPriceCents != null)
    updates.push({ key: 'pricing.maxPriceCents', value: config.maxPriceCents, updatedBy });
  if (config.clonePriceItems)
    updates.push({ key: 'pricing.clonePriceItems', value: config.clonePriceItems, updatedBy });
  if (config.hostingPlans)
    updates.push({ key: 'pricing.hostingPlans', value: config.hostingPlans, updatedBy });
  if (config.onboardingPriceCents != null)
    updates.push({ key: 'pricing.onboardingPriceCents', value: config.onboardingPriceCents, updatedBy });
  if (config.appPriceItems)
    updates.push({ key: 'pricing.appPriceItems', value: config.appPriceItems, updatedBy });

  for (const u of updates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('platform_config').upsert(
      { key: u.key, value: u.value, updated_by: u.updatedBy, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  }

  revalidateTag(PRICING_CACHE_TAG);
  const newConfig = await getPricingConfig();
  await logConfigChange({
    action: 'pricing.update',
    configKey: 'pricing',
    oldValue: oldConfig,
    newValue: newConfig,
    updatedBy,
  });
  await savePricingSnapshot(newConfig, updatedBy);
}
