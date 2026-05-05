# Alicization Digital Life Filesystem Patch DryRun Surface Execution Plan (2026-04-08)

## Internal Grade Decision
- Grade: `L`
- Rationale: 同文件同模块增量，串行执行与验证最快且风险可控。

## Wave Structure

### Wave 1: Contract Extension
- 在 `filesystem_patch_file` 增加 dryRun 参数和返回字段定义。

### Wave 2: Runtime Implementation
- 在 patch helper 中新增 dryRun 分支：
  - 完整执行补丁计算
  - 生成 next hash + preview
  - 跳过写入调用

### Wave 3: Tests
- 增加 dryRun 用例，断言 `filesystem::write_file` 未被调用。
- 保持既有 patch 成功/失败路径稳定。

### Wave 4: Verification + Cleanup
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/main-chat-execution-surface.test.ts`
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/runtime.test.ts -t "main gateway tool"`
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm typecheck`
- `pnpm lint:fix`
- 生成本轮治理收据。

## Ownership Boundaries
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
- `docs/requirements/2026-04-08-alicization-digital-life-filesystem-patch-dryrun-surface.md`
- `docs/plans/2026-04-08-alicization-digital-life-filesystem-patch-dryrun-surface-execution-plan.md`
- `outputs/runtime/vibe-sessions/20260408-140127-digital-life-filesystem-patch-dryrun-surface/*`

## Delivery Acceptance Plan
- 目标测试和 typecheck 通过则接受本轮实现。
- 若 lint 基线仍红，则以 `completed-with-risk` 报告。

## Rollback Rules
- 仅回滚本轮改动文件。
- 不触碰无关脏改动。

## Phase Cleanup Expectations
- 记录命令级验证结果与残余风险来源。
