/**
 * Smoke Test for CCS Dashboard
 *
 * Validates critical API paths to catch regressions before deployment.
 * Run: bun run tests/smoke/dashboard-smoke.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

const BASE_URL = 'http://127.0.0.1:3123';
const STARTUP_TIMEOUT = 15000;

let server: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

describe('Dashboard Smoke Test', () => {
  beforeAll(async () => {
    server = spawn('node', ['dist/ccs.js', 'config', '--host', '127.0.0.1', '--port', '3123'], {
      stdio: 'pipe',
    });

    const ready = await waitForServer(`${BASE_URL}/api/config`, STARTUP_TIMEOUT);
    if (!ready) {
      server.kill();
      throw new Error('Server failed to start within timeout');
    }
  }, STARTUP_TIMEOUT + 5000);

  afterAll(() => {
    if (server) server.kill();
  });

  // Core landing
  it('serves dashboard HTML on /', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<!doctype html');
    expect(html).toContain('CCS Dashboard');
  });

  // Config API
  it('returns config via /api/config', async () => {
    const res = await fetch(`${BASE_URL}/api/config`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('version');
    expect(typeof json.version).toBe('number');
  });

  // Usage refresh — must return immediately (async)
  it('returns refresh response in < 500ms', async () => {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}/api/usage/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.async).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });

  // Refresh status polling
  it('reports refresh status via /api/usage/refresh-status', async () => {
    const res = await fetch(`${BASE_URL}/api/usage/refresh-status`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('refreshing');
  });

  // Usage data endpoints
  it('returns summary data via /api/usage/summary', async () => {
    const res = await fetch(`${BASE_URL}/api/usage/summary`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });

  it('returns model data via /api/usage/models', async () => {
    const res = await fetch(`${BASE_URL}/api/usage/models`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });

  it('returns daily data via /api/usage/daily', async () => {
    const res = await fetch(`${BASE_URL}/api/usage/daily`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });

  // Cursor import status
  it('returns cursor status via /api/usage/cursor/status', async () => {
    const res = await fetch(`${BASE_URL}/api/usage/cursor/status`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });
});
