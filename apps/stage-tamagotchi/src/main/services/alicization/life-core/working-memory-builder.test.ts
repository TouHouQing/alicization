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

  it('marks common timeout and provider failure replies as audit-only turns', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-failures',
      now: 13_000,
      currentUserText: '继续',
      recentTurns: [
        {
          turnId: 'turn-timeout-en',
          userText: '你刚才怎么断了',
          assistantText: 'Timed out.',
          createdAt: 12_000,
        },
        {
          turnId: 'turn-timeout-zh',
          userText: '模型是不是超时',
          assistantText: '请求超时，请稍后重试。',
          createdAt: 12_100,
        },
        {
          turnId: 'turn-provider',
          userText: '向量模型连上了吗',
          assistantText: 'embedding provider failed with HTTP 400',
          createdAt: 12_200,
        },
      ],
    })

    expect(snapshot.recentRawTurns.find(turn => turn.turnId === 'turn-timeout-en:alice')?.failureKind).toBe('timeout')
    expect(snapshot.recentRawTurns.find(turn => turn.turnId === 'turn-timeout-zh:alice')?.failureKind).toBe('timeout')
    expect(snapshot.recentRawTurns.find(turn => turn.turnId === 'turn-provider:alice')?.failureKind).toBe('provider-error')
    expect(snapshot.audit.failureTurnIds).toEqual(
      expect.arrayContaining(['turn-timeout-en:alice', 'turn-timeout-zh:alice', 'turn-provider:alice']),
    )
    expect(snapshot.audit.excludedLongTermCandidateTurnIds).toEqual(
      expect.arrayContaining(['turn-timeout-en:alice', 'turn-timeout-zh:alice', 'turn-provider:alice']),
    )
  })

  it('uses typed failure surfaces for audit and blocks failed turns from long-term candidates', () => {
    const failureKinds = [
      'timeout',
      'provider-auth',
      'provider-schema-unsupported',
      'stream-failure',
      'recall-failure',
      'memory-persistence',
    ] as const
    const recentTurns = failureKinds.map((kind, index) => ({
      turnId: `turn-${kind}`,
      userText: `需要记住的失败请求 ${kind}`,
      assistantText: `错误：${kind}`,
      createdAt: 13_000 + index,
      origin: 'failure-surface',
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface: {
        kind,
        origin: 'failure-surface',
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
    }))
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-typed-failures',
      now: 14_000,
      currentUserText: '继续',
      recentTurns: recentTurns as any,
    })

    for (const kind of failureKinds) {
      expect(snapshot.audit.failureTurnIds).toContain(`turn-${kind}:alice`)
      expect(snapshot.audit.excludedLongTermCandidateTurnIds).toEqual(expect.arrayContaining([
        `turn-${kind}:user`,
        `turn-${kind}:alice`,
      ]))
    }
    expect(snapshot.longTermCandidates).toEqual([])
  })

  it('creates cleaned long-term candidates only after a provider-authored turn settles', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-provider-learning',
      now: 15_000,
      currentUserText: '继续',
      recentTurns: [{
        turnId: 'turn-provider',
        userText: '我喜欢先说结论，再给必要细节。',
        assistantText: '明白。',
        createdAt: 14_000,
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
      }] as any,
    })

    expect(snapshot.longTermCandidates).toEqual([
      expect.objectContaining({
        sourceTurnIds: ['turn-provider:user'],
        kind: 'preference',
        allowTraining: false,
      }),
    ])
  })

  it('sanitizes fixed-template residue before storing recent raw turns in WorkingMemory', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-template-residue',
      now: 14_000,
      currentUserText: '继续做记忆闭环。',
      recentTurns: [
        {
          turnId: 'turn-template-correction',
          userText: '不要再用 same-her 这类固定话术，记住我今天先处理向量配置。',
          assistantText: 'pre_turn_context_digest',
          createdAt: 13_000,
        },
      ],
    })

    const storedText = JSON.stringify({
      recentRawTurns: snapshot.recentRawTurns,
      userCorrections: snapshot.userCorrections,
      longTermCandidates: snapshot.longTermCandidates,
      compressedTimeline: snapshot.compressedTimeline,
    })

    expect(snapshot.recentRawTurns.find(turn => turn.turnId === 'turn-template-correction:user')?.text)
      .toBe('不要再用 same-her 这类固定话术，记住我今天先处理向量配置。')
    expect(snapshot.recentRawTurns.find(turn => turn.turnId === 'turn-template-correction:alice')).toBeUndefined()
    expect(snapshot.userCorrections.map(item => item.text)).toContain(
      '不要再用 same-her 这类固定话术，记住我今天先处理向量配置。',
    )
    expect(storedText).not.toContain('不要使用固定模板；用户反对模板化人格/记忆回复。')
  })

  it('sanitizes fixed-template residue when carrying previous long-term candidates forward', () => {
    const previousSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-template-candidate',
      now: 14_000,
      currentUserText: '继续做记忆闭环。',
    })
    previousSnapshot.longTermCandidates.push({
      kind: 'relationship',
      summary: 'pre_turn_context_digest',
      reason: 'structured continuity digest.',
      sourceTurnIds: ['turn-template-candidate'],
      salience: 0.7,
      sensitivity: 'personal',
      confidence: 0.8,
      allowTraining: false,
    })

    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-template-candidate',
      now: 15_000,
      currentUserText: '继续',
      previousSnapshot,
    })

    const serialized = JSON.stringify(snapshot.longTermCandidates)

    expect(snapshot.longTermCandidates).toEqual([])
    expect(serialized).not.toMatch(/Before (?:answering|speaking)|local-first digital life project|legacy phase-one template|one continuous "?her"?|continuity state/iu)
  })
})
