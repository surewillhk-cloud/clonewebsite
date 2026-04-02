/**
 * POST /api/stripe/checkout
 * 创建 Stripe Checkout Session（克隆任务按次付费）
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { validateScrapeUrl } from '@/lib/url-validate';

const schema = z.object({
  amountCents: z.number().min(100).max(9900),
  url: z.string().url(),
  cloneType: z.enum(['web', 'app']).default('web'),
  deliveryMode: z.enum(['download', 'hosting']).default('download'),
  targetLanguage: z.enum(['original', 'zh', 'en']).default('original'),
  complexity: z.enum([
    'static_single',
    'static_multi',
    'dynamic_basic',
    'dynamic_complex',
  ]),
  authToken: z.string().optional(), // 内嵌浏览器提取的 Cookie 对应的临时 token
});

export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured. Payment disabled.' },
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

    const { amountCents, url, cloneType, deliveryMode, targetLanguage, complexity, authToken } =
      parsed.data;

    if (cloneType === 'web') {
      const urlCheck = validateScrapeUrl(url);
      if (!urlCheck.ok) {
        return NextResponse.json(
          { error: urlCheck.error ?? 'Invalid URL' },
          { status: 400 }
        );
      }
    }

    const stripe = new Stripe(stripeSecret);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4000';

    const metadata: Record<string, string> = {
      url,
      cloneType: cloneType ?? 'web',
      deliveryMode: deliveryMode ?? 'download',
      targetLanguage: targetLanguage ?? 'original',
      complexity,
    };
    if (authToken) metadata.authToken = authToken;

    const successUrl = authToken
      ? `${appUrl}/clone/new?session_id={CHECKOUT_SESSION_ID}&success=true&auth_token=${encodeURIComponent(authToken)}`
      : `${appUrl}/clone/new?session_id={CHECKOUT_SESSION_ID}&success=true`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'CH007 — 网站克隆',
              description: `克隆任务 · ${url} · 复杂度 ${complexity}`,
              images: undefined,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: successUrl,
      cancel_url: `${appUrl}/clone/new?canceled=true`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error('[stripe/checkout]', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
