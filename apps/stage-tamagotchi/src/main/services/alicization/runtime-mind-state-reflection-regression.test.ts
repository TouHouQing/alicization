import { describe, expect, it } from 'vitest'

import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('runtime-mind-state reflection regression', () => {
  it('does not let a superseded temporary-noise reflection become the latest carried reflection after persisted runtime recall', async () => {
    const previousVisualPresenceState = createDefaultVisualPresenceState(50_000) as any

    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState,
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-08T15:20:00+08:00',
          system: {
            cpuUsage: 0.18,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'runtime-mind-state.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.9,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.84,
            source: 'screen-semantic-summary',
            summary: 'Returning to the same identity-continuity',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'focused',
            fatigue: 0.14,
            minutesSinceLastUserTurn: 2,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'reflection carry runtime recall',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-reflection-runtime-carry',
            kind: 'problem',
            title: 'Reflection carry continuity',
            summary: 'The runtime should keep the meaningful same-her repair line active instead of reviving newer temporary noise.',
            confidence: 0.84,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['Which persisted reflection should stay active after a temporary same-her wobble was superseded?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async () => null,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [
        {
          id: 'reflection::temporary-noise',
          cardId: 'default',
          decisionTraceId: 'trace::temporary-noise',
          turnId: 'turn::temporary-noise',
          sessionId: 'session::temporary-noise',
          sourceKind: 'maintenance',
          targetScope: 'relationship',
          summary: 'A temporary anxious wobble about the identity-continuity',
          lesson: 'Do not keep the temporary-noise reading as the current governing reflection.',
          status: 'superseded',
          confidence: 0.42,
          supportingFactIds: [],
          supportingOutcomeIds: [],
          createdAt: 88_000,
          updatedAt: 89_000,
          confirmedAt: null,
          deniedAt: null,
        },
        {
          id: 'reflection::same-her-repair',
          cardId: 'default',
          decisionTraceId: 'trace::same-her-repair',
          turnId: 'turn::same-her-repair',
          sessionId: 'session::same-her-repair',
          sourceKind: 'reply',
          targetScope: 'relationship',
          summary: 'The steadier same-her repair line is still the meaningful continuity carry.',
          lesson: 'Keep the same-her repair lesson active instead of reopening from the temporary wobble.',
          status: 'confirmed',
          confidence: 0.9,
          supportingFactIds: [],
          supportingOutcomeIds: [],
          createdAt: 84_000,
          updatedAt: 85_000,
          confirmedAt: 85_000,
          deniedAt: null,
        },
      ] as any,
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    const result = await runtime.buildDigitalLifeMindState({
      cardId: 'card-reflection-runtime-carry',
      now: 90_000,
      context: {
        localTime: '2026-06-08T15:20:00+08:00',
        system: {
          cpuUsage: 0.18,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          degradedSignals: [],
        },
        workload: {
          kind: 'coding',
          confidence: 0.9,
          source: 'screen-semantic-summary',
          matchedLabels: ['coding'],
        },
        content: {
          kind: 'diff',
          confidence: 0.84,
          source: 'screen-semantic-summary',
          summary: 'Returning to the same identity-continuity',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused',
          fatigue: 0.14,
          minutesSinceLastUserTurn: 2,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      previousVisualPresenceState,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'reflection carry runtime recall',
          source: 'screen-semantic-summary',
          confidence: 0.88,
          beganAt: 89_000,
          lastSeenAt: 90_000,
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'background',
      organicMemoryContext: {} as any,
    })

    expect(result.reflectionLedger?.latestEntryId).toBe('reflection::same-her-repair')
    expect(result.reflectionLedger?.entries.find(entry => entry.id === 'reflection::temporary-noise')?.outcome).toBe('released')
    expect(result.reflectionLedger?.entries.find(entry => entry.id === result.reflectionLedger?.latestEntryId)?.revision).toContain('same-her repair lesson')
  })
})
