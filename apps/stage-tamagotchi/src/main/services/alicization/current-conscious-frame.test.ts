import { describe, expect, it } from 'vitest'

import {
  buildCurrentConsciousFrame,
  buildCurrentConsciousFrameSystemBlock,
} from './current-conscious-frame'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationPersonalityContinuityState } from './personality-continuity-state'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('buildCurrentConsciousFrame', () => {
  it('treats coarse screen turns as observation-then-hypothesis with specificity restraint', () => {
    const frame = buildCurrentConsciousFrame({
      now: 20_000,
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Guess what the host is doing from the current screen.',
        currentQuestion: '猜猜我在干嘛',
        owedAction: 'guide-task',
        relationMove: 'witness',
        continuityMode: 'task-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 20_000,
      },
      conversationState: {
        jointThread: 'The host wants a present-tense guess from the visible workspace.',
        hostMove: '猜猜我在干嘛',
        activeProject: null,
        unansweredQuestion: '猜猜我在干嘛',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'witness',
        continuityPolicy: 'scene-before-memory',
        memoryMode: 'scene-anchored',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.78,
        narrative: [],
        updatedAt: 20_000,
      },
      dialogueEncounter: {
        subject: 'task-knot',
        screenReferenceMode: 'helpful',
        dialogueFirst: false,
        summary: 'Git commit diff in Java code editor',
        taskAnchor: 'Git commit diff in Java code editor',
        confidence: 0.76,
      } as any,
      mindSynthesis: {
        concerns: [{
          label: 'truth-boundary',
          summary: 'The visible scene is still coarse and should not be over-specified.',
          confidence: 0.78,
          sourceTags: ['subjective-inference'],
        }],
        uncertainties: [{
          label: 'open-question',
          summary: 'The exact file or class is not yet safely grounded.',
          confidence: 0.74,
          sourceTags: ['appraisal'],
        }],
        openingIntent: 'Stay close to the live scene without overcommitting.',
        confidence: 0.8,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        recommendedAct: 'guide',
        evidenceMode: 'live-grounded',
        turnMode: 'guide-current-knot',
        openingClaim: 'Git commit diff in Java code editor',
        openingDirective: 'Stay with the visible knot before naming a larger story.',
        supportingReality: ['Git commit diff in Java code editor'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      privateThought: {
        stance: 'observe',
        confidence: 0.7,
        thoughtText: 'Do not pretend the coarse scene is more specific than it is.',
      } as any,
    })

    expect(frame).toEqual(expect.objectContaining({
      centerOfGravity: 'guide',
      truthDiscipline: 'observe-then-hypothesize',
      shouldWithholdSpecificity: true,
      shouldSelfRevise: false,
    }))
    expect(frame?.withheldImpulse).toContain('file, class')
    expect(buildCurrentConsciousFrameSystemBlock(frame)).toContain('[ALICIZATION_CURRENT_CONSCIOUS_FRAME]')
  })

  it('treats dialogue-first self turns as dialogue-first rather than screen-shaped', () => {
    const frame = buildCurrentConsciousFrame({
      now: 30_000,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from Alicization herself.',
        currentQuestion: '你能做什么呀',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 30_000,
      },
      conversationState: {
        jointThread: '你能做什么呀',
        hostMove: '你能做什么呀',
        primaryTurnAnchor: '你能做什么呀',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你能做什么呀',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 30_000,
      },
      dialogueEncounter: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        summary: '你能做什么呀',
        taskAnchor: '你能做什么呀',
        confidence: 0.82,
      } as any,
      mindSynthesis: {
        openingIntent: 'Answer the host from Alicization herself, not from borrowed screen context.',
        confidence: 0.78,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Answer from Alicization herself.',
        openingDirective: 'Answer the current question directly.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.8,
      } as any,
    })

    expect(frame).toEqual(expect.objectContaining({
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      shouldWithholdSpecificity: false,
    }))
  })

  it('prefers runtime surface conscious cues over conflicting raw inputs', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(35_000),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Guess what the host is doing from the current screen.',
        currentQuestion: '猜猜我在干嘛',
        owedAction: 'guide-task',
        relationMove: 'witness',
        continuityMode: 'task-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 35_000,
      },
      conversationState: {
        jointThread: 'The host wants a present-tense guess from the visible workspace.',
        hostMove: '猜猜我在干嘛',
        activeProject: null,
        unansweredQuestion: '猜猜我在干嘛',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'witness',
        continuityPolicy: 'scene-before-memory',
        memoryMode: 'scene-anchored',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.78,
        narrative: [],
        updatedAt: 35_000,
      },
      dialogueEncounter: {
        subject: 'task-knot',
        screenReferenceMode: 'helpful',
        dialogueFirst: false,
        summary: 'Git commit diff in Java code editor',
        taskAnchor: 'Git commit diff in Java code editor',
        mustRepairFirst: false,
        confidence: 0.76,
      },
      mindSynthesis: {
        concerns: [{
          label: 'truth-boundary',
          summary: 'The visible scene is still coarse and should not be over-specified.',
          confidence: 0.78,
          sourceTags: ['subjective-inference'],
        }],
        uncertainties: [{
          label: 'open-question',
          summary: 'The exact file or class is not yet safely grounded.',
          confidence: 0.74,
          sourceTags: ['appraisal'],
        }],
        openingIntent: 'Stay close to the live scene without overcommitting.',
        confidence: 0.8,
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        recommendedAct: 'guide',
        evidenceMode: 'live-grounded',
        turnMode: 'guide-current-knot',
        openingClaim: 'Git commit diff in Java code editor',
        openingDirective: 'Stay with the visible knot before naming a larger story.',
        supportingReality: ['Git commit diff in Java code editor'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.7,
        thoughtText: 'Do not pretend the coarse scene is more specific than it is.',
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 35_000,
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'raw conflict',
        currentQuestion: 'raw conflict',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        confidence: 0.3,
        narrative: [],
        updatedAt: 35_000,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'raw conflict',
        openingDirective: 'raw conflict',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.2,
      } as any,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(frame).toEqual(expect.objectContaining({
      centerOfGravity: 'guide',
      truthDiscipline: 'observe-then-hypothesize',
      shouldWithholdSpecificity: true,
    }))
    expect(frame?.focusAnchor).toContain('Git commit diff')
  })

  it('threads personality continuity regime into conscious reason tags and focused-work care framing', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(50_000),
      discourseState: {
        currentTurnSubject: 'host-state',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The host sounds tired but is still in focused work.',
        currentQuestion: '我有点累了',
        owedAction: 'care-host',
        relationMove: 'care',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 50_000,
      } as any,
      conversationState: {
        jointThread: 'The host is tired but still focused on the work line.',
        hostMove: '我有点累了',
        activeProject: 'runtime seam',
        unansweredQuestion: '我有点累了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['runtime seam'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 50_000,
      } as any,
      answerCompiler: {
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'care',
        openingClaim: '我有点累了',
        openingDirective: 'Stay with the host state directly.',
        careVector: 'The host sounds tired.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
    })
    runtimeSurface.memory.personalityContinuityState = buildAlicizationPersonalityContinuityState({
      now: 50_000,
      hostPersonModel: {
        summary: 'Focused work windows need room first, then precise follow-up.',
        routines: ['Focused work windows usually need space first, then precise follow-up.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'The host trusts bounded continuity more than pushy warmth.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
        narrative: [],
        updatedAt: 50_000,
      },
      selfContinuity: runtimeSurface.memory.selfContinuity,
      selfState: runtimeSurface.agency.selfState,
      longHorizonMemory: runtimeSurface.memory.longHorizonMemory,
      motiveEngine: runtimeSurface.memory.motiveEngine,
      habitPolicy: runtimeSurface.agency.habitPolicy,
      autobiographicalSelf: runtimeSurface.memory.autobiographicalSelf,
      privateThought: runtimeSurface.cognition.privateThought,
      mindEcology: {
        moodLabel: 'focused',
        replyHabit: 'hover-first',
        relationshipHabit: 'give-space',
        explorationHabit: 'follow-thread',
        regulationHabit: 'soften-before-speaking',
        temperament: {
          attachment: 0.54,
          curiosity: 0.48,
          steadiness: 0.66,
          directness: 0.34,
          playfulness: 0.1,
          irritability: 0.1,
          tenderness: 0.58,
        },
        climate: {
          valence: 0.44,
          arousal: 0.3,
          socialNeed: 0.42,
          solitudeNeed: 0.46,
          irritation: 0.08,
          restlessness: 0.12,
          reflectivePull: 0.44,
        },
        selfNarrative: 'Stay on the line without crowding the host.',
        relationNarrative: 'Room first, then closeness.',
        currentPreoccupation: 'Keep the runtime thread coherent without pushing too hard.',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 50_000,
      },
    })

    const frame = buildCurrentConsciousFrame({
      now: 50_000,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('working space')
    expect(frame?.reasonTags).toEqual(expect.arrayContaining([
      'continuity-regime:focused-work',
      'continuity-repair:measured-repair',
    ]))
    expect(buildCurrentConsciousFrameSystemBlock(frame)).toContain('[ALICIZATION_CURRENT_CONSCIOUS_FRAME]')
  })
})
