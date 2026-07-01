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
})
