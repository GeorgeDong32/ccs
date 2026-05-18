## 1. Prepare Tracking Branch

- [x] 1.1 Update `upstream-main` to match `upstream/main` via `git checkout upstream-main && git reset --hard upstream/main`
- [x] 1.2 Verify `upstream-main` HEAD matches `upstream/main` with `git log --oneline -1`

## 2. Create Sync Branch

- [ ] 2.1 Create `sync/upstream-v7.79` from `upstream-main`
- [ ] 2.2 Attempt `git merge main` to incorporate fork commits; if clean, proceed to step 4
- [ ] 2.3 If merge conflicts: resolve using upstream-first strategy, manually re-apply cache hit rate badge changes
- [ ] 2.4 Verify all 3 fork-specific functionalities are present in the merged code

## 3. Dependency and Build Alignment

- [ ] 3.1 Run `bun install` to sync dependencies with upstream changes
- [ ] 3.2 Run `cd ui && bun install` to sync UI dependencies
- [ ] 3.3 Run `bun run build` and verify no build errors
- [ ] 3.4 Run `cd ui && bun run build` and verify no UI build errors

## 4. Validation

- [ ] 4.1 Run `bun run format` to fix formatting
- [ ] 4.2 Run `bun run validate` and ensure zero errors (typecheck + lint + format + tests)
- [ ] 4.3 Run `cd ui && bun run format && bun run validate` for Dashboard
- [ ] 4.4 Run `bun run maintainability:check:warn` and review any delta

## 5. Merge to Main

- [ ] 5.1 Switch to `main` and merge `sync/upstream-v7.79`
- [ ] 5.2 Run `git log --oneline -5` on `main` to confirm upstream and fork commits are present
- [ ] 5.3 Push `main` to `origin`
- [ ] 5.4 Delete `sync/upstream-v7.79` branch (cleanup)
