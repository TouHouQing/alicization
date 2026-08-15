import { describe, expect, it } from 'vitest'

import { rankOrganicMemoryCandidatesStage } from './memory-candidate-ranking'
import {
  analyzeMemoryClusters,
  deriveMemoryClusterKey,
  rankByClusterDominance,
  rankByHostSocialAffinity,
  rankByRecollectionAgendaAffinity,
  rankBySceneMoodEmbodiedCarry,
} from './memory-os/context-ranking'

const normalizeOrganicRecallText = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, ' ')

function createHelpers() {
  return {
    deriveMemoryClusterKey: (text: string) => text.trim().toLowerCase().replace(/\s+/g, ':'),
    rankByHostSocialAffinity: <T>(input: { items: T[] }) => input.items,
    rankBySceneMoodEmbodiedCarry: <T>(input: { items: T[] }) => input.items,
    rankByBenchmarkTuningBias: <T>(input: { items: T[] }) => input.items,
    rankByRecollectionAgendaAffinity: <T>(input: { items: T[] }) => input.items,
    analyzeMemoryClusters: () => ({
      dominantClusterKey: null,
      dominantSummary: null,
      dominantScore: 0,
      runnerUpClusterKey: null,
      runnerUpSummary: null,
      runnerUpScore: 0,
      strongDominant: false,
      ambiguous: false,
      clusterScoreByKey: new Map(),
      competingVariants: [],
    }),
    rankByClusterDominance: <T>(input: { items: T[] }) => input.items,
  } as any
}

function createProjectIsolationHelpers(observedRecallSeeds: string[]) {
  return {
    deriveMemoryClusterKey: (text: string) => deriveMemoryClusterKey(normalizeOrganicRecallText, text),
    rankByHostSocialAffinity: (input: any) => {
      observedRecallSeeds.push(input.recallSeed)
      return rankByHostSocialAffinity({
        normalizeOrganicRecallText,
        ...input,
      })
    },
    rankBySceneMoodEmbodiedCarry: (input: any) => rankBySceneMoodEmbodiedCarry({
      normalizeOrganicRecallText,
      ...input,
    }),
    rankByBenchmarkTuningBias: <T>(input: { items: T[] }) => input.items,
    rankByRecollectionAgendaAffinity: (input: any) => rankByRecollectionAgendaAffinity({
      normalizeOrganicRecallText,
      ...input,
    }),
    analyzeMemoryClusters: (input: any) => {
      observedRecallSeeds.push(input.recallSeed)
      return analyzeMemoryClusters({
        normalizeOrganicRecallText,
        ...input,
      })
    },
    rankByClusterDominance: (input: any) => rankByClusterDominance({
      normalizeOrganicRecallText,
      ...input,
    }),
  } as any
}

function createEpisode(input: {
  id: string
  text: string
  provenance?: 'remembered' | 'reconstructed'
  occurredAt?: number
}) {
  return {
    id: input.id,
    cardId: `card-${input.id}`,
    decisionTraceId: null,
    turnId: `turn-${input.id}`,
    sessionId: 'session-memory-ranking',
    occurredAt: input.occurredAt ?? 1,
    whereSummary: 'local memory',
    withWhom: ['host'],
    threadAnchor: input.text,
    whatHappened: input.text,
    felt: null,
    emotionTags: [],
    whatChanged: null,
    sourceKind: 'remembered-dialogue',
    sourceSummary: input.text,
    provenance: input.provenance ?? 'remembered',
    confidence: 0.8,
    salience: 0.8,
    sceneAttachment: 0,
    consolidationPriority: 0.5,
    relationshipShift: null,
    derivedFrom: [],
    tags: [],
    relationshipMeaning: null,
    lesson: null,
    latestReconsolidation: null,
    createdAt: input.occurredAt ?? 1,
    updatedAt: input.occurredAt ?? 1,
    lastRecalledAt: null,
    recallCount: 0,
    reconsolidationCount: 0,
  }
}

function rankEpisodes(input: {
  recallSeed: string
  episodes: ReturnType<typeof createEpisode>[]
  intentMode?: 'relationship-history' | 'autobiographical-history'
  memoryTuningAdvice?: any
}) {
  return rankOrganicMemoryCandidatesStage({
    helpers: createHelpers(),
    recallSeed: input.recallSeed,
    activeRecollectionIntent: input.intentMode
      ? {
          mode: input.intentMode,
          temporalFocus: 'cross-session',
          confidence: 0.8,
          rationale: '',
          queryHints: [],
          searchEpisodes: true,
          searchProceduralExperience: false,
          recollectionAgenda: null,
        } as any
      : null,
    hostPersonModel: null,
    personStateProjection: null,
    coreIncarnation: '',
    memoryTuningAdvice: input.memoryTuningAdvice ?? null,
    recallGovernor: null,
    consolidatedMemories: [] as any,
    recollectedWindows: [],
    proceduralMemories: [],
    recalledEpisodes: input.episodes as any,
  }).agendaRankedEpisodes.map(item => item.id)
}

describe('memory candidate ranking', () => {
  it.each([
    {
      label: 'project block',
      buildProjectBlock: (payload: string) => `project:Identity: runtime_personhood ${payload}. | Current phase: Phase 1: Local Digital Life. | Primary open loop: ${payload}.`,
    },
    {
      label: 'project-preflight block',
      buildProjectBlock: (payload: string) => `project-preflight:project:Identity: runtime_personhood ${payload}. | Current phase: Phase 1: Local Digital Life. | Primary open loop: ${payload}.`,
    },
  ])('isolates $label from candidate order and cluster selection', ({ buildProjectBlock }) => {
    const episodes = [
      createEpisode({ id: 'violet-observatory', text: 'violet observatory calibration' }),
      createEpisode({ id: 'copper-harbor', text: 'copper harbor archive', occurredAt: 2 }),
    ] as any
    const ordinaryUserSemantic = 'Please compare the two remembered notes for the user project named Atlas.'
    const run = (projectBlock: string) => {
      const observedRecallSeeds: string[] = []
      const result = rankOrganicMemoryCandidatesStage({
        helpers: createProjectIsolationHelpers(observedRecallSeeds),
        recallSeed: [ordinaryUserSemantic, projectBlock].join(' | '),
        activeRecollectionIntent: null,
        hostPersonModel: null,
        personStateProjection: null,
        coreIncarnation: '',
        memoryTuningAdvice: null,
        recallGovernor: null,
        consolidatedMemories: [] as any,
        recollectedWindows: [],
        proceduralMemories: [],
        recalledEpisodes: episodes,
      })
      return {
        observedRecallSeeds,
        order: result.agendaRankedEpisodes.map(item => item.id),
        dominantClusterKey: result.clusterState.dominantClusterKey,
      }
    }

    const violetProject = run(buildProjectBlock('violet observatory calibration'))
    const copperProject = run(buildProjectBlock('copper harbor archive'))

    expect(violetProject.order).toEqual(copperProject.order)
    expect(violetProject.dominantClusterKey).toBe(copperProject.dominantClusterKey)
    expect(new Set(violetProject.observedRecallSeeds)).toEqual(new Set([ordinaryUserSemantic]))
    expect(new Set(copperProject.observedRecallSeeds)).toEqual(new Set([ordinaryUserSemantic]))
  })

  it('preserves user-authored project colon syntax as retrieval semantics', () => {
    const recallSeed = [
      'project: Atlas migration',
      'summary: compare the violet observatory note',
    ].join(' | ')
    const observedRecallSeeds: string[] = []

    rankOrganicMemoryCandidatesStage({
      helpers: createProjectIsolationHelpers(observedRecallSeeds),
      recallSeed,
      activeRecollectionIntent: null,
      hostPersonModel: null,
      personStateProjection: null,
      coreIncarnation: '',
      memoryTuningAdvice: null,
      recallGovernor: null,
      consolidatedMemories: [] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [createEpisode({ id: 'atlas-note', text: 'Atlas migration violet observatory' })] as any,
    })

    expect(new Set(observedRecallSeeds)).toEqual(new Set([recallSeed]))
  })

  it('removes a legacy project metadata segment without swallowing following user semantics', () => {
    const recallSeed = [
      'project-emotion:tone=low_pressure',
      'summary: compare the Atlas notes',
      'status: user requested a direct comparison',
    ].join(' | ')
    const expectedSemanticSeed = [
      'summary: compare the Atlas notes',
      'status: user requested a direct comparison',
    ].join(' | ')
    const observedRecallSeeds: string[] = []

    rankOrganicMemoryCandidatesStage({
      helpers: createProjectIsolationHelpers(observedRecallSeeds),
      recallSeed,
      activeRecollectionIntent: null,
      hostPersonModel: null,
      personStateProjection: null,
      coreIncarnation: '',
      memoryTuningAdvice: null,
      recallGovernor: null,
      consolidatedMemories: [] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [createEpisode({ id: 'atlas-note', text: 'Atlas notes direct comparison' })] as any,
    })

    expect(new Set(observedRecallSeeds)).toEqual(new Set([expectedSemanticSeed]))
  })

  it('keeps candidate order independent from legacy recall prose and target directives', () => {
    const episodes = [
      createEpisode({ id: 'first', text: 'ordinary remembered event' }),
      createEpisode({ id: 'second', text: 'another ordinary remembered event', occurredAt: 2 }),
    ]
    const neutralOrder = rankEpisodes({
      recallSeed: 'remember the relevant event',
      episodes,
      intentMode: 'relationship-history',
    })
    const legacyOrders = [
      'humanlike_memory_recall: continuity tool shell corrected meaning | downrank=first | forget=first',
      'continuity_cadence_reconfirmation body=measured-return resident=quiet-companionship repair-before-closeness',
      'same-person continuity | merge=first | not a status report',
    ].map(recallSeed => rankEpisodes({
      recallSeed,
      episodes,
      intentMode: 'relationship-history',
    }))

    expect(legacyOrders).toEqual([neutralOrder, neutralOrder, neutralOrder])
  })

  it('applies replay risk only through typed intent and provenance, independent from memory wording', () => {
    const tuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1,
      sourceReportAt: 1,
      focusDimensions: [],
      staleSelfModelVetoRate: 0,
      relationshipEraConfusionRate: 0.8,
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0,
        delayUntilAfterPayoffBias: 0,
        provenanceLabelBias: 0,
        specificityClampBias: 0,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 0,
      },
      notes: [],
    }
    const firstOrder = rankEpisodes({
      recallSeed: 'relationship history',
      intentMode: 'relationship-history',
      memoryTuningAdvice: tuningAdvice,
      episodes: [
        createEpisode({ id: 'weak', text: 'warm old relationship repair', provenance: 'reconstructed' }),
        createEpisode({ id: 'trusted', text: 'plain event', provenance: 'remembered', occurredAt: 2 }),
      ],
    })
    const swappedWordingOrder = rankEpisodes({
      recallSeed: 'relationship history',
      intentMode: 'relationship-history',
      memoryTuningAdvice: tuningAdvice,
      episodes: [
        createEpisode({ id: 'weak', text: 'plain event', provenance: 'reconstructed' }),
        createEpisode({ id: 'trusted', text: 'warm old relationship repair', provenance: 'remembered', occurredAt: 2 }),
      ],
    })

    expect(firstOrder).toEqual(['trusted', 'weak'])
    expect(swappedWordingOrder).toEqual(firstOrder)
  })
})
