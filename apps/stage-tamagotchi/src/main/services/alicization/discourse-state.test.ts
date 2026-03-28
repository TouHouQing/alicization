import { describe, expect, it } from 'vitest'

import {
  buildDiscourseState,
  buildDiscourseStateSystemBlock,
} from './discourse-state'

describe('buildDiscourseState', () => {
  it('keeps detached self turns dialogue-first and screen-avoidant', () => {
    const state = buildDiscourseState({
      now: 10_000,
      dialogueSemantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'neutral',
        taskAnchor: null,
        sharedAttentionDemand: 0.14,
        personaSuppression: 0.4,
        confidence: 0.9,
        summary: 'The host is asking Alicization about herself.',
        source: 'hybrid',
        reasonTags: ['scene-detached-turn'],
      },
      dialogueObligation: {
        kind: 'answer',
        summary: 'Answer the self question directly.',
        confidence: 0.82,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'full',
        narrative: [],
      },
      dialogueFocus: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        shouldBypassScreenRepair: true,
        weakLiveScene: true,
        focusSummary: 'The host wants Alicization to answer from her own continuity.',
        confidence: 0.92,
        reasonTags: [],
      },
    })

    expect(state).toEqual(expect.objectContaining({
      currentTurnSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      owedAction: 'answer-self',
      relationMove: 'self-disclose',
      continuityMode: 'dialogue-first',
    }))
    expect(buildDiscourseStateSystemBlock(state)).toContain('[ALICIZATION_DISCOURSE_STATE]')
  })

  it('promotes visible-scene repair turns into repair-truth obligations', () => {
    const state = buildDiscourseState({
      now: 12_000,
      dialogueSemantics: {
        act: 'verify-grounding',
        responseNeed: 'repair',
        truthExpectation: 'strict',
        affectiveTone: 'urgent',
        taskAnchor: 'recheck the live diff',
        sharedAttentionDemand: 0.82,
        personaSuppression: 0.88,
        confidence: 0.86,
        summary: 'The host wants the live diff rechecked.',
        source: 'hybrid',
        reasonTags: ['scene-bound-turn'],
      },
      dialogueObligation: {
        kind: 'repair',
        summary: 'Repair the current scene grounding before answering.',
        confidence: 0.9,
        mustRepairFirst: true,
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'muted',
        narrative: [],
      },
      dialogueFocus: {
        subject: 'visible-scene',
        screenReferenceMode: 'required',
        shouldBypassScreenRepair: false,
        weakLiveScene: false,
        focusSummary: 'The turn is explicitly about the visible scene.',
        confidence: 0.88,
        reasonTags: [],
      },
      previous: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'previous knot',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'task-first',
        unresolvedCarry: 'old thread',
        ruptureRepair: null,
        confidence: 0.4,
        narrative: [],
        updatedAt: 5_000,
      },
    })

    expect(state).toEqual(expect.objectContaining({
      currentTurnSubject: 'visible-scene',
      screenReferenceMode: 'required',
      owedAction: 'repair-truth',
      relationMove: 'repair',
      continuityMode: 'scene-first',
    }))
  })

  it('lets dialogue-first semantics outrank stale task focus when they conflict', () => {
    const state = buildDiscourseState({
      now: 13_000,
      userText: '你是笨蛋吗',
      dialogueSemantics: {
        act: 'challenge',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        subjectPreference: 'alicization-self',
        taskAnchor: null,
        sharedAttentionDemand: 0.24,
        personaSuppression: 0.52,
        confidence: 0.86,
        summary: 'The host is challenging Alicization directly and expects a plain direct answer.',
        source: 'hybrid',
        reasonTags: ['scene-detached-turn', 'dialogue-first-turn'],
      },
      dialogueObligation: {
        kind: 'guide',
        summary: 'A stale task thread is still lingering.',
        confidence: 0.6,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      dialogueFocus: {
        subject: 'task-knot',
        screenReferenceMode: 'helpful',
        shouldBypassScreenRepair: false,
        weakLiveScene: false,
        focusSummary: 'Codex IDE with AI chat interface',
        confidence: 0.58,
        reasonTags: [],
      },
    })

    expect(state).toEqual(expect.objectContaining({
      currentTurnSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      owedAction: 'answer-self',
      relationMove: 'self-disclose',
      continuityMode: 'dialogue-first',
    }))
  })

  it('does not let inspection carry override an already dialogue-first self turn', () => {
    const state = buildDiscourseState({
      now: 14_000,
      userText: '能不能说人话',
      inspectionRequested: true,
      dialogueSemantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        subjectPreference: 'alicization-self',
        taskAnchor: null,
        sharedAttentionDemand: 0.28,
        personaSuppression: 0.44,
        confidence: 0.82,
        summary: 'The host is challenging how Alicization is answering and expects a plain direct answer.',
        source: 'heuristic',
        reasonTags: ['question-turn', 'scene-detached-turn', 'dialogue-first-turn'],
      },
      dialogueObligation: {
        kind: 'answer',
        summary: 'Answer the complaint directly.',
        confidence: 0.76,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      dialogueFocus: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        shouldBypassScreenRepair: true,
        weakLiveScene: true,
        focusSummary: 'The host is criticizing Alicization’s answer itself.',
        confidence: 0.8,
        reasonTags: [],
      },
      worldModel: {
        activeThread: {
          id: 'thread::screen',
          kind: 'change-review',
          status: 'active',
          source: 'continuity',
          title: 'Entire screen',
          summary: 'Stale screen carry still exists.',
          confidence: 0.66,
          significance: 0.72,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 12_000,
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
          staleRisks: ['stale anchor'],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 12_000,
          attentionAgeMs: 12_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 14_000,
      },
    })

    expect(state).toEqual(expect.objectContaining({
      currentTurnSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      owedAction: 'answer-self',
      relationMove: 'self-disclose',
    }))
  })

  it('derives discourse directly from ownership ssot when provided', () => {
    const state = buildDiscourseState({
      now: 15_000,
      userText: '你怎么跟个人机一样',
      dialogueSemantics: {
        act: 'challenge',
        responseNeed: 'repair',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        subjectPreference: 'visible-scene',
        taskAnchor: 'stale screen',
        sharedAttentionDemand: 0.42,
        personaSuppression: 0.5,
        confidence: 0.74,
        summary: 'legacy semantic output still suggests scene repair',
        source: 'hybrid',
        reasonTags: ['scene-bound-turn'],
      },
      dialogueObligation: {
        kind: 'repair',
        summary: 'legacy obligation still asks scene repair',
        confidence: 0.72,
        mustRepairFirst: true,
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'muted',
        narrative: [],
      },
      dialogueFocus: {
        subject: 'visible-scene',
        screenReferenceMode: 'required',
        shouldBypassScreenRepair: false,
        weakLiveScene: false,
        focusSummary: 'legacy focus says repair scene',
        confidence: 0.68,
        reasonTags: [],
      },
      ownership: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        continuityMode: 'dialogue-first',
        inspectionRequested: false,
        inspectionState: 'dialogue-first',
        releaseInspectionCarry: true,
        confidence: 0.86,
        reasonTags: ['subject:alicization-self'],
      },
    })

    expect(state).toEqual(expect.objectContaining({
      currentTurnSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      owedAction: 'answer-self',
      continuityMode: 'dialogue-first',
    }))
    expect(state?.narrative).toContain('ownership-ssot')
  })
})
