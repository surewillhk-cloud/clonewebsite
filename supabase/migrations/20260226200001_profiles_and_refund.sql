-- profiles 表 - 用户额度与 Stripe 关联
-- 执行: supabase db push 或手动在 SQL Editor 运行

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  credits integer NOT NULL DEFAULT 0,
  credits_expire_at timestamptz,
  stripe_customer_id text,
  preferred_language text DEFAULT 'zh',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 新建用户自动创建 profile（需在 Supabase Dashboard 创建 trigger 或使用 Edge Function）
-- 此处仅建表，触发器可后续添加

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role full access"
  ON public.profiles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- clone_tasks 增加 stripe 相关字段（用于退款）
ALTER TABLE public.clone_tasks
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS idx_clone_tasks_stripe_pi
  ON public.clone_tasks(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
