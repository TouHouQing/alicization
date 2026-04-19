# 2026-04-18 Alicization P0 Runtime Continuity Repair Execution Plan

## Execution Summary

按失败簇分波修复，而不是按文件分波：

1. proactive 触发与反馈 settlement
2. session/dream/execution continuity 注入
3. governed reply/runtime surface repair
4. task-thread planning 语义对齐

## Frozen Inputs

1. Requirement: `docs/requirements/2026-04-18-alicization-p0-runtime-continuity-repair.md`
2. Branch: `main`
3. Worktree: dirty
4. Primary failing suites:
   - `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
   - `apps/stage-tamagotchi/src/main/services/alicization/epoch3-e2e-closure.test.ts`
   - `apps/stage-tamagotchi/src/main/services/alicization/task-thread-governor.test.ts`

## Anti-Proxy-Goal-Drift Controls

### Primary Objective

修复真正阻断数字生命连续性的 runtime 回归。

### Non-Objective Proxy Signals

1. 只更新 snapshot 或测试文本
2. 只让单元测试继续绿
3. 把 proactive 直接静音来规避失败

### Validation Material Role

以失败用例恢复为主，以代码链一致性为辅。

### Declared Tier

P0 runtime repair

### Intended Scope

`apps/stage-tamagotchi/src/main/services/alicization/**`
`packages/stage-shared/src/alicization-*`

### Abstraction Layer Target

runtime integration / continuity layer

### Completion State Target

关键 proactive / continuity / governed reply failures 恢复。

### Generalization Evidence Plan

优先验证 e2e/runtime，用单元测试确认没有把 reducer 搞坏。

## Internal Grade Decision

L

## Wave Plan

1. 重新映射失败测试到 root causes。
2. 修 proactive trigger / dismiss / reply-within-120s / ignored chain。
3. 修 dream/session/execution continuity 注入与 mirror 语义。
4. 修 governed reply runtime repair 与 truth-state surface 漂移。
5. 修 task-thread affirmation 语义漂移。
6. 跑 targeted runtime tests，再补 typecheck。

## Ownership Boundaries

1. Proactive/runtime:
   `runtime.ts`
   `runtime-subconscious-tick.ts`
   `proactive-feedback.ts`
   `proactive-policy.ts`
   `runtime-session-continuity-builders.ts`
   `runtime-dream.ts`
2. Governed reply / runtime surface:
   `runtime-governance.ts`
   `main-chat-runtime-surface.ts`
   `main-chat-start-result.ts`
   `main-chat-timeout-fallback.ts`
3. Execution continuity:
   `execution-delivery-surface.ts`
   `task-thread-governor.ts`
4. Shared contracts/types when needed:
   `packages/stage-shared/src/alicization-transport-contracts.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/epoch3-e2e-closure.test.ts apps/stage-tamagotchi/src/main/services/alicization/task-thread-governor.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
3. `pnpm typecheck`
4. `pnpm lint:fix`

## Rollback Plan

如果某波修复扩大回归，按功能簇回退到前一波已验证状态，而不是散点撤销。

## Phase Cleanup Contract

1. 保留 governed receipts
2. 记录哪些失败已消失，哪些仍残留
3. 不留下临时调试占位逻辑
