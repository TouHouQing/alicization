import type { AlicizationSubjectiveSceneAppraisal, AlicizationWorldModelSnapshot } from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { buildRelationshipModel } from './relationship-model'

function createContext(outcomes: AlicizationProactiveLayeredContext['relationship']['recentProactiveOutcomes'] = []): AlicizationProactiveLayeredContext {
  return {
    localTime: { hour: 14, minute: 20, isLateNight: false },
    system: {
      cpuUsage: 12,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 25,
      inputActivity: 'idle',
      fullscreenLikely: false,
      foregroundWindow: { appName: 'Cursor', processName: 'Cursor', title: 'runtime.ts' },
      degradedSignals: [],
    },
    workload: { kind: 'coding', confidence: 0.82, source: 'screen-semantic-summary', matchedLabels: ['cursor'] },
    content: { kind: 'error', confidence: 0.9, source: 'screen-semantic-summary', matchedLabels: ['error'], summary: 'TypeScript error panel' },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 60,
      loneliness: 34,
      fatigue: 18,
      minutesSinceLastUserTurn: 4,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: outcomes,
    },
  }
}

function createWorldModel(certainty: AlicizationWorldModelSnapshot['epistemicState']['certainty'] = 'grounded'): AlicizationWorldModelSnapshot {
  return {
    activeThread: null,
    lingeringThreads: [],
    focusTarget: null,
    epistemicState: {
      certainty,
      freshness: 'live',
      seenNow: [],
      inferredNow: [],
      openQuestions: certainty === 'grounded' ? [] : ['need-grounding'],
      staleRisks: certainty === 'grounded' ? [] : ['stale-scene'],
    },
    continuity: {
      label: 'staying-with-thread',
      sceneAgeMs: 1_000,
      attentionAgeMs: 1_000,
      sameSceneAsBefore: true,
      sameAttentionAsBefore: true,
      afterglowOpen: false,
    },
    hostState: {
      availability: 'focused',
      burden: 'moderate',
    },
    updatedAt: 1_000,
  }
}

function createAppraisal(relationshipNeed: AlicizationSubjectiveSceneAppraisal['relationshipNeed']): AlicizationSubjectiveSceneAppraisal {
  return {
    inferredHostGoal: 'resolve-problem',
    relationshipNeed,
    source: 'hybrid',
    confidence: 0.86,
    surprise: 0.12,
    carePressure: 0.4,
    interruptionCost: 0.18,
    desireToSpeak: 0.46,
    notes: [],
  }
}

describe('buildRelationshipModel', () => {
  it('becomes guarded when corrections and dismissals accumulate under uncertainty', () => {
    const model = buildRelationshipModel({
      now: 1_000,
      context: createContext([
        { turnId: 'turn-1', scenario: 'coding', outcome: 'dismiss', createdAt: 100 },
        { turnId: 'turn-2', scenario: 'coding', outcome: 'ignored', createdAt: 200 },
        { turnId: 'turn-3', scenario: 'coding', outcome: 'dismiss', createdAt: 300 },
      ]),
      worldModel: createWorldModel('lingering'),
      appraisal: createAppraisal('space'),
      watchMode: 'mnemonic-passive',
    })

    expect(model.climate).toBe('guarded')
    expect(model.approachVector).toBe('give-space')
    expect(model.activeBoundaries).toContain('correction-sensitive')
  })

  it('becomes attuned when grounded shared attention and positive feedback line up', () => {
    const model = buildRelationshipModel({
      now: 1_000,
      context: createContext([
        { turnId: 'turn-1', scenario: 'coding', outcome: 'positive', createdAt: 100 },
        { turnId: 'turn-2', scenario: 'coding', outcome: 'reply-within-120s', createdAt: 200 },
      ]),
      worldModel: createWorldModel('grounded'),
      appraisal: createAppraisal('guidance'),
      watchMode: 'invited-inspection',
    })

    expect(model.climate).toBe('attuned')
    expect(model.approachVector).toBe('guide')
    expect(model.sharedAttentionTrust).toBeGreaterThan(0.6)
  })
})
