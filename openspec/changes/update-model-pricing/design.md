## Context

The pricing table in `src/web-server/model-pricing.ts` (`PRICING_REGISTRY`) is a static key-value map of model IDs to their per-million-token USD rates. When new models launch or prices change, the only action needed is to edit entries in this object and bump `PRICING_TABLE_VERSION`. No architectural changes are required — the version bump alone triggers cache invalidation and cost recomputation downstream.

## Goals / Non-Goals

**Goals:**
- Add entries for GLM-5.2, Kimi K2.7 Code
- Correct MiniMax M3 pricing (current values are outdated)
- Add tiered (>256K) entries for Qwen 3.7 Plus and Qwen 3.6 Plus to close the existing TODO
- Bump `PRICING_TABLE_VERSION` so cached costs are recomputed

**Non-Goals:**
- Refactoring the pricing lookup logic
- Adding UI features
- Changing the pricing data model

## Decisions

**All decisions are straightforward** — this is a data-only update:

1. **New model IDs** follow existing naming conventions: lowercase kebab-case (`glm-5.2`, `kimi-k2.7-code`)
2. **cacheCreation is set to 0** for models that don't charge for cache writes (matching user-provided data where cache write is "-")
3. **Qwen tiered entries** use suffix naming: `qwen3.7-plus-high` and `qwen3.6-plus-high` to distinguish >256K tier from default ≤256K entries
4. **PRICING_TABLE_VERSION** bumped from 1→2

## Risks / Trade-offs

- **No breaking changes.** All existing entries are preserved; only new entries are added and one entry (MiniMax M3) is corrected.
- **Cache recomputation** is automatic and correct — the version bump causes downstream aggregators to invalidate and recompute all historical costs with the new rates.
