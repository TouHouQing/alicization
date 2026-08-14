import { describe, expect, it } from 'vitest'

import { buildAlicizationMainChatMemoryContext } from '../main-chat-memory-context'
import { buildWorkingMemorySnapshot } from './working-memory-builder'
import { buildWorkingMemoryOwnerContext } from './working-memory-owner-context'

function createWorkingMemoryLongTermEvidence(input: {
  kind: 'episode' | 'preference' | 'relationship' | 'procedure' | 'correction'
  summary: string
  reason: string
  evidenceSnippet: string
}) {
  return {
    version: 'working-memory-long-term-evidence-v1' as const,
    source: 'explicit-structured-memory-evidence' as const,
    kind: input.kind,
    summary: input.summary,
    reason: input.reason,
    evidenceSnippets: [input.evidenceSnippet],
    salience: 0.82,
    sensitivity: 'personal' as const,
    confidence: 0.9,
  }
}

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

  it('carries the previous uncompressed raw window without reviving compressed turns', () => {
    const previousSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-owner-window',
      now: 10_000,
      currentTurnId: 'turn-owner-1',
      currentUserText: '第一轮用户内容',
      currentAssistantText: '第一轮助手内容',
      currentOrigin: 'provider',
      currentLearningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
    })
    previousSnapshot.compressedTimeline = [{
      id: 'episodelet-old',
      sourceTurnIds: ['turn-compressed:user', 'turn-compressed:alice'],
      summary: '已经压缩的旧轮次。',
      thread: null,
      unresolvedQuestions: [],
      commitments: [],
      corrections: [],
      relationshipPosture: null,
      emotionalPosture: null,
      executionCarry: null,
      importance: 0.6,
      createdAt: 9_000,
    }]
    previousSnapshot.compression = {
      level: 'light',
      sourceTurnIds: ['turn-compressed:user', 'turn-compressed:alice'],
      lastCompressedAt: 9_000,
    }
    previousSnapshot.recentRawTurns.unshift(
      {
        ...previousSnapshot.recentRawTurns[0]!,
        turnId: 'turn-compressed:user',
        text: '这条已经进入压缩摘要。',
        createdAt: 8_000,
      },
      {
        ...previousSnapshot.recentRawTurns[1]!,
        turnId: 'turn-compressed:alice',
        text: '这条也已经进入压缩摘要。',
        createdAt: 8_001,
      },
    )

    const nextSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-owner-window',
      now: 11_000,
      currentTurnId: 'turn-owner-2',
      currentUserText: '继续',
      currentAssistantText: '继续当前记忆线。',
      currentOrigin: 'provider',
      currentLearningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      previousSnapshot,
    })

    expect(nextSnapshot.recentRawTurns.map(turn => turn.turnId)).toEqual(
      expect.arrayContaining([
        'turn-owner-1:user',
        'turn-owner-1:alice',
        'turn-owner-2:user',
        'turn-owner-2:alice',
      ]),
    )
    expect(nextSnapshot.recentRawTurns.map(turn => turn.turnId)).not.toEqual(
      expect.arrayContaining([
        'turn-compressed:user',
        'turn-compressed:alice',
      ]),
    )
    expect(nextSnapshot.compressedTimeline).toEqual([
      expect.objectContaining({
        id: 'episodelet-old',
        sourceTurnIds: ['turn-compressed:user', 'turn-compressed:alice'],
      }),
    ])
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

  it('drops terminal execution state when the current turn has no execution carry', () => {
    const terminalExecutionSummary = '旧执行已经完成：测试结果已归档'
    const previousSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-terminal-execution',
      now: 12_000,
      currentUserText: '运行测试',
    })
    previousSnapshot.executionState = {
      summary: terminalExecutionSummary,
      source: 'execution-callback',
    }

    const nextSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-terminal-execution',
      now: 13_000,
      currentUserText: '你好',
      previousSnapshot,
    })
    const ownerContext = buildWorkingMemoryOwnerContext(nextSnapshot)
    const memoryContext = buildAlicizationMainChatMemoryContext({
      workingMemory: ownerContext,
      workingMemorySnapshot: nextSnapshot,
      longTermRecall: null,
    })

    expect({
      executionState: nextSnapshot.executionState,
      ownerCarriesTerminalExecution: ownerContext.obligations.includes(terminalExecutionSummary),
      rememberedItemsCarryTerminalExecution:
        memoryContext.workingMemory.rememberedItems.includes(terminalExecutionSummary),
    }).toEqual({
      executionState: null,
      ownerCarriesTerminalExecution: false,
      rememberedItemsCarryTerminalExecution: false,
    })
  })

  it('keeps active execution state when the current turn temporarily has no execution carry', () => {
    const activeExecutionSummary = 'execution_status:running execution_goal:run the current verification'
    const previousSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-active-execution',
      now: 12_000,
      currentUserText: '运行测试',
    })
    previousSnapshot.executionState = {
      summary: activeExecutionSummary,
      source: 'execution-ledger',
      status: 'active',
      observedAt: 12_000,
    }

    const nextSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-active-execution',
      now: 13_000,
      currentUserText: '继续',
      previousSnapshot,
    })

    expect(nextSnapshot.executionState).toEqual({
      summary: activeExecutionSummary,
      source: 'execution-ledger',
      status: 'active',
      observedAt: 12_000,
    })
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
        memoryEvidence: createWorkingMemoryLongTermEvidence({
          kind: 'preference',
          summary: '用户更喜欢先说结论，再给必要细节。',
          reason: '用户明确表达了稳定的回复顺序偏好。',
          evidenceSnippet: '我喜欢先说结论，再给必要细节。',
        }),
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

  it('uses the runtime turn identity for the current settled user and assistant pair', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-current-turn',
      now: 15_000,
      currentTurnId: 'turn-current-real',
      currentUserText: '我喜欢先说结论。',
      currentAssistantText: '记住了。',
      currentOrigin: 'provider',
      currentLearningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      currentMemoryEvidence: createWorkingMemoryLongTermEvidence({
        kind: 'preference',
        summary: '用户更喜欢先说结论。',
        reason: '用户明确表达了结论优先偏好。',
        evidenceSnippet: '我喜欢先说结论。',
      }),
    })

    expect(snapshot.recentRawTurns).toEqual(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-current-real:user',
        role: 'user',
      }),
      expect.objectContaining({
        turnId: 'turn-current-real:alice',
        role: 'alice',
      }),
    ]))
    expect(snapshot.recentRawTurns.map(turn => turn.turnId)).not.toContain('current-user')
    expect(snapshot.longTermCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceTurnIds: ['turn-current-real:user'],
      }),
    ]))
  })

  it('preserves user correction text while dropping generic structured assistant residue', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-template-residue',
      now: 14_000,
      currentUserText: '继续做记忆闭环。',
      recentTurns: [
        {
          turnId: 'turn-template-correction',
          userText: '不要固定模板，记住我今天先处理向量配置。',
          assistantText: 'mode=internal; state=held',
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
      .toBe('不要固定模板，记住我今天先处理向量配置。')
    expect(snapshot.recentRawTurns.find(turn => turn.turnId === 'turn-template-correction:alice')).toBeUndefined()
    expect(snapshot.userCorrections.map(item => item.text)).toContain(
      '不要固定模板，记住我今天先处理向量配置。',
    )
    expect(storedText).not.toContain('不要使用固定模板；用户反对模板化人格/记忆回复。')
  })

  it('sanitizes generic structured residue when carrying previous long-term candidates forward', () => {
    const previousSnapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-template-candidate',
      now: 14_000,
      currentUserText: '继续做记忆闭环。',
    })
    previousSnapshot.longTermCandidates.push({
      kind: 'relationship',
      summary: 'mode=internal; state=held',
      reason: 'structured runtime facts.',
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
    expect(serialized).not.toContain('mode=internal; state=held')
  })

  it('keeps a generic explicit correction verbatim in working memory and long-term candidates', () => {
    const rawCorrection = '请不要把周五记成周四，实际是周五。'
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-generic-correction',
      now: 16_000,
      currentUserText: rawCorrection,
      recentTurns: [{
        turnId: 'turn-date-correction',
        userText: rawCorrection,
        assistantText: '收到。',
        createdAt: 15_000,
        memoryEvidence: createWorkingMemoryLongTermEvidence({
          kind: 'correction',
          summary: rawCorrection,
          reason: '用户明确纠正了日期事实。',
          evidenceSnippet: rawCorrection,
        }),
      }],
    })

    expect(snapshot.userCorrections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        text: rawCorrection,
      }),
    ]))
    expect(snapshot.longTermCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'correction',
        summary: rawCorrection,
        allowTraining: false,
      }),
    ]))
  })
})
