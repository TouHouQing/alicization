import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
} from '../../../shared/eventa'

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { buildReplyDeliberation } from './reply-deliberator'

const now = 20_000

function createDiscourseState(
  overrides: Partial<AlicizationDiscourseStateSnapshot> = {},
): AlicizationDiscourseStateSnapshot {
  return {
    currentTurnSubject: 'task-knot',
    screenReferenceMode: 'helpful',
    currentTurnSummary: '',
    currentQuestion: null,
    primaryTurnAnchor: null,
    primaryTurnAnchorSource: null,
    owedAction: 'guide-task',
    relationMove: 'guide',
    continuityMode: 'task-first',
    unresolvedCarry: null,
    ruptureRepair: null,
    confidence: 0.82,
    narrative: [],
    updatedAt: now - 1,
    ...overrides,
  }
}

function createConversationState(
  overrides: Partial<AlicizationConversationStateSnapshot> = {},
): AlicizationConversationStateSnapshot {
  return {
    jointThread: '',
    hostMove: '',
    primaryTurnAnchor: null,
    primaryTurnAnchorSource: null,
    activeProject: null,
    unansweredQuestion: null,
    owedRepair: null,
    activeCommitments: [],
    relationFrame: 'guide',
    continuityPolicy: 'stay-on-thread',
    memoryMode: 'task-thread',
    memoryQueryHints: [],
    shouldHoldThread: true,
    confidence: 0.8,
    narrative: [],
    updatedAt: now - 1,
    ...overrides,
  }
}

function createMindSynthesis(
  overrides: Partial<AlicizationMindSynthesisSnapshot> = {},
): AlicizationMindSynthesisSnapshot {
  return {
    answerSubject: 'task-knot',
    relationMove: 'guide',
    speechObligation: 'guide-task',
    beliefs: [],
    uncertainties: [],
    concerns: [],
    commitments: [],
    desires: [],
    openingIntent: '',
    truthBoundary: '',
    interiorSummary: '',
    confidence: 0.8,
    narrative: [],
    updatedAt: now - 1,
    ...overrides,
  }
}

function createAnswerCompiler(
  overrides: Partial<AlicizationAnswerCompilerSnapshot> = {},
): AlicizationAnswerCompilerSnapshot {
  return {
    answerSubject: 'task-knot',
    screenReferenceMode: 'helpful',
    speechObligation: 'guide-task',
    relationMove: 'guide',
    turnMode: 'guide-current-knot',
    responseMode: 'guide-current-knot',
    recommendedAct: 'guide',
    evidenceMode: 'dialogue-grounded',
    openingStyle: 'direct-answer',
    personaKernelMode: 'backgrounded',
    relationshipPosture: 'warm',
    openingDirective: '',
    openingClaim: '',
    supportingReality: [],
    uncertaintyBoundary: null,
    careVector: null,
    nextMove: null,
    labelCarryAsMemory: false,
    maxSentences: 4,
    mustDo: [],
    mustNotDo: [],
    confidence: 0.84,
    narrative: [],
    updatedAt: now - 1,
    ...overrides,
  }
}

function createConsciousFrame(
  overrides: Partial<AlicizationCurrentConsciousFrameSnapshot> = {},
): AlicizationCurrentConsciousFrameSnapshot {
  return {
    subject: 'task-knot',
    centerOfGravity: 'guide',
    truthDiscipline: 'observe-first',
    consciousNeed: '',
    consciousTension: '',
    speakingIntention: '',
    focusAnchor: null,
    withheldImpulse: null,
    shouldWithholdSpecificity: false,
    shouldSelfRevise: false,
    confidence: 0.8,
    reasonTags: [],
    updatedAt: now - 1,
    ...overrides,
  }
}

function expectSparseGovernance(state: ReturnType<typeof buildReplyDeliberation>) {
  expect(state).toMatchObject({
    whyNotOtherCandidates: [],
    withheldImpulses: [],
    mustInclude: [],
    mustAvoid: [],
    narrative: [],
  })
}

describe('buildReplyDeliberation', () => {
  it('keeps typed guide deliberation while forwarding only current dynamic facts', () => {
    const currentQuestion = '为什么这次记忆召回多等了 280ms？'
    const currentAnchor = '本轮记忆召回延迟'
    const observedEvidence = '本轮 profile 显示 rerank 等待了 280ms。'
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentTurnSummary: currentAnchor,
        currentQuestion,
        primaryTurnAnchor: currentAnchor,
        primaryTurnAnchorSource: 'question',
      }),
      conversationState: createConversationState({
        jointThread: currentAnchor,
        hostMove: currentQuestion,
        primaryTurnAnchor: currentAnchor,
        primaryTurnAnchorSource: 'question',
        unansweredQuestion: currentQuestion,
      }),
      mindSynthesis: createMindSynthesis(),
      answerCompiler: createAnswerCompiler({
        openingClaim: observedEvidence,
        supportingReality: [observedEvidence],
        nextMove: '核对 rerank 的本轮耗时。',
      }),
      currentConsciousFrame: createConsciousFrame({
        consciousNeed: currentQuestion,
        focusAnchor: currentAnchor,
      }),
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'dialogue-grounded',
        observedSurface: observedEvidence,
        taskHypothesis: null,
        intentHypothesis: null,
        specificityBudget: 'grounded-artifacts',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: [],
        updatedAt: now - 1,
      } satisfies AlicizationClaimEvidenceLedgerSnapshot,
    })

    expect(state).toMatchObject({
      selectedMotive: 'guide',
      speakingFrom: 'task-thread',
      memoryMode: 'task-thread',
      shouldSpeak: true,
      openingBeat: currentQuestion,
      whyThisReplyNow: currentQuestion,
      updatedAt: now,
    })
    expect(state?.confidence).toBeGreaterThan(0)
    expect(state?.confidence).toBeLessThanOrEqual(1)
    expect(state?.candidateMotives.length).toBeGreaterThan(0)
    expect(state?.candidateMotives.every(candidate =>
      [currentQuestion, currentAnchor, observedEvidence].includes(candidate.summary),
    )).toBe(true)
    expectSparseGovernance(state)
  })

  it('keeps dialogue-first task knots sourced from the task thread', () => {
    const currentQuestion = '哪个 guard 让这次 diff 失败了？'
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentQuestion,
        primaryTurnAnchor: currentQuestion,
        primaryTurnAnchorSource: 'question',
      }),
      conversationState: createConversationState({
        hostMove: currentQuestion,
        primaryTurnAnchor: currentQuestion,
        primaryTurnAnchorSource: 'question',
        unansweredQuestion: currentQuestion,
      }),
      mindSynthesis: createMindSynthesis(),
      answerCompiler: createAnswerCompiler(),
      currentConsciousFrame: createConsciousFrame({
        truthDiscipline: 'dialogue-first',
        consciousNeed: currentQuestion,
      }),
    })

    expect(state).toMatchObject({
      selectedMotive: 'guide',
      speakingFrom: 'task-thread',
    })
  })

  it('does not duplicate one current question across inapplicable candidate motives', () => {
    const currentQuestion = '为什么 rerank 没有命中缓存？'
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentQuestion,
        primaryTurnAnchor: currentQuestion,
        primaryTurnAnchorSource: 'question',
      }),
      conversationState: createConversationState({
        hostMove: currentQuestion,
        primaryTurnAnchor: currentQuestion,
        primaryTurnAnchorSource: 'question',
        unansweredQuestion: currentQuestion,
      }),
      mindSynthesis: createMindSynthesis(),
      answerCompiler: createAnswerCompiler(),
      currentConsciousFrame: createConsciousFrame({
        consciousNeed: currentQuestion,
      }),
    })

    expect(state?.candidateMotives).toEqual([
      expect.objectContaining({
        kind: 'guide',
        summary: currentQuestion,
      }),
    ])
    expect(new Set(state?.candidateMotives.map(candidate => candidate.summary)).size)
      .toBe(state?.candidateMotives.length)
  })

  it('selects repair and surfaces only the owed repair when the turn needs truth repair', () => {
    const owedRepair = '上一轮把旧截图误当成了当前窗口。'
    const uncertaintyBoundary = '当前窗口还没有重新确认。'
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentTurnSubject: 'visible-scene',
        screenReferenceMode: 'required',
        owedAction: 'repair-truth',
        relationMove: 'repair',
        continuityMode: 'scene-first',
      }),
      conversationState: createConversationState({
        owedRepair,
        relationFrame: 'repair',
        memoryMode: 'scene-anchored',
      }),
      mindSynthesis: createMindSynthesis({
        answerSubject: 'visible-scene',
        relationMove: 'repair',
        speechObligation: 'repair-truth',
      }),
      answerCompiler: createAnswerCompiler({
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        speechObligation: 'repair-truth',
        relationMove: 'repair',
        turnMode: 'screen-repair',
        responseMode: 'repair-and-reanchor',
        recommendedAct: 'correct-stale-anchor',
        evidenceMode: 'repair-first',
        openingStyle: 'direct-correction',
        uncertaintyBoundary,
      }),
      currentConsciousFrame: createConsciousFrame({
        subject: 'visible-scene',
        centerOfGravity: 'repair',
        truthDiscipline: 'repair-first',
        shouldSelfRevise: true,
      }),
    })

    expect(state).toMatchObject({
      selectedMotive: 'repair',
      speakingFrom: 'held-memory',
      memoryMode: 'scene-anchored',
      shouldSpeak: true,
      openingBeat: owedRepair,
      whyThisReplyNow: owedRepair,
    })
    expect(state?.candidateMotives).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'repair',
        summary: owedRepair,
      }),
    ]))
    expect(state?.candidateMotives.every(candidate =>
      [owedRepair, uncertaintyBoundary].includes(candidate.summary),
    )).toBe(true)
    expectSparseGovernance(state)
  })

  it('selects the typed motive before building optional summary diagnostics', () => {
    const currentQuestion = '这次重新观察前，哪个事实仍然不确定？'
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentQuestion,
        owedAction: 'repair-truth',
        relationMove: 'repair',
      }),
      conversationState: createConversationState({
        hostMove: currentQuestion,
        unansweredQuestion: currentQuestion,
      }),
      mindSynthesis: createMindSynthesis({
        relationMove: 'repair',
        speechObligation: 'repair-truth',
      }),
      answerCompiler: createAnswerCompiler({
        speechObligation: 'repair-truth',
        relationMove: 'repair',
        turnMode: 'screen-repair',
        responseMode: 'repair-and-reanchor',
        recommendedAct: 'correct-stale-anchor',
        evidenceMode: 'repair-first',
        openingStyle: 'direct-correction',
      }),
      currentConsciousFrame: createConsciousFrame({
        centerOfGravity: 'repair',
        truthDiscipline: 'repair-first',
      }),
    })

    expect(state).toMatchObject({
      selectedMotive: 'repair',
      speakingFrom: 'held-memory',
      openingBeat: currentQuestion,
      whyThisReplyNow: currentQuestion,
    })
    expect(state?.candidateMotives).toEqual([
      expect.objectContaining({
        kind: 'guide',
        summary: currentQuestion,
      }),
    ])
  })

  it('drops stale repair text after fresh grounding settles the repair', () => {
    const staleRepair = '上一轮的旧截图需要重新确认。'
    const freshObservation = '当前窗口已经重新读取，显示的是本轮向量检索结果。'
    let staleRepairReads = 0
    let staleBoundaryReads = 0
    let staleRuptureReads = 0
    let staleRiskReads = 0
    const conversationState = createConversationState()
    const answerCompiler = createAnswerCompiler({
      evidenceMode: 'live-grounded',
      recommendedAct: 'guide',
    })
    const discourseState = createDiscourseState({
      currentQuestion: null,
      owedAction: 'repair-truth',
      relationMove: 'repair',
    })
    Object.defineProperty(conversationState, 'owedRepair', {
      enumerable: true,
      get: () => {
        staleRepairReads += 1
        return staleRepair
      },
    })
    Object.defineProperty(answerCompiler, 'uncertaintyBoundary', {
      enumerable: true,
      get: () => {
        staleBoundaryReads += 1
        return '旧的不确定性边界。'
      },
    })
    Object.defineProperty(discourseState, 'ruptureRepair', {
      enumerable: true,
      get: () => {
        staleRuptureReads += 1
        return '旧的 rupture repair。'
      },
    })
    const state = buildReplyDeliberation({
      now,
      discourseState,
      conversationState,
      mindSynthesis: createMindSynthesis(),
      answerCompiler,
      currentConsciousFrame: createConsciousFrame({
        centerOfGravity: 'repair',
        truthDiscipline: 'repair-first',
        shouldWithholdSpecificity: true,
        shouldSelfRevise: true,
      }),
      worldModel: {
        epistemicState: {
          get staleRisks() {
            staleRiskReads += 1
            return ['旧的 world-model stale risk。']
          },
        },
      } as any,
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'live-grounded',
        observedSurface: freshObservation,
        taskHypothesis: null,
        intentHypothesis: null,
        specificityBudget: 'grounded-artifacts',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.9,
        reasonTags: [],
        updatedAt: now - 1,
      },
    })

    expect(state).toMatchObject({
      selectedMotive: 'guide',
      speakingFrom: 'live-scene',
      openingBeat: freshObservation,
      whyThisReplyNow: freshObservation,
    })
    expect(state?.candidateMotives.some(candidate => candidate.kind === 'repair')).toBe(false)
    expect(JSON.stringify(state)).not.toContain(staleRepair)
    expect({
      staleRepairReads,
      staleBoundaryReads,
      staleRuptureReads,
      staleRiskReads,
    }).toEqual({
      staleRepairReads: 0,
      staleBoundaryReads: 0,
      staleRuptureReads: 0,
      staleRiskReads: 0,
    })
  })

  it('attributes candidate summaries to the exact dynamic field that won', () => {
    const currentQuestion = '本轮召回为什么命中了这条长期记忆？'
    const freshObservation = '召回 trace 显示 memory-42 的语义分最高。'
    const questionState = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentQuestion,
      }),
      conversationState: createConversationState(),
      mindSynthesis: createMindSynthesis(),
      answerCompiler: createAnswerCompiler({
        evidenceMode: 'live-observed',
      }),
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'live-observed',
        observedSurface: freshObservation,
        taskHypothesis: null,
        intentHypothesis: null,
        specificityBudget: 'grounded-artifacts',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.9,
        reasonTags: [],
        updatedAt: now - 1,
      },
    })

    expect(questionState?.candidateMotives).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'guide',
        summary: currentQuestion,
        sourceTags: ['discourse-state:current-question'],
      }),
      expect.objectContaining({
        kind: 'witness',
        summary: freshObservation,
        sourceTags: ['claim-evidence-ledger:observed-surface'],
      }),
    ]))

    const conversationAnchor = '用户刚刚指定的 memory-42'
    const anchorState = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState(),
      conversationState: createConversationState({
        primaryTurnAnchor: conversationAnchor,
        primaryTurnAnchorSource: 'user-text',
      }),
      mindSynthesis: createMindSynthesis(),
      answerCompiler: createAnswerCompiler(),
    })

    expect(anchorState?.candidateMotives).toEqual([
      expect.objectContaining({
        kind: 'guide',
        summary: conversationAnchor,
        sourceTags: ['conversation-state:primary-turn-anchor'],
      }),
    ])
  })

  it('builds typed deliberation without a mind synthesis snapshot', () => {
    const currentQuestion = '短期记忆窗口现在保留了哪些事实？'
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentQuestion,
      }),
      conversationState: createConversationState(),
      answerCompiler: createAnswerCompiler(),
    })

    expect(state).toMatchObject({
      selectedMotive: 'guide',
      openingBeat: currentQuestion,
      whyThisReplyNow: currentQuestion,
    })
  })

  it('does not use conscious-frame prose as a candidate or outward reply source', () => {
    const controlCue = '先把结果沿着同一条线接回来，再决定要不要展开。'
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState(),
      conversationState: createConversationState(),
      mindSynthesis: createMindSynthesis(),
      answerCompiler: createAnswerCompiler(),
      currentConsciousFrame: createConsciousFrame({
        consciousNeed: controlCue,
        consciousTension: controlCue,
        speakingIntention: controlCue,
        focusAnchor: controlCue,
      }),
    })

    expect(state).toMatchObject({
      selectedMotive: 'guide',
      openingBeat: '',
      whyThisReplyNow: '',
      candidateMotives: [],
    })
    expect(JSON.stringify(state)).not.toContain(controlCue)
  })

  it('returns sparse typed output without inventing text when no dynamic fact survives', () => {
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentTurnSubject: 'host-state',
        screenReferenceMode: 'avoid',
        owedAction: 'care-host',
        relationMove: 'care',
        continuityMode: 'dialogue-first',
      }),
      conversationState: createConversationState({
        relationFrame: 'care',
        memoryMode: 'emotional-resonance',
      }),
      mindSynthesis: createMindSynthesis({
        answerSubject: 'host-state',
        relationMove: 'care',
        speechObligation: 'care-host',
      }),
      answerCompiler: createAnswerCompiler({
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        speechObligation: 'care-host',
        relationMove: 'care',
        turnMode: 'care',
        responseMode: 'care-with-boundary',
        recommendedAct: 'care',
        openingStyle: 'gentle-care',
      }),
      currentConsciousFrame: createConsciousFrame({
        subject: 'host-state',
        centerOfGravity: 'care',
      }),
    })

    expect(state).toMatchObject({
      selectedMotive: 'care',
      speakingFrom: 'dialogue-bond',
      memoryMode: 'emotional-resonance',
      openingBeat: '',
      whyThisReplyNow: '',
      candidateMotives: [],
      shouldSpeak: true,
    })
    expectSparseGovernance(state)
  })

  it('honors an explicit private-thought silence signal without rewriting the selected motive', () => {
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        screenReferenceMode: 'avoid',
        owedAction: 'answer-general',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      }),
      conversationState: createConversationState({
        shouldHoldThread: false,
      }),
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-general',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
      privateThought: {
        stance: 'observe',
        confidence: 0.8,
        rationaleTags: [],
        thoughtText: '',
        shouldSpeak: false,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'none',
        expiresAt: now + 1_000,
        afterglowFromScenario: null,
        emotionalTension: 'calm-browse',
      },
    })

    expect(state).toMatchObject({
      selectedMotive: 'answer',
      shouldSpeak: false,
    })
  })

  it('does not let private-thought silence suppress a direct user question', () => {
    const currentQuestion = '你还记得我刚才说的向量模型吗？'
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        screenReferenceMode: 'avoid',
        currentQuestion,
        owedAction: 'answer-general',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      }),
      conversationState: createConversationState({
        hostMove: currentQuestion,
        unansweredQuestion: currentQuestion,
        shouldHoldThread: false,
      }),
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-general',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
      }),
      privateThought: {
        stance: 'observe',
        confidence: 0.8,
        rationaleTags: [],
        thoughtText: '',
        shouldSpeak: false,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'none',
        expiresAt: now + 1_000,
        afterglowFromScenario: null,
        emotionalTension: 'calm-browse',
      },
    })

    expect(state).toMatchObject({
      selectedMotive: 'answer',
      openingBeat: currentQuestion,
      shouldSpeak: true,
    })
  })

  it('does not leak opening intent, opening directives, or control-shaped next moves', () => {
    const openingIntent = 'Start with the current question before widening.'
    const openingDirective = 'Open from the current turn and answer directly.'
    const nextMove = 'Keep the reply attached to the current move first.'
    const state = buildReplyDeliberation({
      now,
      discourseState: createDiscourseState({
        currentTurnSubject: 'general',
        screenReferenceMode: 'avoid',
        owedAction: 'answer-self',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      }),
      conversationState: createConversationState({
        relationFrame: 'attune',
        memoryMode: 'dialogue-carry',
      }),
      mindSynthesis: createMindSynthesis({
        answerSubject: 'general',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent,
      }),
      answerCompiler: createAnswerCompiler({
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-self',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
        openingDirective,
        nextMove,
      }),
      currentConsciousFrame: createConsciousFrame({
        subject: 'general',
        centerOfGravity: 'answer',
      }),
    })

    expect(state).toMatchObject({
      selectedMotive: 'answer',
      openingBeat: '',
      whyThisReplyNow: '',
      candidateMotives: [],
    })
    expect(JSON.stringify(state)).not.toContain(openingIntent)
    expect(JSON.stringify(state)).not.toContain(openingDirective)
    expect(JSON.stringify(state)).not.toContain(nextMove)
    expectSparseGovernance(state)
  })

  it('contains no reply system block or representative fixed governance prose', () => {
    const source = readFileSync(
      fileURLToPath(new URL('./reply-deliberator.ts', import.meta.url)),
      'utf8',
    )

    expect(source).not.toContain('buildReplyDeliberationSystemBlock')
    expect(source).not.toContain('AlicizationMindSynthesisSnapshot')
    expect(source).not.toMatch(/currentConsciousFrame\?\.(?:consciousNeed|consciousTension|speakingIntention|focusAnchor)/u)
    for (const excludedField of [
      'openingIntent',
      'openingDirective',
      'nextMove',
      'openingClaim',
      'careVector',
      'taskHypothesis',
      'intentHypothesis',
    ]) {
      expect(source).not.toContain(excludedField)
    }
    expect(source).not.toContain('Start from the current turn.')
    expect(source).not.toContain('The current question still needs a concrete answer.')
    expect(source).not.toContain('Project closure context uses structured continuity')
    expect(source).not.toContain(['opening', '_policy='].join(''))
    expect(source).not.toContain(['Phase', ' 1'].join(''))
  })
})
