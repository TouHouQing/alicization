import { describe, expect, it } from 'vitest'

import {
  analyzeMemoryClusters,
  rankByRecollectionAgendaAffinity,
} from './context-ranking'

const normalizeOrganicRecallText = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, ' ')

function buildExecutionProcedureIntent() {
  return {
    mode: 'execution-procedure' as const,
    temporalFocus: 'experience-matched' as const,
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: true,
    queryHints: ['coding seam'],
    rationale: 'Stay on the current runtime seam.',
    confidence: 0.88,
    recollectionAgenda: {
      whyRecallNow: 'The active runtime continuity should reopen the same handoff seam before branching.',
      goalSimilarity: 0.92,
      relationshipNeed: 0.1,
      affectivePull: 0.08,
      sceneFamiliarity: 0.54,
      candidateTimeScopes: [
        {
          scope: 'experience-matched' as const,
          weight: 0.94,
          rationale: 'This should match the same kind of runtime seam.',
        },
      ],
      candidateEraFacets: [
        {
          facet: 'task-era' as const,
          weight: 0.95,
          rationale: 'This is a task-era continuity lane.',
        },
      ],
      candidateProcedureLines: ['active-dialogue'],
      uncertaintyTolerance: 'medium' as const,
    },
  }
}

describe('context-ranking', () => {
  it('prefers recollection candidates that match runtime continuity handoff variants', () => {
    const ranked = rankByRecollectionAgendaAffinity({
      normalizeOrganicRecallText,
      items: [
        {
          id: 'generic-dialogue-seam',
          text: 'Hold the dialogue seam before branching into another lane.',
          facet: 'task-era' as const,
          ageDays: 3,
        },
        {
          id: 'active-dialogue-seam',
          text: 'Hold the active dialogue seam before branching into another lane.',
          facet: 'task-era' as const,
          ageDays: 3,
        },
      ],
      recollectionIntent: buildExecutionProcedureIntent(),
      toText: item => item.text,
      getFacet: item => item.facet,
      getAgeDays: item => item.ageDays,
    })

    expect(ranked[0]?.id).toBe('active-dialogue-seam')
  })

  it('lets runtime continuity handoff variants dominate the matching memory cluster', () => {
    const clusterState = analyzeMemoryClusters({
      normalizeOrganicRecallText,
      probes: [
        {
          clusterKey: 'generic-dialogue-seam',
          clusterSummary: 'Generic dialogue seam',
          kind: 'procedure',
          text: 'Hold the dialogue seam before branching into another lane.',
        },
        {
          clusterKey: 'active-dialogue-seam',
          clusterSummary: 'Active dialogue seam',
          kind: 'procedure',
          text: 'Hold the active dialogue seam before branching into another lane.',
        },
      ] as any,
      recallSeed: 'continue the current seam without opening a new branch',
      recollectionIntent: buildExecutionProcedureIntent(),
      hostPersonModel: null,
      personStateProjection: null,
      coreIncarnation: '',
      recallGovernor: null,
    })

    expect(clusterState.dominantClusterKey).toBe('active-dialogue-seam')
  })
})
