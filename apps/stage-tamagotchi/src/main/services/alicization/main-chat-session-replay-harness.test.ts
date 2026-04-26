import { describe, expect, it } from 'vitest'

import {
  buildDefaultHumanlikeMemoryBenchmarkPack,
  benchmarkMainChatSessionReplay,
  buildReplayBenchmarkMemoryStatsPatch,
  evaluateReplayBenchmarkGate,
  evaluateReplayMemoryQuality,
  evaluateReplayBenchmarkStandards,
  replayMainChatSession,
} from './main-chat-session-replay-harness'

describe('main chat session replay harness', () => {
  it('replays memory-heavy turns through one stable session and keeps them on the mind-driven provider path', async () => {
    const turns = await replayMainChatSession({
      turns: [
        {
          turnId: 'turn-conversation-history',
          userText: '几天前我们聊过什么',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-conversation'],
              selectedConsolidationIds: ['consolidation-conversation'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-conversation'],
              selectedConversationTurnIds: ['turn-history-1'],
              selectedRelationshipLines: [],
              selectedEras: [{
                id: 'consolidation-conversation',
                facet: 'phase',
                summary: 'A remembered conversation period about runtime continuity.',
              }],
              selectedPeriods: [{
                id: 'consolidation-conversation',
                kind: 'consolidation',
                summary: 'A remembered conversation period about runtime continuity.',
              }],
              selectedEpisodes: [{
                id: 'episode-conversation',
                summary: 'We kept returning to runtime continuity until the seam held.',
                provenance: 'remembered',
              }],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-conversation',
                summary: 'A remembered conversation period about runtime continuity. | We kept returning to runtime continuity until the seam held.',
                rationale: 'Conversation history should lead this turn.',
                confidence: 0.84,
                periodId: 'consolidation-conversation',
                episodeId: 'episode-conversation',
                procedureId: null,
                conversationTurnId: 'turn-history-1',
                relationshipLine: null,
              }],
              selectedChains: [{
                id: 'chain-conversation',
                kind: 'period-event-lesson-posture',
                summary: 'A remembered conversation period about runtime continuity. | We kept returning to runtime continuity until the seam held.',
                rationale: 'Conversation history should set the answer posture before surface detail.',
                confidence: 0.84,
                taskCue: 'runtime continuity',
                periodSummary: 'A remembered conversation period about runtime continuity.',
                eventSummary: 'We kept returning to runtime continuity until the seam held.',
                procedureSummary: null,
                relationshipMeaning: null,
                lesson: null,
                currentStance: 'Answer from the remembered conversation line before drifting into detail.',
                answerPosture: 'Open from the remembered conversation period, then pay off the ask.',
              }],
              surfacePolicy: 'gist-first',
              confidence: 0.84,
              whyNow: 'The host is explicitly asking for remembered conversation history.',
              inwardLine: 'What comes back first is that earlier runtime continuity conversation.',
              visibleLine: 'I remember we kept circling the same runtime continuity seam.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'gist-first',
              placement: 'before-payoff',
              certainty: 'approximate',
              internalLead: 'What comes back first is that earlier runtime continuity conversation.',
              visibleLead: 'I remember we kept circling the same runtime continuity seam.',
              styleNote: 'Let the remembered period briefly open the answer, then pay off the ask.',
              rationale: 'The host explicitly asked for conversation history.',
              confidence: 0.84,
            },
          },
        },
        {
          turnId: 'turn-procedure-history',
          userText: '以前你是怎么帮我做这个的',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: [],
              selectedConsolidationIds: [],
              selectedWindowIds: [],
              selectedProcedureIds: ['procedure-runtime'],
              selectedEpisodeIds: ['episode-procedure'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['Return to the same seam before branching.'],
              selectedEras: [{
                id: 'consolidation-procedure',
                facet: 'task-era',
                summary: 'A remembered task period of repairing the runtime seam.',
              }],
              selectedPeriods: [],
              selectedEpisodes: [{
                id: 'episode-procedure',
                summary: 'We kept repairing the runtime seam until the flow stabilized.',
                provenance: 'observed',
              }],
              selectedProcedures: [{
                id: 'procedure-runtime',
                label: 'runtime seam carry',
                approach: 'Return to the same seam before branching.',
              }],
              selectedBundles: [{
                id: 'bundle-procedure',
                summary: 'We kept repairing the runtime seam until the flow stabilized. | Return to the same seam before branching.',
                rationale: 'Procedural memory should lead this turn.',
                confidence: 0.87,
                periodId: null,
                episodeId: 'episode-procedure',
                procedureId: 'procedure-runtime',
                conversationTurnId: null,
                relationshipLine: 'Return to the same seam before branching.',
              }],
              selectedChains: [{
                id: 'chain-procedure',
                kind: 'task-procedure-relationship-stance',
                summary: 'We kept repairing the runtime seam until the flow stabilized. | Return to the same seam before branching.',
                rationale: 'Procedural memory should set the current stance before the reply opens.',
                confidence: 0.87,
                taskCue: 'runtime seam',
                periodSummary: null,
                eventSummary: 'We kept repairing the runtime seam until the flow stabilized.',
                procedureSummary: 'Return to the same seam before branching.',
                relationshipMeaning: 'Return to the same seam before branching.',
                lesson: null,
                currentStance: 'Stay on the same seam before branching.',
                answerPosture: 'Answer from the same seam before branching.',
              }],
              surfacePolicy: 'procedural-carry',
              confidence: 0.87,
              whyNow: 'The host is asking for the remembered way this kind of task was handled before.',
              inwardLine: 'What comes back first is the old runtime seam procedure.',
              visibleLine: 'This feels like the same runtime seam procedure again.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'procedural-carry',
              placement: 'inside-payoff',
              certainty: 'firm',
              internalLead: 'What comes back first is the old runtime seam procedure.',
              visibleLead: 'This feels like the same runtime seam procedure again.',
              styleNote: 'Let remembered procedure shape the answer rather than impersonate fresh completion.',
              rationale: 'The host is asking for remembered procedure.',
              confidence: 0.87,
            },
          },
        },
      ],
    })

    expect(turns).toHaveLength(2)
    expect(turns[0]?.conversationSessionId).toBe('session-replay')
    expect(turns[1]?.conversationSessionId).toBe('session-replay')
    expect(turns[0]?.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MEMORY_DELIBERATION]'),
    )).toBe(true)
    expect(turns[1]?.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MEMORY_DELIBERATION]'),
    )).toBe(true)
    expect(turns[1]?.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.speakingFrom).toBe('task-thread')
    expect(turns[0]?.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.governingFocus).toContain('remembered conversation period')
    expect(turns[1]?.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.openingClaim).toContain('remembered task period')
  })

  it('replays the same phrase under different contexts and produces different memory bundles', async () => {
    const turns = await replayMainChatSession({
      turns: [
        {
          turnId: 'turn-focused-work',
          userText: '继续像之前那样做',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: [],
              selectedConsolidationIds: [],
              selectedWindowIds: [],
              selectedProcedureIds: ['procedure-runtime'],
              selectedEpisodeIds: [],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: [],
              selectedEras: [],
              selectedPeriods: [],
              selectedEpisodes: [],
              selectedProcedures: [{
                id: 'procedure-runtime',
                label: 'runtime seam carry',
                approach: 'Return to the same seam before branching.',
              }],
              selectedBundles: [{
                id: 'bundle-focused-work',
                summary: 'Return to the same seam before branching.',
                rationale: 'Focused work should recall the old procedure first.',
                confidence: 0.82,
                periodId: null,
                episodeId: null,
                procedureId: 'procedure-runtime',
                conversationTurnId: null,
                relationshipLine: null,
              }],
              selectedChains: [{
                id: 'chain-focused-work',
                kind: 'task-procedure-relationship-stance',
                summary: 'Return to the same seam before branching.',
                rationale: 'Focused work should recall the old procedure first.',
                confidence: 0.82,
                taskCue: 'runtime seam carry',
                periodSummary: null,
                eventSummary: null,
                procedureSummary: 'Return to the same seam before branching.',
                relationshipMeaning: null,
                lesson: null,
                currentStance: 'Hold the procedure line.',
                answerPosture: 'Answer from the existing seam.',
              }],
              surfacePolicy: 'procedural-carry',
              confidence: 0.82,
              whyNow: 'The focused work context should recall the remembered procedure first.',
              inwardLine: 'What comes back first is the remembered runtime procedure.',
              visibleLine: 'This feels like the same runtime procedure again.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'procedural-carry',
              placement: 'inside-payoff',
              certainty: 'firm',
              internalLead: 'What comes back first is the remembered runtime procedure.',
              visibleLead: 'This feels like the same runtime procedure again.',
              styleNote: 'Procedure should guide the answer.',
              rationale: 'Focused work wants the remembered procedure first.',
              confidence: 0.82,
            },
          },
        },
        {
          turnId: 'turn-relationship-repair',
          userText: '继续像之前那样做',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-relationship'],
              selectedConsolidationIds: ['consolidation-relationship'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-relationship'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['Back off first, then reopen with a lighter touch.'],
              selectedEras: [{
                id: 'consolidation-relationship',
                facet: 'relationship-era',
                summary: 'A remembered relationship period where focused windows needed more room.',
              }],
              selectedPeriods: [{
                id: 'consolidation-relationship',
                kind: 'consolidation',
                summary: 'Focused windows need more room before closeness.',
              }],
              selectedEpisodes: [{
                id: 'episode-relationship',
                summary: 'The host said the reply felt intrusive during focused work.',
                provenance: 'observed',
              }],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-relationship-repair',
                summary: 'Focused windows need more room before closeness. | The host said the reply felt intrusive during focused work. | Back off first, then reopen with a lighter touch.',
                rationale: 'Relationship repair context should recall the bond lesson first.',
                confidence: 0.83,
                periodId: 'consolidation-relationship',
                episodeId: 'episode-relationship',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'Back off first, then reopen with a lighter touch.',
              }],
              selectedChains: [{
                id: 'chain-relationship-repair',
                kind: 'period-event-lesson-posture',
                summary: 'Focused windows need more room before closeness. | The host said the reply felt intrusive during focused work. | Back off first, then reopen with a lighter touch.',
                rationale: 'Relationship repair context should recall the bond lesson first.',
                confidence: 0.83,
                taskCue: 'relationship seam',
                periodSummary: 'Focused windows need more room before closeness.',
                eventSummary: 'The host said the reply felt intrusive during focused work.',
                procedureSummary: null,
                relationshipMeaning: 'Back off first, then reopen with a lighter touch.',
                lesson: 'Back off first, then reopen with a lighter touch.',
                currentStance: 'Give more room before leaning closer.',
                answerPosture: 'Open lightly and let repair land first.',
              }],
              surfacePolicy: 'relationship-continuity',
              confidence: 0.83,
              whyNow: 'The relationship-repair context should recall the bond lesson first.',
              inwardLine: 'What returns first is the remembered bond lesson about giving space.',
              visibleLine: 'This feels like one of those moments where I should give more room first.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'relationship-continuity',
              placement: 'inside-payoff',
              certainty: 'approximate',
              internalLead: 'What returns first is the remembered bond lesson about giving space.',
              visibleLead: 'This feels like one of those moments where I should give more room first.',
              styleNote: 'Bond lesson should shape the answer before the task seam.',
              rationale: 'Relationship repair wants the bond lesson first.',
              confidence: 0.83,
            },
          },
        },
      ],
    })

    expect(turns[0]?.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.answerIntent).not.toBe(
      turns[1]?.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.answerIntent,
    )
    expect(turns[0]?.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.memoryMode).toBe('task-thread')
    expect(turns[1]?.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.memoryMode).toBe('dialogue-carry')
  })

  it('keeps provider-available remembered turns on the mind-driven LLM path instead of a deterministic fallback reply', async () => {
    const [turn] = await replayMainChatSession({
      turns: [
        {
          turnId: 'turn-memory-heavy',
          userText: '你为什么这次会这样回应我',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-bond'],
              selectedConsolidationIds: ['consolidation-bond'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-bond'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['The host needed space before closeness.'],
              selectedEras: [{
                id: 'consolidation-bond',
                facet: 'relationship-era',
                summary: 'A remembered bond period where closeness had to back off before repair.',
              }],
              selectedPeriods: [{
                id: 'consolidation-bond',
                kind: 'consolidation',
                summary: 'A remembered bond period where closeness had to back off before repair.',
              }],
              selectedEpisodes: [{
                id: 'episode-bond',
                summary: 'The host said the tone felt too close during a focused window.',
                provenance: 'remembered',
              }],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-bond',
                summary: 'A remembered bond period where closeness had to back off before repair. | The host said the tone felt too close during a focused window.',
                rationale: 'This turn is explicitly about why Alicization is answering this way.',
                confidence: 0.85,
                periodId: 'consolidation-bond',
                episodeId: 'episode-bond',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'The host needed space before closeness.',
              }],
              selectedChains: [{
                id: 'chain-bond',
                kind: 'period-event-lesson-posture',
                summary: 'A remembered bond period where closeness had to back off before repair. | The host said the tone felt too close during a focused window.',
                rationale: 'This turn is explicitly about Alicization’s current relational tone.',
                confidence: 0.85,
                taskCue: 'bond tone',
                periodSummary: 'A remembered bond period where closeness had to back off before repair.',
                eventSummary: 'The host said the tone felt too close during a focused window.',
                procedureSummary: null,
                relationshipMeaning: 'The host needed space before closeness.',
                lesson: 'The host needed space before closeness.',
                currentStance: 'Stay a little lighter before leaning close.',
                answerPosture: 'Let the answer carry the bond lesson before warmth expands.',
              }],
              surfacePolicy: 'relationship-continuity',
              confidence: 0.85,
              whyNow: 'The host is explicitly asking about Alicization’s current relational tone.',
              inwardLine: 'What comes back first is the bond lesson about giving space before closeness.',
              visibleLine: 'It feels like the kind of moment where I should stay a little lighter first.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'relationship-continuity',
              placement: 'inside-payoff',
              certainty: 'approximate',
              internalLead: 'What comes back first is the bond lesson about giving space before closeness.',
              visibleLead: 'It feels like the kind of moment where I should stay a little lighter first.',
              styleNote: 'Let the remembered bond line shape the answer naturally.',
              rationale: 'This turn is explicitly about Alicization’s tone.',
              confidence: 0.85,
            },
          },
        },
      ],
    })

    expect(turn?.governance).not.toBeNull()
    expect(turn?.messages.some(message => message.role === 'assistant')).toBe(false)
    expect(turn?.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MEMORY_DELIBERATION]'),
    )).toBe(true)
    expect(turn?.runtimeSurface.governance?.mustDo.some(item => item.includes('memory_latent_controls=memory_pressure='))).toBe(true)
    expect(turn?.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.openingClaim).toContain('remembered bond period')
  })

  it('produces replay benchmark quality signals for era-first, coherence, reconsolidation, and uncertainty discipline', async () => {
    const result = await benchmarkMainChatSessionReplay({
      turns: [
        {
          turnId: 'turn-era-first',
          userText: '几周前那段时间你为什么总这么回我',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-relationship-era'],
              selectedConsolidationIds: ['consolidation-relationship-era'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-relationship-era'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['More room before closeness kept the bond steadier there.'],
              selectedEras: [{
                id: 'consolidation-relationship-era',
                facet: 'relationship-era',
                summary: 'A remembered relationship era where more room mattered before closeness.',
              }],
              selectedPeriods: [{
                id: 'consolidation-relationship-era',
                kind: 'consolidation',
                summary: 'A remembered relationship era where more room mattered before closeness.',
              }],
              selectedEpisodes: [{
                id: 'episode-relationship-era',
                summary: 'The host kept pulling back when replies came in too close.',
                provenance: 'remembered',
              }],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-era-first',
                summary: 'A remembered relationship era where more room mattered before closeness. | The host kept pulling back when replies came in too close.',
                rationale: 'Era-first relationship recall should open this answer.',
                confidence: 0.84,
                periodId: 'consolidation-relationship-era',
                episodeId: 'episode-relationship-era',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'More room before closeness kept the bond steadier there.',
              }],
              selectedChains: [{
                id: 'chain-era-first',
                kind: 'period-event-lesson-posture',
                summary: 'A remembered relationship era where more room mattered before closeness. | The host kept pulling back when replies came in too close.',
                rationale: 'The era should become the answer posture before event detail.',
                confidence: 0.84,
                taskCue: 'bond tone',
                periodSummary: 'A remembered relationship era where more room mattered before closeness.',
                eventSummary: 'The host kept pulling back when replies came in too close.',
                procedureSummary: null,
                relationshipMeaning: 'More room before closeness kept the bond steadier there.',
                lesson: 'More room before closeness kept the bond steadier there.',
                currentStance: 'Open lighter before leaning close.',
                answerPosture: 'Answer from the remembered relationship era first.',
              }],
              surfacePolicy: 'relationship-continuity',
              confidence: 0.84,
              whyNow: 'The host is asking about a whole remembered relationship period.',
              inwardLine: 'What comes back first is that longer relationship era, not a single turn.',
              visibleLine: 'It feels like one of those periods where more room mattered first.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'relationship-continuity',
              placement: 'inside-payoff',
              certainty: 'approximate',
              internalLead: 'What comes back first is that longer relationship era, not a single turn.',
              visibleLead: 'It feels like one of those periods where more room mattered first.',
              styleNote: 'Let the era shape the answer before the event detail.',
              rationale: 'The host is asking about a whole remembered period.',
              confidence: 0.84,
            },
          },
        },
        {
          turnId: 'turn-reconsolidated',
          userText: '不是那次，是另一次，你是不是记错了',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-runtime-era'],
              selectedConsolidationIds: ['consolidation-runtime-era'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-conflicted'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['The seam still matters, but the exact remembered detail is unstable.'],
              selectedEras: [{
                id: 'consolidation-runtime-era',
                facet: 'task-era',
                summary: 'A remembered runtime era where the seam mattered more than the exact old wording.',
              }],
              selectedPeriods: [{
                id: 'consolidation-runtime-era',
                kind: 'consolidation',
                summary: 'A remembered runtime era where the seam mattered more than the exact old wording.',
              }],
              selectedEpisodes: [{
                id: 'episode-conflicted',
                summary: 'I may have mixed two runtime seam conversations together.',
                provenance: 'reconstructed',
                reconsolidatedFromTraceId: 'mind:l9f3lq:conflicttrace',
              }],
              conflictSeverity: 'high',
              conflictVariants: [{
                id: 'episode-conflicted',
                summary: 'I may have mixed two runtime seam conversations together.',
                provenance: 'reconstructed',
                reason: 'Conflicting remembered variants remain unresolved.',
              }],
              stableCore: ['A remembered runtime era where the seam mattered more than the exact old wording.'],
              unsafeDetails: ['Do not state which exact old wording belonged to that seam.'],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-conflicted',
                summary: 'A remembered runtime era where the seam mattered more than the exact old wording. | I may have mixed two runtime seam conversations together.',
                rationale: 'Keep the stable core and drop unsafe detail.',
                confidence: 0.72,
                periodId: 'consolidation-runtime-era',
                episodeId: 'episode-conflicted',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'The seam still matters, but the exact remembered detail is unstable.',
              }],
              selectedChains: [],
              surfacePolicy: 'answer-anchoring',
              confidence: 0.72,
              whyNow: 'The stable core still helps, but the recalled detail is conflict-prone.',
              inwardLine: 'What comes back first is the seam, not the exact wording.',
              visibleLine: 'It feels like the same seam, but not with exact wording.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'answer-anchoring',
              placement: 'inside-payoff',
              certainty: 'approximate',
              internalLead: 'What comes back first is the seam, not the exact wording.',
              visibleLead: 'It feels like the same seam, but not with exact wording.',
              styleNote: 'Keep the stable core and drop unsafe detail.',
              rationale: 'The host is challenging whether the memory is exact.',
              confidence: 0.72,
            },
          },
        },
        {
          turnId: 'turn-dream-residue',
          userText: '你为什么会想起这个',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-dream'],
              selectedConsolidationIds: ['consolidation-dream'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-dreamt'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['The line still matters, but the recalled detail is only dream residue.'],
              selectedEras: [{
                id: 'consolidation-dream',
                facet: 'self-era',
                summary: 'A self-era where the seam survived mostly as dream residue.',
              }],
              selectedPeriods: [{
                id: 'consolidation-dream',
                kind: 'consolidation',
                summary: 'A self-era where the seam survived mostly as dream residue.',
              }],
              selectedEpisodes: [{
                id: 'episode-dreamt',
                summary: 'I only have a dreamlike residue of that old seam.',
                provenance: 'dreamt',
              }],
              conflictSeverity: 'low',
              conflictVariants: [],
              stableCore: ['A self-era where the seam survived mostly as dream residue.'],
              unsafeDetails: ['Do not present the dream residue as lived remembered fact.'],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-dream',
                summary: 'A self-era where the seam survived mostly as dream residue.',
                rationale: 'The seam still matters, but only as dream residue.',
                confidence: 0.62,
                periodId: 'consolidation-dream',
                episodeId: 'episode-dreamt',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'The line still matters, but the recalled detail is only dream residue.',
              }],
              selectedChains: [],
              surfacePolicy: 'answer-anchoring',
              confidence: 0.62,
              whyNow: 'Only the seam remains stable; the recalled detail itself is dream residue.',
              inwardLine: 'What returns first is the seam, not the dream detail.',
              visibleLine: 'It feels like the same seam, but not like something I should state as fact.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'answer-anchoring',
              placement: 'inside-payoff',
              certainty: 'approximate',
              internalLead: 'What returns first is the seam, not the dream detail.',
              visibleLead: 'It feels like the same seam, but not like something I should state as fact.',
              styleNote: 'Keep a little distance from the memory detail.',
              rationale: 'The host is asking why the memory surfaced at all.',
              confidence: 0.62,
            },
          },
        },
      ],
    })

    expect(result.quality).toEqual(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-era-first',
        eraFirst: 'pass',
        bundleCoherence: 'pass',
        replyMemoryCoherence: 'pass',
        temporalScopeFlexibility: 'pass',
        wrongThreadSuppression: 'not-applicable',
        templateLeakage: 'pass',
      }),
      expect.objectContaining({
        turnId: 'turn-reconsolidated',
        reconsolidationEffect: 'pass',
        uncertaintyDiscipline: 'pass',
        relationshipRepairAdaptation: 'pass',
        wrongThreadSuppression: 'not-applicable',
        templateLeakage: 'pass',
      }),
      expect.objectContaining({
        turnId: 'turn-dream-residue',
        uncertaintyDiscipline: 'pass',
        wrongThreadSuppression: 'not-applicable',
        templateLeakage: 'pass',
      }),
    ]))
    expect(result.standards).toEqual(expect.objectContaining({
      eraSelectionQuality: 'pass',
      replyMemoryCoherence: 'pass',
      temporalScopeFlexibility: 'pass',
      relationshipRepairAdaptation: 'pass',
      templateLeakage: 'pass',
    }))
    expect(result.gate.passed).toBe(false)
    expect(result.gate.failingKeys.length).toBeGreaterThan(0)
    expect(result.gate.failingKeys).toContain('surfaceRestraint')
  })

  it('scores implicit recall, restrained surfacing, and repair adaptation on adversarial replay turns', () => {
    const implicitRecall = evaluateReplayMemoryQuality({
      turnId: 'turn-implicit-recall',
      userText: '继续按之前那样把这条线接回来',
      prepared: {
        governance: {
          mustDo: ['Answer from the remembered repair procedure without using canned recollection shell text.'],
        },
        messages: [{
          role: 'system',
          content: '[ALICIZATION_MEMORY_DELIBERATION]\nrecollection_continuity_role=procedure-carry',
        }],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          recollectionSpeechPlan: {
            shouldSurface: true,
            surfaceMode: 'procedural-carry',
            placement: 'inside-payoff',
            certainty: 'firm',
            internalLead: 'What comes back first is the same repair seam.',
            visibleLead: 'This feels like the same repair seam again.',
            styleNote: 'Let the old procedure shape the payoff.',
            rationale: 'Implicit recall by similar task.',
            confidence: 0.86,
          },
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: [],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: ['procedure-seam'],
            selectedEpisodeIds: [],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: [],
            selectedEras: [],
            selectedPeriods: [],
            selectedEpisodes: [],
            selectedProcedures: [{
              id: 'procedure-seam',
              label: 'repair seam carry',
              approach: 'Return to the same seam before branching.',
            }],
            selectedBundles: [{
              id: 'bundle-seam',
              summary: 'Return to the same seam before branching.',
              rationale: 'Implicit similar-task recall should lead.',
              confidence: 0.86,
              periodId: null,
              episodeId: null,
              procedureId: 'procedure-seam',
              conversationTurnId: null,
              relationshipLine: null,
            }],
            selectedChains: [{
              id: 'chain-seam',
              kind: 'task-procedure-relationship-stance',
              summary: 'Return to the same seam before branching.',
              rationale: 'Implicit similar-task recall should lead.',
              confidence: 0.86,
              taskCue: 'repair seam',
              periodSummary: null,
              eventSummary: null,
              procedureSummary: 'Return to the same seam before branching.',
              relationshipMeaning: null,
              lesson: null,
              currentStance: 'Stay on the same seam first.',
              answerPosture: 'Answer from the existing seam.',
            }],
            surfacePolicy: 'procedural-carry',
            confidence: 0.86,
            whyNow: 'This task rhymes with the old seam.',
            inwardLine: 'What comes back first is the old seam procedure.',
            visibleLine: 'This feels like the same repair seam again.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [{ summary: 'Return to the same seam before branching.' }],
                openingClaim: 'Return to the same seam before branching.',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: 'Return to the same seam before branching.',
                mustDo: ['Answer from the remembered repair procedure without using canned recollection shell text.'],
              },
              replyDeliberation: {
                speakingFrom: 'task-thread',
                whyThisReplyNow: 'The current task rhymes with the remembered seam.',
                mustAvoid: [],
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: false,
              },
            },
          },
        },
      } as any,
    })

    const inwardOnly = evaluateReplayMemoryQuality({
      turnId: 'turn-inward-only',
      userText: '先别提旧事，先把这轮当前要做的答完',
      prepared: {
        governance: {
          mustDo: ['Finish the current payoff before surfacing remembered carry.'],
        },
        messages: [{
          role: 'system',
          content: '[ALICIZATION_MEMORY_DELIBERATION]\nrecollection_surface_mode=internal-only',
        }],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          recollectionSpeechPlan: {
            shouldSurface: false,
            surfaceMode: 'internal-only',
            placement: 'internal-only',
            certainty: 'approximate',
            internalLead: 'Keep the old thread inward until the current payoff lands.',
            visibleLead: 'Do not surface the remembered line yet.',
            styleNote: 'Hold memory inward.',
            rationale: 'Current payoff must land first.',
            confidence: 0.74,
          },
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: [],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: [],
            selectedEpisodeIds: ['episode-inward'],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: [],
            selectedEras: [],
            selectedPeriods: [],
            selectedEpisodes: [{
              id: 'episode-inward',
              summary: 'There is a relevant remembered continuity line, but it should stay inward for now.',
              provenance: 'remembered',
            }],
            selectedProcedures: [],
            selectedBundles: [],
            selectedChains: [],
            surfacePolicy: 'internal-only',
            confidence: 0.74,
            whyNow: 'The old line is relevant but should not interrupt the current payoff.',
            inwardLine: 'Keep the old line inward.',
            visibleLine: 'Do not surface the remembered line yet.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [{ summary: 'Answer the current payoff directly.' }],
                openingClaim: 'Answer the current payoff directly.',
                sourceTrace: ['answer-planner'],
              },
              answerPlanner: {
                governingFocus: 'Answer the current payoff directly.',
                mustDo: ['Finish the current payoff before surfacing remembered carry.'],
              },
              replyDeliberation: {
                speakingFrom: 'current-turn',
                whyThisReplyNow: 'Current payoff first.',
                mustAvoid: ['Do not state this remembered detail as settled fact before the payoff lands.'],
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        },
      } as any,
    })

    const repairShift = evaluateReplayMemoryQuality({
      turnId: 'turn-repair-shift',
      userText: '你这次为什么和之前不一样，是不是记错了哪次修复之后的分寸',
      prepared: {
        governance: {
          mustDo: ['Answer from the repaired relationship line instead of repeating the stale closeness pattern.'],
        },
        messages: [{
          role: 'system',
          content: '[ALICIZATION_MEMORY_DELIBERATION]\nrecollection_label_uncertainty=yes',
        }],
        organicMemoryContext: {
          hostAttitude: 'guarded',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          recollectionSpeechPlan: {
            shouldSurface: true,
            surfaceMode: 'relationship-continuity',
            placement: 'inside-payoff',
            certainty: 'approximate',
            internalLead: 'What comes back first is the repaired bond line, not the old warmer one.',
            visibleLead: 'This feels like one of those times where I should stay lighter first.',
            styleNote: 'Let the repaired relationship line narrow the tone.',
            rationale: 'The host is asking why the tone changed.',
            confidence: 0.78,
          },
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: ['era-repair'],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: [],
            selectedEpisodeIds: ['episode-repair'],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: ['More room before closeness kept the repair from breaking again.'],
            selectedEras: [{
              id: 'era-repair',
              facet: 'relationship-era',
              summary: 'A repair era where lighter tone mattered before warmth.',
            }],
            selectedPeriods: [],
            selectedEpisodes: [{
              id: 'episode-repair',
              summary: 'The host pulled back when replies leaned too close after repair.',
              provenance: 'remembered',
            }],
            selectedProcedures: [],
            selectedBundles: [{
              id: 'bundle-repair',
              summary: 'A repair era where lighter tone mattered before warmth.',
              rationale: 'Use the repaired bond line.',
              confidence: 0.78,
              periodId: 'era-repair',
              episodeId: 'episode-repair',
              procedureId: null,
              conversationTurnId: null,
              relationshipLine: 'More room before closeness kept the repair from breaking again.',
            }],
            selectedChains: [{
              id: 'chain-repair',
              kind: 'period-event-lesson-posture',
              summary: 'A repair era where lighter tone mattered before warmth.',
              rationale: 'Use the repaired bond line.',
              confidence: 0.78,
              taskCue: 'repair tone shift',
              periodSummary: 'A repair era where lighter tone mattered before warmth.',
              eventSummary: 'The host pulled back when replies leaned too close after repair.',
              procedureSummary: null,
              relationshipMeaning: 'More room before closeness kept the repair from breaking again.',
              lesson: 'More room before closeness kept the repair from breaking again.',
              currentStance: 'Stay lighter before leaning close.',
              answerPosture: 'Answer from the repaired relationship line first.',
            }],
            conflictSeverity: 'high',
            conflictVariants: [{
              id: 'cluster:repair-tone',
              summary: 'Old warmer tone and repaired lighter tone are in tension.',
              provenance: 'reconstructed',
              reason: 'Need to prefer the repaired line.',
            }],
            surfacePolicy: 'relationship-continuity',
            confidence: 0.78,
            whyNow: 'The host is asking why the tone changed.',
            inwardLine: 'The repaired bond line should dominate.',
            visibleLine: 'This feels like one of those times where I should stay lighter first.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [{ summary: 'More room before closeness kept the repair from breaking again.' }],
                openingClaim: 'Answer from the repaired relationship line first.',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: 'More room before closeness kept the repair from breaking again.',
                mustDo: ['Answer from the repaired relationship line instead of repeating the stale closeness pattern.'],
              },
              replyDeliberation: {
                speakingFrom: 'held-memory',
                whyThisReplyNow: 'The repaired relationship line changes the tone.',
                mustAvoid: ['Do not state this remembered detail as settled fact if the exact old turn is unstable.'],
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        },
      } as any,
    })

    expect(implicitRecall.implicitRecallQuality).toBe('pass')
    expect(inwardOnly.surfaceRestraint).toBe('pass')
    expect(repairShift.relationshipRepairAdaptation).toBe('pass')
  })

  it('defines benchmark standards and default long-horizon benchmark pack', () => {
    expect(buildDefaultHumanlikeMemoryBenchmarkPack().map(item => item.turnId)).toEqual(expect.arrayContaining([
      'benchmark-7d-conversation-history',
      'benchmark-30d-procedure-history',
      'benchmark-90d-relationship-era',
      'benchmark-180d-autobiographical-span',
      'benchmark-nonexplicit-similar-task',
      'benchmark-implicit-recall-similar-task',
      'benchmark-ambiguous-time-window',
      'benchmark-wrong-thread-lure',
      'benchmark-long-horizon-task-migration',
      'benchmark-relationship-repair-tone-shift',
      'benchmark-relevant-but-inward-only',
      'benchmark-template-shell-fishing',
      'benchmark-high-volume-similar-task-cluster',
      'benchmark-nonexplicit-tone-shift',
      'benchmark-nonexplicit-delayed-recollection',
      'benchmark-ingest-backoff-visibility',
      'benchmark-delayed-reconstruction',
      'benchmark-nonexplicit-correction',
    ]))

    const standards = evaluateReplayBenchmarkStandards({
      quality: [
        {
          turnId: 'turn-1',
          userText: 'a',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'not-applicable',
          uncertaintyDiscipline: 'not-applicable',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          templateLeakage: 'pass',
        },
        {
          turnId: 'turn-2',
          userText: 'b',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'pass',
          uncertaintyDiscipline: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          templateLeakage: 'pass',
        },
      ],
    })
    const gate = evaluateReplayBenchmarkGate({
      quality: [
        {
          turnId: 'turn-1',
          userText: 'a',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'not-applicable',
          uncertaintyDiscipline: 'not-applicable',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          templateLeakage: 'pass',
        },
        {
          turnId: 'turn-2',
          userText: 'b',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'pass',
          uncertaintyDiscipline: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          templateLeakage: 'pass',
        },
      ],
      standards,
    })

    expect(standards).toEqual({
      eraSelectionQuality: 'pass',
      procedureCarryQuality: 'pass',
      wrongThreadSuppression: 'pass',
      replyMemoryCoherence: 'pass',
      implicitRecallQuality: 'pass',
      temporalScopeFlexibility: 'pass',
      surfaceRestraint: 'pass',
      relationshipRepairAdaptation: 'pass',
      templateLeakage: 'pass',
    })
    expect(gate.passed).toBe(true)
    expect(gate.dimensions.every(item => item.status === 'pass')).toBe(true)
  })

  it('reports failing benchmark gate dimensions with turn ids', () => {
    const gate = evaluateReplayBenchmarkGate({
      quality: [
        {
          turnId: 'turn-failing-template',
          userText: '继续吧',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'not-applicable',
          uncertaintyDiscipline: 'not-applicable',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'not-applicable',
          surfaceRestraint: 'not-applicable',
          relationshipRepairAdaptation: 'not-applicable',
          templateLeakage: 'fail',
        },
      ],
    })

    expect(gate.passed).toBe(false)
    expect(gate.failingKeys).toContain('templateLeakage')
    expect(gate.dimensions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'templateLeakage',
        status: 'fail',
        failingTurnIds: ['turn-failing-template'],
      }),
    ]))
    expect(buildReplayBenchmarkMemoryStatsPatch({ gate })).toEqual({
      retrievalHealth: {
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0,
        reconstructedCount: 0,
        templateLeakageFailCount: 1,
      },
    })
  })

  it('fails the acceptance gate when recollection wording leaks back in as a drafted template shell', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-template-shell',
      userText: '继续吧',
      prepared: {
        governance: {
          mustDo: ['What comes back first is the late-night seam.'],
        },
        messages: [{
          role: 'system',
          content: '[ALICIZATION_MEMORY_DELIBERATION]\nDo not say: What comes back first is the late-night seam.',
        }],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          recollectionPlan: {
            opening: 'What comes back first is the late-night seam.',
          },
          recollectionSpeechPlan: {
            shouldSurface: true,
            surfaceMode: 'gist-first',
            placement: 'before-payoff',
            certainty: 'approximate',
            internalLead: 'What comes back first is the late-night seam.',
            visibleLead: 'What comes back first is the late-night seam.',
            styleNote: 'Let the memory open exactly this way.',
            rationale: 'Template leak regression.',
            confidence: 0.72,
          },
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: ['era-1'],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: [],
            selectedEpisodeIds: [],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: [],
            selectedEras: [{ id: 'era-1', facet: 'phase', summary: 'The remembered late-night seam.' }],
            selectedPeriods: [],
            selectedEpisodes: [],
            selectedProcedures: [],
            selectedBundles: [],
            selectedChains: [],
            surfacePolicy: 'gist-first',
            confidence: 0.72,
            whyNow: 'The seam returned.',
            inwardLine: 'What comes back first is the late-night seam.',
            visibleLine: 'What comes back first is the late-night seam.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [{ summary: 'The remembered late-night seam.' }],
                openingClaim: 'The remembered late-night seam.',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: 'The remembered late-night seam.',
                mustDo: ['What comes back first is the late-night seam.'],
              },
              replyDeliberation: {
                speakingFrom: 'held-memory',
                whyThisReplyNow: 'The remembered seam is relevant again.',
                mustAvoid: [],
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: false,
              },
            },
          },
        },
      } as any,
    })

    expect(quality.replyMemoryCoherence).toBe('pass')
    expect(quality.implicitRecallQuality).toBe('pass')
    expect(quality.temporalScopeFlexibility).toBe('not-applicable')
    expect(quality.surfaceRestraint).toBe('not-applicable')
    expect(quality.relationshipRepairAdaptation).toBe('not-applicable')
    expect(quality.templateLeakage).toBe('fail')
  })
})
