# 懒猫故事机 (lzc-story) —— Agent 指南

> 本文档面向 AI Coding Agent。项目的主要注释和文档语言为**中文**。修改代码时请保持中文注释和 UI 文案一致。

---

## 项目概述

**懒猫故事机**是一个为[懒猫微服](https://lazycat.cloud/)设计的移动端音频播放器 Web 应用，目标用户是老人给孩子播放故事。核心功能包括：

- 简洁的音频播放器（上一首 / 播放暂停 / 下一首 / 列表）
- 管理员密码保护（bcryptjs 哈希存储）
- 专辑管理（创建、编辑、删除，支持文件系统路径浏览）
- 自动扫描指定路径的音频文件（支持 mp3, wav, m4a, aac, flac, ogg）
- 播放历史与断点续播（每 5 秒自动保存进度）
- **老版本 WebView 兼容**：检测到 Chrome/WebView ≤ 74 时自动跳转到无 React 的简化版页面

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router), React 19 |
| 语言 | TypeScript 5 (strict: true) |
| 样式 | Tailwind CSS 4 + `@tailwindcss/postcss` |
| 数据库 | SQLite (`better-sqlite3`) |
| 图标 | `lucide-react` |
| 密码加密 | `bcryptjs` |
| 测试 | Vitest 3 (node 环境) |
| 包管理 | pnpm |

---

## 项目结构

```
src/
├── app/
│   ├── api/                    # Next.js API Routes
│   │   ├── admin-password/     # 管理员密码设置/验证
│   │   ├── albums/             # 专辑 CRUD
│   │   ├── audio-files/        # 音频文件扫描与管理
│   │   ├── audio-stream/       # 音频流服务（支持 Range 请求）
│   │   ├── device-info/        # 收集设备信息（用于版本检测）
│   │   ├── filesystem/         # 目录浏览（仅返回目录）
│   │   ├── play-history/       # 播放历史记录
│   │   └── test/               # 测试用 API
│   ├── admin/                  # 管理界面
│   ├── admin/password/         # 密码设置 / 验证页面
│   ├── home/                   # 主首页
│   ├── landing/                # 落地页：检测浏览器版本并自动跳转
│   ├── player/                 # 音频播放器页面
│   ├── simple/                 # 老版本 WebView 简化版（无 React 交互，纯内嵌 JS）
│   │   ├── layout.tsx
│   │   ├── list/page.tsx
│   │   ├── player/[albumId]/page.tsx
│   │   └── history/page.tsx
│   ├── test/                   # 本地测试页面（仅 localhost 可访问）
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 根页面（重导出 landing/page）
│   └── globals.css
├── components/                 # React 组件
│   ├── AdminInterface.tsx
│   ├── AlbumSelector.tsx
│   ├── AudioPlayer.tsx
│   ├── ClientOnly.tsx
│   ├── LazyCatIcon.tsx
│   ├── PasswordSetup.tsx
│   ├── PasswordVerify.tsx
│   └── PlayHistory.tsx
├── lib/
│   ├── api.ts                  # 缓存破坏器工具（addCacheBuster）
│   ├── sqlite-database.ts      # SQLite 封装与 DatabaseManager
│   ├── webview-detector.ts     # WebView 版本检测
│   └── __tests__/              # 测试文件
│       ├── setup.ts
│       └── sqlite-database.test.ts
├── types/
│   └── index.ts                # TypeScript 类型定义
└── middleware.ts               # 路由保护（/test localhost 限制、/admin cookie 检查）
```

---

## 构建与运行命令

```bash
# 安装依赖
pnpm install

# 开发服务器（Turbopack）
pnpm dev

# 构建生产版本（Turbopack + standalone 输出）
pnpm build

# 启动生产服务器
pnpm start

# 清理缓存与编译产物
pnpm clear
# 等价于：rm -rf .next out dist node_modules .turbo

# 代码检查
pnpm lint

# 运行测试
pnpm test          # 交互式 watch 模式
pnpm test:run      # CI 单次运行
pnpm test:ui       # Vitest UI
```

访问地址：http://localhost:3000

---

## 环境变量

在 `.env.local` 中配置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `MAX_ALBUMS` | 专辑创建上限 | `10` |
| `ADMIN_ALBUMS_PER_PAGE` | 管理界面每页专辑数 | `10` |
| `PLAY_HISTORY_INTERVAL` | 播放进度自动保存间隔（秒） | `5` |
| `DATABASE_PATH` | SQLite 数据库文件路径 | `data/lzc-story.db` |

> 注意：`next.config.ts` 中通过 `env` 字段将 `MAX_ALBUMS` 和 `ADMIN_ALBUMS_PER_PAGE` 注入构建产物，修改后需要重新构建。

---

## 代码组织约定

### 路由
- 使用 **App Router**（`src/app/`）。
- API Routes 统一放在 `src/app/api/**/route.ts`。
- `page.tsx` 是页面入口，`layout.tsx` 是布局。
- `/` 根页面实际上重导出 `landing/page`，用于版本检测与自动跳转。

### 数据库
- 核心文件：`src/lib/sqlite-database.ts`。
- 使用单例 `DatabaseManager` 类（`dbManager`）封装 CRUD。
- **构建阶段不可访问数据库**：通过 `process.env.NEXT_PHASE === 'phase-production-build'` 判断，构建时直接返回空结果或抛出错误，避免构建机尝试读写本地 SQLite。
- 数据库在首次运行时**延迟初始化**（`ensureDatabaseInitialized`）。
- 启用了 `journal_mode = WAL` 和 `foreign_keys = ON`。
- 包含迁移逻辑（`migrateDatabase`），用于为旧表追加新列（如 `audio_count`、`is_visible`、`file_size`、`duration` 等）。

### API 风格
- 全部使用 `NextRequest` / `NextResponse`。
- 错误响应统一格式：`{ error: string }`。
- 成功响应多为直接返回 JSON 数据对象或数组。

### 样式
- 使用 Tailwind CSS 4。
- `simple/` 下的页面为了兼容老版本 WebView，大量使用内嵌 `<style>` 和原生 `dangerouslySetInnerHTML` 中的 ES5 兼容 JS，**不要随意把这些页面改为现代 React 组件**。

### 类型
- 类型定义集中在 `src/types/index.ts`。
- 使用 `interface` 为主。

### 路径别名
- `@/*` 映射到 `./src/*`（同时配置在 `tsconfig.json` 和 `vitest.config.ts` 中）。

---

## 测试策略

- **测试框架**：Vitest（`globals: true`，`environment: 'node'`）。
- **测试文件位置**：`src/lib/__tests__/`。
- **当前覆盖重点**：`sqlite-database.test.ts` 对 `DatabaseManager` 的 CRUD、外键约束、并发插入、错误处理进行单元测试。
- **运行方式**：`pnpm test:run`。
- 测试使用独立的测试数据库（`data/test-lzc-story.db`），每个测试用例前后会清理。

> 目前没有前端组件测试（如 React Testing Library）。如需添加，请在 `vitest.config.ts` 中配置 `jsdom`/`happy-dom` 环境并安装对应依赖。

---

## 安全与部署

### 安全注意事项
1. **管理员密码**：使用 `bcryptjs` 哈希后存入 SQLite `admin_config` 表。首次访问需设置密码。
2. **路由保护**：
   - `/admin/*` 受 `middleware.ts` 保护，会检查 `admin_session` Cookie。未登录重定向到 `/admin/password/verify`。
   - `/test/*` 仅限 localhost 访问（通过 `x-forwarded-for` / `x-real-ip` 判断）。
3. **文件系统访问**：
   - `/api/filesystem` 只返回目录列表，但仍需确保传入的路径以 `/` 开头。
   - `/api/audio-stream` 会校验文件扩展名（只允许音频格式）。
4. **音频流传输**：支持 HTTP Range 请求，建议生产环境使用 HTTPS 以确保流媒体安全。

### Docker 部署
- **Dockerfile**：多阶段构建（`node:20-alpine`），输出 `standalone`。
- **docker-compose.yml**：暴露 3000 端口，挂载 `./data:/app/data` 和 `./music:/app/music`，带 healthcheck。
- **构建脚本**：`docker-build.sh` 支持交互式代理配置。
- 运行时环境变量：`NODE_ENV=production`、`PORT=3000`、`HOSTNAME=0.0.0.0`。

### CI/CD
- **GitHub Actions**：`.github/workflows/docker-build.yml`
  - 触发分支：`master`
  - 多架构构建：`linux/amd64`, `linux/arm64`
  - 推送到 Docker Hub：`ety001/lzc-story:latest` 和带短 SHA 的标签
  - 需要 Secrets：`DOCKER_USERNAME`、`DOCKER_PASSWORD`

---

## 给 Agent 的特别提醒

- **不要改动 `simple/` 目录下页面的实现方式**：这些页面是为 Chrome/WebView ≤ 74 准备的兼容页面，使用内嵌 `<script>` 和原生 DOM 操作。使用现代 React 语法或 Hook 会导致老版本内核无法运行。
- **修改数据库表结构后**：如果新增列，请参考 `migrateDatabase()` 的写法，在 `src/lib/sqlite-database.ts` 中添加 `ALTER TABLE` 迁移逻辑，保证旧数据库兼容。
- **构建阶段不要访问数据库**：任何在构建时执行的代码（如 `generateStaticParams`、顶层导入的立即执行代码）如果调用 `dbManager`，会导致构建失败。现有代码已通过 `NEXT_PHASE` 做了保护，修改时请保持。
- **保持中文文案**：所有面向用户的 UI 文案、注释、README 均以中文为主，提交前请检查一致性。
