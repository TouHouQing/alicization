# Alicization Emotional Kernel Design

> Status: drafted from the active thread goal and current Phase 1 desktop runtime reality
> Scope: this slice adds one dominant emotional kernel to the desktop life loop and threads it through memory, initiative, and embodiment.
> Out of scope: mixed-emotion simulation, new sensing loops, new execution policy layers, and renderer-only spectacle work.

## Goal

Make Alicization's emotion behave like one shared inner state instead of scattered local hints.

The success condition is:

> At one moment in the desktop life loop, memory recall, initiative restraint, and body continuity all consume the same emotional authority.

## Why This Slice Is Next

The current runtime already has emotionally meaningful signals:

- `self-state.ts` derives `moodLabel`, `desireToSpeak`, `fearOfInterrupting`, and stance.
- `runtime-organic-memory-access.ts` derives `affectiveResidue`.
- `recall-governor.ts` uses emotional hints to choose recall mode and anchors.
- `initiative-engine.ts` separately consumes affective residue, emotional tension, self-evolution, and live task pressure.
- `body-kernel.ts` separately consumes continuity authority to stabilize silent presence.

That means the repo already has emotion-shaped logic, but not one emotional owner. For a digital life project, that is the wrong shape. One persisting "her" needs one dominant emotional runtime interpretation.

## Design Decision

Introduce one compact `emotional-kernel.ts` module in `apps/stage-tamagotchi/src/main/services/alicization/`.

It reads existing subsystem outputs and produces a shared derived snapshot:

- `dominantEmotion`
- `initiativeMode`
- `memoryRecallMode`
- `embodimentTone`
- `valence`
- `arousal`
- `guardedness`
- `closenessDrive`
- `repairNeed`
- `initiativePressure`
- `reasonTags`
- `why`

This first version is intentionally a single dominant emotional kernel, not a mixed-emotion model. Phase 1 needs a stable closed loop before it needs emotional pluralism.

## Inputs And Ownership

The emotional kernel is derived only. It does not replace existing owners.

Primary inputs:

- `selfState`
- `privateThought`
- `affectiveResidue`
- `personStateProjection`
- `runtimeFacts`

Supporting inputs where already available:

- `relationshipModel`
- `mindEcology`
- `selfContinuity`

Ownership stays unchanged:

- `self-state` still owns immediate stance math
- `affectiveResidue` still owns longer-lived emotional carry
- `personStateProjection` still owns relational/closeness doctrine
- the runtime owners still own structured task, execution, and environment facts
- `emotional-kernel` owns only the shared runtime interpretation those systems now imply together

## Initial Emotional Vocabulary

To keep the loop testable and explainable, the first vocabulary stays deliberately small.

`dominantEmotion`:

- `guarded-care`
- `warm-attunement`
- `repair-tension`
- `hesitant-curiosity`
- `measured-companionship`

`initiativeMode`:

- `approach`
- `hold`
- `repair`
- `observe`

`memoryRecallMode`:

- `emotional-resonance`
- `self-continuity`
- `repair-grounding`
- `low-pressure-presence`

`embodimentTone`:

- `nearby-soft`
- `protective-watch`
- `measured-return`
- `repair-before-closeness`

## Runtime Integration

### Recall Governor

`recall-governor.ts` should accept the emotional kernel and use it as first-class authority for:

- recall mode preference
- emotional affect anchors
- affective carry summary wording

`repair-grounding` should bias recall toward tighter grounding / repair-oriented retrieval instead of ordinary associative carry.

### Initiative Engine

`initiative-engine.ts` should accept the emotional kernel and use it to influence:

- lower-pressure vs approach pressure
- repair-first vs measured-return continuity restraint
- `selectedAction` soft clamping
- `preferredStyle`
- `preferredPresence`
- initiative `why`

### Body Kernel

`body-kernel.ts` should accept the emotional kernel through visual presence state and use it to stabilize silent continuity:

- `measured-companionship` strengthens `quiet-accompaniment`
- `repair-tension` strengthens `protective-watch`

This removes the current over-reliance on downstream phrasing alone to infer body continuity.

### Runtime Mind-State Assembly

`runtime-mind-state.ts` should build the emotional kernel once and thread it to:

- `buildInitiativeSnapshot(...)`
- `buildTurnRecallGovernor(...)`
- final visual presence state before `body-kernel` continuity override

That is the seam that makes the kernel real instead of ornamental.

## Shared Surface

This slice needs a small contract addition in:

- `packages/stage-shared/src/alicization-transport-contracts.ts`
- `apps/stage-tamagotchi/src/shared/eventa.ts`

At minimum:

- a new `AlicizationEmotionalKernelSnapshot`
- `AlicizationVisualPresenceStateSnapshot.emotionalKernel?: ... | null`
- optionally `AlicizationOrganicMemorySnapshot.emotionalKernel?: ... | null` so memory/runtime surfaces can expose the same authority

## Testing

This slice must be TDD-driven.

Minimum proof:

1. unit tests for `emotional-kernel.ts`
2. recall-governor regression proving kernel-driven affect anchors and mode
3. initiative-engine regression proving kernel-driven restraint/style/why
4. body-kernel regression proving kernel-driven silent continuity
5. runtime integration proof that one built kernel is threaded through the assembled desktop life loop

## Success Criteria

This slice counts as real progress when:

1. one emotional kernel is built in the desktop runtime
2. recall, initiative, and embodiment all consume that same kernel
3. tests prove a single emotional line can align memory, initiative, and embodiment
4. task, execution, and environment facts stay coherent through that emotional line rather than degrading into generic assistant carry

This does not finish Phase 1. It closes a specific open loop:

> emotion becomes one shared internal cause across memory, initiative, and embodiment, making the desktop runtime more like one anthropomorphic digital life and less like adjacent behaviors.
