## Context

`AnalyticsOnlyApp.tsx` 当前 43 行，只有 provider 包装和路由。缺少：
1. Viewport 高度设定（导致 UI 垂直拉伸）
2. `LanguageSwitcher` 组件（导致无法切换中文）
3. `ChartsGrid` 中 `CliproxyStatsCard` → `CostLeverageCard` 的替换

## Goals / Non-Goals

**Goals:**
- Analytics shell 中的中文翻译正常工作
- 右下角面板显示成本杠杆率卡而非 CLIProxy Stats
- 页面恰好占满一屏，无需滚动

**Non-Goals:**
- 不改完整 Dashboard 的 CLIProxy Stats（它在完整版中仍然正确）
- 不修改 `CliproxyStatsCard` 本身的 i18n（它被完整版使用，修复时机另开）

## Decisions

### D1: i18n 修复
- 在 `charts-grid.tsx` 中取消 `useTranslation` 的注释，将所有硬编码英文替换为 `t('key')`
- 为 `analyticsCostLeverage` 添加 5 语言翻译 key 到 `i18n.ts`
- 在 `cost-leverage-card.tsx` 中将硬编码文本替换为 `useTranslation` hook

### D2: 成本杠杆率卡替换
- `charts-grid.tsx` 中：`import { CostLeverageCard }` 替换 `import { CliproxyStatsCard }`
- 检查 `useCostLeverage` hook 是否存在，如果不存在则在 `cost-leverage-card.tsx` 内联计算或从 hooks 导出

### D3: 布局修复
- 在 `AnalyticsOnlyApp.tsx` 最外层包 `div className="h-screen flex flex-col"`
- 在 `index.analytics.html` 的 `<body>` 加 `className="h-screen"` 或在主入口设置 `#analytics-root { height: 100dvh }`
- 添加 `LanguageSwitcher` 在右上角

## Risks
- [Risk] `useCostLeverage` hook 可能依赖不在 shell 中的 provider → Mitigation: 如需要，将 hook 依赖缩小到已在 shell 中的 provider（QueryClient、Theme 等）
- [Risk] i18n.ts 文件过大（>13000 行），修改需精确 → Mitigation: 只需添加几组 key，不修改现有内容
