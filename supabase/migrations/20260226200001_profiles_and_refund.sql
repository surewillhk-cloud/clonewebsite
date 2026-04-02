-- profiles 表 - 用户额度与 Stripe 关联
-- 修改为使用独立用户表（不再是 Supabase auth.users）

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0,
  credits_expire_at timestamptz,
  stripe_customer_id text,
  preferred_language text DEFAULT 'zh',
  referral_code text,
  referred_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- clone_tasks 增加 stripe 相关字段（用于退款）
ALTER TABLE public.clone_tasks
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS idx_clone_tasks_stripe_pi
  ON public.clone_tasks(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
