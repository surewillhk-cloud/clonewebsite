/**
 * 失败退款逻辑
 * 克隆任务全部重试失败时调用
 * 1. 若任务通过 Stripe 支付：创建 Stripe 退款
 * 2. 若有 profiles 表且用户有 credits：退回额度
 * 3. 记录 billing_events 供财务报表统计
 */

import Stripe from 'stripe';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

async function recordRefundEvent(
  userId: string,
  taskId: string,
  opts: { amountCents?: number; creditsDelta?: number; stripeRefundId?: string }
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const db = createAdminClient() as any;
    await db.from('billing_events').insert({
      user_id: userId,
      event_type: 'credit_refund',
      amount: opts.amountCents ?? 0,
      credits_delta: opts.creditsDelta ?? 0,
      related_task_id: taskId,
      metadata: {
        reason: 'clone_failed',
        stripe_refund_id: opts.stripeRefundId,
      },
    });
  } catch (err) {
    console.warn('[refund] Failed to record billing_event:', err);
  }
}

export async function refundCreditsOnFailure(
  userId: string,
  creditsUsed: number,
  taskId: string,
  stripePaymentIntentId?: string | null
): Promise<void> {
  // 1. Stripe 退款（任务通过 Stripe 支付时）
  if (stripePaymentIntentId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      const chargeId = paymentIntent.latest_charge;
      const amountPaid = paymentIntent.amount;
      if (chargeId && typeof chargeId === 'string') {
        const refund = await stripe.refunds.create({
          charge: chargeId,
          reason: 'requested_by_customer',
          metadata: { taskId, reason: 'clone_failed' },
        });
        console.log('[refund] Stripe refund created for task', taskId);
        await recordRefundEvent(userId, taskId, {
          amountCents: -(refund.amount ?? amountPaid),
          stripeRefundId: refund.id,
        });
        return;
      }
    } catch (err) {
      console.warn('[refund] Stripe refund failed:', err);
      // 继续尝试 profiles credits 回退
    }
  }

  // 2. profiles.credits 额度回退（当 Stripe 未配置或退款失败时）
  if (isSupabaseConfigured() && userId !== 'anon' && creditsUsed > 0) {
    try {
      const supabase = createAdminClient();
      const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('id, credits')
        .eq('id', userId)
        .single();

      const p = profile as { id: string; credits?: number } | null;
      if (p) {
        const newCredits = (p.credits ?? 0) + creditsUsed;
        const { error: updateErr } = await (supabase.from('profiles') as any)
          .update({
            credits: newCredits,
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id);
        if (!updateErr) {
          console.log('[refund] Credits restored for user', userId, 'task', taskId);
          await recordRefundEvent(userId, taskId, { creditsDelta: creditsUsed });
        }
      }
    } catch (err) {
      console.warn('[refund] Profiles credits restore failed:', err);
    }
  }

  if (!stripePaymentIntentId && userId === 'anon') {
    console.log('[refund] No payment to refund (anon/free):', taskId);
  }
}
