import { describe, expect, it } from 'vitest'

import {
  buildReplyDeliberation,
  buildReplyDeliberationSystemBlock,
} from './reply-deliberator'

const discourseState = {
  currentTurnSubject: 'task-knot' as const,
  screenReferenceMode: 'helpful' as const,
  currentTurnSummary: 'Stay with the current diff and explain the knot.',
  currentQuestion: 'What is wrong with this diff?',
  owedAction: 'guide-task' as const,
  relationMove: 'guide' as const,
  continuityMode: 'task-first' as const,
  unresolvedCarry: 'The risky diff is still unresolved.',
  ruptureRepair: null,
  confidence: 0.86,
  narrative: [],
  updatedAt: 10_000,
}

const conversationState = {
  jointThread: 'The host wants the current diff explained without drifting away.',
  hostMove: 'The host is asking what is wrong with the current diff.',
  activeProject: 'ProjectAtlas diff',
  unansweredQuestion: 'What is wrong with this diff?',
  owedRepair: null,
  activeCommitments: ['Explain the current diff before moving on.'],
  relationFrame: 'guide' as const,
  continuityPolicy: 'stay-on-thread' as const,
  memoryMode: 'task-thread' as const,
  memoryQueryHints: ['ProjectAtlas diff', 'What is wrong with this diff?'],
  shouldHoldThread: true,
  confidence: 0.82,
  narrative: [],
  updatedAt: 10_000,
}

const mindSynthesis = {
  answerSubject: 'task-knot' as const,
  relationMove: 'guide' as const,
  speechObligation: 'guide-task' as const,
  beliefs: [{
    label: 'conversation-thread',
    summary: 'The host wants help on the current diff.',
    confidence: 0.84,
    sourceTags: ['conversation-state'],
  }],
  uncertainties: [{
    label: 'open-question',
    summary: 'What is wrong with this diff?',
    confidence: 0.7,
    sourceTags: ['conversation-state'],
  }],
  concerns: [{
    label: 'reply-pressure',
    summary: 'The host is still waiting for the diff explanation.',
    confidence: 0.72,
    sourceTags: ['conversation-state'],
  }],
  commitments: [{
    label: 'conversation-commitment',
    summary: 'Explain the current diff before moving on.',
    confidence: 0.82,
    sourceTags: ['conversation-state'],
  }],
  desires: [],
  openingIntent: 'Stay inside the diff knot and move one step closer to resolution.',
  truthBoundary: 'Keep claims attached to the current diff and avoid stale carry.',
  interiorSummary: 'The current diff still needs a grounded explanation.',
  confidence: 0.82,
  narrative: [],
  updatedAt: 10_000,
}

describe('buildReplyDeliberation', () => {
  it('selects guide as the dominant motive for unresolved coding knots', () => {
    const state = buildReplyDeliberation({
      now: 20_000,
      conversationState,
      discourseState,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'coarse-held',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        openingDirective: 'Open from the current knot and narrow to one next step.',
        openingClaim: 'The risky seam is still inside the current diff.',
        supportingReality: ['ProjectAtlas diff'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Point to the risky part of the diff first.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: ['Stay with the current knot.'],
        mustNotDo: ['Do not drift into generic advice.'],
        confidence: 0.84,
        narrative: [],
        updatedAt: 20_000,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.7,
        rationaleTags: ['diff'],
        thoughtText: 'Keep looking at the diff before speaking.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'guide',
      memoryMode: 'task-thread',
      speakingFrom: 'task-thread',
      shouldSpeak: true,
    }))
    expect(state?.mustAvoid).toContain('Do not drift into decorative association before the knot is answered.')
    expect(buildReplyDeliberationSystemBlock(state)).toContain('[ALICIZATION_REPLY_DELIBERATION]')
  })

  it('promotes repair when the truth seam is open', () => {
    const state = buildReplyDeliberation({
      now: 20_000,
      conversationState: {
        ...conversationState,
        owedRepair: 'The previous browser anchor is stale.',
        memoryMode: 'scene-anchored',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'visible-scene',
        screenReferenceMode: 'required',
        owedAction: 'repair-truth',
        relationMove: 'repair',
        continuityMode: 'scene-first',
      },
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        speechObligation: 'repair-truth',
        relationMove: 'repair',
        turnMode: 'screen-repair',
        responseMode: 'repair-and-reanchor',
        recommendedAct: 'ask-reground',
        evidenceMode: 'repair-first',
        openingStyle: 'direct-correction',
        personaKernelMode: 'muted',
        relationshipPosture: 'restrained',
        openingDirective: 'Correct the stale seam before continuing.',
        openingClaim: 'The previous read is not safe as current fact.',
        supportingReality: [],
        uncertaintyBoundary: 'The live scene still needs a fresh look.',
        careVector: null,
        nextMove: 'Ask for a fresh look.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.88,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'repair',
      speakingFrom: 'held-memory',
    }))
    expect(state?.whyThisReplyNow).toContain('stale')
  })

  it('keeps dialogue-first deliberation attached to the primary turn anchor instead of control directives', () => {
    const state = buildReplyDeliberation({
      now: 30_000,
      conversationState: {
        ...conversationState,
        primaryTurnAnchor: '你能做什么呀',
        primaryTurnAnchorSource: 'user-text',
        carryEligible: false,
        carryReason: null,
        memoryMode: 'dialogue-carry',
      } as any,
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        primaryTurnAnchor: '你能做什么呀',
        primaryTurnAnchorSource: 'user-text',
        owedAction: 'answer-question',
      } as any,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        openingDirective: 'Answer the host\'s current move before opening any new thread.',
        openingClaim: 'Open by answering the host\'s real subject directly.',
        supportingReality: [],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Stay attached to this turn anchor.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.8,
        narrative: [],
        updatedAt: 30_000,
      } as any,
      dialogueEncounter: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        taskAnchor: '你能做什么呀',
        summary: '你能做什么呀',
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
      } as any,
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'answer',
      speakingFrom: 'self-continuity',
    }))
    expect(state?.mustInclude).toContain('你能做什么呀')
    expect(state?.mustAvoid).toContain('Do not let control directives outrank the current turn anchor.')
    expect(state?.narrative).toContain('anchor:你能做什么呀')
  })

  it('lets the conscious frame force coarse screen turns into hypothesis discipline', () => {
    const state = buildReplyDeliberation({
      now: 40_000,
      conversationState: {
        ...conversationState,
        jointThread: 'The host wants a guess from the current workspace.',
        hostMove: '猜猜我在干嘛',
        unansweredQuestion: '猜猜我在干嘛',
        memoryMode: 'scene-anchored',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Guess what the host is doing from the visible workspace.',
        currentQuestion: '猜猜我在干嘛',
      },
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'witness',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'live-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        openingDirective: 'Stay with the coarse scene before naming a larger story.',
        openingClaim: 'Git commit diff in Java code editor',
        supportingReality: ['Git commit diff in Java code editor'],
        uncertaintyBoundary: 'The exact file or class is not safely grounded yet.',
        careVector: null,
        nextMove: 'Describe the visible knot first, then keep the guess soft.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 40_000,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'witness',
        truthDiscipline: 'observe-then-hypothesize',
        consciousNeed: 'Start from what is visible before naming the task.',
        consciousTension: 'The scene is still too coarse for file-level certainty.',
        speakingIntention: 'Separate observation from guess and keep the guess soft.',
        focusAnchor: 'Git commit diff in Java code editor',
        withheldImpulse: 'Do not collapse coarse visual evidence into file, class, or field certainty.',
        shouldWithholdSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: ['discipline:observe-then-hypothesize'],
        updatedAt: 40_000,
      },
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'live-grounded',
        observedSurface: 'Git commit diff in Java code editor',
        taskHypothesis: 'The host is probably working through a Java diff.',
        intentHypothesis: 'Separate observation from guess and keep the guess soft.',
        specificityBudget: 'coarse-scene',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: ['budget:coarse-scene'],
        updatedAt: 40_000,
      },
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'witness',
      speakingFrom: 'live-scene',
    }))
    expect(state?.mustInclude).toContain('Keep direct observation and any task guess in separate clauses.')
    expect(state?.mustAvoid).toContain('Do not jump from coarse visual cues to file, class, enum, or field-level certainty.')
    expect(state?.mustAvoid).toContain('Do not name specific technical artifacts unless the host named them or the current evidence explicitly grounds them.')
    expect(state?.narrative).toContain('claim-budget:coarse-scene')
    expect(state?.narrative).toContain('truth-discipline:observe-then-hypothesize')
  })
})
