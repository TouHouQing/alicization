# Alicization Mind-Driven Stage Embodiment Sync Execution Plan

## Internal Grade
L

## Why L
The work is concentrated in one runtime chain: shared playback projection, desktop speech runtime, and renderer-facing performance state. It needs serial reasoning across these layers more than broad fan-out.

## Wave Structure
1. Freeze the governed requirement/plan/artifacts for this embodiment follow-up and confirm the current authority split between `speechTimeline` and `digitalLifeFrame`.
2. Add a shared segment-level projection helper so playback items emit a single authoritative cue shape synthesized from timeline data plus `digitalLifeFrame`.
3. Update desktop speech/runtime composables so current and preview speech segments are reprojected when digital-life metadata changes and runtime consumers read the authoritative projected cue.
4. Add regression tests for cue precedence, renderer-hint propagation, and audio-driven lipsync preservation.
5. Run targeted verification, workspace typecheck, and lint fix; then record cleanup and delivery acceptance artifacts.

## Ownership Boundaries
- Shared playback projection and digital-life mapping: `packages/stage-shared/src/stage-embodiment-speech-playback.ts`
- Desktop speech runtime and segment reprojection: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
- Renderer-facing performance runtime: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts`
- Regression tests: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`, `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`

## Verification Commands
- `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`
- `pnpm typecheck`
- `pnpm lint:fix`

## Delivery Acceptance Plan
- Verify that a playback item can expose a fused authoritative cue even when the raw timeline cue is absent or weaker than digital-life guidance.
- Verify that `performanceState.activeCue`, `activeFacialCue`, and `activeActionCue` track the digital-life plan for segment playback and preview.
- Verify that lipsync still keys off live audio/render speech state rather than a synthetic timeline-only clock.

## Completion Language Rules
- Do not claim renderer synchronization is fixed if verification only covers shared helpers without the runtime tests.
- If no real desktop manual run was performed, state that the result is test-verified but not visually dogfooded in this session.

## Rollback Rules
- Keep behavior changes scoped to stage embodiment projection/runtime files.
- Preserve existing real-audio analyser, Live2D lipsync, and VRM viseme hooks.
- Prefer strengthening the existing projection contract over adding renderer-specific one-off overrides.

## Phase Cleanup Expectations
- Record this governed run under `outputs/runtime/vibe-sessions/d3f7c6866828/`.
- Keep artifacts additive and update the delivery acceptance report after verification finishes.
