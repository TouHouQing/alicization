import type { AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'

import {
  createIdleStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { deriveStageEmbodimentPresencePostureState } from './use-stage-embodiment-posture'

function withSilentPresenceAuthority<T extends AlicizationVisualPresenceStateSnapshot>(
  state: T,
  authority: {
    currentBodyState: 'accompanying' | 'recovering'
    continuityMode: 'quiet-accompaniment' | 'protective-watch'
    quietLineMs: number
    currentInwardPreoccupation: string
  },
): T {
  return {
    ...state,
    ...authority,
  } as T
}

function createVisualPresenceStateForPosture(overrides: Partial<AlicizationVisualPresenceStateSnapshot> = {}) {
  return {
    currentBodyState: 'idle' as const,
    continuityMode: 'ambient-covision' as const,
    quietLineMs: 0,
    currentInwardPreoccupation: null,
    watchMode: 'mnemonic-passive',
    currentScene: null,
    attention: null,
    workingMemoryEpisodes: [],
    privateThought: null,
    captureState: {
      permission: 'granted' as const,
      lastGroundedAt: Date.now() - 200,
    },
    durabilityPulse: null,
    recentTransition: null,
    nextSuggestedProbeMs: 1_500,
    updatedAt: Date.now() - 100,
    ...overrides,
  } satisfies AlicizationVisualPresenceStateSnapshot
}

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

  it('keeps silent accompanying in an attentive engaged posture during quiet accompaniment', () => {
    const result = deriveStageEmbodimentPresencePostureState({
      activePresence: null,
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 664, y: 348 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceStateForPosture({
        watchMode: 'symbiotic-vision',
        privateThought: {
          stance: 'accompany',
          confidence: 0.72,
          rationaleTags: ['quiet-companionship'],
          thoughtText: 'Stay with the host without interrupting.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'focused-flow',
        },
      }), {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'host sustained focus',
      }),
    })

    expect(result.engaged).toBe(true)
    expect(result.mode).toBe('attentive')
    expect(result.confidence).toBeGreaterThan(0.25)
    expect(Math.abs(result.bodyYaw)).toBeLessThan(0.18)
    expect(result.bodyPitch).toBeGreaterThan(0.2)
    expect(result.bodyPitch).toBeLessThan(0.42)
    expect(result.breathBoost).toBeGreaterThan(0.08)
    expect(result.breathBoost).toBeLessThan(0.3)
    expect(result.gazeStability).toBeGreaterThan(0.78)
  })

  it('keeps lower-pressure attentive posture quieter and steadier when long-horizon timing says not to reopen too fast', () => {
    const baseline = deriveStageEmbodimentPresencePostureState({
      activePresence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt: Date.now() + 2_000,
        watchMode: 'symbiotic-vision',
        stance: 'observe',
        reasonTags: ['inspection'],
        emotionalTension: 'focused-flow',
        currentBodyState: 'noticing',
        continuityMode: 'ambient-covision',
        quietLineMs: 45_000,
        currentInwardPreoccupation: 'stay nearby and track the room',
      },
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 664, y: 348 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: createVisualPresenceStateForPosture({
        watchMode: 'symbiotic-vision',
        privateThought: {
          stance: 'observe',
          confidence: 0.72,
          rationaleTags: ['inspection'],
          thoughtText: 'Stay nearby and track the room.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'focused-flow',
        },
      }),
    })

    const lowerPressure = deriveStageEmbodimentPresencePostureState({
      activePresence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt: Date.now() + 2_000,
        watchMode: 'symbiotic-vision',
        stance: 'observe',
        reasonTags: ['inspection', 'timing:lower-pressure-opening', 'timing-source:self-evolution'],
        emotionalTension: 'focused-flow',
        currentBodyState: 'noticing',
        continuityMode: 'ambient-covision',
        quietLineMs: 45_000,
        currentInwardPreoccupation: 'stay nearby without reopening too fast',
      },
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 664, y: 348 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: createVisualPresenceStateForPosture({
        watchMode: 'symbiotic-vision',
        privateThought: {
          stance: 'observe',
          confidence: 0.72,
          rationaleTags: ['inspection', 'timing:lower-pressure-opening'],
          thoughtText: 'Stay nearby without reopening too fast.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'focused-flow',
        },
      }),
    })

    expect(lowerPressure.mode).toBe('attentive')
    expect(lowerPressure.bodyPitch).toBeLessThan(baseline.bodyPitch)
    expect(lowerPressure.breathBoost).toBeLessThan(baseline.breathBoost)
    expect(lowerPressure.gazeStability).toBeGreaterThan(baseline.gazeStability)
  })

  it.each([
    ['measured-return'],
    ['repair-before-closeness'],
  ] as const)('treats %s callback restraint as lower-pressure attentive posture guidance', (reasonTag) => {
    const baseline = deriveStageEmbodimentPresencePostureState({
      activePresence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt: Date.now() + 2_000,
        watchMode: 'symbiotic-vision',
        stance: 'observe',
        reasonTags: ['inspection'],
        emotionalTension: 'focused-flow',
        currentBodyState: 'noticing',
        continuityMode: 'ambient-covision',
        quietLineMs: 45_000,
        currentInwardPreoccupation: 'stay nearby and track the room',
      },
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 664, y: 348 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: createVisualPresenceStateForPosture({
        watchMode: 'symbiotic-vision',
        privateThought: {
          stance: 'observe',
          confidence: 0.72,
          rationaleTags: ['inspection'],
          thoughtText: 'Stay nearby and track the room.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'focused-flow',
        },
      }),
    })

    const restrained = deriveStageEmbodimentPresencePostureState({
      activePresence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt: Date.now() + 2_000,
        watchMode: 'symbiotic-vision',
        stance: 'observe',
        reasonTags: ['inspection', reasonTag],
        emotionalTension: 'focused-flow',
        currentBodyState: 'noticing',
        continuityMode: 'ambient-covision',
        quietLineMs: 45_000,
        currentInwardPreoccupation: 'stay nearby without reopening too fast',
      },
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 664, y: 348 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: createVisualPresenceStateForPosture({
        watchMode: 'symbiotic-vision',
        privateThought: {
          stance: 'observe',
          confidence: 0.72,
          rationaleTags: [reasonTag],
          thoughtText: 'Stay nearby without reopening too fast.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'focused-flow',
        },
      }),
    })

    expect(restrained.mode).toBe('attentive')
    expect(restrained.bodyPitch).toBeLessThan(baseline.bodyPitch)
    expect(restrained.breathBoost).toBeLessThan(baseline.breathBoost)
    expect(restrained.gazeStability).toBeGreaterThan(baseline.gazeStability)
  })

  it('treats resident-only project closure carry as lower-pressure attentive posture guidance even before private-thought tags are rebuilt', () => {
    const baseline = deriveStageEmbodimentPresencePostureState({
      activePresence: null,
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 664, y: 348 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceStateForPosture({
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'browser-fallback',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'steady_focus',
            delivery: 'calm',
            emphasis: 0,
            residentMode: null,
          },
          embodiedPresence: 'attentive',
          stance: 'accompany',
          emotionalTension: 'soft-covision',
          confidence: 0.74,
          reasonTags: ['resident-performance', 'continuity:quiet-accompaniment'],
          signature: 'resident|baseline-project-closure-carry',
          updatedAt: 1_000,
        },
        privateThought: {
          stance: 'accompany',
          confidence: 0.72,
          rationaleTags: ['quiet-companionship'],
          thoughtText: 'Stay nearby without interrupting.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'focused-flow',
        },
      }), {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'stay quietly nearby while the return settles',
      }),
    })

    const restrained = deriveStageEmbodimentPresencePostureState({
      activePresence: null,
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 664, y: 348 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceStateForPosture({
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'browser-fallback',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 1,
            residentMode: 'measured-return',
          },
          embodiedPresence: 'attentive',
          stance: 'accompany',
          emotionalTension: 'soft-covision',
          confidence: 0.82,
          reasonTags: [
            'resident-performance',
            'continuity:quiet-accompaniment',
            'measured-return',
            'timing:project-emotional-closure',
          ],
          signature: 'resident|project-closure-carry',
          updatedAt: 1_000,
        },
        privateThought: {
          stance: 'accompany',
          confidence: 0.72,
          rationaleTags: ['quiet-companionship'],
          thoughtText: 'Stay nearby without interrupting.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'focused-flow',
        },
      }), {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'stay quietly nearby while the return settles',
      }),
    })

    expect(restrained.mode).toBe('attentive')
    expect(restrained.bodyPitch).toBeLessThan(baseline.bodyPitch)
    expect(restrained.breathBoost).toBeLessThan(baseline.breathBoost)
    expect(restrained.gazeStability).toBeGreaterThan(baseline.gazeStability)
  })

  it('keeps recovering in a concerned posture under protective watch', () => {
    const result = deriveStageEmbodimentPresencePostureState({
      activePresence: null,
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 650, y: 352 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceStateForPosture({
        watchMode: 'recovering',
        privateThought: {
          stance: 'care',
          confidence: 0.78,
          rationaleTags: ['protective-watch'],
          thoughtText: 'Stay nearby and keep the stance gentle.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'concerned',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'late-night-drain',
        },
      }), {
        currentBodyState: 'recovering',
        continuityMode: 'protective-watch',
        quietLineMs: 180_000,
        currentInwardPreoccupation: 'hold low-pressure care',
      }),
    })

    expect(result.engaged).toBe(true)
    expect(result.mode).toBe('concerned')
    expect(result.confidence).toBeGreaterThan(0.22)
    expect(Math.abs(result.bodyYaw)).toBeLessThan(0.14)
    expect(result.bodyPitch).toBeGreaterThan(0.26)
    expect(result.bodyPitch).toBeLessThan(0.5)
    expect(result.breathBoost).toBeGreaterThan(0.1)
    expect(result.breathBoost).toBeLessThan(0.32)
    expect(result.gazeStability).toBeGreaterThan(0.82)
  })

  it('does not enter silent recovering posture when runtime still intends to speak', () => {
    const result = deriveStageEmbodimentPresencePostureState({
      activePresence: null,
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 650, y: 352 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceStateForPosture({
        watchMode: 'recovering',
        privateThought: {
          stance: 'care',
          confidence: 0.78,
          rationaleTags: ['protective-watch'],
          thoughtText: 'Speak softly once the opening is ready.',
          shouldSpeak: true,
          suggestedStyle: 'gentle-care',
          embodiedPresence: 'concerned',
          expiresAt: Date.now() + 5_000,
          emotionalTension: 'late-night-drain',
        },
      }), {
        currentBodyState: 'recovering',
        continuityMode: 'protective-watch',
        quietLineMs: 180_000,
        currentInwardPreoccupation: 'prepare a gentle recovery line',
      }),
    })

    expect(result.mode).toBe('concerned')
    expect(result.confidence).toBeLessThan(0.34)
    expect(result.bodyPitch).toBeGreaterThan(0.38)
    expect(result.breathBoost).toBeGreaterThan(0.13)
    expect(result.gazeStability).toBeLessThan(0.9)
  })
})
