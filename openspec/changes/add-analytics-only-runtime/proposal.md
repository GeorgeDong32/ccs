## Why

用户主要只使用 `/analytics` 页面，但当前 PM2 后台必须启动完整 Web Server，包含 auth、cliproxy-local、full API routes、shared/overview、WebSocket、auto-sync watcher、managed model prefix sync 等与 analytics 无关的后台能力。这些额外进程增加了常驻内存和启动复杂度。需要一个轻量的 analytics-only runtime，让 PM2 只运行 analytics 必需的 HTTP server，同时保持 upstream analytics 核心模块可持续同步。

## What Changes

- 新增 analytics-only 后端 runtime 入口（`src/web-server/analytics-only-server.ts`、`src/bin/analytics-only-runtime.ts`），只挂载 `/api/usage/*` routes 和 health check，不启动 full API、WebSocket、auto-sync watcher、managed model prefix sync、cliproxy-local startup。
- 新增 analytics-only 前端 shell（`ui/index.analytics.html`、`ui/src/analytics-main.tsx`、`ui/src/AnalyticsOnlyApp.tsx`），只复用 `AnalyticsPage` 和必要 providers，不 import 完整 Dashboard App、Layout/sidebar、auth context、WebSocket hook、非 analytics 页面。
- 新增 analytics-only Vite build 配置和 package scripts，支持独立 build 和 PM2 启动。
- 默认绑定 `127.0.0.1`，不做公网认证；如绑定 `0.0.0.0` 需反向代理保护。
- 复用现有 `src/web-server/usage/**` 全部模块和 `ui/src/pages/analytics/**` 页面，不复制、不 fork 核心逻辑。
- 保留 fork 的 Cursor usage 数据源（`cursor-data-store.ts`、`cursor-csv-parser.ts`、handlers）。

## Capabilities

### New Capabilities

- `analytics-runtime`: analytics-only 后端 HTTP server 和 PM2 runtime 入口，只挂载 usage API routes、health check、静态资源服务和 graceful shutdown。
- `analytics-frontend-shell`: 最小前端入口，只复用 `AnalyticsPage` 和必要 providers（QueryClient、Theme、Privacy、i18n、Toaster），排除完整 Dashboard App 的 auth/layout/WebSocket 依赖。

### Modified Capabilities

（无现有 capability 的 spec-level 行为变更。本 change 纯新增，不修改现有 full server 或完整 Dashboard 的行为。）

## Impact

- **新增文件**：`src/web-server/analytics-only-server.ts`、`src/bin/analytics-only-runtime.ts`、`ui/index.analytics.html`、`ui/src/analytics-main.tsx`、`ui/src/AnalyticsOnlyApp.tsx`，可选 `ui/vite.analytics.config.ts`。
- **修改文件**：`package.json`（新增 build/start scripts），可能涉及 `tsconfig.json` 或 build 脚本以支持 analytics-only 编译目标。
- **复用模块**：`src/web-server/usage/**`（routes、handlers、aggregator、data-aggregator、model-identity、所有 collectors）、`ui/src/pages/analytics/**`、`ui/src/hooks/use-usage.ts`。
- **不影响**：现有 `src/web-server/index.ts` 完整 server 入口和完整 Dashboard UI 行为。
- **依赖**：无新增外部依赖；复用现有 Express、Vite、React、Recharts 等。
- **Principles touched**：Principle VII（YAGNI — 只构建 analytics runtime，不做 speculative 抽象）、Principle III（Test Isolation — analytics runtime tests 必须使用 `CCS_HOME` temp dir）。
- **CLI vs Dashboard**：本 change 新增 PM2 runtime 和独立前端 shell，不涉及 CLI 命令变更。analytics-only runtime 通过 PM2 启动，不通过 `ccs config`。
