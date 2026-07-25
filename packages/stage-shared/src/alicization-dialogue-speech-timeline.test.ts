import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDialogueSpeechTimeline,
  normalizeAlicizationDialogueSpeechTimeline,
} from './alicization-dialogue-speech-timeline'

describe('alicization dialogue speech timeline', () => {
  it('builds micro-dynamic cues for mouth, head, and hold windows', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里，然后点保存！',
      candidateEmotion: 'happy',
      candidatePerformance: {
        baseEmotion: 'happy',
        emotion: 'happy',
        facialCue: 'smile',
        actionCue: 'point_screen',
        delivery: 'energetic',
        emphasis: 2,
      },
    })

    expect(timeline).not.toBeNull()
    expect(timeline?.segments.length).toBeGreaterThan(0)
    expect(timeline?.segments.every(segment => (segment.mouthWeight ?? 0) > 0)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.headWeight ?? 0) > 0)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.facialHoldMs ?? 0) >= 90)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.actionHoldMs ?? 0) >= 70)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.emotionHoldMs ?? 0) >= 80)).toBe(true)
    expect(timeline?.segments.every(segment => segment.settleMode)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.rendererSettle?.live2dFacialReleaseMs ?? 0) >= 80)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.rendererSettle?.vrmExpressionBlendMs ?? 0) >= 60)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.rendererSettle?.vrmActionFadeMs ?? 0) >= 80)).toBe(true)
    expect(timeline?.segments.every(segment => segment.emotion)).toBe(true)
  })

  it('biases segment cue and renderer intent from manifest embodiment hints', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '你先看这里，好吗？',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'firm',
        emphasis: 1,
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
        embodimentHints: {
          thinking: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
            preferredFacialCues: ['focused'],
            preferredActionCues: ['observe_focus'],
          },
        },
      },
    })

    expect(timeline?.segments[0]).toEqual(expect.objectContaining({
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'observe_focus',
      rendererHints: expect.objectContaining({
        preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
        preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      }),
      rendererSettle: expect.objectContaining({
        live2dFacialReleaseMs: expect.any(Number),
        live2dMotionFollowThroughMs: expect.any(Number),
        vrmActionFadeMs: expect.any(Number),
        vrmExpressionBlendMs: expect.any(Number),
      }),
    }))
  })

  it('keeps explicit resident modes authoritative for aliases and settle timing', () => {
    const buildTimeline = (
      residentMode: 'measured-return' | 'quiet-companionship' | 'repair-before-closeness',
    ) => {
      return buildAlicizationDialogueSpeechTimeline({
        reply: '我先把这一处稳住，然后再继续看下一处。',
        candidateEmotion: 'thinking',
        candidatePerformance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        embodiment: {
          emotion: 'thinking',
          variationToken: `structured-${residentMode}`,
          postureHint: 'attentive',
          speechStyle: {
            rateMultiplier: 1,
            pitchDelta: 0,
          },
          rendererHints: {
            residentMode,
          },
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'steady_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
        },
      })
    }

    const measuredReturnTimeline = buildTimeline('measured-return')
    const repairTimeline = buildTimeline('repair-before-closeness')
    const quietTimeline = buildTimeline('quiet-companionship')

    expect(measuredReturnTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      residentMode: 'measured-return',
    }))
    expect(repairTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['RecoverSoft']),
      preferredMotionAliases: expect.arrayContaining(['StillnessGuard']),
      residentMode: 'repair-before-closeness',
    }))
    expect(quietTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['ObserveSoft']),
      preferredMotionAliases: expect.arrayContaining(['StillnessGuard']),
      residentMode: 'quiet-companionship',
    }))
    expect(measuredReturnTimeline?.segments.length).toBeGreaterThan(1)
    expect(measuredReturnTimeline?.segments.every((segment) => {
      return segment.actionCue === 'steady_focus'
        && segment.rendererHints?.residentMode === 'measured-return'
    })).toBe(true)
    expect(measuredReturnTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs).toBeGreaterThan(
      repairTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
  })

  it('keeps closure prose and renderer audit text from changing renderer or timing behavior', () => {
    const speechInput = {
      reply: '我先看这一处，然后再继续看下一处。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    } as const

    const cleanClosureTimeline = buildAlicizationDialogueSpeechTimeline({
      ...speechInput,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: null,
      },
    })
    const pollutedClosureTimeline = buildAlicizationDialogueSpeechTimeline({
      ...speechInput,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: 'same-her repair-before-closeness remembered seam lower-pressure more room this time; leave more room and do not reopen from scratch',
      },
    })

    const buildAuditTimeline = (audit: { reasonTags?: string[], signature?: string } = {}) => {
      return buildAlicizationDialogueSpeechTimeline({
        ...speechInput,
        embodiment: {
          emotion: 'thinking',
          variationToken: 'renderer-audit-only',
          postureHint: 'attentive',
          speechStyle: {
            rateMultiplier: 1,
            pitchDelta: 0,
          },
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
            preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
            ...audit,
          },
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
        },
      })
    }

    const cleanAuditTimeline = buildAuditTimeline()
    const pollutedAuditTimeline = buildAuditTimeline({
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only|still-voiced-motion-line',
      reasonTags: [
        'embodiment:body-lipsync-voice-rejoin',
        'embodiment:body+voice-only',
        'embodiment:still-voiced-face-line',
        'lane=face+lipsync-only',
      ],
    })

    expect(pollutedClosureTimeline).toEqual(cleanClosureTimeline)
    expect(pollutedAuditTimeline).toEqual(cleanAuditTimeline)
    expect(pollutedAuditTimeline?.segments.every((segment) => {
      return segment.rendererHints?.signature === undefined
        && segment.rendererHints?.reasonTags === undefined
    })).toBe(true)
    expect(pollutedAuditTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['WarmSmile', 'CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['HappyWave', 'ObserveSoft']),
    }))
  })

  it('applies explicit project continuity cadence and preferred renderer modes', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我会再慢一点，把这一处接回来。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        emotionalClosureCue: 'audit text only',
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
    })

    expect(timeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
  })

  it('normalizes and clamps extended micro-dynamic fields from transport payloads', () => {
    const timeline = normalizeAlicizationDialogueSpeechTimeline({
      version: 'speech-timeline-v1',
      reply: '测试一下！',
      emotion: 'surprised',
      segments: [
        {
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '测试一下！',
          emotion: 'thinking',
          gestureWeight: 1.5,
          facialWeight: -1,
          prosodyWeight: 2,
          beatWeight: 0.6,
          mouthWeight: 5,
          headWeight: -3,
          facialHoldMs: 5000,
          actionHoldMs: -12,
          emotionHoldMs: 5000,
          settleMode: 'linger',
          rendererSettle: {
            live2dFacialReleaseMs: 5000,
            live2dMotionFollowThroughMs: 5000,
            vrmActionFadeMs: 5000,
            vrmExpressionBlendMs: 5000,
          },
          rendererHints: {
            preferredExpressionAliases: [' CalmInspect ', 'CalmInspect'],
            preferredMotionAliases: [' ObserveSoft '],
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
          },
          actionCue: 'point_screen',
          facialCue: 'wide-eye',
          actionWindow: 'cadence-peak',
          interruptMode: 'hard-interrupt',
        },
      ],
    })

    expect(timeline?.segments[0]).toMatchObject({
      emotion: 'thinking',
      mouthWeight: 1,
      headWeight: 0,
      facialHoldMs: 920,
      actionHoldMs: 70,
      emotionHoldMs: 960,
      settleMode: 'linger',
      rendererSettle: {
        live2dFacialReleaseMs: 1600,
        live2dMotionFollowThroughMs: 1200,
        vrmActionFadeMs: 1200,
        vrmExpressionBlendMs: 960,
      },
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
    })
  })

  it('lets structured persona timing bias shape ordinary speech cadence', () => {
    const buildTimeline = (silenceReconnect: 'direct-approach' | 'hold') => {
      return buildAlicizationDialogueSpeechTimeline({
        reply: '继续吧。',
        candidateEmotion: 'thinking',
        candidatePerformance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          runtime: {
            watchMode: 'symbiotic-vision',
            sceneScenario: 'coding',
            sceneSummary: 'structured persona cadence',
            activeThreadId: 'thread-persona-cadence',
            activeThreadTitle: 'persona cadence',
            dominantMode: 'thinking',
            dominantDrive: 'understand',
            answerIntent: 'guide',
            preferredPresence: 'attentive',
            selectedAction: silenceReconnect === 'hold' ? 'hover' : 'whisper',
            updatedAt: 1_000,
          },
          architecture: null,
          continuitySignal: null,
          proactive: {
            selectedAction: silenceReconnect === 'hold' ? 'hover' : 'whisper',
            preferredStyle: silenceReconnect === 'hold' ? 'silent-observe' : 'light-nudge',
            confidence: 0.8,
            shouldSpeak: silenceReconnect !== 'hold',
            activeThreadId: 'thread-persona-cadence',
            activeThreadTitle: 'persona cadence',
            dominantConcernKind: null,
            dominantConcernSummary: null,
            leadingGoalId: null,
            leadingGoalSummary: null,
            preferredPresence: 'attentive',
            personaBias: {
              relationshipPosture: silenceReconnect === 'hold' ? 'observer' : 'guardian',
              initiativeStyle: silenceReconnect === 'hold' ? 'observant' : 'high-participation',
              silenceReconnect,
              comfortStyle: silenceReconnect === 'hold' ? 'quiet-presence' : 'take-charge',
              preferredProactiveStyle: silenceReconnect === 'hold' ? 'silent-observe' : 'light-nudge',
              manifestationCadenceSummary: 'audit summary',
              openingGuidance: 'audit guidance',
              whySummary: 'audit reason',
            },
          },
          embodiment: null,
          memory: null,
        },
      })
    }

    const observeFirst = buildTimeline('hold')
    const directReconnect = buildTimeline('direct-approach')

    expect(observeFirst?.segments[0]?.settleMode).not.toBe(directReconnect?.segments[0]?.settleMode)
    expect((observeFirst?.segments[0]?.prosodyWeight ?? 0)).toBeLessThan(
      directReconnect?.segments[0]?.prosodyWeight ?? 0,
    )
    expect((observeFirst?.segments[0]?.headWeight ?? 0)).toBeGreaterThan(
      directReconnect?.segments[0]?.headWeight ?? 0,
    )
  })
})
