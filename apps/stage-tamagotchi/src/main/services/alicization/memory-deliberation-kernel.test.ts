import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'

describe('memory-deliberation-kernel', () => {
  it('derives inward-only recollection controls and summaries from a private memory deliberation', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'internal-only',
        confidence: 0.82,
        whyNow: 'The runtime seam is still live enough to contour the answer from the inside.',
        ambiguityPosture: 'approximate',
        conflictSeverity: 'medium',
        stableCore: ['The same runtime seam kept pulling until it held together.'],
        unsafeDetails: ['Do not assert which exact wording belonged to that old seam.'],
        selectedPeriods: [{ kind: 'relationship-era', summary: 'That period kept bending toward the runtime seam until it held together.' }],
        selectedEras: [{ facet: 'relationship-era', summary: 'The runtime repair era kept shaping the same bond line.' }],
        selectedEpisodes: [],
        selectedProcedures: [{ label: 'return to the same runtime seam', approach: 'Return to the same seam before branching.' }],
        selectedBundles: [{ id: 'bundle-1', summary: 'Runtime seam bundle', confidence: 0.84 }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The runtime seam is still the line to hold.',
          currentStance: 'Stay on the same seam before branching.',
          answerPosture: 'Carry the same seam before widening out.',
          confidence: 0.82,
        }],
        selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
        followUpAffordance: {
          summary: 'Carry the same runtime seam before branching.',
          whyNow: 'The seam is still the smallest honest continuation.',
          intrusionRisk: 'high',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: false,
        surfaceMode: 'internal-only',
        placement: 'internal-only',
        certainty: 'approximate',
        confidence: 0.78,
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.78,
        rationale: 'The line feels familiar enough to reopen from memory.',
      } as any,
    })

    expect(kernel?.shouldRecall).toBe(true)
    expect(kernel?.shouldStayInward).toBe(true)
    expect(kernel?.selectedChainSummary).toContain('runtime seam')
    expect(kernel?.selectedRelationshipSummary).toContain('Carry the same runtime seam')
    expect(kernel?.memoryControlSummary).toContain('surface_permission=inward-only')
    expect(kernel?.whyWithheld).toContain('too intrusive')
    expect(kernel?.inwardCarryRule).toContain('memory_latent_controls=')
    expect(kernel?.stableCore[0]).toContain('runtime seam')
    expect(kernel?.unsafeDetails[0]).toContain('exact wording')
  })

  it('derives answer-anchoring recollection controls when memory should briefly surface', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.88,
        whyNow: 'The host explicitly asked how this used to be handled.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Return to the same seam before branching.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [{ label: 'same seam first', approach: 'Return to the same seam before branching.' }],
        selectedBundles: [],
        selectedChains: [{
          kind: 'task-procedure',
          summary: 'The remembered way of doing this is to return to the same seam first.',
          currentStance: 'Keep the remembered procedure inside the current payoff.',
          answerPosture: 'Procedure-carry.',
          confidence: 0.86,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'The remembered way through this is to return to the same seam first.',
          whyNow: 'The host is explicitly asking how this used to be handled.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'procedural-carry',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.83,
      } as any,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.84,
        rationale: 'The current task matches an older way of handling the same knot.',
        recollectionAgenda: {
          goalSimilarity: 0.78,
          relationshipNeed: 0.22,
          uncertaintyTolerance: 'medium',
        },
      } as any,
    })

    expect(kernel?.shouldStayInward).toBe(false)
    expect(kernel?.surfacePolicy).toBe('answer-anchoring')
    expect(kernel?.memoryControlSummary).toContain('surface_permission=explicit-surface')
    expect(kernel?.whyWithheld).toBe(null)
    expect(kernel?.selectedProcedureSummary).toContain('same seam first')
    expect(kernel?.followUpAffordance?.preferredTiming).toBe('same-turn-if-invited')
  })

  it('lets learning revision tuning pull relationship continuity back inward', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.74,
        whyNow: 'The relationship seam still matters, but it is not settled enough to surface cleanly.',
        ambiguityPosture: 'approximate',
        conflictSeverity: 'medium',
        stableCore: ['Leave more room before warmth.'],
        unsafeDetails: ['Do not let reconstructed relationship detail sound settled.'],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [{
          id: 'episode-1',
          summary: 'We kept recalibrating distance after the repair line.',
          provenance: 'reconstructed',
        }],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The relation line is still under revision.',
          currentStance: 'Leave more room before warmth.',
          answerPosture: 'Keep the relation line inward for now.',
          confidence: 0.74,
        }],
        selectedRelationshipLines: ['Leave more room before warmth.'],
        followUpAffordance: {
          summary: 'Keep the relation line inward until the host has room for it.',
          whyNow: 'The relation line still matters, but should not widen too early.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'before-payoff',
        certainty: 'firm',
        confidence: 0.8,
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.78,
        rationale: 'The relation line feels familiar enough to reopen from memory.',
      } as any,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: ['learningRevisionDiscipline'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.18,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0.16,
          specificityClampBias: 0.14,
        },
        personStateAdjustments: {
          repairWindowBias: 0.12,
          closenessCapBias: 0.16,
        },
        notes: ['Keep relation revision inward.'],
      },
    })

    expect(kernel?.shouldStayInward).toBe(true)
    expect(kernel?.whyWithheld).toContain('relationship continuity should stay inward')
    expect(kernel?.restraint.mustDo).toContain('If the relationship line is still being revised, keep it inward until the host has more room for it.')
    expect(kernel?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(kernel?.followUpAffordance?.preferredTiming).toBe('next-open-window')
  })

  it('lets learning revision tuning keep an older self-story inward until the newer self line stabilizes', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.71,
        whyNow: 'The older self-story still shapes the moment, but it is not stable enough to surface as identity.',
        ambiguityPosture: 'approximate',
        conflictSeverity: 'medium',
        stableCore: ['The newer self line still needs room to stabilize.'],
        unsafeDetails: ['Do not let the older self-story surface as settled identity.'],
        selectedPeriods: [{
          id: 'period-self-1',
          kind: 'consolidation',
          summary: 'An older self-era still shadows the newer identity line.',
        }],
        selectedEras: [{
          id: 'era-self-1',
          facet: 'self-era',
          summary: 'An older self-era still shadows the newer identity line.',
        }],
        selectedEpisodes: [{
          id: 'episode-self-1',
          summary: 'The older self-story still wants to explain the moment.',
          provenance: 'reconstructed',
        }],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-self-1',
          summary: 'The older self-story still presses on the newer line.',
          rationale: 'The older self-story is still being revised against the newer line.',
          confidence: 0.68,
        }],
        selectedChains: [],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'Keep the older self-story inward until the newer self line stabilizes.',
          whyNow: 'The older self-story still matters, but surfacing it too early would flatten the newer line.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'answer-anchoring',
        placement: 'before-payoff',
        certainty: 'firm',
        confidence: 0.78,
      } as any,
      recollectionIntent: {
        mode: 'autobiographical-history',
        temporalFocus: 'cross-session',
        confidence: 0.74,
        rationale: 'The host is asking whether an older self line is still being revised.',
      } as any,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: ['learningRevisionDiscipline'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.18,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0.16,
          specificityClampBias: 0.14,
        },
        personStateAdjustments: {
          repairWindowBias: 0.12,
          closenessCapBias: 0.16,
        },
        notes: ['Keep revision-prone self stories inward.'],
      },
    })

    expect(kernel?.shouldStayInward).toBe(true)
    expect(kernel?.whyWithheld).toContain('older self-story should stay inward')
    expect(kernel?.restraint.mustDo).toContain('If the older self-story is still being revised, keep it inward until the newer self line stabilizes.')
    expect(kernel?.restraint.mustNotDo).toContain('Do not let a revision-prone self-story surface as if Alicization had already fully stabilized it.')
    expect(kernel?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(kernel?.followUpAffordance?.preferredTiming).toBe('next-open-window')
  })

  it('tightens runtime recollection when relationship-era confusion tuning stays elevated even without a direct learning revision flag', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.74,
        whyNow: 'An older repair phase is active, but it may not be the same bond line now.',
        ambiguityPosture: 'approximate',
        conflictSeverity: 'medium',
        stableCore: ['Keep the present repair context clearer than the older phase.'],
        unsafeDetails: ['Do not merge competing relationship phases into one recalled bond line.'],
        selectedPeriods: [{
          id: 'period-relationship-1',
          kind: 'consolidation',
          summary: 'An older repair phase kept more distance than the current bond line.',
        }],
        selectedEras: [{
          id: 'era-relationship-1',
          facet: 'relationship-era',
          summary: 'An older repair phase kept more distance than the current bond line.',
        }],
        selectedEpisodes: [{
          id: 'episode-relationship-1',
          summary: 'The old repair phase still wants to explain the bond line.',
          provenance: 'reconstructed',
        }],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        selectedRelationshipLines: ['Leave more room before warmth.', 'Stay near, but not with that old distance.'],
        conflictVariants: [{
          id: 'suppression:relationship-era-confusion',
          summary: 'Competing relationship eras remained too easy to confuse.',
          provenance: 'reconstructed',
          reason: 'Competing relationship eras remained too easy to confuse, so the recalled bond line was vetoed before visible surfacing.',
        }],
        followUpAffordance: {
          summary: 'Keep the recalled bond line inward until the present repair context is clearer.',
          whyNow: 'The recalled relationship line still matters, but the phase boundary is unstable.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'before-payoff',
        certainty: 'firm',
        confidence: 0.8,
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        confidence: 0.78,
        rationale: 'The host is distinguishing this repair phase from an older one.',
      } as any,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: [],
        staleSelfModelVetoRate: 0,
        relationshipEraConfusionRate: 0.42,
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.04,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0.18,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.08,
          delayUntilAfterPayoffBias: 0.06,
          provenanceLabelBias: 0.04,
          specificityClampBias: 0.04,
        },
        personStateAdjustments: {
          repairWindowBias: 0.14,
          closenessCapBias: 0.16,
        },
        notes: [],
      },
    })

    expect(kernel?.shouldStayInward).toBe(true)
    expect(kernel?.whyWithheld).toContain('Relationship-era confusion is still elevated')
    expect(kernel?.restraint.mustDo).toContain('If competing relationship eras are still easy to confuse, keep the recalled bond line inward until the present repair context is clearer.')
    expect(kernel?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(kernel?.followUpAffordance?.preferredTiming).toBe('next-open-window')
  })

  it('lets world-model validation tuning push weak knowledge follow-up after payoff instead of same-turn', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.72,
        whyNow: 'This API detail may help, but it is still only partially verified.',
        ambiguityPosture: 'approximate',
        conflictSeverity: 'medium',
        stableCore: ['Only the broad API shape feels safe.'],
        unsafeDetails: ['Do not state the exact parameter contract as settled fact.'],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [{
          id: 'episode-world-1',
          summary: 'A reconstructed API detail is still being checked.',
          provenance: 'inferred',
        }],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [{
          kind: 'task-procedure',
          summary: 'The API fact is still under validation.',
          currentStance: 'Keep the API detail compressed.',
          answerPosture: 'Answer with validation-first caution.',
          confidence: 0.72,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'The API detail may help after the main payoff lands.',
          whyNow: 'The host may still need the broad shape, but not the sharpest detail.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'answer-anchoring',
        placement: 'inside-payoff',
        certainty: 'firm',
        confidence: 0.8,
      } as any,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.76,
        rationale: 'The host is asking for a technical memory that is still under validation.',
      } as any,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: ['worldModelValidationDiscipline'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.12,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0.14,
          specificityClampBias: 0.18,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0,
        },
        notes: ['Keep world knowledge validation-first.'],
      },
    })

    expect(kernel?.followUpAffordance?.intrusionRisk).toBe('medium')
    expect(kernel?.followUpAffordance?.preferredTiming).toBe('after-payoff')
    expect(kernel?.restraint.mustNotDo).toContain('Do not let reconstructed or inferred world knowledge surface with unsupported specificity.')
  })
})
