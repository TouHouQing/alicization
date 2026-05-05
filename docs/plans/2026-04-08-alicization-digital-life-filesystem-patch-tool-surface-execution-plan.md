# Alicization Digital Life Filesystem Patch Tool Surface Execution Plan (2026-04-08)

## Internal Grade Decision
- Grade: `L` (serial native execution)
- Rationale: 该增量集中在同一执行面与测试文件，串行改动可控且验证路径直接。

## Wave Structure

### Wave 1: Tool Design
- 定义 `filesystem_patch_file` 输入/输出契约。
- 复用既有 read/write hash 守卫语义。

### Wave 2: Runtime Implementation
- 增加 patch helper：顺序替换、missing 控制、统一错误码。
- 注入工具注册并接入现有 write 回写路径。

### Wave 3: Prompt Guidance + Tests
- 更新路由系统提示，把 `filesystem_patch_file` 加入首选文件工具。
- 扩展单测覆盖注册、成功补丁、空补丁失败。

### Wave 4: Verification + Cleanup
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/main-chat-execution-surface.test.ts`
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/runtime.test.ts -t "main gateway tool"`
- `pnpm typecheck`
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm lint:fix`
- 写入治理 receipt。

## Ownership Boundaries
- Code write scope:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
- Artifact scope:
  - `docs/requirements/2026-04-08-alicization-digital-life-filesystem-patch-tool-surface.md`
  - `docs/plans/2026-04-08-alicization-digital-life-filesystem-patch-tool-surface-execution-plan.md`
  - `outputs/runtime/vibe-sessions/20260408-134909-digital-life-filesystem-patch-tool-surface/*`

## Delivery Acceptance Plan
- 当目标测试和 stage-tamagotchi 范围 typecheck 通过时，接受本次功能增量。
- 若全仓 typecheck/lint 暴露无关历史问题，则以 `completed-with-risk` 报告。

## Rollback Rules
- 仅回滚本次变更文件。
- 严禁触碰无关脏改动。

## Phase Cleanup Expectations
- 产出完整 stage 轨迹与 cleanup-receipt，清晰区分“本次增量通过项”与“仓库基线风险项”。
