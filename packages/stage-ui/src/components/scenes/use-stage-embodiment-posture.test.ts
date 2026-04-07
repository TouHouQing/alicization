import {
  createIdleStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { deriveStageEmbodimentPresencePostureState } from './use-stage-embodiment-posture'

describe('stage embodiment posture', () => {
  it('leans into invited inspection with stable gaze posture', () => {
    const result = deriveStageEmbodimentPresencePostureState({
      activePresence: {
        source: 'runtime-visual-presence',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 1,
        expiresAt: 10_000,
      },
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 690, y: 310 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: {
        watchMode: 'invited-inspection',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          source: 'invited-grounding',
          confidence: 0.84,
          beganAt: 1_000,
          lastSeenAt: 2_000,
        },
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'observe',
          confidence: 0.7,
          rationaleTags: ['inspection'],
          thoughtText: 'Stay with this diff.',
          shouldSpeak: true,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'focused-flow',
        },
        captureState: {
          permission: 'granted',
          lastGroundedAt: Date.now() - 200,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 1_500,
        updatedAt: Date.now() - 100,
      },
    })

    expect(result.engaged).toBe(true)
    expect(result.mode).toBe('inspection')
    expect(result.confidence).toBeGreaterThan(0.6)
    expect(result.bodyPitch).toBeGreaterThan(0.5)
    expect(result.gazeStability).toBeGreaterThan(0.9)
  })

  it('stays idle when no presence or speech is active', () => {
    expect(deriveStageEmbodimentPresencePostureState({
      activePresence: null,
      basePoint: { x: 320, y: 200 },
      targetPoint: { x: 320, y: 200 },
      stageBounds: { width: 800, height: 600 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: null,
    })).toEqual({
      engaged: false,
      mode: 'idle',
      confidence: 0,
      bodyYaw: 0,
      bodyPitch: 0,
      breathBoost: 0,
      gazeStability: 0.32,
    })
  })
})
