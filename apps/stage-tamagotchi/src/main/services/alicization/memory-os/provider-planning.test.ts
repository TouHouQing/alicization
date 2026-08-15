import type { AlicizationMemoryPlanningCandidateIdSet } from './provider-planning'

import { describe, expect, it, vi } from 'vitest'

import { resolveRecollectionPlanSearch } from './planning'
import {
  generateMemoryDeliberationWithGateway,
  generateMemoryRecollectionIntentWithGateway,
  generateMemoryRecollectionPlanWithGateway,
  generateMemoryRecollectionSpeechPlanWithGateway,
  parseMemoryDeliberationPayload,
  parseMemoryRecollectionIntentPayload,
  parseMemoryRecollectionPlanPayload,
  parseMemoryRecollectionSpeechPlanPayload,
} from './provider-planning'

function providerFactType(raw: string) {
  try {
    return (JSON.parse(raw) as { type?: string }).type ?? ''
  }
  catch {
    return ''
  }
}

function validRecollectionIntentPayload() {
  return {
    mode: 'relationship-history',
    temporalFocus: 'cross-session',
    searchEpisodes: true,
    searchProceduralExperience: false,
    queryHints: ['remembered relationship line'],
    rationale: 'The current turn is connected to an established relationship memory.',
    confidence: 0.76,
    recollectionAgenda: {
      whyRecallNow: 'The current turn reopens a previously established relationship concern.',
      goalSimilarity: 0.62,
      relationshipNeed: 0.74,
      affectivePull: 0.68,
      sceneFamiliarity: 0.42,
      candidateTimeScopes: [],
      candidateEraFacets: [],
      candidateProcedureLines: [],
      uncertaintyTolerance: 'medium',
    },
  }
}

function validRecollectionPlanPayload() {
  return {
    selectedConsolidationIds: ['con-1'],
    selectedWindowIds: [],
    selectedProceduralIds: [],
    selectedEpisodeIds: [],
    selectedRelationshipLines: ['A remembered relationship concern remains relevant.'],
    searchTrace: {
      firstHop: {
        focus: 'relationship-line',
        summary: 'Begin with the confirmed relationship memory.',
        targetIds: ['con-1'],
      },
      secondHop: {
        action: 'hold',
        evidenceGap: 'none',
        summary: 'The confirmed memory is sufficient for this turn.',
        targetIds: ['con-1'],
      },
      thirdHop: {
        ambiguityPosture: 'settled',
        summary: 'The selected evidence is internally consistent.',
      },
    },
    certainty: 'approximate',
    rationale: 'The confirmed relationship memory best matches the current turn.',
    confidence: 0.74,
  }
}

function validRecollectionSpeechPlanPayload() {
  return {
    shouldSurface: true,
    surfaceMode: 'relationship-continuity',
    placement: 'inside-payoff',
    certainty: 'approximate',
    rationale: 'The memory can inform the answer without becoming a drafted reply.',
    confidence: 0.72,
  }
}

function validMemoryDeliberationPayload() {
  return {
    shouldRecall: true,
    selectedEraIds: ['con-1'],
    selectedConsolidationIds: ['con-1'],
    selectedWindowIds: [],
    selectedProcedureIds: [],
    selectedEpisodeIds: [],
    selectedRelationshipLines: ['A remembered relationship concern remains relevant.'],
    selectedBundles: [],
    selectedChains: [],
    conflictSeverity: 'none',
    conflictVariants: [],
    stableCore: ['The relationship memory is confirmed.'],
    unsafeDetails: [],
    surfacePolicy: 'relationship-continuity',
    confidence: 0.76,
    whyNow: 'The current turn reopens the confirmed relationship concern.',
  }
}

function testCandidateIds(): AlicizationMemoryPlanningCandidateIdSet {
  const consolidationIds = new Set(['con-1'])
  const windowIds = new Set(['window-1'])
  const procedureIds = new Set(['procedure-1'])
  const episodeIds = new Set(['episode-1'])
  const eraIds = new Set([...consolidationIds, ...windowIds])
  return {
    allIds: new Set([
      ...eraIds,
      ...procedureIds,
      ...episodeIds,
    ]),
    consolidationIds,
    episodeIds,
    eraIds,
    procedureIds,
    windowIds,
  }
}

describe('memory provider planning', () => {
  it('passes the shared digital-life runtime surface through every memory planning gateway call', async () => {
    const gatewayInputs: any[] = []
    const digitalLifeRuntimeSurface = {
      version: 'digital-life-runtime-surface-v1',
      memory: {
        emotionalKernel: {
          version: 'emotional-kernel-v1',
          dominantEmotion: 'gentle-recollection',
          valence: 0.32,
          arousal: 0.24,
          guardedness: 0.18,
          closenessDrive: 0.41,
          repairNeed: 0.12,
          initiativePressure: 0.33,
          memoryRecallMode: 'relationship-continuity',
          initiativeMode: 'quietly-reopen',
          embodimentTone: 'soft-return',
          why: 'Memory planning should reopen the continuity state instead of becoming detached retrieval.',
          reasonTags: ['memory-planning', 'same-emotional-kernel'],
        },
      },
    } as any
    const generateMainGatewayText = vi.fn(async (input: any) => {
      gatewayInputs.push(input)
      if (providerFactType(input.system) === 'alicization-memory-recollection-intent-context') {
        return JSON.stringify({
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchProceduralExperience: false,
          queryHints: ['continuity state'],
          rationale: 'The emotional kernel asks memory to reopen the relationship line.',
          confidence: 0.74,
          recollectionAgenda: {
            whyRecallNow: 'The same emotional kernel is active.',
            goalSimilarity: 0.62,
            relationshipNeed: 0.7,
            affectivePull: 0.68,
            sceneFamiliarity: 0.3,
            candidateTimeScopes: [{ scope: 'cross-session', weight: 0.7, rationale: 'same line' }],
            candidateEraFacets: [{ facet: 'relationship-era', weight: 0.7, rationale: 'same line' }],
            candidateProcedureLines: ['reopen gently'],
            uncertaintyTolerance: 'medium',
          },
        })
      }
      if (providerFactType(input.system) === 'alicization-memory-recollection-plan-context') {
        return JSON.stringify({
          selectedConsolidationIds: ['con-1'],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [],
          selectedRelationshipLines: ['Return through the same emotional line.'],
          searchTrace: {
            firstHop: { focus: 'relationship-line', summary: 'Start from the same emotional line.', targetIds: ['con-1'] },
            secondHop: { action: 'hold', evidenceGap: 'none', summary: 'The line is stable enough.', targetIds: ['con-1'] },
            thirdHop: { ambiguityPosture: 'settled', summary: 'The remembered line can shape this turn.' },
          },
          certainty: 'approximate',
          rationale: 'Keep memory planning emotionally continuous.',
          confidence: 0.73,
        })
      }
      if (providerFactType(input.system) === 'alicization-memory-recollection-speech-plan-context') {
        return JSON.stringify({
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          rationale: 'Surface the same-line memory gently.',
          confidence: 0.72,
        })
      }
      return JSON.stringify({
        shouldRecall: true,
        selectedEraIds: ['era-1'],
        selectedConsolidationIds: ['con-1'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedRelationshipLines: ['The same emotional line should shape the reply.'],
        selectedBundles: [],
        selectedChains: [],
        conflictSeverity: 'none',
        conflictVariants: [],
        stableCore: ['The remembered line is stable enough.'],
        unsafeDetails: [],
        surfacePolicy: 'relationship-continuity',
        confidence: 0.76,
        whyNow: 'The emotional kernel makes this recall relevant now.',
      })
    })
    const consolidatedMemories = [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'We return gently.', lesson: 'Stay on the same line.', confidence: 0.8, cues: ['same-line'] }] as any
    const recollectionIntent = await generateMemoryRecollectionIntentWithGateway({
      recallSeed: 'same emotional-memory line',
      heuristicIntent: null as any,
      recallGovernor: null,
      hostAttitude: 'warm',
      activeThoughts: [{ text: 'keep continuity state' }],
      hostPersonModel: null,
      relationshipDynamics: null,
      generateMainGatewayText,
      cardId: 'default',
      digitalLifeRuntimeSurface,
    } as any)
    const recollectionPlan = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'same emotional-memory line',
      recollectionIntent: recollectionIntent!,
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
      digitalLifeRuntimeSurface,
    } as any)
    await generateMemoryRecollectionSpeechPlanWithGateway({
      recallSeed: 'same emotional-memory line',
      recollectionIntent: recollectionIntent!,
      recollectionPlan,
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
      digitalLifeRuntimeSurface,
    } as any)
    await generateMemoryDeliberationWithGateway({
      recallSeed: 'same emotional-memory line',
      recollectionIntent: recollectionIntent!,
      recollectionPlan,
      recollectionSpeechPlan: null,
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
      digitalLifeRuntimeSurface,
    } as any)

    expect(gatewayInputs).toHaveLength(4)
    expect(gatewayInputs.every(input => input.digitalLifeRuntimeSurface === digitalLifeRuntimeSurface)).toBe(true)
    expect(gatewayInputs.map(input => providerFactType(input.system))).toEqual([
      'alicization-memory-recollection-intent-context',
      'alicization-memory-recollection-plan-context',
      'alicization-memory-recollection-speech-plan-context',
      'alicization-memory-deliberation-context',
    ])
    expect(gatewayInputs.map(input => providerFactType(input.user))).toEqual([
      'alicization-memory-recollection-intent-request',
      'alicization-memory-recollection-plan-request',
      'alicization-memory-recollection-speech-plan-request',
      'alicization-memory-deliberation-request',
    ])
    expect(gatewayInputs.map(input => input.responseFormat?.json_schema?.name)).toEqual([
      'alicization_memory_recollection_intent',
      'alicization_memory_recollection_plan',
      'alicization_memory_recollection_speech_plan',
      'alicization_memory_deliberation',
    ])
  })

  it('keeps memory planning prompts task-scoped without injecting fixed owner or governance prose', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      if (providerFactType(system) === 'alicization-memory-recollection-intent-context') {
        return JSON.stringify({
          mode: 'autobiographical-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchProceduralExperience: false,
          queryHints: ['continuity'],
          rationale: 'Need continuity-bearing recall for this turn.',
          confidence: 0.7,
          recollectionAgenda: {
            whyRecallNow: 'An unfinished bond line is resurfacing.',
            goalSimilarity: 0.72,
            relationshipNeed: 0.78,
            affectivePull: 0.64,
            sceneFamiliarity: 0.3,
            candidateTimeScopes: [{ scope: 'cross-session', weight: 0.8, rationale: 'continuity' }],
            candidateEraFacets: [{ facet: 'relationship-era', weight: 0.74, rationale: 'bond line' }],
            candidateProcedureLines: ['return to unfinished seam'],
            uncertaintyTolerance: 'medium',
          },
        })
      }
      if (providerFactType(system) === 'alicization-memory-recollection-plan-context') {
        return JSON.stringify({
          selectedConsolidationIds: ['con-1'],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [],
          selectedRelationshipLines: ['We tend to return gently to unfinished seams.'],
          searchTrace: {
            firstHop: { focus: 'relationship-line', summary: 'Start from bond continuity.', targetIds: ['con-1'] },
            secondHop: { action: 'hold', evidenceGap: 'none', summary: 'The line is already stable enough.', targetIds: ['con-1'] },
            thirdHop: { ambiguityPosture: 'settled', summary: 'The remembered line is stable enough to carry.' },
          },
          certainty: 'approximate',
          rationale: 'Foreground the stable bond line.',
          confidence: 0.71,
        })
      }
      if (providerFactType(system) === 'alicization-memory-recollection-speech-plan-context') {
        return JSON.stringify({
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          rationale: 'Visible continuity helps the payoff.',
          confidence: 0.72,
        })
      }
      return JSON.stringify({
        shouldRecall: true,
        selectedEraIds: ['era-1'],
        selectedConsolidationIds: ['con-1'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedRelationshipLines: ['Keep unfinished returns part of the bond line.'],
        selectedBundles: [],
        selectedChains: [],
        conflictSeverity: 'none',
        conflictVariants: [],
        stableCore: ['We do have a continuity-bearing return pattern.'],
        unsafeDetails: [],
        surfacePolicy: 'relationship-continuity',
        confidence: 0.76,
        whyNow: 'The turn asks for lived continuity.',
      })
    })

    const recollectionIntent = await generateMemoryRecollectionIntentWithGateway({
      recallSeed: 'unfinished seam between us',
      heuristicIntent: null as any,
      recallGovernor: null,
      hostAttitude: 'warm',
      activeThoughts: [{ text: 'stay coherent' }],
      hostPersonModel: null,
      relationshipDynamics: null,
      generateMainGatewayText,
      cardId: 'default',
    })
    const legacyRawTranscriptInput = {
      recalledConversationHistory: [{
        turnId: 'turn-raw-sentinel',
        userText: 'provider raw user transcript sentinel',
        assistantText: 'provider raw assistant transcript sentinel',
      }],
    }
    const recollectionPlan = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'unfinished seam between us',
      recollectionIntent: recollectionIntent!,
      consolidatedMemories: [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'We learned to return gently.', lesson: 'Keep continuity.', confidence: 0.8, cues: ['continuity'] }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
      ...legacyRawTranscriptInput,
    })
    await generateMemoryRecollectionSpeechPlanWithGateway({
      recallSeed: 'unfinished seam between us',
      recollectionIntent: recollectionIntent!,
      recollectionPlan,
      consolidatedMemories: [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'We learned to return gently.', lesson: 'Keep continuity.', confidence: 0.8, cues: ['continuity'] }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
      ...legacyRawTranscriptInput,
    })
    await generateMemoryDeliberationWithGateway({
      recallSeed: 'unfinished seam between us',
      recollectionIntent: recollectionIntent!,
      recollectionPlan,
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'inside-payoff',
        certainty: 'approximate',
        rationale: 'support payoff',
        confidence: 0.7,
      },
      consolidatedMemories: [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'We learned to return gently.', lesson: 'Keep continuity.', confidence: 0.8, cues: ['continuity'] }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
      ...legacyRawTranscriptInput,
    })

    expect(systems).toHaveLength(4)
    expect(systems.every(system => providerFactType(system).endsWith('-context'))).toBe(true)
    expect(systems.join('\n')).not.toMatch(/provider raw (?:user|assistant) transcript sentinel/)
    expect(systems.join('\n')).not.toMatch(/recalledConversationHistory|userText|assistantText|rawTranscript/)
  })

  it('keeps continuation seed inside typed recollection and deliberation context', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      if (providerFactType(system) === 'alicization-memory-recollection-plan-context') {
        return JSON.stringify({
          selectedConsolidationIds: ['con-1'],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [],
          selectedRelationshipLines: ['Stay on the same line gently.'],
          searchTrace: {
            firstHop: { focus: 'relationship-line', summary: 'Return to the same line.', targetIds: ['con-1'] },
            secondHop: { action: 'hold', evidenceGap: 'none', summary: 'The line should reopen softly.', targetIds: ['con-1'] },
            thirdHop: { ambiguityPosture: 'settled', summary: 'The line is clear enough to re-enter.' },
          },
          certainty: 'approximate',
          rationale: 'Use the continuity arc to shape the recollection opening.',
          confidence: 0.73,
        })
      }
      return JSON.stringify({
        shouldRecall: true,
        selectedEraIds: ['era-1'],
        selectedConsolidationIds: ['con-1'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedRelationshipLines: ['The return should stay gentle.'],
        selectedBundles: [],
        selectedChains: [],
        conflictSeverity: 'none',
        conflictVariants: [],
        stableCore: ['The line is already alive.'],
        unsafeDetails: [],
        surfacePolicy: 'internal-only',
        confidence: 0.76,
        whyNow: 'The line should reopen softly.',
      })
    })

    await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'mirror_runtime_continuity: stage=gentle-reopen loop=dialogue handoff=active-dialogue',
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchProceduralExperience: false,
        queryHints: ['gentle-reopen'],
        rationale: 'Return to the same line gently.',
        confidence: 0.78,
      } as any,
      consolidatedMemories: [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'A line we keep returning to gently.', lesson: 'Do not restart it abruptly.', confidence: 0.8, cues: ['gentle'] }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    await generateMemoryDeliberationWithGateway({
      recallSeed: 'mirror_runtime_continuity: stage=gentle-reopen loop=dialogue handoff=active-dialogue',
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchProceduralExperience: false,
        queryHints: ['gentle-reopen'],
        rationale: 'Return to the same line gently.',
        confidence: 0.78,
      } as any,
      recollectionPlan: {
        selectedConsolidationIds: ['con-1'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedRelationshipLines: ['Stay on the same line gently.'],
        searchTrace: {
          firstHop: { focus: 'relationship-line', summary: 'Return to the same line.', targetIds: ['con-1'] },
          secondHop: { action: 'hold', evidenceGap: 'none', summary: 'The line should reopen softly.', targetIds: ['con-1'] },
          thirdHop: { ambiguityPosture: 'settled', summary: 'The line is clear enough to re-enter.' },
        },
        opening: 'I can re-enter that same line softly before widening.',
        certainty: 'approximate',
        rationale: 'Use the continuity arc to shape the recollection opening.',
        confidence: 0.73,
      } as any,
      recollectionSpeechPlan: null,
      consolidatedMemories: [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'A line we keep returning to gently.', lesson: 'Do not restart it abruptly.', confidence: 0.8, cues: ['gentle'] }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    expect(systems.map(system => (JSON.parse(system) as any).data.recallSeed)).toEqual([
      'mirror_runtime_continuity: stage=gentle-reopen loop=dialogue handoff=active-dialogue',
      'mirror_runtime_continuity: stage=gentle-reopen loop=dialogue handoff=active-dialogue',
    ])
    expect(systems.join('\n')).not.toContain('Alicization memory planning owner boundary.')
    expect(systems.some(system => system.includes('softly re-enters the continuity state'))).toBe(false)
    expect(systems.some(system => system.includes('visible_wording_drafts=false'))).toBe(false)
  })

  it('rejects recollection plans with missing explanatory facts instead of filling fallback prose', async () => {
    const generateMainGatewayText = vi.fn(async () => {
      const payload = validRecollectionPlanPayload()
      payload.rationale = ''
      payload.searchTrace.firstHop.summary = ''
      payload.searchTrace.secondHop.summary = ''
      payload.searchTrace.thirdHop.summary = ''
      return JSON.stringify(payload)
    })

    const result = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'relationship concern',
      recollectionIntent: validRecollectionIntentPayload() as any,
      consolidatedMemories: [{
        id: 'con-1',
        kind: 'daily',
        periodKey: 'p1',
        summary: 'A confirmed relationship memory.',
        lesson: null,
        confidence: 0.8,
        cues: ['relationship'],
      }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    expect(result).toBeNull()
  })

  it('rejects recollection speech plans with missing rationale instead of filling fallback prose', async () => {
    const generateMainGatewayText = vi.fn(async () => {
      const payload = validRecollectionSpeechPlanPayload()
      payload.rationale = ''
      return JSON.stringify(payload)
    })

    const result = await generateMemoryRecollectionSpeechPlanWithGateway({
      recallSeed: 'relationship concern',
      recollectionIntent: validRecollectionIntentPayload() as any,
      recollectionPlan: validRecollectionPlanPayload() as any,
      consolidatedMemories: [{
        id: 'con-1',
        kind: 'daily',
        periodKey: 'p1',
        summary: 'A confirmed relationship memory.',
        lesson: null,
        confidence: 0.8,
        cues: ['relationship'],
      }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    expect(result).toBeNull()
  })

  it.each([
    [
      'recollection intent',
      () => {
        const payload = validRecollectionIntentPayload()
        payload.confidence = 1.2
        return parseMemoryRecollectionIntentPayload(JSON.stringify(payload))
      },
    ],
    [
      'recollection plan',
      () => {
        const payload = validRecollectionPlanPayload()
        payload.confidence = 1.2
        return parseMemoryRecollectionPlanPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
    [
      'recollection speech plan',
      () => {
        const payload = validRecollectionSpeechPlanPayload()
        payload.confidence = 1.2
        return parseMemoryRecollectionSpeechPlanPayload(JSON.stringify(payload))
      },
    ],
    [
      'memory deliberation',
      () => {
        const payload = validMemoryDeliberationPayload()
        payload.confidence = 1.2
        return parseMemoryDeliberationPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
  ])('rejects out-of-range confidence in %s instead of clamping it', (_name, parse) => {
    expect(parse()).toBeNull()
  })

  it.each([
    [
      'recollection intent searchConversations',
      () => {
        const payload: any = validRecollectionIntentPayload()
        payload.searchConversations = true
        return parseMemoryRecollectionIntentPayload(JSON.stringify(payload))
      },
    ],
    [
      'recollection plan selectedConversationTurnIds',
      () => {
        const payload: any = validRecollectionPlanPayload()
        payload.selectedConversationTurnIds = ['turn-raw']
        return parseMemoryRecollectionPlanPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
    [
      'memory deliberation selectedConversationTurnIds',
      () => {
        const payload: any = validMemoryDeliberationPayload()
        payload.selectedConversationTurnIds = ['turn-raw']
        return parseMemoryDeliberationPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
    [
      'memory deliberation bundle conversationTurnId',
      () => {
        const payload: any = validMemoryDeliberationPayload()
        payload.selectedBundles = [{
          id: 'bundle-legacy-turn',
          summary: 'Legacy transcript bundle.',
          rationale: 'This field was removed with raw transcript planning.',
          confidence: 0.8,
          periodId: null,
          episodeId: null,
          procedureId: null,
          relationshipLine: null,
          conversationTurnId: 'turn-raw',
        }]
        return parseMemoryDeliberationPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
    [
      'recollection speech plan searchConversations',
      () => {
        const payload: any = validRecollectionSpeechPlanPayload()
        payload.searchConversations = true
        return parseMemoryRecollectionSpeechPlanPayload(JSON.stringify(payload))
      },
    ],
  ])('rejects deleted transcript field in %s', (_name, parse) => {
    expect(parse()).toBeNull()
  })

  it.each([
    [
      'recollection intent',
      () => {
        const payload: any = validRecollectionIntentPayload()
        payload.unexpectedField = true
        return parseMemoryRecollectionIntentPayload(JSON.stringify(payload))
      },
    ],
    [
      'recollection plan',
      () => {
        const payload: any = validRecollectionPlanPayload()
        payload.unexpectedField = true
        return parseMemoryRecollectionPlanPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
    [
      'memory deliberation',
      () => {
        const payload: any = validMemoryDeliberationPayload()
        payload.unexpectedField = true
        return parseMemoryDeliberationPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
    [
      'recollection speech plan',
      () => {
        const payload: any = validRecollectionSpeechPlanPayload()
        payload.unexpectedField = true
        return parseMemoryRecollectionSpeechPlanPayload(JSON.stringify(payload))
      },
    ],
  ])('rejects unknown additional properties in %s', (_name, parse) => {
    expect(parse()).toBeNull()
  })

  it.each([
    [
      'conversation-history intent mode',
      () => {
        const payload: any = validRecollectionIntentPayload()
        payload.mode = 'conversation-history'
        return parseMemoryRecollectionIntentPayload(JSON.stringify(payload))
      },
    ],
    [
      'conversation-turn plan focus',
      () => {
        const payload: any = validRecollectionPlanPayload()
        payload.searchTrace.firstHop.focus = 'conversation-turn'
        return parseMemoryRecollectionPlanPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
    [
      'expand-conversation plan action',
      () => {
        const payload: any = validRecollectionPlanPayload()
        payload.searchTrace.secondHop.action = 'expand-conversation'
        return parseMemoryRecollectionPlanPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
    [
      'need-conversation-evidence plan evidence gap',
      () => {
        const payload: any = validRecollectionPlanPayload()
        payload.searchTrace.secondHop.evidenceGap = 'need-conversation-evidence'
        return parseMemoryRecollectionPlanPayload(JSON.stringify(payload), testCandidateIds())
      },
    ],
  ])('rejects deleted transcript enum in %s', (_name, parse) => {
    expect(parse()).toBeNull()
  })

  it('rejects unknown additional properties in nested planning objects', () => {
    const intentPayload: any = validRecollectionIntentPayload()
    intentPayload.recollectionAgenda.unexpectedField = true
    const planPayload: any = validRecollectionPlanPayload()
    planPayload.searchTrace.firstHop.unexpectedField = true

    expect(parseMemoryRecollectionIntentPayload(JSON.stringify(intentPayload))).toBeNull()
    expect(parseMemoryRecollectionPlanPayload(JSON.stringify(planPayload), testCandidateIds())).toBeNull()
  })

  it.each([
    [
      'candidateTimeScopes',
      () => ({
        scope: 'cross-session',
        weight: 0.5,
        rationale: 'The hidden fifth item must still be validated.',
        unexpectedField: true,
      }),
    ],
    [
      'candidateEraFacets',
      () => ({
        facet: 'relationship-era',
        weight: 0.5,
        rationale: 'The hidden fifth item must still be validated.',
        unexpectedField: true,
      }),
    ],
  ])('rejects an unknown property in the fifth recollection agenda %s item', (key, fifthItem) => {
    const payload: any = validRecollectionIntentPayload()
    const validItem = key === 'candidateTimeScopes'
      ? {
          scope: 'cross-session',
          weight: 0.5,
          rationale: 'A valid time scope.',
        }
      : {
          facet: 'relationship-era',
          weight: 0.5,
          rationale: 'A valid era facet.',
        }
    payload.recollectionAgenda[key] = [
      ...Array.from({ length: 4 }, () => ({ ...validItem })),
      fifthItem(),
    ]

    expect(parseMemoryRecollectionIntentPayload(JSON.stringify(payload))).toBeNull()
  })

  it.each([
    [
      'five otherwise valid strings',
      [
        'procedure line 1',
        'procedure line 2',
        'procedure line 3',
        'procedure line 4',
        'procedure line 5',
      ],
    ],
    [
      'a legacy transcript object in the fifth position',
      [
        'procedure line 1',
        'procedure line 2',
        'procedure line 3',
        'procedure line 4',
        {
          kind: 'conversation-turn',
          userText: 'raw transcript must not hide after the procedure line budget',
        },
      ],
    ],
    [
      'an invalid item inside the procedure line budget',
      [
        'procedure line 1',
        {
          kind: 'conversation',
          assistantText: 'raw transcript objects are never valid procedure lines',
        },
      ],
    ],
  ])('rejects candidateProcedureLines containing %s', (_name, candidateProcedureLines) => {
    const payload: any = validRecollectionIntentPayload()
    payload.recollectionAgenda.candidateProcedureLines = candidateProcedureLines

    expect(parseMemoryRecollectionIntentPayload(JSON.stringify(payload))).toBeNull()
  })

  it('rejects internally contradictory intent and deliberation policies', () => {
    const intentPayload = validRecollectionIntentPayload()
    intentPayload.mode = 'none'
    intentPayload.searchEpisodes = true
    intentPayload.searchProceduralExperience = false

    const deliberationPayload = validMemoryDeliberationPayload()
    deliberationPayload.shouldRecall = false
    deliberationPayload.surfacePolicy = 'relationship-continuity'

    expect(parseMemoryRecollectionIntentPayload(JSON.stringify(intentPayload))).toBeNull()
    expect(parseMemoryDeliberationPayload(JSON.stringify(deliberationPayload), testCandidateIds())).toBeNull()
  })

  it.each([
    ['numeric string', '0.8'],
    ['null', null],
    ['boolean', true],
    ['negative number', -0.1],
  ])('rejects %s confidence instead of coercing it', (_name, confidence) => {
    const payload: any = validRecollectionIntentPayload()
    payload.confidence = confidence

    expect(parseMemoryRecollectionIntentPayload(JSON.stringify(payload))).toBeNull()
  })

  it('rejects invalid agenda weights instead of coercing them', () => {
    const payload: any = validRecollectionIntentPayload()
    payload.recollectionAgenda.candidateTimeScopes = [{
      scope: 'cross-session',
      weight: '0.8',
      rationale: null,
    }]

    expect(parseMemoryRecollectionIntentPayload(JSON.stringify(payload))).toBeNull()
  })

  it('drops malformed deliberation items instead of inventing ids, rationale, provenance, or confidence', () => {
    const payload: any = validMemoryDeliberationPayload()
    payload.conflictVariants = [{
      summary: 'An ungrounded conflict variant.',
    }]
    payload.selectedBundles = [{
      summary: 'An ungrounded bundle.',
    }, {
      id: 'bundle-invalid-confidence',
      summary: 'A bundle with invalid confidence.',
      rationale: 'It should be rejected.',
      confidence: 1.4,
      periodId: null,
      episodeId: null,
      procedureId: null,
      relationshipLine: null,
    }]
    payload.selectedChains = [{
      kind: 'period-event-lesson-posture',
      summary: 'An ungrounded chain.',
    }]

    const result = parseMemoryDeliberationPayload(JSON.stringify(payload), testCandidateIds())

    expect(result?.conflictVariants).toEqual([])
    expect(result?.selectedBundles).toEqual([])
    expect(result?.selectedChains).toEqual([])
  })

  it('keeps plan and deliberation ids inside the candidate set offered to the Provider', async () => {
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      if (providerFactType(system) === 'alicization-memory-recollection-plan-context') {
        const payload: any = validRecollectionPlanPayload()
        payload.selectedConsolidationIds = ['con-1', 'invented-consolidation', 'con-1']
        payload.selectedWindowIds = ['window-1', 'invented-window']
        payload.selectedProceduralIds = ['procedure-1', 'invented-procedure']
        payload.selectedEpisodeIds = ['episode-1', 'invented-episode']
        payload.searchTrace.firstHop.targetIds = ['con-1', 'invented-consolidation', 'episode-1']
        payload.searchTrace.secondHop.targetIds = ['procedure-1', 'invented-procedure']
        return JSON.stringify(payload)
      }

      const payload: any = validMemoryDeliberationPayload()
      payload.selectedEraIds = ['con-1', 'invented-era', 'window-1']
      payload.selectedConsolidationIds = ['con-1', 'invented-consolidation']
      payload.selectedWindowIds = ['window-1', 'invented-window']
      payload.selectedProcedureIds = ['procedure-1', 'invented-procedure']
      payload.selectedEpisodeIds = ['episode-1', 'invented-episode']
      payload.conflictVariants = [{
        id: 'episode-1',
        summary: 'Provider-authored conflict summary.',
        provenance: 'observed',
        reason: 'Provider-authored conflict reason.',
      }]
      payload.selectedBundles = [{
        id: 'bundle-grounded',
        summary: 'Provider-authored bundle summary.',
        rationale: 'Every referenced memory was supplied to the Provider.',
        confidence: 0.8,
        periodId: 'con-1',
        episodeId: 'episode-1',
        procedureId: 'procedure-1',
        relationshipLine: 'Provider-authored relationship line.',
      }, {
        id: 'bundle-invented-reference',
        summary: 'A bundle containing an invented memory reference.',
        rationale: 'This bundle must not survive parsing.',
        confidence: 0.8,
        periodId: null,
        episodeId: 'invented-episode',
        procedureId: null,
        relationshipLine: null,
      }]
      payload.selectedChains = [{
        id: 'chain-provider-authored',
        kind: 'period-event-lesson-posture',
        summary: 'Provider-authored chain summary.',
        rationale: 'Provider-authored chain rationale.',
        confidence: 0.79,
        taskCue: 'Provider-authored task cue.',
        periodSummary: 'Provider-authored period summary.',
        eventSummary: 'Provider-authored event summary.',
        procedureSummary: null,
        relationshipMeaning: 'Provider-authored relationship meaning.',
        lesson: 'Provider-authored lesson.',
        currentStance: 'Provider-authored current stance.',
        answerPosture: 'Provider-authored answer posture.',
      }]
      payload.stableCore = ['Provider-authored stable core.']
      payload.unsafeDetails = ['Provider-authored unsafe detail.']
      return JSON.stringify(payload)
    })
    const consolidatedMemories = [{
      id: 'con-1',
      kind: 'daily',
      periodKey: 'p1',
      summary: 'A confirmed relationship memory.',
      lesson: null,
      confidence: 0.8,
      cues: ['relationship'],
    }] as any
    const recollectedWindows = [{
      id: 'window-1',
      label: 'A confirmed period',
      summary: 'A confirmed period summary.',
      confidence: 0.78,
      dominantProvenance: 'remembered',
      cues: ['period'],
    }] as any
    const proceduralMemories = [{
      id: 'procedure-1',
      label: 'A confirmed procedure',
      approach: 'Use the confirmed procedure.',
      pitfalls: [],
      confidence: 0.77,
      cues: ['procedure'],
    }] as any
    const recalledEpisodes = [{
      id: 'episode-1',
      sourceKind: 'dialogue',
      whatHappened: 'A confirmed episode happened.',
      confidence: 0.76,
      provenance: 'remembered',
    }] as any
    const plan = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'relationship concern',
      recollectionIntent: validRecollectionIntentPayload() as any,
      consolidatedMemories,
      recollectedWindows,
      proceduralMemories,
      recalledEpisodes,
      generateMainGatewayText,
      cardId: 'default',
    })
    const deliberation = await generateMemoryDeliberationWithGateway({
      recallSeed: 'relationship concern',
      recollectionIntent: validRecollectionIntentPayload() as any,
      recollectionPlan: plan,
      recollectionSpeechPlan: null,
      consolidatedMemories,
      recollectedWindows,
      proceduralMemories,
      recalledEpisodes,
      generateMainGatewayText,
      cardId: 'default',
    })

    expect(plan).toMatchObject({
      selectedConsolidationIds: ['con-1'],
      selectedWindowIds: ['window-1'],
      selectedProceduralIds: ['procedure-1'],
      selectedEpisodeIds: ['episode-1'],
      selectedRelationshipLines: [],
      searchTrace: {
        firstHop: {
          targetIds: ['con-1', 'episode-1'],
        },
        secondHop: {
          targetIds: ['procedure-1'],
        },
      },
    })
    expect(deliberation).toMatchObject({
      selectedEraIds: ['con-1', 'window-1'],
      selectedConsolidationIds: ['con-1'],
      selectedWindowIds: ['window-1'],
      selectedProcedureIds: ['procedure-1'],
      selectedEpisodeIds: ['episode-1'],
      selectedRelationshipLines: [],
      conflictVariants: [],
      stableCore: [],
      unsafeDetails: [],
      selectedBundles: [],
      selectedChains: [],
    })
    expect(JSON.stringify(deliberation)).not.toMatch(/Provider-authored bundle|bundle-grounded/u)
  })

  it('uses the exact normalized ids from the Provider fact slice as the whitelist', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      const payload: any = validRecollectionPlanPayload()
      payload.selectedConsolidationIds = ['con-visible', 'con-outside-slice']
      payload.searchTrace.firstHop.targetIds = ['con-visible', 'con-outside-slice']
      payload.searchTrace.secondHop.targetIds = ['con-visible', 'con-outside-slice']
      return JSON.stringify(payload)
    })
    const consolidatedMemories = [
      {
        id: ' con-visible ',
        kind: 'daily',
        periodKey: 'p1',
        summary: 'Visible candidate.',
        lesson: null,
        confidence: 0.8,
        cues: [],
      },
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `con-${index + 2}`,
        kind: 'daily',
        periodKey: `p${index + 2}`,
        summary: `Visible candidate ${index + 2}.`,
        lesson: null,
        confidence: 0.78,
        cues: [],
      })),
      {
        id: 'con-outside-slice',
        kind: 'daily',
        periodKey: 'p7',
        summary: 'This candidate is outside the Provider slice.',
        lesson: null,
        confidence: 0.77,
        cues: [],
      },
    ] as any

    const result = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'relationship concern',
      recollectionIntent: validRecollectionIntentPayload() as any,
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    const providerFacts = JSON.parse(systems[0]!) as any
    expect(providerFacts.data.consolidatedMemories.map((item: any) => item.id)).toEqual([
      'con-visible',
      'con-2',
      'con-3',
      'con-4',
      'con-5',
      'con-6',
    ])
    expect(result?.selectedConsolidationIds).toEqual(['con-visible'])
    expect(result?.searchTrace?.firstHop.targetIds).toEqual(['con-visible'])
    expect(result?.searchTrace?.secondHop.targetIds).toEqual(['con-visible'])
  })

  it('removes blank and colliding owner ids before applying the Provider candidate budget', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      const payload: any = validRecollectionPlanPayload()
      payload.selectedConsolidationIds = ['con-6']
      payload.searchTrace.firstHop.targetIds = ['con-6']
      payload.searchTrace.secondHop.targetIds = ['con-6']
      return JSON.stringify(payload)
    })
    const consolidatedMemories = [
      {
        id: '   ',
        kind: 'daily',
        periodKey: 'blank',
        summary: 'Blank owner id.',
        lesson: null,
        confidence: 0.9,
        cues: [],
      },
      {
        id: 'duplicate-owner',
        kind: 'daily',
        periodKey: 'duplicate-1',
        summary: 'First colliding owner.',
        lesson: null,
        confidence: 0.89,
        cues: [],
      },
      {
        id: ' duplicate-owner ',
        kind: 'daily',
        periodKey: 'duplicate-2',
        summary: 'Second colliding owner.',
        lesson: null,
        confidence: 0.88,
        cues: [],
      },
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `con-${index + 1}`,
        kind: 'daily',
        periodKey: `p${index + 1}`,
        summary: `Valid candidate ${index + 1}.`,
        lesson: null,
        confidence: 0.8 - index * 0.01,
        cues: [],
      })),
    ] as any

    const result = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'relationship concern',
      recollectionIntent: validRecollectionIntentPayload() as any,
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    const providerFacts = JSON.parse(systems[0]!) as any
    expect(providerFacts.data.consolidatedMemories.map((item: any) => item.id)).toEqual([
      'con-1',
      'con-2',
      'con-3',
      'con-4',
      'con-5',
      'con-6',
    ])
    expect(result?.selectedConsolidationIds).toEqual(['con-6'])
    expect(result?.searchTrace?.firstHop.targetIds).toEqual(['con-6'])
    expect(result?.searchTrace?.secondHop.targetIds).toEqual(['con-6'])
  })

  it('does not expand an empty Provider selection with candidates the Provider did not select', async () => {
    const generateMainGatewayText = vi.fn(async () => {
      const payload: any = validRecollectionPlanPayload()
      payload.selectedConsolidationIds = []
      payload.selectedWindowIds = []
      payload.selectedProceduralIds = []
      payload.selectedEpisodeIds = []
      payload.searchTrace.firstHop.focus = 'era'
      payload.searchTrace.firstHop.targetIds = []
      payload.searchTrace.secondHop.targetIds = []
      return JSON.stringify(payload)
    })
    const consolidatedMemories = Array.from({ length: 7 }, (_, index) => ({
      id: `con-${index + 1}`,
      kind: 'daily',
      periodKey: `p${index + 1}`,
      summary: `Candidate ${index + 1}.`,
      lesson: null,
      confidence: 0.8,
      cues: [],
    })) as any
    const recollectionIntent = validRecollectionIntentPayload() as any

    const plan = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'relationship concern',
      recollectionIntent,
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })
    const resolved = resolveRecollectionPlanSearch({
      recollectionIntent,
      recollectionPlan: plan,
      relationshipLineCandidates: [],
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
    })

    expect(plan?.selectedConsolidationIds).toEqual([])
    expect(resolved?.selectedConsolidationIds).toEqual([])
    expect(resolved?.selectedWindowIds).toEqual([])
    expect(resolved?.selectedProceduralIds).toEqual([])
    expect(resolved?.selectedEpisodeIds).toEqual([])
    expect(resolved?.searchTrace?.firstHop.targetIds).toEqual([])
    expect(resolved?.searchTrace?.secondHop.targetIds).toEqual([])
  })

  it('rejects ambiguous duplicate owners from typed selections and cross-kind search targets', async () => {
    const generateMainGatewayText = vi.fn(async () => {
      const payload: any = validRecollectionPlanPayload()
      payload.selectedConsolidationIds = ['duplicate-owner', 'shared-owner']
      payload.selectedEpisodeIds = ['shared-owner']
      payload.searchTrace.firstHop.targetIds = ['duplicate-owner', 'shared-owner']
      payload.searchTrace.secondHop.targetIds = ['duplicate-owner', 'shared-owner']
      return JSON.stringify(payload)
    })

    const result = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'relationship concern',
      recollectionIntent: validRecollectionIntentPayload() as any,
      consolidatedMemories: [
        {
          id: 'duplicate-owner',
          kind: 'daily',
          periodKey: 'p1',
          summary: 'First duplicate owner.',
          lesson: null,
          confidence: 0.8,
          cues: [],
        },
        {
          id: 'duplicate-owner',
          kind: 'daily',
          periodKey: 'p2',
          summary: 'Second duplicate owner.',
          lesson: null,
          confidence: 0.79,
          cues: [],
        },
        {
          id: 'shared-owner',
          kind: 'daily',
          periodKey: 'p3',
          summary: 'Typed consolidation owner.',
          lesson: null,
          confidence: 0.78,
          cues: [],
        },
      ] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [{
        id: 'shared-owner',
        sourceKind: 'dialogue-feedback',
        whatHappened: 'A different typed episode owner.',
        confidence: 0.77,
        provenance: 'remembered',
      }] as any,
      generateMainGatewayText,
      cardId: 'default',
    })

    expect(result?.selectedConsolidationIds).toEqual(['shared-owner'])
    expect(result?.selectedEpisodeIds).toEqual(['shared-owner'])
    expect(result?.searchTrace?.firstHop.targetIds).toEqual([])
    expect(result?.searchTrace?.secondHop.targetIds).toEqual([])
  })

  it('keeps memory planners from authoring visible or inward reply prose', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      if (providerFactType(system) === 'alicization-memory-recollection-plan-context') {
        return JSON.stringify({
          selectedConsolidationIds: ['con-1'],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [],
          selectedRelationshipLines: ['Return through the same line.'],
          searchTrace: {
            firstHop: { focus: 'relationship-line', summary: 'Start from the same line.', targetIds: ['con-1'] },
            secondHop: { action: 'hold', evidenceGap: 'none', summary: 'Hold the same line.', targetIds: ['con-1'] },
            thirdHop: { ambiguityPosture: 'settled', summary: 'The same line is settled.' },
          },
          certainty: 'approximate',
          rationale: 'The planner should not write reply prose.',
          confidence: 0.73,
        })
      }
      if (providerFactType(system) === 'alicization-memory-recollection-speech-plan-context') {
        return JSON.stringify({
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          rationale: 'The planner should only choose surface policy.',
          confidence: 0.72,
        })
      }
      return JSON.stringify({
        shouldRecall: true,
        selectedEraIds: ['era-1'],
        selectedConsolidationIds: ['con-1'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedRelationshipLines: ['The same line should shape the reply.'],
        selectedBundles: [],
        selectedChains: [],
        conflictSeverity: 'none',
        conflictVariants: [],
        stableCore: ['The same line is stable.'],
        unsafeDetails: [],
        surfacePolicy: 'relationship-continuity',
        confidence: 0.76,
        whyNow: 'The same line matters now.',
      })
    })

    const recollectionIntent = {
      mode: 'relationship-history',
      temporalFocus: 'cross-session',
      searchEpisodes: true,
      searchProceduralExperience: false,
      queryHints: ['relationship'],
      rationale: 'relationship recall',
      confidence: 0.78,
    } as any
    const consolidatedMemories = [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'A remembered relationship pattern.', lesson: 'Use evidence, not templates.', confidence: 0.8, cues: ['relationship'] }] as any
    const recollectionPlan = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'relationship recall',
      recollectionIntent,
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })
    const speechPlan = await generateMemoryRecollectionSpeechPlanWithGateway({
      recallSeed: 'relationship recall',
      recollectionIntent,
      recollectionPlan,
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })
    const deliberation = await generateMemoryDeliberationWithGateway({
      recallSeed: 'relationship recall',
      recollectionIntent,
      recollectionPlan,
      recollectionSpeechPlan: speechPlan,
      consolidatedMemories,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    const systemText = systems.join('\n')
    expect(systemText).not.toMatch(/opening must be|inwardLine is|visibleLine is/i)
    expect(systemText).not.toMatch(/soft return into the same line|same-thread-continuation|widening closeness/i)
    expect(speechPlan).toEqual(expect.objectContaining({
      shouldSurface: true,
      surfaceMode: 'relationship-continuity',
      placement: 'inside-payoff',
      certainty: 'approximate',
    }))
    expect(recollectionPlan?.opening).toBe('')
    expect(deliberation?.inwardLine).toBe('')
    expect(deliberation?.visibleLine).toBeNull()
  })
})
