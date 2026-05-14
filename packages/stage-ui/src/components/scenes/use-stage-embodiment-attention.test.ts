import {
  createIdleStageEmbodimentSpeechPlaybackState,
  createIdleStageEmbodimentSpeechRenderState,
  deriveStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  deriveStageEmbodimentAttentionScreenPoint,
  resolveStageEmbodimentPerformancePresence,
  resolveStageEmbodimentRuntimeAttentionBias,
  resolveStageEmbodimentRuntimePresence,
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
