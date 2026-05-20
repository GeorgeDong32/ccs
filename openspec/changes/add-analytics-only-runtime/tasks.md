## 1. Analytics API Contract Trace

- [ ] 1.1 Trace all `/api/usage/*` endpoints called by `ui/src/hooks/use-usage.ts`, `ui/src/pages/analytics/hooks.ts`, and `ui/src/pages/analytics/components/data-import-dialog.tsx` to produce a definitive endpoint list
- [ ] 1.2 Verify the endpoint list against `src/web-server/usage/routes.ts` to confirm all are mountable via `usageRoutes`

## 2. Analytics-Only Frontend Shell

- [ ] 2.1 Create `ui/index.analytics.html` as the analytics-only HTML entry point
- [ ] 2.2 Create `ui/src/analytics-main.tsx` that renders `AnalyticsOnlyApp` into the analytics HTML root
- [ ] 2.3 Create `ui/src/AnalyticsOnlyApp.tsx` with minimal providers: `QueryClientProvider`, `ThemeProvider`, `PrivacyProvider`, `i18n`, `Toaster`, and `AnalyticsPage` from `ui/src/pages/analytics/index.tsx`
- [ ] 2.4 Verify `AnalyticsOnlyApp` does not import `App.tsx`, `Layout`, `app-sidebar`, `auth-context`, `use-websocket`, or non-analytics pages by checking bundle output

## 3. Analytics-Only Vite Build

- [ ] 3.1 Add analytics entry to Vite config (either via `build.rollupOptions.input` in existing config or new `ui/vite.analytics.config.ts`)
- [ ] 3.2 Add `build:analytics-ui` script to `ui/package.json`
- [ ] 3.3 Verify analytics-only build produces a working bundle that excludes full Dashboard chunks

## 4. Analytics-Only Backend Runtime

- [ ] 4.1 Create `src/web-server/analytics-only-server.ts` with Express app, JSON middleware, multipart middleware, `/api/usage` routes, `/api/health`, static analytics UI serving, SPA fallback, and graceful shutdown
- [ ] 4.2 Create `src/bin/analytics-only-runtime.ts` as the executable entry point that starts the analytics-only server with host/port from environment variables
- [ ] 4.3 Add `build:analytics-server` and `start:analytics` scripts to root `package.json`

## 5. Security and PM2 Configuration

- [ ] 5.1 Implement default `127.0.0.1` binding with `0.0.0.0` warning log
- [ ] 5.2 Document PM2 single-instance startup command and environment variables in a brief README section or doc

## 6. Testing and Verification

- [ ] 6.1 Add backend smoke tests covering all `/api/usage/*` endpoints against analytics-only runtime
- [ ] 6.2 Add test verifying graceful shutdown calls `shutdownUsageAggregator()`
- [ ] 6.3 Add test verifying non-usage endpoints return 404
- [ ] 6.4 Verify browser-level: analytics page loads without auth redirect, no failed API calls, no WebSocket reconnect UI
- [ ] 6.5 Verify full server (`src/web-server/index.ts`) behavior is unchanged after all changes

## 7. Upstream Sync Compatibility Check

- [ ] 7.1 Verify analytics-only shell only depends on `ui/src/pages/analytics/**` and shared providers, not on internal analytics page structure
- [ ] 7.2 Verify backend runtime only imports `usageRoutes` and public aggregator functions, not internal usage module details
