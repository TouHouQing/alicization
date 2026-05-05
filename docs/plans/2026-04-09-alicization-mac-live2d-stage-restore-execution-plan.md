# Alicization Mac Live2D Stage Restore Execution Plan

## Internal Grade
L

## Why L
This follow-up is concentrated in the packaged mac startup chain for the transparent desktop window. It requires serial root-cause tracing across Electron main-process boot, renderer bridge setup, and stage mount timing, not broad fan-out.

## Wave Structure
1. Verify the already-applied window/recovery patches so invisible click blocking is not being reintroduced locally.
2. Trace the desktop main-route mount chain from `App.vue` and `index.vue` into `Stage.vue`, `Live2D.vue`, and `live2d/Canvas.vue`.
3. Remove or defer non-critical startup work that touches packaged Electron `file://` storage or cross-window transport before first paint.
4. Patch single-instance handling so stale packaged instances cannot poison the main stage startup path.
5. Restore the stage controls that were temporarily disabled for isolation, then rerun packaged verification and workspace checks.

## Ownership Boundaries
- Desktop renderer recovery/capture: `apps/stage-tamagotchi/src/renderer/App.vue`, `apps/stage-tamagotchi/src/renderer/pages/index.vue`, `apps/stage-tamagotchi/src/renderer/pages/index.desktop.ts`
- Main-process startup and single-instance gate: `apps/stage-tamagotchi/src/main/index.ts`, `apps/stage-tamagotchi/src/main/windows/main/index.ts`
- Renderer startup bridges and stage runtime: `apps/stage-tamagotchi/src/renderer/App.vue`, `apps/stage-tamagotchi/src/renderer/bridges/stage-three-runtime-trace.ts`, `packages/stage-ui/src/components/scenes/Stage.vue`, `packages/stage-ui/src/stores/speech-runtime.ts`, `packages/stage-ui/src/services/speech/bus.ts`
- Regression tests: existing renderer recovery tests plus targeted workspace typechecks and packaged launch verification

## Verification Commands
- `pnpm exec vitest run packages/stage-ui-live2d/src/utils/opfs-loader.test.ts apps/stage-tamagotchi/src/renderer/pages/index.desktop.test.ts apps/stage-tamagotchi/src/renderer/stage-startup-recovery.test.ts packages/stage-ui/src/stores/settings/stage-model.test.ts`
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `ALICIZATION_SKIP_VUE_I18N_PLUGIN=1 pnpm -F @proj-alicization/stage-tamagotchi build:unpack`
- `pnpm typecheck`
- `pnpm lint:fix`

## Delivery Acceptance Plan
- Confirm the main packaged desktop route emits mounted-stage startup status before the watchdog deadline.
- Confirm the draggable Live2D character plus dialogue/controls islands are visible again on the packaged main window.
- Report root `lint:fix` separately if unrelated repository-wide issues still fail.

## Completion Language Rules
- Only say the issue is fixed after code changes and verification results are reported together.
- If a real packaged mac launch was not run in this session, say so explicitly.

## Rollback Rules
- Keep the behavior change scoped to OPFS interception eligibility and previously touched stage recovery files.
- Do not weaken click-through semantics for blank pixels.
- If packaged loading still fails, prefer narrowing middleware behavior further before adding more recovery UI.

## Phase Cleanup Expectations
- Record this follow-up run under `outputs/runtime/vibe-sessions/20260409-183311/`.
- Keep artifacts additive; do not overwrite the 2026-04-08 governed run.
