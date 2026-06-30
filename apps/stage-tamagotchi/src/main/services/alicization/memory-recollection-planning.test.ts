import { describe, expect, it, vi } from 'vitest'

import { resolveOrganicMemoryRecollectionPlanningStage } from './memory-recollection-planning'

function createRecollectionIntent() {
  return {
    mode: 'relationship-history',
    temporalFocus: 'recent-or-mid',
    searchEpisodes: false,
    searchConversations: true,
    searchProceduralExperience: false,
    queryHints: ['你好'],
    rationale: 'A greeting may carry relationship presence.',
    confidence: 0.7,
    recollectionAgenda: {
      whyRecallNow: 'ordinary greeting presence',
      goalSimilarity: null,
      relationshipNeed: null,
      affectivePull: null,
      sceneFamiliarity: null,
      candidateTimeScopes: [],
      candidateEraFacets: [],
      candidateProcedureLines: [],
      uncertaintyTolerance: 'high',
    },
  } as any
}

describe('memory recollection planning stage', () => {
  it('skips provider-side recollection planning when the turn is an ordinary greeting fast lane', async () => {
    const planMemoryRecollection = vi.fn(async () => null)
    const planRecollectionSpeech = vi.fn(async () => null)
    const planMemoryDeliberation = vi.fn(async () => null)

    const result = await resolveOrganicMemoryRecollectionPlanningStage({
      recallSeed: 'dialogue:你好',
      activeRecollectionIntent: createRecollectionIntent(),
      relationshipLineCandidates: [],
      consolidatedMemories: [],
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      recalledConversationHistory: [
        {
          turnId: 'turn-1',
          userText: '你好',
          assistantText: '在。',
          createdAt: 1,
          provenance: 'conversation-history',
        } as any,
      ],
      skipProviderPlanning: true,
      planMemoryRecollection,
      planRecollectionSpeech,
      planMemoryDeliberation,
      resolveRecollectionPlanSearch: input => input.recollectionPlan,
    })

    expect(planMemoryRecollection).not.toHaveBeenCalled()
    expect(planRecollectionSpeech).not.toHaveBeenCalled()
    expect(planMemoryDeliberation).not.toHaveBeenCalled()
    expect(result.recollectionPlan).toBeNull()
    expect(result.recollectionSpeechPlan).toBeNull()
    expect(result.rawMemoryDeliberation).toBeNull()
    expect(result.plannedConversationHistory).toHaveLength(1)
  })
})
