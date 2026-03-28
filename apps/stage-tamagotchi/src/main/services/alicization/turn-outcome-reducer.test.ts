import { describe, expect, it } from 'vitest'

import {
  registerDialogueWorldThreadAssistantTurn,
  settleDialogueWorldThreadOnUserTurn,
} from './turn-outcome-reducer'

describe('turn-outcome-reducer', () => {
  it('marks the previous assistant move as aligned when the user stays on the same seam', () => {
    const next = settleDialogueWorldThreadOnUserTurn({
      now: 20_000,
      previous: {
        activeThread: 'Explain the current ProjectAtlas diff.',
        currentQuestion: 'What is wrong with this diff?',
        openLoops: ['What is wrong with this diff?'],
        recentlyResolvedLoops: [],
        carriedFacts: ['ProjectAtlas diff'],
        relationDrift: 'steady',
        memoryMode: 'task-thread',
        recallKeys: ['ProjectAtlas diff'],
        lastUserMove: 'What is wrong with this diff?',
        lastAssistantMove: 'The risky seam is still inside the current diff.',
        lastOutcome: 'pending',
        pendingValidation: {
          question: 'What is wrong with this diff?',
          expectedMode: 'guide',
          openedAt: 10_000,
        },
        confidence: 0.82,
        narrative: [],
        updatedAt: 10_000,
      },
      userText: '那你继续说这个 diff',
      conversationState: {
        jointThread: 'Explain the current ProjectAtlas diff.',
        hostMove: 'Keep talking about this diff.',
        activeProject: 'ProjectAtlas diff',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: ['Explain the risky seam first.'],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['ProjectAtlas diff'],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(next?.lastOutcome).toBe('aligned')
    expect(next?.pendingValidation).toBeNull()
    expect(next?.lastUserMove).toBe('Keep talking about this diff.')
  })

  it('opens a new pending validation window after a persisted assistant turn', () => {
    const next = registerDialogueWorldThreadAssistantTurn({
      now: 30_000,
      previous: {
        activeThread: 'Explain the current ProjectAtlas diff.',
        currentQuestion: 'What is wrong with this diff?',
        openLoops: ['What is wrong with this diff?'],
        recentlyResolvedLoops: [],
        carriedFacts: ['ProjectAtlas diff'],
        relationDrift: 'steady',
        memoryMode: 'task-thread',
        recallKeys: ['ProjectAtlas diff'],
        lastUserMove: 'What is wrong with this diff?',
        lastAssistantMove: null,
        lastOutcome: 'none',
        pendingValidation: null,
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      },
      conversationState: {
        jointThread: 'Explain the current ProjectAtlas diff.',
        hostMove: 'What is wrong with this diff?',
        activeProject: 'ProjectAtlas diff',
        unansweredQuestion: 'What is wrong with this diff?',
        owedRepair: null,
        activeCommitments: ['Explain the risky seam first.'],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['ProjectAtlas diff'],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 30_000,
      },
      replyDeliberation: {
        selectedMotive: 'guide',
        speakingFrom: 'task-thread',
        memoryMode: 'task-thread',
        openingBeat: 'Pay off the current knot first.',
        whyThisReplyNow: 'The current diff is still unresolved.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 30_000,
      },
      assistantText: '先看这个 risky hunk，它最像真正的问题点。',
    })

    expect(next?.lastOutcome).toBe('pending')
    expect(next?.pendingValidation?.expectedMode).toBe('guide')
    expect(next?.lastAssistantMove).toContain('risky hunk')
  })
})
