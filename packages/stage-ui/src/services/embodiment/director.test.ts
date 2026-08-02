import type { AlicizationResidentPerformanceSnapshot } from '../../stores/alicization-bridge'
import type { BuildAlicizationEmbodimentScriptInput } from './director'

import { createIdleStageEmbodimentMotorState } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentScript } from './director'

function createSeed(overrides?: Partial<{
  decisionTraceId: string | null
  turnId: string
  replyText: string
  residentMode: 'speaking' | 'recovering'
}>): BuildAlicizationEmbodimentScriptInput['seed'] {
  return {
    decisionTraceId: overrides?.decisionTraceId ?? 'trace-1',
    turnId: overrides?.turnId ?? 'turn-1',
    replyText: overrides?.replyText ?? '你好，我们慢慢来。',
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
    digitalLife: overrides?.residentMode
      ? {
          version: 'digital-life-v1' as const,
          variationToken: 'life-1',
          emotion: 'concerned' as const,
          mode: overrides.residentMode,
          postureHint: 'concerned' as const,
          performance: {
            baseEmotion: 'concerned' as const,
            emotion: 'concerned' as const,
            facialCue: null,
            actionCue: null,
            delivery: 'gentle' as const,
            emphasis: 1 as const,
          },
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 1,
          },
          voice: {
            pitchDelta: 0,
            rateMultiplier: 1,
            energy: 0.5,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'energy',
            visemeBias: 0.5,
            energyBias: 0.5,
            mouthScale: 1,
            continuityHoldMs: 120,
          },
          face: {
            emotion: 'concerned' as const,
            facialCue: null,
            expressionMode: 'hold',
            intensity: 0.5,
            holdMs: 120,
          },
          action: {
            actionCue: null,
            actionMode: 'none',
            intensity: 0.2,
            holdMs: 120,
          },
          motor: createIdleStageEmbodimentMotorState(),
          frames: [],
        }
      : null,
    digitalLifeSpine: null,
  }
}

function createResidentPerformance(source: 'main-runtime' | 'browser-fallback'): AlicizationResidentPerformanceSnapshot {
  return {
    version: 'resident-performance-v1' as const,
    source,
    performance: {
      baseEmotion: 'concerned' as const,
      emotion: 'concerned' as const,
      facialCue: null,
      actionCue: null,
      delivery: 'gentle' as const,
      emphasis: 1 as const,
    },
    embodiedPresence: 'concerned' as const,
    stance: 'care' as const,
    emotionalTension: 'soft-covision' as const,
    confidence: 0.8,
    reasonTags: ['care'],
    signature: `resident-${source}`,
    updatedAt: 1,
  }
}

function createQuietAccompanimentResidentPerformance(): AlicizationResidentPerformanceSnapshot {
  return {
    version: 'resident-performance-v1' as const,
    source: 'main-runtime',
    performance: {
      baseEmotion: 'thinking' as const,
      emotion: 'thinking' as const,
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle' as const,
      emphasis: 2 as const,
    },
    embodiedPresence: 'attentive' as const,
    stance: 'accompany' as const,
    emotionalTension: 'soft-covision' as const,
    confidence: 0.84,
    reasonTags: ['subconscious-proactive', 'silent-observe', 'continuity:quiet-accompaniment'],
    signature: 'resident|main-runtime|accompanying|quiet-accompaniment|subconscious-proactive|silent-observe',
    updatedAt: 1,
  }
}

describe('embodiment director', () => {
  it('produces one normalized live2d script from the local seed shape and preserves decision trace id', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: createSeed(),
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
    expect(script.decisionTraceId).toBe('trace-1')
    expect(script.rendererTarget).toBe('live2d')
    expect(script.speechPlan.interruptPolicy).toBeDefined()
  })

  it('uses corrected resident source semantics for quiet companionship and keeps recovering digital life authoritative', () => {
    const quietScript = buildAlicizationEmbodimentScript({
      seed: createSeed({ decisionTraceId: 'trace-main-runtime' }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createResidentPerformance('main-runtime'),
      rendererTarget: 'live2d',
    })
    const recoveringScript = buildAlicizationEmbodimentScript({
      seed: createSeed({
        decisionTraceId: 'trace-recovering',
        residentMode: 'recovering',
      }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createResidentPerformance('browser-fallback'),
      rendererTarget: 'live2d',
    })

    expect(quietScript.state.residentMode).toBe('quiet-companionship')
    expect(recoveringScript.state.residentMode).toBe('idle-recovering')
  })

  it('preserves multi-segment speech timing from the provided speechTimeline', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed(),
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-1',
          reply: '先看这里。然后点保存。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 5,
              text: '先看这里。',
              gestureWeight: 0.2,
              facialWeight: 0.3,
              prosodyWeight: 0.4,
              beatWeight: 0.5,
              actionCue: 'point_screen',
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
              gestureWeight: 0.1,
              facialWeight: 0.2,
              prosodyWeight: 0.3,
              beatWeight: 0.4,
              actionCue: 'idle_gentle_nod',
              facialCue: 'focused',
              actionWindow: 'cadence-peak',
              interruptMode: 'hard-interrupt',
            },
          ],
        },
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

    expect(script.speechPlan.segments).toHaveLength(2)
    expect(script.speechPlan.segments.map(segment => segment.id)).toEqual(['segment-1', 'segment-2'])
    expect(script.speechPlan.interruptPolicy).toBe('hard-stop')
  })

  it('creates per-segment face and motion cues for multi-segment chinese guidance turns', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed(),
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-1',
          reply: '先看这里。然后点保存。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 5,
              text: '先看这里。',
              emotion: 'thinking',
              gestureWeight: 0.24,
              facialWeight: 0.38,
              prosodyWeight: 0.42,
              beatWeight: 0.48,
              facialHoldMs: 360,
              actionHoldMs: 140,
              actionCue: 'point_screen',
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
              emotion: 'happy',
              gestureWeight: 0.36,
              facialWeight: 0.54,
              prosodyWeight: 0.46,
              beatWeight: 0.52,
              facialHoldMs: 420,
              actionHoldMs: 180,
              actionCue: 'idle_gentle_nod',
              facialCue: 'reassure_smile',
              actionWindow: 'cadence-peak',
              interruptMode: 'soft-interrupt',
            },
          ],
        },
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking', 'happy'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.facePlan.speakingCues.map(cue => cue.segmentId)).toEqual(['segment-1', 'segment-2'])
    expect(script.facePlan.speakingCues.map(cue => cue.facialCue)).toEqual(['focused', 'reassure_smile'])
    expect(script.facePlan.speakingCues.map(cue => cue.emotion)).toEqual(['thinking', 'happy'])
    expect(script.facePlan.speakingCues.map(cue => cue.source)).toEqual(['prosody-authority', 'prosody-authority'])
    expect(script.facePlan.speakingCues.map(cue => cue.confidence)).toEqual([0.94, 0.94])
    expect(script.motionPlan.actionBursts.map(burst => burst.segmentId)).toEqual(['segment-1', 'segment-2'])
    expect(script.motionPlan.actionBursts.map(burst => burst.actionCue)).toEqual(['point_screen', 'idle_gentle_nod'])
    expect(script.motionPlan.actionBursts.map(burst => burst.source)).toEqual(['timeline-projection', 'timeline-projection'])
    expect(script.motionPlan.actionBursts.map(burst => burst.confidence)).toEqual([0.88, 0.88])
    expect(script.speechPlan.segments[0]?.settleMs).toBeGreaterThan(140)
    expect(script.speechPlan.segments[1]?.settleMs).toBeGreaterThan(180)
    expect(script.motionPlan.actionBursts[0]?.holdMs).toBe(140)
    expect(script.motionPlan.actionBursts[1]?.holdMs).toBe(180)
  })

  it('keeps quiet-companionship fallback scripts aligned to steady focus when resident authority is silent-observe accompaniment', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-quiet-companionship-1',
          replyText: '我在这里继续陪着你。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 2,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-quiet-companionship-1',
          reply: '我在这里继续陪着你。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 11,
              text: '我在这里继续陪着你。',
              emotion: 'thinking',
              gestureWeight: 0.24,
              facialWeight: 0.38,
              prosodyWeight: 0.42,
              beatWeight: 0.48,
              facialHoldMs: 160,
              actionHoldMs: 160,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createQuietAccompanimentResidentPerformance(),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('quiet-companionship')
    expect(script.motionPlan.idleBase).toBe('steady_focus')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('steady_focus')
    expect(script.facePlan.speakingCues[0]?.facialCue).toBe('focus')
  })

  it('keeps quiet-companionship fallback scripts in a low-interruption accompaniment posture across speech, face, and attention planning', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-quiet-companionship-posture-1',
          replyText: '我先在旁边看着，你继续就好。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-quiet-companionship-posture-1',
          reply: '我先在旁边看着，你继续就好。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 14,
              text: '我先在旁边看着，你继续就好。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.28,
              prosodyWeight: 0.36,
              beatWeight: 0.32,
              facialHoldMs: 220,
              actionHoldMs: 220,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'soft-interrupt',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createQuietAccompanimentResidentPerformance(),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('quiet-companionship')
    expect(script.speechPlan.interruptPolicy).toBe('soft-settle')
    expect(script.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(script.facePlan.postUtteranceCue).toBe('soft-release')
    expect(script.motionPlan.attentionMode).toBe('ambient')
    expect(script.motionPlan.idleBase).toBe('steady_focus')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('steady_focus')
  })

  it('keeps rest-protective quiet companionship more inward than generic quiet accompaniment on vrm embodiment scripts', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-rest-protective-quiet-vrm-script',
          replyText: '我先轻一点陪着你，让这点疲惫先缓下来。',
        }),
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-rest-protective-quiet-vrm-script',
          reply: '我先轻一点陪着你，让这点疲惫先缓下来。',
          emotion: 'concerned',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 18,
              text: '我先轻一点陪着你，让这点疲惫先缓下来。',
              emotion: 'concerned',
              gestureWeight: 0.16,
              facialWeight: 0.28,
              prosodyWeight: 0.32,
              beatWeight: 0.2,
              facialHoldMs: 180,
              actionHoldMs: 180,
              actionCue: 'steady_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned', 'tired'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: {
        ...createQuietAccompanimentResidentPerformance(),
        performance: {
          ...createQuietAccompanimentResidentPerformance().performance,
          baseEmotion: 'concerned',
          emotion: 'concerned',
          actionCue: 'idle_settle',
        },
        embodiedPresence: 'concerned',
        stance: 'care',
        emotionalTension: 'late-night-drain',
        reasonTags: [
          'subconscious-proactive',
          'silent-observe',
          'continuity:quiet-accompaniment',
          'rest-protective',
          'rest-protective-companionship',
        ],
        signature: 'resident|main-runtime|care|quiet-accompaniment|rest-protective',
      },
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('quiet-companionship')
    expect(script.motionPlan.idleBase).toBe('idle_settle')
    expect(script.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
    expect(script.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(script.facePlan.postUtteranceCue).toBe('soft-release')
  })

  it('keeps audit prose from changing structured resident mode, motion, face, viseme, or settle behavior', () => {
    const seed: BuildAlicizationEmbodimentScriptInput['seed'] = {
      ...createSeed({
        turnId: 'turn-director-audit-prose-inert',
        replyText: '我会按结构化具身状态回应。',
      }),
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focus',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 1,
      },
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-director-audit-prose-inert',
        reply: '我会按结构化具身状态回应。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 13,
            text: '我会按结构化具身状态回应。',
            emotion: 'thinking',
            gestureWeight: 0.2,
            facialWeight: 0.34,
            prosodyWeight: 0.36,
            beatWeight: 0.28,
            mouthWeight: 0.52,
            headWeight: 0.31,
            facialHoldMs: 240,
            actionHoldMs: 210,
            actionCue: 'observe_focus',
            facialCue: 'focus',
            actionWindow: 'none',
            interruptMode: 'continue',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'steady',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              preferredVoiceMode: 'lower-pressure',
              preferredPacingMode: 'slower',
              preferredExpressionAliases: ['soft-gaze'],
              preferredMotionAliases: ['observe_focus'],
            },
            rendererSettle: {
              live2dFacialReleaseMs: 510,
              live2dMotionFollowThroughMs: 520,
              vrmActionFadeMs: 330,
              vrmExpressionBlendMs: 410,
            },
          },
        ],
      },
    }
    const manifest = {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } as any
    const cleanResident: AlicizationResidentPerformanceSnapshot = {
      ...createQuietAccompanimentResidentPerformance(),
      reasonTags: [],
      signature: 'audit-clean',
    }
    const pollutedResident: AlicizationResidentPerformanceSnapshot = {
      ...cleanResident,
      reasonTags: [
        'measured-return',
        'repair-before-closeness',
        'durable-relationship-rhythm',
        'continuity-next-open-window',
        'embodiment:audible-continuity-line',
        'embodiment:body+voice-only',
        'embodiment:still-voiced-face-line',
      ],
      signature: 'resident|continuity|body+voice-only|still-voiced-motion-line|repair-before-closeness',
    }
    const cleanScript = buildAlicizationEmbodimentScript({
      seed,
      manifest,
      residentPerformance: cleanResident,
      rendererTarget: 'live2d',
    })
    const pollutedScript = buildAlicizationEmbodimentScript({
      seed,
      manifest,
      residentPerformance: pollutedResident,
      rendererTarget: 'live2d',
    })
    const projectBehavior = (script: ReturnType<typeof buildAlicizationEmbodimentScript>) => ({
      state: script.state,
      speechPlan: {
        interruptPolicy: script.speechPlan.interruptPolicy,
        segments: script.speechPlan.segments.map(segment => ({
          rendererHints: segment.rendererHints
            ? {
                preferredBlinkCadence: segment.rendererHints.preferredBlinkCadence,
                preferredExpressionAliases: segment.rendererHints.preferredExpressionAliases,
                preferredGazeMode: segment.rendererHints.preferredGazeMode,
                preferredLipsyncMode: segment.rendererHints.preferredLipsyncMode,
                preferredMotionAliases: segment.rendererHints.preferredMotionAliases,
                preferredPacingMode: segment.rendererHints.preferredPacingMode,
                preferredPauseMode: segment.rendererHints.preferredPauseMode,
                preferredVoiceMode: segment.rendererHints.preferredVoiceMode,
                residentMode: segment.rendererHints.residentMode,
              }
            : null,
          rendererSettle: segment.rendererSettle,
        })),
      },
      facePlan: script.facePlan,
      motionPlan: script.motionPlan,
      lipsyncPlan: script.lipsyncPlan,
    })

    expect(projectBehavior(pollutedScript)).toEqual(projectBehavior(cleanScript))
    expect(cleanScript.state.residentMode).toBe('quiet-companionship')
    expect(cleanScript.speechPlan.segments[0]?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 510,
      live2dMotionFollowThroughMs: 520,
      vrmActionFadeMs: 330,
      vrmExpressionBlendMs: 410,
    })
    expect(cleanScript.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(cleanScript.lipsyncPlan.visemeHints?.length).toBeGreaterThan(0)
  })

  it('keeps mixed measured and repair segment motion aligned with each segment mode', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-director-mixed-restrained-modes',
          replyText: '先观察，再收稳。',
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-director-mixed-restrained-modes',
          reply: '先观察，再收稳。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-measured',
              index: 0,
              startOffset: 0,
              endOffset: 4,
              text: '先观察，',
              emotion: 'thinking',
              gestureWeight: 0.2,
              facialWeight: 0.34,
              prosodyWeight: 0.36,
              beatWeight: 0.28,
              facialHoldMs: 240,
              actionHoldMs: 210,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                preferredMotionAliases: ['observe_focus'],
              },
            },
            {
              id: 'segment-repair',
              index: 1,
              startOffset: 4,
              endOffset: 8,
              text: '再收稳。',
              emotion: 'thinking',
              gestureWeight: 0.18,
              facialWeight: 0.3,
              prosodyWeight: 0.32,
              beatWeight: 0.24,
              facialHoldMs: 260,
              actionHoldMs: 230,
              actionCue: 'observe_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
              rendererHints: {
                residentMode: 'repair-before-closeness',
              },
            },
          ],
        },
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'builtin' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: createQuietAccompanimentResidentPerformance(),
      rendererTarget: 'vrm',
    })

    expect(script.state.residentMode).toBe('quiet-companionship')
    expect(script.motionPlan.actionBursts.map(burst => burst.actionCue)).toEqual([
      'steady_focus',
      'steady_focus',
    ])
    expect(script.speechPlan.segments.map(segment => segment.rendererSettle)).toEqual([null, null])
  })

  it('keeps narrative and summary prose from changing structured face and motion hold timing', () => {
    const buildScript = (prose: {
      personaWhySummary: string
      relationshipDoctrine: string
      outcomeSummary: string
      latestInflection: string
    }) => buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-director-narrative-hold-inert',
          replyText: '这次停留时长只由结构化数值决定。',
        }),
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-director-narrative-hold-inert',
          reply: '这次停留时长只由结构化数值决定。',
          emotion: 'concerned',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 17,
              text: '这次停留时长只由结构化数值决定。',
              emotion: 'concerned',
              gestureWeight: 0.22,
              facialWeight: 0.38,
              prosodyWeight: 0.34,
              beatWeight: 0.3,
              facialHoldMs: 260,
              actionHoldMs: 230,
              actionCue: 'steady_focus',
              facialCue: 'focus',
              actionWindow: 'none',
              interruptMode: 'continue',
            },
          ],
        },
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          runtime: {
            watchMode: 'symbiotic-vision',
            sceneScenario: 'coding',
            sceneSummary: 'structured state fixture',
            activeThreadId: 'thread-director-hold',
            activeThreadTitle: 'Director hold timing',
            dominantMode: 'thinking',
            dominantDrive: 'understand',
            answerIntent: 'guide',
            preferredPresence: 'attentive',
            selectedAction: 'hover',
            updatedAt: 1_000,
          },
          architecture: null,
          continuitySignal: null,
          proactive: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
            confidence: 0.72,
            shouldSpeak: false,
            activeThreadId: 'thread-director-hold',
            activeThreadTitle: 'Director hold timing',
            dominantConcernKind: null,
            dominantConcernSummary: null,
            leadingGoalId: null,
            leadingGoalSummary: null,
            preferredPresence: 'attentive',
            personaBias: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
              preferredProactiveStyle: 'silent-observe',
              whySummary: prose.personaWhySummary,
            },
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: prose.relationshipDoctrine,
            },
          },
          memory: null,
          outcomeLearning: {
            reflectionTargetScope: null,
            reflectionSummary: null,
            reflectionLesson: null,
            latestInflection: prose.latestInflection,
            revisionPressure: 0.4,
            autobiographicalStability: 0.7,
            learningReadiness: 0.8,
            contradictionPressure: 0.2,
            dominantTrajectory: 'steady',
            activeLearningFocuses: [],
            evolutionMomentum: 0.9,
            nextLearningAction: null,
            nextLearningReason: null,
            summary: prose.outcomeSummary,
          },
        } as any,
      },
      manifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'concerned'],
        supportedFacialCues: [],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'builtin' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: false,
        supportsMicroDynamics: true,
      } as any,
      residentPerformance: null,
      rendererTarget: 'vrm',
    })
    const cleanScript = buildScript({
      personaWhySummary: 'audit text',
      relationshipDoctrine: 'audit text',
      outcomeSummary: 'audit text',
      latestInflection: 'audit text',
    })
    const pollutedScript = buildScript({
      personaWhySummary: 'observe-first and stay slower until the opening softens',
      relationshipDoctrine: 'keep more room with lower-pressure timing',
      outcomeSummary: 'pressure stayed low during a slower return',
      latestInflection: 'repair should settle before closeness expands',
    })

    expect(pollutedScript.facePlan.speakingCues.map(cue => cue.holdMs))
      .toEqual(cleanScript.facePlan.speakingCues.map(cue => cue.holdMs))
    expect(pollutedScript.motionPlan.actionBursts.map(burst => burst.holdMs))
      .toEqual(cleanScript.motionPlan.actionBursts.map(burst => burst.holdMs))
    expect(cleanScript.lipsyncPlan.mode).toBe('energy-only')
    expect(cleanScript.facePlan.speakingCues[0]?.holdMs).toBeGreaterThan(0)
    expect(cleanScript.motionPlan.actionBursts[0]?.holdMs).toBeGreaterThan(0)
  })

  it('keeps legacy resident renderer cues from changing executable embodiment behavior', () => {
    const text = '我会按当前身体和语音状态回应。'
    const buildScript = (poisoned: boolean) => buildAlicizationEmbodimentScript({
      seed: {
        ...createSeed({
          turnId: 'turn-director-legacy-cue-isolation',
          replyText: text,
        }),
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-director-legacy-cue-isolation',
          reply: text,
          emotion: 'thinking',
          segments: [{
            id: 'segment-director-legacy-cue-isolation',
            index: 0,
            startOffset: 0,
            endOffset: text.length,
            text,
            emotion: 'thinking',
            gestureWeight: 0.24,
            facialWeight: 0.36,
            prosodyWeight: 0.42,
            beatWeight: 0.3,
            mouthWeight: 0.48,
            headWeight: 0.22,
            facialHoldMs: 260,
            actionHoldMs: 220,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 280,
              vrmActionFadeMs: 220,
              vrmExpressionBlendMs: 240,
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            ...(poisoned
              ? {
                  rendererHints: {
                    residentMode: 'measured-return',
                    preferredBlinkCadence: 'linger',
                    preferredGazeMode: 'soften',
                    preferredPauseMode: 'longer',
                    preferredLipsyncMode: 'restrained',
                    preferredVoiceMode: 'lower-pressure',
                    preferredPacingMode: 'slower',
                    preferredExpressionAliases: ['CalmInspect'],
                    preferredMotionAliases: ['ObserveSoft'],
                  } as const,
                }
              : {}),
          }],
        },
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
    const projectBehavior = (script: ReturnType<typeof buildAlicizationEmbodimentScript>) => ({
      state: script.state,
      speechPlan: {
        interruptPolicy: script.speechPlan.interruptPolicy,
        preRollMs: script.speechPlan.preRollMs,
        settleMs: script.speechPlan.settleMs,
        segments: script.speechPlan.segments.map(segment => ({
          interruptPolicy: segment.interruptPolicy,
          preRollMs: segment.preRollMs,
          prosody: segment.prosody,
          rendererSettle: segment.rendererSettle,
          settleMs: segment.settleMs,
        })),
      },
      facePlan: script.facePlan,
      motionPlan: script.motionPlan,
      lipsyncPlan: script.lipsyncPlan,
    })

    expect(projectBehavior(buildScript(true))).toEqual(projectBehavior(buildScript(false)))
  })
})
