## ADDED Requirements

### Requirement: Analytics-only HTTP server
The system SHALL provide a standalone Express server entry that only mounts `/api/usage/*` routes, a health check endpoint, and static file serving for the analytics frontend shell. The server SHALL NOT mount full API routes, shared/overview routes, WebSocket server, auto-sync watcher, managed model prefix sync, or CLIProxy service startup.

#### Scenario: Server starts with only usage routes
- **WHEN** the analytics-only runtime is started
- **THEN** the server listens on the configured host and port, mounts usage routes at `/api/usage`, provides a health check at `/api/health`, and serves the analytics frontend shell

#### Scenario: Non-analytics endpoints return 404
- **WHEN** a request is made to a non-usage endpoint (e.g., `/api/shared`, `/api/overview`, `/ws`, `/api/auth/check`)
- **THEN** the server responds with 404

### Requirement: Analytics API contract completeness
The analytics-only runtime SHALL mount all `/api/usage/*` endpoints required by the current analytics frontend. The definitive endpoint contract is:

| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/usage/summary` | `handleSummary` |
| GET | `/api/usage/daily` | `handleDaily` |
| GET | `/api/usage/hourly` | `handleHourly` |
| GET | `/api/usage/models` | `handleModels` |
| GET | `/api/usage/sessions` | `handleSessions` |
| GET | `/api/usage/monthly` | `handleMonthly` |
| GET | `/api/usage/status` | `handleStatus` |
| GET | `/api/usage/insights` | `handleInsights` |
| POST | `/api/usage/refresh` | `handleRefresh` |
| GET | `/api/usage/cursor/status` | `handleCursorStatus` |
| POST | `/api/usage/cursor/import` | `handleCursorImport` |
| DELETE | `/api/usage/cursor/data` | `handleCursorDataClear` |

This contract is derived from `ui/src/hooks/use-usage.ts` (lines 174-262). An automated contract test SHALL verify that every endpoint in this table is served by the analytics-only runtime and that no endpoint called by the analytics frontend is missing.

#### Scenario: All analytics endpoints respond successfully
- **WHEN** the analytics-only runtime is running and usage data exists
- **THEN** all 12 endpoints in the contract table respond with the expected HTTP status codes

#### Scenario: Cursor import with multipart upload works
- **WHEN** a CSV file is uploaded via `POST /api/usage/cursor/import` with multipart form data
- **THEN** the file is parsed, merged with existing cursor data, and the cache is refreshed

#### Scenario: Cache refresh works
- **WHEN** `POST /api/usage/refresh` is called
- **THEN** the usage cache is refreshed from all data sources and the response confirms success

#### Scenario: Upstream adds new analytics endpoint
- **WHEN** upstream adds a new `/api/usage/*` endpoint and the analytics frontend calls it
- **THEN** the automated contract test fails, flagging the missing route before deployment

### Requirement: Graceful shutdown
The analytics-only runtime SHALL call `shutdownUsageAggregator()` on process exit or SIGTERM/SIGINT to stop background syncer and clean up resources.

#### Scenario: SIGTERM triggers clean shutdown
- **WHEN** the process receives SIGTERM
- **THEN** `shutdownUsageAggregator()` is called, background CLIProxy sync stops, and the HTTP server closes gracefully

### Requirement: Local-only default binding with explicit remote opt-in
The analytics-only runtime SHALL default to binding `127.0.0.1`. Binding to a non-loopback address SHALL require an explicit environment variable `CCS_ANALYTICS_ALLOW_REMOTE=1`. If `CCS_ANALYTICS_ALLOW_REMOTE` is not set and a non-loopback host is configured, the runtime SHALL refuse to start with a clear error message.

#### Scenario: Default local-only binding
- **WHEN** no host is configured
- **THEN** the server binds to `127.0.0.1`

#### Scenario: Remote binding requires explicit opt-in
- **WHEN** host is set to `0.0.0.0` and `CCS_ANALYTICS_ALLOW_REMOTE` is not set to `1`
- **THEN** the runtime refuses to start and prints an error message requiring `CCS_ANALYTICS_ALLOW_REMOTE=1`

#### Scenario: Remote binding with opt-in succeeds
- **WHEN** host is set to `0.0.0.0` and `CCS_ANALYTICS_ALLOW_REMOTE=1` is set
- **THEN** the runtime starts and logs a warning about exposed analytics data

### Requirement: PM2 single instance
The analytics-only runtime SHALL run as a single PM2 instance. Cluster mode SHALL NOT be used to avoid usage cache concurrent write conflicts.

#### Scenario: PM2 starts single instance
- **WHEN** PM2 starts the analytics-only runtime
- **THEN** only one process instance runs, and usage cache writes are safe from concurrent conflicts

### Requirement: Automated API contract test
The change SHALL include an automated test that extracts all `/api/usage/*` fetch calls from the analytics frontend hooks (`ui/src/hooks/use-usage.ts`) and verifies that each one maps to a route in `src/web-server/usage/routes.ts`. This test SHALL fail if the analytics frontend calls an endpoint that the runtime does not serve.

#### Scenario: Contract test detects missing endpoint
- **WHEN** an analytics frontend hook calls `/api/usage/new-endpoint` and the route is not in `usageRoutes`
- **THEN** the automated contract test fails

#### Scenario: Contract test passes for current frontend
- **WHEN** the contract test runs against the current codebase
- **THEN** all 12 endpoints in the contract table are verified and the test passes
