## Why

`feat/analytics-only-runtime` 分支已创建了轻量 analytics-only runtime 的基本骨架——只在 PM2 中运行 analytics API 和前端 shell，不加载完整 Dashboard。但当前这个 runtime 无法获取用户的 Claude Code 使用数据：因为 `getDefaultProjectsDirForAnalytics()` 将 Claude Code 的数据源路径解析到了 `<CCS_HOME>/.claude/projects/`（默认即 `~/.ccs/.claude/projects/`），而 Claude Code 真实写入路径是 `~/.claude/projects/`，路径不匹配导致数据为空。

此外，需要系统性地验证这个精简版 runtime 没有破坏现有 analytics 各项功能：cursor CSV 导入、cost leverage 卡、profile filter、Codex/Droid 原生采集、CLIProxy 使用数据、pricing 等。还需要验证轻量版确实比完整版更轻（更小的 bundle、更少的内存占用、更快的启动）。

## What Changes

- 修复 Claude Code 数据路径解析，将 Claude Code 默认数据目录与 CCS_HOME 解耦
- 添加 `CCS_ANALYTICS_CLAUDE_DATA_DIR` 环境变量可选覆盖
- 启动时打印解析到的数据路径，如果无数据源可访问则警告
- 新增自动化 API 合约测试，覆盖全部 12 个端点，验证接口语义正确性和下游 fork 功能不受影响
- 新增轻量版内存/启动时间基线对比测试
- 修复 SPA fallback index.html 优先级 bug（已在本地修复，需纳入 commit）
- 更新 README 环境变量文档（已有版本是正确的，需验证）

## Capabilities

### New Capabilities

- `analytics-data-path-resolution`: 将 Claude Code 默认数据目录（`~/.claude/projects/`）与 CCS 配置目录（`~/.ccs/`）解耦，确保 analytics runtime 能读取真实使用数据
- `analytics-regression-test-suite`: 自动化合约测试覆盖 12 个 usage API 端点、cursor 导入、profile filter、pricing 正确性，以及轻量版 vs 完整版 bundle 体积和内存占用对比

### Modified Capabilities

（无现有 capability 的 spec-level 行为变更。纯修复 + 测试增强。）

## Impact

- **修改文件**：`src/web-server/usage/aggregator.ts`（`getDefaultProjectsDirForAnalytics()` 路径修正）
- **新增文件**：`tests/unit/web-server/analytics-regression.test.ts`（合约回归测试套件）
- **不影响**：完整 server（`src/web-server/index.ts`）、完整 Dashboard、CLI 命令、proxy 行为
- **新增依赖**：无。纯路径逻辑修正 + 测试。
- **Principles touched**：Principle III（测试隔离 — 路径测试必须用 temp 目录）、Principle VI（fail fast — 启动时警告无数据源）、Principle VII（YAGNI — 最小改动，只修路径不重构全局）
- **CLI vs Dashboard**：本 change 纯后端修复 + 测试，不涉及 CLI 命令或 Dashboard UI
