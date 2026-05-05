# 2026-04-13 Dialogue Self And Utility Surface Refactor Plan

## Internal Grade

- `L` (single governed runtime lane, focused on foreground encounter authority consistency)

## Workstreams

1. Encounter taxonomy refinement
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
- Action:
  - split `identity` out from generic capability handling,
  - promote token-aware self/time/date detection ahead of continuity.

2. Local reply surface refinement
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
- Action:
  - add deterministic identity reply builders,
  - broaden local utility recognition for reordered natural phrases,
  - keep thought/focus aligned with encounter ownership.

3. Regression coverage
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
- Action:
  - cover identity query,
  - cover repeated identity query after a wrong prior answer,
  - cover reordered time query,
  - ensure local-only path still bypasses stream/timeout.

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.test.ts`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
3. `pnpm typecheck`
