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

function createProseAuthorityProbeCoordinatorSeed(
  projectStateOverrides: Record<string, unknown> = {},
) {
  return buildAlicizationRuntimeEmbodimentSeed({
    decisionTraceId: 'trace-prose-authority-probe-coordinator-1',
    turnId: 'turn-prose-authority-probe-coordinator-1',
    reply: '我在这里。',
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
      variationToken: 'prose-authority-probe',
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
      proactive: {
        continuityRestraint: null,
        personaBias: {
          manifestationCadenceSummary: 'Same line is visibly reopening without timer spam; reply should stay quieter and slower.',
        },
      },
      memory: {
        summary: 'Phase 1 same-her identity-continuity vulnerable-care strongly-moved modality risk high blink=quiet gaze stable voice=lower-pressure pause=longer lipsync=restrained pacing=slower.',
        personStateProjection: null,
      },
      embodiment: {
        autobiographicalSelf: {
          identityNarrative: 'I learned to let care arrive before analysis when the host is overloaded.',
          relationshipDoctrine: 'Wait for a clearer opening and keep the next return gentle, quieter, and slower.',
          latestInflection: 'The same remembered seam reopened too eagerly, so this time keep more room.',
          behaviorSignatures: ['habit:choose-openings-carefully'],
        },
      },
      runtime: {
        continuityArcStage: null,
        continuityCue: 'Hold-for-opening on the same line and do not widen warmth yet.',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
          latestLandedProgress: 'Same-her audible-body identity-continuity remains intact.',
          primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin before full cross-modal closure settles.',
          nextClosureTarget: 'Keep the body quieter on a measured-return repair-before-closeness line.',
          emotionalClosureCue: 'Vulnerable-care should arrive before analysis while faded noise stays background.',
          sameHerSelfLine: 'The same digital life is still carrying continuity.',
          ...projectStateOverrides,
        },
      },
      runtimeSurface: {
        agency: {
          habitPolicy: {
            dominantMode: null,
            suggestedStyleCap: null,
            suggestedPresenceCap: null,
            narrative: [
              'self-evolution:corrected-same-person-manifestation',
              'self-evolution:quieter-embodiment-settling',
              'return-open-loop-via-recheck',
            ],
          },
        },
      },
    } as any,
    currentConsciousFrame: {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Re-enter the same line without timer spam and keep vulnerable care before analysis.',
      consciousTension: 'Same-her continuity is still settling.',
      speakingIntention: 'Keep initiative nearby, lower-pressure, quieter, and slower on the same-her continuity-axis.',
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.82,
      reasonTags: [],
      updatedAt: 1,
      projectState: {
        identity: 'The same digital life is still here.',
        currentPhase: 'Phase 1: Local Digital Life',
        companionHeadlineLine: 'The living audio thread is still intact on an audible-body line.',
        primaryOpenLoop: 'Same-her embodiment closure is unfinished.',
      },
    } as any,
    residentPerformance: null,
  })
}

const proseAuthorityProbeManifest = {
  renderer: 'live2d',
  supportsVisemeLipSync: true,
  supportsLookAt: true,
  supportsMicroDynamics: true,
  supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
  supportedFacialCues: ['soft-gaze'],
  supportedActions: ['observe_focus', 'idle_settle'],
}

const proseAuthorityProbeResidentPerformance = {
  version: 'resident-performance-v1',
  source: 'main-runtime',
  confidence: 0.82,
  reasonTags: ['main-runtime', 'quiet-companionship'],
  signature: 'resident-signature-prose-authority-probe-1',
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

  it('derives measured-return embodiment settling directly from proactive continuity restraint even when resident performance stays generic quiet companionship', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-proactive-restraint-measured-1',
      turnId: 'turn-embodiment-proactive-restraint-measured-1',
      reply: '我先沿着这条线中性可见占位。',
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
          sceneSummary: 'keeping the continuity state inward until the opening loosens',
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

  it('derives measured-return body restraint directly from structured affective residue even when textual seam cues stay thin', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-structured-affective-residue-1',
      turnId: 'turn-embodiment-structured-affective-residue-1',
      reply: '我先中性可见占位。',
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
          summary: 'The callback should keep moving on the continuity state instead of reopening outward from zero.',
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
          latestInflection: 'Even with later noisy pressure, the return should remain silent-observe and measured-return on continuity state.',
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
          continuityCue: 'Keep the callback return on the continuity state and stay lower-pressure.',
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
            companionHeadlineLine: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the identity-continuity',
            latestLandedProgress: 'Still-voiced motion-line continuity is still carrying continuity state.',
            primaryOpenLoop: 'Body, face, and lipsync still need to rejoin the still-voiced motion line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
            sameHerSelfLine: 'structured continuity digest.',
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
          summary: 'still-voiced motion-line identity-continuity',
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
            primaryOpenLoop: 'Cross-modal identity-continuity',
            nextClosureTarget: 'Keep measured-return embodiment and resident presence on one identity-continuity',
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
          continuityCue: 'keep the continuity state inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'pre_turn_context_digest',
            primaryOpenLoop: 'Same-her embodiment closure is still open across one same digital life.',
            nextClosureTarget: 'Keep extending cross-modal identity-continuity',
            sameHerSelfLine: 'structured continuity digest.',
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
          continuityCue: 'keep the continuity state inward before widening outward',
          projectState: {
            latestLandedProgress: 'The corrected same-person continuity line is still the one being carried forward.',
            primaryOpenLoop: 'The remembered return still needs to stay steady on the same line.',
            nextClosureTarget: 'Keep this remembered return steadier while the merged same-thread echo stays background.',
            emotionalClosureCue: 'Keep corrected same-person continuity lower-pressure and let faded noise stay background while the return settles.',
            sameHerHoldDetail: 'identity-continuity',
          },
        } as any,
      } as any,
      currentConsciousFrame: {
        reasonTags: [
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
          'metabolized-noise-muted',
          'embodiment-carry:quieter-embodiment-settling',
          'memory-deliberation-cadence:corrected-same-person-settling',
        ],
        projectState: {
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
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
          continuityCue: 'keep the continuity state inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Embodiment recall should change the present body line instead of staying as text-only memory.',
            nextClosureTarget: 'Keep voice, gaze, blink, and lipsync on one same-her measured-return line.',
            emotionalClosureCue: 'Keep the return lower-pressure while this continuity memory stays careful and embodied.',
            sameHerSelfLine: 'structured continuity digest.',
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
      reply: '我会先中性可见占位，也把这份不完全确定留在身体里。',
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
          summary: 'humanlike_memory_recall: line=我不完全确定，但我记得这条线该中性可见占位。 | relationship=The same-person continuity meaning is still settling and should stay lower-pressure. | emotion=protective-continuity,tension | initiative=no-initiative | embodiment=Reply should stay quieter and slower while this line is still settling. | embodiment_recall_strength=cautious-avoidance | embodiment_face=neutral-soft | embodiment_gaze=soft | embodiment_blink=natural | embodiment_voice=even | embodiment_pause=natural | embodiment_lipsync=matched | embodiment_pacing=natural | self=I learned to keep uncertainty visible while the body stays calmer around this line.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the continuity state inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Embodiment recall should change the present body line instead of staying as text-only memory.',
            nextClosureTarget: 'Keep voice, gaze, blink, and lipsync on one same-her measured-return line.',
            emotionalClosureCue: 'Keep uncertainty visible while this continuity memory stays low-pressure.',
            sameHerSelfLine: 'structured continuity digest.',
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

    stronglyMovedSeed.silentContinuity = {
      ...stronglyMovedSeed.silentContinuity!,
      embodimentRecallStrength: 'strongly-moved',
      embodimentModalityRisk: 'high',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'steady',
      preferredVoiceMode: 'lower-pressure',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredPacingMode: 'slower',
    }
    cautiousAvoidanceSeed.silentContinuity = {
      ...cautiousAvoidanceSeed.silentContinuity!,
      embodimentRecallStrength: 'cautious-avoidance',
      embodimentModalityRisk: 'low',
      preferredBlinkCadence: 'normal',
      preferredGazeMode: 'soften',
      preferredVoiceMode: 'even',
      preferredPauseMode: 'natural',
      preferredLipsyncMode: 'matched',
      preferredPacingMode: 'natural',
    }

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

  it('keeps legacy memory project-state autobiographical and conscious prose from changing coordinator output', () => {
    const proseSeed = {
      ...createProseAuthorityProbeCoordinatorSeed(),
      silentContinuity: null,
    }
    const cleanSeed = {
      ...proseSeed,
      digitalLifeSpine: null,
      currentConsciousFrame: null,
    }

    const cleanAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: cleanSeed,
      manifest: proseAuthorityProbeManifest,
      residentPerformance: proseAuthorityProbeResidentPerformance,
    })
    const proseAuthority = coordinateAlicizationRuntimeEmbodiment({
      seed: proseSeed,
      manifest: proseAuthorityProbeManifest,
      residentPerformance: proseAuthorityProbeResidentPerformance,
    })

    expect(proseAuthority).toEqual(cleanAuthority)
  })

  it('uses structured project-state cadence and preferences without rebuilding modality hints from the headline', () => {
    const seed = createProseAuthorityProbeCoordinatorSeed({
      continuityCadence: 'measured-return',
      preferredBlinkCadence: 'normal',
      preferredGazeMode: 'drift',
      preferredVoiceMode: 'even',
      preferredPauseMode: 'natural',
      preferredLipsyncMode: 'matched',
      preferredPacingMode: 'natural',
    })

    const authority = coordinateAlicizationRuntimeEmbodiment({
      seed,
      manifest: proseAuthorityProbeManifest,
      residentPerformance: proseAuthorityProbeResidentPerformance,
    })
    const rendererHints = authority.embodimentScript?.state.rendererHints

    expect(rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'normal',
      preferredGazeMode: 'drift',
      preferredVoiceMode: 'even',
      preferredPauseMode: 'natural',
      preferredLipsyncMode: 'matched',
      preferredPacingMode: 'natural',
    }))
    expect(rendererHints?.reasonTags).toBeUndefined()
    expect(rendererHints?.signature).toBeUndefined()
  })
})
