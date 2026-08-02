import { describe, expect, it } from 'vitest'

import { buildAlicizationRuntimeEmbodimentSeed } from './runtime-embodiment-seed'

function createBaseInput() {
  return {
    decisionTraceId: ' trace-1 ',
    turnId: 'turn-1',
    reply: ' 你好 ',
    performance: {
      baseEmotion: 'thinking',
      emotion: 'sad',
      facialCue: ' soft-gaze ',
      actionCue: ' comfort_sway ',
      delivery: 'calm',
      emphasis: 2,
    },
    embodiment: null,
    speechTimeline: null,
    digitalLife: null,
    digitalLifeSpine: null,
  } as const
}

describe('runtime embodiment seed', () => {
  it('normalizes one governed turn without adding local dialogue governance', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed(createBaseInput())

    expect(seed.decisionTraceId).toBe('trace-1')
    expect(seed.turnId).toBe('turn-1')
    expect(seed.replyText).toBe('你好')
    expect(seed.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'calm',
      emphasis: 2,
    }))
    expect(seed).not.toHaveProperty('silentContinuity')
  })

  it('keeps structured affective residue available as emotional state', () => {
    const affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 1,
      residues: [],
      dominantResidueKind: 'afterglow',
      afterglowPressure: 0.62,
      repairPressure: 0.12,
      burdenPressure: 0,
      trustPressure: 0.42,
      restProtectivePressure: 0,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        distancePosture: 'measured-room',
        companionshipDensity: 0.54,
        repairRecovery: 0.22,
        overreachRisk: 0.36,
        fatigueGuard: 0.18,
        afterglowCarry: 0.58,
        shouldDelayWarmth: true,
        shouldProtectRest: false,
        reasonTags: [],
        summary: 'Recent affect remains active.',
      },
      sourceSignals: [],
      summary: 'Recent affect remains active.',
    } as const

    const seed = buildAlicizationRuntimeEmbodimentSeed({
      ...createBaseInput(),
      affectiveResidue,
    } as any)

    expect(seed.affectiveResidue).toBe(affectiveResidue)
    expect(seed).not.toHaveProperty('silentContinuity')
  })

  it('keeps Memory OS embodiment facts in their owner trace without projecting a cue shell', () => {
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
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
          pressure: 'lower-pressure',
          reason: 'Memory-owned initiative fact.',
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
          preferredGazeMode: 'soften',
          reason: null,
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
    } as const
    const digitalLifeSpine = {
      version: 'digital-life-spine-digest-v1',
      memory: {
        summary: 'Memory-owned recall remains available.',
        personStateProjection: null,
        memoryClosureTrace,
      },
    } as const

    const seed = buildAlicizationRuntimeEmbodimentSeed({
      ...createBaseInput(),
      digitalLifeSpine,
    } as any)

    expect(seed.digitalLifeSpine?.memory?.memoryClosureTrace).toBe(memoryClosureTrace)
    expect(seed).not.toHaveProperty('silentContinuity')
  })
})
