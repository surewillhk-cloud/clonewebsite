/**
 * POST /api/stripe/verify-session
 * 验证 Checkout Session 支付成功，创建克隆任务并返回 taskId
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import type { CloneTask, ComplexityLevel } from '@/types/clone';
import { CREDITS_BY_COMPLEXITY } from '@/constants/plans';
import { processCloneTask } from '@/workers/clone-worker';
import { createTaskInStore, setTaskStatus, getTaskStatus } from '@/lib/task-store';
import { createClient } from '@/lib/supabase/server';
import { get as getAuthCache } from '@/lib/auth-cache';

const schema = z.object({
  session_id: z.string().min(1),
  auth_token: z.string().optional(),
});

// 防止同一 session 重复创建任务
const sessionToTaskId = new Map<string, string>();

export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { session_id, auth_token } = parsed.data;

    const existingTaskId = sessionToTaskId.get(session_id);
    if (existingTaskId) {
      const status = await getTaskStatus(existingTaskId);
      if (status) {
        return NextResponse.json({ taskId: existingTaskId });
      }
      sessionToTaskId.delete(session_id);
    }

    const stripe = new Stripe(stripeSecret);
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 402 }
      );
    }

    const { url, cloneType, deliveryMode, targetLanguage, complexity } =
      session.metadata ?? {};
    if (!url || !complexity) {
      return NextResponse.json(
        { error: 'Invalid session metadata' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? 'anon';
    const creditsUsed = CREDITS_BY_COMPLEXITY[complexity as ComplexityLevel];

    const taskId = uuidv4();
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as { id?: string })?.id;

    let auth: { mode: 'cookie'; cookieString: string } | undefined;
    if (auth_token) {
      const cookieString = getAuthCache(auth_token);
      if (cookieString) {
        auth = { mode: 'cookie', cookieString };
      }
    }

    const task: CloneTask = {
      id: taskId,
      userId,
      cloneType: (cloneType as 'web' | 'app') ?? 'web',
      targetUrl: url,
      complexity: complexity as ComplexityLevel,
      creditsUsed,
      status: 'queued',
      deliveryMode: (deliveryMode as 'download' | 'hosting') ?? 'download',
      targetLanguage: (targetLanguage as 'original' | 'zh' | 'en') ?? 'original',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      ...(auth ? { auth } : {}),
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    };

    sessionToTaskId.set(session_id, taskId);

    const initialStatus = {
      status: 'queued',
      progress: 0,
      currentStep: '任务已创建，等待处理...',
      retryCount: 0,
    };
    await createTaskInStore(
      taskId,
      {
        userId,
        cloneType: (cloneType as string) ?? 'web',
        targetUrl: url,
        complexity: complexity as string,
        creditsUsed,
        deliveryMode: (deliveryMode as string) ?? 'download',
        targetLanguage: (targetLanguage as string) ?? 'original',
        stripePaymentIntentId: paymentIntentId ?? undefined,
      },
      initialStatus
    );

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
    });
  } catch (err) {
    console.error('[stripe/verify-session]', err);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}
