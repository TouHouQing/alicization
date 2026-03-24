import { describe, expect, it } from 'vitest'

import { buildSelfGovernor } from './self-governor'

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
        idleSeconds: 18,
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
        boredom: 42,
        loneliness: 40,
        fatigue: 24,
        minutesSinceLastUserTurn: 10,
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
        summary: 'The host is localizing a concrete debug knot.',
        confidence: 0.88,
        significance: 0.86,
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
        openQuestions: ['where is the real failing line?'],
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
        summary: 'The host is localizing a concrete debug knot.',
        confidence: 0.88,
        salience: 0.86,
        continuity: 0.8,
        lastChange: 'staying-with-thread',
        openLoop: 'where is the real failing line?',
        entityIds: [],
        threadIds: ['thread:error'],
        evidence: ['thread-kind:debugging'],
        firstSeenAt: 0,
        lastUpdatedAt: 30_000,
      }],
      openLoops: ['where is the real failing line?'],
      stability: 'stable' as const,
      narrative: [],
      updatedAt: 30_000,
    },
    selfContinuity: {
      attachmentMode: 'attuned' as const,
      initiativeTemperament: 'balanced' as const,
      perceptionTrust: 0.72,
      relationshipTrust: 0.62,
      guardingTendency: 0.32,
      misreadBurden: 0.2,
      carryOverDesire: 0.54,
      narrative: [],
      updatedAt: 30_000,
    },
    relationshipModel: {
      climate: 'attuned' as const,
      approachVector: 'guide' as const,
      receptivity: 0.72,
      sharedAttentionTrust: 0.7,
      correctionSensitivity: 0.24,
      reciprocityExpectation: 0.58,
      activeBoundaries: [],
      narrative: [],
      updatedAt: 30_000,
    },
    goalStack: {
      leadingHostGoalId: null,
      leadingAlicizationGoalId: 'goal:help',
      hostGoals: [],
      alicizationGoals: [{
        id: 'goal:help',
        owner: 'alicization' as const,
        kind: 'help-resolve' as const,
        status: 'active' as const,
        label: 'Stay with the error until the knot localizes.',
        confidence: 0.84,
        urgency: 0.76,
        desireWeight: 0.78,
        blockers: [],
        entityIds: [],
        createdAt: 0,
        lastUpdatedAt: 30_000,
      }],
      unresolvedSummary: 'Stay with the error until the knot localizes.',
      updatedAt: 30_000,
    },
    beliefRevision: {
      dominantBeliefId: null,
      stability: 'stable' as const,
      revisionPressure: 0.22,
      groundingNeed: 0.18,
      contradictionPressure: 0.14,
      hostCorrectionWeight: 0.2,
      narrative: [],
      updatedAt: 30_000,
    },
    commitmentLedger: {
      governingCommitmentId: 'commitment:hold',
      commitments: [{
        id: 'commitment:hold',
        kind: 'hold-problem' as const,
        status: 'active' as const,
        title: 'Hold Problem',
        summary: 'Keep the real error knot in view.',
        source: 'runtime-thread' as const,
        priority: 0.8,
        confidence: 0.8,
        createdAt: 0,
        lastRenewedAt: 30_000,
        patienceUntil: 90_000,
        expiresAt: 120_000,
      }],
      carryPressure: 0.66,
      narrative: [],
      updatedAt: 30_000,
    },
    inquiryPlanner: {
      activePlanId: 'plan:problem',
      plans: [{
        id: 'plan:problem',
        kind: 'localize-problem' as const,
        status: 'tracking' as const,
        priority: 'high' as const,
        question: 'Which concrete line is failing?',
        askForGrounding: false,
        suggestedProbeMs: 10_000,
        evidenceWanted: ['error locus'],
        createdAt: 0,
        lastUpdatedAt: 30_000,
        expiresAt: 120_000,
      }],
      epistemicPressure: 0.58,
      groundingUrgency: 0.22,
      narrative: [],
      updatedAt: 30_000,
    },
    mindDynamics: {
      dominantMotive: 'clarify' as const,
      worldPressure: 0.72,
      epistemicPressure: 0.64,
      relationalPressure: 0.42,
      carePressure: 0.24,
      continuityPressure: 0.58,
      restraintPressure: 0.32,
      surfacePressure: 0.54,
      speakReadiness: 0.52,
      presenceWeight: 0.56,
      motives: {
        clarify: 0.82,
        accompany: 0.42,
      },
      speakDrive: 0.58,
      silenceDrive: 0.34,
      narrative: [],
      updatedAt: 30_000,
    },
    previous: null,
  }
}

describe('buildSelfGovernor', () => {
  it('keeps a durable hold-thread intention when the world still contains an unresolved problem', () => {
    const governor = buildSelfGovernor(createInput())

    expect(governor.dominantDrive).toBeTruthy()
    expect(governor.activeIntentions.some(intention => intention.kind === 'hold-thread')).toBe(true)
    expect(governor.dominantIntentionId).toBeTruthy()
    expect(governor.persistence).toBeGreaterThan(0.3)
  })

  it('shifts toward withholding when guarded boundaries and busy focus outweigh approach pressure', () => {
    const governor = buildSelfGovernor({
      ...createInput(),
      context: {
        ...createInput().context,
        system: {
          ...createInput().context.system,
          fullscreenLikely: true,
        },
      },
      relationshipModel: {
        ...createInput().relationshipModel,
        climate: 'guarded',
        correctionSensitivity: 0.74,
      },
      selfContinuity: {
        ...createInput().selfContinuity,
        guardingTendency: 0.76,
      },
      inquiryPlanner: {
        ...createInput().inquiryPlanner,
        activePlanId: 'plan:wait',
        plans: [{
          id: 'plan:wait',
          kind: 'wait-opening',
          status: 'waiting-opening',
          priority: 'high',
          question: 'Wait for a better opening.',
          askForGrounding: false,
          suggestedProbeMs: 15_000,
          evidenceWanted: ['host-open'],
          createdAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
        groundingUrgency: 0.12,
      },
      mindDynamics: {
        ...createInput().mindDynamics,
        relationalPressure: 0.22,
        restraintPressure: 0.82,
      },
    })

    expect(governor.dominantDrive).toBe('withhold')
    expect(governor.activeIntentions.some(intention => intention.kind === 'wait-opening')).toBe(true)
    expect(governor.inhibition).toBeGreaterThan(0.5)
  })
})
