# WebEcho AI — 项目描述文档

> AI 一键克隆网站 + APP 出海平台  
> 版本：v2.0 | 2026-02  
> 本文档供 Claude Code 开发参考，描述完整项目结构、功能模块、用户流程、收费逻辑和扩展规划。  
> **开发时以本文档为最高优先级参考，有冲突时以本文档为准。**

## 当前实现状态（2026-02 更新）

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目命名 | ✅ | WebEcho AI，package.json: webechoai |
| 中英双语 | ✅ | LocaleContext + LanguageToggle，Cookie 持久化 |
| 字体 | ✅ | Syne + DM Sans + Noto Sans SC（中英双语）|
| clone-worker 分支 | ✅ | cloneType: web/app，app 为空壳 |
| app-scraper / app-generator | ✅ | 目录已建，占位文件 |
| API: detect-complexity | ✅ | 简化版复杂度检测 |
| API: clone/create | ✅ | 创建任务，异步执行 worker |
| API: clone/list | ✅ | 获取当前用户任务列表 |
| API: clone/[id]/status | ✅ | 轮询，Supabase 或内存 |
| API: clone/[id]/download | ✅ | 本地 zip 或 R2 预签名 URL |
| lib/scraper | ✅ | Firecrawl 层1 |
| lib/analyzer | ✅ | complexity-detector 简化版 |
| lib/claude | ✅ | client + prompts |
| lib/supabase | ✅ | client、server、admin（service_role） |
| 页面 | ✅ | 首页、定价、控制台、新建克隆、进度、结果、登录/注册 |
| Supabase 认证 | ✅ | 登录/注册/登出已实现 |
| Stripe | ✅ | checkout + verify-session + webhook |
| R2 | ✅ | zip 上传与预签名下载 |
| Docker 测试 | ✅ | 生成项目构建验证 |
| 降级模板 | ✅ | Stripe pricing/cta/form |
| 监控告警 | ✅ | 克隆失败/Webhook 异常邮件告警；失败率过高可自动维护；任务成功率、慢请求、外部服务健康 |

---

## 目录

1. [产品概述](#1-产品概述)
2. [技术栈](#2-技术栈)
3. [项目文件结构](#3-项目文件结构)
4. [功能模块详解](#4-功能模块详解)
5. [内嵌浏览器模块详细设计](#5-内嵌浏览器模块详细设计)
6. [用户动作路线（User Journey）](#6-用户动作路线)
7. [收费标准与计费逻辑](#7-收费标准与计费逻辑)
8. [爬虫模块详细设计](#8-爬虫模块详细设计)
9. [AI 分析与代码生成流程](#9-ai-分析与代码生成流程)
10. [AI 智能补全机制](#10-ai-智能补全机制)
11. [自动化测试流程](#11-自动化测试流程)
12. [数据库表结构](#12-数据库表结构)
13. [API 路由设计](#13-api-路由设计)
14. [环境变量](#14-环境变量)
15. [开发阶段规划（一至三阶段）](#15-开发阶段规划)
16. [第四阶段：APP 克隆扩展规划](#16-第四阶段app-克隆扩展规划)

---

## 1. 产品概述

### 是什么

WebEcho AI 是一个 AI 驱动的智能克隆平台，分两个大阶段建设：

**阶段一至三（当前）：网站克隆**
用户输入任意参考网站的 URL，平台自动：
1. 抓取并分析目标网站（视觉、结构、功能）
2. 识别网站使用的第三方服务（支付、地图、登录等）
3. 用 AI 生成对应的 Next.js + Tailwind CSS 代码
4. 对无法爬取的功能自动生成主流替代方案的接入代码
5. 在 Docker 容器中自动测试，通过后交付给用户

**阶段四（后续扩展）：APP 克隆**
用户上传 APP 截图或 APK 安装包，平台自动分析界面结构，生成对应的 React Native / Expo 移动端代码。

### 用户拿到什么

- **模式 A（下载代码包）**：ZIP 格式的标准 Next.js 项目，用户自行部署到 Vercel / 自有服务器
- **模式 B（平台托管）**：平台自动创建 GitHub 私有仓库 + Railway 项目，一键完成部署，绑定自定义域名，平台负责运维

### 目标市场

- 主力市场：中国出海卖家、跨境电商团队
- 次要市场：海外中小企业主、自由职业设计师、出海创业团队
- 产品界面：中英双语

### 架构设计原则（必须遵守）

> `workers/clone-worker.ts` 从第一天起必须按 `cloneType` 分支设计，为 APP 克隆预留扩展点，不得将网站克隆逻辑写死在主流程中。

```typescript
// workers/clone-worker.ts 顶层结构（必须遵守）
async function processCloneTask(task: CloneTask) {
  switch (task.cloneType) {
    case 'web':
      return await processWebClone(task);
    case 'app':                          // 第四阶段填充
      return await processAppClone(task);
    default:
      throw new Error(`Unknown clone type: ${task.cloneType}`);
  }
}
```

---

## 2. 技术栈

### 平台本身

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 (App Router) | 平台本身的前端 |
| 样式 | Tailwind CSS | |
| 后端 API | Next.js API Routes | 同步接口；长任务用异步 Worker |
| 数据库 | Supabase (PostgreSQL) | 含用户认证、Row Level Security |
| 文件存储 | Cloudflare R2 | 存储克隆的静态资源、代码包 ZIP |
| 支付 | Stripe | 一次性付款（额度包）+ 订阅制（托管月费）|
| 部署（平台本身） | Vercel | |

### 网站克隆核心

| 层级 | 技术 | 说明 |
|------|------|------|
| 爬虫（主） | Firecrawl API | 静态页面抓取，返回 Markdown + HTML |
| 爬虫（备） | Decodo Scraping API | Firecrawl 失败时自动切换，住宅代理覆盖广 |
| 无头浏览器 | Playwright | JS 渲染页面 + Network 请求拦截 + Session 提取 |
| 内嵌浏览器串流 | Playwright + WebSocket | 服务端截图推流，用户在平台内直接操控浏览器 |
| 实时通信 | WebSocket (ws) | 内嵌浏览器画面推流 + 用户操作事件回传 |
| AI 分析/生成 | Claude API (claude-sonnet-4-5) | 页面语义分析 + 组件代码生成 |
| 容器测试 | Docker | 每次克隆任务自动在隔离容器中测试 |
| CI/CD | GitHub Actions | 自动触发测试，自动修复循环 |

### 托管基础设施

| 层级 | 技术 | 说明 |
|------|------|------|
| 代码仓库 | GitHub API | 自动为用户创建私有仓库 |
| 运行平台 | Railway API | 自动创建项目、部署、管理环境变量 |
| 域名 / SSL | Railway 内置 + Let's Encrypt | 自动签发 SSL，支持自定义域名 |

### 第四阶段新增（预留，暂不实现）

| 层级 | 技术 | 说明 |
|------|------|------|
| APK 分析 | apktool + aapt2 | Android 安装包反编译 |
| 流量抓包 | mitmproxy | 模拟器运行时拦截 API 请求 |
| APP 代码生成 | React Native + Expo | 生成跨平台移动端代码 |
| 模拟器测试 | Android Emulator (Docker) | 截图验证生成结果 |

---

## 3. 项目文件结构

```
webechoai/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx            # 控制台首页，克隆任务列表
│   │   │   ├── clone/
│   │   │   │   ├── new/page.tsx              # 新建克隆（输入 URL / 上传文件）
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx              # 任务详情 + 实时进度
│   │   │   │       └── result/page.tsx       # 生成结果预览（当前为 result 非 preview）
│   │   │   ├── hosting/
│   │   │   │   └── [siteId]/page.tsx         # 托管网站管理
│   │   │   ├── billing/page.tsx              # 账单、额度、套餐管理
│   │   │   └── settings/page.tsx
│   │   ├── (marketing)/
│   │   │   ├── page.tsx                      # 首页 Landing Page
│   │   │   ├── pricing/page.tsx              # 定价页
│   │   │   └── docs/page.tsx                 # 使用文档
│   │   ├── api/
│   │   ├── clone/
│   │   │   ├── create/route.ts           # POST 创建克隆任务
│   │   │   ├── detect-complexity/route.ts # POST 检测网站复杂度
│   │   │   └── [id]/
│   │   │       ├── status/route.ts        # GET 查询任务进度（前端轮询）
│   │   │       └── download/route.ts      # GET 获取代码包下载链接
│   │   ├── browser/
│   │   │   ├── session/route.ts           # POST 创建浏览器 Session
│   │   │   ├── [sessionId]/
│   │   │   │   ├── screenshot/route.ts    # GET 获取当前截图（MVP 轮询模式）
│   │   │   │   ├── action/route.ts        # POST 发送用户操作（点击/输入/滚动）
│   │   │   │   ├── extract/route.ts       # POST 提取当前 Session Cookie
│   │   │   │   └── close/route.ts         # POST 关闭并销毁 Session
│   │   │   └── ws/route.ts                # WebSocket 升级端点（画面推流）
│   │   ├── hosting/
│   │   │   ├── deploy/route.ts            # POST 一键部署（GitHub + Railway）
│   │   │   └── [siteId]/
│   │   │       ├── status/route.ts        # GET Railway 部署状态
│   │   │       └── domain/route.ts        # POST 绑定自定义域名
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts          # POST 创建 Checkout Session
│   │   │   └── webhook/route.ts           # POST Stripe Webhook
│   │   └── internal/                      # 内部调用，不对外暴露
│   │       ├── scrape/route.ts
│   │       └── analyze/route.ts
│   └── layout.tsx
│
├── components/
│   ├── ui/                               # 基础 UI 组件
│   ├── clone/
│   │   ├── CloneTypeSelector.tsx         # 网站/APP 类型选择（APP 暂灰显）
│   │   ├── UrlInput.tsx                  # 网站 URL 输入框
│   │   ├── AuthInput.tsx                 # 登录凭证输入（账号密码 / Cookie，可选）
│   │   ├── AppUploader.tsx               # APP 文件上传（第四阶段启用）
│   │   ├── ComplexityEstimate.tsx        # 复杂度检测结果 + 额度消耗提示
│   │   ├── ProgressTracker.tsx           # 克隆进度实时展示
│   │   ├── PreviewFrame.tsx              # 生成结果预览 iframe
│   │   ├── QualityReport.tsx             # 质量检测报告
│   │   └── ServiceBadges.tsx             # 识别到的第三方服务标签
│   ├── browser/
│   │   ├── BrowserViewer.tsx             # 内嵌浏览器主容器（模态弹窗）
│   │   ├── BrowserCanvas.tsx             # 截图渲染画布 + 鼠标键盘事件捕获
│   │   ├── BrowserToolbar.tsx            # 地址栏 + 刷新 + 前进后退按钮
│   │   ├── BrowserStatusBar.tsx          # 状态栏（连接中/已就绪/已登录检测）
│   │   └── SessionExtractButton.tsx      # 「已完成登录，开始克隆」确认按钮
│   ├── hosting/
│   │   ├── DeploymentStatus.tsx          # Railway 部署状态
│   │   ├── DomainManager.tsx             # 域名绑定管理
│   │   └── TrafficChart.tsx              # 流量图表
│   ├── billing/
│   │   ├── PricingCard.tsx
│   │   ├── CreditBalance.tsx
│   │   └── UsageBar.tsx
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Footer.tsx
│   │       └── LanguageToggle.tsx            # 语言切换 中|EN
│   │
│   ├── lib/
│   ├── scraper/                          # 网站爬虫模块
│   │   ├── index.ts                      # 爬虫调度器（三层降级主入口）
│   │   ├── firecrawl.ts                  # Firecrawl API 封装
│   │   ├── decodo.ts                     # Decodo API 封装（备用）
│   │   ├── playwright.ts                 # Playwright 无头浏览器封装
│   │   ├── auth-handler.ts               # 登录凭证处理（自动登录 + Cookie 注入）
│   │   ├── network-interceptor.ts        # Network 请求拦截
│   │   └── asset-downloader.ts           # 静态资源下载到 R2
│   ├── browser-session/                  # 内嵌浏览器模块
│   │   ├── index.ts                      # Session 生命周期管理
│   │   ├── session-manager.ts            # 创建 / 销毁 / 超时回收 Playwright 实例
│   │   ├── screenshot-streamer.ts        # 截图推流（MVP 轮询 / 升级 CDP 推流）
│   │   ├── action-handler.ts             # 接收前端操作事件，转为 Playwright 指令
│   │   ├── login-detector.ts             # 自动检测当前页面是否已完成登录
│   │   └── cookie-extractor.ts           # 提取已登录 Session 的 Cookie
│   ├── analyzer/                         # AI 分析模块
│   │   ├── index.ts
│   │   ├── page-structure.ts             # 页面区块类型识别
│   │   ├── third-party-detector.ts       # 第三方服务识别
│   │   ├── complexity-detector.ts        # 网站复杂度检测
│   │   ├── color-extractor.ts
│   │   └── font-extractor.ts
│   ├── generator/                        # 代码生成模块
│   │   ├── index.ts
│   │   ├── nextjs-builder.ts             # Next.js 项目脚手架
│   │   ├── component-generator.ts        # 组件代码生成（调用 Claude API）
│   │   ├── fallback-generator.ts         # 降级方案代码生成
│   │   └── i18n-generator.ts             # 多语言文件生成
│   ├── tester/                           # 自动化测试模块
│   │   ├── index.ts                      # 测试调度器 + 自动修复循环
│   │   ├── docker-runner.ts
│   │   ├── visual-diff.ts                # 截图对比 + AI 视觉评分
│   │   └── code-validator.ts             # ESLint + TypeScript 检查
│   ├── deployer/                         # 托管部署模块
│   │   ├── index.ts
│   │   ├── github.ts                     # GitHub API：创建仓库、推送代码
│   │   ├── railway.ts                    # Railway API：创建项目、部署
│   │   └── domain-manager.ts             # 域名绑定 + DNS 验证
│   ├── app-scraper/                      # APP 分析模块（第四阶段，目录先建，文件为空）
│   │   ├── index.ts
│   │   ├── screenshot-analyzer.ts
│   │   ├── apk-analyzer.ts
│   │   └── traffic-capture.ts
│   ├── app-generator/                    # APP 代码生成模块（第四阶段，目录先建）
│   │   ├── index.ts
│   │   ├── expo-builder.ts
│   │   └── rn-component-generator.ts
│   ├── stripe/
│   │   ├── client.ts
│   │   ├── plans.ts                      # 套餐配置（同步 constants/plans.ts）
│   │   └── webhook-handler.ts
│   ├── supabase/
│   │   ├── client.ts                     # 浏览器端客户端
│   │   ├── server.ts                     # 服务端客户端
│   │   └── queries.ts
│   │   └── claude/
│   │       ├── client.ts
│   │       └── prompts.ts                    # 所有 Prompt 模板集中管理（禁止散落其他文件）
│   │
│   ├── workers/
│   ├── clone-worker.ts                   # 克隆任务主流程（按 cloneType 分支）
│   └── deploy-worker.ts                  # 部署任务主流程
│
├── types/
│   ├── clone.ts                          # 含 cloneType: 'web' | 'app'
│   ├── scrape.ts
│   ├── hosting.ts
│   ├── billing.ts
│   │   └── supabase.ts                       # Supabase CLI 自动生成
│   │
│   ├── hooks/
│   ├── useCloneStatus.ts                 # 实时轮询（每 3 秒）
│   ├── useCredits.ts
│   │   └── useBilling.ts
│   │
│   ├── constants/
│   ├── plans.ts                          # 套餐价格常量（唯一数据源）
│   ├── third-party-signatures.ts         # 第三方服务识别特征库（核心数据资产）
│   │   └── supported-services.ts
│   │
│   ├── contexts/
│   │   └── LocaleContext.tsx                # 中英语言切换
│   │
│   └── scripts/                              # 项目根 scripts，非 src 内
│   ├── test-clone.ts                     # 手动触发测试（开发调试用）
│   └── seed-db.ts
│
├── docker/
│   ├── Dockerfile.test                   # 网站代码测试容器
│   ├── docker-compose.test.yml
│   └── Dockerfile.android                # Android 模拟器容器（第四阶段使用）
│
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── clone-quality.yml
│
├── public/
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. 功能模块详解

### 4.1 爬虫模块 (`lib/scraper/`)

**三层降级流程**：

```
输入 URL
  ↓
[层1] Firecrawl API → 成功返回 HTML + Markdown + 截图，失败切层2
  ↓
[层2] Decodo 住宅代理 + Playwright → 完整渲染 + Network 拦截 + 截图，失败切层3
  ↓
[层3] 已有数据 + Claude API 纯推断 → AI 推断剩余功能并生成替代方案
```

**输出数据结构**：

```typescript
interface ScrapeResult {
  url: string;
  html: string;
  markdown: string;
  screenshot: string;                // Cloudflare R2 URL
  assets: { images: AssetItem[]; fonts: AssetItem[]; icons: AssetItem[] };
  networkRequests: NetworkRequest[]; // 所有第三方请求
  detectedServices: string[];        // 命中特征库的服务名
  scraperLayer: 1 | 2 | 3;
  scrapedAt: Date;
}
```

---

### 4.2 复杂度检测 (`lib/analyzer/complexity-detector.ts`)

用户提交 URL 后、扣额度前，先检测复杂度，明确告知消耗数量，用户确认后才开始。

| 等级 | 判断标准 | 消耗额度 |
|------|---------|---------|
| `static_single` | 单页 / 无登录 / 无动态 API | 1 |
| `static_multi` | 多页（≤5页）/ 无用户系统 | 2 |
| `dynamic_basic` | 有登录 / Dashboard / 数据库 API | 5 |
| `dynamic_complex` | 多角色权限 / 大量 API / 多语言 | 10 |

---

### 4.3 AI 分析模块 (`lib/analyzer/`)

**第三方服务特征库**（`constants/third-party-signatures.ts`）：

```typescript
const SIGNATURES = {
  stripe:     { domains: ['js.stripe.com'], scriptPatterns: [/stripe\.js/i], classNames: ['StripeElement'] },
  googleMaps: { domains: ['maps.googleapis.com'], htmlPatterns: [/<div[^>]+id=["']map/i] },
  disqus:     { domains: ['disqus.com'], scriptPatterns: [/disqus_shortname/i] },
  // 持续扩充，目标第三阶段 50 个服务
}
```

**页面区块类型**：`navbar` / `hero` / `features` / `pricing` / `testimonials` / `faq` / `cta` / `form` / `gallery` / `map` / `footer` / `custom`

---

### 4.4 代码生成模块 (`lib/generator/`)

**降级方案**（`fallback-generator.ts`）：

| 原功能 | 降级替代 | 生成内容 |
|--------|---------|---------|
| 支付系统 | Stripe Checkout | 完整前后端接入代码 |
| 用户登录 | Clerk | Provider + SignIn/SignUp 组件 |
| 地图组件 | Google Maps React | 地图组件 + Key 配置说明 |
| 评论系统 | Giscus | 组件 + 配置说明 |
| 站内搜索 | Algolia InstantSearch | 搜索组件 + 索引配置 |
| 在线客服 | Crisp | Script 注入组件 |
| 数据分析 | Google Analytics 4 | GA4 Script + 事件追踪示例 |
| 邮件订阅 | Mailchimp / ConvertKit | 订阅表单 + API 接入 |
| 视频播放 | React Player | 通用播放器组件 |

**用户拿到的代码包**：

```
generated-site/
├── app/layout.tsx、page.tsx、globals.css
├── components/          # 按实际识别结果生成
├── lib/utils.ts
├── public/assets/       # 克隆下来的图片图标
├── .env.example         # API Key 清单 + 说明
├── README.md            # 部署教程 + 第三方服务配置指南
└── next.config.ts、tailwind.config.ts、package.json
```

---

### 4.5 自动化测试模块 (`lib/tester/`)

**判定标准**：视觉还原度 ≥ 75分 + TypeScript 编译无报错 + ESLint 无 error + 所有依赖可解析

**自动修复循环**（最多 3 次，失败则退回额度）：

```typescript
async function cloneWithAutoFix(task: CloneTask, maxRetries = 3) {
  let attempt = 0;
  let result = await generateCode(task);
  while (attempt < maxRetries) {
    const test = await runTests(result.projectPath, task.targetUrl);
    if (test.passed) return result;
    result = await fixCode(result, test.errors, test.report); // 错误反馈给 Claude 修复
    attempt++;
  }
  await refundCredits(task.userId, task.creditsUsed);
  await markForManualReview(task.id);
  await sendFailureEmail(task.userId, task.id);
}
```

---

### 4.6 托管部署模块 (`lib/deployer/`)

```
用户选择平台托管
  → [github.ts] 创建 GitHub 私有仓库，推送代码
  → [railway.ts] 创建 Railway 项目，关联仓库，注入环境变量，触发部署
  → [domain-manager.ts] 生成默认地址，引导绑定自定义域名（可选）
  → 记录到 hosted_sites 表，启动 Stripe 订阅，发送成功邮件
```

---

## 5. 内嵌浏览器模块详细设计

### 5.1 功能定位

平台内嵌一个简易浏览器窗口，服务两个场景：

| 场景 | 说明 |
|------|------|
| **登录辅助** | 目标网站需要任意形式的登录（含短信验证码、Google OAuth、CAPTCHA），用户在此窗口内亲自完成登录，平台提取 Session 后继续克隆 |
| **克隆预览** | 克隆完成后，在同一窗口内展示生成结果，支持真实交互，比 iframe 更稳定（绕过 X-Frame-Options 限制） |

---

### 5.2 技术架构（MVP：截图轮询模式）

```
服务端（Node.js 长连接服务）
  Playwright 启动 Chromium 实例
    ↓
  每 300ms 截一张全页截图（JPEG，质量 70）
    ↓
  通过 WebSocket 推送 base64 图片到前端
    ↓
前端（BrowserCanvas.tsx）
  接收图片 → 渲染到 <canvas>
  捕获用户鼠标点击 / 键盘输入 / 滚动事件
    ↓
  将事件坐标 + 类型通过 WebSocket 发回服务端
    ↓
服务端 action-handler.ts
  接收事件 → 转为 Playwright 操作：
    click(x, y) / type(text) / scroll(deltaY) / navigate(url)
```

**MVP 延迟**：300-600ms，对登录操作完全够用。

**后续升级路径**（第三阶段）：切换为 Chrome DevTools Protocol（CDP）screencast 推流，延迟降至 50-200ms，体验接近远程桌面。

---

### 5.3 Session 生命周期（`lib/browser-session/session-manager.ts`）

```typescript
interface BrowserSession {
  sessionId: string;
  userId: string;
  targetUrl: string;
  purpose: 'login' | 'preview';       // 登录辅助 or 克隆预览
  browser: Browser;                    // Playwright Browser 实例
  page: Page;                          // 当前页面
  createdAt: Date;
  lastActiveAt: Date;                  // 用于超时回收
  status: 'active' | 'login_detected' | 'closed';
}

// Session 管理规则
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;   // 10 分钟无操作自动销毁
const MAX_SESSIONS_PER_USER = 2;              // 每用户最多同时 2 个 Session
const MAX_TOTAL_SESSIONS = 50;                // 服务端总 Session 上限

async function createSession(userId: string, targetUrl: string, purpose: 'login' | 'preview'): Promise<BrowserSession>
async function destroySession(sessionId: string): Promise<void>  // 释放 Browser 实例，清除截图缓存
async function gcIdleSessions(): Promise<void>                    // 定时任务，回收超时 Session
```

---

### 5.4 登录检测（`lib/browser-session/login-detector.ts`）

用户操作登录后，系统自动检测是否已成功登录，无需用户手动判断：

```typescript
async function detectLoginStatus(page: Page, originalLoginUrl: string): Promise<LoginStatus> {
  const currentUrl = page.url();
  const loginKeywords = ['login', 'signin', 'sign-in', 'auth', 'sso'];

  // 判断逻辑（按优先级）：
  // 1. 当前 URL 不包含登录关键词 → 已离开登录页 → 可能已登录
  // 2. 页面存在用户头像 / 用户名 / 退出按钮等特征元素 → 确认已登录
  // 3. 页面仍有登录表单 → 未登录
  // 4. 无法判断 → 返回 'uncertain'，由用户手动确认

  return {
    isLoggedIn: boolean,
    confidence: 'high' | 'medium' | 'uncertain',
    detectedUserElement?: string,   // 检测到的用户特征元素描述
  };
}
```

登录检测结果实时反映在 `BrowserStatusBar.tsx`：
- 🔴 未登录 / 检测中
- 🟡 可能已登录（置信度 medium）
- 🟢 已确认登录 → 「开始克隆」按钮变为可点击

---

### 5.5 Cookie 提取（`lib/browser-session/cookie-extractor.ts`）

```typescript
async function extractSessionCookies(page: Page): Promise<ExtractedCookies> {
  const cookies = await page.context().cookies();

  return {
    raw: cookies,                                          // 完整 Cookie 数组
    cookieString: cookies.map(c => `${c.name}=${c.value}`).join('; '),  // 字符串格式
    domain: new URL(page.url()).hostname,
    extractedAt: new Date(),
    // 安全处理：提取后立即在内存中使用，不写入数据库
  };
}
```

提取到的 Cookie 直接传入 `lib/scraper/auth-handler.ts` 的 Cookie 注入模式，进入正常抓取流程。

---

### 5.6 前端组件设计（`components/browser/`）

#### BrowserViewer.tsx（主容器）

以模态弹窗形式展示，覆盖整个屏幕，包含：
- 顶部工具栏（BrowserToolbar）
- 中间画布区域（BrowserCanvas）
- 底部状态栏（BrowserStatusBar）
- 右下角确认按钮（SessionExtractButton）

```
┌─────────────────────────────────────────────┐
│  ← → ↺  [ https://target-site.com/login ]  │  ← BrowserToolbar
├─────────────────────────────────────────────┤
│                                             │
│         [ 网站内容截图实时渲染 ]               │  ← BrowserCanvas
│         用户可直接点击操作                    │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│  🟢 已检测到登录状态      [ 开始克隆 →      ] │  ← BrowserStatusBar + SessionExtractButton
└─────────────────────────────────────────────┘
```

#### BrowserCanvas.tsx（核心交互组件）

```typescript
// 将用户的鼠标/键盘事件转换为服务端操作
const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = serverViewport.width / rect.width;   // 坐标换算（画布缩放）
  const scaleY = serverViewport.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  ws.send(JSON.stringify({ type: 'click', x, y }));
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  ws.send(JSON.stringify({ type: 'keypress', key: e.key }));
};

const handleWheel = (e: React.WheelEvent) => {
  ws.send(JSON.stringify({ type: 'scroll', deltaY: e.deltaY }));
};
```

---

### 5.7 预览模式（克隆完成后）

克隆任务完成后，同一个 `BrowserViewer` 组件切换为 `purpose: 'preview'` 模式：

```
克隆完成
  → 启动新的 Browser Session，加载生成的网站（本地 Docker 或 Railway 临时地址）
  → 用户在内嵌浏览器里真实浏览生成结果
  → 支持点击导航、表单交互、响应式预览（可切换移动端视口）
  → 预览满意后选择「下载代码包」或「一键部署」
```

预览 Session 在用户关闭弹窗或做出选择后自动销毁，最长存活 30 分钟。

---

### 5.8 安全与资源控制

| 规则 | 说明 |
|------|------|
| Session 隔离 | 每个 Session 独立 Playwright Browser 实例，互不干扰 |
| 超时销毁 | 10 分钟无操作自动销毁，释放服务器资源 |
| 并发上限 | 每用户最多 2 个并发 Session，全局上限 50 个 |
| 凭证不落地 | 提取的 Cookie 仅在内存传递，不写入数据库、不出现在日志 |
| 截图不存储 | 推流截图不保存到 R2，用完即丢 |
| HTTPS 强制 | WebSocket 连接必须使用 WSS，防止截图内容被中间人截获 |
| 内容过滤 | 用户只能在自己创建的 Session 内操作，Session ID 绑定 userId 验证 |

---

## 6. 用户动作路线

### 6.1 新用户注册 → 首次克隆

```
访问首页 → 注册（邮箱/Google OAuth）→ 进入控制台（额度为 0）
  → 购买额度包（Stripe Checkout）→ 额度更新 → 进入克隆主流程
```

### 6.2 网站克隆主流程（无需登录）

```
新建克隆 → 选择[网站克隆]（APP 第四阶段开放，当前灰显）
  → 输入 URL → 系统检测复杂度（约 10 秒）
  → 展示消耗额度数，用户确认
  → 选择交付模式（下载 / 托管）+ 输出语言
  → 点击开始 → 扣除额度 → 任务创建
  → 实时进度：抓取 → 分析 → 生成 → 测试 → 完成
  → 展示质量报告 + 内嵌浏览器预览
  → [A] 下载 ZIP  或  [B] 一键托管
```

### 6.3 网站克隆主流程（需要登录）

```
新建克隆 → 输入 URL → 检测到登录墙（或用户手动勾选「需要登录」）
  ↓
弹出内嵌浏览器窗口（BrowserViewer，purpose: 'login'）
  → 自动导航到目标网站登录页
  → 用户在窗口内自由操作：
      输入账号密码
      接收短信验证码并填写
      完成 Google / Apple OAuth 授权
      通过滑块验证 / 图片 CAPTCHA
      ……任何登录方式均可
  → 系统实时检测登录状态
  → 状态栏显示 🟢 已检测到登录 → 「开始克隆」按钮激活
  ↓
用户点击「开始克隆」
  → 系统提取当前 Session Cookie（内存传递，不存库）
  → 关闭登录浏览器窗口
  → 扣除额度，以已登录状态抓取目标页面
  → 正常进入：分析 → 生成 → 测试 → 完成
  → 弹出内嵌浏览器预览（purpose: 'preview'）
  → [A] 下载 ZIP  或  [B] 一键托管
```

### 6.4 平台托管流程

```
点击一键托管 → 选择套餐 → 填写第三方 API Key
  → Stripe 绑卡 → 确认部署
  → 平台自动：创建 GitHub 仓库 → 推送代码 → 创建 Railway 项目
             → 注入环境变量 → 触发部署（约 3-5 分钟）
  → 部署成功 → 展示访问链接 → 引导绑定域名（可选）
  → Stripe 开始月度订阅
```

### 6.5 托管用户持续使用路线

```
网站在 Railway 正常运行
  → 每月 1 日 Stripe 自动扣款
    成功：继续服务
    失败：邮件提醒，72 小时未处理 → 暂停 Railway（不删数据）
  → 用户更新网站：触发重新克隆 → 新代码推送 GitHub → Railway 自动重部署
  → Railway 费用接近上限：邮件预警，超出部分次月补收
  → 取消托管：周期结束后暂停，GitHub 仓库保留 30 天后删除
```

### 6.6 克隆失败处理路线

```
任务失败 → 自动重试最多 3 次
  → 均失败：退回全部消耗额度 + 发送失败通知邮件
  → 控制台展示失败原因
  → 用户可选：[A] 重试其他 URL  [B] 联系客服（记录保留 7 天）
```

---

## 7. 收费标准与计费逻辑

### 7.1 真实成本拆解（基于 Decodo 实际单价）

> Decodo 核心 API：$0.08/1K 请求；高级 API（NBN/住宅代理）：$0.95/1K 请求  
> Claude Sonnet API：输入 $3/百万 Token，输出 $15/百万 Token

| 成本项 | 静态单页 | 静态多页 | 动态有后台 | 复杂 SaaS |
|--------|---------|---------|----------|---------|
| Firecrawl（页面抓取） | $0.01 | $0.04 | $0.08 | $0.15 |
| Decodo 代理请求 | $0.01（~100 req） | $0.04（~500 req） | $0.16（~2,000 req） | $0.40（~5,000 req） |
| Playwright 服务器运行 | $0.05 | $0.10 | $0.25 | $0.50 |
| Browser Session（登录辅助，如需） | $0.00 | $0.05 | $0.20 | $0.40 |
| Claude API（分析 + 组件生成） | $0.40 | $0.80 | $2.50 | $5.50 |
| Docker 测试容器 | $0.05 | $0.08 | $0.20 | $0.40 |
| Cloudflare R2 | $0.01 | $0.02 | $0.05 | $0.10 |
| **实际总成本** | **~$0.53** | **~$1.13** | **~$3.44** | **~$7.45** |
| **目标售价（×5 利润率）** | **~$2.65** | **~$5.65** | **~$17.2** | **~$37.25** |
| **取整后建议售价** | **$3** | **$6** | **$19** | **$39** |

> 利润率系数默认 5x，动态任务因 Claude Token 消耗大、Decodo 请求多，成本集中在 $3-8 区间，不可低估。

---

### 7.2 定价模式：按次实时计费（Post-pay）

不采用预购额度包模式，改为**先绑卡、后按实际用量扣费**，原因：

- 额度包模式下动态克隆亏损风险大（用户用最便宜的包做最贵的任务）
- 实时计费对用户更透明，按实际用量付，不浪费
- 平台可精确控制每次任务的利润率

**保留单一入口产品：$9 体验包**（1 次静态克隆，固定价格，用于拉新，不亏损）

---

### 7.3 实际成本实时追踪（`lib/billing/cost-tracker.ts`）

每个克隆任务执行过程中，所有成本项精确计量，任务完成后汇总：

```typescript
interface TaskCostBreakdown {
  taskId: string;

  // 爬虫成本
  firecrawlPages: number;
  firecrawlCost: number;            // 美分

  // Decodo 代理（核心成本之一）
  decodoRequests: number;           // 实际代理请求数
  decodoApiType: 'core' | 'advanced'; // core=$0.08/1K, advanced=$0.95/1K
  decodoCost: number;               // 美分

  // Playwright 运行成本
  playwrightSeconds: number;
  playwrightCost: number;           // 美分（按服务器实例时长计算）

  // Browser Session 成本（内嵌浏览器登录辅助，按使用时长计）
  browserSessionSeconds: number;    // 用户在内嵌浏览器中操作的时长
  browserSessionCost: number;       // 美分（$0.01/分钟）

  // Claude API Token（精确到 Token）
  claudeInputTokens: number;
  claudeOutputTokens: number;
  claudeInputCost: number;          // 美分（$3/百万输入 Token）
  claudeOutputCost: number;         // 美分（$15/百万输出 Token）
  claudeApiCalls: number;

  // 基础设施
  dockerSeconds: number;
  dockerCost: number;
  r2StorageMb: number;
  r2Cost: number;

  // 汇总
  totalCostCents: number;
  calculatedAt: Date;
}
```

---

### 7.4 动态定价引擎（`lib/billing/pricing-engine.ts`）

```typescript
async function calculateTaskPrice(taskId: string): Promise<TaskPrice> {
  const cost = await getTaskCost(taskId);
  const config = await getPricingConfig();   // 从 platform_config 表读取，管理员实时可改

  // 按复杂度选择利润率系数
  const multiplier = config.multiplierByComplexity[cost.complexity];

  // 最终价格 = 实际成本 × 利润率系数
  const rawPrice = cost.totalCostCents * multiplier;

  // 价格上下限兜底
  const finalPrice = Math.max(
    Math.min(rawPrice, config.maxPriceCents),
    config.minPriceCents
  );

  return {
    taskId,
    actualCostCents: cost.totalCostCents,
    profitMultiplier: multiplier,
    finalPriceCents: Math.round(finalPrice),
    profitCents: Math.round(finalPrice - cost.totalCostCents),
    profitMargin: ((finalPrice - cost.totalCostCents) / finalPrice * 100).toFixed(1) + '%',
    breakdown: cost,
  };
}
```

---

### 7.5 定价配置（管理后台实时可调）

```typescript
// 存储在 platform_config 表，管理员可随时修改，无需重新部署
const DEFAULT_PRICING_CONFIG = {
  // 按复杂度的利润率系数
  multiplierByComplexity: {
    static_single:   5.0,   // 成本~$0.53 → 售价~$2.65，取整 $3
    static_multi:    5.0,   // 成本~$1.13 → 售价~$5.65，取整 $6
    dynamic_basic:   5.0,   // 成本~$3.44 → 售价~$17.2，取整 $19
    dynamic_complex: 5.0,   // 成本~$7.45 → 售价~$37.25，取整 $39
  },

  // 各复杂度的价格兜底（防止因缓存/免费资源导致成本异常低而亏损）
  minPriceCentsByComplexity: {
    static_single:   300,   // 最低 $3
    static_multi:    600,   // 最低 $6
    dynamic_basic:   1900,  // 最低 $19
    dynamic_complex: 3900,  // 最低 $39
  },

  // 价格上限（防止极端复杂任务报价吓退用户）
  maxPriceCentsByComplexity: {
    static_single:   500,   // 最高 $5
    static_multi:    1200,  // 最高 $12
    dynamic_basic:   4900,  // 最高 $49
    dynamic_complex: 9900,  // 最高 $99
  },
};
```

---

### 7.6 用户端支付流程

```
用户输入 URL
  ↓
系统检测复杂度（约 10 秒）
  ↓
展示预估价格区间（例：动态有后台 预计 $19 - $49）
  → 明确说明：最终价格根据实际 AI Token 用量结算
  ↓
用户绑定信用卡（Stripe SetupIntent，不立即扣款）
预授权最高价格（$49），实际只扣实际费用
  ↓
任务执行，实时累计成本
  ↓
任务完成 → 按实际成本 × 利润率扣款
  ↓
发送账单邮件（含完整成本拆分：Decodo xx 次 + Claude xx Token + ...）
```

**拉新专属**：新用户首次克隆（仅限静态单页）固定价格 **$9**，不走动态定价，作为获客产品。

---

### 7.7 批量折扣（月度订阅用户）

频繁使用的用户可订阅月度套餐，享受利润率系数折扣：

| 月度套餐 | 月费 | 利润率系数折扣 | 适合场景 |
|---------|------|------------|---------|
| 轻度用户 | $29/月 | 系数降至 4.0x | 每月 3-5 次静态克隆 |
| 专业用户 | $99/月 | 系数降至 3.5x | 每月 5-15 次混合克隆 |
| 团队版 | $299/月 | 系数降至 3.0x | 团队多人，每月 20+ 次 |

> 月度套餐不包含克隆次数，仅降低每次克隆的定价系数。实际费用仍按每次任务成本计算。

---

### 7.8 平台托管收费（固定套餐，独立于克隆计费）

**A 类：静态网站**（无数据库 / 无登录系统）

| 套餐 | 月费 | 适用场景 | 域名数 | 含 Railway 成本 |
|------|------|---------|------|--------------|
| 静态入门 | $30/月 | 单页落地页，月访客 < 5 万 | 1 | ~$5 |
| 静态成长 | $50/月 | 多页官网，月访客 < 50 万 | 3 | ~$10 |

**B 类：动态网站**（有数据库 / 用户后台 / API 服务）

| 套餐 | 月费 | 适用场景 | 域名数 | 含 Railway 成本 |
|------|------|---------|------|--------------|
| 动态基础 | $500/月 | 小型 SaaS，注册用户 < 1,000 | 3 | ~$50 |
| 动态专业 | $1,000/月 | 中型平台，注册用户 < 10,000 | 10 | ~$150 |
| 动态企业 | 定制报价 | 大流量 / 高并发 / 专属服务器 | 无限 | 定制 |

Railway 实际费用超出套餐包含上限时，差额次月补收，提前邮件告知用户。

---

### 7.9 Stripe 实现结构

```typescript
// constants/plans.ts

// 拉新固定价格包（唯一固定价格产品）
export const ONBOARDING_PACK = {
  priceId: 'price_xxx',
  amount: 900,              // $9，固定
  cloneType: 'static_single',
  description: '新用户首次体验，仅限静态单页克隆',
};

// 月度订阅（折扣套餐）
export const MONTHLY_PLANS = {
  lite:  { priceId: 'price_xxx', monthlyFee: 2900,  multiplier: 4.0 },
  pro:   { priceId: 'price_xxx', monthlyFee: 9900,  multiplier: 3.5 },
  team:  { priceId: 'price_xxx', monthlyFee: 29900, multiplier: 3.0 },
};

// 托管套餐（月订阅）
export const HOSTING_PLANS = {
  static_starter: { priceId: 'price_xxx', monthlyFee: 3000,   type: 'static',  domainsLimit: 1,  railwayBudget: 500   },
  static_growth:  { priceId: 'price_xxx', monthlyFee: 5000,   type: 'static',  domainsLimit: 3,  railwayBudget: 1000  },
  dynamic_basic:  { priceId: 'price_xxx', monthlyFee: 50000,  type: 'dynamic', domainsLimit: 3,  railwayBudget: 5000  },
  dynamic_pro:    { priceId: 'price_xxx', monthlyFee: 100000, type: 'dynamic', domainsLimit: 10, railwayBudget: 15000 },
};

// 定价系数（存数据库，代码中只做默认值参考）
export const DEFAULT_MULTIPLIERS = {
  static_single:   5.0,
  static_multi:    5.0,
  dynamic_basic:   5.0,
  dynamic_complex: 5.0,
};
```



---

## 8. 爬虫模块详细设计

### 8.1 登录墙处理（`lib/scraper/auth-handler.ts`）

#### 能力边界说明（必须在产品文档和 UI 中向用户明确告知）

| 情况 | 是否支持 | 说明 |
|------|---------|------|
| 无需登录的公开页面 | ✅ 完全支持 | 默认模式 |
| 账号 + 密码登录 | ✅ 支持 | 用户提供凭证，Playwright 自动登录 |
| 粘贴 Cookie 登录 | ✅ 支持 | 用户从浏览器复制 Cookie 字符串 |
| 短信验证码登录 | ❌ 不支持 | 需要人工介入，无法自动化 |
| Google / Apple OAuth | ❌ 不支持 | 第三方授权页无法自动化 |
| 企业 SSO / SAML | ❌ 不支持 | 复杂度过高 |
| 有 CAPTCHA 的登录页 | ❌ 不支持 | 反自动化设计 |

> **重要**：用户提供的登录凭证仅用于本次克隆任务，任务完成后立即销毁，不存储在数据库中。需在 UI 和隐私政策中明确说明。

#### 登录流程（`auth-handler.ts`）

```typescript
interface AuthCredentials {
  mode: 'password' | 'cookie';
  // mode = password
  username?: string;
  password?: string;
  loginUrl?: string;          // 登录页 URL，默认自动检测
  usernameSelector?: string;  // 登录表单用户名输入框选择器，默认自动检测
  passwordSelector?: string;  // 密码输入框选择器，默认自动检测
  submitSelector?: string;    // 提交按钮选择器，默认自动检测
  // mode = cookie
  cookieString?: string;      // 从浏览器 DevTools 复制的完整 Cookie 字符串
}

async function loginAndGetSession(page: Page, credentials: AuthCredentials): Promise<boolean> {
  if (credentials.mode === 'cookie') {
    // 直接注入 Cookie，最简单可靠
    const cookies = parseCookieString(credentials.cookieString);
    await page.context().addCookies(cookies);
    return true;
  }

  if (credentials.mode === 'password') {
    // 1. 导航到登录页（自动检测或使用用户提供的 URL）
    const loginUrl = credentials.loginUrl ?? await detectLoginUrl(page);
    await page.goto(loginUrl);

    // 2. 自动检测表单字段（用户未提供 selector 时）
    const usernameSelector = credentials.usernameSelector ?? await detectUsernameField(page);
    const passwordSelector = credentials.passwordSelector ?? await detectPasswordField(page);
    const submitSelector   = credentials.submitSelector   ?? await detectSubmitButton(page);

    // 3. 填写并提交
    await page.fill(usernameSelector, credentials.username!);
    await page.fill(passwordSelector, credentials.password!);
    await page.click(submitSelector);
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });

    // 4. 验证登录是否成功（检查是否仍在登录页）
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      throw new Error('LOGIN_FAILED: 仍在登录页，请检查账号密码是否正确');
    }
    return true;
  }
}

// 登录成功后继续正常抓取流程
async function scrapeWithAuth(url: string, credentials: AuthCredentials): Promise<ScrapeResult> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const loginSuccess = await loginAndGetSession(page, credentials);
  if (!loginSuccess) throw new Error('LOGIN_FAILED');

  // 导航到目标页面（登录后才能访问的内容）
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // 后续和普通 Playwright 抓取流程完全一致
  return await extractPageData(page);
}
```

#### 安全处理规则（开发必须遵守）

1. 凭证**绝不写入数据库**，仅在内存中使用，任务结束后随进程销毁
2. 凭证在传输时**必须走 HTTPS**，前端表单字段标记 `type="password"`
3. 任务日志中**屏蔽凭证字段**，不得出现在任何日志输出中
4. Cookie 注入后立即验证是否有效，无效则提示用户重新获取

#### UI 设计（`components/clone/AuthInput.tsx`）

新建克隆页面在输入 URL 后，显示可折叠的可选区域：

```
[ ] 此网站需要登录才能查看完整内容（展开后显示下方选项）

  登录方式：
  ● 账号 + 密码（自动登录）
  ○ 粘贴 Cookie（推荐，更稳定）

  [账号密码模式]
  账号：__________________
  密码：__________________  （type="password"）
  登录页地址：____________  （选填，留空则自动检测）

  [Cookie 模式]
  如何获取 Cookie：打开目标网站并登录 → 按 F12 → 
  Network 标签 → 任意请求 → Headers → 复制 Cookie 值
  Cookie：
  ┌────────────────────────────────────────────┐
  │ 粘贴 Cookie 字符串...                        │
  └────────────────────────────────────────────┘

  ⚠️ 凭证仅用于本次克隆，完成后立即销毁，不会被存储。
```

#### 不支持场景的处理

当用户提供了凭证但登录失败，或登录方式不在支持范围内时：

```
检测到登录失败 / 不支持的登录方式
  → 停止抓取，退回本次消耗额度
  → 向用户展示明确原因：
    "该网站使用了 Google OAuth / 短信验证码登录，
     当前版本暂不支持自动登录。
     建议改用 Cookie 模式：登录后从浏览器复制 Cookie 粘贴到此处。"
  → 提供 Cookie 获取教程链接
```
  try {
    const r = await scrapeWithFirecrawl({ url, screenshot: true, fullPage: true });
    return buildScrapeResult(r, null, 1);
  } catch { console.warn('[Scraper] Firecrawl failed, trying Playwright'); }

  try {
    const r = await scrapeWithPlaywright({ url, interceptNetwork: true, proxy: getDecodoProxy() });
    return buildScrapeResult(null, r, 2);
  } catch { console.warn('[Scraper] Playwright failed, AI-only mode'); }

  return { url, html: '', markdown: '', screenshot: '', scraperLayer: 3, partial: true };
}
```

**Firecrawl 接口**：
```typescript
async function scrapeWithFirecrawl(opts: { url: string; screenshot?: boolean; fullPage?: boolean; waitFor?: number }): Promise<{ html: string; markdown: string; screenshot?: string; metadata: object }>
```

**Playwright 接口**：
```typescript
async function scrapeWithPlaywright(opts: { url: string; interceptNetwork?: boolean; viewport?: object; proxy?: object }): Promise<{ html: string; screenshot: string; networkRequests: object[] }>
```

---

## 9. AI 分析与代码生成流程

所有 Prompt 集中在 `lib/claude/prompts.ts`，禁止在其他文件直接拼接 Prompt 字符串。

**页面结构分析 Prompt 核心要求**：输出 JSON，包含 blocks（区块列表）、colorTheme、fontFamily、detectedServices、complexity。

**组件生成 Prompt 核心要求**：TypeScript + Tailwind CSS，响应式移动端优先，不引入外部 UI 库，只输出代码。

**调用流程**：

```
ScrapeResult
  → [1次] 页面结构分析（输出区块列表 + 服务 + 颜色）
  → [并行，最大5个] 每区块独立生成组件（附区域截图 crop）
  → [模板] 识别到的第三方服务直接生成接入代码（不走 Claude API）
  → [可选] i18n 翻译
  → [组装] 打包成完整 Next.js 项目，上传 R2
```

---

## 10. AI 智能补全机制

> **核心原则**：爬虫拿到多少就用多少，拿不到的部分 AI 必须尽力补全，绝不留空白模块交付给用户。最终交付物必须是一个完整可运行的网站，而不是一个有洞的半成品。

---

### 10.1 补全触发条件

以下任意情况触发 AI 补全流程：

| 触发条件 | 说明 |
|---------|------|
| 爬虫层3降级 | Firecrawl 和 Playwright 均失败，仅有部分截图和 HTML 片段 |
| 模块内容为空 | 某个识别出的区块 HTML 为空或仅有占位符 |
| 动态数据缺失 | 区块依赖实时 API 数据（如图表、列表），爬到的是 loading 状态 |
| 第三方服务黑盒 | 识别出使用了某服务，但具体接口和配置无法获取 |
| 登录墙阻断 | 部分页面在登录后才显示，且用户未提供凭证 |
| 强反爬拦截 | Cloudflare 等拦截导致关键区块内容缺失 |

---

### 10.2 补全层级与策略

补全分三个层级，由浅到深依次执行：

#### 第一层：视觉补全（最优先，成功率最高）

即使爬不到数据，截图几乎总能拿到。AI 根据截图重建视觉结构：

```
截图 → Claude Vision 分析 →
  识别：布局结构 / 颜色主题 / 字体风格 / 间距比例 / 组件类型
  生成：视觉高度还原的 React 组件（Tailwind CSS）
  填入：合理的占位内容（Mock 文案 / 占位图）
```

**适用场景**：任何有截图的情况，这是兜底保障。

#### 第二层：功能逻辑补全

AI 根据页面语义和常见模式推断并实现交互逻辑：

```
识别到「搜索框」但无接口 →
  生成前端本地搜索逻辑（对静态数据过滤）
  + 注释说明：如需对接真实搜索，推荐接入 Algolia

识别到「数据图表」但无数据接口 →
  生成完整图表组件（Recharts）
  + 内置 Mock 数据（格式与原站一致）
  + 注释：替换 mockData 为真实 API 返回值即可

识别到「评论区」但无后端 →
  生成静态评论展示组件
  + 提示：如需真实评论功能，推荐接入 Giscus / Disqus
```

#### 第三层：第三方服务补全（最关键）

识别到使用了第三方服务但无法获取配置时，AI 生成完整接入代码 + 申请指引。详见 10.3 节。

---

### 10.3 第三方服务补全详细规则

这是补全机制中最重要的部分。每个识别出的第三方服务，必须输出以下四项内容，缺一不可：

1. **完整可运行的接入代码**（含组件、配置、环境变量引用）
2. **申请入口**（官网直链）
3. **需要哪些 Key / 配置项**（明确列出变量名）
4. **大致费用说明**（免费额度 / 收费标准）

#### 支持自动补全的第三方服务清单（`constants/third-party-signatures.ts`）

| 服务类型 | 服务名 | 申请地址 | 所需配置 | 免费额度 |
|---------|------|---------|---------|---------|
| **支付** | Stripe | stripe.com/register | `STRIPE_SECRET_KEY` `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 无月费，按交易收 2.9%+30¢ |
| **支付** | Paddle | paddle.com | `PADDLE_VENDOR_ID` `PADDLE_API_KEY` | 无月费，按交易收 5%+50¢ |
| **用户认证** | Clerk | clerk.com | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` `CLERK_SECRET_KEY` | 免费 1 万月活 |
| **用户认证** | Auth0 | auth0.com | `AUTH0_SECRET` `AUTH0_BASE_URL` `AUTH0_ISSUER_BASE_URL` `AUTH0_CLIENT_ID` `AUTH0_CLIENT_SECRET` | 免费 7,500 月活 |
| **用户认证** | Supabase Auth | supabase.com | `NEXT_PUBLIC_SUPABASE_URL` `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 免费 5 万月活 |
| **地图** | Google Maps | console.cloud.google.com | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | 每月 $200 免费额度 |
| **地图** | Mapbox | mapbox.com | `NEXT_PUBLIC_MAPBOX_TOKEN` | 每月 5 万次免费 |
| **搜索** | Algolia | algolia.com | `NEXT_PUBLIC_ALGOLIA_APP_ID` `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY` `ALGOLIA_ADMIN_KEY` | 免费 1 万条记录 |
| **评论** | Giscus | giscus.app | `NEXT_PUBLIC_GISCUS_REPO` `NEXT_PUBLIC_GISCUS_REPO_ID` | 完全免费（基于 GitHub） |
| **评论** | Disqus | disqus.com | `NEXT_PUBLIC_DISQUS_SHORTNAME` | 免费（含广告） |
| **客服** | Intercom | intercom.com | `NEXT_PUBLIC_INTERCOM_APP_ID` | 免费 14 天，后 $74/月起 |
| **客服** | Crisp | crisp.chat | `NEXT_PUBLIC_CRISP_WEBSITE_ID` | 免费基础版 |
| **客服** | Tawk.to | tawk.to | `NEXT_PUBLIC_TAWK_PROPERTY_ID` `NEXT_PUBLIC_TAWK_WIDGET_ID` | 完全免费 |
| **数据分析** | Google Analytics 4 | analytics.google.com | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | 完全免费 |
| **数据分析** | Mixpanel | mixpanel.com | `NEXT_PUBLIC_MIXPANEL_TOKEN` | 免费 2 万月活 |
| **数据分析** | Posthog | posthog.com | `NEXT_PUBLIC_POSTHOG_KEY` `NEXT_PUBLIC_POSTHOG_HOST` | 免费 100 万事件/月 |
| **邮件订阅** | Mailchimp | mailchimp.com | `MAILCHIMP_API_KEY` `MAILCHIMP_LIST_ID` | 免费 500 订阅者 |
| **邮件订阅** | ConvertKit | convertkit.com | `CONVERTKIT_API_KEY` `CONVERTKIT_FORM_ID` | 免费 1000 订阅者 |
| **邮件发送** | Resend | resend.com | `RESEND_API_KEY` | 免费 3000 封/月 |
| **邮件发送** | SendGrid | sendgrid.com | `SENDGRID_API_KEY` | 免费 100 封/天 |
| **视频** | YouTube Embed | — | 无需 Key | 完全免费 |
| **视频** | Vimeo | vimeo.com | `NEXT_PUBLIC_VIMEO_ACCESS_TOKEN` | 免费基础版 |
| **数据库** | Supabase | supabase.com | `SUPABASE_URL` `SUPABASE_SERVICE_ROLE_KEY` | 免费 500MB |
| **数据库** | PlanetScale | planetscale.com | `DATABASE_URL` | 免费 5GB |
| **文件上传** | Uploadthing | uploadthing.com | `UPLOADTHING_SECRET` `UPLOADTHING_APP_ID` | 免费 2GB |
| **文件上传** | Cloudinary | cloudinary.com | `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | 免费 25GB |

> **扩充原则**：特征库随产品迭代持续扩充，目标第三阶段达到 50+ 个服务。新服务发现时优先补充此表。

---

### 10.4 生成代码规范

每个第三方服务补全时，`fallback-generator.ts` 必须按以下模板生成，确保用户看到清晰的指引：

```typescript
// 示例：Stripe 支付补全输出
// ============================================================
// ⚡ 检测到：Stripe 支付系统
// 状态：已生成接入代码（需填写你的 API Key 后生效）
//
// 📋 申请步骤：
//   1. 访问 https://stripe.com/register 注册账号
//   2. 进入 Dashboard → Developers → API Keys
//   3. 复制 Publishable key 和 Secret key
//
// 🔑 需要配置的环境变量（填入 .env.local）：
//   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
//   STRIPE_SECRET_KEY=sk_live_xxx
//
// 💰 费用说明：
//   无月费，按交易收取 2.9% + $0.30（国际卡略高）
//   测试环境使用 pk_test_xxx / sk_test_xxx，完全免费
// ============================================================

'use client';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutButton({ priceId }: { priceId: string }) {
  const handleCheckout = async () => {
    const stripe = await stripePromise;
    const res = await fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    });
    const { sessionId } = await res.json();
    await stripe?.redirectToCheckout({ sessionId });
  };
  return (
    <button onClick={handleCheckout} className="...">
      立即购买
    </button>
  );
}
```

---

### 10.5 质量报告中的补全透明度

克隆完成后，质量报告必须清楚区分三类内容，让用户知道哪些是还原的、哪些是 AI 补全的：

```
质量报告结构：
┌─────────────────────────────────────────────────────┐
│  视觉还原度：87 分                                    │
├─────────────────────────────────────────────────────┤
│  ✅ 直接还原（爬取成功）          共 6 个模块          │
│     Navbar / Hero / Features / Pricing / FAQ / Footer │
│                                                      │
│  🤖 AI 视觉补全（截图重建）       共 2 个模块          │
│     Dashboard 图表区（动态数据用 Mock 替代）           │
│     用户评论区（静态展示，无实时数据）                  │
│                                                      │
│  🔑 第三方服务（需配置 API Key）  共 3 个服务          │
│     ⚡ Stripe 支付    → 查看申请指引                   │
│     📊 Google Analytics → 查看申请指引                │
│     💬 Intercom 客服  → 查看申请指引                  │
│                                                      │
│  ⚠️  无法补全（已跳过）           共 0 个模块          │
└─────────────────────────────────────────────────────┘
```

**原则**：「无法补全」这一项在正常情况下应该为 0。只有极少数情况（如加密接口、WebSocket 实时流）才允许出现，且必须附带说明原因。

---

### 10.6 补全边界说明（产品文档和 UI 中必须向用户说明）

| 场景 | AI 处理方式 | 用户需要做什么 |
|------|-----------|-------------|
| 官网 / 营销页 | ✅ 完整还原，成功率 90%+ | 无需操作 |
| 含用户后台（有登录）| ✅ 还原 + 补全，提供凭证后成功率 80%+ | 在内嵌浏览器完成登录 |
| 实时数据图表 | 🤖 生成图表组件 + Mock 数据 | 替换为真实 API |
| 第三方支付/登录 | 🤖 生成完整接入代码 + 申请指引 | 申请 Key 填入 .env |
| 强加密 SPA 接口 | 🤖 生成功能壳 + Mock 数据 + 说明 | 对接自有后端 API |
| WebSocket 实时流 | 🤖 生成静态快照 + 提示说明 | 自行接入 WS 服务 |
| 原生 APP 界面 | ❌ 不支持（第四阶段规划）| 等待 APP 克隆功能 |

---

## 11. 管理后台自动生成机制

> 当克隆目标是含有用户系统、数据管理、内容发布等功能的动态网站时，AI 在生成前端代码的同时，自动推断并生成一套完整的 `/admin` 管理后台。用户无需另行开发，克隆交付物包含前台 + 后台两套完整系统。

---

### 11.1 推断逻辑：从前端功能反推后台需求

AI 分析前端页面时，同步运行后台需求推断，规则如下：

| 前端检测到的功能 | 推断出的后台模块 | 生成内容 |
|--------------|--------------|---------|
| 用户注册/登录/个人页 | 用户管理 | 用户列表、搜索过滤、封禁/解封、编辑资料、查看登录记录 |
| 商品/产品展示页 | 商品管理 | 商品 CRUD、图片上传、分类管理、上下架、库存编辑 |
| 订单状态/购买记录 | 订单管理 | 订单列表、状态流转、退款操作、导出 CSV |
| 博客/文章/内容页 | 内容管理（CMS）| 富文本编辑器、草稿/发布/下线、分类标签管理 |
| 评论区/留言板 | 评论审核 | 评论列表、通过/拒绝/删除、垃圾评论过滤 |
| 价格/套餐展示 | 定价管理 | 套餐 CRUD、价格修改、限时折扣配置 |
| 数据图表/统计页 | 数据概览 | 关键指标看板（用户数/收入/订单量）、趋势图 |
| 权限/角色设置 | 权限管理 | 角色 CRUD、权限分配、管理员账号管理 |
| 通知/消息中心 | 消息管理 | 系统通知发送、消息模板编辑 |
| 配置/设置页 | 系统设置 | 站点信息、SEO 配置、第三方 API Key 管理 |

---

### 11.2 生成产物结构

管理后台作为独立路由生成在 `/admin` 下，与前台完全隔离：

```
generated-site/
├── app/
│   ├── (frontend)/          # 用户前台（克隆还原的页面）
│   │   └── ...
│   └── (admin)/             # 管理后台（AI 自动生成）
│       ├── layout.tsx        # 后台布局（侧边栏 + 顶栏）
│       ├── login/
│       │   └── page.tsx      # 管理员登录（独立账号体系）
│       ├── dashboard/
│       │   └── page.tsx      # 数据概览看板
│       ├── users/
│       │   ├── page.tsx      # 用户列表
│       │   └── [id]/page.tsx # 用户详情 + 操作
│       ├── orders/
│       │   ├── page.tsx      # 订单列表
│       │   └── [id]/page.tsx # 订单详情 + 状态操作
│       ├── content/
│       │   ├── page.tsx      # 内容列表
│       │   └── editor/page.tsx # 富文本编辑器
│       ├── products/
│       │   └── ...           # 按实际检测结果生成
│       └── settings/
│           └── page.tsx      # 系统设置
│
├── lib/
│   └── admin/
│       ├── auth.ts           # 管理员鉴权中间件
│       ├── permissions.ts    # 权限控制
│       └── data/             # 各模块数据操作封装
│
└── README-admin.md           # 管理后台使用说明 + 首次登录指引
```

---

### 11.3 技术实现规范

**鉴权**：管理后台使用独立的管理员账号体系，与前台用户账号完全隔离。首次部署自动生成一个随机强密码的默认管理员账号，输出在 `README-admin.md` 中。

**数据层**：复用前台的 Supabase 数据库，后台直接操作相同的数据表，通过 Supabase Row Level Security 区分普通用户和管理员权限。

**UI 风格**：后台使用统一的简洁管理风格（深色侧边栏 + 白色主区域），不需要还原原网站的设计风格，保持功能性优先。

**代码生成 Prompt 额外要求**：

```
管理后台组件生成时，Prompt 需额外包含：
- 所有列表页必须包含：搜索框、分页、筛选器、批量操作
- 所有表单必须包含：输入验证、提交状态、错误提示
- 所有危险操作（删除/封禁）必须有二次确认弹窗
- 数据表格必须支持列排序
- 移动端响应式（管理员可能用手机操作）
```

---

### 11.4 质量报告中的后台说明

克隆完成后，质量报告新增「管理后台」板块：

```
┌─────────────────────────────────────────────────┐
│  🛠️ 管理后台（自动生成）                          │
│                                                  │
│  ✅ 已生成模块（5 个）：                           │
│     用户管理 / 订单管理 / 内容管理 / 定价管理 / 设置  │
│                                                  │
│  ℹ️  访问地址：yoursite.com/admin                 │
│  ℹ️  默认账号：见 README-admin.md                 │
│                                                  │
│  ⚠️  首次使用请立即修改默认密码                    │
└─────────────────────────────────────────────────┘
```

---

## 12. 自动化测试流程

**Docker 测试容器**（`docker/Dockerfile.test`）：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s CMD wget -q http://localhost:3000 || exit 1
CMD ["npm", "run", "start"]
```

**测试调度器**（`lib/tester/index.ts`）：

```typescript
async function runTests(projectPath: string, originalUrl: string): Promise<TestResult> {
  const containerId = await startContainer(projectPath);
  try {
    await waitForReady('http://localhost:3000', { timeout: 60000 });
    const [visualScore, codeErrors] = await Promise.all([
      compareScreenshots(originalUrl, 'http://localhost:3000'),
      validateCode(projectPath),
    ]);
    return { passed: visualScore >= 75 && codeErrors.length === 0, visualScore, codeErrors, report: generateReport(visualScore, codeErrors) };
  } finally {
    await stopContainer(containerId);
  }
}
```

---

## 13. 数据库表结构

### `profiles`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 关联 auth.users.id |
| email | text | |
| credits | integer | 当前剩余额度 |
| credits_expire_at | timestamptz | 额度过期时间（null=永久）|
| stripe_customer_id | text | |
| preferred_language | text | zh / en |
| created_at | timestamptz | |

### `clone_tasks`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | |
| clone_type | text | **web / app**（第四阶段预留）|
| target_url | text | 目标网站 URL（web 类型）|
| app_upload_url | text | APK/截图地址（app 类型，第四阶段）|
| app_analyze_mode | text | screenshot / apk / traffic（第四阶段）|
| complexity | text | static_single / static_multi / dynamic_basic / dynamic_complex |
| credits_used | integer | 本次消耗额度数 |
| status | text | queued / scraping / analyzing / generating / testing / done / failed / reviewing |
| delivery_mode | text | download / hosting |
| target_language | text | original / zh / en |
| scraper_layer | integer | 1 / 2 / 3 |
| scrape_result | jsonb | |
| analysis_result | jsonb | |
| quality_score | integer | 0-100 |
| retry_count | integer | |
| download_url | text | R2 预签名 URL |
| preview_url | text | |
| error_message | text | 面向用户的失败原因 |
| created_at | timestamptz | |
| completed_at | timestamptz | |

### `hosted_sites`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | |
| clone_task_id | uuid | |
| github_repo_url | text | GitHub 私有仓库地址 |
| github_repo_name | text | |
| railway_project_id | text | |
| railway_service_id | text | |
| railway_deployment_url | text | 默认访问地址 |
| custom_domain | text | 用户自定义域名 |
| domain_verified | boolean | |
| hosting_plan | text | static_starter / static_growth / dynamic_basic / dynamic_pro |
| stripe_subscription_id | text | |
| status | text | deploying / active / suspended / cancelled |
| railway_budget_used | integer | 本月已用 Railway 费用（美分）|
| created_at | timestamptz | |
| suspended_at | timestamptz | |

### `billing_events`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | |
| event_type | text | credit_purchase / credit_refund / hosting_charge / railway_overage / manual_refund |
| amount | integer | 金额（美分）|
| credits_delta | integer | 额度变化 |
| stripe_payment_intent_id | text | |
| stripe_invoice_id | text | |
| related_task_id | uuid | |
| related_site_id | uuid | |
| metadata | jsonb | |
| created_at | timestamptz | |

---

## 14. API 路由设计

### POST `/api/clone/detect-complexity`
检测复杂度，返回消耗额度数，用户确认后才正式开始克隆。

Request: `{ "url": "https://example.com" }`
Response: `{ "complexity": "dynamic_basic", "creditsRequired": 5, "userCreditsBalance": 20, "canProceed": true, "detectedFeatures": ["login_system","dashboard"] }`

### POST `/api/clone/create`
Request:
```json
{
  "url": "https://example.com",
  "cloneType": "web",
  "deliveryMode": "download",
  "targetLanguage": "en",
  "complexity": "dynamic_basic",
  "auth": {
    "mode": "password",
    "username": "user@example.com",
    "password": "••••••••",
    "loginUrl": "https://example.com/login"
  }
}
```
> `auth` 字段为可选。凭证**仅在内存中使用**，不写入数据库，不出现在日志中。

Response: `{ "taskId": "uuid", "status": "queued", "creditsDeducted": 5, "estimatedMinutes": 10 }`

### GET `/api/clone/[id]/status`
前端每 3 秒轮询。
Response: `{ "taskId": "uuid", "status": "generating", "progress": 60, "currentStep": "正在生成代码...", "qualityScore": null, "downloadUrl": null, "retryCount": 0 }`

### GET `/api/clone/[id]/download`
返回预签名 R2 URL，有效期 1 小时。

### POST `/api/hosting/deploy`
Request: `{ "taskId": "uuid", "hostingPlan": "static_starter", "envVars": { "NEXT_PUBLIC_STRIPE_KEY": "pk_xxx" } }`
Response: `{ "siteId": "uuid", "status": "deploying", "githubRepoUrl": "...", "railwayProjectId": "..." }`

### GET `/api/hosting/[siteId]/status`
Response: `{ "status": "active", "deploymentUrl": "https://xxx.up.railway.app", "customDomain": "www.mysite.com", "domainVerified": true, "railwayBudgetUsed": 1200, "railwayBudgetLimit": 5000 }`

### POST `/api/hosting/[siteId]/domain`
Request: `{ "domain": "www.mysite.com" }`
Response: `{ "cnameTarget": "xxx.up.railway.app", "verificationStatus": "pending", "instructions": "将 CNAME 指向 xxx.up.railway.app" }`

### POST `/api/stripe/checkout`
Request: `{ "type": "credit_pack", "plan": "growth" }`

### POST `/api/stripe/webhook`

| 事件 | 处理 |
|------|------|
| `checkout.session.completed` | 更新 profiles.credits |
| `invoice.payment_succeeded` | 确认托管续费，记录 billing_events |
| `invoice.payment_failed` | 发送欠费提醒邮件 |
| `customer.subscription.deleted` | 暂停 Railway 项目 |

---

## 15. 环境变量

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude API
ANTHROPIC_API_KEY=

# 爬虫服务
FIRECRAWL_API_KEY=
DECODO_API_KEY=
DECODO_USERNAME=
DECODO_PASSWORD=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET_NAME=

# GitHub（托管基础设施）
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_ORG_NAME=

# Railway（托管基础设施）
RAILWAY_API_TOKEN=
RAILWAY_TEAM_ID=

# 平台域名
NEXT_PUBLIC_APP_URL=https://webecho.ai

# 第四阶段新增（APP 克隆，暂时留空）
# APKTOOL_PATH=/usr/local/bin/apktool
# MITMPROXY_HOST=
# MITMPROXY_PORT=8080
# ANDROID_EMULATOR_IMAGE=
```

---

## 16. 平台方管理后台

> 这是**平台运营者（你）**使用的后台，与用户克隆生成的管理后台完全不同。访问地址：`webecho.ai/platform-admin`，独立账号体系，不对外开放。

---

### 15.1 核心功能模块

#### A. 定价与利润控制台（最高优先级）

这是平台管理后台最核心的功能，允许你实时调整每类任务的利润率系数：

```
┌─────────────────────────────────────────────────────────┐
│  💰 定价控制台                          实时生效，无需重启  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  全局利润率系数                                           │
│  ┌──────────────────────────────────────────────┐       │
│  │  × 3.5   [────────●──────────────] 1x ~ 10x  │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
│  按复杂度差异化系数                                        │
│  静态单页    × 4.0  [──────●────────]                    │
│  静态多页    × 3.8  [─────●─────────]                    │
│  动态基础    × 3.5  [────●──────────]                    │
│  动态复杂    × 3.2  [───●───────────]                    │
│                                                          │
│  价格保底    $1.50  最高定价  $30.00                       │
│                                                          │
│  预览（当前设置下的价格范围）：                              │
│  静态单页：$0.80成本 → 用户付 $3.20  利润率 75%           │
│  动态基础：$2.10成本 → 用户付 $7.35  利润率 71%           │
│                                                          │
│  [ 保存并立即生效 ]  [ 恢复默认值 ]                        │
└─────────────────────────────────────────────────────────┘
```

**实现机制**：配置存储在 `platform_config` 表，`pricing-engine.ts` 每次计算价格时实时读取，修改立即对新任务生效，历史任务不受影响。

---

#### B. 任务总览与成本监控

实时查看所有克隆任务的成本、收入、利润明细：

| 功能 | 说明 |
|------|------|
| 任务列表 | 所有用户的任务，含状态/成本/收入/利润/利润率 |
| 成本拆分 | 每个任务的 Token 用量、爬虫费用、基础设施费用明细 |
| 异常任务 | 成本异常高的任务标红预警（如 Token 超限） |
| 利润看板 | 今日/本周/本月收入、成本、利润、利润率趋势图 |
| Token 用量 | Claude API 每日 Token 消耗趋势，预测月度 API 账单 |

---

#### C. 用户管理

| 功能 | 说明 |
|------|------|
| 用户列表 | 注册时间、任务数、消费金额、当前余额 |
| 用户详情 | 完整任务历史、支付记录、余额变动日志 |
| 手动充值 | 给指定用户补充余额（处理投诉/补偿用） |
| 封禁账号 | 封禁滥用用户，自动退款未使用余额 |
| 导出数据 | 导出用户列表 CSV |

---

#### D. 系统配置

| 配置项 | 说明 |
|------|------|
| 全局开关 | 一键暂停新任务接入（维护模式） |
| 任务并发上限 | 限制同时运行的克隆任务数量（控制服务器负载） |
| 免费试用配置 | 新用户是否赠送试用次数、赠送金额 |
| 第三方服务特征库 | 在线编辑 `third-party-signatures.ts` 内容，无需重新部署 |
| 公告/Banner | 在用户首页显示公告（维护通知/新功能上线等） |
| Claude 模型切换 | 在 Sonnet / Haiku / Opus 之间切换（平衡成本与质量）|

---

#### E. 财务报表

| 报表 | 说明 |
|------|------|
| 收入报表 | 按日/周/月的收入、退款、净收入 |
| 成本报表 | Claude API / Firecrawl / Railway 等各项成本分项 |
| 利润报表 | 毛利润、利润率趋势，支持导出 |
| Stripe 对账 | Stripe 收款记录与平台记录自动核对 |

---

### 15.2 文件结构

```
app/
└── (platform-admin)/
    ├── layout.tsx                    # 平台后台布局（与用户后台完全隔离）
    ├── login/page.tsx                # 平台管理员登录
    ├── pricing/page.tsx              # 💰 定价控制台（核心）
    ├── tasks/
    │   ├── page.tsx                  # 任务总览
    │   └── [taskId]/page.tsx         # 任务成本详情
    ├── users/
    │   ├── page.tsx                  # 用户管理
    │   └── [userId]/page.tsx         # 用户详情
    ├── finance/page.tsx              # 财务报表
    ├── config/
    │   ├── page.tsx                  # 系统配置
    │   └── signatures/page.tsx       # 第三方服务特征库编辑
    └── dashboard/page.tsx            # 运营概览首页

lib/
└── platform-admin/
    ├── auth.ts                       # 平台管理员鉴权（独立于用户体系）
    ├── pricing-config.ts             # 读写 platform_config 表
    ├── cost-analytics.ts             # 成本聚合查询
    └── finance-reports.ts            # 财务报表生成
```

---

### 15.3 数据库新增表

#### `platform_config`

| 字段 | 类型 | 说明 |
|------|------|------|
| key | text | 配置键（唯一）|
| value | jsonb | 配置值 |
| updated_by | text | 操作的管理员账号 |
| updated_at | timestamptz | 最后更新时间 |

关键配置项（`key` 值）：

```
pricing.profitMultiplier           → 全局利润率系数
pricing.multiplierByComplexity     → 按复杂度差异化系数对象
pricing.minPriceCents              → 最低定价
pricing.maxPriceCents              → 最高定价
system.maxConcurrentTasks          → 最大并发任务数
system.maintenanceMode             → 维护模式开关
system.newUserTrialCents           → 新用户赠送金额（美分）
claude.model                       → 当前使用的 Claude 模型
```

#### `platform_admins`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| email | text | 管理员邮箱 |
| password_hash | text | bcrypt 哈希 |
| role | text | super_admin / finance / ops |
| last_login_at | timestamptz | |
| created_at | timestamptz | |

#### `task_costs`（每个克隆任务的成本明细）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| task_id | uuid | 关联 clone_tasks.id |
| firecrawl_cost_cents | integer | |
| decodo_cost_cents | integer | |
| playwright_cost_cents | integer | |
| claude_input_tokens | integer | |
| claude_output_tokens | integer | |
| claude_input_cost_cents | integer | |
| claude_output_cost_cents | integer | |
| docker_cost_cents | integer | |
| r2_cost_cents | integer | |
| total_cost_cents | integer | 实际总成本 |
| charged_cents | integer | 向用户收取的金额 |
| profit_cents | integer | 本次利润 |
| profit_multiplier | numeric | 计算时使用的利润率系数（快照） |
| calculated_at | timestamptz | |

---

### 15.4 安全要求

- 平台管理后台路由必须配置独立的 Middleware 鉴权，与用户 Session 完全隔离
- 管理员登录必须支持 TOTP 双因素认证
- 所有配置修改操作写入操作日志，不可删除
- 定价控制台的修改记录必须保留完整历史，支持回滚到任意历史配置

---

## 17. 开发阶段规划

### 第一阶段：MVP（第 1-4 周）

**目标**：跑通核心链路，获得第一个付费用户。

- [x] Supabase 初始化 + 用户认证
- [x] 首页 Landing Page
- [x] 复杂度检测接口（简化版）
- [x] Firecrawl 爬虫接入（层1）
- [x] Claude API 接入（页面结构分析 + 基础组件生成）
- [x] 代码包打包 + 下载功能（本地 zip，R2 已接入）
- [x] Docker 测试容器基础版
- [x] 任务进度实时展示（前端轮询）
- [x] Stripe 支付接入（checkout + verify-session + webhook）
- [x] **`clone-worker.ts` 按 cloneType 分支结构搭好（app 分支为空壳）**
- [x] **`lib/app-scraper/` 和 `lib/app-generator/` 目录建好（文件内容为空）**

**暂缓**：托管功能、Playwright、多语言、降级策略

---

### 第二阶段：完善爬虫 + 上线托管（第 5-10 周）

**目标**：爬取成功率 > 80%，托管收入上线。

- [ ] Playwright 接入（层2）+ Decodo 代理配置
- [ ] Network 请求拦截 + 第三方服务识别（首批 10 个）
- [x] 降级代码生成模板（首批：Stripe pricing/cta/form，其余待扩充）
- [ ] GitHub API 集成（创建仓库、推送代码）
- [ ] Railway API 集成（创建项目、部署）
- [ ] 自定义域名绑定 + DNS 验证
- [ ] Stripe 订阅计费（托管月费）
- [ ] 自动修复循环（最多 3 次）
- [ ] 失败退款逻辑（额度退回）
- [ ] 邮件通知系统

---

### 第三阶段：规模化（第 11-16 周）

**目标**：MRR $5,000+，NPS > 40。

- [ ] 中英文双语界面（i18n）
- [ ] 多语言输出（中英互转）
- [ ] 用户控制台完善（流量图表、账单、Railway 状态同步）
- [ ] 第三方服务特征库扩充（目标 50 个）
- [ ] 降级模板扩充（目标 15 种）
- [ ] 企业版 API 接入
- [ ] SEO 优化 + 内容营销
- [ ] 欠费预警 + Railway 超额提醒邮件
- [ ] 用户推荐计划（Referral）

---

## 18. 第四阶段：APP 克隆扩展规划

> **启动条件**：网站克隆业务稳定，MRR 达到 $10,000+。  
> **架构已预留**：`clone-worker.ts` 的 `app` 分支、`lib/app-scraper/`、`lib/app-generator/` 目录在第一阶段已建好，第四阶段直接填充内容。

### 14.1 产品定位

用户上传 APP 截图或 Android APK，平台分析界面结构，生成 React Native / Expo 代码。

**明确不做**：iOS IPA 分析、完整功能逆向  
**主打**：界面视觉还原 + 基础交互逻辑

### 14.2 三种处理模式

**模式一：截图还原（最快实现，第四阶段 MVP）**

```
用户上传多张 APP 截图
  → [screenshot-analyzer.ts] Claude Vision 分析界面结构（导航栏/列表/卡片/表单/按钮）
  → [rn-component-generator.ts] 生成 React Native 组件（Expo 框架）
  → 打包 Expo 项目，用户下载后 Expo Go 直接预览
```

**模式二：APK 完整分析（质量更高）**

```
用户上传 Android APK
  → [apk-analyzer.ts] apktool 反编译
    提取 res/layout/*.xml 布局文件
    提取 res/drawable/* 图标图片
    提取 strings.xml 文案
  → Claude API 分析布局 XML → 映射到 React Native 组件
  → 生成含真实资源的 Expo 项目
```

**模式三：流量抓包还原 API（功能最完整，后期）**

```
平台云端 Android 模拟器运行 APK
  → [traffic-capture.ts] mitmproxy 拦截所有网络请求
    整理 API 接口列表（URL / Method / 请求体 / 响应结构）
  → Claude API 生成：API 调用代码 + TypeScript 类型定义 + Mock Data
  → 用户拿到完整前端代码 + API 接口文档
```

### 14.3 收费方案（复用现有额度体系）

APP 克隆复用现有额度包，无需新建套餐：

| 处理模式 | 消耗额度 |
|---------|---------|
| 截图还原（模式一）| 3 额度/次 |
| APK 完整分析（模式二）| 8 额度/次 |
| APK + API 还原（模式三）| 20 额度/次 |

### 14.4 数据库字段（第一阶段建表时预留）

`clone_tasks` 表中以下字段在第一阶段建表时一起创建（值为 null，第四阶段启用）：

| 字段 | 类型 | 说明 |
|------|------|------|
| app_upload_url | text | 用户上传的 APK/截图 R2 地址 |
| app_analyze_mode | text | screenshot / apk / traffic |
| app_platform | text | android（暂只支持 Android）|

### 14.5 开发里程碑

- [ ] **Week 1-2**：`screenshot-analyzer.ts` + `rn-component-generator.ts`，跑通模式一完整流程
- [ ] **Week 3-4**：前端 `AppUploader.tsx` 上线，`CloneTypeSelector.tsx` 中 APP 选项从灰显改为可用
- [ ] **Week 5-6**：APK 上传 + apktool 反编译流水线，跑通模式二
- [ ] **Week 7-8**：Android 模拟器 Docker 容器 + mitmproxy 接入，跑通模式三
- [ ] **Week 9-10**：APP 克隆质量评分体系，公测上线

---

*文档结束。*  
*本文件保存为项目根目录 `PROJECT.md`。*  
*Claude Code 每次开发新功能前必须先阅读本文档。版本更新时同步修改顶部版本号和日期。*
