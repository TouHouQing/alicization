import { describe, expect, it } from 'vitest'

import { createDefaultProactiveLoopState } from './proactive-feedback'
import {
  deriveProactiveCadenceSignal,
  progressProactiveCadenceState,
} from './proactive-cadence'

function createContext() {
  return {
    localTime: {
      hour: 1,
      minute: 20,
      isLateNight: true,
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
        title: 'runtime.ts diff',
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
      hostAttitude: 'still here but tired',
      boredom: 18,
      loneliness: 26,
      fatigue: 78,
      minutesSinceLastUserTurn: 22,
      reminderBacklog: 0,
      lateNightActiveMinutes: 140,
      recentProactiveOutcomes: [],
    },
  } as any
}

describe('proactive-cadence rhythm authority', () => {
  it('lets rest-protective rhythm damp proactive momentum and cadence pressure', () => {
    const baseState = createDefaultProactiveLoopState(10_000)
    const progressed = progressProactiveCadenceState({
      state: baseState,
      now: 20_000,
      context: createContext(),
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The host is tired; stay gentle.',
      } as any,
      personalityContinuityState: {
        currentRegime: 'late-night-care',
        rhythmState: {
          cadenceMode: 'cooldown',
          restMode: 'rest-protective',
          embodiedPresence: 'concerned',
          suggestedStyle: 'gentle-care',
          moodLabel: 'afterglow',
          emotionalTension: 'late-night-drain',
          cadencePressure: 0.26,
          restPressure: 0.84,
          memoryResonance: 0.62,
          companionshipTempo: 0.42,
          summary: 'cadence:cooldown | rest:rest-protective | mood:afterglow',
          rationale: ['Protect rest before reopening the seam.'],
        },
      } as any,
    })

    expect(progressed.openingMomentum).toBeLessThan(0.2)

    const cadence = deriveProactiveCadenceSignal({
      state: progressed,
      context: createContext(),
      privateThought: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'late-night-care',
        rhythmState: {
          cadenceMode: 'cooldown',
          restMode: 'rest-protective',
          embodiedPresence: 'concerned',
          suggestedStyle: 'gentle-care',
          moodLabel: 'afterglow',
          emotionalTension: 'late-night-drain',
          cadencePressure: 0.26,
          restPressure: 0.84,
          memoryResonance: 0.62,
          companionshipTempo: 0.42,
          summary: 'cadence:cooldown | rest:rest-protective | mood:afterglow',
          rationale: ['Protect rest before reopening the seam.'],
        },
      } as any,
    })

    expect(cadence.reasonTags).toEqual(expect.arrayContaining([
      'rhythm-cadence:cooldown',
      'rhythm-rest:rest-protective',
      'rhythm-presence:concerned',
    ]))
    expect(cadence.cadencePressure).toBeLessThan(0.2)
  })

  it('lets ready-return rhythm raise callback momentum without turning it into generic chatter', () => {
    const progressed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: {
        ...createContext(),
        localTime: {
          hour: 14,
          minute: 10,
          isLateNight: false,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 24,
          lateNightActiveMinutes: 0,
        },
      } as any,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The callback result is ready to come back on the same line.',
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.68,
          restPressure: 0.28,
          memoryResonance: 0.72,
          companionshipTempo: 0.34,
          summary: 'cadence:ready-return | rest:low-pressure | mood:focused',
          rationale: ['The callback result should land on the same thread.'],
        },
      } as any,
    })

    expect(progressed.openingMomentum).toBeGreaterThan(0.14)

    const cadence = deriveProactiveCadenceSignal({
      state: progressed,
      context: {
        ...createContext(),
        localTime: {
          hour: 14,
          minute: 10,
          isLateNight: false,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 24,
          lateNightActiveMinutes: 0,
        },
      } as any,
      privateThought: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.68,
          restPressure: 0.28,
          memoryResonance: 0.72,
          companionshipTempo: 0.34,
          summary: 'cadence:ready-return | rest:low-pressure | mood:focused',
          rationale: ['The callback result should land on the same thread.'],
        },
      } as any,
    })

    expect(cadence.reasonTags).toContain('rhythm-cadence:ready-return')
    expect(cadence.cadencePressure).toBeGreaterThan(0.2)
  })

  it('lets affective residue protect rest and delay warmth before proactive cadence expands', () => {
    const affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 20_000,
      residues: [],
      dominantResidueKind: 'rest-protective',
      afterglowPressure: 0.18,
      repairPressure: 0.62,
      burdenPressure: 0.76,
      trustPressure: 0.48,
      restProtectivePressure: 0.84,
      relationshipCadence: {
        cadenceMode: 'cooldown',
        distancePosture: 'protect-space',
        companionshipDensity: 0.12,
        repairRecovery: 0.42,
        overreachRisk: 0.72,
        fatigueGuard: 0.86,
        afterglowCarry: 0.18,
        shouldDelayWarmth: true,
        shouldProtectRest: true,
        reasonTags: ['residue:rest-protective'],
        summary: 'Protect rest before widening warmth.',
      },
      sourceSignals: ['host tired'],
      summary: 'Rest-protective residue dominates.',
    } as any
    const progressed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: createContext(),
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The host is tired; do not crowd.',
      } as any,
      affectiveResidue,
    })
    const cadence = deriveProactiveCadenceSignal({
      state: progressed,
      context: createContext(),
      privateThought: {
        shouldSpeak: true,
      } as any,
      affectiveResidue,
    })

    expect(progressed.openingMomentum).toBeLessThan(0.12)
    expect(cadence.residueDominance).toBe('rest-protective')
    expect(cadence.reasonTags).toEqual(expect.arrayContaining([
      'residue:rest-protective',
      'residue-delay-warmth',
      'residue-protect-rest',
    ]))
    expect(cadence.cadencePressure).toBeLessThan(0.12)
  })

  it('lets long-horizon self-evolution burden and trust lines damp cadence before residue consolidation catches up', () => {
    const baseContext = {
      ...createContext(),
      localTime: {
        hour: 14,
        minute: 16,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 26,
        lateNightActiveMinutes: 0,
        loneliness: 34,
      },
    } as any
    const baseline = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The host is still on the same runtime knot.',
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.62,
          restPressure: 0.18,
          memoryResonance: 0.68,
          companionshipTempo: 0.42,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
    })
    const evolutionWeighted = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The host is still on the same runtime knot.',
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.62,
          restPressure: 0.18,
          memoryResonance: 0.68,
          companionshipTempo: 0.42,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 20_000,
        residues: [],
        dominantResidueKind: null,
        afterglowPressure: 0.08,
        repairPressure: 0.18,
        burdenPressure: 0.12,
        trustPressure: 0.18,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'ready-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.28,
          repairRecovery: 0.38,
          overreachRisk: 0.18,
          fatigueGuard: 0.14,
          afterglowCarry: 0.24,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['residue:light'],
          summary: 'Residue is still light; the newer doctrine has not fully consolidated yet.',
        },
        sourceSignals: ['light residue'],
        summary: 'Residue is still light.',
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 19_500,
        evolutionMomentum: 0.66,
        learningReadiness: 0.76,
        contradictionPressure: 0.08,
        revisionPressure: 0.14,
        autobiographicalStability: 0.82,
        dominantTrajectory: 'earned lower-pressure companionship timing',
        relationshipDoctrine: 'Leave more room before closeness reopens.',
        latestInflection: 'Even when the opening is real, pressure lands worse than a slower return.',
        burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship'],
        sourceSignals: ['relationship-learning'],
        summary: 'Lower-pressure return is becoming durable relationship timing.',
      } as any,
    })

    expect(evolutionWeighted.openingMomentum).toBeLessThan(baseline.openingMomentum)

    const baselineCadence = deriveProactiveCadenceSignal({
      state: baseline,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.62,
          restPressure: 0.18,
          memoryResonance: 0.68,
          companionshipTempo: 0.42,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
    })
    const evolutionCadence = deriveProactiveCadenceSignal({
      state: evolutionWeighted,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.62,
          restPressure: 0.18,
          memoryResonance: 0.68,
          companionshipTempo: 0.42,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 20_000,
        residues: [],
        dominantResidueKind: null,
        afterglowPressure: 0.08,
        repairPressure: 0.18,
        burdenPressure: 0.12,
        trustPressure: 0.18,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'ready-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.28,
          repairRecovery: 0.38,
          overreachRisk: 0.18,
          fatigueGuard: 0.14,
          afterglowCarry: 0.24,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['residue:light'],
          summary: 'Residue is still light; the newer doctrine has not fully consolidated yet.',
        },
        sourceSignals: ['light residue'],
        summary: 'Residue is still light.',
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 19_500,
        evolutionMomentum: 0.66,
        learningReadiness: 0.76,
        contradictionPressure: 0.08,
        revisionPressure: 0.14,
        autobiographicalStability: 0.82,
        dominantTrajectory: 'earned lower-pressure companionship timing',
        relationshipDoctrine: 'Leave more room before closeness reopens.',
        latestInflection: 'Even when the opening is real, pressure lands worse than a slower return.',
        burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship'],
        sourceSignals: ['relationship-learning'],
        summary: 'Lower-pressure return is becoming durable relationship timing.',
      } as any,
    })

    expect(evolutionCadence.cadencePressure).toBeLessThan(baselineCadence.cadencePressure)
    expect(evolutionCadence.reasonTags).toContain('self-evolution:cadence-softened-by-burden-trust')
  })

  it('lets active same-her continuity governance keep proactive cadence lower-pressure before newer residue wording lands', () => {
    const baseContext = {
      ...createContext(),
      localTime: {
        hour: 15,
        minute: 12,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 22,
        lateNightActiveMinutes: 0,
        loneliness: 38,
      },
    } as any
    const baseline = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The host is still inside the same coding knot.',
      } as any,
      initiative: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.64,
          restPressure: 0.18,
          memoryResonance: 0.7,
          companionshipTempo: 0.44,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
    })
    const continuityWeighted = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The host is still inside the same coding knot.',
      } as any,
      initiative: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.64,
          restPressure: 0.18,
          memoryResonance: 0.7,
          companionshipTempo: 0.44,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-cadence-1',
        patchId: 'patch-same-her-cadence-1',
        decisionTraceId: 'trace-same-her-cadence-1',
        summary: 'continuity=same-her-baseline | keep the return slower than the visible opening impulse',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
    } as any)

    expect(continuityWeighted.openingMomentum).toBeLessThan(baseline.openingMomentum)

    const baselineCadence = deriveProactiveCadenceSignal({
      state: baseline,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      initiative: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.64,
          restPressure: 0.18,
          memoryResonance: 0.7,
          companionshipTempo: 0.44,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
    })
    const continuityCadence = deriveProactiveCadenceSignal({
      state: continuityWeighted,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      initiative: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.64,
          restPressure: 0.18,
          memoryResonance: 0.7,
          companionshipTempo: 0.44,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-cadence-1',
        patchId: 'patch-same-her-cadence-1',
        decisionTraceId: 'trace-same-her-cadence-1',
        summary: 'continuity=same-her-baseline | keep the return slower than the visible opening impulse',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      },
    } as any)

    expect(continuityCadence.cadencePressure).toBeLessThan(baselineCadence.cadencePressure)
    expect(continuityCadence.reasonTags).toContain('continuity-governance:same-her-baseline')
  })
})
