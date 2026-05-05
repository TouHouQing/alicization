# Alicization Stage Embodiment Regression Fix

## Context

The desktop stage is intended to express a digital life whose body is driven by mind ecology, autobiographical self, initiative, and the runtime-generated dialogue embodiment envelope. Recent embodiment work improved continuous articulation, but several regressions remain visible in the Live2D path:

- mouth motion does not stay aligned with spoken audio and visible text
- mouth often moves for only a couple of beats, then freezes while speech continues
- happy/angry requests barely change the rendered face
- the Live2D stage hitches before the first visible reply text arrives
- action and facial output diverge from the runtime-authored embodiment / digital life state

The user explicitly allows broad refactor and targeted runtime logging. The product goal remains digital life, not canned reaction playback.

## Problem Statement

The current stage embodiment stack still has timing and authority splits:

1. speech preview, actual playback, articulation derivation, and renderer drive are computed in separate layers with incomplete continuity guarantees
2. Live2D facial output mixes runtime performance, articulation, and model base parameters, but its effective emotional contrast is too weak and not sufficiently anchored to the mind-derived motor plan
3. message-start preparation still performs work on the critical path before the visible reply begins
4. diagnostics are insufficient to trace where mouth/audio/expression divergence starts
5. turn preparation currently clears resident performance and renderer embodiment hints too early, producing a visible neutral snap before the next governed reply takes over

## Goals

1. Make speech articulation continuous for the full playback duration, including different TTS voice profiles, without collapsing back to discrete cue triggers.
2. Ensure the rendered mouth follows the actual audio timeline while preserving phoneme / viseme envelopes derived from text and voice metadata.
3. Ensure happy / angry / concerned / thinking performance produces visibly distinct Live2D facial outcomes, rooted in the digital life motor plan rather than ad-hoc expression triggers.
4. Remove message-start stage hitching from the user-visible reply path.
5. Add targeted embodiment diagnostics so speech timing, performance timing, and renderer output can be inspected.
6. Keep resident mind-driven performance alive through message preparation until the next dialogue embodiment meta supersedes it.

## Non-Goals

1. Replacing the mind-driven digital life model with a simple emotion-tag animation system.
2. Reverting to one-shot emotion specials as the primary expression authority.
3. Changing unrelated Alicization runtime governance behavior outside the embodiment surface.

## Product Constraints

1. Mind authority stays with the runtime-authored digital life / embodiment envelope.
2. TTS playback stays the timing authority for mouth movement.
3. Phoneme / viseme shaping remains continuous and voice-sensitive.
4. Renderer-specific code should consume shared speech / performance state instead of inventing separate heuristics.
5. Logs must be targeted and removable, not uncontrolled console spam.
6. The `devtools/embodiment-debug` switch must work in packaged desktop builds, not only development mode.

## Acceptance Criteria

1. During buffered or synthetic speech playback, mouth movement remains active until playback actually ends or is interrupted.
2. `speechRenderState` and renderer drive preserve continuity across preview-to-playback transitions without freezing at low energy after the first few frames.
3. Live2D facial outputs for at least `happy`, `angry`, `concerned`, and `thinking` produce visibly different brow / eye / cheek / mouth targets when runtime performance changes.
4. The reply start path no longer blocks the first visible text chunk on lazy lip sync initialization.
5. Diagnostic logs can show, at minimum:
   - preview vs playback segment identity
   - playback phase transitions
   - articulation progression
   - renderer mouth / facial targets
   - long frame or stalled update indicators

## Manual Spot Checks

1. Send a multi-sentence reply with TTS enabled and confirm mouth motion stays active throughout the full utterance.
2. Ask for obviously different emotional surfaces such as happy and angry, and confirm the face changes are visually distinguishable before and during speech.
3. Trigger at least one reply after the stage has been idle and confirm the model does not visibly hitch before the first text appears.
4. Inspect logs to confirm the same segment id flows from preview to playback to renderer without early collapse.

## Delivery Truth Contract

Completion wording is allowed only if:

1. the bugfix docs are written
2. the embodiment pipeline code is refactored
3. focused verification is run
4. any remaining blockers are stated explicitly
