# Update Model Pricing Registry — 2026-06 Batch

## Why

CCS Analytics 的成本计算(`calculateCost`)以 `src/web-server/model-pricing.ts` 的 `PRICING_REGISTRY` 为单一价格来源。模型厂商(Zhipu、Moonshot、Xiaomi、MiniMax、Alibaba、DeepSeek)发布了 2026-06 批次的更新价格,涉及新模型上线与既有模型调价。继续按旧价估算会导致 cost-by-model 卡片与实际账单偏差。本变更将注册表同步到最新公开价。

## What Changes

- **5 个既有条目数值刷新**(完整四字段):
  - `mimo-v2.5-pro`: 0.435/0.87/0.0/0.0036 → 1.74/3.48/0.0/0.0145
  - `deepseek-v4-pro`: 0.435/0.87/0.0/0.003625 → 1.74/3.48/0.0/0.0145
- **3 个 MiniMax 条目 cache 字段修正**:
  - `MiniMax-M3.cacheCreation`: 0.0 → 0.75
  - `MiniMax-M2.7.cacheCreation`: 0.0 → 0.375
  - `MiniMax-M2.5.cacheRead`: 0.03 → 0.06
- **4 个新模型入库**:
  - `kimi-k2.6`(Kimi 2.6 系列)
  - `qwen3.7-max`(Qwen 3.7 Max)
  - `qwen3.7-plus`(Qwen 3.7 Plus,只录入 ≤256K 价位)
  - `qwen3.6-plus`(Qwen 3.6 Plus,只录入 ≤256K 价位)
- **既有 6 个条目**(GLM-5.1/5、Kimi K2.5、MiMo V2.5、MiniMax-M2.5、DeepSeek V4 Flash)确认与最新公开价**已经一致**,本批次无需调整
- **未列入新价目表的模型**(GLM-4.5/4.6/4.7、Kimi K2-Turbo、MiniMax-M2.1 等)保持原值不动 — 留作后续单独批次处理

## Capabilities

### New Capabilities

无。本变更是 `ModelPricing` 静态数据表的数值更新,没有引入新能力、新接口或新行为。

### Modified Capabilities

无。`ModelPricing` 接口定义、查找函数 `getModelPricing`、计算函数 `calculateCost` 的契约均不变。`openspec/specs/` 当前为空,无既有 capability 需要 delta 变更。

## Impact

### 代码影响

- `src/web-server/model-pricing.ts`:仅修改 `PRICING_REGISTRY` 常量(数值刷新 + 4 个新条目)
- `tests/unit/model-pricing.test.ts`:新增 9 个 `getModelPricing` 用例覆盖 4 个新条目 + 5 个更新条目,新增 3 个 `calculateCost` 用例(qwen3.7-plus、MiniMax-M3、kimi-k2.6)验证四类 token 都被正确计价

### 行为影响

- **影响消费者**:`web-server/usage/handlers.ts`、`web-server/usage/aggregator.ts`、`web-server/usage/data-aggregator.ts`、`web-server/usage/cliproxy-usage-transformer.ts` — 它们调用 `getModelPricing` / `calculateCost` 的方式不变
- **影响 UI**:Dashboard Analytics cost-by-model 卡片(commit `61a2e7af` 收紧行间距后的版本)将按新价显示;`Analytics → Models` 表按新价排序
- **影响 OpenRouter / 其他 provider**:`ui/src/lib/openrouter-types.ts` / `openrouter-utils.ts` 是独立通路,与本注册表无关

### 不影响

- 任何 CLI 命令、Dashboard 页面布局、API endpoint
- `ModelPricing` 接口、查找函数语义、`MODEL_PRICING_ALIASES`(本次无新别名)
- 用户数据、磁盘缓存、配置文件 schema

### 数据源

- 价目表由 owner 直接提供(2026-06 批次)
- `qwen3.7-plus` / `qwen3.6-plus` 在阿里云 Model Studio 公开页面有 >256K context 的高价位,本批次按 owner 决策**只录入 ≤256K 主价位**,>256K 用量回落到 fallback 价格
