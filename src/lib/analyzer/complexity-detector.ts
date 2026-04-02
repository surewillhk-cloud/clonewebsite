/**
 * 复杂度检测 - 简化版
 * 根据 URL 和基础信息推断复杂度等级
 */

import type { ComplexityLevel } from '@/types/clone';
import { CREDITS_BY_COMPLEXITY } from '@/constants/plans';

export interface ComplexityDetectResult {
  complexity: ComplexityLevel;
  creditsRequired: number;
  detectedFeatures: string[];
  confidence: number; // 0-1
}

/**
 * MVP 简化版：基于 URL 和基础规则推断
 * 第二阶段可接入实际爬取 + AI 分析
 */
export async function detectComplexity(url: string): Promise<ComplexityDetectResult> {
  // 简化规则：根据域名/路径做初步推断
  const lower = url.toLowerCase();
  const features: string[] = [];

  // 常见 SaaS / 动态站特征
  if (
    lower.includes('dashboard') ||
    lower.includes('login') ||
    lower.includes('admin') ||
    lower.includes('app.')
  ) {
    features.push('dashboard', 'login_system');
  }

  if (lower.includes('stripe.com') || lower.includes('payment')) {
    features.push('payment');
  }

  if (lower.includes('map') || lower.includes('location')) {
    features.push('map');
  }

  // 默认静态单页，有特征则升级
  let complexity: ComplexityLevel = 'static_single';
  if (features.length >= 2) {
    complexity = 'dynamic_basic';
  } else if (features.length === 1) {
    complexity = features.includes('payment') || features.includes('login_system')
      ? 'dynamic_basic'
      : 'static_multi';
  }

  return {
    complexity,
    creditsRequired: CREDITS_BY_COMPLEXITY[complexity],
    detectedFeatures: features.length ? features : ['static_landing'],
    confidence: 0.6, // 简化版置信度较低
  };
}
