-- 平台管理后台相关表
-- platform_config: 定价等配置，管理员可实时修改
-- platform_admins: 平台管理员账号（与用户体系完全隔离）
-- task_costs: 克隆任务成本明细

-- platform_config
CREATE TABLE IF NOT EXISTS public.platform_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_config_updated_at ON public.platform_config(updated_at DESC);

-- 初始默认配置（value 为 jsonb，数字用 JSON 格式）
INSERT INTO public.platform_config (key, value, updated_by) VALUES
  ('pricing.profitMultiplier', '5.0'::jsonb, 'system'),
  ('pricing.multiplierByComplexity', '{"static_single":5.0,"static_multi":5.0,"dynamic_basic":5.0,"dynamic_complex":5.0}'::jsonb, 'system'),
  ('pricing.minPriceCents', '300'::jsonb, 'system'),
  ('pricing.maxPriceCents', '9900'::jsonb, 'system'),
  ('system.maxConcurrentTasks', '10'::jsonb, 'system'),
  ('system.maintenanceMode', 'false'::jsonb, 'system'),
  ('system.newUserTrialCents', '0'::jsonb, 'system'),
  ('claude.model', '"claude-sonnet-4-5-20241022"'::jsonb, 'system')
ON CONFLICT (key) DO NOTHING;

-- platform_admins（平台管理员，独立于 auth.users）
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'ops' CHECK (role IN ('super_admin', 'finance', 'ops')),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON public.platform_admins(email);

-- task_costs：每个克隆任务的成本明细（供定价引擎与利润分析）
CREATE TABLE IF NOT EXISTS public.task_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.clone_tasks(id) ON DELETE CASCADE,
  firecrawl_cost_cents integer DEFAULT 0,
  decodo_cost_cents integer DEFAULT 0,
  playwright_cost_cents integer DEFAULT 0,
  claude_input_tokens integer DEFAULT 0,
  claude_output_tokens integer DEFAULT 0,
  claude_input_cost_cents integer DEFAULT 0,
  claude_output_cost_cents integer DEFAULT 0,
  docker_cost_cents integer DEFAULT 0,
  r2_cost_cents integer DEFAULT 0,
  total_cost_cents integer NOT NULL DEFAULT 0,
  charged_cents integer DEFAULT 0,
  profit_cents integer DEFAULT 0,
  profit_multiplier numeric DEFAULT 5.0,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_costs_task_id ON public.task_costs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_costs_calculated_at ON public.task_costs(calculated_at DESC);

-- RLS：platform_config 仅 service_role 可读写
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access platform_config"
  ON public.platform_config FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- platform_admins 仅 service_role 可访问
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access platform_admins"
  ON public.platform_admins FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- task_costs 仅 service_role 可访问
ALTER TABLE public.task_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access task_costs"
  ON public.task_costs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
