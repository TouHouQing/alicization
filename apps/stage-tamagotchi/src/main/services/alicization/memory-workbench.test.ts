import type {
  AlicizationMemoryEmbeddingReindexResult,
  AlicizationMemorySemanticScaleJobResult,
  AlicizationPersonaCandidateWorkbenchItem,
} from '../../../shared/eventa'

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import {
  electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction,
  electronAlicizationMemoryWorkbenchListPersonaCandidates,
  electronAlicizationMemoryWorkbenchManageSemanticScaleJobs,
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

function executeRawSql(database: sqlite3.Database, sql: string) {
  return new Promise<void>((resolve, reject) => {
    database.exec(sql, (error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

function queryRawRows<T>(database: sqlite3.Database, sql: string) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, (error, rows) => {
      if (error)
        reject(error)
      else
        resolve(rows as T[])
    })
  })
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

describe('memory workbench projection', () => {
  it('deletes legacy global facts and makes new facts card-scoped', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations')
    await mkdir(rootDir, { recursive: true })
    const legacyDatabase = await openRawDatabase(join(rootDir, 'alicization.db'))
    await executeRawSql(legacyDatabase, `
      CREATE TABLE memory_facts (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        confidence REAL NOT NULL,
        source TEXT NOT NULL,
        dedupe_key TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO memory_facts VALUES (
        'legacy-fact',
        'user',
        'prefers',
        'the old global memory',
        0.9,
        'rule',
        'legacy-key',
        1,
        1
      );
      CREATE TABLE memory_consolidations (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        period_key TEXT NOT NULL,
        period_started_at INTEGER NOT NULL,
        period_ended_at INTEGER NOT NULL,
        summary TEXT NOT NULL,
        confidence REAL NOT NULL,
        dominant_provenance TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO memory_consolidations VALUES (
        'legacy-consolidation',
        'daily',
        'legacy-day',
        1,
        1,
        'legacy global consolidation',
        0.8,
        'rule',
        1
      );
    `)
    await closeRawDatabase(legacyDatabase)

    const cardA = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
    })
    try {
      expect(await cardA.listMemoryFacts()).toEqual([])
      expect(await cardA.listMemoryConsolidations(8)).toEqual([])

      await cardA.upsertMemoryFacts([{
        subject: 'user',
        predicate: 'prefers',
        object: 'card A only',
        confidence: 0.9,
      }], 'rule')
    }
    finally {
      await cardA.close()
    }

    const schemaDatabase = await openRawDatabase(join(rootDir, 'alicization.db'))
    try {
      const factColumns = await queryRawRows<{ name: string }>(schemaDatabase, 'PRAGMA table_info(memory_facts)')
      const consolidationColumns = await queryRawRows<{ name: string }>(schemaDatabase, 'PRAGMA table_info(memory_consolidations)')
      expect(factColumns.map(column => column.name)).toContain('card_id')
      expect(consolidationColumns.map(column => column.name)).toContain('card_id')
    }
    finally {
      await closeRawDatabase(schemaDatabase)
    }

    const cardB = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-b',
    })
    try {
      await cardB.upsertMemoryFacts([{
        subject: 'user',
        predicate: 'prefers',
        object: 'card B only',
        confidence: 0.9,
      }], 'rule')
    }
    finally {
      await cardB.close()
    }

    const cardARead = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
    })
    try {
      expect(await cardARead.retrieveMemoryFacts('prefers', 8))
        .toEqual([expect.objectContaining({ object: 'card A only' })])
    }
    finally {
      await cardARead.close()
    }

    const cardBRead = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-b',
    })
    try {
      expect(await cardBRead.retrieveMemoryFacts('prefers', 8))
        .toEqual([expect.objectContaining({ object: 'card B only' })])
    }
    finally {
      await cardBRead.close()
    }
  })

  it('rebuilds stale card-scoped fact and consolidation schemas instead of keeping incompatible constraints', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations')
    await mkdir(rootDir, { recursive: true })
    const staleDatabase = await openRawDatabase(join(rootDir, 'alicization.db'))
    await executeRawSql(staleDatabase, `
      CREATE TABLE memory_facts (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        confidence REAL NOT NULL,
        source TEXT NOT NULL,
        dedupe_key TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO memory_facts VALUES (
        'stale-fact',
        'card-a',
        'user',
        'prefers',
        'stale constrained memory',
        0.9,
        'rule',
        'stale-key',
        1,
        1
      );
      CREATE TABLE memory_consolidations (
        card_id TEXT NOT NULL,
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        facet TEXT,
        period_key TEXT NOT NULL,
        period_started_at INTEGER NOT NULL,
        period_ended_at INTEGER NOT NULL,
        summary TEXT NOT NULL,
        lesson TEXT,
        cues_json TEXT,
        confidence REAL NOT NULL,
        dominant_provenance TEXT NOT NULL,
        derived_event_ids_json TEXT,
        metadata_json TEXT,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO memory_consolidations VALUES (
        'card-a',
        'stale-consolidation',
        'daily',
        NULL,
        'stale-day',
        1,
        1,
        'stale constrained consolidation',
        NULL,
        NULL,
        0.8,
        'rule',
        NULL,
        NULL,
        1
      );
    `)
    await closeRawDatabase(staleDatabase)

    const db = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
    })
    try {
      expect(await db.listMemoryFacts()).toEqual([])
      expect(await db.listMemoryConsolidations(8)).toEqual([])

      await db.upsertMemoryFacts([{
        subject: 'user',
        predicate: 'prefers',
        object: 'fresh scoped memory',
        confidence: 0.9,
      }], 'rule')

      await db.upsertMemoryConsolidations([{
        id: 'fresh-consolidation',
        kind: 'daily',
        facet: null,
        periodKey: 'fresh-day',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'fresh scoped consolidation',
        lesson: null,
        cues: ['fresh scoped'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: [],
        updatedAt: 3,
      }])

      expect(await db.retrieveMemoryFacts('fresh scoped', 8))
        .toEqual([expect.objectContaining({ object: 'fresh scoped memory' })])
      expect(await db.listMemoryConsolidations(8))
        .toEqual([expect.objectContaining({ summary: 'fresh scoped consolidation' })])
    }
    finally {
      await db.close()
    }
  })

  it('keeps tombstoned long-term memory sources scoped to the active card', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations')

    const cardA = await setupAlicizationDb(userDataPath, { rootDir, cardId: 'card-a' })
    try {
      await cardA.importLegacyMemory({
        facts: [{
          id: 'shared-source-id',
          subject: 'user',
          predicate: 'prefers',
          object: 'shared scoped recall',
          confidence: 0.9,
          source: 'rule',
          dedupeKey: 'shared-source-key-a',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 0,
          provenance: 'remembered',
        }],
        archive: [],
        lastPrunedAt: null,
      })
      await cardA.tombstoneLongTermMemorySources({
        sourceIds: ['shared-source-id'],
        reason: 'card-a-only',
      })
    }
    finally {
      await cardA.close()
    }

    const cardB = await setupAlicizationDb(userDataPath, { rootDir, cardId: 'card-b' })
    try {
      await cardB.importLegacyMemory({
        facts: [{
          id: 'shared-source-id',
          subject: 'user',
          predicate: 'prefers',
          object: 'shared scoped recall',
          confidence: 0.9,
          source: 'rule',
          dedupeKey: 'shared-source-key-b',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 0,
          provenance: 'remembered',
        }],
        archive: [],
        lastPrunedAt: null,
      })
      const result = await cardB.listMemoryWorkbenchLongTermItems({
        cardId: 'card-b',
        query: 'shared scoped recall',
        limit: 8,
      })

      expect(result.items.map(item => item.id)).toContain('shared-source-id')
    }
    finally {
      await cardB.close()
    }
  })

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

  it('removes internal validation cues from user-visible WorkingMemory fields while preserving natural memory', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-visible-cues',
      now: 110,
    })
    snapshot.currentThread = {
      title: '请只回复：收到。',
      currentUserMove: '你认为你可以用 Codex 做什么？先只回答能力范围，不执行任何任务。',
      currentAliceMove: '你好，这是一次本地对话闭环验收，请自然地回复一句。',
      primaryAnchor: '用户正在询问如何继续调试项目',
      mode: 'dialogue',
      shouldHold: true,
      confidence: 0.9,
    }
    snapshot.activeTask = {
      summary: 'emotional_tension:calm-browse relationship:give-space',
      status: 'active',
      evidenceTurnIds: ['turn-visible-cues'],
    }
    snapshot.memoryQueryHints = [
      'reply_motive:answer',
      'belief-conflict:legacy-cue',
      '长期记忆：用户正在修复 Coding Agent 调用',
    ]

    const projected = projectWorkingMemoryForWorkbench(snapshot)

    expect(projected.threadTitle).toBeNull()
    expect(projected.currentUserMove).toBeNull()
    expect(projected.activeTask).toBeNull()
    expect(projected.queryHints).toEqual(['长期记忆：用户正在修复 Coding Agent 调用'])
    expect(JSON.stringify(projected)).not.toContain('emotional_tension:calm-browse')
    expect(JSON.stringify(projected)).not.toContain('belief-conflict:legacy-cue')
    expect(JSON.stringify(projected)).not.toContain('请只回复：收到。')
    expect(JSON.stringify(projected)).not.toContain('Codex 做什么')
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
        vectorSpaceId: null,
        reindexRequired: false,
        indexMode: 'brute-force',
        approximate: false,
        degraded: true,
        nativeIndexReady: false,
        searchReady: false,
        lastError: null,
        canonicalCount: 0,
        indexedCount: 0,
        missingCount: 0,
        textHashMismatchCount: 0,
        staleOrFailedCount: 0,
        orphanedCount: 0,
        coverageRatio: null,
        reindexJob: null,
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
        vectorSpaceId: null,
        reindexRequired: false,
        indexMode: 'brute-force',
        approximate: false,
        degraded: true,
        nativeIndexReady: false,
        searchReady: false,
        lastError: null,
        canonicalCount: 0,
        indexedCount: 0,
        missingCount: 0,
        textHashMismatchCount: 0,
        staleOrFailedCount: 0,
        orphanedCount: 0,
        coverageRatio: null,
        reindexJob: null,
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
        vectorSpaceId: 'legacy:local:3',
        reindexRequired: false,
        indexMode: 'brute-force',
        approximate: false,
        degraded: true,
        nativeIndexReady: false,
        searchReady: true,
        lastError: null,
        canonicalCount: 1,
        indexedCount: 1,
        missingCount: 0,
        textHashMismatchCount: 0,
        staleOrFailedCount: 0,
        orphanedCount: 0,
        coverageRatio: 1,
        reindexJob: null,
      }),
    })

    expect(result.health.status).toBe('degraded')
  })

  it('marks snapshot health degraded when queue health reports only dead-lettered work', async () => {
    const result = await buildMemoryWorkbenchSnapshot({
      cardId: 'default',
      sessionId: null,
      now: () => 351,
      getWorkingMemory: () => null,
      listLongTermItems: async () => [],
      listReviewItems: async () => [],
      getQueueHealth: async () => ({
        pending: 0,
        review: 0,
        applied: 0,
        failed: 0,
        deadLettered: 1,
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
        vectorSpaceId: 'legacy:local:3',
        reindexRequired: false,
        indexMode: 'sqlite-vec',
        approximate: false,
        degraded: false,
        nativeIndexReady: true,
        searchReady: true,
        lastError: null,
        canonicalCount: 1,
        indexedCount: 1,
        missingCount: 0,
        textHashMismatchCount: 0,
        staleOrFailedCount: 0,
        orphanedCount: 0,
        coverageRatio: 1,
        reindexJob: null,
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

  it('continues paginating long-term memory past the first source fetch window', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections(Array.from({ length: 10 }, (_, index) => ({
        id: `reflection-page-${index + 1}`,
        cardId: 'default',
        sourceKind: 'reply' as const,
        targetScope: 'task' as const,
        summary: `长期分页记忆 ${index + 1}`,
        lesson: '加载更多不能漏掉旧记忆。',
        status: 'confirmed' as const,
        confidence: 0.8,
        createdAt: 10 + index,
        updatedAt: 100 - index,
      })))

      const ids: string[] = []
      let cursor: string | null = null
      do {
        const page = await db.listMemoryWorkbenchLongTermItems({
          cardId: 'default',
          limit: 2,
          cursor,
        })
        ids.push(...page.items.map(item => item.id))
        cursor = page.nextCursor
      } while (cursor)

      expect(ids).toEqual(Array.from({ length: 10 }, (_, index) => `reflection-page-${index + 1}`))
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
      vectorSpaceId: 'legacy:local-embedding:3',
      errors: [],
      deadLetterItems: [],
    }
    const semanticScale: AlicizationMemorySemanticScaleJobResult = {
      job: null,
      jobs: [],
    }

    expect(candidate.allowTraining).toBe(false)
    expect(reindex.scheduled).toBe(1)
    expect(semanticScale.jobs).toEqual([])
    expect(electronAlicizationMemoryWorkbenchListPersonaCandidates).toBeTruthy()
    expect(electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction).toBeTruthy()
    expect(electronAlicizationMemoryWorkbenchManageSemanticScaleJobs).toBeTruthy()
    expect(electronAlicizationMemoryWorkbenchReindexEmbeddings).toBeTruthy()
  })
})
