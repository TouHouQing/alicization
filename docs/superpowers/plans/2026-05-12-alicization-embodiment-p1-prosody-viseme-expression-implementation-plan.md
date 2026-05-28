# Alicization Embodiment P1 Prosody Viseme Expression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Alicization’s embodied speech from structurally coherent `P0` playback authority into a Chinese-first expressive speech surface with better prosody, richer viseme shaping, and believable micro-expression timing.

**Architecture:** Build on the completed `P0` authority chain without reopening it. `main` and the runtime-authoritative `embodimentScript` stay responsible for the stable turn contract, while `P1` deepens three execution-time layers only: executable speech planning, articulation/viseme derivation, and micro-expression timing. The guiding rule is that Chinese-first expressiveness must come from explicit contracts and tested transforms, not ad hoc heuristics scattered across playback code.

**Tech Stack:** Electron, Vue 3, TypeScript, Pinia, Vitest, existing `packages/stage-shared` articulation/timeline contracts, `packages/stage-ui` embodiment services, and the completed `P0` Live2D driver/reconciliation surfaces.

---

### Task 1: Add Chinese-First Prosody Intent Contracts

**Files:**
- Create: `packages/stage-shared/src/alicization-speech-prosody-contracts.ts`
- Create: `packages/stage-shared/src/alicization-speech-prosody-contracts.test.ts`
- Modify: `packages/stage-shared/src/alicization-speech-plan.ts`
- Modify: `packages/stage-shared/src/alicization-embodiment-script.ts`
- Modify: `packages/stage-shared/src/index.ts`
- Test: `packages/stage-shared/src/alicization-speech-prosody-contracts.test.ts`
- Test: `packages/stage-shared/src/alicization-embodiment-script.test.ts`

- [ ] **Step 1: Write the failing shared-contract tests**

```ts
import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationSpeechProsodyIntent,
  normalizeAlicizationEmbodimentSpeechPlan,
} from './index'

describe('speech prosody contracts', () => {
  it('normalizes chinese-first prosody intent with pause class and phrase emphasis', () => {
    const prosody = normalizeAlicizationSpeechProsodyIntent({
      language: 'zh-CN',
      pauseClass: 'comma',
      phraseBoundary: 'soft',
      contour: 'falling',
      emphasisWord: '这里',
      emphasisStrength: 0.72,
      tempoShift: -0.08,
    })

    expect(prosody).toEqual({
      language: 'zh-CN',
      pauseClass: 'comma',
      phraseBoundary: 'soft',
      contour: 'falling',
      emphasisWord: '这里',
      emphasisStrength: 0.72,
      tempoShift: -0.08,
    })
  })

  it('threads per-segment prosody intents through the embodiment speech plan', () => {
    const plan = normalizeAlicizationEmbodimentSpeechPlan({
      segments: [{
        id: 'segment-1',
        index: 0,
        text: '先看这里，',
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
        prosody: {
          language: 'zh-CN',
          pauseClass: 'comma',
          phraseBoundary: 'soft',
          contour: 'falling',
          emphasisWord: '这里',
          emphasisStrength: 0.68,
          tempoShift: -0.05,
        },
      }],
      interruptPolicy: 'soft-settle',
      preRollMs: 40,
      settleMs: 220,
    })

    expect(plan?.segments[0]?.prosody?.language).toBe('zh-CN')
    expect(plan?.segments[0]?.prosody?.pauseClass).toBe('comma')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/stage-shared/src/alicization-speech-prosody-contracts.test.ts packages/stage-shared/src/alicization-embodiment-script.test.ts`

Expected: FAIL because the new prosody contract file does not exist and `AlicizationEmbodimentSpeechSegment` does not yet carry per-segment prosody intent.

- [ ] **Step 3: Create the new shared prosody contract**

```ts
// packages/stage-shared/src/alicization-speech-prosody-contracts.ts
export type AlicizationSpeechPauseClass = 'none' | 'comma' | 'period' | 'ellipsis' | 'exclaim' | 'question'
export type AlicizationSpeechPhraseBoundary = 'none' | 'soft' | 'hard'
export type AlicizationSpeechContour = 'flat' | 'rising' | 'falling' | 'dip-rise'

export interface AlicizationSpeechProsodyIntent {
  language: 'zh-CN' | 'en-US'
  pauseClass: AlicizationSpeechPauseClass
  phraseBoundary: AlicizationSpeechPhraseBoundary
  contour: AlicizationSpeechContour
  emphasisWord: string | null
  emphasisStrength: number
  tempoShift: number
}
```

- [ ] **Step 4: Thread the new prosody contract through the speech plan and script**

```ts
// packages/stage-shared/src/alicization-speech-plan.ts
export interface AlicizationEmbodimentSpeechSegment {
  id: string
  index: number
  text: string
  interruptPolicy: AlicizationEmbodimentInterruptPolicy
  preRollMs: number
  settleMs: number
  prosody?: AlicizationSpeechProsodyIntent | null
}

// packages/stage-shared/src/alicization-embodiment-script.ts
speechPlan: {
  segments: AlicizationEmbodimentSpeechSegment[]
  interruptPolicy: AlicizationEmbodimentInterruptPolicy
  preRollMs: number
  settleMs: number
}

// packages/stage-shared/src/index.ts
export * from './alicization-speech-prosody-contracts'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/stage-shared/src/alicization-speech-prosody-contracts.test.ts packages/stage-shared/src/alicization-embodiment-script.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-shared/src/alicization-speech-prosody-contracts.ts packages/stage-shared/src/alicization-speech-prosody-contracts.test.ts packages/stage-shared/src/alicization-speech-plan.ts packages/stage-shared/src/alicization-embodiment-script.ts packages/stage-shared/src/index.ts
git commit -m "feat: add speech prosody intent contracts"
```

### Task 2: Build Chinese-First Prosody Planning

**Files:**
- Modify: `packages/stage-ui/src/services/embodiment/speech-planner.ts`
- Create: `packages/stage-ui/src/services/embodiment/speech-planner.prosody.test.ts`
- Modify: `packages/stage-ui/src/services/embodiment/speech-planner.test.ts`
- Test: `packages/stage-ui/src/services/embodiment/speech-planner.prosody.test.ts`

- [ ] **Step 1: Write the failing prosody planner tests**

```ts
import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentSpeechPlan } from './speech-planner'

describe('speech planner prosody', () => {
  it('classifies chinese punctuation into phrase-level pause intent', () => {
    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-zh-prosody',
      replyText: '先看这里，然后点保存。最后告诉我结果。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-zh-prosody',
        reply: '先看这里，然后点保存。最后告诉我结果。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 5,
            text: '先看这里，',
            gestureWeight: 0.3,
            facialWeight: 0.4,
            prosodyWeight: 0.52,
            beatWeight: 0.36,
            actionCue: null,
            facialCue: 'focused',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 5,
            endOffset: 11,
            text: '然后点保存。',
            gestureWeight: 0.28,
            facialWeight: 0.38,
            prosodyWeight: 0.62,
            beatWeight: 0.42,
            actionCue: null,
            facialCue: 'focused',
            actionWindow: 'cadence-peak',
            interruptMode: 'soft-interrupt',
          },
        ],
      },
      digitalLife: null,
    })

    expect(plan.segments[0]?.prosody?.pauseClass).toBe('comma')
    expect(plan.segments[0]?.prosody?.phraseBoundary).toBe('soft')
    expect(plan.segments[1]?.prosody?.pauseClass).toBe('period')
    expect(plan.segments[1]?.prosody?.phraseBoundary).toBe('hard')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/speech-planner.prosody.test.ts`

Expected: FAIL because the current speech planner does not compute per-segment prosody intent.

- [ ] **Step 3: Implement chinese-first prosody derivation in the planner**

```ts
function resolveChineseProsodyIntent(segment: AlicizationDialogueSpeechTimeline['segments'][number]) {
  const text = segment.text.trim()
  const endsWithComma = /[，,]$/.test(text)
  const endsWithQuestion = /[？?]$/.test(text)
  const endsWithExclaim = /[！!]$/.test(text)
  const endsWithEllipsis = /…$/.test(text)
  const endsWithPeriod = /[。.]$/.test(text)

  return {
    language: 'zh-CN' as const,
    pauseClass: endsWithQuestion
      ? 'question'
      : endsWithExclaim
        ? 'exclaim'
        : endsWithEllipsis
          ? 'ellipsis'
          : endsWithPeriod
            ? 'period'
            : endsWithComma
              ? 'comma'
              : 'none',
    phraseBoundary: endsWithPeriod || endsWithQuestion || endsWithExclaim
      ? 'hard'
      : endsWithComma || endsWithEllipsis
        ? 'soft'
        : 'none',
    contour: endsWithQuestion ? 'rising' : endsWithEllipsis ? 'dip-rise' : 'falling',
    emphasisWord: null,
    emphasisStrength: clampNonNegativeInteger(segment.prosodyWeight * 100) / 100,
    tempoShift: endsWithEllipsis ? -0.08 : endsWithComma ? -0.04 : 0,
  }
}
```

- [ ] **Step 4: Attach prosody to every planned segment**

```ts
return {
  id: input.segment.id,
  index: input.segment.index,
  text: input.segment.text,
  interruptPolicy,
  preRollMs: ...,
  settleMs: ...,
  prosody: resolveChineseProsodyIntent(input.segment),
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/speech-planner.test.ts packages/stage-ui/src/services/embodiment/speech-planner.prosody.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-ui/src/services/embodiment/speech-planner.ts packages/stage-ui/src/services/embodiment/speech-planner.test.ts packages/stage-ui/src/services/embodiment/speech-planner.prosody.test.ts
git commit -m "feat: add chinese-first speech prosody planning"
```

### Task 3: Add Voice-Conditioned Viseme Bias Refinement

**Files:**
- Modify: `packages/stage-shared/src/stage-embodiment-speech-articulation.ts`
- Create: `packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`
- Test: `packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts`

- [ ] **Step 1: Write the failing viseme-bias tests**

```ts
import { describe, expect, it } from 'vitest'

import { deriveStageEmbodimentSpeechArticulationState } from './stage-embodiment-speech-articulation'

describe('speech articulation voice bias', () => {
  it('changes viseme openness and spread for chinese voice profiles with stronger consonant precision', () => {
    const soft = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '先看这里。',
      metadata: {
        voice: {
          provider: 'test',
          voiceId: 'soft-zh',
          language: 'zh-CN',
          consonantPrecision: 0.2,
          vowelLegato: 0.9,
          roundBias: 0.1,
          spreadBias: 0.1,
          jawBias: 0.1,
          closureBias: 0.1,
          rateMultiplier: 1,
          pitchDelta: 0,
        },
      },
      playbackDurationMs: 800,
      startedAt: 0,
      now: 200,
      mouthOpenRatio: 0.4,
    })

    const crisp = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: '先看这里。',
      metadata: {
        voice: {
          provider: 'test',
          voiceId: 'crisp-zh',
          language: 'zh-CN',
          consonantPrecision: 0.9,
          vowelLegato: 0.3,
          roundBias: 0.1,
          spreadBias: 0.1,
          jawBias: 0.1,
          closureBias: 0.1,
          rateMultiplier: 1,
          pitchDelta: 0,
        },
      },
      playbackDurationMs: 800,
      startedAt: 0,
      now: 200,
      mouthOpenRatio: 0.4,
    })

    expect(crisp.lipClosure).toBeGreaterThan(soft.lipClosure)
    expect(crisp.visemes.closed).toBeGreaterThan(soft.visemes.closed)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts`

Expected: FAIL because articulation derivation does not yet apply stronger chinese voice-conditioned consonant/vowel biases in a directly testable way.

- [ ] **Step 3: Refine articulation derivation with explicit voice-conditioned chinese bias**

```ts
function resolveChineseVoiceBias(voice: StageEmbodimentSpeechArticulationVoiceProfile | null) {
  if (!voice || voice.language !== 'zh-CN') {
    return {
      closureBoost: 0,
      jawDamping: 0,
      spreadBoost: 0,
      roundPenalty: 0,
    }
  }

  return {
    closureBoost: clampUnit(voice.consonantPrecision) * 0.18,
    jawDamping: clampUnit(voice.consonantPrecision) * 0.12,
    spreadBoost: clampUnit(voice.vowelLegato) * 0.08,
    roundPenalty: clampUnit(voice.consonantPrecision) * 0.06,
  }
}
```

- [ ] **Step 4: Apply the bias to the final articulation state**

```ts
const zhBias = resolveChineseVoiceBias(voiceProfile)

return {
  ...baseState,
  jawOpen: roundHundredths(baseState.jawOpen * (1 - zhBias.jawDamping)),
  lipClosure: roundHundredths(clampUnit(baseState.lipClosure + zhBias.closureBoost)),
  lipSpread: roundHundredths(clampUnit(baseState.lipSpread + zhBias.spreadBoost)),
  lipRound: roundHundredths(clampUnit(baseState.lipRound - zhBias.roundPenalty)),
  visemes: {
    ...baseState.visemes,
    closed: roundHundredths(clampUnit(baseState.visemes.closed + zhBias.closureBoost)),
  },
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-shared/src/stage-embodiment-speech-articulation.ts packages/stage-shared/src/stage-embodiment-speech-articulation.voice-bias.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts
git commit -m "feat: refine chinese viseme voice bias"
```

### Task 4: Add Micro-Expression Timing To The Embodiment Script

**Files:**
- Modify: `packages/stage-shared/src/alicization-embodiment-script.ts`
- Modify: `packages/stage-ui/src/services/embodiment/director.ts`
- Create: `packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/drivers/live2d-face-driver.ts`
- Modify: `packages/stage-ui/src/components/scenes/runtime.test.ts`
- Test: `packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts`

- [ ] **Step 1: Write the failing micro-expression tests**

```ts
import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentScript } from './director'

describe('director micro-expression timing', () => {
  it('adds pre-utterance and post-utterance cues for gentle chinese guidance turns', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
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
          variationToken: 'turn-1',
          reply: '先看这里，然后点保存。',
          emotion: 'thinking',
          segments: [],
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

    expect(script.facePlan.preUtteranceCue).toBeTruthy()
    expect(script.facePlan.postUtteranceCue).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts`

Expected: FAIL because the director currently leaves pre/post utterance cues as null.

- [ ] **Step 3: Add micro-expression cue selection in the director**

```ts
function resolveMicroExpressionCues(input: {
  baseEmotion: AlicizationEmbodimentScriptV1['state']['baseEmotion']
  delivery: AlicizationEmbodimentScriptV1['state']['delivery']
  emphasis: number
}) {
  if (input.baseEmotion === 'thinking' && input.delivery === 'gentle')
    return { preUtteranceCue: 'soft-breath', postUtteranceCue: 'settle-focus' }
  if (input.baseEmotion === 'concerned')
    return { preUtteranceCue: 'soft-worry', postUtteranceCue: 'relief-settle' }
  return { preUtteranceCue: null, postUtteranceCue: null }
}
```

- [ ] **Step 4: Route the cues through the face driver**

```ts
// packages/stage-ui/src/components/scenes/drivers/live2d-face-driver.ts
const playbackFacialCue = input.playbackPhase === 'playing'
  ? speakingCue?.facialCue ?? script.facePlan.preUtteranceCue ?? null
  : script.facePlan.postUtteranceCue ?? speakingCue?.facialCue ?? null
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-shared/src/alicization-embodiment-script.ts packages/stage-ui/src/services/embodiment/director.ts packages/stage-ui/src/services/embodiment/director.micro-expression.test.ts packages/stage-ui/src/components/scenes/drivers/live2d-face-driver.ts packages/stage-ui/src/components/scenes/runtime.test.ts
git commit -m "feat: add micro-expression timing cues"
```

### Task 5: Surface Chinese Speech Style Telemetry For Tuning

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts`

- [ ] **Step 1: Write the failing diagnostics telemetry test**

```ts
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useStageEmbodimentDiagnostics } from './use-stage-embodiment-diagnostics'

describe('stage embodiment diagnostics speech telemetry', () => {
  it('surfaces chinese-first speech style and viseme telemetry for tuning', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref({
        actualDurationMs: 1100,
        plannedDurationMs: 900,
        driftMs: 200,
        settleMs: 420,
        stopReason: 'ended',
        drivers: {
          face: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-1',
            visemeHints: [{ segmentId: 'segment-1', viseme: 'A', weight: 0.78 }],
          },
          motion: null,
        },
      }),
      presencePosture: ref({} as any),
      speechRenderState: ref({
        phase: 'playing',
        playbackPhase: 'playing',
        dynamics: {
          speechEnergy: 0.52,
          prosodyIntensity: 0.64,
          emphasisLevel: 0.58,
          cadencePulse: 0.4,
        },
      } as any),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.prosodyIntensity).toBeCloseTo(0.64)
    expect(diagnostics.snapshot.value.speech.playbackTelemetry?.drivers.lipsync?.mode).toBe('energy-phoneme-hybrid')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts`

Expected: FAIL because diagnostics do not yet expose enough speech-style / viseme tuning detail.

- [ ] **Step 3: Surface viseme/prosody tuning telemetry in diagnostics**

```ts
speech: {
  phase: ...,
  playbackPhase: ...,
  speechEnergy: ...,
  prosodyIntensity: ...,
  emphasisLevel: ...,
  cadencePulse: ...,
  playbackTelemetry: {
    ...playbackTelemetry,
    drivers: {
      ...playbackTelemetry?.drivers,
    },
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-diagnostics.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts
git commit -m "feat: expose chinese speech tuning telemetry"
```

## Self-Review

- Spec coverage:
  - Chinese-first prosody is covered by Tasks 1 and 2.
  - viseme / phoneme bias refinement is covered by Task 3.
  - micro-expression timing is covered by Task 4.
  - tuning telemetry is covered by Task 5.
  - semi-realtime voice, new TTS providers, VRM parity, and platformization are intentionally excluded.
- Placeholder scan:
  - no `TBD`, `TODO`, “similar to Task N”, or vague “appropriate error handling” placeholders remain.
- Type consistency:
  - `AlicizationSpeechProsodyIntent` is introduced in shared contracts first and reused by the P1 planner.
  - `embodimentScript.speechPlan` remains the execution authority; P1 only deepens its fidelity.
  - `viseme` and `micro-expression` refinements extend existing articulation and driver seams rather than introducing parallel authority paths.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-12-alicization-embodiment-p1-prosody-viseme-expression-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
