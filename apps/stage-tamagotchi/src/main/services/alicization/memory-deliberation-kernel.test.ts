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
})
