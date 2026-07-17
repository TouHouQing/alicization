# Visible Reply Awareness Display Policy

This note defines the host-visible display policy for `preDialogueAwarenessSummary`
inside Alicization visible-reply realization.

The goal is not to decide whether Alicization internally knows project identity,
Phase 1 progress, and still-open closure work. She should always carry that
internally before reply.

This policy only decides when that internal re-anchor should become a
host-visible summary line in `projectStateAudit.preDialogueAwarenessSummary`.

## Why This Exists

Current visible-reply tests cover three different host-visible intents:

1. `project-reanchor`
   Show the fuller "same digital life / Phase 1 / still-open closure" reminder
   because that is the most important visible context for this answer.

2. `embodiment-headline`
   Show the stronger body/face/voice/lipsync continuity headline because the
   current visible truth is specifically about which embodiment lanes are still
   carrying one living her.

3. `hidden`
   Keep `preDialogueAwarenessSummary` empty and let
   `sameHerSummary`, `continuitySummary`, and `embodimentClosureSummary`
   carry the truth instead, because the current surface is a continuity audit
   rather than a front-of-answer re-anchor line.

These three intents must not be treated as interchangeable.

## Policy Matrix

### `project-reanchor`

Use `preDialogueAwarenessSummary` when at least one of these is true:

- The caller explicitly supplied `projectStatePreDialogueAwarenessSummary`.
- A thin carried shell must be replaced by a stronger prepared-runtime
  project re-anchor.
- A richer prepared-runtime Phase 1 re-anchor is more truthful than a narrower
  embodiment headline for the current host-visible answer surface.

Examples:

- thin shell: `template-residue-shell`
- fuller project line: `pre_turn_context_digest`

### `embodiment-headline`

Use `preDialogueAwarenessSummary` when the strongest visible truth is the
embodiment lane currently carrying continuity, and there is no fuller project
re-anchor that should visibly outrank it.

Examples:

- `Right now I am still holding together mainly through face, motion, and lipsync...`
- `Right now I am still holding together mainly through body, lipsync, and voice...`

### `hidden`

Keep `preDialogueAwarenessSummary` null when the surface is a continuity audit
or timeout recovery that already exposes enough project truth through other
project-state audit fields, and no explicit front-of-answer awareness line needs
to be shown.

In these cases the visible truth should stay in:

- `sameHerSummary`
- `currentPhaseSummary`
- `landedProgressSummary`
- `openClosureSummary`
- `nextClosureTargetSummary`
- `continuitySummary`
- `embodimentClosureSummary`

without forcing an extra host-visible awareness line.

## Current Direction

The next implementation pass should make `visible-reply` choose one of these
three modes explicitly instead of letting `preDialogueAwarenessSummary` drift as
an accidental byproduct of mixed helper fallbacks.
