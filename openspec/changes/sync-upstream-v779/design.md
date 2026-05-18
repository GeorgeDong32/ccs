## Context

Fork 仓库 `GeorgeDong32/ccs` 基于 `kaitranntt/ccs` v7.73.0 (commit `513896b1`)。Fork 上有 3 个独有 commits（cache hit rate badge 相关）。上游已推进至 v7.79.1，包含 354 个实质变更，跨越 6 个版本。

当前分支状态：
- `main`：工作分支，领先共同祖先 4 commits（含 1 个 sync commit）
- `upstream-main`：停在 v7.73.0，未更新
- 共同祖先：`513896b1` (v7.73.0 release)

上游变更中包含大量跨模块重构（dispatcher 拆分、config-loader facade、cliproxy executor 模块化），这些重构的 commits 相互依赖，不适合单独 cherry-pick。

## Goals / Non-Goals

**Goals:**
- 将上游 v7.73.0 至 v7.79.1 的全部变更同步到 fork
- 保留 fork 的 3 个独有 commits（cache hit rate badge）
- 更新 `upstream-main` 追踪分支到最新
- 确保合并后 `bun run validate` 通过

**Non-Goals:**
- 不选择性 cherry-pick（变更量太大，整体合并更高效）
- 不在此 change 中修改上游代码或添加新功能
- 不处理 `upstream/dev` 分支（仅同步 `upstream/main`）

## Decisions

### Decision 1: 整体 merge 而非逐个 cherry-pick

**选择**: `git merge upstream/main` 一次性合并

**替代方案**: 逐个 cherry-pick 354 commits → 不可行，大量 commits 相互依赖（重构系列），cherry-pick 中间会频繁冲突

**理由**: 354 commits 中包含连续重构系列（dispatcher 10+ commits、config-loader 6+ commits、cliproxy executor 7+ commits），这些必须一起合并。整体 merge 将冲突集中在一次解决。

### Decision 2: 使用临时同步分支

**选择**: 创建 `sync/upstream-v7.79` 分支进行合并操作

**替代方案**: 直接在 `main` 上合并 → 风险高，无法回退

**理由**: 在独立分支上解决冲突和验证，确认无误后再合并回 `main`，保持 `main` 可用。

### Decision 3: 先更新 upstream-main

**选择**: `git checkout upstream-main && git reset --hard upstream/main`

**理由**: `upstream-main` 当前停在 v7.73.0，需更新为上游最新快照，作为干净的基准点。

### Decision 4: 合并冲突解决策略

**选择**: 对于冲突文件，优先采用上游版本，然后在合并后重新应用 fork 的 UI 改动（cache hit rate badge）

**理由**: 上游重构了大量代码结构，fork 的改动集中在 UI 组件，两者冲突时以上游新结构为准，再 cherry-pick 或手动恢复 UI 功能。

## Risks / Trade-offs

- **[合并冲突量大]** → 上游重构了 dispatcher、config-loader、cliproxy executor，fork 的 UI commits 可能与这些重构冲突。缓解：优先采用上游结构，事后恢复 fork 功能。
- **[Fork UI 功能回归]** → cache hit rate badge 可能因上游 UI 重构（设计系统迁移）而无法直接应用。缓解：合并后在 sync 分支上手动适配。
- **[依赖变更]** → 上游可能引入新依赖（CodeMirror、react-virtuoso 等）。缓解：合并后 `bun install` 并验证。
- **[测试套件变化]** → 上游新增大量测试和 CI 配置变更。缓解：合并后完整运行 `bun run validate`。
