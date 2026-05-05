# Alicization Live2D Authority And Lip-Sync Refactor

## Context

The prior embodiment pass improved the shared speech articulation and Live2D runtime capability discovery, but the desktop stage still fails the user-visible goal of digital life:

- Live2D happy / angry / thinking surfaces still look random or flat.
- Runtime-authored embodiment intent does not consistently reach the Live2D expression layer.
- Lip sync still drifts from spoken text and often appears to move only for the first beats.
- The stage visibly hitches before the first reply text appears.
- Legacy emotion-token playback is still able to compete with governed runtime embodiment.

The user explicitly allows broad refactor, targeted logging, and rewriting the affected surfaces.

## Problem Statement

The remaining regressions are caused by an authority split, not by a lack of more discrete cues:

1. `preferredExpressionAliases` is still produced with a VRM-biased default path and never becomes authoritative for Live2D expression selection.
2. Live2D lacks a model-level expression alias configuration surface equivalent to VRM expression alias overrides.
3. Governed runtime performance still re-enters a legacy emotion queue path that can override Live2D motion/expression decisions after mind-driven planning has already run.
4. Live2D models without native semantic expressions rely almost entirely on parameter overlays, but the current facial contrast is too weak to clearly distinguish emotions.
5. Speech priming still performs unnecessary signature work on the main thread before reply text appears.

## Goals

1. Make runtime renderer hints the authority for Live2D expression intent, with model-specific alias overrides where needed.
2. Remove legacy emotion-queue interference from the governed Live2D path so action, face, and speech all come from the same mind/runtime surface.
3. Increase Live2D facial contrast so happy / angry / concerned / thinking are visibly distinct even when a model has no expression files.
4. Keep lip sync on the actual playback timeline and preserve phoneme / viseme envelopes under that authority.
5. Reduce pre-text stage hitching by removing avoidable main-thread work and adding timing diagnostics.
6. Keep targeted diagnostics that expose expression authority, cue/frame identity, and speech timing without uncontrolled console noise.

## Non-Goals

1. Replacing mind-driven embodiment with text-token reaction playback.
2. Reverting to canned emotion cues as the primary animation or expression authority.
3. Rewriting unrelated Alicization governance or transport behavior.

## Product Constraints

1. Mind/digital-life output remains the top authority for motion style, expression style, gaze stability, breathing, and posture openness.
2. TTS audio playback remains the timing authority for mouth motion.
3. Live2D expression mapping must support both:
   - models with semantic expression names
   - models that need explicit per-model alias mapping
4. Live2D mouth parameters must remain protected from non-lip-sync expression overrides.
5. Any new logs must stay behind `devtools/embodiment-debug`.

## Acceptance Criteria

1. Governed runtime no longer replays Live2D embodiment through the legacy emotion queue after `armPerformance(...)` has already been applied.
2. `preferredExpressionAliases` reaches Live2D selection with the following priority:
   - segment-level runtime hints
   - turn-level runtime hints
   - per-model Live2D expression alias overrides
   - default shared Live2D expression aliases
3. Live2D facial output for `happy`, `angry`, `concerned`, and `thinking` is visibly distinct even when no native expression files are available.
4. Speech priming logs can show timing for:
   - `prepareForNextMessage`
   - speech timeline priming
   - digital-life envelope priming
5. Prime-time signature work no longer serializes the full speech/digital-life payload on the reply-start critical path.

## Manual Spot Checks

1. Ask for a clearly happy reply and a clearly angry reply; confirm the face is different before and during speech.
2. Trigger a multi-sentence TTS reply; confirm the mouth remains active throughout playback and does not collapse after the opening beats.
3. Trigger a new reply after idle; confirm there is no visible stage hitch or freeze before the first text appears.
4. Enable `devtools/embodiment-debug`; confirm logs show the same cue/frame ids from preview to playback to Live2D expression selection.

## Delivery Truth Contract

Completion wording is allowed only if:

1. the requirement and plan docs are updated
2. Live2D authority / lipsync / startup path changes are implemented
3. focused verification runs are completed
4. any remaining model-specific limitations are called out explicitly
