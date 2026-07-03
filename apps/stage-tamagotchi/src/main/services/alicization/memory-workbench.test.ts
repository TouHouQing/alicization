import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
import { buildMemoryWorkbenchSnapshot, projectWorkingMemoryForWorkbench } from './memory-workbench'

describe('memory workbench projection', () => {
  it('projects WorkingMemory owner state without exposing prompt internals', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 100,
    })
    snapshot.memoryQueryHints.push('打游戏 上周')
    snapshot.userCorrections.push({
      text: '不要固定模板回复',
      sourceTurnId: 'turn-1',
      scope: 'persona',
    })

    const projected = projectWorkingMemoryForWorkbench(snapshot)

    expect(projected).toMatchObject({
      cardId: 'default',
      sessionId: 'session-1',
      updatedAt: 100,
      queryHints: ['打游戏 上周'],
      userCorrections: ['不要固定模板回复'],
    })
    expect(JSON.stringify(projected)).not.toContain('[ALICIZATION_WORKING_MEMORY_OWNER]')
  })

  it('builds a partial snapshot when long-term or review modules report errors', async () => {
    const result = await buildMemoryWorkbenchSnapshot({
      cardId: 'default',
      sessionId: null,
      now: () => 200,
      getWorkingMemory: () => null,
      listLongTermItems: async () => {
        throw new Error('long-term-list-failed')
      },
      listReviewItems: async () => [],
      getQueueHealth: async () => ({
        pending: 0,
        review: 0,
        applied: 0,
        failed: 0,
        deadLettered: 0,
      }),
      getRecallHealth: async () => ({
        lastLatencyMs: null,
        p95LatencyMs: null,
        lastError: null,
      }),
      getEmbeddingHealth: async () => ({
        providerConfigured: false,
        modelId: null,
        dimensions: null,
        reindexRequired: false,
      }),
    })

    expect(result.longTerm.items).toEqual([])
    expect(result.health.status).toBe('degraded')
    expect(result.health.errors).toContain('long-term-list-failed')
  })

  it('uses the provided WorkingMemory lookup before falling back to null', async () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-ui',
      now: 300,
    })

    const result = await buildMemoryWorkbenchSnapshot({
      cardId: 'default',
      sessionId: 'session-ui',
      now: () => 301,
      getWorkingMemory: () => snapshot,
      listLongTermItems: async () => [],
      listReviewItems: async () => [],
      getQueueHealth: async () => ({
        pending: 0,
        review: 0,
        applied: 0,
        failed: 0,
        deadLettered: 0,
      }),
      getRecallHealth: async () => ({
        lastLatencyMs: null,
        p95LatencyMs: null,
        lastError: null,
      }),
      getEmbeddingHealth: async () => ({
        providerConfigured: false,
        modelId: null,
        dimensions: null,
        reindexRequired: false,
      }),
    })

    expect(result.workingMemory?.sessionId).toBe('session-ui')
  })
})
