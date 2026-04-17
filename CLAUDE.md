# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言规范

- 所有对话使用中文
- UI 文案、代码注释、文档均保持中文

## 项目概述

懒猫故事机 — 为懒猫微服设计的移动端音频播放器 Web 应用，面向老人给孩子播放故事。Next.js 15 App Router + React 19 + SQLite (better-sqlite3) + Tailwind CSS 4。

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发服务器 (Turbopack, localhost:3000)
pnpm build            # 生产构建 (standalone 输出)
pnpm start            # 启动生产服务器
pnpm clear            # 清理 .next/out/dist/node_modules/.cache/.turbo
pnpm lint             # ESLint 检查
pnpm test             # Vitest 交互式 watch
pnpm test:run         # Vitest 单次运行 (CI)
```

## 架构要点

### 双界面设计

- **现代版** (`src/app/player/`, `src/app/home/`): React 组件，面向现代浏览器
- **简化版** (`src/app/simple/`): 纯内嵌 ES5 JS + 原生 DOM，**专为 Chrome/WebView ≤ 74 兼容**
  - `landing/page.tsx` 自动检测浏览器版本并跳转到对应界面
- **管理界面** (`src/app/admin/`): 密码保护，middleware 做路由守卫

### 数据库 (SQLite)

- 核心封装: `src/lib/sqlite-database.ts` — 单例 `DatabaseManager`
- 启用 WAL 模式和外键约束，延迟初始化 (`ensureDatabaseInitialized`)
- **构建阶段不可访问数据库**: 通过 `process.env.NEXT_PHASE === 'phase-production-build'` 保护，修改时须保持
- 新增列须在 `migrateDatabase()` 中添加 `ALTER TABLE` 迁移逻辑

### API Routes

- 统一位于 `src/app/api/**/route.ts`
- 错误响应格式: `{ error: string }`
- `src/middleware.ts` 保护 `/test/*` (仅 localhost) 和 `/admin/*` (cookie 校验)

### 类型与路径

- 类型定义: `src/types/index.ts` (interface 为主)
- 路径别名: `@/*` → `./src/*`

## 关键约定

- **不要改动 `simple/` 目录下的实现方式** — 使用 React/Hook 会导致老版本 WebView 无法运行
- **修改数据库表结构后** — 必须在 `migrateDatabase()` 中添加迁移逻辑
- **构建时执行的代码不能调用 dbManager** — 保持 `NEXT_PHASE` 保护

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MAX_ALBUMS` | 专辑创建上限 (构建时注入) | `10` |
| `ADMIN_ALBUMS_PER_PAGE` | 管理界面每页专辑数 (构建时注入) | `10` |
| `PLAY_HISTORY_INTERVAL` | 播放进度自动保存间隔(秒) | `5` |
| `DATABASE_PATH` | SQLite 数据库路径 | `data/lzc-story.db` |

> `MAX_ALBUMS` 和 `ADMIN_ALBUMS_PER_PAGE` 通过 `next.config.ts` 注入构建产物，修改后需重新构建。
