import { describe, expect, it } from 'vitest'

import {
  buildCurrentConsciousFrame,
  buildCurrentConsciousFrameSystemBlock,
} from './current-conscious-frame'

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
})
