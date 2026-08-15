import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import {
  resolveMemorySearchPrelude,
  retrieveMemorySearchCandidates,
} from './memory-search-retrieval-operators'
import {
  deriveSceneTriggeredRecollectionIntent,
  deriveSessionMirrorRecollectionIntent,
} from './runtime-organic-memory-search-prelude'

function buildPreludeAccess(overrides: Record<string, unknown> = {}) {
  return {
    getOrganicMemorySnapshot: async () => ({
      hostAttitude: 'warm',
      coreIncarnation: '',
      activeThoughts: [],
    }),
    getLatestRelationshipDynamics: async () => null,
    retrieveMemoryFacts: async () => [],
    recallSubconsciousFragmentsWithGovernor: async () => [],
    recallEpisodicEventsWithGovernor: async () => [],
    buildHostPersonModel: async () => null,
    ...overrides,
  }
}

function buildEpisode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'episode-runtime',
    cardId: 'default',
    decisionTraceId: null,
    turnId: 'turn-runtime',
    sessionId: 'session-runtime',
    sourceKind: 'execution-result',
    provenance: 'remembered',
    occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
    whereSummary: 'terminal diff lane',
    withWhom: ['host'],
    threadAnchor: 'runtime seam',
    whatHappened: 'The prior task reached a verified result.',
    felt: 'focused',
    emotionTags: ['focused'],
    whatChanged: 'A repeatable repair rhythm emerged.',
    relationshipMeaning: null,
    lesson: 'Verify the result before branching.',
    sourceSummary: 'runtime repair',
    confidence: 0.82,
    salience: 0.8,
    sceneAttachment: 0.7,
    consolidationPriority: 0.78,
    relationshipShift: null,
    derivedFrom: [],
    tags: ['runtime', 'verification'],
    createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
    updatedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
    lastRecalledAt: null,
    recallCount: 0,
    reconsolidationCount: 0,
    latestReconsolidation: null,
    ...overrides,
  }
}

describe('memory-search-retrieval-operators', () => {
  it('does not expose a conversation transcript recall provider in the production operator', () => {
    const source = readFileSync(
      new URL('./memory-search-retrieval-operators.ts', import.meta.url),
      'utf8',
    )

    expect(source).not.toContain('recallConversationHistory')
    expect(source).not.toMatch(/\b(?:userText|assistantText)\b/u)
    expect(source).not.toContain('for (const turn of input.recalledConversationHistory')
  })

  it('does not reopen resting session-mirror recollection state', () => {
    expect(deriveSessionMirrorRecollectionIntent({
      afterthoughtState: 'resting',
      certainty: 'approximate',
      confidence: 0.8,
      foreground: 'Return to the remembered runtime seam before branching again.',
      mode: 'execution-procedure',
      placement: 'internal-only',
      surfaceMode: 'internal-only',
      visibility: 'inward',
    })).toBeNull()
  })

  it('carries a ripe session-mirror recollection into typed retrieval planning', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: buildPreludeAccess(),
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: '继续处理刚才的运行时问题。',
      sessionMirrorRecollection: {
        afterthoughtState: 'ripe',
        certainty: 'approximate',
        confidence: 0.8,
        foreground: 'Return to the remembered runtime seam before branching again.',
        mode: 'execution-procedure',
        placement: 'internal-only',
        surfaceMode: 'internal-only',
        visibility: 'inward',
      },
      recallGovernor: {
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: ['Return to the remembered runtime seam before branching again.'],
    }))
    expect(prelude.activeRecollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
    }))
  })

  it('drops legacy structured recall seed lines without generating replacement cues', async () => {
    let plannedInput: any = null
    const legacyPrefix = ['continuity', 'project', 'state'].join('_')
    const prelude = await resolveMemorySearchPrelude({
      access: buildPreludeAccess(),
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return null
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        '继续当前任务。',
        `${legacyPrefix}: label=legacy | summary=old governance carry`,
      ].join('\n'),
      recallGovernor: {
      } as any,
    })

    expect(prelude.recallSeed).toBe('继续当前任务。')
    expect(plannedInput?.heuristicIntent).toBeNull()
    expect(prelude.recollectionIntent).toBeNull()
  })

  it('derives scene intent from typed episodic source and relationship shift', () => {
    const procedureIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed: '继续验证结果。',
      recalledEpisodes: [buildEpisode() as any],
    })
    const relationshipIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed: '继续这次对话。',
      recalledEpisodes: [buildEpisode({
        sourceKind: 'reply',
        relationshipMeaning: 'The host trusted the correction.',
        relationshipShift: {
          closenessDelta: 0,
          trustDelta: 0.2,
          burdenDelta: 0,
          boundaryDelta: 0,
          misreadDelta: 0,
          repairDelta: 0,
          openLoopDelta: 0,
        },
      }) as any],
    })

    expect(procedureIntent).toEqual(expect.objectContaining({
      mode: 'experience-pattern',
      searchProceduralExperience: true,
      rationale: 'Verify the result before branching.',
    }))
    expect(relationshipIntent).toEqual(expect.objectContaining({
      mode: 'relationship-history',
      searchProceduralExperience: false,
      rationale: 'The host trusted the correction.',
    }))
  })

  it('keeps long-term recall owner active when legacy reply governance requests suppression', async () => {
    const retrieveMemoryFacts = vi.fn(async () => [{ id: 'fact-1' }] as any)
    const recallSubconsciousFragmentsWithGovernor = vi.fn(async () => [{ id: 'fragment-1', text: '真实召回片段' }] as any)
    const recallEpisodicEventsWithGovernor = vi.fn(async () => [buildEpisode() as any])
    const planRecollectionIntent = vi.fn(async () => ({
      mode: 'relationship-history' as const,
      temporalFocus: 'cross-session' as const,
      searchEpisodes: true,
      searchProceduralExperience: false,
      queryHints: ['relationship tone'],
      rationale: 'planner-result',
      confidence: 0.88,
    }))

    const prelude = await resolveMemorySearchPrelude({
      access: buildPreludeAccess({
        retrieveMemoryFacts,
        recallSubconsciousFragmentsWithGovernor,
        recallEpisodicEventsWithGovernor,
      }),
      policy: {
        planRecollectionIntent,
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: '当前对话内容。',
      recallGovernor: {
        mode: 'thread',
        recalledFragmentCap: 0.5,
        recalledFragmentSourceBudget: [
          { sourceKind: 'dream-fragment', maxItems: 0 },
          { sourceKind: 'dialogue-turn', maxItems: 2 },
        ],
        carryAsMemory: false,
        rationale: 'thread-bound',
      } as any,
    })

    expect(planRecollectionIntent).toHaveBeenCalledOnce()
    expect(retrieveMemoryFacts).toHaveBeenCalledOnce()
    expect(recallSubconsciousFragmentsWithGovernor).toHaveBeenCalledOnce()
    expect(recallSubconsciousFragmentsWithGovernor).toHaveBeenCalledWith({
      text: '当前对话内容。',
      recalledFragmentCap: undefined,
      recalledFragmentSourceBudget: [
        { sourceKind: 'dialogue-turn', maxItems: 2 },
      ],
    })
    expect(recallEpisodicEventsWithGovernor).toHaveBeenCalledOnce()
    expect(recallEpisodicEventsWithGovernor).toHaveBeenCalledWith(expect.objectContaining({
      recallGovernor: expect.objectContaining({
        mode: 'thread',
        recollectionIntent: expect.objectContaining({
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
        }),
      }),
    }))
    expect(prelude.retrievedFacts).toEqual([expect.objectContaining({ id: 'fact-1' })])
    expect(prelude.recalledFragments).toEqual([expect.objectContaining({ id: 'fragment-1' })])
    expect(prelude.recalledEpisodes).toEqual([expect.objectContaining({ id: 'episode-runtime' })])
    expect(prelude.activeRecollectionIntent).toEqual(expect.objectContaining({
      mode: 'relationship-history',
    }))
  })

  it('runs prelude resolution before explicit candidate retrieval operators', async () => {
    const prelude = await resolveMemorySearchPrelude({
      access: buildPreludeAccess({
        recallEpisodicEventsWithGovernor: async () => [buildEpisode() as any],
      }),
      policy: {
        planRecollectionIntent: vi.fn(async () => ({
          mode: 'execution-procedure' as const,
          temporalFocus: 'experience-matched' as const,
          searchEpisodes: true,
          searchProceduralExperience: true,
          queryHints: ['runtime seam'],
          rationale: 'matched-prior-procedure',
          confidence: 0.86,
        })),
        deriveSceneTriggeredRecollectionIntent: () => null,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: '继续验证 runtime seam',
      recallGovernor: {
      } as any,
    })

    expect(prelude.activeRecollectionIntent).toEqual(expect.objectContaining({
      searchProceduralExperience: true,
    }))

    const recalledConsolidations = vi.fn(async () => [{
      id: 'consolidation-runtime',
      kind: 'autobiographical' as const,
      facet: 'task-era' as const,
      periodKey: 'runtime seam',
      periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
      periodEndedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
      summary: 'The prior period stabilized the runtime seam.',
      lesson: 'Verify before branching.',
      cues: ['runtime seam', 'verification'],
      confidence: 0.8,
      dominantProvenance: 'remembered' as const,
      derivedEventIds: ['episode-runtime'],
      updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
    }])

    const candidates = await retrieveMemorySearchCandidates({
      access: {
        recallMemoryConsolidations: recalledConsolidations,
      },
      recallSeed: prelude.recallSeed,
      recollectionIntent: prelude.activeRecollectionIntent,
      recalledEpisodes: prelude.recalledEpisodes,
    })

    expect(recalledConsolidations).toHaveBeenCalledTimes(1)
    expect(candidates.consolidatedMemories[0]?.id).toBe('consolidation-runtime')
    expect(candidates.proceduralMemories[0]?.label).toContain('runtime seam')
    expect(candidates.recollectedWindows[0]?.summary).toContain('runtime seam')
  })

  it('does not call conversation transcript recall from long-term retrieval operators', async () => {
    const rawUserText = 'RAW_CROSS_SESSION_USER_TRANSCRIPT'
    const rawAssistantText = 'RAW_CROSS_SESSION_ASSISTANT_TRANSCRIPT'
    const recallMemoryConsolidations = vi.fn(async () => [])

    const candidates = await retrieveMemorySearchCandidates({
      access: {
        recallMemoryConsolidations,
      },
      recallSeed: rawUserText,
      recollectionIntent: {
        mode: 'conversation-history',
        temporalFocus: 'cross-session',
        searchEpisodes: false,
        searchProceduralExperience: false,
        queryHints: [rawUserText],
        rationale: 'The host asked about an earlier session.',
        confidence: 0.9,
      } as any,
      recalledEpisodes: [],
    })

    expect(candidates.retrospectiveRecall).toBe(true)
    expect(JSON.stringify(candidates)).not.toContain(rawUserText)
    expect(JSON.stringify(candidates)).not.toContain(rawAssistantText)
  })
})
