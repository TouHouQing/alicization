import { describe, expect, it } from 'vitest'

import { buildWorkingMemorySnapshot } from './working-memory-builder'

describe('working memory snapshot builder', () => {
  it('builds current thread, questions, commitments, corrections, and query hints from runtime signals', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-b',
      now: 10_000,
      currentUserText: '继续，我不是要固定回复',
      recentTurns: [
        {
          turnId: 'turn-1',
          userText: '你是谁',
          assistantText: '我是 Alicization',
          createdAt: 9000,
        },
      ],
      conversationState: {
        jointThread: 'B 线短期记忆工程',
        hostMove: '继续，我不是要固定回复',
        primaryTurnAnchor: '继续',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'WorkingMemory owner',
        unansweredQuestion: '怎么让短期记忆不断片',
        owedRepair: null,
        activeCommitments: ['先做短期记忆 owner，再接长期记忆'],
        relationFrame: 'repair',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['短期记忆', '固定模板'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: ['memory:task-thread'],
        updatedAt: 10_000,
      },
      dialogueWorldThread: {
        activeThread: 'B 线短期记忆工程',
        currentQuestion: '怎么让短期记忆不断片',
        openLoops: ['保留用户纠正'],
        recentlyResolvedLoops: [],
        carriedFacts: ['固定模板不能进人格'],
        relationDrift: 'repairing',
        memoryMode: 'task-thread',
        recallKeys: ['短期记忆', '固定模板'],
        lastUserMove: '继续，我不是要固定回复',
        lastAssistantMove: null,
        lastOutcome: 'pending',
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Hold the current B-line working memory task.',
        consciousTension: 'Avoid returning to fixed persona templates.',
        speakingIntention: 'Answer from the current implementation thread.',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: ['subject:task-knot'],
        updatedAt: 10_000,
      },
    })

    expect(snapshot.currentThread).toMatchObject({
      title: 'B 线短期记忆工程',
      currentUserMove: '继续，我不是要固定回复',
      mode: 'repair',
      shouldHold: true,
    })
    expect(snapshot.activeTask?.summary).toBe('WorkingMemory owner')
    expect(snapshot.unresolvedQuestions.map(item => item.text)).toContain('怎么让短期记忆不断片')
    expect(snapshot.commitments.map(item => item.text)).toContain('先做短期记忆 owner，再接长期记忆')
    expect(snapshot.userCorrections.map(item => item.text)).toContain('继续，我不是要固定回复')
    expect(snapshot.relationshipPosture?.summary).toContain('repair')
    expect(snapshot.emotionalPosture?.summary).toContain('Avoid returning to fixed persona templates.')
    expect(snapshot.memoryQueryHints).toEqual(['短期记忆', '固定模板'])
    expect(snapshot.recentRawTurns.at(-1)?.text).toBe('继续，我不是要固定回复')
  })

  it('keeps the previous thread title when the user only asks to continue', () => {
    const previousSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-b',
      now: 10_000,
      currentUserText: '继续这个本地数字生命的工作记忆线。',
      conversationState: {
        jointThread: 'B 线短期记忆工程',
        hostMove: '继续这个本地数字生命的工作记忆线。',
        primaryTurnAnchor: '工作记忆',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'WorkingMemory owner',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'repair',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['短期记忆'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    const nextSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-b',
      now: 11_000,
      currentUserText: '继续',
      previousSnapshot,
    })

    expect(nextSnapshot.currentThread).toMatchObject({
      title: 'B 线短期记忆工程',
      currentUserMove: '继续',
      mode: 'repair',
      shouldHold: true,
    })
    expect(nextSnapshot.activeTask?.summary).toBe('WorkingMemory owner')
    expect(nextSnapshot.memoryQueryHints).toEqual(['短期记忆'])
  })

  it('clears resolved questions and commitments while settling the active task', () => {
    const previousSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-b',
      now: 10_000,
      currentUserText: '继续 B 线短期记忆',
      conversationState: {
        jointThread: 'B 线短期记忆工程',
        hostMove: '继续 B 线短期记忆',
        primaryTurnAnchor: '工作记忆',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'WorkingMemory owner',
        unansweredQuestion: '短期记忆怎么不断片',
        owedRepair: null,
        activeCommitments: ['保留用户纠正'],
        relationFrame: 'repair',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['短期记忆'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    const nextSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-b',
      now: 11_000,
      currentUserText: '这个已经解决了',
      previousSnapshot,
      conversationState: {
        jointThread: 'B 线短期记忆工程',
        hostMove: '这个已经解决了',
        primaryTurnAnchor: '工作记忆',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'WorkingMemory owner',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'repair',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['短期记忆'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 11_000,
      },
      dialogueWorldThread: {
        activeThread: 'B 线短期记忆工程',
        currentQuestion: null,
        openLoops: [],
        recentlyResolvedLoops: ['短期记忆怎么不断片', '保留用户纠正'],
        carriedFacts: [],
        relationDrift: 'repairing',
        memoryMode: 'task-thread',
        recallKeys: ['短期记忆'],
        lastUserMove: '这个已经解决了',
        lastAssistantMove: null,
        lastOutcome: 'aligned',
        confidence: 0.82,
        narrative: [],
        updatedAt: 11_000,
      },
    })

    expect(nextSnapshot.unresolvedQuestions.map(item => item.text)).not.toContain('短期记忆怎么不断片')
    expect(nextSnapshot.commitments.map(item => item.text)).not.toContain('保留用户纠正')
    expect(nextSnapshot.activeTask).toMatchObject({
      summary: 'WorkingMemory owner',
      status: 'settled',
    })
  })

  it('marks the active task blocked when execution carry reports failure', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-b',
      now: 12_000,
      currentUserText: '继续排查',
      conversationState: {
        jointThread: 'B 线短期记忆工程',
        hostMove: '继续排查',
        primaryTurnAnchor: '工作记忆',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'WorkingMemory owner',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'repair',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['短期记忆'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 12_000,
      },
      executionCarry: 'execution_callback_status:failed execution_callback_goal:run tests execution_callback_outcome:tool failed',
    })

    expect(snapshot.activeTask).toMatchObject({
      summary: 'WorkingMemory owner',
      status: 'blocked',
    })
    expect(snapshot.executionState?.summary).toContain('execution_callback_status:failed')
  })
})
