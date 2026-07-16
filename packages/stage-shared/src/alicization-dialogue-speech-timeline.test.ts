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
    expect(
      timeline?.segments.some(segment =>
        (segment.mouthWeight ?? 0) >= 0.6 || (segment.headWeight ?? 0) >= 0.6,
      ),
    ).toBe(true)
    expect(timeline?.segments.every(segment => segment.emotion)).toBe(true)
    expect(
      timeline?.segments.every(segment => (segment.rendererHints?.preferredExpressionAliases?.length ?? 0) > 0),
    ).toBe(true)
    expect(
      timeline?.segments.every(segment => (segment.rendererHints?.preferredMotionAliases?.length ?? 0) > 0),
    ).toBe(true)
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
      settleMode: expect.any(String),
      emotionHoldMs: expect.any(Number),
    }))
  })

  it('adds companionship resident-mode renderer aliases for measured-return and repair-before-closeness', () => {
    const measuredReturnTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先慢一点回来。',
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
        variationToken: 'carry-measured-return-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    const repairBeforeClosenessTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先把这一下稳住。',
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
        variationToken: 'carry-repair-before-closeness-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(measuredReturnTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
    expect(repairBeforeClosenessTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['RecoverSoft']),
      preferredMotionAliases: expect.arrayContaining(['StillnessGuard']),
    }))
    expect(measuredReturnTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs).toBeGreaterThanOrEqual(
      repairBeforeClosenessTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect(measuredReturnTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs).toBeGreaterThanOrEqual(
      repairBeforeClosenessTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
    expect(measuredReturnTimeline?.segments[0]?.rendererSettle?.vrmActionFadeMs).toBeGreaterThanOrEqual(
      repairBeforeClosenessTimeline?.segments[0]?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
    expect(repairBeforeClosenessTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs).toBeGreaterThanOrEqual(220)
    expect(repairBeforeClosenessTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs).toBeGreaterThanOrEqual(220)
    expect(repairBeforeClosenessTimeline?.segments[0]?.rendererSettle?.vrmActionFadeMs).toBeGreaterThanOrEqual(180)
  })

  it('adds quieter companionship renderer aliases for quiet-companionship so inward identity-continuity', () => {
    const quietCompanionshipTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先安静陪着，把这条线接稳一点。',
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
        variationToken: 'carry-quiet-companionship-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'quiet-companionship',
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(quietCompanionshipTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['ObserveSoft']),
      preferredMotionAliases: expect.arrayContaining(['StillnessGuard']),
      residentMode: 'quiet-companionship',
    }))
    expect(quietCompanionshipTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs).toBeGreaterThanOrEqual(180)
    expect(quietCompanionshipTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs).toBeGreaterThanOrEqual(160)
    expect(quietCompanionshipTimeline?.segments[0]?.rendererSettle?.vrmActionFadeMs).toBeGreaterThanOrEqual(140)
  })

  it('keeps remembered-seam-more-room closure cues quieter than generic measured-return reopenings', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先认出这还是同一条线，再顺着它慢一点接回来。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      projectState: {
        emotionalClosureCue:
          'identity-continuity',
      } as any,
    })

    expect(timeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
  })

  it('filters warmer renderer aliases back out when same-thread same-her audible carry still needs a lower-pressure baseline', () => {
    const sameHerCarryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我还是沿着这条声音还活着的线慢一点接回来。',
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
        variationToken: 'carry-same-thread-audible-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          signature: 'embodiment:audible-same-her-line',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(sameHerCarryTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredExpressionAliases).not.toEqual(
      expect.arrayContaining(['WarmSmile']),
    )
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredMotionAliases).not.toEqual(
      expect.arrayContaining(['HappyWave']),
    )
  })

  it('filters warmer renderer aliases back out when coordinator-style freeform same-her signatures keep body+voice-only continuity on the surviving living line', () => {
    const sameHerCarryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我还是沿着这条 body 和 voice 还活着的线慢一点接回来。',
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
        variationToken: 'carry-freeform-body-voice-only-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
          reasonTags: ['embodiment:body+voice-only'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(sameHerCarryTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: expect.arrayContaining(['embodiment:body+voice-only']),
    }))
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredExpressionAliases).not.toEqual(
      expect.arrayContaining(['WarmSmile']),
    )
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredMotionAliases).not.toEqual(
      expect.arrayContaining(['HappyWave']),
    )
  })

  it('filters warmer renderer aliases back out when callback companionship resident modes need a lower-pressure baseline', () => {
    const measuredReturnTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先慢一点回来。',
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
        variationToken: 'carry-measured-return-filtered-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['BrightSmile', 'CalmInspect'],
          preferredMotionAliases: ['CheerWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
        embodimentHints: {
          thinking: {
            preferredExpressionAliases: ['BrightSmile', 'CalmInspect'],
            preferredMotionAliases: ['CheerWave', 'ObserveSoft'],
            preferredFacialCues: ['focused'],
            preferredActionCues: ['observe_focus'],
          },
        },
      },
    })

    expect(measuredReturnTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
    expect(measuredReturnTimeline?.segments[0]?.rendererHints?.preferredExpressionAliases).not.toContain('BrightSmile')
    expect(measuredReturnTimeline?.segments[0]?.rendererHints?.preferredMotionAliases).not.toContain('CheerWave')
  })

  it('filters warmer renderer aliases back out when still-voiced face-line carry is the structured identity-continuity', () => {
    const sameHerCarryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条还活着的表情和声音线轻一点回来。',
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
        variationToken: 'carry-still-voiced-face-line-filtered-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          reasonTags: ['embodiment:still-voiced-face-line'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(sameHerCarryTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      reasonTags: expect.arrayContaining(['embodiment:still-voiced-face-line']),
    }))
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredExpressionAliases).not.toEqual(
      expect.arrayContaining(['WarmSmile']),
    )
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredMotionAliases).not.toEqual(
      expect.arrayContaining(['HappyWave']),
    )
  })

  it('keeps an explicit action cue across thinner later segments when still-voiced face-line carry is the surviving identity-continuity', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条还活着的表情和声音线中性可见占位，然后再继续看这一处。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-still-voiced-face-line-preserved-action-cue',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          reasonTags: ['embodiment:still-voiced-face-line'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(timeline?.segments.length).toBeGreaterThan(1)
    expect(timeline?.segments.every(segment => segment.actionCue === 'observe_focus')).toBe(true)
  })

  it('keeps an explicit action cue across thinner later segments when body+voice-only carry is the surviving identity-continuity', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条身体和声音还活着的线中性可见占位，然后再继续看这一处 runtime seam。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-body-voice-only-preserved-action-cue',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
          reasonTags: ['embodiment:body+voice-only'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(timeline?.segments.length).toBeGreaterThan(1)
    expect(timeline?.segments.every(segment => segment.actionCue === 'observe_focus')).toBe(true)
  })

  it('filters warmer renderer aliases back out when signature-only still-voiced motion-line carry is the surviving identity-continuity', () => {
    const sameHerCarryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条还活着的动作和声音线轻一点回来。',
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
        variationToken: 'carry-signature-only-still-voiced-motion-line-filtered-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(sameHerCarryTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredExpressionAliases).not.toEqual(
      expect.arrayContaining(['WarmSmile']),
    )
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredMotionAliases).not.toEqual(
      expect.arrayContaining(['HappyWave']),
    )
  })

  it('keeps an explicit action cue across thinner later segments when signature-only still-voiced motion-line carry is the surviving identity-continuity', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条还活着的动作和声音线中性可见占位，然后再继续看这一处。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-signature-only-still-voiced-motion-line-preserved-action-cue',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(timeline?.segments.length).toBeGreaterThan(1)
    expect(timeline?.segments.every(segment => segment.actionCue === 'observe_focus')).toBe(true)
  })

  it('filters warmer renderer aliases back out when quieter body+lipsync-only carry is the structured identity-continuity', () => {
    const sameHerCarryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条更轻一点的 body 和 lipsync 生命线慢一点回来。',
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
        variationToken: 'carry-body-lipsync-only-filtered-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          reasonTags: ['embodiment:body+lipsync-only'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(sameHerCarryTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      reasonTags: expect.arrayContaining(['embodiment:body+lipsync-only']),
    }))
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredExpressionAliases).not.toEqual(
      expect.arrayContaining(['WarmSmile']),
    )
    expect(sameHerCarryTimeline?.segments[0]?.rendererHints?.preferredMotionAliases).not.toEqual(
      expect.arrayContaining(['HappyWave']),
    )
  })

  it('filters warmer renderer aliases back out when quieter face+lipsync-only and motion+lipsync-only carry are the structured identity-continuity', () => {
    const faceLipsyncCarryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条更轻一点的表情和口型生命线慢一点回来。',
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
        variationToken: 'carry-face-lipsync-only-filtered-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          reasonTags: ['lane=face+lipsync-only'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    const motionLipsyncCarryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条更轻一点的动作和口型生命线慢一点回来。',
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
        variationToken: 'carry-motion-lipsync-only-filtered-renderer-hints',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: -0.05,
          volumeDelta: -0.04,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          reasonTags: ['lane=motion+lipsync-only'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
          preferredMotionAliases: ['HappyWave', 'ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
    })

    expect(faceLipsyncCarryTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      reasonTags: expect.arrayContaining(['lane=face+lipsync-only']),
    }))
    expect(faceLipsyncCarryTimeline?.segments[0]?.rendererHints?.preferredExpressionAliases).not.toEqual(
      expect.arrayContaining(['WarmSmile']),
    )
    expect(faceLipsyncCarryTimeline?.segments[0]?.rendererHints?.preferredMotionAliases).not.toEqual(
      expect.arrayContaining(['HappyWave']),
    )

    expect(motionLipsyncCarryTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      reasonTags: expect.arrayContaining(['lane=motion+lipsync-only']),
    }))
    expect(motionLipsyncCarryTimeline?.segments[0]?.rendererHints?.preferredExpressionAliases).not.toEqual(
      expect.arrayContaining(['WarmSmile']),
    )
    expect(motionLipsyncCarryTimeline?.segments[0]?.rendererHints?.preferredMotionAliases).not.toEqual(
      expect.arrayContaining(['HappyWave']),
    )
  })

  it('keeps measured-return renderer companionship hints on every segment even when the turn splits into thinner later segments', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着刚才那条线轻一点跟回去，先看这一处 runtime seam 怎么继续收口。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-measured-return-thin-segments',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      } as any,
    })

    expect(timeline?.segments.length).toBeGreaterThan(1)
    expect(timeline?.segments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        }),
      }),
    ]))
    expect(timeline?.segments.at(-1)?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
  })

  it('derives measured-return speech embodiment hints directly from project emotional closure carry when no explicit embodiment hints survive', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着同一条线中性可见占位。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'continuity state still settling',
          activeThreadId: 'thread-measured-return-project-closure',
          activeThreadTitle: 'continuity state',
          dominantMode: 'thinking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'hover',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: null,
        embodiment: null,
        memory: null,
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: 'identity-continuity',
      },
    })

    expect(timeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
  })

  it('also carries project-derived callback resident mode into speech settle timing, not only renderer hint labels', () => {
    const reply = '我先沿着同一条线中性可见占位。'
    const measuredReturnTimeline = buildAlicizationDialogueSpeechTimeline({
      reply,
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
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: 'identity-continuity',
      },
    })

    const repairBeforeClosenessTimeline = buildAlicizationDialogueSpeechTimeline({
      reply,
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
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: 'same-her repair seam: keep this return repair-before-closeness on the continuity state before closeness widens again.',
      },
    })

    expect(measuredReturnTimeline?.segments[0]?.rendererHints?.residentMode).toBe('measured-return')
    expect(repairBeforeClosenessTimeline?.segments[0]?.rendererHints?.residentMode).toBe('repair-before-closeness')
    expect(measuredReturnTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs).toBeGreaterThan(
      repairBeforeClosenessTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect(measuredReturnTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs).toBeGreaterThan(
      repairBeforeClosenessTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
    expect(measuredReturnTimeline?.segments[0]?.rendererSettle?.vrmActionFadeMs).toBeGreaterThan(
      repairBeforeClosenessTimeline?.segments[0]?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
  })

  it('keeps same-thread audible carry settle timing more inward than an otherwise similar same-thread baseline on the real closure path', () => {
    const ordinaryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着同一条线中性可见占位。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'same-thread-ordinary-real-closure-path',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: 'identity-continuity',
      },
    })

    const sameHerCarryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着同一条线中性可见占位。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'same-thread-audible-carry-real-closure-path',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
          signature: 'embodiment:audible-same-her-line',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: 'identity-continuity',
      },
    })

    expect(sameHerCarryTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:audible-same-her-line',
    }))
    expect((sameHerCarryTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs ?? 0)).toBeGreaterThan(
      ordinaryTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect((sameHerCarryTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThan(
      ordinaryTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
    expect((sameHerCarryTimeline?.segments[0]?.rendererSettle?.vrmActionFadeMs ?? 0)).toBeGreaterThan(
      ordinaryTimeline?.segments[0]?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
  })

  it('does not let project emotional closure carry override stronger explicit embodiment speech hints', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先把这一处稳住，再继续往前。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'explicit-repair-first-holds-authority',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        } as any,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'project closure is lower-pressure but explicit embodiment already chose repair-first',
          activeThreadId: 'thread-explicit-repair',
          activeThreadTitle: 'repair-first line',
          dominantMode: 'thinking',
          dominantDrive: 'protect',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'hover',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: null,
        embodiment: null,
        memory: null,
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: 'identity-continuity',
      },
    })

    expect(timeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: expect.arrayContaining(['RecoverSoft']),
      preferredMotionAliases: expect.arrayContaining(['StillnessGuard']),
    }))
  })

  it('derives softer callback embodiment hints directly from projectState continuity cadence and explicit blink-gaze preference even when emotional closure cue is absent', () => {
    const ordinaryTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条线中性可见占位。',
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
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: null,
      },
    })

    const softerMeasuredReturnTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条线中性可见占位。',
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
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: null,
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        sameHerHoldDetail: 'identity-continuity',
      },
    })

    const repairFirstTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条线中性可见占位。',
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
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: null,
        continuityCadence: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        sameHerHoldDetail: 'identity-continuity',
      },
    })

    expect(ordinaryTimeline?.segments[0]?.rendererHints?.residentMode).toBeUndefined()
    expect(softerMeasuredReturnTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
    expect(repairFirstTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: expect.arrayContaining(['RecoverSoft']),
      preferredMotionAliases: expect.arrayContaining(['StillnessGuard']),
    }))
    expect((softerMeasuredReturnTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs ?? 0)).toBeGreaterThan(
      ordinaryTimeline?.segments[0]?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect((softerMeasuredReturnTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThan(
      ordinaryTimeline?.segments[0]?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )
    expect((repairFirstTimeline?.segments[0]?.rendererSettle?.vrmActionFadeMs ?? 0)).toBeGreaterThanOrEqual(180)
  })

  it('carries remembered pause and lipsync cadence from projectState closure bias into segment renderer hints', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我先沿着这条线中性可见占位。',
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
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: null,
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        sameHerHoldDetail: 'identity-continuity',
      } as any,
    })

    expect(timeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
    }))
  })

  it('carries lower-pressure voice and slower pacing from projectState closure bias into segment renderer hints', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我会再慢一点，把这条线轻轻接回来。',
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
        emotionalClosureCue: null,
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        sameHerHoldDetail: 'identity-continuity',
      } as any,
    })

    expect(timeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
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

    expect(timeline).not.toBeNull()
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

  it('lets persona observe-first versus direct reconnect bias settle and timing cues under the same delivery', () => {
    const observeFirst = buildAlicizationDialogueSpeechTimeline({
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
          sceneSummary: 'observe first',
          activeThreadId: 'thread-observe',
          activeThreadTitle: 'observe line',
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
          confidence: 0.7,
          shouldSpeak: false,
          activeThreadId: 'thread-observe',
          activeThreadTitle: 'observe line',
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
            manifestationCadenceSummary: 'Observe first and keep the return low-pressure before widening closeness.',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
            whySummary: 'persona prefers observe-first room before a closer move.',
          },
        },
        embodiment: null,
        memory: null,
      },
    })

    const directReconnect = buildAlicizationDialogueSpeechTimeline({
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
          sceneSummary: 'direct reconnect',
          activeThreadId: 'thread-direct',
          activeThreadTitle: 'direct line',
          dominantMode: 'thinking',
          dominantDrive: 'guide',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'whisper',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: {
          selectedAction: 'whisper',
          preferredStyle: 'light-nudge',
          confidence: 0.82,
          shouldSpeak: true,
          activeThreadId: 'thread-direct',
          activeThreadTitle: 'direct line',
          dominantConcernKind: null,
          dominantConcernSummary: null,
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            relationshipPosture: 'guardian',
            initiativeStyle: 'high-participation',
            silenceReconnect: 'direct-approach',
            comfortStyle: 'take-charge',
            preferredProactiveStyle: 'light-nudge',
            manifestationCadenceSummary: 'Direct reconnect can speak first once the opening is real.',
            openingGuidance: 'Open directly with the live answer first and keep the approach lighter.',
            whySummary: 'persona prefers a direct reconnect once the opening is real.',
          },
        },
        embodiment: null,
        memory: null,
      },
    })

    expect(observeFirst?.segments[0]).toBeTruthy()
    expect(directReconnect?.segments[0]).toBeTruthy()
    expect(observeFirst?.segments[0]?.settleMode).not.toBe(directReconnect?.segments[0]?.settleMode)
    expect((observeFirst?.segments[0]?.prosodyWeight ?? 0)).toBeLessThan(directReconnect?.segments[0]?.prosodyWeight ?? 0)
    expect((observeFirst?.segments[0]?.beatWeight ?? 0)).toBeLessThan(directReconnect?.segments[0]?.beatWeight ?? 0)
    expect((observeFirst?.segments[0]?.mouthWeight ?? 0)).toBeLessThan(directReconnect?.segments[0]?.mouthWeight ?? 0)
    expect((observeFirst?.segments[0]?.headWeight ?? 0)).toBeGreaterThan(directReconnect?.segments[0]?.headWeight ?? 0)
  })
})
