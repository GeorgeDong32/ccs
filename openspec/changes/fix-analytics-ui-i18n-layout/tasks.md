## 1. Layout Fix

- [x] 1.1 Add `h-screen overflow-hidden` wrapper around Routes in `AnalyticsOnlyApp.tsx`
- [x] 1.2 Add `LanguageSwitcher` component to AnalyticsOnlyApp header area

## 2. Cost Leverage Card Replacement

- [x] 2.1 Replace `CliproxyStatsCard` import with `CostLeverageCard` in `charts-grid.tsx`
- [x] 2.2 Verify `useCostLeverage` hook is importable from `@/hooks/use-cost-leverage`; add missing hook if needed
- [x] 2.3 Add `CostLeverageCard` to barrel export in `ui/src/components/analytics/index.ts`

## 3. i18n Keys

- [x] 3.1 Add `analyticsCostLeverage` translation keys (zh-CN, en, ko, ja, vi) to `ui/src/lib/i18n.ts`
- [x] 3.2 Replace hardcoded English in `cost-leverage-card.tsx` with `useTranslation` hook
- [x] 3.3 Uncomment `useTranslation` in `charts-grid.tsx` and replace hardcoded strings with i18n keys

## 4. Quality Gates

- [x] 4.1 `cd ui && bun run format:check && bun run typecheck`
- [x] 4.2 `cd ui && bun run build` — verify analytics HTML builds
- [x] 4.3 Run `node ../scripts/check-analytics-imports.js ../dist/ui/assets` — no forbidden imports
- [ ] 4.4 Start server, verify: Chinese text renders, Cost Leverage card shows, page fits one screen
