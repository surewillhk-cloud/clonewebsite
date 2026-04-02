#!/usr/bin/env node
/**
 * 平台管理后台监督脚本 — 管理员用户容器
 *
 * 功能：
 * 1. 确保管理员账号存在（可选自动创建）
 * 2. 登录平台管理后台
 * 3. 测试所有 platform-admin API 的完整性与逻辑
 * 4. 测试所有平台管理页面的可访问性
 * 5. 发现问题并生成报告
 *
 * 用法:
 *   node scripts/test-supervision/admin-supervision-runner.mjs [BASE_URL]
 *   BASE_URL 默认 http://localhost:4000
 *
 * 环境变量:
 *   BASE_URL                    应用地址
 *   ADMIN_EMAIL                 管理员邮箱（创建/登录用）
 *   ADMIN_PASSWORD              管理员密码
 *   ADMIN_AUTO_SEED             设为 1 时在测试前自动创建管理员（需 DATABASE_URL）
 *   ADMIN_SUPERVISION_API_ONLY  设为 1 时仅测 API（不测页面）
 *   ADMIN_USE_FETCH             设为 1 时强制使用 fetch 模式（无需 Playwright，适用 CI/沙箱）
 */

import { spawn } from 'child_process';
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

const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin-supervision@webecho-test.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminSupervision123!';
const AUTO_SEED = process.env.ADMIN_AUTO_SEED === '1';
const API_ONLY = process.env.ADMIN_SUPERVISION_API_ONLY === '1';

const report = { passed: [], failed: [], warnings: [], startTime: null, endTime: null, issues: [] };

function log(level, msg, detail = null) {
  const ts = new Date().toISOString();
  const line = detail != null ? `${msg}\n  ${JSON.stringify(detail)}` : msg;
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

function issue(description, fix = null) {
  report.issues.push({ description, fix });
  log('ISSUE', `🔍 ${description}`, fix ? { suggestedFix: fix } : null);
}

/** 从 URL 解析 protocol 和 host */
function parseUrl(url) {
  const u = new URL(url);
  return { protocol: u.protocol, host: u.host, pathname: u.pathname, search: u.search, origin: u.origin };
}

/** fetch 模式：通过 http 获取 Set-Cookie，再用 fetch 测试 API */
async function runAdminSupervisionFetch() {
  const { protocol, host, origin } = parseUrl(BASE_URL);
  const isHttps = protocol === 'https:';
  const httpMod = await import(isHttps ? 'https' : 'http');

  const fetchWithCookie = async (url, opts = {}) => {
    const headers = { ...opts.headers, Cookie: cookieHeader };
    return fetch(url, { ...opts, headers });
  };

  let cookieHeader = '';

  try {
    // 1. 登录并提取 Set-Cookie（使用 http 模块以读取原始响应头）
    const loginBody = JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const loginUrl = new URL(`${origin}/api/platform-admin/login`);
    const loginOpts = {
      hostname: loginUrl.hostname,
      port: loginUrl.port || (isHttps ? 443 : 80),
      path: loginUrl.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
    };

    const REQ_TIMEOUT = 15000;
    const loginRes = await new Promise((resolve, reject) => {
      const req = httpMod.request(loginOpts, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          const setCookies = res.rawHeaders
            ? (() => {
                const arr = [];
                for (let i = 0; i < res.rawHeaders.length; i += 2) {
                  if (res.rawHeaders[i].toLowerCase() === 'set-cookie') {
                    arr.push(res.rawHeaders[i + 1]);
                  }
                }
                return arr;
              })()
            : [];
          resolve({ status: res.statusCode, body, setCookies });
        });
      });
      req.on('error', reject);
      req.setTimeout(REQ_TIMEOUT, () => {
        req.destroy();
        reject(new Error('连接超时，请确保 npm run dev 已启动'));
      });
      req.write(loginBody);
      req.end();
    });

    const loginJson = JSON.parse(loginRes.body || '{}');
    if (loginRes.status !== 200) {
      if (loginRes.status === 503) failed('平台管理员登录', '服务未配置 SUPABASE_SERVICE_ROLE_KEY', loginJson);
      else if (loginRes.status === 401) failed('平台管理员登录', '账号或密码错误，请先运行: npm run seed:admin -- <email> <password>', loginJson);
      else failed('平台管理员登录', `HTTP ${loginRes.status}`, loginJson);
      report.endTime = new Date();
      return report;
    }
    if (loginJson.needsTotp) {
      warn('平台管理员登录', '已启用 TOTP，跳过后续测试', loginJson);
      report.endTime = new Date();
      return report;
    }
    if (loginJson.ok) passed('平台管理员登录', { email: loginJson.email });

    // 提取 Cookie 值：Set-Cookie: webecho_platform_admin=xxx; Path=/; ...
    cookieHeader = (loginRes.setCookies || [])
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');

    if (!cookieHeader) {
      failed('Session 传递', '登录响应未返回 Set-Cookie');
      report.endTime = new Date();
      return report;
    }
    passed('Session 传递', 'Cookie 已从登录响应提取');

    // 2. 测试所有 GET API
    const apis = [
      { name: 'GET /api/platform-admin/pricing', url: `${origin}/api/platform-admin/pricing`, checkKeys: ['clonePriceItems', 'hostingPlans'] },
      { name: 'GET /api/platform-admin/config', url: `${origin}/api/platform-admin/config`, checkKeys: ['maintenanceMode', 'maxConcurrentTasks'] },
      { name: 'GET /api/platform-admin/tasks', url: `${origin}/api/platform-admin/tasks?page=1&limit=5`, checkKeys: ['items', 'total', 'page'] },
      { name: 'GET /api/platform-admin/users', url: `${origin}/api/platform-admin/users?page=1&limit=5`, checkKeys: ['items', 'total', 'page'] },
      { name: 'GET /api/platform-admin/finance', url: `${origin}/api/platform-admin/finance?period=7`, checkKeys: ['summary', 'daily', 'period'] },
      { name: 'GET /api/platform-admin/signatures', url: `${origin}/api/platform-admin/signatures`, checkKeys: [] },
      { name: 'GET /api/platform-admin/pricing/history', url: `${origin}/api/platform-admin/pricing/history`, checkKeys: [] },
      { name: 'GET /api/platform-admin/health', url: `${origin}/api/platform-admin/health`, checkKeys: ['ok', 'results'] },
      { name: 'GET /api/platform-admin/stats/task-metrics', url: `${origin}/api/platform-admin/stats/task-metrics?days=7`, checkKeys: ['summary', 'daily'] },
      { name: 'GET /api/platform-admin/stats/slow-requests', url: `${origin}/api/platform-admin/stats/slow-requests?limit=10`, checkKeys: ['items'] },
    ];

    for (const api of apis) {
      try {
        const res = await fetchWithCookie(api.url);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          failed(api.name, `HTTP ${res.status}`, body?.error || body);
          continue;
        }
        for (const key of api.checkKeys) {
          if (key && !(key in body)) {
            failed(api.name, `缺少预期字段: ${key}`, body);
            break;
          }
        }
        if (res.ok && api.checkKeys.every((k) => !k || (k in body))) passed(api.name, { status: res.status });
      } catch (e) {
        failed(api.name, e.message);
      }
    }

    // 3. config PUT
    try {
      const configGet = await fetchWithCookie(`${origin}/api/platform-admin/config`);
      const configBody = await configGet.json();
      if (configGet.ok && configBody) {
        const orig = configBody.maintenanceMode;
        const putRes = await fetchWithCookie(`${origin}/api/platform-admin/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maintenanceMode: !orig }),
        });
        const putBody = await putRes.json();
        if (putRes.ok && putBody.maintenanceMode === !orig) {
          passed('PUT /api/platform-admin/config', '可正确更新');
          await fetchWithCookie(`${origin}/api/platform-admin/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maintenanceMode: orig }),
          });
        } else {
          failed('PUT /api/platform-admin/config', putRes.status, putBody);
        }
      }
    } catch (e) {
      failed('PUT /api/platform-admin/config', e.message);
    }

    // 4. signatures PUT
    try {
      const sigGet = await fetchWithCookie(`${origin}/api/platform-admin/signatures`);
      const sigBody = await sigGet.json();
      if (sigGet.ok && typeof sigBody === 'object') {
        const putRes = await fetchWithCookie(`${origin}/api/platform-admin/signatures`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sigBody),
        });
        putRes.ok ? passed('PUT /api/platform-admin/signatures', '可正确保存') : failed('PUT /api/platform-admin/signatures', putRes.status, await putRes.json().catch(() => ({})));
      }
    } catch (e) {
      failed('PUT /api/platform-admin/signatures', e.message);
    }

    // 5. credits（如有用户）
    try {
      const usersRes = await fetchWithCookie(`${origin}/api/platform-admin/users?page=1&limit=1`);
      const usersBody = await usersRes.json();
      if (usersRes.ok && usersBody.items?.length > 0) {
        const userId = usersBody.items[0].id;
        const delta0Res = await fetchWithCookie(`${origin}/api/platform-admin/users/${userId}/credits`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta: 0 }),
        });
        const delta0Body = await delta0Res.json();
        if (delta0Res.status === 400 && delta0Body.error?.includes('delta cannot be 0')) {
          passed('PUT credits delta=0 校验', '正确拒绝');
        }
        const addRes = await fetchWithCookie(`${origin}/api/platform-admin/users/${userId}/credits`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta: 1, reason: 'admin-supervision-test' }),
        });
        const addBody = await addRes.json();
        if (addRes.ok && addBody.newCredits != null) {
          passed('PUT credits +1', { newCredits: addBody.newCredits });
          await fetchWithCookie(`${origin}/api/platform-admin/users/${userId}/credits`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta: -1, reason: 'rollback' }),
          });
        }
      } else {
        warn('PUT credits', '无用户可测试，跳过');
      }
    } catch (e) {
      failed('PUT credits', e.message);
    }

    // 6. tasks/[taskId]
    try {
      const tasksRes = await fetchWithCookie(`${origin}/api/platform-admin/tasks?page=1&limit=1`);
      const tasksBody = await tasksRes.json();
      if (tasksRes.ok && tasksBody.items?.length > 0) {
        const detailRes = await fetchWithCookie(`${origin}/api/platform-admin/tasks/${tasksBody.items[0].id}`);
        const detailBody = await detailRes.json();
        if (detailRes.ok && (detailBody.task || detailBody.id)) passed('GET tasks/[taskId]', { taskId: tasksBody.items[0].id });
      } else {
        warn('GET tasks/[taskId]', '无任务可测试，跳过');
      }
    } catch (e) {
      failed('GET tasks/[taskId]', e.message);
    }

    // 7. finance CSV
    try {
      const csvRes = await fetchWithCookie(`${origin}/api/platform-admin/finance?period=7&format=csv`);
      if (csvRes.ok) {
        const ct = csvRes.headers.get('content-type') || '';
        ct.includes('csv') ? passed('finance CSV', '正确返回') : warn('finance CSV', `Content-Type: ${ct}`);
      }
    } catch (e) {
      failed('finance CSV', e.message);
    }

    // 8. 未鉴权应 401
    const anonRes = await fetch(`${origin}/api/platform-admin/pricing`);
    anonRes.status === 401 ? passed('未鉴权 API 拒绝', '返回 401') : failed('未鉴权 API 拒绝', `预期 401，实际 ${anonRes.status}`);

    // 9. logout
    const logoutRes = await fetchWithCookie(`${origin}/api/platform-admin/logout`, { method: 'POST' });
    if (logoutRes.ok || logoutRes.status === 204) passed('POST logout', '登出成功');
  } catch (err) {
    failed('fetch 监督执行', err.message, err.stack?.split('\n').slice(0, 3));
  }

  report.endTime = new Date();
  return report;
}

/** 运行 seed 创建管理员 */
async function ensureAdminExists() {
  if (!AUTO_SEED) {
    log('INFO', 'ADMIN_AUTO_SEED 未设置，跳过自动创建。请确保已运行: npm run seed:admin -- <email> <password>');
    return true;
  }
  return new Promise((resolve) => {
    const child = spawn('node', [
      join(__dirname, '../seed-platform-admin.mjs'),
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, EMAIL: ADMIN_EMAIL, PASSWORD: ADMIN_PASSWORD },
    });
    let out = '';
    let err = '';
    child.stdout?.on('data', (d) => { out += d.toString(); });
    child.stderr?.on('data', (d) => { err += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) {
        passed('管理员种子', '已创建/更新管理员账号');
        resolve(true);
      } else {
        warn('管理员种子', `退出码 ${code}，可能 DATABASE_URL 未配置`, { err: err.slice(0, 200) });
        resolve(false);
      }
    });
  });
}

/** 监督所有 platform-admin 功能 */
async function runAdminSupervision() {
  report.startTime = new Date();
  log('INFO', `平台管理后台监督启动，目标 ${BASE_URL}${API_ONLY ? ' (仅 API)' : ''}`);

  await ensureAdminExists();

  // 优先尝试 API-only 模式（fetch），避免 Playwright 在沙箱/CI 中崩溃
  const useApiOnly = API_ONLY || process.env.ADMIN_USE_FETCH === '1';
  if (useApiOnly) {
    log('INFO', '使用 fetch 模式（无需 Playwright）');
    return await runAdminSupervisionFetch();
  }

  let chromium;
  try {
    const mod = await import('playwright');
    chromium = mod.chromium;
  } catch (e) {
    log('WARN', 'Playwright 未安装或加载失败，回退到 fetch 模式', e.message);
    return await runAdminSupervisionFetch();
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (e1) {
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch (e2) {
      log('WARN', 'Playwright 启动失败，回退到 fetch 模式', e2.message);
      return await runAdminSupervisionFetch();
    }
  }

  const context = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    baseURL: BASE_URL,
  });

  const page = await context.newPage();

  try {
    // ========== 1. 平台管理员登录
    log('INFO', '执行平台管理员登录...');
    const loginRes = await page.request.post(`${BASE_URL}/api/platform-admin/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    });
    const loginBody = await loginRes.json();

    if (!loginRes.ok()) {
      if (loginRes.status() === 503) {
        failed('平台管理员登录', '服务未配置 SUPABASE_SERVICE_ROLE_KEY', loginBody);
      } else if (loginRes.status() === 401) {
        failed('平台管理员登录', '账号或密码错误，请先运行: npm run seed:admin -- ' + ADMIN_EMAIL + ' <password>', loginBody);
      } else {
        failed('平台管理员登录', `HTTP ${loginRes.status()}`, loginBody);
      }
      report.endTime = new Date();
      await browser.close();
      return report;
    }

    if (loginBody.needsTotp) {
      warn('平台管理员登录', '已启用 TOTP，跳过需 TOTP 的后续测试', loginBody);
      // 仍可测试部分公开 API（如健康检查需登录），但大部分需 TOTP 验证
      report.endTime = new Date();
      await browser.close();
      return report;
    }

    if (loginBody.ok) {
      passed('平台管理员登录', { email: loginBody.email });
    } else {
      failed('平台管理员登录', '响应异常', loginBody);
    }

    // 登录成功会设置 Cookie，后续请求自动携带
    // 通过访问一个需鉴权的 API 确认 session
    const pricingRes = await page.request.get(`${BASE_URL}/api/platform-admin/pricing`);
    if (pricingRes.status() === 401) {
      failed('Session 传递', 'Cookie 未正确设置，pricing API 返回 401');
    } else if (pricingRes.ok()) {
      passed('Session 传递', 'Cookie 已正确携带');
    }

    // ========== 2. 测试所有 platform-admin API
    const apis = [
      { name: 'GET /api/platform-admin/pricing', url: `${BASE_URL}/api/platform-admin/pricing`, method: 'GET', checkKeys: ['clonePriceItems', 'hostingPlans'] },
      { name: 'GET /api/platform-admin/config', url: `${BASE_URL}/api/platform-admin/config`, method: 'GET', checkKeys: ['maintenanceMode', 'maxConcurrentTasks'] },
      { name: 'GET /api/platform-admin/tasks', url: `${BASE_URL}/api/platform-admin/tasks?page=1&limit=5`, method: 'GET', checkKeys: ['items', 'total', 'page'] },
      { name: 'GET /api/platform-admin/users', url: `${BASE_URL}/api/platform-admin/users?page=1&limit=5`, method: 'GET', checkKeys: ['items', 'total', 'page'] },
      { name: 'GET /api/platform-admin/finance', url: `${BASE_URL}/api/platform-admin/finance?period=7`, method: 'GET', checkKeys: ['summary', 'daily', 'period'] },
      { name: 'GET /api/platform-admin/signatures', url: `${BASE_URL}/api/platform-admin/signatures`, method: 'GET', checkKeys: [] },
      { name: 'GET /api/platform-admin/pricing/history', url: `${BASE_URL}/api/platform-admin/pricing/history`, method: 'GET', checkKeys: [] },
      { name: 'GET /api/platform-admin/health', url: `${BASE_URL}/api/platform-admin/health`, method: 'GET', checkKeys: ['ok', 'results'] },
      { name: 'GET /api/platform-admin/stats/task-metrics', url: `${BASE_URL}/api/platform-admin/stats/task-metrics?days=7`, method: 'GET', checkKeys: ['summary', 'daily'] },
      { name: 'GET /api/platform-admin/stats/slow-requests', url: `${BASE_URL}/api/platform-admin/stats/slow-requests?limit=10`, method: 'GET', checkKeys: ['items'] },
    ];

    for (const api of apis) {
      try {
        const res = api.method === 'GET'
          ? await page.request.get(api.url)
          : await page.request.post(api.url, { headers: { 'Content-Type': 'application/json' } });
        const body = await res.json().catch(() => ({}));

        if (!res.ok()) {
          failed(api.name, `HTTP ${res.status()}`, body?.error || body);
          continue;
        }

        for (const key of api.checkKeys) {
          if (key && !(key in body)) {
            failed(api.name, `缺少预期字段: ${key}`, body);
            break;
          }
        }
        if (res.ok() && api.checkKeys.every((k) => !k || (k in body))) {
          passed(api.name, { status: res.status() });
        }
      } catch (e) {
        failed(api.name, e.message, { stack: e.stack?.split('\n').slice(0, 2) });
      }
    }

    // ========== 3. 测试 config PUT（读取-修改-恢复）
    try {
      const configGet = await page.request.get(`${BASE_URL}/api/platform-admin/config`);
      const configBody = await configGet.json();
      if (configGet.ok() && configBody) {
        const origMaintenance = configBody.maintenanceMode;
        const putRes = await page.request.put(`${BASE_URL}/api/platform-admin/config`, {
          data: { maintenanceMode: !origMaintenance },
          headers: { 'Content-Type': 'application/json' },
        });
        const putBody = await putRes.json();
        if (putRes.ok()) {
          if (putBody.maintenanceMode === !origMaintenance) {
            passed('PUT /api/platform-admin/config', '可正确更新');
          } else {
            warn('PUT /api/platform-admin/config', '返回的 maintenanceMode 与预期不符', putBody);
          }
          // 恢复原值
          await page.request.put(`${BASE_URL}/api/platform-admin/config`, {
            data: { maintenanceMode: origMaintenance },
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          failed('PUT /api/platform-admin/config', `HTTP ${putRes.status()}`, putBody);
        }
      }
    } catch (e) {
      failed('PUT /api/platform-admin/config', e.message);
    }

    // ========== 4. 测试 signatures 读取与 PUT（不破坏数据：读取-保存原值）
    try {
      const sigGet = await page.request.get(`${BASE_URL}/api/platform-admin/signatures`);
      const sigBody = await sigGet.json();
      if (sigGet.ok() && typeof sigBody === 'object') {
        const putRes = await page.request.put(`${BASE_URL}/api/platform-admin/signatures`, {
          data: sigBody,
          headers: { 'Content-Type': 'application/json' },
        });
        if (putRes.ok()) {
          passed('PUT /api/platform-admin/signatures', '可正确保存');
        } else {
          const putBody = await putRes.json();
          failed('PUT /api/platform-admin/signatures', `HTTP ${putRes.status()}`, putBody);
        }
      }
    } catch (e) {
      failed('PUT /api/platform-admin/signatures', e.message);
    }

    // ========== 5. 测试 credits 调整（如有用户）
    try {
      const usersRes = await page.request.get(`${BASE_URL}/api/platform-admin/users?page=1&limit=1`);
      const usersBody = await usersRes.json();
      if (usersRes.ok() && usersBody.items?.length > 0) {
        const userId = usersBody.items[0].id;
        const creditsRes = await page.request.put(`${BASE_URL}/api/platform-admin/users/${userId}/credits`, {
          data: { delta: 0 },
          headers: { 'Content-Type': 'application/json' },
        });
        const creditsBody = await creditsRes.json();
        if (creditsRes.status() === 400 && creditsBody.error?.includes('delta cannot be 0')) {
          passed('PUT /api/platform-admin/users/[id]/credits', '正确校验 delta 不能为 0');
        } else {
          warn('PUT credits delta=0', `预期 400，实际 ${creditsRes.status()}`, creditsBody);
        }

        // 测试有效 delta：+1 再 -1 恢复
        const addRes = await page.request.put(`${BASE_URL}/api/platform-admin/users/${userId}/credits`, {
          data: { delta: 1, reason: 'admin-supervision-test' },
          headers: { 'Content-Type': 'application/json' },
        });
        const addBody = await addRes.json();
        if (addRes.ok() && addBody.newCredits != null) {
          passed('PUT credits +1', { newCredits: addBody.newCredits });
          await page.request.put(`${BASE_URL}/api/platform-admin/users/${userId}/credits`, {
            data: { delta: -1, reason: 'admin-supervision-rollback' },
            headers: { 'Content-Type': 'application/json' },
          });
        } else if (addRes.ok()) {
          warn('PUT credits +1', '响应缺少 newCredits', addBody);
        } else {
          failed('PUT credits', `HTTP ${addRes.status()}`, addBody);
        }
      } else {
        warn('PUT credits', '无用户可测试，跳过');
      }
    } catch (e) {
      failed('PUT credits', e.message);
    }

    // ========== 6. 测试 GET /api/platform-admin/tasks/[taskId]（如有任务）
    try {
      const tasksRes = await page.request.get(`${BASE_URL}/api/platform-admin/tasks?page=1&limit=1`);
      const tasksBody = await tasksRes.json();
      if (tasksRes.ok() && tasksBody.items?.length > 0) {
        const taskId = tasksBody.items[0].id;
        const detailRes = await page.request.get(`${BASE_URL}/api/platform-admin/tasks/${taskId}`);
        const detailBody = await detailRes.json();
        if (detailRes.ok() && (detailBody.id || detailBody.task)) {
          passed('GET /api/platform-admin/tasks/[taskId]', { taskId });
        } else if (detailRes.status() === 404) {
          warn('GET tasks/[taskId]', '任务不存在或已删除', { taskId });
        } else {
          failed('GET tasks/[taskId]', `HTTP ${detailRes.status()}`, detailBody);
        }
      } else {
        warn('GET tasks/[taskId]', '无任务可测试，跳过');
      }
    } catch (e) {
      failed('GET tasks/[taskId]', e.message);
    }

    // ========== 7. 测试 finance CSV 导出
    try {
      const csvRes = await page.request.get(`${BASE_URL}/api/platform-admin/finance?period=7&format=csv`);
      if (csvRes.ok()) {
        const ct = csvRes.headers()['content-type'] || '';
        if (ct.includes('text/csv') || ct.includes('csv')) {
          passed('GET /api/platform-admin/finance?format=csv', '正确返回 CSV');
        } else {
          warn('finance CSV', `Content-Type 非 CSV: ${ct}`);
        }
      }
    } catch (e) {
      failed('finance CSV', e.message);
    }

    // ========== 8. 未鉴权访问应返回 401
    const anonContext = await browser.newContext({ baseURL: BASE_URL });
    const anonPage = await anonContext.newPage();
    const anonRes = await anonPage.request.get(`${BASE_URL}/api/platform-admin/pricing`);
    const anonStatus = anonRes.status();
    await anonContext.close();
    if (anonStatus === 401) {
      passed('未鉴权 API 拒绝', '返回 401');
    } else {
      failed('未鉴权 API 拒绝', `预期 401，实际 ${anonStatus}`);
    }

    // ========== 9. 页面 E2E（非 API_ONLY 时）
    if (!API_ONLY) {
      const pages = [
        '/platform-admin',
        '/platform-admin/pricing',
        '/platform-admin/finance',
        '/platform-admin/tasks',
        '/platform-admin/users',
        '/platform-admin/config',
        '/platform-admin/config/signatures',
        '/platform-admin/security',
        '/platform-admin/monitoring',
      ];

      for (const path of pages) {
        try {
          const res = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
          if (!res || res.status() >= 400) {
            failed(`页面 ${path}`, `HTTP ${res?.status() ?? 'unknown'}`);
          } else {
            const title = await page.title();
            const hasLoginRedirect = page.url().includes('/platform-admin/login');
            if (hasLoginRedirect && !path.includes('login')) {
              failed(`页面 ${path}`, '被重定向到登录页，可能 Session 丢失');
            } else if (!hasLoginRedirect) {
              passed(`页面 ${path}`, { status: res.status(), title });
            }
          }
        } catch (e) {
          failed(`页面 ${path}`, e.message);
        }
      }

      // 登出
      const logoutRes = await page.request.post(`${BASE_URL}/api/platform-admin/logout`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (logoutRes.ok() || logoutRes.status() === 204) {
        passed('POST /api/platform-admin/logout', '登出成功');
      } else {
        warn('logout', `HTTP ${logoutRes.status()}`);
      }
    }
  } catch (err) {
    failed('监督执行', err.message, { stack: err.stack?.split('\n').slice(0, 5) });
  } finally {
    await browser.close();
  }

  report.endTime = new Date();
  return report;
}

runAdminSupervision()
  .then((r) => {
    const durationMs = (r.endTime || new Date()) - (r.startTime || new Date());
    const duration = (durationMs / 1000).toFixed(1);
    console.log('\n========== 平台管理后台监督报告 ==========');
    console.log(`通过: ${r.passed.length} | 失败: ${r.failed.length} | 警告: ${r.warnings.length}`);
    if (r.issues.length > 0) console.log(`发现问题: ${r.issues.length}`);
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
    if (r.issues.length > 0) {
      console.log('\n发现的问题（建议修复）:');
      r.issues.forEach((i) => console.log(`  - ${i.description}`, i.fix ? `\n    建议: ${i.fix}` : ''));
    }
    console.log('\n监督完成，无严重错误。');
    process.exit(0);
  })
  .catch((err) => {
    console.error('监督脚本异常:', err);
    process.exit(1);
  });
