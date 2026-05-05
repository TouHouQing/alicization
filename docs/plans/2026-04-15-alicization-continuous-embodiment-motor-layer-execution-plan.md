# Alicization Continuous Embodiment Motor Layer Execution Plan

## Internal Grade
L

## Why L
The work is concentrated in one serial dependency chain: shared digital-life contracts, stage performance runtime, and two renderer consumers. The risk is correctness and coherence across layers, not broad parallel fan-out.

## Component Map
- `packages/stage-shared/src/alicization-digital-life.ts`
  Responsibility: define and normalize the canonical digital-life motor schema and derive per-envelope/per-frame motor plans.
- `packages/stage-shared/src/stage-embodiment-performance-state.ts`
  Responsibility: expose the renderer-facing runtime motor state and its idle defaults.
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
  Responsibility: keep active and preview playback items synchronized with late-arriving digital-life motor metadata and spine fallback synthesis.
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts`
  Responsibility: project speech playback plus digital-life motor intent into one continuous `performanceState`.
- `packages/stage-ui-live2d/src/composables/live2d/motion-manager.ts`
  Responsibility: consume runtime motor channels for continuous Live2D body, gaze, facial, and breath control.
- `packages/stage-ui-three/src/composables/vrm/animation.ts` and `packages/stage-ui-three/src/composables/vrm/posture.ts`
  Responsibility: consume runtime motor channels for VRM gaze fixation and bone posture shaping.
- `packages/stage-ui-three/src/components/Model/VRMModel.vue`
  Responsibility: wire the motor state into VRM expression and per-frame renderer updates.

## Wave Structure
1. Freeze requirement, plan, and governed run artifacts for the continuous motor milestone.
2. Add a shared continuous motor schema and derive it from existing digital-life envelope/frame synthesis.
3. Thread the motor schema through stage speech and performance runtime so current and preview segments carry continuous embodiment state.
4. Update Live2D and VRM consumers to read the motor layer for ongoing posture/gaze/facial modulation.
5. Add regression tests for digital-life motor derivation, stage runtime projection, and VRM posture/gaze helpers.
6. Run targeted verification, workspace typecheck, lint fix, then write governed cleanup and acceptance receipts.

## Ownership Boundaries
- Shared contracts and normalization: `packages/stage-shared/src/alicization-digital-life.ts`, `packages/stage-shared/src/stage-embodiment-performance-state.ts`
- Stage runtime projection: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`, `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts`
- Live2D motor consumption: `packages/stage-ui-live2d/src/composables/live2d/motion-manager.ts`
- VRM motor consumption: `packages/stage-ui-three/src/composables/vrm/animation.ts`, `packages/stage-ui-three/src/composables/vrm/posture.ts`, `packages/stage-ui-three/src/components/Model/VRMModel.vue`
- Regression tests: shared digital-life tests, stage runtime tests, VRM helper tests

## Verification Commands
- `pnpm exec vitest run packages/stage-shared/src/alicization-digital-life.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-ui-three/src/composables/vrm/posture.test.ts`
- `pnpm typecheck`
- `pnpm lint:fix`

## Delivery Acceptance Plan
- Verify digital-life envelope/frame synthesis emits stable normalized motor channels for both envelope-level and segment-level state.
- Verify performance runtime projects segment motor channels into the shared runtime state, including preview updates.
- Verify VRM posture/gaze helpers can consume motor channels without requiring a live renderer instance.
- Verify Live2D compiles against the new motor state and continues to use real speech playback for mouth timing.

## Completion Language Rules
- Do not describe the avatar as "mind-driven continuous embodiment" unless the shared contracts, runtime projection, and both renderer paths were updated in code.
- If renderer behavior was not visually exercised in the desktop app this session, state that the result is code-and-test verified only.

## Rollback Rules
- Keep the discrete cue system as a compatibility shell, but do not let it regain authority over the motor layer.
- Preserve existing speech playback, analyser, viseme, and renderer settle pipelines.
- Prefer additive contract evolution and runtime projection over renderer-specific hacks.

## Phase Cleanup Expectations
- Record this governed run under `outputs/runtime/vibe-sessions/20260415-111126-alicization-continuous-embodiment-motor-layer/`.
- Update delivery receipts after verification with explicit pass/fail truth on tests, typecheck, lint, and manual visual checks.
