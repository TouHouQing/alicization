import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import type { PersonaTrainingExecutorInput } from './persona-training-pipeline-gate'

import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createPersonaTrainingProcessExecutor } from './persona-training-process-executor'

const sandboxDirs: string[] = []

function createPersonaTrainingArtifact(
  runId: string,
  artifactId = `artifact-${runId}`,
): AlicizationPersonaTrainingArtifact {
  return {
    schemaVersion: 'alicization-persona-training-artifact-v1',
    artifactId,
    runId,
    kind: 'lora-adapter',
    path: `/tmp/persona-training/artifacts/${artifactId}/output/adapter.safetensors`,
    sha256: 'a'.repeat(64),
    sizeBytes: 1024,
    baseModel: 'base-model-v1',
    compatibility: {
      status: 'compatible',
      baseModel: 'base-model-v1',
      reason: null,
    },
    activation: {
      status: 'unsupported',
      reason: 'No loader receipt is available.',
    },
  }
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

function runRaw(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, (error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

async function insertRawPersonaTrainingRun(
  database: sqlite3.Database,
  input: {
    runId: string
    status: string
    artifact: AlicizationPersonaTrainingArtifact | null
  },
) {
  await runRaw(
    database,
    `
    INSERT INTO persona_training_runs (
      run_id, card_id, dataset_id, manifest_hash, source_ids_json,
      base_persona_revision, status, stage, progress, progress_message,
      failure_reason, config_snapshot_json, artifact_json, error,
      queued_at, started_at, updated_at, finished_at, cancellation_requested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.runId,
      'card-a',
      `dataset-${input.runId}`,
      `manifest-${input.runId}`,
      `["source-${input.runId}"]`,
      'persona-core-v1',
      input.status,
      input.status === 'completed' ? 'finalizing' : 'training',
      input.status === 'completed' ? 1 : 0.5,
      null,
      null,
      null,
      input.artifact ? JSON.stringify(input.artifact) : null,
      null,
      100,
      110,
      120,
      input.status === 'completed' ? 120 : null,
      null,
    ],
  )
}

async function insertRawPersonaTrainingIncrement(
  database: sqlite3.Database,
  input: {
    runId: string
    artifact: AlicizationPersonaTrainingArtifact
    state?: 'available' | 'rolled-back' | 'revoked'
  },
) {
  await runRaw(
    database,
    `
    INSERT INTO persona_training_increments (
      id, run_id, card_id, dataset_id, manifest_hash, source_ids_json,
      base_persona_revision, artifact_json, state, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      `persona-training-increment:${input.runId}`,
      input.runId,
      'card-a',
      `dataset-${input.runId}`,
      `manifest-${input.runId}`,
      `["source-${input.runId}"]`,
      'persona-core-v1',
      JSON.stringify(input.artifact),
      input.state ?? 'available',
      120,
    ],
  )
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

async function installFailingPersonaAuditTrigger(
  databasePath: string,
  input: {
    name: string
    action: string
  },
) {
  if (!/^\w+$/.test(input.name) || !/^[\w-]+$/.test(input.action))
    throw new Error('test audit trigger identifiers are invalid')
  const database = await openRawDatabase(databasePath)
  try {
    await runRaw(
      database,
      `
      CREATE TRIGGER ${input.name}
      BEFORE INSERT ON audit_logs
      WHEN NEW.category = 'persona-training' AND NEW.action = '${input.action}'
      BEGIN
        SELECT RAISE(ABORT, 'forced persona audit failure');
      END
      `,
    )
  }
  finally {
    await closeRawDatabase(database)
  }
}

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-persona-dataset-'))
  sandboxDirs.push(dir)
  return dir
}

async function createPersonaTrainingExecutable(root: string, body: string) {
  const path = join(root, 'fake-persona-trainer')
  await writeFile(path, `#!/usr/bin/env node\n${body}`, 'utf8')
  await chmod(path, 0o755)
  return path
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
        return { artifact: createPersonaTrainingArtifact(input.runId, 'artifact-production') }
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
            artifact: expect.objectContaining({
              artifactId: 'artifact-production',
              runId: incrementId.replace('persona-training-increment:', ''),
            }),
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
      expect(increments).toEqual([{ state: 'revoked' }])

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

  it('rolls back run completion and increment persistence when the completion audit cannot commit', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-atomic-completion'),
      }),
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'atomic-completion',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      await installFailingPersonaAuditTrigger(databasePath, {
        name: 'fail_persona_training_completed_audit',
        action: 'training-completed',
      })

      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })

      expect(result).toMatchObject({
        status: 'failed',
        reason: 'executor-failed',
      })
      await expect(db.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: result.runId,
      })).resolves.toMatchObject({
        status: 'failed',
        artifact: null,
      })
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([])
    }
    finally {
      await db.close()
    }

    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const events = await queryRawRows<{ action: string }>(
        rawDatabase,
        `
        SELECT action
        FROM audit_logs
        WHERE category = 'persona-training'
        ORDER BY created_at ASC, id ASC
        `,
      )
      expect(events.map(event => event.action)).not.toContain('training-completed')
      expect(events.map(event => event.action)).toContain('training-failed')
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('rejects completion when the persisted terminalizing run scope no longer matches the completion payload', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-scope-mismatch'),
      }),
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'completion-scope-mismatch',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(
          rawDatabase,
          `
          CREATE TRIGGER tamper_persona_terminalizing_scope
          AFTER UPDATE OF status ON persona_training_runs
          WHEN NEW.status = 'terminalizing'
          BEGIN
            UPDATE persona_training_runs
            SET dataset_id = 'dataset-tampered'
            WHERE run_id = NEW.run_id;
          END
          `,
        )
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })

      expect(result).toMatchObject({
        status: 'failed',
        reason: 'manifest-no-longer-usable',
      })
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([])
      await expect(db.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: result.runId,
      })).resolves.toMatchObject({
        status: 'failed',
        datasetId: 'dataset-tampered',
      })
    }
    finally {
      await db.close()
    }
  })

  it('rolls back source revoke, increment state, and audit together when governance persistence fails', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-source-revoke'),
      }),
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'atomic-source-revoke',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      expect(result.status).toBe('succeeded')
      const snapshotBefore = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      const sourceId = snapshotBefore.examples.find(example => example.datasetId === dataset.id)?.sourceId
      expect(sourceId).toBeTruthy()
      await installFailingPersonaAuditTrigger(databasePath, {
        name: 'fail_persona_increment_revoke_audit',
        action: 'training-increment-revoked',
      })

      await expect(db.revokePersonaTrainingDatasetSource({
        cardId: 'card-a',
        sourceId: sourceId!,
      })).rejects.toThrow('forced persona audit failure')

      const snapshotAfter = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      expect(snapshotAfter.examples.find(example => example.sourceId === sourceId)).toMatchObject({
        state: 'staged',
        allowTraining: true,
        revokedAt: null,
      })
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([
        expect.objectContaining({
          state: 'available',
        }),
      ])
    }
    finally {
      await db.close()
    }
  })

  it('persists and retries artifact cleanup after source revoke cleanup fails', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    let cleanupAvailable = false
    const discardArtifact = vi.fn(async () => {
      if (!cleanupAvailable)
        throw new Error('artifact cleanup unavailable')
    })
    const artifactLifecycle = {
      validateArtifact: vi.fn(async () => {}),
      discardArtifact,
      reconcileArtifacts: vi.fn(async () => {}),
    }
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-cleanup-retry'),
      }),
      personaTrainingArtifactLifecycle: artifactLifecycle,
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'cleanup-retry',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      await expect(db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })).resolves.toMatchObject({ status: 'succeeded' })
      const sourceId = (await db.getPersonaTrainingDataset({ cardId: 'card-a' }))
        .examples
        .find(example => example.datasetId === dataset.id)
        ?.sourceId
      expect(sourceId).toBeTruthy()

      await expect(db.revokePersonaTrainingDatasetSource({
        cardId: 'card-a',
        sourceId: sourceId!,
      })).rejects.toThrow('artifact cleanup unavailable')
    }
    finally {
      await db.close()
    }

    const failedDatabase = await openRawDatabase(databasePath)
    try {
      await expect(queryRawRows<{
        status: string
        attempts: number
        last_error: string | null
      }>(
        failedDatabase,
        `
        SELECT status, attempts, last_error
        FROM persona_training_artifact_cleanup_intents
        `,
      )).resolves.toEqual([
        {
          status: 'pending',
          attempts: 1,
          last_error: 'artifact cleanup unavailable',
        },
      ])
    }
    finally {
      await closeRawDatabase(failedDatabase)
    }

    cleanupAvailable = true
    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLifecycle: artifactLifecycle,
    })
    await recovered.close()

    const recoveredDatabase = await openRawDatabase(databasePath)
    try {
      await expect(queryRawRows<{
        status: string
        attempts: number
        last_error: string | null
      }>(
        recoveredDatabase,
        `
        SELECT status, attempts, last_error
        FROM persona_training_artifact_cleanup_intents
        `,
      )).resolves.toEqual([
        {
          status: 'completed',
          attempts: 2,
          last_error: null,
        },
      ])
      const auditEvents = await queryRawRows<{ action: string }>(
        recoveredDatabase,
        `
        SELECT action
        FROM audit_logs
        WHERE category = 'persona-training'
          AND action LIKE 'training-artifact-cleanup-%'
        ORDER BY created_at ASC, id ASC
        `,
      )
      expect(auditEvents.map(event => event.action)).toEqual([
        'training-artifact-cleanup-requested',
        'training-artifact-cleanup-completed',
      ])
    }
    finally {
      await closeRawDatabase(recoveredDatabase)
    }
    expect(discardArtifact).toHaveBeenCalledTimes(2)
  })

  it('persists orphan artifact recovery metadata reported by startup reconciliation', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const artifact = createPersonaTrainingArtifact('run-orphan-cleanup', 'artifact-orphan-cleanup')
    const reconcileArtifacts = vi.fn(async (input: any) => {
      await input.onOrphanCleanupFailure({
        artifact,
        error: new Error('orphan cleanup unavailable'),
      })
    })
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLifecycle: {
        validateArtifact: vi.fn(async () => {}),
        discardArtifact: vi.fn(async () => {}),
        reconcileArtifacts,
      },
    } as any)
    await db.close()

    const database = await openRawDatabase(join(userDataPath, 'alicizations', 'alicization.db'))
    try {
      await expect(queryRawRows<{
        card_id: string
        run_id: string
        artifact_id: string
        reason: string
        status: string
        last_error: string | null
      }>(
        database,
        `
        SELECT card_id, run_id, artifact_id, reason, status, last_error
        FROM persona_training_artifact_cleanup_intents
        `,
      )).resolves.toEqual([
        {
          card_id: 'default',
          run_id: 'run-orphan-cleanup',
          artifact_id: 'artifact-orphan-cleanup',
          reason: 'startup-orphan-artifact',
          status: 'pending',
          last_error: 'orphan cleanup unavailable',
        },
      ])
    }
    finally {
      await closeRawDatabase(database)
    }
  })

  it('rolls back dataset activation, increment state, and audit together when governance persistence fails', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-dataset-activation'),
      }),
    })
    try {
      const first = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'atomic-activation-first',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: first.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: first.id,
      })
      expect(result.status).toBe('succeeded')
      const second = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'atomic-activation-second',
      })
      await installFailingPersonaAuditTrigger(databasePath, {
        name: 'fail_persona_increment_rollback_audit',
        action: 'training-increment-rolled-back',
      })

      await expect(db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: second.id,
      })).rejects.toThrow('forced persona audit failure')

      const snapshot = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      expect(snapshot.activeVersionId).toBe(first.id)
      expect(snapshot.versions.find(version => version.id === first.id)?.activeAt).not.toBeNull()
      expect(snapshot.versions.find(version => version.id === second.id)?.activeAt).toBeNull()
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([
        expect.objectContaining({
          datasetId: first.id,
          state: 'available',
        }),
      ])
    }
    finally {
      await db.close()
    }
  })

  it('rolls back dataset rollback, increment state, and audit together when governance persistence fails', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-dataset-rollback'),
      }),
    })
    try {
      const first = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'atomic-rollback-first',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: first.id,
      })
      const second = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'atomic-rollback-second',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: second.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: second.id,
      })
      expect(result.status).toBe('succeeded')
      await installFailingPersonaAuditTrigger(databasePath, {
        name: 'fail_persona_increment_dataset_rollback_audit',
        action: 'training-increment-rolled-back',
      })

      await expect(db.rollbackPersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: first.id,
      })).rejects.toThrow('forced persona audit failure')

      const snapshot = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      expect(snapshot.activeVersionId).toBe(second.id)
      expect(snapshot.versions.find(version => version.id === first.id)?.activeAt).toBeNull()
      expect(snapshot.versions.find(version => version.id === second.id)?.activeAt).not.toBeNull()
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([
        expect.objectContaining({
          datasetId: second.id,
          state: 'available',
        }),
      ])
    }
    finally {
      await db.close()
    }
  })

  it('rolls back a manual increment state change when its audit cannot commit', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-manual-rollback'),
      }),
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'manual-increment-rollback',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      expect(result.status).toBe('succeeded')
      const incrementId = result.status === 'succeeded' ? result.increment.id : ''
      await installFailingPersonaAuditTrigger(databasePath, {
        name: 'fail_manual_persona_increment_rollback_audit',
        action: 'training-increment-rolled-back',
      })

      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId,
      })).rejects.toThrow('forced persona audit failure')

      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([
        expect.objectContaining({
          id: incrementId,
          state: 'available',
        }),
      ])
    }
    finally {
      await db.close()
    }
  })

  it('persists explicit cancellation and keeps the cancelled result out of increments', async () => {
    const userDataPath = await createSandboxUserDataPath()
    let resolveStarted!: () => void
    let resolveTraining!: (value: { artifact: AlicizationPersonaTrainingArtifact }) => void
    let runId = ''
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve
    })
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async (input) => {
        runId = input.runId
        resolveStarted()
        return await new Promise<{ artifact: AlicizationPersonaTrainingArtifact }>((resolve) => {
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
      })).resolves.toMatchObject({
        runId,
        status: 'cancel_requested',
        error: 'user-requested',
      })
      resolveTraining({ artifact: createPersonaTrainingArtifact(runId, 'artifact-must-not-be-used') })
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

  it('starts persona training asynchronously and exposes DB-backed progress and history', async () => {
    const userDataPath = await createSandboxUserDataPath()
    let finish!: () => void
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async (input) => {
        await input.onProgress?.({
          stage: 'training',
          progress: 0.45,
          message: 'local trainer running',
        })
        await new Promise<void>((resolve) => {
          finish = resolve
        })
        return { artifact: createPersonaTrainingArtifact(input.runId, 'artifact-async-db') }
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'async-db',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })

      const started = await db.startPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })

      expect(started.run).toMatchObject({
        status: 'queued',
        progress: 0,
      })
      await vi.waitFor(async () => {
        await expect(db.getPersonaTrainingRun({
          cardId: 'card-a',
          runId: started.run.runId,
        })).resolves.toMatchObject({
          status: 'running',
          stage: 'training',
          progress: 0.45,
        })
      })
      finish()
      await vi.waitFor(async () => {
        await expect(db.getPersonaTrainingRun({
          cardId: 'card-a',
          runId: started.run.runId,
        })).resolves.toMatchObject({
          status: 'completed',
          artifact: { artifactId: 'artifact-async-db' },
        })
      })
      await expect(db.listPersonaTrainingRuns({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          runId: started.run.runId,
          status: 'completed',
        }),
      ])
    }
    finally {
      await db.close()
    }
  })

  it('stops and awaits active persona training before closing the card database', async () => {
    const userDataPath = await createSandboxUserDataPath()
    let processExited = false
    let startedResolve!: () => void
    const processStarted = new Promise<void>((resolve) => {
      startedResolve = resolve
    })
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => await new Promise((_, reject) => {
        startedResolve()
        const abort = () => {
          setTimeout(() => {
            processExited = true
            reject(input.signal.reason)
          }, 10)
        }
        if (input.signal.aborted)
          abort()
        else
          input.signal.addEventListener('abort', abort, { once: true })
      }),
    })
    const dataset = await stageActivatablePersonaDataset(db, {
      cardId: 'card-a',
      sourceSuffix: 'close-active',
    })
    await db.activatePersonaTrainingDataset({
      cardId: 'card-a',
      datasetId: dataset.id,
    })
    const { run } = await db.startPersonaTraining({
      cardId: 'card-a',
      datasetId: dataset.id,
    })
    await processStarted

    await db.close()

    expect(processExited).toBe(true)
    const reopened = await setupAlicizationDb(userDataPath)
    try {
      await expect(reopened.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: run.runId,
      })).resolves.toMatchObject({
        status: 'interrupted',
        error: 'database-close',
      })
    }
    finally {
      await reopened.close()
    }
  })

  it('recovers stale queued and running persona jobs as interrupted after a crash', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await runRaw(
        rawDatabase,
        `
        INSERT INTO persona_training_runs (
          run_id, card_id, dataset_id, manifest_hash, source_ids_json,
          base_persona_revision, status, stage, progress, progress_message,
          failure_reason, config_snapshot_json, artifact_json, error,
          queued_at, started_at, updated_at, finished_at, cancellation_requested_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          'run-stale',
          'card-a',
          'dataset-stale',
          'manifest-stale',
          '[]',
          'persona-core-v1',
          'running',
          'training',
          0.5,
          null,
          null,
          null,
          null,
          null,
          100,
          110,
          120,
          null,
          null,
        ],
      )
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const recovered = await setupAlicizationDb(userDataPath)
    try {
      await expect(recovered.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: 'run-stale',
      })).resolves.toMatchObject({
        status: 'interrupted',
        failureReason: 'interrupted',
      })
    }
    finally {
      await recovered.close()
    }
  })

  it('revalidates persisted artifact integrity and rolls back a replaced inode on restart', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const artifact = createPersonaTrainingArtifact('run-replaced-inode', 'artifact-replaced-inode')
    const validateArtifact = vi.fn(async () => {
      throw new Error('persona training published artifact inode changed after publication')
    })
    const discardArtifact = vi.fn(async () => {})
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-replaced-inode',
        status: 'completed',
        artifact,
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId: 'run-replaced-inode',
        artifact,
      })
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLifecycle: {
        validateArtifact,
        discardArtifact,
        reconcileArtifacts: vi.fn(async () => {}),
      },
    } as any)
    try {
      expect(validateArtifact).toHaveBeenCalledWith(artifact)
      expect(discardArtifact).toHaveBeenCalledWith(artifact)
      await expect(recovered.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: 'run-replaced-inode',
      })).resolves.toMatchObject({
        status: 'interrupted',
        failureReason: 'interrupted',
        artifact: null,
      })
      await expect(recovered.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          id: 'persona-training-increment:run-replaced-inode',
          state: 'rolled-back',
        }),
      ])
    }
    finally {
      await recovered.close()
    }
  })

  it('aborts and force-terminates a real trainer when its source is revoked', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const cardRoot = join(userDataPath, 'alicizations', 'cards', 'card-a')
    const termMarker = join(userDataPath, 'trainer-sigterm')
    const readyMarker = join(userDataPath, 'trainer-ready')
    const pidMarker = join(userDataPath, 'trainer-pid')
    await mkdir(cardRoot, { recursive: true })
    const executable = await createPersonaTrainingExecutable(userDataPath, `
const fs = require('node:fs')
fs.writeFileSync(${JSON.stringify(pidMarker)}, String(process.pid))
process.on('SIGTERM', () => {
  fs.writeFileSync(${JSON.stringify(termMarker)}, 'SIGTERM')
})
process.stdout.write(JSON.stringify({ type: 'ready' }) + '\\n')
fs.writeFileSync(${JSON.stringify(readyMarker)}, 'READY')
process.stdout.write(JSON.stringify({ type: 'progress', progress: 0.25, message: 'training' }) + '\\n')
setInterval(() => {}, 1000)
`)
    const executor = createPersonaTrainingProcessExecutor({
      cardsRootDir: join(userDataPath, 'alicizations', 'cards'),
      cardRootDir: cardRoot,
      terminationGraceMs: 20,
    })
    const config = {
      executable,
      baseModel: 'base-model-v1',
      timeoutMs: 5_000,
    }
    const db = await setupAlicizationDb(userDataPath, {
      cardId: 'card-a',
      personaTrainingExecutor: async (input: PersonaTrainingExecutorInput) => await executor.execute(input, config),
      resolvePersonaTrainingExecutorConfig: () => config,
      personaTrainingArtifactLifecycle: executor,
    } as any)
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'real-source-revoke',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const sourceId = (await db.getPersonaTrainingDataset({ cardId: 'card-a' }))
        .examples
        .find(example => example.datasetId === dataset.id)
        ?.sourceId
      expect(sourceId).toBeTruthy()
      const { run } = await db.startPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      await vi.waitFor(() => expect(executor.activeProcessCount()).toBe(1))
      await vi.waitFor(async () => {
        await expect(readFile(readyMarker, 'utf8')).resolves.toBe('READY')
      }, { timeout: 5_000 })
      await vi.waitFor(async () => {
        await expect(db.getPersonaTrainingRun({
          cardId: 'card-a',
          runId: run.runId,
        })).resolves.toMatchObject({
          status: 'running',
          stage: 'training',
        })
      })

      await db.revokePersonaTrainingDatasetSource({
        cardId: 'card-a',
        sourceId: sourceId!,
      })

      await vi.waitFor(async () => {
        await expect(db.getPersonaTrainingRun({
          cardId: 'card-a',
          runId: run.runId,
        })).resolves.toMatchObject({
          status: 'failed',
          failureReason: 'source-revoked',
          artifact: null,
        })
      })
      await expect(readFile(termMarker, 'utf8')).resolves.toBe('SIGTERM')
      const childPid = Number(await readFile(pidMarker, 'utf8'))
      expect(() => process.kill(childPid, 0)).toThrow()
      expect(executor.activeProcessCount()).toBe(0)
      await expect(db.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([])
      await expect(readFile(join(cardRoot, 'persona-training', 'runs', run.runId, 'dataset.jsonl'), 'utf8')).rejects.toThrow()
    }
    finally {
      await db.close()
    }
  })

  it('reconciles interrupted finalization and inconsistent completed run artifacts after a crash', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-terminalizing',
        status: 'terminalizing',
        artifact: null,
      })
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-completed-missing',
        status: 'completed',
        artifact: createPersonaTrainingArtifact('run-completed-missing'),
      })
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-completed-mismatch',
        status: 'completed',
        artifact: createPersonaTrainingArtifact('run-completed-mismatch', 'artifact-run-side'),
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId: 'run-completed-mismatch',
        artifact: createPersonaTrainingArtifact('run-completed-mismatch', 'artifact-increment-side'),
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId: 'run-orphan',
        artifact: createPersonaTrainingArtifact('run-orphan'),
      })
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-valid',
        status: 'completed',
        artifact: createPersonaTrainingArtifact('run-valid'),
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId: 'run-valid',
        artifact: createPersonaTrainingArtifact('run-valid'),
      })
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const recovered = await setupAlicizationDb(userDataPath)
    try {
      for (const runId of [
        'run-terminalizing',
        'run-completed-missing',
        'run-completed-mismatch',
      ]) {
        await expect(recovered.getPersonaTrainingRun({
          cardId: 'card-a',
          runId,
        })).resolves.toMatchObject({
          status: 'interrupted',
          failureReason: 'interrupted',
        })
      }
      await expect(recovered.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: 'run-valid',
      })).resolves.toMatchObject({
        status: 'completed',
        artifact: expect.objectContaining({
          artifactId: 'artifact-run-valid',
        }),
      })
      const increments = await recovered.listPersonaTrainingIncrements({ cardId: 'card-a' })
      expect(increments).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'persona-training-increment:run-completed-mismatch',
          state: 'rolled-back',
        }),
        expect.objectContaining({
          id: 'persona-training-increment:run-orphan',
          state: 'rolled-back',
        }),
        expect.objectContaining({
          id: 'persona-training-increment:run-valid',
          state: 'available',
        }),
      ]))
    }
    finally {
      await recovered.close()
    }

    const auditDatabase = await openRawDatabase(databasePath)
    try {
      const events = await queryRawRows<{ action: string, payload_json: string }>(
        auditDatabase,
        `
        SELECT action, payload_json
        FROM audit_logs
        WHERE category = 'persona-training'
        ORDER BY created_at ASC, id ASC
        `,
      )
      expect(events.filter(event => event.action === 'training-interrupted')).toHaveLength(3)
      expect(events.filter(event => event.action === 'training-increment-rolled-back')).toHaveLength(2)
    }
    finally {
      await closeRawDatabase(auditDatabase)
    }
  })

  it('rejects legacy or malformed persisted artifacts before renderer-facing reads', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const rawDatabase = await openRawDatabase(databasePath)
    const invalidArtifact = JSON.stringify({
      artifactPath: '/tmp/legacy-persona-adapter.safetensors',
    })
    try {
      await runRaw(
        rawDatabase,
        `
        INSERT INTO persona_training_runs (
          run_id, card_id, dataset_id, manifest_hash, source_ids_json,
          base_persona_revision, status, stage, progress, progress_message,
          failure_reason, config_snapshot_json, artifact_json, error,
          queued_at, started_at, updated_at, finished_at, cancellation_requested_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          'run-invalid-artifact',
          'card-a',
          'dataset-invalid-artifact',
          'manifest-invalid-artifact',
          '["source-invalid-artifact"]',
          'persona-core-v1',
          'completed',
          'finalizing',
          1,
          null,
          null,
          null,
          invalidArtifact,
          null,
          100,
          110,
          120,
          120,
          null,
        ],
      )
      await runRaw(
        rawDatabase,
        `
        INSERT INTO persona_training_increments (
          id, run_id, card_id, dataset_id, manifest_hash, source_ids_json,
          base_persona_revision, artifact_json, state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          'persona-training-increment:run-invalid-artifact',
          'run-invalid-artifact',
          'card-a',
          'dataset-invalid-artifact',
          'manifest-invalid-artifact',
          '["source-invalid-artifact"]',
          'persona-core-v1',
          invalidArtifact,
          'available',
          120,
        ],
      )
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const reopened = await setupAlicizationDb(userDataPath)
    try {
      await expect(reopened.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: 'run-invalid-artifact',
      })).rejects.toThrow('invalid persisted persona training artifact')
      await expect(reopened.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).rejects.toThrow('invalid persisted persona training artifact')
    }
    finally {
      await reopened.close()
    }
  })

  it('rejects a schema-valid persisted artifact owned by a different training run', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const rawDatabase = await openRawDatabase(databasePath)
    const wrongOwnerArtifact = createPersonaTrainingArtifact('run-different-owner')
    try {
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-owner-mismatch',
        status: 'completed',
        artifact: wrongOwnerArtifact,
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId: 'run-owner-mismatch',
        artifact: wrongOwnerArtifact,
      })
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const reopened = await setupAlicizationDb(userDataPath)
    try {
      await expect(reopened.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: 'run-owner-mismatch',
      })).rejects.toThrow('does not match persisted owner')
      await expect(reopened.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).rejects.toThrow('does not match persisted owner')
    }
    finally {
      await reopened.close()
    }
  })

  it('normalizes legacy persisted executor snapshots without exposing fixed arguments', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-legacy-config',
        status: 'completed',
        artifact: createPersonaTrainingArtifact('run-legacy-config'),
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId: 'run-legacy-config',
        artifact: createPersonaTrainingArtifact('run-legacy-config'),
      })
      await runRaw(
        rawDatabase,
        `
        UPDATE persona_training_runs
        SET config_snapshot_json = ?
        WHERE run_id = ?
        `,
        [
          JSON.stringify({
            executable: '/tmp/persona-trainer',
            fixedArguments: ['--output-dir', '/tmp/outside'],
            baseModel: 'base-model-v1',
            timeoutMs: 60_000,
          }),
          'run-legacy-config',
        ],
      )
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const reopened = await setupAlicizationDb(userDataPath)
    try {
      const run = await reopened.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: 'run-legacy-config',
      })
      expect(run?.configSnapshot).toEqual({
        executable: '/tmp/persona-trainer',
        baseModel: 'base-model-v1',
        timeoutMs: 60_000,
      })
      expect(run?.configSnapshot).not.toHaveProperty('fixedArguments')
    }
    finally {
      await reopened.close()
    }
  })
})
