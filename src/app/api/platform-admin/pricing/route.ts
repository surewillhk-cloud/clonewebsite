/**
 * GET/PUT /api/platform-admin/pricing
 * 获取或保存定价配置
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminSession,
  getPricingConfig,
  savePricingConfig,
} from '@/lib/platform-admin';
import { z } from 'zod';

const clonePriceItemSchema = z.object({
  mode: z.enum(['fixed', 'multiplier']),
  minCents: z.number().min(0).optional(),
  maxCents: z.number().min(0).optional(),
  multiplier: z.number().min(1).max(20).optional(),
});

const updateSchema = z.object({
  profitMultiplier: z.number().min(1).max(10).optional(),
  multiplierByComplexity: z.record(z.string(), z.number().min(1).max(10)).optional(),
  minPriceCents: z.number().min(0).optional(),
  maxPriceCents: z.number().min(100).optional(),
  clonePriceItems: z.record(z.string(), clonePriceItemSchema).optional(),
  hostingPlans: z.record(z.string(), z.number().min(0)).optional(),
  onboardingPriceCents: z.number().min(0).optional(),
  appPriceItems: z
    .object({
      screenshot: z.object({ minCents: z.number().min(0), maxCents: z.number().min(0) }).optional(),
      apk: z.object({ minCents: z.number().min(0), maxCents: z.number().min(0) }).optional(),
      traffic: z.object({ minCents: z.number().min(0), maxCents: z.number().min(0) }).optional(),
    })
    .optional(),
});

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const config = await getPricingConfig();
    return NextResponse.json(config);
  } catch (e) {
    console.error('[Platform Admin Pricing GET]', e);
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const current = await getPricingConfig();
    const { appPriceItems: _app, ...rest } = parsed.data;
    const toSave: Parameters<typeof savePricingConfig>[0] = rest;
    if (_app) {
      toSave.appPriceItems = {
        screenshot: _app.screenshot ?? current.appPriceItems.screenshot,
        apk: _app.apk ?? current.appPriceItems.apk,
        traffic: _app.traffic ?? current.appPriceItems.traffic,
      };
    }
    await savePricingConfig(toSave, admin.email);
    const config = await getPricingConfig();
    return NextResponse.json(config);
  } catch (e) {
    console.error('[Platform Admin Pricing PUT]', e);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
