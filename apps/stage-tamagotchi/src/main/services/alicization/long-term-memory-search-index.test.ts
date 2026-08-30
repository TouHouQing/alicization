import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLongTermMemorySearchIndexRuntime } from './long-term-memory-search-index'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-ltm-search-index-'))
  sandboxDirs.push(dir)
  return dir
}

function openRawDatabase(filepath: string) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const database = new sqlite3.Database(filepath, (error) => {
      if (error)
        reject(error)
      else
        resolve(database)
    })
  })
}

function executeRawSql(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, (error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

function queryRawRows<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error)
        reject(error)
      else
        resolve(rows as T[])
    })
  })
}

function decodeOpaqueCursor(cursor: string | null) {
  if (!cursor)
    throw new Error('expected an opaque cursor')
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Record<string, unknown>
}

function closeRawDatabase(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close((error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
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
  it('serializes projection reads on one sqlite connection during an index transaction', async () => {
    let activeReads = 0
    let maxConcurrentReads = 0
    const runtime = createLongTermMemorySearchIndexRuntime({
      database: {} as sqlite3.Database,
      run: async () => ({ changes: 0 }),
      get: async () => undefined,
      all: async <T>(_database: sqlite3.Database, sql: string) => {
        if (!sql.trimStart().startsWith('SELECT * FROM'))
          return [] as T[]
        activeReads += 1
        maxConcurrentReads = Math.max(maxConcurrentReads, activeReads)
        await new Promise(resolve => setTimeout(resolve, 0))
        activeReads -= 1
        return [] as T[]
      },
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
    })

    await runtime.rebuildLongTermMemorySearchIndex({ cardId: 'default' })

    expect(maxConcurrentReads).toBe(1)
  })

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

  it('applies direct long-term memory governance without requiring a review queue item', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([{
        id: 'direct-governance-memory',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '直接治理长期记忆',
        lesson: '用户可以直接管理已经进入长期记忆的内容。',
        status: 'confirmed',
        confidence: 0.88,
        createdAt: 10,
        updatedAt: 20,
      }])

      const listedBefore = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 10,
      })
      const item = listedBefore.items.find(row => row.id === 'direct-governance-memory')
      expect(item).toBeTruthy()

      const inwardOnly = await db.applyMemoryWorkbenchLongTermAction({
        cardId: 'default',
        memoryItemId: item!.id,
        decision: 'inward-only',
        reason: 'user-set-inward-only',
      })
      expect(inwardOnly).toMatchObject({
        id: item!.id,
        visibility: 'inward-only',
        training: 'blocked',
      })

      const listedAfterPolicy = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 10,
      })
      expect(listedAfterPolicy.items.find(row => row.id === item!.id)).toMatchObject({
        id: item!.id,
        visibility: 'inward-only',
        training: 'blocked',
      })

      await db.applyMemoryWorkbenchLongTermAction({
        cardId: 'default',
        memoryItemId: item!.id,
        decision: 'tombstone',
        reason: 'user-forgot',
      })
      const listedAfterTombstone = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 10,
      })
      expect(listedAfterTombstone.items.map(row => row.id)).not.toContain(item!.id)
    }
    finally {
      await db.close()
    }
  })

  it('applies direct governance to the selected source when source ids overlap', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryFacts([{
        subject: '用户',
        predicate: '喜欢',
        object: '在事实来源里保留',
        confidence: 0.9,
      }], 'rule')
      const [fact] = await db.listMemoryFacts()
      expect(fact).toBeTruthy()
      await db.upsertMemoryReflections([{
        id: fact!.id,
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '反思来源里的重叠 ID',
        lesson: '操作必须绑定用户选中的来源。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 10,
        updatedAt: 20,
      }])

      const reflections = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        source: 'memory_reflections',
        limit: 10,
      })
      const reflection = reflections.items.find(item => item.id === fact!.id)
      expect(reflection).toBeTruthy()

      const updated = await db.applyMemoryWorkbenchLongTermAction({
        cardId: 'default',
        memoryItemId: reflection!.id,
        source: reflection!.source,
        decision: 'inward-only',
        reason: 'selected-reflection',
      })

      expect(updated).toMatchObject({
        id: fact!.id,
        source: 'memory_reflections',
        visibility: 'inward-only',
      })
      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        source: 'memory_facts',
        limit: 10,
      })).resolves.toMatchObject({
        items: [{
          id: fact!.id,
          source: 'memory_facts',
          visibility: 'explicit',
        }],
      })
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

  it('anchors recent pagination to the initial updated_at snapshot and accepts legacy cursors', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'recent-snapshot-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '普通分页快照第一条。',
          lesson: '先返回这一条。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 30,
        },
        {
          id: 'recent-snapshot-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '普通分页快照第二条。',
          lesson: '第二页应该保留这一条。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 20,
        },
        {
          id: 'recent-snapshot-3',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '普通分页快照第三条。',
          lesson: '第三条用于继续分页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 3,
          updatedAt: 10,
        },
      ])

      const firstPage = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 1,
      })
      expect(firstPage.items.map(item => item.id)).toEqual(['recent-snapshot-1'])
      expect(decodeOpaqueCursor(firstPage.nextCursor)).toMatchObject({
        version: 2,
        mode: 'recent',
        snapshotId: expect.any(String),
      })

      await db.upsertMemoryReflections([{
        id: 'recent-snapshot-new',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '普通分页快照期间新增。',
        lesson: '新增内容不应改变已经开始的分页。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 4,
        updatedAt: 40,
      }])

      const secondPage = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 1,
        cursor: firstPage.nextCursor,
      })
      expect(secondPage.items.map(item => item.id)).toEqual(['recent-snapshot-2'])
      expect(decodeOpaqueCursor(secondPage.nextCursor)).toMatchObject({
        version: 2,
        mode: 'recent',
        snapshotId: decodeOpaqueCursor(firstPage.nextCursor).snapshotId,
      })

      const legacyCursor = Buffer.from(JSON.stringify({
        version: 1,
        mode: 'recent',
        updatedAt: 30,
        documentId: 'ltm-doc:default:memory_reflections:recent-snapshot-1',
      }), 'utf8').toString('base64url')
      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 1,
        cursor: legacyCursor,
      })).resolves.toMatchObject({
        items: [{ id: 'recent-snapshot-2' }],
      })
    }
    finally {
      await db.close()
    }
  })

  it('keeps FTS pagination inside the initial updated_at snapshot after a newer match arrives', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'fts-snapshot-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '分页快照目标 分页快照目标 分页快照目标',
          lesson: 'FTS 第一页结果。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 30,
        },
        {
          id: 'fts-snapshot-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '分页快照目标',
          lesson: 'FTS 第二页结果。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 20,
        },
      ])

      const firstPage = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '分页快照目标',
        limit: 1,
      })
      expect(firstPage.items.map(item => item.id)).toEqual(['fts-snapshot-1'])
      expect(decodeOpaqueCursor(firstPage.nextCursor)).toMatchObject({
        version: 2,
        mode: 'search',
        snapshotId: expect.any(String),
      })

      await db.upsertMemoryReflections([{
        id: 'fts-snapshot-new',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '分页快照目标',
        lesson: 'FTS 分页期间新增的匹配结果。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 3,
        updatedAt: 40,
      }])

      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '分页快照目标',
        limit: 1,
        cursor: firstPage.nextCursor,
      })).resolves.toMatchObject({
        items: [{ id: 'fts-snapshot-2' }],
      })
    }
    finally {
      await db.close()
    }
  })

  it('carries the initial updated_at snapshot through short-query pagination', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'short-snapshot-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '短查询快照第一条，记得猫。',
          lesson: '短查询第一页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 30,
        },
        {
          id: 'short-snapshot-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '短查询快照第二条，也记得猫。',
          lesson: '短查询第二页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 20,
        },
      ])

      const firstPage = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '猫',
        limit: 1,
      })
      expect(firstPage.items.map(item => item.id)).toEqual(['short-snapshot-1'])
      expect(decodeOpaqueCursor(firstPage.nextCursor)).toMatchObject({
        version: 2,
        mode: 'recent',
        snapshotId: expect.any(String),
      })

      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '猫',
        limit: 1,
        cursor: firstPage.nextCursor,
      })).resolves.toMatchObject({
        items: [{ id: 'short-snapshot-2' }],
      })
    }
    finally {
      await db.close()
    }
  })

  it('anchors tombstone pagination to the initial deleted_at snapshot and accepts legacy cursors', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'tombstone-snapshot-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '回收站快照第一条。',
          lesson: '较早进入回收站。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 10,
        },
        {
          id: 'tombstone-snapshot-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '回收站快照第二条。',
          lesson: '较晚进入回收站。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 20,
        },
      ])

      await db.tombstoneLongTermMemorySources({
        sourceIds: ['tombstone-snapshot-1'],
        source: 'memory_reflections',
        reason: '较早删除',
      })
      await new Promise(resolve => setTimeout(resolve, 2))
      await db.tombstoneLongTermMemorySources({
        sourceIds: ['tombstone-snapshot-2'],
        source: 'memory_reflections',
        reason: '较晚删除',
      })

      const firstPage = await db.listMemoryWorkbenchTombstones({
        cardId: 'default',
        limit: 1,
      })
      expect(firstPage.items.map(item => item.sourceId)).toEqual(['tombstone-snapshot-2'])
      expect(decodeOpaqueCursor(firstPage.nextCursor)).toMatchObject({
        version: 2,
        mode: 'tombstones',
        snapshotId: expect.any(String),
      })

      const legacyCursor = Buffer.from(JSON.stringify({
        version: 1,
        mode: 'tombstones',
        deletedAt: firstPage.items[0]!.deletedAt,
        tombstoneId: firstPage.items[0]!.id,
      }), 'utf8').toString('base64url')
      await expect(db.listMemoryWorkbenchTombstones({
        cardId: 'default',
        limit: 1,
        cursor: legacyCursor,
      })).resolves.toMatchObject({
        items: [{ sourceId: 'tombstone-snapshot-1' }],
      })
    }
    finally {
      await db.close()
    }
  })

  it('freezes recent pagination when a same-timestamp document is inserted after the first page', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'recent-strict-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '严格快照普通分页第一条。',
          lesson: '第一页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 30,
        },
        {
          id: 'recent-strict-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '严格快照普通分页第二条。',
          lesson: '第二页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 20,
        },
      ])

      const firstPage = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 1,
      })
      expect(firstPage.items.map(item => item.id)).toEqual(['recent-strict-1'])

      await db.upsertMemoryReflections([{
        id: 'recent-strict-inserted',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '分页开始后使用旧时间戳插入。',
        lesson: '不能混入已有快照。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 3,
        updatedAt: 25,
      }])

      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 10,
        cursor: firstPage.nextCursor,
      })).resolves.toMatchObject({
        items: [{ id: 'recent-strict-2' }],
        nextCursor: null,
      })
    }
    finally {
      await db.close()
    }
  })

  it('freezes FTS membership and rank when a matching document is inserted after the first page', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'fts-strict-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '严格语义分页目标 严格语义分页目标',
          lesson: '第一页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 30,
        },
        {
          id: 'fts-strict-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '严格语义分页目标',
          lesson: '第二页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 20,
        },
      ])

      const firstPage = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '严格语义分页目标',
        limit: 1,
      })
      expect(firstPage.items.map(item => item.id)).toEqual(['fts-strict-1'])

      await db.upsertMemoryReflections([{
        id: 'fts-strict-inserted',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '严格语义分页目标 严格语义分页目标 严格语义分页目标',
        lesson: '新匹配不能改变旧快照的集合或排序。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 3,
        updatedAt: 25,
      }])

      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '严格语义分页目标',
        limit: 10,
        cursor: firstPage.nextCursor,
      })).resolves.toMatchObject({
        items: [{ id: 'fts-strict-2' }],
        nextCursor: null,
      })
    }
    finally {
      await db.close()
    }
  })

  it('freezes tombstone pagination when an older deletion timestamp is inserted after the first page', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const db = await setupAlicizationDb(userDataPath)
    try {
      await db.upsertMemoryReflections([
        {
          id: 'tombstone-strict-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '严格回收站第一条。',
          lesson: '第一条。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 10,
        },
        {
          id: 'tombstone-strict-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '严格回收站第二条。',
          lesson: '第二条。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 20,
        },
      ])
      await db.tombstoneLongTermMemorySources({
        sourceIds: ['tombstone-strict-1'],
        source: 'memory_reflections',
        reason: '第一条删除',
      })
      await new Promise(resolve => setTimeout(resolve, 2))
      await db.tombstoneLongTermMemorySources({
        sourceIds: ['tombstone-strict-2'],
        source: 'memory_reflections',
        reason: '第二条删除',
      })

      const firstPage = await db.listMemoryWorkbenchTombstones({
        cardId: 'default',
        limit: 1,
      })
      expect(firstPage.items.map(item => item.sourceId)).toEqual(['tombstone-strict-2'])

      const rawDatabase = await openRawDatabase(join(userDataPath, 'alicizations', 'alicization.db'))
      try {
        await executeRawSql(
          rawDatabase,
          `
          INSERT INTO long_term_memory_tombstones (
            id, card_id, source_id, source, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            'tombstone-strict-inserted',
            'default',
            'tombstone-strict-inserted-source',
            'memory_reflections',
            '分页期间补写旧删除记录',
            firstPage.items[0]!.deletedAt - 1,
          ],
        )
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await expect(db.listMemoryWorkbenchTombstones({
        cardId: 'default',
        limit: 10,
        cursor: firstPage.nextCursor,
      })).resolves.toMatchObject({
        items: [{ sourceId: 'tombstone-strict-1' }],
        nextCursor: null,
      })
    }
    finally {
      await db.close()
    }
  })

  it('deletes frozen pagination snapshots when conversation data is cleared', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const db = await setupAlicizationDb(userDataPath)
    try {
      await db.upsertMemoryReflections([
        {
          id: 'snapshot-clear-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '清理快照第一页。',
          lesson: '触发长期记忆分页快照。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 20,
        },
        {
          id: 'snapshot-clear-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '清理快照第二页。',
          lesson: '确保产生 next cursor。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 10,
        },
      ])
      const page = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 1,
      })
      expect(page.nextCursor).toBeTruthy()

      await db.clearConversationData()

      const rawDatabase = await openRawDatabase(join(userDataPath, 'alicizations', 'alicization.db'))
      try {
        const [snapshots] = await queryRawRows<{ count: number }>(
          rawDatabase,
          'SELECT COUNT(*) AS count FROM long_term_memory_search_snapshots',
        )
        const [items] = await queryRawRows<{ count: number }>(
          rawDatabase,
          'SELECT COUNT(*) AS count FROM long_term_memory_search_snapshot_items',
        )
        expect(snapshots?.count).toBe(0)
        expect(items?.count).toBe(0)
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }
    }
    finally {
      await db.close()
    }
  })

  it('rejects a frozen cursor when the query or filter no longer matches its snapshot', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'snapshot-request-1',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '快照请求绑定目标。',
          lesson: '第一页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 20,
        },
        {
          id: 'snapshot-request-2',
          cardId: 'default',
          sourceKind: 'reply',
          targetScope: 'task',
          summary: '快照请求绑定目标。',
          lesson: '第二页。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 10,
        },
      ])
      const page = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        limit: 1,
      })
      expect(page.nextCursor).toBeTruthy()

      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '快照请求绑定目标',
        limit: 1,
        cursor: page.nextCursor,
      })).rejects.toThrow('pagination snapshot does not match')

      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        kind: 'fact',
        limit: 1,
        cursor: page.nextCursor,
      })).rejects.toThrow('pagination snapshot does not match')
    }
    finally {
      await db.close()
    }
  })

  it.each(['猫', '妈妈', '长期', '陪伴'])('searches short Chinese queries without relying on a three-character trigram', async (query) => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([{
        id: `short-query-${query}`,
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'relationship',
        summary: `她记得用户说过${query}。`,
        lesson: '短中文查询也必须能找到长期记忆。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 10,
        updatedAt: 20,
      }])

      const page = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query,
        limit: 10,
      })

      expect(page.items.map(item => item.id)).toContain(`short-query-${query}`)
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
      vectorSpaceId: 'test-semantic-model:3',
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
        vectorSpaceId: 'test-semantic-model:3',
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

      let health = await db.getMemoryWorkbenchEmbeddingHealth({
        cardId: 'card-canonical-embedding',
      })
      for (let attempt = 0; attempt < 40 && health.reindexRequired; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 5))
        health = await db.getMemoryWorkbenchEmbeddingHealth({
          cardId: 'card-canonical-embedding',
        })
      }
      expect(embeddedTexts).toContain('用户现在更喜欢在周末游泳。 游泳会让用户放松。')
      expect(health.reindexRequired).toBe(false)
      expect(health.searchReady).toBe(true)
    }
    finally {
      await db.close()
    }
  })

  it('updates only the changed projection and replaces its FTS row', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'card-incremental-projection',
    })
    const rawDatabase = await openRawDatabase(db.dbPath)
    try {
      await db.upsertMemoryReflections([
        {
          id: 'projection-a',
          cardId: 'card-incremental-projection',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '第一条长期记忆。',
          lesson: '只更新这一条。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 10,
          updatedAt: 10,
        },
        {
          id: 'projection-b',
          cardId: 'card-incremental-projection',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '第二条长期记忆。',
          lesson: '不应被重建。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 11,
          updatedAt: 11,
        },
      ])
      const [before] = await queryRawRows<{ rowid: number }>(
        rawDatabase,
        `SELECT rowid
         FROM long_term_memory_search_documents
         WHERE card_id = ? AND source = 'memory_reflections' AND source_id = ?`,
        ['card-incremental-projection', 'projection-b'],
      )

      await db.upsertMemoryReflections([{
        id: 'projection-a',
        cardId: 'card-incremental-projection',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: '第一条长期记忆已更新。',
        lesson: '只替换目标 projection。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 10,
        updatedAt: 20,
      }])

      const [after] = await queryRawRows<{ rowid: number }>(
        rawDatabase,
        `SELECT rowid
         FROM long_term_memory_search_documents
         WHERE card_id = ? AND source = 'memory_reflections' AND source_id = ?`,
        ['card-incremental-projection', 'projection-b'],
      )
      const ftsRows = await queryRawRows<{ count: number }>(
        rawDatabase,
        `SELECT COUNT(*) AS count
         FROM long_term_memory_search_documents_fts
         WHERE card_id = ? AND source = 'memory_reflections' AND source_id = ?`,
        ['card-incremental-projection', 'projection-a'],
      )

      expect(after?.rowid).toBe(before?.rowid)
      expect(ftsRows[0]?.count).toBe(1)
    }
    finally {
      await closeRawDatabase(rawDatabase)
      await db.close()
    }
  })

  it('refreshes a stale search projection before starting a user-triggered embedding reindex', async () => {
    const embeddedTexts: string[] = []
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'card-reindex-projection',
      embeddingProvider: {
        modelId: 'test-semantic-model',
        dimensions: 3,
        vectorSpaceId: 'test-semantic-model:3',
        embedTexts: async (texts: string[]) => {
          embeddedTexts.push(...texts)
          return texts.map(text => ({
            text,
            vector: [1, 0, 0],
          }))
        },
      },
    })
    let rawDatabase: sqlite3.Database | null = null
    try {
      await db.upsertMemoryReflections([{
        id: 'reindex-projection-reflection',
        cardId: 'card-reindex-projection',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: '用户喜欢在周末散步。',
        lesson: '散步会让用户放松。',
        status: 'confirmed',
        confidence: 0.95,
        createdAt: 10,
        updatedAt: 10,
      }])

      rawDatabase = await openRawDatabase(db.dbPath)
      await executeRawSql(
        rawDatabase,
        `
        UPDATE memory_reflections
        SET summary = ?, lesson = ?, updated_at = ?
        WHERE card_id = ? AND id = ?
        `,
        [
          '用户现在更喜欢在周末游泳。',
          '游泳会让用户放松。',
          20,
          'card-reindex-projection',
          'reindex-projection-reflection',
        ],
      )
      await closeRawDatabase(rawDatabase)
      rawDatabase = null

      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'card-reindex-projection',
        source: 'memory_reflections',
        limit: 10,
      })).resolves.toMatchObject({
        items: [{
          id: 'reindex-projection-reflection',
          summary: expect.stringContaining('用户喜欢在周末散步。'),
        }],
      })

      const scheduled = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'card-reindex-projection',
      })
      expect(scheduled.errors).toEqual([])
      expect(scheduled.jobId).toBeTruthy()

      let progress = scheduled
      for (let attempt = 0; attempt < 100 && progress.status !== 'completed'; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 5))
        progress = await db.reindexMemoryWorkbenchEmbeddings({
          cardId: 'card-reindex-projection',
          action: 'status',
          jobId: scheduled.jobId!,
        })
      }
      expect(progress.status).toBe('completed')

      expect(embeddedTexts).toContain('用户现在更喜欢在周末游泳。 游泳会让用户放松。')
      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'card-reindex-projection',
        source: 'memory_reflections',
        limit: 10,
      })).resolves.toMatchObject({
        items: [{
          id: 'reindex-projection-reflection',
          summary: expect.stringContaining('用户现在更喜欢在周末游泳。'),
        }],
      })
    }
    finally {
      if (rawDatabase)
        await closeRawDatabase(rawDatabase)
      await db.close()
    }
  })

  it('removes tombstoned vectors immediately and keeps the rebuilt index clean', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'card-orphan-rebuild',
      embeddingProvider: {
        modelId: 'test-semantic-model',
        dimensions: 3,
        vectorSpaceId: 'test-semantic-model:3',
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
        orphanedCount: 0,
        reindexRequired: false,
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

  it('paginates tombstoned memories and restores search, embedding, and audit state', async () => {
    const embeddedTexts: string[] = []
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'card-memory-trash',
      embeddingProvider: {
        modelId: 'trash-restore-model',
        dimensions: 3,
        vectorSpaceId: 'trash-restore-model:3',
        embedTexts: async (texts: string[]) => {
          embeddedTexts.push(...texts)
          return texts.map(text => ({
            text,
            vector: [1, 0, 0],
          }))
        },
      },
    })
    const listTombstones = (db as unknown as {
      listMemoryWorkbenchTombstones?: (input: {
        cardId: string
        limit?: number
        cursor?: string | null
      }) => Promise<{
        items: Array<{
          id: string
          sourceId: string
          source: string
          reason: string | null
          deletedAt: number
          memory: { id: string, summary: string } | null
        }>
        nextCursor: string | null
      }>
    }).listMemoryWorkbenchTombstones
    const restoreTombstone = (db as unknown as {
      restoreMemoryWorkbenchTombstone?: (input: {
        cardId: string
        tombstoneId: string
      }) => Promise<{
        restored: boolean
        item: { id: string } | null
        reindexJobId: string | null
      }>
    }).restoreMemoryWorkbenchTombstone
    expect(listTombstones).toBeTypeOf('function')
    expect(restoreTombstone).toBeTypeOf('function')
    if (!listTombstones || !restoreTombstone) {
      await db.close()
      return
    }

    try {
      await db.upsertMemoryReflections([
        {
          id: 'trash-reflection-newer',
          cardId: 'card-memory-trash',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '用户周末喜欢散步。',
          lesson: '恢复后应重新进入长期搜索和向量召回。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 10,
          updatedAt: 20,
        },
        {
          id: 'trash-reflection-older',
          cardId: 'card-memory-trash',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '用户晚上喜欢听轻音乐。',
          lesson: '回收站必须支持真实分页。',
          status: 'confirmed',
          confidence: 0.88,
          createdAt: 5,
          updatedAt: 10,
        },
      ])

      await db.tombstoneLongTermMemorySources({
        sourceIds: ['trash-reflection-older'],
        source: 'memory_reflections',
        reason: '较早删除',
      })
      await new Promise(resolve => setTimeout(resolve, 2))
      await db.tombstoneLongTermMemorySources({
        sourceIds: ['trash-reflection-newer'],
        source: 'memory_reflections',
        reason: '误删除',
      })

      const firstPage = await listTombstones.call(db, {
        cardId: 'card-memory-trash',
        limit: 1,
      })
      expect(firstPage.items).toEqual([expect.objectContaining({
        sourceId: 'trash-reflection-newer',
        source: 'memory_reflections',
        reason: '误删除',
        memory: expect.objectContaining({
          id: 'trash-reflection-newer',
          summary: expect.stringContaining('用户周末喜欢散步。'),
        }),
      })])
      expect(firstPage.nextCursor).toBeTruthy()

      const secondPage = await listTombstones.call(db, {
        cardId: 'card-memory-trash',
        limit: 1,
        cursor: firstPage.nextCursor,
      })
      expect(secondPage.items.map(item => item.sourceId)).toEqual(['trash-reflection-older'])

      const restored = await restoreTombstone.call(db, {
        cardId: 'card-memory-trash',
        tombstoneId: firstPage.items[0]!.id,
      })
      expect(restored).toMatchObject({
        restored: true,
        item: {
          id: 'trash-reflection-newer',
        },
      })
      expect(restored.reindexJobId).toBeTruthy()

      await expect(db.listMemoryWorkbenchLongTermItems({
        cardId: 'card-memory-trash',
        query: '周末',
        limit: 5,
      })).resolves.toMatchObject({
        items: [expect.objectContaining({
          id: 'trash-reflection-newer',
        })],
      })
      await expect(listTombstones.call(db, {
        cardId: 'card-memory-trash',
        limit: 10,
      })).resolves.toMatchObject({
        items: [expect.not.objectContaining({
          sourceId: 'trash-reflection-newer',
        })],
      })

      let progress = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'card-memory-trash',
        action: 'status',
        jobId: restored.reindexJobId!,
      })
      for (let attempt = 0; attempt < 40 && progress.status !== 'completed'; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 5))
        progress = await db.reindexMemoryWorkbenchEmbeddings({
          cardId: 'card-memory-trash',
          action: 'status',
          jobId: restored.reindexJobId!,
        })
      }
      expect(progress.status).toBe('completed')
      expect(embeddedTexts).toContain('用户周末喜欢散步。 恢复后应重新进入长期搜索和向量召回。')

      const rawDatabase = await openRawDatabase(db.dbPath)
      try {
        const auditRows = await queryRawRows<{ action: string, payload_json: string }>(
          rawDatabase,
          `SELECT action, payload_json
           FROM audit_logs
           WHERE action = 'long-term-memory-restored'
           ORDER BY created_at DESC`,
        )
        expect(auditRows[0]).toMatchObject({
          action: 'long-term-memory-restored',
          payload_json: expect.stringContaining('trash-reflection-newer'),
        })
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }
    }
    finally {
      await db.close()
    }
  })

  it('matches natural Chinese preference questions against the indexed fact text', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryFacts([{
        subject: 'user',
        predicate: 'prefers',
        object: '用户喜欢琥珀色。',
        confidence: 0.94,
        memoryDomain: 'relationship',
        validationStatus: 'provisional',
      }], 'rule')

      const page = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '我刚才说我喜欢什么颜色？',
        source: 'memory_facts',
        limit: 8,
      })

      expect(page.items).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'memory_facts',
          summary: expect.stringContaining('琥珀色'),
        }),
      ]))
    }
    finally {
      await db.close()
    }
  })

  it('keeps fact source labels in database governance only, outside search and embedding text', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryFacts([{
        subject: 'user',
        predicate: 'prefers',
        object: '用户喜欢琥珀色。',
        confidence: 0.94,
        memoryDomain: 'relationship',
        validationStatus: 'provisional',
        sourceLabel: 'working-memory-owner:cleaned:queue-1',
      }], 'rule')

      const [fact] = await db.listMemoryFacts()
      expect(fact?.sourceLabel).toBe('working-memory-owner:cleaned:queue-1')

      const rawDatabase = await openRawDatabase(db.dbPath)
      try {
        const rows = await queryRawRows<{
          evidence_snippets_json: string
          search_text: string
          embedding_text: string
        }>(
          rawDatabase,
          `SELECT evidence_snippets_json, search_text, embedding_text
           FROM long_term_memory_search_documents
           WHERE source = 'memory_facts'
           LIMIT 1`,
        )

        expect(rows).toHaveLength(1)
        expect(rows[0]?.evidence_snippets_json).not.toContain('working-memory-owner:cleaned:queue-1')
        expect(rows[0]?.search_text).not.toContain('working-memory-owner:cleaned:queue-1')
        expect(rows[0]?.embedding_text).not.toContain('working-memory-owner:cleaned:queue-1')
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }
    }
    finally {
      await db.close()
    }
  })
})
