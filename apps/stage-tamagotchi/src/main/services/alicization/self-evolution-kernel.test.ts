import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfEvolutionKernel } from './self-evolution-kernel'

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    personStateEvolutionSummary: {
      trustShift: 0.18,
      closenessShift: 0.14,
      repairShift: 0.12,
      autonomyShift: 0.09,
      burdenShift: 0.04,
      executionTrustShift: 0.16,
      relationshipDoctrineShift: 0.08,
      latestDoctrine: 'Truthful grounding matters.',
      latestBurdenLine: 'Late work can make small interruptions costly.',
      latestTrustMeaning: 'Trust grows when facts and timing agree.',
      latestDominantRung: 'steady',
      recentSummaries: ['A reviewed outcome changed the shared context.'],
      explanation: ['Keep the next step grounded in reviewed evidence.'],
      updatedAt: 100,
    },
    knowledgeEvidence: {
      validationCount: 3,
      contradictionCount: 0,
      stronglyValidatedProcedureCount: 2,
      contradictionHeavyFactCount: 0,
      relationshipFactCount: 2,
      selfModelFactCount: 1,
      worldModelFactCount: 1,
      relationshipViewStrength: 0.72,
      selfModelViewStrength: 0.62,
      worldModelViewStrength: 0.64,
    },
    reflectionSummary: 'A reviewed outcome remains useful.',
    reflectionLesson: 'Keep the next step grounded in evidence.',
    reflectionTargetScope: 'relationship',
    reflectionPressure: 0.18,
    autobiographicalLatestInflection: 'Continue from the reviewed context.',
    autobiographicalStability: 0.74,
    ...overrides,
  } as any
}

describe('self evolution kernel', () => {
  it('builds a data-only learning kernel from reviewed memory and relationship evidence', () => {
    const kernel = buildAlicizationSelfEvolutionKernel(createInput())

    expect(kernel).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      relationshipDoctrine: 'Truthful grounding matters.',
      latestInflection: 'Continue from the reviewed context.',
      nextLearningAction: expect.any(String),
      shouldRecord: expect.any(Boolean),
      shouldReflect: expect.any(Boolean),
      shouldVerify: expect.any(Boolean),
      shouldRevise: expect.any(Boolean),
      shouldInternalize: expect.any(Boolean),
    }))
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'internalize-procedure',
      'internalize-relationship',
      'internalize-self-model',
      'internalize-world-model',
    ]))
    expect(kernel?.nextLearningReason).toBe(`learning:${kernel?.nextLearningAction}`)
    expect(kernel).not.toHaveProperty('relationshipCadenceSummary')
  })

  it('chooses internalize for repeatedly validated procedure evidence without contradiction', () => {
    const kernel = buildAlicizationSelfEvolutionKernel(createInput({
      personStateEvolutionSummary: null,
      relationshipViewStrength: 0,
      knowledgeEvidence: {
        validationCount: 3,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 3,
        contradictionHeavyFactCount: 0,
      },
      reflectionSummary: 'A procedure was checked repeatedly.',
      reflectionLesson: 'The checked procedure is stable.',
      reflectionTargetScope: 'procedure',
      reflectionPressure: 0.18,
    }))

    expect(kernel?.nextLearningAction).toBe('internalize')
    expect(kernel?.activeLearningFocuses).toContain('internalize-procedure')
  })

  it('chooses verification when durable evidence is contested', () => {
    const kernel = buildAlicizationSelfEvolutionKernel(createInput({
      knowledgeEvidence: {
        validationCount: 1,
        contradictionCount: 3,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 2,
      },
      reflectionPressure: 0.5,
    }))

    expect(kernel?.nextLearningAction).toBe('verify')
    expect(kernel?.nextLearningReason).toBe('learning:verify')
    expect(kernel?.contradictionPressure).toBeGreaterThanOrEqual(0.42)
  })

  it('does not internalize weak relationship, self-model, or world-model views', () => {
    const kernel = buildAlicizationSelfEvolutionKernel(createInput({
      knowledgeEvidence: {
        validationCount: 2,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
        relationshipFactCount: 2,
        selfModelFactCount: 1,
        worldModelFactCount: 1,
        relationshipViewStrength: 0.42,
        selfModelViewStrength: 0.38,
        worldModelViewStrength: 0.4,
      },
    }))

    expect(kernel?.activeLearningFocuses).not.toContain('internalize-relationship')
    expect(kernel?.activeLearningFocuses).not.toContain('internalize-self-model')
    expect(kernel?.activeLearningFocuses).not.toContain('internalize-world-model')
  })

  it('keeps gradual persona unlocks as reviewable learning focuses', () => {
    const kernel = buildAlicizationSelfEvolutionKernel(createInput({
      autobiographicalSelf: {
        gradualUnlock: {
          unlockableFacets: [{ facet: 'directness', confidence: 0.72 }],
          pendingHypotheses: [],
        },
      },
    }))

    expect(kernel?.activeLearningFocuses).toContain('unlock:directness')
  })

  it('keeps policy inputs numeric and does not turn them into reply instructions', () => {
    const kernel = buildAlicizationSelfEvolutionKernel(createInput({
      learningPolicyState: {
        strictnessBias: 0.6,
        wrongThreadSuppressionBias: 0.4,
        provenanceLabelBias: 0.5,
        selfRevisionPatchCount: 2,
        selfRevisionValidationBias: 0.3,
      },
    }))

    expect(kernel?.sourceSignals.every(signal => !signal.includes('='))).toBe(true)
    expect(JSON.stringify(kernel)).not.toMatch(
      /opening[_-]?policy|relationship[_-]?cadence|redacted[_-]?internal|project[_-]?state/iu,
    )
  })
})
