import { describe, expect, it } from 'vitest'

import { buildAlicizationEmotionalKernel } from './emotional-kernel'

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    selfState: {
      stance: 'coexist',
      feltCloseness: 0.54,
      protectiveness: 0.36,
      curiosity: 0.42,
      patience: 0.68,
      desireToSpeak: 0.24,
      fearOfInterrupting: 0.52,
      moodLabel: 'steady',
    },
    privateThought: {
      stance: 'accompany',
      shouldSpeak: false,
      emotionalTension: null,
      rationaleTags: [],
      thoughtText: 'Observe the current exchange.',
    },
    affectiveResidue: {
      version: 'affective-residue-memory-v1',
      updatedAt: 10_000,
      residues: [],
      dominantResidueKind: 'afterglow',
      afterglowPressure: 0.32,
      repairPressure: 0.12,
      burdenPressure: 0.08,
      trustPressure: 0.34,
      restProtectivePressure: 0.1,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        companionshipDensity: 0.36,
        repairRecovery: 0.12,
        overreachRisk: 0.22,
        fatigueGuard: 0.12,
        afterglowCarry: 0.3,
        shouldDelayWarmth: true,
        shouldProtectRest: false,
        reasonTags: [],
        summary: 'ignored prose',
      },
      sourceSignals: [],
      summary: 'ignored prose',
    },
    personStateProjection: {
      activeClosenessRung: 'measured-room',
      relationshipPosture: 'restrained',
      openingGuidance: 'ignored prose',
    },
    selfEvolution: {
      relationshipDoctrine: 'ignored prose',
      trustMeaning: 'ignored prose',
      latestInflection: 'ignored prose',
      relationshipCadenceSummary: 'ignored prose',
    },
    ...overrides,
  } as any
}

describe('buildAlicizationEmotionalKernel', () => {
  it('ignores arbitrary prose and unknown structured envelopes', () => {
    const baseline = buildAlicizationEmotionalKernel(buildInput())
    const mutated = buildAlicizationEmotionalKernel(buildInput({
      affectiveResidue: {
        ...buildInput().affectiveResidue,
        summary: 'legacy-governance-payload-ignored',
        relationshipCadence: {
          ...buildInput().affectiveResidue.relationshipCadence,
          summary: 'legacy-governance-payload-ignored',
        },
      },
      personStateProjection: {
        ...buildInput().personStateProjection,
        openingGuidance: 'legacy-governance-payload-ignored',
      },
      selfEvolution: {
        relationshipDoctrine: 'legacy-governance-payload-ignored',
        trustMeaning: 'legacy-governance-payload-ignored',
        latestInflection: 'legacy-governance-payload-ignored',
        relationshipCadenceSummary: 'legacy-governance-payload-ignored',
      },
      legacyEnvelope: {
        marker: 'legacy-governance-payload-ignored',
        nested: {
          text: 'unrelated structured noise',
        },
      },
    }))

    expect(mutated).toEqual(baseline)
  })

  it('maps structured repair residue to repair tension', () => {
    const kernel = buildAlicizationEmotionalKernel(buildInput({
      privateThought: {
        ...buildInput().privateThought,
        rationaleTags: ['repair-before-closeness'],
      },
      affectiveResidue: {
        ...buildInput().affectiveResidue,
        repairPressure: 0.7,
        relationshipCadence: {
          ...buildInput().affectiveResidue.relationshipCadence,
          cadenceMode: 'repair',
          reasonTags: ['repair-before-closeness'],
        },
      },
    }))

    expect(kernel.dominantEmotion).toBe('repair-tension')
    expect(kernel.initiativeMode).toBe('repair')
    expect(kernel.memoryRecallMode).toBe('repair-grounding')
    expect(kernel.embodimentTone).toBe('repair-before-closeness')
    expect(kernel.reasonTags).toEqual(['repair-before-closeness'])
    expect(kernel.why).toBe('')
  })

  it('maps structured afterglow and warmth delay to measured companionship', () => {
    const kernel = buildAlicizationEmotionalKernel(buildInput({
      affectiveResidue: {
        ...buildInput().affectiveResidue,
        afterglowPressure: 0.56,
        relationshipCadence: {
          ...buildInput().affectiveResidue.relationshipCadence,
          cadenceMode: 'measured-return',
          companionshipDensity: 0.48,
          afterglowCarry: 0.42,
          shouldDelayWarmth: true,
          reasonTags: ['measured-return'],
        },
      },
    }))

    expect(kernel.dominantEmotion).toBe('measured-companionship')
    expect(kernel.initiativeMode).toBe('observe')
    expect(kernel.memoryRecallMode).toBe('low-pressure-presence')
    expect(kernel.embodimentTone).toBe('measured-return')
    expect(kernel.reasonTags).toEqual(['measured-return'])
  })

  it('maps structured rest protection and fatigue guard to rest-protective companionship', () => {
    const kernel = buildAlicizationEmotionalKernel(buildInput({
      privateThought: {
        ...buildInput().privateThought,
        emotionalTension: 'late-night-drain',
        rationaleTags: ['rest-protective'],
      },
      affectiveResidue: {
        ...buildInput().affectiveResidue,
        restProtectivePressure: 0.64,
        relationshipCadence: {
          ...buildInput().affectiveResidue.relationshipCadence,
          cadenceMode: 'rest-protective',
          fatigueGuard: 0.6,
          shouldProtectRest: true,
          reasonTags: ['rest-protective'],
        },
      },
    }))

    expect(kernel.dominantEmotion).toBe('rest-protective-companionship')
    expect(kernel.initiativeMode).toBe('rest-guard')
    expect(kernel.memoryRecallMode).toBe('rest-protective-presence')
    expect(kernel.embodimentTone).toBe('rest-protective')
  })

  it('keeps execution confirmation boundaries as guarded care', () => {
    const kernel = buildAlicizationEmotionalKernel(buildInput({
      privateThought: {
        ...buildInput().privateThought,
        rationaleTags: ['execution-safety-gate', 'confirmation-required'],
      },
    }))

    expect(kernel.dominantEmotion).toBe('guarded-care')
    expect(kernel.initiativeMode).toBe('hold')
    expect(kernel.memoryRecallMode).toBe('self-continuity')
    expect(kernel.embodimentTone).toBe('protective-watch')
    expect(kernel.reasonTags).toEqual(['execution-safety-gate', 'confirmation-boundary'])
  })

  it('keeps kernel explanations empty so internal prose cannot become dialogue guidance', () => {
    const kernel = buildAlicizationEmotionalKernel(buildInput())

    expect(kernel.why).toBe('')
  })
})
