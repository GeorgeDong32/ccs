## Why

在 Analysis 页面的模型详情弹窗中，用户需要了解模型的缓存利用效率。现有两个指标 Badge（使用率、I/O Ratio）不足以全面评估成本效率。缓存命中率是衡量 prompt caching 效果的关键指标，能帮助用户识别哪些模型有效利用了缓存来降低输入成本。

数据层已完备，无需新增 API。

## What Changes

- 在模型详情弹窗的 Badge 组添加第三个 Badge：「缓存命中率」
- 新增 `getCacheHitStatus()` 函数判断状态颜色
- 新增 12 个 i18n 翻译 key（4 语言 × 3 状态描述）
- 仅当 `cacheReadTokens > 0` 时显示，无缓存时隐藏

## Capabilities

### New Capabilities

- `cache-hit-badge`: 模型详情弹窗中显示缓存命中率 Badge，包含状态颜色指示和 i18n 支持

### Modified Capabilities

None — 仅修改现有组件的展示层，不改变 spec-level 行为。

## Impact

**Affected files**:
- `ui/src/components/analytics/model-details-content.tsx` — 新增函数和 Badge 渲染
- `ui/src/lib/i18n.ts` — 新增翻译 key

**CCS Principles touched**:
- Principle IV (Dashboard parity): Dashboard UI 功能扩展
- Principle VIII (Quality Gates): 需要通过 `bun run validate`

**No dependencies added**: 使用现有 Badge 组件和 i18n 系统

**No file system paths touched**: 仅 UI 层改动

**No new abstractions**: 复用现有 Badge 模式，添加一个辅助函数