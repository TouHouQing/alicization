import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-ltm-search-index-'))
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

describe('long-term memory search index', () => {
  it('paginates every long-term item beyond the legacy source fetch window', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const total = 450
      await db.upsertMemoryReflections(Array.from({ length: total }, (_, index) => ({
        id: `scale-reflection-${String(index + 1).padStart(3, '0')}`,
        cardId: 'default',
        sourceKind: 'reply' as const,
        targetScope: 'task' as const,
        summary: `长期索引分页记忆 ${index + 1}`,
        lesson: '分页必须来自数据库索引，不能只扩大内存窗口。',
        status: 'confirmed' as const,
        confidence: 0.8,
        createdAt: 10 + index,
        updatedAt: 10_000 - index,
      })))

      const ids: string[] = []
      let cursor: string | null = null
      do {
        const page = await db.listMemoryWorkbenchLongTermItems({
          cardId: 'default',
          limit: 25,
          cursor,
        })
        ids.push(...page.items.map(item => item.id))
        cursor = page.nextCursor
      } while (cursor)

      expect(ids).toHaveLength(total)
      expect(new Set(ids).size).toBe(total)
      expect(ids[0]).toBe('scale-reflection-001')
      expect(ids.at(-1)).toBe(`scale-reflection-${String(total).padStart(3, '0')}`)
    }
    finally {
      await db.close()
    }
  })

  it('searches and filters card-scoped indexed sources without leaking sibling card memory', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations')
    const cardA = await setupAlicizationDb(userDataPath, { rootDir, cardId: 'card-a' })
    try {
      await cardA.upsertMemoryFacts([{
        subject: '用户',
        predicate: '正在验证',
        object: '可扩展长期搜索目标',
        confidence: 0.9,
      }], 'rule')
      await cardA.upsertMemoryReflections([{
        id: 'card-a-reflection-target',
        cardId: 'card-a',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '可扩展长期搜索目标：反思命中。',
        lesson: 'Memory Workbench 必须用索引分页。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 30,
        updatedAt: 30,
      }])
      await cardA.appendEpisodicEvents([{
        id: 'card-a-episode-target',
        cardId: 'card-a',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 40,
        whatHappened: '可扩展长期搜索目标：事件命中。',
        confidence: 0.9,
        salience: 0.8,
      }])
      await cardA.upsertMemoryConsolidations([{
        id: 'card-a-consolidation-target',
        kind: 'daily',
        facet: null,
        periodKey: '2026-08-03',
        periodStartedAt: 1,
        periodEndedAt: 50,
        summary: '可扩展长期搜索目标：凝练命中。',
        lesson: '索引结果必须保留 source 筛选。',
        cues: ['可扩展长期搜索目标'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: ['card-a-episode-target'],
        updatedAt: 50,
      }])
      await cardA.tombstoneLongTermMemorySources({
        sourceIds: ['card-a-reflection-target'],
        reason: '用户删除反思目标',
      })
    }
    finally {
      await cardA.close()
    }

    const cardB = await setupAlicizationDb(userDataPath, { rootDir, cardId: 'card-b' })
    try {
      await cardB.upsertMemoryReflections([{
        id: 'card-b-reflection-target',
        cardId: 'card-b',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '可扩展长期搜索目标：另一张卡的反思。',
        lesson: '不能串到 card-a。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 60,
        updatedAt: 60,
      }])
    }
    finally {
      await cardB.close()
    }

    const cardARead = await setupAlicizationDb(userDataPath, { rootDir, cardId: 'card-a' })
    try {
      const all = await cardARead.listMemoryWorkbenchLongTermItems({
        cardId: 'card-a',
        query: '可扩展长期搜索目标',
        limit: 20,
      })
      expect(all.items.map(item => item.id)).not.toContain('card-a-reflection-target')
      expect(all.items.map(item => item.id)).not.toContain('card-b-reflection-target')
      expect(all.items.map(item => item.source)).toEqual(expect.arrayContaining([
        'memory_facts',
        'episodic_events',
        'memory_consolidations',
      ]))

      const episodes = await cardARead.listMemoryWorkbenchLongTermItems({
        cardId: 'card-a',
        query: '可扩展长期搜索目标',
        source: 'episodic_events',
        kind: 'episode',
        limit: 10,
      })
      expect(episodes.items.map(item => item.id)).toEqual(['card-a-episode-target'])
    }
    finally {
      await cardARead.close()
    }
  })

  it('keeps FTS search pagination stable when many documents share one query', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const total = 120
      await db.upsertMemoryReflections(Array.from({ length: total }, (_, index) => ({
        id: `search-reflection-${String(index + 1).padStart(3, '0')}`,
        cardId: 'default',
        sourceKind: 'reply' as const,
        targetScope: 'task' as const,
        summary: `语义召回分页目标 ${index + 1}`,
        lesson: '长期搜索应该允许继续翻页。',
        status: 'confirmed' as const,
        confidence: 0.8,
        createdAt: 20 + index,
        updatedAt: 20_000 - index,
      })))

      const ids: string[] = []
      let cursor: string | null = null
      do {
        const page = await db.listMemoryWorkbenchLongTermItems({
          cardId: 'default',
          query: '语义召回分页目标',
          limit: 17,
          cursor,
        })
        ids.push(...page.items.map(item => item.id))
        cursor = page.nextCursor
      } while (cursor)

      expect(ids).toHaveLength(total)
      expect(new Set(ids).size).toBe(total)
    }
    finally {
      await db.close()
    }
  })

  it('lets semantic recall return an indexed distant memory outside the lexical source window', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const embeddingProvider = {
      modelId: 'test-semantic-model',
      dimensions: 3,
      embedTexts: async (texts: string[]) => texts.map(text => ({
        text,
        vector: [1, 0, 0],
      })),
    }
    const db = await setupAlicizationDb(userDataPath, {
      cardId: 'card-semantic',
      embeddingProvider,
    })
    try {
      await db.upsertMemoryReflections([
        {
          id: 'distant-semantic-reflection',
          cardId: 'card-semantic',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '用户在另一个时空记录了若干不可见于当前词面的个人倾向。',
          lesson: '长期语义召回应能找回远期经验。',
          status: 'confirmed',
          confidence: 0.95,
          createdAt: 10,
          updatedAt: 10,
        },
        ...Array.from({ length: 24 }, (_, index) => ({
          id: `recent-decoy-reflection-${index + 1}`,
          cardId: 'card-semantic',
          sourceKind: 'maintenance' as const,
          targetScope: 'task' as const,
          summary: `近期维护记录 ${index + 1}`,
          lesson: '这条记录不包含查询语义。',
          status: 'confirmed' as const,
          confidence: 0.4,
          createdAt: 100 + index,
          updatedAt: 100 + index,
        })),
      ])
      const reindex = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'card-semantic',
        sourceIds: ['distant-semantic-reflection'],
        limit: 1,
      })
      expect(reindex.jobId).toBeTruthy()
      let status = reindex
      for (let attempt = 0; attempt < 20 && status.status !== 'completed'; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 5))
        status = await db.reindexMemoryWorkbenchEmbeddings({
          cardId: 'card-semantic',
          action: 'status',
          jobId: reindex.jobId!,
        })
      }
      expect(status.status).toBe('completed')

      const recalled = await db.retrieveLongTermMemoryEvidence({
        cardId: 'card-semantic',
        currentUserText: '你还记得我以前的旅行计划吗',
        limit: 4,
      })

      expect(recalled.evidence.map(item => item.candidate.id)).toContain('distant-semantic-reflection')
    }
    finally {
      await db.close()
    }
  })

  it('reindexes the canonical search document text and invalidates vectors after the source text changes', async () => {
    const embeddedTexts: string[] = []
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'card-canonical-embedding',
      embeddingProvider: {
        modelId: 'test-semantic-model',
        dimensions: 3,
        embedTexts: async (texts: string[]) => {
          embeddedTexts.push(...texts)
          return texts.map(text => ({
            text,
            vector: [1, 0, 0],
          }))
        },
      },
    })
    try {
      await db.upsertMemoryReflections([{
        id: 'canonical-reflection',
        cardId: 'card-canonical-embedding',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: '用户喜欢在周末散步。',
        lesson: '散步会让用户放松。',
        status: 'confirmed',
        confidence: 0.95,
        createdAt: 10,
        updatedAt: 10,
      }])

      const scheduled = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'card-canonical-embedding',
        sourceIds: ['canonical-reflection'],
      })
      expect(scheduled.jobId).toBeTruthy()
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const progress = await db.reindexMemoryWorkbenchEmbeddings({
          cardId: 'card-canonical-embedding',
          action: 'status',
          jobId: scheduled.jobId!,
        })
        if (progress.status === 'completed')
          break
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      expect(embeddedTexts).toContain('用户喜欢在周末散步。 散步会让用户放松。')

      await db.upsertMemoryReflections([{
        id: 'canonical-reflection',
        cardId: 'card-canonical-embedding',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: '用户现在更喜欢在周末游泳。',
        lesson: '游泳会让用户放松。',
        status: 'confirmed',
        confidence: 0.95,
        createdAt: 10,
        updatedAt: 20,
      }])

      const health = await db.getMemoryWorkbenchEmbeddingHealth({
        cardId: 'card-canonical-embedding',
      })
      expect(health.reindexRequired).toBe(true)
      expect(health.searchReady).toBe(false)
    }
    finally {
      await db.close()
    }
  })

  it('removes tombstoned vector orphans when the canonical search index is rebuilt', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'card-orphan-rebuild',
      embeddingProvider: {
        modelId: 'test-semantic-model',
        dimensions: 3,
        embedTexts: async (texts: string[]) => texts.map(text => ({
          text,
          vector: [1, 0, 0],
        })),
      },
    })
    try {
      await db.upsertMemoryReflections([{
        id: 'orphan-rebuild-reflection',
        cardId: 'card-orphan-rebuild',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: '这条记忆会被标记为删除。',
        lesson: '删除后不能继续占用向量空间。',
        status: 'confirmed',
        confidence: 0.95,
        createdAt: 10,
        updatedAt: 10,
      }])

      const scheduled = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'card-orphan-rebuild',
        sourceIds: ['orphan-rebuild-reflection'],
      })
      let progress = scheduled
      for (let attempt = 0; attempt < 20 && progress.status !== 'completed'; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 5))
        progress = await db.reindexMemoryWorkbenchEmbeddings({
          cardId: 'card-orphan-rebuild',
          action: 'status',
          jobId: scheduled.jobId!,
        })
      }
      expect(progress.status).toBe('completed')

      await db.tombstoneLongTermMemorySources({
        sourceIds: ['orphan-rebuild-reflection'],
        source: 'memory_reflections',
        reason: '测试向量孤儿清理',
      })
      await expect(db.getMemoryWorkbenchEmbeddingHealth({
        cardId: 'card-orphan-rebuild',
      })).resolves.toMatchObject({
        orphanedCount: 1,
        reindexRequired: true,
      })

      await db.rebuildLongTermMemorySearchIndex({
        cardId: 'card-orphan-rebuild',
      })

      await expect(db.getMemoryWorkbenchEmbeddingHealth({
        cardId: 'card-orphan-rebuild',
      })).resolves.toMatchObject({
        orphanedCount: 0,
        reindexRequired: false,
      })
    }
    finally {
      await db.close()
    }
  })
})
