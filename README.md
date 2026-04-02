# WebEcho AI — AI 一键克隆网站平台

基于项目描述和参考 UI 生成的 WebEcho AI 克隆平台前端。中英双语字体支持。

## 可视化预览（推荐，无需安装）

**直接双击打开** `preview/index.html` 即可在浏览器中查看所有页面，无需启动服务器、无需端口。

```
webechoai/preview/
├── index.html           ← 首页（从这里开始）
├── dev-nav.html         开发用导航（仅开发阶段）
├── 02-new-clone.html    新建克隆
├── 03-clone-progress.html 克隆进度
├── 04-clone-result.html 克隆结果
├── 05-dashboard.html    控制台
└── 06-pricing.html      定价
```

## 技术栈

- **框架**: Next.js 16 (App Router)
- **样式**: Tailwind CSS
- **语言**: TypeScript

## 页面结构

| 路由 | 说明 |
|------|------|
| `/` | 首页 Landing Page |
| `/pricing` | 定价页 |
| `/dashboard` | 控制台 |
| `/clone/new` | 新建克隆任务 |
| `/clone/[id]` | 克隆进度 |
| `/clone/[id]/result` | 克隆完成结果 |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 生产运行
npm start
```

## 项目结构

```
src/
├── app/
│   ├── (marketing)/          # 营销页（Landing、定价）
│   │   ├── layout.tsx
│   │   ├── page.tsx          # 首页
│   │   └── pricing/page.tsx
│   ├── (dashboard)/          # 控制台
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   └── clone/
│   │       ├── new/page.tsx
│   │       └── [id]/
│   │           ├── page.tsx      # 进度
│   │           └── result/page.tsx
│   ├── globals.css
│   └── layout.tsx
└── components/
    └── layout/
        ├── Navbar.tsx
        ├── Sidebar.tsx
        └── Footer.tsx
```

## 设计规范

- **主色**: `#4F7EFF` (accent)
- **背景**: `#080A0F` (bg)
- **字体**: Syne（标题）、DM Sans（正文）

## 相关文档

- [PROJECT.md](./PROJECT.md) — 项目描述与规范
- [交接文档.md](./交接文档.md) — 项目交接说明
