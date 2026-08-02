import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'

function createDeliberation(overrides: Record<string, unknown> = {}) {
  return {
    shouldRecall: true,
    surfacePolicy: 'relationship-continuity',
    confidence: 0.82,
    whyNow: 'A recalled relationship line is relevant to the current turn.',
    ambiguityPosture: 'settled',
    conflictSeverity: 'none',
    stableCore: ['The relationship evidence remains relevant.'],
    unsafeDetails: [],
    selectedPeriods: [],
    selectedEras: [],
    selectedEpisodes: [],
    selectedProcedures: [],
    selectedBundles: [],
    selectedChains: [],
    selectedRelationshipLines: ['The relationship evidence remains relevant.'],
    followUpAffordance: {
      summary: 'The evidence can surface softly.',
      whyNow: 'The current answer has room for it.',
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
    surfaceMode: 'relationship-continuity',
    placement: 'inside-payoff',
    certainty: 'firm',
    rationale: 'The recalled evidence may surface briefly.',
    confidence: 0.8,
    ...overrides,
  } as any
}

function pickDecision(kernel: ReturnType<typeof buildAlicizationMemoryDeliberationKernel>) {
  return {
    surfacePolicy: kernel?.surfacePolicy,
    shouldStayInward: kernel?.shouldStayInward,
    surfacePermission: kernel?.memoryControl?.surfacePermission,
    restraintSurfaceMode: kernel?.restraint.surfaceMode,
    followUpAffordance: kernel?.followUpAffordance,
  }
}

describe('memory-deliberation-kernel template independence', () => {
  it('does not inspect recalled prose to derive hidden policy', () => {
    const source = readFileSync(new URL('./memory-deliberation-kernel.ts', import.meta.url), 'utf8')
    const builderSource = source.slice(source.indexOf('export function buildAlicizationMemoryDeliberationKernel'))

    expect(builderSource).not.toMatch(/\.includes\(|\.match\(|\.test\(|toLowerCase\(/u)
  })

  it('does not let non-owner context alter the recall owner surface policy', () => {
    const input = {
      deliberation: createDeliberation(),
      speech: createSpeech(),
      recollectionIntent: null,
    }
    const baseline = buildAlicizationMemoryDeliberationKernel(input)
    const withNonOwnerContext = buildAlicizationMemoryDeliberationKernel({
      ...input,
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
    })

    expect(pickDecision(withNonOwnerContext)).toEqual(pickDecision(baseline))
  })

  it('does not reclassify an explicit owner policy from selected evidence wording', () => {
    const kernel = buildAlicizationMemoryDeliberationKernel({
      deliberation: createDeliberation({
        surfacePolicy: 'answer-anchoring',
        selectedRelationshipLines: [],
        selectedChains: [{
          id: 'chain-1',
          kind: 'task-procedure-relationship-stance',
          summary: 'A prior task followed a verified sequence.',
          rationale: 'The selected evidence matches the current task.',
          confidence: 0.84,
          currentStance: 'Use the verified sequence.',
          answerPosture: 'Ground the answer in the selected evidence.',
        }],
      }),
      speech: createSpeech({
        surfaceMode: 'answer-anchoring',
      }),
      recollectionIntent: {
        mode: 'conversation-history',
        temporalFocus: 'experience-matched',
        confidence: 0.82,
        rationale: 'The selected evidence matches the current task.',
      } as any,
    })

    expect(kernel?.surfacePolicy).toBe('answer-anchoring')
  })

  it('derives the same decision from different evidence prose with the same structure', () => {
    const first = buildAlicizationMemoryDeliberationKernel({
      deliberation: createDeliberation({
        whyNow: 'Evidence alpha is relevant.',
        stableCore: ['Evidence alpha is stable.'],
        selectedRelationshipLines: ['Evidence alpha supports the relationship context.'],
      }),
      speech: createSpeech({ rationale: 'Evidence alpha may surface.' }),
      recollectionIntent: null,
    })
    const second = buildAlicizationMemoryDeliberationKernel({
      deliberation: createDeliberation({
        whyNow: 'Evidence beta is relevant.',
        stableCore: ['Evidence beta is stable.'],
        selectedRelationshipLines: ['Evidence beta supports the relationship context.'],
      }),
      speech: createSpeech({ rationale: 'Evidence beta may surface.' }),
      recollectionIntent: null,
    })

    expect(pickDecision(second)).toEqual(pickDecision(first))
  })
})
