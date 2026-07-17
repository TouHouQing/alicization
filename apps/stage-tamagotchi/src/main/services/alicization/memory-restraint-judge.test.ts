import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryRestraintJudge } from './memory-restraint-judge'

function createMemoryControl(overrides: Record<string, unknown> = {}) {
  return {
    memoryPressure: 'medium',
    certaintyPosture: 'firm',
    certaintyFloor: 'firm',
    relationshipVector: 'procedural',
    procedureCarryStrength: 0.78,
    conflictBurden: 'none',
    dominantProvenance: 'remembered',
    provenancePosture: 'remembered-memory',
    detailAssertionBudget: 'open',
    surfacePermission: 'explicit-surface',
    retrospectiveDepth: 'thread',
    openingStrategy: 'brief-procedure-carry',
    answerStrategy: 'procedure-anchor',
    visibilityDiscipline: 'brief-visible-memory',
    labelUncertainty: false,
    frameAsPriorProcedure: true,
    avoidArchiveDump: true,
    avoidDateRecital: true,
    avoidExecutionImpersonation: false,
    stableCore: ['The verified outcome remains supported.'],
    unsafeDetails: [],
    ...overrides,
  } as any
}

describe('memory-restraint-judge', () => {
  it('represents an inward owner decision with typed reason codes', () => {
    const judge = buildAlicizationMemoryRestraintJudge({
      shouldRecall: true,
      shouldStayInward: true,
      memoryControl: createMemoryControl({
        surfacePermission: 'inward-only',
      }),
      followUpAffordance: {
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
      },
    })

    expect(judge).toMatchObject({
      surfaceMode: 'inward-only',
      shouldStayInward: true,
      shouldOnlySurfaceStableCore: false,
      shouldDelayUntilAfterPayoff: true,
    })
    expect(judge.withheldReasons).toEqual(expect.arrayContaining([
      'owner-inward-policy',
      'intrusion-risk-high',
      'payoff-required',
    ]))
    expect(judge).not.toHaveProperty('whyWithheld')
    expect(judge).not.toHaveProperty('summary')
    expect(judge).not.toHaveProperty('mustDo')
    expect(judge).not.toHaveProperty('mustNotDo')
  })

  it('limits unsafe reconstructed evidence to the stable core', () => {
    const judge = buildAlicizationMemoryRestraintJudge({
      shouldRecall: true,
      shouldStayInward: false,
      memoryControl: createMemoryControl({
        dominantProvenance: 'reconstructed',
        provenancePosture: 'reconstructed-memory',
        detailAssertionBudget: 'minimal',
        labelUncertainty: true,
        unsafeDetails: ['The exact sequence remains unsupported.'],
      }),
      followUpAffordance: {
        intrusionRisk: 'low',
        payoffDependency: 'can-surface-softly',
      },
    })

    expect(judge).toMatchObject({
      surfaceMode: 'stable-core-only',
      provenanceMode: 'reconstructed-memory',
      shouldOnlySurfaceStableCore: true,
      shouldLabelProvenance: true,
      shouldLabelHypothesis: true,
      shouldSuppressSpecificity: true,
    })
    expect(judge.withheldReasons).toContain('unstable-detail')
  })

  it('records contradiction pressure without translating it into prose', () => {
    const judge = buildAlicizationMemoryRestraintJudge({
      shouldRecall: true,
      shouldStayInward: false,
      memoryControl: createMemoryControl(),
      knowledgeEvidence: {
        validationCount: 1,
        contradictionCount: 4,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 1,
      },
      followUpAffordance: {
        intrusionRisk: 'low',
        payoffDependency: 'can-surface-softly',
      },
    })

    expect(judge.surfaceMode).toBe('stable-core-only')
    expect(judge.withheldReasons).toContain('contradiction-pressure')
  })

  it('uses typed follow-up dependency without reading host-model wording', () => {
    const baseline = buildAlicizationMemoryRestraintJudge({
      shouldRecall: true,
      shouldStayInward: false,
      memoryControl: createMemoryControl(),
      followUpAffordance: {
        intrusionRisk: 'low',
        payoffDependency: 'requires-current-payoff',
      },
    })
    const withOpaqueHostContext = buildAlicizationMemoryRestraintJudge({
      shouldRecall: true,
      shouldStayInward: false,
      memoryControl: createMemoryControl(),
      hostPersonModel: {
        summary: 'Opaque host context.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        recurrentBurdens: [],
        preferredClosenessByContext: [],
        trustLadder: {
          stage: 'warming',
          rationale: 'Opaque trust context.',
        },
      } as any,
      followUpAffordance: {
        intrusionRisk: 'low',
        payoffDependency: 'requires-current-payoff',
      },
    })

    expect(withOpaqueHostContext).toEqual(baseline)
    expect(baseline.shouldDelayUntilAfterPayoff).toBe(true)
    expect(baseline.withheldReasons).toContain('payoff-required')
  })
})
