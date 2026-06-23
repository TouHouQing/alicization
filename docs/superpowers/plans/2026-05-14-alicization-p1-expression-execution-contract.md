# Alicization P1 Expression Execution Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align face, motion, and lipsync execution metadata so Chinese-first embodiment playback remains segment-aware, provenance-aware, and inspectable from `embodimentScript` through driver telemetry.

**Architecture:** Keep the current authority chain intact: `main runtime -> embodimentScript -> stage-ui playback -> performance/runtime drivers`. This plan does not add a new mind or renderer-side planner. It turns the existing face and motion lanes into first-class siblings of the already strengthened lipsync lane by adding source/confidence metadata, carrying it through Live2D driver telemetry, and locking an end-to-end Chinese two-segment regression.

**Tech Stack:** TypeScript, Vitest, `packages/stage-shared` embodiment contracts, `packages/stage-ui` director and Live2D driver helpers, Vue 3 runtime tests.

---

## Current State

The preceding P1 work already shipped:

- `lipsyncPlan.visemeHints[]` has `source` and `confidence`.
- `director.ts` generates timeline-backed `prosody-authority` viseme hints.
- Runtime speech gives `prosody-authority` hints dominance over weak audio fallback.
- `facePlan.speakingCues[]` carries `holdMs`, `preUtteranceCue`, and `postUtteranceCue`.
- Live2D face driver prefers segment-level idle face timing cues before falling back to script-level cues.

This plan starts from those contracts and closes the remaining asymmetry: face and motion cues still lack explicit provenance metadata, and telemetry does not yet expose a coherent authority shape across all three execution lanes.

---

### Task 1: Add Shared Face And Motion Authority Metadata

**Files:**
- Modify: `packages/stage-shared/src/alicization-embodiment-script.ts`
- Modify: `packages/stage-shared/src/alicization-embodiment-script.test.ts`

- [ ] **Step 1: Write the failing shared contract test**

Add this assertion to `normalizes one live2d embodiment script with speech, face, motion, and lipsync plans` in `packages/stage-shared/src/alicization-embodiment-script.test.ts` by extending the existing fixture:

```text
facePlan: {
  preUtteranceCue: 'soft-breath',
  postUtteranceCue: 'settle-smile',
  speakingCues: [{
    segmentId: 'segment-1',
    emotion: 'concerned',
    facialCue: 'soft-gaze',
    intensity: 0.62,
    holdMs: 360,
    preUtteranceCue: 'steady-inhale',
    postUtteranceCue: 'soft-release',
    source: 'prosody-authority',
    confidence: 0.9,
  }],
},
motionPlan: {
  idleBase: 'idle_settle',
  actionBursts: [{
    segmentId: 'segment-1',
    actionCue: 'comfort_sway',
    intensity: 0.55,
    holdMs: 420,
    source: 'timeline-projection',
    confidence: 0.86,
  }],
  attentionMode: 'attentive',
},
```

Then add these assertions after the existing face and motion assertions:

```ts
expect(script?.facePlan.speakingCues[0]).toEqual(expect.objectContaining({
  source: 'prosody-authority',
  confidence: 0.9,
}))
expect(script?.motionPlan.actionBursts[0]).toEqual(expect.objectContaining({
  source: 'timeline-projection',
  confidence: 0.86,
}))
```

- [ ] **Step 2: Run the shared contract test and verify it fails**

Run:

```bash
pnpm exec vitest run packages/stage-shared/src/alicization-embodiment-script.test.ts
```

Expected: FAIL because `AlicizationEmbodimentFaceCue` and `AlicizationEmbodimentMotionBurst` do not preserve `source` and `confidence`.

- [ ] **Step 3: Add shared execution metadata types and normalizers**

Modify `packages/stage-shared/src/alicization-embodiment-script.ts`:

```ts
export type AlicizationEmbodimentExecutionCueSource
  = 'prosody-authority'
    | 'timeline-projection'
    | 'digital-life-projection'

export interface AlicizationEmbodimentExecutionCueMetadata {
  source: AlicizationEmbodimentExecutionCueSource
  confidence: number
}
```

Extend both interfaces:

```ts
export interface AlicizationEmbodimentFaceCue extends AlicizationEmbodimentExecutionCueMetadata {
  segmentId: string
  emotion: AlicizationEmotion
  facialCue: string | null
  intensity: number
  holdMs: number
  preUtteranceCue: string | null
  postUtteranceCue: string | null
}

export interface AlicizationEmbodimentMotionBurst extends AlicizationEmbodimentExecutionCueMetadata {
  segmentId: string
  actionCue: string | null
  intensity: number
  holdMs: number
}
```

Add helpers near the existing normalizers:

```ts
function normalizeExecutionCueSource(raw: unknown): AlicizationEmbodimentExecutionCueSource | null {
  return raw === 'prosody-authority'
    || raw === 'timeline-projection'
    || raw === 'digital-life-projection'
    ? raw
    : null
}

function normalizeRequiredUnit(raw: unknown): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return Math.max(0, Math.min(1, value))
}
```

In `normalizeFaceCue` and `normalizeMotionBurst`, require valid metadata:

```ts
const source = normalizeExecutionCueSource(candidate.source)
const confidence = normalizeRequiredUnit(candidate.confidence)
if (!segmentId || !source || confidence === null)
  return null
```

Return `source` and `confidence` in both objects.

- [ ] **Step 4: Run the shared contract test and verify it passes**

Run:

```bash
pnpm exec vitest run packages/stage-shared/src/alicization-embodiment-script.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/stage-shared/src/alicization-embodiment-script.ts packages/stage-shared/src/alicization-embodiment-script.test.ts
git commit -m "feat: add embodiment face motion authority metadata"
```

### Task 2: Generate Face And Motion Metadata In The Director

**Files:**
- Modify: `packages/stage-ui/src/services/embodiment/director.ts`
- Modify: `packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts`
- Modify: `packages/stage-ui/src/services/embodiment/director.test.ts`

- [ ] **Step 1: Write failing director assertions for face and motion metadata**

In `packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts`, extend `derives segment-level face enter and release cues from chinese prosody timing` with:

```ts
expect(script.facePlan.speakingCues).toEqual([
  expect.objectContaining({
    segmentId: 'segment-comma',
    source: 'prosody-authority',
    confidence: 0.94,
    preUtteranceCue: 'steady-inhale',
    postUtteranceCue: 'soft-release',
  }),
  expect.objectContaining({
    segmentId: 'segment-question',
    source: 'prosody-authority',
    confidence: 0.94,
    preUtteranceCue: 'steady-inhale',
    postUtteranceCue: 'eyes-soften',
  }),
])
```

In `packages/stage-ui/src/services/embodiment/director.test.ts`, extend `creates per-segment face and motion cues for multi-segment chinese guidance turns` with:

```ts
expect(script.motionPlan.actionBursts.map(burst => burst.source)).toEqual([
  'timeline-projection',
  'timeline-projection',
])
expect(script.motionPlan.actionBursts.map(burst => burst.confidence)).toEqual([
  0.88,
  0.88,
])
```

- [ ] **Step 2: Run director tests and verify they fail**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts packages/stage-ui/src/services/embodiment/director.test.ts
```

Expected: FAIL because director-generated face and motion cues do not yet include `source` and `confidence`.

- [ ] **Step 3: Add provenance helpers in `director.ts`**

Add near the existing director helpers:

```ts
function resolveTimelineBackedCueConfidence(
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined,
) {
  if (!timelineSegment)
    return 0

  const hasExplicitCue = Boolean(timelineSegment.facialCue || timelineSegment.actionCue)
  const hasHoldWindow = Number.isFinite(timelineSegment.facialHoldMs) || Number.isFinite(timelineSegment.actionHoldMs)
  return hasExplicitCue || hasHoldWindow ? 0.94 : 0.88
}

function resolveTimelineProjectionConfidence(
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined,
) {
  if (!timelineSegment)
    return 0

  const hasActionWindow = timelineSegment.actionWindow !== 'none'
  const hasHoldWindow = Number.isFinite(timelineSegment.actionHoldMs)
  return hasActionWindow || hasHoldWindow ? 0.88 : 0.82
}
```

- [ ] **Step 4: Populate face cue metadata**

In `speakingCues`, add:

```text
source: timelineSegment ? 'prosody-authority' as const : 'timeline-projection' as const,
confidence: timelineSegment ? resolveTimelineBackedCueConfidence(timelineSegment) : 0.72,
```

- [ ] **Step 5: Populate motion burst metadata**

In `actionBursts`, add:

```text
source: timelineSegment ? 'timeline-projection' as const : 'digital-life-projection' as const,
confidence: timelineSegment ? resolveTimelineProjectionConfidence(timelineSegment) : 0.72,
```

- [ ] **Step 6: Run director tests and verify they pass**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts packages/stage-ui/src/services/embodiment/director.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/stage-ui/src/services/embodiment/director.ts packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts packages/stage-ui/src/services/embodiment/director.test.ts
git commit -m "feat: derive face motion execution metadata"
```

### Task 3: Carry Metadata Through Live2D Driver Telemetry

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/drivers/live2d-face-driver.ts`
- Modify: `packages/stage-ui/src/components/scenes/drivers/live2d-motion-driver.ts`
- Modify: `packages/stage-ui/src/components/scenes/runtime.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`

- [ ] **Step 1: Write failing driver telemetry assertions**

In `packages/stage-ui/src/components/scenes/runtime.test.ts`, add metadata to the existing test script:

```text
speakingCues: [{
  segmentId: 'segment-1',
  emotion: 'happy' as const,
  facialCue: 'smile',
  intensity: 0.8,
  holdMs: 360,
  preUtteranceCue: 'steady-inhale',
  postUtteranceCue: 'soft-release',
  source: 'prosody-authority',
  confidence: 0.94,
}],
actionBursts: [{
  segmentId: 'segment-1',
  actionCue: 'wave',
  intensity: 0.7,
  holdMs: 320,
  source: 'timeline-projection',
  confidence: 0.88,
}],
```

Extend `resolves live2d face cues from the embodiment script`:

```ts
expect(resolveLive2DFaceDriverState({
  script,
  segmentId: 'segment-1',
  playbackPhase: 'playing',
})).toEqual(expect.objectContaining({
  source: 'prosody-authority',
  confidence: 0.94,
}))
```

Extend `resolves live2d motion cues from the embodiment script`:

```ts
expect(resolveLive2DMotionDriverState({
  script,
  segmentId: 'segment-1',
  playbackPhase: 'playing',
})).toEqual(expect.objectContaining({
  source: 'timeline-projection',
  confidence: 0.88,
}))
```

- [ ] **Step 2: Run runtime tests and verify they fail**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/components/scenes/runtime.test.ts
```

Expected: FAIL because face and motion driver state do not expose `source` and `confidence`.

- [ ] **Step 3: Add metadata fields to driver state interfaces**

In `live2d-face-driver.ts`, add:

```ts
source: AlicizationEmbodimentFaceCue.source | null
confidence: number
```

Return:

```text
source: speakingCue?.source ?? null,
confidence: speakingCue?.confidence ?? 0,
```

In `live2d-motion-driver.ts`, add:

```ts
source: AlicizationEmbodimentMotionBurst.source | null
confidence: number
```

Return:

```text
source: actionBurst?.source ?? null,
confidence: actionBurst?.confidence ?? 0,
```

- [ ] **Step 4: Update diagnostics and performance runtime fixtures**

Add `source` and `confidence` to face and motion telemetry fixtures in:

- `packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts`
- `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`

Use:

```text
face: {
  emotion: 'happy',
  facialCue: 'smile',
  intensity: 0.8,
  holdMs: 360,
  preUtteranceCue: 'soft-breath',
  postUtteranceCue: 'settle-smile',
  segmentId: 'segment-1',
  source: 'prosody-authority',
  confidence: 0.94,
}
```

and:

```text
motion: {
  idleBase: 'idle_settle',
  attentionMode: 'attentive',
  actionCue: 'wave',
  intensity: 0.7,
  holdMs: 320,
  segmentId: 'segment-1',
  source: 'timeline-projection',
  confidence: 0.88,
}
```

- [ ] **Step 5: Run runtime and telemetry tests**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run:

```bash
pnpm -F @proj-alicization/stage-ui typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/stage-ui/src/components/scenes/drivers/live2d-face-driver.ts packages/stage-ui/src/components/scenes/drivers/live2d-motion-driver.ts packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts
git commit -m "feat: expose face motion execution metadata"
```

### Task 4: Add End-To-End Chinese Expression Execution Regression

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`

- [ ] **Step 1: Add a speech playback telemetry regression**

In `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`, add a test after the existing multi-segment embodiment script tests:

```ts
it('preserves chinese segment expression metadata from embodiment script into playback telemetry', async () => {
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
  const speech = useStageEmbodimentSpeech({
    audioContext: {} as AudioContext,
    mouthOpenSize: ref(0),
    paused: ref(false),
    speechStylePitch: ref(0),
    speechStyleRate: ref(1),
    stageModelRenderer: ref('live2d'),
  })

  const script = {
    version: 'embodiment-script-v1' as const,
    turnId: 'turn-expression-metadata',
    rendererTarget: 'live2d' as const,
    replyText: '先看这里，然后确认了吗？',
    state: {
      baseEmotion: 'thinking' as const,
      delivery: 'gentle' as const,
      emphasis: 1 as const,
      residentMode: 'dialogue' as const,
    },
    speechPlan: {
      segments: [{
        id: 'segment-question',
        index: 1,
        text: '然后确认了吗？',
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 260,
      }],
      interruptPolicy: 'soft-settle' as const,
      preRollMs: 20,
      settleMs: 260,
    },
    facePlan: {
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
      speakingCues: [{
        segmentId: 'segment-question',
        emotion: 'thinking' as const,
        facialCue: 'focused',
        intensity: 0.46,
        holdMs: 420,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
        source: 'prosody-authority' as const,
        confidence: 0.94,
      }],
    },
    motionPlan: {
      idleBase: 'idle_settle',
      attentionMode: 'attentive' as const,
      actionBursts: [{
        segmentId: 'segment-question',
        actionCue: 'idle_gentle_nod',
        intensity: 0.32,
        holdMs: 180,
        source: 'timeline-projection' as const,
        confidence: 0.88,
      }],
    },
    lipsyncPlan: {
      mode: 'energy-phoneme-hybrid' as const,
      visemeHints: [
        { segmentId: 'segment-question', viseme: 'I' as const, weight: 0.35, source: 'prosody-authority' as const, confidence: 0.94 },
        { segmentId: 'segment-question', viseme: 'closed' as const, weight: 0.75, source: 'prosody-authority' as const, confidence: 0.94 },
      ],
    },
  }

  const preview = speech.previewSpeechSegment({
    intentId: 'intent-expression-metadata',
    streamId: 'stream-expression-metadata',
    segmentId: 'segment-question',
    text: '然后确认了吗？',
    special: null,
    continuityHoldMs: 180,
    metadata: {
      embodimentScript: script,
    },
  })

  expect(preview?.metadata?.embodimentPlayback?.drivers.face).toEqual(expect.objectContaining({
    segmentId: 'segment-question',
    facialCue: 'focused',
    holdMs: 420,
    postUtteranceCue: 'eyes-soften',
    source: 'prosody-authority',
    confidence: 0.94,
  }))
  expect(preview?.metadata?.embodimentPlayback?.drivers.motion).toEqual(expect.objectContaining({
    segmentId: 'segment-question',
    actionCue: 'idle_gentle_nod',
    holdMs: 180,
    source: 'timeline-projection',
    confidence: 0.88,
  }))
  expect(preview?.metadata?.embodimentPlayback?.drivers.lipsync?.visemeHints).toEqual([
    { segmentId: 'segment-question', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
    { segmentId: 'segment-question', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.94 },
  ])

  speech.dispose()
})
```

- [ ] **Step 2: Run the speech regression and verify it fails if Task 3 is incomplete**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts -t "preserves chinese segment expression metadata"
```

Expected before Task 3 completion: FAIL because driver telemetry is missing face/motion metadata. Expected after Task 3: PASS.

- [ ] **Step 3: Add performance runtime metadata regression**

In `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`, extend `consumes explicit playback telemetry drivers when segment metadata is absent` with:

```ts
expect(runtime.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
  source: 'prosody-authority',
  confidence: 0.94,
}))
expect(runtime.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
  source: 'timeline-projection',
  confidence: 0.88,
}))
```

- [ ] **Step 4: Run the full expression execution regression set**

Run:

```bash
pnpm exec vitest run packages/stage-shared/src/alicization-embodiment-script.test.ts packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts packages/stage-ui/src/services/embodiment/director.viseme.test.ts packages/stage-ui/src/services/embodiment/director.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run:

```bash
pnpm -F @proj-alicization/stage-ui typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts
git commit -m "test: lock expression execution metadata flow"
```

### Task 5: Final Verification

**Files:**
- Test-only task; no production file changes expected.

- [ ] **Step 1: Run the authoritative expression execution suite**

Run:

```bash
pnpm exec vitest run packages/stage-shared/src/alicization-lipsync-contracts.test.ts packages/stage-shared/src/alicization-embodiment-script.test.ts packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts packages/stage-ui/src/services/embodiment/director.viseme.test.ts packages/stage-ui/src/services/embodiment/director.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run stage-ui typecheck**

Run:

```bash
pnpm -F @proj-alicization/stage-ui typecheck
```

Expected: PASS.

- [ ] **Step 3: Inspect git status**

Run:

```bash
git status --short --branch
```

Expected: Only known unrelated dirty files remain, or a clean worktree for files touched by this plan.

- [ ] **Step 4: Commit verification notes if any test fixture updates were needed**

If Step 1 or Step 2 required fixture-only updates in this task, commit these files:

```bash
git add packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts
git commit -m "test: stabilize expression execution contract verification"
```

If no changes were needed, do not create an empty commit.
