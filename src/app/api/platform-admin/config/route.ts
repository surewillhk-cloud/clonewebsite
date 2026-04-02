/**
 * GET/PUT /api/platform-admin/config
 * 系统配置
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminSession,
  getSystemConfig,
  saveSystemConfig,
} from '@/lib/platform-admin';
import { z } from 'zod';

const updateSchema = z.object({
  maxConcurrentTasks: z.number().min(1).max(100).optional(),
  maintenanceMode: z.boolean().optional(),
  newUserTrialCents: z.number().min(0).optional(),
  failureRateThreshold: z.number().min(0).max(1).optional(),
  failureRateWindowTasks: z.number().min(5).max(100).optional(),
  autoMaintenanceOnHighFailureRate: z.boolean().optional(),
});

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const config = await getSystemConfig();
    return NextResponse.json(config);
  } catch (e) {
    console.error('[Platform Admin Config GET]', e);
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

    await saveSystemConfig(parsed.data, admin.email);
    const config = await getSystemConfig();
    return NextResponse.json(config);
  } catch (e) {
    console.error('[Platform Admin Config PUT]', e);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
