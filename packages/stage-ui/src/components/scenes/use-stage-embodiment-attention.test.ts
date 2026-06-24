import {
  createIdleStageEmbodimentSpeechPlaybackState,
  createIdleStageEmbodimentSpeechRenderState,
  deriveStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import {
  deriveStageEmbodimentAttentionScreenPoint,
  resolveStageEmbodimentPerformancePresence,
  resolveStageEmbodimentRuntimeAttentionBias,
  resolveStageEmbodimentRuntimePresence,
  useStageEmbodimentAttention,
} from './use-stage-embodiment-attention'

describe('stage embodiment attention', () => {
  it('maps hesitant delivery into a short-lived hesitant presence state', () => {
    expect(resolveStageEmbodimentPerformancePresence({
      baseEmotion: 'neutral',
      emotion: 'neutral',
      delivery: 'hesitant',
      emphasis: 2,
      facialCue: null,
      actionCue: null,
    }, 1000)).toEqual({
      source: 'performance',
      embodiedPresence: 'hesitant',
      confidence: 0.78,
      delivery: 'hesitant',
      emphasis: 2,
      expiresAt: 2620,
    })
  })

  it('keeps the base point when no speech or presence is active', () => {
    expect(deriveStageEmbodimentAttentionScreenPoint({
      basePoint: { x: 420, y: 260 },
      stageBounds: { width: 800, height: 600 },
      presence: null,
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    })).toEqual({
      engaged: false,
      point: { x: 420, y: 260 },
    })
  })

  it('biases the engaged point upward during attentive speaking', () => {
    const speechRenderState = deriveStageEmbodimentSpeechRenderState({
      lastEventType: 'mouth-update',
      revision: 1,
      state: {
        ...createIdleStageEmbodimentSpeechPlaybackState(),
        phase: 'playing' as const,
        mouthOpenSize: 44,
        dynamics: {
          speechEnergy: 0.5,
          prosodyIntensity: 0.46,
          emphasisLevel: 0.38,
          cadencePulse: 0.7,
        },
      },
    })

    const result = deriveStageEmbodimentAttentionScreenPoint({
      basePoint: { x: 600, y: 400 },
      stageBounds: { width: 1000, height: 800 },
      presence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt: Date.now() + 1000,
      },
      speechRenderState,
    })

    expect(result.engaged).toBe(true)
    expect(result.point.x).toBeCloseTo(603.248, 3)
    expect(result.point.y).toBeCloseTo(384.48, 3)
  })

  it('keeps quiet accompaniment body authority on presence-pulse state instead of collapsing to bare attentive presence', () => {
    const now = 10_000
    const speechRenderState = createIdleStageEmbodimentSpeechRenderState()

    const result = deriveStageEmbodimentAttentionScreenPoint({
      basePoint: { x: 512, y: 320 },
      stageBounds: { width: 1024, height: 640 },
      presence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt: now + 2_000,
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        currentInwardPreoccupation: 'stay nearby without interrupting',
        quietLineMs: 240_000,
      } as any,
      speechRenderState,
    })

    expect(result.engaged).toBe(true)
    expect(result.point.y).toBeLessThan(320)
  })

  it('preserves quiet accompaniment authority fields on active presence when a presence pulse is applied', () => {
    const attention = useStageEmbodimentAttention({
      focusAt: ref({ x: 512, y: 320 }),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 1024, height: 640 }),
    })

    attention.applyPresencePulse({
      watchMode: 'symbiotic-vision',
      embodiedPresence: 'attentive',
      scenario: 'coding',
      stance: 'accompany',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'stay nearby without interrupting',
      confidence: 0.82,
      reasonTags: ['quiet-companionship'],
      emotionalTension: 'soft-covision',
      expiresAt: Date.now() + 2_000,
    } as any)

    expect(attention.activePresence.value).toMatchObject({
      source: 'presence-pulse',
      embodiedPresence: 'attentive',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'stay nearby without interrupting',
    })
  })

  it('softens presence-pulse gaze drift when quiet accompaniment authority is active', () => {
    const expiresAt = Date.now() + 2_000
    const generic = deriveStageEmbodimentAttentionScreenPoint({
      basePoint: { x: 512, y: 320 },
      stageBounds: { width: 1024, height: 640 },
      presence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt,
      },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    })
    const quiet = deriveStageEmbodimentAttentionScreenPoint({
      basePoint: { x: 512, y: 320 },
      stageBounds: { width: 1024, height: 640 },
      presence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt,
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'stay nearby without interrupting',
      } as any,
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    })

    expect(quiet.engaged).toBe(true)
    expect(generic.engaged).toBe(true)
    expect(quiet.point.y).toBeGreaterThan(generic.point.y)
  })

  it('keeps measured-return lower-pressure presence pulses on a softer accompanying attention line instead of collapsing to generic attentive drift', () => {
    const expiresAt = Date.now() + 2_000
    const generic = deriveStageEmbodimentAttentionScreenPoint({
      basePoint: { x: 512, y: 320 },
      stageBounds: { width: 1024, height: 640 },
      presence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt,
        currentBodyState: 'accompanying',
        continuityMode: 'ambient-covision',
      } as any,
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    })
    const measuredReturnLowerPressure = deriveStageEmbodimentAttentionScreenPoint({
      basePoint: { x: 512, y: 320 },
      stageBounds: { width: 1024, height: 640 },
      presence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt,
        currentBodyState: 'accompanying',
        continuityMode: 'ambient-covision',
        reasonTags: ['quiet-companionship', 'measured-return', 'continuity-next-open-window'],
      } as any,
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    })

    expect(measuredReturnLowerPressure.engaged).toBe(true)
    expect(generic.engaged).toBe(true)
    expect(measuredReturnLowerPressure.point.y).toBeGreaterThan(generic.point.y)
    expect(Math.abs(measuredReturnLowerPressure.point.x - 512)).toBeLessThan(Math.abs(generic.point.x - 512))
  })

  it('derives runtime visual presence into an embodied attention state', () => {
    const now = 50_000
    const result = resolveStageEmbodimentRuntimePresence({
      currentBodyState: 'idle',
      continuityMode: 'ambient-covision',
      quietLineMs: 0,
      currentInwardPreoccupation: null,
      watchMode: 'invited-inspection',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        source: 'invited-grounding',
        confidence: 0.84,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'use-stage-embodiment-attention.ts',
          pid: 42,
        },
        beganAt: now - 12_000,
        lastSeenAt: now - 1_200,
      },
      attention: {
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'use-stage-embodiment-attention.ts',
          pid: 42,
        },
        source: 'invited-inspection',
        confidence: 0.9,
        engagedAt: now - 8_000,
        lastConfirmedAt: now - 800,
        dwellMs: 7_200,
      },
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'observe',
        confidence: 0.74,
        rationaleTags: ['inspection'],
        thoughtText: 'Need to stay with the current diff.',
        shouldSpeak: true,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        expiresAt: now + 4_500,
        emotionalTension: 'focused-flow',
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: now - 500,
        sourceName: 'display-1',
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 1_600,
      updatedAt: now - 300,
    }, now)

    expect(result).toMatchObject({
      source: 'runtime-visual-presence',
      embodiedPresence: 'hesitant',
      delivery: null,
      emphasis: 1,
      expiresAt: 54_500,
    })
    expect(result?.confidence).toBeCloseTo(0.7792, 3)
  })

  it('adds a stable runtime gaze bias for grounded inspection states', () => {
    const now = 50_000
    const visualPresenceState = {
      currentBodyState: 'idle' as const,
      continuityMode: 'ambient-covision' as const,
      quietLineMs: 0,
      currentInwardPreoccupation: null,
      watchMode: 'invited-inspection' as const,
      currentScene: {
        workloadKind: 'coding' as const,
        contentKind: 'diff' as const,
        scenario: 'coding' as const,
        source: 'invited-grounding' as const,
        confidence: 0.84,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'use-stage-embodiment-attention.ts',
          pid: 42,
        },
        beganAt: now - 12_000,
        lastSeenAt: now - 1_200,
      },
      attention: {
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'use-stage-embodiment-attention.ts',
          pid: 42,
        },
        source: 'invited-inspection' as const,
        confidence: 0.9,
        engagedAt: now - 8_000,
        lastConfirmedAt: now - 800,
        dwellMs: 7_200,
      },
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'observe' as const,
        confidence: 0.74,
        rationaleTags: ['inspection'],
        thoughtText: 'Need to stay with the current diff.',
        shouldSpeak: true,
        suggestedStyle: 'silent-observe' as const,
        embodiedPresence: 'attentive' as const,
        expiresAt: now + 4_500,
        emotionalTension: 'focused-flow' as const,
      },
      captureState: {
        permission: 'granted' as const,
        lastGroundedAt: now - 500,
        sourceName: 'display-1',
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 1_600,
      updatedAt: now - 300,
    }

    const runtimeBias = resolveStageEmbodimentRuntimeAttentionBias(visualPresenceState, now)
    expect(runtimeBias.engaged).toBe(true)
    expect(runtimeBias.confidence).toBeGreaterThan(0.8)
    expect(runtimeBias.confidence).toBeLessThan(0.9)
    expect(runtimeBias.x).toBeLessThan(-0.001)
    expect(runtimeBias.x).toBeGreaterThan(-0.01)
    expect(runtimeBias.y).toBeLessThan(-0.015)
    expect(runtimeBias.y).toBeGreaterThan(-0.03)

    const result = deriveStageEmbodimentAttentionScreenPoint({
      basePoint: { x: 512, y: 320 },
      stageBounds: { width: 1280, height: 720 },
      presence: null,
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState,
    })

    expect(result.engaged).toBe(true)
    expect(result.point.x).toBeLessThan(512)
    expect(result.point.x).toBeGreaterThan(502)
    expect(result.point.y).toBeLessThan(320)
    expect(result.point.y).toBeGreaterThan(290)
  })
})
