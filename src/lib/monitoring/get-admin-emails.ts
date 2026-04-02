/**
 * 获取平台管理员邮箱（用于告警通知）
 * 优先从 platform_admins 表读取，若无则使用 ALERT_EMAILS 环境变量
 */

import { query, isDbConfigured } from '@/lib/db';

export async function getAdminEmails(): Promise<string[]> {
  const envEmails = process.env.ALERT_EMAILS;
  if (envEmails) {
    return envEmails.split(',').map((e) => e.trim()).filter(Boolean);
  }
  if (!isDbConfigured()) return [];
  try {
    const result = await query('SELECT email FROM platform_admins');
    const rows = result.rows as { email: string }[];
    return rows.map((r) => r.email).filter(Boolean);
  } catch {
    return [];
  }
}
