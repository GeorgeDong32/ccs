## Context

CCS 的 Analytics 仪表盘对每次 Claude / Codex / 其他 provider 调用按 `input/output/cache` token 数 × 单价汇总得到总成本。单价来自 `src/web-server/model-pricing.ts` 中的 `PRICING_REGISTRY`。当 registry 没有命中（直接 key、alias、suffix、partial family 都不匹配）时，`getModelPricing()` 返回一个**写死的 `UNKNOWN_MODEL_PRICING`**：

```ts
const UNKNOWN_MODEL_PRICING: ModelPricing = {
  inputPerMillion: 3.0,
  outputPerMillion: 15.0,
  cacheCreationPerMillion: 3.75,
  cacheReadPerMillion: 0.3,
};
```

也就是 Claude Sonnet 4.5 的价格。这导致两个问题：

1. **费用虚高**：新接入的 provider 或从未打过补丁的模型，会被当作 Sonnet 4.5 计费，账单不真实。
2. **静默重算**：磁盘缓存中 token 数是原样存的，但成本是聚合时实时算的；价格表更新后需要触发重算。当前没有显式的"价格表版本号"和"未知模型清单"机制。

成本计算与缓存的现有链路（`src/web-server/usage/disk-cache.ts` + `aggregator.ts`）已经是 SWR 模式：缓存只存 token 计数，不存费用，所以重算本身是免费的。问题在于**触发重算的契约**和**未知模型的用户可见性**。

## Goals / Non-Goals

**Goals:**

- 未知模型在 `PRICING_REGISTRY` 中无任何匹配时，**按 $0 计入**成本，而不是套用 Sonnet 4.5 的费率。
- 价格表更新后，旧的 token 记录能**自动重算**（缓存失效或显式刷新均可），不需要手动清磁盘缓存。
- 仪表盘上**对未知模型给出显式提示**（徽标或 "Pricing not configured"），让用户能看到哪些模型是按 0 计费的，方便他们后续补价。
- 单元测试覆盖"未知 → 0"、"补价 → 重算"两条路径。

**Non-Goals:**

- 不引入运行时价格发现（不联网查询 provider 实际价目表）。
- 不改动 `PRICING_REGISTRY` 已存在条目的价格。
- 不迁移历史已聚合的"虚高费用"——它们本来就是聚合时实时算的，价格表一改就消失了，无需数据迁移。
- 不动 CLI 入口、不动 `~/.claude/` settings.json。

## Decisions

### Decision 1: 把 `UNKNOWN_MODEL_PRICING` 改为全 0

**Why:** 反映"未配置 = 不收钱"的语义。比起"虚高估算"，把成本记为 0 至少不会让用户被错数吓到，也促使他显式补价。

**Alternatives considered:**

- *保留 Sonnet 4.5 兜底*：保持现状，但用户当前明确反对。
- *用 "largest registered pricing" 兜底*：依然可能虚高，且语义不清晰。
- *抛错让上游处理*：会让 `calculateCost` 变成"非纯函数"，破坏聚合流水线的健壮性。

**实现：** 直接修改 `src/web-server/model-pricing.ts` 的 `UNKNOWN_MODEL_PRICING` 字面量。

### Decision 2: 暴露"未知模型"判定函数 `isUnknownModel(model: string): boolean`

**Why:** 仪表盘需要识别哪些模型当前是按 0 计费的。复用 `getModelPricing()` 内部匹配逻辑是脆弱的（依赖私有 `NORMALIZED_PRICING_REGISTRY`）。显式抽出一个布尔函数，前后端都能用。

**签名：**

```ts
export function isUnknownModel(model: string): boolean {
  return getModelPricing(model) === UNKNOWN_MODEL_PRICING;
}
```

`calculateCost` 不动 —— 它继续返回数值（0 即可），UI 用 `isUnknownModel` 决定是否显示徽标。

### Decision 3: 重算靠"价格表版本号" + 缓存版本号联动

**Why:** 用户说"有价格后再重新计算模型价格"。当前 `disk-cache.ts` 已有 `CACHE_VERSION = 4`。引入一个 `PRICING_TABLE_VERSION`（独立的小整数），每次 `PRICING_REGISTRY` / `UNKNOWN_MODEL_PRICING` 内容有变更时 +1。`aggregator.ts` 读缓存时若发现 `pricingVersion` 落后，则丢弃费用相关缓存（token 数据保留），重新聚合。

**Alternatives considered:**

- *每次启动都重算*：浪费 CPU，违反 SWR 假设。
- *改 CACHE_VERSION*：过重，会清空一切用户可见的聚合。
- *Webhook / 定时任务*：复杂度高，不必要。

**实现位置：** `src/web-server/usage/disk-cache.ts` 增加 `pricingVersion` 字段；`aggregator.ts` 读缓存时校验。`PRICING_TABLE_VERSION` 写在 `model-pricing.ts` 末尾作为单一来源。

### Decision 4: 前端在"Cost by model"卡片中显示"Price not set"徽标

**Why:** 用户最痛点是"不知道哪个模型没价格"。Dashboard 是发现这类问题的主入口。

**实现位置：** `ui/src/components/analytics/`（具体路径以仓库为准）。调用一个新的 `/api/usage/unknown-models` 端点（或者在已有的 `usage` 响应里塞一个 `unknownModels: string[]` 字段）来取清单。

**是否新加 API：** 优先复用现有 `/api/usage/refresh` 响应里追加 `unknownModels` 字段（最小改动）。如确认需要独立端点，再单独建。

### Decision 5: 文档同步

在 `docs/analytics/`（或 `docs/usage-pricing.md`，以仓库结构为准）加一节 "Model pricing & unknown models"，明确：

- 未知模型按 0 元计费。
- 如何在 `PRICING_REGISTRY` 中补价。
- 重算行为：补价后刷新页面 / 调 `/api/usage/refresh` 即生效。

## Risks / Trade-offs

- **R1: 用户期待历史成本被"修正"** — 之前用 Sonnet 4.5 兜底产生的虚高费用，改完后会**变 0**。用户可能误以为"我之前花的钱不见了"。Mitigation: 在 CHANGELOG / docs 显式标注，并在 UI 上"未知模型"行的成本旁边显示 `(no pricing configured)`，让 0 看起来是有意为之。
- **R2: PRICING_TABLE_VERSION 容易忘记 bump** — 改了价格但没 +1，重算不会发生。Mitigation: 加一个轻量 lint / 单元测试，扫描 `PRICING_REGISTRY` 的 hash 与版本号不匹配时失败（可选，本次先不做 lint，只在 PR 模板里提醒）。
- **R3: 仪表盘如果把所有未知模型都标 0，可能让"自建新 provider"看起来像免费** — Mitigation: 徽标文案必须是 "Pricing not configured"，避免暗示"免费"。

## Migration Plan

不需要数据迁移（成本是聚合时实时算的）。部署步骤：

1. 合并 `model-pricing.ts` 改动（默认值 + 导出 `isUnknownModel` + `PRICING_TABLE_VERSION`）。
2. 聚合器读缓存时校验 `pricingVersion`；如落后则丢弃费用缓存重算。
3. UI 增加"Price not set"徽标。
4. 更新单元测试。
5. 更新 `docs/analytics/` 说明。

**回滚：** 改 `UNKNOWN_MODEL_PRICING` 字面量回到原值即可，版本号回滚无副作用（旧缓存自然失效或被忽略）。

## Open Questions

- 前端是否需要独立 `/api/usage/unknown-models` 端点，还是先复用 `/api/usage/refresh` 响应？倾向后者（最小改动）。
- `PRICING_TABLE_VERSION` 是手动 bump 还是从 `PRICING_REGISTRY` 派生？倾向**手动**（更显式，避免 hash 漂移）。需要时再切派生。
