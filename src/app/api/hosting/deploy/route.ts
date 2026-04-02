/**
 * POST /api/hosting/deploy
 * 一键部署：将克隆任务的代码推送到 GitHub 并部署到 Railway
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deploy, isDeployerConfigured } from '@/lib/deployer';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  taskId: z.string().uuid(),
  hostingPlan: z
    .enum(['static_starter', 'static_growth', 'dynamic_basic', 'dynamic_pro'])
    .default('static_starter'),
  envVars: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!isDeployerConfigured()) {
      return NextResponse.json(
        {
          error:
            'Hosting not configured. Set GITHUB_TOKEN, RAILWAY_API_TOKEN, and optionally RAILWAY_TEAM_ID.',
        },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { taskId, hostingPlan, envVars } = parsed.data;

    const result = await deploy({
      taskId,
      userId: user.id,
      hostingPlan,
      envVars,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Deploy failed';
    console.error('[api/hosting/deploy]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
