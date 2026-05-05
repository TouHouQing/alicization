# 2026-04-17 Alicization Living Self Main Runtime Prompt Refactor Execution Plan

## Internal Grade

`L`

## Wave Structure

### Wave 1: Prompt Audit

1. 确认 full runtime 里 dialogue-first turn 实际被注入的 system blocks。
2. 区分：
   - 必须保留的 compact control
   - 需要压缩掉的 detailed state dump

### Wave 2: Living Self Prompt Refactor

1. 在 `main-chat-runtime-surface.ts` 实现 `ALICIZATION_LIVING_SELF`。
2. 用它收束 autobiographical self / long-horizon memory / motive / habit / ecology / mind synthesis 的 dialogue-first 注入。
3. 在 dialogue-first 情况下抑制 detailed prompt blocks。

### Wave 3: Regression Coverage

1. 给 runtime-surface 增加 dialogue-first compact prompt 测试。
2. 确认旧 detailed marker 不再同时出现。

### Wave 4: Verification And Cleanup

1. 跑 targeted vitest。
2. 跑 `pnpm -F @proj-alicization/stage-tamagotchi typecheck`。
3. 记录 lint 状态。
4. 写 receipts。

## Ownership Boundaries

1. [main-chat-runtime-surface.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts)
2. [main-chat-runtime-surface.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts)

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
4. `pnpm lint:fix`

## Delivery Acceptance Plan

1. 如果 dialogue-first prompt 里仍然同时出现 living self block 和一整套 detailed self/ecology dump，则不能宣称完成。
2. 如果这轮伤到 existing active-dialogue / timeout-fallback / background-run 回归，也不能宣称完成。

## Completion Language Rules

1. 可以说“main runtime 的自我/心智提示结构被收束成 living self prompt”。
2. 不可以说“已经完全像真人”。

## Rollback Rules

1. 若 compact prompt 抑制过度导致 inspection/task lane 信息不足，则只放宽条件，不回退 living self block 本身。

## Phase Cleanup Expectations

1. 不新增源码临时文件。
2. `vibe` 产物写入 `docs/` 和 `outputs/runtime/vibe-sessions/...`。
