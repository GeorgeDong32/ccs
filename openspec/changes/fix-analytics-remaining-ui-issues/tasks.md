## 1. Cost-Leverage 404 修复

- [ ] 1.1 在 `analytics-only-server.ts` 中添加最小 `/api/config` GET 端点，返回 unified config
- [ ] 1.2 添加 `/api/config` PUT 端点，接受 cost baseline preferences 更新
- [ ] 1.3 重新构建并验证 cost-leverage 卡的 save 正常工作

## 2. i18n 关键 key 补充

- [ ] 2.1 添加 `analyticsCards.sessionStats.*`（title、sampledSessions、totalSessions、totalCount、recentAvgCost、avgCostPerSession、recentActivity、tokens）
- [ ] 2.2 添加 `analyticsCards.cacheEfficiency.*`（title、estimatedSavings、cacheReads、cacheWrites、read、write）
- [ ] 2.3 添加 `analyticsCards.tokenBreakdown.*`（title、input、output、cacheWrite、cacheRead、allTokens）
- [ ] 2.4 添加 `analyticsHeader.*`（allProfilesPlaceholder、last24Hours、profileDisclaimers）
- [ ] 2.5 添加 `analyticsCursor.*`（fileHint、importing、importButton、successMessage、clearConfirm、clearButton、errorMessage）
- [ ] 2.6 添加 `analytics.importData`

## 3. UI 组件 i18n 替换

- [ ] 3.1 `session-stats-card.tsx` 替换硬编码英文
- [ ] 3.2 `cache-efficiency-card.tsx` 替换硬编码英文
- [ ] 3.3 `model-details-content.tsx` 替换硬编码英文
- [ ] 3.4 `usage-trend-chart.tsx` 添加 useTranslation，替换 tooltip 英文
- [ ] 3.5 `analytics-header.tsx` 替换 `24H` 硬编码 + `All profiles` placeholder

## 4. 时间区间崩溃

- [ ] 4.1 在 use-cost-leverage.ts 中加 onError 错误处理
- [ ] 4.2 重新启动服务并测试时间区间切换

## 5. Quality Gates

- [ ] 5.1 `cd ui && bun run format:check && bun run typecheck`
- [ ] 5.2 `cd ui && bun run build`
- [ ] 5.3 `node ../scripts/check-analytics-imports.js ../dist/ui/assets`
- [ ] 5.4 手动验证中文文本、cost-leverage save、时间区间切换不崩
