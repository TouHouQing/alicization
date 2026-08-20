import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import { describe, expect, it, vi } from 'vitest'

import {
  parseWorkingMemoryCheckpoint,
  serializeWorkingMemoryCheckpoint,
} from './life-core/working-memory-checkpoint'
import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import {
  replayMemoryDialogue,
  serializeMemoryDialogueReplayReport,
} from './memory-db-dialogue-replay-harness'

const baseNow = Date.parse('2026-08-15T10:00:00.000Z')

function createRecallBundle(input: {
  query: string
  cardId: string
  userId: string
  now: number
  candidates?: Parameters<typeof buildLongTermMemoryEvidenceBundle>[0]['candidates']
}): LongTermMemoryEvidenceBundle {
  const intent = deriveLongTermMemoryRecallIntent({
    currentUserText: input.query,
  })
  const plan = buildLongTermMemoryQueryPlan({
    intent,
    currentUserText: input.query,
  })
  return buildLongTermMemoryEvidenceBundle({
    intent,
    plan,
    candidates: input.candidates ?? [],
    now: input.now,
    limit: 5,
    scope: {
      cardId: input.cardId,
      userId: input.userId,
    },
  })
}

function createPersistedDb(input?: {
  initialSnapshot?: WorkingMemorySnapshot | null
  initialPersonaState?: unknown
  recall?: (input: {
    cardId: string
    userId?: string
    currentUserText: string
    workingMemoryQueryHints?: string[]
    currentThreadTitle?: string | null
    activeTask?: string | null
    limit?: number
  }) => Promise<LongTermMemoryEvidenceBundle>
}) {
  let checkpointJson = input?.initialSnapshot
    ? serializeWorkingMemoryCheckpoint(input.initialSnapshot)
    : null
  let personaState: unknown = structuredClone(input?.initialPersonaState ?? { version: 1 })
  const upsertWorkingMemoryCheckpoint = vi.fn(async (snapshot: WorkingMemorySnapshot) => {
    checkpointJson = serializeWorkingMemoryCheckpoint(snapshot)
  })
  const persistPersonaState = vi.fn(async (next: unknown) => {
    personaState = structuredClone(next)
  })

  return {
    db: {
      getWorkingMemoryCheckpoint: vi.fn(async (cardId: string, sessionId: string) =>
        parseWorkingMemoryCheckpoint(checkpointJson, { cardId, sessionId })),
      upsertWorkingMemoryCheckpoint,
      retrieveLongTermMemoryEvidence: vi.fn(async recallInput =>
        input?.recall?.(recallInput) ?? createRecallBundle({
          query: recallInput.currentUserText,
          cardId: recallInput.cardId,
          userId: recallInput.userId ?? 'user-1',
          now: baseNow,
        })),
      readPersonaState: vi.fn(async () => structuredClone(personaState)),
      persistPersonaState,
    },
    readCheckpoint: () => parseWorkingMemoryCheckpoint(checkpointJson),
    readPersonaState: () => structuredClone(personaState),
  }
}

describe('db-backed memory dialogue replay harness', () => {
  it('hydrates persistent state and writes a successful first-round checkpoint', async () => {
    const persistence = createPersistedDb()
    const provider = {
      generate: vi.fn(async () => ({
        text: '我先接住这条线。',
        personaState: {
          version: 2,
          learnedFrom: 'turn-1',
        },
      })),
    }

    const report = await replayMemoryDialogue({
      id: 'first-round-checkpoint',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      maxRawTurns: 6,
      db: persistence.db,
      provider,
      turns: [{
        turnId: 'turn-1',
        userText: '先记住白樱线。',
        now: baseNow,
      }],
    })

    expect(report.passed).toBe(true)
    expect(report.turns[0]).toMatchObject({
      turnId: 'turn-1',
      status: 'succeeded',
      writeback: {
        checkpoint: 'written',
        persona: 'written',
      },
    })
    expect(report.turns[0]?.stages.map(stage => stage.name)).toEqual([
      'hydration',
      'compression',
      'context-assembly',
      'recall',
      'provider-adapter',
      'commit',
    ])
    expect(persistence.db.getWorkingMemoryCheckpoint).toHaveBeenCalledWith(
      'card-1',
      'session-1',
    )
    expect(persistence.db.upsertWorkingMemoryCheckpoint).toHaveBeenCalledTimes(1)
    expect(persistence.db.persistPersonaState).toHaveBeenCalledTimes(1)
    expect(persistence.readCheckpoint()?.recentRawTurns.map(turn => turn.text)).toEqual([
      '先记住白樱线。',
      '我先接住这条线。',
    ])
    expect(persistence.readPersonaState()).toEqual({
      version: 2,
      learnedFrom: 'turn-1',
    })
    expect(JSON.parse(serializeMemoryDialogueReplayReport(report))).toMatchObject({
      version: 'memory-db-dialogue-replay-report-v1',
      passed: true,
    })
  })

  it('puts compressed context and recalled evidence into the second provider request', async () => {
    const persistence = createPersistedDb({
      recall: async input => createRecallBundle({
        query: input.currentUserText,
        cardId: input.cardId,
        userId: input.userId ?? 'user-1',
        now: baseNow,
        candidates: input.currentUserText.includes('记得')
          ? [{
              id: 'memory-white-sakura',
              kind: 'fact',
              summary: '白樱线要保持在同一段真实桌面对话里。',
              source: 'memory_facts',
              confidence: 0.96,
              salience: 0.92,
              cues: ['白樱线', '真实桌面对话'],
              entities: ['白樱线'],
              sensitivity: 'personal',
            }]
          : [],
      }),
    })
    const providerMessages: Array<Array<{ role: string, content: string }>> = []
    const provider = {
      generate: vi.fn(async ({ messages }: { messages: Array<{ role: string, content: string }> }) => {
        providerMessages.push(messages)
        const context = messages.find(message => message.content.includes('alicization-turn-memory-context'))
        return {
          text: context?.content.includes('memory-white-sakura')
            ? '我记得白樱线，我们继续沿着同一条关系线。'
            : '第一轮先把这条线留住。',
        }
      }),
    }

    const report = await replayMemoryDialogue({
      id: 'compression-and-recall',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      maxRawTurns: 2,
      db: persistence.db,
      provider,
      turns: [
        {
          turnId: 'turn-1',
          userText: '先把白樱线留在这里。',
          now: baseNow,
        },
        {
          turnId: 'turn-2',
          userText: '你还记得白樱线吗？',
          now: baseNow + 1_000,
        },
      ],
    })

    expect(report.passed).toBe(true)
    expect(provider.generate).toHaveBeenCalledTimes(2)
    expect(report.turns[1]?.stages.find(stage => stage.name === 'compression')).toMatchObject({
      status: 'succeeded',
      details: {
        changed: true,
      },
    })
    const secondMemoryContext = JSON.parse(
      providerMessages[1]?.find(message => message.content.includes('alicization-turn-memory-context'))?.content ?? '{}',
    ) as {
      data?: {
        workingMemory?: {
          compressedTimeline?: Array<{ summary: string }>
        }
        longTermRecall?: {
          evidence?: Array<{ id: string }>
        }
      }
    }
    expect(secondMemoryContext.data?.workingMemory?.compressedTimeline?.[0]?.summary).toContain('白樱线')
    expect(secondMemoryContext.data?.longTermRecall?.evidence?.[0]?.id).toBe('memory-white-sakura')
    expect(report.turns[1]?.providerOutput).toBe('我记得白樱线，我们继续沿着同一条关系线。')
    expect(report.turns[1]?.providerOutput).not.toBe(report.turns[0]?.providerOutput)
  })

  it('does not write memory or Persona for a failed provider turn', async () => {
    const persistence = createPersistedDb()
    const provider = {
      generate: vi.fn()
        .mockResolvedValueOnce({
          text: '第一轮已经写入。',
          personaState: {
            version: 2,
            learnedFrom: 'turn-1',
          },
        })
        .mockRejectedValueOnce(new Error('provider unavailable')),
    }

    const report = await replayMemoryDialogue({
      id: 'failed-turn-no-writeback',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      db: persistence.db,
      provider,
      turns: [
        {
          turnId: 'turn-1',
          userText: '先记住这条线。',
          now: baseNow,
        },
        {
          turnId: 'turn-2',
          userText: '继续，但这轮 Provider 会失败。',
          now: baseNow + 1_000,
        },
      ],
    })

    expect(report.passed).toBe(false)
    expect(report.turns[1]).toMatchObject({
      turnId: 'turn-2',
      status: 'failed',
      error: 'provider unavailable',
      writeback: {
        checkpoint: 'skipped',
        persona: 'skipped',
      },
    })
    expect(report.turns[1]?.stages.at(-1)).toMatchObject({
      name: 'provider-adapter',
      status: 'failed',
    })
    expect(persistence.db.upsertWorkingMemoryCheckpoint).toHaveBeenCalledTimes(1)
    expect(persistence.db.persistPersonaState).toHaveBeenCalledTimes(1)
    expect(persistence.readCheckpoint()?.recentRawTurns.map(turn => turn.text)).toEqual([
      '先记住这条线。',
      '第一轮已经写入。',
    ])
    expect(persistence.readPersonaState()).toEqual({
      version: 2,
      learnedFrom: 'turn-1',
    })
  })

  it('cancels a provider turn without writing back or starting later turns', async () => {
    const persistence = createPersistedDb()
    const controller = new AbortController()
    const provider = {
      generate: vi.fn(async ({ signal }: { signal: AbortSignal }) => {
        await new Promise<never>((_resolve, reject) => {
          const onAbort = () => {
            signal.removeEventListener('abort', onAbort)
            reject(signal.reason)
          }
          signal.addEventListener('abort', onAbort, { once: true })
        })
        return { text: '不会到达' }
      }),
    }

    const replayPromise = replayMemoryDialogue({
      id: 'cancel-provider-turn',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      db: persistence.db,
      provider,
      signal: controller.signal,
      turns: [
        {
          turnId: 'turn-1',
          userText: '这一轮会被取消。',
          now: baseNow,
        },
        {
          turnId: 'turn-2',
          userText: '这一轮不应该开始。',
          now: baseNow + 1_000,
        },
      ],
    })

    await vi.waitFor(() => expect(provider.generate).toHaveBeenCalledTimes(1))
    controller.abort(new Error('用户取消质量试用'))
    const report = await replayPromise

    expect(report.passed).toBe(false)
    expect(report.summary.turnCount).toBe(1)
    expect(provider.generate).toHaveBeenCalledTimes(1)
    expect(provider.generate.mock.calls[0]?.[0].signal.aborted).toBe(true)
    expect(report.turns[0]).toMatchObject({
      turnId: 'turn-1',
      status: 'failed',
      error: '用户取消质量试用',
      writeback: {
        checkpoint: 'skipped',
        persona: 'skipped',
      },
    })
    expect(persistence.db.upsertWorkingMemoryCheckpoint).not.toHaveBeenCalled()
    expect(persistence.db.persistPersonaState).not.toHaveBeenCalled()
  })

  it('cancels during recall before provider execution and prevents writeback', async () => {
    const persistence = createPersistedDb({
      recall: async () => await new Promise<never>(() => {}),
    })
    const controller = new AbortController()
    const provider = {
      generate: vi.fn(async () => ({ text: '不会调用' })),
    }

    const replay = replayMemoryDialogue({
      id: 'cancel-recall',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      db: persistence.db,
      provider,
      signal: controller.signal,
      turns: [{
        turnId: 'turn-1',
        userText: '召回阶段会被取消。',
        now: baseNow,
      }],
    })
    await vi.waitFor(() => expect(persistence.db.retrieveLongTermMemoryEvidence).toHaveBeenCalledTimes(1))
    controller.abort(new Error('用户取消召回'))

    const report = await replay

    expect(report.passed).toBe(false)
    expect(provider.generate).not.toHaveBeenCalled()
    expect(report.turns[0]).toMatchObject({
      status: 'failed',
      error: '用户取消召回',
      writeback: {
        checkpoint: 'skipped',
        persona: 'skipped',
      },
    })
    expect(report.turns[0]?.stages.at(-1)).toMatchObject({
      name: 'recall',
      status: 'failed',
      error: '用户取消召回',
    })
    expect(persistence.db.upsertWorkingMemoryCheckpoint).not.toHaveBeenCalled()
  })

  it('reports an already-aborted replay without touching the database or provider', async () => {
    const persistence = createPersistedDb()
    const controller = new AbortController()
    controller.abort(new Error('回放开始前已取消'))
    const provider = {
      generate: vi.fn(async () => ({ text: '不会调用' })),
    }

    const report = await replayMemoryDialogue({
      id: 'already-cancelled',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      db: persistence.db,
      provider,
      signal: controller.signal,
      turns: [{
        turnId: 'turn-1',
        userText: '不会开始。',
        now: baseNow,
      }],
    })

    expect(report.passed).toBe(false)
    expect(report.summary.turnCount).toBe(1)
    expect(provider.generate).not.toHaveBeenCalled()
    expect(persistence.db.getWorkingMemoryCheckpoint).not.toHaveBeenCalled()
    expect(report.turns[0]).toMatchObject({
      status: 'failed',
      error: '回放开始前已取消',
      writeback: {
        checkpoint: 'skipped',
        persona: 'skipped',
      },
    })
  })
})
