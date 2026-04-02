/**
 * POST /api/stripe/webhook
 * 处理 Stripe Webhook 事件
 * 配置: stripe listen --forward-to localhost:4000/api/stripe/webhook
 * 托管订阅: checkout.session.completed(subscription) 触发部署
 *          customer.subscription.deleted 暂停站点
 *          invoice.payment_succeeded 续费确认
 *          invoice.payment_failed 欠费提醒
 * 失败时发送管理员告警
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { deploy, isDeployerConfigured } from '@/lib/deployer';
import { query, isDbConfigured } from '@/lib/db';
import { sendPaymentFailed, sendAdminAlert, isEmailConfigured } from '@/lib/email/send';
import { getAdminEmails } from '@/lib/monitoring/get-admin-emails';

const processedEvents = new Set<string>();
const MAX_PROCESSED_SIZE = 10000;

async function notifyWebhookFailure(subject: string, error: string, details?: Record<string, string>) {
  const emails = await getAdminEmails();
  if (emails.length === 0 || !isEmailConfigured()) return;
  sendAdminAlert(emails, {
    subject,
    title: 'Stripe Webhook 异常',
    body: error,
    details,
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 503 }
    );
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] Signature verification failed:', msg);
    notifyWebhookFailure('Webhook 签名验证失败', msg, {
      可能原因: '签名密钥不匹配或请求被篡改',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (processedEvents.has(event.id)) {
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const mode = session.metadata?.mode ?? session.mode;

      if (mode === 'subscription' && session.subscription) {
        const taskId = session.metadata?.taskId;
        const userId = session.metadata?.userId;
        const hostingPlan = session.metadata?.hostingPlan ?? 'static_starter';

        if (taskId && userId && isDeployerConfigured()) {
          try {
            await deploy({
              taskId,
              userId,
              hostingPlan,
              stripeSubscriptionId: String(session.subscription),
            });
            console.log('[stripe/webhook] Hosting deploy triggered', taskId, session.subscription);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[stripe/webhook] Deploy failed after checkout:', err);
            await notifyWebhookFailure('托管部署失败', msg, {
              taskId,
              userId,
              hostingPlan,
              subscriptionId: String(session.subscription),
            });
          }
        }
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const inv = event.data.object as { id: string; subscription?: string | { id: string }; amount_paid?: number };
      console.log('[stripe/webhook] invoice.payment_succeeded', inv.id);
      const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
      if (subId && isDbConfigured()) {
        const siteResult = await query(
          'SELECT id, user_id FROM hosted_sites WHERE stripe_subscription_id = $1',
          [subId]
        );
        const site = siteResult.rows[0];
        if (site) {
          await query(
            `INSERT INTO billing_events (user_id, event_type, amount, stripe_invoice_id, related_site_id, metadata) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              site.user_id,
              'hosting_charge',
              inv.amount_paid ?? 0,
              inv.id,
              site.id,
              JSON.stringify({ subscription: subId }),
            ]
          );
          console.log('[stripe/webhook] billing_events recorded', inv.id);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('[stripe/webhook] invoice.payment_failed', invoice.id);
      const inv = invoice as { customer_email?: string; customer_details?: { email?: string } };
      const customerEmail = inv.customer_details?.email ?? inv.customer_email;
      if (isEmailConfigured() && customerEmail) {
        sendPaymentFailed(customerEmail, {
          invoiceId: invoice.id,
          amountDue: invoice.amount_due,
        }).catch(() => {});
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      if (isDbConfigured()) {
        const updateResult = await query(
          `UPDATE hosted_sites SET status = 'suspended', suspended_at = $1 WHERE stripe_subscription_id = $2`,
          [new Date().toISOString(), sub.id]
        );
        if (updateResult.rowCount === 0) {
          console.warn('[stripe/webhook] No hosted_sites found to suspend');
        } else {
          console.log('[stripe/webhook] Hosted site suspended', sub.id);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.status === 'active' && sub.cancel_at_period_end === false) {
        console.log('[stripe/webhook] subscription renewed', sub.id);
        // 续费成功，站点保持 active
      }
      break;
    }

    default:
      console.log('[stripe/webhook] Unhandled event:', event.type);
  }

    if (processedEvents.size >= MAX_PROCESSED_SIZE) {
      processedEvents.clear();
    }
    processedEvents.add(event.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe/webhook] Processing error:', err);
    await notifyWebhookFailure('Webhook 处理异常', msg, {
      事件类型: event.type,
      事件ID: event.id,
    });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
