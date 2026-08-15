import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'

const sandboxDirs: string[] = []

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

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-persona-dataset-'))
  sandboxDirs.push(dir)
  return dir
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (dir)
      await rm(dir, { recursive: true, force: true })
  }
})

async function admitConfirmedPersonaSource(
  db: Awaited<ReturnType<typeof setupAlicizationDb>>,
  input: {
    cardId: string
    sourceSuffix: string
  },
) {
  const summary = `召回不确定时要明确说明原因 ${input.sourceSuffix}`
  await db.enqueueWorkingMemoryLongTermQueueItems({
    cardId: input.cardId,
    sessionId: `session-persona-rollback-${input.sourceSuffix}`,
    items: [{
      id: `relationship-persona-rollback-${input.sourceSuffix}`,
      source: 'working-memory-owner',
      memoryEvidence: {
        version: 'working-memory-long-term-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        kind: 'relationship',
        summary,
        reason: '用户要求对话链路透明说明记忆召回不确定性。',
        evidenceSnippets: [summary],
        salience: 0.9,
        sensitivity: 'personal',
        confidence: 0.9,
      },
      kind: 'relationship',
      summary,
      reason: '用户要求对话链路透明说明记忆召回不确定性。',
      sourceTurnIds: [`turn-persona-rollback-${input.sourceSuffix}:user`],
      evidenceSnippets: [summary],
      salience: 0.9,
      confidence: 0.9,
      sensitivity: 'personal',
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: 100,
    }],
  })
  expect(await db.drainWorkingMemoryLongTermQueue()).toMatchObject({
    admitted: 1,
    applied: 1,
  })

  const reflection = (await db.listMemoryReflections({
    cardId: input.cardId,
    limit: 20,
  })).find(item => item.summary === summary)
  expect(reflection).toBeTruthy()
  await db.upsertMemoryReflections([{
    id: reflection!.id,
    cardId: reflection!.cardId,
    decisionTraceId: reflection!.decisionTraceId,
    turnId: reflection!.turnId,
    sessionId: reflection!.sessionId,
    sourceKind: reflection!.sourceKind,
    targetScope: reflection!.targetScope,
    summary: reflection!.summary,
    lesson: reflection!.lesson,
    status: 'confirmed',
    confidence: reflection!.confidence,
    supportingFactIds: reflection!.supportingFactIds,
    supportingOutcomeIds: reflection!.supportingOutcomeIds,
    createdAt: reflection!.createdAt,
    updatedAt: reflection!.updatedAt + 1,
    confirmedAt: reflection!.updatedAt + 1,
  }])
}

async function stageActivatablePersonaDataset(
  db: Awaited<ReturnType<typeof setupAlicizationDb>>,
  input: {
    cardId: string
    sourceSuffix: string
  },
) {
  await admitConfirmedPersonaSource(db, input)
  const consent = {
    granted: true,
    policyVersion: 'persona-training-consent-v1',
    scope: 'persona-dataset',
  }
  const dataset = await db.stagePersonaTrainingDataset({
    cardId: input.cardId,
    consent,
  })
  const snapshot = await db.getPersonaTrainingDataset({ cardId: input.cardId })
  const example = snapshot.examples.find(item => item.datasetId === dataset.id)
  expect(example).toBeTruthy()
  await db.setPersonaTrainingDatasetExamplePolicy({
    cardId: input.cardId,
    exampleId: example!.id,
    allowTraining: true,
    consent,
  })
  return dataset
}

describe('persona training dataset database provenance', () => {
  it('routes production training through the gated manifest and persists run, increment, rollback, and revoke audit state', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const executions: Array<{
      datasetId: string
      manifestHash: string
      sourceIds: string[]
    }> = []
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async (input) => {
        executions.push({
          datasetId: input.datasetId,
          manifestHash: input.manifest.manifestHash,
          sourceIds: input.manifest.examples.map(example => example.sourceId),
        })
        return { artifact: { artifactPath: '/tmp/persona-lora-increment.safetensors' } }
      },
    })
    let incrementId = ''
    let sourceId = ''
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'production',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const snapshot = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      sourceId = snapshot.examples.find(example => example.datasetId === dataset.id)?.sourceId ?? ''
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })

      expect(result).toMatchObject({
        status: 'succeeded',
        increment: {
          cardId: 'card-a',
          datasetId: dataset.id,
          state: 'available',
        },
      })
      expect(executions).toHaveLength(1)
      expect(executions[0]).toMatchObject({
        datasetId: dataset.id,
      })
      if (result.status === 'succeeded')
        incrementId = result.increment.id
      expect(await db.listPersonaTrainingIncrements({ cardId: 'card-a' })).toEqual([
        expect.objectContaining({
          id: incrementId,
          state: 'available',
        }),
      ])

      await db.close()
      const reopened = await setupAlicizationDb(userDataPath)
      try {
        const persisted = await reopened.listPersonaTrainingIncrements({ cardId: 'card-a' })
        expect(persisted).toEqual([
          expect.objectContaining({
            id: incrementId,
            state: 'available',
            artifact: { artifactPath: '/tmp/persona-lora-increment.safetensors' },
          }),
        ])
        await expect(reopened.rollbackPersonaTrainingIncrement({
          cardId: 'card-a',
          incrementId,
        })).resolves.toMatchObject({
          id: incrementId,
          state: 'rolled-back',
        })
        await expect(reopened.revokePersonaTrainingDatasetSource({
          cardId: 'card-a',
          sourceId,
        })).resolves.toMatchObject({ affected: 1 })
      }
      finally {
        await reopened.close()
      }
    }
    finally {
      if (db)
        await db.close().catch(() => {})
    }

    const rawDatabase = await openRawDatabase(join(userDataPath, 'alicizations', 'alicization.db'))
    try {
      const runs = await queryRawRows<{
        status: string
        dataset_id: string
        manifest_hash: string
      }>(rawDatabase, `
        SELECT status, dataset_id, manifest_hash
        FROM persona_training_runs
        WHERE run_id = ?
      `, [`${incrementId.replace('persona-training-increment:', '')}`])
      expect(runs).toEqual([expect.objectContaining({
        status: 'completed',
      })])

      const increments = await queryRawRows<{ state: string }>(
        rawDatabase,
        'SELECT state FROM persona_training_increments WHERE id = ?',
        [incrementId],
      )
      expect(increments).toEqual([{ state: 'rolled-back' }])

      const auditEvents = await queryRawRows<{ action: string }>(
        rawDatabase,
        `
        SELECT action
        FROM audit_logs
        WHERE category = 'persona-training'
        ORDER BY created_at ASC, id ASC
      `,
      )
      expect(auditEvents.map(event => event.action).sort()).toEqual([
        'training-started',
        'training-completed',
        'training-increment-rolled-back',
        'training-increment-revoked',
      ].sort())
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('persists a failed training consumer without creating an increment', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async () => {
        throw new Error('trainer process failed')
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'failed',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      await expect(db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })).resolves.toMatchObject({
        status: 'failed',
        reason: 'executor-failed',
      })
      expect(await db.listPersonaTrainingIncrements({ cardId: 'card-a' })).toEqual([])
      await db.close()
    }
    finally {
      await db.close().catch(() => {})
    }

    const rawDatabase = await openRawDatabase(join(userDataPath, 'alicizations', 'alicization.db'))
    try {
      const runs = await queryRawRows<{ status: string, error: string | null }>(
        rawDatabase,
        'SELECT status, error FROM persona_training_runs',
      )
      expect(runs).toEqual([expect.objectContaining({
        status: 'failed',
        error: 'trainer process failed',
      })])
      const auditEvents = await queryRawRows<{ action: string }>(
        rawDatabase,
        `
        SELECT action
        FROM audit_logs
        WHERE category = 'persona-training'
        ORDER BY created_at ASC, id ASC
      `,
      )
      expect(auditEvents.map(event => event.action).sort()).toEqual([
        'training-started',
        'training-failed',
      ].sort())
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('persists explicit cancellation and keeps the cancelled result out of increments', async () => {
    const userDataPath = await createSandboxUserDataPath()
    let resolveStarted!: () => void
    let resolveTraining!: (value: { artifact: string }) => void
    let runId = ''
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve
    })
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async (input) => {
        runId = input.runId
        resolveStarted()
        return await new Promise<{ artifact: string }>((resolve) => {
          resolveTraining = resolve
        })
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'cancelled',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const training = db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      await started
      await expect(db.cancelPersonaTraining({
        cardId: 'card-a',
        runId,
        reason: 'user-requested',
      })).resolves.toBe(true)
      resolveTraining({ artifact: 'must-not-be-used' })
      await expect(training).resolves.toMatchObject({
        status: 'failed',
        reason: 'cancelled',
      })
      expect(await db.listPersonaTrainingIncrements({ cardId: 'card-a' })).toEqual([])
      await db.close()
    }
    finally {
      await db.close().catch(() => {})
    }

    const rawDatabase = await openRawDatabase(join(userDataPath, 'alicizations', 'alicization.db'))
    try {
      const runs = await queryRawRows<{ status: string, error: string | null }>(
        rawDatabase,
        'SELECT status, error FROM persona_training_runs WHERE run_id = ?',
        [runId],
      )
      expect(runs).toEqual([{
        status: 'cancelled',
        error: 'user-requested',
      }])
      const runAuditEvents = await queryRawRows<{ action: string, payload_json: string }>(
        rawDatabase,
        `
        SELECT action, payload_json
        FROM audit_logs
        WHERE category = 'persona-training'
        ORDER BY created_at ASC, id ASC
      `,
      )
      expect(runAuditEvents.map(event => event.action).sort()).toEqual([
        'training-started',
        'training-cancelled',
      ].sort())
      expect(runAuditEvents.some(event => event.payload_json.includes('user-requested'))).toBe(true)
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('excludes a directly confirmed reflection that did not pass WorkingMemory cleaning', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([{
        id: 'direct-confirmed-reflection',
        cardId: 'default',
        sourceKind: 'maintenance',
        targetScope: 'self',
        summary: '直接写入的已确认反思。',
        lesson: '没有 WorkingMemory 清洗事务就不能进入训练数据集。',
        status: 'confirmed',
        confidence: 0.9,
      }])

      const version = await db.stagePersonaTrainingDataset({
        cardId: 'default',
        consent: {
          granted: true,
          policyVersion: 'persona-training-consent-v1',
          scope: 'persona-dataset',
        },
      })
      const snapshot = await db.getPersonaTrainingDataset({ cardId: 'default' })

      expect(snapshot.versions.map(item => item.id)).toContain(version.id)
      expect(snapshot.examples).toEqual([])
    }
    finally {
      await db.close()
    }
  })

  it('includes a confirmed reflection projected by an applied WorkingMemory cleaning transaction', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.enqueueWorkingMemoryLongTermQueueItems({
        cardId: 'default',
        sessionId: 'session-persona-provenance',
        items: [{
          id: 'relationship-candidate-1',
          source: 'working-memory-owner',
          memoryEvidence: {
            version: 'working-memory-long-term-evidence-v1',
            source: 'explicit-structured-memory-evidence',
            kind: 'relationship',
            summary: 'Provider 出错或超时时要直接说明，保持关系透明。',
            reason: '用户明确要求失败面透明。',
            evidenceSnippets: ['失败时直接说明，不要伪装成正常回复。'],
            salience: 0.9,
            sensitivity: 'personal',
            confidence: 0.9,
          },
          kind: 'relationship',
          summary: 'Provider 出错或超时时要直接说明，保持关系透明。',
          reason: '用户明确要求失败面透明。',
          sourceTurnIds: ['turn-persona-provenance:user'],
          evidenceSnippets: ['失败时直接说明，不要伪装成正常回复。'],
          salience: 0.9,
          confidence: 0.9,
          sensitivity: 'personal',
          allowTraining: false,
          status: 'pending-cleaning',
          rejectionReasons: [],
          contaminationFlags: [],
          createdAt: 100,
        }],
      })

      expect(await db.drainWorkingMemoryLongTermQueue()).toMatchObject({
        admitted: 1,
        applied: 1,
      })

      const [reflection] = await db.listMemoryReflections({
        cardId: 'default',
        limit: 10,
      })
      expect(reflection).toBeTruthy()
      await db.upsertMemoryReflections([{
        id: reflection!.id,
        cardId: reflection!.cardId,
        decisionTraceId: reflection!.decisionTraceId,
        turnId: reflection!.turnId,
        sessionId: reflection!.sessionId,
        sourceKind: reflection!.sourceKind,
        targetScope: reflection!.targetScope,
        summary: reflection!.summary,
        lesson: reflection!.lesson,
        status: 'confirmed',
        confidence: reflection!.confidence,
        supportingFactIds: reflection!.supportingFactIds,
        supportingOutcomeIds: reflection!.supportingOutcomeIds,
        createdAt: reflection!.createdAt,
        updatedAt: reflection!.updatedAt + 1,
        confirmedAt: reflection!.updatedAt + 1,
      }])

      await db.stagePersonaTrainingDataset({
        cardId: 'default',
        consent: {
          granted: false,
          policyVersion: 'persona-training-consent-v1',
          scope: 'persona-dataset',
        },
      })
      const snapshot = await db.getPersonaTrainingDataset({ cardId: 'default' })

      expect(snapshot.examples).toEqual(expect.arrayContaining([
        expect.objectContaining({
          sourceId: reflection!.id,
          sourceKind: 'cleaned-long-term-reflection',
          allowTraining: false,
          state: 'staged',
        }),
        expect.objectContaining({
          sourceKind: 'persona-reinforcement',
          allowTraining: false,
          state: 'staged',
        }),
      ]))
    }
    finally {
      await db.close()
    }
  })

  it('rolls back by retiring the superseded active version and reactivating the target version', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const first = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'first',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: first.id,
      })
      const second = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'second',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: second.id,
      })
      const rolledBack = await db.rollbackPersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: first.id,
      })
      const snapshot = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      const firstAfterRollback = snapshot.versions.find(version => version.id === first.id)
      const secondAfterRollback = snapshot.versions.find(version => version.id === second.id)

      expect(rolledBack).toMatchObject({
        id: first.id,
        cardId: 'card-a',
        rolledBackAt: null,
      })
      expect(rolledBack?.activeAt).not.toBeNull()
      expect(snapshot.activeVersionId).toBe(first.id)
      expect(firstAfterRollback?.activeAt).not.toBeNull()
      expect(firstAfterRollback?.rolledBackAt).toBeNull()
      expect(secondAfterRollback?.activeAt).toBeNull()
      expect(secondAfterRollback?.rolledBackAt).not.toBeNull()
    }
    finally {
      await db.close()
    }
  })

  it('rejects rolling back a dataset version owned by another card', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const dataset = await db.stagePersonaTrainingDataset({
        cardId: 'card-a',
        consent: {
          granted: false,
          policyVersion: 'persona-training-consent-v1',
          scope: 'persona-dataset',
        },
      })

      await expect(db.rollbackPersonaTrainingDataset({
        cardId: 'card-b',
        datasetId: dataset.id,
      })).rejects.toThrow('persona training dataset version not found')
    }
    finally {
      await db.close()
    }
  })
})
