import type {
  AlicizationMemoryEmbeddingReindexResult,
  AlicizationPersonaCandidateWorkbenchItem,
} from '../../../shared/eventa'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction,
  electronAlicizationMemoryWorkbenchListPersonaCandidates,
  electronAlicizationMemoryWorkbenchReindexEmbeddings,
} from '../../../shared/eventa'
import { setupAlicizationDb } from './db'
import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
import { buildMemoryWorkbenchSnapshot, projectWorkingMemoryForWorkbench } from './memory-workbench'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-memory-workbench-'))
  sandboxDirs.push(dir)
  return dir
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (!dir)
      continue
    await rm(dir, { recursive: true, force: true })
  }
})

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

  it('sanitizes fixed-template residue from visible WorkingMemory long-term queue items', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-template-queue',
      now: 120,
    })
    snapshot.longTermCandidates.push({
      kind: 'relationship',
      summary: 'pre_turn_context_digest',
      reason: 'structured continuity digest.',
      sourceTurnIds: ['turn-template-queue'],
      salience: 0.7,
      sensitivity: 'personal',
      confidence: 0.8,
      allowTraining: false,
    })

    const projected = projectWorkingMemoryForWorkbench(snapshot)

    expect(projected.longTermQueue[0]?.summary)
      .toBe('')
    expect(projected.longTermQueue[0]?.reason)
      .toBe('')
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

  it('marks snapshot health degraded when queue health reports failures', async () => {
    const result = await buildMemoryWorkbenchSnapshot({
      cardId: 'default',
      sessionId: null,
      now: () => 350,
      getWorkingMemory: () => null,
      listLongTermItems: async () => [],
      listReviewItems: async () => [],
      getQueueHealth: async () => ({
        pending: 0,
        review: 0,
        applied: 0,
        failed: 1,
        deadLettered: 0,
      }),
      getRecallHealth: async () => ({
        lastLatencyMs: null,
        p95LatencyMs: null,
        lastError: null,
      }),
      getEmbeddingHealth: async () => ({
        providerConfigured: true,
        modelId: 'local',
        dimensions: 3,
        reindexRequired: false,
      }),
    })

    expect(result.health.status).toBe('degraded')
  })

  it('returns a stable next cursor for long-term memory workbench list results', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'reflection-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'boundary',
          summary: '用户不要固定模板回复。',
          lesson: '透明说明失败，不要套模板。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 10,
          updatedAt: 30,
        },
        {
          id: 'reflection-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'relationship',
          summary: '用户喜欢自然回复。',
          lesson: '保持自然节奏。',
          status: 'confirmed',
          confidence: 0.88,
          createdAt: 10,
          updatedAt: 20,
        },
        {
          id: 'reflection-3',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '用户想打游戏放松。',
          lesson: '可以想起共同娱乐线程。',
          status: 'confirmed',
          confidence: 0.86,
          createdAt: 10,
          updatedAt: 10,
        },
      ])

      const first = await db.listMemoryWorkbenchLongTermItems({ cardId: 'default', limit: 2 })
      expect(first.items.map(item => item.id)).toEqual(['reflection-1', 'reflection-2'])
      expect(first.nextCursor).toBeTruthy()

      const second = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 2,
        cursor: first.nextCursor,
      })
      expect(second.items.map(item => item.id)).toEqual(['reflection-3'])
      expect(second.nextCursor).toBeNull()
    }
    finally {
      await db.close()
    }
  })

  it('searches older long-term reflections without being capped by the first recent page', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        ...Array.from({ length: 24 }, (_, index) => ({
          id: `recent-noise-${index}`,
          cardId: 'default',
          sourceKind: 'reply' as const,
          targetScope: 'task' as const,
          summary: `最近的普通记忆 ${index}`,
          lesson: '不应该遮住旧的相关记忆。',
          status: 'confirmed' as const,
          confidence: 0.7,
          createdAt: 100 + index,
          updatedAt: 100 + index,
        })),
        {
          id: 'old-scalable-search-target',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '可扩展长期搜索目标：用户要能找到旧的语义召回闭环规划。',
          lesson: '搜索不能只看最近一页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 1,
        },
      ])

      const result = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 5,
        query: '可扩展长期搜索目标',
      })

      expect(result.items.map(item => item.id)).toContain('old-scalable-search-target')
    }
    finally {
      await db.close()
    }
  })

  it('exposes productized memory workbench DTO contracts', () => {
    const candidate: AlicizationPersonaCandidateWorkbenchItem = {
      id: 'persona-candidate:reflection-1',
      sourceMemoryIds: ['reflection-1'],
      behaviorLesson: '不要用固定模板遮盖失败。',
      positiveExample: '我先直接说超时了，再继续接住当前问题。',
      negativeExample: '不要把失败包装成正常陪伴。',
      privacyClass: 'personal-redacted',
      status: 'candidate',
      allowTraining: false,
      rejectionReason: null,
      createdAt: 1,
      updatedAt: 1,
    }
    const reindex: AlicizationMemoryEmbeddingReindexResult = {
      scheduled: 1,
      indexed: 0,
      failed: 0,
      modelId: 'local-embedding',
      dimensions: 3,
      errors: [],
    }

    expect(candidate.allowTraining).toBe(false)
    expect(reindex.scheduled).toBe(1)
    expect(electronAlicizationMemoryWorkbenchListPersonaCandidates).toBeTruthy()
    expect(electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction).toBeTruthy()
    expect(electronAlicizationMemoryWorkbenchReindexEmbeddings).toBeTruthy()
  })
})
