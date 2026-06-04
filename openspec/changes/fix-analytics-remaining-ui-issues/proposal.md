## Why

测试 analytics-only runtime 时发现多个 UI 问题未解决：
1. **CRITICAL**: 成本杠杆率卡保存基准值时返回 404 — analytics-only server 缺少 `/api/config` PUT 路由
2. **HIGH**: Session Stats 卡全部英文（标题、SAMPLED SESSIONS、RECENT AVG COST、Recent Activity、131 total）
3. **HIGH**: Analytics header 中"All profiles"/"Includes all analytics source"/"24H" 硬编码英文
4. **HIGH**: 顶部"analytics.importData" i18n key 漏出
5. **MEDIUM**: Trend chart tooltip "TOKEN BREAKDOWN"/"Input"/"Output"/"Cache Read" 英文
6. **MEDIUM**: Model detail panel "Token Breakdown"/"Cache Write"/"All Tokens" 英文
7. **MEDIUM**: Cache efficiency 卡 多个硬编码英文
8. **MEDIUM**: 用户报告切换时间区间崩溃（前次调查未发现根因，可能与 cost-leverage 错误处理相关）

## What Changes

- 添加 `/api/config` GET/PUT 路由到 analytics-only server（最小 config 端点支持 cost-leverage）
- 替换 Session Stats/Header/Tooltip/Model Detail/Cache Efficiency 卡的硬编码英文为 i18n key
- 添加缺失的 i18n key：`analyticsCards.sessionStats.*`、`analyticsCards.cacheEfficiency.*`、`analyticsCards.tokenBreakdown.*`、`analyticsHeader.*`、`analyticsCursor.*`、`analytics.importData`
- 调查并修复时间区间切换崩溃

## Capabilities

### Modified Capabilities

- `analytics-frontend-shell`：完整 i18n 覆盖，修复硬编码英文
- `analytics-runtime`：添加最小 config API 支持

## Impact

- **修改文件**：`src/web-server/analytics-only-server.ts`（加 config 路由）、多个 UI 组件、`ui/src/lib/i18n.ts`（加 key）
- **新增**：~25 个 i18n key across 5 locales
- **不影响**：完整 Dashboard、CLI 命令、其他 runtime
- **Principles**：VII（YAGNI — 最小 config 端点，仅满足 cost-leverage 需求）
