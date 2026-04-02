/**
 * 配置操作审计日志（不可删除）
 * 所有 platform_config 修改操作必须写入此表
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type ConfigLogAction =
  | 'pricing.update'
  | 'pricing.rollback'
  | 'system.update'
  | 'signatures.update';

export interface ConfigLogEntry {
  id: string;
  action: ConfigLogAction;
  configKey: string | null;
  oldValue: unknown;
  newValue: unknown;
  updatedBy: string;
  createdAt: string;
}

export async function logConfigChange(params: {
  action: ConfigLogAction;
  configKey?: string;
  oldValue?: unknown;
  newValue?: unknown;
  updatedBy: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await (supabase as any).from('platform_config_logs').insert({
      action: params.action,
      config_key: params.configKey ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      updated_by: params.updatedBy,
    });
  } catch (e) {
    console.error('[config-logs] Failed to log:', e);
  }
}

export async function getConfigLogs(params: {
  action?: ConfigLogAction;
  limit?: number;
  offset?: number;
}): Promise<ConfigLogEntry[]> {
  try {
    const supabase = createAdminClient();
    let query = (supabase as any)
      .from('platform_config_logs')
      .select('id, action, config_key, old_value, new_value, updated_by, created_at')
      .order('created_at', { ascending: false })
      .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);
    if (params.action) {
      query = query.eq('action', params.action);
    }
    const { data } = await query;
    return (data || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      action: r.action,
      configKey: r.config_key,
      oldValue: r.old_value,
      newValue: r.new_value,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}
