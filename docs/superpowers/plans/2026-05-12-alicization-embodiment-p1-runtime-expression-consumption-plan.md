# Alicization Embodiment P1 Runtime Expression Consumption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the already-produced Chinese-first prosody, viseme, and micro-expression signals materially affect runtime speech playback, mouth shaping, and expression carry, instead of stopping at plan-time metadata.

**Architecture:** Keep the existing `P0` and early `P1` contract chain intact. This slice does not add new providers, new authority layers, or new shared transport contracts. It only deepens runtime consumption in three places: `stage-shared` speech dynamics projection, `stage-ui` mouth/articulation overlay, and `stage-ui` performance runtime expression transitions using the existing `embodimentScript` and playback driver metadata path.

**Tech Stack:** TypeScript, Vue 3 composables, Vitest, `packages/stage-shared` speech playback/articulation utilities, and `packages/stage-ui` embodiment runtime composables/drivers.

---

### Task 1: Make Speech Prosody Intent Affect Runtime Dynamics

**Files:**
- Create: `packages/stage-shared/src/stage-embodiment-speech-playback.test.ts`
- Modify: `packages/stage-shared/src/stage-embodiment-speech-playback.ts`
- Test: `packages/stage-shared/src/stage-embodiment-speech-playback.test.ts`

- [ ] **Step 1: Write the failing dynamics tests first**

```ts
import { describe, expect, it } from 'vitest'

import {
  createStageEmbodimentSpeechPlaybackItem,
  deriveStageEmbodimentSpeechDynamicsState,
} from './stage-embodiment-speech-playback'

function createPlaybackItemWithProsody(input: {
  segmentId: string
  text: string
  pauseClass: 'comma' | 'full-stop' | 'question'
  phraseBoundary: 'soft' | 'hard'
  contour: 'flat' | 'falling' | 'rising'
  emphasisStrength: number
  tempoShift: number
}) {
  return createStageEmbodimentSpeechPlaybackItem({
    intentId: 'intent-prosody',
    streamId: 'stream-prosody',
    segmentId: input.segmentId,
    text: input.text,
    special: null,
    metadata: {
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-prosody',
        rendererTarget: 'live2d',
        replyText: input.text,
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'dialogue',
        },
        speechPlan: {
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 260,
          segments: [{
            id: input.segmentId,
            index: 0,
            text: input.text,
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 260,
            prosody: {
              language: 'zh-CN',
              pauseClass: input.pauseClass,
              phraseBoundary: input.phraseBoundary,
              contour: input.contour,
              emphasisWord: '这里',
              emphasisStrength: input.emphasisStrength,
              tempoShift: input.tempoShift,
            },
          }],
        },
        facePlan: { speakingCues: [] },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: { mode: 'energy-only' },
      },
    },
  })
}

describe('stage embodiment speech playback dynamics', () => {
  it('raises prosody intensity and cadence for rising question contours', () => {
    const neutral = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-neutral',
        text: '先看这里。',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.42,
        tempoShift: 0,
      }),
      mouthOpenSize: 36,
      now: 320,
      speechEnergy: 0.48,
      startedAt: 0,
      styleRate: 1,
    })

    const rising = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-rising',
        text: '先看这里？',
        pauseClass: 'question',
        phraseBoundary: 'hard',
        contour: 'rising',
        emphasisStrength: 0.82,
        tempoShift: 0.08,
      }),
      mouthOpenSize: 36,
      now: 320,
      speechEnergy: 0.48,
      startedAt: 0,
      styleRate: 1,
    })

    expect(rising.prosodyIntensity).toBeGreaterThan(neutral.prosodyIntensity)
    expect(rising.cadencePulse).toBeGreaterThan(neutral.cadencePulse)
    expect(rising.emphasisLevel).toBeGreaterThan(neutral.emphasisLevel)
  })

  it('slows cadence pressure for soft comma pauses with negative tempo shift', () => {
    const comma = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-comma',
        text: '先看这里，',
        pauseClass: 'comma',
        phraseBoundary: 'soft',
        contour: 'falling',
        emphasisStrength: 0.68,
        tempoShift: -0.08,
      }),
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.46,
      startedAt: 0,
      styleRate: 1,
    })

    const fullStop = deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item: createPlaybackItemWithProsody({
        segmentId: 'segment-stop',
        text: '先看这里。',
        pauseClass: 'full-stop',
        phraseBoundary: 'hard',
        contour: 'falling',
        emphasisStrength: 0.68,
        tempoShift: 0,
      }),
      mouthOpenSize: 34,
      now: 280,
      speechEnergy: 0.46,
      startedAt: 0,
      styleRate: 1,
    })

    expect(comma.cadencePulse).toBeLessThan(fullStop.cadencePulse)
  })
})
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `pnpm exec vitest run packages/stage-shared/src/stage-embodiment-speech-playback.test.ts`

Expected: FAIL because `deriveStageEmbodimentSpeechDynamicsState(...)` currently ignores `speechPlan.segments[*].prosody`.

- [ ] **Step 3: Add a local helper that resolves the active plan-segment prosody from playback metadata**

```ts
function resolvePlaybackSegmentProsodyIntent(item: StageEmbodimentSpeechPlaybackItem | null) {
  const script = normalizeEmbodimentScriptFromPlaybackMetadata(item?.metadata)
  if (!script)
    return null

  const directMatch = item?.segmentId
    ? script.speechPlan.segments.find(segment => segment.id === item.segmentId)
    : null
  if (directMatch?.prosody)
    return directMatch.prosody

  const normalizedText = item?.text.trim().replace(/\s+/g, ' ') ?? ''
  return script.speechPlan.segments.find(segment => segment.text.trim().replace(/\s+/g, ' ') === normalizedText)?.prosody ?? null
}
```

- [ ] **Step 4: Fold plan prosody into emphasis, prosody intensity, and cadence instead of leaving it as dead metadata**

```ts
const planProsody = resolvePlaybackSegmentProsodyIntent(input.item)
const prosodyStrength = clampUnit(planProsody?.emphasisStrength ?? 0)
const tempoShift = clampRange(planProsody?.tempoShift ?? 0, -1, 1)
const contourBoost = planProsody?.contour === 'rising'
  ? 0.12
  : planProsody?.contour === 'dip-rise'
    ? 0.08
    : planProsody?.contour === 'falling'
      ? 0.04
      : 0
const boundaryBias = planProsody?.phraseBoundary === 'hard'
  ? 0.08
  : planProsody?.phraseBoundary === 'soft'
    ? -0.04
    : 0

const emphasisLevel = clampUnit(
  resolveTextEmphasis(input.item)
  + prosodyStrength * 0.28
  + contourBoost * 0.4,
)

const prosodyIntensity = clampUnit(
  emphasisLevel * 0.38
  + cueProsody * 0.2
  + styleIntensity * 0.24
  + speechEnergy * 0.22
  + prosodyStrength * 0.24
  + contourBoost
  + Math.max(0, tempoShift) * 0.08,
)

const cadencePulse = resolveCadencePulse({
  ...existingInput,
  emphasisLevel: clampUnit(emphasisLevel + cueHead * 0.08 + prosodyStrength * 0.14 + contourBoost * 0.1 + boundaryBias),
  styleRate: Number.isFinite(input.styleRate)
    ? Number(input.styleRate) + tempoShift * 0.22
    : 1 + tempoShift * 0.22,
})
```

- [ ] **Step 5: Run the targeted shared playback test**

Run: `pnpm exec vitest run packages/stage-shared/src/stage-embodiment-speech-playback.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-shared/src/stage-embodiment-speech-playback.ts packages/stage-shared/src/stage-embodiment-speech-playback.test.ts
git commit -m "feat: consume prosody intent in speech runtime"
```

### Task 2: Make Viseme Hints Actually Shape Runtime Mouth Behavior

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`

- [ ] **Step 1: Write failing mouth-overlay tests for hint-driven shaping**

```ts
it('biases live2d mouth shaping toward embodiment viseme hints when audio weights are ambiguous', async () => {
  const getVowelWeights = vi.fn(() => ({
    A: 0.22,
    E: 0.24,
    I: 0.18,
    O: 0.2,
    U: 0.18,
  }))

  createLive2DLipSyncMock.mockResolvedValueOnce({
    node: { disconnect: vi.fn() } as unknown as AudioNode,
    connectSource: vi.fn(),
    getMouthOpen: vi.fn(() => 0.02),
    getVowelWeights,
  } as Awaited<ReturnType<typeof createLive2DLipSync>>)

  const preview = speech.previewSpeechSegment({
    intentId: 'intent-hinted-a',
    streamId: 'stream-hinted-a',
    segmentId: 'segment-hinted-a',
    text: '啊',
    special: null,
    continuityHoldMs: 180,
    metadata: {
      embodimentScript: {
        ...baseEmbodimentScript,
        speechPlan: {
          ...baseEmbodimentScript.speechPlan,
          segments: [{
            ...baseEmbodimentScript.speechPlan.segments[0],
            id: 'segment-hinted-a',
            text: '啊',
          }],
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{ segmentId: 'segment-hinted-a', viseme: 'A', weight: 0.92 }],
        },
      },
    },
  })

  expect(preview?.metadata).toBeTruthy()
  // drive one frame and assert the runtime articulation follows hint A harder than the raw audio ambiguity would.
  expect(speech.speechRenderState.value.articulation.visemes.A).toBeGreaterThan(0.45)
})
```

- [ ] **Step 2: Run the speech runtime test and verify it fails**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`

Expected: FAIL because viseme hints are preserved in metadata but never used during `overlayLive2dAudioArticulation(...)`.

- [ ] **Step 3: Resolve active segment viseme hints from the existing playback metadata chain**

```ts
function resolveActivePlaybackVisemeHints(item: StageEmbodimentSpeechPlaybackState['item']) {
  const playback = normalizeSpeechMetadataRecord(item?.metadata)?.embodimentPlayback
  const driverHints = Array.isArray((playback as any)?.drivers?.lipsync?.visemeHints)
    ? (playback as any).drivers.lipsync.visemeHints
    : []

  return driverHints.filter((hint): hint is { viseme: 'A' | 'E' | 'I' | 'O' | 'U' | 'closed', weight: number } => {
    return hint
      && typeof hint === 'object'
      && typeof hint.viseme === 'string'
      && Number.isFinite(hint.weight)
  })
}
```

- [ ] **Step 4: Blend hint weights into the live2d articulation overlay instead of only trusting raw vowel weights**

```ts
const hintWeights = resolveActivePlaybackVisemeHints(speechPlaybackState.value.item)
const hintMap = new Map(hintWeights.map(hint => [hint.viseme, clampUnit(hint.weight)] as const))
const hintedVisemes = {
  A: Math.max(audioVisemes.A, clampUnit(hintMap.get('A'))),
  E: Math.max(audioVisemes.E, clampUnit(hintMap.get('E'))),
  I: Math.max(audioVisemes.I, clampUnit(hintMap.get('I'))),
  O: Math.max(audioVisemes.O, clampUnit(hintMap.get('O'))),
  U: Math.max(audioVisemes.U, clampUnit(hintMap.get('U'))),
}
const hintedClosure = clampUnit(hintMap.get('closed'))
const hintStrength = clampRange(
  Math.max(...hintWeights.map(hint => clampUnit(hint.weight)), 0),
  0,
  1,
)
const effectiveVisemeBias = clampRange(visemeBias + hintStrength * 0.16, 0.16, 1)

// Use `hintedVisemes` and `hintedClosure` for round/spread/jaw/closure targets.
// Keep raw audio as lower bound, not the only authority.
```

- [ ] **Step 5: Re-run the targeted speech runtime test**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`

Expected: PASS with stronger hint-following articulation while keeping the existing continuous-viseme fallback test green.

- [ ] **Step 6: Commit**

```bash
git add packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts
git commit -m "feat: apply viseme hints during live2d speech playback"
```

### Task 3: Carry Pre/Speaking/Post Expression Cues Through Runtime Transitions

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/runtime.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`
- Test: `packages/stage-ui/src/components/scenes/runtime.test.ts`

- [ ] **Step 1: Add failing tests for preview pre-cue and stopping post-cue continuity**

```ts
it('uses pre-utterance face cues while previewing the next segment', async () => {
  speechRenderState.value = {
    ...createIdleStageEmbodimentSpeechRenderState(),
    revision: 1,
  }

  const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({
    speechRenderState,
    upcomingSpeechSegment: ref(createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-preview-cue',
      streamId: 'stream-preview-cue',
      segmentId: 'segment-preview-cue',
      text: '先看这里。',
      special: null,
      metadata: previewMetadataWithEmbodimentScript,
    })),
  }))!

  await nextTick()

  expect(runtime.state.value.activeFacialCue).toBe('steady-inhale')
  expect(runtime.state.value.activeFacialCueSource).toBe('preview')
})

it('holds the post-utterance cue during stopping cooldown instead of snapping straight back to resident', async () => {
  speechRenderState.value = {
    ...speechRenderState.value,
    active: false,
    phase: 'stopping',
    lastEventType: 'playback-stop',
    item: createStageEmbodimentSpeechPlaybackItem({
      intentId: 'intent-post-cue',
      streamId: 'stream-post-cue',
      segmentId: 'segment-post-cue',
      text: '先看这里。',
      special: null,
      metadata: playbackStopMetadataWithPostCue,
    }),
    revision: 2,
  }

  await nextTick()

  expect(runtime.state.value.activeFacialCue).toBe('settle-smile')
  expect(runtime.state.value.activeFacialCueSource).toBe('segment')
})
```

- [ ] **Step 2: Run the targeted runtime tests and verify they fail**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`

Expected: FAIL because preview/stopping phases currently do not consume `embodimentPlayback.drivers.face.preUtteranceCue` / `postUtteranceCue`.

- [ ] **Step 3: Mark idle driver metadata with the correct cue phase when playback stops**

```ts
function resolvePlaybackDriverMetadata(input: {
  script: AlicizationEmbodimentScriptV1 | null
  segmentId: string | null | undefined
  playbackPhase: 'idle' | 'playing'
  idleCuePhase?: 'pre-utterance' | 'post-utterance'
}) {
  return {
    face: resolveLive2DFaceDriverState({
      script: input.script,
      segmentId: input.segmentId,
      playbackPhase: input.playbackPhase,
      idleCuePhase: input.idleCuePhase,
    }),
    ...
  }
}

// When enriching stop reconciliation metadata:
drivers: resolvePlaybackDriverMetadata({
  script,
  segmentId: input.segmentId,
  playbackPhase: 'idle',
  idleCuePhase: 'post-utterance',
})
```

- [ ] **Step 4: Let performance runtime consume driver face cues during preview and stopping**

```ts
function resolvePlaybackDriverFaceCue(item: StageEmbodimentSpeechPlaybackItem | null | undefined) {
  const playback = normalizePlaybackDriverMetadata(item?.metadata)
  return playback?.drivers?.face ?? null
}

const previewDriverFace = resolvePlaybackDriverFaceCue(upcomingSegment)
const activeDriverFace = resolvePlaybackDriverFaceCue(speech.item)

const previewFacialCue = previewCue?.facialCue
  ?? previewDriverFace?.preUtteranceCue
  ?? previewDriverFace?.facialCue
  ?? null

const stoppingFacialCue = !speech.active && speech.phase === 'stopping'
  ? activeDriverFace?.postUtteranceCue
    ?? activeDriverFace?.facialCue
    ?? null
  : null

// Use these resolved cues before falling back to resident cues.
// Keep existing hold windows and suppression behavior intact.
```

- [ ] **Step 5: Re-run the runtime tests**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts
git commit -m "feat: smooth embodiment expression cue transitions"
```

### Final Verification

**Files:**
- No new files beyond task outputs

- [ ] **Step 1: Run the full targeted P1 runtime-expression suite**

Run:

```bash
pnpm exec vitest run \
  packages/stage-shared/src/stage-embodiment-speech-playback.test.ts \
  packages/stage-shared/src/alicization-speech-prosody-contracts.test.ts \
  packages/stage-shared/src/alicization-embodiment-script.test.ts \
  packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts \
  packages/stage-ui/src/services/embodiment/speech-planner.prosody.test.ts \
  packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts \
  packages/stage-ui/src/components/scenes/runtime.test.ts \
  packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts \
  packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts \
  packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts
```

Expected: PASS

- [ ] **Step 2: Run repo-required completion checks for touched workspaces**

Run: `pnpm typecheck`

Expected: PASS

Run: `pnpm lint:fix`

Expected: PASS

- [ ] **Step 3: Final commit if verification/refactor work was required**

```bash
git add packages/stage-shared/src/stage-embodiment-speech-playback.ts packages/stage-shared/src/stage-embodiment-speech-playback.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts
git commit -m "test: finalize p1 runtime expression verification"
```
