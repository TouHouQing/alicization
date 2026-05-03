import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryRestraintJudge } from './memory-restraint-judge'

describe('memory-restraint-judge', () => {
  it('keeps inward-only recollection fully internal when pressure is intrusive', () => {
    const judge = buildAlicizationMemoryRestraintJudge({
      shouldRecall: true,
      shouldStayInward: true,
      memoryControl: {
        memoryPressure: 'medium',
        certaintyPosture: 'approximate',
        certaintyFloor: 'approximate',
        relationshipVector: 'threaded',
        procedureCarryStrength: 0.72,
        conflictBurden: 'medium',
        dominantProvenance: 'remembered',
        provenancePosture: 'remembered-memory',
        detailAssertionBudget: 'guarded',
        surfacePermission: 'inward-only',
        retrospectiveDepth: 'thread',
        openingStrategy: 'payoff-first-inward-carry',
        answerStrategy: 'stance-first',
        visibilityDiscipline: 'internal-influence-only',
        labelUncertainty: true,
        frameAsPriorProcedure: false,
        avoidArchiveDump: true,
        avoidDateRecital: true,
        avoidExecutionImpersonation: false,
        stableCore: ['Return to the same seam before branching.'],
        unsafeDetails: ['Do not assert which exact wording belonged to that old seam.'],
      },
      followUpAffordance: {
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
      },
      truthDiscipline: {
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
      },
    })

    expect(judge.surfaceMode).toBe('inward-only')
    expect(judge.shouldOnlySurfaceStableCore).toBe(false)
    expect(judge.whyWithheld).toContain('too intrusive')
    expect(judge.mustDo.some(item => item.includes('keep recollection inward'))).toBe(true)
    expect(judge.mustNotDo.some(item => item.includes('Do not outrun this recollection boundary'))).toBe(true)
  })

  it('forces stable-core-only surface and provenance/hypothesis labeling when remembered detail is unsafe', () => {
    const judge = buildAlicizationMemoryRestraintJudge({
      shouldRecall: true,
      shouldStayInward: false,
      memoryControl: {
        memoryPressure: 'high',
        certaintyPosture: 'approximate',
        certaintyFloor: 'approximate',
        relationshipVector: 'procedural',
        procedureCarryStrength: 0.86,
        conflictBurden: 'high',
        dominantProvenance: 'reconstructed',
        provenancePosture: 'reconstructed-memory',
        detailAssertionBudget: 'minimal',
        surfacePermission: 'explicit-surface',
        retrospectiveDepth: 'period',
        openingStrategy: 'brief-procedure-carry',
        answerStrategy: 'procedure-anchor',
        visibilityDiscipline: 'brief-visible-memory',
        labelUncertainty: true,
        frameAsPriorProcedure: true,
        avoidArchiveDump: true,
        avoidDateRecital: true,
        avoidExecutionImpersonation: true,
        stableCore: ['Return to the same seam before branching.'],
        unsafeDetails: ['A nearby competing thread cluster still matches the current recall cue.'],
      },
      followUpAffordance: {
        intrusionRisk: 'low',
        payoffDependency: 'can-surface-softly',
      },
      truthDiscipline: {
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
      },
    })

    expect(judge.surfaceMode).toBe('stable-core-only')
    expect(judge.shouldOnlySurfaceStableCore).toBe(true)
    expect(judge.shouldLabelProvenance).toBe(true)
    expect(judge.shouldLabelHypothesis).toBe(true)
    expect(judge.shouldSuppressSpecificity).toBe(true)
    expect(judge.whyWithheld).toContain('stable remembered core')
    expect(judge.mustNotDo.some(item => item.includes('Do not surface unstable remembered detail as settled fact'))).toBe(true)
  })

  it('tightens surface when contradiction-heavy knowledge evidence outruns validation relief', () => {
    const judge = buildAlicizationMemoryRestraintJudge({
      shouldRecall: true,
      shouldStayInward: false,
      memoryControl: {
        memoryPressure: 'medium',
        certaintyPosture: 'approximate',
        certaintyFloor: 'approximate',
        relationshipVector: 'procedural',
        procedureCarryStrength: 0.78,
        conflictBurden: 'medium',
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
        stableCore: ['Return to the same seam before branching.'],
        unsafeDetails: [],
      },
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
      truthDiscipline: {
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
      },
    })

    expect(judge.surfaceMode).toBe('stable-core-only')
    expect(judge.whyWithheld).toContain('contradiction-heavy')
  })
})
