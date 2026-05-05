# 2026-04-17 Alicization Execution Proposal Learning Closure Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结 `vibe` requirement / plan / runtime artifacts。
2. 增加 execution proposal feedback classifier 与 outcome closure。
3. 在 chat-start 前挂入 pending proposal feedback settlement。
4. 跑 targeted tests 与 typecheck。

## Ownership Boundaries

1. Learning closure:
   `apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.ts`
2. Chat-start settlement:
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-start-acceptance.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
3. Detection surface:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-context.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.ts`
4. Tests:
   `apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.test.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-start-acceptance.test.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-start-acceptance.test.ts`
4. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.test.ts`
5. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/self-continuity.test.ts`
6. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
7. `pnpm lint:fix`

## Implementation Rules

1. learning closure 必须在宿主回复发生时直接落库。
2. execution feedback 的 sourceKind 必须明确是 `execution`。
3. 允许/否决/打断三种反馈必须分开建模，不合并成单一“好/坏”。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
