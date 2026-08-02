import { describe, expect, it } from 'vitest'

import { coordinateAlicizationRuntimeEmbodiment } from './runtime-embodiment-coordinator'
import { buildAlicizationRuntimeEmbodimentSeed } from './runtime-embodiment-seed'

const manifest = {
  renderer: 'live2d',
  supportsVisemeLipSync: true,
  supportsLookAt: true,
  supportsMicroDynamics: true,
  supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
  supportedFacialCues: ['soft-gaze'],
  supportedActions: ['observe_focus', 'idle_settle'],
} as const

function createSeedInput(overrides: Record<string, unknown> = {}) {
  return {
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    reply: '我在这里。',
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
      variationToken: 'turn-1',
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
    digitalLifeSpine: null,
    affectiveResidue: null,
    currentConsciousFrame: null,
    residentPerformance: null,
    ...overrides,
  } as any
}

function createResidentPerformance(overrides: Record<string, unknown> = {}) {
  return {
    version: 'resident-performance-v1',
    source: 'main-runtime',
    confidence: 0.88,
    reasonTags: [],
    signature: 'resident-1',
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
    ...overrides,
  } as any
}

function createMeasuredAffectiveResidue() {
  return {
    version: 'affective-residue-memory-v1',
    updatedAt: 1,
    residues: [],
    dominantResidueKind: 'afterglow',
    afterglowPressure: 0.58,
    repairPressure: 0.12,
    burdenPressure: 0,
    trustPressure: 0.44,
    restProtectivePressure: 0,
    relationshipCadence: {
      cadenceMode: 'measured-return',
      distancePosture: 'measured-room',
      companionshipDensity: 0.5,
      repairRecovery: 0.2,
      overreachRisk: 0.36,
      fatigueGuard: 0.12,
      afterglowCarry: 0.54,
      shouldDelayWarmth: true,
      shouldProtectRest: false,
      reasonTags: [],
      summary: 'Recent affect remains active.',
    },
    sourceSignals: [],
    summary: 'Recent affect remains active.',
  }
}

function coordinate(
  input: Record<string, unknown>,
  residentPerformance: unknown = null,
  performanceManifest: unknown = manifest,
) {
  const seed = buildAlicizationRuntimeEmbodimentSeed(createSeedInput(input))
  return coordinateAlicizationRuntimeEmbodiment({
    seed,
    manifest: performanceManifest as any,
    residentPerformance: residentPerformance as any,
  })
}

describe('runtime embodiment coordinator', () => {
  it('builds one runtime embodiment authority from the normalized seed', () => {
    const authority = coordinate({})

    expect(authority.embodiment).toEqual(expect.objectContaining({
      emotion: 'thinking',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
      }),
    }))
    expect(authority.speechTimeline?.segments).toHaveLength(1)
    expect(authority.embodimentScript).toEqual(expect.objectContaining({
      decisionTraceId: 'trace-1',
      turnId: 'turn-1',
      replyText: '我在这里。',
    }))
    expect(authority.digitalLife).not.toBeNull()
  })

  it('keeps a real recovering digital-life state closed and settled', () => {
    const initialAuthority = coordinate({})
    const digitalLife = initialAuthority.digitalLife
    expect(digitalLife).not.toBeNull()

    const recoveringAuthority = coordinate({
      digitalLife: {
        ...digitalLife!,
        mode: 'recovering',
      },
    })

    expect(recoveringAuthority.embodimentScript?.state.residentMode).toBe('idle-recovering')
    expect(recoveringAuthority.digitalLife?.mode).toBe('recovering')
    expect(recoveringAuthority.digitalLife?.lipSync.mode).toBe('closed')
    expect(recoveringAuthority.digitalLife?.action.actionMode).toBe('none')
  })

  it('uses actual affective state to settle embodiment without consuming cadence prose', () => {
    const affectiveResidue = createMeasuredAffectiveResidue()
    affectiveResidue.relationshipCadence.summary = 'Arbitrary prose that is not parsed.'

    const authority = coordinate(
      { affectiveResidue },
      createResidentPerformance(),
    )

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.embodimentScript?.speechPlan.segments[0]?.prosody?.tempoShift).toBeLessThan(0)
    expect(authority.digitalLife?.performance.residentMode).toBe('measured-return')
  })

  it('uses learned canonical habit state as embodiment policy input', () => {
    const authority = coordinate(
      {
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          habit: {
            dominantMode: 'return-with-proof',
            suggestedStyleCap: 'silent-observe',
            suggestedPresenceCap: 'hesitant',
          },
        },
      },
      createResidentPerformance(),
    )

    expect(authority.embodimentScript?.state.residentMode).toBe('measured-return')
    expect(authority.digitalLife?.performance.residentMode).toBe('measured-return')
  })

  it('uses resident emotional state without matching reason-tag phrases', () => {
    const residentPerformance = createResidentPerformance({
      emotionalTension: 'late-night-drain',
      reasonTags: ['arbitrary-tag-with-no-authority'],
      embodiedPresence: 'concerned',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
    })

    const authority = coordinate({}, residentPerformance)

    expect(authority.embodimentScript?.state.residentMode).toBe('repair-before-closeness')
    expect(authority.digitalLife?.performance.residentMode).toBe('repair-before-closeness')
  })

  it('reads structured Memory OS embodiment preferences from the owner trace', () => {
    const memoryClosureTrace = {
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      whySurface: [],
      surfacePolicy: {
        gateStatus: 'gist-only',
        mode: 'gist-only',
        timing: 'after-payoff',
        speechMode: 'low-pressure',
        placement: 'after-answer',
        certainty: 'label-uncertainty',
        reasons: [],
      },
      nextInfluence: {
        initiative: {
          restraint: null,
          preferredTiming: null,
          pressure: null,
          reason: null,
        },
        execution: {
          carry: null,
          nextLearningAction: null,
          shouldVerify: false,
          shouldReflect: false,
          activeLearningFocuses: [],
        },
        embodiment: {
          cadence: null,
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'steady',
          reason: null,
          embodimentRecallStrength: 'strongly-moved',
          embodimentModalityRisk: 'high',
        },
      },
      closureState: {
        state: 'approximate-recall',
        open: true,
        revisionRequired: true,
        shouldLabelUncertainty: true,
        visibleCarryMode: 'gist-only',
        retrievalQuality: 'medium',
        conflictPressure: 'low',
      },
      selectedCandidateIds: ['memory-1'],
      reasonTags: [],
    }

    const authority = coordinate(
      {
        affectiveResidue: createMeasuredAffectiveResidue(),
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          memory: {
            summary: 'Memory-owned recall remains active.',
            personStateProjection: null,
            memoryClosureTrace,
          },
        },
      },
      createResidentPerformance(),
    )

    expect(authority.embodimentScript?.state.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredGazeMode: 'steady',
      preferredVoiceMode: 'lower-pressure',
      preferredLipsyncMode: 'restrained',
    }))
  })

  it('preserves explicit provider-authored renderer hints when no stronger state applies', () => {
    const authority = coordinate({
      embodiment: {
        emotion: 'thinking',
        variationToken: 'provider-renderer-hint',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 1,
          pitchDelta: 0,
          volumeDelta: 0,
        },
        rendererHints: {
          preferredGazeMode: 'drift',
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'calm',
          emphasis: 0,
        },
      },
    })

    expect(authority.embodiment?.rendererHints?.preferredGazeMode).toBe('drift')
    expect(authority.speechTimeline?.segments[0]?.rendererHints?.preferredGazeMode).toBe('drift')
  })

  it('preserves renderer-native VRM actions without a legacy continuity route', () => {
    const vrmManifest = {
      ...manifest,
      renderer: 'vrm',
      supportedActions: ['inspect_follow'],
    }
    const authority = coordinate({
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'inspect_follow',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        variationToken: 'vrm-action',
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
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    }, null, vrmManifest)

    expect(authority.embodimentScript?.rendererTarget).toBe('vrm')
    expect(authority.embodiment?.performance.actionCue).toBe('inspect_follow')
    expect(authority.digitalLife?.action.actionCue).toBe('inspect_follow')
  })
})
