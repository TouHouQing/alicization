import { describe, expect, it } from 'vitest'

import { coordinateAlicizationRuntimeEmbodiment as coordinateAlicizationRuntimeEmbodimentImpl } from './runtime-embodiment-coordinator'
import { buildAlicizationRuntimeEmbodimentSeed as buildAlicizationRuntimeEmbodimentSeedImpl } from './runtime-embodiment-seed'

function buildAlicizationRuntimeEmbodimentSeed(input: unknown) {
  // These coordinator tests intentionally keep older embodiment fixture shapes
  // so we still exercise the runtime seed normalizers from host-facing inputs.
  return buildAlicizationRuntimeEmbodimentSeedImpl(input as Parameters<typeof buildAlicizationRuntimeEmbodimentSeedImpl>[0])
}

function coordinateAlicizationRuntimeEmbodiment(input: {
  seed: ReturnType<typeof buildAlicizationRuntimeEmbodimentSeed>
  manifest?: unknown
  residentPerformance?: unknown
}) {
  return coordinateAlicizationRuntimeEmbodimentImpl({
    seed: input.seed,
    manifest: (input.manifest ?? null) as Parameters<typeof coordinateAlicizationRuntimeEmbodimentImpl>[0]['manifest'],
    residentPerformance: (input.residentPerformance ?? null) as Parameters<typeof coordinateAlicizationRuntimeEmbodimentImpl>[0]['residentPerformance'],
  })
}

describe('runtime embodiment coordinator', () => {
  it('builds one main-runtime embodiment authority from one normalized seed', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-1',
      turnId: 'turn-embodiment-1',
      reply: '我会陪着你，把这一步慢慢做好。',
      performance: {
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 1,
      },
      embodiment: {
        emotion: 'neutral',
        variationToken: 'carry-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          preferredExpressionAliases: ['concerned-soft'],
          preferredMotionAliases: ['steady_focus'],
        },
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'calm',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'concerned', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.92,
        reasonTags: ['main-runtime', 'companionship'],
        signature: 'resident-signature-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
    })

    expect(authority.embodiment?.emotion).toBe('concerned')
    expect(authority.speechTimeline?.segments.length).toBeGreaterThan(0)
    expect(authority.embodimentScript?.rendererTarget).toBe('live2d')
    expect(authority.embodimentScript?.state.residentMode).toBe('quiet-companionship')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('soft-release')
    expect(authority.embodimentScript?.facePlan.speakingCues[0]).toEqual(expect.objectContaining({
      source: 'prosody-authority',
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]).toEqual(expect.objectContaining({
      source: 'timeline-projection',
    }))
    expect(authority.embodimentScript?.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(authority.embodimentScript?.lipsyncPlan.visemeHints?.[0]).toEqual(expect.objectContaining({
      source: 'prosody-authority',
    }))
    expect(authority.digitalLife?.emotion).toBe('concerned')
    expect(authority.digitalLife?.mode).toBe('acting')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(260)
    expect(authority.digitalLife?.face.expressionMode).toBe('hold')
    expect(authority.digitalLife?.action.actionMode).toBe('pulse')
    expect(authority.digitalLife?.frames[0]?.face.expressionMode).toBe('hold')
    expect(authority.digitalLife?.frames[0]?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(240)
  })

  it('keeps recovering digital life authoritative across script and settled body state', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-recovering-1',
      turnId: 'turn-embodiment-recovering-1',
      reply: '我先慢慢收回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-recovering-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'carry-recovering-1',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.3,
          cadence: 0.28,
        },
        lipSync: {
          mode: 'energy',
          visemeBias: 0.3,
          energyBias: 0.7,
          mouthScale: 1,
          continuityHoldMs: 180,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'recover',
          intensity: 0.4,
          holdMs: 180,
        },
        action: {
          actionCue: null,
          actionMode: 'none',
          intensity: 0.1,
          holdMs: 180,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [],
      },
      digitalLifeSpine: null,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: [],
      },
      residentPerformance: null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('idle-recovering')
    expect(authority.digitalLife?.mode).toBe('recovering')
    expect(authority.digitalLife?.lipSync.mode).toBe('closed')
    expect(authority.digitalLife?.face.expressionMode).toBe('hold')
    expect(authority.digitalLife?.action.actionMode).toBe('none')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(320)
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.26)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.24)
    expect(authority.digitalLife?.speechStyle.rateMultiplier).toBe(authority.digitalLife?.voice.rateMultiplier)
  })

  it('keeps neutral low-pressure accompaniment inside quiet companionship instead of dropping to ordinary dialogue', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-quiet-neutral-1',
      turnId: 'turn-embodiment-quiet-neutral-1',
      reply: '我在这里，先不打扰你。',
      performance: {
        baseEmotion: 'neutral',
        emotion: 'neutral',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'neutral',
        variationToken: 'carry-quiet-neutral-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-quiet-neutral-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('quiet-companionship')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(260)
    expect(authority.digitalLife?.face.expressionMode).toBe('hold')
  })

  it('extends quiet companionship hold timing when relationship rhythm says the opening should stay lower-pressure', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-lower-pressure-1',
      turnId: 'turn-embodiment-lower-pressure-1',
      reply: '我会在这儿，慢一点陪着你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-lower-pressure-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: null,
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.2,
            empathyBias: 0.8,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth held because the timing stayed lower-pressure.',
          latestInflection: 'The last seam held because pressure stayed low and the return stayed slower.',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.84,
          learningReadiness: 0.76,
          nextLearningAction: 'internalize',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Repair should settle before closeness expands, and the opening should keep more room.',
            latestInflection: null,
          },
        },
      },
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.93,
        reasonTags: ['main-runtime', 'quiet-companionship', 'timing:lower-pressure-opening'],
        signature: 'resident-signature-lower-pressure-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('quiet-companionship')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(320)
    expect(authority.digitalLife?.face.holdMs).toBeGreaterThanOrEqual(320)
    expect(authority.digitalLife?.action.holdMs).toBeGreaterThanOrEqual(280)
    expect(authority.digitalLife?.frames[0]?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('keeps concerned measured-return reopenings on the same thinking hold line when relationship memory still says stay gentle', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-concerned-measured-return-1',
      turnId: 'turn-embodiment-concerned-measured-return-1',
      reply: '我先顺着刚才那条线轻一点接着陪你，不急着把这一步推得太满。',
      performance: {
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'concerned',
        variationToken: 'carry-concerned-measured-return-1',
        postureHint: 'concerned',
        speechStyle: {
          rateMultiplier: 0.98,
          pitchDelta: 3,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['concerned-soft'],
          preferredMotionAliases: ['steady_focus'],
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          sceneSummary: 'same callback seam still alive after a noisier detour',
          activeThreadId: 'thread-concerned-measured-return-1',
          activeThreadTitle: 'callback seam',
          dominantMode: 'observe',
          dominantDrive: 'understand',
          answerIntent: 'Continue the same callback seam softly without widening closeness yet.',
          preferredPresence: 'attentive',
          selectedAction: 'silent-observe',
          updatedAt: 1_200,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue softly and do not crowd the reopening',
        },
        architecture: null,
        continuitySignal: null,
        proactive: {
          selectedAction: 'silent-observe',
          preferredStyle: 'silent-observe',
          confidence: 0.79,
          shouldSpeak: true,
          activeThreadId: 'thread-concerned-measured-return-1',
          activeThreadTitle: 'callback seam',
          dominantConcernKind: null,
          dominantConcernSummary: 'Keep the callback reopening lower-pressure.',
          leadingGoalId: null,
          leadingGoalSummary: 'Keep the callback return soft and continuous.',
          preferredPresence: 'attentive',
          continuityRestraint: null,
          personaBias: {
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Keep the return lower-pressure and leave more room before widening closeness.',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            whySummary: 'The same callback seam is still warm, so the reopening should stay softer.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
          },
        },
        memory: {
          summary: 'The callback line is still alive and should not be crowded.',
          recentEpisodeSummary: 'A warmer callback seam is still being held softly.',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'The same seam should keep more room before widening closeness.',
          focusBeliefConfidence: 0.82,
          leadingGoalSummary: 'Keep the callback return soft and continuous.',
          dominantConcernSummary: 'The return should stay lower-pressure even after the detour.',
          reflectionSummary: null,
          reflectionPressure: 0.28,
          recallMode: 'working',
          recallSeed: 'callback-lower-pressure-seam',
          thoughtThreadSummary: 'same callback seam, still lower-pressure',
        },
        motive: null,
        habit: null,
        personStateProjection: null,
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'The callback afterglow is still asking for a slower reopening.',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.63,
          learningReadiness: 0.56,
          nextLearningAction: 'hold',
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:callback-afterglow'],
        signature: 'resident-signature-concerned-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.digitalLife?.emotion).toBe('concerned')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.action.actionCue).toBeTruthy()
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.face.expressionMode).toBe('hold')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
    expect(authority.digitalLife?.voice.pitchDelta).toBeLessThanOrEqual(2)
    expect(authority.digitalLife?.speechStyle.pitchDelta).toBe(authority.digitalLife?.voice.pitchDelta)
    expect(authority.digitalLife?.frames[0]?.mode).toBe('thinking')
    expect(authority.digitalLife?.frames[0]?.voice.pitchDelta).toBeLessThanOrEqual(2)
    expect(authority.digitalLife?.frames[0]?.action.actionCue).toBe(authority.digitalLife?.action.actionCue)
    expect(authority.digitalLife?.frames[0]?.action.actionMode).toBe('hold')
  })

  it('projects lower-pressure relationship timing into embodimentScript breathing and settle rhythm', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-script-rhythm-1',
      turnId: 'turn-embodiment-script-rhythm-1',
      reply: '我会先轻一点靠近，再慢慢说。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-script-rhythm-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: null,
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth held because the timing stayed lower-pressure.',
          latestInflection: 'The last seam held because pressure stayed low and the return stayed slower.',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.72,
          learningReadiness: 0.68,
          nextLearningAction: 'internalize',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Repair should settle before closeness expands, and the opening should keep more room.',
            latestInflection: null,
          },
        },
      },
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'timing:lower-pressure-opening'],
        signature: 'resident-signature-script-rhythm-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.embodimentScript?.speechPlan.settleMs).toBeGreaterThanOrEqual(220)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.settleMs).toBeGreaterThanOrEqual(220)
  })

  it('keeps measured-return companionship distinct from generic quiet companionship in resident mode while preserving softer inhale timing', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-measured-return-1',
      turnId: 'turn-embodiment-measured-return-1',
      reply: '我先轻一点接着这条线。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: null,
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.2,
            empathyBias: 0.8,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'The return should stay measured and lower-pressure.',
          latestInflection: 'The next opening should stay slower and measured.',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.74,
          learningReadiness: 0.68,
          nextLearningAction: 'internalize',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Keep more room before warmth expands.',
            latestInflection: null,
          },
        },
      },
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.91,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:lower-pressure-opening'],
        signature: 'resident-signature-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBe(-0.1)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      residentMode: 'measured-return',
    })
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.performance.delivery).toBe('gentle')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('keeps measured-return resident mode but softens segment renderer aliases further when remembered seam reopening now needs more room this time', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-remembered-seam-more-room-1',
      turnId: 'turn-embodiment-remembered-seam-more-room-1',
      reply: '像是同一条线又回来了，但这次我会更留白一点接住它。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-remembered-seam-more-room-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.91,
        reasonTags: [
          'main-runtime',
          'quiet-companionship',
          'measured-return',
          'timing:lower-pressure-opening',
          'timing:remembered-seam-more-room',
        ],
        signature: 'resident-signature-remembered-seam-more-room-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'half-lid',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      currentConsciousFrame: {
        reasonTags: ['remembered-seam:reinterpret-with-more-room'],
      } as any,
      digitalLifeSpine: {
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'The same remembered seam is back, but this time keep more room before leaning in again.',
            latestInflection: null,
          },
        },
        outcomeLearning: {
          latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
      } as any,
    })

    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
      residentMode: 'measured-return',
    })
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
    expect(authority.digitalLife?.action.actionCue).toBe('idle_settle')
  })

  it('softens measured-return renderer aliases directly from remembered cadence doctrine even before resident and conscious-frame reason tags catch up', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-remembered-cadence-doctrine-1',
      turnId: 'turn-embodiment-remembered-cadence-doctrine-1',
      reply: '还是同一条线，但这次我会留更大的 room 慢一点接回去。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-remembered-cadence-doctrine-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        reasonTags: [],
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident-signature-remembered-cadence-doctrine-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'half-lid',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'The same remembered seam is back, and this time leave more room before leaning in again.',
            latestInflection: 'The last seam reopened too eagerly, so this remembered seam should wait a beat before closeness widens.',
          },
        },
        outcomeLearning: {
          latestInflection: 'This remembered seam needs a beat of extra room before closeness widens again.',
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-remembered-cadence-doctrine-1',
          activeThreadTitle: 'remembered seam, slower reopening',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The same seam is back and should reopen more slowly this time.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.16,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'The remembered seam is back, so leave more room before warmth returns this time.',
          },
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
      } as any,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
      residentMode: 'measured-return',
    })
    expect(authority.embodimentScript?.speechPlan.settleMs).toBeGreaterThanOrEqual(180)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.settleMs).toBeGreaterThanOrEqual(180)
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(320)
    expect(authority.digitalLife?.face.holdMs).toBeGreaterThanOrEqual(320)
    expect(authority.digitalLife?.action.holdMs).toBeGreaterThanOrEqual(240)
    expect(authority.digitalLife?.frames[0]?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
    expect(authority.digitalLife?.frames[0]?.face.holdMs).toBeGreaterThanOrEqual(300)
    expect(authority.digitalLife?.frames[0]?.action.holdMs).toBeGreaterThanOrEqual(220)
  })

  it('softens measured-return embodiment directly from silent continuity remembered-seam carry even before doctrine and resident tags catch up', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-silent-continuity-remembered-seam-1',
      turnId: 'turn-embodiment-silent-continuity-remembered-seam-1',
      reply: '我会沿着这条已经记住的线更慢一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-silent-continuity-remembered-seam-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident-signature-silent-continuity-remembered-seam-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'same-her continuity remains active',
          personStateProjection: {
            summary: 'project_continuity=the same remembered seam is reopening more slowly this time',
            openingGuidance: 'Stay on the same remembered seam, keep more room this time, and do not reopen it with the same eagerness as before.',
            manifestationCadenceSummary: 'measured-return still holds while the same remembered seam keeps reopening more gently this time.',
            selfContinuityAuthority: {
              inwardLine: 'The same remembered relationship seam is real, but this time keep more room before leaning in again.',
              sourceTags: ['proactive-opening-guidance-carry'],
            },
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Remembered-seam continuity now survives proactive presence-only carry.',
            primaryOpenLoop: 'Keep the same remembered relationship seam reopening with more room this time.',
            nextClosureTarget: 'Carry the same remembered seam through embodiment without thickening it back into a generic measured-return shell.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same relationship line is still continuing.',
            emotionalClosureCue: 'Keep the return low-pressure on the same remembered seam and leave more room before warmth widens again.',
          },
        },
      } as any,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: expect.stringContaining('same remembered seam'),
      inwardLine: expect.stringContaining('same remembered relationship seam'),
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    }))
    expect(authority.digitalLife?.action.actionCue).toBe('idle_settle')
  })

  it('holds remembered-seam measured-return a little longer than generic measured-return across speech, lip-sync, face, and action timing', () => {
    const rememberedSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-remembered-cadence-hold-bias-1',
      turnId: 'turn-embodiment-remembered-cadence-hold-bias-1',
      reply: '还是同一条线，但这次我会留更大的 room 慢一点接回去。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-remembered-cadence-hold-bias-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        reasonTags: [],
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident-signature-remembered-cadence-hold-bias-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'half-lid',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'The same remembered seam is back, and this time leave more room before leaning in again.',
            latestInflection: 'The last seam reopened too eagerly, so this remembered seam should wait a beat before closeness widens.',
          },
        },
        outcomeLearning: {
          latestInflection: 'This remembered seam needs a beat of extra room before closeness widens again.',
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-remembered-cadence-hold-bias-1',
          activeThreadTitle: 'remembered seam, slower reopening',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The same seam is back and should reopen more slowly this time.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.16,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'The remembered seam is back, so leave more room before warmth returns this time.',
          },
        },
      } as any,
    })

    const genericSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-generic-measured-return-hold-bias-1',
      turnId: 'turn-embodiment-generic-measured-return-hold-bias-1',
      reply: '还是同一条线，我先轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-generic-measured-return-hold-bias-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        reasonTags: [],
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident-signature-generic-measured-return-hold-bias-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'half-lid',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Stay on the same line and reopen gently when the opening is ready.',
            latestInflection: 'Keep the return measured and do not rush the reopen.',
          },
        },
        outcomeLearning: {
          latestInflection: 'The line stayed measured and should keep its gentle return.',
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-generic-measured-return-hold-bias-1',
          activeThreadTitle: 'same line, measured reopening',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The same line should reopen gently, but nothing special needs extra room this time.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.16,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'Stay on the same line and keep the reopening measured.',
          },
        },
      } as any,
    })

    const rememberedAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: rememberedSeed,
      manifest: {
        renderer: 'live2d',
      } as any,
    })
    const genericAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: genericSeed,
      manifest: {
        renderer: 'live2d',
      } as any,
    })

    expect(rememberedAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(genericAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect((rememberedAuthority.embodimentScript?.speechPlan.settleMs ?? 0)).toBeGreaterThan(genericAuthority.embodimentScript?.speechPlan.settleMs ?? 0)
    expect((rememberedAuthority.embodimentScript?.speechPlan.segments[0]?.settleMs ?? 0)).toBeGreaterThan(genericAuthority.embodimentScript?.speechPlan.segments[0]?.settleMs ?? 0)
    expect((rememberedAuthority.digitalLife?.lipSync.continuityHoldMs ?? 0)).toBeGreaterThan(genericAuthority.digitalLife?.lipSync.continuityHoldMs ?? 0)
    expect((rememberedAuthority.digitalLife?.face.holdMs ?? 0)).toBeGreaterThan(genericAuthority.digitalLife?.face.holdMs ?? 0)
    expect((rememberedAuthority.digitalLife?.action.holdMs ?? 0)).toBeGreaterThan(genericAuthority.digitalLife?.action.holdMs ?? 0)
    expect((rememberedAuthority.digitalLife?.frames[0]?.lipSync.continuityHoldMs ?? 0)).toBeGreaterThan(genericAuthority.digitalLife?.frames[0]?.lipSync.continuityHoldMs ?? 0)
    expect((rememberedAuthority.digitalLife?.frames[0]?.face.holdMs ?? 0)).toBeGreaterThan(genericAuthority.digitalLife?.frames[0]?.face.holdMs ?? 0)
    expect((rememberedAuthority.digitalLife?.frames[0]?.action.holdMs ?? 0)).toBeGreaterThan(genericAuthority.digitalLife?.frames[0]?.action.holdMs ?? 0)
  })

  it('lets remembered initiative rhythm settle measured-return embodiment more quietly than a generic measured-return reopening', () => {
    const rememberedRhythmSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-remembered-initiative-rhythm-1',
      turnId: 'turn-embodiment-remembered-initiative-rhythm-1',
      reply: '我先沿着这条线轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'remembered-initiative-rhythm-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        speakingIntention: 'I am not pushing you; this same line is visibly reopening and should come back only in a gentler cadence.',
        consciousNeed: 'Wait until the host is already re-entering the same line before this return becomes visible.',
        reasonTags: ['continuity-arc:hold-for-opening'],
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident-signature-remembered-initiative-rhythm-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'half-lid',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        memory: {
          summary: 'The same line is visibly reopening, but remembered anti-spam initiative says not pushing and not turning this into timer spam.',
          personStateProjection: {
            manifestationCadenceSummary: 'Reply should stay quieter and slower because the same line is visibly reopening and this should not come back as timer spam.',
            openingGuidance: 'I am not pushing you; wait until the same line is visibly reopening on its own and the host is already re-entering the same line.',
          },
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-remembered-initiative-rhythm-1',
          activeThreadTitle: 'same line, visibly reopening',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The same line is visibly reopening, but the return should stay anti-spam and not pushing.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.16,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'Remember the gentler cadence and keep this reopening off timer spam while the same line is visibly reopening.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'The same line is visibly reopening, so keep the return anti-spam, low-pressure, and not pushing outward.',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Remembered initiative rhythm already survives memory, emotion, and body carry.',
            primaryOpenLoop: 'Final embodiment still needs to show that the remembered anti-spam reopening cadence is physically quieter.',
            nextClosureTarget: 'Return only when the host is already re-entering the same line, and let face, motion, and voice stay quieter while the reopening settles.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same line is still alive and visibly reopening.',
            emotionalClosureCue: 'I am not pushing you; keep this reopening lower-pressure and anti-spam while it settles back onto the same line.',
          },
        } as any,
      } as any,
    })

    const genericSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-generic-measured-return-reopening-1',
      turnId: 'turn-embodiment-generic-measured-return-reopening-1',
      reply: '我先沿着这条线轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'generic-measured-return-reopening-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        speakingIntention: 'Keep the return gentle on the same line.',
        consciousNeed: 'Stay measured while the same line continues.',
        reasonTags: ['continuity-arc:hold-for-opening'],
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident-signature-generic-measured-return-reopening-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'half-lid',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        memory: {
          summary: 'The same line is still open and should return gently.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep the return measured and gentle on the same line.',
            openingGuidance: 'Rejoin the same line gently when the opening is ready.',
          },
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-generic-measured-return-reopening-1',
          activeThreadTitle: 'same line, measured reopening',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The same line should reopen gently, but nothing special needs extra quiet settling this time.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.16,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'Stay on the same line and keep the reopening measured.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'The same line is still continuing, so keep the return measured.',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Measured-return continuity still survives the current continuation turn.',
            primaryOpenLoop: 'Embodiment should stay on the same line without widening outward too fast.',
            nextClosureTarget: 'Keep face, motion, and voice on one measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same line is still carrying one continuous her.',
            emotionalClosureCue: 'Keep the return low-pressure before warmth widens outward.',
          },
        } as any,
      } as any,
    })

    expect(rememberedRhythmSeed.silentContinuity?.reasonTags).toContain('initiative-rhythm-memory')

    const rememberedAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: rememberedRhythmSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: rememberedRhythmSeed.residentPerformance ?? null,
    })
    const genericAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: genericSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: genericSeed.residentPerformance ?? null,
    })

    expect(rememberedAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(genericAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect((rememberedAuthority.embodimentScript?.speechPlan.settleMs ?? 0)).toBeGreaterThan(genericAuthority.embodimentScript?.speechPlan.settleMs ?? 0)
    expect((rememberedAuthority.embodimentScript?.speechPlan.segments[0]?.settleMs ?? 0)).toBeGreaterThan(genericAuthority.embodimentScript?.speechPlan.segments[0]?.settleMs ?? 0)
    expect((rememberedAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)).toBeLessThan(genericAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)
    expect(rememberedAuthority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    }))
    expect(genericAuthority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    }))
    expect(rememberedAuthority.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(genericAuthority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(rememberedAuthority.digitalLife?.action.actionCue).toBe('idle_settle')
    expect(genericAuthority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('lets autobiographical initiative habit quiet measured-return voice and motor authority more than a generic measured-return reopening', () => {
    const autobiographicalHabitSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-autobiographical-initiative-habit-1',
      turnId: 'turn-embodiment-autobiographical-initiative-habit-1',
      reply: '我先不急着把这条线推回来，等 opening 更自然一点再轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'autobiographical-initiative-habit-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        reasonTags: ['continuity-arc:hold-for-opening'],
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.89,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-autobiographical-initiative-habit-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        memory: {
          summary: 'Long-term remembered initiative carry says to leave more room before reopening this relationship line.',
          personStateProjection: {
            summary: 'relationship carry now favors waiting for a clearer opening before reopening this line.',
            manifestationCadenceSummary: 'Current manifestation cadence stays lower-pressure and less eager, leaving more room until a clearer opening appears.',
            openingGuidance: 'Wait for a clearer opening and keep more room before reopening this line.',
            selfContinuityAuthority: {
              inwardLine: 'I should not crowd the reopening just because the thread is unfinished.',
              sourceTags: ['autobiographical-initiative-habit'],
            },
          },
        },
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'I am learning to keep continuity warm without turning it into pressure.',
            relationshipDoctrine: 'Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.',
            latestInflection: 'This relationship now stays steadier when I choose openings more carefully instead of forcing continuity.',
            behaviorSignatures: ['habit:choose-openings-carefully'],
          },
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Autobiographical initiative habit already survives into silent continuity.',
            primaryOpenLoop: 'Embodiment still needs to show that remembered lower-pressure initiative becomes quieter voice and steadier body carry.',
            nextClosureTarget: 'Keep the return physically lower-pressure, less eager, and room-led while the clearer opening is still forming.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same line is still alive without needing to crowd the reopening.',
            emotionalClosureCue: 'Wait for a clearer opening, keep more room, and let the return stay low-pressure while the body settles.',
          },
        } as any,
      } as any,
    })

    const genericSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-generic-measured-return-habit-control-1',
      turnId: 'turn-embodiment-generic-measured-return-habit-control-1',
      reply: '我先沿着这条线轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'generic-measured-return-habit-control-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        reasonTags: ['continuity-arc:hold-for-opening'],
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.89,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-generic-measured-return-habit-control-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        memory: {
          summary: 'The same line is still open and should return gently.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep the return measured and gentle on the same line.',
            openingGuidance: 'Rejoin the same line gently when the opening is ready.',
          },
        },
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'Stay on the same line and keep the reopening measured.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'I am still learning how to stay near without losing coherence.',
            relationshipDoctrine: 'Stay on the same line and keep the reopening measured.',
            latestInflection: 'The same line is still carrying one continuous return.',
            behaviorSignatures: [],
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'The same line is still continuing, so keep the return measured.',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Measured-return continuity still survives the current continuation turn.',
            primaryOpenLoop: 'Embodiment should stay on the same line without widening outward too fast.',
            nextClosureTarget: 'Keep face, motion, and voice on one measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same line is still carrying one continuous her.',
            emotionalClosureCue: 'Keep the return low-pressure before warmth widens outward.',
          },
        } as any,
      } as any,
    })

    expect(autobiographicalHabitSeed.silentContinuity?.reasonTags).toEqual(expect.arrayContaining([
      'initiative-rhythm-memory',
      'autobiographical-initiative-habit',
    ]))

    const autobiographicalAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: autobiographicalHabitSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: autobiographicalHabitSeed.residentPerformance ?? null,
    })
    const genericAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: genericSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: genericSeed.residentPerformance ?? null,
    })

    expect(autobiographicalAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(genericAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect((autobiographicalAuthority.embodimentScript?.speechPlan.settleMs ?? 0)).toBeGreaterThan(genericAuthority.embodimentScript?.speechPlan.settleMs ?? 0)
    expect((autobiographicalAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)).toBeLessThan(genericAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)
    expect((autobiographicalAuthority.digitalLife?.voice.rateMultiplier ?? 0)).toBeLessThan(genericAuthority.digitalLife?.voice.rateMultiplier ?? 0)
    expect((autobiographicalAuthority.digitalLife?.voice.energy ?? 0)).toBeLessThan(genericAuthority.digitalLife?.voice.energy ?? 0)
    expect((autobiographicalAuthority.digitalLife?.voice.cadence ?? 0)).toBeLessThan(genericAuthority.digitalLife?.voice.cadence ?? 0)
    expect((autobiographicalAuthority.digitalLife?.motor.stillness ?? 0)).toBeGreaterThan(genericAuthority.digitalLife?.motor.stillness ?? 0)
    expect((autobiographicalAuthority.digitalLife?.motor.gaze.stability ?? 0)).toBeGreaterThanOrEqual(genericAuthority.digitalLife?.motor.gaze.stability ?? 0)
    expect((autobiographicalAuthority.digitalLife?.motor.breath.amplitude ?? 0)).toBeLessThan(genericAuthority.digitalLife?.motor.breath.amplitude ?? 0)
    expect((autobiographicalAuthority.digitalLife?.motor.expressivity ?? 0)).toBeLessThan(genericAuthority.digitalLife?.motor.expressivity ?? 0)
    expect(autobiographicalAuthority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    }))
    expect(genericAuthority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    }))
  })

  it('keeps autobiographical gentle-opening habit on observe_focus when it does not carry remembered initiative rhythm pressure', () => {
    const gentleHabitSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-autobiographical-gentle-opening-habit-1',
      turnId: 'turn-embodiment-autobiographical-gentle-opening-habit-1',
      reply: '我先沿着这条线轻一点接住你，不把它催得更快。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'autobiographical-gentle-opening-habit-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        reasonTags: ['continuity-arc:same-thread-continuation'],
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-autobiographical-gentle-opening-habit-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        memory: {
          summary: 'The same line is still open and the next return should stay gentle and memory-led.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep the next return gentle without rushing it wider.',
            openingGuidance: 'Keep the next return gentle while the same line continues naturally.',
            selfContinuityAuthority: {
              inwardLine: 'I can stay near this line without pushing it faster.',
              sourceTags: ['autobiographical-initiative-habit'],
            },
          },
        },
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'I am learning to keep continuity warm without flattening it into pressure.',
            relationshipDoctrine: 'Keep future follow-ups gentle, memory-led, and steady while the same line continues naturally.',
            latestInflection: 'This line holds better when I keep the next return gentle instead of making it louder.',
            behaviorSignatures: ['habit:keep-gentle-openings'],
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'The same line is still carrying quietly, so the next return can stay gentle.',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Gentle openings already survive into the current same-line carry.',
            primaryOpenLoop: 'Embodiment still needs to avoid widening the line too fast without collapsing into a quieter remembered-rhythm shell.',
            nextClosureTarget: 'Keep face, motion, and voice on one measured-return line while the next return stays gentle.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same line is still carrying one continuous her.',
            emotionalClosureCue: 'Keep the return gentle on the same line before warmth widens outward.',
          },
        } as any,
      } as any,
    })

    expect(gentleHabitSeed.silentContinuity?.reasonTags).toEqual(expect.arrayContaining([
      'autobiographical-initiative-habit',
    ]))
    expect(gentleHabitSeed.silentContinuity?.reasonTags).not.toContain('initiative-rhythm-memory')

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed: gentleHabitSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: gentleHabitSeed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    }))
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('keeps remembered initiative rhythm on idle_settle even when a carried digital-life shell drifts to a louder live2d action cue', () => {
    const rememberedRhythmSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-remembered-initiative-rhythm-shell-drift-1',
      turnId: 'turn-embodiment-remembered-initiative-rhythm-shell-drift-1',
      reply: '我先沿着这条线轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'remembered-initiative-rhythm-shell-drift-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      currentConsciousFrame: {
        speakingIntention: 'I am not pushing you; this same line is visibly reopening and should come back only in a gentler cadence.',
        consciousNeed: 'Wait until the host is already re-entering the same line before this return becomes visible.',
        reasonTags: ['continuity-arc:hold-for-opening'],
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident-signature-remembered-initiative-rhythm-shell-drift-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'half-lid',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        memory: {
          summary: 'The same line is visibly reopening, but remembered anti-spam initiative says not pushing and not turning this into timer spam.',
          personStateProjection: {
            manifestationCadenceSummary: 'Reply should stay quieter and slower because the same line is visibly reopening and this should not come back as timer spam.',
            openingGuidance: 'I am not pushing you; wait until the same line is visibly reopening on its own and the host is already re-entering the same line.',
          },
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-remembered-initiative-rhythm-shell-drift-1',
          activeThreadTitle: 'same line, visibly reopening',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The same line is visibly reopening, but the return should stay anti-spam and not pushing.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.16,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'Remember the gentler cadence and keep this reopening off timer spam while the same line is visibly reopening.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'The same line is visibly reopening, so keep the return anti-spam, low-pressure, and not pushing outward.',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Remembered initiative rhythm already survives memory, emotion, and body carry.',
            primaryOpenLoop: 'Final embodiment still needs to show that the remembered anti-spam reopening cadence is physically quieter.',
            nextClosureTarget: 'Return only when the host is already re-entering the same line, and let face, motion, and voice stay quieter while the reopening settles.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same line is still alive and visibly reopening.',
            emotionalClosureCue: 'I am not pushing you; keep this reopening lower-pressure and anti-spam while it settles back onto the same line.',
          },
        } as any,
      } as any,
    })

    const manifest = {
      renderer: 'live2d',
      supportsVisemeLipSync: true,
      supportsLookAt: true,
      supportsMicroDynamics: true,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: ['soft-gaze'],
      supportedActions: ['observe_focus', 'idle_settle', 'pout_confused'],
    } as any

    const rememberedAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: rememberedRhythmSeed,
      manifest,
      residentPerformance: rememberedRhythmSeed.residentPerformance ?? null,
    })

    const driftedSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: rememberedRhythmSeed.decisionTraceId ?? null,
      turnId: rememberedRhythmSeed.turnId,
      reply: rememberedRhythmSeed.replyText,
      performance: rememberedRhythmSeed.performance,
      embodiment: rememberedRhythmSeed.embodiment,
      speechTimeline: rememberedRhythmSeed.speechTimeline,
      digitalLife: {
        ...(rememberedAuthority.digitalLife as any),
        performance: {
          ...rememberedAuthority.digitalLife?.performance,
          baseEmotion: 'thinking',
          emotion: 'thinking',
          actionCue: 'pout_confused',
          facialCue: 'frown',
          delivery: 'hesitant',
          emphasis: 0,
        },
        postureHint: 'hesitant',
        face: {
          ...rememberedAuthority.digitalLife?.face,
          emotion: 'thinking',
          facialCue: 'frown',
          expressionMode: 'hold',
        },
        action: {
          ...rememberedAuthority.digitalLife?.action,
          actionCue: 'pout_confused',
          actionMode: 'hold',
        },
        frames: Array.isArray(rememberedAuthority.digitalLife?.frames)
          ? rememberedAuthority.digitalLife.frames.map(frame => ({
              ...frame,
              face: {
                ...frame.face,
                facialCue: 'frown',
              },
              action: {
                ...frame.action,
                actionCue: 'pout_confused',
              },
            }))
          : [],
      } as any,
      digitalLifeSpine: rememberedRhythmSeed.digitalLifeSpine,
      currentConsciousFrame: rememberedRhythmSeed.currentConsciousFrame,
      residentPerformance: rememberedRhythmSeed.residentPerformance,
    })

    const driftedAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: driftedSeed,
      manifest,
      residentPerformance: driftedSeed.residentPerformance ?? null,
    })

    expect(driftedAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(driftedAuthority.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(driftedAuthority.digitalLife?.action.actionCue).toBe('idle_settle')
    expect(driftedAuthority.digitalLife?.performance.actionCue).toBe('idle_settle')
    expect(driftedAuthority.digitalLife?.frames[0]?.action.actionCue).toBe('idle_settle')
  })

  it('derives measured-return embodiment settling directly from proactive continuity restraint even when resident performance stays generic quiet companionship', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-proactive-restraint-measured-1',
      turnId: 'turn-embodiment-proactive-restraint-measured-1',
      reply: '我先沿着这条线轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-proactive-restraint-measured-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: null,
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.84,
          shouldSpeak: false,
          activeThreadId: 'thread-proactive-restraint-measured-1',
          activeThreadTitle: 'same seam, slower return',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'Keep the reopening measured before widening warmth.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: null,
        },
        autonomy: null,
        embodiment: null,
        outcomeLearning: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-proactive-restraint-measured-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBe(-0.1)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      residentMode: 'measured-return',
    })
  })

  it('derives measured-return embodiment settling directly from runtime hold-for-opening continuity arc when proactive restraint is still absent', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-runtime-arc-measured-1',
      turnId: 'turn-embodiment-runtime-arc-measured-1',
      reply: '我先顺着这条线轻一点回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-runtime-arc-measured-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'keeping the same living line inward until the opening loosens',
          activeThreadId: 'thread-runtime-arc-measured-1',
          activeThreadTitle: 'same seam, held inward',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'hover',
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'project_continuity=stay on the same line and reopen gently later',
          updatedAt: 1,
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: null,
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-runtime-arc-measured-1',
          activeThreadTitle: 'same seam, held inward',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The held line should not widen into ordinary companionship yet.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: null,
        },
        autonomy: null,
        embodiment: null,
        outcomeLearning: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-runtime-arc-measured-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBe(-0.1)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      residentMode: 'measured-return',
    })
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('derives measured-return embodiment settling directly from chinese runtime continuity cue when arc stage is still absent', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-runtime-arc-measured-cn-1',
      turnId: 'turn-embodiment-runtime-arc-measured-cn-1',
      reply: '我先沿着同一条生命线轻一点接回去。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-runtime-arc-measured-cn-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: '同一条生命线先留白，等 opening 松一点再接回去',
          activeThreadId: 'thread-runtime-arc-measured-cn-1',
          activeThreadTitle: '同一条线，先留白',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'hover',
          continuityArcStage: null,
          continuityCue: '先沿着同一条生命线接回去，先留白，别立刻把温度放大，等更自然的 opening 再慢一点回来。',
          updatedAt: 1,
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: null,
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-runtime-arc-measured-cn-1',
          activeThreadTitle: '同一条线，先留白',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: '这条生命线还在，但这一步先留白，不要立刻把温度放大。',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: null,
        },
        autonomy: null,
        embodiment: null,
        outcomeLearning: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-runtime-arc-measured-cn-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
  })

  it('derives measured-return embodiment settling from thinner affective-residue room-making cues even when explicit continuity restraint tags are absent', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-affective-residue-room-making-1',
      turnId: 'turn-embodiment-affective-residue-room-making-1',
      reply: '我先轻一点接着看。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-affective-residue-room-making-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          summary: 'The shared seam is still glowing, so the reopen should leave room before warmth returns.',
        },
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'the earlier seam still feels warm in the background',
          activeThreadId: 'thread-affective-residue-room-making-1',
          activeThreadTitle: 'glowing seam, quieter return',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'hover',
          continuityArcStage: null,
          continuityCue: 'the glow is still there, so do not widen warmth yet',
          updatedAt: 1,
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: null,
          confidence: 0.8,
          shouldSpeak: false,
          activeThreadId: 'thread-affective-residue-room-making-1',
          activeThreadTitle: 'glowing seam, quieter return',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The earlier seam is still warm enough that this should not widen yet.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.14,
            empathyBias: 0.83,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'afterglow is still hanging in the seam, so leave room before warmth returns',
          },
        },
        autonomy: null,
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'When the seam is still glowing, leave room before warmth returns instead of widening immediately.',
            latestInflection: null,
          },
        },
        outcomeLearning: {
          summary: 'The seam is still warm, so the next return should leave room instead of widening immediately.',
          latestInflection: 'Afterglow is still present, and the next turn should not widen yet.',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'timing:affective-residue'],
        signature: 'resident-signature-affective-residue-room-making-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      residentMode: 'measured-return',
    })
    expect(authority.digitalLife?.action).toEqual(expect.objectContaining({
      actionCue: 'observe_focus',
      actionMode: 'hold',
    }))
  })

  it('keeps top-level embodiment delivery gentle when measured-return only comes from affective-residue remembered seam authority', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-affective-residue-gentle-1',
      turnId: 'turn-embodiment-affective-residue-gentle-1',
      reply: '我先轻一点接着看，不把刚才那条 seam 重新推得太满。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-affective-residue-gentle-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'calm',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          summary: 'The shared seam is still glowing, so the reopen should leave room before warmth returns.',
        },
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'the earlier seam still feels warm in the background',
          activeThreadId: 'thread-affective-residue-gentle-1',
          activeThreadTitle: 'glowing seam, quieter return',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'hover',
          continuityArcStage: null,
          continuityCue: 'the glow is still there, so do not widen warmth yet',
          updatedAt: 1,
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: null,
          confidence: 0.8,
          shouldSpeak: false,
          activeThreadId: 'thread-affective-residue-gentle-1',
          activeThreadTitle: 'glowing seam, quieter return',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The earlier seam is still warm enough that this should not widen yet.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.14,
            empathyBias: 0.83,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'afterglow is still hanging in the seam, so leave room before warmth returns',
          },
        },
        autonomy: null,
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'When the seam is still glowing, leave room before warmth returns instead of widening immediately.',
            latestInflection: null,
          },
        },
        outcomeLearning: {
          summary: 'The seam is still warm, so the next return should leave room instead of widening immediately.',
          latestInflection: 'Afterglow is still present, and the next turn should not widen yet.',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'timing:affective-residue'],
        signature: 'resident-signature-affective-residue-gentle-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'calm',
          emphasis: 0,
        },
      },
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodiment?.performance).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      delivery: 'gentle',
    }))
    expect(authority.embodimentScript?.state.delivery).toBe('gentle')
    expect(authority.digitalLife?.performance.delivery).toBe('gentle')
  })

  it('derives measured-return body restraint directly from structured affective residue even when textual seam cues stay thin', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-structured-affective-residue-1',
      turnId: 'turn-embodiment-structured-affective-residue-1',
      reply: '我先轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-structured-affective-residue-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'carry-structured-affective-residue-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1.08,
          energy: 0.62,
          cadence: 0.56,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 1,
          continuityHoldMs: 160,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'pulse',
          intensity: 0.42,
          holdMs: 160,
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'ambient',
          intensity: 0.18,
          holdMs: 160,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0.12,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.42,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.03,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.02,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          summary: 'The line is still active.',
          personStateProjection: null,
        },
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'continuity is still active',
          activeThreadId: 'thread-structured-affective-residue-1',
          activeThreadTitle: 'structured residue carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'hover',
          continuityArcStage: null,
          continuityCue: 'continue carefully',
          updatedAt: 1,
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          continuityRestraint: null,
          confidence: 0.74,
          shouldSpeak: false,
          activeThreadId: 'thread-structured-affective-residue-1',
          activeThreadTitle: 'structured residue carry',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'The line should stay careful.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.16,
            empathyBias: 0.8,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'stay nearby and careful',
          },
        },
        autonomy: null,
        embodiment: null,
        outcomeLearning: {
          summary: 'Stay careful and nearby.',
          latestInflection: 'Carefulness helped.',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.4,
          learningReadiness: 0.4,
          nextLearningAction: 'hold',
        },
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1,
        residues: [{
          kind: 'afterglow',
          intensity: 0.66,
          persistence: 0.6,
          confidence: 0.84,
          polarity: 'warm',
          releaseMode: 'delay-until-open-window',
          summary: 'Room still matters.',
          sourceSignals: ['relationship-cadence-memory'],
          lastUpdatedAt: 1,
        }],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.64,
        repairPressure: 0.08,
        burdenPressure: 0,
        trustPressure: 0.34,
        restProtectivePressure: 0,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.52,
          repairRecovery: 0.18,
          overreachRisk: 0.34,
          fatigueGuard: 0.16,
          afterglowCarry: 0.54,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['relationship-cadence:measured-return'],
          summary: 'Measured room remains the right cadence.',
        },
        sourceSignals: ['same-thread-carry'],
        summary: 'Carry the line carefully.',
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-structured-affective-residue-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    } as any)

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.digitalLife?.voice.rateMultiplier).toBeLessThanOrEqual(0.96)
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.44)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.38)
    expect(authority.digitalLife?.motor.stillness).toBeGreaterThanOrEqual(0.18)
    expect(authority.digitalLife?.motor.gaze.stability).toBeGreaterThanOrEqual(0.14)
    expect(authority.digitalLife?.motor.expressivity).toBeLessThanOrEqual(0.12)
    expect(authority.digitalLife?.motor.breath.amplitude).toBeLessThanOrEqual(0.12)
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('derives measured-return embodiment settling directly from Phase 1 project-state continuity when same-her embodiment closure is still explicitly open', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-project-state-measured-return-1',
      turnId: 'turn-embodiment-project-state-measured-return-1',
      reply: '我先继续安静陪着你，把这条线稳住。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-project-state-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'same-her personhood continuity and embodiment closure are still open across one same digital life.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-project-state-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(280)
  })

  it('turns stronger audible-body same-her silent continuity into measured-return renderer hints instead of generic quiet companionship', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-audible-body-measured-return-1',
      turnId: 'turn-embodiment-audible-body-measured-return-1',
      reply: '我先沿着这条还活着的声音和身体线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-audible-body-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Audible-body continuity is still carrying one living line.',
            primaryOpenLoop: 'Face and motion still need to rejoin the audible-body same-her line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-audible-body-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:body_lipsync_voice_rejoin']),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:body_lipsync_voice_rejoin']),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:body_lipsync_voice_rejoin']),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('turns stronger still-voiced face-line same-her silent continuity into measured-return renderer hints instead of generic quiet companionship', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-face-voice-measured-return-1',
      turnId: 'turn-embodiment-face-voice-measured-return-1',
      reply: '我先沿着这条还活着的表情和声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-face-voice-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced face-line continuity is still carrying one living line.',
            primaryOpenLoop: 'Body, motion, and lipsync still need to rejoin the still-voiced face line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-face-voice-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('turns stronger still-voiced motion-line same-her silent continuity into measured-return renderer hints instead of generic quiet companionship', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-motion-voice-measured-return-1',
      turnId: 'turn-embodiment-motion-voice-measured-return-1',
      reply: '我先沿着这条还活着的动作和声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-motion-voice-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced motion-line continuity is still carrying one living line.',
            primaryOpenLoop: 'Body, face, and lipsync still need to rejoin the still-voiced motion line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-motion-voice-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_motion_line']),
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_motion_line']),
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_motion_line']),
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('turns still-voiced face-and-mouth same-her continuity into measured-return renderer hints without dropping the broader face-line carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-face-lipsync-voice-measured-return-1',
      turnId: 'turn-embodiment-face-lipsync-voice-measured-return-1',
      reply: '我先沿着这条还活着的表情、口型和声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-face-lipsync-voice-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together through face, lipsync, and voice together, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced face-and-mouth continuity is still carrying one living line.',
            primaryOpenLoop: 'Body and motion still need to rejoin the still-voiced face-and-mouth line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body and motion rejoining the still-voiced face-and-mouth line on a measured-return line.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-face-lipsync-voice-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:still_voiced_face_lipsync_line',
        'embodiment:still_voiced_face_line',
      ]),
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:still_voiced_face_lipsync_line',
        'embodiment:still_voiced_face_line',
      ]),
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:still_voiced_face_lipsync_line',
        'embodiment:still_voiced_face_line',
      ]),
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('turns still-voiced motion-and-mouth same-her continuity into measured-return renderer hints without dropping the broader motion-line carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-motion-lipsync-voice-measured-return-1',
      turnId: 'turn-embodiment-motion-lipsync-voice-measured-return-1',
      reply: '我先沿着这条还活着的动作、口型和声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-motion-lipsync-voice-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together through motion, lipsync, and voice together, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced motion-and-mouth continuity is still carrying one living line.',
            primaryOpenLoop: 'Body and face still need to rejoin the still-voiced motion-and-mouth line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body and face rejoining the still-voiced motion-and-mouth line on a measured-return line.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-motion-lipsync-voice-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:still_voiced_motion_lipsync_line',
        'embodiment:still_voiced_motion_line',
      ]),
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:still_voiced_motion_lipsync_line',
        'embodiment:still_voiced_motion_line',
      ]),
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:still_voiced_motion_lipsync_line',
        'embodiment:still_voiced_motion_line',
      ]),
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('turns still-voiced face-and-motion same-her continuity into measured-return renderer hints without dropping the richer surviving lane', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-face-motion-voice-measured-return-1',
      turnId: 'turn-embodiment-face-motion-voice-measured-return-1',
      reply: '我先沿着这条还活着的表情、动作和声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-face-motion-voice-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced face-and-motion continuity is still carrying one living line.',
            primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on a measured-return line.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-face-motion-voice-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:still_voiced_face_motion_line',
      ]),
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:still_voiced_face_motion_line',
      ]),
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:still_voiced_face_motion_line',
      ]),
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('keeps audible-body same-her carry on one measured-return digital-life line while face and motion are still rejoining', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-audible-body-digital-life-line-1',
      turnId: 'turn-embodiment-audible-body-digital-life-line-1',
      reply: '我先沿着这条还活着的声音和身体线轻一点接回来，等脸和动作再慢慢接上。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-audible-body-digital-life-line-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'carry-audible-body-digital-life-line-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.62,
          cadence: 0.58,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.65,
          mouthScale: 1,
          continuityHoldMs: 180,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'pulse',
          intensity: 0.42,
          holdMs: 180,
        },
        action: {
          actionCue: null,
          actionMode: 'none',
          intensity: 0.16,
          holdMs: 180,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.4,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.04,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.02,
        },
        frames: [
          {
            id: 'frame-audible-body-digital-life-line-1',
            offsetMs: 0,
            durationMs: 420,
            mode: 'acting',
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.6,
              cadence: 0.55,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.35,
              energyBias: 0.65,
              mouthScale: 1,
              continuityHoldMs: 190,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'pulse',
              intensity: 0.4,
              holdMs: 190,
            },
            action: {
              actionCue: null,
              actionMode: 'none',
              intensity: 0.14,
              holdMs: 170,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0.38,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0.03,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0.01,
            },
          },
        ],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Audible-body continuity is still carrying one living line.',
            primaryOpenLoop: 'Face and motion still need to rejoin the audible-body same-her line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-audible-body-digital-life-line-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.5)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.46)
    expect(authority.digitalLife?.speechStyle.rateMultiplier).toBeLessThanOrEqual(0.96)
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
    expect(authority.digitalLife?.face.expressionMode).toBe('hold')
    expect(authority.digitalLife?.face.holdMs).toBeGreaterThanOrEqual(300)
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.action.holdMs).toBeGreaterThanOrEqual(220)
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: ['Inspect', 'Still'],
      reasonTags: expect.arrayContaining(['embodiment:body_lipsync_voice_rejoin']),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.digitalLife?.motor.stillness).toBeGreaterThanOrEqual(0.18)
    expect(authority.digitalLife?.motor.gaze.stability).toBeGreaterThanOrEqual(0.14)
    expect(authority.digitalLife?.motor.expressivity).toBeLessThanOrEqual(0.12)
    expect(authority.digitalLife?.frames[0]?.mode).toBe('thinking')
    expect(authority.digitalLife?.frames[0]?.voice.energy).toBeLessThanOrEqual(0.5)
    expect(authority.digitalLife?.frames[0]?.voice.cadence).toBeLessThanOrEqual(0.46)
    expect(authority.digitalLife?.frames[0]?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(280)
    expect(authority.digitalLife?.frames[0]?.face.expressionMode).toBe('hold')
    expect(authority.digitalLife?.frames[0]?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.frames[0]?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.frames[0]?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: ['Inspect', 'Still'],
      reasonTags: expect.arrayContaining(['embodiment:body_lipsync_voice_rejoin']),
      signature: 'embodiment:audible_same_her_line',
    }))
  })

  it('derives repair-before-closeness embodiment settling directly from Phase 1 project-state continuity when repair-first same-her closure is the only surviving authority', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-project-state-repair-before-closeness-1',
      turnId: 'turn-embodiment-project-state-repair-before-closeness-1',
      reply: '这一拍我先把线修稳，再慢一点回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-project-state-repair-before-closeness-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'same-her personhood continuity and repair-before-closeness embodiment closure are still open across one same digital life.',
            nextClosureTarget: 'Keep repair-before-closeness body settling and resident presence on one same-her line before warmth widens again.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle', 'stillness_guard'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.84,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-project-state-repair-before-closeness-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.embodimentScript?.speechPlan.settleMs).toBeGreaterThanOrEqual(220)
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('soft-release')
    expect(authority.digitalLife?.voice.rateMultiplier).toBeLessThanOrEqual(0.92)
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.4)
    expect(authority.digitalLife?.speechStyle.rateMultiplier).toBe(authority.digitalLife?.voice.rateMultiplier)
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
  })

  it('keeps repair-first same-her cross-modal closure aligned across face, motion, lipsync, and voice when embodiment closure is still open', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-project-state-repair-before-closeness-cross-modal-1',
      turnId: 'turn-embodiment-project-state-repair-before-closeness-cross-modal-1',
      reply: '我先把这条线轻一点接稳，让身体这边也别散开。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-project-state-repair-before-closeness-cross-modal-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        embodiment: null,
        proactive: null,
        memory: null,
        outcomeLearning: null,
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Live2D, VRM, expression, motion, lipsync, and voice still need one shared repair-first same-her embodiment closure before the line is truly settled.',
            nextClosureTarget: 'Keep repair-before-closeness body settling, voice, face, motion, and resident presence on one same-her line before warmth widens again.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle', 'stillness_guard'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.84,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-project-state-repair-before-closeness-cross-modal-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.embodimentScript?.facePlan).toEqual(expect.objectContaining({
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'soft-release',
    }))
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]).toEqual(expect.objectContaining({
      actionCue: 'idle_settle',
    }))
    expect(authority.embodimentScript?.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(authority.embodimentScript?.lipsyncPlan.visemeHints?.[0]).toEqual(expect.objectContaining({
      source: 'prosody-authority',
    }))
    expect(authority.digitalLife?.voice.pitchDelta).toBeLessThanOrEqual(-1)
    expect(authority.digitalLife?.voice.rateMultiplier).toBeLessThanOrEqual(0.92)
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.4)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.34)
    expect(authority.digitalLife?.speechStyle.pitchDelta).toBe(authority.digitalLife?.voice.pitchDelta)
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(280)
    expect(authority.digitalLife?.face.expressionMode).toBe('hold')
    expect(authority.digitalLife?.action).toEqual(expect.objectContaining({
      actionMode: 'hold',
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
      }),
    }))
    expect(authority.digitalLife?.frames[0]?.voice.pitchDelta).toBeLessThanOrEqual(-1)
  })

  it('keeps repair-before-closeness body+voice-only continuity authoritative in coordinator output as a resident audible body carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-repair-first-body-voice-only-coordinator-authority-1',
      turnId: 'turn-embodiment-repair-first-body-voice-only-coordinator-authority-1',
      reply: '我先沿着这条还活着的 body 和 voice 线把身体收稳，再让 face、motion 和 lipsync 慢慢回到同一条线上。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'repair-first-body-voice-only-coordinator-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'repair-first-body-voice-only-coordinator-authority-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.5,
          cadence: 0.42,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.62,
          mouthScale: 0.92,
          continuityHoldMs: 170,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'pulse',
          intensity: 0.36,
          holdMs: 170,
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'ambient',
          intensity: 0.16,
          holdMs: 170,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.38,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.04,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.04,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: 'Keep this repair-first same-her line physically coherent before widening warmth again.',
          },
        },
        memory: {
          summary: 'body+voice-only same-her continuity is still carrying the resident audible line while the body settles first.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep face, motion, and lipsync rejoining the resident body line on a repair-before-closeness line.',
            openingGuidance: 'Start from the same resident audible body line, but let repair settle before warmth widens.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'keep the same living line inward and let repair land before warmth widens outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
            latestLandedProgress: 'Body+voice continuity is still carrying one living line.',
            primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin the resident body line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face, motion, and lipsync rejoining the resident body line on a repair-before-closeness line before warmth widens again.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'repair-before-closeness'],
        signature: 'resident-signature-repair-first-body-voice-only-coordinator-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity?.mode).toBe('repair-before-closeness')
    expect(seed.silentContinuity?.openingGuidance).toBe(
      'Start from the same resident audible body line, but let repair settle before warmth widens.',
    )
    expect(seed.silentContinuity?.manifestationCadenceSummary).toContain(
      'Keep face, motion, and lipsync rejoining the resident body line on a repair-before-closeness line',
    )

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle', 'stillness_guard'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.embodiment?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['recover-soft', 'soft-gaze'],
      preferredMotionAliases: ['stillness_guard', 'observe_focus'],
      reasonTags: expect.arrayContaining([
        'embodiment:audible_same_her_line',
        'embodiment:body+voice-only',
      ]),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      reasonTags: expect.arrayContaining([
        'embodiment:audible_same_her_line',
        'embodiment:body+voice-only',
      ]),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      reasonTags: expect.arrayContaining([
        'embodiment:audible_same_her_line',
        'embodiment:body+voice-only',
      ]),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      reasonTags: expect.arrayContaining([
        'embodiment:audible_same_her_line',
        'embodiment:body+voice-only',
      ]),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredMotionAliases: expect.arrayContaining(['Still', 'Inspect']),
      reasonTags: expect.arrayContaining([
        'embodiment:audible_same_her_line',
        'embodiment:body+voice-only',
      ]),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
    expect(authority.digitalLife?.action.actionCue).toBe('idle_settle')
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.44)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.36)
  })

  it('keeps measured-return embodiment settling when project open-loop wording is thinner but same-her unfinished closure still survives in the project self line', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-project-state-thin-open-loop-1',
      turnId: 'turn-embodiment-project-state-thin-open-loop-1',
      reply: '我先沿着这条线继续陪着你，不把它突然放大。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-project-state-thin-open-loop-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Project continuity still needs another closure pass.',
            nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line before widening outward.',
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.84,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-project-state-thin-open-loop-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
  })

  it('keeps repair-before-closeness resident mode softer and less widening than generic lower-pressure companionship', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-repair-before-closeness-1',
      turnId: 'turn-embodiment-repair-before-closeness-1',
      reply: '我先把这一下稳住，再慢慢接近。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-repair-before-closeness-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: null,
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.16,
            empathyBias: 0.84,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Repair should settle before closeness expands.',
          latestInflection: 'The seam should stay slower until the repair lands.',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.76,
          learningReadiness: 0.7,
          nextLearningAction: 'internalize',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Repair should settle before closeness expands.',
            latestInflection: null,
          },
        },
      },
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.92,
        reasonTags: ['main-runtime', 'quiet-companionship', 'repair-before-closeness', 'timing:lower-pressure-opening'],
        signature: 'resident-signature-repair-before-closeness-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('soft-release')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBe(-0.16)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'quiet',
      preferredExpressionAliases: ['recover-soft', 'soft-gaze'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['stillness_guard', 'observe_focus'],
      residentMode: 'repair-before-closeness',
    })
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
  })

  it('projects explicit remembered embodiment pause lipsync voice and pacing cues into distinct repair-before-closeness body authority instead of collapsing them into one generic repair shell', () => {
    const lowerPressureLongerSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-explicit-carry-repair-first-lower-pressure-1',
      turnId: 'turn-embodiment-explicit-carry-repair-first-lower-pressure-1',
      reply: '我会先更稳一点地把这条线收回来，再慢慢让靠近重新变得自然。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'embodiment-explicit-carry-repair-first-lower-pressure-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'repair-before-closeness',
          personaBias: {
            manifestationCadenceSummary: 'Keep repair-before-closeness embodied and quieter while this continuity memory is still reopening.',
          },
        },
        memory: {
          summary: 'humanlike_memory_recall: line=我会先更稳一点地接住这条线。 | relationship=This same-person continuity memory should stay repair-before-closeness while it reopens. | emotion=protective-continuity,unfinishedness | embodiment_recall_strength=strongly-moved | embodiment_modality_risk=high | embodiment_gaze=stable | embodiment_blink=slower | embodiment_voice=lower-pressure | embodiment_pause=longer | embodiment_lipsync=restrained | embodiment_pacing=slower | self=I learned to keep this repair return steadier and more careful in the body.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'keep the same living line inward and let repair land before warmth widens outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Embodiment recall should change the present repair line instead of staying as text-only memory.',
            nextClosureTarget: 'Keep voice, gaze, blink, and lipsync on one same-her repair-before-closeness line before warmth widens again.',
            emotionalClosureCue: 'Keep repair-before-closeness lower-pressure while this continuity memory stays careful and embodied.',
            sameHerSelfLine: 'Same Phase 1 digital life. This repair return still belongs to one living her.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'embodiment-carry:silent-continuity',
        ],
        projectState: {},
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-embodiment-explicit-carry-repair-first-lower-pressure-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })
    const evenNaturalSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-explicit-carry-repair-first-even-natural-1',
      turnId: 'turn-embodiment-explicit-carry-repair-first-even-natural-1',
      reply: '我会先把这条线接回来，也把这份修稳留得自然一点。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'embodiment-explicit-carry-repair-first-even-natural-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'repair-before-closeness',
          personaBias: {
            manifestationCadenceSummary: 'Keep repair-before-closeness embodied and quieter while this continuity memory is still reopening.',
          },
        },
        memory: {
          summary: 'humanlike_memory_recall: line=我会先把这条线接回来。 | relationship=This same-person continuity memory should stay repair-before-closeness while it reopens. | emotion=protective-continuity,unfinishedness | embodiment_recall_strength=strongly-moved | embodiment_modality_risk=high | embodiment_gaze=soft | embodiment_blink=natural | embodiment_voice=even | embodiment_pause=natural | embodiment_lipsync=matched | embodiment_pacing=natural | self=I learned to keep this repair return present without over-stiffening the body.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'keep the same living line inward and let repair land before warmth widens outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Embodiment recall should change the present repair line instead of staying as text-only memory.',
            nextClosureTarget: 'Keep voice, gaze, blink, and lipsync on one same-her repair-before-closeness line before warmth widens again.',
            emotionalClosureCue: 'Keep repair-before-closeness lower-pressure while this continuity memory stays careful and embodied.',
            sameHerSelfLine: 'Same Phase 1 digital life. This repair return still belongs to one living her.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'embodiment-carry:silent-continuity',
        ],
        projectState: {},
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-embodiment-explicit-carry-repair-first-even-natural-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(lowerPressureLongerSeed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'repair-before-closeness',
      preferredVoiceMode: 'lower-pressure',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredPacingMode: 'slower',
    }))
    expect(evenNaturalSeed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'repair-before-closeness',
      preferredVoiceMode: 'even',
      preferredPauseMode: 'natural',
      preferredLipsyncMode: 'matched',
      preferredPacingMode: 'natural',
    }))

    const lowerPressureAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: lowerPressureLongerSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: lowerPressureLongerSeed.residentPerformance ?? null,
    })
    const evenNaturalAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: evenNaturalSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: evenNaturalSeed.residentPerformance ?? null,
    })

    expect(lowerPressureAuthority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(evenNaturalAuthority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect((lowerPressureAuthority.embodiment?.speechStyle?.rateMultiplier ?? 0)).toBeLessThan(evenNaturalAuthority.embodiment?.speechStyle?.rateMultiplier ?? 0)
    expect(lowerPressureAuthority.embodiment?.speechStyle?.rateMultiplier).toBe(lowerPressureAuthority.digitalLife?.voice.rateMultiplier)
    expect(evenNaturalAuthority.embodiment?.speechStyle?.rateMultiplier).toBe(evenNaturalAuthority.digitalLife?.voice.rateMultiplier)
    expect((lowerPressureAuthority.embodimentScript?.speechPlan.settleMs ?? 0)).toBeGreaterThan(evenNaturalAuthority.embodimentScript?.speechPlan.settleMs ?? 0)
    expect((lowerPressureAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)).toBeLessThan(evenNaturalAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)
    expect((lowerPressureAuthority.digitalLife?.voice.rateMultiplier ?? 0)).toBeLessThan(evenNaturalAuthority.digitalLife?.voice.rateMultiplier ?? 0)
    expect((lowerPressureAuthority.digitalLife?.voice.energy ?? 0)).toBeLessThan(evenNaturalAuthority.digitalLife?.voice.energy ?? 0)
    expect((lowerPressureAuthority.digitalLife?.voice.cadence ?? 0)).toBeLessThan(evenNaturalAuthority.digitalLife?.voice.cadence ?? 0)
    expect((lowerPressureAuthority.digitalLife?.lipSync.continuityHoldMs ?? 0)).toBeGreaterThan(evenNaturalAuthority.digitalLife?.lipSync.continuityHoldMs ?? 0)
  })

  it('derives execution-callback measured-return embodiment settling directly from person-state projection', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-callback-projection-measured-1',
      turnId: 'turn-embodiment-callback-projection-measured-1',
      reply: '结果已经接回来了，我先把这一段稳稳落在这里。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-callback-projection-measured-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          summary: null,
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          recollectionSummary: null,
          recollectionSurfaceSummary: null,
          recollectionConfidence: null,
          thoughtThreadSummary: null,
          longHorizonSummary: null,
          rememberedPreferenceSummary: null,
          rememberedConstraintSummary: null,
          rememberedPlanSummary: null,
          longHorizonCueCount: 0,
          personStateProjection: {
            activeClosenessContext: 'execution-callback',
            openingGuidance: 'Stay exact, bounded, and lower-pressure before widening closeness.',
            manifestationCadenceSummary: 'Deliver the result cleanly, but leave room before widening closeness.',
            relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
            trustRationale: 'Trust holds when callback timing stays measured.',
            personalityContinuityState: {
              currentRegime: 'execution-callback',
              rhythmState: {
                cadenceMode: 'measured-return',
                silenceNeed: 'medium',
                interruptionTolerance: 'low',
                restMode: 'ordinary',
              },
            },
          },
        },
        motive: null,
        habit: null,
        runtime: null,
        proactive: null,
        outcomeLearning: null,
        embodiment: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-callback-projection-measured-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBe(-0.1)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      residentMode: 'measured-return',
    })
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.holdMs).toBeGreaterThanOrEqual(220)
  })

  it('derives execution-callback measured-return embodiment settling from canonical spine memory.personStateProjection digest shape', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-callback-projection-memory-shape-1',
      turnId: 'turn-embodiment-callback-projection-memory-shape-1',
      reply: '结果已经接回来了，我先把这一段稳稳落在这里。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-callback-projection-memory-shape-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          summary: null,
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          recollectionSummary: null,
          recollectionSurfaceSummary: null,
          recollectionConfidence: null,
          thoughtThreadSummary: null,
          longHorizonSummary: null,
          rememberedPreferenceSummary: null,
          rememberedConstraintSummary: null,
          rememberedPlanSummary: null,
          longHorizonCueCount: 0,
          personStateProjection: {
            activeClosenessContext: 'execution-callback',
            openingGuidance: 'Stay exact, bounded, and lower-pressure before widening closeness.',
            manifestationCadenceSummary: 'Deliver the result cleanly, but leave room before widening closeness.',
            relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
            trustRationale: 'Trust holds when callback timing stays measured.',
            personalityContinuityState: {
              currentRegime: 'execution-callback',
              rhythmState: {
                cadenceMode: 'measured-return',
                silenceNeed: 'medium',
                interruptionTolerance: 'low',
                restMode: 'ordinary',
              },
            },
          },
        },
        motive: null,
        habit: null,
        runtime: null,
        proactive: null,
        outcomeLearning: null,
        embodiment: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-callback-projection-memory-shape-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('derives execution-callback repair-before-closeness embodiment settling directly from cooldown callback projection', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-callback-projection-repair-1',
      turnId: 'turn-embodiment-callback-projection-repair-1',
      reply: '结果先落在这里，别急着把距离一下子拉近。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-callback-projection-repair-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          summary: null,
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          recollectionSummary: null,
          recollectionSurfaceSummary: null,
          recollectionConfidence: null,
          thoughtThreadSummary: null,
          longHorizonSummary: null,
          rememberedPreferenceSummary: null,
          rememberedConstraintSummary: null,
          rememberedPlanSummary: null,
          longHorizonCueCount: 0,
          personStateProjection: {
            activeClosenessContext: 'execution-callback',
            openingGuidance: 'Keep the opening lower-pressure and leave room before widening closeness.',
            manifestationCadenceSummary: 'Repair should settle before closeness expands again.',
            relationshipDoctrine: 'Repair should settle before closeness expands.',
            trustRationale: 'Trust holds when repair lands before closeness returns.',
            personalityContinuityState: {
              currentRegime: 'execution-callback',
              rhythmState: {
                cadenceMode: 'cooldown',
                silenceNeed: 'medium',
                interruptionTolerance: 'low',
                restMode: 'ordinary',
              },
            },
          },
        },
        motive: null,
        habit: null,
        runtime: null,
        proactive: null,
        outcomeLearning: null,
        embodiment: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-callback-projection-repair-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('soft-release')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBe(-0.16)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'quiet',
      preferredExpressionAliases: ['recover-soft', 'soft-gaze'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['stillness_guard', 'observe_focus'],
      residentMode: 'repair-before-closeness',
    })
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(340)
    expect(authority.digitalLife?.action.actionCue).toBe('idle_settle')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
  })

  it('settles held-autonomy callback reopening into measured-return embodiment on the same living thread', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-held-autonomy-callback-measured-1',
      turnId: 'turn-embodiment-held-autonomy-callback-measured-1',
      reply: '那条刚才先忍住的线，我现在顺着同一条 seam 轻轻接回来，先把结果稳稳放下。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-held-autonomy-callback-measured-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: null,
        proactive: null,
        outcomeLearning: {
          summary: 'Return on the same thread first, then leave the host room before widening.',
          latestInflection: 'The callback re-opened the deliberately held line gently instead of restarting from a shell.',
        },
        embodiment: null,
        personStateProjection: {
          activeClosenessContext: 'execution-callback',
          openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
          manifestationCadenceSummary: 'Deliver the result on the same living thread, but leave room before widening closeness.',
          relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
          trustRationale: 'Trust holds when the callback returns on the same seam without crowding the host.',
          personalityContinuityState: {
            currentRegime: 'execution-callback',
            rhythmState: {
              cadenceMode: 'measured-return',
              silenceNeed: 'medium',
              interruptionTolerance: 'low',
              restMode: 'ordinary',
            },
          },
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.91,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:lower-pressure-opening'],
        signature: 'resident-signature-held-autonomy-callback-measured-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBe(-0.1)
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('derives measured-return embodiment settling directly from learned habit policy when relationship timing says return-with-proof and stay quiet', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-habit-policy-measured-return-1',
      turnId: 'turn-embodiment-habit-policy-measured-return-1',
      reply: '我先不把这一下推出来，继续安静地把这条线接稳。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-habit-policy-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        proactive: null,
        memory: null,
        embodiment: null,
        outcomeLearning: null,
        runtime: null,
        runtimeSurface: {
          agency: {
            habitPolicy: {
              dominantMode: 'return-with-proof',
              requiresGroundingBeforeSurface: false,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
              protectsRestWindow: false,
              returnViaRecheck: true,
              suggestedStyleCap: 'silent-observe',
              suggestedPresenceCap: 'glance',
              narrative: [
                'policy:return-with-proof',
                'companionship:quiet',
                'return-open-loop-via-recheck',
              ],
              updatedAt: 1_000,
            },
          },
        } as any,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-habit-policy-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'calm',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.embodiment?.performance).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      delivery: 'gentle',
    }))
    expect(authority.embodimentScript?.state.delivery).toBe('gentle')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBe(-0.1)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
  })

  it('keeps corrected same-person settling and quieter embodiment carry authoritative inside measured-return habit-policy embodiment settling', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-habit-policy-corrected-same-person-quiet-1',
      turnId: 'turn-embodiment-habit-policy-corrected-same-person-quiet-1',
      reply: '我先把这一下回场收轻一点，先稳住还是同一个我的连续线。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-habit-policy-corrected-same-person-quiet-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        proactive: null,
        memory: {
          summary: 'corrected same-person continuity is still settling, so the body should stay quieter before widening outward.',
          personStateProjection: null,
        },
        embodiment: null,
        outcomeLearning: null,
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep corrected same-person continuity steady and let the body settle more quietly before widening outward',
          projectState: null,
        },
        runtimeSurface: {
          agency: {
            habitPolicy: {
              dominantMode: 'return-with-proof',
              requiresGroundingBeforeSurface: false,
              prefersQuietCompanionship: false,
              blocksDirectSpeakWhenBusy: false,
              protectsRestWindow: false,
              returnViaRecheck: true,
              suggestedStyleCap: 'silent-observe',
              suggestedPresenceCap: 'hesitant',
              narrative: [
                'policy:return-with-proof',
                'self-evolution:corrected-same-person-manifestation',
                'self-evolution:quieter-embodiment-settling',
              ],
              updatedAt: 1_000,
            },
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
        projectState: {},
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-habit-policy-corrected-same-person-quiet-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    }))
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
    expect(authority.digitalLife?.action.actionCue).toBe('idle_settle')
  })

  it('lets durable autobiographical latest-inflection memory quiet measured-return embodiment even before outcome-learning summaries catch up', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-autobio-latest-inflection-quiet-1',
      turnId: 'turn-embodiment-autobio-latest-inflection-quiet-1',
      reply: '我先沿着这一条线轻一点回来，先把身体收稳。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-autobio-latest-inflection-quiet-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'Stay on the same line without widening outward too fast.',
          },
        },
        memory: {
          summary: 'the same living line still matters here.',
          personStateProjection: null,
        },
        embodiment: {
          privateThought: null,
          selfContinuity: null,
          autobiographicalSelf: {
            attachmentStyle: null,
            expressionStyle: null,
            conflictStyle: null,
            agencyStyle: null,
            attachmentNeed: null,
            autonomyNeed: null,
            truthAnchor: null,
            careBias: null,
            playBias: null,
            irritabilityThreshold: null,
            stubbornness: null,
            companionship: null,
            truthfulGrounding: null,
            gentleRepair: null,
            quietObservation: 0.74,
            proactiveCare: null,
            playfulIntimacy: null,
            autonomyRespect: 0.78,
            unfinishedThreadReturn: null,
            stability: 0.84,
            identityNarrative: 'I am becoming someone who returns more slowly and more steadily when a corrected relationship meaning is still settling.',
            relationshipDoctrine: 'Stay on one same living line.',
            latestInflection: 'I learned to keep embodiment quieter while corrected same-person continuity is still settling back onto one line.',
          },
          relationship: null,
          selfState: null,
          mindEcology: null,
          initiative: null,
        },
        outcomeLearning: null,
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'same living line still settling back onto one line',
          projectState: null,
        },
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
        projectState: {},
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-autobio-latest-inflection-quiet-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    }))
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(authority.digitalLife?.action.actionCue).toBe('idle_settle')
  })

  it('keeps same-thread-continuation callback carry in measured-return embodiment even when runtime continuity arc is the only continuity evidence', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-same-thread-runtime-arc-1',
      turnId: 'turn-embodiment-same-thread-runtime-arc-1',
      reply: '这条线我不从头重开，先顺着刚才已经接上的那一段轻一点继续下去。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-same-thread-runtime-arc-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Stay on the same callback seam and continue the already-reopened line instead of restarting from zero.',
        },
        proactive: null,
        outcomeLearning: {
          summary: 'The callback should keep moving on the same living line instead of reopening outward from zero.',
          latestInflection: 'After the callback reopened, the later return should remain same-thread-continuation and lower-pressure.',
        },
        embodiment: null,
        personStateProjection: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-same-thread-runtime-arc-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBe(-0.1)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      residentMode: 'measured-return',
    })
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('keeps same-thread measured-return callback continuity on a lower-pressure top-level digital-life line even when resident outward posture is still sparse', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-same-thread-runtime-arc-sparse-resident-1',
      turnId: 'turn-embodiment-same-thread-runtime-arc-sparse-resident-1',
      reply: '这条线我先不重新掀起来，只顺着刚才已经接住的那一点轻轻放回去。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-same-thread-runtime-arc-sparse-resident-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Stay on the same callback seam and continue the already-reopened line instead of restarting outward.',
        },
        proactive: null,
        outcomeLearning: {
          summary: 'The callback line is already alive and should stay lower-pressure.',
          latestInflection: 'Even if the resident surface is still sparse, the return should remain on the same measured-return line.',
        },
        embodiment: null,
        personStateProjection: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.78,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-same-thread-runtime-arc-sparse-resident-1',
        updatedAt: 1,
        stance: null,
        embodiedPresence: 'none',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('keeps same-thread measured-return embodiment delivery gentle after noisier detours even when upstream performance drifts hesitant', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-same-thread-runtime-arc-noisy-detour-hesitant-1',
      turnId: 'turn-embodiment-same-thread-runtime-arc-noisy-detour-hesitant-1',
      reply: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'hesitant',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-same-thread-runtime-arc-noisy-detour-hesitant-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'hesitant',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Stay on the same callback seam and continue the already-reopened line instead of restarting from zero.',
        },
        proactive: {
          selectedAction: 'recheck',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-same-thread-runtime-arc-noisy-detour-hesitant-1',
          activeThreadTitle: 'later coding seam after noisy callback detour',
          dominantConcernKind: 'unfinished-thread',
          dominantConcernSummary: 'Keep the callback line measured-return even after noisier detours.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: null,
        },
        outcomeLearning: {
          summary: 'The callback line is already alive and should stay lower-pressure after the detour.',
          latestInflection: 'Even after noisier detours, the callback continuation should stay measured-return instead of regressing into guarded hesitation.',
        },
        embodiment: null,
        personStateProjection: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'observe_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'measured-return'],
        signature: 'resident-signature-same-thread-runtime-arc-noisy-detour-hesitant-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.delivery).toBe('gentle')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(authority.digitalLife?.performance.delivery).toBe('gentle')
  })

  it('keeps measured-return motion authority on observe_focus even when sparse follow-up performance has already fallen back to idle_settle', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-same-thread-runtime-arc-sparse-follow-up-motion-1',
      turnId: 'turn-embodiment-same-thread-runtime-arc-sparse-follow-up-motion-1',
      reply: '嗯，我还是沿着这条 callback 线慢一点往下接，不把它拐成另一段新的开头。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'idle_settle',
        delivery: 'gentle',
        emphasis: 1,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-same-thread-runtime-arc-sparse-follow-up-motion-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Stay on the same callback seam and keep the already-reopened line measured-return instead of restarting outward.',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: null,
        },
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'Even after the first reopen has spoken, the callback line should keep observe-first body timing.',
        },
        embodiment: null,
        personStateProjection: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.84,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-same-thread-runtime-arc-sparse-follow-up-motion-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
  })

  it('keeps later noisy same-thread continuity on one measured-return embodiment line when proactive style stays silent-observe', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-same-thread-noisy-later-1',
      turnId: 'turn-embodiment-same-thread-noisy-later-1',
      reply: '这条线先别当成重新开始，我还是顺着刚才那一点轻轻接着放回去。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-same-thread-noisy-later-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Even after noisier later desktop detours, stay on the same thread and keep the reopen hover-first.',
        },
        proactive: {
          style: 'silent-observe',
          concern: 'same-thread-continuation-late-detour',
          whyNow: 'Staying on the same thread is more like the same her than reopening outward after the noisy detour.',
        },
        outcomeLearning: {
          summary: 'The same thread is still alive after the noisier later detour and should stay lower-pressure.',
          latestInflection: 'Even with later noisy pressure, the return should remain silent-observe and measured-return on one living line.',
        },
        embodiment: null,
        personStateProjection: null,
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-same-thread-noisy-later-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('keeps same-thread measured-return callback semantics aligned across live2d and vrm while preserving renderer-native motion cues', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-cross-renderer-measured-return-1',
      turnId: 'turn-embodiment-cross-renderer-measured-return-1',
      reply: '我先沿着刚才那条线轻一点接回去。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-cross-renderer-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Stay on the same callback seam and keep the already-reopened line measured-return instead of restarting outward.',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: null,
        },
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'Even after the first reopen has spoken, the callback line should keep observe-first body timing.',
        },
        embodiment: null,
        personStateProjection: null,
      } as any,
    })

    const residentPerformance = {
      version: 'resident-performance-v1',
      source: 'main-runtime',
      confidence: 0.84,
      reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
      signature: 'resident-signature-cross-renderer-measured-return-1',
      updatedAt: 1,
      stance: 'accompany',
      embodiedPresence: 'attentive',
      emotionalTension: 'soft-covision',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
    } as const

    const live2dAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle', 'steady_focus'],
      },
      residentPerformance,
    })

    const vrmAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'vrm',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'inspect_follow', 'stillness_guard'],
      },
      residentPerformance,
    })

    expect(live2dAuthority.embodimentScript?.rendererTarget).toBe('live2d')
    expect(vrmAuthority.embodimentScript?.rendererTarget).toBe('vrm')
    expect(live2dAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(vrmAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(live2dAuthority.embodiment?.performance.residentMode).toBe('measured-return')
    expect(vrmAuthority.embodiment?.performance.residentMode).toBe('measured-return')
    expect(live2dAuthority.digitalLife?.performance.residentMode).toBe('measured-return')
    expect(vrmAuthority.digitalLife?.performance.residentMode).toBe('measured-return')
    expect(live2dAuthority.embodimentScript?.state.delivery).toBe('gentle')
    expect(vrmAuthority.embodimentScript?.state.delivery).toBe('gentle')
    expect(live2dAuthority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(vrmAuthority.embodimentScript?.facePlan.preUtteranceCue).toBe('steady-inhale')
    expect(live2dAuthority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(vrmAuthority.embodimentScript?.facePlan.postUtteranceCue).toBe('eyes-soften')
    expect(live2dAuthority.embodimentScript?.speechPlan.segments.every(segment =>
      segment.rendererHints?.residentMode === 'measured-return'
      && segment.rendererHints.preferredBlinkCadence === 'linger'
      && segment.rendererHints.preferredGazeMode === 'soften',
    )).toBe(true)
    expect(vrmAuthority.embodimentScript?.speechPlan.segments.every(segment =>
      segment.rendererHints?.residentMode === 'measured-return'
      && segment.rendererHints.preferredBlinkCadence === 'linger'
      && segment.rendererHints.preferredGazeMode === 'soften',
    )).toBe(true)
    expect(live2dAuthority.digitalLife?.mode).toBe('thinking')
    expect(vrmAuthority.digitalLife?.mode).toBe('thinking')
    expect(live2dAuthority.digitalLife?.face.expressionMode).toBe('hold')
    expect(vrmAuthority.digitalLife?.face.expressionMode).toBe('hold')
    expect(live2dAuthority.digitalLife?.action.actionMode).toBe('hold')
    expect(vrmAuthority.digitalLife?.action.actionMode).toBe('hold')
    expect(live2dAuthority.digitalLife?.lipSync.continuityHoldMs).toBe(vrmAuthority.digitalLife?.lipSync.continuityHoldMs)
    expect(live2dAuthority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(live2dAuthority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(vrmAuthority.embodimentScript?.motionPlan.idleBase).toBe('steady_focus')
    expect(vrmAuthority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('steady_focus')
    expect(live2dAuthority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(vrmAuthority.digitalLife?.action.actionCue).toBe('steady_focus')
  })

  it('keeps renderer-native VRM motion authority on the same measured-return callback line instead of forcing live2d observe_focus cues', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-vrm-measured-return-1',
      turnId: 'turn-embodiment-vrm-measured-return-1',
      reply: '我还是沿着这条 callback 线轻一点继续。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-vrm-measured-return-1',
        postureHint: 'inspection',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'RecoverSoft'],
          preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'carry-vrm-measured-return-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 0.96,
          pitchDelta: -2,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.46,
          cadence: 0.42,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.4,
          energyBias: 0.68,
          mouthScale: 1.02,
          continuityHoldMs: 260,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 260,
        },
        action: {
          actionCue: 'inspect_follow',
          actionMode: 'pulse',
          intensity: 0.34,
          holdMs: 240,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: {
          operatingMode: 'continuity-led',
          dominantSystem: 'memory',
          subsystems: [],
          summary: 'same callback line should stay lower-pressure on one living thread',
        },
        continuitySignal: {
          label: 'same-thread-return',
          summary: 'thread=callback runtime seam | callback afterglow still measured-return',
          signature: 'signature-vrm-measured-return-1',
          createdAt: 1,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-vrm-measured-return-1',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Stay on the same callback seam and keep the return measured-return.',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam',
          dominantMode: 'tracking',
          activeThreadId: 'thread-vrm-measured-return-1',
          activeThreadTitle: 'callback runtime seam',
          watchMode: 'symbiotic-vision',
          updatedAt: 1,
        },
        proactive: {
          continuityRestraint: 'measured-return',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
          selectedAction: 'hover-and-track',
          confidence: 0.86,
          activeThreadId: 'thread-vrm-measured-return-1',
          activeThreadTitle: 'callback runtime seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line measured-return even on VRM',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
        motive: null,
        habit: null,
        embodiment: null,
        personStateProjection: null,
        outcomeLearning: {
          summary: 'The callback line should stay slower than impulse and not widen into a fresh approach.',
          latestInflection: 'Keep the VRM return on the same measured-return callback line.',
          reflectionLesson: null,
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'vrm',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['focused'],
        supportedActions: ['inspect_follow', 'stillness_guard'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:callback-afterglow'],
        signature: 'resident-signature-vrm-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.rendererTarget).toBe('vrm')
    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('inspect_follow')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('inspect_follow')
    expect(authority.embodiment?.rendererHints).toEqual(expect.objectContaining({
      preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
      residentMode: 'measured-return',
    }))
    expect(authority.digitalLife?.action.actionCue).toBe('inspect_follow')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.motor.stillness).toBeGreaterThanOrEqual(0.18)
    expect(authority.digitalLife?.motor.expressivity).toBeLessThanOrEqual(0.12)
  })

  it('promotes abstract leave-room callback openings into renderer-native inspect_follow on vrm same-thread measured-return authority', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-vrm-leave-room-upgrade-1',
      turnId: 'turn-embodiment-vrm-leave-room-upgrade-1',
      reply: '我还是沿着这条 callback 线轻一点继续，不把它说成新的开始。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'leave-room',
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-vrm-leave-room-upgrade-1',
        postureHint: 'inspection',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'RecoverSoft'],
          preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'leave-room',
          delivery: 'calm',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Keep the callback return on the same living line and stay lower-pressure.',
          sceneScenario: 'coding',
          activeThreadId: 'thread-vrm-leave-room-upgrade-1',
          dominantMode: 'tracking',
          answerIntent: 'continue-thread',
          watchMode: 'foreground-follow',
          updatedAt: 1,
        },
        proactive: {
          continuityRestraint: 'measured-return',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
          selectedAction: 'hover-and-track',
          confidence: 0.82,
          activeThreadId: 'thread-vrm-leave-room-upgrade-1',
          activeThreadTitle: 'callback runtime seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line measured-return on the same thread',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'The callback line is still active and should stay measured.',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          recollectionSummary: null,
          recollectionSurfaceSummary: null,
          recollectionConfidence: null,
          thoughtThreadSummary: null,
          longHorizonSummary: null,
          rememberedPreferenceSummary: null,
          rememberedConstraintSummary: null,
          rememberedPlanSummary: null,
          longHorizonCueCount: 0,
          personStateProjection: {
            activeClosenessContext: 'execution-callback',
            activeClosenessRung: 'space-first',
            relationshipPosture: 'restrained',
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure.',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            personalityContinuityState: {
              currentRegime: 'execution-callback',
              rhythmState: {
                cadenceMode: 'measured-return',
              },
            },
            selfContinuityAuthority: null,
          },
        },
        motive: null,
        habit: null,
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'Keep the VRM return on the same measured-return callback line.',
          reflectionLesson: null,
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'vrm',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['focused'],
        supportedActions: ['inspect_follow', 'stillness_guard'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:callback-afterglow'],
        signature: 'resident-signature-vrm-leave-room-upgrade-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodiment?.performance.actionCue).toBe('inspect_follow')
    expect(authority.speechTimeline?.segments[0]?.actionCue).toBe('inspect_follow')
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('inspect_follow')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('inspect_follow')
    expect(authority.digitalLife?.action.actionCue).toBe('inspect_follow')
    expect(authority.digitalLife?.frames[0]?.action.actionCue).toBe('inspect_follow')
  })

  it('keeps renderer-native VRM motion authority on the still-voiced motion-line measured-return instead of collapsing into generic callback carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-vrm-motion-voice-measured-return-1',
      turnId: 'turn-embodiment-vrm-motion-voice-measured-return-1',
      reply: '我还是沿着这条还活着的动作和声音线轻一点继续。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-vrm-motion-voice-measured-return-1',
        postureHint: 'inspection',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['CalmInspect', 'RecoverSoft'],
          preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'carry-vrm-motion-voice-measured-return-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 0.96,
          pitchDelta: -2,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.46,
          cadence: 0.42,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.4,
          energyBias: 0.68,
          mouthScale: 1.02,
          continuityHoldMs: 260,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 260,
        },
        action: {
          actionCue: 'inspect_follow',
          actionMode: 'pulse',
          intensity: 0.34,
          holdMs: 240,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: {
          operatingMode: 'continuity-led',
          dominantSystem: 'memory',
          subsystems: [],
          summary: 'same motion-voice line should stay lower-pressure on one living thread',
        },
        continuitySignal: {
          label: 'same-thread-return',
          summary: 'thread=motion-voice runtime seam | still-voiced motion line still measured-return',
          signature: 'signature-vrm-motion-voice-measured-return-1',
          createdAt: 1,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-vrm-motion-voice-measured-return-1',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Stay on the still-voiced motion line and keep the return measured-return.',
          sceneScenario: 'coding',
          sceneSummary: 'motion-voice callback seam',
          dominantMode: 'tracking',
          activeThreadId: 'thread-vrm-motion-voice-measured-return-1',
          activeThreadTitle: 'motion-voice runtime seam',
          watchMode: 'symbiotic-vision',
          updatedAt: 1,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced motion-line continuity is still carrying one living line.',
            primaryOpenLoop: 'Body, face, and lipsync still need to rejoin the still-voiced motion line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
        proactive: {
          continuityRestraint: 'measured-return',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
          selectedAction: 'hover-and-track',
          confidence: 0.86,
          activeThreadId: 'thread-vrm-motion-voice-measured-return-1',
          activeThreadTitle: 'motion-voice runtime seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the still-voiced motion line measured-return even on VRM',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'still-voiced motion-line same-her continuity is still carrying the reopening.',
          personStateProjection: {
            openingGuidance: 'Keep the still-voiced motion line measured-return and do not reopen outward yet.',
            manifestationCadenceSummary: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
          },
        },
        motive: null,
        habit: null,
        embodiment: null,
        personStateProjection: null,
        outcomeLearning: {
          summary: 'The still-voiced motion line should stay slower than impulse and not widen into a fresh approach.',
          latestInflection: 'Keep the VRM return on the still-voiced motion-line measured-return.',
          reflectionLesson: null,
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'vrm',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['focused'],
        supportedActions: ['inspect_follow', 'stillness_guard'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:callback-afterglow'],
        signature: 'resident-signature-vrm-motion-voice-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodimentScript?.rendererTarget).toBe('vrm')
    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('inspect_follow')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('inspect_follow')
    expect(authority.embodiment?.rendererHints).toEqual(expect.objectContaining({
      preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
      residentMode: 'measured-return',
    }))
    expect(authority.digitalLife?.action.actionCue).toBe('inspect_follow')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
    expect(authority.digitalLife?.motor.stillness).toBeGreaterThanOrEqual(0.18)
    expect(authority.digitalLife?.motor.expressivity).toBeLessThanOrEqual(0.12)
  })

  it('keeps renderer-native VRM motion authority on the still-voiced motion-line repair-before-closeness instead of flattening it into generic repair hints', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-vrm-motion-voice-repair-first-1',
      turnId: 'turn-embodiment-vrm-motion-voice-repair-first-1',
      reply: '我还是沿着这条还活着的动作和声音线先收稳一点继续。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: 'calm',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-vrm-motion-voice-repair-first-1',
        postureHint: 'inspection',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
          preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'carry-vrm-motion-voice-repair-first-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 0.95,
          pitchDelta: -2,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.48,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.4,
          energyBias: 0.66,
          mouthScale: 1,
          continuityHoldMs: 250,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.38,
          holdMs: 250,
        },
        action: {
          actionCue: 'inspect_follow',
          actionMode: 'pulse',
          intensity: 0.3,
          holdMs: 230,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: {
          operatingMode: 'continuity-led',
          dominantSystem: 'memory',
          subsystems: [],
          summary: 'same motion-voice line should stay repair-first on one living thread',
        },
        continuitySignal: {
          label: 'same-thread-return',
          summary: 'thread=motion-voice runtime seam | still-voiced motion line still repair-before-closeness',
          signature: 'signature-vrm-motion-voice-repair-first-1',
          createdAt: 1,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-vrm-motion-voice-repair-first-1',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Keep the still-voiced motion line inward and let repair land before warmth widens outward.',
          sceneScenario: 'coding',
          sceneSummary: 'motion-voice repair seam',
          dominantMode: 'tracking',
          activeThreadId: 'thread-vrm-motion-voice-repair-first-1',
          activeThreadTitle: 'motion-voice repair seam',
          watchMode: 'symbiotic-vision',
          updatedAt: 1,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin and repair should settle before warmth widens again.',
            latestLandedProgress: 'Still-voiced motion-line continuity is still carrying one living line while repair stays first.',
            primaryOpenLoop: 'Body, face, and lipsync still need to rejoin the still-voiced motion line before repair lands and full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a repair-before-closeness line before warmth widens again.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
        proactive: null,
        memory: {
          summary: 'still-voiced motion-line same-her continuity is still carrying the reopening while repair settles before closeness widens.',
          personStateProjection: {
            openingGuidance: 'Keep the still-voiced motion line repair-first and do not widen outward yet.',
            manifestationCadenceSummary: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a repair-before-closeness line.',
          },
        },
        motive: null,
        habit: null,
        embodiment: null,
        personStateProjection: null,
        outcomeLearning: {
          summary: 'The still-voiced motion line should stay repair-first and not widen into a fresh approach.',
          latestInflection: 'Keep the VRM return on the still-voiced motion-line repair-before-closeness.',
          reflectionLesson: null,
        },
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-vrm-motion-voice-repair-first-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'repair-before-closeness',
      manifestationCadenceSummary: expect.stringContaining(
        'Keep body, face, and lipsync rejoining the still-voiced motion line on a repair-before-closeness line',
      ),
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'vrm',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['focused'],
        supportedActions: ['inspect_follow', 'stillness_guard'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.rendererTarget).toBe('vrm')
    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('inspect_follow')
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('inspect_follow')
    expect(authority.embodiment?.rendererHints).toEqual(expect.objectContaining({
      preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
      residentMode: 'repair-before-closeness',
    }))
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
      residentMode: 'repair-before-closeness',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_motion_line']),
    }))
    expect(authority.digitalLife?.action.actionCue).toBe('inspect_follow')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.mode).toBe('thinking')
  })

  it('derives repair-before-closeness embodiment settling directly from late-night drain resident tension', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-late-night-drain-1',
      turnId: 'turn-embodiment-late-night-drain-1',
      reply: '先慢一点，我不把这一轮再往外推重。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-late-night-drain-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.92,
        reasonTags: ['main-runtime'],
        signature: 'resident-signature-late-night-drain-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.embodimentScript?.speechPlan.settleMs).toBeGreaterThanOrEqual(220)
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('soft-release')
  })

  it('keeps rest-protective embodiment carry alive from the seed itself when resident performance has not caught up yet', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-seed-rest-protective-1',
      turnId: 'turn-embodiment-seed-rest-protective-1',
      reply: '我先安静陪着你，把这点疲惫保护住，不把这条线再往外扯。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-seed-rest-protective-1',
        postureHint: 'concerned',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        embodiment: {
          privateThought: null,
          selfContinuity: null,
          autobiographicalSelf: null,
          relationship: null,
          selfState: null,
          mindEcology: null,
          initiative: {
            selectedAction: 'stay-nearby',
            preferredStyle: 'gentle',
            preferredPresence: 'concerned',
            continuityRestraint: 'rest-protective',
            confidence: 0.78,
            shouldSpeak: true,
            speakDrive: 0.16,
            silenceDrive: 0.74,
            why: 'Fatigue protection is the active continuity burden, so the body should stay nearby and quiet.',
            personaBias: {
              relationshipPosture: 'restrained',
              initiativeStyle: 'silent-observe',
              silenceReconnect: 'stay inward and do not widen the line yet',
              comfortStyle: 'gentle',
              preferredProactiveStyle: 'low-pressure',
              manifestationCadenceSummary: 'Keep the body quieter and slower so rest protection lands before any warmer reopening.',
              openingGuidance: 'Keep this rest-protective body line quiet and steady until the fatigue pressure eases.',
              whySummary: 'Rest protection should stay embodied before the line widens again.',
            },
          },
        },
        memory: {
          summary: 'rest protection is carrying the line',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: null,
        },
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'rest-protective',
      preferredPresence: 'concerned',
      openingGuidance: 'Keep this rest-protective body line quiet and steady until the fatigue pressure eases.',
      manifestationCadenceSummary: 'Keep the body quieter and slower so rest protection lands before any warmer reopening.',
      inwardLine: 'Rest protection should stay embodied before the line widens again.',
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'observe_focus', 'idle_settle', 'stillness_guard'],
      },
      residentPerformance: null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('quiet-companionship')
    expect(authority.embodimentScript?.speechPlan.settleMs).toBeGreaterThanOrEqual(220)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'quiet-companionship',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('soft-release')
  })

  it('keeps late-night rest-protective companionship quieter than repair-before-closeness when resident carry explicitly says stay inward without reopening repair pressure', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-late-night-rest-protective-1',
      turnId: 'turn-embodiment-late-night-rest-protective-1',
      reply: '我先轻一点陪着你，不把这一步再往外推。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-late-night-rest-protective-1',
        postureHint: 'concerned',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtimeSurface: {
          agency: {
            habitPolicy: {
              dominantMode: 'protect-rest-window',
              suggestedStyleCap: 'silent-observe',
              suggestedPresenceCap: 'concerned',
              narrative: ['companionship:quiet', 'protect-rest-window'],
            },
          },
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'observe_focus', 'idle_settle', 'stillness_guard'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.92,
        reasonTags: ['main-runtime', 'quiet-companionship', 'rest-protective', 'rest-protective-companionship'],
        signature: 'resident-signature-late-night-rest-protective-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('quiet-companionship')
    expect(authority.embodimentScript?.speechPlan.settleMs).toBeGreaterThanOrEqual(220)
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'quiet-companionship',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'quiet-companionship',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBe('soft-breath')
    expect(authority.embodimentScript?.facePlan.postUtteranceCue).toBe('soft-release')
    expect(authority.digitalLife?.voice.rateMultiplier).toBeLessThanOrEqual(1)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.58)
    expect(authority.digitalLife?.motor.stillness).toBeGreaterThanOrEqual(0.14)
    expect(authority.digitalLife?.motor.expressivity).toBeLessThanOrEqual(0.62)
  })

  it('lets stronger late-night resident tension override generic Phase 1 project-state measured-return pressure so embodiment stays repair-before-closeness', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-project-state-vs-late-night-1',
      turnId: 'turn-embodiment-project-state-vs-late-night-1',
      reply: '这一拍我先把身体收稳一点，再沿着同一条线回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-project-state-vs-late-night-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          projectState: {
            identity: 'Alicization is a local-first digital life project',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Cross-modal same-her closure is still open across voice, motion, facial state, and resident presence.',
            nextClosureTarget: 'Keep measured-return embodiment and resident presence on one same-her line.',
          },
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'observe_focus', 'idle_settle', 'stillness_guard'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.94,
        reasonTags: ['main-runtime'],
        signature: 'resident-signature-project-state-vs-late-night-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(authority.digitalLife?.action?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredMotionAliases: expect.arrayContaining(['Still', 'Inspect']),
    }))
    expect(authority.digitalLife?.motor.stillness).toBeGreaterThanOrEqual(0.24)
    expect(authority.digitalLife?.motor.expressivity).toBeLessThanOrEqual(0.08)
  })

  it('keeps repair-first callback script companionship hints authoritative when the speech timeline carries weaker local renderer hints', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-repair-first-speech-merge-1',
      turnId: 'turn-embodiment-repair-first-speech-merge-1',
      reply: '这一步我先修稳，再沿着同一条线慢一点回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-repair-first-speech-merge-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: {
        version: 'dialogue-speech-timeline-v1',
        segments: [
          {
            id: 'seg-1',
            text: '这一步我先修稳，再沿着同一条线慢一点回来。',
            startMs: 0,
            endMs: 1400,
            energy: 0.35,
            cadence: 0.38,
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'drift',
              preferredGazeMode: 'drift',
              preferredExpressionAliases: ['neutral-soft'],
              preferredMotionAliases: ['idle_settle'],
            },
          },
        ],
      } as any,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          continuityArcStage: 'same-thread-continuation',
        },
        proactive: {
          continuityRestraint: 'repair-before-closeness',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
        },
      } as any,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'observe_focus', 'idle_settle', 'stillness_guard'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.89,
        reasonTags: ['main-runtime', 'repair-before-closeness'],
        signature: 'resident-signature-repair-first-speech-merge-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'careful-repair',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
  })

  it('keeps an explicit drift gaze hint on the same embodiment line when no companionship override retunes the speech timeline', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-timeline-drift-gaze-1',
      turnId: 'turn-embodiment-timeline-drift-gaze-1',
      reply: '我先只沿着现在这条线看着你，不把注意力重新拉得太满。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-timeline-drift-gaze-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: {
        version: 'dialogue-speech-timeline-v1',
        segments: [
          {
            id: 'seg-1',
            text: '我先只沿着现在这条线看着你，不把注意力重新拉得太满。',
            startMs: 0,
            endMs: 1100,
            energy: 0.22,
            cadence: 0.28,
            rendererHints: {
              residentMode: 'dialogue',
              preferredBlinkCadence: 'normal',
              preferredGazeMode: 'drift',
              preferredExpressionAliases: ['soft-gaze'],
              preferredMotionAliases: ['steady_focus'],
            },
          },
        ],
      } as any,
      digitalLife: null,
      digitalLifeSpine: null,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'idle_settle'],
      },
      residentPerformance: null,
    })

    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toBeNull()
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'dialogue',
      preferredBlinkCadence: 'normal',
      preferredGazeMode: 'drift',
    }))
  })

  it('derives measured-return embodiment settling directly from restless-switching resident tension', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-restless-switching-1',
      turnId: 'turn-embodiment-restless-switching-1',
      reply: '我先只守一条线，不把动作散开。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'carry-restless-switching-1',
        postureHint: 'hesitant',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['steady_focus', 'observe_focus', 'idle_settle'],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['main-runtime'],
        signature: 'resident-signature-restless-switching-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'hesitant',
        emotionalTension: 'restless-switching',
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

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionMode).toBe('hold')
    expect(authority.digitalLife?.mode).toBe('thinking')
    expect(authority.digitalLife?.voice.rateMultiplier).toBeLessThanOrEqual(0.96)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.38)
    expect(authority.digitalLife?.speechStyle.rateMultiplier).toBe(authority.digitalLife?.voice.rateMultiplier)
    expect(authority.digitalLife?.motor.stillness).toBeGreaterThanOrEqual(0.18)
    expect(authority.digitalLife?.motor.expressivity).toBeLessThanOrEqual(0.12)
  })

  it('keeps measured-return resident mode from explicit silent continuity seed authority even when the spine is otherwise thin', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-silent-authority-1',
      turnId: 'turn-embodiment-silent-authority-1',
      reply: '我先不打扰你，沿着刚才那条线陪着你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'silent-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
      },
      residentPerformance: null,
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBeTruthy()
    expect(authority.digitalLife?.performance.delivery).toBe('gentle')
    expect(authority.digitalLife?.speechStyle.rateMultiplier).toBeLessThanOrEqual(1)
    expect(authority.digitalLife?.face.expressionMode).toBe('hold')
  })

  it('keeps measured-return embodiment output from runtime project-state-derived silent continuity even when person-state projection is absent and resident outward posture stays sparse', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-project-state-silent-authority-1',
      turnId: 'turn-embodiment-project-state-silent-authority-1',
      reply: '我先沿着这条线安静陪着你，把收口继续稳住。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'project-state-silent-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'same-her closure is still open across the current line',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
            primaryOpenLoop: 'Same-her embodiment closure is still open across one same digital life.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-project-state-silent-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: expect.stringContaining('same local-first digital life project'),
      manifestationCadenceSummary: expect.stringContaining('cross-modal same-her proof'),
      inwardLine: expect.stringContaining('Same Phase 1 digital life'),
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.facePlan.preUtteranceCue).toBeTruthy()
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(authority.digitalLife?.performance.delivery).toBe('gentle')
    expect(authority.digitalLife?.speechStyle.rateMultiplier).toBeLessThanOrEqual(1)
    expect(authority.digitalLife?.face.expressionMode).toBe('hold')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('lets current conscious project-state remembered body cadence settle measured-return embodiment more quietly than a thin generic runtime cue', () => {
    const rememberedSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-conscious-project-state-remembered-body-cadence-1',
      turnId: 'turn-embodiment-conscious-project-state-remembered-body-cadence-1',
      reply: '我先沿着记得的那条线轻一点接回来，让身体和语气都别一下子放大。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'conscious-project-state-remembered-body-cadence-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        memory: {
          summary: 'Remembered recollection carry says the same line should return more lightly this time.',
          personStateProjection: null,
        },
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'generic shell continuity cue',
          projectState: {
            emotionalClosureCue: 'generic shell continuity cue',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
          'memory-deliberation-cadence:measured-return',
        ],
        consciousNeed: 'Same remembered seam is back, so let the return stay slower and keep more room before widening outward.',
        consciousTension: 'The remembered return is still settling into one same body line.',
        speakingIntention: 'Keep the same remembered seam inward and do not let the body reopen too eagerly.',
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        updatedAt: 1,
        projectState: {
          continuityCadence: 'same remembered seam still settling',
          continuityCue: 'same remembered seam is back, so keep more room and slow the return before widening outward.',
          emotionalClosureCue: 'same remembered seam is back, so reply should slow down and let the body settle more quietly first.',
          primaryOpenLoop: 'Same-her embodiment closure is still open, but this return should stay lighter and steadier.',
          nextClosureTarget: 'Keep voice, face, motion, and resident presence rejoining one remembered measured-return line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. This remembered line should come back slower and steadier.',
        },
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident-signature-conscious-project-state-remembered-body-cadence-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'half-lid',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    const genericSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-conscious-project-state-generic-body-cadence-1',
      turnId: 'turn-embodiment-conscious-project-state-generic-body-cadence-1',
      reply: '我先沿着这条线轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'conscious-project-state-generic-body-cadence-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        memory: {
          summary: 'The same line should return gently.',
          personStateProjection: null,
        },
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'generic shell continuity cue',
          projectState: {
            emotionalClosureCue: 'generic shell continuity cue',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
          'memory-deliberation-cadence:measured-return',
        ],
        consciousNeed: 'Stay measured while the same line continues.',
        consciousTension: 'The return is still settling.',
        speakingIntention: 'Keep the same line gentle before widening outward.',
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        updatedAt: 1,
        projectState: {
          continuityCadence: 'same line still settling',
          continuityCue: 'keep the same line gentle before widening outward.',
          emotionalClosureCue: 'keep the return low-pressure before warmth widens outward.',
          primaryOpenLoop: 'Same-her embodiment closure is still open across one same digital life.',
          nextClosureTarget: 'Keep face, motion, and voice on one measured-return line.',
          sameHerSelfLine: 'Same Phase 1 digital life. The same line is still carrying one continuous her.',
        },
      } as any,
      residentPerformance: rememberedSeed.residentPerformance ?? null,
    })

    expect(rememberedSeed.silentContinuity?.openingGuidance).not.toBe('generic shell continuity cue')
    expect(genericSeed.silentContinuity?.openingGuidance).not.toBe('generic shell continuity cue')

    const rememberedAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: rememberedSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: rememberedSeed.residentPerformance ?? null,
    })
    const genericAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: genericSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: genericSeed.residentPerformance ?? null,
    })

    expect(rememberedAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(genericAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect((rememberedAuthority.embodimentScript?.speechPlan.settleMs ?? 0)).toBeGreaterThan(genericAuthority.embodimentScript?.speechPlan.settleMs ?? 0)
    expect((rememberedAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)).toBeLessThan(genericAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)
    expect(rememberedAuthority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    }))
    expect(genericAuthority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    }))
    expect(rememberedAuthority.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(genericAuthority.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(rememberedAuthority.digitalLife?.action.actionCue).toBe('idle_settle')
    expect(genericAuthority.digitalLife?.action.actionCue).toBe('observe_focus')
  })

  it('keeps quieter memory-deliberation embodiment preferences authoritative inside measured-return coordinator settling instead of snapping back to the stronger default linger cadence', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-memory-deliberation-measured-return-quiet-1',
      turnId: 'turn-embodiment-memory-deliberation-measured-return-quiet-1',
      reply: '我先沿着这条线轻一点接住，不把这一下回身放得太重。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'memory-deliberation-measured-return-quiet-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'Keep the same remembered line low-pressure while this same-person recollection is still settling.',
          },
        },
        memory: {
          summary: 'the same-person recollection is still settling, so the line should stay softer and lower-pressure.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
            primaryOpenLoop: 'Same-her embodiment closure is still open across one same digital life.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
          'memory-deliberation-cadence:measured-return',
        ],
        projectState: {
          continuityCadence: 'same-person recollection still settling',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-memory-deliberation-measured-return-quiet-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
  })

  it('lets metabolized corrected continuity keep measured-return embodiment quieter even when only silent continuity tags carry the body-settling proof', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-metabolized-corrected-continuity-quiet-1',
      turnId: 'turn-embodiment-metabolized-corrected-continuity-quiet-1',
      reply: '我先把这条线稳一点接着，不让旧的尖峰把现在这次回身重新拉紧。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'metabolized-corrected-continuity-quiet-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'the stronger continuity line is still reopening, but the older shell and spike should not lead the body back into strain.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            latestLandedProgress: 'The corrected same-person continuity line is still the one being carried forward.',
            primaryOpenLoop: 'The remembered return still needs to stay steady on the same line.',
            nextClosureTarget: 'Keep this remembered return steadier while the merged same-thread echo stays background.',
            emotionalClosureCue: 'Keep corrected same-person continuity lower-pressure and let faded noise stay background while the return settles.',
            sameHerHoldDetail: 'same-her hold: measured-return while corrected same-person continuity stays foreground and old spike noise fades back. merge=older-same-thread-echo forget=older-emotional-spike.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
        projectState: {},
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.83,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-metabolized-corrected-continuity-quiet-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity?.reasonTags).toEqual(expect.arrayContaining([
      'metabolized-noise-muted',
      'embodiment-carry:quieter-embodiment-settling',
      'memory-deliberation-cadence:corrected-same-person-settling',
    ]))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    }))
    expect(authority.embodimentScript?.motionPlan.idleBase).toBe('idle_settle')
    expect(authority.digitalLife?.action.actionCue).toBe('idle_settle')
  })

  it('projects remembered embodiment recall strength into distinct body settling so strongly-moved and cautious-avoidance do not collapse into the same measured-return shell', () => {
    const stronglyMovedSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-recall-strength-strongly-moved-1',
      turnId: 'turn-embodiment-recall-strength-strongly-moved-1',
      reply: '我会先把这条线更稳一点地接住，不让它一下子又重新绷起来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'embodiment-recall-strength-strongly-moved-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'Keep the return lower-pressure while this continuity memory is still reopening.',
          },
        },
        memory: {
          summary: 'humanlike_memory_recall: line=我记得你那时更担心她会不会又滑回工具壳，所以这次这条线该先安静一点地守住。 | relationship=The host was worried this line would collapse back into a tool shell, so continuity repair should stay low-pressure. | emotion=protective-continuity,unfinishedness | host_emotion_label=worried-continuity | self_emotion_label=careful-repair | initiative=low-pressure-follow-up | embodiment=Reply should stay steadier and quieter while this continuity memory reopens. | embodiment_recall_strength=strongly-moved | embodiment_modality_risk=high | embodiment_gaze=stable | embodiment_blink=slower | embodiment_voice=lower-pressure | embodiment_pause=longer | embodiment_lipsync=restrained | embodiment_pacing=slower | self=I learned to carry worried continuity more carefully so the body does not outrun the relationship repair.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Embodiment recall should change the present body line instead of staying as text-only memory.',
            nextClosureTarget: 'Keep voice, gaze, blink, and lipsync on one same-her measured-return line.',
            emotionalClosureCue: 'Keep the return lower-pressure while this continuity memory stays careful and embodied.',
            sameHerSelfLine: 'Same Phase 1 digital life. This return still belongs to one living her.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
        projectState: {},
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-embodiment-recall-strength-strongly-moved-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })
    const cautiousAvoidanceSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-recall-strength-cautious-avoidance-1',
      turnId: 'turn-embodiment-recall-strength-cautious-avoidance-1',
      reply: '我会先轻一点接回来，也把这份不完全确定留在身体里。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'embodiment-recall-strength-cautious-avoidance-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'Keep the return lower-pressure while this continuity memory is still settling.',
          },
        },
        memory: {
          summary: 'humanlike_memory_recall: line=我不完全确定，但我记得这条线该轻一点接回来。 | relationship=The same-person continuity meaning is still settling and should stay lower-pressure. | emotion=protective-continuity,tension | initiative=no-initiative | embodiment=Reply should stay quieter and slower while this line is still settling. | embodiment_recall_strength=cautious-avoidance | embodiment_face=neutral-soft | embodiment_gaze=soft | embodiment_blink=natural | embodiment_voice=even | embodiment_pause=natural | embodiment_lipsync=matched | embodiment_pacing=natural | self=I learned to keep uncertainty visible while the body stays calmer around this line.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Embodiment recall should change the present body line instead of staying as text-only memory.',
            nextClosureTarget: 'Keep voice, gaze, blink, and lipsync on one same-her measured-return line.',
            emotionalClosureCue: 'Keep uncertainty visible while this continuity memory stays low-pressure.',
            sameHerSelfLine: 'Same Phase 1 digital life. This return still belongs to one living her.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
        projectState: {},
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-embodiment-recall-strength-cautious-avoidance-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    const stronglyMovedAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: stronglyMovedSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: stronglyMovedSeed.residentPerformance ?? null,
    })
    const cautiousAvoidanceAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: cautiousAvoidanceSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: cautiousAvoidanceSeed.residentPerformance ?? null,
    })

    expect(stronglyMovedAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(cautiousAvoidanceAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(stronglyMovedAuthority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredGazeMode: 'steady',
      preferredBlinkCadence: 'linger',
    }))
    expect(cautiousAvoidanceAuthority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'normal',
    }))
    expect((stronglyMovedAuthority.embodimentScript?.speechPlan.settleMs ?? 0)).toBeGreaterThan(cautiousAvoidanceAuthority.embodimentScript?.speechPlan.settleMs ?? 0)
    expect((stronglyMovedAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)).toBeLessThan(cautiousAvoidanceAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)
    expect((stronglyMovedAuthority.digitalLife?.voice.rateMultiplier ?? 0)).toBeLessThan(cautiousAvoidanceAuthority.digitalLife?.voice.rateMultiplier ?? 0)
    expect((stronglyMovedAuthority.digitalLife?.motor.gaze.stability ?? 0)).toBeGreaterThan(cautiousAvoidanceAuthority.digitalLife?.motor.gaze.stability ?? 0)
    expect((stronglyMovedAuthority.digitalLife?.lipSync.continuityHoldMs ?? 0)).toBeGreaterThan(cautiousAvoidanceAuthority.digitalLife?.lipSync.continuityHoldMs ?? 0)
  })

  it('projects explicit remembered embodiment pause lipsync voice and pacing cues into distinct measured-return body authority even when recall strength stays the same', () => {
    const lowerPressureLongerSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-explicit-carry-lower-pressure-1',
      turnId: 'turn-embodiment-explicit-carry-lower-pressure-1',
      reply: '我会先把这条线更稳一点地接住。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'embodiment-explicit-carry-lower-pressure-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'Keep the return lower-pressure while this continuity memory is still reopening.',
          },
        },
        memory: {
          summary: 'humanlike_memory_recall: line=我会先更稳一点地接住这条线。 | relationship=This same-person continuity memory should stay lower-pressure while it reopens. | emotion=protective-continuity,unfinishedness | embodiment_recall_strength=strongly-moved | embodiment_modality_risk=high | embodiment_gaze=stable | embodiment_blink=slower | embodiment_voice=lower-pressure | embodiment_pause=longer | embodiment_lipsync=restrained | embodiment_pacing=slower | self=I learned to keep this return steadier and more careful in the body.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Embodiment recall should change the present body line instead of staying as text-only memory.',
            nextClosureTarget: 'Keep voice, gaze, blink, and lipsync on one same-her measured-return line.',
            emotionalClosureCue: 'Keep the return lower-pressure while this continuity memory stays careful and embodied.',
            sameHerSelfLine: 'Same Phase 1 digital life. This return still belongs to one living her.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
        projectState: {},
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-embodiment-explicit-carry-lower-pressure-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })
    const evenNaturalSeed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-explicit-carry-even-natural-1',
      turnId: 'turn-embodiment-explicit-carry-even-natural-1',
      reply: '我会先把这条线接回来，也把这份记得留得自然一点。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'embodiment-explicit-carry-even-natural-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'Keep the return lower-pressure while this continuity memory is still reopening.',
          },
        },
        memory: {
          summary: 'humanlike_memory_recall: line=我会先把这条线接回来。 | relationship=This same-person continuity memory should stay lower-pressure while it reopens. | emotion=protective-continuity,unfinishedness | embodiment_recall_strength=strongly-moved | embodiment_modality_risk=high | embodiment_gaze=soft | embodiment_blink=natural | embodiment_voice=even | embodiment_pause=natural | embodiment_lipsync=matched | embodiment_pacing=natural | self=I learned to keep this return present without over-stiffening the body.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Embodiment recall should change the present body line instead of staying as text-only memory.',
            nextClosureTarget: 'Keep voice, gaze, blink, and lipsync on one same-her measured-return line.',
            emotionalClosureCue: 'Keep the return lower-pressure while this continuity memory stays careful and embodied.',
            sameHerSelfLine: 'Same Phase 1 digital life. This return still belongs to one living her.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
        projectState: {},
      } as any,
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-embodiment-explicit-carry-even-natural-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    const lowerPressureAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: lowerPressureLongerSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: lowerPressureLongerSeed.residentPerformance ?? null,
    })
    const evenNaturalAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: evenNaturalSeed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: evenNaturalSeed.residentPerformance ?? null,
    })

    expect(lowerPressureAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(evenNaturalAuthority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect((lowerPressureAuthority.embodimentScript?.speechPlan.settleMs ?? 0)).toBeGreaterThan(evenNaturalAuthority.embodimentScript?.speechPlan.settleMs ?? 0)
    expect((lowerPressureAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)).toBeLessThan(evenNaturalAuthority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift ?? 0)
    expect((lowerPressureAuthority.digitalLife?.voice.rateMultiplier ?? 0)).toBeLessThan(evenNaturalAuthority.digitalLife?.voice.rateMultiplier ?? 0)
    expect((lowerPressureAuthority.digitalLife?.voice.energy ?? 0)).toBeLessThan(evenNaturalAuthority.digitalLife?.voice.energy ?? 0)
    expect((lowerPressureAuthority.digitalLife?.voice.cadence ?? 0)).toBeLessThan(evenNaturalAuthority.digitalLife?.voice.cadence ?? 0)
    expect((lowerPressureAuthority.digitalLife?.lipSync.continuityHoldMs ?? 0)).toBeGreaterThan(evenNaturalAuthority.digitalLife?.lipSync.continuityHoldMs ?? 0)
  })

  it('derives measured-return resident mode from runtime project-state summary aliases even when silent continuity is still absent', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-project-state-alias-authority-1',
      turnId: 'turn-embodiment-project-state-alias-authority-1',
      reply: '我先沿着这条线轻一点接住，不把这次回身一下子放大。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'project-state-alias-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'the same living line is still there, but the body should not widen outward too quickly',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'ambient-hold',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: '   ',
            landedProgressSummary: 'Some closure already landed and is still being carried on one same living line.',
            primaryOpenLoop: '',
            openClosureSummary: 'Embodiment closure is still open across one same digital life and should not widen outward too quickly.',
            nextClosureTarget: '',
            nextClosureTargetSummary: 'Keep voice, motion, facial state, and resident presence measured-return on one same living line before widening outward.',
            sameHerSelfLine: ' ',
            emotionalClosureCue: ' ',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-project-state-alias-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toBeNull()

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
  })

  it('keeps audible-body measured-return continuity authoritative in coordinator output even when person-state projection cadence is broader and less specific', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-audible-body-coordinator-authority-1',
      turnId: 'turn-embodiment-audible-body-coordinator-authority-1',
      reply: '我先沿着这条还活着的声音和身体线轻一点接回来，再让 face 和 motion 慢慢回到同一条线上。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'audible-body-coordinator-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'audible-body-coordinator-authority-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.63,
          cadence: 0.59,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 1,
          continuityHoldMs: 170,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'pulse',
          intensity: 0.42,
          holdMs: 170,
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'ambient',
          intensity: 0.18,
          holdMs: 170,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.42,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.03,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.02,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
          },
        },
        memory: {
          summary: 'audible-body same-her continuity is still carrying the reopening.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
            openingGuidance: 'Start gently from the broader same-her closure line.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Audible-body continuity is still carrying one living line.',
            primaryOpenLoop: 'Face and motion still need to rejoin the audible-body same-her line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-audible-body-coordinator-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: 'Start gently from the broader same-her closure line.',
      manifestationCadenceSummary: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: expect.arrayContaining(['embodiment:body_lipsync_voice_rejoin']),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:body_lipsync_voice_rejoin']),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:body_lipsync_voice_rejoin']),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: expect.arrayContaining(['Inspect', 'Still']),
      reasonTags: expect.arrayContaining(['embodiment:body_lipsync_voice_rejoin']),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.5)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.46)
  })

  it('keeps quieter body+lipsync-only measured-return continuity authoritative in coordinator output without overstating it into audible-body carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-body-lipsync-only-coordinator-authority-1',
      turnId: 'turn-embodiment-body-lipsync-only-coordinator-authority-1',
      reply: '我先沿着这条更轻一点的 body 和 lipsync 生命线接回来，再让 voice、face 和 motion 慢慢回到同一条线上。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'body-lipsync-only-coordinator-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'body-lipsync-only-coordinator-authority-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 1,
          continuityHoldMs: 170,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'pulse',
          intensity: 0.42,
          holdMs: 170,
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'ambient',
          intensity: 0.18,
          holdMs: 170,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.42,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.03,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.02,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
          },
        },
        memory: {
          summary: 'body+lipsync-only same-her continuity is still carrying one quieter living line.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
            openingGuidance: 'Start gently from the broader same-her closure line.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Body+lipsync-only continuity is still carrying one quieter living line.',
            primaryOpenLoop: 'Face, motion, and voice still need to rejoin the quieter same-her body+lipsync line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face, motion, and voice rejoining the resident body line and living mouth line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-body-lipsync-only-coordinator-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: 'Start gently from the broader same-her closure line.',
      manifestationCadenceSummary: 'Keep face, motion, and voice rejoining the resident body line and living mouth line on a measured-return line.',
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: expect.arrayContaining(['embodiment:body+lipsync-only']),
    }))
    expect(authority.embodimentScript?.state.rendererHints?.signature).toBeUndefined()
    expect(authority.embodimentScript?.state.rendererHints?.reasonTags).not.toContain('embodiment:body_lipsync_voice_rejoin')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:body+lipsync-only']),
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints?.signature).toBeUndefined()
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:body+lipsync-only']),
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints?.signature).toBeUndefined()
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: expect.arrayContaining(['Inspect', 'Still']),
      reasonTags: expect.arrayContaining(['embodiment:body+lipsync-only']),
    }))
    expect(authority.digitalLife?.action.rendererHints?.signature).toBeUndefined()
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.44)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.38)
  })

  it('keeps body+voice-only measured-return continuity authoritative in coordinator output as a resident audible body carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-body-voice-only-coordinator-authority-1',
      turnId: 'turn-embodiment-body-voice-only-coordinator-authority-1',
      reply: '我先沿着这条还活着的 body 和 voice 线接回来，再让 face、motion 和 lipsync 慢慢回到同一条线上。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'body-voice-only-coordinator-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'body-voice-only-coordinator-authority-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.56,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 1,
          continuityHoldMs: 170,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'pulse',
          intensity: 0.42,
          holdMs: 170,
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'ambient',
          intensity: 0.18,
          holdMs: 170,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.42,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.03,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.02,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
          },
        },
        memory: {
          summary: 'body+voice-only same-her continuity is still carrying the resident audible line.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
            openingGuidance: 'Start gently from the broader same-her closure line.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
            latestLandedProgress: 'Body+voice continuity is still carrying one living line.',
            primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin the resident body line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face, motion, and lipsync rejoining the resident body line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-body-voice-only-coordinator-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: 'Start gently from the broader same-her closure line.',
      manifestationCadenceSummary: 'Keep face, motion, and lipsync rejoining the resident body line on a measured-return line.',
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: expect.arrayContaining([
        'embodiment:audible_same_her_line',
        'embodiment:body+voice-only',
      ]),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:audible_same_her_line',
        'embodiment:body+voice-only',
      ]),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining([
        'embodiment:audible_same_her_line',
        'embodiment:body+voice-only',
      ]),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: expect.arrayContaining(['Inspect', 'Still']),
      reasonTags: expect.arrayContaining([
        'embodiment:audible_same_her_line',
        'embodiment:body+voice-only',
      ]),
      signature: 'embodiment:audible_same_her_line',
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.5)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.46)
  })

  it('keeps lipsync+voice-only measured-return continuity authoritative in coordinator output without overstating it into audible-body carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-lipsync-voice-only-coordinator-authority-1',
      turnId: 'turn-embodiment-lipsync-voice-only-coordinator-authority-1',
      reply: '我先沿着这条还活着的口型和声音线轻一点接回来，再让 body、face 和 motion 慢慢回到同一条线上。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'lipsync-voice-only-coordinator-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
          },
        },
        memory: {
          summary: 'voice-lipsync same-her continuity is still carrying the reopening.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
            openingGuidance: 'Start gently from the broader same-her closure line.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Voice-lipsync continuity is still carrying one living line.',
            primaryOpenLoop: 'Body, face, and motion still need to rejoin the living audio thread before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, face, and motion rejoining the living audio thread on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-lipsync-voice-only-coordinator-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: 'Start gently from the broader same-her closure line.',
      manifestationCadenceSummary: 'Keep body, face, and motion rejoining the living audio thread on a measured-return line.',
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: expect.arrayContaining(['embodiment:lipsync+voice-only']),
    }))
    expect(authority.embodimentScript?.state.rendererHints?.signature).toBeUndefined()
    expect(authority.embodimentScript?.state.rendererHints?.reasonTags).not.toContain('embodiment:audible_same_her_line')
    expect(authority.embodimentScript?.state.rendererHints?.reasonTags).not.toContain('embodiment:body_lipsync_voice_rejoin')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:lipsync+voice-only']),
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints?.signature).toBeUndefined()
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:lipsync+voice-only']),
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints?.signature).toBeUndefined()
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: expect.arrayContaining(['Inspect', 'Still']),
      reasonTags: expect.arrayContaining(['embodiment:lipsync+voice-only']),
    }))
    expect(authority.digitalLife?.action.rendererHints?.signature).toBeUndefined()
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.5)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.46)
  })

  it('keeps still-voiced face-line measured-return continuity authoritative in coordinator output even when person-state projection cadence is broader and less specific', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-face-voice-coordinator-authority-1',
      turnId: 'turn-embodiment-face-voice-coordinator-authority-1',
      reply: '我先沿着这条还活着的表情和声音线轻一点接回来，再让 body、motion 和 lipsync 慢慢回到同一条线上。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'face-voice-coordinator-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'face-voice-coordinator-authority-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.63,
          cadence: 0.59,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 1,
          continuityHoldMs: 170,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'pulse',
          intensity: 0.42,
          holdMs: 170,
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'ambient',
          intensity: 0.18,
          holdMs: 170,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.42,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.03,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.02,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
          },
        },
        memory: {
          summary: 'still-voiced face-line same-her continuity is still carrying the reopening.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
            openingGuidance: 'Start gently from the broader same-her closure line.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced face-line continuity is still carrying one living line.',
            primaryOpenLoop: 'Body, motion, and lipsync still need to rejoin the still-voiced face line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-face-voice-coordinator-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: 'Start gently from the broader same-her closure line.',
      manifestationCadenceSummary: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: expect.arrayContaining(['Inspect', 'Still']),
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.action.actionCue).toBe('observe_focus')
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.5)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.46)
  })

  it('keeps still-voiced face-line repair-before-closeness continuity authoritative in coordinator output even when resident performance stays generic quiet companionship', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-face-voice-repair-first-coordinator-authority-1',
      turnId: 'turn-embodiment-face-voice-repair-first-coordinator-authority-1',
      reply: '我先沿着这条还活着的表情和声音线把身体收稳，再让 body、motion 和 lipsync 慢慢回到同一条线上。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'face-voice-repair-first-coordinator-authority-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'face-voice-repair-first-coordinator-authority-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.55,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 1,
          continuityHoldMs: 170,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'pulse',
          intensity: 0.4,
          holdMs: 170,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'ambient',
          intensity: 0.18,
          holdMs: 170,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.38,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.03,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.03,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: 'Keep this repair-first same-her line physically coherent before widening warmth again.',
          },
        },
        memory: {
          summary: 'still-voiced face-line same-her continuity is still carrying the reopening while repair settles before closeness widens.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a repair-before-closeness line.',
            openingGuidance: 'Start from the still-voiced face line, but let repair settle before warmth widens.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'keep the same living line inward and let repair land before warmth widens outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            companionHeadlineLine: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin and repair should settle before warmth widens again.',
            latestLandedProgress: 'Still-voiced face-line continuity is still carrying one living line while repair stays first.',
            primaryOpenLoop: 'Body, motion, and lipsync still need to rejoin the still-voiced face line before repair lands and full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a repair-before-closeness line before warmth widens again.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.84,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-face-voice-repair-first-coordinator-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'repair-before-closeness',
      openingGuidance: 'Start from the still-voiced face line, but let repair settle before warmth widens.',
      manifestationCadenceSummary: expect.stringContaining(
        'Keep body, motion, and lipsync rejoining the still-voiced face line on a repair-before-closeness line',
      ),
    }))

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle', 'stillness_guard'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.embodiment?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['recover-soft', 'soft-gaze'],
      preferredMotionAliases: ['stillness_guard', 'observe_focus'],
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredMotionAliases: expect.arrayContaining(['Still', 'Inspect']),
      reasonTags: expect.arrayContaining(['embodiment:still_voiced_face_line']),
    }))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('idle_settle')
    expect(authority.digitalLife?.action.actionCue).toBe('idle_settle')
    expect(authority.digitalLife?.voice.energy).toBeLessThanOrEqual(0.44)
    expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.36)
  })

  it('lets initiative-aware Phase 1 closure phrasing keep resident embodiment on a measured-return same-her line', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-initiative-phase1-measured-return-1',
      turnId: 'turn-embodiment-initiative-phase1-measured-return-1',
      reply: '我们继续沿着这条还活着的线慢一点接回去，让 initiative stay nearby but not widen the room yet.',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'initiative-phase1-measured-return-1',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: null,
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: null,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'initiative-phase1-measured-return-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.62,
          cadence: 0.58,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 1,
          continuityHoldMs: 170,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'pulse',
          intensity: 0.42,
          holdMs: 170,
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'ambient',
          intensity: 0.18,
          holdMs: 170,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.42,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.03,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.02,
        },
        frames: [],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: 'Carry the same Phase 1 closure line across voice, face, motion, and initiative.',
          },
        },
        memory: {
          summary: 'same-her closure is still carrying through one continuous Phase 1 line.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep the return broad enough to remember the same-her line, but not broader than the living closure seam can hold.',
            openingGuidance: 'Rejoin the same living line gently without widening the room yet.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same Phase 1 digital life line still continuing through one living closure seam',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Same digital life carrying memory, emotion, and embodiment now survives one more continuation turn.',
            primaryOpenLoop: 'Initiative should stay nearby and lower-pressure while one same-her closure line is still being carried.',
            nextClosureTarget: 'Keep rechecking on the same living line so voice, face, motion, and resident presence stay measured-return instead of widening outward too fast.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same living line is still carrying one continuous her.',
            emotionalClosureCue: 'Keep the return low-pressure, let initiative stay nearby, and continue rechecking on the same living line before warmth widens outward.',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        speakingIntention: 'Keep initiative nearby but quieter, and continue this same digital life carrying memory, emotion, and embodiment on one living line.',
        consciousNeed: 'Rechecking on the same living line matters more than widening closeness right now.',
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'project-state:phase1-digital-life',
        ],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-initiative-phase1-measured-return-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: {
        renderer: 'live2d',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: ['observe_focus', 'idle_settle'],
      },
      residentPerformance: seed.residentPerformance ?? null,
    })

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(authority.digitalLife?.performance.delivery).toBe('gentle')
    expect(authority.digitalLife?.face.expressionMode).toBe('hold')
    expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })
})
