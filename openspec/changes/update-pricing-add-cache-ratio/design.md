## Context

The CCS static pricing registry (`src/web-server/model-pricing.ts`) maps model IDs to USD-per-1M-token rates. Several recently released models are missing, and some GLM rates were sourced from outdated OpenRouter pricing. The model details popover (`model-details-content.tsx`) currently shows only usage % and I/O ratio badges — no cache health indicator.

## Goals / Non-Goals

**Goals:**
- Add current official pricing for all requested models with verified USD rates
- Add a cache hit ratio badge to the model details popover with color thresholds

**Non-Goals:**
- Migrate to a dynamic pricing API (models.dev is already integrated as a provider-aware fallback)
- Add cache ratio to any other card or component

## Decisions

**Pricing source**: Official provider pricing pages (api-docs.deepseek.com, platform.minimax.io, docs.z.ai, openai.com, platform.xiaomimimo.com). Cross-verified against independent aggregators (aicost.tools, tokencost.app, cloudprice.net).

**Cache ratio badge placement**: Insert as a third `Badge` in the existing badges row (after usage %, after I/O ratio), using the same `text-[10px] h-5 px-1.5` style. The `Badge` variant uses a custom CSS background since shadcn variants don't map to the required colors.

**Color logic**:
- `< 50%` → background `#c20000` (red, poor)
- `50%–85%` → background `#f54900` (orange, moderate)
- `> 85%` → background `#6ed192` (green, good)

**Calculation**: Cache hit ratio = `cacheReadTokens / (inputTokens + cacheReadTokens) * 100`. Same formula already used in `model-details-content.tsx` line 20.

## Risks / Trade-offs

- Cache ratio is an estimate (cache reads vs total input) — not true cache hit rate from the API. Already documented via the existing percentage display.
