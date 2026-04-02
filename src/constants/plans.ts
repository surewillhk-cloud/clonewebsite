/**
 * 套餐配置 - 与 Stripe 同步的唯一数据源
 */

// 拉新固定价格包（唯一固定价格产品）
export const ONBOARDING_PACK = {
  priceId: 'price_xxx', // TODO: 创建 Stripe Price 后替换
  amount: 900, // $9，单位美分
  cloneType: 'static_single' as const,
  description: '新用户首次体验，仅限静态单页克隆',
};

// 按复杂度消耗额度数（MVP 阶段使用）
export const CREDITS_BY_COMPLEXITY = {
  static_single: 1,
  static_multi: 2,
  dynamic_basic: 5,
  dynamic_complex: 10,
} as const;

/** 推荐奖励：每成功推荐 1 人，推荐人获得额度 */
export const REFERRAL_REWARD_CREDITS = 2;

/** APP 克隆模式消耗额度（第四阶段） */
export const CREDITS_APP_SCREENSHOT = 3;
export const CREDITS_APP_APK = 8;
export const CREDITS_APP_TRAFFIC = 20;

// 按复杂度的预估价格区间（美分）
export const PRICE_RANGE_BY_COMPLEXITY = {
  static_single: { min: 300, max: 500 }, // $3 - $5
  static_multi: { min: 600, max: 1200 }, // $6 - $12
  dynamic_basic: { min: 1900, max: 4900 }, // $19 - $49
  dynamic_complex: { min: 3900, max: 9900 }, // $39 - $99
} as const;

/** 托管套餐（月订阅）- 需在 Stripe 创建对应 Price 后替换 priceId */
export const HOSTING_PLANS = {
  static_starter: {
    priceId: process.env.STRIPE_PRICE_STATIC_STARTER ?? 'price_xxx',
    monthlyFee: 3000,
    type: 'static' as const,
    domainsLimit: 1,
    railwayBudget: 500,
    name: '静态入门',
  },
  static_growth: {
    priceId: process.env.STRIPE_PRICE_STATIC_GROWTH ?? 'price_xxx',
    monthlyFee: 5000,
    type: 'static' as const,
    domainsLimit: 3,
    railwayBudget: 1000,
    name: '静态成长',
  },
  dynamic_basic: {
    priceId: process.env.STRIPE_PRICE_DYNAMIC_BASIC ?? 'price_xxx',
    monthlyFee: 50000,
    type: 'dynamic' as const,
    domainsLimit: 3,
    railwayBudget: 5000,
    name: '动态基础',
  },
  dynamic_pro: {
    priceId: process.env.STRIPE_PRICE_DYNAMIC_PRO ?? 'price_xxx',
    monthlyFee: 100000,
    type: 'dynamic' as const,
    domainsLimit: 10,
    railwayBudget: 15000,
    name: '动态专业',
  },
} as const;

