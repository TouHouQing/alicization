import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-memory-scale-governance-'))
  sandboxDirs.push(dir)
  return dir
}

function run(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, error => error ? reject(error) : resolve())
  })
}

function close(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close(error => error ? reject(error) : resolve())
  })
}

async function mutatePersistedDb(dbPath: string, task: (database: sqlite3.Database) => Promise<void>) {
  const database = new sqlite3.Database(dbPath)
  try {
    await task(database)
  }
  finally {
    await close(database)
  }
}

function createEmbeddingProvider(): LongTermMemoryEmbeddingProvider {
  return {
    modelId: 'memory-scale-governance-model',
    dimensions: 3,
    embedTexts: async texts => texts.map((text, index) => ({
      text,
      vector: [
        text.includes('card-b') ? 0 : 1,
        text.includes('card-b') ? 1 : 0,
        (index % 7 + 1) / 10,
      ],
    })),
  }
}

async function waitForEmbeddingReindex(
  db: Awaited<ReturnType<typeof setupAlicizationDb>>,
  cardId: string,
  jobId: string,
) {
  let latest: Awaited<ReturnType<typeof db.reindexMemoryWorkbenchEmbeddings>> | null = null
  const deadlineAt = Date.now() + 15_000
  while (Date.now() < deadlineAt) {
    latest = await db.reindexMemoryWorkbenchEmbeddings({
      cardId,
      action: 'status',
      jobId,
    })
    if (['completed', 'cancelled', 'failed'].includes(latest.status ?? ''))
      return latest
    const retryDelay = latest.progress?.nextRetryAt
      ? Math.max(5, Math.min(100, latest.progress.nextRetryAt - Date.now()))
      : 5
    await new Promise(resolve => setTimeout(resolve, retryDelay))
  }
  throw new Error(`embedding reindex did not reach a terminal state: ${jobId}; latest=${JSON.stringify(latest)}`)
}

async function admitReviewedRelationship(input: {
  db: Awaited<ReturnType<typeof setupAlicizationDb>>
  cardId: string
  sourceId: string
  summary: string
}) {
  await input.db.enqueueWorkingMemoryLongTermQueueItems({
    cardId: input.cardId,
    sessionId: `session-${input.cardId}-${input.sourceId}`,
    items: [{
      id: input.sourceId,
      source: 'working-memory-owner',
      memoryEvidence: {
        version: 'working-memory-long-term-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        kind: 'relationship',
        summary: input.summary,
        reason: '用户明确表达了需要长期保持的相处偏好。',
        evidenceSnippets: [input.summary],
        salience: 0.92,
        sensitivity: 'personal',
        confidence: 0.68,
      },
      kind: 'relationship',
      summary: input.summary,
      reason: '用户明确表达了需要长期保持的相处偏好。',
      sourceTurnIds: [`turn-${input.sourceId}:user`],
      evidenceSnippets: [input.summary],
      salience: 0.92,
      confidence: 0.68,
      sensitivity: 'personal',
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: 1_000,
    }],
  })
  await input.db.drainWorkingMemoryLongTermQueue(8)
  const reviewItem = (await input.db.listMemoryWorkbenchReviewItems({
    cardId: input.cardId,
    limit: 32,
  })).find(item => item.summary === input.summary)
  expect(reviewItem).toBeTruthy()
  await input.db.applyMemoryWorkbenchReviewAction({
    cardId: input.cardId,
    reviewItemId: reviewItem!.id,
    decision: 'approve',
  })
  await input.db.drainWorkingMemoryLongTermQueue(8)

  const reflection = (await input.db.listMemoryReflections({
    cardId: input.cardId,
    limit: 64,
  })).find(item => item.summary === input.summary)
  expect(reflection).toBeTruthy()
  await input.db.upsertMemoryReflections([{
    ...reflection!,
    status: 'confirmed',
    confirmedAt: reflection!.updatedAt + 1,
  }])
  return reflection!.id
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (dir)
      await rm(dir, { recursive: true, force: true })
  }
})

describe('memory scale governance end-to-end', () => {
  it('keeps long-term sources, vectors, and persona exports card-scoped across restart', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const rootDir = join(userDataPath, 'alicizations')
    const embeddingProvider = createEmbeddingProvider()
    const cardA = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      embeddingProvider,
    })
    const cardB = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-b',
      embeddingProvider,
    })
    let cardADbPath = ''
    try {
      cardADbPath = cardA.dbPath
      await cardA.upsertMemoryFacts([{
        subject: 'card-a-user',
        predicate: 'prefers',
        object: 'card-a quiet dialogue',
        confidence: 0.95,
        sourceLabel: 'card-a-fact',
        validationStatus: 'validated',
      }], 'rule')
      await cardB.upsertMemoryFacts([{
        subject: 'card-b-user',
        predicate: 'prefers',
        object: 'card-b energetic dialogue',
        confidence: 0.95,
        sourceLabel: 'card-b-fact',
        validationStatus: 'validated',
      }], 'rule')
      await cardA.upsertMemoryConsolidations([{
        id: 'card-a-consolidation',
        kind: 'daily',
        facet: null,
        periodKey: 'scale-a',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'card-a consolidation target',
        lesson: 'card-a only lesson',
        cues: ['card-a'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: [],
        updatedAt: 2,
      }])
      await cardB.upsertMemoryConsolidations([{
        id: 'card-b-consolidation',
        kind: 'daily',
        facet: null,
        periodKey: 'scale-b',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'card-b consolidation target',
        lesson: 'card-b only lesson',
        cues: ['card-b'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: [],
        updatedAt: 2,
      }])

      await cardA.upsertMemoryReflections(Array.from({ length: 240 }, (_, index) => ({
        id: `card-a-reflection-${String(index + 1).padStart(3, '0')}`,
        cardId: 'card-a',
        sourceKind: 'reply' as const,
        targetScope: 'task' as const,
        summary: `card-a paged memory ${index + 1}`,
        lesson: 'card-a pagination must stay inside card-a.',
        status: 'confirmed' as const,
        confidence: 0.85,
        createdAt: 100 + index,
        updatedAt: 10_000 - index,
      })))
      await cardB.upsertMemoryReflections([{
        id: 'card-b-private-reflection',
        cardId: 'card-b',
        sourceKind: 'reply',
        targetScope: 'relationship',
        summary: 'card-b private memory',
        lesson: 'card-b must never appear in card-a.',
        status: 'confirmed',
        confidence: 0.95,
        createdAt: 500,
        updatedAt: 500,
      }])

      const cardAPersonaSource = await admitReviewedRelationship({
        db: cardA,
        cardId: 'card-a',
        sourceId: 'card-a-reviewed-relationship',
        summary: 'card-a 用户希望被安静而自然地陪伴。',
      })
      const cardBPersonaSource = await admitReviewedRelationship({
        db: cardB,
        cardId: 'card-b',
        sourceId: 'card-b-reviewed-relationship',
        summary: 'card-b 用户偏好更活跃的互动。',
      })
      const cardADataset = await cardA.stagePersonaTrainingDataset({
        cardId: 'card-a',
        consent: {
          granted: true,
          policyVersion: 'persona-training-consent-v1',
          scope: 'persona-dataset',
        },
      })
      const cardBDataset = await cardB.stagePersonaTrainingDataset({
        cardId: 'card-b',
        consent: {
          granted: true,
          policyVersion: 'persona-training-consent-v1',
          scope: 'persona-dataset',
        },
      })
      const cardASnapshot = await cardA.getPersonaTrainingDataset({ cardId: 'card-a' })
      const cardBSnapshot = await cardB.getPersonaTrainingDataset({ cardId: 'card-b' })
      const cardAExample = cardASnapshot.examples.find(example => example.sourceId === cardAPersonaSource)
      const cardBExample = cardBSnapshot.examples.find(example => example.sourceId === cardBPersonaSource)
      expect(cardAExample).toBeTruthy()
      expect(cardBExample).toBeTruthy()
      await cardA.setPersonaTrainingDatasetExamplePolicy({
        cardId: 'card-a',
        exampleId: cardAExample!.id,
        allowTraining: true,
        consent: {
          granted: true,
          policyVersion: 'persona-training-consent-v1',
          scope: 'persona-dataset',
        },
      })
      await cardB.setPersonaTrainingDatasetExamplePolicy({
        cardId: 'card-b',
        exampleId: cardBExample!.id,
        allowTraining: true,
        consent: {
          granted: true,
          policyVersion: 'persona-training-consent-v1',
          scope: 'persona-dataset',
        },
      })

      const scheduled = await cardA.reindexMemoryWorkbenchEmbeddings({
        cardId: 'card-a',
        limit: 100_000,
      })
      expect(scheduled.jobId).toBeTruthy()
      const completed = await waitForEmbeddingReindex(cardA, 'card-a', scheduled.jobId!)
      expect(completed).toMatchObject({
        status: 'completed',
        failed: 0,
      })
      expect(completed.indexed).toBeGreaterThan(240)

      const cardAExport = await cardA.exportPersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: cardADataset.id,
      })
      const cardBExport = await cardB.exportPersonaTrainingDataset({
        cardId: 'card-b',
        datasetId: cardBDataset.id,
      })
      expect(cardAExport.manifest.examples.map(example => example.sourceId)).toContain(cardAPersonaSource)
      expect(cardAExport.manifest.examples.map(example => example.sourceId)).not.toContain(cardBPersonaSource)
      expect(cardBExport.manifest.examples.map(example => example.sourceId)).toContain(cardBPersonaSource)
      expect(cardBExport.manifest.examples.map(example => example.sourceId)).not.toContain(cardAPersonaSource)
    }
    finally {
      await Promise.all([cardA.close(), cardB.close()])
    }

    const reopened = await setupAlicizationDb(userDataPath, {
      rootDir,
      cardId: 'card-a',
      embeddingProvider,
    })
    try {
      expect(reopened.dbPath).toBe(cardADbPath)
      expect((await reopened.listMemoryFacts()).map(fact => fact.subject)).toContain('card-a-user')
      expect((await reopened.listMemoryFacts()).map(fact => fact.subject)).not.toContain('card-b-user')
      expect((await reopened.searchMemoryConsolidations({
        query: 'card-a',
        limit: 10,
      })).map(item => item.id)).toContain('card-a-consolidation')
      expect((await reopened.searchMemoryConsolidations({
        query: 'card-b',
        limit: 10,
      })).map(item => item.id)).not.toContain('card-b-consolidation')

      const pagedIds: string[] = []
      let cursor: string | null = null
      do {
        const page = await reopened.listMemoryWorkbenchLongTermItems({
          cardId: 'card-a',
          query: 'card-a paged memory',
          source: 'memory_reflections',
          limit: 19,
          cursor,
        })
        pagedIds.push(...page.items.map(item => item.id))
        cursor = page.nextCursor
      } while (cursor)
      expect(pagedIds.length).toBeGreaterThanOrEqual(240)
      expect(new Set(pagedIds).size).toBe(pagedIds.length)
      for (let index = 1; index <= 240; index += 1)
        expect(pagedIds).toContain(`card-a-reflection-${String(index).padStart(3, '0')}`)
      expect(pagedIds).not.toContain('card-b-private-reflection')

      const health = await reopened.getMemoryWorkbenchEmbeddingHealth({ cardId: 'card-a' })
      expect(health).toMatchObject({
        providerConfigured: true,
        modelId: embeddingProvider.modelId,
        dimensions: embeddingProvider.dimensions,
        reindexRequired: false,
        searchReady: true,
      })
      expect(health.indexedCount).toBeGreaterThan(240)
    }
    finally {
      await reopened.close()
    }
  }, 60_000)

  it('carries review policy into recall and persona governance without auto-enabling training', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      cardId: 'card-life-loop',
    })
    try {
      const summary = '用户希望复杂问题先给结论，再自然解释原因。'
      await db.enqueueWorkingMemoryLongTermQueueItems({
        cardId: 'card-life-loop',
        sessionId: 'session-review-loop',
        items: [{
          id: 'review-loop-relationship',
          source: 'working-memory-owner',
          memoryEvidence: {
            version: 'working-memory-long-term-evidence-v1',
            source: 'explicit-structured-memory-evidence',
            kind: 'relationship',
            summary,
            reason: '用户明确提出长期对话偏好。',
            evidenceSnippets: [summary],
            salience: 0.94,
            sensitivity: 'personal',
            confidence: 0.68,
          },
          kind: 'relationship',
          summary,
          reason: '用户明确提出长期对话偏好。',
          sourceTurnIds: ['turn-review-loop:user'],
          evidenceSnippets: [summary],
          salience: 0.94,
          confidence: 0.68,
          sensitivity: 'personal',
          allowTraining: false,
          status: 'pending-cleaning',
          rejectionReasons: [],
          contaminationFlags: [],
          createdAt: 2_000,
        }],
      })
      await db.drainWorkingMemoryLongTermQueue(8)
      const reviewItem = (await db.listMemoryWorkbenchReviewItems({
        cardId: 'card-life-loop',
        limit: 16,
      })).find(item => item.summary === summary)
      expect(reviewItem).toBeTruthy()
      await db.applyMemoryWorkbenchReviewAction({
        cardId: 'card-life-loop',
        reviewItemId: reviewItem!.id,
        decision: 'inward-only',
      })
      await db.applyMemoryWorkbenchReviewAction({
        cardId: 'card-life-loop',
        reviewItemId: reviewItem!.id,
        decision: 'approve',
      })
      await db.drainWorkingMemoryLongTermQueue(8)

      const reflectionsAfterReview = await db.listMemoryReflections({
        cardId: 'card-life-loop',
        limit: 32,
      })
      const reflection = reflectionsAfterReview.find(item => item.summary === summary)
      expect(reflection, JSON.stringify(reflectionsAfterReview)).toBeTruthy()
      await db.upsertMemoryReflections([{
        ...reflection!,
        status: 'confirmed',
        confidence: 0.92,
        confirmedAt: reflection!.updatedAt + 1,
      }])
      const projected = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'card-life-loop',
        limit: 16,
      })
      expect(projected.items.some(item =>
        item.summary.includes('先给结论')
        && item.visibility === 'inward-only'
        && item.training === 'blocked',
      ), JSON.stringify(projected.items)).toBe(true)

      const probe = await db.runMemoryWorkbenchRecallProbe({
        cardId: 'card-life-loop',
        query: '你还记得我希望复杂问题先给结论，再解释原因吗？',
        limit: 8,
      })
      expect(
        probe.evidence.some(item => item.summary.includes('先给结论')),
        JSON.stringify(probe),
      ).toBe(true)

      const candidates = await db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-life-loop',
        limit: 16,
      })
      const candidate = candidates.items.find(item => item.sourceMemoryIds.includes(reflection!.id))
      expect(candidate).toMatchObject({
        status: 'no-training',
        allowTraining: false,
      })
      const approved = await db.applyMemoryWorkbenchPersonaCandidateAction({
        cardId: 'card-life-loop',
        candidateId: candidate!.id,
        decision: 'approve',
        reason: '只批准人格候选，不自动授权训练。',
      })
      expect(approved).toMatchObject({
        status: 'approved',
        allowTraining: false,
      })

      const dataset = await db.stagePersonaTrainingDataset({
        cardId: 'card-life-loop',
        consent: {
          granted: true,
          policyVersion: 'persona-training-consent-v1',
          scope: 'persona-dataset',
        },
      })
      const snapshot = await db.getPersonaTrainingDataset({ cardId: 'card-life-loop' })
      const example = snapshot.examples.find(item =>
        item.datasetId === dataset.id
        && item.sourceId === reflection!.id,
      )
      expect(example).toMatchObject({
        allowTraining: false,
        state: 'staged',
      })
      expect((await db.exportPersonaTrainingDataset({
        cardId: 'card-life-loop',
        datasetId: dataset.id,
      })).manifest.examples).toHaveLength(0)
    }
    finally {
      await db.close()
    }
  }, 30_000)

  it('recovers expired multi-item embedding leases after restart without duplicates or loss', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const embeddingProvider = createEmbeddingProvider()
    const first = await setupAlicizationDb(userDataPath, {
      cardId: 'card-reindex-recovery',
      embeddingProvider,
    })
    let jobId = ''
    let dbPath = ''
    try {
      dbPath = first.dbPath
      await first.upsertMemoryReflections(Array.from({ length: 24 }, (_, index) => ({
        id: `recovery-reflection-${index + 1}`,
        cardId: 'card-reindex-recovery',
        sourceKind: 'reply' as const,
        targetScope: 'task' as const,
        summary: `restart recovery memory ${index + 1}`,
        lesson: 'Every claimed item must survive restart exactly once.',
        status: 'confirmed' as const,
        confidence: 0.85,
        createdAt: 100 + index,
        updatedAt: 100 + index,
      })))
      const scheduled = await first.reindexMemoryWorkbenchEmbeddings({
        cardId: 'card-reindex-recovery',
        source: 'memory_reflections',
        limit: 24,
      })
      jobId = scheduled.jobId!
      const completed = await waitForEmbeddingReindex(first, 'card-reindex-recovery', jobId)
      expect(completed).toMatchObject({
        status: 'completed',
        scheduled: 24,
        indexed: 24,
        failed: 0,
      })
    }
    finally {
      await first.close()
    }

    await mutatePersistedDb(dbPath, async (database) => {
      await run(database, `
        UPDATE memory_embedding_reindex_jobs
        SET status = 'running', completed_at = NULL, last_error = NULL
        WHERE id = ?
      `, [jobId])
      await run(database, `
        UPDATE memory_embedding_reindex_items
        SET status = 'leased', lease_token = 'crashed-worker',
            lease_expires_at = 1, indexed_at = NULL
        WHERE id IN (
          SELECT id
          FROM memory_embedding_reindex_items
          WHERE job_id = ?
          ORDER BY id ASC
          LIMIT 7
        )
      `, [jobId])
    })

    const restarted = await setupAlicizationDb(userDataPath, {
      cardId: 'card-reindex-recovery',
      embeddingProvider,
    })
    try {
      const resumed = await waitForEmbeddingReindex(restarted, 'card-reindex-recovery', jobId)
      expect(resumed).toMatchObject({
        status: 'completed',
        scheduled: 24,
        indexed: 24,
        failed: 0,
      })
      expect(resumed.progress).toMatchObject({
        pending: 0,
        leased: 0,
        retryable: 0,
        deadLettered: 0,
      })
      const health = await restarted.getMemoryWorkbenchEmbeddingHealth({
        cardId: 'card-reindex-recovery',
      })
      expect(health.indexedCount).toBe(24)
      expect(health.missingCount).toBe(0)
      expect(health.orphanedCount).toBe(0)
    }
    finally {
      await restarted.close()
    }
  }, 30_000)
})
