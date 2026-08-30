import type sqlite3 from 'sqlite3'

import type { AlicizationDbService } from './db'
import type {
  MemoryScopeFuzzRecord,
  MemoryScopeFuzzReport,
} from './memory-scope-fuzz-harness'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3Runtime from './sqlite3-runtime'

import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'
import { createSqliteVecLongTermMemoryVectorBackend } from './long-term-memory-sqlite-vec-backend'
import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import { runMemoryScopeFuzzHarness } from './memory-scope-fuzz-harness'

type MemoryScopeTrialDb = Pick<
  AlicizationDbService,
  | 'applyMemoryWorkbenchReviewAction'
  | 'close'
  | 'drainWorkingMemoryLongTermQueue'
  | 'enqueueWorkingMemoryLongTermQueueItems'
  | 'getPersonaTrainingDataset'
  | 'listMemoryFacts'
  | 'searchMemoryConsolidations'
  | 'listMemoryReflections'
  | 'listMemoryWorkbenchLongTermItems'
  | 'listMemoryWorkbenchReviewItems'
  | 'stagePersonaTrainingDataset'
  | 'upsertMemoryFacts'
  | 'upsertMemoryConsolidations'
  | 'upsertMemoryReflections'
>

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
  const database = new sqlite3Runtime.Database(':memory:')
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

async function enqueueScopeReviewCandidate(input: {
  db: MemoryScopeTrialDb
  record: MemoryScopeFuzzRecord
  kind: 'correction' | 'relationship'
}) {
  const summary = `scope ${input.kind} target ${input.record.sourceId} [${input.record.cardId}] [${input.record.userId}]`
  await input.db.enqueueWorkingMemoryLongTermQueueItems({
    cardId: input.record.cardId,
    sessionId: `session-${input.kind}-${input.record.id}`,
    items: [{
      id: `${input.kind}-${input.record.id}`,
      source: 'working-memory-owner',
      memoryEvidence: {
        version: 'working-memory-long-term-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        kind: input.kind,
        summary,
        reason: 'Scope fuzz repository target.',
        evidenceSnippets: [summary],
        salience: input.kind === 'relationship' ? 0.92 : 0.82,
        sensitivity: 'personal',
        confidence: input.kind === 'relationship' ? 0.92 : 0.68,
      },
      kind: input.kind,
      summary,
      reason: `Scope fuzz repository target for ${input.record.userId}.`,
      sourceTurnIds: [`turn-${input.record.id}:user`],
      evidenceSnippets: [summary],
      salience: input.kind === 'relationship' ? 0.92 : 0.82,
      confidence: input.kind === 'relationship' ? 0.92 : 0.68,
      sensitivity: 'personal',
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: 10,
    }],
  })
  await input.db.drainWorkingMemoryLongTermQueue(4)
  return summary
}

async function stageScopePersonaDataset(input: {
  db: MemoryScopeTrialDb
  record: MemoryScopeFuzzRecord
}) {
  const summary = await enqueueScopeReviewCandidate({
    ...input,
    kind: 'relationship',
  })
  const reviewItem = (await input.db.listMemoryWorkbenchReviewItems({
    cardId: input.record.cardId,
    limit: 64,
  })).items.find(item => item.summary === summary)
  if (reviewItem) {
    await input.db.applyMemoryWorkbenchReviewAction({
      cardId: input.record.cardId,
      reviewItemId: reviewItem.id,
      decision: 'approve',
    })
    await input.db.drainWorkingMemoryLongTermQueue(4)
  }
  const reflection = (await input.db.listMemoryReflections({
    cardId: input.record.cardId,
    limit: 64,
  })).find(item => item.summary === summary)
  if (reflection) {
    await input.db.upsertMemoryReflections([{
      ...reflection,
      status: 'confirmed',
      confirmedAt: reflection.updatedAt + 1,
    }])
  }
  return await input.db.stagePersonaTrainingDataset({
    cardId: input.record.cardId,
    consent: {
      granted: true,
      policyVersion: 'persona-training-consent-v1',
      scope: 'persona-dataset',
    },
  })
}

export async function runMemoryScopeFuzzDbTrial(input: {
  cardId: string
  userId: string
  caseCount?: number
  createDb: (userDataPath: string, cardId: string) => Promise<MemoryScopeTrialDb>
}): Promise<MemoryScopeFuzzReport> {
  const sandboxPath = await mkdtemp(join(tmpdir(), 'alicization-memory-scope-fuzz-trial-'))
  const dbResources = new Map<string, MemoryScopeTrialDb>()
  let vectorResource: Awaited<ReturnType<typeof createVectorScopeAdapter>> | null = null
  try {
    const getDb = async (cardId: string) => {
      const existing = dbResources.get(cardId)
      if (existing)
        return existing
      const created = await input.createDb(sandboxPath, cardId)
      dbResources.set(cardId, created)
      return created
    }
    const vector = await createVectorScopeAdapter()
    vectorResource = vector
    return await runMemoryScopeFuzzHarness({
      seed: `production:${input.cardId}:${input.userId}`,
      caseCount: Math.max(1, Math.min(16, Math.floor(input.caseCount ?? 4))),
      views: {
        memory_facts: async ({ query, records }) => {
          for (const record of records) {
            const db = await getDb(record.cardId)
            await db.upsertMemoryFacts([{
              subject: record.sourceId,
              predicate: 'belongs-to',
              object: record.userId,
              confidence: 0.95,
              sourceLabel: record.id,
              validationStatus: 'validated',
            }], 'rule')
          }
          const db = await getDb(query.cardId)
          return (await db.listMemoryFacts())
            .filter(fact =>
              fact.subject === query.sourceId
              && fact.object === query.userId,
            )
            .map(fact => scopeRecord({
              id: String(fact.id || fact.sourceLabel || `fact:${query.sourceId}`),
              cardId: query.cardId,
              userId: fact.object,
              sourceId: fact.subject,
            }))
        },
        memory_consolidations: async ({ query, records }) => {
          for (const record of records) {
            const db = await getDb(record.cardId)
            await db.upsertMemoryConsolidations([{
              id: `consolidation-${record.id}`,
              kind: 'daily',
              facet: null,
              periodKey: record.sourceId,
              periodStartedAt: 1,
              periodEndedAt: 10,
              summary: `scope consolidation target ${record.sourceId} [${record.cardId}] [${record.userId}]`,
              lesson: `scope lesson ${record.sourceId} [${record.userId}]`,
              cues: [record.sourceId, record.userId],
              confidence: 0.92,
              dominantProvenance: 'remembered',
              derivedEventIds: [],
              updatedAt: 10,
            }])
          }
          const db = await getDb(query.cardId)
          return (await db.searchMemoryConsolidations({
            query: query.sourceId,
            limit: 32,
          }))
            .filter(item =>
              item.periodKey === query.sourceId
              && item.cues.includes(query.userId),
            )
            .map(item => scopeRecord({
              id: item.id,
              cardId: query.cardId,
              userId: query.userId,
              sourceId: item.periodKey,
            }))
        },
        search_documents: async ({ query, records }) => {
          for (const record of records) {
            await enqueueScopeReviewCandidate({
              db: await getDb(record.cardId),
              record,
              kind: 'correction',
            })
          }
          const db = await getDb(query.cardId)
          await db.drainWorkingMemoryLongTermQueue(64)
          const listed = await db.listMemoryWorkbenchLongTermItems({
            cardId: query.cardId,
            query: query.sourceId,
            limit: 128,
          })
          return listed.items
            .filter(item =>
              item.summary.includes(`[${query.userId}]`)
              && (item.summary.includes(query.sourceId) || item.evidenceSnippets.some(snippet => snippet.includes(query.sourceId))),
            )
            .map(item => scopeRecord({
              id: item.id,
              cardId: query.cardId,
              userId: query.userId,
              sourceId: query.sourceId,
            }))
        },
        vectors: async ({ query, records }) => {
          const source = 'memory_reflections'
          const orderedRecords = [
            ...records.filter(record =>
              record.cardId !== query.cardId
              || record.userId !== query.userId
              || record.sourceId !== query.sourceId,
            ),
            ...records.filter(record =>
              record.cardId === query.cardId
              && record.userId === query.userId
              && record.sourceId === query.sourceId,
            ),
          ]
          for (const record of orderedRecords) {
            const text = `vector target ${record.sourceId} [${record.userId}]`
            await vector.prepareCanonical({
              cardId: record.cardId,
              source,
              sourceId: record.sourceId,
              text,
            })
            await vector.adapter.upsert([{
              id: `vector:${record.id}`,
              cardId: record.cardId,
              sourceId: record.sourceId,
              source,
              text,
              vector: deterministicVector(record.sourceId),
              modelId: 'scope-model',
              dimensions: 3,
              vectorSpaceId,
              updatedAt: 10,
              metadata: { scopeUserId: record.userId },
            }])
          }
          const found = await vector.adapter.search({
            queryVector: deterministicVector(query.sourceId),
            cardId: query.cardId,
            modelId: 'scope-model',
            dimensions: 3,
            vectorSpaceId,
            limit: 16,
          })
          return found
            .filter(result =>
              result.record.sourceId === query.sourceId
              && result.record.metadata?.scopeUserId === query.userId,
            )
            .map(result => scopeRecord({
              id: result.record.id,
              cardId: query.cardId,
              userId: query.userId,
              sourceId: result.record.sourceId,
            }))
        },
        review_queue: async ({ query, records }) => {
          for (const record of records) {
            await enqueueScopeReviewCandidate({
              db: await getDb(record.cardId),
              record,
              kind: 'correction',
            })
          }
          const db = await getDb(query.cardId)
          await db.drainWorkingMemoryLongTermQueue(64)
          return (await db.listMemoryWorkbenchReviewItems({
            cardId: query.cardId,
            query: query.sourceId,
            limit: 64,
          })).items.filter(item => item.summary.includes(`[${query.userId}]`)).map(item => scopeRecord({
            id: item.id,
            cardId: query.cardId,
            userId: query.userId,
            sourceId: query.sourceId,
          }))
        },
        persona_dataset: async ({ query, records }) => {
          const orderedRecords = [
            ...records.filter(record =>
              record.cardId !== query.cardId
              || record.userId !== query.userId
              || record.sourceId !== query.sourceId,
            ),
            ...records.filter(record =>
              record.cardId === query.cardId
              && record.userId === query.userId
              && record.sourceId === query.sourceId,
            ),
          ]
          let datasetId: string | null = null
          for (const record of orderedRecords) {
            const dataset = await stageScopePersonaDataset({
              db: await getDb(record.cardId),
              record,
            })
            if (record.cardId === query.cardId && record.userId === query.userId && record.sourceId === query.sourceId)
              datasetId = dataset.id
          }
          if (!datasetId)
            return []
          const db = await getDb(query.cardId)
          const snapshot = await db.getPersonaTrainingDataset({ cardId: query.cardId })
          return snapshot.examples
            .filter(example =>
              example.datasetId === datasetId
              && example.positiveExample.includes(query.sourceId)
              && example.positiveExample.includes(`[${query.userId}]`),
            )
            .map(example => scopeRecord({
              id: example.id,
              cardId: example.cardId,
              userId: query.userId,
              sourceId: query.sourceId,
            }))
        },
      },
    })
  }
  finally {
    await Promise.allSettled([
      vectorResource?.close(),
      ...[...dbResources.values()].map(db => db.close()),
    ])
    await rm(sandboxPath, { recursive: true, force: true })
  }
}
