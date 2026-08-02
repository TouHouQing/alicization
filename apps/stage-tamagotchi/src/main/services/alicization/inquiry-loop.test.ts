import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { buildInquiryLoop } from './inquiry-loop'

function createContext(): AlicizationProactiveLayeredContext {
  return {
    localTime: { hour: 14, minute: 20, isLateNight: false },
    system: {
      cpuUsage: 12,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 18,
      inputActivity: 'idle',
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts',
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.82,
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
      boredom: 52,
      loneliness: 30,
      fatigue: 18,
      minutesSinceLastUserTurn: 6,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

function createScene(): AlicizationVisualSceneSnapshot {
  return {
    workloadKind: 'coding',
    contentKind: 'error',
    scenario: 'coding',
    summary: 'TypeScript error panel',
    source: 'screen-semantic-summary',
    confidence: 0.9,
    beganAt: 0,
    lastSeenAt: 1_000,
  }
}

function createAppraisal(): AlicizationSubjectiveSceneAppraisal {
  return {
    inferredHostGoal: 'resolve-problem',
    currentKnot: 'TypeScript error panel',
    waitingToVerify: '她还没确认真正卡住的是哪一行。',
    relationshipNeed: 'guidance',
    source: 'hybrid',
    confidence: 0.8,
    surprise: 0.12,
    carePressure: 0.36,
    interruptionCost: 0.18,
    desireToSpeak: 0.42,
    notes: [],
  }
}

function createRelationshipModel(overrides: Partial<AlicizationRelationshipModelSnapshot> = {}): AlicizationRelationshipModelSnapshot {
  return {
    climate: 'neutral',
    approachVector: 'guide',
    receptivity: 0.56,
    sharedAttentionTrust: 0.58,
    correctionSensitivity: 0.32,
    reciprocityExpectation: 0.42,
    activeBoundaries: [],
    narrative: [],
    updatedAt: 1_000,
    ...overrides,
  }
}

function createBeliefLedger(overrides: Partial<AlicizationBeliefLedgerSnapshot> = {}): AlicizationBeliefLedgerSnapshot {
  return {
    focusBeliefId: 'scene::percept::typescript-error-panel',
    beliefs: [{
      id: 'scene::percept::typescript-error-panel',
      scope: 'scene',
      source: 'percept',
      status: 'tentative',
      statement: 'The current scene is centered on TypeScript error panel.',
      confidence: 0.54,
      salience: 0.84,
      evidence: ['scene-source:screen-semantic-summary'],
      entityIds: [],
      formedAt: 0,
      lastUpdatedAt: 1_000,
      expiresAt: 50_000,
    }],
    unresolvedContradictions: [],
    updatedAt: 1_000,
    ...overrides,
  }
}

function createWorldModel(certainty: AlicizationWorldModelSnapshot['epistemicState']['certainty']): AlicizationWorldModelSnapshot {
  return {
    activeThread: {
      id: 'debug',
      kind: 'debugging',
      status: 'active',
      source: certainty === 'grounded' ? 'grounded-scene' : 'observed-scene',
      title: 'TypeScript error panel',
      summary: '宿主把注意力压在一个具体报错上。',
      confidence: certainty === 'grounded' ? 0.9 : 0.68,
      significance: 0.82,
      unresolved: true,
      beganAt: 0,
      lastUpdatedAt: 1_000,
      target: null,
    },
    lingeringThreads: [],
    focusTarget: null,
    epistemicState: {
      certainty,
      freshness: 'live',
      seenNow: ['scene:error'],
      inferredNow: ['thread:debugging'],
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

describe('buildInquiryLoop', () => {
  it('opens grounding and contradiction inquiries when beliefs are tentative or conflicting', () => {
    const loop = buildInquiryLoop({
      now: 1_000,
      context: createContext(),
      scene: createScene(),
      worldModel: createWorldModel('lingering'),
      appraisal: createAppraisal(),
      beliefLedger: createBeliefLedger({
        unresolvedContradictions: ['current scene conflicts with browser carry-over'],
      }),
      relationshipModel: createRelationshipModel({
        climate: 'guarded',
        approachVector: 'give-space',
        correctionSensitivity: 0.66,
      }),
    })

    expect(loop.openCount).toBeGreaterThanOrEqual(3)
    expect(loop.inquiries.some(inquiry => inquiry.kind === 'scene-grounding')).toBe(true)
    expect(loop.inquiries.some(inquiry => inquiry.kind === 'contradiction-check')).toBe(true)
    expect(loop.inquiries.some(inquiry => inquiry.kind === 'timing-calibration')).toBe(true)
    expect(loop.inquiries.find(inquiry => inquiry.kind === 'scene-grounding')?.question)
      .toBe('她还没确认真正卡住的是哪一行。')
    expect(loop.inquiries.find(inquiry => inquiry.kind === 'contradiction-check')?.question)
      .toBe('current scene conflicts with browser carry-over')
    expect(loop.inquiries.find(inquiry => inquiry.kind === 'timing-calibration')?.question)
      .toBe('')
    expect(loop.inquiries.every(inquiry => inquiry.whyItMatters === '')).toBe(true)
  })

  it('settles old inquiries after grounding stabilizes and contradictions clear', () => {
    const previous: AlicizationInquiryLoopSnapshot = {
      primaryInquiryId: 'scene-grounding::scene',
      inquiries: [{
        id: 'scene-grounding::scene',
        kind: 'scene-grounding',
        status: 'open',
        priority: 'high',
        question: 'What is actually on screen right now?',
        whyItMatters: 'To avoid stale continuity.',
        confidence: 0.72,
        targetBeliefId: 'scene::percept::typescript-error-panel',
        evidenceWanted: ['fresh grounded scene'],
        reopenWhen: ['grounded-scene'],
        openedAt: 0,
        lastUpdatedAt: 500,
        expiresAt: 50_000,
      }],
      openCount: 1,
      updatedAt: 500,
    }

    const loop = buildInquiryLoop({
      now: 6_000,
      context: createContext(),
      scene: createScene(),
      worldModel: createWorldModel('grounded'),
      appraisal: createAppraisal(),
      beliefLedger: createBeliefLedger({
        beliefs: [{
          ...createBeliefLedger().beliefs[0],
          status: 'held',
          confidence: 0.9,
        }],
      }),
      relationshipModel: createRelationshipModel(),
      previous,
    })

    expect(loop.openCount).toBe(1)
    expect(loop.inquiries.some(inquiry => inquiry.kind === 'scene-grounding' && inquiry.status === 'settled')).toBe(true)
    expect(loop.inquiries.some(inquiry => inquiry.kind === 'problem-localization')).toBe(true)
  })
})
