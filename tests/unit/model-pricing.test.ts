/**
 * Unit tests for model-pricing.ts
 */
import { describe, it, expect } from 'bun:test';
import {
  getModelPricing,
  calculateCost,
  getKnownModels,
  hasCustomPricing,
  isUnknownModel,
  PRICING_TABLE_VERSION,
  type TokenUsage,
} from '../../src/web-server/model-pricing';

describe('model-pricing', () => {
  describe('getModelPricing', () => {
    it('should return exact match pricing', () => {
      const pricing = getModelPricing('claude-sonnet-4-5-20250929');
      expect(pricing.inputPerMillion).toBe(3.0);
      expect(pricing.outputPerMillion).toBe(15.0);
    });

    it('should return pricing for all known models', () => {
      const knownModels = getKnownModels();
      expect(knownModels.length).toBeGreaterThanOrEqual(60); // 62 models from better-ccusage integration

      for (const model of knownModels) {
        const pricing = getModelPricing(model);
        expect(pricing).toBeDefined();
        expect(typeof pricing.inputPerMillion).toBe('number');
      }
    });

    it('should return zero pricing for unknown models (no fallback substitution)', () => {
      const pricing = getModelPricing('unknown-model-xyz');
      expect(pricing.inputPerMillion).toBe(0);
      expect(pricing.outputPerMillion).toBe(0);
      expect(pricing.cacheCreationPerMillion).toBe(0);
      expect(pricing.cacheReadPerMillion).toBe(0);
    });

    it('should handle provider-prefixed model names', () => {
      const pricing = getModelPricing('anthropic/claude-sonnet-4-5');
      expect(pricing).toBeDefined();
      // Should match via normalization
    });

    it('should resolve lowercase MiniMax model IDs to custom pricing', () => {
      const pricing = getModelPricing('minimax-m2.5');
      expect(pricing.inputPerMillion).toBe(0.3);
      expect(pricing.outputPerMillion).toBe(1.2);
    });

    it('should resolve provider-prefixed MiniMax model IDs to custom pricing', () => {
      const pricing = getModelPricing('minimax/MiniMax-M2.5');
      expect(pricing.inputPerMillion).toBe(0.3);
      expect(pricing.outputPerMillion).toBe(1.2);
    });

    it('should use updated MiniMax-M2.1-lightning input pricing', () => {
      const pricing = getModelPricing('MiniMax-M2.1-lightning');
      expect(pricing.inputPerMillion).toBe(0.6);
    });

    it('should not treat known Qwen catalog IDs as unknown', () => {
      const catalogIds = ['qwen3-235b', 'qwen3-vl-plus', 'qwen3-32b'];

      for (const model of catalogIds) {
        const pricing = getModelPricing(model);
        // Qwen aliases resolve to a real catalog price, not the zero fallback.
        expect(isUnknownModel(model)).toBe(false);
        // Sanity: the resolved price is not the zero fallback.
        const isZero = Object.values(pricing).every((v) => v === 0);
        expect(isZero).toBe(false);
      }
    });

    it('should map qwen3-coder to deterministic custom pricing', () => {
      const pricing = getModelPricing('qwen3-coder');
      const canonical = getModelPricing('qwen3-coder-plus');

      expect(pricing).toEqual(canonical);
      // Sanity: qwen3-coder alias resolves to a non-zero (real) price,
      // not the zero-priced unknown-model fallback.
      const isZero = Object.values(pricing).every((v) => v === 0);
      expect(isZero).toBe(false);
    });

    it('should map Gemini 3 and 3.1 Flash preview variants to flash pricing', () => {
      const canonical = getModelPricing('gemini-2.5-flash');
      const aliases = [
        'gemini-3-flash-preview',
        'gemini-3-flash-preview-customtools',
        'gemini-3.1-flash-preview',
        'gemini-3.1-flash-preview-customtools',
        'gemini-3-1-flash-preview',
        'gemini-3-1-flash-preview-customtools',
      ];

      for (const model of aliases) {
        expect(getModelPricing(model)).toEqual(canonical);
      }
    });

    it('should return different pricing for different model tiers', () => {
      const sonnet = getModelPricing('claude-sonnet-4-5');
      const opus = getModelPricing('claude-opus-4-5-20251101');
      const haiku = getModelPricing('claude-haiku-4-5-20251001');

      expect(opus.inputPerMillion).toBeGreaterThan(sonnet.inputPerMillion);
      expect(sonnet.inputPerMillion).toBeGreaterThan(haiku.inputPerMillion);
    });

    it('should return correct pricing for Claude Opus 4.6 (not 3x Opus 4 rate)', () => {
      const opus46 = getModelPricing('claude-opus-4-6');
      expect(opus46.inputPerMillion).toBe(5.0);
      expect(opus46.outputPerMillion).toBe(25.0);
    });

    it('should return correct pricing for Claude Opus 4.6 thinking variant', () => {
      const opus46t = getModelPricing('claude-opus-4-6-thinking');
      expect(opus46t.inputPerMillion).toBe(5.0);
      expect(opus46t.outputPerMillion).toBe(25.0);
    });

    it('should return correct pricing for Claude Sonnet 4.6', () => {
      const sonnet46 = getModelPricing('claude-sonnet-4-6');
      expect(sonnet46.inputPerMillion).toBe(3.0);
      expect(sonnet46.outputPerMillion).toBe(15.0);
    });

    it('should match date-stamped Claude Opus 4.6 to correct pricing', () => {
      const opus46dated = getModelPricing('claude-opus-4-6-20260101');
      expect(opus46dated.inputPerMillion).toBe(5.0);
      expect(opus46dated.outputPerMillion).toBe(25.0);
    });

    it('should match date-stamped Claude Sonnet 4.6 to correct pricing', () => {
      const sonnet46dated = getModelPricing('claude-sonnet-4-6-20260115');
      expect(sonnet46dated.inputPerMillion).toBe(3.0);
      expect(sonnet46dated.outputPerMillion).toBe(15.0);
    });

    it('should match provider-prefixed date-stamped model to correct pricing', () => {
      const opus46 = getModelPricing('anthropic/claude-opus-4-6-20260101');
      expect(opus46.inputPerMillion).toBe(5.0);
      expect(opus46.outputPerMillion).toBe(25.0);
    });

    it('should match date-stamped thinking Claude Opus 4.6 to correct pricing', () => {
      const opus46 = getModelPricing('claude-opus-4-6-20260101-thinking');
      expect(opus46.inputPerMillion).toBe(5.0);
      expect(opus46.outputPerMillion).toBe(25.0);
    });

    it('should match provider-prefixed date-stamped thinking model to correct pricing', () => {
      const opus46 = getModelPricing('anthropic/claude-opus-4-6-20260101-thinking');
      expect(opus46.inputPerMillion).toBe(5.0);
      expect(opus46.outputPerMillion).toBe(25.0);
    });

    it('should return 2026-06 pricing for Kimi K2.6', () => {
      const pricing = getModelPricing('kimi-k2.6');
      expect(pricing.inputPerMillion).toBe(0.95);
      expect(pricing.outputPerMillion).toBe(4.0);
      expect(pricing.cacheCreationPerMillion).toBe(0.0);
      expect(pricing.cacheReadPerMillion).toBe(0.16);
    });

    it('should return updated MiniMax-M2.7 cache write pricing', () => {
      const pricing = getModelPricing('MiniMax-M2.7');
      expect(pricing.inputPerMillion).toBe(0.3);
      expect(pricing.outputPerMillion).toBe(1.2);
      expect(pricing.cacheCreationPerMillion).toBe(0.375);
      expect(pricing.cacheReadPerMillion).toBe(0.06);
    });

    it('should return updated MiniMax-M3 pricing (corrected rates)', () => {
      const pricing = getModelPricing('MiniMax-M3');
      expect(pricing.inputPerMillion).toBe(0.3);
      expect(pricing.outputPerMillion).toBe(1.2);
      expect(pricing.cacheCreationPerMillion).toBe(0.0);
      expect(pricing.cacheReadPerMillion).toBe(0.06);
    });

    it('should return updated MiniMax-M2.5 cache read pricing', () => {
      const pricing = getModelPricing('MiniMax-M2.5');
      expect(pricing.cacheCreationPerMillion).toBe(0.375);
      expect(pricing.cacheReadPerMillion).toBe(0.06);
    });

    it('should return 2026-06 pricing for Qwen 3.7 Max', () => {
      const pricing = getModelPricing('qwen3.7-max');
      expect(pricing.inputPerMillion).toBe(2.5);
      expect(pricing.outputPerMillion).toBe(7.5);
      expect(pricing.cacheCreationPerMillion).toBe(3.125);
      expect(pricing.cacheReadPerMillion).toBe(0.5);
    });

    it('should return 2026-06 pricing for Qwen 3.7 Plus (≤256K tier)', () => {
      const pricing = getModelPricing('qwen3.7-plus');
      expect(pricing.inputPerMillion).toBe(0.4);
      expect(pricing.outputPerMillion).toBe(1.6);
      expect(pricing.cacheCreationPerMillion).toBe(0.5);
      expect(pricing.cacheReadPerMillion).toBe(0.04);
    });

    it('should return 2026-06 pricing for Qwen 3.6 Plus (≤256K tier)', () => {
      const pricing = getModelPricing('qwen3.6-plus');
      expect(pricing.inputPerMillion).toBe(0.5);
      expect(pricing.outputPerMillion).toBe(3.0);
      expect(pricing.cacheCreationPerMillion).toBe(0.625);
      expect(pricing.cacheReadPerMillion).toBe(0.05);
    });

    it('should return 2026-06 pricing for deepseek-v4-pro', () => {
      const pricing = getModelPricing('deepseek-v4-pro');
      expect(pricing.inputPerMillion).toBe(1.74);
      expect(pricing.outputPerMillion).toBe(3.48);
      expect(pricing.cacheReadPerMillion).toBe(0.0145);
    });

    it('should return 2026-06 pricing for mimo-v2.5-pro', () => {
      const pricing = getModelPricing('mimo-v2.5-pro');
      expect(pricing.inputPerMillion).toBe(1.74);
      expect(pricing.outputPerMillion).toBe(3.48);
      expect(pricing.cacheReadPerMillion).toBe(0.0145);
    });

    it('should return correct pricing for GLM 5.2', () => {
      const pricing = getModelPricing('glm-5.2');
      expect(pricing.inputPerMillion).toBe(1.4);
      expect(pricing.outputPerMillion).toBe(4.4);
      expect(pricing.cacheCreationPerMillion).toBe(0.0);
      expect(pricing.cacheReadPerMillion).toBe(0.26);
    });

    it('should return correct pricing for Kimi K2.7 Code', () => {
      const pricing = getModelPricing('kimi-k2.7-code');
      expect(pricing.inputPerMillion).toBe(0.95);
      expect(pricing.outputPerMillion).toBe(4.0);
      expect(pricing.cacheCreationPerMillion).toBe(0.0);
      expect(pricing.cacheReadPerMillion).toBe(0.19);
    });

    it('should return correct high-tier pricing for Qwen 3.7 Plus (>256K)', () => {
      const pricing = getModelPricing('qwen3.7-plus-high');
      expect(pricing.inputPerMillion).toBe(1.2);
      expect(pricing.outputPerMillion).toBe(4.8);
      expect(pricing.cacheCreationPerMillion).toBe(1.5);
      expect(pricing.cacheReadPerMillion).toBe(0.12);
    });

    it('should return correct high-tier pricing for Qwen 3.6 Plus (>256K)', () => {
      const pricing = getModelPricing('qwen3.6-plus-high');
      expect(pricing.inputPerMillion).toBe(2.0);
      expect(pricing.outputPerMillion).toBe(6.0);
      expect(pricing.cacheCreationPerMillion).toBe(2.5);
      expect(pricing.cacheReadPerMillion).toBe(0.2);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly for input tokens', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      };
      const cost = calculateCost(usage, 'claude-sonnet-4-5');
      expect(cost).toBe(3.0); // $3.00 per million input tokens
    });

    it('should calculate cost correctly for output tokens', () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 1_000_000,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      };
      const cost = calculateCost(usage, 'claude-sonnet-4-5');
      expect(cost).toBe(15.0); // $15.00 per million output tokens
    });

    it('should calculate combined cost correctly', () => {
      const usage: TokenUsage = {
        inputTokens: 500_000,
        outputTokens: 100_000,
        cacheCreationTokens: 50_000,
        cacheReadTokens: 200_000,
      };
      const cost = calculateCost(usage, 'claude-sonnet-4-5');
      // 0.5M * 3.0 + 0.1M * 15.0 + 0.05M * 3.75 + 0.2M * 0.30
      // = 1.5 + 1.5 + 0.1875 + 0.06
      expect(cost).toBeCloseTo(3.2475, 4);
    });

    it('should return 0 for zero usage', () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      };
      const cost = calculateCost(usage, 'claude-sonnet-4-5');
      expect(cost).toBe(0);
    });

    it('should return 0 cost for free-tier/experimental models', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        cacheCreationTokens: 100_000,
        cacheReadTokens: 50_000,
      };
      const cost = calculateCost(usage, 'gemini-2.0-flash-exp');
      expect(cost).toBe(0); // Experimental models are free
    });

    it('should calculate Claude Opus 4.6 cost including cache token rates', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheCreationTokens: 1_000_000,
        cacheReadTokens: 1_000_000,
      };
      const cost = calculateCost(usage, 'claude-opus-4-6');
      expect(cost).toBe(36.75); // 5 + 25 + 6.25 + 0.5
    });

    it('should calculate Qwen 3.7 Plus cost across all four token types', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        cacheCreationTokens: 200_000,
        cacheReadTokens: 300_000,
      };
      const cost = calculateCost(usage, 'qwen3.7-plus');
      // 1.0 * 0.4 + 0.5 * 1.6 + 0.2 * 0.5 + 0.3 * 0.04
      // = 0.4 + 0.8 + 0.1 + 0.012
      expect(cost).toBeCloseTo(1.312, 4);
    });

    it('should calculate MiniMax-M3 cost with corrected rates', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheCreationTokens: 1_000_000,
        cacheReadTokens: 0,
      };
      const cost = calculateCost(usage, 'MiniMax-M3');
      // 1.0 * 0.3 + 0 + 1.0 * 0 + 0
      expect(cost).toBeCloseTo(0.3, 4);
    });

    it('should calculate kimi-k2.6 cost with new rates', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheCreationTokens: 0,
        cacheReadTokens: 1_000_000,
      };
      const cost = calculateCost(usage, 'kimi-k2.6');
      // 1.0 * 0.95 + 1.0 * 4.0 + 0 + 1.0 * 0.16
      expect(cost).toBeCloseTo(5.11, 4);
    });

    it('should calculate kimi-k2.7-code cost with new rates', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheCreationTokens: 0,
        cacheReadTokens: 1_000_000,
      };
      const cost = calculateCost(usage, 'kimi-k2.7-code');
      // 1.0 * 0.95 + 1.0 * 4.0 + 0 + 1.0 * 0.19
      expect(cost).toBeCloseTo(5.14, 4);
    });

    it('should calculate Qwen 3.7 Plus high-tier cost correctly', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        cacheCreationTokens: 200_000,
        cacheReadTokens: 300_000,
      };
      const cost = calculateCost(usage, 'qwen3.7-plus-high');
      // 1.0 * 1.2 + 0.5 * 4.8 + 0.2 * 1.5 + 0.3 * 0.12
      // = 1.2 + 2.4 + 0.3 + 0.036
      expect(cost).toBeCloseTo(3.936, 4);
    });

    it('should calculate Qwen 3.6 Plus high-tier cost correctly', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        cacheCreationTokens: 200_000,
        cacheReadTokens: 300_000,
      };
      const cost = calculateCost(usage, 'qwen3.6-plus-high');
      // 1.0 * 2.0 + 0.5 * 6.0 + 0.2 * 2.5 + 0.3 * 0.2
      // = 2.0 + 3.0 + 0.5 + 0.06
      expect(cost).toBeCloseTo(5.56, 4);
    });
  });

  describe('getKnownModels', () => {
    it('should return array of model names', () => {
      const models = getKnownModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should include Claude models', () => {
      const models = getKnownModels();
      expect(models.some((m) => m.startsWith('claude-'))).toBe(true);
    });

    it('should include GLM models', () => {
      const models = getKnownModels();
      expect(models.some((m) => m.startsWith('glm-'))).toBe(true);
    });
  });

  describe('hasCustomPricing', () => {
    it('should return true for known models', () => {
      expect(hasCustomPricing('claude-sonnet-4-5')).toBe(true);
      expect(hasCustomPricing('glm-4.6')).toBe(true);
    });

    it('should return true for deterministic qwen3-coder alias', () => {
      expect(hasCustomPricing('qwen3-coder')).toBe(true);
    });

    it('should not treat date-stamped non-Claude IDs as deterministic aliases', () => {
      expect(hasCustomPricing('qwen3-32b-20260101')).toBe(false);
    });

    it('should return false for unknown models', () => {
      expect(hasCustomPricing('unknown-model-xyz')).toBe(false);
    });
  });

  describe('isUnknownModel', () => {
    it('returns true for an identifier that has no registry match', () => {
      expect(isUnknownModel('unknown-model-xyz')).toBe(true);
      expect(isUnknownModel('some-future-model-2099')).toBe(true);
    });

    it('returns true even when stripped/normalized variants have no match', () => {
      expect(isUnknownModel('anthropic/some-future-model-2099')).toBe(true);
    });

    it('returns false for canonical, fully-known identifiers', () => {
      expect(isUnknownModel('claude-sonnet-4-5')).toBe(false);
      expect(isUnknownModel('claude-opus-4-6-20260101')).toBe(false);
    });

    it('returns false for known aliases that resolve via suffix/family match', () => {
      // Qwen catalog IDs hit known catalog pricing through aliases or family prefix.
      expect(isUnknownModel('qwen3-235b')).toBe(false);
      expect(isUnknownModel('qwen3-vl-plus')).toBe(false);
    });
  });

  describe('PRICING_TABLE_VERSION', () => {
    it('is exported as a positive integer', () => {
      expect(typeof PRICING_TABLE_VERSION).toBe('number');
      expect(Number.isInteger(PRICING_TABLE_VERSION)).toBe(true);
      expect(PRICING_TABLE_VERSION).toBeGreaterThanOrEqual(1);
    });
  });
});
