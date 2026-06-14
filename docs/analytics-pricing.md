# Model Pricing & Unknown Models

How the Analytics dashboard prices tokens, and what happens when it cannot find
a rate for a model you ran.

## TL;DR

- Models that have an entry in `PRICING_REGISTRY` are billed at their registered
  per-million-token rates (input / output / cache write / cache read).
- Models that do **not** match any registry entry are billed at **$0**. They are
  shown on the "Cost by model" card with a "Pricing not configured" badge so
  you can see at a glance which models need attention.
- After you add or change a price, the dashboard recomputes historical costs
  automatically — no cache clear, no restart required.

## Why $0 instead of a fallback?

Earlier versions of CCS substituted Claude Sonnet 4.5's rate ($3 input / $15
output per million) for any model it could not identify. This made the
dashboard look like it was reporting real spend, but the numbers were
invented. We now treat unknown models as $0 so the cost is at least truthful
about the fact that we do not know the rate.

If you have an internal or new model that is in fact billable, add it to
`PRICING_REGISTRY` (see below). The dashboard will pick it up on the next
refresh.

## How to register a model

Edit `src/web-server/model-pricing.ts` and add an entry under
`PRICING_REGISTRY`. All rates are USD per million tokens:

```ts
'my-new-model-2099': {
  inputPerMillion: 2.0,
  outputPerMillion: 8.0,
  cacheCreationPerMillion: 2.5,
  cacheReadPerMillion: 0.2,
},
```

For Claude-style date-stamped model IDs (e.g. `claude-sonnet-4-7-20260801`)
the registry already normalizes the date, so a single entry covers all
date-stamped variants. For aliases (e.g. `qwen3-coder`), use the
`MODEL_PRICING_ALIASES` map.

After editing, bump `PRICING_TABLE_VERSION` at the bottom of the same file.
This tells the aggregator that the on-disk cost figures are stale and must be
recomputed.

## How recomputation works

1. The dashboard stores aggregated token counts in a disk cache at
   `~/.ccs/cache/usage.json` along with a `pricingTableVersion` field.
2. When the server starts or the cache is read, the aggregator compares the
   stored `pricingTableVersion` to the current `PRICING_TABLE_VERSION`.
3. If the stored version is older, the cached cost fields are discarded and
   recomputed from the current `PRICING_REGISTRY`. Token counts are
   preserved.
4. The recompute happens lazily on the next dashboard request. You do not
   need to clear the cache manually.
5. You can also force a refresh via `POST /api/usage/refresh`.

## What you see in the UI

In the "Cost by model" card, each row that comes from a model with no
registered price shows an amber "Pricing not configured" badge next to the
model name and a cost of `$0.00`. Clicking the row still opens the per-model
detail view with the token breakdown — only the dollar figure is suppressed.

## Edge cases

- **Provider-prefixed model IDs** (`anthropic/claude-...`,
  `gemini/gemini-2.5-flash`): the prefix is stripped before lookup, so a
  single registry entry covers prefixed and unprefixed forms.
- **Date-stamped Claude IDs** (`claude-opus-4-6-20260101`): the date suffix is
  stripped, so the registry only needs the canonical `claude-opus-4-6` entry.
- **Family partial match** (`gpt-4-turbo-2024-04-09`): if a registry key is a
  prefix of the model name, the family rate is used. This is a fuzzy match
  by design — if you want a different rate for a variant, add an explicit
  entry.
- **Cache hits (`cacheRead`) and writes (`cacheCreation`)** use separate rates
  from input/output. For models that do not offer prompt caching, set
  `cacheCreationPerMillion` and `cacheReadPerMillion` to `0`.
