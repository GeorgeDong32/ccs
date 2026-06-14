## Why

当前 `getModelPricing()` 在 `PRICING_REGISTRY` 找不到模型时，会回退到一个固定的 `UNKNOWN_MODEL_PRICING`（当前等同于 Claude Sonnet 4.5 的 $3/$15 每百万 token）。这会让"用未知模型跑出来的账单"看起来像真金白银，而实际上我们并没有可靠的单价信息 —— 用户在 Analytics 里看到的费用是**虚构的**。同时，价格表更新后没有强制重算历史成本的路径，旧的（错误的）费用会一直显示在 dashboard 上。

## What Changes

- 修改 `UNKNOWN_MODEL_PRICING` 的默认值为全 0，使未知模型在没有任何价格时按 $0 计入。
- 保留"价格更新后自动重算"的现有链路：磁盘缓存只存 token 数、不存费用；价格变更后通过 `CACHE_VERSION` 升级或 `/api/usage/refresh` 触发重算。
- 新增"未知模型清单"展示：Dashboard 上对"价格未知的模型"提供可见性，便于用户手动补价。
- 明确文档化这一行为（`docs/` 同步），避免与之前"fallback = Sonnet 4.5 价格"的隐含约定混淆。
- 在测试里覆盖：未知模型 → 费用 0；价格补上后再次计算 → 费用正确。

## Capabilities

### New Capabilities

- `model-pricing-fallback`: 描述模型价格表、回退策略（未知模型 = $0）、价格变更后的重算契约，以及"未知模型"在前端 UI 上的可见性。

### Modified Capabilities

- （无现有 capability 需要修改。`openspec/specs/` 目前为空。）

## Impact

- 源码：`src/web-server/model-pricing.ts`（修改 `UNKNOWN_MODEL_PRICING` 默认值；如有必要暴露"未知模型"判定函数）。
- 缓存：`src/web-server/usage/disk-cache.ts` —— 如有需要升级 `CACHE_VERSION`，确保旧缓存里的（错误的）成本被重算。
- API：`/api/usage/refresh` 已是触发重算的入口，无新接口；如需新增"列出未知模型"端点，归属 `model-pricing-fallback` capability。
- 前端：`ui/src/` 内的 Analytics / Cost 卡片（未知模型徽标 / 费用为 0 的明确说明）。
- 测试：`tests/unit/model-pricing.test.ts`（更新 fallback 用例，添加 $0 断言）、`tests/integration/usage/` 下与重算相关的用例。
- 文档：`docs/analytics/`（如存在）说明未知模型计费行为；不涉及 CLI `--help` 改动。
- 不涉及外部依赖、settings.json、安装路径。
