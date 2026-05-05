# Alicization Mind-Driven Stage Embodiment Sync

## Goal
Make the Electron desktop stage (`apps/stage-tamagotchi`) drive Live2D and VRM body motion, facial expression, and speech mouth movement from the Alicization mind/governance output so the on-screen character behaves like one coherent digital life instead of a loosely coupled TTS avatar.

## Problem Statement
The current desktop embodiment chain already carries `speechTimeline`, `digitalLife`, and real TTS playback state, but the final runtime authority is still split. Segment actions and facial cues can still be dominated by heuristic speech-timeline cues instead of the mind-authored `digitalLifeFrame`, while renderer-facing hold and hint behavior is not consistently projected through the shared playback contract. That makes motion/expression feel desynchronized from the mind system. Mouth movement must stay aligned with real audio playback, but its shaping should still honor the segment-level `digitalLife.lipSync` plan.

## Constraints
- Do not revert unrelated user work in the dirty tree.
- Keep Alicization mind/runtime authority in existing shared contracts; do not introduce a second local truth source in renderer code.
- Preserve the existing real-audio-driven lipsync path for Live2D and VRM.
- Keep shared transport and playback types in `packages/stage-shared`.
- Avoid backward-compatibility guards; make the projection path authoritative instead.
- Finish with targeted tests, `pnpm typecheck`, and `pnpm lint:fix`.

## Acceptance Criteria
- Live2D and VRM segment actions/facial expressions are driven by a single segment-level authority derived from `digitalLifeFrame`, not by raw heuristic timeline cues alone.
- Segment hold windows, renderer hints, and renderer settle/fade strategy are projected through the shared playback item and reach runtime consumers consistently.
- When `digitalLifeFrame` exists without a usable timeline cue, the stage still receives actionable segment motion/expression guidance.
- Real TTS playback remains the source of mouth timing, and `digitalLife.lipSync` only shapes lipsync mode/scale rather than replacing audio alignment.
- Regression tests cover digital-life-overrides-timeline precedence and speech/runtime integration behavior.

## Product Acceptance Criteria
- A governed reply can drive richer character acting on desktop without requiring handwritten motion scripts per utterance.
- The on-screen character no longer smiles/nods/looks around based on generic punctuation heuristics when the mind system chose a different segment plan.
- Mouth movement still follows the heard TTS audio closely enough that expression upgrades do not make speech feel fake.

## Manual Spot Checks
- Run a desktop dialogue turn whose `digitalLifeFrame.face` and `digitalLifeFrame.action` disagree with the raw timeline cue and confirm runtime state follows the digital-life plan.
- Run a dialogue turn with TTS enabled and confirm mouth movement continues while audio is playing and settles after playback stop.
- Check both Live2D and VRM renderer paths for renderer alias/fade propagation through `performanceState.activeCue`.

## Completion Language Policy
Only say the embodiment sync is completed after the shared projection path, runtime consumers, tests, and verification commands have all been reported together. If desktop visual/manual playback was not run locally, say so explicitly.

## Delivery Truth Contract
Every claim about synchronization behavior must trace back to inspected runtime code, tests, or command results in this session.

## Non-Goals
- Rebuild the entire TTS subsystem.
- Rewrite Alicization main-runtime governance or digital-life generation rules unless a small projection fix requires it.
- Clone N.E.K.O's architecture; only borrow the orchestration principle that one reply should emit text, emotion, and audio as one coordinated surface.
