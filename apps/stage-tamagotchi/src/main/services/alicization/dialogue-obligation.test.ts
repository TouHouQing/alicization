import { describe, expect, it } from 'vitest'

import { buildDialogueObligation } from './dialogue-obligation'

const baseContext = {
  localTime: { hour: 13, minute: 45, isLateNight: false },
  system: {
    cpuUsage: 19,
    battery: { percent: 82, charging: true },
    memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
    idleSeconds: 8,
    inputActivity: 'active' as const,
    fullscreenLikely: false,
    foregroundWindow: {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - diff',
      pid: 9,
    },
    degradedSignals: [],
  },
  workload: {
    kind: 'coding' as const,
    confidence: 0.86,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['cursor'],
  },
  content: {
    kind: 'diff' as const,
    confidence: 0.82,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['diff'],
    summary: 'runtime.ts - diff',
  },
  relationship: {
    hostAttitude: '平静而专注',
    boredom: 10,
    loneliness: 16,
    fatigue: 22,
    minutesSinceLastUserTurn: 1,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

const baseWorldModel = {
  activeThread: {
    id: 'thread::runtime',
    kind: 'change-review' as const,
    status: 'active' as const,
    source: 'grounded-scene' as const,
    title: 'runtime.ts diff',
    summary: 'The host is working through a runtime diff.',
    confidence: 0.84,
    significance: 0.82,
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
    openQuestions: [],
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
}

describe('dialogue-obligation', () => {
  it('mutes the persona kernel when the turn is about repair and truth recovery', () => {
    const obligation = buildDialogueObligation({
      semantics: {
        act: 'correct',
        responseNeed: 'repair',
        truthExpectation: 'strict',
        affectiveTone: 'urgent',
        taskAnchor: 'runtime.ts diff',
        sharedAttentionDemand: 0.86,
        personaSuppression: 0.84,
        confidence: 0.82,
        summary: 'repair the stale diff reading first',
        source: 'hybrid',
        reasonTags: ['host-correction'],
      },
      context: baseContext,
      worldModel: {
        ...baseWorldModel,
        epistemicState: {
          ...baseWorldModel.epistemicState,
          certainty: 'lingering',
        },
      },
      privateThought: {
        stance: 'uncertain',
        confidence: 0.68,
        rationaleTags: [],
        thoughtText: 'The live surface still needs repair.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'hesitant',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
    })

    expect(obligation.kind).toBe('repair')
    expect(obligation.mustRepairFirst).toBe(true)
    expect(obligation.personaKernelMode).toBe('muted')
    expect(obligation.mustStayTaskBound).toBe(true)
  })

  it('backgrounds persona while keeping coding help task-bound', () => {
    const obligation = buildDialogueObligation({
      semantics: {
        act: 'ask-help',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        affectiveTone: 'neutral',
        taskAnchor: 'runtime.ts diff',
        sharedAttentionDemand: 0.72,
        personaSuppression: 0.66,
        confidence: 0.8,
        summary: 'guide through the current diff knot',
        source: 'hybrid',
        reasonTags: ['coding-question'],
      },
      context: baseContext,
      worldModel: baseWorldModel,
    })

    expect(obligation.kind).toBe('guide')
    expect(obligation.personaKernelMode).toBe('backgrounded')
    expect(obligation.mustRepairFirst).toBe(false)
    expect(obligation.mustStayTaskBound).toBe(true)
    expect(obligation.mustAnswerDirectly).toBe(true)
  })

  it('keeps warmth available for care turns instead of muting the whole persona kernel', () => {
    const obligation = buildDialogueObligation({
      semantics: {
        act: 'share-state',
        responseNeed: 'care',
        truthExpectation: 'normal',
        affectiveTone: 'tired',
        taskAnchor: null,
        sharedAttentionDemand: 0.34,
        personaSuppression: 0.22,
        confidence: 0.72,
        summary: 'care for the host while staying with the present moment',
        source: 'heuristic',
        reasonTags: ['fatigue-state'],
      },
      context: {
        ...baseContext,
        relationship: {
          ...baseContext.relationship,
          fatigue: 68,
          lateNightActiveMinutes: 110,
        },
      },
      worldModel: {
        ...baseWorldModel,
        activeThread: {
          ...baseWorldModel.activeThread,
          kind: 'late-night-endurance',
        },
      },
      privateThought: {
        stance: 'care',
        confidence: 0.74,
        rationaleTags: [],
        thoughtText: 'The host looks drained.',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'late-night-drain',
      },
    })

    expect(obligation.kind).toBe('care')
    expect(obligation.personaKernelMode).toBe('full')
    expect(obligation.mustRepairFirst).toBe(false)
    expect(obligation.mustAnswerDirectly).toBe(true)
  })
})
