import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'

function createDeliberation(overrides: Record<string, unknown> = {}) {
  return {
    shouldRecall: true,
    surfacePolicy: 'answer-anchoring',
    confidence: 0.84,
    whyNow: 'A relevant recalled procedure can support the current answer.',
    ambiguityPosture: 'settled',
    conflictSeverity: 'none',
    stableCore: ['Return to the verified procedure before branching.'],
    unsafeDetails: [],
    selectedPeriods: [],
    selectedEras: [],
    selectedEpisodes: [],
    selectedProcedures: [{
      id: 'procedure-1',
      label: 'verified procedure',
      approach: 'Return to the verified procedure before branching.',
    }],
    selectedBundles: [],
    selectedChains: [],
    selectedRelationshipLines: [],
    followUpAffordance: {
      summary: 'The recalled procedure can surface inside the answer.',
      whyNow: 'It directly matches the current task.',
      intrusionRisk: 'low',
      payoffDependency: 'can-surface-softly',
      preferredTiming: 'same-turn-if-invited',
    },
    ...overrides,
  } as any
}

function createSpeech(overrides: Record<string, unknown> = {}) {
  return {
    shouldSurface: true,
    surfaceMode: 'answer-anchoring',
    placement: 'inside-payoff',
    certainty: 'firm',
    rationale: 'The recalled evidence can support the answer.',
    confidence: 0.82,
    ...overrides,
  } as any
}

describe('memory-deliberation-kernel', () => {
  it('returns null when no memory owner supplied a deliberation or speech plan', () => {
    expect(buildAlicizationMemoryDeliberationKernel({
      deliberation: null,
      speech: null,
      recollectionIntent: null,
    })).toBe(null)
  })

  it('keeps an inward-only owner decision internal while preserving evidence boundaries', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: createDeliberation({
        surfacePolicy: 'internal-only',
        ambiguityPosture: 'approximate',
        conflictSeverity: 'medium',
        stableCore: ['The broad event sequence is still reliable.'],
        unsafeDetails: ['The exact wording remains uncertain.'],
        selectedEpisodes: [{
          id: 'episode-1',
          summary: 'A reconstructed episode supports only the broad sequence.',
          provenance: 'reconstructed',
        }],
        followUpAffordance: {
          summary: 'Keep the memory internal until the current answer lands.',
          whyNow: 'The exact detail remains uncertain.',
          intrusionRisk: 'high',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      }),
      speech: createSpeech({
        shouldSurface: false,
        surfaceMode: 'internal-only',
        placement: 'internal-only',
        certainty: 'approximate',
      }),
      recollectionIntent: null,
    })

    expect(kernel).toMatchObject({
      shouldRecall: true,
      surfacePolicy: 'internal-only',
      shouldStayInward: true,
      stableCore: ['The broad event sequence is still reliable.'],
      unsafeDetails: ['The exact wording remains uncertain.'],
    })
    expect(kernel?.memoryControl).toMatchObject({
      surfacePermission: 'inward-only',
      provenancePosture: 'reconstructed-memory',
      conflictBurden: 'medium',
      detailAssertionBudget: 'guarded',
    })
    expect(kernel?.restraint).toMatchObject({
      surfaceMode: 'inward-only',
      shouldStayInward: true,
      shouldSuppressSpecificity: true,
    })
    expect(kernel?.restraint.withheldReasons).toEqual(expect.arrayContaining([
      'owner-inward-policy',
      'intrusion-risk-high',
      'payoff-required',
      'unstable-detail',
    ]))
    expect(kernel).not.toHaveProperty('whyWithheld')
    expect(kernel).not.toHaveProperty('speechLatentSummary')
    expect(kernel).not.toHaveProperty('memoryControlSummary')
    expect(kernel).not.toHaveProperty('inwardCarryRule')
    expect(kernel).not.toHaveProperty('inwardCarryBoundary')
  })

  it('preserves an explicit owner surface policy and selected evidence summaries', () => {
    const followUpAffordance = {
      summary: 'The recalled procedure can surface inside the answer.',
      whyNow: 'It directly matches the current task.',
      intrusionRisk: 'low' as const,
      payoffDependency: 'can-surface-softly' as const,
      preferredTiming: 'same-turn-if-invited' as const,
    }
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: createDeliberation({
        selectedPeriods: [{
          id: 'period-1',
          kind: 'consolidation',
          summary: 'A prior work period established the procedure.',
        }],
        selectedBundles: [{
          id: 'bundle-1',
          summary: 'The procedure and its outcome were recalled together.',
          confidence: 0.86,
        }],
        selectedChains: [{
          id: 'chain-1',
          kind: 'task-procedure-relationship-stance',
          summary: 'The current task matches a prior procedure.',
          rationale: 'The task goal and constraints align.',
          confidence: 0.84,
          currentStance: 'Use the verified procedure.',
          answerPosture: 'Ground the answer in the recalled result.',
        }],
        selectedRelationshipLines: ['The user prefers the verified procedure over speculation.'],
        followUpAffordance,
      }),
      speech: createSpeech(),
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.84,
        rationale: 'The current task matches a prior procedure.',
      } as any,
    })

    expect(kernel?.surfacePolicy).toBe('answer-anchoring')
    expect(kernel?.shouldStayInward).toBe(false)
    expect(kernel?.memoryControl?.surfacePermission).toBe('explicit-surface')
    expect(kernel?.selectedPeriodSummary).toContain('prior work period')
    expect(kernel?.selectedBundleSummary).toContain('recalled together')
    expect(kernel?.selectedChainStance).toBe('Use the verified procedure.')
    expect(kernel?.selectedChainPosture).toBe('Ground the answer in the recalled result.')
    expect(kernel?.selectedRelationshipSummary).toContain('verified procedure')
    expect(kernel?.followUpAffordance).toEqual(followUpAffordance)
  })

  it('limits visible recall to stable evidence when provenance or detail is unsafe', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: createDeliberation({
        ambiguityPosture: 'ambiguous',
        conflictSeverity: 'high',
        stableCore: ['Only the broad outcome is supported.'],
        unsafeDetails: ['The exact sequence conflicts across traces.'],
        selectedEpisodes: [{
          id: 'episode-ambiguous',
          summary: 'Several traces disagree about the exact sequence.',
          provenance: 'inferred',
        }],
      }),
      speech: createSpeech({ certainty: 'approximate' }),
      recollectionIntent: null,
      knowledgeEvidence: {
        validationCount: 1,
        contradictionCount: 4,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 1,
      },
    })

    expect(kernel?.restraint).toMatchObject({
      surfaceMode: 'stable-core-only',
      provenanceMode: 'inferred-pattern',
      shouldOnlySurfaceStableCore: true,
      shouldLabelProvenance: true,
      shouldLabelHypothesis: true,
      shouldSuppressSpecificity: true,
    })
    expect(kernel?.stableCore).toEqual(['Only the broad outcome is supported.'])
    expect(kernel?.unsafeDetails).toEqual(['The exact sequence conflicts across traces.'])
  })

  it('does not let replay tuning metadata alter the live recall decision', () => {
    const input = {
      deliberation: createDeliberation(),
      speech: createSpeech(),
      recollectionIntent: null,
    }
    const baseline = buildAlicizationMemoryDeliberationKernel(input)
    const withReplayMetadata = buildAlicizationMemoryDeliberationKernel({
      ...input,
      memoryTuningAdvice: {
        focusDimensions: ['relationship-era'],
        notes: ['Historical replay metadata must remain diagnostic.'],
      },
      learningTuningAdvice: {
        confidenceBias: -0.2,
      },
    } as any)

    expect(withReplayMetadata).toEqual(baseline)
  })
})
