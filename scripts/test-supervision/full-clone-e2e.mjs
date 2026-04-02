#!/usr/bin/env node
/**
 * 完整克隆 E2E 测试 — 容器内创建用户、后台充值、执行克隆、监督
 *
 * 流程：
 * 1. 使用 Supabase Admin 创建测试用户
 * 2. 后台为该用户充值额度
 * 3. Playwright 登录 → 新建克隆 → 检测复杂度 → 开始克隆
 * 4. 轮询任务状态直至完成
 * 5. 监督结果页、下载链接、API 健康
 *
 * 环境变量：
 *   BASE_URL              应用地址，默认 http://localhost:4000
 *   SUPABASE_URL          即 NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   E2E_TEST_EMAIL        测试用户邮箱
 *   E2E_TEST_PASSWORD     测试用户密码
 *   E2E_TEST_CREDITS      充值额度，默认 20
 *   E2E_CLONE_URL         克隆目标 URL，默认 https://example.com
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnvLocal() {
  const path = join(__dirname, '../../.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*["']?([^"'\s#]*)["']?/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal();

import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:4000';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || `e2e-${Date.now()}@webecho-test.local`;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2eTestPass123!';
const TEST_CREDITS = parseInt(process.env.E2E_TEST_CREDITS || '20', 10);
const CLONE_URL = process.env.E2E_CLONE_URL || 'https://example.com';

const report = { passed: [], failed: [], warnings: [], startTime: null, endTime: null };

function log(level, msg, detail = null) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${msg}`, detail ? `\n  ${JSON.stringify(detail)}` : '');
}

function passed(name, detail) {
  report.passed.push({ name, detail });
  log('PASS', `✓ ${name}`, detail);
}

function failed(name, reason, detail = null) {
  report.failed.push({ name, reason, detail });
  log('FAIL', `✗ ${name}: ${reason}`, detail);
}

function warn(name, reason, detail = null) {
  report.warnings.push({ name, reason, detail });
  log('WARN', `⚠ ${name}: ${reason}`, detail);
}

async function createTestUserAndCredits() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    failed('环境配置', '缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (userError) {
    if (userError.message?.includes('already been registered') || userError.message?.includes('already registered')) {
      log('INFO', '测试用户已存在，尝试更新额度');
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', TEST_EMAIL).single();
      if (profile?.id) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ credits: TEST_CREDITS, updated_at: new Date().toISOString() })
          .eq('id', profile.id);
        if (updateErr) {
          failed('更新额度', updateErr.message);
          return null;
        }
        passed('复用用户并充值', { userId: profile.id, credits: TEST_CREDITS });
        return { email: TEST_EMAIL, password: TEST_PASSWORD };
      }
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
      const existingUser = list?.users?.find((u) => u.email === TEST_EMAIL);
      if (existingUser) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ credits: TEST_CREDITS, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id);
        if (!updateErr) {
          passed('复用用户并充值', { userId: existingUser.id, credits: TEST_CREDITS });
          return { email: TEST_EMAIL, password: TEST_PASSWORD };
        }
      }
    }
    failed('创建用户', userError.message);
    return null;
  }

  const userId = userData?.user?.id;
  if (!userId) {
    failed('创建用户', '未返回 userId');
    return null;
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ credits: TEST_CREDITS, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileErr) {
    failed('充值额度', profileErr.message);
    return null;
  }

  passed('创建用户并充值', { userId, credits: TEST_CREDITS });
  return { email: TEST_EMAIL, password: TEST_PASSWORD };
}

async function runFullCloneE2E() {
  report.startTime = new Date();
  log('INFO', `E2E 开始: ${BASE_URL}, 用户 ${TEST_EMAIL}, 目标 ${CLONE_URL}`);

  const creds = await createTestUserAndCredits();
  if (!creds) {
    report.endTime = new Date();
    return report;
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  const context = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  const consoleErrors = [];

  context.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ========== 1. 登录
    log('INFO', '访问登录页...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });

    await page.fill('input[type="email"]', creds.email);
    await page.fill('input[type="password"]', creds.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.includes('/dashboard') || u.pathname.includes('/login'), { timeout: 10000 });

    const loginUrl = page.url();
    if (!loginUrl.includes('/dashboard')) {
      const errText = await page.locator('[class*="red"], [class*="error"]').first().textContent().catch(() => '');
      failed('登录', `未跳转到 dashboard: ${loginUrl}`, { errText });
      report.endTime = new Date();
      return report;
    }
    passed('登录成功', {});

    // ========== 2. 新建克隆
    log('INFO', '访问 clone/new...');
    await page.goto(`${BASE_URL}/clone/new`, { waitUntil: 'networkidle', timeout: 15000 });

    const urlInput = page.locator('input[placeholder*="URL"], input[placeholder*="example"]').first();
    await urlInput.fill(CLONE_URL.replace(/^https?:\/\//, ''));

    const detectBtn = page.locator('button:has-text("检测"), button:has-text("Detect")').first();
    await detectBtn.click();
    await page.waitForTimeout(5000);

    const confirmBtn = page.locator('button:has-text("开始克隆"), button:has-text("确认并开始"), button:has-text("Start")').first();
    await confirmBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
    if ((await confirmBtn.count()) === 0) {
      failed('克隆流程', '未找到「开始克隆」按钮，可能额度不足或复杂度未检测到');
      report.endTime = new Date();
      return report;
    }

    const isDisabled = await confirmBtn.getAttribute('disabled');
    if (isDisabled) {
      warn('开始克隆', '按钮被禁用，可能额度不足或 canProceed 为 false');
    }

    await confirmBtn.click();
    await page.waitForURL((u) => u.pathname.match(/\/clone\/[a-f0-9-]+$/), { timeout: 15000 });

    const taskIdMatch = page.url().match(/\/clone\/([a-f0-9-]+)/);
    const taskId = taskIdMatch?.[1];
    if (!taskId) {
      failed('克隆流程', '未跳转到任务详情页');
      report.endTime = new Date();
      return report;
    }
    passed('创建克隆任务', { taskId });

    // ========== 3. 轮询直至完成（使用页面同源 fetch 携带 Cookie）
    log('INFO', '轮询任务状态...');
    const maxWait = 300000;
    const startPoll = Date.now();
    let status = '';
    let lastStep = '';

    while (Date.now() - startPoll < maxWait) {
      const data = await page.evaluate(
        async (id, base) => {
          const r = await fetch(`${base}/api/clone/${id}/status`, { credentials: 'include' });
          return r.json();
        },
        taskId,
        BASE_URL
      );
      status = data?.status || '';
      lastStep = data?.currentStep || '';

      if (status === 'done') {
        passed('克隆完成', { taskId });
        break;
      }
      if (status === 'failed') {
        failed('克隆失败', data?.currentStep || data?.error || '任务失败', data);
        report.endTime = new Date();
        return report;
      }

      await page.waitForTimeout(3000);
    }

    if (status !== 'done') {
      failed('克隆超时', `等待 ${maxWait / 1000}s 未完成`, { status, lastStep });
      report.endTime = new Date();
      return report;
    }

    // ========== 4. 监督结果页
    log('INFO', '访问结果页...');
    await page.goto(`${BASE_URL}/clone/${taskId}/result`, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const downloadLink = page.locator('a[href*="download"], a:has-text("下载"), a:has-text("Download")').first();
    if ((await downloadLink.count()) > 0) {
      const href = await downloadLink.getAttribute('href');
      passed('结果页下载链接', { href: href?.slice(0, 80) });
    } else {
      warn('结果页', '未找到下载链接（可能走托管流程）');
    }

    // ========== 5. API 监督
    const pricingRes = await page.request.get(`${BASE_URL}/api/pricing`);
    const pricingBody = await pricingRes.json();
    if (pricingRes.ok() && pricingBody?.cloneRanges) {
      passed('API /api/pricing', {});
    } else {
      warn('API /api/pricing', `status=${pricingRes.status()}`);
    }

    if (consoleErrors.length > 0) {
      warn('控制台错误', `${consoleErrors.length} 个`, consoleErrors.slice(0, 3));
    }
  } catch (err) {
    failed('E2E 执行', err.message, { stack: err.stack?.split('\n').slice(0, 3) });
  } finally {
    await browser.close();
  }

  report.endTime = new Date();
  return report;
}

runFullCloneE2E()
  .then((r) => {
    const durationMs = (r.endTime || new Date()) - (r.startTime || new Date());
    console.log('\n========== E2E 监督报告 ==========');
    console.log(`通过: ${r.passed.length} | 失败: ${r.failed.length} | 警告: ${r.warnings.length}`);
    console.log(`耗时: ${(durationMs / 1000).toFixed(1)}s`);
    if (r.failed.length > 0) {
      console.log('\n失败项:');
      r.failed.forEach((f) => console.log(`  - ${f.name}: ${f.reason}`));
      process.exit(1);
    }
    if (r.warnings.length > 0) {
      console.log('\n警告项:');
      r.warnings.forEach((w) => console.log(`  - ${w.name}: ${w.reason}`));
    }
    console.log('\n完整克隆 E2E 通过，监督完成。');
    process.exit(0);
  })
  .catch((err) => {
    console.error('E2E 异常:', err);
    process.exit(1);
  });
