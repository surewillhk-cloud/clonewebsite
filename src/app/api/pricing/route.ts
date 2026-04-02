/**
 * GET /api/pricing — 公开价格展示 API（无需登录）
 * 供首页、定价页、clone/new 同步显示
 */

import { NextResponse } from 'next/server';
import { getPublicPricing } from '@/lib/platform-admin';

export async function GET() {
  try {
    const pricing = await getPublicPricing();
    return NextResponse.json(pricing);
  } catch (e) {
    console.error('[API /pricing]', e);
    return NextResponse.json({ error: 'Failed to load pricing' }, { status: 500 });
  }
}
