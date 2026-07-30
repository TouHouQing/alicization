import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import {
  registerDialogueWorldThreadAssistantTurn,
  settleDialogueWorldThreadOnUserTurn,
} from './turn-outcome-reducer'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('turn-outcome-reducer', () => {
  it('uses dialogue carry when an assistant turn has no prior memory mode', () => {
    const next = registerDialogueWorldThreadAssistantTurn({
      now: 10_000,
      assistantText: '我们继续。',
    })

    expect(next?.memoryMode).toBe('dialogue-carry')
  })

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

  it('prefers runtimeSurface when settling a user turn outcome', () => {
    const runtimeBackedState = createDefaultVisualPresenceState(40_000)
    runtimeBackedState.dialogueWorldThread = {
      activeThread: 'Runtime governed diff.',
      currentQuestion: 'Which runtime branch is failing?',
      openLoops: ['Which runtime branch is failing?'],
      recentlyResolvedLoops: [],
      carriedFacts: ['Runtime diff'],
      relationDrift: 'steady',
      memoryMode: 'task-thread',
      recallKeys: ['Runtime diff'],
      lastUserMove: 'Which runtime branch is failing?',
      lastAssistantMove: 'The runtime guard is still missing.',
      lastOutcome: 'pending',
      pendingValidation: {
        question: 'Which runtime branch is failing?',
        expectedMode: 'guide',
        openedAt: 30_000,
      },
      confidence: 0.88,
      narrative: [],
      updatedAt: 30_000,
    }
    runtimeBackedState.conversationState = {
      jointThread: 'Runtime governed diff.',
      hostMove: 'Show me the runtime branch again.',
      activeProject: 'Runtime diff',
      unansweredQuestion: null,
      owedRepair: null,
      activeCommitments: ['Stay on the runtime branch.'],
      relationFrame: 'guide',
      continuityPolicy: 'stay-on-thread',
      memoryMode: 'task-thread',
      memoryQueryHints: ['Runtime diff'],
      shouldHoldThread: true,
      confidence: 0.9,
      narrative: [],
      updatedAt: 40_000,
    } as any
    runtimeBackedState.discourseState = {
      currentTurnSubject: 'task-knot',
      screenReferenceMode: 'helpful',
      currentTurnSummary: 'Stay on the runtime diff.',
      currentQuestion: 'Which runtime branch is failing?',
      owedAction: 'guide-task',
      relationMove: 'guide',
      continuityMode: 'task-first',
      confidence: 0.86,
      narrative: [],
      updatedAt: 40_000,
    } as any

    const next = settleDialogueWorldThreadOnUserTurn({
      now: 40_000,
      previous: {
        activeThread: 'raw previous',
        currentQuestion: 'raw previous',
        openLoops: ['raw previous'],
        recentlyResolvedLoops: [],
        carriedFacts: ['raw previous'],
        relationDrift: 'warming',
        memoryMode: 'dialogue-carry',
        recallKeys: ['raw previous'],
        lastUserMove: 'raw previous',
        lastAssistantMove: 'raw previous',
        lastOutcome: 'missed',
        pendingValidation: {
          question: 'raw previous',
          expectedMode: 'care',
          openedAt: 10_000,
        },
        confidence: 0.2,
        narrative: [],
        updatedAt: 10_000,
      },
      conversationState: {
        jointThread: 'raw conflict',
        hostMove: 'raw conflict',
        activeProject: null,
        unansweredQuestion: 'raw conflict',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['raw conflict'],
        shouldHoldThread: false,
        confidence: 0.2,
        narrative: [],
        updatedAt: 40_000,
      },
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(next?.lastOutcome).toBe('aligned')
    expect(next?.lastUserMove).toBe('Show me the runtime branch again.')
    expect(next?.currentQuestion).toBe('Which runtime branch is failing?')
  })

  it('prefers runtimeSurface when opening assistant validation windows', () => {
    const runtimeBackedState = createDefaultVisualPresenceState(50_000)
    runtimeBackedState.dialogueWorldThread = {
      activeThread: 'Runtime governed diff.',
      currentQuestion: 'Which runtime branch is failing?',
      openLoops: ['Which runtime branch is failing?'],
      recentlyResolvedLoops: [],
      carriedFacts: ['Runtime diff'],
      relationDrift: 'steady',
      memoryMode: 'task-thread',
      recallKeys: ['Runtime diff'],
      lastUserMove: 'Which runtime branch is failing?',
      lastAssistantMove: null,
      lastOutcome: 'none',
      pendingValidation: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 40_000,
    }
    runtimeBackedState.conversationState = {
      jointThread: 'Runtime governed diff.',
      hostMove: 'Which runtime branch is failing?',
      activeProject: 'Runtime diff',
      unansweredQuestion: 'Which runtime branch is failing?',
      owedRepair: null,
      activeCommitments: ['Stay on the runtime branch.'],
      relationFrame: 'guide',
      continuityPolicy: 'stay-on-thread',
      memoryMode: 'task-thread',
      memoryQueryHints: ['Runtime diff'],
      shouldHoldThread: true,
      confidence: 0.88,
      narrative: [],
      updatedAt: 50_000,
    } as any
    runtimeBackedState.replyDeliberation = {
      selectedMotive: 'guide',
      confidence: 0.86,
      updatedAt: 50_000,
    } as any
    runtimeBackedState.answerCompiler = {
      recommendedAct: 'guide',
      openingClaim: 'Runtime broken guard',
      supportingReality: ['Runtime broken guard'],
      confidence: 0.87,
    } as any

    const next = registerDialogueWorldThreadAssistantTurn({
      now: 50_000,
      previous: {
        activeThread: 'raw previous',
        currentQuestion: 'raw previous',
        openLoops: ['raw previous'],
        recentlyResolvedLoops: [],
        carriedFacts: ['raw previous'],
        relationDrift: 'warming',
        memoryMode: 'dialogue-carry',
        recallKeys: ['raw previous'],
        lastUserMove: 'raw previous',
        lastAssistantMove: null,
        lastOutcome: 'none',
        pendingValidation: null,
        confidence: 0.2,
        narrative: [],
        updatedAt: 40_000,
      },
      conversationState: {
        jointThread: 'raw conflict',
        hostMove: 'raw conflict',
        activeProject: 'raw conflict',
        unansweredQuestion: 'raw conflict',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['raw conflict'],
        shouldHoldThread: false,
        confidence: 0.2,
        narrative: [],
        updatedAt: 50_000,
      },
      assistantText: 'Pay off the runtime branch first.',
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(next?.activeThread).toBe('Runtime governed diff.')
    expect(next?.pendingValidation?.expectedMode).toBe('guide')
    expect(next?.carriedFacts).toContain('Runtime broken guard')
  })
})
