-- clone_tasks 表 - 克隆任务持久化
-- 执行: supabase db push 或手动在 SQL Editor 运行

CREATE TABLE IF NOT EXISTS public.clone_tasks (
  id uuid PRIMARY KEY,
  user_id text NOT NULL DEFAULT 'anon',
  clone_type text NOT NULL DEFAULT 'web',
  target_url text,
  complexity text NOT NULL,
  credits_used integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  current_step text DEFAULT '',
  delivery_mode text NOT NULL DEFAULT 'download',
  target_language text NOT NULL DEFAULT 'original',
  quality_score integer,
  retry_count integer NOT NULL DEFAULT 0,
  r2_key text,
  local_zip_path text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 第四阶段预留字段（可选，后续 migration 添加）
-- app_upload_url text,
-- app_analyze_mode text,
-- scraper_layer integer,
-- scrape_result jsonb,
-- analysis_result jsonb,
-- preview_url text,

CREATE INDEX IF NOT EXISTS idx_clone_tasks_user_id ON public.clone_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_clone_tasks_status ON public.clone_tasks(status);
CREATE INDEX IF NOT EXISTS idx_clone_tasks_created_at ON public.clone_tasks(created_at DESC);

-- 注意：不再使用 Supabase RLS，权限由应用层控制
