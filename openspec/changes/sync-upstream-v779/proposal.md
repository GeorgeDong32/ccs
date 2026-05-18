## Why

上游 `kaitranntt/ccs` 已从 v7.73.0 推进到 v7.79.1，累积 354 个实质 commits，包含关键安全修复（auth token 泄露、WebSocket 未保护、路径穿越）、Claude Opus 4.7 支持、dispatcher/config-loader 大规模重构、Browser MCP 完整实现、Dashboard 设计系统迁移等。Fork 已落后 6 个版本，需同步以获取安全补丁和功能增强。

## What Changes

- **安全修复 (8 项)**：限制 browser MCP 文件上传路径、保护 daemon argv 中 auth token、约束 dashboard settings 路径、WebSocket 升级保护、loopback 绑定、本地访问限制、image fallback hook 约束、CI 信任边界加固
- **Claude Opus 4.7 支持**：模型 catalog、自适应 thinking、max thinking level
- **Dispatcher 模块化重构**：从 `ccs.ts` 提取为 `src/dispatcher/` 子模块
- **Config Loader 重构**：facade 模式 + memoization 缓存
- **CLIProxy Executor 拆分**：arg-parser、proxy-resolver、auth-coordinator 等独立模块
- **Browser MCP Phase 1-11**：录制、replay、orchestration、跨 page 能力
- **Dashboard 设计系统**：rail-anchored 布局、Monitor/Config archetype、health/home/cliproxy 页面迁移
- **Dashboard Logs 重设计**：虚拟化 3-pane shell
- **共享资源控制**：shared resource controls + plugin registry 真实状态
- **Session Affinity**：本地会话亲和性控制
- **models.dev 定价集成**：provider-aware 定价元数据
- **Codex 增强**：ccsxp 快捷方式、Spark quota、TOML 查看器、Docker 零安装 UX
- **Extra Models**：API profiles 支持 extra models
- **韩语 i18n**：Dashboard 韩语语言支持
- **Ollama Cloud 支持**：anthropic compatible API
- **OpenRouter v1 路由修复**、**Cursor auth 浏览器轮询**、**Copilot 兼容层废弃**
- **Fork 保留内容**：cache hit rate badge (3 commits) 需在合并后保留

## Capabilities

### New Capabilities

- `upstream-sync`: 从 upstream/main 同步 v7.73.0 至 v7.79.1 全部变更到 fork，保留 fork-specific commits

### Modified Capabilities

_(本次为同步操作，不修改现有 spec 级别的行为定义)_

## Impact

- **代码范围**：`src/` 全量（dispatcher、cliproxy、proxy、config、web-server、commands、browser）、`ui/src/` 全量（设计系统、页面迁移、新组件）、`lib/` 脚本、CI workflows
- **分支操作**：`upstream-main` 需 reset 到 `upstream/main`；创建 `sync/upstream-v7.79` 合并分支；验证后合并回 `main`
- **依赖**：新增 CodeMirror 编辑器 (TOML viewer)、可能新增 react-virtuoso (logs 虚拟化)
- **风险**：大规模合并冲突（尤其 dispatcher/config 重构与 fork 的 UI commits 交叉区域）；Browser MCP 相关代码量大但独立性好
- **受影响 Principles**：I (类型安全)、III (测试隔离)、VIII (质量门禁) — 需确保合并后 `bun run validate` 和 `bun run validate:ci-parity` 通过
