/**
 * 托管部署主流程
 * 获取 zip → 解压 → 创建 GitHub 仓库 → 推送 → Railway 部署
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import extract from 'extract-zip';
import type { DeployResult } from '@/types/hosting';
import { getTaskStatusWithOwner } from '@/lib/task-store';
import { isR2Configured, downloadZipFromR2 } from '@/lib/storage/r2';
import { createRepository, pushToGitHub, isGitHubConfigured } from './github';
import { deployToRailway, isRailwayConfigured } from './railway';

export function isDeployerConfigured(): boolean {
  return isGitHubConfigured() && isRailwayConfigured();
}

export interface DeployInput {
  taskId: string;
  userId: string;
  hostingPlan: string;
  envVars?: Record<string, string>;
  /** Stripe 订阅 ID，支付成功时由 webhook 传入 */
  stripeSubscriptionId?: string;
}

export async function deploy(input: DeployInput): Promise<DeployResult> {
  const { taskId, userId, hostingPlan, envVars, stripeSubscriptionId } = input;

  const taskWithOwner = await getTaskStatusWithOwner(taskId);
  if (!taskWithOwner || taskWithOwner.status.status !== 'done') {
    throw new Error('Task not ready for deploy');
  }
  if (taskWithOwner.userId !== 'anon' && taskWithOwner.userId !== userId) {
    throw new Error('Task does not belong to you');
  }

  const status = taskWithOwner.status;

  let zipBuffer: Buffer;
  if (status.r2Key && isR2Configured()) {
    zipBuffer = await downloadZipFromR2(status.r2Key);
  } else if (status.localZipPath) {
    zipBuffer = await fs.readFile(status.localZipPath);
  } else {
    throw new Error('No zip available. Configure R2 for persistent storage.');
  }

  const extractDir = path.join(os.tmpdir(), `webecho-deploy-${taskId}-${Date.now()}`);
  await fs.mkdir(extractDir, { recursive: true });

  const zipPath = path.join(extractDir, 'clone.zip');
  await fs.writeFile(zipPath, zipBuffer);

  try {
    await extract(zipPath, { dir: extractDir });
  } finally {
    await fs.unlink(zipPath).catch(() => {});
  }

  const projectDir = path.join(extractDir, 'cloned-site');
  const stat = await fs.stat(projectDir).catch(() => null);
  const workDir = stat?.isDirectory() ? projectDir : extractDir;

  const repoName = `webecho-clone-${taskId.replace(/-/g, '').slice(0, 20)}`;
  const { fullName, cloneUrl } = await createRepository(repoName);

  await pushToGitHub(workDir, cloneUrl);

  const railResult = await deployToRailway(fullName, envVars);

  const siteId = uuidv4();
  const githubRepoUrl = `https://github.com/${fullName}`;

  const { isSupabaseConfigured, createAdminClient } = await import('@/lib/supabase/admin');
  if (isSupabaseConfigured()) {
    const supabase = createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('hosted_sites') as any).insert({
        id: siteId,
        user_id: userId,
        clone_task_id: taskId,
        github_repo_url: githubRepoUrl,
        github_repo_name: fullName,
        railway_project_id: railResult.projectId,
        railway_service_id: railResult.serviceId,
        railway_deployment_url: railResult.deploymentUrl ?? null,
        hosting_plan: hostingPlan,
        status: 'deploying',
        railway_budget_used: 0,
        stripe_subscription_id: stripeSubscriptionId ?? null,
      });
  }

  await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});

  return {
    siteId,
    status: 'deploying',
    githubRepoUrl,
    railwayProjectId: railResult.projectId,
    railwayServiceId: railResult.serviceId,
    deploymentUrl: railResult.deploymentUrl,
  };
}
