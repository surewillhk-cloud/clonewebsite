-- billing_events 表 - 计费事件（托管续费、额度购买等）
-- 执行: supabase db push 或手动在 SQL Editor 运行

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

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own billing events"
  ON public.billing_events
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access"
  ON public.billing_events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
