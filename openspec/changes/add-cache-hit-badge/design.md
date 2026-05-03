## Context

模型详情弹窗 (`model-details-content.tsx`) 已有两个 Badge：使用率百分比和 I/O Ratio。数据层 `ModelUsage` 类型包含 `cacheReadTokens` 和 `inputTokens` 字段，可直接计算缓存命中率，无需新增 API。

现有模式：`getIoRatioStatus()` 函数返回 `{ variant, description }`，Badge 显示数值 + 状态颜色。

## Goals / Non-Goals

**Goals:**
- 在 Badge 组添加第三个「缓存命中率」Badge
- 复用现有 Badge variant 系统（default/secondary/outline）
- 支持 4 种语言的 i18n
- 仅当有缓存读取时显示，无缓存时隐藏

**Non-Goals:**
- 不新增 API 或数据类型
- 不改变现有两个 Badge 的实现
- 不在列表卡片层面显示（保持弹窗内）

## Decisions

### 1. 缓存命中率公式

**决策**: `cacheHitRate = cacheReadTokens / (inputTokens + cacheReadTokens) × 100`

**理由**: 业界通用定义，缓存读取占所有输入来源的比例。`inputTokens` + `cacheReadTokens` 代表总输入量。

**备选方案**: `cacheReadTokens / totalTokens` — 被否决，因为 totalTokens 包含 output，不符合"命中率"语义。

### 2. 状态阈值设计

**决策**:
- `≥ 50%` → `variant="default"`（主色，高效）
- `20%–50%` → `variant="secondary"`（灰色，中等）
- `< 20%` → `variant="outline"`（边框，低效）
- `= 0%` → 不显示 Badge

**理由**: 复用现有 Badge variant，保持视觉一致性。阈值基于典型缓存利用分布：多数模型命中率在 20-50% 区间。

### 3. i18n 实现

**决策**: 在 `analyticsCards` 块新增 `cacheHitHigh/Medium/Low` 三个 key

**理由**: `hitRate` key 已存在，只需新增状态描述翻译。避免修改现有翻译结构。

## Risks / Trade-offs

**风险**: 极端情况下 `inputTokens = 0` 且 `cacheReadTokens > 0` → 显示 100%

**缓解**: 这种情况理论上不应发生（有缓存读取必有原始输入），但代码会正确处理，显示 100% 合理。

**权衡**: 状态描述目前仅显示在 Badge hover 时（无 Tooltip），用户可能需要额外信息理解含义。后续可考虑添加 info 区域展示详细说明。