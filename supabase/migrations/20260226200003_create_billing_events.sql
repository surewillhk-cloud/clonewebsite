-- billing_events 表 - 计费事件（托管续费、额度购买等）
-- 注意：不再使用 Supabase RLS，权限由应用层控制

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_type text NOT NULL,
  amount integer DEFAULT 0,
  credits_delta integer DEFAULT 0,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  related_task_id uuid,
  related_site_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON public.billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON public.billing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_invoice ON public.billing_events(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
