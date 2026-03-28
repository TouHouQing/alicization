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
})
