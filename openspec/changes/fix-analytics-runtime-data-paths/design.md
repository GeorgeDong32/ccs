## Context

当前 `aggregator.ts:getDefaultProjectsDirForAnalytics()` 使用 `getClaudeConfigDir()` 获取 Claude Code 数据目录，而 `getClaudeConfigDir()` 继承自 CCS 的路径体系：`<CCS_HOME>/.claude/projects/`。当 `CCS_HOME=~/.ccs` 时，解析为 `~/.ccs/.claude/projects/`——但这个路径不存在。Claude Code (Anthropic CLI) 实际写入 `~/.claude/projects/`。

在其他所有数据源（Codex `~/.codex/sessions/`、Droid `~/.factory/`）都按正确位置解析的情况下，唯独默认 Claude 数据路径错了。

此外，`feat/analytics-only-runtime` 分支的 SPA fallback 有 bug：`express.static()` 默认 serve `index.html`（完整 Dashboard），而非 `index.analytics.html`。已在本地修复（加 `{ index: false }`）。

## Goals / Non-Goals

**Goals:**
- 默认 Claude 数据路径直接使用 `os.homedir()/.claude/projects/`，不受 CCS_HOME 影响
- 提供 `CCS_ANALYTICS_CLAUDE_DATA_DIR` 环境变量供覆盖
- 启动时打印数据源路径诊断信息
- 新增自动化回归测试套件覆盖全部 12 端点 + fork 特有功能 + pricing + 轻量 vs 完整 bundle
- 验证 analytics-only bundle 确实排除完整 Dashboard chunk

**Non-Goals:**
- 不重构 `getCcsDir()` / `getClaudeConfigDir()` 的全局路径体系
- 不改变 CCS 实例数据路径
- 不引入新依赖
- 不修改完整 server 行为

## Decisions

### D1: `getDefaultProjectsDirForAnalytics()` 独立于 CCS 路径体系

**选择**：将默认 Claude 数据目录从 `getClaudeConfigDir()` 改为 `path.join(os.homedir(), '.claude', 'projects')`，遵守 `CLAUDE_CONFIG_DIR` 环境变量。

**备选**：修改 `getClaudeConfigDir()` 使其在 analytics runtime 中正确解析。**拒绝原因**：`getClaudeConfigDir()` 在多处使用（包括 instance-manager、profile-creator 等），修改会影响面太大，且 CCS 实例体系确实需要 `<CCS_HOME>/.claude/`。默认 Claude 数据是唯一路径错误的源。

**实施**：在 `aggregator.ts` 中新增 `getDefaultClaudeProjectsDir()`：
```typescript
function getDefaultClaudeProjectsDir(): string {
  if (process.env['CCS_ANALYTICS_CLAUDE_DATA_DIR']) {
    return process.env['CCS_ANALYTICS_CLAUDE_DATA_DIR'];
  }
  const claudeConfig = process.env['CLAUDE_CONFIG_DIR'];
  if (claudeConfig) {
    return path.join(claudeConfig, 'projects');
  }
  return path.join(os.homedir(), '.claude', 'projects');
}
```

### D2: 启动诊断而非静默失败

**选择**：在 `analytics-only-runtime.ts` 的 `main()` 中，解析后检查关键目录是否存在，打印日志。不阻断启动——即使目录不存在，analytics 页面也应以空数据显示。

**理由**：fail fast 原则（Principle VI）——没有数据比静默的 200 空响应更好诊断。

### D3: 回归测试策略

**选择**：在 `tests/unit/web-server/analytics-regression.test.ts` 中集中测试，包含：
1. **API 合约**：所有 12 端点返回正确状态码
2. **Cursor 导入**：端点注册且可访问
3. **Profile filter**：`?profile=work` 参数正确传递
4. **Pricing**：优先使用上游继承的 `getModelPricing` 测试，补充 `claude-opus-4-7-thinking` 和 null guard 场景
5. **SPA HTML**：`GET /` 返回 analytics HTML 而非 Dashboard HTML
6. **Bundle 分析**：CI guard 检测 forbidden imports

**理由**：test isolation（Principle III）——所有测试使用临时 CCS_HOME 和合成 JSONL 数据，不接触用户真实目录。

### D4: 不修改现有测试

**选择**：新增独立测试文件，不修改 `analytics-only-server.test.ts` 或 `analytics-contract.test.ts`。

**理由**：最小变更原则（Principle VII）——现有测试已通过，改动风险大于新增收益。

## Risks / Trade-offs

### [Risk] 用户设置了非标准的 Claude Code 数据目录
如果用户使用 `CLAUDE_CONFIG_DIR` 或自定义路径，默认 `os.homedir()/.claude/projects/` 仍可能找不到数据。
→ **Mitigation**：支持 `CLAUDE_CONFIG_DIR` 环境变量 + `CCS_ANALYTICS_CLAUDE_DATA_DIR` 显式覆盖。启动日志打印解析路径。

### [Risk] CCS 实例模式用户可能有两个数据源
CCS 实例数据（`~/.ccs/instances/*/projects/`）和默认 Claude 数据（`~/.claude/projects/`）可能有重复数据。
→ **Mitigation**：这是 aggregator `mergeDailyData()` 的现有行为——它已经处理多源合并。路径修复不改聚合逻辑。

### [Trade-off] `os.homedir()` 直连违反 CCS_HOME 隔离原则
Analytics runtime 本应该完全隔离在 CCS_HOME 内，但现在必须跨到 `os.homedir()`。
→ **Mitigation**：这是 analytics-only runtime 的根本设计需求——轻量版就是用来读全局数据的。测试仍然使用 `CCS_HOME` 隔离，生产环境则使用真实路径。
