import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildCurrentConsciousFrame } from './current-conscious-frame'

function createDiscourseState(overrides: Record<string, unknown> = {}) {
  return {
    currentTurnSubject: 'task-knot',
    screenReferenceMode: 'avoid',
    currentTurnSummary: '',
    currentQuestion: null,
    primaryTurnAnchor: null,
    primaryTurnAnchorSource: null,
    owedAction: 'guide-task',
    relationMove: 'guide',
    continuityMode: 'dialogue-first',
    confidence: 0.8,
    narrative: [],
    updatedAt: 10,
    ...overrides,
  } as any
}

function createAnswerCompiler(overrides: Record<string, unknown> = {}) {
  return {
    answerSubject: 'task-knot',
    screenReferenceMode: 'avoid',
    speechObligation: 'guide-task',
    relationMove: 'guide',
    turnMode: 'guide-current-knot',
    responseMode: 'guide-current-knot',
    recommendedAct: 'guide',
    evidenceMode: 'dialogue-grounded',
    openingStyle: 'direct-answer',
    personaKernelMode: 'full',
    relationshipPosture: 'warm',
    openingDirective: '',
    openingClaim: '',
    supportingReality: [],
    nextMove: null,
    labelCarryAsMemory: false,
    maxSentences: 4,
    mustDo: [],
    mustNotDo: [],
    confidence: 0.82,
    narrative: [],
    updatedAt: 10,
    ...overrides,
  } as any
}

describe('buildCurrentConsciousFrame', () => {
  it('projects current dynamic turn evidence without authored reply policy', () => {
    let openingClaimReads = 0
    let nextMoveReads = 0
    const answerCompiler = createAnswerCompiler()
    Object.defineProperty(answerCompiler, 'openingClaim', {
      enumerable: true,
      get: () => {
        openingClaimReads += 1
        return '由 AnswerCompiler 生成的开场结论。'
      },
    })
    Object.defineProperty(answerCompiler, 'nextMove', {
      enumerable: true,
      get: () => {
        nextMoveReads += 1
        return '核对本轮实际召回证据。'
      },
    })
    const frame = buildCurrentConsciousFrame({
      now: 20,
      userText: '记忆为什么没有接上？',
      discourseState: createDiscourseState({
        currentQuestion: '记忆为什么没有接上？',
        primaryTurnAnchor: '检查记忆对话链路',
      }),
      conversationState: {
        primaryTurnAnchor: '检查记忆对话链路',
        hostMove: '记忆为什么没有接上？',
        unansweredQuestion: '记忆为什么没有接上？',
      } as any,
      answerCompiler,
    })

    expect(frame).toMatchObject({
      subject: 'task-knot',
      centerOfGravity: 'guide',
      truthDiscipline: 'dialogue-first',
      consciousNeed: '记忆为什么没有接上？',
      consciousTension: '',
      speakingIntention: '',
      focusAnchor: '检查记忆对话链路',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      updatedAt: 20,
    })
    expect(frame?.reasonTags).toEqual([
      'subject:task-knot',
      'center:guide',
      'discipline:dialogue-first',
      'evidence:dialogue-grounded',
      'act:guide',
      'need-source:discourse-question',
    ])
    expect({
      openingClaimReads,
      nextMoveReads,
    }).toEqual({
      openingClaimReads: 0,
      nextMoveReads: 0,
    })
  })

  it('keeps text fields sparse when the current turn provides no dynamic text', () => {
    const frame = buildCurrentConsciousFrame({
      now: 30,
      discourseState: createDiscourseState(),
      answerCompiler: createAnswerCompiler(),
    })

    expect(frame).toMatchObject({
      consciousNeed: '',
      consciousTension: '',
      speakingIntention: '',
      focusAnchor: null,
      withheldImpulse: null,
    })
  })

  it('does not project answer-compiler opening claims or Chinese control-shaped next moves', () => {
    const openingClaim = '这条生成结论不是真实的当前回合锚点。'
    const nextMove = '先把结果沿着同一条线接回来，再决定要不要展开。'
    const frame = buildCurrentConsciousFrame({
      now: 32,
      discourseState: createDiscourseState(),
      answerCompiler: createAnswerCompiler({
        openingClaim,
        nextMove,
      }),
    })

    expect(frame).toMatchObject({
      consciousNeed: '',
      consciousTension: '',
      speakingIntention: '',
      focusAnchor: null,
    })
    expect(JSON.stringify(frame)).not.toContain(openingClaim)
    expect(JSON.stringify(frame)).not.toContain(nextMove)
  })

  it.each([
    '你还记得刚才的约定吗？',
    'Phase 1: Local Digital Life 是什么意思？',
  ])('preserves user-authored questions even when they mention former template topics: %s', (userQuestion) => {
    const frame = buildCurrentConsciousFrame({
      now: 34,
      userText: userQuestion,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: userQuestion,
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: userQuestion,
        unansweredQuestion: userQuestion,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.consciousNeed).toBe(userQuestion)
    expect(frame?.consciousNeedSource).toBe('question')
    expect(frame?.reasonTags).toContain('need-source:discourse-question')
  })

  it('preserves real userText without trusting generated question or host fallbacks', () => {
    const userText = '我真正问的是 continuity 和 Phase 1 为什么还会影响对话。'
    const generatedQuestion = 'Phase 1: Local Digital Life should lead the next reply.'
    const frame = buildCurrentConsciousFrame({
      now: 35,
      userText,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: generatedQuestion,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: generatedQuestion,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        unansweredQuestion: generatedQuestion,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.consciousNeed).toBe(userText)
    expect(frame?.consciousNeedSource).toBe('user-text')
    expect(frame?.focusAnchor).toBe(generatedQuestion)
    expect(frame?.focusAnchorSource).toBe('host-move')
  })

  it('does not trust a generated hostMove fallback without user-text provenance', () => {
    const generatedHostMove = '当前截图'
    const frame = buildCurrentConsciousFrame({
      now: 35,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: null,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: generatedHostMove,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        unansweredQuestion: null,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.focusAnchor).toBe(generatedHostMove)
    expect(frame?.focusAnchorSource).toBe('host-move')
    expect(frame?.consciousNeed).toBe('')
    expect(frame?.consciousNeedSource).toBeNull()
  })

  it('marks a host move that matches real userText as user-authored focus', () => {
    const userText = 'continuity 和 Phase 1 只是我这轮真实输入的检索词。'
    const frame = buildCurrentConsciousFrame({
      now: 35,
      userText,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: null,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: userText,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        unansweredQuestion: null,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.focusAnchor).toBe(userText)
    expect(frame?.focusAnchorSource).toBe('user-text')
    expect(frame?.consciousNeed).toBe(userText)
    expect(frame?.consciousNeedSource).toBe('host-move')
  })

  it('preserves trusted user-authored anchors when fixed-template words appear outside currentQuestion', () => {
    const userText = '我问的是 continuity、Phase 1 和数字生命这些词是不是还会误删用户原文。'
    const frame = buildCurrentConsciousFrame({
      now: 35,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: null,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: userText,
        primaryTurnAnchor: userText,
        primaryTurnAnchorSource: 'user-text',
        unansweredQuestion: null,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.focusAnchor).toBe(userText)
    expect(frame?.focusAnchorSource).toBe('user-text')
    expect(frame?.consciousNeed).toBe(userText)
    expect(frame?.consciousNeedSource).toBe('user-text')
    expect(frame?.reasonTags).toContain('need-source:user-text')
  })

  it('marks question-sourced primary anchors with visual-persistable question source tags', () => {
    const userQuestion = 'Phase 1 里的 continuity 和数字生命原文为什么会被过滤？'
    const frame = buildCurrentConsciousFrame({
      now: 35,
      userText: userQuestion,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: null,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: userQuestion,
        primaryTurnAnchor: userQuestion,
        primaryTurnAnchorSource: 'question',
        unansweredQuestion: null,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.consciousNeed).toBe(userQuestion)
    expect(frame?.consciousNeedSource).toBe('question')
    expect(frame?.reasonTags).toContain('need-source:conversation-question')
    expect(frame?.reasonTags).not.toContain('need-source:primary-anchor')
  })

  it('does not preserve generated task anchors as user-authored conscious need', () => {
    const generatedTaskAnchor = '当前截图'
    const frame = buildCurrentConsciousFrame({
      now: 35,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: null,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: '',
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        unansweredQuestion: null,
      } as any,
      dialogueEncounter: {
        subject: 'general',
        screenReferenceMode: 'avoid',
        mustRepairFirst: false,
        summary: '',
        taskAnchor: generatedTaskAnchor,
        confidence: 0.8,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.focusAnchor).toBe(generatedTaskAnchor)
    expect(frame?.focusAnchorSource).toBe('dialogue-task-anchor')
    expect(frame?.consciousNeed).toBe('')
    expect(frame?.consciousNeedSource).toBeNull()
    expect(frame?.reasonTags).not.toContain('need-source:primary-anchor')
  })

  it.each([
    {
      expectedAnchor: 'conversation 线程摘要',
      expectedSource: 'conversation-anchor',
      conversationAnchor: 'conversation 线程摘要',
      conversationSource: 'thread',
      dialogueTaskAnchor: null,
      discourseAnchor: 'discourse 线程摘要',
      discourseSource: 'thread',
    },
    {
      expectedAnchor: 'discourse 线程摘要',
      expectedSource: 'discourse-anchor',
      conversationAnchor: null,
      conversationSource: null,
      dialogueTaskAnchor: null,
      discourseAnchor: 'discourse 线程摘要',
      discourseSource: 'carry',
    },
    {
      expectedAnchor: '生成的任务锚点',
      expectedSource: 'dialogue-task-anchor',
      conversationAnchor: null,
      conversationSource: null,
      dialogueTaskAnchor: '生成的任务锚点',
      discourseAnchor: null,
      discourseSource: null,
    },
  ])('records generated focus provenance as $expectedSource', ({
    expectedAnchor,
    expectedSource,
    conversationAnchor,
    conversationSource,
    dialogueTaskAnchor,
    discourseAnchor,
    discourseSource,
  }) => {
    const frame = buildCurrentConsciousFrame({
      now: 35,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: null,
        primaryTurnAnchor: discourseAnchor,
        primaryTurnAnchorSource: discourseSource,
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: '',
        primaryTurnAnchor: conversationAnchor,
        primaryTurnAnchorSource: conversationSource,
        unansweredQuestion: null,
      } as any,
      dialogueEncounter: dialogueTaskAnchor
        ? {
            subject: 'general',
            screenReferenceMode: 'avoid',
            mustRepairFirst: false,
            summary: '',
            taskAnchor: dialogueTaskAnchor,
            confidence: 0.8,
          } as any
        : null,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.focusAnchor).toBe(expectedAnchor)
    expect(frame?.focusAnchorSource).toBe(expectedSource)
    expect(frame?.consciousNeed).toBe('')
    expect(frame?.consciousNeedSource).toBeNull()
  })

  it('prefers the trusted host move over a generated dialogue task anchor', () => {
    const userText = '继续清理 continuity 和 Phase 1 固定模板残留。'
    const frame = buildCurrentConsciousFrame({
      now: 35,
      userText,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: null,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: userText,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        unansweredQuestion: null,
      } as any,
      dialogueEncounter: {
        subject: 'general',
        screenReferenceMode: 'avoid',
        mustRepairFirst: false,
        summary: '',
        taskAnchor: '当前截图',
        confidence: 0.8,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.focusAnchor).toBe('当前截图')
    expect(frame?.focusAnchorSource).toBe('dialogue-task-anchor')
    expect(frame?.consciousNeed).toBe(userText)
    expect(frame?.consciousNeedSource).toBe('host-move')
    expect(frame?.reasonTags).toContain('need-source:host-move')
    expect(frame?.reasonTags).not.toContain('focus-source:host-move')
  })

  it('prefers the trusted host move over an untrusted carried thread anchor', () => {
    const userText = '继续清理 continuity 和 Phase 1 固定模板残留。'
    const frame = buildCurrentConsciousFrame({
      now: 35,
      userText,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        currentQuestion: null,
        primaryTurnAnchor: '旧线程摘要',
        primaryTurnAnchorSource: 'thread',
        owedAction: 'answer-general',
        relationMove: 'clarify',
      }),
      conversationState: {
        hostMove: userText,
        primaryTurnAnchor: '旧 conversation 线程摘要',
        primaryTurnAnchorSource: 'thread',
        unansweredQuestion: null,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
    })

    expect(frame?.focusAnchor).toBe('旧 conversation 线程摘要')
    expect(frame?.focusAnchorSource).toBe('conversation-anchor')
    expect(frame?.consciousNeed).toBe(userText)
    expect(frame?.consciousNeedSource).toBe('host-move')
    expect(frame?.reasonTags).toContain('need-source:host-move')
    expect(frame?.reasonTags).not.toContain('focus-source:host-move')
  })

  it('does not treat generated turn summaries as a conscious need', () => {
    const frame = buildCurrentConsciousFrame({
      now: 35,
      discourseState: createDiscourseState({
        currentTurnSummary: 'This turn carries a concrete obligation.',
      }),
      dialogueEncounter: {
        subject: 'task-knot',
        screenReferenceMode: 'avoid',
        mustRepairFirst: false,
        summary: 'This turn carries a concrete obligation.',
        taskAnchor: null,
        confidence: 0.8,
      } as any,
      answerCompiler: createAnswerCompiler(),
    })

    expect(frame?.consciousNeed).toBe('')
  })

  it('does not turn general mind synthesis prose into tension or speaking intent', () => {
    const frame = buildCurrentConsciousFrame({
      now: 36,
      discourseState: createDiscourseState(),
      mindSynthesis: {
        truthBoundary: 'Scene claims are grounded in current evidence.',
        uncertainties: [],
        concerns: [{
          summary: 'Care for the host gently and preserve the relationship posture.',
        }],
        openingIntent: 'Care for the host gently before making the next claim.',
        confidence: 0.8,
      } as any,
      answerCompiler: createAnswerCompiler({
        nextMove: 'Let the first care response land, keep pressure light, and preserve room for the host.',
      }),
    })

    expect(frame).toMatchObject({
      consciousTension: '',
      speakingIntention: '',
    })
  })

  it('keeps repair and evidence boundaries typed instead of turning them into prose', () => {
    const frame = buildCurrentConsciousFrame({
      now: 40,
      discourseState: createDiscourseState({
        screenReferenceMode: 'required',
        owedAction: 'repair-truth',
      }),
      dialogueEncounter: {
        subject: 'visible-scene',
        screenReferenceMode: 'required',
        mustRepairFirst: true,
        summary: '当前截图与旧判断冲突。',
        taskAnchor: '当前截图',
        confidence: 0.9,
      } as any,
      answerCompiler: createAnswerCompiler({
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        recommendedAct: 'correct-stale-anchor',
        evidenceMode: 'live-grounded',
        uncertaintyBoundary: '旧判断已经失效。',
      }),
    })

    expect(frame).toMatchObject({
      subject: 'visible-scene',
      centerOfGravity: 'repair',
      truthDiscipline: 'repair-first',
      consciousNeed: '',
      consciousNeedSource: null,
      consciousTension: '旧判断已经失效。',
      speakingIntention: '',
      focusAnchor: '当前截图',
      focusAnchorSource: 'dialogue-task-anchor',
      shouldWithholdSpecificity: true,
      shouldSelfRevise: true,
    })
    expect(frame?.reasonTags).toContain('self-revise')
    expect(frame?.reasonTags).toContain('withhold-specificity')
  })

  it('passes the real user text from runtime-mind-state into the conscious frame builder', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    const builderCallStart = source.indexOf('buildCurrentConsciousFrame({')
    const builderCallEnd = source.indexOf('\n        })', builderCallStart)
    const builderCall = builderCallStart >= 0 && builderCallEnd >= 0
      ? source.slice(builderCallStart, builderCallEnd)
      : ''

    expect(builderCall).toContain('userText: input.userText')
  })
})
