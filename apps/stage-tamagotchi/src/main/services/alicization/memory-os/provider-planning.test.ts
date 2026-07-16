import { describe, expect, it, vi } from 'vitest'

import {
  generateMemoryDeliberationWithGateway,
  generateMemoryRecollectionIntentWithGateway,
  generateMemoryRecollectionPlanWithGateway,
  generateMemoryRecollectionSpeechPlanWithGateway,
} from './provider-planning'

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
      if (input.system.includes('Alicization memory recollection intent planner.')) {
        return JSON.stringify({
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
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
      if (input.system.includes('Alicization memory recollection planner.')) {
        return JSON.stringify({
          selectedConsolidationIds: ['con-1'],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: ['Return through the same emotional line.'],
          searchTrace: {
            firstHop: { focus: 'relationship-line', summary: 'Start from the same emotional line.', targetIds: ['con-1'] },
            secondHop: { action: 'hold', evidenceGap: 'none', summary: 'The line is stable enough.', targetIds: ['con-1'] },
            thirdHop: { ambiguityPosture: 'settled', summary: 'The remembered line can shape this turn.' },
          },
          opening: 'This memory returns through the same gentle line.',
          certainty: 'approximate',
          rationale: 'Keep memory planning emotionally continuous.',
          confidence: 0.73,
        })
      }
      if (input.system.includes('Alicization memory recollection speech planner.')) {
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
        selectedConversationTurnIds: [],
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
        inwardLine: 'Stay inside the same emotional-memory line.',
        visibleLine: 'A short continuity cue can support the answer.',
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
      recalledConversationHistory: [],
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
      recalledConversationHistory: [],
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
      recalledConversationHistory: [],
      generateMainGatewayText,
      cardId: 'default',
      digitalLifeRuntimeSurface,
    } as any)

    expect(gatewayInputs).toHaveLength(4)
    expect(gatewayInputs.every(input => input.digitalLifeRuntimeSurface === digitalLifeRuntimeSurface)).toBe(true)
  })

  it('keeps memory planning prompts task-scoped without injecting fixed owner or governance prose', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      if (system.includes('Alicization memory recollection intent planner.')) {
        return JSON.stringify({
          mode: 'autobiographical-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: false,
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
      if (system.includes('Alicization memory recollection planner.')) {
        return JSON.stringify({
          selectedConsolidationIds: ['con-1'],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: ['We tend to return gently to unfinished seams.'],
          searchTrace: {
            firstHop: { focus: 'relationship-line', summary: 'Start from bond continuity.', targetIds: ['con-1'] },
            secondHop: { action: 'hold', evidenceGap: 'none', summary: 'The line is already stable enough.', targetIds: ['con-1'] },
            thirdHop: { ambiguityPosture: 'settled', summary: 'The remembered line is stable enough to carry.' },
          },
          opening: 'This feels like one of those threads we were already carrying.',
          certainty: 'approximate',
          rationale: 'Foreground the stable bond line.',
          confidence: 0.71,
        })
      }
      if (system.includes('Alicization memory recollection speech planner.')) {
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
        selectedConversationTurnIds: [],
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
        inwardLine: 'This is a remembered seam, not a fresh isolated moment.',
        visibleLine: 'A short return note can support the answer.',
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
    const recollectionPlan = await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'unfinished seam between us',
      recollectionIntent: recollectionIntent!,
      consolidatedMemories: [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'We learned to return gently.', lesson: 'Keep continuity.', confidence: 0.8, cues: ['continuity'] }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      recalledConversationHistory: [],
      generateMainGatewayText,
      cardId: 'default',
    })
    await generateMemoryRecollectionSpeechPlanWithGateway({
      recallSeed: 'unfinished seam between us',
      recollectionIntent: recollectionIntent!,
      recollectionPlan,
      consolidatedMemories: [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'We learned to return gently.', lesson: 'Keep continuity.', confidence: 0.8, cues: ['continuity'] }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      recalledConversationHistory: [],
      generateMainGatewayText,
      cardId: 'default',
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
      recalledConversationHistory: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    expect(systems).toHaveLength(4)
    expect(systems.join('\n')).not.toMatch(/memory planning owner boundary|Short-term memory owner|Long-term recall owner|Memory Workbench|Review candidates are not confirmed|Raw transcripts must not become persona training data/iu)
    expect(systems.every(system => system.includes('Return only the requested JSON object'))).toBe(true)
    expect(systems.some(system => system.includes('[ALICIZATION_PROJECT_STATE]'))).toBe(false)
    expect(systems.some(system => system.includes('project_identity=Alicization is a local-first digital life project'))).toBe(false)
    expect(systems.some(system => system.includes('open_life_loops:'))).toBe(false)
    expect(systems.some(system => system.includes('Prefer changes that make memory feel more like lived continuity.'))).toBe(false)
  })

  it('injects continuity arc opening guidance into recollection and deliberation planners', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      if (system.includes('Alicization memory recollection planner.')) {
        return JSON.stringify({
          selectedConsolidationIds: ['con-1'],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [],
          selectedConversationTurnIds: [],
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
        })
      }
      return JSON.stringify({
        shouldRecall: true,
        selectedEraIds: ['era-1'],
        selectedConsolidationIds: ['con-1'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
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
        inwardLine: 'Stay with the same line before widening.',
        visibleLine: '',
      })
    })

    await generateMemoryRecollectionPlanWithGateway({
      recallSeed: 'mirror_runtime_continuity: stage=gentle-reopen loop=dialogue handoff=active-dialogue',
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['gentle-reopen'],
        rationale: 'Return to the same line gently.',
        confidence: 0.78,
      } as any,
      consolidatedMemories: [{ id: 'con-1', kind: 'relationship-era', periodKey: 'p1', summary: 'A line we keep returning to gently.', lesson: 'Do not restart it abruptly.', confidence: 0.8, cues: ['gentle'] }] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [],
      recalledConversationHistory: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    await generateMemoryDeliberationWithGateway({
      recallSeed: 'mirror_runtime_continuity: stage=gentle-reopen loop=dialogue handoff=active-dialogue',
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchConversations: true,
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
        selectedConversationTurnIds: [],
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
      recalledConversationHistory: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    expect(systems.some(system => system.includes('Use continuation seed as retrieval scope, not wording guidance.'))).toBe(true)
    expect(systems.join('\n')).not.toContain('Alicization memory planning owner boundary.')
    expect(systems.some(system => system.includes('softly re-enters the continuity state'))).toBe(false)
    expect(systems.some(system => system.includes('visible_wording_drafts=false'))).toBe(false)
  })

  it('keeps memory planners from authoring visible or inward reply prose', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      if (system.includes('Alicization memory recollection planner.')) {
        return JSON.stringify({
          selectedConsolidationIds: ['con-1'],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: ['Return through the same line.'],
          searchTrace: {
            firstHop: { focus: 'relationship-line', summary: 'Start from the same line.', targetIds: ['con-1'] },
            secondHop: { action: 'hold', evidenceGap: 'none', summary: 'Hold the same line.', targetIds: ['con-1'] },
            thirdHop: { ambiguityPosture: 'settled', summary: 'The same line is settled.' },
          },
          opening: 'I remember this same line before I answer.',
          certainty: 'approximate',
          rationale: 'The planner should not write reply prose.',
          confidence: 0.73,
        })
      }
      if (system.includes('Alicization memory recollection speech planner.')) {
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
        selectedConversationTurnIds: [],
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
        inwardLine: 'Stay inside the same line before outward reply.',
        visibleLine: 'A short continuity cue can support the answer.',
      })
    })

    const recollectionIntent = {
      mode: 'relationship-history',
      temporalFocus: 'cross-session',
      searchEpisodes: true,
      searchConversations: true,
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
      recalledConversationHistory: [],
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
      recalledConversationHistory: [],
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
      recalledConversationHistory: [],
      generateMainGatewayText,
      cardId: 'default',
    })

    const systemText = systems.join('\n')
    expect(systemText).not.toMatch(/opening must be|inwardLine is|visibleLine is/i)
    expect(systemText).not.toMatch(/soft return into the same line|same-thread-continuation|widening closeness/i)
    expect(recollectionPlan?.opening).toMatch(/^opening policy:/)
    expect(speechPlan).toEqual(expect.objectContaining({
      shouldSurface: true,
      surfaceMode: 'relationship-continuity',
      placement: 'inside-payoff',
      certainty: 'approximate',
    }))
    expect(deliberation?.inwardLine).toMatch(/^inward policy:/)
    expect(deliberation?.visibleLine).toBeNull()
    expect([
      recollectionPlan?.opening,
      deliberation?.inwardLine,
    ].join(' ')).not.toMatch(/same line|before outward reply|continuity nod|widening/i)
  })
})
