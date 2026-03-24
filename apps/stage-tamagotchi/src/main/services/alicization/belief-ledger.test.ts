import type { AlicizationEntityWorldModelSnapshot, AlicizationSubjectiveSceneAppraisal, AlicizationVisualSceneSnapshot, AlicizationWorldModelSnapshot } from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { buildBeliefLedger } from './belief-ledger'

function createContext(): AlicizationProactiveLayeredContext {
  return {
    localTime: {
      hour: 14,
      minute: 10,
      isLateNight: false,
    },
    system: {
      cpuUsage: 12,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 40, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 30,
      inputActivity: 'idle',
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.84,
      source: 'screen-semantic-summary',
      matchedLabels: ['cursor'],
    },
    content: {
      kind: 'error',
      confidence: 0.88,
      source: 'screen-semantic-summary',
      matchedLabels: ['error'],
      summary: 'TypeScript error panel',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 64,
      loneliness: 32,
      fatigue: 20,
      minutesSinceLastUserTurn: 8,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

function createWorldModel(): AlicizationWorldModelSnapshot {
  return {
    activeThread: {
      id: 'debug',
      kind: 'debugging',
      status: 'active',
      source: 'grounded-scene',
      title: 'TypeScript error panel',
      summary: '宿主把注意力压在一个具体的 TypeScript 报错上。',
      confidence: 0.9,
      significance: 0.82,
      unresolved: true,
      beganAt: 0,
      lastUpdatedAt: 1_000,
      target: null,
    },
    lingeringThreads: [],
    focusTarget: null,
    epistemicState: {
      certainty: 'grounded',
      freshness: 'live',
      seenNow: ['scene:error'],
      inferredNow: ['thread:debugging'],
      openQuestions: [],
      staleRisks: [],
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

function createEntityWorld(): AlicizationEntityWorldModelSnapshot {
  return {
    focusEntityId: 'task:error',
    activeEntityIds: ['task:error'],
    entities: [{
      id: 'task:error',
      kind: 'task',
      status: 'active',
      label: 'TypeScript error panel',
      confidence: 0.84,
      salience: 0.8,
      source: 'scene',
      evidence: ['scene:error'],
      firstSeenAt: 0,
      lastSeenAt: 1_000,
    }],
    relations: [],
    openLoops: [],
    updatedAt: 1_000,
  }
}

function createAppraisal(): AlicizationSubjectiveSceneAppraisal {
  return {
    inferredHostGoal: 'resolve-problem',
    currentKnot: 'TypeScript error panel',
    situatedMeaning: '这不是普通浏览，而是一个具体故障点。',
    relationshipNeed: 'guidance',
    source: 'hybrid',
    confidence: 0.88,
    surprise: 0.12,
    carePressure: 0.42,
    interruptionCost: 0.18,
    desireToSpeak: 0.54,
    notes: ['structured-debug'],
  }
}

function createScene(summary = 'TypeScript error panel'): AlicizationVisualSceneSnapshot {
  return {
    workloadKind: 'coding',
    contentKind: 'error',
    scenario: 'coding',
    summary,
    source: 'screen-semantic-summary',
    confidence: 0.92,
    beganAt: 0,
    lastSeenAt: 1_000,
  }
}

describe('buildBeliefLedger', () => {
  it('separates current percepts from inferred host intent and carry-over memory', () => {
    const ledger = buildBeliefLedger({
      now: 1_000,
      context: createContext(),
      scene: createScene(),
      worldModel: createWorldModel(),
      entityWorld: createEntityWorld(),
      appraisal: createAppraisal(),
      previous: {
        focusBeliefId: 'scene::memory::old-tab',
        beliefs: [{
          id: 'scene::memory::old-tab',
          scope: 'scene',
          source: 'memory',
          status: 'tentative',
          statement: 'A previous browser tab may still matter.',
          confidence: 0.44,
          salience: 0.3,
          evidence: ['continuity:afterglow'],
          entityIds: [],
          formedAt: 0,
          lastUpdatedAt: 500,
          expiresAt: 10_000,
        }],
        unresolvedContradictions: [],
        updatedAt: 500,
      },
    })

    expect(ledger.beliefs.some(belief => belief.scope === 'scene' && belief.source === 'percept')).toBe(true)
    expect(ledger.beliefs.some(belief => belief.scope === 'host' && belief.source === 'inference')).toBe(true)
    expect(ledger.focusBeliefId).toBeTruthy()
  })

  it('marks stale scene continuity as contradicted when a new grounded scene conflicts with it', () => {
    const previous = buildBeliefLedger({
      now: 1_000,
      context: createContext(),
      scene: createScene('Old browser page'),
      worldModel: createWorldModel(),
      entityWorld: createEntityWorld(),
      appraisal: createAppraisal(),
    })

    const next = buildBeliefLedger({
      now: 6_000,
      context: createContext(),
      scene: createScene('TypeScript error panel'),
      worldModel: createWorldModel(),
      entityWorld: createEntityWorld(),
      appraisal: createAppraisal(),
      previous,
    })

    expect(next.unresolvedContradictions.length).toBeGreaterThan(0)
    expect(next.beliefs.some(belief => belief.status === 'contradicted')).toBe(true)
  })
})
