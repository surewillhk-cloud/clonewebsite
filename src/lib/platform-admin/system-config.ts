/**
 * 系统配置（读写 platform_config）
 * 所有修改写入操作日志
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logConfigChange } from './config-logs';

export interface SystemConfig {
  maxConcurrentTasks: number;
  maintenanceMode: boolean;
  newUserTrialCents: number;
  /** 失败率阈值 0–1，超过时可选自动开启维护模式 */
  failureRateThreshold: number;
  /** 统计失败率的最近任务数 */
  failureRateWindowTasks: number;
  /** 失败率过高时自动开启维护模式 */
  autoMaintenanceOnHighFailureRate: boolean;
}

const DEFAULT: SystemConfig = {
  maxConcurrentTasks: 10,
  maintenanceMode: false,
  newUserTrialCents: 0,
  failureRateThreshold: 0.5,
  failureRateWindowTasks: 20,
  autoMaintenanceOnHighFailureRate: false,
};

export async function getSystemConfig(): Promise<SystemConfig> {
  try {
    const supabase = createAdminClient();
    const keys = [
      'system.maxConcurrentTasks',
      'system.maintenanceMode',
      'system.newUserTrialCents',
      'system.failureRateThreshold',
      'system.failureRateWindowTasks',
      'system.autoMaintenanceOnHighFailureRate',
    ];
    const { data } = await (supabase as any)
      .from('platform_config')
      .select('key, value')
      .in('key', keys);

    const config = { ...DEFAULT };
    const rows = (data || []) as { key: string; value: unknown }[];
    for (const row of rows) {
      const v = row.value;
      if (row.key === 'system.maxConcurrentTasks')
        config.maxConcurrentTasks = typeof v === 'number' ? v : Number(v) || DEFAULT.maxConcurrentTasks;
      if (row.key === 'system.maintenanceMode')
        config.maintenanceMode = v === true || v === 'true';
      if (row.key === 'system.newUserTrialCents')
        config.newUserTrialCents = typeof v === 'number' ? v : Number(v) || 0;
      if (row.key === 'system.failureRateThreshold')
        config.failureRateThreshold = Math.max(0, Math.min(1, typeof v === 'number' ? v : Number(v) || 0.5));
      if (row.key === 'system.failureRateWindowTasks')
        config.failureRateWindowTasks = Math.max(5, Math.min(100, typeof v === 'number' ? v : Number(v) || 20));
      if (row.key === 'system.autoMaintenanceOnHighFailureRate')
        config.autoMaintenanceOnHighFailureRate = v === true || v === 'true';
    }
    return config;
  } catch {
    return DEFAULT;
  }
}

export async function saveSystemConfig(
  updates: Partial<SystemConfig>,
  updatedBy: string
): Promise<void> {
  const supabase = createAdminClient();
  const db = supabase as any;
  const oldConfig = await getSystemConfig();

  const map: { key: string; value: unknown }[] = [];
  if (updates.maxConcurrentTasks != null)
    map.push({ key: 'system.maxConcurrentTasks', value: updates.maxConcurrentTasks });
  if (updates.maintenanceMode != null)
    map.push({ key: 'system.maintenanceMode', value: updates.maintenanceMode });
  if (updates.newUserTrialCents != null)
    map.push({ key: 'system.newUserTrialCents', value: updates.newUserTrialCents });
  if (updates.failureRateThreshold != null)
    map.push({ key: 'system.failureRateThreshold', value: updates.failureRateThreshold });
  if (updates.failureRateWindowTasks != null)
    map.push({ key: 'system.failureRateWindowTasks', value: updates.failureRateWindowTasks });
  if (updates.autoMaintenanceOnHighFailureRate != null)
    map.push({ key: 'system.autoMaintenanceOnHighFailureRate', value: updates.autoMaintenanceOnHighFailureRate });

  for (const m of map) {
    await db.from('platform_config').upsert(
      {
        key: m.key,
        value: m.value,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  }

  const newConfig = await getSystemConfig();
  await logConfigChange({
    action: 'system.update',
    configKey: 'system',
    oldValue: oldConfig,
    newValue: newConfig,
    updatedBy,
  });
}
