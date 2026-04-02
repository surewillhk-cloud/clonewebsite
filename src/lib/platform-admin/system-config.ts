/**
 * 系统配置
 */

import { query, isDbConfigured } from '@/lib/db';
import { logConfigChange } from './config-logs';

export interface SystemConfig {
  maxConcurrentTasks: number;
  maintenanceMode: boolean;
  newUserTrialCents: number;
  failureRateThreshold: number;
  failureRateWindowTasks: number;
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
  if (!isDbConfigured()) return DEFAULT;

  try {
    const keys = [
      'system.maxConcurrentTasks',
      'system.maintenanceMode',
      'system.newUserTrialCents',
      'system.failureRateThreshold',
      'system.failureRateWindowTasks',
      'system.autoMaintenanceOnHighFailureRate',
    ];

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(
      `SELECT key, value FROM platform_config WHERE key IN (${placeholders})`,
      keys
    );

    const config = { ...DEFAULT };
    const rows = result.rows as { key: string; value: unknown }[];

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
  if (!isDbConfigured()) return;

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
    await query(
      `INSERT INTO platform_config (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
      [m.key, JSON.stringify(m.value), updatedBy]
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
