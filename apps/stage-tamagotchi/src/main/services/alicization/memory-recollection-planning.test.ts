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
      recollectedWindows: [{
        id: 'window-greeting',
        label: 'Greeting window',
        summary: 'An available window that was not selected for recall.',
        confidence: 0.8,
        dominantProvenance: 'remembered',
        cues: ['greeting'],
      }] as any,
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
    expect(result.plannedWindows).toHaveLength(1)
    expect(result.plannedConversationHistory).toHaveLength(1)
    expect(result.recollectionNarratives).toEqual([])
  })

  it('clears first-pass owner selections when final deliberation explicitly selects no owners', async () => {
    const planMemoryRecollection = vi.fn(async () => ({
      selectedConsolidationIds: ['consolidation-unselected'],
      selectedWindowIds: ['window-unselected'],
      selectedProceduralIds: ['procedure-unselected'],
      selectedEpisodeIds: ['episode-unselected'],
      selectedConversationTurnIds: ['turn-unselected'],
      selectedRelationshipLines: [],
      searchTrace: null,
      opening: '',
      certainty: 'firm' as const,
      rationale: 'The first pass selected candidate owners.',
      confidence: 0.8,
    }))
    const planRecollectionSpeech = vi.fn(async () => null)
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedEraIds: [],
      selectedConsolidationIds: [],
      selectedWindowIds: [],
      selectedProcedureIds: [],
      selectedEpisodeIds: [],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: [],
      selectedEras: [],
      selectedPeriods: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [],
      selectedChains: [],
      surfacePolicy: 'internal-only' as const,
      confidence: 0.8,
      whyNow: 'No retrieved owner survived final deliberation.',
      inwardLine: '',
      visibleLine: null,
    }))

    const result = await resolveOrganicMemoryRecollectionPlanningStage({
      recallSeed: 'relationship question',
      activeRecollectionIntent: createRecollectionIntent(),
      relationshipLineCandidates: [],
      consolidatedMemories: [{
        id: 'consolidation-unselected',
        summary: 'An unselected relationship period.',
      }] as any,
      recollectedWindows: [{
        id: 'window-unselected',
        label: 'Unselected window',
        summary: 'An unselected recollection window.',
        confidence: 0.8,
        dominantProvenance: 'remembered',
        cues: ['unselected'],
      }] as any,
      proceduralMemories: [{
        id: 'procedure-unselected',
        label: 'Unselected procedure',
        approach: 'Do not carry this procedure.',
      }] as any,
      recalledEpisodes: [{
        id: 'episode-unselected',
        whatHappened: 'An unselected episode.',
      }] as any,
      recalledConversationHistory: [{
        turnId: 'turn-unselected',
        userText: 'An unselected user turn.',
        assistantText: 'An unselected assistant turn.',
      }] as any,
      planMemoryRecollection,
      planRecollectionSpeech,
      planMemoryDeliberation,
      resolveRecollectionPlanSearch: input => input.recollectionPlan,
    })

    expect(result.plannedConsolidatedMemories).toEqual([])
    expect(result.plannedWindows).toEqual([])
    expect(result.plannedProceduralMemories).toEqual([])
    expect(result.plannedEpisodes).toEqual([])
    expect(result.plannedConversationHistory).toEqual([])
    expect(result.recollectionNarratives).toEqual([])
    expect(planRecollectionSpeech).toHaveBeenCalledWith(expect.objectContaining({
      consolidatedMemories: [expect.objectContaining({ id: 'consolidation-unselected' })],
      recollectedWindows: [expect.objectContaining({ id: 'window-unselected' })],
      proceduralMemories: [expect.objectContaining({ id: 'procedure-unselected' })],
      recalledEpisodes: [expect.objectContaining({ id: 'episode-unselected' })],
      recalledConversationHistory: [expect.objectContaining({ turnId: 'turn-unselected' })],
    }))
    expect(planMemoryDeliberation).toHaveBeenCalledWith(expect.objectContaining({
      consolidatedMemories: [expect.objectContaining({ id: 'consolidation-unselected' })],
      recollectedWindows: [expect.objectContaining({ id: 'window-unselected' })],
      proceduralMemories: [expect.objectContaining({ id: 'procedure-unselected' })],
      recalledEpisodes: [expect.objectContaining({ id: 'episode-unselected' })],
      recalledConversationHistory: [expect.objectContaining({ turnId: 'turn-unselected' })],
    }))
  })
})
