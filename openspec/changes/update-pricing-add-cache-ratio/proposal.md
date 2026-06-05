## Why

Model pricing is outdated — GPT-5.5, MiniMax-M3, DeepSeek V4, MiMo V2.5, and several GLM variants are missing or have stale rates. The model details popover shows usage % and I/O ratio badges but lacks a cache efficiency indicator, making it hard to assess cache performance at a glance.

## What Changes

- Add missing model pricing entries (GPT-5.5, MiniMax-M3, DeepSeek V4 Pro/Flash, MiMo V2.5 Pro/Standard, new GLM variants) and fix outdated GLM 4.5–4.7 rates
- Add a cache ratio badge to the model details popover alongside the existing usage % and I/O ratio tags, color-coded by hit rate thresholds

## Capabilities

### New Capabilities
- `model-pricing-update`: Add and fix model pricing entries in the static pricing registry with current official rates in USD per 1M tokens
- `cache-ratio-badge`: Display a cache hit ratio indicator in the model details popover, color-coded: red (#c20000) below 50%, orange (#f54900) 50–85%, green (#6ed192) above 85%

### Modified Capabilities
<!-- None — these are additive changes that don't alter existing spec behavior -->

## Impact

- `src/web-server/model-pricing.ts` — PRICING_REGISTRY entries
- `tests/unit/model-pricing.test.ts` — test updates for ambiguous model fallback
- `ui/src/components/analytics/model-details-content.tsx` — new cache ratio badge
