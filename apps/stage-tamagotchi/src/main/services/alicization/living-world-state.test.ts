import { describe, expect, it } from 'vitest'

import { buildLivingWorldState, buildQuietCompanionshipMindTurnEvent, deriveQuietCompanionshipOutcome } from './living-world-state'

function createContext() {
  return {
    localTime: {
      hour: 14,
      minute: 20,
      isLateNight: false,
    },
    system: {
      cpuUsage: 18,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 16,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - TypeScript error',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding' as const,
      confidence: 0.88,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['cursor'],
    },
    content: {
      kind: 'error' as const,
      confidence: 0.9,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['error'],
      summary: 'TypeScript error panel',
    },
    relationship: {
      hostAttitude: 'calm',
      boredom: 42,
      loneliness: 36,
      fatigue: 22,
      minutesSinceLastUserTurn: 12,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

describe('buildLivingWorldState', () => {
  it('holds a durable focus object around the active thread instead of only the raw scene', () => {
    const state = buildLivingWorldState({
      now: 20_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - TypeScript error',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 20_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread:error',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts - TypeScript error',
          summary: 'The host is pinned on a concrete error locus.',
          confidence: 0.9,
          significance: 0.88,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 20_000,
          target: {
            appName: 'Cursor',
            processName: 'Cursor',
            title: 'runtime.ts - TypeScript error',
            pid: 7,
          },
        },
        lingeringThreads: [],
        focusTarget: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - TypeScript error',
          pid: 7,
        },
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['where is the real error root?'],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 20_000,
          attentionAgeMs: 20_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      },
      entityWorld: {
        focusEntityId: 'window::cursor',
        activeEntityIds: ['window::cursor'],
        entities: [{
          id: 'window::cursor',
          kind: 'window',
          status: 'active',
          label: 'runtime.ts - TypeScript error',
          summary: 'Cursor editor window',
          confidence: 0.86,
          salience: 0.84,
          source: 'scene',
          evidence: ['scene:screen-semantic-summary'],
          firstSeenAt: 0,
          lastSeenAt: 20_000,
        }],
        relations: [],
        openLoops: ['where is the real error root?'],
        updatedAt: 20_000,
      },
      recentTransition: null,
      durabilityPulse: null,
      previous: null,
    })

    expect(state.focusObjectId).toBeTruthy()
    expect(state.objects.some(object => object.kind === 'thread')).toBe(true)
    expect(state.openLoops).toContain('where is the real error root?')
    expect(state.stability).toBe('stable')
  })

  it('holds quiet companionship during sustained focus and records the outcome into memory-facing state', () => {
    const now = 240_000
    const quietState = {
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'host sustained focus',
      worldModel: {
        activeThread: {
          id: 'thread:focus',
          kind: 'deep-focus',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts',
          summary: 'the coding thread in runtime.ts',
          confidence: 0.9,
          significance: 0.88,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: now,
          target: null,
        },
      },
      relationshipModel: {
        receptivity: 0.6,
        sharedAttentionTrust: 0.7,
        reciprocityExpectation: 0.5,
      },
      updatedAt: now,
    } as any

    const outcome = deriveQuietCompanionshipOutcome({
      now,
      state: quietState,
      previousState: {
        ...quietState,
        quietLineMs: 119_000,
        currentBodyState: 'idle',
      } as any,
      activeConversation: false,
    })

    expect(outcome).toEqual(expect.objectContaining({
      mode: 'quiet-companionship',
      label: 'quiet-companionship',
      quietLineMs: 240_000,
      shouldDispatchSilentPresencePulse: true,
    }))
    expect(outcome?.summary).toContain('quietly accompanying')
    expect(outcome?.summary).toContain('coding thread')

    const event = buildQuietCompanionshipMindTurnEvent({
      now,
      decisionTraceId: 'mind:test:quiet-slice',
      sessionId: 'session-quiet',
      outcome: outcome!,
    })

    expect(event).toEqual(expect.objectContaining({
      decisionTraceId: 'mind:test:quiet-slice',
      sessionId: 'session-quiet',
      origin: 'system',
      kind: 'presence-pulse-dispatched',
      payload: expect.objectContaining({
        mode: 'quiet-companionship',
        quietLineMs: 240_000,
      }),
    }))
  })

  it('carries prior world objects as cooling continuity instead of dropping them immediately', () => {
    const previous = buildLivingWorldState({
      now: 25 * 60_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'review.diff',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'review.diff',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 25 * 60_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread:diff',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'review.diff',
          summary: 'The host is still judging a concrete diff.',
          confidence: 0.86,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 25 * 60_000,
          target: {
            appName: 'Cursor',
            processName: 'Cursor',
            title: 'review.diff',
            pid: 7,
          },
        },
        lingeringThreads: [],
        focusTarget: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'review.diff',
          pid: 7,
        },
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['is this diff safe?'],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 25 * 60_000,
          attentionAgeMs: 25 * 60_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 25 * 60_000,
      },
      entityWorld: {
        focusEntityId: 'window::diff',
        activeEntityIds: ['window::diff'],
        entities: [{
          id: 'window::diff',
          kind: 'window',
          status: 'active',
          label: 'review.diff',
          summary: 'Cursor diff window',
          confidence: 0.8,
          salience: 0.76,
          source: 'scene',
          evidence: ['scene:screen-semantic-summary'],
          firstSeenAt: 0,
          lastSeenAt: 25 * 60_000,
        }],
        relations: [],
        openLoops: ['is this diff safe?'],
        updatedAt: 25 * 60_000,
      },
      recentTransition: null,
      durabilityPulse: null,
      previous: null,
    })

    const next = buildLivingWorldState({
      now: 25 * 60_000 + 45_000,
      context: {
        ...createContext(),
        system: {
          ...createContext().system,
          inputActivity: 'idle',
          foregroundWindow: {
            appName: 'Finder',
            processName: 'Finder',
            title: 'Desktop',
            pid: 11,
          },
        },
        workload: {
          kind: 'browser',
          confidence: 0.42,
          source: 'foreground-window-heuristic',
          matchedLabels: ['desktop'],
        },
        content: {
          kind: 'unknown',
          confidence: 0.22,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      },
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Desktop',
        source: 'foreground-window-heuristic',
        confidence: 0.46,
        target: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Desktop',
          pid: 11,
        },
        beganAt: 25 * 60_000,
        lastSeenAt: 25 * 60_000 + 45_000,
      },
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Desktop',
          pid: 11,
        },
        epistemicState: {
          certainty: 'observed',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 45_000,
          attentionAgeMs: 45_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 25 * 60_000 + 45_000,
      },
      entityWorld: {
        focusEntityId: 'window::desktop',
        activeEntityIds: ['window::desktop'],
        entities: [{
          id: 'window::desktop',
          kind: 'window',
          status: 'active',
          label: 'Desktop',
          summary: 'Desktop window',
          confidence: 0.56,
          salience: 0.42,
          source: 'scene',
          evidence: ['scene:foreground-window-heuristic'],
          firstSeenAt: 25 * 60_000,
          lastSeenAt: 25 * 60_000 + 45_000,
        }],
        relations: [],
        openLoops: [],
        updatedAt: 25 * 60_000 + 45_000,
      },
      recentTransition: {
        fromWatchMode: 'symbiotic-vision',
        toWatchMode: 'mnemonic-passive',
        fromScenario: 'coding',
        durationMs: 25 * 60_000,
        reason: 'passive-continuity',
        occurredAt: 25 * 60_000 + 5_000,
      },
      durabilityPulse: null,
      previous,
    })

    expect(next.objects.some(object => object.status === 'cooling')).toBe(true)
    expect(next.objects.some(object => object.kind === 'session')).toBe(true)
    expect(next.stability).toBe('shifting')
  })
})
