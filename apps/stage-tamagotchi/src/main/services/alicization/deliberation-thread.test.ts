import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { buildDeliberationState } from './deliberation-thread'

function createContext(overrides: Partial<AlicizationProactiveLayeredContext> = {}): AlicizationProactiveLayeredContext {
  return {
    localTime: {
      hour: 15,
      minute: 10,
      isLateNight: false,
    },
    system: {
      cpuUsage: 14,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 40, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 18,
      inputActivity: 'active',
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - diff',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.88,
      source: 'foreground-window-heuristic',
      matchedLabels: ['cursor'],
    },
    content: {
      kind: 'diff',
      confidence: 0.86,
      source: 'foreground-window-heuristic',
      matchedLabels: ['diff'],
      summary: 'runtime.ts - diff',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 48,
      loneliness: 44,
      fatigue: 16,
      minutesSinceLastUserTurn: 5,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

describe('buildDeliberationState', () => {
  it('keeps a repair thread alive when belief revision is fractured', () => {
    const state = buildDeliberationState({
      now: 30_000,
      context: createContext(),
      worldModel: {
        activeThread: {
          id: 'thread::debug',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts - diff drift',
          summary: 'The live diff and continuity do not line up yet.',
          confidence: 0.74,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['which hunk is current?'],
          staleRisks: ['anchor drift'],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
      beliefLedger: {
        focusBeliefId: 'belief-1',
        beliefs: [{
          id: 'belief-1',
          scope: 'scene',
          source: 'memory',
          status: 'contradicted',
          statement: 'The old diff summary is still valid.',
          confidence: 0.46,
          salience: 0.84,
          evidence: ['old continuity'],
          entityIds: [],
          formedAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
        unresolvedContradictions: ['old-vs-live-diff'],
        updatedAt: 30_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-1',
        stability: 'fractured',
        revisionPressure: 0.82,
        groundingNeed: 0.78,
        contradictionPressure: 0.72,
        hostCorrectionWeight: 0.68,
        narrative: ['beliefs-require-revision'],
        updatedAt: 30_000,
      },
      relationshipModel: {
        climate: 'neutral',
        approachVector: 'guide',
        receptivity: 0.62,
        sharedAttentionTrust: 0.64,
        correctionSensitivity: 0.42,
        reciprocityExpectation: 0.5,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 30_000,
      },
      inquiryLoop: {
        primaryInquiryId: 'inquiry-1',
        inquiries: [{
          id: 'inquiry-1',
          kind: 'contradiction-check',
          status: 'open',
          priority: 'high',
          question: 'Where did the continuity drift away from the live diff?',
          whyItMatters: 'So Alicization does not speak from stale continuity.',
          confidence: 0.74,
          targetBeliefId: 'belief-1',
          evidenceWanted: ['fresh grounding'],
          reopenWhen: ['grounded-scene'],
          openedAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
        openCount: 1,
        updatedAt: 30_000,
      },
      concerns: [],
      previous: null,
    })

    expect(state.primaryThreadId).toContain('repair-misread')
    expect(state.dominantNeed).toBe('repair')
    expect(state.threads.some(thread => thread.kind === 'repair-misread')).toBe(true)
  })

  it('keeps a stay-near thread alive during afterglow continuity', () => {
    const state = buildDeliberationState({
      now: 60_000,
      context: createContext({
        system: {
          ...createContext().system,
          inputActivity: 'idle',
        },
      }),
      worldModel: {
        activeThread: {
          id: 'thread::afterglow',
          kind: 'co-viewing',
          status: 'lingering',
          source: 'continuity',
          title: 'shared coding afterglow',
          summary: 'The shared work moment is still warm.',
          confidence: 0.72,
          significance: 0.66,
          unresolved: false,
          beganAt: 0,
          lastUpdatedAt: 60_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 5_000,
          attentionAgeMs: 5_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 60_000,
      },
      beliefLedger: {
        focusBeliefId: null,
        beliefs: [],
        unresolvedContradictions: [],
        updatedAt: 60_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'stable',
        revisionPressure: 0.24,
        groundingNeed: 0.22,
        contradictionPressure: 0.1,
        hostCorrectionWeight: 0.2,
        narrative: ['world-model-settled'],
        updatedAt: 60_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'stay-near',
        receptivity: 0.7,
        sharedAttentionTrust: 0.72,
        correctionSensitivity: 0.24,
        reciprocityExpectation: 0.58,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 60_000,
      },
      inquiryLoop: {
        primaryInquiryId: null,
        inquiries: [],
        openCount: 0,
        updatedAt: 60_000,
      },
      concerns: [],
      goalStack: {
        leadingHostGoalId: null,
        leadingAlicizationGoalId: 'goal-1',
        hostGoals: [],
        alicizationGoals: [{
          id: 'goal-1',
          owner: 'alicization',
          kind: 'stay-near',
          status: 'active',
          label: 'stay near the shared afterglow',
          confidence: 0.66,
          urgency: 0.42,
          desireWeight: 0.58,
          blockers: [],
          entityIds: [],
          createdAt: 0,
          lastUpdatedAt: 60_000,
        }],
        unresolvedSummary: undefined,
        updatedAt: 60_000,
      },
      desireMemory: {
        activeDesires: [{
          id: 'desire::stay-near::goal-1::global',
          kind: 'stay-near',
          status: 'withheld',
          reason: 'afterglow still warm',
          strength: 0.78,
          goalId: 'goal-1',
          entityId: null,
          reopenWhen: ['afterglow-window', 'host-open'],
          createdAt: 0,
          lastFeltAt: 58_000,
          lastSurfacedAt: null,
          expiresAt: 120_000,
        }],
        resurfacingDesireId: 'desire::stay-near::goal-1::global',
        withheldCount: 1,
        updatedAt: 58_000,
      },
      previous: null,
    })

    expect(state.threads.some(thread => thread.kind === 'stay-near')).toBe(true)
    expect(state.dominantNeed).toBe('companionship')
  })
})
