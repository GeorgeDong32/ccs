/**
 * Unit tests for computeEffectiveIoRatio and cache-inclusive I/O ratio logic
 */

import { describe, it, expect } from 'bun:test';
import {
  computeEffectiveIoRatio,
  detectAnomalies,
} from '../../../src/web-server/usage/handlers';
import type { DailyUsage } from '../../../src/web-server/usage/types';

// ============================================================================
// T002: computeEffectiveIoRatio unit tests
// ============================================================================

describe('computeEffectiveIoRatio', () => {
  it('includes cache tokens in numerator', () => {
    // 10K input + 5K cacheCreation + 20K cacheRead = 35K effective input
    // 35K / 2K output = 17.5
    expect(computeEffectiveIoRatio(10_000, 5_000, 20_000, 2_000)).toBe(17.5);
  });

  it('returns 0 when output is 0', () => {
    expect(computeEffectiveIoRatio(10_000, 5_000, 20_000, 0)).toBe(0);
  });

  it('returns 0 when all tokens are 0', () => {
    expect(computeEffectiveIoRatio(0, 0, 0, 0)).toBe(0);
  });

  it('matches old formula when cache tokens are zero', () => {
    // Backward compatibility: no cache = same result as old inputTokens/outputTokens
    expect(computeEffectiveIoRatio(10_000, 0, 0, 2_000)).toBe(5);
  });

  it('handles cache-only input', () => {
    // 0 input + cache only → 100K cacheRead / 1K output = 100
    expect(computeEffectiveIoRatio(0, 0, 100_000, 1_000)).toBe(100);
  });

  it('handles cache creation only input', () => {
    expect(computeEffectiveIoRatio(0, 50_000, 0, 1_000)).toBe(50);
  });

  it('rounds to natural decimal', () => {
    // 10K + 3K + 7K = 20K / 3K = 6.666...
    const result = computeEffectiveIoRatio(10_000, 3_000, 7_000, 3_000);
    expect(result).toBeCloseTo(6.667, 2);
  });
});

// ============================================================================
// T004: Anomaly detection with cache-inclusive ioRatio
// ============================================================================

describe('detectAnomalies - high_io_ratio with cache tokens', () => {
  it('detects high_io_ratio when cache read pushes effective ratio above threshold', () => {
    // 5M input + 0 cacheCreation + 50M cacheRead = 55M effective
    // 55M / 100K output = 550 → well above threshold of 100
    const dailyData: DailyUsage[] = [
      {
        date: '20250401',
        source: 'claude',
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        cost: 0,
        totalCost: 10,
        modelsUsed: ['claude-3-opus'],
        modelBreakdowns: [
          {
            modelName: 'claude-3-opus',
            inputTokens: 5_000_000,
            outputTokens: 100_000,
            cacheCreationTokens: 0,
            cacheReadTokens: 50_000_000,
            cost: 10,
          },
        ],
      },
    ];

    const anomalies = detectAnomalies(dailyData);
    const ioAnomaly = anomalies.find((a) => a.type === 'high_io_ratio');

    expect(ioAnomaly).toBeDefined();
    expect(ioAnomaly!.model).toBe('claude-3-opus');
    expect(ioAnomaly!.value).toBe(550);
  });

  it('does not flag high_io_ratio when effective ratio is below threshold', () => {
    // 5M input + 0 cache → ratio = 50, below threshold of 100
    const dailyData: DailyUsage[] = [
      {
        date: '20250401',
        source: 'claude',
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        cost: 0,
        totalCost: 10,
        modelsUsed: ['claude-3-opus'],
        modelBreakdowns: [
          {
            modelName: 'claude-3-opus',
            inputTokens: 5_000_000,
            outputTokens: 100_000,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            cost: 10,
          },
        ],
      },
    ];

    const anomalies = detectAnomalies(dailyData);
    const ioAnomaly = anomalies.find((a) => a.type === 'high_io_ratio');
    expect(ioAnomaly).toBeUndefined();
  });

  it('does not flag high_io_ratio when output is zero', () => {
    const dailyData: DailyUsage[] = [
      {
        date: '20250401',
        source: 'claude',
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        cost: 0,
        totalCost: 10,
        modelsUsed: ['claude-3-opus'],
        modelBreakdowns: [
          {
            modelName: 'claude-3-opus',
            inputTokens: 50_000_000,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 100_000_000,
            cost: 10,
          },
        ],
      },
    ];

    const anomalies = detectAnomalies(dailyData);
    const ioAnomaly = anomalies.find((a) => a.type === 'high_io_ratio');
    expect(ioAnomaly).toBeUndefined();
  });
});
