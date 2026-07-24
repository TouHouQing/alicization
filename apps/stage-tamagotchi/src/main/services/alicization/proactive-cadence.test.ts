import { describe, expect, it } from 'vitest'

import {
  deriveProactiveCadenceSignal,
  progressProactiveCadenceState,
} from './proactive-cadence'
import { createDefaultProactiveLoopState } from './proactive-feedback'

function createContext(overrides: Record<string, unknown> = {}) {
  return {
    localTime: {
      hour: 15,
      minute: 20,
      isLateNight: false,
    },
    system: {
      cpuUsage: 12,
      battery: {
        percent: 76,
        charging: true,
      },
      memory: {
        usagePercent: 42,
        freeMB: 4096,
        totalMB: 8192,
      },
      idleSeconds: 180,
      inputActivity: 'idle',
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime',
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.82,
      source: 'foreground-window-heuristic',
      matchedLabels: ['cursor'],
    },
    content: {
      kind: 'diff',
      confidence: 0.8,
      source: 'foreground-window-heuristic',
      matchedLabels: ['diff'],
    },
    relationship: {
      hostAttitude: 'present',
      boredom: 18,
      loneliness: 26,
      fatigue: 22,
      minutesSinceLastUserTurn: 22,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  } as any
}

function createCadence(overrides: Record<string, unknown> = {}) {
  return {
    cadenceMode: 'measured-return',
    distancePosture: 'measured-room',
    companionshipDensity: 0.42,
    repairRecovery: 0.64,
    overreachRisk: 0.32,
    fatigueGuard: 0.18,
    afterglowCarry: 0.3,
    shouldDelayWarmth: true,
    shouldProtectRest: false,
    reasonTags: ['cadence:measured-return'],
    summary: 'model-authored cadence summary',
    ...overrides,
  }
}

function createContinuityState(overrides: Record<string, unknown> = {}) {
  return {
    currentRegime: 'focused-work',
    rhythmState: {
      cadenceMode: 'ready-return',
      restMode: 'open',
      embodiedPresence: 'nearby-soft',
      suggestedStyle: 'light-nudge',
      moodLabel: 'focused',
      emotionalTension: 'gentle-pull',
      cadencePressure: 0.42,
      restPressure: 0.18,
      memoryResonance: 0.48,
      companionshipTempo: 0.44,
      summary: 'model-authored rhythm summary',
      rationale: [],
    },
    ...overrides,
  } as any
}

function deriveSignal(overrides: Record<string, unknown> = {}) {
  return deriveProactiveCadenceSignal({
    state: createDefaultProactiveLoopState(10_000),
    context: createContext(),
    ...overrides,
  } as any)
}

describe('proactive-cadence structured authority', () => {
  it('lets rest-protective rhythm damp proactive momentum and pressure', () => {
    const progressed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: createContext({
        localTime: {
          hour: 1,
          minute: 20,
          isLateNight: true,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 78,
          lateNightActiveMinutes: 140,
        },
      }),
      personalityContinuityState: createContinuityState({
        currentRegime: 'late-night-care',
        rhythmState: {
          ...createContinuityState().rhythmState,
          cadenceMode: 'cooldown',
          restMode: 'rest-protective',
          emotionalTension: 'late-night-drain',
          restPressure: 0.84,
        },
      }),
    })
    const signal = deriveSignal({
      state: progressed,
      context: createContext({
        localTime: {
          hour: 1,
          minute: 20,
          isLateNight: true,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 78,
          lateNightActiveMinutes: 140,
        },
      }),
      personalityContinuityState: createContinuityState({
        currentRegime: 'late-night-care',
        rhythmState: {
          ...createContinuityState().rhythmState,
          cadenceMode: 'cooldown',
          restMode: 'rest-protective',
          emotionalTension: 'late-night-drain',
          restPressure: 0.84,
        },
      }),
    })

    expect(progressed.openingMomentum).toBeLessThan(0.2)
    expect(signal.cadencePressure).toBeLessThan(0.2)
    expect(signal.reasonTags).toContain('rhythm-rest:rest-protective')
  })

  it('uses typed affective cadence state even when summaries change', () => {
    const delayed = deriveSignal({
      affectiveResidue: {
        relationshipCadence: createCadence({
          afterglowCarry: 0.62,
          summary: 'first summary',
        }),
        dominantResidueKind: 'afterglow',
        trustPressure: 0.12,
        summary: 'first residue',
      },
    })
    const sameStateDifferentText = deriveSignal({
      affectiveResidue: {
        relationshipCadence: createCadence({
          afterglowCarry: 0.62,
          summary: 'second summary',
        }),
        dominantResidueKind: 'afterglow',
        trustPressure: 0.12,
        summary: 'second residue',
      },
    })

    expect(delayed.cadencePressure).toBe(sameStateDifferentText.cadencePressure)
    expect(delayed.reasonTags).toContain('residue-delay-warmth')
    expect(delayed.reasonTags).toContain('residue-afterglow-hold')
  })

  it('uses numeric self-evolution state instead of doctrine prose', () => {
    const baseline = deriveSignal()
    const learned = deriveSignal({
      selfEvolution: {
        nextLearningAction: 'internalize',
        shouldInternalize: true,
        evolutionMomentum: 0.86,
        learningReadiness: 0.72,
        revisionPressure: 0.58,
        contradictionPressure: 0.12,
        relationshipDoctrine: 'arbitrary owner text',
        latestInflection: 'arbitrary owner text',
        burdenLine: 'arbitrary owner text',
        trustMeaning: 'arbitrary owner text',
        relationshipCadenceSummary: 'arbitrary owner text',
        dominantTrajectory: 'arbitrary owner text',
      },
    })

    expect(learned.cadencePressure).toBeLessThan(baseline.cadencePressure)
    expect(learned.reasonTags).toContain('self-evolution:cadence-policy')
  })

  it('uses autobiographical numeric preferences and typed habits', () => {
    const baseline = deriveSignal()
    const learned = deriveSignal({
      autobiographicalSelf: {
        stability: 0.86,
        behaviorSignatures: ['habit:choose-openings-carefully'],
        preferenceEvolution: {
          quietObservation: 0.92,
          autonomyRespect: 0.86,
        },
      },
    })

    expect(learned.cadencePressure).toBeLessThan(baseline.cadencePressure)
    expect(learned.reasonTags).toContain('autobiographical-self:cadence-policy')
  })

  it('uses structured emotional governance reason codes without reading governance summary', () => {
    const baseline = deriveSignal()
    const governed = deriveSignal({
      activeContinuityGovernance: {
        mode: 'emotional-revision',
        lanes: ['proactive-policy'],
        reasonCodes: ['emotion-transition:repair-shift'],
        summary: 'arbitrary governance text',
      },
    })

    expect(governed.cadencePressure).toBeLessThan(baseline.cadencePressure)
    expect(governed.reasonTags).toContain('continuity-governance:emotional-self-revision')
  })

  it('keeps emotional decay hold restrictive and release neutral', () => {
    const hold = deriveSignal({
      emotionalTransitionDecay: {
        phase: 'hold',
        shouldSuppressInitiative: true,
        initiativeMode: 'repair-first',
        embodimentTone: 'repair-before-closeness',
        reasonTags: ['emotion-transition:repair-shift'],
      },
    })
    const release = deriveSignal({
      emotionalTransitionDecay: {
        phase: 'release',
        shouldSuppressInitiative: false,
        initiativeMode: 'approach',
        embodimentTone: 'nearby-soft',
        reasonTags: [],
      },
    })

    expect(hold.cadencePressure).toBeLessThan(release.cadencePressure)
    expect(hold.reasonTags).toContain('emotion-decay:repair-first')
    expect(release.reasonTags).toContain('emotion-decay:released')
  })

  it('keeps a ready-return rhythm available when no structured restraint is active', () => {
    const signal = deriveSignal({
      affectiveResidue: {
        relationshipCadence: createCadence({
          cadenceMode: 'ready-return',
          shouldDelayWarmth: false,
          afterglowCarry: 0,
          overreachRisk: 0,
          fatigueGuard: 0,
        }),
      },
      personalityContinuityState: createContinuityState(),
    })

    expect(signal.cadencePressure).toBeGreaterThan(0)
    expect(signal.reasonTags).not.toContain('continuity-execution-callback-project-carry')
  })
})
