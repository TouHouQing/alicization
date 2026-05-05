# 2026-04-17 Alicization Pending Execution Confirmation Closure Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结 `vibe` requirement / plan / runtime artifacts。
2. 在 prelude/context 识别 pending affirmation thread。
3. 在 action obligation / runtime surface 暴露 resume thread signal。
4. 在 executor tool / executor runtime / deterministic recovery 打通 original-thread resume。
5. 跑 targeted tests 与 typecheck。

## Ownership Boundaries

1. Pending-thread detection:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-context.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.ts`
2. Resume surface:
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
3. Resume execution:
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-required-tool-recovery.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
4. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
5. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/task-thread-dispatcher.test.ts`
6. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.test.ts`
7. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/dialogue-session-manager.test.ts`
8. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
9. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autonomy-kernel.test.ts`
10. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts`
11. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
12. `pnpm lint:fix`

## Implementation Rules

1. 恢复路径必须复用原 thread id。
2. 只有在有可靠恢复 payload 的 channel 上才允许 resume dispatch。
3. deterministic recovery 必须优先尝试 original-thread resume，而不是重新推导新任务。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
