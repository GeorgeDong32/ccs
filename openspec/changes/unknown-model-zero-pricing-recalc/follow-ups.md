# Follow-ups (deferred SUGGESTIONs)

These items were raised by the verification review but are **not** blockers for
this change. Each is intentionally deferred because the impact is low, the
fix is non-trivial, or it would expand the scope of the change.

## S1. `prewarmUsageCache` recompute path has no test
- **Why deferred:** The lazy `ensureDiskCacheLoaded` path is covered by unit
  tests, and the version-mismatch logic now lives in the shared
  `isCachePricingStale` helper, so a refactor of the eager path that breaks
  the version check will still fail the helper's tests.
- **Where:** `src/web-server/usage/aggregator.ts:677-748`
- **Action:** Add a focused test that injects a stale `pricingTableVersion`
  cache and asserts `prewarmUsageCache` does not call `cache.set` and triggers
  a background refresh.

## S2. `lastFetchTimestamp` lag during background refresh
- **Why deferred:** Cosmetic only. Callers that read the "last updated"
  timestamp will see the disk cache's timestamp until the background refresh
  completes (a few seconds at most).
- **Where:** `src/web-server/usage/aggregator.ts:723-732`
- **Action:** Consider resetting `lastFetchTimestamp` to `Date.now()` at the
  start of the refresh so the UI shows "refreshing…" semantics.

## S3. "Experimental models are free" vs "unknown = 0" semantics
- **Why deferred:** The two are correctly distinguished by `isUnknownModel`
  (registered zero ≠ unknown), and the dashboard cost is `$0` in both cases
  by design. A future contributor might be confused.
- **Where:** `tests/unit/model-pricing.test.ts:276-285`
- **Action:** Add a comment to the test explaining the distinction.

## S4. i18n key duplication across 4 language blocks
- **Why deferred:** Matches the existing convention in `i18n.ts` where every
  key is repeated per language. No regression risk; documenting the
  convention is out of scope.
- **Where:** `ui/src/lib/i18n.ts:1064, 2452, 3904, 5374`
- **Action:** None unless a translator-context section is added to
  `docs/i18n-dashboard.md`.

## S5. Spec scenario wording for cache recompute
- **Why deferred:** The implementation drops the entire in-memory cache
  rather than surgically removing only cost fields, so the wording "token
  counts are still served from cache" is technically imprecise. The user
  behavior is the same.
- **Where:** `openspec/changes/unknown-model-zero-pricing-recalc/specs/model-pricing-fallback/spec.md`
- **Action:** Tighten the scenario text in a future pass.

## S6. PRICING_TABLE_VERSION bump must be atomic with registry edit
- **Why deferred:** This is a contributor discipline concern, not a code
  defect. The 5.1 doc could be sharper.
- **Where:** `docs/analytics-pricing.md:47`
- **Action:** Add a sentence warning that the bump and the edit must be in
  the same commit.
