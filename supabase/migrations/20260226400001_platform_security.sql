-- 平台安全增强：配置操作日志、定价历史、TOTP 双因素
-- 1. platform_config_logs: 所有配置修改操作审计日志（不可删除）
-- 2. pricing_history: 定价完整历史快照，支持回滚
-- 3. platform_admins.totp_secret: TOTP 双因素认证

-- platform_config_logs（配置操作审计日志）
CREATE TABLE IF NOT EXISTS public.platform_config_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  config_key text,
  old_value jsonb,
  new_value jsonb,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_config_logs_created_at ON public.platform_config_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_config_logs_action ON public.platform_config_logs(action);

ALTER TABLE public.platform_config_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access platform_config_logs"
  ON public.platform_config_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- pricing_history（定价快照，支持回滚）
CREATE TABLE IF NOT EXISTS public.pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_history_created_at ON public.pricing_history(created_at DESC);

ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access pricing_history"
  ON public.pricing_history FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- platform_admins 添加 totp_secret 列
ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS totp_secret text;

-- platform_admin_totp_temp: 登录第二步临时令牌（验证 TOTP 用，有效期约 3 分钟）
CREATE TABLE IF NOT EXISTS public.platform_admin_totp_temp (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_admin_totp_temp_expires ON public.platform_admin_totp_temp(expires_at);

ALTER TABLE public.platform_admin_totp_temp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access platform_admin_totp_temp"
  ON public.platform_admin_totp_temp FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- platform_admin_totp_pending: 启用 TOTP 时临时存储 secret，验证成功后写入 platform_admins
CREATE TABLE IF NOT EXISTS public.platform_admin_totp_pending (
  admin_id uuid PRIMARY KEY REFERENCES public.platform_admins(id) ON DELETE CASCADE,
  secret text NOT NULL,
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.platform_admin_totp_pending ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access platform_admin_totp_pending"
  ON public.platform_admin_totp_pending FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
