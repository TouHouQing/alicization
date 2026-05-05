# 2026-04-18 Alicization Self Continuity Authority Closure Execution Plan

## Internal Grade

L

## Wave Structure

1. Freeze requirement / plan / runtime receipts for the shared self continuity authority slice.
2. Create `self-continuity-authority.ts`.
3. Wire it into `mind-synthesizer` and `answer-planner`.
4. Replace fast-path local cue derivation with the shared authority.
5. Feed the same authority into execution payoff prompt / deterministic fallback surfaces.
6. Run targeted tests and stage typecheck.

## Ownership Boundaries

1. Shared authority reducer:
   `apps/stage-tamagotchi/src/main/services/alicization/self-continuity-authority.ts`
2. Dialogue/mind:
   `apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/answer-planner.ts`
3. Fast path / prompt surface:
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
4. Execution payoff:
   `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/answer-planner.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.test.ts apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
3. `pnpm lint:fix`

## Implementation Rules

1. Authority reducer must reuse existing slow variables, not duplicate them.
2. Dialogue and execution payoff must read the same authority summary, but execution payoff must still lead with the concrete result.
3. Fast path can stay deterministic, but its self cue source must be shared with the rest of the runtime.

## Phase Cleanup Expectations

1. Write requirement / plan / stage lineage / cleanup receipt / delivery acceptance report.
2. Record repo-wide lint noise separately from this slice’s success.
