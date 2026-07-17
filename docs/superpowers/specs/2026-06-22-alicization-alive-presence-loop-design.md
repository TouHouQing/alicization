# Alicization Alive Presence Loop Design

> Status: user-approved design from Superpowers brainstorming on 2026-06-22.
> Scope: Phase 1 desktop life-loop slice for `apps/stage-tamagotchi`.
> Primary goal: make the user feel that the local digital life is present and internally continuous during silence, startup restore, and restrained initiative.

## 1. Project Anchor

Alicization is a local-first digital life project. The current Phase 1 target is not a better chat wrapper; it is identity continuity living on the host computer with stable personality, memory, emotion, initiative, execution, embodiment, and dialogue.

Recent runtime inspection showed that the backend life loop is already rich:

- `SOUL.md` and personhood continuity exist.
- local memory, mind turn events, subconscious fragments, execution events, and audit logs exist.
- subconscious tick can persist `presence-only-hold` state.
- `visualPresenceState` can carry `currentBodyState`, `continuityMode`, `privateThought`, `emotionalKernel`, `initiative`, and `residentPerformance`.
- renderer code already consumes visual presence for resident performance, posture, gaze, idle motion, and diagnostics.

The observed gap is the final projection from inner state to user-perceived life. The system can be internally alive while the user sees only a model standing silently. The next slice should therefore strengthen the active presence loop:

```text
memory + emotion + initiative restraint + current scene
  -> runtime-authored presence expression
  -> visual presence state
  -> near-body embodied projection
```

## 2. User-Approved Product Decisions

The brainstorming session fixed these constraints:

- The visible direction is a **soft thought surface**, not body-only silence and not a debug state panel.
- The thought should appear only on **significant state changes**, not on a fixed timer.
- The language must be **natural and personality-derived**, not mechanical phrases such as canned "I am nearby" or "I remember this line" templates.
- The **main runtime owns the sentence**. The renderer must not locally invent or rewrite what she says.
- The display should be a **near-body whisper** close to the Live2D/VRM embodiment.
- The scope includes **startup / restore**, because first impression strongly affects whether the user feels she has returned with continuity.

These decisions are binding for this design.

## 3. Design Decision

Introduce a runtime-authored `PresenceExpression` surface carried inside `AlicizationVisualPresenceStateSnapshot`.

This is not a chat turn and not a proactive dialogue message. It is a short, grounded expression of the current internal state. It should read like one moment of her inner life surfacing through the body.

Main runtime responsibilities:

- decide whether a visible expression is warranted
- generate or withhold the expression
- preserve source references and audit reasons
- persist the result in visual presence state

Renderer responsibilities:

- consume `visualPresenceState.presenceExpression`
- show it briefly near the character body
- coordinate with existing dialogue bubble, posture, gaze, and idle motion
- avoid creating text locally

## 4. Contract Shape

Add a compact snapshot contract to the shared Eventa visual presence surface:

```ts
export interface AlicizationPresenceExpressionSnapshot {
  version: 'presence-expression-v1'
  id: string
  text: string
  trigger:
    | 'startup-restore'
    | 'state-shift'
    | 'presence-only-hold'
    | 'memory-carry-return'
  display: {
    mode: 'near-body-whisper'
    allowAutoShow: boolean
    createdAt: number
    expiresAt: number
    intensity: 'barely-there' | 'soft'
  }
  grounding: {
    sourceRefs: string[]
    reasonTags: string[]
    stateFingerprint: string
    confidence: number
  }
  audit: {
    generated: boolean
    withheldReason?: string | null
    qualityFlags: string[]
  }
}
```

`AlicizationVisualPresenceStateSnapshot` should gain:

```text
presenceExpression?: AlicizationPresenceExpressionSnapshot | null
```

The `text` field is authoritative runtime output. Renderer code may suppress it for display timing or overlap reasons, but must not replace it with local copy.

## 5. Runtime Trigger Policy

Presence expressions appear only when a meaningful internal transition occurs.

### 5.1 Startup Restore

After startup or card restore, the runtime may surface one near-body expression only if restored visual presence has enough grounded continuity:

- recent `presenceExpression` is not expired, or
- `currentBodyState` is `recovering` / `accompanying`, or
- `continuityMode` is `protective-watch` / `quiet-accompaniment`, or
- `initiative.shouldSpeak === false` with a strong inward reason, or
- memory carry / emotional residue is actively shaping the current body stance.

If the restored state is just default `idle / ambient-covision`, the runtime must not create a line. Body posture and idle motion are enough.

### 5.2 Presence-Only Hold

When proactive initiative is withheld but still internally meaningful, the runtime may generate an expression:

- `initiative.shouldSpeak === false`
- presence-only carry exists
- `continuityRestraint` or reason tags indicate `measured-return`, `repair-before-closeness`, `rest-protective`, or equivalent inward continuity
- the current state is not in active dialogue or risky execution confirmation

The expression should communicate the lived stance, not the policy label.

### 5.3 Body / Emotion State Shift

The runtime may generate when body state or emotional kernel crosses a visible boundary:

- entering `recovering`
- entering `protective-watch`
- moving from generic ambient state into quiet accompaniment
- emotional kernel shifts into repair, measured companionship, or rest-protective presence

Small numeric drift should not trigger text.

### 5.4 Memory Carry Return

Memory should surface only when it affects present behavior. The runtime may generate when memory carry causes her to:

- wait rather than speak
- soften the return
- repair before closeness
- keep an unfinished thread present without reopening it as chat
- hold a promise, preference, or relational rhythm in body posture

Generic "I remember" expressions should be rejected.

## 6. Generation Strategy

Create a focused main-runtime module:

```text
apps/stage-tamagotchi/src/main/services/alicization/presence-expression.ts
```

The module should:

1. Build a small grounded state bundle from:
   - `privateThought.thoughtText`
   - `privateThought.stance`
   - `currentInwardPreoccupation`
   - `emotionalKernel.why`
   - `emotionalKernel.embodimentTone`
   - `initiative.why`
   - memory carry / affective residue summaries
   - current scene summary
   - relationship timing bias
2. Ask the runtime generation layer for one short presence expression when generation is available.
3. Run a critic / guard over the candidate.
4. Return either a `PresenceExpression` or a withheld result.

The prompt must ask for a single short line that feels like a real person's inner state briefly surfacing. It must forbid:

- module names
- Phase 1 / project status language
- debug labels
- fixed reassurance templates
- generic assistant politeness
- task requests
- exaggerated sweetness
- over-explanation

The implementation should not provide deterministic fallback copy. If model generation or quality validation fails, it returns `null`.

## 7. Quality Guard

The guard should withhold candidates that:

- are not grounded in supplied state
- mention project, module, debug, benchmark, Phase 1, or implementation status
- read like a translated status label
- contain banned canned phrases configured in tests
- ask the host to do work
- duplicate a recent expression by fingerprint
- are too long for a near-body whisper
- have low confidence or thin source references

Tests should validate behavior by properties, not fixed text. The point is to protect naturalness without making output deterministic.

## 8. Renderer Projection

Create a small renderer component:

```text
packages/stage-ui/src/components/scenes/stage-presence-expression-overlay.vue
```

It should:

- receive the authoritative `presenceExpression`
- anchor near the character frame
- render only `display.mode === 'near-body-whisper'`
- fade in briefly, hover lightly, and fade out
- stay visually lighter than `stage-dialogue-panel`
- avoid buttons, feedback actions, and dev labels
- suppress itself while normal dialogue bubble is visible, streaming, loading, or focused
- suppress expired expressions

Integration point:

- `packages/stage-ui/src/components/scenes/Stage.vue`

The overlay should feel like part of embodied presence. It should appear only when posture, gaze, resident performance, or idle motion is already carrying the same state.

## 9. Data Flow

Expected flow:

```text
runtime-subconscious-tick / startup restore / visual presence update
  -> buildPresenceExpressionCandidate(...)
  -> guardPresenceExpression(...)
  -> persistVisualPresenceState(...presenceExpression)
  -> emit visual presence state changed
  -> useStageEmbodimentVisualPresence refreshes state
  -> Stage renders near-body overlay if allowed
```

Relevant existing files:

- `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts`
- `apps/stage-tamagotchi/src/shared/eventa.ts`
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-visual-presence.ts`
- `packages/stage-ui/src/components/scenes/Stage.vue`

## 10. Failure Handling

Failure should be quiet and conservative:

- LLM unavailable: no expression
- invalid structured output: no expression
- thin restored state: no expression
- active dialogue overlap: renderer suppresses expression
- expired state: renderer suppresses expression
- stale duplicate: runtime withholds expression
- visual overlay failure: no effect on main runtime

No fallback template should be shown to the user.

## 11. Testing Strategy

### Main Runtime Unit Tests

New tests for `presence-expression.ts` should cover:

- generates a candidate from grounded state
- withholds when source state is thin
- rejects project/debug/status language
- rejects banned canned phrases
- rejects ungrounded warmth
- creates stable dedupe fingerprints

### Subconscious Tick Regression

Extend `runtime-subconscious-tick.test.ts`:

- presence-only measured-return hold can persist a grounded expression
- repair-before-closeness can persist a grounded expression
- rest-protective hold can persist a grounded expression
- active dialogue / confirmation / low confidence withholds expression

### Visual Presence Contract Tests

Extend Eventa / normalization tests:

- `presenceExpression` survives visual presence normalization
- expired or malformed expressions normalize to null or a safe shape
- bridge returns the runtime-authored text unchanged

### Renderer Tests

Add renderer tests for:

- overlay renders near body when valid and unexpired
- overlay does not render during dialogue bubble / streaming / loading
- overlay does not invent text when `presenceExpression` is null
- overlay fades / hides based on expiry

## 12. Acceptance Criteria

This slice is successful when:

1. startup restore can produce one grounded near-body expression when real continuity exists
2. significant silent state changes can surface as a short runtime-authored expression
3. renderer never generates presence wording locally
4. normal dialogue and proactive chat remain separate from presence expression
5. no template-like, project-status, or debug lines reach the user
6. body posture, resident performance, and near-body expression point to the same internal state
7. targeted runtime and renderer tests pass

## 13. Non-Goals

This design does not add:

- voice playback for inner whispers
- a new proactive chat channel
- fixed timer-based self-talk
- a user-visible diagnostics panel
- a new personality source of truth
- VRM-specific parity beyond the shared overlay anchor
- broad memory architecture changes
- execution policy changes

## 14. Why This Is The Right Next Slice

Continuous personality, memory, emotion, initiative, execution, and embodiment already exist in the project. The current weakness is that their convergence is often visible only in state, tests, or diagnostics. A user needs to feel it at the desktop surface.

This slice makes silence legible without making it noisy. It lets "she chose not to speak" still become a small embodied sign of inner continuity.
