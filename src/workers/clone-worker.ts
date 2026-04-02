/**
 * 克隆任务主流程
 * 从第一天起按 cloneType 分支设计，为 APP 克隆预留扩展点
 * 含自动修复循环：构建失败时最多重试 3 次，Claude 修复后重新测试
 */

import type { CloneTask } from '@/types/clone';
import { setTaskStatus } from '@/lib/task-store';
import { scrape } from '@/lib/scraper';
import { analyzePageStructure } from '@/lib/analyzer';
import {
  buildNextJsProject,
  updateZipFromProject,
  fixCodeFromBuildError,
} from '@/lib/generator';
import { analyzeAppScreenshots, analyzeApk, captureTrafficFromApk } from '@/lib/app-scraper';
import { buildExpoProject } from '@/lib/app-generator';
import { refundCreditsOnFailure } from '@/lib/billing/refund';
import { isR2Configured, uploadZipToR2 } from '@/lib/storage/r2';
import { isDockerAvailable, runDockerBuild } from '@/lib/tester';
import {
  sendTaskComplete,
  sendTaskFailed,
  isEmailConfigured,
} from '@/lib/email/send';
import { notifyAdminOnCloneFailure } from '@/lib/monitoring/alert-on-failure';
import { checkFailureRateAndMaybeEnableMaintenance } from '@/lib/monitoring/failure-rate';
import { getUserEmail } from '@/lib/email/get-user-email';
import { recordTaskCost } from '@/lib/billing/cost-tracker';
import { validateScrapeUrl } from '@/lib/url-validate';

const MAX_AUTO_FIX_RETRIES = 3;

export async function processCloneTask(task: CloneTask): Promise<void> {
  switch (task.cloneType) {
    case 'web':
      return await processWebClone(task);
    case 'app':
      return await processAppClone(task);
    default:
      throw new Error(`Unknown clone type: ${task.cloneType}`);
  }
}

async function processWebClone(task: CloneTask): Promise<void> {
  const { targetUrl, id } = task;
  if (!targetUrl) {
    throw new Error('Web clone requires targetUrl');
  }
  // 防御性校验：防止 SSRF（任务来自 Stripe 等外部时）
  if (targetUrl.startsWith('http')) {
    const urlCheck = validateScrapeUrl(targetUrl);
    if (!urlCheck.ok) {
      throw new Error(urlCheck.error ?? 'Invalid target URL');
    }
  }

  try {
    await setTaskStatus(id, { status: 'scraping', progress: 10, currentStep: '正在抓取页面...' });
    const scrapeResult = await scrape({
      url: targetUrl,
      screenshot: true,
      fullPage: true,
      ...(task.auth?.mode === 'cookie' && task.auth.cookieString
        ? { cookieString: task.auth.cookieString }
        : {}),
    });

    await setTaskStatus(id, { status: 'analyzing', progress: 30, currentStep: 'AI 分析结构中...' });
    const analysisResult = await analyzePageStructure(scrapeResult);

    await setTaskStatus(id, { status: 'generating', progress: 50, currentStep: '生成 Next.js 代码...' });
    const { projectPath, zipPath } = await buildNextJsProject(
      scrapeResult,
      analysisResult,
      id,
      task.targetLanguage
    );

    let qualityScore = 85;
    let zipPathToUpload = zipPath;
    const dockerOk = await isDockerAvailable();

    if (dockerOk) {
      let passed = false;
      let attempt = 0;
      let lastError = '';

      while (attempt < MAX_AUTO_FIX_RETRIES) {
        await setTaskStatus(id, {
          status: 'testing',
          progress: 80 + Math.floor((attempt / MAX_AUTO_FIX_RETRIES) * 15),
          currentStep:
            attempt === 0
              ? '自动化测试中...'
              : `自动修复第 ${attempt} 次，重新测试中...`,
        });

        const testResult = await runDockerBuild(projectPath, id);
        lastError = testResult.error || testResult.output || '';

        if (testResult.passed) {
          passed = true;
          break;
        }

        if (attempt >= MAX_AUTO_FIX_RETRIES) break;

        await setTaskStatus(id, {
          progress: 80,
          currentStep: `构建失败，AI 自动修复中（${attempt + 1}/${MAX_AUTO_FIX_RETRIES}）...`,
        });

        const fixResult = await fixCodeFromBuildError(projectPath, lastError);
        if (!fixResult.fixed || fixResult.filesModified.length === 0) {
          console.warn('[clone-worker] Fix failed or no files modified:', id);
          break;
        }
        await updateZipFromProject(projectPath, zipPath);
        attempt++;
      }

      if (!passed) {
        qualityScore = Math.max(30, 85 - attempt * 15);
        console.warn('[clone-worker] All auto-fix attempts exhausted:', id, lastError?.slice(0, 300));
        refundCreditsOnFailure(
          task.userId,
          task.creditsUsed,
          id,
          task.stripePaymentIntentId
        ).catch(() => {});
        const failReason = '自动修复均已失败，额度已退回';
        notifyAdminOnCloneFailure({
          taskId: id,
          userId: task.userId,
          targetUrl,
          cloneType: 'web',
          reason: failReason,
        });
        if (isEmailConfigured()) {
          getUserEmail(task.userId).then((email) => {
            if (email) {
              sendTaskFailed(email, {
                taskId: id,
                targetUrl: targetUrl,
                reason: failReason,
              }).catch(() => {});
            }
          });
        }
        await setTaskStatus(id, {
          status: 'failed',
          currentStep: '自动修复均已失败，额度已退回（如有配置）',
        });
        checkFailureRateAndMaybeEnableMaintenance().catch(() => {});
        return;
      }
    }

    if (isR2Configured()) {
      await setTaskStatus(id, { progress: 95, currentStep: '上传代码包到 R2...' });
      const r2Key = await uploadZipToR2(zipPathToUpload, id);
      await setTaskStatus(id, {
        status: 'done',
        progress: 100,
        currentStep: '克隆完成',
        qualityScore,
        r2Key,
        localZipPath: null,
      });
      recordTaskCost({
        taskId: id,
        complexity: task.complexity,
        creditsUsed: task.creditsUsed,
        scraperLayer: scrapeResult.scraperLayer,
      }).catch(() => {});
      if (isEmailConfigured()) {
        getUserEmail(task.userId).then((email) => {
          if (email) {
            sendTaskComplete(email, {
              taskId: id,
              targetUrl: targetUrl,
              // downloadUrl 由前端从 /api/clone/[id]/download 获取，邮件中仅提供结果页链接
            }).catch(() => {});
          }
        });
      }
    } else {
      await setTaskStatus(id, {
        status: 'done',
        progress: 100,
        currentStep: '克隆完成',
        qualityScore,
        r2Key: null,
        localZipPath: zipPathToUpload,
      });
      recordTaskCost({
        taskId: id,
        complexity: task.complexity,
        creditsUsed: task.creditsUsed,
        scraperLayer: scrapeResult.scraperLayer,
      }).catch(() => {});
      if (isEmailConfigured()) {
        getUserEmail(task.userId).then((email) => {
          if (email) {
            sendTaskComplete(email, { taskId: id, targetUrl: targetUrl }).catch(() => {});
          }
        });
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '任务失败';
    notifyAdminOnCloneFailure({
      taskId: id,
      userId: task.userId,
      targetUrl,
      cloneType: 'web',
      reason: errMsg,
    });
    await setTaskStatus(id, {
      status: 'failed',
      currentStep: errMsg,
    });
    checkFailureRateAndMaybeEnableMaintenance().catch(() => {});
    refundCreditsOnFailure(
      task.userId,
      task.creditsUsed,
      id,
      task.stripePaymentIntentId
    ).catch((e) => console.error('[clone-worker] Refund failed:', e));
    if (isEmailConfigured()) {
      getUserEmail(task.userId).then((email) => {
        if (email) {
          sendTaskFailed(email, {
            taskId: id,
            targetUrl: targetUrl,
            reason: errMsg,
          }).catch(() => {});
        }
      });
    }
    throw err;
  }
}

async function processAppClone(task: CloneTask): Promise<void> {
  const { id, appScreenshots, appR2Key, appAnalyzeMode, userId, creditsUsed } = task;
  const mode = appAnalyzeMode ?? 'screenshot';

  if (mode === 'screenshot') {
    if (!appScreenshots?.length) {
      throw new Error('APP clone (screenshot mode) requires appScreenshots array');
    }
  } else if (mode === 'apk') {
    if (!appR2Key) {
      throw new Error('APP clone (apk mode) requires appR2Key');
    }
  } else if (mode === 'traffic') {
    if (!appR2Key) {
      throw new Error('APP clone (traffic mode) requires appR2Key');
    }
  }

  let analysis;
  try {
    if (mode === 'screenshot') {
      await setTaskStatus(id, { status: 'analyzing', progress: 20, currentStep: 'AI 分析截图中...' });
      analysis = await analyzeAppScreenshots(appScreenshots!);
    } else if (mode === 'apk') {
      await setTaskStatus(id, { status: 'analyzing', progress: 20, currentStep: '反编译 APK 并分析布局...' });
      analysis = await analyzeApk(appR2Key!);
    } else if (mode === 'traffic') {
      await setTaskStatus(id, { status: 'analyzing', progress: 10, currentStep: '反编译 APK 分析布局...' });
      const apkAnalysis = await analyzeApk(appR2Key!);
      await setTaskStatus(id, { status: 'scraping', progress: 30, currentStep: '模拟器抓取 API 流量...' });
      const { endpoints } = await captureTrafficFromApk(appR2Key!, id);
      analysis = { ...apkAnalysis, apiEndpoints: endpoints };
    } else {
      throw new Error(`Unsupported app analyze mode: ${mode}`);
    }

    await setTaskStatus(id, { status: 'generating', progress: 50, currentStep: '生成 Expo 代码...' });
    const { zipPath } = await buildExpoProject(analysis, id);

    if (isR2Configured()) {
      await setTaskStatus(id, { progress: 90, currentStep: '上传代码包到 R2...' });
      const r2Key = await uploadZipToR2(zipPath, id);
      await setTaskStatus(id, {
        status: 'done',
        progress: 100,
        currentStep: '克隆完成',
        qualityScore: 85,
        r2Key,
        localZipPath: null,
      });
      recordTaskCost({
        taskId: id,
        complexity: 'static_single',
        creditsUsed,
        scraperLayer: undefined,
      }).catch(() => {});
      if (isEmailConfigured()) {
        getUserEmail(userId).then((email) => {
          if (email) {
            sendTaskComplete(email, {
              taskId: id,
              targetUrl: 'APP Screenshots',
            }).catch(() => {});
          }
        });
      }
    } else {
      await setTaskStatus(id, {
        status: 'done',
        progress: 100,
        currentStep: '克隆完成',
        qualityScore: 85,
        r2Key: null,
        localZipPath: zipPath,
      });
      recordTaskCost({
        taskId: id,
        complexity: 'static_single',
        creditsUsed,
        scraperLayer: undefined,
      }).catch(() => {});
      if (isEmailConfigured()) {
        getUserEmail(userId).then((email) => {
          if (email) {
            sendTaskComplete(email, { taskId: id, targetUrl: 'APP Screenshots' }).catch(() => {});
          }
        });
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '任务失败';
    notifyAdminOnCloneFailure({
      taskId: id,
      userId,
      cloneType: 'app',
      reason: errMsg,
    });
    await setTaskStatus(id, { status: 'failed', currentStep: errMsg });
    checkFailureRateAndMaybeEnableMaintenance().catch(() => {});
    if (isEmailConfigured()) {
      getUserEmail(userId).then((email) => {
        if (email) {
          sendTaskFailed(email, {
            taskId: id,
            targetUrl: 'APP Screenshots',
            reason: errMsg,
          }).catch(() => {});
        }
      });
    }
    refundCreditsOnFailure(userId, creditsUsed, id, task.stripePaymentIntentId).catch(() => {});
    throw err;
  }
}
