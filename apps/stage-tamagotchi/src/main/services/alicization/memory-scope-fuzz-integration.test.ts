import type { MemoryScopeFuzzRecord } from './memory-scope-fuzz-harness'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'
import { createSqliteVecLongTermMemoryVectorBackend } from './long-term-memory-sqlite-vec-backend'
import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import {

  runMemoryScopeFuzzHarness,
} from './memory-scope-fuzz-harness'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-memory-scope-fuzz-'))
  sandboxDirs.push(dir)
  return dir
}

function run(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, error => error ? reject(error) : resolve())
  })
}

function get<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    database.get(sql, params, (error, row) => error ? reject(error) : resolve(row as T | undefined))
  })
}

function all<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => error ? reject(error) : resolve((rows ?? []) as T[]))
  })
}

function close(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close(error => error ? reject(error) : resolve())
  })
}

function scopeRecord(input: {
  id: string
  cardId: string
  userId: string
  sourceId: string
}): MemoryScopeFuzzRecord {
  return input
}

function deterministicVector(seed: string) {
  const first = seed.charCodeAt(0) % 17 + 1
  return [first, first / 2, 1]
}

const vectorSpaceId = 'scope-model:3'

async function createVectorScopeAdapter() {
  const database = new sqlite3.Database(':memory:')
  await run(database, `
    CREATE TABLE long_term_memory_search_documents (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      text_hash TEXT NOT NULL,
      tombstoned INTEGER NOT NULL DEFAULT 0
    )
  `)
  let writeQueue = Promise.resolve<unknown>(undefined)
  const enqueueWrite = async <T>(task: () => Promise<T>) => {
    const next = writeQueue.then(task, task)
    writeQueue = next.then(() => undefined, () => undefined)
    return await next
  }
  const adapter = createLongTermMemoryVectorIndexAdapter({
    store: createPersistentLongTermMemoryVectorStore({
      database,
      now: () => 1,
      run,
      all,
      enqueueWrite,
    }),
    native: createSqliteVecLongTermMemoryVectorBackend({
      database,
      now: () => 1,
      run,
      get,
      all,
      enqueueWrite,
    }),
  })
  await adapter.initialize()
  return {
    adapter,
    close: async () => await close(database),
    prepareCanonical: async (input: {
      cardId: string
      source: string
      sourceId: string
      text: string
    }) => {
      await run(database, `
        INSERT OR REPLACE INTO long_term_memory_search_documents (
          id, card_id, source, source_id, text_hash, tombstoned
        ) VALUES (?, ?, ?, ?, ?, 0)
      `, [
        `doc:${input.cardId}:${input.source}:${input.sourceId}`,
        input.cardId,
        input.source,
        input.sourceId,
        hashLongTermMemoryEmbeddingText(input.text),
      ])
    },
  }
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (dir)
      await rm(dir, { recursive: true, force: true })
  }
})

describe('memory scope fuzz production integration', () => {
  it('can run against real DB facades and the sqlite-vec adapter without target misses or cross-scope leaks', async () => {
    const cardId = 'scope-card'
    const userId = 'scope-user'
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), { cardId })
    const vector = await createVectorScopeAdapter()
    try {
      const report = await runMemoryScopeFuzzHarness({
        seed: 'production-smoke',
        caseCount: 1,
        cardId,
        userId,
        views: {
          memory_facts: async ({ query }) => {
            await db.upsertMemoryFacts([{
              subject: query.sourceId,
              predicate: 'belongs-to',
              object: query.userId,
              confidence: 0.95,
              sourceLabel: query.sourceId,
              validationStatus: 'validated',
            }], 'rule')
            return (await db.listMemoryFacts())
              .filter(fact => fact.subject === query.sourceId && fact.object === query.userId)
              .map(fact => scopeRecord({
                id: String(fact.id || `fact:${query.sourceId}`),
                cardId: query.cardId,
                userId: query.userId,
                sourceId: query.sourceId,
              }))
          },
          memory_consolidations: async ({ query }) => {
            await db.appendEpisodicEvents([{
              id: `episode-${query.sourceId}`,
              cardId: query.cardId,
              sessionId: `session-${query.sourceId}`,
              sourceKind: 'dialogue-feedback',
              provenance: 'remembered',
              occurredAt: 10,
              threadAnchor: query.sourceId,
              whatHappened: `scope consolidation target ${query.sourceId}`,
              felt: 'careful',
              emotionTags: ['scope'],
              whatChanged: `scope changed ${query.sourceId}`,
              relationshipMeaning: `scope relation ${query.sourceId}`,
              lesson: `scope lesson ${query.sourceId}`,
              sourceSummary: query.sourceId,
              confidence: 0.92,
              salience: 0.9,
              sceneAttachment: 0.5,
              consolidationPriority: 1,
              tags: [query.sourceId],
            }])
            const listed = await db.listMemoryWorkbenchLongTermItems({
              cardId: query.cardId,
              kind: 'consolidation',
              query: query.sourceId,
              limit: 8,
            })
            return listed.items
              .filter(item => item.summary.includes(query.sourceId) || item.evidenceSnippets.some(snippet => snippet.includes(query.sourceId)))
              .map(item => scopeRecord({
                id: item.id,
                cardId: query.cardId,
                userId: query.userId,
                sourceId: query.sourceId,
              }))
          },
          search_documents: async ({ query }) => {
            const listed = await db.listMemoryWorkbenchLongTermItems({
              cardId: query.cardId,
              query: query.sourceId,
              limit: 8,
            })
            return listed.items
              .filter(item => item.summary.includes(query.sourceId) || item.evidenceSnippets.some(snippet => snippet.includes(query.sourceId)))
              .map(item => scopeRecord({
                id: item.id,
                cardId: query.cardId,
                userId: query.userId,
                sourceId: query.sourceId,
              }))
          },
          vectors: async ({ query }) => {
            const source = 'memory_reflections'
            const text = `vector target ${query.sourceId}`
            await vector.prepareCanonical({
              cardId: query.cardId,
              source,
              sourceId: query.sourceId,
              text,
            })
            await vector.prepareCanonical({
              cardId: `${query.cardId}-foreign`,
              source,
              sourceId: query.sourceId,
              text,
            })
            await vector.adapter.upsert([
              {
                id: `vector:${query.cardId}:${query.sourceId}`,
                cardId: query.cardId,
                sourceId: query.sourceId,
                source,
                text,
                vector: deterministicVector(query.sourceId),
                modelId: 'scope-model',
                dimensions: 3,
                vectorSpaceId,
                updatedAt: 10,
                metadata: {},
              },
              {
                id: `vector:${query.cardId}-foreign:${query.sourceId}`,
                cardId: `${query.cardId}-foreign`,
                sourceId: query.sourceId,
                source,
                text,
                vector: deterministicVector(query.sourceId),
                modelId: 'scope-model',
                dimensions: 3,
                vectorSpaceId,
                updatedAt: 10,
                metadata: {},
              },
            ])
            const found = await vector.adapter.search({
              queryVector: deterministicVector(query.sourceId),
              cardId: query.cardId,
              modelId: 'scope-model',
              dimensions: 3,
              vectorSpaceId,
              limit: 4,
            })
            return found.map(result => scopeRecord({
              id: result.record.id,
              cardId: query.cardId,
              userId: query.userId,
              sourceId: result.record.sourceId,
            }))
          },
          review_queue: async ({ query }) => {
            await db.enqueueWorkingMemoryLongTermQueueItems({
              cardId: query.cardId,
              sessionId: `session-review-${query.sourceId}`,
              items: [{
                id: query.sourceId,
                source: 'working-memory-owner',
                memoryEvidence: {
                  version: 'working-memory-long-term-evidence-v1',
                  source: 'explicit-structured-memory-evidence',
                  kind: 'correction',
                  summary: `scope review target ${query.sourceId}`,
                  reason: 'Scope fuzz review target.',
                  evidenceSnippets: [`scope review target ${query.sourceId}`],
                  salience: 0.82,
                  sensitivity: 'personal',
                  confidence: 0.68,
                },
                kind: 'correction',
                summary: `scope review target ${query.sourceId}`,
                reason: 'Scope fuzz review target.',
                sourceTurnIds: [`turn-${query.sourceId}:user`],
                evidenceSnippets: [`scope review target ${query.sourceId}`],
                salience: 0.82,
                confidence: 0.68,
                sensitivity: 'personal',
                allowTraining: false,
                status: 'pending-cleaning',
                rejectionReasons: [],
                contaminationFlags: [],
                createdAt: 10,
              }],
            })
            await db.drainWorkingMemoryLongTermQueue(4)
            return (await db.listMemoryWorkbenchReviewItems({ cardId: query.cardId, limit: 8 })).items.filter(item => item.summary.includes(query.sourceId)).map(item => scopeRecord({
              id: item.id,
              cardId: query.cardId,
              userId: query.userId,
              sourceId: query.sourceId,
            }))
          },
          persona_dataset: async ({ query }) => {
            await db.enqueueWorkingMemoryLongTermQueueItems({
              cardId: query.cardId,
              sessionId: `session-persona-${query.sourceId}`,
              items: [{
                id: `persona-${query.sourceId}`,
                source: 'working-memory-owner',
                memoryEvidence: {
                  version: 'working-memory-long-term-evidence-v1',
                  source: 'explicit-structured-memory-evidence',
                  kind: 'relationship',
                  summary: `scope persona target ${query.sourceId}`,
                  reason: 'Scope fuzz persona target.',
                  evidenceSnippets: [`scope persona target ${query.sourceId}`],
                  salience: 0.92,
                  sensitivity: 'personal',
                  confidence: 0.92,
                },
                kind: 'relationship',
                summary: `scope persona target ${query.sourceId}`,
                reason: 'Scope fuzz persona target.',
                sourceTurnIds: [`turn-persona-${query.sourceId}:user`],
                evidenceSnippets: [`scope persona target ${query.sourceId}`],
                salience: 0.92,
                confidence: 0.92,
                sensitivity: 'personal',
                allowTraining: false,
                status: 'pending-cleaning',
                rejectionReasons: [],
                contaminationFlags: [],
                createdAt: 10,
              }],
            })
            await db.drainWorkingMemoryLongTermQueue(4)
            const reviewItem = (await db.listMemoryWorkbenchReviewItems({ cardId: query.cardId, limit: 16 })).items.find(item => item.summary.includes(query.sourceId))
            if (reviewItem) {
              await db.applyMemoryWorkbenchReviewAction({
                cardId: query.cardId,
                reviewItemId: reviewItem.id,
                decision: 'approve',
              })
              await db.drainWorkingMemoryLongTermQueue(4)
            }
            const reflection = (await db.listMemoryReflections({ cardId: query.cardId, limit: 20 }))
              .find(item => item.summary.includes(query.sourceId))
            if (reflection) {
              await db.upsertMemoryReflections([{
                ...reflection,
                status: 'confirmed',
                confirmedAt: reflection.updatedAt + 1,
              }])
            }
            const dataset = await db.stagePersonaTrainingDataset({
              cardId: query.cardId,
              consent: {
                granted: true,
                policyVersion: 'persona-training-consent-v1',
                scope: 'persona-dataset',
              },
            })
            return (await db.getPersonaTrainingDataset({ cardId: query.cardId })).examples.filter(example => example.datasetId === dataset.id).map(example => scopeRecord({
              id: example.id,
              cardId: example.cardId,
              userId: query.userId,
              sourceId: query.sourceId,
            }))
          },
        },
      })

      expect(report.passed, JSON.stringify(report.violations)).toBe(true)
      expect(report.surfaceSummaries.every(summary => summary.returnedRecordCount > 0)).toBe(true)
      expect(JSON.parse(JSON.stringify(report))).toEqual(report)
    }
    finally {
      await vector.close()
      await db.close()
    }
  }, 60_000)
})
