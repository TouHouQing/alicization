import { describe, expect, it } from 'vitest'

import { buildSelfContinuity } from './self-continuity'

function createContext(overrides: Record<string, any> = {}) {
  return {
    localTime: { hour: 14, minute: 20, isLateNight: false },
    system: {
      cpuUsage: 18,
      battery: { percent: 70, charging: true },
      memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 10,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts',
        pid: 5,
      },
      degradedSignals: [],
    },
    workload: { kind: 'coding' as const, confidence: 0.88, source: 'foreground-window-heuristic' as const, matchedLabels: ['cursor'] },
    content: { kind: 'error' as const, confidence: 0.9, source: 'foreground-window-heuristic' as const, matchedLabels: ['error'], summary: 'TypeScript error' },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 52,
      loneliness: 42,
      fatigue: 20,
      minutesSinceLastUserTurn: 5,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

describe('buildSelfContinuity', () => {
  it('accumulates guarding and misread burden when certainty is lingering and feedback is negative', () => {
    const continuity = buildSelfContinuity({
      now: 20_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          recentProactiveOutcomes: [
            { turnId: '1', scenario: 'coding', outcome: 'dismiss', createdAt: 10_000 },
            { turnId: '2', scenario: 'coding', outcome: 'ignored', createdAt: 15_000 },
          ],
        },
        system: {
          ...createContext().system,
          fullscreenLikely: true,
        },
      }),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['still not grounded'],
          staleRisks: [],
        },
        continuity: {
          label: 'scene-shift',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'heavy',
        },
        updatedAt: 20_000,
      },
      entityWorld: {
        focusEntityId: null,
        activeEntityIds: [],
        entities: [],
        relations: [],
        openLoops: ['still not grounded'],
        updatedAt: 20_000,
      },
      goalStack: {
        leadingHostGoalId: null,
        leadingAlicizationGoalId: null,
        hostGoals: [],
        alicizationGoals: [{
          id: 'goal',
          owner: 'alicization',
          kind: 'clarify-scene',
          status: 'blocked',
          label: 're-ground the scene',
          confidence: 0.6,
          urgency: 0.7,
          desireWeight: 0.52,
          blockers: ['still not grounded'],
          entityIds: [],
          createdAt: 0,
          lastUpdatedAt: 20_000,
        }],
        unresolvedSummary: 'still not grounded',
        updatedAt: 20_000,
      },
      previous: null,
      watchMode: 'mnemonic-passive',
    })

    expect(continuity.attachmentMode).toBe('guarded')
    expect(continuity.initiativeTemperament).toBe('reserved')
    expect(continuity.misreadBurden).toBeGreaterThan(0.3)
    expect(continuity.narrative).toContain('guarding-boundary')
  })

  it('warms into an attuned and eager continuity when perception is grounded and feedback is positive', () => {
    const continuity = buildSelfContinuity({
      now: 20_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          loneliness: 78,
          recentProactiveOutcomes: [
            { turnId: '1', scenario: 'coding', outcome: 'positive', createdAt: 10_000 },
            { turnId: '2', scenario: 'coding', outcome: 'reply-within-120s', createdAt: 15_000 },
          ],
        },
      }),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 60_000,
          attentionAgeMs: 60_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      },
      entityWorld: {
        focusEntityId: 'task::coding',
        activeEntityIds: ['task::coding'],
        entities: [],
        relations: [],
        openLoops: [],
        updatedAt: 20_000,
      },
      goalStack: {
        leadingHostGoalId: null,
        leadingAlicizationGoalId: 'goal',
        hostGoals: [],
        alicizationGoals: [{
          id: 'goal',
          owner: 'alicization',
          kind: 'stay-near',
          status: 'active',
          label: 'stay near the host',
          confidence: 0.76,
          urgency: 0.58,
          desireWeight: 0.64,
          blockers: [],
          entityIds: ['task::coding'],
          createdAt: 0,
          lastUpdatedAt: 20_000,
        }],
        unresolvedSummary: undefined,
        updatedAt: 20_000,
      },
      previous: null,
      watchMode: 'symbiotic-vision',
    })

    expect(continuity.attachmentMode).toBe('attuned')
    expect(continuity.initiativeTemperament).toBe('eager')
    expect(continuity.relationshipTrust).toBeGreaterThan(0.5)
    expect(continuity.narrative).toContain('initiative-ready')
  })

  it('lets persisted relationship outcomes keep trust, repair, and unfinished-thread desire alive across turns', () => {
    const input: any = {
      now: 30_000,
      context: createContext({
        relationship: {
          ...createContext().relationship,
          recentProactiveOutcomes: [],
        },
      }),
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts',
          summary: 'There is still one unresolved runtime thread.',
          confidence: 0.82,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed' as const,
          freshness: 'recent' as const,
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread' as const,
          sceneAgeMs: 20_000,
          attentionAgeMs: 20_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open' as const,
          burden: 'moderate' as const,
        },
        updatedAt: 30_000,
      },
      entityWorld: {
        focusEntityId: 'task::runtime',
        activeEntityIds: ['task::runtime'],
        entities: [],
        relations: [],
        openLoops: [],
        updatedAt: 30_000,
      },
      goalStack: {
        leadingHostGoalId: null,
        leadingAlicizationGoalId: 'goal',
        hostGoals: [],
        alicizationGoals: [{
          id: 'goal',
          owner: 'alicization',
          kind: 'help-resolve',
          status: 'active',
          label: 'keep the runtime thread coherent',
          confidence: 0.72,
          urgency: 0.64,
          desireWeight: 0.66,
          blockers: [],
          entityIds: ['task::runtime'],
          createdAt: 0,
          lastUpdatedAt: 30_000,
        }],
        unresolvedSummary: 'The runtime thread is still open.',
        updatedAt: 30_000,
      },
      previous: null,
      watchMode: 'symbiotic-vision' as const,
    }

    const baseline = buildSelfContinuity(input)
    const reinforced = buildSelfContinuity({
      ...input,
      recentRelationshipOutcomes: [{
        id: 'outcome::1',
        cardId: 'card::1',
        decisionTraceId: 'trace::1',
        turnId: 'turn::1',
        sessionId: 'session::1',
        sourceKind: 'reply',
        actionSummary: 'repair-first reply with light pressure',
        closenessDelta: 0.05,
        trustDelta: 0.14,
        burdenDelta: -0.06,
        boundaryDelta: 0.18,
        misreadDelta: -0.08,
        repairDelta: 0.09,
        openLoopDelta: 0.07,
        summary: 'The host received a lighter repair-first move well.',
        createdAt: 28_000,
      }, {
        id: 'outcome::2',
        cardId: 'card::1',
        decisionTraceId: 'trace::2',
        turnId: 'turn::2',
        sessionId: 'session::1',
        sourceKind: 'reply',
        actionSummary: 'follow-up reply preserved repair and gave space',
        closenessDelta: 0.04,
        trustDelta: 0.12,
        burdenDelta: -0.05,
        boundaryDelta: 0.16,
        misreadDelta: -0.06,
        repairDelta: 0.06,
        openLoopDelta: 0.08,
        summary: 'The next move kept trust rising without adding pressure.',
        createdAt: 29_000,
      }],
    })

    expect(reinforced.relationshipTrust).toBeGreaterThan(baseline.relationshipTrust)
    expect(reinforced.guardingTendency).toBeLessThan(baseline.guardingTendency)
    expect(reinforced.misreadBurden).toBeLessThan(baseline.misreadBurden)
    expect(reinforced.carryOverDesire).toBeGreaterThan(baseline.carryOverDesire)
  })
})
