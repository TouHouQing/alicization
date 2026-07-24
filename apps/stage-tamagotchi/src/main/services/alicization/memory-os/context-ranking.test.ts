import { describe, expect, it } from 'vitest'

import {
  analyzeMemoryClusters,
  buildMemoryPromptPersonStateProjection,
  rankByHostSocialAffinity,
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

function buildStructuredPersonStateProjection(doctrineText: string) {
  return {
    contexts: ['general', 'open-window'],
    personalityContinuityState: {
      trustStage: 'warming',
      currentRegime: 'general',
      closenessPosture: 'balanced',
      repairPosture: 'repair-first',
      autonomyPosture: 'balanced',
      growthProfile: {
        truthAnchor: 0.4,
        autonomyRespect: 0.4,
        prefersQuietCompanionship: false,
      },
    },
    selfContinuityAuthority: null,
    activeClosenessContext: 'general',
    activeClosenessRung: 'nearby-soft',
    relationshipDoctrine: doctrineText,
    cautious: false,
    restrained: false,
    summary: 'structured relationship projection',
  } as any
}

function rankRelationshipMemories(doctrineText: string) {
  return rankByHostSocialAffinity({
    normalizeOrganicRecallText,
    items: [
      {
        id: 'warmth',
        text: 'warm closeness companionship',
      },
      {
        id: 'repair',
        text: 'repair boundary space',
      },
    ],
    toText: item => item.text,
    recallSeed: 'remember the relationship history',
    recollectionIntent: {
      mode: 'relationship-history',
      queryHints: [],
    } as any,
    hostPersonModel: null,
    personStateProjection: buildStructuredPersonStateProjection(doctrineText),
    coreIncarnation: '',
  })
}

describe('context-ranking', () => {
  it('ranks repair memories above warmth memories for structured repair-first state', () => {
    const ranked = rankRelationshipMemories('owner-authored doctrine')

    expect(ranked.map(item => item.id)).toEqual(['repair', 'warmth'])
  })

  it('keeps structured relationship ranking stable when doctrine prose changes', () => {
    const warmthDoctrineRanking = rankRelationshipMemories('warm closeness companionship')
    const repairDoctrineRanking = rankRelationshipMemories('repair boundary space')

    expect(warmthDoctrineRanking.map(item => item.id)).toEqual(['repair', 'warmth'])
    expect(repairDoctrineRanking.map(item => item.id)).toEqual(['repair', 'warmth'])
  })

  it('does not boost legacy continuity phrases in cluster scoring without structured support', () => {
    const projection = buildStructuredPersonStateProjection('owner-authored doctrine')
    projection.personalityContinuityState.trustStage = null
    projection.personalityContinuityState.repairPosture = 'measured-repair'
    projection.summary = 'owner state'

    const clusters = analyzeMemoryClusters({
      normalizeOrganicRecallText,
      probes: [
        {
          clusterKey: 'ordinary',
          clusterSummary: 'Ordinary',
          kind: 'relationship',
          text: 'ordinary relationship note',
        },
        {
          clusterKey: 'legacy-phrase',
          clusterSummary: 'Legacy phrase',
          kind: 'relationship',
          text: 'same her continuity line',
        },
      ] as any,
      recallSeed: 'unrelated seed',
      recollectionIntent: {
        mode: 'relationship-history',
        queryHints: [],
      } as any,
      hostPersonModel: null,
      personStateProjection: projection,
      coreIncarnation: '',
      recallGovernor: null,
    })

    expect(clusters.dominantClusterKey).toBe('ordinary')
  })

  it('keeps typed relationship ranking stable when authority prose uses legacy cues', () => {
    const rankWithAuthorityLine = (relationshipLine: string) => {
      const projection = buildStructuredPersonStateProjection('owner-authored doctrine')
      projection.personalityContinuityState.trustStage = null
      projection.personalityContinuityState.repairPosture = 'measured-repair'
      projection.selfContinuityAuthority = {
        relationshipLine,
      }

      return rankByHostSocialAffinity({
        normalizeOrganicRecallText,
        items: [
          {
            id: 'repair',
            text: 'repair boundary',
          },
          {
            id: 'warmth',
            text: 'warm closeness',
          },
        ],
        toText: item => item.text,
        recallSeed: 'relationship history',
        recollectionIntent: {
          mode: 'relationship-history',
          queryHints: [],
        } as any,
        hostPersonModel: null,
        personStateProjection: projection,
        coreIncarnation: '',
      }).map(item => item.id)
    }

    expect(rankWithAuthorityLine('leave more room')).toEqual(['repair', 'warmth'])
    expect(rankWithAuthorityLine('same her foreground')).toEqual(['repair', 'warmth'])
  })

  it('uses structured truth and autonomy signals for execution-memory ranking', () => {
    const projection = buildStructuredPersonStateProjection('warm closeness companionship')
    projection.personalityContinuityState.repairPosture = 'measured-repair'
    projection.personalityContinuityState.growthProfile.truthAnchor = 0.82
    projection.personalityContinuityState.growthProfile.autonomyRespect = 0.82

    const ranked = rankByHostSocialAffinity({
      normalizeOrganicRecallText,
      items: [
        {
          id: 'warmth',
          text: 'warm closeness companionship',
        },
        {
          id: 'grounded',
          text: 'verify the runtime truth and repair the boundary',
        },
      ],
      toText: item => item.text,
      recallSeed: 'resume the task',
      recollectionIntent: {
        mode: 'execution-procedure',
        queryHints: [],
      } as any,
      hostPersonModel: null,
      personStateProjection: projection,
      coreIncarnation: '',
    })

    expect(ranked.map(item => item.id)).toEqual(['grounded', 'warmth'])
  })

  it('projects focused-work and execution as independent contexts', () => {
    const projection = buildMemoryPromptPersonStateProjection({
      recallSeed: 'continue the current task',
      recollectionIntent: {
        mode: 'execution-procedure',
        queryHints: [],
      } as any,
      hostPersonModel: {
        summary: '',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.64,
          rationale: '',
        },
        preferredClosenessByContext: [],
        recurrentBurdens: [],
        narrative: [],
        updatedAt: 0,
      },
    })

    expect(projection?.contexts).toEqual(expect.arrayContaining(['focused-work', 'execution']))
    expect(projection?.contexts).not.toContain('focused-work execution')
  })

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
