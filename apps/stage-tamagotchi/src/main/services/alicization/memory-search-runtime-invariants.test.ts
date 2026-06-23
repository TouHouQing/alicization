import type {
  AlicizationMemoryDeliberation,
  AlicizationRecollectionPlan,
  AlicizationRecollectionSpeechPlan,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { describe, expect, it } from 'vitest'

import { createAlicizationMemorySearchRuntime } from './memory-search-runtime'
import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'

describe('memory-search-runtime invariants', () => {
  it('keeps shared recollection contracts assignable through runtime surface memory fields', () => {
    const recollectionPlan: AlicizationRecollectionPlan = {
      selectedConsolidationIds: ['consolidation-runtime'],
      selectedWindowIds: [],
      selectedProceduralIds: ['procedure-runtime'],
      selectedEpisodeIds: ['episode-runtime'],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: ['Return to the same seam before branching.'],
      searchTrace: {
        firstHop: {
          focus: 'procedure',
          summary: 'The recollection first grabs the remembered way of handling this kind of task.',
          targetIds: ['procedure-runtime'],
        },
        secondHop: {
          action: 'expand-procedure',
          evidenceGap: 'need-episode-detail',
          summary: 'The search expands to supporting episode evidence.',
          targetIds: ['episode-runtime'],
        },
        thirdHop: {
          ambiguityPosture: 'approximate',
          summary: 'The remembered seam is usable but should stay approximate.',
        },
      },
      opening: 'What comes back first is that runtime seam period.',
      certainty: 'approximate',
      rationale: 'The remembered task era is the safest first anchor.',
      confidence: 0.82,
    }
    const recollectionSpeechPlan: AlicizationRecollectionSpeechPlan = {
      shouldSurface: false,
      surfaceMode: 'internal-only',
      placement: 'internal-only',
      certainty: 'approximate',
      internalLead: 'What comes back first is the runtime seam we kept carrying.',
      visibleLead: null,
      styleNote: 'Let the remembered seam stay inward.',
      rationale: 'The recollection should remain latent this turn.',
      confidence: 0.76,
    }
    const memoryDeliberation: AlicizationMemoryDeliberation = {
      shouldRecall: true,
      selectedEraIds: ['consolidation-runtime'],
      selectedConsolidationIds: ['consolidation-runtime'],
      selectedWindowIds: [],
      selectedProcedureIds: ['procedure-runtime'],
      selectedEpisodeIds: ['episode-runtime'],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: ['Return to the same seam before branching.'],
      ambiguityPosture: 'approximate',
      searchTrace: recollectionPlan.searchTrace,
      selectedEras: [{
        id: 'consolidation-runtime',
        facet: 'task-era',
        summary: 'That period kept bending toward the runtime seam until it held together.',
      }],
      selectedPeriods: [{
        id: 'consolidation-runtime',
        kind: 'consolidation',
        summary: 'That period kept bending toward the runtime seam until it held together.',
      }],
      selectedEpisodes: [{
        id: 'episode-runtime',
        summary: 'We kept repairing the runtime seam until it stabilized.',
        provenance: 'remembered',
      }],
      conflictSeverity: 'low',
      conflictVariants: [],
      stableCore: ['Return to the same seam before branching.'],
      unsafeDetails: [],
      selectedProcedures: [{
        id: 'procedure-runtime',
        label: 'runtime seam carry',
        approach: 'Return to the same seam before branching.',
      }],
      selectedBundles: [{
        id: 'bundle-runtime',
        summary: 'That period kept bending toward the runtime seam until it held together. | Return to the same seam before branching.',
        rationale: 'Keep the remembered seam bundle active.',
        confidence: 0.82,
        periodId: 'consolidation-runtime',
        episodeId: 'episode-runtime',
        procedureId: 'procedure-runtime',
        relationshipLine: 'Return to the same seam before branching.',
      }],
      selectedChains: [{
        id: 'chain-runtime',
        kind: 'task-procedure-relationship-stance',
        summary: 'Return to the same seam before branching. | Carry the same runtime seam before branching.',
        rationale: 'The remembered procedure should set the current stance.',
        confidence: 0.82,
        taskCue: 'runtime seam',
        procedureSummary: 'Return to the same seam before branching.',
        relationshipMeaning: 'Carry the same runtime seam before branching.',
        currentStance: 'Stay on the same seam before branching.',
        answerPosture: 'Answer from the same seam before branching.',
      }],
      surfacePolicy: 'procedural-carry',
      confidence: 0.82,
      whyNow: 'The present task resembles the remembered seam strongly enough to reopen it.',
      inwardLine: 'What comes back first is the runtime seam we kept carrying.',
      visibleLine: null,
    }

    const memorySurface: Pick<AlicizationDigitalLifeRuntimeSurface['memory'], 'recollectionPlan' | 'recollectionSpeechPlan' | 'memoryDeliberation'> = {
      recollectionPlan,
      recollectionSpeechPlan,
      memoryDeliberation,
    }

    expect(memorySurface.recollectionPlan?.searchTrace?.firstHop.focus).toBe('procedure')
    expect(memorySurface.memoryDeliberation?.surfacePolicy).toBe('procedural-carry')
  })

  it('keeps same-turn search trace replayable for the same memory-search input', async () => {
    const runtime = createAlicizationMemorySearchRuntime({
      organicMemoryPrompt: {
        normalizeOrganicRecallText: raw => raw.trim().toLowerCase(),
        selectPromptActiveThoughts: ({ activeThoughts }) => activeThoughts,
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
        recallConversationHistory: async () => [],
        recallMemoryConsolidations: async () => [{
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
        }],
        planRecollectionIntent: async () => ({
          mode: 'execution-procedure' as const,
          temporalFocus: 'experience-matched' as const,
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam'],
          rationale: 'The current task resembles a remembered procedure.',
          confidence: 0.86,
        }),
        planMemoryRecollection: async () => ({
          selectedConsolidationIds: ['consolidation-runtime'],
          selectedWindowIds: [],
          selectedProceduralIds: ['runtime seam'],
          selectedEpisodeIds: ['episode-runtime'],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: ['Return to the seam before branching.'],
          searchTrace: {
            firstHop: {
              focus: 'procedure',
              summary: 'The recollection first grabs the remembered way of handling this kind of task.',
              targetIds: ['runtime seam'],
            },
            secondHop: {
              action: 'expand-procedure',
              evidenceGap: 'need-episode-detail',
              summary: 'The search expands from the first anchor to supporting episode evidence.',
              targetIds: ['episode-runtime'],
            },
            thirdHop: {
              ambiguityPosture: 'approximate',
              summary: 'The recollection is usable but should stay approximate.',
            },
          },
          opening: 'What comes back first is that runtime seam period.',
          certainty: 'approximate' as const,
          rationale: 'The remembered task era is the safest first anchor.',
          confidence: 0.84,
        }),
        isPersonaResidueMemoryText: () => false,
      },
    })

    const first = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续按之前那样修 runtime seam',
      recallGovernor: { allowRecalledFragments: true } as any,
    })
    const second = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续按之前那样修 runtime seam',
      recallGovernor: { allowRecalledFragments: true } as any,
    })

    expect(first.recollectionPlan?.searchTrace).toEqual(second.recollectionPlan?.searchTrace)
    const firstBlocks = runtime.buildOrganicMemorySystemBlocks(first).join('\n')
    const secondBlocks = runtime.buildOrganicMemorySystemBlocks(second).join('\n')
    expect(firstBlocks).toContain('search_first_hop=procedure:')
    expect(secondBlocks).toContain('search_second_hop=expand-procedure:need-episode-detail:')
    expect(firstBlocks).toContain('search_third_hop=approximate:')
    expect(firstBlocks).toEqual(secondBlocks)
  })

  it('keeps reply-layer recollection controls structural instead of regrowing drafted wording authority', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: '',
        carriedThread: 'remembered procedure',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'memory-only',
        responseMode: 'guide-current-knot',
        governingFocus: 'Use remembered procedure as continuity for the answer.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'procedural-carry',
        placement: 'inside-payoff',
        certainty: 'approximate',
        internalLead: 'The remembered way through this is to return to the same seam first.',
        visibleLead: 'I mostly remember handling this by returning to the same seam before branching.',
        styleNote: 'Let the remembered procedure sit inside the answer instead of becoming a separate memory monologue.',
        rationale: 'The host is explicitly asking how this used to be handled.',
        confidence: 0.83,
      },
    })

    expect(result.contract.recollectionLatentControls ?? []).toEqual(expect.arrayContaining([
      'recollection_continuity_role=procedure-carry',
      'recollection_template_boundary=guard-against-drafted-wording',
      'recollection_frame_prior_procedure=yes',
    ]))
    expect(result.contract.mustDo.join(' | ')).not.toContain('I mostly remember handling this by returning to the same seam before branching.')
    expect(result.systemBlock).not.toContain('I mostly remember handling this by returning to the same seam before branching.')
  })
})
