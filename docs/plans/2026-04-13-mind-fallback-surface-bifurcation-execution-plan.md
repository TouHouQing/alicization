# 2026-04-13 Mind Fallback Surface Bifurcation Plan

## Internal Grade

- `L` (single governed runtime lane, shared fallback authority refactor)

## Workstreams

1. Shared visible-repair authority
- Files:
  - `packages/stage-shared/src/alicization-mind-fallback.ts`
  - `packages/stage-shared/src/alicization-inspection-intent.ts`
- Action:
  - add a shared decision that determines whether repair narration is allowed on the visible surface,
  - combine governance repair state with current-turn inspection evidence,
  - keep execution-bound turns and dialogue-first turns out of the visual repair lane.

2. Renderer and runtime takeover alignment
- Files:
  - `packages/stage-ui/src/composables/alicization-structured-output.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`
- Action:
  - route strict-surface takeover through the new visible-repair decision,
  - keep leak detection and execution-surface suppression coherent with the shared fallback contract.

3. Regression coverage
- Files:
  - `packages/stage-shared/src/alicization-mind-fallback.test.ts`
  - `packages/stage-ui/src/composables/alicization-mind-fallback.test.ts`
  - `packages/stage-ui/src/composables/alicization-structured-output.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts`
- Action:
  - cover positive inspection repair visibility,
  - cover non-inspection dialogue suppression,
  - cover override behavior staying closed over the new shared decision.

## Verification Commands

1. `pnpm exec vitest run packages/stage-shared/src/alicization-mind-fallback.test.ts packages/stage-ui/src/composables/alicization-mind-fallback.test.ts packages/stage-ui/src/composables/alicization-structured-output.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts --reporter=dot`
2. `pnpm -F @proj-alicization/stage-shared typecheck`
3. `pnpm -F @proj-alicization/stage-ui typecheck`
4. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
5. `pnpm typecheck`
