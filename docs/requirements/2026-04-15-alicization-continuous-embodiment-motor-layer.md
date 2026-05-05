# Alicization Continuous Embodiment Motor Layer

## Goal
Upgrade the desktop embodiment chain from discrete expression/action cue playback into a continuous mind-driven motor layer so Live2D and VRM can feel like one ongoing organism rather than a TTS puppet with intermittent gestures.

## Problem Statement
The current desktop embodiment pipeline already projects `digitalLifeFrame`, speech playback, and renderer settle hints into shared runtime state, but the visible acting surface is still dominated by discrete cue categories such as `facialCue` and `actionCue`. That keeps the system trapped in "play an emotion, then play a gesture" behavior. To feel anthropomorphic, the desktop avatar needs continuous control channels for gaze, head posture, breath, facial micro-tension, body openness, and mouth shaping bias. Those channels must come from the mind-authored digital-life surface, stay compatible with audio-driven lipsync timing, and feed both Live2D and VRM as one motor authority.

## Constraints
- Do not revert unrelated user work in the dirty worktree.
- Respect the existing Alicization mind/runtime authority; renderer code must consume shared motor state rather than inventing its own truth surface.
- Real TTS playback remains the timing authority for mouth movement.
- Shared contract changes must live in `packages/stage-shared`.
- Do not solve this by adding more one-off cue names or model-specific hacks.
- Finish with targeted tests, `pnpm typecheck`, and `pnpm lint:fix`.

## Acceptance Criteria
- `AlicizationDigitalLifeEnvelope` and each `AlicizationDigitalLifeFrame` expose a continuous motor plan with gaze, head, breath, facial micro-control, body posture, stillness, and expressivity channels.
- `StageEmbodimentPerformanceState` carries a runtime motor state derived from the active/preview digital-life frame and speech dynamics.
- `use-stage-embodiment-performance-runtime.ts` treats the motor layer as the main expressive surface and updates it continuously during playback and preview transitions.
- Live2D consumes the motor layer to drive gaze/head/body/breath/facial parameters beyond discrete cue weights.
- VRM consumes the motor layer to drive look-at stability/offsets, bone posture, and facial intensity shaping beyond discrete cue selection.
- Audio-driven lipsync remains intact; motor channels may bias mouth style and jaw openness but may not replace playback timing.

## Product Acceptance Criteria
- A single governed reply can produce continuous embodied behavior during the whole utterance rather than only at cue boundaries.
- The desktop avatar can appear attentive, hesitant, protective, playful, or reflective through posture, gaze, and breathing even when discrete cue names are unchanged.
- Live2D and VRM follow the same underlying motor intent, so their acting style differs by renderer capability rather than by separate orchestration logic.

## Manual Spot Checks
- Run a desktop turn with a reflective or hesitant reply and confirm the character holds softer gaze, lower motion amplitude, and more settled breathing throughout the utterance instead of only at a cue boundary.
- Run an energetic or playful reply and confirm both renderers show stronger head/body/gaze motion while lipsync still follows the heard audio.
- Inspect a preview segment before playback starts and confirm the queued segment can expose a future motor intent without immediately triggering full speech playback.

## Completion Language Policy
Only claim this motor-layer milestone is complete after the shared contract, stage runtime, renderer consumers, targeted tests, and verification commands are all reported together. If no visual desktop run was performed locally, state that explicitly.

## Delivery Truth Contract
Every claim about anthropomorphic embodiment must trace back to inspected code, tests, or command output from this governed run.

## Non-Goals
- Full locomotion, physics-based full-body choreography, or mocap ingestion.
- Replacing the existing TTS/audio playback stack.
- Rebuilding Alicization mind synthesis from scratch in this milestone.
- Copying N.E.K.O's implementation details; only its continuous-behavior principle is in scope.
