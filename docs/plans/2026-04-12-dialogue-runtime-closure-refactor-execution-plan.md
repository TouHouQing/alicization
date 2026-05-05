# 2026-04-12 Dialogue Runtime Closure Refactor Plan

## Internal Grade

- `L` (single governed runtime lane with a focused architectural split between active dialogue and heavyweight stream execution)

## Workstreams

1. Active dialogue lane reducer
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
- Action:
  - classify light dialogue turns before main-gateway stream dispatch,
  - distinguish greeting / capability / short follow-up / compact dialogue turns,
  - keep tool-bound and inspection-bound turns on the heavyweight path.

2. Session continuity surface export
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/dialogue-session-manager.ts`
- Action:
  - expose session mirror and conversation-session continuity to the background run,
  - make the fast lane and timeout recovery consume the same settled continuity surface.

3. Compact one-shot dialogue path
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.ts`
  - `packages/stage-shared/src/alicization-prompting.ts`
- Action:
  - build a compact dialogue prompt with active loop + session mirror + recent turns,
  - give lightweight turns a short one-shot budget,
  - normalize/wrap compact-lane results into the same mind-turn surface.

4. Continuity-aware local recovery
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
- Action:
  - replace stateless timeout templates with active-loop/session-aware recovery,
  - forbid meta runtime chatter on direct follow-up questions,
  - preserve truthful boundaries without collapsing into repair boilerplate.

5. Regression coverage
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
- Action:
  - cover greeting fast path,
  - cover follow-up continuity from previous execution/result thread,
  - cover continuity-aware local fallback on compact-lane failure.

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
3. `pnpm typecheck`

## Rollback Rule

- If the active dialogue lane starts swallowing tool-bound or inspection-bound turns, keep the continuity-aware fallback improvements but gate the fast lane back to greeting/capability only.

## Cleanup

- No generated runtime logs or temporary artifacts should be committed.
- New debug events are allowed and should stay because this refactor depends on traceable lane selection.
