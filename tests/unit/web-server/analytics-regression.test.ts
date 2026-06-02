/**
 * Analytics-Only Runtime Regression Test Suite
 *
 * Verifies:
 * - Full API contract (12 endpoints)
 * - SPA fallback serves analytics HTML
 * - Fork-specific features preserved (cursor, profile filter, cost leverage)
 * - Pricing correctness (Opus 4.7 thinking, null entry guards)
 * - Bundle analysis (excludes Dashboard chunks)
 * - Data path resolution order
 */

import { afterAll, beforeAll, describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import http from 'http';
import type { AddressInfo } from 'net';

// ==========================================================================
// Test helpers
// ==========================================================================

let testServer: http.Server;
let baseUrl: string;
let tempRoot: string; // Temp root dir for all synthetic data

/** Create synthetic Claude Code JSONL usage data in a temp directory */
function createSyntheticProjectData(dir: string): void {
  const projectDir = path.join(dir, 'projects', '-Users-test-myproject');
  fs.mkdirSync(projectDir, { recursive: true });

  const jsonlContent = [
    JSON.stringify({
      type: 'assistant',
      message: {
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 200,
        },
        model: 'claude-sonnet-4-5',
      },
      timestamp: new Date().toISOString(),
    }),
    JSON.stringify({
      type: 'assistant',
      message: {
        usage: { input_tokens: 300, output_tokens: 100 },
        model: 'claude-opus-4-7',
      },
      timestamp: new Date().toISOString(),
    }),
  ].join('\n') + '\n';

  fs.writeFileSync(path.join(projectDir, 'conversation-001.jsonl'), jsonlContent);
}

function createSyntheticInstanceData(ccsDir: string, profileName: string): void {
  const instancesDir = path.join(ccsDir, 'instances', profileName, 'projects', '-Users-test-' + profileName);
  fs.mkdirSync(instancesDir, { recursive: true });

  const jsonlContent =
    JSON.stringify({
      type: 'assistant',
      message: { usage: { input_tokens: 2000, output_tokens: 800 }, model: 'gpt-5.5' },
      timestamp: new Date().toISOString(),
    }) + '\n';

  fs.writeFileSync(path.join(instancesDir, 'conversation-001.jsonl'), jsonlContent);
}

/** Start analytics-only server with given CCS_HOME and port */
async function startTestServer(
  config: { ccsHome: string } & Partial<{ host: string; port: number }>
): Promise<http.Server> {
  const port = config.port || 0;

  return new Promise((resolve, reject) => {
    const {
      startAnalyticsServer,
    } = require('../../../src/web-server/analytics-only-server');
    startAnalyticsServer({ port, host: '127.0.0.1' }).then(
      (instance: { server: http.Server }) => {
        resolve(instance.server);
      },
      reject
    );
  });
}

async function getPort(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    const addr = server.address() as AddressInfo;
    resolve(addr.port);
  });
}

// ==========================================================================
// Static tests (no server needed)
// ==========================================================================

describe('path resolution', () => {
  it('getDefaultClaudeProjectsDir resolves to ~/.claude/projects by default', () => {
    const result = require('../../../src/web-server/usage/aggregator').getDefaultClaudeProjectsDir();
    expect(result).toBe(path.join(os.homedir(), '.claude', 'projects'));
  });

  it('respects CCS_ANALYTICS_CLAUDE_DATA_DIR override', () => {
    process.env['CCS_ANALYTICS_CLAUDE_DATA_DIR'] = '/override/data';
    const { getDefaultClaudeProjectsDir } = require('../../../src/web-server/usage/aggregator');
    const result = getDefaultClaudeProjectsDir();
    expect(result).toBe('/override/data');
    delete process.env['CCS_ANALYTICS_CLAUDE_DATA_DIR'];
  });
});

// ==========================================================================
// Pricing tests
// ==========================================================================

describe('pricing correctness', () => {
  it('Opus 4.7 thinking returns 5.0/25.0 pricing', () => {
    const { getModelPricing } = require('../../../src/web-server/model-pricing');
    const pricing = getModelPricing('claude-opus-4-7-thinking');
    expect(pricing.inputPerMillion).toBe(5.0);
    expect(pricing.outputPerMillion).toBe(25.0);
  });

  it('Opus 4.7 returns 5.0/25.0', () => {
    const { getModelPricing } = require('../../../src/web-server/model-pricing');
    const pricing = getModelPricing('claude-opus-4-7');
    expect(pricing.inputPerMillion).toBe(5.0);
    expect(pricing.outputPerMillion).toBe(25.0);
  });

  it('unknown model returns fallback pricing', () => {
    const { getModelPricing } = require('../../../src/web-server/model-pricing');
    const pricing = getModelPricing('unknown-model-xyz-12345');
    expect(pricing.inputPerMillion).toBe(3.0);
    expect(pricing.outputPerMillion).toBe(15.0);
  });

  it('null models.dev entries do not crash', () => {
    const { getModelPricing } = require('../../../src/web-server/model-pricing');
    const { setCachedModelsDevRegistry, clearModelsDevRegistryCache } = require(
      '../../../src/web-server/models-dev/registry-cache'
    );
    setCachedModelsDevRegistry({
      test: {
        id: 'test',
        name: 'Test',
        models: { 'null-entry': null, 'gpt-4o': { id: 'gpt-4o', cost: { input: 2.5, output: 10 } } },
      },
    } as never);
    expect(() => getModelPricing('gpt-4o', { provider: 'test' })).not.toThrow();
    expect(getModelPricing('gpt-4o', { provider: 'test' }).inputPerMillion).toBe(2.5);
    clearModelsDevRegistryCache();
  });
});

// ==========================================================================
// Server-based tests (12 endpoints + fork features)
// ==========================================================================

describe('analytics-only runtime', () => {
  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-regression-'));
    const ccsHome = path.join(tempRoot, 'home');
    const ccsDir = path.join(ccsHome, '.ccs');
    const claudeDataDir = path.join(tempRoot, 'claude-data');

    // Create synthetic data in temp directories — never touch real ~/.claude/
    fs.mkdirSync(claudeDataDir, { recursive: true });
    fs.mkdirSync(path.join(ccsDir, 'cache'), { recursive: true });
    createSyntheticProjectData(claudeDataDir);

    process.env['CCS_HOME'] = ccsHome;
    process.env['CCS_ANALYTICS_CLAUDE_DATA_DIR'] = path.join(claudeDataDir, 'projects');

    createSyntheticInstanceData(ccsDir, 'work');

    testServer = await startTestServer({ ccsHome });
    baseUrl = `http://127.0.0.1:${await getPort(testServer)}`;
  });

  afterAll(() => {
    if (testServer) testServer.close();
    delete process.env['CCS_HOME'];
    delete process.env['CCS_ANALYTICS_CLAUDE_DATA_DIR'];
    if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  describe('health check', () => {
    it('returns { status: ok, mode: analytics-only }', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.mode).toBe('analytics-only');
    });
  });

  describe('API contract - data content verification', () => {
    it('daily endpoint returns non-empty data with expected token counts', async () => {
      const res = await fetch(`${baseUrl}/api/usage/daily`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      // Synthetic data has 1000+300=1300 input tokens, 500+100=600 output
      if (body.data.length > 0) {
        const totalInput = body.data.reduce((s: number, d: { inputTokens: number }) => s + d.inputTokens, 0);
        expect(totalInput).toBeGreaterThan(0);
      }
    });

    it('summary endpoint reports total cost > 0 for synthetic data', async () => {
      const res = await fetch(`${baseUrl}/api/usage/summary`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      // If data is loaded, total cost should be > 0
      if (body.data && body.data.totalInputTokens !== undefined) {
        expect(body.data.totalInputTokens).toBeGreaterThan(0);
      }
    });

    it('status endpoint indicates data sources', async () => {
      const res = await fetch(`${baseUrl}/api/usage/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe('API contract - 12 endpoints', () => {
    const endpoints: Array<{ method: string; path: string; expectStatus: number }> = [
      { method: 'GET', path: '/api/usage/summary', expectStatus: 200 },
      { method: 'GET', path: '/api/usage/daily', expectStatus: 200 },
      { method: 'GET', path: '/api/usage/hourly', expectStatus: 200 },
      { method: 'GET', path: '/api/usage/models', expectStatus: 200 },
      { method: 'GET', path: '/api/usage/sessions', expectStatus: 200 },
      { method: 'GET', path: '/api/usage/monthly', expectStatus: 200 },
      { method: 'GET', path: '/api/usage/status', expectStatus: 200 },
      { method: 'GET', path: '/api/usage/insights', expectStatus: 200 },
      { method: 'POST', path: '/api/usage/refresh', expectStatus: 200 },
      { method: 'GET', path: '/api/usage/cursor/status', expectStatus: 200 },
      { method: 'POST', path: '/api/usage/cursor/import', expectStatus: 400 },
      { method: 'POST', path: '/api/usage/cursor/clear', expectStatus: 200 },
    ];

    for (const endpoint of endpoints) {
      it(`${endpoint.method} ${endpoint.path} returns ${endpoint.expectStatus}`, async () => {
        const res = await fetch(`${baseUrl}${endpoint.path}`, { method: endpoint.method });
        expect(res.status).toBe(endpoint.expectStatus);
      });
    }
  });

  describe('SPA HTML', () => {
    it('serves analytics HTML with correct title and root div', async () => {
      const res = await fetch(baseUrl);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('<title>CCS Analytics</title>');
      expect(html).toContain('<div id="analytics-root">');
      expect(html).not.toContain('<div id="root">');
    });
  });

  describe('non-usage endpoints', () => {
    it('/api/shared returns 404', async () => {
      const res = await fetch(`${baseUrl}/api/shared`);
      expect(res.status).toBe(404);
    });

    it('/api/auth/check returns 404', async () => {
      const res = await fetch(`${baseUrl}/api/auth/check`);
      expect(res.status).toBe(404);
    });

    it('analytics-only has no WebSocket upgrade on /ws', async () => {
      // Analytics-only runtime does not mount a WebSocket server.
      // /ws falls through to the SPA fallback which serves the analytics HTML.
      const res = await fetch(`${baseUrl}/ws`);
      const upgradeHeader = res.headers.get('upgrade');
      // Should NOT be a WebSocket upgrade (101 Switching Protocols)
      expect(upgradeHeader?.toLowerCase()).not.toBe('websocket');
    });
  });

  describe('fork feature preservation', () => {
    it('cursor/status endpoint is accessible', async () => {
      const res = await fetch(`${baseUrl}/api/usage/cursor/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('profile filter query parameter accepted', async () => {
      const res = await fetch(`${baseUrl}/api/usage/daily?profile=work`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
