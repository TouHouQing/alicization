# 2026-04-13 Execution Follow-Up Closure Refactor Plan

## Internal Grade

- `L` (single governed runtime lane, focused on execution-continuity authority rather than broad multi-agent expansion)

## Workstreams

1. Listing/result surface authority
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-listing-surface.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`
- Action:
  - extract shared listing parsing/normalization into one authority,
  - reuse it for inline execution payoff, subconscious callback payoff, and follow-up payoff,
  - keep raw shell / protocol leakage out of the reply surface.

2. Deterministic execution follow-up payoff
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Action:
  - mark execution-result follow-ups as `deterministic-payoff` instead of always `compact-one-shot`,
  - resolve remaining-detail answers from `listTaskThreads + listExecutionEvents`,
  - emit a governed `mind-turn-v1` payoff directly when real execution artifacts are sufficient.

3. Inline callback suppression closure
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-runtime.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Action:
  - add identity-level inline-surfaced tracking for `cardId + sessionId + threadId + completedAt`,
  - persist that state with execution-delivery snapshots,
  - guard subconscious callback delivery both before generation and before persistence.

4. Regression coverage
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-runtime.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts`
- Action:
  - cover deterministic “remaining items” payoff,
  - cover surfaced-inline identity dedupe,
  - cover pre-persist skip when an in-flight callback becomes already surfaced.

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
3. `pnpm typecheck`

## Rollback Rule

- If deterministic follow-up payoff ever answers from the wrong execution thread, keep the inline-callback suppression closure, but gate deterministic payoff to threads whose session and listing/result surface match the immediately previous assistant reply.

## Cleanup

- Keep new runtime debug events because this closure depends on replayable causality.
- Do not commit runtime logs or ad-hoc investigation scratch files.
