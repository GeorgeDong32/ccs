## 1. Pricing Registry Update

- [ ] 1.1 Add GPT-5.5 and GPT-5.5 Pro entries to PRICING_REGISTRY in `src/web-server/model-pricing.ts`
- [ ] 1.2 Add MiniMax-M3 entry with standard ≤512K rates
- [ ] 1.3 Add DeepSeek V4 Pro and V4 Flash entries; update deepseek-chat/reasoner legacy aliases to V4 rates
- [ ] 1.4 Fix GLM-4.5, GLM-4.6, GLM-4.7 rates to official Z.ai values; add GLM-4.7-FlashX, GLM-4.5-X, GLM-4.5-AirX
- [ ] 1.5 Add MiMo V2.5 Pro and MiMo V2.5 entries
- [ ] 1.6 Update `tests/unit/model-pricing.test.ts` for ambiguous model test (use non-existent model name since GPT-5.5 now has real pricing)

## 2. Cache Ratio Badge

- [ ] 2.1 Add cache ratio badge to `ui/src/components/analytics/model-details-content.tsx` with color thresholds (red/orange/green)
- [ ] 2.2 Wire cacheHitVariant logic into the new badge display

## 3. Verification

- [ ] 3.1 Run `bun test tests/unit/model-pricing.test.ts` — all 47 tests pass
- [ ] 3.2 Run `bun test tests/smoke/dashboard-smoke.test.ts` — all 8 tests pass
- [ ] 3.3 Manual: open model details popover and verify cache ratio badge appears with correct color
