## 1. Analytics API Contract (defined in spec)

The API endpoint contract is now specified in `specs/analytics-runtime/spec.md` with 12 endpoints derived from `ui/src/hooks/use-usage.ts`. No separate tracing task needed — implementation must satisfy the spec contract.

- [ ] 1.1 Implement the 12-endpoint contract as defined in `specs/analytics-runtime/spec.md` and verify against `src/web-server/usage/routes.ts`
- [ ] 1.2 Add automated contract test that verifies every endpoint in the spec table is served by the analytics-only runtime and fails if the analytics frontend calls an endpoint not in the table

## 2. Analytics-Only Frontend Shell

- [ ] 2.1 Create `ui/index.analytics.html` as the analytics-only HTML entry point
- [ ] 2.2 Create `ui/src/analytics-main.tsx` that renders `AnalyticsOnlyApp` into the analytics HTML root
- [ ] 2.3 Create `ui/src/AnalyticsOnlyApp.tsx` with only the allowed providers per `specs/analytics-frontend-shell/spec.md`: `QueryClientProvider`, `ThemeProvider`, `PrivacyProvider`, `i18n`, `Toaster`, and `AnalyticsPage`
- [ ] 2.4 Add CI guard that fails the build if the analytics shell or its transitive dependencies import forbidden modules (`auth-context`, `use-websocket`, `app-sidebar`, `Layout`, `App.tsx`)

## 3. Analytics-Only Vite Build

- [ ] 3.1 Add analytics entry to Vite config (either via `build.rollupOptions.input` in existing config or new `ui/vite.analytics.config.ts`)
- [ ] 3.2 Add `build:analytics-ui` script to `ui/package.json`
- [ ] 3.3 Verify analytics-only build produces a working bundle that excludes full Dashboard chunks

## 4. Analytics-Only Backend Runtime

- [ ] 4.1 Create `src/web-server/analytics-only-server.ts` with Express app, JSON middleware, multipart middleware, `/api/usage` routes, `/api/health`, static analytics UI serving, SPA fallback, and graceful shutdown
- [ ] 4.2 Create `src/bin/analytics-only-runtime.ts` as the executable entry point that starts the analytics-only server with host/port from environment variables
- [ ] 4.3 Add `build:analytics-server` and `start:analytics` scripts to root `package.json`

## 5. Security and PM2 Configuration

- [ ] 5.1 Implement fail-closed security: default `127.0.0.1` binding; refuse to start on non-loopback unless `CCS_ANALYTICS_ALLOW_REMOTE=1` is set
- [ ] 5.2 Document PM2 single-instance startup command, environment variables, and security boundary in a brief README section or doc

## 6. Testing and Verification

- [ ] 6.1 Add backend smoke tests covering all 12 `/api/usage/*` endpoints against analytics-only runtime
- [ ] 6.2 Add test verifying graceful shutdown calls `shutdownUsageAggregator()`
- [ ] 6.3 Add test verifying non-usage endpoints return 404
- [ ] 6.4 Add test verifying runtime refuses to start on non-loopback without `CCS_ANALYTICS_ALLOW_REMOTE=1`
- [ ] 6.5 Verify browser-level: analytics page loads without auth redirect, no failed API calls, no WebSocket reconnect UI
- [ ] 6.6 Verify full server (`src/web-server/index.ts`) behavior is unchanged after all changes

## 7. Upstream Sync Compatibility Check

- [ ] 7.1 Verify analytics-only shell only depends on `ui/src/pages/analytics/**` and shared providers, not on internal analytics page structure
- [ ] 7.2 Verify backend runtime only imports `usageRoutes` and public aggregator functions, not internal usage module details
- [ ] 7.3 Verify CI guard catches forbidden imports if upstream adds new provider dependencies to analytics page
