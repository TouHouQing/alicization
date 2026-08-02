import { describe, expect, it } from 'vitest'

import { buildConversationState } from './conversation-state'
import { buildDialogueTurnEncounter } from './dialogue-turn-encounter'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildDiscourseState } from './discourse-state'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

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

const weakCodingScene = {
  workloadKind: 'unknown' as const,
  contentKind: 'unknown' as const,
  scenario: 'coding' as const,
  summary: 'Entire screen',
  source: 'foreground-window-heuristic' as const,
  confidence: 0.46,
  target: {
    appName: 'Finder',
    processName: 'Finder',
    title: 'Entire screen',
    pid: 42,
  },
  beganAt: 0,
  lastSeenAt: 30_000,
}

describe('dialogue-turn-encounter', () => {
  it('normalizes detached dialogue-first complaints into a self-owned turn encounter', () => {
    const encounter = buildDialogueTurnEncounter({
      semantics: {
        act: 'challenge',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        subjectPreference: 'alicization-self',
        taskAnchor: null,
        sharedAttentionDemand: 0.26,
        personaSuppression: 0.58,
        confidence: 0.84,
        summary: 'The host is criticizing Alicization herself and expects a direct answer.',
        source: 'hybrid',
        reasonTags: ['scene-detached-turn', 'dialogue-first-turn'],
      },
      context: baseContext,
      currentScene: weakCodingScene,
      worldModel: baseWorldModel,
      inspectionRequested: true,
      inspectionState: 'inspection-live',
      releaseInspectionCarry: false,
    })

    expect(encounter.subject).toBe('alicization-self')
    expect(encounter.screenReferenceMode).toBe('avoid')
    expect(encounter.inspectionRequested).toBe(false)
    expect(encounter.inspectionState).toBe('dialogue-first')
    expect(encounter.mustAnswerDirectly).toBe(true)
    expect(encounter.shouldBypassScreenRepair).toBe(true)
  })

  it('lets discourse state trust encounter ownership over stale loose scene fields', () => {
    const encounter = buildDialogueTurnEncounter({
      semantics: {
        act: 'challenge',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        subjectPreference: 'alicization-self',
        taskAnchor: null,
        sharedAttentionDemand: 0.26,
        personaSuppression: 0.58,
        confidence: 0.84,
        summary: 'The host is criticizing Alicization herself and expects a direct answer.',
        source: 'hybrid',
        reasonTags: ['scene-detached-turn', 'dialogue-first-turn'],
      },
      context: baseContext,
      currentScene: weakCodingScene,
      worldModel: baseWorldModel,
      inspectionRequested: false,
      inspectionState: 'dialogue-first',
    })

    const state = buildDiscourseState({
      now: 14_000,
      userText: '你为什么不回答我',
      dialogueEncounter: encounter,
      dialogueSemantics: {
        ...encounter.semantics,
        subjectPreference: 'visible-scene',
        summary: 'stale screen repair summary',
      },
      dialogueObligation: {
        ...encounter.obligation,
        kind: 'guide',
        summary: 'stale guide summary',
        mustStayTaskBound: true,
      },
      dialogueFocus: {
        ...encounter.focus,
        subject: 'visible-scene',
        screenReferenceMode: 'required',
        focusSummary: 'Entire screen',
        shouldBypassScreenRepair: false,
      },
      worldModel: baseWorldModel,
    })

    expect(state).toEqual(expect.objectContaining({
      currentTurnSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      owedAction: 'answer-self',
      continuityMode: 'dialogue-first',
    }))
  })

  it('keeps conversation state dialogue-carry when encounter says the turn is self-owned', () => {
    const encounter = buildDialogueTurnEncounter({
      semantics: {
        act: 'challenge',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        subjectPreference: 'alicization-self',
        taskAnchor: null,
        sharedAttentionDemand: 0.26,
        personaSuppression: 0.58,
        confidence: 0.84,
        summary: 'The host is criticizing Alicization herself and expects a direct answer.',
        source: 'hybrid',
        reasonTags: ['scene-detached-turn', 'dialogue-first-turn'],
      },
      context: baseContext,
      currentScene: weakCodingScene,
      worldModel: baseWorldModel,
      inspectionRequested: false,
      inspectionState: 'dialogue-first',
    })

    const discourseState = buildDiscourseState({
      now: 14_000,
      userText: '你为什么不回答我',
      dialogueEncounter: encounter,
      worldModel: baseWorldModel,
    })

    const state = buildConversationState({
      now: 14_000,
      userText: '你为什么不回答我',
      dialogueEncounter: encounter,
      dialogueSemantics: {
        ...encounter.semantics,
        taskAnchor: 'runtime.ts diff',
        summary: 'stale coding seam',
      },
      discourseState,
      worldModel: baseWorldModel,
    })

    expect(state).toEqual(expect.objectContaining({
      memoryMode: 'dialogue-carry',
      continuityPolicy: 'dialogue-before-scene',
      activeProject: null,
    }))
  })

  it('prefers runtimeSurface scene and world state over conflicting raw encounter inputs', () => {
    const runtimeBackedState = createDefaultVisualPresenceState(32_000)
    runtimeBackedState.currentScene = {
      workloadKind: 'coding',
      contentKind: 'diff',
      scenario: 'coding',
      summary: 'runtime.ts diff',
      source: 'foreground-window-heuristic',
      confidence: 0.9,
      target: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - diff',
        pid: 42,
      },
      beganAt: 0,
      lastSeenAt: 32_000,
    } as any
    runtimeBackedState.worldModel = baseWorldModel as any

    const encounter = buildDialogueTurnEncounter({
      semantics: {
        act: 'ask-help',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        affectiveTone: 'urgent',
        taskAnchor: null,
        sharedAttentionDemand: 0.88,
        personaSuppression: 0.74,
        confidence: 0.86,
        summary: '',
        source: 'hybrid',
        reasonTags: ['scene-bound-turn', 'coding-question'],
      },
      context: baseContext,
      currentScene: weakCodingScene,
      worldModel: {
        ...baseWorldModel,
        activeThread: {
          ...baseWorldModel.activeThread,
          title: 'raw conflict',
          summary: 'raw conflict',
          confidence: 0.22,
        },
        epistemicState: {
          ...baseWorldModel.epistemicState,
          certainty: 'uncertain',
        },
      },
      inspectionRequested: true,
      inspectionState: 'inspection-live',
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(encounter.subject).toBe('task-knot')
    expect(encounter.screenReferenceMode).toBe('helpful')
    expect(encounter.continuityMode).toBe('task-first')
    expect(encounter.summary).toBe('')
    expect(encounter.shouldBypassScreenRepair).toBe(false)
  })

  it('surfaces project-state identity-continuity', () => {
    const encounter = buildDialogueTurnEncounter({
      semantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'neutral',
        subjectPreference: 'alicization-self',
        taskAnchor: '这个项目现在是什么、做到什么程度了、还差什么没闭环？',
        sharedAttentionDemand: 0.34,
        personaSuppression: 0.46,
        confidence: 0.82,
        summary: 'The host is asking what this project is, what has landed, and what still remains open.',
        source: 'hybrid',
        reasonTags: ['runtime-continuity-question', 'dialogue-first-turn', 'scene-detached-turn'],
      },
      context: baseContext,
      currentScene: weakCodingScene,
      worldModel: baseWorldModel,
      inspectionRequested: false,
      inspectionState: 'dialogue-first',
    })

    expect(encounter.subject).toBe('alicization-self')
    expect(encounter.summary).toBe('')
    expect(encounter.reasonTags).toContain('runtime-continuity-question')
  })
})
