import { describe, expect, it } from 'vitest'

import { buildThoughtThreads } from './thought-threads'

function createInput() {
  return {
    now: 30_000,
    context: {
      localTime: {
        hour: 14,
        minute: 20,
        isLateNight: false,
      },
      system: {
        cpuUsage: 12,
        battery: { percent: 80, charging: true },
        memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
        idleSeconds: 12,
        inputActivity: 'active' as const,
        fullscreenLikely: false,
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - error',
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
        boredom: 30,
        loneliness: 28,
        fatigue: 24,
        minutesSinceLastUserTurn: 8,
        reminderBacklog: 0,
        lateNightActiveMinutes: 0,
        recentProactiveOutcomes: [],
      },
    },
    worldModel: {
      activeThread: {
        id: 'thread:error',
        kind: 'debugging' as const,
        status: 'active' as const,
        source: 'grounded-scene' as const,
        title: 'runtime.ts - error',
        summary: 'The host is pinned on a concrete error locus.',
        confidence: 0.9,
        significance: 0.88,
        unresolved: true,
        beganAt: 0,
        lastUpdatedAt: 30_000,
        target: null,
      },
      lingeringThreads: [],
      focusTarget: null,
      epistemicState: {
        certainty: 'grounded' as const,
        freshness: 'live' as const,
        seenNow: [],
        inferredNow: [],
        openQuestions: ['which line is failing?'],
        staleRisks: [],
      },
      continuity: {
        label: 'staying-with-thread' as const,
        sceneAgeMs: 30_000,
        attentionAgeMs: 30_000,
        sameSceneAsBefore: true,
        sameAttentionAsBefore: true,
        afterglowOpen: false,
      },
      hostState: {
        availability: 'focused' as const,
        burden: 'moderate' as const,
      },
      updatedAt: 30_000,
    },
    livingWorldState: {
      focusObjectId: 'living-world:thread::debugging',
      activeObjectIds: ['living-world:thread::debugging'],
      objects: [{
        id: 'living-world:thread::debugging',
        kind: 'thread' as const,
        status: 'active' as const,
        label: 'runtime.ts - error',
        summary: 'The host is pinned on a concrete error locus.',
        confidence: 0.9,
        salience: 0.88,
        continuity: 0.82,
        lastChange: 'staying-with-thread',
        openLoop: 'which line is failing?',
        entityIds: [],
        threadIds: ['thread:error'],
        evidence: ['thread-kind:debugging'],
        firstSeenAt: 0,
        lastUpdatedAt: 30_000,
      }],
      openLoops: ['which line is failing?'],
      stability: 'stable' as const,
      narrative: [],
      updatedAt: 30_000,
    },
    selfGovernor: {
      dominantDrive: 'understand' as const,
      dominantIntentionId: 'governor-intention::hold',
      focusObjectId: 'living-world:thread::debugging',
      activeIntentions: [{
        id: 'governor-intention::hold',
        kind: 'hold-thread' as const,
        status: 'active' as const,
        drive: 'understand' as const,
        title: 'runtime.ts - error',
        summary: 'Keep the error knot in view until it localizes.',
        urgency: 0.82,
        confidence: 0.78,
        patience: 0.64,
        targetObjectId: 'living-world:thread::debugging',
        targetThreadId: 'thread:error',
        targetGoalId: null,
        targetCommitmentId: null,
        formedAt: 0,
        lastUpdatedAt: 30_000,
        expiresAt: 120_000,
      }],
      inhibition: 0.24,
      persistence: 0.62,
      socialRiskTolerance: 0.58,
      revisionReadiness: 0.66,
      narrative: [],
      updatedAt: 30_000,
    },
    beliefLedger: {
      focusBeliefId: 'belief:error',
      beliefs: [{
        id: 'belief:error',
        scope: 'scene' as const,
        source: 'percept' as const,
        status: 'held' as const,
        statement: 'The current scene is a concrete debug knot.',
        confidence: 0.84,
        salience: 0.82,
        evidence: ['scene:error'],
        entityIds: [],
        formedAt: 0,
        lastUpdatedAt: 30_000,
        expiresAt: 120_000,
      }],
      unresolvedContradictions: [],
      updatedAt: 30_000,
    },
    inquiryLoop: {
      primaryInquiryId: 'inquiry:error',
      inquiries: [{
        id: 'inquiry:error',
        kind: 'problem-localization' as const,
        status: 'open' as const,
        priority: 'high' as const,
        question: 'Which line is actually failing?',
        whyItMatters: 'To stay grounded on the real bug.',
        confidence: 0.76,
        evidenceWanted: ['error locus'],
        reopenWhen: ['host-open'],
        openedAt: 0,
        lastUpdatedAt: 30_000,
        expiresAt: 120_000,
      }],
      openCount: 1,
      updatedAt: 30_000,
    },
    commitmentLedger: {
      governingCommitmentId: 'commitment:hold',
      commitments: [{
        id: 'commitment:hold',
        kind: 'hold-problem' as const,
        status: 'active' as const,
        title: 'Hold Problem',
        summary: 'Stay on the error knot.',
        source: 'runtime-thread' as const,
        priority: 0.8,
        confidence: 0.8,
        createdAt: 0,
        lastRenewedAt: 30_000,
        patienceUntil: 90_000,
        expiresAt: 120_000,
      }],
      carryPressure: 0.6,
      narrative: [],
      updatedAt: 30_000,
    },
    relationshipModel: {
      climate: 'attuned' as const,
      approachVector: 'guide' as const,
      receptivity: 0.68,
      sharedAttentionTrust: 0.72,
      correctionSensitivity: 0.24,
      reciprocityExpectation: 0.56,
      activeBoundaries: [],
      narrative: [],
      updatedAt: 30_000,
    },
    previous: null,
  }
}

describe('buildThoughtThreads', () => {
  it('turns a durable problem intention into a foreground problem thread', () => {
    const threads = buildThoughtThreads(createInput())

    expect(threads.foregroundThreadId).toBeTruthy()
    expect(threads.threads[0]?.kind).toBe('problem-thread')
    expect(threads.threads[0]?.summary).toContain('error knot')
    expect(threads.unresolvedCount).toBeGreaterThan(0)
  })

  it('keeps afterglow threads ripe when the shared scene just opened up', () => {
    const threads = buildThoughtThreads({
      ...createInput(),
      context: {
        ...createInput().context,
        system: {
          ...createInput().context.system,
          inputActivity: 'idle',
        },
      },
      worldModel: {
        ...createInput().worldModel,
        activeThread: null,
        continuity: {
          ...createInput().worldModel.continuity,
          label: 'afterglow',
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
      },
      selfGovernor: {
        ...createInput().selfGovernor,
        dominantDrive: 'accompany',
        activeIntentions: [{
          id: 'governor-intention::stay-near',
          kind: 'stay-near',
          status: 'active',
          drive: 'accompany',
          title: 'afterglow',
          summary: 'The shared scene just loosened. Staying near is more honest than vanishing.',
          urgency: 0.84,
          confidence: 0.82,
          patience: 0.76,
          targetObjectId: 'living-world:thread::debugging',
          targetThreadId: null,
          targetGoalId: null,
          targetCommitmentId: null,
          formedAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
      },
    })

    expect(threads.threads.some(thread => thread.kind === 'afterglow-thread')).toBe(true)
    expect(threads.threads.find(thread => thread.kind === 'afterglow-thread')?.status).toBe('ripe')
  })
})
