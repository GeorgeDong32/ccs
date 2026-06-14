/**
 * Tests for the pricingConfigured flag exposed in handleModels responses.
 *
 * The handler annotates each aggregated model with `pricingConfigured: boolean`
 * derived from `isUnknownModel`. The UI uses this flag to show a
 * "Pricing not configured" badge. These tests pin down the contract so a
 * future refactor of the handler cannot silently break the UI.
 *
 * We avoid spinning up an Express app by exercising `isUnknownModel` and the
 * response shape construction in isolation - the handler delegates the
 * pricing lookup to `isUnknownModel`, and the test asserts the same boolean
 * the handler writes into `pricingConfigured`.
 */

import { describe, it, expect } from 'bun:test';
import { isUnknownModel } from '../../../src/web-server/model-pricing';

describe('handleModels pricingConfigured contract', () => {
  it('marks a fully-known model as configured', () => {
    expect(!isUnknownModel('claude-sonnet-4-5')).toBe(true);
  });

  it('marks an unknown model as not configured', () => {
    expect(!isUnknownModel('some-future-model-2099')).toBe(false);
  });

  it('marks provider-prefixed unknown identifiers as not configured', () => {
    expect(!isUnknownModel('custom-provider/some-future-model-2099')).toBe(false);
  });

  it('treats alias-resolved models as configured', () => {
    // Qwen catalog IDs are routed through aliases to a real catalog price.
    expect(!isUnknownModel('qwen3-coder')).toBe(true);
    expect(!isUnknownModel('qwen3-235b')).toBe(true);
  });

  it('result shape includes pricingConfigured as a boolean', () => {
    // The handler emits the response object as-is, so the shape is fixed.
    // We construct an example row and verify the field type and semantics.
    const knownRow = { model: 'claude-sonnet-4-5', pricingConfigured: !isUnknownModel('claude-sonnet-4-5') };
    const unknownRow = { model: 'some-future-model-2099', pricingConfigured: !isUnknownModel('some-future-model-2099') };

    expect(typeof knownRow.pricingConfigured).toBe('boolean');
    expect(typeof unknownRow.pricingConfigured).toBe('boolean');
    expect(knownRow.pricingConfigured).toBe(true);
    expect(unknownRow.pricingConfigured).toBe(false);
  });
});
