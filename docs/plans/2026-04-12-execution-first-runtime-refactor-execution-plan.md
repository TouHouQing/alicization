# 2026-04-12 Execution-First Runtime Refactor Plan

## Internal Grade

- `L` (single-lane runtime refactor with explicit regression verification)

## Workstreams

1. Execution-first runtime gate
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
- Action:
  - detect explicit executor turns from prepared runtime surface,
  - run execution inline before model-first timeout fallback where appropriate,
  - keep capability inquiry and non-execution turns on the normal path.

2. Same-turn callback suppression
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-runtime.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Action:
  - carry enough thread/session/completion metadata through executor tool results,
  - suppress queued execution callback delivery for terminal same-turn inline results,
  - preserve real background callbacks for async/long-running threads.

3. Proactive surface cleanup
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
  - `apps/stage-tamagotchi/src/renderer/App.vue`
- Action:
  - stop appending delivery surface reason to visible `thought`,
  - keep deterministic delivery diagnostics in audit/debug only,
  - suppress proactive internal reasoning from the renderer-visible “思考” surface.

4. Execution callback fallback hardening
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- Action:
  - reduce deterministic callback authority to recovery-only surface,
  - prefer retry/suppression over user-visible mechanical callback text when inline turn already delivered the result.

5. Regression tests
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-callback-runtime.test.ts`
- Action:
  - cover inline execution-first recovery,
  - cover same-turn callback suppression,
  - cover proactive reasoning leak suppression and callback fallback behavior.

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/execution-callback-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Rollback Rule

- If execution-first gating regresses capability inquiry or long-running executor callback delivery, revert the gating/suppression slice and keep only proactive reasoning visibility cleanup.

## Cleanup

- No temp artifacts expected.
- Keep runtime debug logs as proof only; do not commit log files.
