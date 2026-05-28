# Alicization P1 Authoritative Viseme Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `embodimentScript.lipsyncPlan` into a Chinese-first authoritative viseme lane so runtime mouth shaping and downstream driver telemetry follow the planned segment intent instead of relying mostly on fallback energy heuristics.

**Architecture:** Keep the current main-chain authority intact: `main runtime -> embodimentScript -> stage-ui playback -> performance/runtime drivers`. This slice does not add a new authority layer. It tightens one existing lane only: `speechPlan.prosody + timeline weights + digitalLife voice/lipsync` must deterministically produce per-segment `visemeHints`, and those hints must remain the canonical renderer-facing viseme source through playback and articulation. Micro-expression timing stays out of scope here except where viseme generation needs stable segment timing inputs already present in `speechPlan`.

**Tech Stack:** TypeScript, Vitest, `packages/stage-shared` speech/lipsync contracts, `packages/stage-ui` embodiment `director` and speech runtime composables, Vue 3 runtime tests, existing Live2D lipsync driver interfaces.

---

### Task 1: Strengthen Shared LipSync Contracts For Authoritative Segment Visemes

**Files:**
- Modify: `packages/stage-shared/src/alicization-lipsync-contracts.ts`
- Modify: `packages/stage-shared/src/alicization-embodiment-script.test.ts`
- Create: `packages/stage-shared/src/alicization-lipsync-contracts.test.ts`
- Test: `packages/stage-shared/src/alicization-lipsync-contracts.test.ts`
- Test: `packages/stage-shared/src/alicization-embodiment-script.test.ts`

- [ ] **Step 1: Write the failing shared contract tests**

```ts
import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationEmbodimentLipSyncPlan,
  normalizeAlicizationEmbodimentScript,
} from './index'

describe('alicization lipsync contracts', () => {
  it('normalizes per-segment viseme hints with chinese-first pause and confidence metadata', () => {
    const plan = normalizeAlicizationEmbodimentLipSyncPlan({
      mode: 'energy-phoneme-hybrid',
      visemeHints: [
        {
          segmentId: 'segment-1',
          viseme: 'U',
          weight: 0.88,
          source: 'prosody-authority',
          confidence: 0.82,
        },
      ],
    })

    expect(plan).toEqual({
      mode: 'energy-phoneme-hybrid',
      visemeHints: [
        {
          segmentId: 'segment-1',
          viseme: 'U',
          weight: 0.88,
          source: 'prosody-authority',
          confidence: 0.82,
        },
      ],
    })
  })

  it('rejects malformed viseme hints instead of silently weakening authority', () => {
    expect(normalizeAlicizationEmbodimentLipSyncPlan({
      mode: 'energy-phoneme-hybrid',
      visemeHints: [{ segmentId: '', viseme: 'U', weight: 2 }],
    })).toBeNull()
  })

  it('preserves authoritative viseme hints through script normalization', () => {
    const script = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-viseme-1',
      rendererTarget: 'live2d',
      replyText: '先看这里，然后点保存。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [{
          id: 'segment-1',
          index: 0,
          text: '先看这里，',
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 220,
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [{
          segmentId: 'segment-1',
          viseme: 'U',
          weight: 0.88,
          source: 'prosody-authority',
          confidence: 0.82,
        }],
      },
    })

    expect(script?.lipsyncPlan.visemeHints?.[0]).toEqual({
      segmentId: 'segment-1',
      viseme: 'U',
      weight: 0.88,
      source: 'prosody-authority',
      confidence: 0.82,
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/stage-shared/src/alicization-lipsync-contracts.test.ts packages/stage-shared/src/alicization-embodiment-script.test.ts`

Expected: FAIL because `AlicizationEmbodimentLipSyncVisemeHint` does not yet carry explicit authority metadata and the normalizer cannot preserve it.

- [ ] **Step 3: Extend the shared viseme hint contract with explicit authority fields**

```ts
// packages/stage-shared/src/alicization-lipsync-contracts.ts
export type AlicizationEmbodimentVisemeHintSource
  = 'prosody-authority'
    | 'timeline-projection'
    | 'digital-life-projection'

export interface AlicizationEmbodimentLipSyncVisemeHint {
  segmentId: string
  viseme: AlicizationEmbodimentViseme
  weight: number
  source: AlicizationEmbodimentVisemeHintSource
  confidence: number
}
```

- [ ] **Step 4: Update normalizers to enforce the stricter authority shape**

```ts
function normalizeVisemeHintSource(raw: unknown): AlicizationEmbodimentVisemeHintSource | null {
  return raw === 'prosody-authority'
    || raw === 'timeline-projection'
    || raw === 'digital-life-projection'
    ? raw
    : null
}

function normalizeVisemeHint(raw: unknown): AlicizationEmbodimentLipSyncVisemeHint | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const segmentId = normalizeText(candidate.segmentId, 120)
  const viseme = normalizeViseme(candidate.viseme)
  const source = normalizeVisemeHintSource(candidate.source)
  if (!segmentId || !viseme || !source)
    return null

  return {
    segmentId,
    viseme,
    weight: normalizeUnit(candidate.weight),
    source,
    confidence: normalizeUnit(candidate.confidence),
  }
}
```

- [ ] **Step 5: Re-run shared tests and verify they pass**

Run: `pnpm exec vitest run packages/stage-shared/src/alicization-lipsync-contracts.test.ts packages/stage-shared/src/alicization-embodiment-script.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-shared/src/alicization-lipsync-contracts.ts packages/stage-shared/src/alicization-lipsync-contracts.test.ts packages/stage-shared/src/alicization-embodiment-script.test.ts
git commit -m "feat: tighten authoritative lipsync hint contracts"
```

### Task 2: Generate Chinese-First Segment Viseme Hints In The Director

**Files:**
- Modify: `packages/stage-ui/src/services/embodiment/director.ts`
- Modify: `packages/stage-ui/src/services/embodiment/director.test.ts`
- Create: `packages/stage-ui/src/services/embodiment/director.viseme.test.ts`
- Test: `packages/stage-ui/src/services/embodiment/director.viseme.test.ts`
- Test: `packages/stage-ui/src/services/embodiment/director.test.ts`

- [ ] **Step 1: Write the failing viseme generation tests**

```ts
import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentScript } from './director'

describe('embodiment director viseme generation', () => {
  it('derives authoritative chinese-first viseme hints from prosody-heavy guidance segments', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        decisionTraceId: 'trace-viseme-1',
        turnId: 'turn-viseme-1',
        replyText: '先看这里，然后点保存。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'idle_gentle_nod',
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiment: null,
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-viseme-1',
          reply: '先看这里，然后点保存。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 5,
              text: '先看这里，',
              gestureWeight: 0.26,
              facialWeight: 0.34,
              prosodyWeight: 0.76,
              beatWeight: 0.52,
              actionCue: null,
              facialCue: 'focused',
              actionWindow: 'segment-start',
              interruptMode: 'soft-interrupt',
            },
          ],
        },
        digitalLife: null,
        digitalLifeSpine: null,
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(script.lipsyncPlan.visemeHints?.length).toBeGreaterThan(0)
    expect(script.lipsyncPlan.visemeHints?.some(hint => hint.segmentId === 'segment-1')).toBe(true)
    expect(script.lipsyncPlan.visemeHints?.some(hint => hint.source === 'prosody-authority')).toBe(true)
  })

  it('uses softer closed-viseme pressure for comma pauses than for full-stop closures', () => {
    const commaScript = buildAlicizationEmbodimentScript(/* same seed, segment text: '先看这里，' */)
    const stopScript = buildAlicizationEmbodimentScript(/* same seed, segment text: '先看这里。' */)

    const commaClosed = commaScript.lipsyncPlan.visemeHints?.find(hint => hint.viseme === 'closed')?.weight ?? 0
    const stopClosed = stopScript.lipsyncPlan.visemeHints?.find(hint => hint.viseme === 'closed')?.weight ?? 0

    expect(stopClosed).toBeGreaterThan(commaClosed)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/director.viseme.test.ts packages/stage-ui/src/services/embodiment/director.test.ts`

Expected: FAIL because `buildAlicizationEmbodimentScript(...)` currently sets `lipsyncPlan.mode` only and does not generate authoritative `visemeHints`.

- [ ] **Step 3: Add a segment-aware viseme derivation helper inside the director**

```ts
function deriveSegmentVisemeHints(input: {
  segment: AlicizationEmbodimentScriptV1['speechPlan']['segments'][number]
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null
}) {
  const pauseClass = input.segment.prosody?.pauseClass ?? 'none'
  const contour = input.segment.prosody?.contour ?? 'flat'
  const emphasis = input.segment.prosody?.emphasisStrength ?? 0.5
  const text = input.segment.text

  const closedWeight = pauseClass === 'full-stop' || pauseClass === 'question' || pauseClass === 'exclaim'
    ? 0.84
    : pauseClass === 'comma' || pauseClass === 'enumeration'
      ? 0.52
      : 0.34

  const roundWeight = /[乌屋无五物呜哦喔噢窝]/.test(text) ? 0.82 : contour === 'rising' ? 0.58 : 0.42
  const spreadWeight = /[一衣伊依已你立力]/.test(text) ? 0.76 : 0.34
  const openWeight = /[啊阿呀啦哈]/.test(text) ? 0.84 : 0.46

  return [
    { segmentId: input.segment.id, viseme: 'closed', weight: closedWeight, source: 'prosody-authority', confidence: emphasis },
    { segmentId: input.segment.id, viseme: 'U', weight: roundWeight, source: 'prosody-authority', confidence: emphasis },
    { segmentId: input.segment.id, viseme: 'I', weight: spreadWeight, source: 'prosody-authority', confidence: emphasis },
    { segmentId: input.segment.id, viseme: 'A', weight: openWeight, source: 'prosody-authority', confidence: emphasis },
  ]
}
```

- [ ] **Step 4: Populate `lipsyncPlan.visemeHints` from the authoritative speech plan instead of leaving it empty**

```ts
const visemeHints = speechPlan.segments.flatMap((segment) => {
  const timelineSegment = timelineSegmentById.get(segment.id) ?? null
  return deriveSegmentVisemeHints({
    segment,
    timelineSegment,
  })
})

return {
  // ...
  lipsyncPlan: {
    mode: input.manifest?.supportsVisemeLipSync === true
      ? 'energy-phoneme-hybrid'
      : 'energy-only',
    visemeHints: visemeHints.length > 0 ? visemeHints : undefined,
  },
}
```

- [ ] **Step 5: Re-run the viseme generation tests**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/director.viseme.test.ts packages/stage-ui/src/services/embodiment/director.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-ui/src/services/embodiment/director.ts packages/stage-ui/src/services/embodiment/director.test.ts packages/stage-ui/src/services/embodiment/director.viseme.test.ts
git commit -m "feat: generate authoritative segment viseme hints"
```

### Task 3: Make Runtime Speech Prefer Authoritative Viseme Hints Over Soft Fallbacks

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/drivers/live2d-lipsync-driver.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`
- Test: `packages/stage-ui/src/components/scenes/runtime.test.ts`

- [ ] **Step 1: Add the failing runtime consumption tests**

```ts
it('prefers authoritative viseme hints over weak audio-only vowels when the script provides segment hints', async () => {
  const item = createStageEmbodimentSpeechPlaybackItem({
    intentId: 'intent-viseme-runtime',
    streamId: 'stream-viseme-runtime',
    segmentId: 'segment-viseme-runtime',
    text: '然后点保存。',
    special: null,
    metadata: {
      embodimentPlayback: {
        actualDurationMs: 0,
        driftMs: 0,
        plannedDurationMs: 420,
        settleMs: 180,
        stopReason: null,
        drivers: {
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-viseme-runtime',
            visemeHints: [
              { segmentId: 'segment-viseme-runtime', viseme: 'U', weight: 0.92, source: 'prosody-authority', confidence: 0.84 },
              { segmentId: 'segment-viseme-runtime', viseme: 'closed', weight: 0.58, source: 'prosody-authority', confidence: 0.84 },
            ],
          },
        },
      },
    },
  })

  // Assert that runtime articulation keeps strong U/closed shaping even when audio vowel weights stay weak.
})
```

- [ ] **Step 2: Run the runtime speech tests to verify they fail**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts`

Expected: FAIL because the current blending still treats viseme hints as advisory overlays instead of authoritative segment drivers.

- [ ] **Step 3: Refine the hint merge so authoritative viseme hints dominate segment-local articulation**

```ts
const authoritativeHintStrength = resolveAuthoritativeHintStrength(resolveActivePlaybackVisemeHints(speechPlaybackState.value.item))
const effectiveVisemeBias = clampRange(
  visemeBias + authoritativeHintStrength * 0.32,
  Math.max(visemeBias, 0.52),
  1,
)
const effectiveEnergyBias = clampRange(
  energyBias + hintedClosure * 0.18,
  energyBias,
  1,
)
```

- [ ] **Step 4: Gate dominance by segment-local hints, not by generic playback metadata presence**

```ts
function resolveAuthoritativeHintStrength(hints: AlicizationEmbodimentLipSyncVisemeHint[]) {
  return hints.reduce((peak, hint) => {
    if (hint.source !== 'prosody-authority')
      return peak
    return Math.max(peak, clampUnit(hint.weight) * clampUnit(hint.confidence))
  }, 0)
}
```

- [ ] **Step 5: Re-run runtime speech tests and verify they pass**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/drivers/live2d-lipsync-driver.ts
git commit -m "feat: prefer authoritative viseme hints in runtime speech"
```

### Task 4: Add Chinese Viseme Regression Coverage Across Planner, Director, And Runtime

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts`
- Modify: `packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts`
- Test: `packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts`

- [ ] **Step 1: Add a failing end-to-end regression that follows one chinese segment from script to runtime telemetry**

```ts
it('keeps authoritative chinese viseme hints visible through playback telemetry and runtime prosody drive', async () => {
  // Build a scripted segment with comma pause and strong U/closed hints,
  // then assert:
  // 1. diagnostics snapshot exposes those hints,
  // 2. performance runtime prosodyDrive increases,
  // 3. articulation keeps stronger round/closure than a neutral fallback case.
})
```

- [ ] **Step 2: Run the targeted regression suite and verify it fails**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts`

Expected: FAIL because the new authoritative viseme path is not yet fully asserted across diagnostics and runtime.

- [ ] **Step 3: Extend diagnostics/test fixtures to surface authoritative hint metadata explicitly**

```ts
expect(diagnostics.snapshot.value.speech.playbackTelemetry?.drivers?.lipsync?.visemeHints).toEqual([
  expect.objectContaining({
    segmentId: 'segment-viseme-runtime',
    viseme: 'U',
    source: 'prosody-authority',
  }),
])
```

- [ ] **Step 4: Re-run the regression suite and verify it passes**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts`

Expected: PASS

- [ ] **Step 5: Run the full authoritative-viseme verification set**

Run: `pnpm exec vitest run packages/stage-shared/src/alicization-lipsync-contracts.test.ts packages/stage-shared/src/alicization-embodiment-script.test.ts packages/stage-ui/src/services/embodiment/director.viseme.test.ts packages/stage-ui/src/services/embodiment/director.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts`

Expected: PASS with no new failures.

- [ ] **Step 6: Run typecheck**

Run: `pnpm -F @proj-alicization/stage-ui typecheck`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts
git commit -m "test: lock chinese authoritative viseme regressions"
```

