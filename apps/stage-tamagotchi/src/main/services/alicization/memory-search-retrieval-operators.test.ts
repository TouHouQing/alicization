import { describe, expect, it, vi } from 'vitest'

import {
  resolveMemorySearchPrelude,
  retrieveMemorySearchCandidates,
} from './memory-search-retrieval-operators'
import { deriveSceneTriggeredRecollectionIntent } from './runtime-organic-memory-search-prelude'

describe('memory-search-retrieval-operators', () => {
  it('derives heuristic recollection intent from session mirror runtime continuity carry', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: {
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
      },
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        'continue the repair without losing the current seam',
        'mirror_runtime_continuity: dominant=dialogue | phase=dialogue | handoff=active-dialogue | from=symbiotic-vision | to=companion-presence | scenario=coding | reason=runtime seam repair after the grounded turn failed',
      ].join('\n'),
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchConversations: false,
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'runtime seam repair after the grounded turn failed',
        'coding',
      ]),
      recollectionAgenda: expect.objectContaining({
        candidateTimeScopes: expect.arrayContaining([
          expect.objectContaining({ scope: 'experience-matched' }),
        ]),
        candidateEraFacets: expect.arrayContaining([
          expect.objectContaining({ facet: 'task-era' }),
        ]),
        candidateProcedureLines: expect.arrayContaining([
          'runtime seam repair after the grounded turn failed',
        ]),
      }),
    }))
    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
    }))
    expect(prelude.activeRecollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      recollectionAgenda: expect.objectContaining({
        candidateProcedureLines: expect.arrayContaining([
          'runtime seam repair after the grounded turn failed',
        ]),
      }),
    }))
  })

  it('runs prelude resolution before explicit candidate retrieval operators', async () => {
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [{
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
          whatHappened: 'We kept returning to the same runtime seam until it held.',
          felt: 'focused',
          emotionTags: ['focused'],
          whatChanged: 'A repeatable repair rhythm emerged.',
          relationshipMeaning: 'Return to the same seam before branching.',
          lesson: 'Return to the seam first.',
          sourceSummary: 'runtime seam repair',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.7,
          consolidationPriority: 0.78,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime seam', 'repair rhythm'],
          createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          updatedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        } as any],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async () => ({
          mode: 'execution-procedure' as const,
          temporalFocus: 'experience-matched' as const,
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam'],
          rationale: 'The current task resembles a remembered procedure.',
          confidence: 0.86,
        })),
        deriveSceneTriggeredRecollectionIntent: () => null,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: '继续按之前那样修 runtime seam',
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
    }))
    expect(prelude.activeRecollectionIntent).toEqual(expect.objectContaining({
      searchProceduralExperience: true,
    }))

    const recalledConversationHistory = vi.fn(async () => [])
    const recalledConsolidations = vi.fn(async () => [{
      id: 'consolidation-runtime',
      kind: 'autobiographical' as const,
      facet: 'task-era' as const,
      periodKey: 'runtime seam',
      periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
      periodEndedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
      summary: 'That period kept returning to the runtime seam until it stabilized.',
      lesson: 'Return to the seam before branching.',
      cues: ['runtime seam', 'repair rhythm'],
      confidence: 0.8,
      dominantProvenance: 'remembered' as const,
      derivedEventIds: ['episode-runtime'],
      updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
    }])

    const candidates = await retrieveMemorySearchCandidates({
      access: {
        recallConversationHistory: recalledConversationHistory,
        recallMemoryConsolidations: recalledConsolidations,
      },
      recallSeed: prelude.recallSeed,
      recollectionIntent: prelude.activeRecollectionIntent,
      recalledEpisodes: prelude.recalledEpisodes,
    })

    expect(recalledConversationHistory).not.toHaveBeenCalled()
    expect(recalledConsolidations).toHaveBeenCalledTimes(1)
    expect(candidates.consolidatedMemories[0]?.id).toBe('consolidation-runtime')
    expect(candidates.proceduralMemories[0]?.label).toContain('runtime seam')
    expect(candidates.recollectedWindows[0]?.summary).toContain('runtime seam')
  })
})
