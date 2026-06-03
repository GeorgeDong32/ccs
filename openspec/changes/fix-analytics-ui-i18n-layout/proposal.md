## Why

测试 `feat/analytics-only-runtime` 在浏览器中打开后发现 3 个问题：
1. **中文翻译崩掉**：`charts-grid.tsx` 的 `useTranslation` 被注释掉（TODO），所有文本硬编码英文；`cliproxy-stats-card.tsx` 中大量 "CLIProxy Stats" 文本也是硬编码。缺少 `LanguageSwitcher` 组件导致用户无法切换语言。
2. **面板右下角仍是 CLIProxy Stats**：`charts-grid.tsx` 渲染 `CliproxyStatsCard` 而非 `CostLeverageCard`。`CostLeverageCard` 已实现但未被引用，且其 i18n key 不存在。
3. **UI 缩放异常**：`AnalyticsOnlyApp.tsx` 缺少 viewport 高度包装器。`AnalyticsPage` 的 `h-full` 依赖父级显式高度（完整 App 通过 Layout flex 链提供），没有包装器导致高度解析到 content 高度，内容被垂直拉伸需滚动。

## What Changes

- 启用 `charts-grid.tsx` 中 `useTranslation`，替换硬编码英文为 i18n key
- 将 `CliproxyStatsCard` 替换为 `CostLeverageCard`，添加缺失的 i18n key
- 在 `AnalyticsOnlyApp.tsx` 中添加 `h-screen` 包装器，加 `LanguageSwitcher`
- 在 `cost-leverage-card.tsx` 中使用 `useTranslation` hook 替换硬编码文本
- 为 `analyticsCostLeverage` 添加 zh-CN/en/ko/ja/vi 五语言翻译 key

## Capabilities

### Modified Capabilities

- `analytics-frontend-shell`：修复 Shell 高度包装、添加 LanguageSwitcher、替换 CLIProxy Stats → Cost Leverage

## Impact

- **修改文件**：`ui/src/AnalyticsOnlyApp.tsx`、`ui/src/pages/analytics/components/charts-grid.tsx`、`ui/src/components/analytics/cost-leverage-card.tsx`、`ui/src/lib/i18n.ts`
- **不影响**：后端 runtime、完整 Dashboard、CLI 命令
- **Principles**：Principle V（ASCII-only terminal — 不适用）、Principle VII（YAGNI — 最小的 Shell 修复）
