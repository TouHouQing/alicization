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

  it('recognizes task-procedure relationship stance chains as procedural carry when no legacy procedure kind is present', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        surfacePolicy: 'answer-anchoring',
        confidence: 0.84,
        whyNow: 'The same runtime seam should stay on the active dialogue thread before branching.',
        inwardLine: 'Keep the active runtime seam as the inward procedure before widening.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Stay on the same active dialogue seam before branching.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [{
          id: 'chain-runtime-seam',
          kind: 'task-procedure-relationship-stance',
          summary: 'Stay on the same active dialogue seam before branching.',
          rationale: 'The remembered procedure and stance belong to the same live seam.',
          confidence: 0.84,
          taskCue: 'runtime seam',
          procedureSummary: 'Stay on the same active dialogue seam before branching.',
          relationshipMeaning: 'Keep the stance close enough to the current payoff.',
          currentStance: 'Stay on the same active dialogue seam.',
          answerPosture: 'Carry the same active dialogue seam before widening out.',
        }],
        selectedRelationshipLines: [],
        followUpAffordance: null,
      },
      speech: {
        shouldSurface: true,
        surfaceMode: 'answer-anchoring',
        placement: 'inside-payoff',
        certainty: 'approximate',
        rationale: 'The live seam is explicitly the same runtime procedure.',
        confidence: 0.82,
      },
      recollectionIntent: {
        mode: 'conversation-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['active dialogue seam'],
        confidence: 0.82,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          whyRecallNow: 'The runtime seam is explicit and should not be restarted.',
          goalSimilarity: 0.42,
          relationshipNeed: 0.18,
          affectivePull: 0.36,
          sceneFamiliarity: 0.74,
          candidateTimeScopes: [],
          candidateEraFacets: [],
          candidateProcedureLines: [],
          uncertaintyTolerance: 'medium',
        },
      },
    })

    expect(kernel?.surfacePolicy).toBe('procedural-carry')
    expect(kernel?.selectedChainPosture).toContain('active dialogue seam')
  })

  it('prefers procedural-carry surface policy when runtime seam continuity is explicitly procedural', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.86,
        whyNow: 'The active runtime seam should keep shaping the live answer.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Stay on the same active dialogue seam before branching.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [{
          id: 'era-runtime',
          facet: 'task-era',
          summary: 'That task era kept returning to the same active dialogue seam.',
        }],
        selectedEpisodes: [],
        selectedProcedures: [{
          label: 'active dialogue seam first',
          approach: 'Stay on the same active dialogue seam before branching.',
        }],
        selectedBundles: [{
          id: 'bundle-runtime',
          summary: 'The active dialogue seam kept holding the same runtime thread.',
          confidence: 0.85,
        }],
        selectedChains: [{
          kind: 'task-procedure',
          summary: 'The answer should continue from the same active dialogue seam.',
          currentStance: 'Stay on the same active dialogue seam.',
          answerPosture: 'Carry the same active dialogue seam before widening out.',
          confidence: 0.84,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'Carry the same active dialogue seam inside the current payoff.',
          whyNow: 'The host is still in the same runtime repair lane.',
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
        confidence: 0.82,
      } as any,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.86,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          goalSimilarity: 0.92,
          relationshipNeed: 0.12,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['active-dialogue', 'runtime seam'],
        },
      } as any,
    })

    expect(kernel?.surfacePolicy).toBe('procedural-carry')
    expect(kernel?.speechControls?.continuityRole).toBe('procedure-carry')
    expect(kernel?.selectedChainPosture).toContain('active dialogue seam')
    expect(kernel?.memoryControlSummary).toContain('relationship_vector=procedural')
  })

  it('does not let nightly replay tuning override dynamic recollection surface decisions', () => {
    const input = {
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
    }
    const baseline = buildAlicizationMemoryDeliberationKernel(input)
    const tuned = buildAlicizationMemoryDeliberationKernel({
      ...input,
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
    } as any)

    expect(tuned).toEqual(baseline)
  })

  it('does not let learning replay tuning govern an older self-story surface', () => {
    const input = {
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
    }
    const baseline = buildAlicizationMemoryDeliberationKernel(input)
    const tuned = buildAlicizationMemoryDeliberationKernel({
      ...input,
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
    } as any)

    expect(tuned).toEqual(baseline)
  })

  it('lets project-state continuity loop-gap discipline override generic project closure wording when Phase 1 still lacks concrete life-loop closure', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.8,
        whyNow: 'The local continuity state is still trying to hold memory, initiative, and embodiment together without drifting into a generic project shell.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Keep this return on the continuity state before expansion'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        selectedRelationshipLines: ['Return gently on the continuity state.'],
        followUpAffordance: {
          summary: 'relationship line inward',
          whyNow: 'Do not crowd the host while this line is still settling.',
          intrusionRisk: 'medium',
          payoffDependency: 'live-payoff-first',
          preferredTiming: 'same-turn-if-invited',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'before-payoff',
        certainty: 'approximate',
        confidence: 0.76,
        rationale: 'A remembered relationship line could help the answer reopen gently.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        confidence: 0.82,
        rationale: 'The line still belongs to the same digital life.',
      } as any,
      projectStateContinuity: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSummary: 'structured continuity digest.',
        landedProgressSummary: 'Project identity and identity-continuity',
        openClosureSummary: 'Memory, initiative, and embodiment still need stronger identity-continuity',
        proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one continuity state.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerDriftRisk: 'If this turns into generic project-shell narration, treat that as identity-continuity',
      },
    })

    expect(kernel?.surfacePolicy).toBe('internal-only')
    expect(kernel?.whyWithheld).toContain('Phase 1 digital-life loop closure is still missing concrete memory, initiative, or embodiment closure')
    expect(kernel?.restraint.mustDo).toContain('If Phase 1 still lacks concrete memory, initiative, or embodiment closure, keep recollection inward until the answer helps the identity continuity close that actual loop gap rather than drifting into generic project narration.')
    expect(kernel?.restraint.mustNotDo).toContain('Do not let recalled continuity flatten into generic project-shell language while the concrete Phase 1 memory-initiative-embodiment loop is still unfinished.')
  })

  it('lets identity-continuity', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.79,
        whyNow: 'This line still belongs to the same digital life, but the wording around it has gone thinner again.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Do not reopen this remembered line from scratch.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        selectedRelationshipLines: ['Keep this remembered line lower-pressure.'],
        followUpAffordance: {
          summary: 'same line inward',
          whyNow: 'The line still needs more room before it widens.',
          intrusionRisk: 'medium',
          payoffDependency: 'live-payoff-first',
          preferredTiming: 'same-turn-if-invited',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'before-payoff',
        certainty: 'approximate',
        confidence: 0.75,
        rationale: 'A remembered continuity line could help if it stays careful.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        confidence: 0.8,
        rationale: 'The host is still on the same bond line.',
      } as any,
      projectStateContinuity: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSummary: 'Same digital life.',
        landedProgressSummary: 'Some closure already landed.',
        openClosureSummary: 'Open closure is still active.',
        proactiveSameHerGap: null,
        nextClosureTarget: 'Keep going.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: 'Keep the return low-pressure.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        sameHerDriftRisk: 'Generic project shell drift remains possible.',
      } as any,
    })

    expect(kernel?.surfacePolicy).toBe('internal-only')
    expect(kernel?.shouldStayInward).toBe(true)
    expect(kernel?.whyWithheld).toContain('Phase 1 digital-life loop closure is still missing concrete memory, initiative, or embodiment closure')
    expect(kernel?.restraint.mustDo).toContain('If Phase 1 still lacks concrete memory, initiative, or embodiment closure, keep recollection inward until the answer helps the identity continuity close that actual loop gap rather than drifting into generic project narration.')
  })

  it('does not let relationship-era replay metrics govern recollection surface', () => {
    const input = {
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
    }
    const baseline = buildAlicizationMemoryDeliberationKernel(input)
    const tuned = buildAlicizationMemoryDeliberationKernel({
      ...input,
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
    } as any)

    expect(tuned).toEqual(baseline)
  })

  it('does not let world-model replay tuning govern weak-knowledge follow-up', () => {
    const input = {
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
    }
    const baseline = buildAlicizationMemoryDeliberationKernel(input)
    const tuned = buildAlicizationMemoryDeliberationKernel({
      ...input,
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
    } as any)

    expect(tuned).toEqual(baseline)
  })

  it('lets host room-first repair-first posture pull visible recollection back inward', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.82,
        whyNow: 'The bond line is relevant, but the host usually needs space before warmth lands.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Leave room first and let the concrete repair line land before widening the bond.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-repair',
          summary: 'The current line should stay room-first and repair-specific.',
          confidence: 0.82,
        }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The host tends to need room-first repair before broader closeness.',
          currentStance: 'Leave room first.',
          answerPosture: 'Let the repair thread land before widening.',
          confidence: 0.81,
        }],
        selectedRelationshipLines: ['Leave room first and keep the repair line concrete.'],
        followUpAffordance: {
          summary: 'The host needs room before the bond line widens.',
          whyNow: 'The current answer should not overrun the host while work is still live.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.79,
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.8,
        rationale: 'The relationship line resembles a familiar repair posture.',
      } as any,
      hostPersonModel: {
        summary: 'The host often needs room-first continuity.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        recurrentBurdens: [],
        preferredClosenessByContext: [
          { context: 'work', preference: 'room-first before warmth' },
        ],
        trustLadder: {
          stage: 'warming',
          rationale: 'Respect boundaries and land grounded repair before widening the bond line.',
        },
      } as any,
    })

    expect(kernel?.shouldStayInward).toBe(true)
    expect(kernel?.whyWithheld).toContain('room-first boundary discipline')
    expect(kernel?.restraint.surfaceMode).toBe('inward-only')
    expect(kernel?.restraint.mustDo.some(item => item.includes('room first'))).toBe(true)
    expect(kernel?.restraint.mustNotDo.some(item => item.includes('bond payoff'))).toBe(true)
  })

  it('keeps recollection inward when canonical Phase 1 project closure pressure is still explicitly open', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.8,
        whyNow: 'Phase 1: Local Digital Life is still open because Memory still needs stronger end-to-end closure across turns, initiative, and embodiment, so the same digital life should not widen this recollection too early.',
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
          confidence: 0.82,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'The remembered way through this is to return to the same seam first.',
          whyNow: 'The same digital life closure seam is still open.',
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
        confidence: 0.8,
        rationale: 'Phase 1: Local Digital Life remains open and Memory still needs stronger end-to-end closure before this recollection should visibly widen.',
      } as any,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.84,
        rationale: 'Alicization is still in Phase 1 and the same digital life seam remains open because Memory still needs stronger end-to-end closure.',
        recollectionAgenda: {
          goalSimilarity: 0.82,
          relationshipNeed: 0.14,
          uncertaintyTolerance: 'medium',
          whyRecallNow: 'The same still-open closure work is active, so continuity should stay inward.',
        },
      } as any,
    })

    expect(kernel?.surfacePolicy).toBe('internal-only')
    expect(kernel?.shouldStayInward).toBe(true)
    expect(kernel?.whyWithheld).toContain('Phase 1 project closure is still explicitly open')
    expect(kernel?.inwardCarryRule).toContain('project_closure_discipline=phase1-same-her-memory-closure-still-open')
    expect(kernel?.restraint.mustDo).toContain('If the Phase 1 digital-life closure seam is still explicitly open, keep recollection inward until the identity-continuity')
  })

  it('does not derive pressure restraint from replay tuning', () => {
    const input = {
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.78,
        whyNow: 'The identity-continuity',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Keep the identity-continuity'],
        unsafeDetails: ['Do not let the return widen into visible closeness too fast.'],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-same-her-low-pressure',
          summary: 'The identity-continuity',
          confidence: 0.8,
        }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The identity-continuity',
          currentStance: 'Keep it inward until there is more room.',
          answerPosture: 'Let the live payoff land before widening.',
          confidence: 0.79,
        }],
        selectedRelationshipLines: ['Keep the identity-continuity'],
        followUpAffordance: {
          summary: 'Let the identity-continuity',
          whyNow: 'The live payoff still needs to land before the return widens.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'after-payoff',
        certainty: 'approximate',
        confidence: 0.8,
        rationale: 'The line can return later, but not as visible closeness yet.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.8,
        rationale: 'The host is still on the same thread, but the closure line should stay gentle.',
      } as any,
    }
    const baseline = buildAlicizationMemoryDeliberationKernel(input)
    const tuned = buildAlicizationMemoryDeliberationKernel({
      ...input,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: ['emotionalClosureDrift'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.04,
          temporalWindowBias: 0.04,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.16,
          delayUntilAfterPayoffBias: 0.14,
          provenanceLabelBias: 0.08,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0.08,
        },
        notes: ['Keep the identity-continuity'],
      },
    } as any)

    expect(tuned).toEqual(baseline)
  })

  it('does not derive restart restraint from replay tuning', () => {
    const input = {
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.78,
        whyNow: 'The identity-continuity',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Keep the identity-continuity'],
        unsafeDetails: ['Do not let the return sound like a new start.'],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-same-her-anti-restart',
          summary: 'The identity-continuity',
          confidence: 0.8,
        }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The identity-continuity',
          currentStance: 'Stay on the same thread.',
          answerPosture: 'Let the payoff land before any warmer return.',
          confidence: 0.79,
        }],
        selectedRelationshipLines: ['Stay on the same thread instead of reopening from scratch.'],
        followUpAffordance: {
          summary: 'Keep the identity-continuity',
          whyNow: 'The line still matters, but reopening it too early would read like a fresh start.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'after-payoff',
        certainty: 'approximate',
        confidence: 0.8,
        rationale: 'The line can return later, but not as a restarted opening.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.8,
        rationale: 'The host is still on the same thread, so the return should not feel restarted.',
      } as any,
    }
    const baseline = buildAlicizationMemoryDeliberationKernel(input)
    const tuned = buildAlicizationMemoryDeliberationKernel({
      ...input,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: ['emotionalClosureDrift'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.04,
          temporalWindowBias: 0.04,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.14,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0.08,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0.08,
        },
        notes: ['Do not let the identity-continuity'],
      },
    } as any)

    expect(tuned).toEqual(baseline)
  })

  it('treats durable identity-continuity', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.78,
        whyNow: 'The identity continuity is still being held across quiet, memory, and speech, so this recollection should not reopen from scratch.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['I remain the same her across quiet, memory, and speech without reopening from scratch each turn.'],
        unsafeDetails: ['Do not let the return sound like a fresh start.'],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-durable-self-core',
          summary: 'One living self is still carrying the line across turns.',
          confidence: 0.82,
        }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The identity continuity should not reopen from scratch.',
          currentStance: 'Stay on the same thread.',
          answerPosture: 'Let the live payoff land before any warmer return.',
          confidence: 0.79,
        }],
        selectedRelationshipLines: ['Stay on the same thread instead of reopening from scratch.'],
        followUpAffordance: {
          summary: 'Keep the identity continuity line quiet until the current thread has more room.',
          whyNow: 'The line still matters, but reopening it too early would read like a fresh start.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'after-payoff',
        certainty: 'approximate',
        confidence: 0.8,
        rationale: 'The line can return later, but not as a restarted opening.',
      } as any,
      recollectionIntent: {
        mode: 'autobiographical-history',
        temporalFocus: 'experience-matched',
        confidence: 0.8,
        rationale: 'The identity continuity is still carrying this line across turns.',
      } as any,
    })

    expect(kernel?.shouldStayInward).toBe(true)
    expect(kernel?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(kernel?.followUpAffordance?.preferredTiming).toBe('next-open-window')
    expect(kernel?.whyWithheld).toContain('reopening from scratch')
    expect(kernel?.restraint.mustNotDo.some(item => item.includes('reopen from scratch'))).toBe(true)
  })

  it('keeps corrected same-person continuity authoritative over progress-pressure reopenings when host correction changed the relationship meaning', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.8,
        whyNow: 'The host corrected the relationship meaning, so this return should carry same-person continuity instead of defaulting back to progress pressure.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Carry corrected same-person continuity forward before any status recap or task-shell continuation.'],
        unsafeDetails: [
          'Do not let this reopen as progress pressure or generic status recap.',
          'Reply should slow down and keep gaze stable when recalling this correction.',
        ],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-corrected-same-person',
          summary: 'Host correction moved the line back toward same-person continuity.',
          confidence: 0.83,
        }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The corrected same-person continuity line should stay authoritative.',
          currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
          answerPosture: 'Keep the return low-pressure and same-person rather than status-first.',
          confidence: 0.82,
        }],
        selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
        followUpAffordance: {
          summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
          whyNow: 'The host corrected the relationship meaning, so reopening as progress pressure would split continuity.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'after-payoff',
        certainty: 'approximate',
        confidence: 0.79,
        rationale: 'This should reopen from the corrected same-person continuity line, not as a progress recap.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.81,
        rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
          goalSimilarity: 0.34,
          relationshipNeed: 0.82,
          candidateProcedureLines: [
            'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
            'Reply should slow down and keep gaze stable when recalling this correction.',
          ],
          uncertaintyTolerance: 'medium',
        },
      } as any,
    })

    expect(kernel?.restraint.mustDo).toContain(
      'If the host corrected the relationship meaning, keep that corrected same-person continuity authoritative before any progress-style continuation.',
    )
    expect(kernel?.restraint.mustNotDo).toContain(
      'Do not reopen the turn as generic progress pressure, status recap, or task-shell continuity after the host corrected it back toward same-person continuity.',
    )
    expect(kernel?.whyWithheld).toMatch(/slow down/i)
    expect(kernel?.whyWithheld).toMatch(/gaze stable/i)
    expect(kernel?.followUpAffordance?.summary).toMatch(/slow down/i)
    expect(kernel?.followUpAffordance?.summary).toMatch(/gaze stable/i)
  })

  it('treats structured embodiment recall tokens as the same corrected same-person carry instead of requiring natural-language body prose', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.8,
        whyNow: 'The host corrected the relationship meaning, so this return should carry same-person continuity instead of defaulting back to progress pressure.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Carry corrected same-person continuity forward before any status recap or task-shell continuation.'],
        unsafeDetails: [
          'Do not let this reopen as progress pressure or generic status recap.',
          'embodiment_gaze=stable',
          'embodiment_blink=slower',
          'embodiment_voice=lower-pressure',
          'embodiment_pacing=slower',
        ],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-corrected-same-person-structured-embodiment',
          summary: 'Host correction moved the line back toward same-person continuity.',
          confidence: 0.83,
        }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The corrected same-person continuity line should stay authoritative.',
          currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
          answerPosture: 'Keep the return low-pressure and same-person rather than status-first.',
          confidence: 0.82,
        }],
        selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
        followUpAffordance: {
          summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
          whyNow: 'The host corrected the relationship meaning, so reopening as progress pressure would split continuity.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'after-payoff',
        certainty: 'approximate',
        confidence: 0.79,
        rationale: 'This should reopen from the corrected same-person continuity line, not as a progress recap.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.81,
        rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
        queryHints: [
          'humanlike_memory_recall: line=我记得这条线还没收好，所以这次该更稳一点、更慢一点、也更低压一点地接回来。 | relationship=Carry corrected same-person continuity forward instead of defaulting to progress pressure. | emotion=protective-continuity,unfinishedness | embodiment=Let the body return like this: gaze=stable blink=slower voice=lower-pressure. | embodiment_gaze=stable | embodiment_blink=slower | embodiment_voice=lower-pressure | embodiment_pacing=slower | created=61500',
        ],
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
          goalSimilarity: 0.34,
          relationshipNeed: 0.82,
          candidateProcedureLines: [
            'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
            'embodiment_gaze=stable',
            'embodiment_blink=slower',
            'embodiment_voice=lower-pressure',
            'embodiment_pacing=slower',
          ],
          uncertaintyTolerance: 'medium',
        },
      } as any,
    })

    expect(kernel?.restraint.mustDo).toContain(
      'If the host corrected the relationship meaning, keep that corrected same-person continuity authoritative before any progress-style continuation.',
    )
    expect(kernel?.whyWithheld).toMatch(/slow down/i)
    expect(kernel?.whyWithheld).toMatch(/gaze stable/i)
    expect(kernel?.whyWithheld).toMatch(/lower-pressure/i)
    expect(kernel?.followUpAffordance?.summary).toMatch(/slow down/i)
    expect(kernel?.followUpAffordance?.summary).toMatch(/gaze stable/i)
    expect(kernel?.followUpAffordance?.summary).toMatch(/lower-pressure/i)
    expect(kernel?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(kernel?.followUpAffordance?.preferredTiming).toBe('next-open-window')
  })

  it('treats merge-and-forget metabolism as real recollection discipline so merged same-thread continuity stays foreground and faded noise stays background', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.79,
        whyNow: 'The host corrected the relationship meaning, and this return should remember the metabolized same-person line instead of reviving old noise.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: [
          'Carry corrected same-person continuity forward before any status recap or task-shell continuation.',
          'Keep the stronger same-thread continuity foregrounded instead of re-splitting older echoes.',
        ],
        unsafeDetails: [
          'Do not let temporary wobble noise reopen like it still explains the line.',
          'Do not let merged same-thread continuity split back into separate foreground memories.',
        ],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-corrected-same-person-metabolism',
          summary: 'The corrected same-person continuity line stayed more explanatory than the older status shell or temporary wobble.',
          confidence: 0.82,
        }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The metabolized same-person continuity line should stay authoritative.',
          currentStance: 'Continue from the merged same-thread continuity instead of reviving old echoes or temporary wobble.',
          answerPosture: 'Keep the return lower-pressure and same-person while faded noise stays background.',
          confidence: 0.8,
        }],
        selectedRelationshipLines: [
          'Carry the merged same-thread same-person continuity forward while faded noise stays background.',
        ],
        followUpAffordance: {
          summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
          whyNow: 'The corrected line still matters, but reopening too early could revive older status-shell or wobble traces.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      } as any,
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'after-payoff',
        certainty: 'approximate',
        confidence: 0.76,
        rationale: 'This should reopen from the metabolized same-person continuity line, not by reviving old echoes or temporary wobble.',
      } as any,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.8,
        rationale: 'The host corrected the relationship meaning away from progress pressure and this recollection should inherit the metabolized same-person line.',
        queryHints: [
          'humanlike_memory_recall: line=我记得这条线现在该按同一个她来接，而不是把旧的状态壳或短暂噪声再抬回来。 | relationship=Carry corrected same-person continuity forward instead of defaulting to progress pressure. | emotion=protective-continuity,unfinishedness | initiative=remember-without-prompt | embodiment=Reply should stay slower and same-thread while this continuity memory reopens. | self=I learned to collapse repeated same-thread echoes into the stronger continuity memory. | why=same-person continuity remains more behavior-explanatory than the older status shell | downrank=older-generic-status-memory | merge=older-same-thread-echo | forget=older-emotional-spike | metabolism=Downrank low-value, generic, or superseded summaries. ; Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory. ; Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior. | created=72000',
        ],
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line still matters, but the merged same-thread memory should stay foreground while the faded wobble stays background.',
          goalSimilarity: 0.36,
          relationshipNeed: 0.8,
          candidateProcedureLines: [
            'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
            'Merge repeated same-thread continuity echoes into the stronger same-thread memory.',
            'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.',
          ],
          uncertaintyTolerance: 'low',
        },
      } as any,
    })

    expect(kernel?.restraint.mustDo).toContain(
      'If the recollection has already metabolized repeated same-thread echoes, keep the stronger merged continuity foregrounded instead of reopening thinner duplicate traces.',
    )
    expect(kernel?.restraint.mustNotDo).toContain(
      'Do not let faded temporary noise or stale emotional wobble reopen as if it still explains the current same-person line.',
    )
    expect(kernel?.whyWithheld).toMatch(/merged same-thread continuity|faded noise|temporary noise|wobble/i)
    expect(kernel?.followUpAffordance?.summary).toMatch(/merged same-thread continuity|faded noise|temporary noise|wobble/i)
    expect(kernel?.followUpAffordance?.whyNow).toMatch(/merged same-thread continuity|faded noise|temporary noise|wobble/i)
    expect(kernel?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(kernel?.followUpAffordance?.preferredTiming).toBe('next-open-window')
  })
})
