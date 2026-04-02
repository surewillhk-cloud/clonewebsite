/**
 * 克隆失败时通知管理员
 * 与用户通知并行，不阻塞主流程
 */

import { getAdminEmails } from './get-admin-emails';
import { sendAdminAlert, isEmailConfigured } from '@/lib/email/send';

export interface CloneFailureInfo {
  taskId: string;
  userId: string;
  targetUrl?: string;
  cloneType: 'web' | 'app';
  reason: string;
}

/**
 * 克隆任务失败时发送管理员告警（异步，不阻塞）
 */
export async function notifyAdminOnCloneFailure(info: CloneFailureInfo): Promise<void> {
  if (!isEmailConfigured()) return;
  const emails = await getAdminEmails();
  if (emails.length === 0) return;

  sendAdminAlert(emails, {
    subject: '克隆任务失败',
    title: '克隆任务失败告警',
    body: `任务 ${info.taskId} 失败，请检查平台状态。`,
    details: {
      任务ID: info.taskId,
      用户ID: info.userId,
      克隆类型: info.cloneType,
      目标: info.targetUrl ?? info.cloneType === 'app' ? 'APP' : '-',
      原因: info.reason.slice(0, 500),
    },
  }).catch(() => {});
}
