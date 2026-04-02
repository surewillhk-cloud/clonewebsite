-- hosted_sites 表 - 托管站点
-- 注意：不再使用 Supabase RLS，权限由应用层控制

CREATE TABLE IF NOT EXISTS public.hosted_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  clone_task_id uuid NOT NULL REFERENCES public.clone_tasks(id),
  github_repo_url text,
  github_repo_name text,
  railway_project_id text,
  railway_service_id text,
  railway_deployment_url text,
  custom_domain text,
  domain_verified boolean DEFAULT false,
  hosting_plan text NOT NULL DEFAULT 'static_starter',
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'deploying',
  railway_budget_used integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  suspended_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_hosted_sites_user_id ON public.hosted_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_hosted_sites_clone_task_id ON public.hosted_sites(clone_task_id);
CREATE INDEX IF NOT EXISTS idx_hosted_sites_status ON public.hosted_sites(status);
