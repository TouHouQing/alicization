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
})
