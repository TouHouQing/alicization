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
})
