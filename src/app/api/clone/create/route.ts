/**
 * POST /api/clone/create
 * 创建克隆任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { CloneTask, ComplexityLevel } from '@/types/clone';
import { CREDITS_BY_COMPLEXITY, CREDITS_APP_SCREENSHOT, CREDITS_APP_APK, CREDITS_APP_TRAFFIC } from '@/constants/plans';
import { processCloneTask } from '@/workers/clone-worker';
import { createTaskInStore, setTaskStatus } from '@/lib/task-store';
import { ensureProfile, type ProfileRow } from '@/lib/profiles';
import { query, isDbConfigured } from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { getSystemConfig } from '@/lib/platform-admin/system-config';
import { validateScrapeUrl } from '@/lib/url-validate';

const schema = z.object({
  url: z.string().url().optional(),
  cloneType: z.enum(['web', 'app']).default('web'),
  deliveryMode: z.enum(['download', 'hosting']).default('download'),
  targetLanguage: z.enum(['original', 'zh', 'en']).default('original'),
  complexity: z.enum([
    'static_single',
    'static_multi',
    'dynamic_basic',
    'dynamic_complex',
  ]).optional(),
  /** APP 截图模式：base64 或 data URL 数组，最多 5 张 */
  screenshots: z.array(z.string()).max(5).optional(),
  /** APP APK/流量模式：R2 中 APK 的 object key */
  appR2Key: z.string().optional(),
  appAnalyzeMode: z.enum(['screenshot', 'apk', 'traffic']).optional(),
  auth: z
    .object({
      mode: z.enum(['password', 'cookie']),
      username: z.string().optional(),
      password: z.string().optional(),
      loginUrl: z.string().optional(),
      cookieString: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    let sysConfig: { maintenanceMode?: boolean } = {};
    try {
      sysConfig = await getSystemConfig();
    } catch {
      // 配置不可用时不阻断
    }
    if (sysConfig.maintenanceMode) {
      return NextResponse.json(
        { error: 'System is under maintenance. Please try again later.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url, cloneType, deliveryMode, targetLanguage, complexity, screenshots, appR2Key, appAnalyzeMode, auth } =
      parsed.data;

    const isApp = cloneType === 'app';
    const mode = (appAnalyzeMode ?? 'screenshot') as 'screenshot' | 'apk' | 'traffic';
    if (isApp) {
      if (mode === 'screenshot') {
        if (!screenshots?.length) {
          return NextResponse.json({ error: 'APP clone (screenshot) requires screenshots array' }, { status: 400 });
        }
      } else if (mode === 'apk' || mode === 'traffic') {
        if (!appR2Key?.trim()) {
          return NextResponse.json({ error: 'APP clone (apk/traffic) requires appR2Key from upload' }, { status: 400 });
        }
      }
    } else {
      if (!url) {
        return NextResponse.json({ error: 'Web clone requires url' }, { status: 400 });
      }
      if (!complexity) {
        return NextResponse.json({ error: 'Web clone requires complexity' }, { status: 400 });
      }
      const urlCheck = validateScrapeUrl(url);
      if (!urlCheck.ok) {
        return NextResponse.json(
          { error: urlCheck.error ?? 'Invalid URL' },
          { status: 400 }
        );
      }
    }

    const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
    const authUserId = await getAuthUserId(req);
    const userId = authUserId ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Sign in or use Authorization: Bearer we_xxx' },
        { status: 401 }
      );
    }
    const creditsUsed = isApp
      ? (mode === 'screenshot' ? CREDITS_APP_SCREENSHOT : mode === 'apk' ? CREDITS_APP_APK : CREDITS_APP_TRAFFIC)
      : CREDITS_BY_COMPLEXITY[(complexity ?? 'static_single') as ComplexityLevel];

    let profile: ProfileRow | null = null;
    if (!stripeEnabled && userId !== 'anon' && isDbConfigured()) {
      profile = await ensureProfile(userId, undefined);
      const balance = profile?.credits ?? 0;
      if (balance < creditsUsed) {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsRequired: creditsUsed, creditsBalance: balance },
          { status: 402 }
        );
      }
    }

    const taskId = uuidv4();

    const task: CloneTask = {
      id: taskId,
      userId,
      cloneType: cloneType as 'web' | 'app',
      targetUrl: isApp ? 'APP Screenshots' : url,
      complexity: (isApp ? 'static_single' : complexity) as ComplexityLevel,
      creditsUsed,
      status: 'queued',
      deliveryMode: deliveryMode as 'download' | 'hosting',
      targetLanguage: targetLanguage as 'original' | 'zh' | 'en',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      ...(auth?.mode === 'cookie' && auth.cookieString
        ? { auth: { mode: 'cookie' as const, cookieString: auth.cookieString } }
        : {}),
      ...(isApp
        ? {
            appScreenshots: mode === 'screenshot' ? screenshots : undefined,
            appR2Key: mode === 'apk' || mode === 'traffic' ? appR2Key : undefined,
            appAnalyzeMode: mode,
          }
        : {}),
    };

    const initialStatus = {
      status: 'queued',
      progress: 0,
      currentStep: '任务已创建，等待处理...',
      retryCount: 0,
      cloneType: cloneType as string,
    };
    await createTaskInStore(taskId, {
      userId,
      cloneType: cloneType as string,
      targetUrl: task.targetUrl ?? '',
      complexity: task.complexity as string,
      creditsUsed,
      deliveryMode: deliveryMode as string,
      targetLanguage: targetLanguage as string,
    }, initialStatus);

    if (!stripeEnabled && userId !== 'anon' && isDbConfigured() && profile) {
      const newCredits = (profile.credits ?? 0) - creditsUsed;
      await query(
        'UPDATE profiles SET credits = $1, updated_at = NOW() WHERE id = $2',
        [newCredits, userId]
      );
    }

    processCloneTask(task).catch(async (err) => {
      console.error('[clone-worker] Task failed:', taskId, err);
      await setTaskStatus(taskId, {
        status: 'failed',
        currentStep: err instanceof Error ? err.message : '任务失败',
      });
    });

    return NextResponse.json({
      taskId,
      status: 'queued',
      creditsDeducted: creditsUsed,
      estimatedMinutes: 10,
    });
  } catch (err) {
    console.error('[clone/create]', err);
    return NextResponse.json(
      { error: 'Failed to create clone task' },
      { status: 500 }
    );
  }
}
