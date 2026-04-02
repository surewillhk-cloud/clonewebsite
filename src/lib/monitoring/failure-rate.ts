/**
 * 失败率检测与维护模式联动
 */

import { query, isDbConfigured } from '@/lib/db';
import { getSystemConfig, saveSystemConfig } from '@/lib/platform-admin/system-config';
import { getAdminEmails } from './get-admin-emails';
import { sendAdminAlert, isEmailConfigured } from '@/lib/email/send';

export async function checkFailureRateAndMaybeEnableMaintenance(): Promise<void> {
  if (!isDbConfigured()) return;

  const config = await getSystemConfig();
  if (!config.autoMaintenanceOnHighFailureRate) return;

  const window = config.failureRateWindowTasks;
  const threshold = config.failureRateThreshold;

  try {
    const result = await query(
      `SELECT status FROM clone_tasks ORDER BY created_at DESC LIMIT $1`,
      [window]
    );

    const rows = result.rows as { status: string }[];
    if (rows.length < Math.min(window, 5)) return;

    const failed = rows.filter((r) => r.status === 'failed').length;
    const rate = failed / rows.length;

    if (rate >= threshold && !config.maintenanceMode) {
      await saveSystemConfig(
        { maintenanceMode: true },
        'system.auto-maintenance'
      );
      const emails = await getAdminEmails();
      if (emails.length > 0 && isEmailConfigured()) {
        sendAdminAlert(emails, {
          subject: '自动开启维护模式',
          title: '失败率过高，已自动开启维护模式',
          body: `最近 ${rows.length} 个任务中 ${failed} 个失败，失败率 ${(rate * 100).toFixed(1)}% 超过阈值 ${(threshold * 100).toFixed(0)}%。已暂停新任务接入，请检查后手动关闭维护模式。`,
          details: {
            失败数: String(failed),
            总数: String(rows.length),
            失败率: `${(rate * 100).toFixed(1)}%`,
            阈值: `${(threshold * 100).toFixed(0)}%`,
          },
        }).catch(() => {});
      }
    }
  } catch {
    // 静默失败，不影响克隆流程
  }
}
