## Why

New models (GLM-5.2, Kimi K2.7, updated MiniMax M3 pricing) have been released with different pricing than currently registered. Additionally, the existing MiniMax M3 entry has incorrect (outdated) rates. The pricing table must be updated so cost calculations in usage analytics are accurate for users on these models.

## What Changes

- Add new model entry: **GLM-5.2** ($1.40/$4.40, cache read $0.26)
- Add new model entry: **Kimi K2.7 Code** ($0.95/$4.00, cache read $0.19)
- Update **MiniMax M3**: correct input from $0.60→$0.30, output from $2.40→$1.20, cacheCreation from $0.75→$0, cacheRead from $0.12→$0.06
- Add tiered pricing entries for **Qwen 3.7 Plus (>256K)** and **Qwen 3.6 Plus (>256K)** to close the existing TODO gap
- Bump `PRICING_TABLE_VERSION` to trigger cache recomputation

## Capabilities

### New Capabilities
<!-- No new capabilities — this is a data-only pricing table update -->

### Modified Capabilities
<!-- No existing spec requirement changes — only pricing data values change -->

## Impact

- `src/web-server/model-pricing.ts` — PRICING_REGISTRY entries + PRICING_TABLE_VERSION bump
- Downstream: usage aggregator will detect version bump and recompute cached cost figures automatically
