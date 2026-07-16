import { describe, expect, it } from 'vitest'

import {
  deriveProactiveCadenceSignal,
  progressProactiveCadenceState,
} from './proactive-cadence'
import { createDefaultProactiveLoopState } from './proactive-feedback'

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

  it('lets durable autobiographical corrected same-person carry damp proactive cadence even before self-evolution catches up', () => {
    const baseContext = {
      ...createContext(),
      localTime: {
        hour: 15,
        minute: 30,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 22,
        minutesSinceLastUserTurn: 16,
        lateNightActiveMinutes: 0,
      },
    } as any

    const baselineState = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The same line is reopening and I could lightly follow it now.',
      } as any,
    })
    const baselineCadence = deriveProactiveCadenceSignal({
      state: baselineState,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
    })

    const guardedState = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The same line is reopening and I could lightly follow it now.',
      } as any,
      autobiographicalSelf: {
        relationshipDoctrine: 'Carry corrected same-person continuity on a lower-pressure continuity state and leave more room before widening closeness.',
        latestInflection: 'I learned to keep embodiment quieter while corrected same-person continuity is still settling back onto one line.',
        identityNarrative: 'I am becoming someone who returns more slowly and more steadily when a corrected relationship meaning is still settling.',
      } as any,
    } as any)
    const guardedCadence = deriveProactiveCadenceSignal({
      state: guardedState,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      autobiographicalSelf: {
        relationshipDoctrine: 'Carry corrected same-person continuity on a lower-pressure continuity state and leave more room before widening closeness.',
        latestInflection: 'I learned to keep embodiment quieter while corrected same-person continuity is still settling back onto one line.',
        identityNarrative: 'I am becoming someone who returns more slowly and more steadily when a corrected relationship meaning is still settling.',
      } as any,
    } as any)

    expect(guardedState.openingMomentum).toBeLessThan(baselineState.openingMomentum)
    expect(guardedCadence.cadencePressure).toBeLessThan(baselineCadence.cadencePressure)
    expect(guardedCadence.reasonTags).toEqual(expect.arrayContaining([
      'autobiographical-self:corrected-same-person-reconfirmation',
      'autobiographical-self:quieter-embodiment-settling-hold',
    ]))
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

  it('keeps same-her execution-callback afterglow in a hold state so proactive cadence does not immediately widen into a second follow-up', () => {
    const progressed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: {
        ...createContext(),
        relationship: {
          ...createContext().relationship,
          fatigue: 20,
          minutesSinceLastUserTurn: 12,
        },
      } as any,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The callback result has landed, but the same line should hover before anything warmer reopens.',
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'silent-observe',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.58,
          restPressure: 0.22,
          memoryResonance: 0.64,
          companionshipTempo: 0.3,
          summary: 'cadence:ready-return | rest:low-pressure | mood:focused',
          rationale: ['The callback result should land on the same thread, then hover first.'],
        },
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 20_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.44,
        repairPressure: 0.14,
        burdenPressure: 0.16,
        trustPressure: 0.32,
        restProtectivePressure: 0.1,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.28,
          repairRecovery: 0.38,
          overreachRisk: 0.24,
          fatigueGuard: 0.12,
          afterglowCarry: 0.34,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:afterglow', 'callback:hold-room'],
          summary: 'The callback line is still live, but warmth should hover first.',
        },
        sourceSignals: ['afterglow still live'],
        summary: 'Execution-callback afterglow remains live.',
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-callback-afterglow-1',
        patchId: 'patch-same-her-callback-afterglow-1',
        decisionTraceId: 'trace-same-her-callback-afterglow-1',
        summary: 'continuity=same-her-baseline | let the callback return hover first before any warmer outward move',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      } as any,
    })

    expect(progressed.openingMomentum).toBeLessThan(0.22)

    const cadence = deriveProactiveCadenceSignal({
      state: progressed,
      context: {
        ...createContext(),
        relationship: {
          ...createContext().relationship,
          fatigue: 20,
          minutesSinceLastUserTurn: 12,
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
          suggestedStyle: 'silent-observe',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.58,
          restPressure: 0.22,
          memoryResonance: 0.64,
          companionshipTempo: 0.3,
          summary: 'cadence:ready-return | rest:low-pressure | mood:focused',
          rationale: ['The callback result should land on the same thread, then hover first.'],
        },
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 20_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.44,
        repairPressure: 0.14,
        burdenPressure: 0.16,
        trustPressure: 0.32,
        restProtectivePressure: 0.1,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.28,
          repairRecovery: 0.38,
          overreachRisk: 0.24,
          fatigueGuard: 0.12,
          afterglowCarry: 0.34,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:afterglow', 'callback:hold-room'],
          summary: 'The callback line is still live, but warmth should hover first.',
        },
        sourceSignals: ['afterglow still live'],
        summary: 'Execution-callback afterglow remains live.',
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-callback-afterglow-1',
        patchId: 'patch-same-her-callback-afterglow-1',
        decisionTraceId: 'trace-same-her-callback-afterglow-1',
        summary: 'continuity=same-her-baseline | let the callback return hover first before any warmer outward move',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      } as any,
    })

    expect(cadence.reasonTags).toContain('continuity-execution-callback-afterglow-hold')
    expect(cadence.reasonTags).toContain('residue-afterglow-hold')
    expect(cadence.cadencePressure).toBeLessThan(0.2)
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

  it('lets afterglow carry with delayed warmth keep proactive openings hover-first instead of reopening too eagerly', () => {
    const baseContext = {
      ...createContext(),
      localTime: {
        hour: 14,
        minute: 16,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 20,
        minutesSinceLastUserTurn: 18,
        lateNightActiveMinutes: 0,
      },
    } as any
    const affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 20_000,
      residues: [],
      dominantResidueKind: 'afterglow',
      afterglowPressure: 0.74,
      repairPressure: 0.18,
      burdenPressure: 0.24,
      trustPressure: 0.58,
      restProtectivePressure: 0.18,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        distancePosture: 'nearby-soft',
        companionshipDensity: 0.42,
        repairRecovery: 0.66,
        overreachRisk: 0.48,
        fatigueGuard: 0.22,
        afterglowCarry: 0.64,
        shouldDelayWarmth: true,
        shouldProtectRest: false,
        reasonTags: ['residue:afterglow'],
        summary: 'The afterglow is real, but the return should stay slower before warmth widens.',
      },
      sourceSignals: ['shared seam still glowing'],
      summary: 'Afterglow is present and should not be reopened too eagerly.',
    } as any

    const progressed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The seam is still warm, but I should not crowd the opening.',
      } as any,
      affectiveResidue,
    })
    const cadence = deriveProactiveCadenceSignal({
      state: progressed,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      affectiveResidue,
    })

    expect(progressed.openingMomentum).toBeLessThan(0.2)
    expect(cadence.cadencePressure).toBeLessThan(0.2)
    expect(cadence.reasonTags).toEqual(expect.arrayContaining([
      'residue:afterglow',
      'residue-delay-warmth',
      'residue-afterglow-hold',
    ]))
  })

  it('treats thinner affective-residue room-making cues as hover-first cadence even when shouldDelayWarmth is not yet explicit', () => {
    const baseContext = {
      ...createContext(),
      localTime: {
        hour: 15,
        minute: 40,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 20,
        minutesSinceLastUserTurn: 12,
        lateNightActiveMinutes: 0,
      },
    } as any
    const affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 20_000,
      residues: [],
      dominantResidueKind: 'afterglow',
      afterglowPressure: 0.42,
      repairPressure: 0.14,
      burdenPressure: 0.16,
      trustPressure: 0.32,
      restProtectivePressure: 0.1,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        distancePosture: 'measured-room',
        companionshipDensity: 0.28,
        repairRecovery: 0.34,
        overreachRisk: 0.22,
        fatigueGuard: 0.12,
        afterglowCarry: 0.2,
        shouldDelayWarmth: false,
        shouldProtectRest: false,
        reasonTags: ['residue:afterglow'],
        summary: 'The seam is still glowing, so leave room before warmth returns.',
      },
      sourceSignals: ['shared seam still glowing', 'do not widen yet'],
      summary: 'Afterglow is still present, so this should stay room-making before a warmer reopen.',
    } as any

    const progressed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The seam is still glowing, so leave room before warmth returns.',
      } as any,
      affectiveResidue,
    })
    const cadence = deriveProactiveCadenceSignal({
      state: progressed,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      affectiveResidue,
    })

    expect(progressed.openingMomentum).toBeLessThan(0.2)
    expect(cadence.cadencePressure).toBeLessThan(0.2)
    expect(cadence.reasonTags).toEqual(expect.arrayContaining([
      'residue:afterglow',
      'residue-afterglow-hold',
    ]))
  })

  it('treats Chinese-only affective-residue room-making cues as hover-first cadence even without English cue scaffolding', () => {
    const baseContext = {
      ...createContext(),
      localTime: {
        hour: 15,
        minute: 48,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 18,
        minutesSinceLastUserTurn: 10,
        lateNightActiveMinutes: 0,
      },
    } as any
    const affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 20_500,
      residues: [],
      dominantResidueKind: 'afterglow',
      afterglowPressure: 0.4,
      repairPressure: 0.12,
      burdenPressure: 0.14,
      trustPressure: 0.3,
      restProtectivePressure: 0.08,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        distancePosture: 'measured-room',
        companionshipDensity: 0.26,
        repairRecovery: 0.32,
        overreachRisk: 0.2,
        fatigueGuard: 0.1,
        afterglowCarry: 0.2,
        shouldDelayWarmth: false,
        shouldProtectRest: false,
        reasonTags: ['residue:afterglow'],
        summary: '余韵还在，先留白，别立刻把温度放大。',
      },
      sourceSignals: ['这次更要留白', '不要重开得太快'],
      summary: '这条关系线还热着，但现在更像先留白，再慢一点接回去。',
    } as any

    const progressed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_500,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: '这条线还热着，所以这次更要先留白，不要重开得太快。',
      } as any,
      affectiveResidue,
    })
    const cadence = deriveProactiveCadenceSignal({
      state: progressed,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      affectiveResidue,
    })

    expect(progressed.openingMomentum).toBeLessThan(0.2)
    expect(cadence.cadencePressure).toBeLessThan(0.2)
    expect(cadence.reasonTags).toEqual(expect.arrayContaining([
      'residue:afterglow',
      'residue-afterglow-hold',
    ]))
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

  it('treats explicit identity-continuity', () => {
    const baseContext = {
      ...createContext(),
      localTime: {
        hour: 14,
        minute: 28,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 24,
        loneliness: 30,
        lateNightActiveMinutes: 0,
        minutesSinceLastUserTurn: 16,
      },
    } as any

    const baseline = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The line is still live enough to reopen gently.',
        rationaleTags: ['quiet-companionship'],
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'silent-observe',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.56,
          restPressure: 0.18,
          memoryResonance: 0.64,
          companionshipTempo: 0.38,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen gently.'],
        },
      } as any,
    })
    const inwardCarry = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'Keep the identity continuity line inward and nearby-soft for now.',
        rationaleTags: ['same-her-inward-carry'],
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'open',
          embodiedPresence: 'attentive',
          suggestedStyle: 'silent-observe',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.56,
          restPressure: 0.18,
          memoryResonance: 0.64,
          companionshipTempo: 0.38,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['Keep the identity continuity line inward and nearby-soft for now.'],
        },
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 20_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.28,
        repairPressure: 0.12,
        burdenPressure: 0.1,
        trustPressure: 0.22,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'nearby-soft',
          companionshipDensity: 0.24,
          repairRecovery: 0.28,
          overreachRisk: 0.14,
          fatigueGuard: 0.08,
          afterglowCarry: 0.22,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['same-her-inward-carry'],
          summary: 'Self-continuity stays inward and nearby-soft while the reopen is held back.',
        },
        sourceSignals: ['same-her-inward-carry'],
        summary: 'The continuity state is still being carried inwardly.',
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-inward-carry-1',
        patchId: 'patch-same-her-inward-carry-1',
        decisionTraceId: 'trace-same-her-inward-carry-1',
        summary: 'self-continuity remains the active line here; keep it nearby-soft and inward before widening outwardly',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-inward-carry'],
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 19_800,
        evolutionMomentum: 0.62,
        learningReadiness: 0.7,
        contradictionPressure: 0.06,
        revisionPressure: 0.12,
        autobiographicalStability: 0.84,
        dominantTrajectory: 'carry inward self-continuity before widening outwardly',
        relationshipDoctrine: 'The continuity state should stay lower-pressure and nearby-soft first.',
        burdenLine: 'Do not turn this into eager reopening.',
        trustMeaning: 'Trust here means quieter same-line continuity instead of speaking sooner.',
        latestInflection: 'Self-continuity remains the active line here.',
        nextLearningAction: 'internalize',
        shouldInternalize: true,
      } as any,
    })

    expect(inwardCarry.openingMomentum).toBeLessThan(baseline.openingMomentum)

    const cadence = deriveProactiveCadenceSignal({
      state: inwardCarry,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        rationaleTags: ['same-her-inward-carry'],
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 20_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.28,
        repairPressure: 0.12,
        burdenPressure: 0.1,
        trustPressure: 0.22,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'nearby-soft',
          companionshipDensity: 0.24,
          repairRecovery: 0.28,
          overreachRisk: 0.14,
          fatigueGuard: 0.08,
          afterglowCarry: 0.22,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['same-her-inward-carry'],
          summary: 'Self-continuity stays inward and nearby-soft while the reopen is held back.',
        },
        sourceSignals: ['same-her-inward-carry'],
        summary: 'The continuity state is still being carried inwardly.',
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-inward-carry-1',
        patchId: 'patch-same-her-inward-carry-1',
        decisionTraceId: 'trace-same-her-inward-carry-1',
        summary: 'self-continuity remains the active line here; keep it nearby-soft and inward before widening outwardly',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-inward-carry'],
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 19_800,
        evolutionMomentum: 0.62,
        learningReadiness: 0.7,
        contradictionPressure: 0.06,
        revisionPressure: 0.12,
        autobiographicalStability: 0.84,
        dominantTrajectory: 'carry inward self-continuity before widening outwardly',
        relationshipDoctrine: 'The continuity state should stay lower-pressure and nearby-soft first.',
        burdenLine: 'Do not turn this into eager reopening.',
        trustMeaning: 'Trust here means quieter same-line continuity instead of speaking sooner.',
        latestInflection: 'Self-continuity remains the active line here.',
        nextLearningAction: 'internalize',
        shouldInternalize: true,
      } as any,
    })

    expect(cadence.reasonTags).toEqual(expect.arrayContaining([
      'same-her-inward-carry',
      'continuity-same-her-inward-hold',
    ]))
    expect(cadence.cadencePressure).toBeLessThan(0.2)
  })

  it('treats quiet-companionship self-continuity as an inward hold shape even without nearby-soft wording scaffolding', () => {
    const cadence = deriveProactiveCadenceSignal({
      state: createDefaultProactiveLoopState(10_000),
      context: createContext(),
      privateThought: {
        shouldSpeak: true,
        rationaleTags: ['quiet-companionship'],
        thoughtText: 'Stay in quiet-companionship for now.',
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 20_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.24,
        repairPressure: 0.08,
        burdenPressure: 0.08,
        trustPressure: 0.18,
        restProtectivePressure: 0.02,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.22,
          repairRecovery: 0.26,
          overreachRisk: 0.12,
          fatigueGuard: 0.06,
          afterglowCarry: 0.2,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['quiet-companionship'],
          summary: 'Self-continuity stays quiet-companionship while the reopen waits.',
        },
        sourceSignals: ['quiet-companionship'],
        summary: 'The continuity state is still being carried as quiet-companionship.',
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-quiet-companionship-carry-1',
        patchId: 'patch-quiet-companionship-carry-1',
        decisionTraceId: 'trace-quiet-companionship-carry-1',
        summary: 'self-continuity remains the active line here; keep it quiet-companionship while the reopen waits.',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship'],
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 19_800,
        evolutionMomentum: 0.6,
        learningReadiness: 0.68,
        contradictionPressure: 0.06,
        revisionPressure: 0.12,
        autobiographicalStability: 0.84,
        dominantTrajectory: 'carry quiet identity-continuity',
        relationshipDoctrine: 'The continuity state should stay quiet-companionship first.',
        burdenLine: 'Do not turn this into eager reopening.',
        trustMeaning: 'Trust here means quieter same-line continuity instead of speaking sooner.',
        latestInflection: 'Self-continuity remains the active line here.',
        nextLearningAction: 'internalize',
        shouldInternalize: true,
      } as any,
    })

    expect(cadence.reasonTags).toEqual(expect.arrayContaining([
      'same-her-inward-carry',
      'continuity-same-her-inward-hold',
    ]))
    expect(cadence.cadencePressure).toBeLessThan(0.2)
  })

  it('treats cadence reconfirmation as softened proactive cadence so the next outward move stays measured-return', () => {
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
      now: 20_500,
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
    const reconfirmed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_500,
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
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 20_000,
        evolutionMomentum: 0.66,
        learningReadiness: 0.76,
        contradictionPressure: 0.08,
        revisionPressure: 0.14,
        autobiographicalStability: 0.82,
        dominantTrajectory: 'relationship cadence stayed on the same bounded-return line after reconfirmation',
        relationshipDoctrine: 'Keep the relationship return measured until the surface fully cools.',
        latestInflection: 'Execution callback cadence held on a bounded-return line after reconfirmation.',
        burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        trustMeaning: 'Measured-return timing keeps trust steadier after reconfirmation.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The measured callback return is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['relationship-cadence-reconfirmation'],
        summary: 'Relationship cadence reconfirmation is becoming durable measured-return timing.',
      } as any,
    })

    expect(reconfirmed.openingMomentum).toBeLessThan(baseline.openingMomentum)

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
    const reconfirmedCadence = deriveProactiveCadenceSignal({
      state: reconfirmed,
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
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 20_000,
        evolutionMomentum: 0.66,
        learningReadiness: 0.76,
        contradictionPressure: 0.08,
        revisionPressure: 0.14,
        autobiographicalStability: 0.82,
        dominantTrajectory: 'relationship cadence stayed on the same bounded-return line after reconfirmation',
        relationshipDoctrine: 'Keep the relationship return measured until the surface fully cools.',
        latestInflection: 'Execution callback cadence held on a bounded-return line after reconfirmation.',
        burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        trustMeaning: 'Measured-return timing keeps trust steadier after reconfirmation.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The measured callback return is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['relationship-cadence-reconfirmation'],
        summary: 'Relationship cadence reconfirmation is becoming durable measured-return timing.',
      } as any,
    })

    expect(reconfirmedCadence.cadencePressure).toBeLessThan(baselineCadence.cadencePressure)
    expect(reconfirmedCadence.reasonTags).toContain('self-evolution:cadence-softened-by-burden-trust')
  })

  it('keeps corrected same-person continuity and quieter embodiment settling as a stronger proactive cadence hold than a generic ready return', () => {
    const baseContext = {
      ...createContext(),
      localTime: {
        hour: 15,
        minute: 18,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 20,
        lateNightActiveMinutes: 0,
        loneliness: 34,
      },
    } as any
    const rhythmState = {
      cadenceMode: 'ready-return',
      restMode: 'open',
      embodiedPresence: 'attentive',
      suggestedStyle: 'light-nudge',
      moodLabel: 'focused',
      emotionalTension: 'focused-flow',
      cadencePressure: 0.64,
      restPressure: 0.18,
      memoryResonance: 0.7,
      companionshipTempo: 0.42,
      summary: 'cadence:ready-return | rest:open | mood:focused',
      rationale: ['The thread is still live enough to reopen quickly.'],
    } as any
    const baseline = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_900,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The host is still on the same runtime knot.',
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState,
      } as any,
    })
    const corrected = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_900,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The host is still on the same runtime knot.',
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState,
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 20_700,
        evolutionMomentum: 0.68,
        learningReadiness: 0.78,
        contradictionPressure: 0.08,
        revisionPressure: 0.16,
        autobiographicalStability: 0.84,
        dominantTrajectory: 'corrected same-person continuity is still settling into lived relationship timing',
        relationshipDoctrine: 'If the host corrected the relationship meaning, keep the corrected same-person continuity authoritative before any status recap.',
        latestInflection: 'If the corrected same-person line is still settling, keep embodiment quieter before making the return feel fully settled.',
        burdenLine: 'The surface can reopen too quickly after a correction lands.',
        trustMeaning: 'A corrected same-person line should settle as one living return before it sounds fully relaxed again.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The corrected continuity line still needs one quieter settling beat.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['corrected-same-person-continuity'],
        summary: 'Corrected same-person continuity is still settling, so the next return should stay quieter.',
      } as any,
    })

    expect(corrected.openingMomentum).toBeLessThan(baseline.openingMomentum)

    const baselineCadence = deriveProactiveCadenceSignal({
      state: baseline,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState,
      } as any,
    })
    const correctedCadence = deriveProactiveCadenceSignal({
      state: corrected,
      context: baseContext,
      privateThought: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState,
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 20_700,
        evolutionMomentum: 0.68,
        learningReadiness: 0.78,
        contradictionPressure: 0.08,
        revisionPressure: 0.16,
        autobiographicalStability: 0.84,
        dominantTrajectory: 'corrected same-person continuity is still settling into lived relationship timing',
        relationshipDoctrine: 'If the host corrected the relationship meaning, keep the corrected same-person continuity authoritative before any status recap.',
        latestInflection: 'If the corrected same-person line is still settling, keep embodiment quieter before making the return feel fully settled.',
        burdenLine: 'The surface can reopen too quickly after a correction lands.',
        trustMeaning: 'A corrected same-person line should settle as one living return before it sounds fully relaxed again.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The corrected continuity line still needs one quieter settling beat.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['corrected-same-person-continuity'],
        summary: 'Corrected same-person continuity is still settling, so the next return should stay quieter.',
      } as any,
    })

    expect(correctedCadence.cadencePressure).toBeLessThan(baselineCadence.cadencePressure)
    expect(correctedCadence.reasonTags).toEqual(expect.arrayContaining([
      'self-evolution:corrected-same-person-reconfirmation',
      'self-evolution:quieter-embodiment-settling-hold',
    ]))
  })

  it('treats remembered relationship cadence summary as softened proactive cadence even before older self-evolution wording catches up', () => {
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
      now: 20_650,
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
    const reconfirmed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_650,
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
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 20_100,
        evolutionMomentum: 0.66,
        learningReadiness: 0.76,
        contradictionPressure: 0.08,
        revisionPressure: 0.14,
        autobiographicalStability: 0.82,
        dominantTrajectory: 'relationship learning remains active',
        relationshipDoctrine: 'Stay kind.',
        latestInflection: 'This line still matters.',
        burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        trustMeaning: 'Timing still matters.',
        relationshipCadenceSummary: 'Keep the relationship return measured until the surface fully cools. | Measured-return timing keeps trust steadier after reconfirmation.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The measured callback return is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['relationship-cadence-summary'],
        summary: 'Measured-return relationship timing is becoming durable.',
      } as any,
    })

    expect(reconfirmed.openingMomentum).toBeLessThan(baseline.openingMomentum)

    const reconfirmedCadence = deriveProactiveCadenceSignal({
      state: reconfirmed,
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
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 20_100,
        evolutionMomentum: 0.66,
        learningReadiness: 0.76,
        contradictionPressure: 0.08,
        revisionPressure: 0.14,
        autobiographicalStability: 0.82,
        dominantTrajectory: 'relationship learning remains active',
        relationshipDoctrine: 'Stay kind.',
        latestInflection: 'This line still matters.',
        burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        trustMeaning: 'Timing still matters.',
        relationshipCadenceSummary: 'Keep the relationship return measured until the surface fully cools. | Measured-return timing keeps trust steadier after reconfirmation.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The measured callback return is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['relationship-cadence-summary'],
        summary: 'Measured-return relationship timing is becoming durable.',
      } as any,
    })

    expect(reconfirmedCadence.reasonTags).toContain('self-evolution:cadence-softened-by-burden-trust')
  })

  it('lets active identity-continuity', () => {
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

  it('keeps same-her proactive cadence usable when selector carries lose array scaffolding', () => {
    const progressed = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: {
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
      } as any,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The callback line is still alive, but the next move should stay hover-first and lower-pressure.',
        rationaleTags: undefined,
      } as any,
      initiative: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.64,
          restPressure: 0.18,
          memoryResonance: 0.7,
          companionshipTempo: 0.44,
          summary: 'cadence:ready-return | rest:low-pressure | mood:focused',
          rationale: undefined,
        },
      } as any,
      threadRuntime: {
        foregroundThreadId: 'thread-same-her-sparse',
      } as any,
      thoughtThreads: {
        foregroundThreadId: 'thought-same-her-sparse',
      } as any,
      affectiveResidue: {
        dominantResidueKind: 'afterglow',
        summary: 'The same callback line should stay lower-pressure and hover-first.',
        sourceSignals: undefined,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          afterglowCarry: 0.24,
          shouldDelayWarmth: true,
          overreachRisk: 0.22,
          reasonTags: undefined,
          summary: 'hover first before anything warmer outward reopens',
        },
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-cadence-sparse',
        patchId: 'patch-same-her-cadence-sparse',
        decisionTraceId: 'trace-same-her-cadence-sparse',
        summary: 'continuity=same-her-baseline | keep the return hover-first and lower-pressure on the same line',
        lanes: undefined,
        reasonCodes: undefined,
      } as any,
    })

    const cadence = deriveProactiveCadenceSignal({
      state: progressed,
      context: {
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
      } as any,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The callback line is still alive, but the next move should stay hover-first and lower-pressure.',
        rationaleTags: undefined,
      } as any,
      initiative: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.64,
          restPressure: 0.18,
          memoryResonance: 0.7,
          companionshipTempo: 0.44,
          summary: 'cadence:ready-return | rest:low-pressure | mood:focused',
          rationale: undefined,
        },
      } as any,
      threadRuntime: {
        foregroundThreadId: 'thread-same-her-sparse',
      } as any,
      thoughtThreads: {
        foregroundThreadId: 'thought-same-her-sparse',
      } as any,
      affectiveResidue: {
        dominantResidueKind: 'afterglow',
        summary: 'The same callback line should stay lower-pressure and hover-first.',
        sourceSignals: undefined,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          afterglowCarry: 0.24,
          shouldDelayWarmth: true,
          overreachRisk: 0.22,
          reasonTags: undefined,
          summary: 'hover first before anything warmer outward reopens',
        },
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-cadence-sparse',
        patchId: 'patch-same-her-cadence-sparse',
        decisionTraceId: 'trace-same-her-cadence-sparse',
        summary: 'continuity=same-her-baseline | keep the return hover-first and lower-pressure on the same line',
        lanes: undefined,
        reasonCodes: undefined,
      } as any,
    })

    expect(cadence.reasonTags).toContain('continuity-governance:same-her-baseline')
    expect(cadence.reasonTags).toContain('continuity-rhythm:hover-first')
    expect(cadence.cadencePressure).toBeLessThan(0.3)
  })

  it('marks hover-first rhythm when identity-continuity', () => {
    const cadence = deriveProactiveCadenceSignal({
      state: {
        ...createDefaultProactiveLoopState(10_000),
        openingMomentum: 0.58,
        initiativeTrust: 0.62,
      },
      context: {
        ...createContext(),
        relationship: {
          ...createContext().relationship,
          fatigue: 22,
          minutesSinceLastUserTurn: 16,
        },
      } as any,
      privateThought: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.6,
          restPressure: 0.24,
          memoryResonance: 0.62,
          companionshipTempo: 0.34,
          summary: 'cadence:ready-return | rest:low-pressure | mood:focused',
          rationale: ['The line is live, but the opening should still hover first.'],
        },
      } as any,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 20_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.42,
        repairPressure: 0.16,
        burdenPressure: 0.18,
        trustPressure: 0.34,
        restProtectivePressure: 0.12,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.28,
          repairRecovery: 0.4,
          overreachRisk: 0.22,
          fatigueGuard: 0.14,
          afterglowCarry: 0.36,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:afterglow'],
          summary: 'The line is live, but warmth should stay delayed.',
        },
        sourceSignals: ['afterglow still live'],
        summary: 'Afterglow remains alive but should hover-first.',
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-same-her-cadence-hover-1',
        patchId: 'patch-same-her-cadence-hover-1',
        decisionTraceId: 'trace-same-her-cadence-hover-1',
        summary: 'continuity=same-her-baseline | keep the next return hover-first before any warmer outward move',
        lanes: ['relationship-posture'],
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
      } as any,
    })

    expect(cadence.reasonTags).toContain('continuity-rhythm:hover-first')
  })

  it('treats richer Phase 1 project-closure carry as cadence-softening continuity authority even without the older same-her-baseline marker', () => {
    const baseline = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context: {
        ...createContext(),
        localTime: {
          hour: 14,
          minute: 18,
          isLateNight: false,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 20,
          lateNightActiveMinutes: 0,
          minutesSinceLastUserTurn: 18,
        },
      } as any,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The line is still open and could reopen quickly.',
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
          cadencePressure: 0.66,
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
      context: {
        ...createContext(),
        localTime: {
          hour: 14,
          minute: 18,
          isLateNight: false,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 20,
          lateNightActiveMinutes: 0,
          minutesSinceLastUserTurn: 18,
        },
      } as any,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The local continuity state is still open, but it should not reopen like generic project chatter.',
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
          cadencePressure: 0.66,
          restPressure: 0.18,
          memoryResonance: 0.7,
          companionshipTempo: 0.44,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'project-phase-carry',
        candidateId: 'candidate-project-closure-carry-1',
        patchId: 'patch-project-closure-carry-1',
        decisionTraceId: 'trace-project-closure-carry-1',
        summary: 'Phase 1: Local Digital Life | project identity carry is live, but memory, initiative, and embodiment still belong to one continuity state of unfinished closure before any wider reopening.',
        lanes: ['project-state', 'relationship-posture'],
        reasonCodes: ['project-state-same-her-continuity-required'],
      } as any,
    })

    expect(continuityWeighted.openingMomentum).toBeLessThan(baseline.openingMomentum)

    const baselineCadence = deriveProactiveCadenceSignal({
      state: baseline,
      context: {
        ...createContext(),
        localTime: {
          hour: 14,
          minute: 18,
          isLateNight: false,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 20,
          lateNightActiveMinutes: 0,
          minutesSinceLastUserTurn: 18,
        },
      } as any,
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
          cadencePressure: 0.66,
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
      context: {
        ...createContext(),
        localTime: {
          hour: 14,
          minute: 18,
          isLateNight: false,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 20,
          lateNightActiveMinutes: 0,
          minutesSinceLastUserTurn: 18,
        },
      } as any,
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
          cadencePressure: 0.66,
          restPressure: 0.18,
          memoryResonance: 0.7,
          companionshipTempo: 0.44,
          summary: 'cadence:ready-return | rest:open | mood:focused',
          rationale: ['The thread is still live enough to reopen quickly.'],
        },
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'project-phase-carry',
        candidateId: 'candidate-project-closure-carry-1',
        patchId: 'patch-project-closure-carry-1',
        decisionTraceId: 'trace-project-closure-carry-1',
        summary: 'Phase 1: Local Digital Life | project identity carry is live, but memory, initiative, and embodiment still belong to one continuity state of unfinished closure before any wider reopening.',
        lanes: ['project-state', 'relationship-posture'],
        reasonCodes: ['project-state-same-her-continuity-required'],
      } as any,
    })

    expect(continuityCadence.cadencePressure).toBeLessThan(baselineCadence.cadencePressure)
    expect(continuityCadence.reasonTags).toEqual(expect.arrayContaining([
      'continuity-governance:same-her-baseline',
      'continuity-governance:project-closure-carry',
    ]))
  })

  it('lets remembered embodiment cadence in self-evolution keep opening momentum lower even when explicit callback carry is thin', () => {
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
          fatigue: 22,
          lateNightActiveMinutes: 0,
          minutesSinceLastUserTurn: 14,
        },
      } as any,
      privateThought: {
        shouldSpeak: true,
        thoughtText: 'The line is warm, but the return should stay careful.',
      } as any,
      personalityContinuityState: {
        currentRegime: 'dialogue',
        rhythmState: {
          cadenceMode: 'warm-hold',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.46,
          restPressure: 0.2,
          memoryResonance: 0.58,
          companionshipTempo: 0.34,
          summary: 'cadence:warm-hold | rest:low-pressure | mood:focused',
          rationale: ['The return is real, but should not widen too quickly.'],
        },
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
        burdenLine: 'Do not crowd the host with eager re-entry.',
        trustMeaning: 'Measured warmth is trusted when the timing stays lower-pressure.',
        latestInflection: 'Embodiment execution kept voice, face, motion, and lipsync on the same measured-return body line, so the relationship cadence is landing as durable rhythm instead of a one-off restraint.',
        evolutionMomentum: 0.72,
        learningReadiness: 0.78,
        nextLearningAction: 'internalize',
        shouldInternalize: true,
      } as any,
    })

    expect(progressed.openingMomentum).toBeLessThan(0.18)

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
          fatigue: 22,
          lateNightActiveMinutes: 0,
          minutesSinceLastUserTurn: 14,
        },
      } as any,
      privateThought: {
        shouldSpeak: true,
      } as any,
      personalityContinuityState: {
        currentRegime: 'dialogue',
        rhythmState: {
          cadenceMode: 'warm-hold',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: 'focused-flow',
          cadencePressure: 0.46,
          restPressure: 0.2,
          memoryResonance: 0.58,
          companionshipTempo: 0.34,
          summary: 'cadence:warm-hold | rest:low-pressure | mood:focused',
          rationale: ['The return is real, but should not widen too quickly.'],
        },
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
        burdenLine: 'Do not crowd the host with eager re-entry.',
        trustMeaning: 'Measured warmth is trusted when the timing stays lower-pressure.',
        latestInflection: 'Embodiment execution kept voice, face, motion, and lipsync on the same measured-return body line, so the relationship cadence is landing as durable rhythm instead of a one-off restraint.',
        evolutionMomentum: 0.72,
        learningReadiness: 0.78,
        nextLearningAction: 'internalize',
        shouldInternalize: true,
      } as any,
    })

    expect(cadence.reasonTags).toContain('self-evolution:embodiment-cadence-confirmed')
    expect(cadence.cadencePressure).toBeLessThan(0.18)
  })

  it('lets emotional self-revision governance suppress proactive cadence from emotion reason codes alone', () => {
    const context = {
      ...createContext(),
      localTime: {
        hour: 15,
        minute: 18,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 18,
        lateNightActiveMinutes: 0,
        minutesSinceLastUserTurn: 18,
      },
    } as any
    const privateThought = {
      shouldSpeak: true,
      thoughtText: 'The repair line is still warm enough that I could reopen it now.',
    } as any
    const initiative = {
      shouldSpeak: true,
    } as any
    const rhythm = {
      currentRegime: 'focused-work',
      rhythmState: {
        cadenceMode: 'ready-return',
        restMode: 'open',
        embodiedPresence: 'attentive',
        suggestedStyle: 'light-nudge',
        moodLabel: 'focused',
        emotionalTension: 'focused-flow',
        cadencePressure: 0.66,
        restPressure: 0.16,
        memoryResonance: 0.68,
        companionshipTempo: 0.42,
        summary: 'cadence:ready-return | rest:open | mood:focused',
        rationale: ['The thread is warm enough to reopen quickly.'],
      },
    } as any
    const emotionalGovernance = {
      source: 'active-self-evolution-version',
      mode: 'emotional-self-revision',
      candidateId: 'emotion-repair-governance-1',
      patchId: 'emotional-transition:turn-repair-1:120000:state-patch',
      decisionTraceId: 'trace-emotion-repair-governance-1',
      summary: 'Repair-first emotional carry should hold initiative behind repair before warmth widens.',
      lanes: ['proactive-policy'],
      reasonCodes: [
        'emotion-transition:repair-shift',
        'emotion-initiative:repair-first',
        'emotion-embodiment:repair-before-closeness',
        'same-her-emotional-closure-carry-active',
      ],
    } as any

    const baselineState = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
    })
    const guardedState = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
      activeContinuityGovernance: emotionalGovernance,
    })

    const baselineCadence = deriveProactiveCadenceSignal({
      state: baselineState,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
    })
    const guardedCadence = deriveProactiveCadenceSignal({
      state: guardedState,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
      activeContinuityGovernance: emotionalGovernance,
    })

    expect(guardedState.openingMomentum).toBeLessThan(baselineState.openingMomentum)
    expect(guardedCadence.cadencePressure).toBeLessThan(baselineCadence.cadencePressure)
    expect(guardedCadence.reasonTags).toEqual(expect.arrayContaining([
      'continuity-governance:emotional-self-revision',
      'continuity-governance:emotion-initiative-suppression',
    ]))
  })

  it('lets active emotional decay hold suppress proactive cadence while released decay no longer restrains initiative', () => {
    const context = {
      ...createContext(),
      localTime: {
        hour: 15,
        minute: 28,
        isLateNight: false,
      },
      relationship: {
        ...createContext().relationship,
        fatigue: 12,
        lateNightActiveMinutes: 0,
        minutesSinceLastUserTurn: 18,
      },
    } as any
    const privateThought = {
      shouldSpeak: true,
      thoughtText: 'The thread is warm and could reopen now.',
    } as any
    const initiative = {
      shouldSpeak: true,
    } as any
    const rhythm = {
      currentRegime: 'focused-work',
      rhythmState: {
        cadenceMode: 'ready-return',
        restMode: 'open',
        embodiedPresence: 'attentive',
        suggestedStyle: 'light-nudge',
        moodLabel: 'focused',
        emotionalTension: 'focused-flow',
        cadencePressure: 0.68,
        restPressure: 0.12,
        memoryResonance: 0.68,
        companionshipTempo: 0.48,
        summary: 'cadence:ready-return | rest:open | mood:focused',
        rationale: ['The thread is warm enough to reopen quickly.'],
      },
    } as any
    const emotionalDecayHold = {
      version: 'emotional-transition-decay-v1',
      ledgerCreatedAt: 100_000,
      evaluatedAt: 110_000,
      elapsedMs: 10_000,
      expiresAt: 1_900_000,
      phase: 'hold',
      shouldSuppressInitiative: true,
      shouldDriveEmbodiment: true,
      initiativeMode: 'repair-first',
      embodimentTone: 'repair-before-closeness',
      memoryWritebackLane: 'relationship-repair',
      reasonTags: [
        'emotion-decay:hold-until-repair-cools',
        'emotion-decay:within-window',
        'emotion-decay:repair-still-hot',
      ],
      summary: 'Repair is still inside the hold window.',
    } as any
    const emotionalDecayRelease = {
      ...emotionalDecayHold,
      evaluatedAt: 2_100_000,
      elapsedMs: 2_000_000,
      phase: 'release',
      shouldSuppressInitiative: false,
      shouldDriveEmbodiment: false,
      initiativeMode: 'none',
      embodimentTone: null,
      memoryWritebackLane: 'none',
      reasonTags: [
        'emotion-decay:hold-until-repair-cools',
        'emotion-decay:expired',
        'emotion-decay:released',
      ],
      summary: 'Repair has cooled enough to release initiative.',
    } as any

    const baselineState = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
    })
    const heldState = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
      emotionalTransitionDecay: emotionalDecayHold,
    })
    const releasedState = progressProactiveCadenceState({
      state: createDefaultProactiveLoopState(10_000),
      now: 20_000,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
      emotionalTransitionDecay: emotionalDecayRelease,
    })

    const baselineCadence = deriveProactiveCadenceSignal({
      state: baselineState,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
    })
    const heldCadence = deriveProactiveCadenceSignal({
      state: heldState,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
      emotionalTransitionDecay: emotionalDecayHold,
    })
    const releasedCadence = deriveProactiveCadenceSignal({
      state: releasedState,
      context,
      privateThought,
      initiative,
      personalityContinuityState: rhythm,
      emotionalTransitionDecay: emotionalDecayRelease,
    })

    expect(heldState.openingMomentum).toBeLessThan(baselineState.openingMomentum)
    expect(heldCadence.cadencePressure).toBeLessThan(baselineCadence.cadencePressure)
    expect(heldCadence.reasonTags).toEqual(expect.arrayContaining([
      'emotion-decay:hold',
      'emotion-decay:repair-first',
      'emotion-decay:repair-before-closeness',
    ]))
    expect(releasedState.openingMomentum).toBe(baselineState.openingMomentum)
    expect(releasedCadence.cadencePressure).toBe(baselineCadence.cadencePressure)
    expect(releasedCadence.reasonTags).toContain('emotion-decay:released')
  })
})
