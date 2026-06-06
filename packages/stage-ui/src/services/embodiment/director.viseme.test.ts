import type { AlicizationResidentPerformanceSnapshot } from '../../stores/alicization-bridge'
import type { BuildAlicizationEmbodimentScriptInput } from './director'

import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentScript } from './director'

const guidancePerformance = {
  baseEmotion: 'thinking' as const,
  emotion: 'thinking' as const,
  facialCue: 'focused' as const,
  actionCue: 'point_screen' as const,
  delivery: 'gentle' as const,
  emphasis: 2 as const,
}

function createVisemeSeed(replyText: string, segmentText: string): BuildAlicizationEmbodimentScriptInput['seed'] {
  return {
    decisionTraceId: 'trace-viseme',
    turnId: 'turn-viseme',
    replyText,
    performance: guidancePerformance,
    embodiment: null,
    speechTimeline: {
      version: 'speech-timeline-v1' as const,
      variationToken: 'turn-viseme',
      reply: replyText,
      emotion: 'thinking' as const,
      segments: [
        {
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: segmentText.length,
          text: segmentText,
          emotion: 'thinking' as const,
          gestureWeight: 0.42,
          facialWeight: 0.58,
          prosodyWeight: 0.76,
          beatWeight: 0.69,
          facialHoldMs: 360,
          actionHoldMs: 180,
          actionCue: 'point_screen' as const,
          facialCue: 'focused' as const,
          actionWindow: 'segment-start' as const,
          interruptMode: 'soft-interrupt' as const,
        },
      ],
    },
    digitalLife: null,
    digitalLifeSpine: null,
  }
}

function createMeasuredReturnVisemeSeed(input: {
  replyText: string
  segmentText: string
  rendererHints: Record<string, unknown>
  residentReasonTags?: string[]
}): BuildAlicizationEmbodimentScriptInput['seed'] {
  return {
    ...createVisemeSeed(input.replyText, input.segmentText),
    speechTimeline: {
      version: 'speech-timeline-v1' as const,
      variationToken: 'turn-viseme-measured-return',
      reply: input.replyText,
      emotion: 'thinking' as const,
      segments: [
        {
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: input.segmentText.length,
          text: input.segmentText,
          emotion: 'thinking' as const,
          gestureWeight: 0.42,
          facialWeight: 0.58,
          prosodyWeight: 0.76,
          beatWeight: 0.69,
          mouthWeight: 0.55,
          headWeight: 0.4,
          facialHoldMs: 360,
          actionHoldMs: 180,
          actionCue: 'point_screen' as const,
          facialCue: 'focused' as const,
          actionWindow: 'segment-start' as const,
          interruptMode: 'soft-interrupt' as const,
          rendererHints: input.rendererHints,
        },
      ],
    },
    digitalLifeSpine: {
      version: 'digital-life-spine-digest-v1' as const,
      runtime: {
        watchMode: 'symbiotic-vision' as const,
        sceneScenario: 'coding' as const,
        sceneSummary: 'measured-return viseme continuity shaping',
        activeThreadId: 'thread-measured-return',
        activeThreadTitle: 'Measured return continuity',
        dominantMode: 'thinking' as const,
        dominantDrive: 'understand' as const,
        answerIntent: 'guide' as const,
        preferredPresence: 'attentive' as const,
        selectedAction: 'hover' as const,
        updatedAt: 1_000,
      },
      architecture: null,
      continuitySignal: null,
      proactive: {
        selectedAction: 'hover' as const,
        preferredStyle: 'silent-observe' as const,
        confidence: 0.72,
        shouldSpeak: false,
        activeThreadId: 'thread-measured-return',
        activeThreadTitle: 'Measured return continuity',
        dominantConcernKind: null,
        dominantConcernSummary: null,
        leadingGoalId: null,
        leadingGoalSummary: null,
        preferredPresence: 'attentive' as const,
        personaBias: {
          relationshipPosture: 'observer' as const,
          initiativeStyle: 'observant' as const,
          silenceReconnect: 'hold' as const,
          comfortStyle: 'quiet-presence' as const,
          preferredProactiveStyle: 'silent-observe' as const,
          manifestationCadenceSummary: 'persona prefers observe-first room, so measured-return viseme shaping should stay softer until the opening settles.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers an observe-first reconnect before widening outward.',
        },
      },
      embodiment: null,
      memory: null,
    },
  }
}

function createMeasuredReturnResidentPerformance(
  continuityTag:
    | 'embodiment:still-voiced-face-line'
    | 'embodiment:still-voiced-motion-line'
    | 'embodiment:body+lipsync-only',
): AlicizationResidentPerformanceSnapshot {
  return {
    version: 'resident-performance-v1' as const,
    source: 'main-runtime',
    stance: 'accompany',
    embodiedPresence: 'attentive',
    emotionalTension: 'soft-covision',
    confidence: 0.84,
    signature: `resident|main-runtime|accompanying|quiet-accompaniment|${continuityTag}`,
    updatedAt: 1_000,
    performance: {
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'idle_gentle_nod',
      delivery: 'gentle',
      emphasis: 1,
    },
    reasonTags: [
      'continuity:quiet-accompaniment',
      'silent-observe',
      continuityTag,
    ],
  }
}

describe('director viseme hints', () => {
  it('derives authoritative viseme hints from a Chinese guidance segment', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: createVisemeSeed('先看这里，', '先看这里，'),
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

    expect(script.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(script.lipsyncPlan.visemeHints).toEqual([
      { segmentId: 'segment-1', viseme: 'closed', weight: 0.51, source: 'prosody-authority', confidence: 0.94 },
      { segmentId: 'segment-1', viseme: 'O', weight: 0.32, source: 'prosody-authority', confidence: 0.94 },
      { segmentId: 'segment-1', viseme: 'E', weight: 0.34, source: 'prosody-authority', confidence: 0.94 },
    ])
  })

  it('uses softer closed-viseme pressure for comma pauses than for full-stop closures', () => {
    const commaScript = buildAlicizationEmbodimentScript({
      seed: createVisemeSeed('先看这里，', '先看这里，'),
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
    const fullStopScript = buildAlicizationEmbodimentScript({
      seed: createVisemeSeed('先看这里。', '先看这里。'),
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

    const commaClosed = commaScript.lipsyncPlan.visemeHints?.find(hint => hint.segmentId === 'segment-1' && hint.viseme === 'closed')
    const fullStopClosed = fullStopScript.lipsyncPlan.visemeHints?.find(hint => hint.segmentId === 'segment-1' && hint.viseme === 'closed')

    expect(commaClosed).toBeDefined()
    expect(fullStopClosed).toBeDefined()
    expect(fullStopClosed?.weight).toBeGreaterThan(commaClosed?.weight ?? -1)
  })

  it('keeps fallback speech-plan synthesis free of prosody-authority viseme hints', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        ...createVisemeSeed('你好，我们慢慢来。', '你好，我们慢慢来。'),
        speechTimeline: null,
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

    expect(script.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(script.lipsyncPlan.visemeHints).toBeUndefined()
  })

  it('keeps audible same-her measured-return viseme hints softer than an ordinary measured-return line', () => {
    const genericMeasuredReturnScript = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会慢一点接住这句话。',
        segmentText: '我会慢一点接住这句话。',
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
          preferredMotionAliases: ['observe_focus', 'stillness_guard'],
        },
      }),
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
    const audibleSameHerScript = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会慢一点接住这句话。',
        segmentText: '我会慢一点接住这句话。',
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['relaxed', 'soft-gaze'],
          preferredMotionAliases: ['steady_focus', 'idle_settle'],
          signature: 'embodiment:audible-same-her-line',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        },
      }),
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

    const genericHints = genericMeasuredReturnScript.lipsyncPlan.visemeHints ?? []
    const audibleSameHerHints = audibleSameHerScript.lipsyncPlan.visemeHints ?? []

    expect(audibleSameHerHints).toHaveLength(genericHints.length)
    for (const genericHint of genericHints) {
      const audibleSameHerHint = audibleSameHerHints.find(hint => hint.viseme === genericHint.viseme)
      expect(audibleSameHerHint?.weight).toBeLessThan(genericHint.weight)
    }
  })

  it('carries still-voiced face continuity through measured-return script shaping', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会轻一点把这句话接回来。',
        segmentText: '我会轻一点把这句话接回来。',
        rendererHints: {
          preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
          preferredMotionAliases: ['observe_focus', 'stillness_guard'],
          signature: 'embodiment:still-voiced-face-line',
          reasonTags: ['embodiment:still-voiced-face-line'],
        },
      }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createMeasuredReturnResidentPerformance('embodiment:still-voiced-face-line'),
      rendererTarget: 'live2d',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(script.motionPlan.idleBase).toBe('observe_focus')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:still-voiced-face-line',
    }))
    expect(script.speechPlan.segments[0]?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 380,
    }))
  })

  it('uses merged still-voiced face continuity when deriving measured-return viseme hints', () => {
    const genericScript = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会轻一点把这句话接回来。',
        segmentText: '我会轻一点把这句话接回来。',
        rendererHints: {
          preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
          preferredMotionAliases: ['observe_focus', 'stillness_guard'],
        },
      }),
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
    const stillVoicedScript = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会轻一点把这句话接回来。',
        segmentText: '我会轻一点把这句话接回来。',
        rendererHints: {
          preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
          preferredMotionAliases: ['idle_settle', 'stillness_guard'],
          signature: 'embodiment:still-voiced-face-line',
          reasonTags: ['embodiment:still-voiced-face-line'],
        },
      }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createMeasuredReturnResidentPerformance('embodiment:still-voiced-face-line'),
      rendererTarget: 'live2d',
    })

    const genericHints = genericScript.lipsyncPlan.visemeHints ?? []
    const stillVoicedHints = stillVoicedScript.lipsyncPlan.visemeHints ?? []

    expect(stillVoicedScript.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(stillVoicedHints).toHaveLength(genericHints.length)
    for (const genericHint of genericHints) {
      const stillVoicedHint = stillVoicedHints.find(hint => hint.viseme === genericHint.viseme)
      expect(stillVoicedHint?.weight).toBeLessThan(genericHint.weight)
    }
  })

  it('uses merged still-voiced motion continuity when deriving measured-return viseme hints', () => {
    const genericScript = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会轻一点把这句话接回来。',
        segmentText: '我会轻一点把这句话接回来。',
        rendererHints: {
          preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
          preferredMotionAliases: ['observe_focus', 'stillness_guard'],
        },
      }),
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
    const stillVoicedScript = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会轻一点把这句话接回来。',
        segmentText: '我会轻一点把这句话接回来。',
        rendererHints: {
          preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
          preferredMotionAliases: ['idle_settle', 'stillness_guard'],
          signature: 'embodiment:still-voiced-motion-line',
          reasonTags: ['embodiment:still-voiced-motion-line'],
        },
      }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createMeasuredReturnResidentPerformance('embodiment:still-voiced-motion-line'),
      rendererTarget: 'live2d',
    })

    const genericHints = genericScript.lipsyncPlan.visemeHints ?? []
    const stillVoicedHints = stillVoicedScript.lipsyncPlan.visemeHints ?? []

    expect(stillVoicedScript.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(stillVoicedHints).toHaveLength(genericHints.length)
    for (const genericHint of genericHints) {
      const stillVoicedHint = stillVoicedHints.find(hint => hint.viseme === genericHint.viseme)
      expect(stillVoicedHint?.weight).toBeLessThan(genericHint.weight)
    }
  })

  it('carries still-voiced motion continuity through measured-return script shaping', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会轻一点把这句话接回来。',
        segmentText: '我会轻一点把这句话接回来。',
        rendererHints: {
          preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
          preferredMotionAliases: ['observe_focus', 'stillness_guard'],
          signature: 'embodiment:still-voiced-motion-line',
          reasonTags: ['embodiment:still-voiced-motion-line'],
        },
      }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createMeasuredReturnResidentPerformance('embodiment:still-voiced-motion-line'),
      rendererTarget: 'live2d',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(script.motionPlan.idleBase).toBe('observe_focus')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:still-voiced-motion-line',
    }))
    expect(script.speechPlan.segments[0]?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 380,
    }))
  })

  it('uses merged quieter body+lipsync continuity when deriving measured-return viseme hints', () => {
    const genericScript = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会轻一点把这句话接回来。',
        segmentText: '我会轻一点把这句话接回来。',
        rendererHints: {
          preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
          preferredMotionAliases: ['observe_focus', 'stillness_guard'],
        },
      }),
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
    const quieterScript = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会轻一点把这句话接回来。',
        segmentText: '我会轻一点把这句话接回来。',
        rendererHints: {
          preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
          preferredMotionAliases: ['idle_settle', 'stillness_guard'],
          signature: 'embodiment:body+lipsync-only',
          reasonTags: ['embodiment:body+lipsync-only'],
        },
      }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createMeasuredReturnResidentPerformance('embodiment:body+lipsync-only'),
      rendererTarget: 'live2d',
    })

    const genericHints = genericScript.lipsyncPlan.visemeHints ?? []
    const quieterHints = quieterScript.lipsyncPlan.visemeHints ?? []

    expect(quieterScript.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(quieterHints).toHaveLength(genericHints.length)
    for (const genericHint of genericHints) {
      const quieterHint = quieterHints.find(hint => hint.viseme === genericHint.viseme)
      expect(quieterHint?.weight).toBeLessThan(genericHint.weight)
    }
  })

  it('carries quieter body+lipsync continuity through measured-return script shaping', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: createMeasuredReturnVisemeSeed({
        replyText: '我会轻一点把这句话接回来。',
        segmentText: '我会轻一点把这句话接回来。',
        rendererHints: {
          preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
          preferredMotionAliases: ['observe_focus', 'stillness_guard'],
          signature: 'embodiment:body+lipsync-only',
          reasonTags: ['embodiment:body+lipsync-only'],
        },
      }),
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: createMeasuredReturnResidentPerformance('embodiment:body+lipsync-only'),
      rendererTarget: 'live2d',
    })

    expect(script.state.residentMode).toBe('measured-return')
    expect(script.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(script.motionPlan.idleBase).toBe('observe_focus')
    expect(script.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:body+lipsync-only',
    }))
    expect(script.speechPlan.segments[0]?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 380,
    }))
  })
})
