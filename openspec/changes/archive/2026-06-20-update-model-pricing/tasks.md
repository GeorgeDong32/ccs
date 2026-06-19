## 1. Pricing Table Updates

- [x] 1.1 Add `glm-5.2` entry to PRICING_REGISTRY ($1.40/$4.40, cacheCreation 0, cacheRead $0.26)
- [x] 1.2 Add `kimi-k2.7-code` entry to PRICING_REGISTRY ($0.95/$4.00, cacheCreation 0, cacheRead $0.19)
- [x] 1.3 Update `MiniMax-M3` entry: input $0.60→$0.30, output $2.40→$1.20, cacheCreation $0.75→$0, cacheRead $0.12→$0.06
- [x] 1.4 Add `qwen3.7-plus-high` (>256K) entry ($1.20/$4.80, cacheCreation $1.50, cacheRead $0.12)
- [x] 1.5 Add `qwen3.6-plus-high` (>256K) entry ($2.00/$6.00, cacheCreation $2.50, cacheRead $0.20)
- [x] 1.6 Bump `PRICING_TABLE_VERSION` from 1 to 2

## 2. Validation

- [x] 2.1 Run `bun run test:unit` to verify no regressions
- [x] 2.2 Run `bun run format` to ensure code style
- [x] 2.3 Verify existing model entries are unchanged by diffing before/after
