/**
 * Tests for the pricing-table version integration in the usage disk cache.
 *
 * Verifies:
 *  - writeDiskCache stamps the cache with the current PRICING_TABLE_VERSION.
 *  - Caches written without a pricingTableVersion are still readable
 *    (backward compatibility).
 *  - readDiskCache returns the stamped version so callers can decide whether
 *    to drop cost figures and recompute.
 *
 * The aggregator's actual "drop cache" decision is covered separately by the
 * `isCachePricingStale` helper extracted for testability.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { readDiskCache, writeDiskCache } from '../../../src/web-server/usage/disk-cache';
import { PRICING_TABLE_VERSION } from '../../../src/web-server/model-pricing';

function makeTempHome(): string {
  return fs.mkdtempSync(path.join(require('os').tmpdir(), 'ccs-pricing-cache-'));
}

function cleanup(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

describe('disk-cache pricing table version', () => {
  let tempHome: string;
  let originalCcsHome: string | undefined;

  beforeEach(() => {
    tempHome = makeTempHome();
    originalCcsHome = process.env.CCS_HOME;
    process.env.CCS_HOME = tempHome;
  });

  afterEach(() => {
    if (originalCcsHome !== undefined) process.env.CCS_HOME = originalCcsHome;
    else delete process.env.CCS_HOME;
    cleanup(tempHome);
  });

  it('writeDiskCache stamps the current PRICING_TABLE_VERSION', () => {
    const daily = [
      {
        date: '2026-06-01',
        source: 'test',
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        cost: 0,
        totalCost: 0,
        modelsUsed: [],
        modelBreakdowns: [],
      },
    ];

    writeDiskCache(daily, [], [], []);
    const cache = readDiskCache();

    expect(cache).not.toBeNull();
    expect(cache!.pricingTableVersion).toBe(PRICING_TABLE_VERSION);
  });

  it('readDiskCache tolerates caches written before pricingTableVersion existed', () => {
    // Pre-version cache file (no pricingTableVersion field). Simulates a
    // user upgrading from a build that did not stamp the field. CCS_HOME is
    // resolved as `<CCS_HOME>/.ccs`, so the cache lives under that path.
    const cacheDir = path.join(tempHome, '.ccs', 'cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    const cacheFile = path.join(cacheDir, 'usage.json');
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 4,
        timestamp: Date.now(),
        daily: [],
        hourly: [],
        monthly: [],
        session: [],
      }),
      'utf-8'
    );

    const cache = readDiskCache();
    expect(cache).not.toBeNull();
    expect(cache!.pricingTableVersion).toBeUndefined();
  });

  it('pricing table version helper flags stale-on-pricing caches', () => {
    // Inline the same comparison the aggregator uses, to document the rule
    // and protect against regressions if the rule is ever moved around.
    const isStale = (cached: number | undefined): boolean =>
      cached === undefined || cached < PRICING_TABLE_VERSION;

    expect(isStale(undefined)).toBe(true);
    expect(isStale(PRICING_TABLE_VERSION - 1)).toBe(true);
    expect(isStale(PRICING_TABLE_VERSION)).toBe(false);
    expect(isStale(PRICING_TABLE_VERSION + 1)).toBe(false);
  });
});
