## 1. Update pricing registry

- [ ] 1.1 Update `mimo-v2.5-pro` in `src/web-server/model-pricing.ts` to 1.74/3.48/0.0/0.0145
- [ ] 1.2 Update `deepseek-v4-pro` in `src/web-server/model-pricing.ts` to 1.74/3.48/0.0/0.0145
- [ ] 1.3 Update `MiniMax-M3.cacheCreationPerMillion` to 0.75
- [ ] 1.4 Update `MiniMax-M2.7.cacheCreationPerMillion` to 0.375
- [ ] 1.5 Update `MiniMax-M2.5.cacheReadPerMillion` to 0.06
- [ ] 1.6 Add `kimi-k2.6` entry (0.95/4.0/0.0/0.16) after `kimi-k2.5`
- [ ] 1.7 Add `qwen3.7-max` entry (2.5/7.5/3.125/0.5) with tiered-pricing TODO comment
- [ ] 1.8 Add `qwen3.7-plus` entry (0.4/1.6/0.5/0.04) with tiered-pricing TODO comment
- [ ] 1.9 Add `qwen3.6-plus` entry (0.5/3.0/0.625/0.05) with tiered-pricing TODO comment

## 2. Update unit tests

- [ ] 2.1 Add `getModelPricing` test for `kimi-k2.6` covering all four pricing fields
- [ ] 2.2 Add `getModelPricing` test for `MiniMax-M2.7` (cache write update)
- [ ] 2.3 Add `getModelPricing` test for `MiniMax-M3` (cache write update)
- [ ] 2.4 Add `getModelPricing` test for `MiniMax-M2.5` (cache read update)
- [ ] 2.5 Add `getModelPricing` test for `qwen3.7-max`
- [ ] 2.6 Add `getModelPricing` test for `qwen3.7-plus`
- [ ] 2.7 Add `getModelPricing` test for `qwen3.6-plus`
- [ ] 2.8 Add `getModelPricing` test for updated `deepseek-v4-pro`
- [ ] 2.9 Add `getModelPricing` test for updated `mimo-v2.5-pro`
- [ ] 2.10 Add `calculateCost` end-to-end test for `qwen3.7-plus` (all four token types)
- [ ] 2.11 Add `calculateCost` end-to-end test for `MiniMax-M3` (verifying non-zero cache write)
- [ ] 2.12 Add `calculateCost` end-to-end test for `kimi-k2.6`

## 3. Validate

- [ ] 3.1 Run `bun run format` to fix any formatting
- [ ] 3.2 Run `bun test tests/unit/model-pricing.test.ts` and confirm all 44+ tests pass
- [ ] 3.3 Run `bun run typecheck` to confirm no type errors
- [ ] 3.4 Run `bun run lint` to confirm no lint errors
- [ ] 3.5 Run `bun run format:check` to confirm formatting clean
- [ ] 3.6 Manually verify 14 target entries in `model-pricing.ts` match the user's pricing table

## 4. Commit

- [ ] 4.1 Stage `src/web-server/model-pricing.ts` and `tests/unit/model-pricing.test.ts`
- [ ] 4.2 Commit with conventional message: `fix(analytics): refresh model pricing registry to 2026-06 rates`
- [ ] 4.3 Note in commit body: GLM/Kimi/MiMo/MiniMax/DeepSeek/Qwen prices synced; cache_write set to 0 for models with no quoted cache write fee
