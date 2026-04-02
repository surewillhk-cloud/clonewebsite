-- 手动执行迁移：复制此文件全部内容到 PostgreSQL 数据库运行
-- 注意：不再使用 Supabase RLS，权限由应用层控制

-- ========== 1. 推荐计划 ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by)
  WHERE referred_by IS NOT NULL;

COMMENT ON COLUMN public.profiles.referral_code IS '用户专属推荐码，用于 /register?ref=XXX';
COMMENT ON COLUMN public.profiles.referred_by IS '通过推荐链接注册时，推荐人的 user id';

-- ========== 2. 企业版 API Key ==========
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  name text DEFAULT 'API Key',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
