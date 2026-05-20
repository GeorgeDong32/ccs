## Context

当前 CCS 项目是一个完整的 Dashboard 应用，入口 `src/web-server/index.ts` 启动时挂载 full API router、auth session middleware、shared/overview routes、WebSocket server、auto-sync watcher、managed model prefix repair 和 CLIProxy service 启动链路。前端 `ui/src/App.tsx` 包含完整 router、`RequireAuth` wrapper、Layout/sidebar 和大量非 analytics 页面。

用户实际只使用 `/analytics` 页面查看 usage 统计（Claude usage、CCS instances、CLIProxy snapshot、Cursor import、Codex/Droid native collectors）。当前为了这一个页面，PM2 必须运行整个 Dashboard 后端和前端 runtime。

之前的设计探索和 Codex adversarial review 确认了以下约束：

1. 不能直接 serve 完整 `dist/ui`，因为 `RequireAuth` / `AuthProvider` 会在 `/api/auth/check` 失败时 fail closed 并 redirect 到 `/login`。
2. 完整 Layout 包含 `ConnectionIndicator`，在无 WebSocket server 时会持续显示 reconnect。
3. analytics 页面不只调用 summary/daily/status，还调用 hourly/models/sessions/monthly/insights/refresh 和 cursor status/import/delete。
4. API contract 必须从实际 hooks/组件追踪，不依赖人工猜测。

## Goals / Non-Goals

**Goals:**

- 新增 analytics-only 后端 runtime，只挂载 `/api/usage/*` routes 和 health check，用 PM2 启动。
- 新增 analytics-only 前端 shell，只复用 `AnalyticsPage` 和必要 providers，不引入完整 Dashboard App。
- 复用现有 `src/web-server/usage/**` 和 `ui/src/pages/analytics/**` 核心模块，不复制逻辑。
- 保持 upstream analytics core 可持续同步（merge/cherry-pick 友好）。
- 默认 local-only（`127.0.0.1`），不暴露 analytics 数据到公网。

**Non-Goals:**

- 不删除现有 full Dashboard、CLI、WebSocket、shared/overview 等代码。
- 不替换默认 `ccs config` / `src/web-server/index.ts` 完整 server。
- 不提供公网认证方案（本 change 只做 local-only runtime）。
- 不改变 usage 数据聚合语义或 analytics 页面行为。
- 不引入新外部依赖。

## Decisions

### D1: Frontend shell 而非 serve 完整 dist/ui

**选择**：新增 `AnalyticsOnlyApp.tsx`，只保留 `QueryClientProvider`、`ThemeProvider`、`PrivacyProvider`、`i18n`、`Toaster`、`AnalyticsPage`。

**备选**：serve 完整 `dist/ui` + 补齐 `/api/auth/check` stub。

**理由**：Codex review 确认完整 App 的 `RequireAuth` + `AuthProvider` fail closed 行为在 analytics-only runtime 中不可靠。补齐 auth stub 会增加 runtime 复杂度并偏离"轻量"目标。独立 shell 更干净，且 shell 文件本身很小（~30 行），维护成本极低。upstream sync 只需关注 `AnalyticsPage` import 是否变化。

### D2: Backend runtime 不复用 `src/web-server/index.ts`

**选择**：新增独立入口 `analytics-only-server.ts`，直接 import `usageRoutes` 和必要 middleware。

**备选**：抽取 `index.ts` 中的共享 bootstrap 为 reusable module，再由两个入口调用。

**理由**：当前 `index.ts` 的 bootstrap 与 full server 逻辑高度耦合（auth middleware init、CLIProxy service check、auto-sync watcher setup 等）。抽取共享 module 需要较大重构，且容易引入 upstream merge 冲突。独立入口虽有些代码重复，但文件很短且不 touch upstream 高频变动文件，sync 成本更低。如果后续两个入口的共享逻辑增多，可在后续 change 中再抽取。

### D3: Vite 多入口而非独立 config

**选择**：在现有 `ui/vite.config.ts` 中通过 `build.rollupOptions.input` 新增 `analytics` 入口，或新增轻量 `ui/vite.analytics.config.ts`。

**理由**：多入口 build 比完全独立的 config 更易维护。`analytics-main.tsx` import 的模块和完整 App 高度重叠，共享同一个 dependency graph 和 chunk splitting 策略即可。

### D4: Security boundary — local-only by default, explicit remote opt-in

**选择**：默认 `CCS_ANALYTICS_HOST=127.0.0.1`。绑定非 loopback 地址必须设置 `CCS_ANALYTICS_ALLOW_REMOTE=1`，否则 runtime 拒绝启动并打印错误信息。

**备选**：warning-only 或内置基本 auth。

**理由**：analytics 暴露项目路径、模型名、token 用量和成本信息。仅靠 warning 无法保护长期运行的 PM2 服务——配置错误后数据暴露是静默的。改为 fail closed：非 loopback 绑定必须显式 opt-in（`CCS_ANALYTICS_ALLOW_REMOTE=1`），否则拒绝启动。公网访问需求应通过反向代理（nginx/caddy + basic auth）或后续 change 解决。

### D5: PM2 single instance only

**选择**：PM2 不使用 cluster mode，单实例运行。

**理由**：usage aggregator 的内存 cache 写入不支持多进程并发。多实例会导致 cache 竞争和数据不一致。

## Risks / Trade-offs

### [Risk] `AnalyticsPage` 的 import chain 可能间接引入 auth/layout 依赖

→ **Mitigation**：在 `AnalyticsOnlyApp.tsx` 中只 import `AnalyticsPage` from `ui/src/pages/analytics/index.tsx`。构建时用 bundle analyzer 检查是否引入了 auth context 或 websocket hook。CI guard 会 fail on forbidden imports。如果发现间接依赖，不允许静默 stub——必须由人工 review 决定是否将新 provider 加入允许列表或标记为不兼容。

### [Risk] Upstream 修改 analytics 页面后，shell 可能需要同步调整

→ **Mitigation**：shell 文件本身极小（~30 行），只 import `AnalyticsPage` 和几个 provider。upstream 对 analytics 页面内部组件的修改不需要 shell 变更。只有当 analytics 页面新增必需 provider 时才需更新 shell，这种情况很少发生且影响面极小。

### [Risk] Cursor import 需要 multipart middleware

→ **Mitigation**：analytics-only server 在挂载 `usageRoutes` 之前配置 `express.json()` 和 `multer` middleware，确保 `handleCursorImport` 的 multipart upload 可用。这与 full server 中 `usageRoutes` 的 middleware 需求一致。

### [Risk] 用户误解 analytics-only runtime 可以替代完整 Dashboard

→ **Mitigation**：启动日志明确标注 "analytics-only mode"。非 `/api/usage/*` 和 `/analytics` 的请求返回 404。README/docs 明确说明适用场景和限制。

### [Trade-off] 独立入口 vs 抽取共享 bootstrap

选择独立入口意味着有少量代码重复（Express app 创建、JSON middleware、static serving），但避免了重构 `index.ts` 和潜在 upstream merge 冲突。代码重复约 30-40 行，可接受。

## Open Questions

- 是否需要 `build:analytics-server` 独立 build script，还是复用现有 `build:server`？
- analytics-only UI build 是否需要独立的 `dist-analytics/ui` 输出目录，还是输出到 `dist/ui-analytics`？
- PM2 ecosystem file 是否应纳入本 change，还是留给用户自行配置？
