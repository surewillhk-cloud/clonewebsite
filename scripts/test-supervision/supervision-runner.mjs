#!/usr/bin/env node
/**
 * 测试监督脚本 - 伪装用户容器入口
 * 模拟真实用户行为，监督页面与 API 是否有错误或不合理之处
 *
 * 用法:
 *   node scripts/test-supervision/supervision-runner.mjs [BASE_URL]
 *   BASE_URL 默认 http://localhost:4000
 *
 * 环境:
 *   SUPERVISION_API_ONLY=1 仅测试 API（无需浏览器）
 *   npx playwright install   安装浏览器后可做完整 E2E
 */

const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:4000';
const API_ONLY = process.env.SUPERVISION_API_ONLY === '1';

const report = {
  passed: [],
  failed: [],
  warnings: [],
  startTime: null,
  endTime: null,
};

function log(level, msg, detail = null) {
  const ts = new Date().toISOString();
  const line = detail ? `${msg}\n  ${JSON.stringify(detail)}` : msg;
  console.log(`[${ts}] [${level}] ${line}`);
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

/** 检查 API 响应是否合理 */
function validateApiResponse(name, res, body, checks = {}) {
  if (!res.ok) {
    failed(name, `HTTP ${res.status}`, { status: res.status, body });
    return false;
  }
  if (checks.requiredKeys && Array.isArray(checks.requiredKeys)) {
    for (const key of checks.requiredKeys) {
      if (!(key in body)) {
        failed(name, `Missing required key: ${key}`, body);
        return false;
      }
    }
  }
  if (checks.noError && body.error) {
    failed(name, `API returned error: ${body.error}`, body);
    return false;
  }
  return true;
}

async function runApiOnlyTests() {
  const base = BASE_URL;
  const fetchFn = globalThis.fetch;
  const fetchWithTimeout = (url, opts = {}, ms = 10000) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return fetchFn(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
  };

  const res1 = await fetchWithTimeout(`${base}/api/pricing`).catch((e) => {
    failed('连接服务', e.name === 'AbortError' ? '超时' : e.message);
    return null;
  });
  if (!res1) {
    report.endTime = new Date();
    return report;
  }
  const body1 = await res1.json();
  if (res1.ok && body1.cloneRanges && body1.hostingPlans) {
    passed('/api/pricing API', {});
  } else {
    failed('/api/pricing', res1.status === 200 ? 'Missing keys' : `HTTP ${res1.status}`, body1);
  }

  const res2 = await fetchWithTimeout(`${base}/api/clone/detect-complexity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' }),
  });
  const body2 = await res2.json();
  if (res2.ok && body2.complexity && body2.creditsRequired != null) {
    passed('detect-complexity API', {});
  } else if (res2.status === 400 && body2.error) {
    warn('detect-complexity', body2.error, body2);
  } else {
    failed('detect-complexity', `HTTP ${res2.status}`, body2);
  }

  const res3 = await fetchWithTimeout(`${base}/api/clone/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com', complexity: 'static_single' }),
  });
  const body3 = await res3.json();
  if (res3.status === 401 || (res3.status === 400 && body3.error)) {
    passed('clone/create 鉴权', '正确拒绝未登录');
  } else if (res3.status === 200 && body3.taskId) {
    passed('clone/create', '创建成功');
  } else {
    warn('clone/create', `status=${res3.status}`, body3);
  }
  report.endTime = new Date();
}

async function runSupervision() {
  report.startTime = new Date();
  log('INFO', `Starting supervision against ${BASE_URL}${API_ONLY ? ' (API-only)' : ''}`);

  if (API_ONLY) {
    await runApiOnlyTests();
    if (!report.endTime) report.endTime = new Date();
    return report;
  }

  let chromium;
  try {
    const mod = await import('playwright');
    chromium = mod.chromium;
  } catch (e) {
    log('WARN', 'Playwright not available, falling back to API-only. Run: npx playwright install');
    await runApiOnlyTests();
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

  const consoleErrors = [];
  const failedRequests = [];

  context.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      consoleErrors.push({ type, text });
    }
  });

  context.on('requestfailed', (req) => {
    const url = req.url();
    const failure = req.failure();
    if (failure && !url.includes('favicon')) {
      failedRequests.push({ url, reason: failure.errorText });
    }
  });

  const page = await context.newPage();

  try {
    // ========== 1. 首页 /
    log('INFO', 'Visiting homepage...');
    const homeRes = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!homeRes || homeRes.status() >= 400) {
      failed('首页加载', `HTTP ${homeRes?.status() ?? 'unknown'}`);
    } else {
      passed('首页加载', { status: homeRes.status() });
    }

    // 检查首页关键元素
    const hero = await page.locator('h1').first();
    if (await hero.isVisible()) {
      passed('首页 Hero 标题渲染');
    } else {
      failed('首页 Hero 标题渲染', 'h1 元素不可见');
    }

    const startCloneLink = page.locator('a[href="/clone/new"], a[href^="/clone/new?"]');
    if ((await startCloneLink.count()) > 0) {
      passed('首页「开始克隆」链接存在');
    } else {
      failed('首页「开始克隆」链接', '未找到 /clone/new 链接');
    }

    // ========== 2. 定价页 /pricing
    log('INFO', 'Visiting pricing page...');
    const pricingRes = await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!pricingRes || pricingRes.status() >= 400) {
      failed('定价页加载', `HTTP ${pricingRes?.status() ?? 'unknown'}`);
    } else {
      passed('定价页加载', { status: pricingRes?.status() });
    }

    // ========== 3. API: /api/pricing
    log('INFO', 'Checking /api/pricing...');
    const pricingApiRes = await page.request.get(`${BASE_URL}/api/pricing`);
    const pricingBody = await pricingApiRes.json();
    if (validateApiResponse('/api/pricing', pricingApiRes, pricingBody, {
      noError: true,
      requiredKeys: ['cloneRanges', 'hostingPlans'],
    })) {
      passed('/api/pricing API', {
        hasCloneRanges: !!pricingBody.cloneRanges,
        hasHostingPlans: !!pricingBody.hostingPlans,
      });
    }

    // ========== 4. 新建克隆页 /clone/new
    log('INFO', 'Visiting clone/new page...');
    const cloneNewRes = await page.goto(`${BASE_URL}/clone/new`, { waitUntil: 'networkidle', timeout: 15000 });
    if (!cloneNewRes || cloneNewRes.status() >= 400) {
      failed('clone/new 加载', `HTTP ${cloneNewRes?.status() ?? 'unknown'}`);
    } else {
      passed('clone/new 加载', { status: cloneNewRes?.status() });
    }

    // clone/new 可能重定向到登录，检查是否在 clone/new 或已登录
    const currentUrl = page.url();
    const isOnCloneNew = currentUrl.includes('/clone/new');
    const isOnLogin = currentUrl.includes('/login');
    if (isOnCloneNew) {
      passed('clone/new 访问', '页面正常显示（或需登录）');
    } else if (isOnLogin) {
      warn('clone/new 访问', '重定向到登录页（需登录用户）', { redirected: true });
    } else {
      failed('clone/new 访问', `意外重定向: ${currentUrl}`);
    }

    // ========== 5. API: detect-complexity (无登录，公开 URL)
    log('INFO', 'Checking detect-complexity API...');
    const detectRes = await page.request.post(`${BASE_URL}/api/clone/detect-complexity`, {
      data: { url: 'https://example.com' },
      headers: { 'Content-Type': 'application/json' },
    });
    const detectBody = await detectRes.json();

    if (detectRes.status() === 400 && detectBody.error) {
      // 某些 URL 可能被拒绝（SSRF 保护），example.com 应该可接受
      if (detectBody.error.includes('Invalid') || detectBody.error.includes('url')) {
        warn('detect-complexity', `URL 被拒绝: ${detectBody.error}`, detectBody);
      } else {
        failed('detect-complexity', detectBody.error, detectBody);
      }
    } else if (validateApiResponse('detect-complexity', detectRes, detectBody, {
      noError: true,
      requiredKeys: ['complexity', 'creditsRequired'],
    })) {
      passed('detect-complexity API', {
        complexity: detectBody.complexity,
        creditsRequired: detectBody.creditsRequired,
      });
    }

    // ========== 6. API: clone/create 无登录应返回 401 或合理错误
    log('INFO', 'Checking clone/create without auth...');
    const createRes = await page.request.post(`${BASE_URL}/api/clone/create`, {
      data: {
        url: 'https://example.com',
        complexity: 'static_single',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    const createBody = await createRes.json();

    // 未登录可能 401 或 400（如缺少 auth）
    if (createRes.status() === 401) {
      passed('clone/create 鉴权', '正确拒绝未登录请求');
    } else if (createRes.status() === 400 && createBody.error) {
      passed('clone/create 鉴权', '返回 400 校验错误（可能需登录）');
    } else if (createRes.status() === 200 && createBody.taskId) {
      passed('clone/create', '创建成功（可能有匿名模式）');
    } else {
      warn('clone/create', `未预期响应: ${createRes.status()}`, createBody);
    }

    // ========== 7. 登录页
    log('INFO', 'Visiting login page...');
    const loginRes = await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!loginRes || loginRes.status() >= 400) {
      failed('登录页加载', `HTTP ${loginRes?.status() ?? 'unknown'}`);
    } else {
      passed('登录页加载', { status: loginRes?.status() });
    }

    const loginForm = page.locator('form, input[type="email"], input[name="email"]');
    if ((await loginForm.count()) > 0) {
      passed('登录页表单存在');
    } else {
      warn('登录页表单', '未找到表单元素');
    }

    // ========== 8. 控制台 /dashboard (未登录应重定向)
    log('INFO', 'Visiting dashboard (unauthenticated)...');
    const dashRes = await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const dashUrl = page.url();
    if (dashUrl.includes('/login') || dashRes?.status() === 302) {
      passed('Dashboard 鉴权', '未登录正确重定向');
    } else if (dashUrl.includes('/dashboard')) {
      warn('Dashboard 鉴权', '未登录可访问 dashboard');
    }

    // ========== 检查收集到的问题
    if (consoleErrors.length > 0) {
      const unique = [...new Set(consoleErrors.map((e) => e.text))];
      if (unique.some((t) => t.includes('Hydration') || t.includes('hydration'))) {
        warn('控制台错误', `${consoleErrors.length} 个错误，含 Hydration`, unique.slice(0, 5));
      } else {
        failed('控制台错误', `${consoleErrors.length} 个 error`, unique.slice(0, 5));
      }
    } else {
      passed('无控制台 error');
    }

    if (failedRequests.length > 0) {
      warn('请求失败', `${failedRequests.length} 个请求失败`, failedRequests.slice(0, 3));
    }
  } catch (err) {
    failed('监督执行', err.message, { stack: err.stack?.split('\n').slice(0, 3) });
  } finally {
    await browser.close();
  }

  report.endTime = new Date();
  return report;
}

runSupervision()
  .then((r) => {
    const durationMs = (r.endTime || new Date()) - (r.startTime || new Date());
    const duration = (durationMs / 1000).toFixed(1);
    console.log('\n========== 监督报告 ==========');
    console.log(`通过: ${r.passed.length} | 失败: ${r.failed.length} | 警告: ${r.warnings.length}`);
    console.log(`耗时: ${duration}s`);
    if (r.failed.length > 0) {
      console.log('\n失败项:');
      r.failed.forEach((f) => console.log(`  - ${f.name}: ${f.reason}`));
      process.exit(1);
    }
    if (r.warnings.length > 0) {
      console.log('\n警告项:');
      r.warnings.forEach((w) => console.log(`  - ${w.name}: ${w.reason}`));
    }
    console.log('\n监督完成，无严重错误。');
    process.exit(0);
  })
  .catch((err) => {
    console.error('监督脚本异常:', err);
    process.exit(1);
  });
