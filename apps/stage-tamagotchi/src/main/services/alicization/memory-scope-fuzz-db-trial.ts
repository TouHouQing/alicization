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
  cardId: string
  sourceId: string
  kind: 'correction' | 'relationship'
}) {
  const summary = `scope ${input.kind} target ${input.sourceId} [${input.cardId}]`
  await input.db.enqueueWorkingMemoryLongTermQueueItems({
    cardId: input.cardId,
    sessionId: `session-${input.kind}-${input.cardId}-${input.sourceId}`,
    items: [{
      id: `${input.kind}-${input.cardId}-${input.sourceId}`,
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
      reason: 'Scope fuzz repository target.',
      sourceTurnIds: [`turn-${input.cardId}-${input.sourceId}:user`],
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
  cardId: string
  sourceId: string
}) {
  const summary = await enqueueScopeReviewCandidate({
    ...input,
    kind: 'relationship',
  })
  const reviewItem = (await input.db.listMemoryWorkbenchReviewItems({
    cardId: input.cardId,
    limit: 64,
  })).find(item => item.summary === summary)
  if (reviewItem) {
    await input.db.applyMemoryWorkbenchReviewAction({
      cardId: input.cardId,
      reviewItemId: reviewItem.id,
      decision: 'approve',
    })
    await input.db.drainWorkingMemoryLongTermQueue(4)
  }
  const reflection = (await input.db.listMemoryReflections({
    cardId: input.cardId,
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
    cardId: input.cardId,
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
  let dbResource: MemoryScopeTrialDb | null = null
  let foreignDbResource: MemoryScopeTrialDb | null = null
  let vectorResource: Awaited<ReturnType<typeof createVectorScopeAdapter>> | null = null
  try {
    const db = await input.createDb(sandboxPath, input.cardId)
    dbResource = db
    const foreignCardId = `${input.cardId}-foreign`
    const foreignDb = await input.createDb(sandboxPath, foreignCardId)
    foreignDbResource = foreignDb
    const vector = await createVectorScopeAdapter()
    vectorResource = vector
    return await runMemoryScopeFuzzHarness({
      seed: `production:${input.cardId}`,
      caseCount: Math.max(1, Math.min(16, Math.floor(input.caseCount ?? 4))),
      cardId: input.cardId,
      userId: input.userId,
      views: {
        memory_facts: async ({ query }) => {
          await foreignDb.upsertMemoryFacts([{
            subject: query.sourceId,
            predicate: 'belongs-to',
            object: `${query.userId}-foreign`,
            confidence: 0.95,
            sourceLabel: query.sourceId,
            validationStatus: 'validated',
          }], 'rule')
          await db.upsertMemoryFacts([{
            subject: query.sourceId,
            predicate: 'belongs-to',
            object: query.userId,
            confidence: 0.95,
            sourceLabel: query.sourceId,
            validationStatus: 'validated',
          }], 'rule')
          return (await db.listMemoryFacts())
            .filter(fact => fact.subject === query.sourceId)
            .map(fact => scopeRecord({
              id: String(fact.id || `fact:${query.sourceId}`),
              cardId: fact.object === query.userId ? query.cardId : foreignCardId,
              userId: fact.object,
              sourceId: query.sourceId,
            }))
        },
        memory_consolidations: async ({ query }) => {
          await foreignDb.upsertMemoryConsolidations([{
            id: `consolidation-${foreignCardId}-${query.sourceId}`,
            kind: 'daily',
            facet: null,
            periodKey: query.sourceId,
            periodStartedAt: 1,
            periodEndedAt: 10,
            summary: `scope consolidation target ${query.sourceId} [${foreignCardId}]`,
            lesson: `scope lesson ${query.sourceId}`,
            cues: [query.sourceId],
            confidence: 0.92,
            dominantProvenance: 'remembered',
            derivedEventIds: [],
            updatedAt: 10,
          }])
          await db.upsertMemoryConsolidations([{
            id: `consolidation-${query.cardId}-${query.sourceId}`,
            kind: 'daily',
            facet: null,
            periodKey: query.sourceId,
            periodStartedAt: 1,
            periodEndedAt: 10,
            summary: `scope consolidation target ${query.sourceId} [${query.cardId}]`,
            lesson: `scope lesson ${query.sourceId}`,
            cues: [query.sourceId],
            confidence: 0.92,
            dominantProvenance: 'remembered',
            derivedEventIds: [],
            updatedAt: 10,
          }])
          return (await db.searchMemoryConsolidations({
            query: query.sourceId,
            limit: 32,
          }))
            .filter(item => item.cues.includes(query.sourceId))
            .map(item => scopeRecord({
              id: item.id,
              cardId: item.id.includes(foreignCardId) ? foreignCardId : query.cardId,
              userId: query.userId,
              sourceId: query.sourceId,
            }))
        },
        search_documents: async ({ query }) => {
          const listed = await db.listMemoryWorkbenchLongTermItems({
            cardId: query.cardId,
            query: query.sourceId,
            limit: 128,
          })
          return listed.items
            .filter(item => item.summary.includes(query.sourceId) || item.evidenceSnippets.some(snippet => snippet.includes(query.sourceId)))
            .map(item => scopeRecord({
              id: item.id,
              cardId: item.summary.includes(`[${foreignCardId}]`) ? foreignCardId : query.cardId,
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
              updatedAt: 10,
              metadata: {},
            },
          ])
          const found = await vector.adapter.search({
            queryVector: deterministicVector(query.sourceId),
            cardId: query.cardId,
            modelId: 'scope-model',
            dimensions: 3,
            limit: 16,
          })
          return found
            .map(result => ({
              result,
              cardId: result.record.id === `vector:${query.cardId}:${result.record.sourceId}`
                ? query.cardId
                : `${query.cardId}-foreign`,
            }))
            .filter(item =>
              item.cardId !== query.cardId
              || item.result.record.sourceId === query.sourceId,
            )
            .map(item => scopeRecord({
              id: item.result.record.id,
              cardId: item.cardId,
              userId: query.userId,
              sourceId: item.result.record.sourceId,
            }))
        },
        review_queue: async ({ query }) => {
          await enqueueScopeReviewCandidate({
            db: foreignDb,
            cardId: foreignCardId,
            sourceId: query.sourceId,
            kind: 'correction',
          })
          await enqueueScopeReviewCandidate({
            db,
            cardId: query.cardId,
            sourceId: query.sourceId,
            kind: 'correction',
          })
          return (await db.listMemoryWorkbenchReviewItems({ cardId: query.cardId, limit: 8 }))
            .filter(item => item.summary.includes(query.sourceId))
            .map(item => scopeRecord({
              id: item.id,
              cardId: item.summary.includes(`[${foreignCardId}]`) ? foreignCardId : query.cardId,
              userId: query.userId,
              sourceId: query.sourceId,
            }))
        },
        persona_dataset: async ({ query }) => {
          await stageScopePersonaDataset({
            db: foreignDb,
            cardId: foreignCardId,
            sourceId: query.sourceId,
          })
          const dataset = await stageScopePersonaDataset({
            db,
            cardId: query.cardId,
            sourceId: query.sourceId,
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
  }
  finally {
    await Promise.allSettled([
      vectorResource?.close(),
      dbResource?.close(),
      foreignDbResource?.close(),
    ])
    await rm(sandboxPath, { recursive: true, force: true })
  }
}
