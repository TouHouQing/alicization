# Alicization Stage Embodiment Regression Fix Execution Plan

## Internal Grade

L

## Execution Strategy

Serial implementation in one governed lane. This work touches tightly coupled speech, performance, and renderer surfaces, so bounded local refactor is safer than parallel code edits.

## Wave Structure

### Wave 1: Trace and isolate the regressions

Ownership:
- `packages/stage-ui/src/components/scenes/Stage.vue`
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts`
- `packages/stage-ui-live2d/src/composables/live2d/motion-manager.ts`

Tasks:
- add targeted diagnostics for preview, playback, articulation, and renderer drive
- inspect whether message preparation blocks reply start
- inspect continuity handoff between preview items and active playback items
- inspect whether facial intensities are compressed before reaching Live2D parameters
- remove hard reset paths that clear resident performance and renderer hint state before the next governed turn is ready

### Wave 2: Refactor speech timing and lip-sync continuity

Ownership:
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
- `packages/stage-shared/src/stage-embodiment-speech-playback.ts`
- related focused tests

Tasks:
- remove message-start critical-path stalls from lip sync setup
- ensure speech loop and articulation timeline stay alive for the full playback window
- strengthen preview-to-playback continuity and segment identity tracking
- ensure voice metadata consistently feeds phoneme / viseme shaping

### Wave 3: Refactor mind-driven facial performance

Ownership:
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts`
- `packages/stage-ui-live2d/src/composables/live2d/motion-manager.ts`
- `packages/stage-shared/src/alicization-digital-life.ts` if motor authority needs tuning

Tasks:
- amplify facial contrast from runtime-authored motor state
- keep eye / brow / cheek / mouth targets coherent with base emotion, facial cue, and motor identity
- avoid neutralizing resident and transient cues into a flat average
- keep resident emotion / motion authority alive during turn transitions so the stage does not visibly snap back to neutral between messages

### Wave 4: Verify and clean up

Tasks:
- run focused vitest suites for speech articulation / performance runtime / live2d motion if available
- run `pnpm typecheck`
- run `pnpm lint:fix` if the environment permits; otherwise report the blocker precisely
- keep only targeted diagnostics that are useful for ongoing embodiment debugging

## Verification Commands

1. `pnpm exec vitest run packages/stage-shared/src/stage-embodiment-speech-articulation.test.ts`
2. `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`
3. `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`
4. `pnpm exec vitest run packages/stage-ui-live2d/src/composables/live2d/motion-manager.test.ts`
5. `pnpm -F @proj-alicization/stage-ui typecheck`
6. `pnpm -F @proj-alicization/stage-ui-live2d typecheck`

## Rollback Rules

1. Keep speech timing authority in shared/render state; do not reintroduce renderer-only lip-sync heuristics.
2. If diagnostics reveal model-specific parameter incompatibility, degrade gracefully via capability checks rather than removing the motor layer.
3. If a refactor breaks unrelated runtime governance, revert only the local embodiment delta, not unrelated user work.

## Phase Cleanup Expectations

1. Remove exploratory dead code and temporary branches.
2. Keep diagnostic logs behind targeted prefixes and minimal noise.
3. Report any remaining model-specific limitations or external environment blockers explicitly.
