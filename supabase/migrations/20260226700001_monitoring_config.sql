-- 监控与告警相关系统配置
INSERT INTO public.platform_config (key, value, updated_by) VALUES
  ('system.failureRateThreshold', '0.5'::jsonb, 'system'),
  ('system.failureRateWindowTasks', '20'::jsonb, 'system'),
  ('system.autoMaintenanceOnHighFailureRate', 'false'::jsonb, 'system')
ON CONFLICT (key) DO NOTHING;
