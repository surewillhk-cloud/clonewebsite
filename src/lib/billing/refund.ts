/**
 * 失败退款逻辑
 */

import Stripe from 'stripe';
import { query, isDbConfigured } from '@/lib/db';

async function recordRefundEvent(
  userId: string,
  taskId: string,
  opts: { amountCents?: number; creditsDelta?: number; stripeRefundId?: string }
): Promise<void> {
  if (!isDbConfigured()) return;

  try {
    await query(
      `INSERT INTO billing_events 
       (user_id, event_type, amount, credits_delta, related_task_id, metadata, created_at)
       VALUES ($1, 'credit_refund', $2, $3, $4, $5, NOW())`,
      [
        userId,
        opts.amountCents ?? 0,
        opts.creditsDelta ?? 0,
        taskId,
        JSON.stringify({ reason: 'clone_failed', stripe_refund_id: opts.stripeRefundId }),
      ]
    );
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
    }
  }

  if (isDbConfigured() && userId !== 'anon' && creditsUsed > 0) {
    try {
      const result = await query(
        'SELECT id, credits FROM profiles WHERE id = $1',
        [userId]
      );

      const profile = result.rows[0] as { id: string; credits?: number } | undefined;
      if (profile) {
        const newCredits = (profile.credits ?? 0) + creditsUsed;
        await query(
          'UPDATE profiles SET credits = $1, updated_at = NOW() WHERE id = $2',
          [newCredits, profile.id]
        );
        console.log('[refund] Credits restored for user', userId, 'task', taskId);
        await recordRefundEvent(userId, taskId, { creditsDelta: creditsUsed });
      }
    } catch (err) {
      console.warn('[refund] Profiles credits restore failed:', err);
    }
  }

  if (!stripePaymentIntentId && userId === 'anon') {
    console.log('[refund] No payment to refund (anon/free):', taskId);
  }
}
