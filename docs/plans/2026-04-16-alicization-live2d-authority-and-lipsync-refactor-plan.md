# Alicization Live2D Authority And Lip-Sync Refactor Plan

## Internal Grade

L

## Execution Strategy

Serial refactor in one governed lane. The remaining bugs sit on one coupled path: runtime hints, Live2D expression resolution, speech playback alignment, and renderer startup timing.

## Wave Structure

### Wave 1: Re-freeze authority surfaces

Ownership:
- `packages/stage-shared/src/stage-embodiment-profile.ts`
- `packages/stage-shared/src/alicization-dialogue-embodiment.ts`
- `packages/stage-shared/src/alicization-dialogue-speech-timeline.ts`
- `packages/stage-ui/src/stores/stage-performance.ts`

Tasks:
- add a shared Live2D expression alias default surface
- add per-model Live2D emotion-expression alias storage and resolution
- feed live2d embodiment hints into the performance manifest instead of VRM-only expression defaults

### Wave 2: Reconnect runtime authority to Live2D

Ownership:
- `packages/stage-ui/src/components/scenes/Stage.vue`
- `packages/stage-ui-live2d/src/components/scenes/Live2D.vue`
- `packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue`
- `packages/stage-ui-live2d/src/composables/live2d/expression-runtime.ts`

Tasks:
- pass preferred expression aliases from runtime/store state into Live2D
- make preferred aliases outrank fuzzy heuristic matching
- add expression authority logging so the selected expression path is inspectable

### Wave 3: Remove legacy double-drive and increase Live2D contrast

Ownership:
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.ts`
- `packages/stage-ui/src/components/scenes/Stage.vue`
- `packages/stage-ui-live2d/src/composables/live2d/motion-manager.ts`

Tasks:
- stop governed Live2D embodiment from re-entering the legacy emotion queue
- keep text-token emotion parsing as fallback-only behavior
- strengthen parameter-level facial contrast for expression-less models

### Wave 4: Reduce reply-start stalls and harden speech diagnostics

Ownership:
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`

Tasks:
- replace full-payload signature serialization with cheap stable signatures
- add timing logs for speech timeline priming, digital-life priming, and message preparation
- keep cue/frame identity logs across preview, playback, and articulation

### Wave 5: Verify

Tasks:
- run focused shared/live2d/stage tests
- run workspace typecheck
- run `pnpm lint:fix` if the environment allows it; otherwise report the exact blocker

## Verification Commands

1. `pnpm exec vitest run packages/stage-shared/src/alicization-dialogue-speech-timeline.test.ts`
2. `pnpm exec vitest run packages/stage-ui-live2d/src/composables/live2d/expression-runtime.test.ts`
3. `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts`
4. `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`
5. `pnpm exec vitest run packages/stage-ui-live2d/src/composables/live2d/motion-manager.test.ts`
6. `pnpm -F @proj-alicization/stage-ui-live2d typecheck`
7. `pnpm -F @proj-alicization/stage-ui typecheck`
8. `pnpm typecheck`

## Rollback Rules

1. Do not reintroduce legacy emotion-queue authority on the governed Live2D path.
2. Do not let mouth-related expression fallbacks overwrite lip-sync timing authority.
3. If a model-specific expression mapping breaks, degrade to parameter-level expression contrast instead of falling back to random expression selection.

## Phase Cleanup Expectations

1. Keep only useful debug logs behind `devtools/embodiment-debug`.
2. Remove exploratory code paths after the authority chain is stable.
3. Explicitly report any remaining limitations for models that ship without semantic expressions.
