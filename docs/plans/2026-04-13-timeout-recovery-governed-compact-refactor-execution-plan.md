# 2026-04-13 Timeout Recovery Governed Compact Refactor Plan

## Internal Grade

- `L` (single governed runtime lane, timeout recovery architecture consolidation)

## Workstreams

1. Timeout recovery lane refinement
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.ts`
- Action:
  - add a governed compact recovery mode for eligible active-dialogue turns,
  - keep timeout recovery telemetry/liveness budgeting coherent with the new mode,
  - preserve deterministic required-tool precedence.

2. Compact recovery contract reuse
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
- Action:
  - reuse active-dialogue compact prompt assembly during timeout recovery,
  - keep normalized reply shaping on the same governed fast-path contract.

3. Regression coverage
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
- Action:
  - cover compact timeout recovery attempt selection,
  - cover lifecycle timeout recovery telemetry for the new mode,
  - ensure recovered payload remains `mind-turn-v1` governed output.

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts --reporter=dot`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
3. `pnpm typecheck`
