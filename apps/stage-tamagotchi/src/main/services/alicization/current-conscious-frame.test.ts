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
    suppressAssociativeRecall: false,
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
      projectState: null,
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
    '你还是同一个她吗？',
    'Phase 1: Local Digital Life 是什么意思？',
  ])('preserves user-authored questions even when they mention former template topics: %s', (userQuestion) => {
    const frame = buildCurrentConsciousFrame({
      now: 34,
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
    expect(frame?.reasonTags).toContain('need-source:discourse-question')
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
        openingIntent: 'Care for the host gently before answering.',
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
      consciousNeed: '当前截图与旧判断冲突。',
      consciousTension: '旧判断已经失效。',
      speakingIntention: '',
      focusAnchor: '当前截图',
      shouldWithholdSpecificity: true,
      shouldSelfRevise: true,
    })
    expect(frame?.reasonTags).toContain('self-revise')
    expect(frame?.reasonTags).toContain('withhold-specificity')
  })

  it('preserves typed cadence and confidence without copying project prose', () => {
    const frame = buildCurrentConsciousFrame({
      now: 50,
      discourseState: createDiscourseState({
        confidence: 0.7,
      }),
      mindSynthesis: {
        confidence: 0.9,
      } as any,
      answerCompiler: createAnswerCompiler({
        confidence: 0.82,
      }),
      privateThought: {
        confidence: 0.6,
      } as any,
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'A fixed project identity paragraph.',
              currentPhase: 'Phase 1 project narration.',
              primaryOpenLoop: 'A fixed open-loop paragraph.',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'linger-then-rejoin',
              continuityArcStage: 'indexing-verification-follow-up',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              preferredVoiceMode: 'lower-pressure',
              preferredPacingMode: 'slower',
            },
          },
        },
        cognition: {},
        agency: {},
        raw: {},
      } as any,
    })

    expect(frame?.confidence).toBe(0.78)
    expect(frame?.continuityPreferredTiming).toBe('next-open-window')
    expect(frame?.continuityCadence).toBe('linger-then-rejoin')
    expect(frame?.projectState).toMatchObject({
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'linger-then-rejoin',
      continuityArcStage: 'indexing-verification-follow-up',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    })
    expect(frame?.projectState).not.toHaveProperty('identity')
    expect(frame?.projectState).not.toHaveProperty('currentPhase')
    expect(frame?.projectState).not.toHaveProperty('primaryOpenLoop')
  })

  it('contains no natural-language conscious-frame policy or system prompt builder', () => {
    const source = readFileSync(new URL('./current-conscious-frame.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /buildCurrentConsciousFrameSystemBlock|Current conscious frame\.|WorkingMemory owns short-term memory|Express the current frame|Use the available current frame|Reply from the current turn context/iu,
    )
    expect(source).not.toMatch(
      /Execution callback return needs|Care should stay|Let repair settle|Keep emotional closure|Keep the inward hold active|Revise first|Put dialogue first|Stay on the active knot/iu,
    )
    expect(source).not.toMatch(
      /resolveAlicizationProjectStateSnapshot|buildAlicizationPersonalityContinuityState|buildSelfContinuityAuthorityFromRuntimeSurface/iu,
    )
    expect(source).not.toContain('sanitizeDynamicIntention')
    expect(source).not.toContain('answerCompiler.openingClaim')
    expect(source).not.toContain('answerCompiler.nextMove')
  })
})
