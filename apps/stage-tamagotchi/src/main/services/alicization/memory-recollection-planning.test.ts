import type { OrganicMemoryRecollectionPlanningStageInput } from './memory-recollection-planning'

import { describe, expect, it, vi } from 'vitest'

import { resolveOrganicMemoryRecollectionPlanningStage } from './memory-recollection-planning'

function createRecollectionIntent() {
  return {
    mode: 'relationship-history',
    temporalFocus: 'recent-or-mid',
    searchEpisodes: false,
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
  it('does not let a legacy skip flag bypass provider-side recollection planning', async () => {
    const planMemoryRecollection = vi.fn(async () => ({
      selectedConsolidationIds: [],
      selectedWindowIds: ['window-greeting'],
      selectedProceduralIds: [],
      selectedEpisodeIds: [],
      selectedRelationshipLines: [],
      searchTrace: null,
      opening: '',
      certainty: 'approximate' as const,
      rationale: 'The available relationship memory remains eligible for planning.',
      confidence: 0.7,
    }))
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
      skipProviderPlanning: true,
      planMemoryRecollection,
      planRecollectionSpeech,
      planMemoryDeliberation,
      resolveRecollectionPlanSearch: (
        input: Parameters<OrganicMemoryRecollectionPlanningStageInput['resolveRecollectionPlanSearch']>[0],
      ) => input.recollectionPlan,
    } as any)

    expect(planMemoryRecollection).toHaveBeenCalledOnce()
    expect(planRecollectionSpeech).toHaveBeenCalledOnce()
    expect(planMemoryDeliberation).toHaveBeenCalledOnce()
    expect(result.recollectionPlan).toEqual(expect.objectContaining({
      selectedWindowIds: ['window-greeting'],
    }))
    expect(result.recollectionSpeechPlan).toBeNull()
    expect(result.rawMemoryDeliberation).toBeNull()
    expect(result.plannedWindows).toHaveLength(1)
    expect(result.recollectionNarratives).toHaveLength(1)
  })

  it('clears first-pass owner selections when final deliberation explicitly selects no owners', async () => {
    const planMemoryRecollection = vi.fn(async () => ({
      selectedConsolidationIds: ['consolidation-unselected'],
      selectedWindowIds: ['window-unselected'],
      selectedProceduralIds: ['procedure-unselected'],
      selectedEpisodeIds: ['episode-unselected'],
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
      planMemoryRecollection,
      planRecollectionSpeech,
      planMemoryDeliberation,
      resolveRecollectionPlanSearch: input => input.recollectionPlan,
    })

    expect(result.plannedConsolidatedMemories).toEqual([])
    expect(result.plannedWindows).toEqual([])
    expect(result.plannedProceduralMemories).toEqual([])
    expect(result.plannedEpisodes).toEqual([])
    expect(result.recollectionNarratives).toEqual([])
    expect(planRecollectionSpeech).toHaveBeenCalledWith(expect.objectContaining({
      consolidatedMemories: [expect.objectContaining({ id: 'consolidation-unselected' })],
      recollectedWindows: [expect.objectContaining({ id: 'window-unselected' })],
      proceduralMemories: [expect.objectContaining({ id: 'procedure-unselected' })],
      recalledEpisodes: [expect.objectContaining({ id: 'episode-unselected' })],
    }))
    expect(planMemoryDeliberation).toHaveBeenCalledWith(expect.objectContaining({
      consolidatedMemories: [expect.objectContaining({ id: 'consolidation-unselected' })],
      recollectedWindows: [expect.objectContaining({ id: 'window-unselected' })],
      proceduralMemories: [expect.objectContaining({ id: 'procedure-unselected' })],
      recalledEpisodes: [expect.objectContaining({ id: 'episode-unselected' })],
    }))
  })

  it('does not block realtime dialogue on slow provider recollection planning', async () => {
    const planMemoryRecollection = vi.fn(() => new Promise<never>(() => {}))
    const planRecollectionSpeech = vi.fn(async () => null)
    const planMemoryDeliberation = vi.fn(async () => null)
    const startedAt = Date.now()

    const result = await resolveOrganicMemoryRecollectionPlanningStage({
      recallSeed: 'dialogue:你好',
      activeRecollectionIntent: createRecollectionIntent(),
      relationshipLineCandidates: [],
      consolidatedMemories: [],
      recollectedWindows: [{
        id: 'window-greeting',
        label: 'Greeting window',
        summary: 'A deterministic search fallback can still carry the relevant memory window.',
        confidence: 0.8,
        dominantProvenance: 'remembered',
        cues: ['greeting'],
      }] as any,
      proceduralMemories: [],
      recalledEpisodes: [],
      plannerBudgetMs: 1,
      planMemoryRecollection,
      planRecollectionSpeech,
      planMemoryDeliberation,
      resolveRecollectionPlanSearch: input => input.recollectionPlan ?? ({
        selectedConsolidationIds: [],
        selectedWindowIds: ['window-greeting'],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedRelationshipLines: [],
        searchTrace: null,
        opening: '',
        certainty: 'approximate',
        rationale: 'Fallback search selected the strongest available owners.',
        confidence: 0.66,
      } as any),
    })

    expect(Date.now() - startedAt).toBeLessThan(100)
    expect(planMemoryRecollection).toHaveBeenCalledOnce()
    expect(planRecollectionSpeech).not.toHaveBeenCalled()
    expect(planMemoryDeliberation).not.toHaveBeenCalled()
    expect(result.recollectionPlan).toMatchObject({
      selectedWindowIds: ['window-greeting'],
    })
    expect(result.plannedWindows).toEqual([expect.objectContaining({ id: 'window-greeting' })])
  })
})
