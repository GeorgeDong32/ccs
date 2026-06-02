## 1. Claude Data Path Resolution Fix

- [x] 1.1 Add `getDefaultClaudeProjectsDir()` in `src/web-server/usage/aggregator.ts` that resolves independently of CCS_HOME via `os.homedir()/.claude/projects/`, respecting `CLAUDE_CONFIG_DIR` and `CCS_ANALYTICS_CLAUDE_DATA_DIR`
- [x] 1.2 Update `refreshFromSource()` to use `getDefaultClaudeProjectsDir()` instead of the CCS_HOME-derived path for default Claude data
- [x] 1.3 Add startup diagnostic logging in `src/bin/analytics-only-runtime.ts` printing resolved data source paths and warning if none reachable

## 2. SPA Fallback Fix

- [x] 2.1 Verify `src/web-server/analytics-only-server.ts` static middleware uses `{ index: false }` to prevent serving main Dashboard `index.html`
- [x] 2.2 Verify `GET /` serves `index.analytics.html` (check `<title>CCS Analytics</title>` and `<div id="analytics-root">`)

## 3. Regression Test Suite

- [x] 3.1 Create `tests/unit/web-server/analytics-regression.test.ts` with test server setup using temp CCS_HOME and synthetic JSONL data
- [x] 3.2 Add API contract test: verify all 12 endpoints return correct HTTP status codes
- [x] 3.3 Add SPA HTML test: verify `GET /` returns analytics HTML with correct root div
- [x] 3.4 Add fork feature preservation tests: cursor import endpoint, profile filter, cost leverage API data
- [x] 3.5 Add pricing correctness tests: Opus 4.7 thinking, malformed null entries, isModelEntry guard
- [x] 3.6 Add bundle analysis test: verify analytics JS bundle excludes `main-BRSb4Suc.js` and forbidden imports
- [x] 3.7 Add path resolution unit tests: verify `getDefaultClaudeProjectsDir()` resolution order for all env var combinations

## 4. Quality Gates

- [x] 4.1 Run `bun run format && bun run typecheck` — all files pass
- [x] 4.2 Run `bun run test:all` — no regressions
- [x] 4.3 Run `bun run maintainability:check` — within baseline
- [x] 4.4 Verify UI build produces correct analytics HTML (`cd ui && bun run build && node ../scripts/check-analytics-imports.js ../dist/ui/assets`)

## 5. Commit

- [ ] 5.1 Create commits with conventional format: `fix(analytics): decouple Claude data path from CCS_HOME` and `test(analytics): add regression test suite for analytics-only runtime`
- [ ] 5.2 Push to `feat/analytics-only-runtime`
