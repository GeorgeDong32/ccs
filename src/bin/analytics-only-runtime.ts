#!/usr/bin/env node

/**
 * Analytics-Only Runtime Entry Point
 *
 * PM2-compatible entry point for the analytics-only server.
 * Starts a minimal Express server with only /api/usage/* routes and
 * the analytics frontend shell.
 *
 * Default: binds to 127.0.0.1 (localhost only)
 * Remote: set CCS_ANALYTICS_HOST=0.0.0.0 and CCS_ANALYTICS_ALLOW_REMOTE=1
 */

import { startAnalyticsServer, isLoopbackHost } from '../web-server/analytics-only-server';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;

async function main(): Promise<void> {
  const host = process.env.CCS_ANALYTICS_HOST || DEFAULT_HOST;
  const port = parseInt(process.env.CCS_ANALYTICS_PORT || String(DEFAULT_PORT), 10);

  // Fail-closed security: refuse non-loopback without explicit opt-in
  if (!isLoopbackHost(host)) {
    const allowRemote = process.env.CCS_ANALYTICS_ALLOW_REMOTE;
    if (allowRemote !== '1') {
      console.error(
        `[X] Refusing to bind to non-loopback address ${host} without CCS_ANALYTICS_ALLOW_REMOTE=1`
      );
      console.error('    Set CCS_ANALYTICS_ALLOW_REMOTE=1 only if you understand the risks.');
      console.error('    For production, use a reverse proxy (nginx/caddy) with authentication.');
      process.exit(1);
    }
    console.warn(
      `[!] Binding to ${host} — analytics data may be exposed. Use a reverse proxy for authentication.`
    );
  }

  const { cleanup } = await startAnalyticsServer({
    host,
    port,
  });

  // Graceful shutdown on SIGTERM/SIGINT
  const shutdown = () => {
    console.log('[i] Shutting down analytics server...');
    cleanup();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[X] Analytics runtime failed:', err.message);
  process.exit(1);
});
