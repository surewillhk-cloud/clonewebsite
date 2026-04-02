/**
 * POST /api/hosting/checkout
 * 创建 Stripe 托管订阅 Checkout Session
 * 支付成功后由 webhook 触发部署
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { HOSTING_PLANS } from '@/constants/plans';

const schema = z.object({
  taskId: z.string().uuid(),
  hostingPlan: z.enum([
    'static_starter',
    'static_growth',
    'dynamic_basic',
    'dynamic_pro',
  ]),
});

export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  try {
    const { createClient } = await import('@/lib/supabase/server');
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

    const { taskId, hostingPlan } = parsed.data as {
      taskId: string;
      hostingPlan: keyof typeof HOSTING_PLANS;
    };
    const plan = HOSTING_PLANS[hostingPlan];
    const priceId = plan.priceId;

    if (!priceId || priceId === 'price_xxx') {
      return NextResponse.json(
        {
          error:
            '托管订阅未配置。请在 Stripe 创建 Price 并设置 STRIPE_PRICE_STATIC_STARTER 等环境变量。',
        },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeSecret);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        taskId,
        userId: user.id,
        hostingPlan,
      },
      success_url: `${appUrl}/clone/${taskId}/result?hosting_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/clone/${taskId}/result?hosting_canceled=1`,
      subscription_data: {
        metadata: {
          taskId,
          userId: user.id,
          hostingPlan,
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error('[api/hosting/checkout]', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
