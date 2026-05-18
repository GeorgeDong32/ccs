## 1. i18n Translation Setup

- [x] 1.1 Add `cacheHitHigh`, `cacheHitMedium`, `cacheHitLow` keys to `analyticsCards` block in `ui/src/lib/i18n.ts` (en locale, ~line 2109)
- [x] 1.2 Add Chinese translations (zh-CN locale, ~line 4537)
- [x] 1.3 Add Vietnamese translations (vi locale, ~line 7049)
- [x] 1.4 Add Japanese translations (ja locale, ~line 9027)

## 2. Component Implementation

- [x] 2.1 Add `getCacheHitStatus()` function to `ui/src/components/analytics/model-details-content.tsx` (after `getIoRatioStatus`, ~line 164)
- [x] 2.2 Calculate `cacheHitRate` and `cacheHitStatus` in `ModelDetailsContent` component (after `ioRatioStatus`, ~line 15-16)
- [x] 2.3 Add conditional Badge rendering in Badge group (after I/O Ratio Badge, ~line 33)

## 3. Verification

- [x] 3.1 Run `cd ui && bun run format && bun run validate` to verify code quality
- [ ] 3.2 Manually test in dev server: click model with cache read tokens, verify three badges display
- [ ] 3.3 Manually test: click model without cache read tokens, verify cache hit badge is hidden
- [ ] 3.4 Test locale switching: verify translations display correctly in all four languages

## 4. Code Quality Fixes (W1 + W2)

- [x] 4.1 Simplify `getCacheHitStatus()` - remove description field, remove t parameter
- [x] 4.2 Update caller to use new simplified function signature
- [x] 4.3 Remove dead i18n keys (cacheHitHigh/Medium/Low) from all 4 locales
- [x] 4.4 Run `bun run format && bun run validate`