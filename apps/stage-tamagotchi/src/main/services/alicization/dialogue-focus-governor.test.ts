import { describe, expect, it } from 'vitest'

import { buildDialogueFocusGovernance } from './dialogue-focus-governor'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const codingScene = {
  workloadKind: 'coding' as const,
  contentKind: 'diff' as const,
  scenario: 'coding' as const,
  summary: 'runtime.ts diff',
  source: 'foreground-window-heuristic' as const,
  confidence: 0.86,
  target: {
    appName: 'Cursor',
    processName: 'Cursor',
    title: 'runtime.ts - diff',
    pid: 42,
  },
  beganAt: 0,
  lastSeenAt: 30_000,
}

const runtimeWorldModel = {
  activeThread: {
    id: 'thread::runtime',
    kind: 'change-review' as const,
    status: 'active' as const,
    source: 'grounded-scene' as const,
    title: 'runtime.ts diff',
    summary: 'The runtime diff is still the live knot.',
    confidence: 0.88,
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

describe('dialogue-focus-governor', () => {
  it('treats detached self questions as Alicization-self answers that avoid screen repair drift', () => {
    const focus = buildDialogueFocusGovernance({
      semantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'neutral',
        taskAnchor: 'runtime.ts diff',
        sharedAttentionDemand: 0.22,
        personaSuppression: 0.42,
        confidence: 0.84,
        summary: 'answer the host\'s direct question: 你喜欢做什么？',
        source: 'hybrid',
        reasonTags: ['scene-detached-turn', 'question-turn'],
      },
      obligation: {
        kind: 'answer',
        summary: 'answer the host\'s direct question: 你喜欢做什么？',
        confidence: 0.82,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      currentScene: {
        ...codingScene,
        summary: 'Entire screen',
        target: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Entire screen',
          pid: 42,
        },
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff.',
          confidence: 0.72,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
    })

    expect(focus.subject).toBe('alicization-self')
    expect(focus.screenReferenceMode).toBe('avoid')
    expect(focus.shouldBypassScreenRepair).toBe(true)
    expect(focus.reasonTags).toContain('weak-live-scene')
  })

  it('keeps diff/debug questions task-shaped instead of detaching them from the live knot', () => {
    const focus = buildDialogueFocusGovernance({
      semantics: {
        act: 'verify-grounding',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        affectiveTone: 'urgent',
        taskAnchor: 'runtime.ts diff',
        sharedAttentionDemand: 0.86,
        personaSuppression: 0.74,
        confidence: 0.88,
        summary: 'verify-grounding around runtime.ts diff',
        source: 'hybrid',
        reasonTags: ['scene-bound-turn', 'coding-question'],
      },
      obligation: {
        kind: 'guide',
        summary: 'verify-grounding around runtime.ts diff',
        confidence: 0.84,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      currentScene: codingScene,
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff.',
          confidence: 0.88,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
    })

    expect(focus.subject).toBe('task-knot')
    expect(focus.screenReferenceMode).toBe('helpful')
    expect(focus.shouldBypassScreenRepair).toBe(false)
  })

  it('does not let non-scene complaints collapse back into visible-scene repair', () => {
    const focus = buildDialogueFocusGovernance({
      semantics: {
        act: 'challenge',
        responseNeed: 'repair',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        taskAnchor: 'general unknown',
        sharedAttentionDemand: 0.3,
        personaSuppression: 0.24,
        confidence: 0.74,
        summary: 'The host is challenging Alicization herself, not asking for scene truth.',
        source: 'hybrid',
        reasonTags: ['direct-complaint', 'thread-continuation'],
      },
      obligation: {
        kind: 'answer',
        summary: 'Answer the complaint directly.',
        confidence: 0.72,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      currentScene: {
        ...codingScene,
        workloadKind: 'unknown',
        contentKind: 'unknown',
        summary: 'general unknown',
        target: null,
      },
      worldModel: {
        activeThread: {
          id: 'thread::inspection',
          kind: 'unknown',
          status: 'active',
          source: 'continuity',
          title: 'general unknown',
          summary: 'stale inspection carry',
          confidence: 0.48,
          significance: 0.42,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
    })

    expect(focus.subject).toBe('alicization-self')
    expect(focus.screenReferenceMode).toBe('avoid')
    expect(focus.shouldBypassScreenRepair).toBe(true)
  })

  it('uses ownership ssot when provided, even if semantics would suggest scene repair', () => {
    const focus = buildDialogueFocusGovernance({
      semantics: {
        act: 'verify-grounding',
        responseNeed: 'repair',
        truthExpectation: 'strict',
        affectiveTone: 'urgent',
        taskAnchor: 'runtime.ts diff',
        sharedAttentionDemand: 0.9,
        personaSuppression: 0.88,
        confidence: 0.86,
        summary: 'A stale classifier still marks this as scene repair.',
        source: 'hybrid',
        reasonTags: ['scene-bound-turn', 'inspection-owned-turn'],
      },
      obligation: {
        kind: 'repair',
        summary: 'Repair the scene first.',
        confidence: 0.8,
        mustRepairFirst: true,
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'muted',
        narrative: [],
      },
      ownership: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        continuityMode: 'dialogue-first',
        inspectionRequested: false,
        inspectionState: 'dialogue-first',
        releaseInspectionCarry: true,
        confidence: 0.84,
        reasonTags: ['subject:alicization-self'],
      },
      currentScene: codingScene,
      worldModel: null,
    })

    expect(focus.subject).toBe('alicization-self')
    expect(focus.screenReferenceMode).toBe('avoid')
    expect(focus.reasonTags).toContain('ownership-ssot')
  })

  it('prefers runtimeSurface scene and world state over conflicting raw inputs', () => {
    const runtimeBackedState = createDefaultVisualPresenceState(40_000)
    runtimeBackedState.currentScene = codingScene as any
    runtimeBackedState.worldModel = runtimeWorldModel as any

    const focus = buildDialogueFocusGovernance({
      semantics: {
        act: 'verify-grounding',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        affectiveTone: 'urgent',
        taskAnchor: null,
        sharedAttentionDemand: 0.86,
        personaSuppression: 0.72,
        confidence: 0.84,
        summary: '',
        source: 'hybrid',
        reasonTags: ['scene-bound-turn', 'coding-question'],
      },
      obligation: {
        kind: 'guide',
        summary: '',
        confidence: 0.82,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      currentScene: {
        ...codingScene,
        workloadKind: 'unknown',
        contentKind: 'unknown',
        summary: 'Entire screen',
        target: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Entire screen',
          pid: 42,
        },
      },
      worldModel: {
        ...runtimeWorldModel,
        activeThread: {
          ...runtimeWorldModel.activeThread,
          title: 'raw conflict',
          summary: 'raw conflict',
          confidence: 0.22,
        },
        epistemicState: {
          ...runtimeWorldModel.epistemicState,
          certainty: 'uncertain',
          freshness: 'stale',
        },
      },
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(focus.subject).toBe('task-knot')
    expect(focus.screenReferenceMode).toBe('helpful')
    expect(focus.weakLiveScene).toBe(false)
    expect(focus.focusSummary).toBe('The runtime diff is still the live knot.')
  })

  it('does not let legacy project-state tags override the declared focus subject', () => {
    const focus = buildDialogueFocusGovernance({
      semantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'neutral',
        subjectPreference: 'general',
        taskAnchor: '这个项目现在到底是什么、做到什么程度、还差什么没闭环',
        sharedAttentionDemand: 0.34,
        personaSuppression: 0.46,
        confidence: 0.82,
        summary: '',
        source: 'heuristic',
        reasonTags: ['runtime-continuity-question'],
      },
      currentScene: codingScene,
      worldModel: runtimeWorldModel,
    })

    expect(focus.subject).toBe('general')
    expect(focus.reasonTags).not.toContain('runtime-continuity')
  })
})
