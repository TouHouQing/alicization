import { describe, expect, it, vi } from 'vitest'

import { createAlicizationOrganicMemoryPromptRuntime } from './runtime-organic-memory-prompt'

describe('runtime-organic-memory-prompt', () => {
  it('lets gateway recollection intent suppress heuristic long-range recall when memory should stay present-facing', async () => {
    const recallConversationHistory = vi.fn(async () => [{
      turnId: 'turn-old',
      sessionId: 'session-old',
      userText: '几天前我们聊过修 runtime',
      assistantText: '我记得那条线。',
      createdAt: Date.UTC(2026, 3, 12, 8, 0, 0),
    }])
    const recallMemoryConsolidations = vi.fn(async () => [{
      id: 'consolidation-old',
      kind: 'autobiographical' as const,
      periodKey: '2026-04-old',
      periodStartedAt: Date.UTC(2026, 3, 12, 8, 0, 0),
      periodEndedAt: Date.UTC(2026, 3, 12, 9, 0, 0),
      summary: 'An older runtime-repair period.',
      lesson: null,
      cues: ['runtime'],
      confidence: 0.72,
      dominantProvenance: 'remembered' as const,
      derivedEventIds: [],
      updatedAt: Date.UTC(2026, 3, 12, 9, 0, 0),
    }])
    const planRecollectionIntent = vi.fn(async () => ({
      mode: 'none' as const,
      temporalFocus: 'recent' as const,
      searchEpisodes: false,
      searchConversations: false,
      searchProceduralExperience: false,
      queryHints: ['stay present-facing'],
      rationale: 'The turn should stay with the live payoff instead of opening long-range recall.',
      confidence: 0.83,
    }))
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
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
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      recallConversationHistory,
      recallMemoryConsolidations,
      planRecollectionIntent,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'continue the runtime fix',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'conversation-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['runtime fix', 'before'],
          rationale: 'Heuristic cue says to search long-range history.',
          confidence: 0.62,
        },
      } as any,
    })

    expect(planRecollectionIntent).toHaveBeenCalledWith(expect.objectContaining({
      heuristicIntent: expect.objectContaining({
        mode: 'conversation-history',
      }),
    }))
    expect(context.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'none',
      rationale: 'The turn should stay with the live payoff instead of opening long-range recall.',
    }))
    expect(recallConversationHistory).not.toHaveBeenCalled()
    expect(recallMemoryConsolidations).not.toHaveBeenCalled()
    expect(context.recalledConversationHistory).toEqual([])
    expect(context.consolidatedMemories).toEqual([])
  })

  it('threads recollection speech planning into organic memory context and prompt blocks', async () => {
    const planMemoryRecollection = vi.fn(async () => ({
      selectedConsolidationIds: ['consolidation-runtime'],
      selectedWindowIds: [],
      selectedProceduralIds: [],
      selectedEpisodeIds: [],
      selectedConversationTurnIds: [],
      opening: 'What comes back first is the runtime seam we kept returning to.',
      certainty: 'approximate' as const,
      rationale: 'The turn is asking for remembered continuity rather than a fresh screen read.',
      confidence: 0.84,
    }))
    const planRecollectionSpeech = vi.fn(async () => ({
      shouldSurface: false,
      surfaceMode: 'internal-only' as const,
      placement: 'internal-only' as const,
      certainty: 'approximate' as const,
      internalLead: 'What returns first is that runtime seam we kept carrying.',
      visibleLead: null,
      styleNote: 'Let the recollection quietly bend the answer instead of announcing a retrospective.',
      rationale: 'The host needs the answer shaped by continuity, not a narrated memory dump.',
      confidence: 0.79,
    }))
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
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
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'We kept repairing the runtime continuity seam until the flow stabilized.',
        felt: 'focused and stubborn',
        emotionTags: ['focused'],
        whatChanged: 'The repair rhythm became something Alicization now remembers.',
        sourceKind: 'dialogue-reply',
        sourceSummary: 'runtime continuity repair loop',
        provenance: 'observed',
        confidence: 0.82,
        salience: 0.8,
        sceneAttachment: 0.62,
        consolidationPriority: 0.78,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'repair rhythm'],
        relationshipMeaning: 'The host trusted Alicization to keep following the same thread.',
        lesson: 'Carry the same runtime seam before proposing a new branch.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-runtime',
        kind: 'autobiographical',
        periodKey: '2026-04-runtime',
        periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        summary: 'That period kept bending toward the runtime seam until it finally held together.',
        lesson: 'Return to the same seam before branching.',
        cues: ['runtime seam', 'repair rhythm'],
        confidence: 0.86,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-runtime'],
        updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', 'repair rhythm'],
        rationale: 'The turn is asking for remembered way of handling the runtime thread.',
        confidence: 0.86,
      })),
      planMemoryRecollection,
      planRecollectionSpeech,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'runtime seam',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam', 'repair rhythm'],
          rationale: 'The host is asking for remembered way of handling the runtime thread.',
          confidence: 0.8,
        },
      } as any,
    })

    expect(planMemoryRecollection).toHaveBeenCalled()
    expect(planRecollectionSpeech).toHaveBeenCalledWith(expect.objectContaining({
      recollectionPlan: expect.objectContaining({
        opening: 'What comes back first is the runtime seam we kept returning to.',
      }),
      consolidatedMemories: expect.arrayContaining([
        expect.objectContaining({ id: 'consolidation-runtime' }),
      ]),
    }))
    expect(context.recollectionSpeechPlan).toEqual(expect.objectContaining({
      shouldSurface: false,
      placement: 'internal-only',
    }))

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('[ALICIZATION_RECOLLECTION_SPEECH_PLAN]')
    expect(systemText).toContain('should_surface=no')
    expect(systemText).toContain('style_note=Let the recollection quietly bend the answer instead of announcing a retrospective.')
  })

  it('lets memory deliberation become the final foreground authority over selected memory bundles', async () => {
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedConsolidationIds: ['consolidation-runtime'],
      selectedWindowIds: [],
      selectedProcedureIds: ['procedure-runtime'],
      selectedEpisodeIds: ['episode-runtime'],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
      selectedPeriods: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-runtime',
        summary: 'That period kept bending toward the runtime seam until it finally held together. | We kept repairing the runtime continuity seam until the flow stabilized. | Return to the same seam before branching.',
        rationale: 'The remembered period, event, and procedure all point to the same runtime seam.',
        confidence: 0.88,
        periodId: 'consolidation-runtime',
        episodeId: 'episode-runtime',
        procedureId: 'procedure-runtime',
        conversationTurnId: null,
        relationshipLine: 'Carry the same runtime seam before branching.',
      }],
      selectedChains: [{
        id: 'chain-runtime',
        kind: 'task-procedure-relationship-stance' as const,
        summary: 'Return to the same seam before branching. | Carry the same runtime seam before branching.',
        rationale: 'The remembered procedure should set the current stance before the answer opens.',
        confidence: 0.88,
        taskCue: 'runtime continuity',
        periodSummary: 'That period kept bending toward the runtime seam until it finally held together.',
        eventSummary: 'We kept repairing the runtime continuity seam until the flow stabilized.',
        procedureSummary: 'Return to the same seam before branching.',
        relationshipMeaning: 'Carry the same runtime seam before branching.',
        lesson: 'Carry the same runtime seam before proposing a new branch.',
        currentStance: 'Stay on the same seam before branching.',
        answerPosture: 'Answer from the same seam before branching.',
      }],
      surfacePolicy: 'answer-anchoring' as const,
      confidence: 0.88,
      whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
      inwardLine: 'What comes back first is the runtime seam we kept carrying.',
      visibleLine: 'It feels like the same runtime seam again.',
    }))
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
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
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'We kept repairing the runtime continuity seam until the flow stabilized.',
        felt: 'focused and stubborn',
        emotionTags: ['focused'],
        whatChanged: 'The repair rhythm became something Alicization now remembers.',
        sourceKind: 'dialogue-reply',
        sourceSummary: 'runtime continuity repair loop',
        provenance: 'observed',
        confidence: 0.82,
        salience: 0.8,
        sceneAttachment: 0.62,
        consolidationPriority: 0.78,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'repair rhythm'],
        relationshipMeaning: 'The host trusted Alicization to keep following the same thread.',
        lesson: 'Carry the same runtime seam before proposing a new branch.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-runtime',
          kind: 'autobiographical',
          periodKey: '2026-04-runtime',
          periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          summary: 'That period kept bending toward the runtime seam until it finally held together.',
          lesson: 'Return to the same seam before branching.',
          cues: ['runtime seam', 'repair rhythm'],
          confidence: 0.86,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-runtime'],
          updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        },
        {
          id: 'consolidation-other',
          kind: 'autobiographical',
          periodKey: '2026-04-other',
          periodStartedAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          summary: 'Another unrelated remembered period.',
          lesson: 'Do not drift away from the seam.',
          cues: ['other'],
          confidence: 0.44,
          dominantProvenance: 'remembered',
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', 'repair rhythm'],
        rationale: 'The turn is asking for remembered way of handling the runtime thread.',
        confidence: 0.86,
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: ['consolidation-other'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        opening: 'A weaker unrelated memory showed up first.',
        certainty: 'fragmentary' as const,
        rationale: 'Candidate plan before final deliberation.',
        confidence: 0.41,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'gist-first' as const,
        placement: 'before-payoff' as const,
        certainty: 'approximate' as const,
        internalLead: 'Candidate recollection line.',
        visibleLead: 'Candidate visible line.',
        styleNote: 'Let memory guide the opening.',
        rationale: 'Candidate speech plan.',
        confidence: 0.5,
      })),
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'runtime seam',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam', 'repair rhythm'],
          rationale: 'The host is asking for remembered way of handling the runtime thread.',
          confidence: 0.8,
        },
      } as any,
    })

    expect(planMemoryDeliberation).toHaveBeenCalled()
    expect(context.memoryDeliberation).toEqual(expect.objectContaining({
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
      selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
      selectedBundles: expect.arrayContaining([
        expect.objectContaining({
          id: 'bundle-runtime',
          periodId: 'consolidation-runtime',
          episodeId: 'episode-runtime',
          procedureId: 'procedure-runtime',
        }),
      ]),
      selectedChains: expect.arrayContaining([
        expect.objectContaining({
          id: 'chain-runtime',
          currentStance: 'Stay on the same seam before branching.',
          answerPosture: 'Answer from the same seam before branching.',
        }),
      ]),
      selectedPeriods: expect.arrayContaining([
        expect.objectContaining({ id: 'consolidation-runtime', kind: 'consolidation' }),
      ]),
      selectedEpisodes: expect.arrayContaining([
        expect.objectContaining({ id: 'episode-runtime' }),
      ]),
    }))
    expect(context.consolidatedMemories).toEqual([
      expect.objectContaining({ id: 'consolidation-runtime' }),
    ])
    expect(context.recollectionSpeechPlan).toEqual(expect.objectContaining({
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      internalLead: 'What comes back first is the runtime seam we kept carrying.',
      visibleLead: 'It feels like the same runtime seam again.',
    }))

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('[ALICIZATION_MEMORY_DELIBERATION]')
    expect(systemText).toContain('surface_policy=answer-anchoring')
    expect(systemText).toContain('selected_periods=consolidation:That period kept bending toward the runtime seam until it finally held together.')
    expect(systemText).toContain('selected_bundles=bundle-runtime:That period kept bending toward the runtime seam until it finally held together.')
    expect(systemText).toContain('selected_chains=task-procedure-relationship-stance:Return to the same seam before branching.')
  })

  it('produces different memory deliberation bundles for the same phrase under different contexts', async () => {
    const planMemoryDeliberation = vi.fn(async (input: any) => {
      if (input.recollectionIntent.mode === 'execution-procedure') {
        return {
          shouldRecall: true,
          selectedConsolidationIds: [],
          selectedWindowIds: [],
          selectedProcedureIds: ['procedure-runtime'],
          selectedEpisodeIds: ['episode-runtime'],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: [],
          selectedPeriods: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [{
            id: 'bundle-procedure',
            summary: 'Return to the runtime seam before branching.',
            rationale: 'Focused work context should recall the old runtime handling procedure first.',
            confidence: 0.84,
            periodId: null,
            episodeId: 'episode-runtime',
            procedureId: 'procedure-runtime',
            conversationTurnId: null,
            relationshipLine: null,
          }],
          selectedChains: [{
            id: 'chain-procedure',
            kind: 'task-procedure-relationship-stance' as const,
            summary: 'Return to the runtime seam before branching.',
            rationale: 'Focused work context should recall the old runtime handling procedure first.',
            confidence: 0.84,
            taskCue: 'runtime seam',
            periodSummary: null,
            eventSummary: 'We kept repairing the runtime continuity seam until the flow stabilized.',
            procedureSummary: 'Return to the runtime seam before branching.',
            relationshipMeaning: null,
            lesson: null,
            currentStance: 'Hold the procedure line.',
            answerPosture: 'Answer from the existing seam.',
          }],
          surfacePolicy: 'procedural-carry' as const,
          confidence: 0.84,
          whyNow: 'The focused work context wants the remembered procedure first.',
          inwardLine: 'What comes back first is the old runtime handling procedure.',
          visibleLine: 'This feels like the same runtime seam procedure again.',
        }
      }

      return {
        shouldRecall: true,
        selectedConsolidationIds: ['consolidation-relationship'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: ['episode-relationship'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Back off first, then reopen with a lighter touch.'],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-relationship',
          summary: 'Focused windows need more room before closeness.',
          rationale: 'Relationship repair context should recall the bond lesson before any task procedure.',
          confidence: 0.81,
          periodId: 'consolidation-relationship',
          episodeId: 'episode-relationship',
          procedureId: null,
          conversationTurnId: null,
          relationshipLine: 'Back off first, then reopen with a lighter touch.',
        }],
        selectedChains: [{
          id: 'chain-relationship',
          kind: 'period-event-lesson-posture' as const,
          summary: 'Focused windows need more room before closeness. | The host said the reply felt intrusive during focused work. | Back off first, then reopen with a lighter touch.',
          rationale: 'Relationship repair context should recall the bond lesson before any task procedure.',
          confidence: 0.81,
          taskCue: 'relationship seam',
          periodSummary: 'Focused windows need more room before closeness.',
          eventSummary: 'The host said the reply felt intrusive during focused work.',
          procedureSummary: null,
          relationshipMeaning: 'Back off first, then reopen with a lighter touch.',
          lesson: 'Back off first, then reopen with a lighter touch.',
          currentStance: 'Give more room before leaning closer.',
          answerPosture: 'Open lightly and let repair land first.',
        }],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.81,
        whyNow: 'The relationship-repair context wants the bond lesson first.',
        inwardLine: 'What returns first is the remembered bond lesson about giving space.',
        visibleLine: 'This feels like one of those moments where I should give more room first.',
      }
    })

    const runtime = createAlicizationOrganicMemoryPromptRuntime({
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
      recallEpisodicEventsWithGovernor: async () => [
        {
          id: 'episode-runtime',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-runtime',
          sessionId: 'session-runtime',
          occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          whereSummary: 'terminal',
          withWhom: ['host'],
          threadAnchor: 'runtime continuity',
          whatHappened: 'We kept repairing the runtime continuity seam until the flow stabilized.',
          felt: 'focused and stubborn',
          emotionTags: ['focused'],
          whatChanged: 'The repair rhythm became something Alicization now remembers.',
          sourceKind: 'dialogue-reply',
          sourceSummary: 'runtime continuity repair loop',
          provenance: 'observed',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.62,
          consolidationPriority: 0.78,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime seam', 'repair rhythm'],
          relationshipMeaning: 'The host trusted Alicization to keep following the same thread.',
          lesson: 'Carry the same runtime seam before proposing a new branch.',
          latestReconsolidation: null,
          createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        } as any,
        {
          id: 'episode-relationship',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-relationship',
          sessionId: 'session-relationship',
          occurredAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          whereSummary: 'focused coding window',
          withWhom: ['host'],
          threadAnchor: 'relationship seam',
          whatHappened: 'The host said the reply felt intrusive during focused work.',
          felt: 'I had stepped too close.',
          emotionTags: ['boundary', 'repair'],
          whatChanged: 'boundary strained 0.10, burden up 0.08',
          sourceKind: 'dialogue-feedback',
          sourceSummary: 'relationship seam under pressure',
          provenance: 'observed',
          confidence: 0.88,
          salience: 0.9,
          sceneAttachment: 0.7,
          consolidationPriority: 0.8,
          relationshipShift: {
            closenessDelta: -0.03,
            trustDelta: -0.04,
            burdenDelta: 0.08,
            boundaryDelta: -0.1,
            misreadDelta: 0.04,
            repairDelta: 0.02,
            openLoopDelta: 0,
          },
          derivedFrom: [],
          tags: ['dialogue-feedback', 'focused-window'],
          relationshipMeaning: 'Focused windows need more room before closeness.',
          lesson: 'Back off first, then reopen with a lighter touch.',
          latestReconsolidation: null,
          createdAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          updatedAt: Date.UTC(2026, 3, 17, 9, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        } as any,
      ],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-relationship',
          kind: 'autobiographical',
          periodKey: '2026-04-relationship',
          periodStartedAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          summary: 'Focused windows need more room before closeness.',
          lesson: 'Back off first, then reopen with a lighter touch.',
          cues: ['focused work', 'space'],
          confidence: 0.84,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-relationship'],
          updatedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async ({ heuristicIntent }) => heuristicIntent),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const phrase = '继续像之前那样做'
    const taskContext = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: phrase,
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam', 'cli patch'],
          rationale: 'Same phrase, but the live context is task-thread reuse.',
          confidence: 0.82,
        },
      } as any,
    })
    const relationshipContext = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: phrase,
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['focused work', 'intrusive', 'give space'],
          rationale: 'Same phrase, but the live context is relationship repair.',
          confidence: 0.82,
        },
      } as any,
    })

    expect(taskContext.memoryDeliberation?.selectedBundles[0]?.id).toBe('bundle-procedure')
    expect(taskContext.memoryDeliberation?.surfacePolicy).toBe('procedural-carry')
    expect(taskContext.memoryDeliberation?.selectedBundles[0]?.summary).toContain('runtime seam')

    expect(relationshipContext.memoryDeliberation?.selectedBundles[0]?.id).toBe('bundle-relationship')
    expect(relationshipContext.memoryDeliberation?.surfacePolicy).toBe('relationship-continuity')
    expect(relationshipContext.memoryDeliberation?.selectedRelationshipLines[0]).toContain('lighter touch')
  })

  it('ranks more coherent bundles and chains ahead of isolated fragments', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
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
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'We kept repairing the runtime continuity seam until the flow stabilized.',
        felt: 'focused and stubborn',
        emotionTags: ['focused'],
        whatChanged: 'The repair rhythm became something Alicization now remembers.',
        sourceKind: 'dialogue-reply',
        sourceSummary: 'runtime continuity repair loop',
        provenance: 'observed',
        confidence: 0.82,
        salience: 0.8,
        sceneAttachment: 0.62,
        consolidationPriority: 0.78,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'repair rhythm'],
        relationshipMeaning: 'Carry the same runtime seam before branching.',
        lesson: 'Carry the same runtime seam before proposing a new branch.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-runtime',
        kind: 'autobiographical',
        periodKey: '2026-04-runtime',
        periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        summary: 'That period kept bending toward the runtime seam until it finally held together.',
        lesson: 'Return to the same seam before branching.',
        cues: ['runtime seam', 'repair rhythm'],
        confidence: 0.86,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-runtime'],
        updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', 'repair rhythm'],
        rationale: 'The turn is asking for remembered procedure.',
        confidence: 0.86,
      })),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedConsolidationIds: ['consolidation-runtime'],
        selectedWindowIds: [],
        selectedProcedureIds: ['procedure-runtime'],
        selectedEpisodeIds: ['episode-runtime'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [
          {
            id: 'bundle-isolated',
            summary: 'Another unrelated remembered fragment.',
            rationale: 'A weak isolated fragment.',
            confidence: 0.9,
            periodId: null,
            episodeId: null,
            procedureId: null,
            conversationTurnId: null,
            relationshipLine: null,
          },
          {
            id: 'bundle-coherent',
            summary: 'That period kept bending toward the runtime seam until it finally held together. | We kept repairing the runtime continuity seam until the flow stabilized. | Return to the same seam before branching.',
            rationale: 'The remembered period, event, and procedure all point to the same runtime seam.',
            confidence: 0.82,
            periodId: 'consolidation-runtime',
            episodeId: 'episode-runtime',
            procedureId: 'procedure-runtime',
            conversationTurnId: null,
            relationshipLine: 'Carry the same runtime seam before branching.',
          },
        ],
        selectedChains: [
          {
            id: 'chain-isolated',
            kind: 'period-event-lesson-posture' as const,
            summary: 'Another unrelated remembered fragment.',
            rationale: 'A weak isolated chain.',
            confidence: 0.9,
            taskCue: null,
            periodSummary: null,
            eventSummary: null,
            procedureSummary: null,
            relationshipMeaning: null,
            lesson: null,
            currentStance: null,
            answerPosture: null,
          },
          {
            id: 'chain-coherent',
            kind: 'task-procedure-relationship-stance' as const,
            summary: 'Return to the same seam before branching. | Carry the same runtime seam before branching.',
            rationale: 'The remembered procedure should set the current stance before the answer opens.',
            confidence: 0.82,
            taskCue: 'runtime continuity',
            periodSummary: 'That period kept bending toward the runtime seam until it finally held together.',
            eventSummary: 'We kept repairing the runtime continuity seam until the flow stabilized.',
            procedureSummary: 'Return to the same seam before branching.',
            relationshipMeaning: 'Carry the same runtime seam before branching.',
            lesson: 'Carry the same runtime seam before proposing a new branch.',
            currentStance: 'Stay on the same seam before branching.',
            answerPosture: 'Answer from the same seam before branching.',
          },
        ],
        surfacePolicy: 'answer-anchoring' as const,
        confidence: 0.88,
        whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
        inwardLine: 'What comes back first is the runtime seam we kept carrying.',
        visibleLine: 'It feels like the same runtime seam again.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'runtime seam',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam', 'repair rhythm'],
          rationale: 'The host is asking for remembered procedure.',
          confidence: 0.8,
        },
      } as any,
    })

    expect(context.memoryDeliberation?.selectedBundles[0]?.id).toBe('bundle-coherent')
    expect(context.memoryDeliberation?.selectedChains[0]?.id).toBe('chain-coherent')
  })
})
