# 测试监督脚本 — 伪装用户

模拟真实用户行为，监督 WebEcho AI 平台页面与 API 是否有错误或不合理之处。

## 一、基础监督（quick）

```bash
# 1. 启动开发服务器（另开终端）
npm run dev

# 2. 运行监督（本地）
npm run test:supervision

# 或仅测试 API（无需浏览器）
SUPERVISION_API_ONLY=1 npm run test:supervision
```

## 二、完整克隆 E2E（容器内创建用户 + 充值 + 克隆 + 监督）

在容器内创建测试用户、后台充值额度、执行完整克隆流程并监督。

**流程**：创建用户 → 充值额度 → 登录 → 新建克隆 → 检测复杂度 → 开始克隆 → 轮询完成 → 监督结果页

```bash
# 1. 启动开发服务器
npm run dev

# 2. 本地运行（需配置 .env.local 中的 Supabase）
npm run test:full-e2e

# 3. Docker 容器运行
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
npm run test:full-e2e:docker
```

**环境变量**：

| 变量 | 说明 |
|------|------|
| `BASE_URL` | 应用地址，默认 http://localhost:4000 |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key（创建用户、充值） |
| `E2E_TEST_EMAIL` | 测试用户邮箱，默认 `e2e-{timestamp}@webecho-test.local` |
| `E2E_TEST_PASSWORD` | 测试用户密码，默认 `E2eTestPass123!` |
| `E2E_TEST_CREDITS` | 充值额度，默认 20 |
| `E2E_CLONE_URL` | 克隆目标 URL，默认 https://example.com |

**注意**：未配置 Stripe 时使用额度模式；克隆需 Firecrawl/Playwright、Claude API 等外部服务。

## 三、平台管理后台监督（admin）

针对平台管理后台 (`/platform-admin`) 的完整功能监督，创建管理员用户容器并测试所有 API 与页面。

```bash
# 1. 启动开发服务器（另开终端）
npm run dev

# 2. 确保管理员已创建（首次需执行）
npm run seed:admin -- admin-supervision@webecho-test.local AdminSupervision123!

# 3. 运行平台管理后台监督
ADMIN_EMAIL=admin-supervision@webecho-test.local ADMIN_PASSWORD=AdminSupervision123! npm run test:admin-supervision

# 4. 自动创建管理员后运行（需 .env.local 中 DATABASE_URL）
ADMIN_AUTO_SEED=1 npm run test:admin-supervision

# 5. 仅测 API（不测页面）
ADMIN_SUPERVISION_API_ONLY=1 npm run test:admin-supervision

# 6. 强制 fetch 模式（无需 Playwright，CI/沙箱适用）
ADMIN_USE_FETCH=1 npm run test:admin-supervision
```

**Docker 运行**：

```bash
docker build -f docker/Dockerfile.admin-supervision -t webecho-admin-supervision .
docker run --add-host=host.docker.internal:host-gateway \
  -e BASE_URL=http://host.docker.internal:4000 \
  -e ADMIN_EMAIL=admin@webecho.ai \
  -e ADMIN_PASSWORD=your-password \
  webecho-admin-supervision
```

**admin 监督内容**：登录、Session、pricing/config/tasks/users/finance/signatures/history/health/stats、未鉴权 401、页面 E2E。

## 监督内容

| 检查项 | 说明 |
|--------|------|
| 首页加载 | / 返回 200，Hero 与「开始克隆」链接存在 |
| 定价页 | /pricing 加载正常 |
| /api/pricing | 返回 cloneRanges、hostingPlans |
| clone/new | 页面可访问或正确重定向登录 |
| detect-complexity | 对合法 URL 返回复杂度与额度 |
| clone/create | 未登录时返回 401 或合理错误 |
| 登录页 | /login 表单存在 |
| Dashboard 鉴权 | 未登录访问 /dashboard 应重定向 |
| 控制台错误 | 监听从页面收集的 console.error |
| 请求失败 | 监听从页面收集的 requestfailed |

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| BASE_URL | http://localhost:4000 | 被测应用地址 |
| SUPERVISION_API_ONLY | - | 设为 1 时仅测 API，不需 Playwright 浏览器 |

## Docker 伪装用户容器

在隔离容器中运行监督，模拟独立用户环境：

```bash
# 构建镜像
docker build -f docker/Dockerfile.supervision -t webecho-supervision .

# 运行（Mac/Windows，需先 npm run dev）
docker run --add-host=host.docker.internal:host-gateway \
  -e BASE_URL=http://host.docker.internal:4000 \
  webecho-supervision

# Linux（--network host）
docker run --network host -e BASE_URL=http://localhost:4000 webecho-supervision
```

或使用快捷命令：

```bash
npm run test:supervision:docker
```

## 浏览器要求

完整 E2E 需 Playwright 浏览器，任选其一：

- 系统 Chrome：`channel: 'chrome'` 会自动使用
- 安装 Playwright 浏览器：`npx playwright install chromium`

未安装时脚本会回退到 API-only 模式。

## 退出码

- `0`：全部通过
- `1`：存在失败项
