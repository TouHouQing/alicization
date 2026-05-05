# 2026-04-17 Alicization Execution Result Feedback Learning Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结 `vibe` requirement / plan / runtime artifacts。
2. 增加 execution result feedback classifier 与 outcome closure。
3. 在 runtime chat-start 里挂入最近主动执行结果反馈的 settlement。
4. 跑 targeted tests 与 typecheck。

## Ownership Boundaries

1. Learning closure:
   `apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.ts`
2. Runtime settlement:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-start-acceptance.ts`
3. Existing readers validated, not rewritten:
   `apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/self-continuity.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/self-continuity.test.ts`
4. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-start-acceptance.test.ts`
5. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
6. `pnpm lint:fix`

## Implementation Rules

1. 只学习主动执行结果，不泛化到所有普通执行。
2. 结果反馈的长期学习必须复用现有 relationship outcome / reinforcement 管道。
3. 不依赖 LLM 事后反思才能落库。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
