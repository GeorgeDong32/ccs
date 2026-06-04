## Context

第一轮 `fix-analytics-ui-i18n-layout` 修复了最显眼的 i18n 问题（charts-grid useTranslation、布局 h-screen、CostLeverageCard 替换）。但截图显示仍有大量硬编码英文，加上 cost-leverage 卡因 404 无法保存基准值。

## Goals / Non-Goals

**Goals:**
- 全部 UI 文本在中文模式下正确显示
- cost-leverage 卡的 save 按钮能正常工作
- 切换时间区间不再崩溃
- 简洁修改，仅修复发现的问题

**Non-Goals:**
- 不重构 analytics header
- 不修改完整 Dashboard 中的同组件（仅在 analytics-only 上下文下修复）
- 不实现完整的 config UI（只暴露 cost-leverage baseline 所需的端点）

## Decisions

### D1: Cost-leverage 404 修复
- **方法 A**: 添加最小 `/api/config` GET/PUT 路由到 analytics-only server
  - 优点：用户能设置 baseline
  - 缺点：增加 server 复杂度
- **方法 B**: 禁用 save UI，让用户在完整 Dashboard 设置 baseline
  - 优点：YAGNI、analytics-only 保持只读
  - 缺点：用户体验割裂
- **选择**：方法 A，最小实现。复用现有 `use-config` 写入逻辑

### D2: i18n key 增量添加
- 不创建新的 i18n 段落，扩展现有 `analytics`、`analyticsCards`、`analyticsHeader`、`analyticsCursor` 段落
- 5 语言都加同样的 key，保持一致
- 中文 + 英文优先（其他 3 语言用英文 fallback）

### D3: 时间区间崩溃
- 在 `onError` 中加 `onError` callback 防止 unhandled rejection
- 在 viewMode 切换时确保 `hourlyData` 不为 undefined

## Risks
- [Risk] 加 config 端点可能与完整 server 行为不一致 → Mitigation: 复用相同 schema，仅用 in-memory storage 或简单 JSON 文件
- [Risk] 大量 i18n key 添加可能漏翻译 → Mitigation: 其他 3 语言 fallback 到英文
