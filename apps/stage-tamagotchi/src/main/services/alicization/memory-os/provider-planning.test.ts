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
          why: 'Memory planning should reopen the same living line instead of becoming detached retrieval.',
          reasonTags: ['memory-planning', 'same-emotional-kernel'],
        },
      },
    } as any
    const generateMainGatewayText = vi.fn(async (input: any) => {
      gatewayInputs.push(input)
      if (input.system.includes('[ALICIZATION_MEMORY_RECOLLECTION_INTENT_PLANNER]')) {
        return JSON.stringify({
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['same living line'],
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
      if (input.system.includes('[ALICIZATION_MEMORY_RECOLLECTION_PLANNER]')) {
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
      if (input.system.includes('[ALICIZATION_MEMORY_RECOLLECTION_SPEECH_PLANNER]')) {
        return JSON.stringify({
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          internalLead: 'The same emotional line comes back first.',
          visibleLead: 'A brief continuity nod fits.',
          styleNote: 'Let the remembered feeling shape the answer without becoming a template.',
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
      activeThoughts: [{ text: 'keep one living line' }],
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

  it('injects project-state understanding into recollection and deliberation planners', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      if (system.includes('[ALICIZATION_MEMORY_RECOLLECTION_INTENT_PLANNER]')) {
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
      if (system.includes('[ALICIZATION_MEMORY_RECOLLECTION_PLANNER]')) {
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
      if (system.includes('[ALICIZATION_MEMORY_RECOLLECTION_SPEECH_PLANNER]')) {
        return JSON.stringify({
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          internalLead: 'I remember the seam before I speak.',
          visibleLead: 'A brief continuity-bearing nod fits here.',
          styleNote: 'Keep it brief and subordinate to the live answer.',
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
        internalLead: 'remembered seam',
        visibleLead: 'brief continuity nod',
        styleNote: 'stay light',
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
    expect(systems.every(system => system.includes('[ALICIZATION_PROJECT_STATE]'))).toBe(true)
    expect(systems.every(system => system.includes('[ALICIZATION_MEMORY_PLANNING_SELF_BRIEF]'))).toBe(true)
    expect(systems.every(system => system.includes('project_identity=Alicization is a local-first digital life project'))).toBe(true)
    expect(systems.every(system => system.includes('current_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.'))).toBe(true)
    expect(systems.every(system => system.includes('Memory planning must stay inside the same digital life project line'))).toBe(true)
    expect(systems.every(system => system.includes('Do not let recollection planning collapse into generic retrieval orchestration'))).toBe(true)
    expect(systems.every(system => system.includes('Alicization is a local-first digital life project building one continuous "her"'))).toBe(true)
    expect(systems.every(system => system.includes('open_life_loops:'))).toBe(true)
    expect(systems.every(system => system.includes('next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs'))).toBe(true)
    expect(systems.every(system => system.includes('Prefer changes that make memory feel more like lived continuity.'))).toBe(true)
  })

  it('injects continuity arc opening guidance into recollection and deliberation planners', async () => {
    const systems: string[] = []
    const generateMainGatewayText = vi.fn(async ({ system }: { system: string }) => {
      systems.push(system)
      if (system.includes('[ALICIZATION_MEMORY_RECOLLECTION_PLANNER]')) {
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

    expect(systems.some(system => system.includes('stage=gentle-reopen'))).toBe(true)
    expect(systems.some(system => system.includes('softly re-enters the same living line'))).toBe(true)
    expect(systems.some(system => system.includes('soft return into the same line'))).toBe(true)
  })
})
