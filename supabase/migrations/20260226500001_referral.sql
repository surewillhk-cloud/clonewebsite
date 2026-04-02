-- 推荐计划：referral_code、referred_by、referral 奖励
-- 执行: npm run db:migrate

-- profiles 增加推荐相关字段
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by)
  WHERE referred_by IS NOT NULL;

-- 推荐奖励事件（复用 billing_events 或单独表）
-- 使用 billing_events 的 credit_referral 类型
COMMENT ON COLUMN public.profiles.referral_code IS '用户专属推荐码，用于 /register?ref=XXX';
COMMENT ON COLUMN public.profiles.referred_by IS '通过推荐链接注册时，推荐人的 user id';
