## 1. Pricing module changes

- [x] 1.1 Set `UNKNOWN_MODEL_PRICING` in `src/web-server/model-pricing.ts` to all-zero (input/output/cacheCreation/cacheRead = 0).
- [x] 1.2 Export `PRICING_TABLE_VERSION` from `src/web-server/model-pricing.ts` (initial value, e.g. `1`).
- [x] 1.3 Export a pure function `isUnknownModel(model: string): boolean` that returns `true` iff the resolved pricing is the unknown-model pricing.
- [x] 1.4 Update existing unit tests in `tests/unit/model-pricing.test.ts` to assert the new zero fallback (replace the previous "should return fallback pricing for unknown models" expectations).

## 2. Usage cache & aggregator

- [x] 2.1 Add a `pricingTableVersion` field to the disk cache schema in `src/web-server/usage/disk-cache.ts` (next to the existing `CACHE_VERSION`); keep backward-compat for caches without the field.
- [x] 2.2 In `src/web-server/usage/aggregator.ts`, when reading a cached aggregate, compare the stored `pricingTableVersion` to the current `PRICING_TABLE_VERSION`; if lower, drop the cached cost figures and recompute from current pricing while keeping token counts.
- [x] 2.3 Add/update integration tests under `tests/integration/usage/` covering: same-version no-recompute, bumped-version recompute, token counts preserved across recompute.

## 3. API surface

- [x] 3.1 Extend the usage response (handler in `src/web-server/usage/handlers.ts`) to include an `unknownModels: string[]` field listing model identifiers whose cost was computed from the zero-priced fallback.
- [x] 3.2 Add a unit/integration test for the handler verifying the `unknownModels` list is populated correctly and excluded for known models.

## 4. Frontend

- [x] 4.1 In the analytics "Cost by model" card, render a "Pricing not configured" badge for rows whose model appears in `unknownModels`.
- [x] 4.2 Visually verify in dev (`bun run dev`) that a model not in the registry shows the badge and a cost of 0.

## 5. Documentation

- [x] 5.1 Add a "Model pricing & unknown models" section to the relevant page under `docs/` (e.g. `docs/analytics/` or `docs/usage-pricing.md` depending on the existing structure) covering: zero fallback, how to register a model, recomputation trigger.
- [x] 5.2 Note the behavior change in the next release notes / CHANGELOG.

## 6. Validation

- [x] 6.1 Run `bun run format` and `bun run validate` and fix any issues.
- [x] 6.2 Run `cd ui && bun run format && bun run validate` for UI-side changes.
- [x] 6.3 If touching debt-sensitive code, run `bun run maintainability:check:strict`.
- [x] 6.4 Smoke test in dev: register a fake new model, confirm cost = 0 and badge shows; add the model to `PRICING_REGISTRY`, refresh, confirm cost recomputes.
