import { describe, expect, it } from 'vitest'

import { replayMainChatSession } from './main-chat-session-replay-harness'

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
              selectedConsolidationIds: ['consolidation-conversation'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-conversation'],
              selectedConversationTurnIds: ['turn-history-1'],
              selectedRelationshipLines: [],
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
              selectedConsolidationIds: [],
              selectedWindowIds: [],
              selectedProcedureIds: ['procedure-runtime'],
              selectedEpisodeIds: ['episode-procedure'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['Return to the same seam before branching.'],
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
              selectedConsolidationIds: [],
              selectedWindowIds: [],
              selectedProcedureIds: ['procedure-runtime'],
              selectedEpisodeIds: [],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: [],
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
              selectedConsolidationIds: ['consolidation-relationship'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-relationship'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['Back off first, then reopen with a lighter touch.'],
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
              selectedConsolidationIds: ['consolidation-bond'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-bond'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['The host needed space before closeness.'],
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
    expect(turn?.runtimeSurface.governance?.mustDo.some(item => item.includes('Memory deliberation:'))).toBe(true)
  })
})
