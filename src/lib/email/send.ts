/**
 * 邮件通知 - Resend 实现
 * 配置 RESEND_API_KEY 后启用
 * 支持：任务完成、任务失败、欠费提醒
 */

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM ?? 'CH007 <noreply@ch007.ai>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ch007.ai';

function getClient(): Resend | null {
  if (!resendApiKey) return null;
  return new Resend(resendApiKey);
}

/**
 * 检查邮件服务是否已配置
 */
export function isEmailConfigured(): boolean {
  return !!resendApiKey;
}

/**
 * 发送任务完成通知
 */
export async function sendTaskComplete(
  toEmail: string,
  params: { taskId: string; targetUrl: string; downloadUrl?: string }
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Your clone is ready - CH007',
      html: `
        <h2>克隆完成</h2>
        <p>您的网站克隆任务已完成。</p>
        <ul>
          <li><strong>目标网址：</strong> ${params.targetUrl}</li>
          <li><strong>任务 ID：</strong> ${params.taskId}</li>
        </ul>
        ${params.downloadUrl ? `<p><a href="${params.downloadUrl}">下载代码包</a></p>` : ''}
        <p><a href="${appUrl}/clone/${params.taskId}/result">查看结果</a></p>
      `,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * 发送任务失败通知
 */
export async function sendTaskFailed(
  toEmail: string,
  params: { taskId: string; targetUrl: string; reason?: string }
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Clone task failed - CH007',
      html: `
        <h2>克隆任务失败</h2>
        <p>您的网站克隆任务未能完成。</p>
        <ul>
          <li><strong>目标网址：</strong> ${params.targetUrl}</li>
          <li><strong>任务 ID：</strong> ${params.taskId}</li>
          ${params.reason ? `<li><strong>原因：</strong> ${params.reason}</li>` : ''}
        </ul>
        <p>额度已退回（如已配置）。如需帮助请联系 support@ch007.ai。</p>
        <p><a href="${appUrl}/dashboard">返回控制台</a></p>
      `,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * 发送管理员告警（克隆失败、Webhook 异常等）
 */
export async function sendAdminAlert(
  toEmails: string[],
  params: {
    subject: string;
    title: string;
    body: string;
    details?: Record<string, string>;
  }
): Promise<boolean> {
  if (toEmails.length === 0) return false;
  const client = getClient();
  if (!client) return false;

  const detailsHtml =
    params.details && Object.keys(params.details).length > 0
      ? `
        <h3>详情</h3>
        <ul>
          ${Object.entries(params.details)
            .map(([k, v]) => `<li><strong>${k}:</strong> ${String(v)}</li>`)
            .join('')}
        </ul>
      `
      : '';

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to: toEmails,
      subject: `[CH007 告警] ${params.subject}`,
      html: `
        <h2>${params.title}</h2>
        <p>${params.body}</p>
        ${detailsHtml}
        <p style="margin-top:16px;color:#666;font-size:12px;">时间: ${new Date().toISOString()}</p>
      `,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * 发送欠费提醒
 */
export async function sendPaymentFailed(
  toEmail: string,
  params: { invoiceId?: string; amountDue?: number }
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const amount = params.amountDue != null ? `$${(params.amountDue / 100).toFixed(2)}` : '';
    const { error } = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Payment failed - Action required - CH007',
      html: `
        <h2>付款失败</h2>
        <p>您的托管订阅续费未能完成。</p>
        ${params.invoiceId ? `<p>发票 ID：${params.invoiceId}</p>` : ''}
        ${amount ? `<p>待付金额：${amount}</p>` : ''}
        <p>请更新您的支付方式，否则服务可能会被暂停。</p>
        <p><a href="${appUrl}/billing">管理账单</a></p>
      `,
    });
    return !error;
  } catch {
    return false;
  }
}
