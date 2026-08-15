import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import { describe, expect, it, vi } from 'vitest'

import { buildWorkingMemorySnapshot } from './life-core/working-memory-builder'
import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import {
  runMemoryLiveProviderTrial,
} from './memory-live-provider-trial'

function createRecallBundle(): LongTermMemoryEvidenceBundle {
  const intent = deriveLongTermMemoryRecallIntent({
    currentUserText: '你还记得白樱线吗？',
  })
  const plan = buildLongTermMemoryQueryPlan({
    intent,
    currentUserText: '你还记得白樱线吗？',
  })
  return buildLongTermMemoryEvidenceBundle({
    intent,
    plan,
    now: 100,
    limit: 5,
    scope: {
      cardId: 'card-1',
      userId: 'user-1',
    },
    candidates: [{
      id: 'memory-white-sakura',
      kind: 'fact',
      summary: '白樱线要保持在同一段真实桌面对话里。',
      source: 'memory_facts',
      confidence: 0.96,
      salience: 0.92,
      cues: ['白樱线'],
      entities: ['白樱线'],
      sensitivity: 'personal',
      provenance: 'remembered',
      scope: {
        cardId: 'card-1',
        userId: 'user-1',
      },
    }],
  })
}

function createCheckpoint(): WorkingMemorySnapshot {
  return buildWorkingMemorySnapshot({
    cardId: 'card-1',
    sessionId: 'session-1',
    now: 0,
    currentUserText: '之前聊过白樱线。',
    currentTurnId: 'turn-0',
    currentAssistantText: '记得。',
    currentLearningPolicy: {
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    },
  })
}

describe('memory live provider trial', () => {
  it('passes the real memory context to the provider without writing production state', async () => {
    const checkpoint = createCheckpoint()
    const provider = vi.fn(async (input: {
      messages: Array<{ role: string, content: string }>
      memoryContext: { providerSystemBlock: string }
    }) => {
      expect(input.messages[0]?.content).toBe(input.memoryContext.providerSystemBlock)
      expect(input.memoryContext.providerSystemBlock).toContain('memory-white-sakura')
      return {
        text: '我记得白樱线。',
        providerId: 'test-provider',
        modelId: 'test-model',
        finishReason: 'stop',
        retryCount: 0,
        latencyMs: 3,
      }
    })
    const productionDb = {
      getWorkingMemoryCheckpoint: vi.fn(async () => checkpoint),
      upsertWorkingMemoryCheckpoint: vi.fn(),
      retrieveLongTermMemoryEvidenceReadOnly: vi.fn(async () => createRecallBundle()),
      readPersonaState: vi.fn(async () => ({ revision: 1 })),
      persistPersonaState: vi.fn(),
    }

    const report = await runMemoryLiveProviderTrial({
      id: 'trial-1',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      turns: [{
        turnId: 'turn-1',
        userText: '你还记得白樱线吗？',
        now: 1,
      }],
      db: productionDb,
      provider,
      maxTurns: 2,
      perTurnTimeoutMs: 1000,
      totalTimeoutMs: 2000,
    })

    expect(report.passed).toBe(true)
    expect(report.summary.succeededTurnCount).toBe(1)
    expect(report.turns[0]?.providerTrace?.outputLength).toBe('我记得白樱线。'.length)
    expect(report.productionWrites).toEqual([])
    expect(productionDb.upsertWorkingMemoryCheckpoint).not.toHaveBeenCalled()
    expect(productionDb.persistPersonaState).not.toHaveBeenCalled()
    expect(provider).toHaveBeenCalledOnce()
  })

  it('keeps provider failures explicit, redacts JSON credentials and input, and never creates a fallback reply', async () => {
    const userText = '这是不应进入错误报告的用户输入'
    const provider = vi.fn(async () => {
      throw new Error(JSON.stringify({
        message: `provider unavailable after echoing ${userText}`,
        authorization: 'Bearer secret-token',
        api_key: 'private-key',
        secret: 'private-secret',
      }))
    })

    const report = await runMemoryLiveProviderTrial({
      id: 'trial-failure',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      turns: [{
        turnId: 'turn-1',
        userText,
        now: 1,
      }],
      db: {
        getWorkingMemoryCheckpoint: vi.fn(async () => null),
        retrieveLongTermMemoryEvidenceReadOnly: vi.fn(async () => createRecallBundle()),
      },
      provider,
      maxTurns: 1,
      perTurnTimeoutMs: 1000,
      totalTimeoutMs: 2000,
    })

    expect(report.passed).toBe(false)
    expect(report.summary.lastError).toContain('provider unavailable')
    expect(report.summary.lastError).toContain('[redacted]')
    expect(report.summary.lastError).not.toContain('secret-token')
    expect(report.summary.lastError).not.toContain('private-key')
    expect(report.summary.lastError).not.toContain('private-secret')
    expect(report.summary.lastError).not.toContain(userText)
    expect(report.turns[0]?.providerOutput).toBeNull()
    expect(report.turns[0]?.error).toContain('provider unavailable')
    expect(report.turns[0]?.providerMessages).toEqual([])
  })

  it('honors cancellation and maximum turn limits', async () => {
    const controller = new AbortController()
    const provider = vi.fn(async () => ({
      text: 'ok',
      providerId: 'test-provider',
      modelId: 'test-model',
      finishReason: 'stop',
      retryCount: 0,
      latencyMs: 1,
    }))
    const report = await runMemoryLiveProviderTrial({
      id: 'trial-limit',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      turns: [
        { turnId: 'turn-1', userText: '一', now: 1 },
        { turnId: 'turn-2', userText: '二', now: 2 },
      ],
      db: {
        getWorkingMemoryCheckpoint: vi.fn(async () => null),
        retrieveLongTermMemoryEvidenceReadOnly: vi.fn(async () => createRecallBundle()),
      },
      provider,
      signal: controller.signal,
      maxTurns: 1,
      perTurnTimeoutMs: 1000,
      totalTimeoutMs: 2000,
    })

    expect(report.summary.turnCount).toBe(1)
    expect(provider).toHaveBeenCalledOnce()

    controller.abort('cancelled by test')
    const cancelled = await runMemoryLiveProviderTrial({
      id: 'trial-cancelled',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      turns: [{ turnId: 'turn-1', userText: '一', now: 1 }],
      db: {
        getWorkingMemoryCheckpoint: vi.fn(async () => null),
        retrieveLongTermMemoryEvidenceReadOnly: vi.fn(async () => createRecallBundle()),
      },
      provider,
      signal: controller.signal,
      maxTurns: 1,
      perTurnTimeoutMs: 1000,
      totalTimeoutMs: 2000,
    })

    expect(cancelled.passed).toBe(false)
    expect(cancelled.summary.lastError).toContain('cancel')
    expect(cancelled.productionWrites).toEqual([])
  })

  it('cancels an in-flight provider call and preserves the cancellation reason', async () => {
    const controller = new AbortController()
    let providerSignal: AbortSignal | null = null
    const provider = vi.fn(async (input: { signal: AbortSignal }) => {
      providerSignal = input.signal
      return await new Promise<never>(() => {})
    })
    const trial = runMemoryLiveProviderTrial({
      id: 'trial-running-cancel',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      turns: [{ turnId: 'turn-1', userText: '请取消这次试用', now: 1 }],
      db: {
        getWorkingMemoryCheckpoint: vi.fn(async () => null),
        retrieveLongTermMemoryEvidenceReadOnly: vi.fn(async () => createRecallBundle()),
      },
      provider,
      perTurnTimeoutMs: 1000,
      totalTimeoutMs: 2000,
      signal: controller.signal,
    })

    await vi.waitFor(() => expect(providerSignal).not.toBeNull())
    controller.abort(new Error('cancelled while provider was running'))
    const report = await trial

    expect((providerSignal as AbortSignal | null)?.aborted).toBe(true)
    expect(report.passed).toBe(false)
    expect(report.summary.lastError).toContain('cancelled while provider was running')
    expect(report.productionWrites).toEqual([])
  })

  it('applies the total deadline to initial production reads', async () => {
    const startedAt = Date.now()
    const report = await runMemoryLiveProviderTrial({
      id: 'trial-hydration-timeout',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      turns: [{ turnId: 'turn-1', userText: '一', now: 1 }],
      db: {
        getWorkingMemoryCheckpoint: vi.fn(async () => await new Promise<never>(() => {})),
        retrieveLongTermMemoryEvidenceReadOnly: vi.fn(async () => createRecallBundle()),
      },
      provider: vi.fn(async () => ({
        text: '不应执行',
        providerId: 'test-provider',
        modelId: 'test-model',
        finishReason: 'stop',
        retryCount: 0,
        latencyMs: 1,
      })),
      perTurnTimeoutMs: 50,
      totalTimeoutMs: 25,
    })

    expect(Date.now() - startedAt).toBeLessThan(500)
    expect(report.passed).toBe(false)
    expect(report.summary.lastError).toContain('timed out')
  }, 1000)

  it('applies the per-turn deadline to read-only recall before Provider execution', async () => {
    const provider = vi.fn(async () => ({
      text: '不应执行',
      providerId: 'test-provider',
      modelId: 'test-model',
      finishReason: 'stop',
      retryCount: 0,
      latencyMs: 1,
    }))
    const startedAt = Date.now()
    const report = await runMemoryLiveProviderTrial({
      id: 'trial-recall-timeout',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      turns: [{ turnId: 'turn-1', userText: '一', now: 1 }],
      db: {
        getWorkingMemoryCheckpoint: vi.fn(async () => null),
        retrieveLongTermMemoryEvidenceReadOnly: vi.fn(async () => await new Promise<never>(() => {})),
      },
      provider,
      perTurnTimeoutMs: 25,
      totalTimeoutMs: 200,
    })

    expect(Date.now() - startedAt).toBeLessThan(500)
    expect(report.passed).toBe(false)
    expect(report.summary.lastError).toContain('timed out')
    expect(provider).not.toHaveBeenCalled()
  }, 1000)
})
