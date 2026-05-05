# 2026-04-17 Alicization Proactive Mutation Proposal Activation Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结 `vibe` requirement / plan / runtime artifacts。
2. 扩充 `autonomy-actuation` 的 mutate proposal derivation。
3. 补 observe path / mutate path tests。
4. 跑 targeted verification 与 typecheck。

## Ownership Boundaries

1. Core derivation:
   `apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.ts`
2. Tests:
   `apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.test.ts`
3. Optional runtime touch-up only if required by typing/tests:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/dialogue-session-manager.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
4. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autonomy-kernel.test.ts`
5. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts`
6. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
7. `pnpm lint:fix`

## Implementation Rules

1. mutate proposal 只能在成熟 act 场景下触发。
2. mutate proposal 必须停在 `needs-affirmation`。
3. observe-only auto-dispatch 不可被破坏。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
