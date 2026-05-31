/**
 * Tests for analytics-only server
 *
 * Covers:
 * - Server starts and serves health check
 * - Non-usage endpoints return 404
 * - Graceful shutdown calls aggregator cleanup
 * - Fail-closed security for non-loopback binding
 */

import { describe, it, expect } from 'bun:test';

const TEST_PORT = 0; // Use ephemeral port

describe('analytics-only server', () => {
  describe('isLoopbackHost', () => {
    it('identifies 127.0.0.1 as loopback', async () => {
      const { isLoopbackHost } = await import('../../../src/web-server/analytics-only-server');
      expect(isLoopbackHost('127.0.0.1')).toBe(true);
    });

    it('identifies localhost as loopback', async () => {
      const { isLoopbackHost } = await import('../../../src/web-server/analytics-only-server');
      expect(isLoopbackHost('localhost')).toBe(true);
    });

    it('identifies ::1 as loopback', async () => {
      const { isLoopbackHost } = await import('../../../src/web-server/analytics-only-server');
      expect(isLoopbackHost('::1')).toBe(true);
    });

    it('rejects 0.0.0.0 as non-loopback', async () => {
      const { isLoopbackHost } = await import('../../../src/web-server/analytics-only-server');
      expect(isLoopbackHost('0.0.0.0')).toBe(false);
    });
  });

  describe('server startup', () => {
    it('starts and provides health endpoint', async () => {
      const { startAnalyticsServer } = await import(
        '../../../src/web-server/analytics-only-server'
      );
      const { server, cleanup } = await startAnalyticsServer({
        port: TEST_PORT,
        host: '127.0.0.1',
      });

      const addr = server.address() as { port: number };
      const res = await fetch(`http://127.0.0.1:${addr.port}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.mode).toBe('analytics-only');

      cleanup();
    });
  });

  describe('non-usage endpoints', () => {
    it('returns 404 for /api/shared', async () => {
      const { startAnalyticsServer } = await import(
        '../../../src/web-server/analytics-only-server'
      );
      const { server, cleanup } = await startAnalyticsServer({
        port: TEST_PORT,
        host: '127.0.0.1',
      });

      const addr = server.address() as { port: number };
      const res = await fetch(`http://127.0.0.1:${addr.port}/api/shared`);
      expect(res.status).toBe(404);

      cleanup();
    });

    it('serves SPA for non-API browser path', async () => {
      const { startAnalyticsServer } = await import(
        '../../../src/web-server/analytics-only-server'
      );
      const { server, cleanup } = await startAnalyticsServer({
        port: TEST_PORT,
        host: '127.0.0.1',
      });

      const addr = server.address() as { port: number };
      // SPA fallback should serve the HTML file for browser routes
      const res = await fetch(`http://127.0.0.1:${addr.port}/some-page`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      cleanup();
    });
  });

  describe('graceful shutdown', () => {
    it('calls cleanup without error', async () => {
      const { startAnalyticsServer } = await import(
        '../../../src/web-server/analytics-only-server'
      );
      const { server, cleanup } = await startAnalyticsServer({
        port: TEST_PORT,
        host: '127.0.0.1',
      });

      // Should not throw
      expect(() => cleanup()).not.toThrow();
      // Server should close
      await new Promise((resolve) => server.on('close', resolve));
    });
  });
});
