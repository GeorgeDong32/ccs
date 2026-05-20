## ADDED Requirements

### Requirement: Analytics-only frontend shell
The system SHALL provide a minimal frontend entry that only imports `AnalyticsPage` from `ui/src/pages/analytics/index.tsx` and wraps it with the following providers: `QueryClientProvider`, `ThemeProvider`, `PrivacyProvider`, `i18n` initialization, and `Toaster`. The shell SHALL NOT import `ui/src/App.tsx`, complete Layout/sidebar, auth context, WebSocket hooks, or non-analytics page components.

#### Scenario: Analytics shell loads without auth redirect
- **WHEN** a user navigates to the analytics-only URL
- **THEN** the analytics page loads directly without redirecting to `/login` or requiring `AuthProvider`

#### Scenario: No WebSocket dependency in shell
- **WHEN** the analytics-only frontend shell is rendered
- **THEN** no WebSocket connection is attempted and no connection indicator shows reconnect status

### Requirement: Reuse upstream analytics page
The analytics-only frontend shell SHALL import and render `AnalyticsPage` from `ui/src/pages/analytics/index.tsx` without duplicating or forking the page implementation. This ensures upstream analytics page changes are automatically available in the analytics-only runtime.

#### Scenario: Upstream analytics page changes are picked up
- **WHEN** upstream modifies `ui/src/pages/analytics/index.tsx`
- **THEN** the analytics-only shell renders the updated page after rebuild without any shell-specific changes

### Requirement: Analytics-only Vite build target
The system SHALL provide a Vite build configuration that produces a separate analytics-only HTML entry (`index.analytics.html`) with its own entry point (`analytics-main.tsx`), outputting a minimal bundle that excludes full Dashboard code paths.

#### Scenario: Analytics-only build produces smaller bundle
- **WHEN** the analytics-only Vite build runs
- **THEN** the output bundle does not include auth context, layout/sidebar, WebSocket provider, or non-analytics page chunks

### Requirement: No failed API requests on analytics page
When rendered in analytics-only mode, the analytics page SHALL NOT make requests to endpoints that the analytics-only runtime does not serve (e.g., `/api/auth/check`, `/api/shared`, `/ws`). Any analytics-specific API call SHALL be served by the analytics-only backend.

#### Scenario: All analytics API calls succeed
- **WHEN** the analytics page is fully rendered in analytics-only mode
- **THEN** all `/api/usage/*` calls succeed and no requests are made to non-usage endpoints

### Requirement: Explicit frontend dependency contract
The analytics-only frontend shell SHALL define an explicit list of allowed providers and modules. The allowed set is: `QueryClientProvider` from `ui/src/lib/query-client`, `ThemeProvider` from `ui/src/components/layout/theme-provider`, `PrivacyProvider` from `ui/src/contexts/privacy-context`, `i18n` from `ui/src/lib/i18n`, `Toaster` from `ui/src/components/ui/sonner`, and `AnalyticsPage` from `ui/src/pages/analytics/index.tsx`. Any other provider, context, or hook from the full Dashboard codebase SHALL be forbidden.

#### Scenario: Forbidden import detected by CI
- **WHEN** the analytics shell or its transitive dependencies import a forbidden module (e.g., `auth-context`, `use-websocket`, `app-sidebar`, `Layout`)
- **THEN** a CI guard fails the build with a clear error identifying the forbidden import

### Requirement: New provider policy for upstream sync
If upstream adds a new required provider to `AnalyticsPage`, the analytics shell SHALL NOT silently stub it. Instead, the CI guard SHALL fail, requiring a human review to decide whether to add the provider to the allowed set or to flag an incompatibility.

#### Scenario: Upstream adds new required provider
- **WHEN** upstream modifies `AnalyticsPage` to depend on a new provider not in the allowed set
- **THEN** the CI guard fails and the change requires explicit review and approval before the provider is added to the shell
