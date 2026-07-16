import { createIdleStageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  resolveResidentFacialCueBias,
  resolveResidentLive2DPreferredExpressionAliases,
  resolveResidentLive2DPreferredExpressionAliasesFromRuntimeState,
  resolveResidentVrmPreferredExpressionAliases,
  resolveResidentVrmPreferredExpressionAliasesFromRuntimeState,
} from './stage-resident-expression-aliases'
import { deriveStageEmbodimentPresencePostureState } from './use-stage-embodiment-posture'

describe('stage resident expression aliases', () => {
  it('recomputes live2d resident aliases when runtime cue expression aliases change without an emotion change', () => {
    const sharedInput = {
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus'],
      presencePosture: {
        engaged: true,
        mode: 'attentive' as const,
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
          signature: 'resident|runtime-live2d-alias-refresh',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.72,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['quiet-companionship'],
          stance: 'observe',
          thoughtText: 'Keep the same line, but let the face cue update.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
      runtimeTurnExpressionAliasesByEmotion: {
        thinking: ['TurnFocus'],
      },
    }

    expect(resolveResidentLive2DPreferredExpressionAliasesFromRuntimeState({
      ...sharedInput,
      runtimeSegmentExpressionAliasesByEmotion: {
        thinking: ['SegmentFocus'],
      },
    }).slice(0, 4)).toEqual([
      'SegmentFocus',
      'TurnFocus',
      'ConfiguredFocus',
      'thinking',
    ])

    expect(resolveResidentLive2DPreferredExpressionAliasesFromRuntimeState({
      ...sharedInput,
      runtimeSegmentExpressionAliasesByEmotion: {
        thinking: ['RecoverSoft'],
      },
    }).slice(0, 4)).toEqual([
      'RecoverSoft',
      'TurnFocus',
      'ConfiguredFocus',
      'thinking',
    ])
  })

  it('recomputes vrm resident aliases when runtime cue expression aliases change without an emotion change', () => {
    const sharedInput = {
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus'],
      presencePosture: {
        engaged: true,
        mode: 'attentive' as const,
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
          signature: 'resident|runtime-vrm-alias-refresh',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.72,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['quiet-companionship'],
          stance: 'observe',
          thoughtText: 'Keep the same line, but let the face cue update.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
      runtimeTurnExpressionAliasesByEmotion: {
        thinking: ['TurnFocus'],
      },
    }

    expect(resolveResidentVrmPreferredExpressionAliasesFromRuntimeState({
      ...sharedInput,
      runtimeSegmentExpressionAliasesByEmotion: {
        thinking: ['SegmentFocus'],
      },
    }).slice(0, 4)).toEqual([
      'SegmentFocus',
      'TurnFocus',
      'ConfiguredFocus',
      'thinking',
    ])

    expect(resolveResidentVrmPreferredExpressionAliasesFromRuntimeState({
      ...sharedInput,
      runtimeSegmentExpressionAliasesByEmotion: {
        thinking: ['RecoverSoft'],
      },
    }).slice(0, 4)).toEqual([
      'RecoverSoft',
      'TurnFocus',
      'ConfiguredFocus',
      'thinking',
    ])
  })

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

  it('softens live2d resident aliases when project-closure carry survives only through resident performance and posture is rebuilt locally', () => {
    const baselineVisualPresenceState = {
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
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
        confidence: 0.72,
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        rationaleTags: ['quiet-companionship'],
        stance: 'accompany',
        thoughtText: 'Stay nearby without interrupting.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        expiresAt: 2_000,
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: 900,
      },
    } as any

    const restrainedVisualPresenceState = {
      ...baselineVisualPresenceState,
      residentPerformance: {
        ...baselineVisualPresenceState.residentPerformance,
        performance: {
          ...baselineVisualPresenceState.residentPerformance.performance,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        confidence: 0.82,
        reasonTags: [
          'resident-performance',
          'continuity:quiet-accompaniment',
          'measured-return',
          'timing:project-emotional-closure',
        ],
        signature: 'resident|project-closure-carry',
      },
    } as any

    const baselinePosture = deriveStageEmbodimentPresencePostureState({
      activePresence: null,
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 657, y: 348 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: baselineVisualPresenceState,
    })
    const restrainedPosture = deriveStageEmbodimentPresencePostureState({
      activePresence: null,
      basePoint: { x: 640, y: 360 },
      targetPoint: { x: 657, y: 348 },
      stageBounds: { width: 1280, height: 720 },
      speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
      visualPresenceState: restrainedVisualPresenceState,
    })

    expect(resolveResidentLive2DPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: baselinePosture,
      visualPresenceState: baselineVisualPresenceState,
    }).slice(0, 4)).toEqual([
      'ConfiguredFocus',
      'focus',
      'relaxed',
      'thinking',
    ])

    expect(resolveResidentLive2DPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: restrainedPosture,
      visualPresenceState: restrainedVisualPresenceState,
    }).slice(0, 6)).toEqual([
      'soft-gaze',
      'relaxed',
      'half-lid',
      'ConfiguredFocus',
      'focus',
      'thinking',
    ])
  })

  it('prioritizes softer live2d companionship aliases when the audible same-her resident line is already re-formed', () => {
    expect(resolveResidentLive2DPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.01,
        bodyPitch: 0.2,
        breathBoost: 0.1,
        gazeStability: 0.92,
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
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'accompany',
          emotionalTension: 'soft-covision',
          confidence: 0.86,
          reasonTags: ['companionship', 'embodiment:audible-same-her-line'],
          signature: 'resident|audible-same-her-line|body-lipsync-voice-rejoin',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.76,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['embodiment:body-lipsync-voice-rejoin'],
          stance: 'accompany',
          thoughtText: 'The audible companionship line is already back; let the face return softly too.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    }).slice(0, 6)).toEqual([
      'relaxed',
      'soft-gaze',
      'half-lid',
      'ConfiguredFocus',
      'focus',
      'thinking',
    ])
  })

  it('prioritizes softer live2d companionship aliases when body+voice-only resident continuity survives without the legacy body-lipsync rejoin tag', () => {
    expect(resolveResidentLive2DPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.01,
        bodyPitch: 0.2,
        breathBoost: 0.1,
        gazeStability: 0.92,
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
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'accompany',
          emotionalTension: 'soft-covision',
          confidence: 0.86,
          reasonTags: ['companionship', 'embodiment:body+voice-only'],
          signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.76,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['embodiment:body+voice-only'],
          stance: 'accompany',
          thoughtText: 'The resident body line and voice are already carrying one identity-continuity',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    }).slice(0, 6)).toEqual([
      'relaxed',
      'soft-gaze',
      'half-lid',
      'ConfiguredFocus',
      'focus',
      'thinking',
    ])
  })

  it.each([
    'embodiment:body+lipsync-only',
    'embodiment:lipsync+voice-only',
    'embodiment:still-voiced-face-line',
    'embodiment:still-voiced-motion-line',
  ])('softens live2d resident aliases when quieter identity-continuity', (reasonTag) => {
    expect(resolveResidentLive2DPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.01,
        bodyPitch: 0.2,
        breathBoost: 0.1,
        gazeStability: 0.92,
      },
      visualPresenceState: {
        currentBodyState: 'observing',
        continuityMode: 'dialogue',
        quietLineMs: 60_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.84,
          reasonTags: ['companionship', reasonTag],
          signature: 'resident|main-runtime|same-thread',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.74,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: [reasonTag],
          stance: 'observe',
          thoughtText: 'The same line is still alive, just quieter now.',
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

  it('keeps live2d active segment expression aliases ahead of resident softening when quieter identity-continuity', () => {
    expect(resolveResidentLive2DPreferredExpressionAliasesFromRuntimeState({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      runtimeSegmentExpressionAliasesByEmotion: {
        thinking: ['RecoverSoft'],
      },
      runtimeTurnExpressionAliasesByEmotion: {
        thinking: ['TurnFocus'],
      },
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.01,
        bodyPitch: 0.2,
        breathBoost: 0.1,
        gazeStability: 0.92,
      },
      visualPresenceState: {
        currentBodyState: 'observing',
        continuityMode: 'dialogue',
        quietLineMs: 60_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.84,
          reasonTags: ['companionship', 'embodiment:still-voiced-face-motion-line'],
          signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.74,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['embodiment:still-voiced-face-motion-line'],
          stance: 'observe',
          thoughtText: 'The same-her face and motion line is still alive, but this exact facial alias should stay authoritative.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    }).slice(0, 6)).toEqual([
      'RecoverSoft',
      'soft-gaze',
      'relaxed',
      'half-lid',
      'TurnFocus',
      'ConfiguredFocus',
    ])
  })

  it.each([
    'measured-return',
    'repair-before-closeness',
  ] as const)('treats %s callback restraint as lower-pressure resident reopening for live2d aliases', (residentReasonTag) => {
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
            actionCue: residentReasonTag === 'repair-before-closeness' ? 'idle_settle' : 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'accompany',
          emotionalTension: 'soft-covision',
          confidence: 0.82,
          reasonTags: ['companionship', residentReasonTag],
          signature: `resident|${residentReasonTag}`,
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.72,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: [residentReasonTag],
          stance: 'accompany',
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

  it('keeps vrm active segment expression aliases ahead of resident softening when quieter identity-continuity', () => {
    expect(resolveResidentVrmPreferredExpressionAliasesFromRuntimeState({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      runtimeSegmentExpressionAliasesByEmotion: {
        thinking: ['RecoverSoft'],
      },
      runtimeTurnExpressionAliasesByEmotion: {
        thinking: ['TurnFocus'],
      },
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.01,
        bodyPitch: 0.2,
        breathBoost: 0.1,
        gazeStability: 0.92,
      },
      visualPresenceState: {
        currentBodyState: 'observing',
        continuityMode: 'dialogue',
        quietLineMs: 60_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.84,
          reasonTags: ['companionship', 'embodiment:still-voiced-face-motion-line'],
          signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.74,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['embodiment:still-voiced-face-motion-line'],
          stance: 'observe',
          thoughtText: 'The same-her face and motion line is still alive, but this exact facial alias should stay authoritative.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    }).slice(0, 5)).toEqual([
      'RecoverSoft',
      'relaxed',
      'TurnFocus',
      'ConfiguredFocus',
      'focus',
    ])
  })

  it('prioritizes softer vrm companionship aliases when the audible same-her resident line is already re-formed', () => {
    expect(resolveResidentVrmPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.01,
        bodyPitch: 0.2,
        breathBoost: 0.1,
        gazeStability: 0.92,
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
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'accompany',
          emotionalTension: 'soft-covision',
          confidence: 0.86,
          reasonTags: ['companionship', 'embodiment:audible-same-her-line'],
          signature: 'resident|audible-same-her-line|body-lipsync-voice-rejoin',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.76,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['embodiment:body-lipsync-voice-rejoin'],
          stance: 'accompany',
          thoughtText: 'The audible companionship line is already back; let the face return softly too.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    }).slice(0, 5)).toEqual([
      'relaxed',
      'soft',
      'ConfiguredFocus',
      'focus',
      'thinking',
    ])
  })

  it.each([
    'embodiment:body+lipsync-only',
    'embodiment:lipsync+voice-only',
    'embodiment:still-voiced-face-line',
    'embodiment:still-voiced-motion-line',
  ])('softens vrm resident aliases when quieter identity-continuity', (reasonTag) => {
    expect(resolveResidentVrmPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus', 'focus', 'relaxed'],
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.01,
        bodyPitch: 0.2,
        breathBoost: 0.1,
        gazeStability: 0.92,
      },
      visualPresenceState: {
        currentBodyState: 'observing',
        continuityMode: 'dialogue',
        quietLineMs: 60_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.84,
          reasonTags: ['companionship', reasonTag],
          signature: 'resident|main-runtime|same-thread',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.74,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: [reasonTag],
          stance: 'observe',
          thoughtText: 'The same line is still alive, just quieter now.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    }).slice(0, 4)).toEqual([
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

  it('biases resident facial cue all the way to relaxed when the audible same-her resident line is already carrying the turn', () => {
    expect(resolveResidentFacialCueBias({
      configuredCue: 'focus',
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.01,
        bodyPitch: 0.2,
        breathBoost: 0.1,
        gazeStability: 0.92,
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
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'accompany',
          emotionalTension: 'soft-covision',
          confidence: 0.86,
          reasonTags: ['companionship', 'embodiment:audible-same-her-line'],
          signature: 'resident|audible-same-her-line|body-lipsync-voice-rejoin',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.76,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: ['embodiment:body-lipsync-voice-rejoin'],
          stance: 'accompany',
          thoughtText: 'The audible companionship line is already back; let the face return softly too.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    })).toBe('relaxed')
  })

  it.each([
    'embodiment:body+lipsync-only',
    'embodiment:lipsync+voice-only',
    'embodiment:still-voiced-face-line',
    'embodiment:still-voiced-motion-line',
  ])('softens resident facial cue bias to soft-gaze when quieter identity-continuity', (reasonTag) => {
    expect(resolveResidentFacialCueBias({
      configuredCue: 'focus',
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.01,
        bodyPitch: 0.2,
        breathBoost: 0.1,
        gazeStability: 0.92,
      },
      visualPresenceState: {
        currentBodyState: 'observing',
        continuityMode: 'dialogue',
        quietLineMs: 60_000,
        watchMode: 'symbiotic-vision',
        residentPerformance: {
          version: 'resident-performance-v1',
          source: 'main-runtime',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focus',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          embodiedPresence: 'attentive',
          stance: 'observe',
          emotionalTension: 'soft-covision',
          confidence: 0.84,
          reasonTags: ['companionship', reasonTag],
          signature: 'resident|main-runtime|same-thread',
          updatedAt: 1_000,
        },
        privateThought: {
          confidence: 0.74,
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          rationaleTags: [reasonTag],
          stance: 'observe',
          thoughtText: 'The same line is still alive, just quieter now.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          expiresAt: 2_000,
        },
      } as any,
    })).toBe('soft-gaze')
  })
})
