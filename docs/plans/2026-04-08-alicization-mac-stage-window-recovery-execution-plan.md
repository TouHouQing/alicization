# Alicization Mac Stage Window Recovery Execution Plan

## Internal Grade
L

## Why L
The failure chain is concentrated in a small set of main/renderer desktop interaction files. This needs serial root-cause work with verification, not XL fan-out.

## Wave Structure
1. Confirm the interaction regression sources in main-process mouse capture and renderer stage recovery paths.
2. Remove or replace unsafe capture logic so transparent windows stay click-through unless renderer explicitly requests capture.
3. Strengthen desktop-stage empty/degraded visibility so controls or recovery UI remain visible when the model path fails.
4. Add regression tests around desktop mouse capture and recovery behavior.
5. Run targeted verification plus workspace typecheck/lint.

## Ownership Boundaries
- Main-process window behavior: `apps/stage-tamagotchi/src/main/windows/main/index.ts`, `apps/stage-tamagotchi/src/main/services/electron/window.ts`
- Desktop renderer recovery and capture: `apps/stage-tamagotchi/src/renderer/App.vue`, `apps/stage-tamagotchi/src/renderer/pages/index.vue`, `apps/stage-tamagotchi/src/renderer/pages/index.desktop.ts`
- Stage recovery/render behavior: `packages/stage-ui/src/components/scenes/Stage.vue` and only child scene files if required
- Tests: relevant renderer/stage helper tests only

## Verification Commands
- `pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/index.desktop.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/stores/settings/stage-model.test.ts`
- additional targeted tests for any new regression surface
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm lint:fix`

## Delivery Acceptance Plan
- Verify the main-process window no longer overrides renderer click-through through autonomous cursor polling.
- Verify renderer recovery keeps a visible interactive affordance when stage route is degraded.
- Verify no new failing tests in the touched regression surface.

## Completion Language Rules
- Only say the issue is fixed after code changes are applied and tests/typecheck/lint results are reported.
- If live mac manual launch was not run, say that explicitly.

## Rollback Rules
- Keep fixes scoped to the launch/capture/recovery chain.
- Avoid invasive route/layout rewrites.
- If a change weakens blank-pixel click-through, revert that specific approach and prefer renderer-authoritative gating.

## Phase Cleanup Expectations
- Record phase results under `outputs/runtime/vibe-sessions/20260408-181143/`.
- Remove no user files; only add governance receipts and regression tests required by the fix.
