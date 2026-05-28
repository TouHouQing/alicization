# Alicization Embodiment P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Alicization’s P0 embodiment authority gap by introducing one unified execution contract and one director path that makes Live2D speech, lip sync, face, and motion follow the same governed performance timeline.

**Architecture:** Keep the existing main-runtime `mind-turn-v1` and `digital-life-spine` authority intact, then add a shared `AlicizationEmbodimentScriptV1` contract plus a `stage-ui` embodiment service layer that owns planning, renderer clamping, speech segmentation metadata, and playback reconciliation. The first execution slice is Live2D-only and intentionally excludes VRM parity and full duplex voice.

**Tech Stack:** Electron, Vue 3, TypeScript, Pinia, Eventa, Vitest, existing `packages/stage-shared`, `packages/stage-ui`, `packages/pipelines-audio`, and `apps/stage-tamagotchi` Alicization runtime surfaces.

---

### Task 1: Add The Unified Embodiment Script Contract

**Files:**
- Create: `packages/stage-shared/src/alicization-embodiment-script.ts`
- Create: `packages/stage-shared/src/alicization-embodiment-script.test.ts`
- Create: `packages/stage-shared/src/alicization-speech-plan.ts`
- Create: `packages/stage-shared/src/alicization-lipsync-contracts.ts`
- Modify: `packages/stage-shared/src/alicization-transport-contracts.ts`
- Modify: `packages/stage-shared/src/index.ts`
- Test: `packages/stage-shared/src/alicization-embodiment-script.test.ts`
- Test: `packages/stage-shared/src/alicization-browser-main-parity.test.ts`

- [ ] **Step 1: Write the failing shared-contract tests**

```ts
import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationEmbodimentScript,
} from './index'

describe('alicization embodiment script', () => {
  it('normalizes one live2d embodiment script with speech, face, motion, and lipsync plans', () => {
    const script = normalizeAlicizationEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-1',
      rendererTarget: 'live2d',
      replyText: '你好，我们慢慢来。',
      state: {
        baseEmotion: 'concerned',
        delivery: 'gentle',
        emphasis: 1,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [{
          id: 'segment-1',
          index: 0,
          text: '你好，我们慢慢来。',
          interruptPolicy: 'soft-settle',
          preRollMs: 60,
          settleMs: 240,
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 60,
        settleMs: 240,
      },
      facePlan: {
        speakingCues: [{
          segmentId: 'segment-1',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          intensity: 0.62,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [{
          segmentId: 'segment-1',
          viseme: 'A',
          weight: 0.8,
        }],
      },
    })

    expect(script?.rendererTarget).toBe('live2d')
    expect(script?.speechPlan.segments[0]?.interruptPolicy).toBe('soft-settle')
    expect(script?.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
  })

  it('threads embodimentScript through the shared derived-mind payload normalization', () => {
    const state = normalizeAlicizationDerivedMindStateBundle({
      visualPresenceState: {
        watchMode: 'symbiotic-vision',
        updatedAt: 1,
      },
      structured: {
        format: 'mind-turn-v1',
        thought: 'focus',
        emotion: 'neutral',
        reply: '你好',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-1',
          rendererTarget: 'live2d',
          replyText: '你好',
          state: {
            baseEmotion: 'neutral',
            delivery: 'calm',
            emphasis: 0,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [],
            interruptPolicy: 'hard-stop',
            preRollMs: 0,
            settleMs: 160,
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
    } as any)

    expect(state?.structured?.embodimentScript?.version).toBe('embodiment-script-v1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/stage-shared/src/alicization-embodiment-script.test.ts packages/stage-shared/src/alicization-browser-main-parity.test.ts`

Expected: FAIL because the new contract files do not exist and `alicization-transport-contracts.ts` does not yet normalize `structured.embodimentScript`.

- [ ] **Step 3: Create the new shared contract files**

```ts
// packages/stage-shared/src/alicization-lipsync-contracts.ts
export type AlicizationEmbodimentLipSyncMode
  = 'energy-only'
    | 'energy-phoneme-hybrid'

export interface AlicizationEmbodimentVisemeHint {
  segmentId: string
  viseme: 'A' | 'E' | 'I' | 'O' | 'U' | 'closed'
  weight: number
}

// packages/stage-shared/src/alicization-speech-plan.ts
export type AlicizationEmbodimentInterruptPolicy = 'hard-stop' | 'soft-settle'

export interface AlicizationEmbodimentSpeechSegment {
  id: string
  index: number
  text: string
  interruptPolicy: AlicizationEmbodimentInterruptPolicy
  preRollMs: number
  settleMs: number
}

// packages/stage-shared/src/alicization-embodiment-script.ts
export interface AlicizationEmbodimentScriptV1 {
  version: 'embodiment-script-v1'
  turnId: string
  decisionTraceId?: string | null
  rendererTarget: 'live2d'
  replyText: string
  state: {
    baseEmotion: AlicizationEmotion
    delivery: AlicizationPerformanceDelivery
    emphasis: 0 | 1 | 2
    residentMode: 'dialogue' | 'quiet-companionship' | 'idle-recovering'
  }
  speechPlan: {
    segments: AlicizationEmbodimentSpeechSegment[]
    interruptPolicy: AlicizationEmbodimentInterruptPolicy
    preRollMs: number
    settleMs: number
  }
  facePlan: {
    preUtteranceCue?: string | null
    speakingCues: Array<{
      segmentId: string
      emotion: AlicizationEmotion
      facialCue: string | null
      intensity: number
    }>
    postUtteranceCue?: string | null
  }
  motionPlan: {
    idleBase: string
    actionBursts: Array<{
      segmentId: string
      actionCue: string | null
      intensity: number
      holdMs: number
    }>
    attentionMode: string
  }
  lipsyncPlan: {
    mode: AlicizationEmbodimentLipSyncMode
    visemeHints?: AlicizationEmbodimentVisemeHint[]
  }
}
```

- [ ] **Step 4: Normalize and export the new contract through the shared surface**

```ts
// packages/stage-shared/src/alicization-embodiment-script.ts
export function normalizeAlicizationEmbodimentScript(raw: unknown): AlicizationEmbodimentScriptV1 | null {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const turnId = typeof candidate.turnId === 'string' ? candidate.turnId.trim() : ''
  const replyText = typeof candidate.replyText === 'string' ? candidate.replyText.trim() : ''
  if (!turnId || !replyText)
    return null

  return {
    version: 'embodiment-script-v1',
    turnId,
    decisionTraceId: typeof candidate.decisionTraceId === 'string' ? candidate.decisionTraceId.trim() : null,
    rendererTarget: 'live2d',
    replyText,
    state: {
      baseEmotion: normalizeAlicizationEmotion((candidate.state as any)?.baseEmotion).emotion,
      delivery: normalizeAlicizationPerformanceDelivery((candidate.state as any)?.delivery),
      emphasis: Math.min(2, Math.max(0, Number((candidate.state as any)?.emphasis) || 0)) as 0 | 1 | 2,
      residentMode: ((candidate.state as any)?.residentMode === 'quiet-companionship'
        || (candidate.state as any)?.residentMode === 'idle-recovering')
        ? (candidate.state as any).residentMode
        : 'dialogue',
    },
    speechPlan: {
      segments: Array.isArray((candidate.speechPlan as any)?.segments)
        ? ((candidate.speechPlan as any).segments as AlicizationEmbodimentSpeechSegment[])
        : [],
      interruptPolicy: (candidate.speechPlan as any)?.interruptPolicy === 'soft-settle' ? 'soft-settle' : 'hard-stop',
      preRollMs: Math.max(0, Number((candidate.speechPlan as any)?.preRollMs) || 0),
      settleMs: Math.max(0, Number((candidate.speechPlan as any)?.settleMs) || 160),
    },
    facePlan: {
      preUtteranceCue: typeof (candidate.facePlan as any)?.preUtteranceCue === 'string' ? (candidate.facePlan as any).preUtteranceCue : null,
      speakingCues: Array.isArray((candidate.facePlan as any)?.speakingCues) ? (candidate.facePlan as any).speakingCues : [],
      postUtteranceCue: typeof (candidate.facePlan as any)?.postUtteranceCue === 'string' ? (candidate.facePlan as any).postUtteranceCue : null,
    },
    motionPlan: {
      idleBase: typeof (candidate.motionPlan as any)?.idleBase === 'string' ? (candidate.motionPlan as any).idleBase : 'idle_settle',
      actionBursts: Array.isArray((candidate.motionPlan as any)?.actionBursts) ? (candidate.motionPlan as any).actionBursts : [],
      attentionMode: typeof (candidate.motionPlan as any)?.attentionMode === 'string' ? (candidate.motionPlan as any).attentionMode : 'attentive',
    },
    lipsyncPlan: {
      mode: (candidate.lipsyncPlan as any)?.mode === 'energy-phoneme-hybrid' ? 'energy-phoneme-hybrid' : 'energy-only',
      visemeHints: Array.isArray((candidate.lipsyncPlan as any)?.visemeHints) ? (candidate.lipsyncPlan as any).visemeHints : undefined,
    },
  }
}

// packages/stage-shared/src/alicization-transport-contracts.ts
export interface AlicizationDialogueStructuredPayload {
  // ...
  embodimentScript?: AlicizationEmbodimentScriptV1 | null
}

// inside the structured payload normalizer
embodimentScript: normalizeAlicizationEmbodimentScript(candidate.embodimentScript),

// packages/stage-shared/src/index.ts
export * from './alicization-embodiment-script'
export * from './alicization-speech-plan'
export * from './alicization-lipsync-contracts'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/stage-shared/src/alicization-embodiment-script.test.ts packages/stage-shared/src/alicization-browser-main-parity.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-shared/src/alicization-embodiment-script.ts packages/stage-shared/src/alicization-embodiment-script.test.ts packages/stage-shared/src/alicization-speech-plan.ts packages/stage-shared/src/alicization-lipsync-contracts.ts packages/stage-shared/src/alicization-transport-contracts.ts packages/stage-shared/src/index.ts
git commit -m "feat: add embodiment script contracts"
```

### Task 2: Add Runtime Embodiment Seed And Director Service

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed.test.ts`
- Create: `packages/stage-ui/src/services/embodiment/director.ts`
- Create: `packages/stage-ui/src/services/embodiment/director.test.ts`
- Create: `packages/stage-ui/src/services/embodiment/renderer-capability-adapter.ts`
- Create: `packages/stage-ui/src/services/embodiment/renderer-capability-adapter.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed.test.ts`
- Test: `packages/stage-ui/src/services/embodiment/director.test.ts`
- Test: `packages/stage-ui/src/services/embodiment/renderer-capability-adapter.test.ts`

- [ ] **Step 1: Write the failing runtime-seed and director tests**

```ts
import { describe, expect, it } from 'vitest'

import { buildAlicizationRuntimeEmbodimentSeed } from './runtime-embodiment-seed'
import { buildAlicizationEmbodimentScript } from '../../../../../../packages/stage-ui/src/services/embodiment/director'

describe('runtime embodiment seed', () => {
  it('freezes one governed turn into one canonical local seed', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      turnId: 'turn-1',
      reply: '你好',
      performance: {
        baseEmotion: 'neutral',
        emotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
    })

    expect(seed.turnId).toBe('turn-1')
    expect(seed.replyText).toBe('你好')
  })
})

describe('embodiment director', () => {
  it('produces one normalized live2d script from seed plus manifest', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        turnId: 'turn-1',
        replyText: '你好，我们慢慢来。',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: null,
          actionCue: null,
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiment: null,
        speechTimeline: null,
        digitalLife: null,
        digitalLifeSpine: null,
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.version).toBe('embodiment-script-v1')
    expect(script.rendererTarget).toBe('live2d')
    expect(script.speechPlan.interruptPolicy).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed.test.ts packages/stage-ui/src/services/embodiment/director.test.ts packages/stage-ui/src/services/embodiment/renderer-capability-adapter.test.ts`

Expected: FAIL because the runtime seed, director, and capability adapter modules do not exist.

- [ ] **Step 3: Add the main-runtime seed helper**

```ts
// apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed.ts
export interface AlicizationRuntimeEmbodimentSeed {
  turnId: string
  decisionTraceId?: string | null
  replyText: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
}

export function buildAlicizationRuntimeEmbodimentSeed(input: {
  turnId: string
  decisionTraceId?: string | null
  reply: string
  performance: AlicizationDialoguePerformancePayload
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
}): AlicizationRuntimeEmbodimentSeed {
  return {
    turnId: input.turnId,
    decisionTraceId: input.decisionTraceId ?? null,
    replyText: input.reply.trim(),
    performance: input.performance,
    embodiment: input.embodiment ?? null,
    speechTimeline: input.speechTimeline ?? null,
    digitalLife: input.digitalLife ?? null,
    digitalLifeSpine: input.digitalLifeSpine ?? null,
  }
}
```

- [ ] **Step 4: Add the renderer capability adapter and director**

```ts
// packages/stage-ui/src/services/embodiment/renderer-capability-adapter.ts
import { buildStageEmbodimentPerformancePlan } from '../../components/scenes/stage-embodiment-performance-plan'

export function adaptEmbodimentPerformanceToRenderer(input: {
  manifest: CharacterPerformanceCapabilitiesManifest | null
  performance: AlicizationDialoguePerformancePayload
  continuity?: {
    previousActionCue?: string | null
    previousFacialCue?: string | null
    variationToken?: string | null
  }
}) {
  return buildStageEmbodimentPerformancePlan({
    manifest: input.manifest,
    performance: input.performance,
    continuity: input.continuity,
  }).performance
}

// packages/stage-ui/src/services/embodiment/director.ts
export function buildAlicizationEmbodimentScript(input: {
  seed: AlicizationRuntimeEmbodimentSeed
  manifest: CharacterPerformanceCapabilitiesManifest | null
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  rendererTarget: 'live2d'
}) {
  const plannedPerformance = adaptEmbodimentPerformanceToRenderer({
    manifest: input.manifest,
    performance: input.seed.performance,
    continuity: {
      previousActionCue: input.residentPerformance?.performance.actionCue ?? null,
      previousFacialCue: input.residentPerformance?.performance.facialCue ?? null,
      variationToken: input.seed.embodiment?.variationToken ?? input.seed.turnId,
    },
  })

  return normalizeAlicizationEmbodimentScript({
    version: 'embodiment-script-v1',
    turnId: input.seed.turnId,
    decisionTraceId: input.seed.decisionTraceId ?? null,
    rendererTarget: input.rendererTarget,
    replyText: input.seed.replyText,
    state: {
      baseEmotion: plannedPerformance.baseEmotion,
      delivery: plannedPerformance.delivery,
      emphasis: plannedPerformance.emphasis,
      residentMode: 'dialogue',
    },
    speechPlan: {
      segments: [],
      interruptPolicy: 'hard-stop',
      preRollMs: 0,
      settleMs: 160,
    },
    facePlan: { speakingCues: [] },
    motionPlan: {
      idleBase: plannedPerformance.actionCue ?? 'idle_settle',
      actionBursts: [],
      attentionMode: 'attentive',
    },
    lipsyncPlan: {
      mode: 'energy-only',
    },
  })!
}
```

- [ ] **Step 5: Keep the seed as the canonical local director input shape**

```ts
// NOTICE:
// In P0 this helper becomes the canonical local input shape for the director,
// but it is not transported over shared IPC yet. The transported execution
// authority remains `structured.embodimentScript`.
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed.test.ts packages/stage-ui/src/services/embodiment/director.test.ts packages/stage-ui/src/services/embodiment/renderer-capability-adapter.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed.ts apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed.test.ts packages/stage-ui/src/services/embodiment/director.ts packages/stage-ui/src/services/embodiment/director.test.ts packages/stage-ui/src/services/embodiment/renderer-capability-adapter.ts packages/stage-ui/src/services/embodiment/renderer-capability-adapter.test.ts
git commit -m "feat: add embodiment director seed path"
```

### Task 3: Integrate The Director Into Presence Dispatch

**Files:**
- Modify: `packages/stage-ui/src/stores/alicization-presence-dispatcher.ts`
- Modify: `packages/stage-ui/src/stores/alicization-presence-dispatcher.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts`
- Modify: `packages/stage-ui/src/stores/chat.ts`
- Modify: `packages/stage-ui/src/stores/chat.test.ts`
- Test: `packages/stage-ui/src/stores/alicization-presence-dispatcher.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts`
- Test: `packages/stage-ui/src/stores/chat.test.ts`

- [ ] **Step 1: Write the failing integration tests**

```ts
import { describe, expect, it, vi } from 'vitest'

import { useAlicizationPresenceDispatcherStore } from '../../stores/alicization-presence-dispatcher'

describe('presence dispatcher embodiment script integration', () => {
  it('builds one embodiment script per dialogue turn and reuses it across live2d and tts channels', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPerformance = vi.fn()
    const speak = vi.fn()

    store.setEmbodimentScriptBuilder((payload) => {
      return {
        version: 'embodiment-script-v1',
        turnId: payload.turnId,
        rendererTarget: 'live2d',
        replyText: payload.structured.reply,
        state: {
          baseEmotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
          residentMode: 'dialogue',
        },
        speechPlan: {
          segments: [],
          interruptPolicy: 'hard-stop',
          preRollMs: 0,
          settleMs: 160,
        },
        facePlan: { speakingCues: [] },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: { mode: 'energy-only' },
      }
    })

    store.registerLive2DController({ applyPerformance })
    store.registerTTSController({ speak })

    await store.dispatchDialogueResponded({
      cardId: 'card-1',
      turnId: 'turn-script-1',
      sessionId: 'session-1',
      createdAt: Date.now(),
      isFallback: false,
      structured: {
        format: 'mind-turn-v1',
        thought: 'focus',
        emotion: 'neutral',
        reply: '你好',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      },
    } as any)

    const live2dPayload = applyPerformance.mock.calls[0]?.[1]
    const ttsPayload = speak.mock.calls[0]?.[2]
    expect(live2dPayload.structured.embodimentScript.turnId).toBe('turn-script-1')
    expect(ttsPayload.structured.embodimentScript.turnId).toBe('turn-script-1')
    expect(live2dPayload.structured.embodimentScript).toEqual(ttsPayload.structured.embodimentScript)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-presence-dispatcher.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts packages/stage-ui/src/stores/chat.test.ts`

Expected: FAIL because the dispatcher has no script-builder hook and the payload does not yet carry one shared `embodimentScript`.

- [ ] **Step 3: Add one injected script-builder hook to the dispatcher**

```ts
// packages/stage-ui/src/stores/alicization-presence-dispatcher.ts
type EmbodimentScriptBuilder = (
  payload: AlicizationDialogueRespondedPayload,
) => AlicizationEmbodimentScriptV1 | null

const embodimentScriptBuilder = ref<EmbodimentScriptBuilder | null>(null)

function setEmbodimentScriptBuilder(builder: EmbodimentScriptBuilder | null) {
  embodimentScriptBuilder.value = builder
}

const embodimentScript = payload.structured.embodimentScript
  ?? embodimentScriptBuilder.value?.({
    ...payload,
    structured: {
      ...payload.structured,
      emotion: resolvedEmotion,
      performance: resolvedPerformance,
      embodiment: resolvedEmbodiment,
      speechTimeline: resolvedSpeechTimeline,
      digitalLife: resolvedDigitalLife,
    },
  })
  ?? null

const normalizedPayload: AlicizationDialogueRespondedPayload = {
  ...payload,
  structured: {
    ...payload.structured,
    emotion: resolvedEmotion,
    performance: resolvedPerformance,
    embodiment: resolvedEmbodiment,
    speechTimeline: resolvedSpeechTimeline,
    digitalLife: resolvedDigitalLife,
    embodimentScript,
  },
}
```

- [ ] **Step 4: Register the director-backed script builder from `use-stage-embodiment-presence.ts`**

```ts
// packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.ts
import { buildAlicizationEmbodimentScript } from '../../services/embodiment/director'

options.dispatcher.setEmbodimentScriptBuilder((payload) => {
  return buildAlicizationEmbodimentScript({
    seed: {
      turnId: payload.turnId,
      decisionTraceId: payload.structured.governance?.decisionTraceId ?? null,
      replyText: payload.structured.reply ?? '',
      performance: payload.structured.performance,
      embodiment: payload.structured.embodiment ?? null,
      speechTimeline: payload.structured.speechTimeline ?? null,
      digitalLife: payload.structured.digitalLife ?? null,
      digitalLifeSpine: payload.structured.digitalLifeSpine ?? null,
    },
    manifest: options.performanceManifest.value,
    residentPerformance: options.visualPresenceState?.value?.residentPerformance ?? null,
    rendererTarget: 'live2d',
  })
})

cleanups.push(() => {
  options.dispatcher.setEmbodimentScriptBuilder(null)
})

function resolveScript(payload: AlicizationDialogueRespondedPayload) {
  return payload.structured.embodimentScript
}
```

- [ ] **Step 5: Preserve the script through chat store message normalization**

```ts
// packages/stage-ui/src/stores/chat.ts
return {
  // existing fields...
  speechTimeline: input.speechTimeline ?? structured.speechTimeline ?? null,
  digitalLifeSpine: input.digitalLifeSpine ?? structured.digitalLifeSpine ?? null,
  embodimentScript: input.embodimentScript ?? structured.embodimentScript ?? null,
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-presence-dispatcher.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts packages/stage-ui/src/stores/chat.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/stage-ui/src/stores/alicization-presence-dispatcher.ts packages/stage-ui/src/stores/alicization-presence-dispatcher.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts packages/stage-ui/src/stores/chat.ts packages/stage-ui/src/stores/chat.test.ts
git commit -m "refactor: route presence through one embodiment script"
```

### Task 4: Upgrade Speech Planning And Live2D Speech Consumption

**Files:**
- Create: `packages/stage-ui/src/services/embodiment/speech-planner.ts`
- Create: `packages/stage-ui/src/services/embodiment/speech-planner.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-runtime.ts`
- Modify: `packages/stage-ui/src/components/scenes/Stage.vue`
- Modify: `packages/stage-ui/src/services/speech/pipeline-runtime.test.ts`
- Test: `packages/stage-ui/src/services/embodiment/speech-planner.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`
- Test: `packages/stage-ui/src/services/speech/pipeline-runtime.test.ts`

- [ ] **Step 1: Write the failing speech-planner tests**

```ts
import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentSpeechPlan } from './speech-planner'

describe('embodiment speech planner', () => {
  it('upgrades a descriptive speech timeline into executable segment policies', () => {
    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-1',
      replyText: '你好，我们慢慢来。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '你好，我们慢慢来。',
        emotion: 'concerned',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 8,
          text: '你好，我们慢慢来。',
          gestureWeight: 0.44,
          facialWeight: 0.52,
          prosodyWeight: 0.48,
          beatWeight: 0.36,
          actionCue: 'idle_gentle_nod',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      },
      digitalLife: null,
    })

    expect(plan.segments[0]?.interruptPolicy).toBe('soft-settle')
    expect(plan.segments[0]?.settleMs).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/speech-planner.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/services/speech/pipeline-runtime.test.ts`

Expected: FAIL because the new speech planner does not exist and `use-stage-embodiment-speech.ts` still primarily consumes `speechTimeline` / `digitalLifeEnvelope` directly.

- [ ] **Step 3: Create the speech planner service**

```ts
// packages/stage-ui/src/services/embodiment/speech-planner.ts
export function buildAlicizationEmbodimentSpeechPlan(input: {
  turnId: string
  replyText: string
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
}) {
  const timelineSegments = input.speechTimeline?.segments ?? []

  return {
    segments: timelineSegments.map(segment => ({
      id: segment.id,
      index: segment.index,
      text: segment.text,
      interruptPolicy: segment.interruptMode === 'hard-interrupt' ? 'hard-stop' : 'soft-settle',
      preRollMs: Math.max(0, Math.round((segment.beatWeight ?? 0) * 120)),
      settleMs: Math.max(
        120,
        Math.round(segment.emotionHoldMs ?? segment.facialHoldMs ?? 180),
      ),
    })),
    interruptPolicy: timelineSegments.some(segment => segment.interruptMode === 'hard-interrupt')
      ? 'hard-stop'
      : 'soft-settle',
    preRollMs: timelineSegments.length > 0 ? 60 : 0,
    settleMs: timelineSegments.length > 0 ? 180 : 120,
  }
}
```

- [ ] **Step 4: Make `use-stage-embodiment-speech.ts` prefer `embodimentScript.speechPlan` as the execution authority**

```ts
// packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts
function resolveExecutionSpeechPlan(item: StageEmbodimentSpeechPlaybackItem | null) {
  const script = item?.metadata?.embodimentScript as AlicizationEmbodimentScriptV1 | undefined
  if (script)
    return script.speechPlan

  return buildAlicizationEmbodimentSpeechPlan({
    turnId: item?.intentId ?? 'unknown-turn',
    replyText: item?.text ?? '',
    speechTimeline: speechTimelineAlignment.timeline,
    digitalLife: null,
  })
}

const playbackPlan = resolveExecutionSpeechPlan(speechPlaybackState.value.item)
const settleMs = playbackPlan?.segments.find(segment => segment.id === speechPlaybackState.value.item?.segmentId)?.settleMs
  ?? resolveStageEmbodimentSpeechStopLingerMs(speechPlaybackState.value.item)
```

- [ ] **Step 5: Attach the script to preview/playback metadata**

```ts
// packages/stage-ui/src/components/scenes/use-stage-embodiment-runtime.ts
export interface UseStageEmbodimentRuntimeOptions {
  // ...
  speakFallback: (
    reply: string,
    performance: AlicizationDialoguePerformancePayload,
    metadata?: Record<string, unknown> | null,
  ) => Promise<void> | void
}

// packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.ts
await options.speakFallback(reply, plannedPerformance, {
  embodimentScript: payload.structured.embodimentScript,
})

// packages/stage-ui/src/components/scenes/Stage.vue
speakFallback: async (reply, _performance, metadata) => {
  currentChatIntent.value?.writeLiteral(reply)
  void metadata
},

// packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts
metadata: {
  ...cloneSpeechMetadata(descriptor.metadata),
  embodimentScript: descriptor.metadata?.embodimentScript ?? null,
},
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/speech-planner.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/services/speech/pipeline-runtime.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/stage-ui/src/services/embodiment/speech-planner.ts packages/stage-ui/src/services/embodiment/speech-planner.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-runtime.ts packages/stage-ui/src/components/scenes/Stage.vue packages/stage-ui/src/services/speech/pipeline-runtime.test.ts
git commit -m "feat: add executable embodiment speech planning"
```

### Task 5: Split Live2D Drivers And Add Playback Reconciliation

**Files:**
- Create: `packages/stage-ui/src/components/scenes/drivers/live2d-face-driver.ts`
- Create: `packages/stage-ui/src/components/scenes/drivers/live2d-lipsync-driver.ts`
- Create: `packages/stage-ui/src/components/scenes/drivers/live2d-motion-driver.ts`
- Create: `packages/stage-ui/src/services/embodiment/playback-reconciler.ts`
- Create: `packages/stage-ui/src/services/embodiment/playback-reconciler.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-runtime.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts`
- Modify: `packages/stage-ui/src/components/scenes/runtime.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`
- Test: `packages/stage-ui/src/services/embodiment/playback-reconciler.test.ts`
- Test: `packages/stage-ui/src/components/scenes/runtime.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`

- [ ] **Step 1: Write the failing reconciler and driver-split tests**

```ts
import { describe, expect, it } from 'vitest'

import { reconcileEmbodimentPlayback } from '../../services/embodiment/playback-reconciler'

describe('playback reconciler', () => {
  it('extends settle timing when actual playback exceeds the estimate', () => {
    const result = reconcileEmbodimentPlayback({
      plannedDurationMs: 900,
      actualDurationMs: 1280,
      stopReason: 'ended',
      script: {
        version: 'embodiment-script-v1',
        turnId: 'turn-1',
        rendererTarget: 'live2d',
        replyText: '你好',
        state: {
          baseEmotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
          residentMode: 'dialogue',
        },
        speechPlan: {
          segments: [],
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 180,
        },
        facePlan: { speakingCues: [] },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: { mode: 'energy-only' },
      },
    })

    expect(result.settleMs).toBeGreaterThanOrEqual(180)
    expect(result.driftMs).toBe(380)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/playback-reconciler.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts`

Expected: FAIL because the reconciler and explicit Live2D driver modules do not exist.

- [ ] **Step 3: Add the reconciler and driver files**

```ts
// packages/stage-ui/src/services/embodiment/playback-reconciler.ts
export function reconcileEmbodimentPlayback(input: {
  plannedDurationMs: number
  actualDurationMs: number
  stopReason: 'ended' | 'interrupted' | 'rejected'
  script: AlicizationEmbodimentScriptV1
}) {
  const driftMs = input.actualDurationMs - input.plannedDurationMs
  const baseSettleMs = input.script.speechPlan.settleMs

  return {
    driftMs,
    settleMs: input.stopReason === 'interrupted'
      ? Math.max(80, Math.round(baseSettleMs * 0.66))
      : Math.max(baseSettleMs, baseSettleMs + Math.max(0, driftMs)),
    shouldSoftSettle: input.script.speechPlan.interruptPolicy === 'soft-settle',
  }
}

// packages/stage-ui/src/components/scenes/drivers/live2d-face-driver.ts
export function applyLive2dFaceCue(input: {
  facialCue: string | null
  intensity: number
  holdMs: number
}) {
  return input
}

// packages/stage-ui/src/components/scenes/drivers/live2d-motion-driver.ts
export function applyLive2dMotionCue(input: {
  actionCue: string | null
  intensity: number
  holdMs: number
}) {
  return input
}

// packages/stage-ui/src/components/scenes/drivers/live2d-lipsync-driver.ts
export function applyLive2dLipSyncMode(input: {
  mode: 'energy-only' | 'energy-phoneme-hybrid'
}) {
  return input
}
```

- [ ] **Step 4: Route `use-stage-embodiment-runtime.ts` and `use-stage-embodiment-speech.ts` through the driver/reconciler boundary**

```ts
// packages/stage-ui/src/components/scenes/use-stage-embodiment-runtime.ts
import { applyLive2dFaceCue } from './drivers/live2d-face-driver'
import { applyLive2dMotionCue } from './drivers/live2d-motion-driver'

applyLive2dFaceCue({
  facialCue: script.facePlan.speakingCues[0]?.facialCue ?? null,
  intensity: script.facePlan.speakingCues[0]?.intensity ?? 0.5,
  holdMs: script.speechPlan.settleMs,
})

applyLive2dMotionCue({
  actionCue: script.motionPlan.actionBursts[0]?.actionCue ?? script.motionPlan.idleBase,
  intensity: script.motionPlan.actionBursts[0]?.intensity ?? 0.32,
  holdMs: script.motionPlan.actionBursts[0]?.holdMs ?? script.speechPlan.settleMs,
})

// packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts
const reconciliation = reconcileEmbodimentPlayback({
  plannedDurationMs: speechPlaybackState.value.item?.playbackDurationMs ?? 0,
  actualDurationMs: endedAt - (speechPlaybackState.value.startedAt ?? endedAt),
  stopReason: reason === 'interrupted' ? 'interrupted' : 'ended',
  script,
})
```

- [ ] **Step 5: Expose telemetry in diagnostics and playback events**

```ts
// packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts
emitPlaybackEvent('playback-stop')
logSpeechEmbodimentDebug('playback-reconciled', {
  driftMs: reconciliation.driftMs,
  settleMs: reconciliation.settleMs,
  stopReason: reason,
})

// packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts
performance.syncResidentPerformance(performance.state.value.residentPerformance, {
  allowWhileActive: true,
  variationToken: `${script.turnId}:${reconciliation.driftMs}`,
})
```

- [ ] **Step 6: Run targeted tests, package typechecks, and repo lint**

Run: `pnpm exec vitest run packages/stage-ui/src/services/embodiment/playback-reconciler.test.ts packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts`

Expected: PASS

Run: `pnpm -F @proj-alicization/stage-shared typecheck && pnpm -F @proj-alicization/stage-ui typecheck && pnpm -F @proj-alicization/stage-tamagotchi typecheck`

Expected: PASS

Run: `pnpm lint:fix`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/stage-ui/src/components/scenes/drivers/live2d-face-driver.ts packages/stage-ui/src/components/scenes/drivers/live2d-lipsync-driver.ts packages/stage-ui/src/components/scenes/drivers/live2d-motion-driver.ts packages/stage-ui/src/services/embodiment/playback-reconciler.ts packages/stage-ui/src/services/embodiment/playback-reconciler.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-runtime.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.ts packages/stage-ui/src/components/scenes/runtime.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-performance-runtime.test.ts packages/stage-ui/src/components/scenes/Stage.vue
git commit -m "feat: reconcile live2d embodiment playback"
```

## Self-Review

- Spec coverage:
  - `AlicizationEmbodimentScriptV1` contract is covered by Task 1.
  - `Embodiment Director` plus renderer adaptation are covered by Tasks 2 and 3.
  - executable speech planning is covered by Task 4.
  - Live2D-specific driver split and playback reconciliation are covered by Task 5.
  - P0 intentionally excludes VRM parity, full duplex voice, and platformization work.
- Placeholder scan:
  - no `TBD`, `TODO`, “similar to Task N”, or vague “appropriate error handling” placeholders remain.
- Type consistency:
  - the transported execution authority is `structured.embodimentScript`.
  - `runtime-embodiment-seed` is introduced and tested in P0 as the canonical local director input shape, but is not transported over shared IPC yet.
  - renderer context for script generation is injected from `use-stage-embodiment-presence.ts` into the dispatcher via `setEmbodimentScriptBuilder(...)`, avoiding hidden renderer state inside the store.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-11-alicization-embodiment-p0-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
