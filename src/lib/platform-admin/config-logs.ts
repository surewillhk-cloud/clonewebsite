/**
 * 配置操作审计日志
 */

import { query, isDbConfigured } from '@/lib/db';

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
  if (!isDbConfigured()) return;

  try {
    await query(
      `INSERT INTO platform_config_logs 
       (action, config_key, old_value, new_value, updated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        params.action,
        params.configKey ?? null,
        params.oldValue ? JSON.stringify(params.oldValue) : null,
        params.newValue ? JSON.stringify(params.newValue) : null,
        params.updatedBy,
      ]
    );
  } catch (e) {
    console.error('[config-logs] Failed to log:', e);
  }
}

export async function getConfigLogs(params: {
  action?: ConfigLogAction;
  limit?: number;
  offset?: number;
}): Promise<ConfigLogEntry[]> {
  if (!isDbConfigured()) return [];

  try {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    let sql = `SELECT id, action, config_key, old_value, new_value, updated_by, created_at 
               FROM platform_config_logs`;
    const values: unknown[] = [];

    if (params.action) {
      sql += ` WHERE action = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      values.push(params.action, limit, offset);
    } else {
      sql += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    }

    const result = await query(sql, values);
    return result.rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      action: r.action as ConfigLogAction,
      configKey: r.config_key as string | null,
      oldValue: r.old_value,
      newValue: r.new_value,
      updatedBy: r.updated_by as string,
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}
