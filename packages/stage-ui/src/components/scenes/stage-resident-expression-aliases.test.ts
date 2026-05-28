import { describe, expect, it } from 'vitest'

import {
  resolveResidentFacialCueBias,
  resolveResidentLive2DPreferredExpressionAliases,
  resolveResidentVrmPreferredExpressionAliases,
} from './stage-resident-expression-aliases'

describe('stage resident expression aliases', () => {
  it('keeps ordinary thinking resident aliases focused when no lower-pressure timing is present', () => {
    expect(resolveResidentLive2DPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.74,
        bodyYaw: 0.02,
        bodyPitch: 0.26,
        breathBoost: 0.16,
        gazeStability: 0.84,
      },
      visualPresenceState: {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'calm',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.82,
          reasonTags: ['companionship'],
          signature: 'resident|ordinary-thinking',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.72,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['quiet-companionship'],
          stance: 'observe',
          thoughtText: 'Stay nearby and track the room.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    }).slice(0, 4)).toEqual([
      'ConfiguredFocus',
      'focus',
      'relaxed',
      'thinking',
    ])
  })

  it('softens subconscious quiet-accompaniment resident aliases even before lower-pressure timing tags appear', () => {
    expect(resolveResidentLive2DPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.76,
        bodyYaw: 0.02,
        bodyPitch: 0.24,
        breathBoost: 0.14,
        gazeStability: 0.88,
      },
      visualPresenceState: {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'steady_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'accompany',
          emotionalTension: 'soft-covision',
          confidence: 0.84,
          reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment'],
          signature: 'resident|main-runtime|accompanying|quiet-accompaniment|subconscious-proactive|silent-observe',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.74,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment'],
          stance: 'accompany',
          thoughtText: 'Stay quietly with the host through this focus window.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    }).slice(0, 6)).toEqual([
      'soft-gaze',
      'relaxed',
      'half-lid',
      'ConfiguredFocus',
      'focus',
      'thinking',
    ])
  })

  it('pushes quieter soft-gaze aliases ahead of focused thinking aliases during lower-pressure resident reopening', () => {
    expect(resolveResidentLive2DPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.74,
        bodyYaw: 0.02,
        bodyPitch: 0.22,
        breathBoost: 0.12,
        gazeStability: 0.9,
      },
      visualPresenceState: {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'calm',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.82,
          reasonTags: ['companionship', 'timing:lower-pressure-opening', 'timing-source:self-evolution'],
          signature: 'resident|lower-pressure-thinking',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.72,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['quiet-companionship', 'timing:lower-pressure-opening'],
          stance: 'observe',
          thoughtText: 'Stay nearby without reopening too fast.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    }).slice(0, 6)).toEqual([
      'soft-gaze',
      'relaxed',
      'half-lid',
      'ConfiguredFocus',
      'focus',
      'thinking',
    ])
  })

  it('pushes relaxed vrm aliases ahead of configured focused aliases during lower-pressure resident reopening', () => {
    const ordinary = resolveResidentVrmPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.74,
        bodyYaw: 0.02,
        bodyPitch: 0.26,
        breathBoost: 0.16,
        gazeStability: 0.84,
      },
      visualPresenceState: {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'calm',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.82,
          reasonTags: ['companionship'],
          signature: 'resident|ordinary-vrm-thinking',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.72,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['quiet-companionship'],
          stance: 'observe',
          thoughtText: 'Stay nearby and track the room.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    })
    const lowerPressure = resolveResidentVrmPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.74,
        bodyYaw: 0.02,
        bodyPitch: 0.22,
        breathBoost: 0.12,
        gazeStability: 0.9,
      },
      visualPresenceState: {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'calm',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.82,
          reasonTags: ['companionship', 'timing:lower-pressure-opening', 'timing-source:self-evolution'],
          signature: 'resident|lower-pressure-vrm-thinking',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.72,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['quiet-companionship', 'timing:lower-pressure-opening'],
          stance: 'observe',
          thoughtText: 'Stay nearby without reopening too fast.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    })

    expect(ordinary.slice(0, 4)).toEqual([
      'ConfiguredFocus',
      'focus',
      'relaxed',
      'thinking',
    ])
    expect(lowerPressure.slice(0, 4)).toEqual([
      'relaxed',
      'ConfiguredFocus',
      'focus',
      'thinking',
    ])
  })

  it('softens resident facial cue bias away from focus during lower-pressure quiet accompaniment reopening', () => {
    const ordinary = resolveResidentFacialCueBias({
      configuredCue: 'focus',
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.74,
        bodyYaw: 0.02,
        bodyPitch: 0.26,
        breathBoost: 0.16,
        gazeStability: 0.84,
      },
      visualPresenceState: {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'calm',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.82,
          reasonTags: ['companionship'],
          signature: 'resident|ordinary-facial-cue',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.72,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['quiet-companionship'],
          stance: 'observe',
          thoughtText: 'Stay nearby and track the room.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    })
    const lowerPressure = resolveResidentFacialCueBias({
      configuredCue: 'focus',
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.74,
        bodyYaw: 0.02,
        bodyPitch: 0.22,
        breathBoost: 0.12,
        gazeStability: 0.9,
      },
      visualPresenceState: {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'calm',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.82,
          reasonTags: ['companionship', 'timing:lower-pressure-opening', 'timing-source:self-evolution'],
          signature: 'resident|lower-pressure-facial-cue',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.72,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['quiet-companionship', 'timing:lower-pressure-opening'],
          stance: 'observe',
          thoughtText: 'Stay nearby without reopening too fast.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    })

    expect(ordinary).toBe('focus')
    expect(['soft-gaze', 'relaxed', 'half-lid']).toContain(lowerPressure)
    expect(lowerPressure).not.toBe('focus')
  })
})
