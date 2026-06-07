# Design — Update Model Pricing Registry (2026-06 Batch)

## Context

- `ModelPricing` 接口(扁平四字段)在 `src/web-server/model-pricing.ts:14-19` 定义,自注册表落地以来无结构性变更
- 既有 registry 已实现一次"主条目 + 后缀"模式分层(参考 `gemini-3-pro` / `gemini-3-pro-high`,line 437-449),为后续按需扩展分层价位预留了入口
- Qwen 3.6/3.7 Plus 在阿里云 Model Studio 公开页面有 ≤256K / >256K 双价位,owner 在本次明确**只录入主条目**,>256K 不建模
- 价目表全由 owner 直接提供,CCS 不再独立向 models.dev 等外部源拉取价格(commit `feat: integrate models.dev pricing metadata` 后已禁用外部源,当前 registry 纯静态)
- 测试基线:`tests/unit/model-pricing.test.ts` 现 44 个用例,`getKnownModels` 断言至少 60 个模型

## Goals / Non-Goals

**Goals:**
- 把 `PRICING_REGISTRY` 同步到 2026-06 公开价
- 给所有新条目与所有有数值变更的既有条目加单测覆盖
- 维持 `ModelPricing` 接口、查找函数、计算函数的契约不变
- 在源码中明确标注"分层价位未建模"以避免误读

**Non-Goals:**
- 把 `ModelPricing` 升级为联合类型或加入 threshold 字段
- 为 Qwen 3.6/3.7 Plus 引入 `*-high` 平行键(尽管 gemini-3 有先例)
- 修改 `MODEL_PRICING_ALIASES`、新增别名
- 同步 `ui/src/lib/openrouter-types.ts` 等独立价格通路
- 价格表未列出的模型(GLM-4.5/4.6/4.7、Kimi K2-Turbo、MiniMax-M2.1 等)

## Decisions

### D1: 维持 `ModelPricing` 扁平结构,不分层

**选择**:不为 Qwen 3.6/3.7 Plus 的 >256K 价位扩展接口;只新增 ≤256K 主条目。

**理由**:
- 价目表当前只列了 ≤256K 价位,owner 决策暂不建模高价位
- 升级为联合类型 / 加 threshold 字段会同时改动 `getModelPricing` 签名(需要 `usage`)和所有调用方 — 侵入面大、收益小
- 既有 `gemini-3-pro-high` 模式已经够用,本次 owner 明确"暂不启用",沿用扁平 + TODO 注释是 KISS 路径

**替代方案**:
- (A) 沿用 gemini-3 模式,新增 `qwen3.7-plus-high` / `qwen3.6-plus-high` 键。**不选** — owner 决策"只新增主条目"。
- (B) 扩展 `ModelPricing` 为联合类型 `ModelPricing | TieredModelPricing`,`getModelPricing(usage, model)` 接收 usage 做阈值判定。**不选** — 收益低、侵入大,等 owner 真的需要时再做。

### D2: cache_write 字段在表格中标 `-` 的模型统一置零

**选择**:GLM 全系、Kimi K2.5/K2.6、MiMo V2.5/Pro、DeepSeek V4 Pro/Flash 的 `cacheCreationPerMillion` 保持为 `0.0`。

**理由**:
- 用户提供的价目表中这些模型没有 cache_write 报价,CCS 不应自创数字
- `calculateCost` 公式:`cacheCreationCost = (cacheCreationTokens / 1M) * cacheCreationPerMillion`,字段为 0 时该类 token 不计入成本 — 与"Anthropic 风格 prompt caching 才有 cache write"的语义一致
- 与既有 `gpt-*` / `gemini-*` 条目(原值就是 0)的处理方式保持一致

**替代方案**:
- (A) 用 Anthropic 习惯 `cache_write ≈ 1.25 × input`。**不选** — owner 明确"置零",且 OpenAI/Google/MiniMax 实际上不暴露 cache write 单价。

### D3: 命名约定沿用现有风格

**选择**:
- `kimi-k2.5` → `kimi-k2.6`(连字符 + 半角点)
- `MiniMax-M2.5` → `MiniMax-M2.7`(大小写混合,lookup 时 `normalizeModelName` 做 lowercase 处理)
- `qwen3.5-plus` → `qwen3.7-plus` / `qwen3.6-plus`(半角点)

**理由**:
- 与既有 catalog 一致,无需新 alias
- 现有 `getLookupCandidates` / `normalizeModelName` 已能处理这些命名

### D4: 测试新增 9 个 `getModelPricing` 用例 + 3 个 `calculateCost` 用例

**选择**:每个新条目和每个有数值变化的既有条目都加 `getModelPricing` 断言;新模型(以 qwen3.7-plus 为代表)加 `calculateCost` 端到端用例。

**理由**:
- `getKnownModels` 现有断言要求 ≥ 60 个模型,新增 4 个条目后 ≥ 64,需同步验证
- 端到端 `calculateCost` 用例确保四类 token(input / output / cacheCreation / cacheRead)都进入计算路径,防止"只测 lookup 正确,但计算公式被回归"
- 与既有 `MiniMax-M2.5-lightning` 用例风格一致(commit `7ac4d3a` 引入)

### D5: 注释标注 TODO,不创建独立 issue

**选择**:在 qwen3.7-plus / qwen3.6-plus 条目前加 `// TODO: Qwen Plus models have tiered pricing at 256K context boundary; only the ≤256K tier is registered. >256K usage falls through to fallback.`

**理由**:
- 价格表的 >256K 价位已经公开,只是 owner 决策"暂不录入"
- TODO 注释让后续 reader 立即明白 fallback 行为是有意为之,而非疏漏

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| **Qwen Plus 在 >256K 上下文被错误地按 ≤256K 价位计费** | 当前 `getModelPricing` 签名只接收 `model`,不感知 context size;`>256K` 用量无法在 lookup 层路由到 `*-high` 键。**接受** — 已知缺口,owner 决策延后;TODO 注释已在源码标注。等 owner 拍板再扩展接口。 |
| **MiniMax-M2.5 旧 `cacheRead=0.03` 可能在历史账单数据中留下"旧价"记录** | `calculateCost` 是请求级计算,没有持久化历史快照(usage 走磁盘缓存但存的是 token 数,不是美元成本)。**接受** — 旧数据按新价重新展示是正确行为。 |
| **价目表覆盖不全(GLM-4.x、Kimi K2-Turbo、MiniMax-M2.1 等保持原值)** | 可能在用户实际账单中产生偏差。**接受** — owner 在 proposal 中明确"保持原值不动",后续单独批次处理。 |
| **`getKnownModels` 断言从 60 提升到 64** | 新增 4 个条目后 `knownModels.length === 64`,测试无硬编码数字,无回归风险。 |

## Migration Plan

### 部署

无。纯数据表更新,无 schema 变更、无数据库迁移、无缓存失效需求。下次 user 触发 analytics 页面刷新即生效。

### 回滚

直接 `git revert` 即可。仅修改 `model-pricing.ts` 与 `model-pricing.test.ts` 两个文件,无副作用。

### 验证顺序

1. `bun run format`
2. `bun run test:unit -- model-pricing`(44+ 个用例)
3. `bun run typecheck` + `bun run lint` + `bun run format:check`
4. 手动核对 `model-pricing.ts` 14 个目标条目的数值与价目表一致

### 监控

- Dashboard Analytics cost-by-model 卡片对 4 个新模型显示非零成本
- 对 5 个有数值变更的既有模型,成本估算按新价浮动
- 无异常告警 / fallback 命中率突增
