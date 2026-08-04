import { describe, expect, it } from 'vitest'

import { buildHabitPolicy } from './habit-policy'

function createContext(overrides: Record<string, any> = {}) {
  return {
    localTime: {
      hour: 15,
      minute: 30,
      isLateNight: false,
    },
    system: {
      cpuUsage: 18,
      battery: { percent: 64, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 6,
      inputActivity: 'idle' as const,
      fullscreenLikely: false,
      foregroundWindow: undefined,
      degradedSignals: [],
    },
    workload: {
      kind: 'unknown' as const,
      confidence: 0.2,
      source: 'foreground-window-heuristic' as const,
      matchedLabels: [],
    },
    content: {
      kind: 'unknown' as const,
      confidence: 0.2,
      source: 'foreground-window-heuristic' as const,
      matchedLabels: [],
      summary: '',
    },
    relationship: {
      hostAttitude: '',
      boredom: 20,
      loneliness: 20,
      fatigue: 20,
      minutesSinceLastUserTurn: 5,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

function createWorldModel(overrides: Record<string, any> = {}) {
  return {
    activeThread: null,
    lingeringThreads: [],
    focusTarget: null,
    epistemicState: {
      certainty: 'grounded',
      freshness: 'recent',
      seenNow: [],
      inferredNow: [],
      openQuestions: [],
      staleRisks: [],
    },
    continuity: {
      label: 'new-scene',
      sceneAgeMs: 0,
      attentionAgeMs: 0,
      sameSceneAsBefore: false,
      sameAttentionAsBefore: false,
      afterglowOpen: false,
    },
    hostState: {
      availability: 'available',
      burden: 'light',
    },
    updatedAt: 10_000,
    ...overrides,
  } as any
}

function createMotiveEngine(drives: Record<string, number>) {
  return {
    rulingDrive: 'self-direction',
    drives: {
      companionship: 0.3,
      boundaryRespect: 0.3,
      truthDiscipline: 0.3,
      restProtection: 0.2,
      unfinishedThreadReturn: 0.2,
      selfDirection: 0.5,
      ...drives,
    },
    longTermGoals: [],
    backgroundAgendas: [],
    returnPressure: 0.2,
    narrative: [],
    updatedAt: 10_000,
  } as any
}

describe('buildHabitPolicy', () => {
  it('derives repair-before-fluency from current truth and uncertainty state', () => {
    const policy = buildHabitPolicy({
      now: 10_000,
      context: createContext({
        system: {
          ...createContext().system,
          inputActivity: 'active',
        },
      }),
      worldModel: createWorldModel({
        activeThread: {
          id: 'thread::runtime',
          kind: 'problem',
          status: 'active',
          source: 'observed-scene',
          title: 'runtime issue',
          summary: 'The runtime issue is unresolved.',
          confidence: 0.8,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 10_000,
          target: null,
        },
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: ['runtime issue'],
          inferredNow: [],
          openQuestions: ['Which observation is correct?'],
          staleRisks: [],
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
      }),
      relationshipModel: {
        correctionSensitivity: 0.72,
      } as any,
      selfContinuity: {
        misreadBurden: 0.42,
      } as any,
      reflectionLedger: {
        revisionPressure: 0.28,
      } as any,
      motiveEngine: createMotiveEngine({
        boundaryRespect: 0.76,
        truthDiscipline: 0.88,
        unfinishedThreadReturn: 0.72,
      }),
    })

    expect(policy.dominantMode).toBe('repair-before-fluency')
    expect(policy.requiresGroundingBeforeSurface).toBe(true)
    expect(policy.blocksDirectSpeakWhenBusy).toBe(true)
    expect(policy.narrative).toContain('ground-before-surface')
  })

  it('blocks direct speech in busy windows from autobiographical space-learning', () => {
    const policy = buildHabitPolicy({
      now: 10_000,
      context: createContext({
        system: {
          ...createContext().system,
          inputActivity: 'active',
        },
      }),
      worldModel: createWorldModel({
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
      }),
      relationshipModel: {
        correctionSensitivity: 0.48,
      } as any,
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'guarded',
        },
        preferenceEvolution: {
          autonomyRespect: 0.52,
          quietObservation: 0.62,
        },
      } as any,
      motiveEngine: createMotiveEngine({
        boundaryRespect: 0.42,
        companionship: 0.36,
      }),
    })

    expect(policy.blocksDirectSpeakWhenBusy).toBe(true)
    expect(policy.narrative).toContain('busy-window:no-direct-speak')
  })

  it('honors focused relationship boundaries once space-learning has started', () => {
    const policy = buildHabitPolicy({
      now: 10_000,
      context: createContext({
        system: {
          ...createContext().system,
          inputActivity: 'active',
        },
      }),
      worldModel: createWorldModel({
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
      }),
      relationshipModel: {
        approachVector: 'guide',
        activeBoundaries: ['focus-protection'],
        correctionSensitivity: 0.4,
      } as any,
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'nearby',
        },
        preferenceEvolution: {
          autonomyRespect: 0.45,
          quietObservation: 0.44,
        },
      } as any,
      motiveEngine: createMotiveEngine({
        boundaryRespect: 0.38,
      }),
    })

    expect(policy.blocksDirectSpeakWhenBusy).toBe(true)
    expect(policy.narrative).toContain('busy-window:no-direct-speak')
  })

  it('protects rest windows from current fatigue and rest pressure', () => {
    const baseContext = createContext()
    const policy = buildHabitPolicy({
      now: 12_000,
      context: createContext({
        localTime: {
          hour: 2,
          minute: 10,
          isLateNight: true,
        },
        relationship: {
          ...baseContext.relationship,
          fatigue: 86,
          lateNightActiveMinutes: 160,
        },
      }),
      worldModel: createWorldModel({
        activeThread: {
          id: 'thread::late-night',
          kind: 'late-night-endurance',
          status: 'active',
          source: 'observed-scene',
          title: 'late night',
          summary: 'The host is still active late at night.',
          confidence: 0.84,
          significance: 0.88,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 12_000,
          target: null,
        },
        hostState: {
          availability: 'focused',
          burden: 'heavy',
        },
      }),
      motiveEngine: createMotiveEngine({
        restProtection: 0.92,
      }),
    })

    expect(policy.dominantMode).toBe('protect-rest-window')
    expect(policy.protectsRestWindow).toBe(true)
    expect(policy.suggestedStyleCap).toBe('firm-warning')
    expect(policy.narrative).toContain('protect-rest-window')
  })
})
