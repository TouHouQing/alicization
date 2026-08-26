import type {
  AlicizationPersonaTrainingArtifact,
  AlicizationPersonaTrainingSourceRef,
} from '@proj-alicization/stage-shared'

import type {
  PersonaTrainingDatasetExample,
  PersonaTrainingDatasetVersion,
} from './persona-training-dataset-runtime'
import type { PersonaTrainingExecutorInput } from './persona-training-pipeline-gate'

import { createHash } from 'node:crypto'
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { buildPersonaTrainingDatasetManifest } from './persona-training-dataset-runtime'
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

function createActivePersonaTrainingArtifact(
  runId: string,
  artifactId = `artifact-${runId}`,
  receiptId = `receipt-${runId}`,
): AlicizationPersonaTrainingArtifact {
  return {
    ...createPersonaTrainingArtifact(runId, artifactId),
    activation: {
      status: 'active',
      reason: 'Loaded before the process restart.',
      loaderId: 'persisted-loader',
      receiptId,
      activatedAt: 150,
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

interface RawPersonaTrainingScope {
  datasetId: string
  manifestHash: string
  sourceRefs: AlicizationPersonaTrainingSourceRef[]
}

function personaTrainingContentHashForTest(input: Pick<
  PersonaTrainingDatasetExample,
  'schemaVersion' | 'behaviorLesson' | 'positiveExample' | 'negativeExample' | 'sourceKind'
>) {
  return createHash('sha256')
    .update(JSON.stringify({
      schemaVersion: input.schemaVersion,
      behaviorLesson: input.behaviorLesson,
      negativeExample: input.negativeExample,
      positiveExample: input.positiveExample,
      sourceKind: input.sourceKind,
    }))
    .digest('hex')
}

function personaTrainingActivationOperationIdForTest(input: {
  cardId: string
  runId: string
  incrementId: string
  artifactId: string
  mode: 'initial' | 'restart'
  expectedReceiptId?: string | null
}) {
  const base = [
    'persona-training-artifact-activation',
    input.cardId,
    input.runId,
    input.incrementId,
    input.artifactId,
    input.mode,
  ].map(encodeURIComponent).join(':')
  const cycle = input.mode === 'restart'
    ? `:${encodeURIComponent(input.expectedReceiptId?.trim() || 'no-receipt')}`
    : ''
  return `${base}${cycle}:load`
}

function personaTrainingCleanupIntentIdForTest(input: {
  cardId: string
  runId: string
  incrementId: string | null
  artifactId: string
}) {
  return [
    'persona-training-artifact-cleanup',
    input.cardId,
    input.runId,
    input.incrementId ?? 'orphan',
    input.artifactId,
  ].map(encodeURIComponent).join(':')
}

async function insertRawEligiblePersonaTrainingScope(
  database: sqlite3.Database,
  runId: string,
): Promise<RawPersonaTrainingScope> {
  const dataset = {
    id: `dataset-${runId}`,
    cardId: 'card-a',
    version: [...runId].reduce((sum, character) => sum + character.charCodeAt(0), 1),
    schemaVersion: 'persona-training-dataset-v1',
    consentSnapshot: {
      granted: true,
      policyVersion: 'persona-training-consent-v1',
      scope: 'persona-dataset',
      capturedAt: 90,
    },
    createdAt: 90,
    exportedAt: 100,
    activeAt: 100,
    rolledBackAt: null,
  } satisfies PersonaTrainingDatasetVersion
  const exampleInput = {
    id: `example-${runId}`,
    datasetId: dataset.id,
    cardId: dataset.cardId,
    schemaVersion: 'persona-training-example-v1',
    sourceId: `source-${runId}`,
    sourceKind: 'cleaned-long-term-reflection',
    behaviorLesson: '重启后只加载仍有资格的人格增量。',
    positiveExample: '我会先核对数据集和来源资格，再恢复人格增量。',
    negativeExample: null,
    sensitivity: 'personal',
    piiStatus: 'clear',
    piiReason: null,
    consentSnapshot: dataset.consentSnapshot,
    provenance: {
      kind: 'working-memory-cleaning',
      cleaningTransactionId: `cleaning-${runId}`,
      cleanedAt: 95,
    },
    allowTraining: true,
    state: 'staged',
    createdAt: 95,
    revokedAt: null,
  } satisfies Omit<PersonaTrainingDatasetExample, 'contentHash'>
  const example = {
    ...exampleInput,
    contentHash: personaTrainingContentHashForTest(exampleInput),
  } satisfies PersonaTrainingDatasetExample
  const manifest = buildPersonaTrainingDatasetManifest({
    dataset,
    examples: [example],
    exportedAt: 100,
  })
  await runRaw(
    database,
    `
    INSERT INTO persona_training_datasets (
      id, card_id, version, schema_version, consent_snapshot_json,
      created_at, exported_at, active_at, rolled_back_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      dataset.id,
      dataset.cardId,
      dataset.version,
      dataset.schemaVersion,
      JSON.stringify(dataset.consentSnapshot),
      dataset.createdAt,
      dataset.exportedAt,
      dataset.activeAt,
      dataset.rolledBackAt,
    ],
  )
  await runRaw(
    database,
    `
    INSERT INTO persona_training_dataset_examples (
      id, dataset_id, card_id, schema_version, source_id, source_kind,
      content_hash, behavior_lesson, positive_example, negative_example,
      sensitivity, pii_status, pii_reason, consent_snapshot_json, provenance_json,
      allow_training, state, created_at, revoked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      example.id,
      example.datasetId,
      example.cardId,
      example.schemaVersion,
      example.sourceId,
      example.sourceKind,
      example.contentHash,
      example.behaviorLesson,
      example.positiveExample,
      example.negativeExample,
      example.sensitivity,
      example.piiStatus,
      example.piiReason,
      JSON.stringify(example.consentSnapshot),
      JSON.stringify(example.provenance),
      1,
      example.state,
      example.createdAt,
      example.revokedAt,
    ],
  )
  return {
    datasetId: dataset.id,
    manifestHash: manifest.manifestHash,
    sourceRefs: manifest.examples.map(item => ({
      sourceId: item.sourceId,
      sourceKind: item.sourceKind,
    })),
  }
}

async function insertRawPersonaTrainingRun(
  database: sqlite3.Database,
  input: {
    runId: string
    status: string
    artifact: AlicizationPersonaTrainingArtifact | null
    scope?: RawPersonaTrainingScope
  },
) {
  const scope = input.scope ?? {
    datasetId: `dataset-${input.runId}`,
    manifestHash: `manifest-${input.runId}`,
    sourceRefs: [{
      sourceId: `source-${input.runId}`,
      sourceKind: 'cleaned-long-term-reflection',
    }],
  }
  await runRaw(
    database,
    `
    INSERT INTO persona_training_runs (
      run_id, card_id, dataset_id, manifest_hash, source_refs_json,
      base_persona_revision, status, stage, progress, progress_message,
      failure_reason, config_snapshot_json, artifact_json, error,
      queued_at, started_at, updated_at, finished_at, cancellation_requested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.runId,
      'card-a',
      scope.datasetId,
      scope.manifestHash,
      JSON.stringify(scope.sourceRefs),
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
    scope?: RawPersonaTrainingScope
  },
) {
  const scope = input.scope ?? {
    datasetId: `dataset-${input.runId}`,
    manifestHash: `manifest-${input.runId}`,
    sourceRefs: [{
      sourceId: `source-${input.runId}`,
      sourceKind: 'cleaned-long-term-reflection',
    }],
  }
  await runRaw(
    database,
    `
    INSERT INTO persona_training_increments (
      id, run_id, card_id, dataset_id, manifest_hash, source_refs_json,
      base_persona_revision, artifact_json, state, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      `persona-training-increment:${input.runId}`,
      input.runId,
      'card-a',
      scope.datasetId,
      scope.manifestHash,
      JSON.stringify(scope.sourceRefs),
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
  it('keeps same-id reflection and reinforcement examples distinct when revoking one source kind', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath)
    const consent = {
      granted: true,
      policyVersion: 'persona-training-consent-v1',
      scope: 'persona-dataset',
    }
    try {
      const dataset = await db.stagePersonaTrainingDataset({
        cardId: 'card-a',
        consent,
      })
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        for (const [index, sourceKind] of [
          'cleaned-long-term-reflection',
          'persona-reinforcement',
        ].entries()) {
          const exampleInput = {
            id: `example-composite-${index}`,
            datasetId: dataset.id,
            cardId: 'card-a',
            schemaVersion: 'persona-training-example-v1',
            sourceId: 'shared-source',
            sourceKind,
            behaviorLesson: `复合来源 ${sourceKind} 保持独立。`,
            positiveExample: `只处理 ${sourceKind} 的来源。`,
            negativeExample: null,
            sensitivity: 'personal',
            piiStatus: 'clear' as const,
            piiReason: null,
            consentSnapshot: { ...dataset.consentSnapshot },
            provenance: {
              kind: 'working-memory-cleaning' as const,
              cleaningTransactionId: `cleaning-composite-${index}`,
              cleanedAt: 10 + index,
            },
            allowTraining: true,
            state: 'staged' as const,
            createdAt: 20 + index,
            revokedAt: null,
          }
          await runRaw(
            rawDatabase,
            `
            INSERT INTO persona_training_dataset_examples (
              id, dataset_id, card_id, schema_version, source_id, source_kind,
              content_hash, behavior_lesson, positive_example, negative_example,
              sensitivity, pii_status, pii_reason, consent_snapshot_json, provenance_json,
              allow_training, state, created_at, revoked_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              exampleInput.id,
              exampleInput.datasetId,
              exampleInput.cardId,
              exampleInput.schemaVersion,
              exampleInput.sourceId,
              exampleInput.sourceKind,
              personaTrainingContentHashForTest(exampleInput as PersonaTrainingDatasetExample),
              exampleInput.behaviorLesson,
              exampleInput.positiveExample,
              exampleInput.negativeExample,
              exampleInput.sensitivity,
              exampleInput.piiStatus,
              exampleInput.piiReason,
              JSON.stringify(exampleInput.consentSnapshot),
              JSON.stringify(exampleInput.provenance),
              1,
              exampleInput.state,
              exampleInput.createdAt,
              exampleInput.revokedAt,
            ],
          )
        }
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await expect(db.revokePersonaTrainingDatasetSource({
        cardId: 'card-a',
        sourceId: 'shared-source',
        sourceKind: 'cleaned-long-term-reflection',
      })).resolves.toEqual({ affected: 1 })

      const examples = (await db.getPersonaTrainingDataset({ cardId: 'card-a' })).examples
      expect(examples).toEqual(expect.arrayContaining([
        expect.objectContaining({
          sourceId: 'shared-source',
          sourceKind: 'cleaned-long-term-reflection',
          state: 'revoked',
        }),
        expect.objectContaining({
          sourceId: 'shared-source',
          sourceKind: 'persona-reinforcement',
          state: 'staged',
        }),
      ]))
    }
    finally {
      await db.close()
    }
  })

  it('keeps a same-id reinforcement increment available when only the reflection source is revoked', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const discardArtifact = vi.fn(async () => {})
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-reinforcement-only'),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
    })
    const consent = {
      granted: true,
      policyVersion: 'persona-training-consent-v1',
      scope: 'persona-dataset',
    }
    try {
      const dataset = await db.stagePersonaTrainingDataset({
        cardId: 'card-a',
        consent,
      })
      const reinforcementInput = {
        id: 'example-reinforcement-only',
        datasetId: dataset.id,
        cardId: 'card-a',
        schemaVersion: 'persona-training-example-v1',
        sourceId: 'shared-artifact-source',
        sourceKind: 'persona-reinforcement' as const,
        behaviorLesson: '人格强化来源必须按 kind 独立治理。',
        positiveExample: '只由人格强化来源训练这个增量。',
        negativeExample: null,
        sensitivity: 'personal',
        piiStatus: 'clear' as const,
        piiReason: null,
        consentSnapshot: { ...dataset.consentSnapshot },
        provenance: {
          kind: 'working-memory-cleaning' as const,
          cleaningTransactionId: 'cleaning-reinforcement-only',
          cleanedAt: 10,
        },
        allowTraining: true,
        state: 'staged' as const,
        createdAt: 20,
        revokedAt: null,
      }
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(
          rawDatabase,
          `
          INSERT INTO persona_training_dataset_examples (
            id, dataset_id, card_id, schema_version, source_id, source_kind,
            content_hash, behavior_lesson, positive_example, negative_example,
            sensitivity, pii_status, pii_reason, consent_snapshot_json, provenance_json,
            allow_training, state, created_at, revoked_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            reinforcementInput.id,
            reinforcementInput.datasetId,
            reinforcementInput.cardId,
            reinforcementInput.schemaVersion,
            reinforcementInput.sourceId,
            reinforcementInput.sourceKind,
            personaTrainingContentHashForTest(reinforcementInput),
            reinforcementInput.behaviorLesson,
            reinforcementInput.positiveExample,
            reinforcementInput.negativeExample,
            reinforcementInput.sensitivity,
            reinforcementInput.piiStatus,
            reinforcementInput.piiReason,
            JSON.stringify(reinforcementInput.consentSnapshot),
            JSON.stringify(reinforcementInput.provenance),
            1,
            reinforcementInput.state,
            reinforcementInput.createdAt,
            reinforcementInput.revokedAt,
          ],
        )
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      await expect(db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })).resolves.toMatchObject({
        status: 'succeeded',
        increment: {
          sourceRefs: [{
            sourceId: 'shared-artifact-source',
            sourceKind: 'persona-reinforcement',
          }],
        },
      })

      const reflectionInput = {
        ...reinforcementInput,
        id: 'example-reflection-same-id',
        sourceKind: 'cleaned-long-term-reflection' as const,
        behaviorLesson: '长期反思来源独立撤销。',
        positiveExample: '只撤销长期反思来源。',
        provenance: {
          ...reinforcementInput.provenance,
          cleaningTransactionId: 'cleaning-reflection-same-id',
        },
        createdAt: 30,
      }
      const rawDatabaseAfterTraining = await openRawDatabase(databasePath)
      try {
        await runRaw(
          rawDatabaseAfterTraining,
          `
          INSERT INTO persona_training_dataset_examples (
            id, dataset_id, card_id, schema_version, source_id, source_kind,
            content_hash, behavior_lesson, positive_example, negative_example,
            sensitivity, pii_status, pii_reason, consent_snapshot_json, provenance_json,
            allow_training, state, created_at, revoked_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            reflectionInput.id,
            reflectionInput.datasetId,
            reflectionInput.cardId,
            reflectionInput.schemaVersion,
            reflectionInput.sourceId,
            reflectionInput.sourceKind,
            personaTrainingContentHashForTest(reflectionInput),
            reflectionInput.behaviorLesson,
            reflectionInput.positiveExample,
            reflectionInput.negativeExample,
            reflectionInput.sensitivity,
            reflectionInput.piiStatus,
            reflectionInput.piiReason,
            JSON.stringify(reflectionInput.consentSnapshot),
            JSON.stringify(reflectionInput.provenance),
            1,
            reflectionInput.state,
            reflectionInput.createdAt,
            reflectionInput.revokedAt,
          ],
        )
      }
      finally {
        await closeRawDatabase(rawDatabaseAfterTraining)
      }

      await expect(db.revokePersonaTrainingDatasetSource({
        cardId: 'card-a',
        sourceId: 'shared-artifact-source',
        sourceKind: 'cleaned-long-term-reflection',
      })).resolves.toEqual({ affected: 1 })
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([
        expect.objectContaining({
          state: 'available',
          sourceRefs: [{
            sourceId: 'shared-artifact-source',
            sourceKind: 'persona-reinforcement',
          }],
        }),
      ])
      expect(discardArtifact).not.toHaveBeenCalled()
    }
    finally {
      await db.close()
    }
  })

  it('migrates legacy sourceIds-only persona lifecycle tables without guessing source kinds', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databaseDir = join(userDataPath, 'alicizations')
    const databasePath = join(databaseDir, 'alicization.db')
    await mkdir(databaseDir, { recursive: true })
    const legacyDatabase = await openRawDatabase(databasePath)
    try {
      await runRaw(legacyDatabase, `
        CREATE TABLE persona_training_runs (
          run_id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          dataset_id TEXT NOT NULL,
          manifest_hash TEXT NOT NULL,
          source_ids_json TEXT NOT NULL,
          base_persona_revision TEXT NOT NULL,
          status TEXT NOT NULL,
          stage TEXT NOT NULL DEFAULT 'writing-input',
          progress REAL NOT NULL DEFAULT 0,
          progress_message TEXT,
          failure_reason TEXT,
          config_snapshot_json TEXT,
          artifact_json TEXT,
          error TEXT,
          queued_at INTEGER NOT NULL DEFAULT 0,
          started_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL DEFAULT 0,
          finished_at INTEGER,
          cancellation_requested_at INTEGER
        )
      `)
      await runRaw(legacyDatabase, `
        CREATE TABLE persona_training_increments (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL UNIQUE,
          card_id TEXT NOT NULL,
          dataset_id TEXT NOT NULL,
          manifest_hash TEXT NOT NULL,
          source_ids_json TEXT NOT NULL,
          base_persona_revision TEXT NOT NULL,
          artifact_json TEXT,
          state TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `)
      await runRaw(legacyDatabase, `
        CREATE TABLE audit_logs (
          id TEXT PRIMARY KEY,
          level TEXT NOT NULL,
          category TEXT NOT NULL,
          action TEXT NOT NULL,
          message TEXT NOT NULL,
          payload_json TEXT,
          created_at INTEGER NOT NULL
        )
      `)
      await runRaw(legacyDatabase, `
        INSERT INTO persona_training_runs (
          run_id, card_id, dataset_id, manifest_hash, source_ids_json,
          base_persona_revision, status, stage, progress, progress_message,
          failure_reason, config_snapshot_json, artifact_json, error,
          queued_at, started_at, updated_at, finished_at, cancellation_requested_at
        ) VALUES (
          'legacy-run', 'card-a', 'legacy-dataset', 'legacy-manifest', '["shared-source"]',
          'persona-revision-1', 'failed', 'training', 0.4, 'legacy progress',
          'provider-failed', NULL, NULL, 'legacy failure', 1, 2, 3, 4, NULL
        )
      `)
      await runRaw(legacyDatabase, `
        INSERT INTO persona_training_increments (
          id, run_id, card_id, dataset_id, manifest_hash, source_ids_json,
          base_persona_revision, artifact_json, state, created_at
        ) VALUES (
          'legacy-increment', 'legacy-run', 'card-a', 'legacy-dataset',
          'legacy-manifest', '["shared-source"]', 'persona-revision-1',
          NULL, 'revoked', 5
        )
      `)
      await runRaw(
        legacyDatabase,
        `INSERT INTO audit_logs VALUES ('legacy-audit', 'notice', 'persona-training',
          'training-started', 'legacy', '{"sourceIds":["shared-source"]}', 1)`,
      )
    }
    finally {
      await closeRawDatabase(legacyDatabase)
    }

    const migrated = await setupAlicizationDb(userDataPath)
    await migrated.close()

    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const runColumns = await queryRawRows<{ name: string }>(
        rawDatabase,
        'PRAGMA table_info(persona_training_runs)',
      )
      const incrementColumns = await queryRawRows<{ name: string }>(
        rawDatabase,
        'PRAGMA table_info(persona_training_increments)',
      )
      expect(runColumns.map(column => column.name)).toContain('source_refs_json')
      expect(runColumns.map(column => column.name)).toContain('source_ids_json')
      expect(incrementColumns.map(column => column.name)).toContain('source_refs_json')
      expect(incrementColumns.map(column => column.name)).toContain('source_ids_json')
      await expect(queryRawRows<{ count: number }>(
        rawDatabase,
        `
        SELECT COUNT(*) AS count FROM persona_training_runs
        UNION ALL SELECT COUNT(*) FROM persona_training_increments
        UNION ALL SELECT COUNT(*) FROM persona_training_artifact_activation_intents
        UNION ALL SELECT COUNT(*) FROM persona_training_artifact_cleanup_intents
        UNION ALL SELECT COUNT(*) FROM audit_logs WHERE category = 'persona-training'
        `,
      )).resolves.toEqual([
        { count: 1 },
        { count: 1 },
        { count: 0 },
        { count: 0 },
        { count: 1 },
      ])
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('recovers pending source revoke intents on startup and exposes failed intents for manual retry', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()

    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await runRaw(rawDatabase, `
        INSERT INTO persona_training_source_revoke_intents (
          id, card_id, source_id, source_kind, reason, status, attempts,
          last_error, created_at, updated_at, completed_at
        ) VALUES
          ('revoke-pending', 'card-a', 'pending-source', 'cleaned-long-term-reflection',
           'startup recovery', 'pending', 0, NULL, 10, 10, NULL),
          ('revoke-failed', 'card-a', 'failed-source', 'persona-reinforcement',
           'manual retry', 'failed', 1, 'provider unavailable', 10, 11, NULL)
      `)
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const reopened = await setupAlicizationDb(userDataPath)
    try {
      await expect(reopened.listPersonaTrainingSourceRevokeIntents({
        cardId: 'card-a',
        status: 'all',
      })).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'revoke-pending',
          status: 'completed',
          attempts: 1,
          lastError: null,
        }),
        expect.objectContaining({
          id: 'revoke-failed',
          status: 'failed',
          attempts: 1,
          lastError: 'provider unavailable',
        }),
      ]))

      await expect(reopened.retryPersonaTrainingSourceRevokeIntent({
        cardId: 'card-a',
        intentId: 'revoke-failed',
      })).resolves.toMatchObject({
        id: 'revoke-failed',
        status: 'completed',
        attempts: 2,
        lastError: null,
      })
    }
    finally {
      await reopened.close()
    }
  })

  it('persists a failed state when revoke intent completion cannot be committed', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()

    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await runRaw(rawDatabase, `
        INSERT INTO persona_training_source_revoke_intents (
          id, card_id, source_id, source_kind, reason, status, attempts,
          last_error, created_at, updated_at, completed_at
        ) VALUES (
          'revoke-completion-failure', 'card-a', 'completion-failure',
          'cleaned-long-term-reflection', 'test failure', 'pending', 0,
          NULL, 10, 10, NULL
        )
      `)
      await runRaw(rawDatabase, `
        CREATE TRIGGER fail_revoke_intent_completion
        BEFORE UPDATE OF status ON persona_training_source_revoke_intents
        WHEN NEW.status = 'completed'
        BEGIN
          SELECT RAISE(ABORT, 'forced revoke completion failure');
        END
      `)
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const reopened = await setupAlicizationDb(userDataPath)
    try {
      await expect(reopened.retryPersonaTrainingSourceRevokeIntent({
        cardId: 'card-a',
        intentId: 'revoke-completion-failure',
      })).rejects.toThrow('forced revoke completion failure')
      await expect(reopened.listPersonaTrainingSourceRevokeIntents({
        cardId: 'card-a',
        status: 'failed',
      })).resolves.toEqual([
        expect.objectContaining({
          id: 'revoke-completion-failure',
          status: 'failed',
          attempts: 2,
          lastError: expect.stringContaining('forced revoke completion failure'),
        }),
      ])
    }
    finally {
      await reopened.close()
    }
  })

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
    let sourceRef: AlicizationPersonaTrainingSourceRef | null = null
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
      const source = snapshot.examples.find(example => example.datasetId === dataset.id)
      sourceRef = source
        ? { sourceId: source.sourceId, sourceKind: source.sourceKind }
        : null
      expect(sourceRef).toBeTruthy()
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
      const reopened = await setupAlicizationDb(userDataPath, {
        personaTrainingArtifactLifecycle: {
          validateArtifact: async () => {},
          discardArtifact: async () => {},
        },
      })
      try {
        const persisted = await reopened.listPersonaTrainingIncrements({ cardId: 'card-a' })
        expect(persisted).toEqual([
          expect.objectContaining({
            id: incrementId,
            state: 'available',
            sourceRefs: expect.arrayContaining([
              expect.objectContaining({
                sourceId: sourceRef!.sourceId,
                sourceKind: sourceRef!.sourceKind,
              }),
            ]),
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
          ...sourceRef!,
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

      const auditEvents = await queryRawRows<{ action: string, payload_json: string | null }>(
        rawDatabase,
        `
        SELECT action, payload_json
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
        'training-artifact-cleanup-requested',
        'training-artifact-cleanup-completed',
      ].sort())
      const trainingStartedPayload = JSON.parse(
        auditEvents.find(event => event.action === 'training-started')?.payload_json ?? '{}',
      )
      expect(trainingStartedPayload).toMatchObject({
        sourceRefs: expect.arrayContaining([
          expect.objectContaining(sourceRef!),
        ]),
      })
      expect(trainingStartedPayload).not.toHaveProperty('sourceIds')
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('persists a real loader receipt and unloads the active adapter before artifact rollback cleanup', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const lifecycle: string[] = []
    const load = vi.fn(async () => {
      lifecycle.push('load')
      return {
        loaderId: 'db-test-loader',
        receiptId: 'db-test-receipt',
        activatedAt: 250,
      }
    })
    const unload = vi.fn(async () => {
      lifecycle.push('unload')
    })
    const discardArtifact = vi.fn(async () => {
      lifecycle.push('discard')
    })
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-loader-backed-db'),
      }),
      personaTrainingArtifactLoader: {
        load,
        unload,
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'loader-backed-db',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const incrementId = result.status === 'succeeded' ? result.increment.id : ''
      const activationOperationId = personaTrainingActivationOperationIdForTest({
        cardId: 'card-a',
        runId: result.runId,
        incrementId,
        artifactId: 'artifact-loader-backed-db',
        mode: 'initial',
      })
      expect(result).toMatchObject({
        status: 'succeeded',
        increment: {
          artifact: {
            activation: {
              status: 'active',
              loaderId: 'db-test-loader',
              receiptId: 'db-test-receipt',
              activatedAt: 250,
            },
          },
        },
      })
      expect(load).toHaveBeenCalledWith(expect.objectContaining({
        operationId: activationOperationId,
      }))
      const activationDatabase = await openRawDatabase(databasePath)
      try {
        await expect(queryRawRows<{
          status: string
          stage: string
          load_operation_id: string
          loader_receipt_json: string
        }>(
          activationDatabase,
          `
          SELECT status, stage, load_operation_id, loader_receipt_json
          FROM persona_training_artifact_activation_intents
          `,
        )).resolves.toEqual([{
          status: 'completed',
          stage: 'loaded',
          load_operation_id: activationOperationId,
          loader_receipt_json: expect.stringContaining('db-test-receipt'),
        }])
      }
      finally {
        await closeRawDatabase(activationDatabase)
      }
      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId,
      })).resolves.toMatchObject({
        state: 'rolled-back',
      })
      expect(load).toHaveBeenCalledOnce()
      expect(unload).toHaveBeenCalledOnce()
      expect(lifecycle).toEqual(['load', 'unload', 'discard'])
    }
    finally {
      await db.close()
    }
  })

  it('durably hands a loaded adapter to cleanup when training completion rolls back', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const unload = vi.fn(async () => {})
    const discardArtifact = vi.fn(async () => {})
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-loaded-completion-rollback'),
      }),
      personaTrainingArtifactLoader: {
        load: async () => ({
          loaderId: 'db-test-loader',
          receiptId: 'receipt-loaded-completion-rollback',
          activatedAt: 250,
        }),
        unload,
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'loaded-completion-rollback',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      await installFailingPersonaAuditTrigger(databasePath, {
        name: 'fail_loaded_completion_audit',
        action: 'training-completed',
      })

      await expect(db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })).resolves.toMatchObject({
        status: 'failed',
        error: expect.stringContaining('forced persona audit failure'),
      })
      expect(unload).toHaveBeenCalledWith(expect.objectContaining({
        receipt: expect.objectContaining({
          receiptId: 'receipt-loaded-completion-rollback',
        }),
      }))
      expect(discardArtifact).toHaveBeenCalledOnce()
      await expect(db.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([])
    }
    finally {
      await db.close()
    }

    const persistedDatabase = await openRawDatabase(databasePath)
    try {
      await expect(queryRawRows<{
        stage: string
        status: string
      }>(
        persistedDatabase,
        `
        SELECT stage, status
        FROM persona_training_artifact_activation_intents
        `,
      )).resolves.toEqual([{
        stage: 'loaded',
        status: 'completed',
      }])
      await expect(queryRawRows<{
        stage: string
        status: string
      }>(
        persistedDatabase,
        `
        SELECT stage, status
        FROM persona_training_artifact_cleanup_intents
        `,
      )).resolves.toEqual([{
        stage: 'finalize',
        status: 'completed',
      }])
    }
    finally {
      await closeRawDatabase(persistedDatabase)
    }
  })

  it('replays one idempotent load operation after crashing before receipt persistence', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const acceptedOperations = new Map<string, {
      loaderId: string
      receiptId: string
      activatedAt: number
    }>()
    let semanticLoadCount = 0
    let preparedIntentObserved = false
    const load = vi.fn(async (input: { operationId: string }) => {
      const observationDatabase = await openRawDatabase(databasePath)
      try {
        const rows = await queryRawRows<{ stage: string, status: string }>(
          observationDatabase,
          `
          SELECT stage, status
          FROM persona_training_artifact_activation_intents
          WHERE load_operation_id = ?
          `,
          [input.operationId],
        )
        preparedIntentObserved ||= rows.some(row =>
          row.stage === 'prepared' && row.status === 'pending',
        )
      }
      finally {
        await closeRawDatabase(observationDatabase)
      }
      const existing = acceptedOperations.get(input.operationId)
      if (existing)
        return existing
      semanticLoadCount += 1
      const receipt = {
        loaderId: 'idempotent-loader',
        receiptId: 'receipt-after-load-crash',
        activatedAt: 250,
      }
      acceptedOperations.set(input.operationId, receipt)
      return receipt
    })
    const unload = vi.fn(async () => {})
    const discardArtifact = vi.fn(async () => {})
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-load-crash-window'),
      }),
      personaTrainingArtifactLoader: { load, unload },
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'load-crash-window',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const triggerDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(triggerDatabase, `
          CREATE TRIGGER fail_activation_receipt_persist
          BEFORE UPDATE OF loader_receipt_json ON persona_training_artifact_activation_intents
          WHEN NEW.loader_receipt_json IS NOT NULL
          BEGIN
            SELECT RAISE(ABORT, 'simulated crash before activation receipt persistence');
          END
        `)
      }
      finally {
        await closeRawDatabase(triggerDatabase)
      }

      await expect(db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })).resolves.toMatchObject({
        status: 'failed',
        error: expect.stringContaining('pending recovery'),
      })
    }
    finally {
      await db.close()
    }

    const repairDatabase = await openRawDatabase(databasePath)
    try {
      await runRaw(repairDatabase, 'DROP TRIGGER fail_activation_receipt_persist')
    }
    finally {
      await closeRawDatabase(repairDatabase)
    }
    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: { load, unload },
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
    })
    await recovered.close()

    expect(preparedIntentObserved).toBe(true)
    expect(load).toHaveBeenCalledTimes(2)
    expect(load.mock.calls[0]?.[0].operationId).toBe(load.mock.calls[1]?.[0].operationId)
    expect(semanticLoadCount).toBe(1)
    expect(unload).toHaveBeenCalledOnce()
    expect(discardArtifact).toHaveBeenCalledOnce()
    const persistedDatabase = await openRawDatabase(databasePath)
    try {
      await expect(queryRawRows<{
        status: string
        stage: string
        loader_receipt_json: string
      }>(
        persistedDatabase,
        `
        SELECT status, stage, loader_receipt_json
        FROM persona_training_artifact_activation_intents
        `,
      )).resolves.toEqual([
        expect.objectContaining({
          status: 'completed',
          stage: 'loaded',
          loader_receipt_json: expect.stringContaining('receipt-after-load-crash'),
        }),
      ])
    }
    finally {
      await closeRawDatabase(persistedDatabase)
    }
  })

  it('rejects database setup when an artifact loader has no lifecycle owner', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')

    await expect(setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: {
        load: async () => ({
          loaderId: 'db-test-loader',
          receiptId: 'receipt-without-lifecycle',
          activatedAt: 250,
        }),
        unload: async () => {},
      },
    })).rejects.toThrow('artifactLoader requires artifactLifecycle')
    await expect(access(databasePath)).rejects.toThrow()
  })

  it('keeps an increment available but explicitly cleanup-pending when lifecycle discard is unavailable', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-no-lifecycle-cleanup'),
      }),
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'no-lifecycle-cleanup',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const incrementId = result.status === 'succeeded' ? result.increment.id : ''

      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId,
      })).rejects.toThrow('artifact lifecycle is unavailable')
      await expect(db.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          id: incrementId,
          state: 'available',
          cleanup: {
            status: 'pending',
            stage: 'discard',
            lastError: 'persona training artifact lifecycle is unavailable for discard',
          },
        }),
      ])
    }
    finally {
      await db.close()
    }
  })

  it('persists cleanup stage and resumes discard after a database restart without unloading twice', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const unload = vi.fn(async () => {})
    const discardArtifact = vi.fn()
      .mockRejectedValueOnce(new Error('artifact discard unavailable'))
      .mockResolvedValueOnce(undefined)
    const artifactLoader = {
      load: vi.fn(async () => ({
        loaderId: 'db-test-loader',
        receiptId: 'db-test-receipt-stage-restart',
        activatedAt: 250,
      })),
      unload,
    }
    const artifactLifecycle = {
      validateArtifact: vi.fn(async () => {}),
      discardArtifact,
      reconcileArtifacts: vi.fn(async () => {}),
    }
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-stage-restart'),
      }),
      personaTrainingArtifactLoader: artifactLoader,
      personaTrainingArtifactLifecycle: artifactLifecycle,
    })
    let incrementId = ''
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'cleanup-stage-restart',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      incrementId = result.status === 'succeeded' ? result.increment.id : ''

      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId,
      })).rejects.toThrow('artifact discard unavailable')
      await expect(db.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          id: incrementId,
          state: 'available',
          artifact: expect.objectContaining({
            activation: expect.objectContaining({
              status: 'inactive',
            }),
          }),
        }),
      ])
    }
    finally {
      await db.close()
    }

    const pendingDatabase = await openRawDatabase(databasePath)
    try {
      await expect(queryRawRows<{
        stage: string
        status: string
        attempts: number
      }>(
        pendingDatabase,
        `
        SELECT stage, status, attempts
        FROM persona_training_artifact_cleanup_intents
        `,
      )).resolves.toEqual([{
        stage: 'discard',
        status: 'pending',
        attempts: 1,
      }])
    }
    finally {
      await closeRawDatabase(pendingDatabase)
    }

    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: artifactLoader,
      personaTrainingArtifactLifecycle: artifactLifecycle,
    })
    try {
      await expect(recovered.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          id: incrementId,
          state: 'rolled-back',
        }),
      ])
    }
    finally {
      await recovered.close()
    }

    expect(unload).toHaveBeenCalledOnce()
    expect(discardArtifact).toHaveBeenCalledTimes(2)
    const completedDatabase = await openRawDatabase(databasePath)
    try {
      await expect(queryRawRows<{
        stage: string
        status: string
        attempts: number
      }>(
        completedDatabase,
        `
        SELECT stage, status, attempts
        FROM persona_training_artifact_cleanup_intents
        `,
      )).resolves.toEqual([{
        stage: 'finalize',
        status: 'completed',
        attempts: 2,
      }])
    }
    finally {
      await closeRawDatabase(completedDatabase)
    }
  })

  it('replays one idempotent unload operation when the process dies before persisting the discard stage', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const acceptedOperations = new Set<string>()
    let semanticUnloadCount = 0
    const unload = vi.fn(async (input: { operationId: string }) => {
      if (acceptedOperations.has(input.operationId))
        return
      acceptedOperations.add(input.operationId)
      semanticUnloadCount += 1
    })
    const artifactLoader = {
      load: vi.fn(async () => ({
        loaderId: 'db-test-loader',
        receiptId: 'db-test-receipt-crash-window',
        activatedAt: 250,
      })),
      unload,
    }
    const artifactLifecycle = {
      validateArtifact: vi.fn(async () => {}),
      discardArtifact: vi.fn(async () => {}),
      reconcileArtifacts: vi.fn(async () => {}),
    }
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-unload-crash-window'),
      }),
      personaTrainingArtifactLoader: artifactLoader,
      personaTrainingArtifactLifecycle: artifactLifecycle,
    })
    let incrementId = ''
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'unload-crash-window',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      incrementId = result.status === 'succeeded' ? result.increment.id : ''

      const triggerDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(triggerDatabase, `
          CREATE TRIGGER fail_cleanup_unload_stage_persist
          BEFORE UPDATE OF stage ON persona_training_artifact_cleanup_intents
          WHEN OLD.stage = 'unload' AND NEW.stage = 'discard'
          BEGIN
            SELECT RAISE(ABORT, 'simulated crash before unload stage persistence');
          END
        `)
      }
      finally {
        await closeRawDatabase(triggerDatabase)
      }

      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId,
      })).rejects.toThrow('simulated crash before unload stage persistence')
      await expect(db.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          id: incrementId,
          state: 'available',
        }),
      ])
    }
    finally {
      await db.close()
    }

    const triggerDatabase = await openRawDatabase(databasePath)
    try {
      await runRaw(triggerDatabase, 'DROP TRIGGER fail_cleanup_unload_stage_persist')
    }
    finally {
      await closeRawDatabase(triggerDatabase)
    }

    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: artifactLoader,
      personaTrainingArtifactLifecycle: artifactLifecycle,
    })
    await recovered.close()

    expect(unload).toHaveBeenCalledTimes(2)
    expect(unload.mock.calls[0]?.[0].operationId).toBe(unload.mock.calls[1]?.[0].operationId)
    expect(unload.mock.calls[0]?.[0].operationId).toMatch(/:unload$/)
    expect(semanticUnloadCount).toBe(1)
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

  it('keeps the active dataset and exported manifest unchanged when training fails', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async () => {
        throw new Error('trainer process failed without mutating dataset state')
      },
    })
    let beforeManifestHash = ''
    let beforeActiveVersionId: string | null = null
    let afterActiveVersionId: string | null = null
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'failed-keeps-manifest',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const beforeSnapshot = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      const beforeExport = await db.exportPersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      beforeActiveVersionId = beforeSnapshot.activeVersionId
      beforeManifestHash = beforeExport.manifest.manifestHash

      await expect(db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })).resolves.toMatchObject({
        status: 'failed',
        reason: 'executor-failed',
      })

      const afterSnapshot = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      afterActiveVersionId = afterSnapshot.activeVersionId
      expect(afterActiveVersionId).toBe(beforeActiveVersionId)
      expect(afterSnapshot.versions.find(version => version.id === dataset.id)).toMatchObject({
        activeAt: beforeSnapshot.versions.find(version => version.id === dataset.id)?.activeAt,
        rolledBackAt: null,
      })
    }
    finally {
      await db.close()
    }

    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const exports = await queryRawRows<{ manifest_hash: string, dataset_id: string }>(
        rawDatabase,
        `
        SELECT manifest_hash, dataset_id
        FROM persona_training_dataset_exports
        WHERE card_id = 'card-a'
        ORDER BY exported_at ASC, id ASC
        `,
      )
      expect(exports).toEqual([{
        manifest_hash: beforeManifestHash,
        dataset_id: `persona-dataset:card-a:1`,
      }])
      expect(await queryRawRows<{ active_at: number | null, rolled_back_at: number | null }>(
        rawDatabase,
        `
        SELECT active_at, rolled_back_at
        FROM persona_training_datasets
        WHERE card_id = 'card-a' AND id = 'persona-dataset:card-a:1'
        `,
      )).toEqual([expect.objectContaining({
        active_at: expect.any(Number),
        rolled_back_at: null,
      })])
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
    expect(afterActiveVersionId).toBe(beforeActiveVersionId)
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

  it('persists source revocation but keeps the increment available with pending finalize when governance audit fails', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-source-revoke'),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
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
      const source = snapshotBefore.examples.find(example => example.datasetId === dataset.id)
      expect(source).toBeTruthy()
      await installFailingPersonaAuditTrigger(databasePath, {
        name: 'fail_persona_increment_revoke_audit',
        action: 'training-increment-revoked',
      })

      await expect(db.revokePersonaTrainingDatasetSource({
        cardId: 'card-a',
        sourceId: source!.sourceId,
        sourceKind: source!.sourceKind,
      })).rejects.toThrow('forced persona audit failure')

      const snapshotAfter = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      expect(snapshotAfter.examples.find(example =>
        example.sourceId === source!.sourceId && example.sourceKind === source!.sourceKind,
      )).toMatchObject({
        state: 'revoked',
        allowTraining: false,
        revokedAt: expect.any(Number),
      })
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([
        expect.objectContaining({
          state: 'available',
        }),
      ])
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await expect(queryRawRows<{ stage: string, status: string }>(
          rawDatabase,
          'SELECT stage, status FROM persona_training_artifact_cleanup_intents',
        )).resolves.toEqual([{
          stage: 'finalize',
          status: 'pending',
        }])
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }
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
      const source = (await db.getPersonaTrainingDataset({ cardId: 'card-a' }))
        .examples
        .find(example => example.datasetId === dataset.id)
      expect(source).toBeTruthy()

      await expect(db.revokePersonaTrainingDatasetSource({
        cardId: 'card-a',
        sourceId: source!.sourceId,
        sourceKind: source!.sourceKind,
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

  it('rejects an orphan cleanup record when a completed intent id belongs to another owner', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const artifactId = 'artifact-orphan-owner-mismatch'
    const persistedArtifact = createPersonaTrainingArtifact('run-existing-owner', artifactId)
    const orphanArtifact = createPersonaTrainingArtifact('run-new-owner', artifactId)
    const cleanupIntentId = personaTrainingCleanupIntentIdForTest({
      cardId: 'default',
      runId: orphanArtifact.runId,
      incrementId: null,
      artifactId,
    })
    const database = await openRawDatabase(databasePath)
    try {
      await runRaw(
        database,
        `
        INSERT INTO persona_training_artifact_cleanup_intents (
          id, card_id, run_id, increment_id, artifact_id, artifact_json,
          loader_receipt_json, unload_operation_id, reason, stage,
          finalize_increment_state, status, attempts, last_error,
          created_at, updated_at, completed_at
        ) VALUES (?, 'default', ?, NULL, ?, ?, NULL, ?, 'existing-owner',
          'finalize', NULL, 'completed', 1, NULL, 1, 1, 1)
        `,
        [
          cleanupIntentId,
          persistedArtifact.runId,
          artifactId,
          JSON.stringify(persistedArtifact),
          `${cleanupIntentId}:unload`,
        ],
      )
    }
    finally {
      await closeRawDatabase(database)
    }
    await expect(setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
        reconcileArtifacts: async (input) => {
          await input.onOrphanCleanupFailure({
            artifact: orphanArtifact,
            error: new Error('orphan cleanup unavailable'),
          })
        },
      },
    })).rejects.toThrow(/constraint|owner|scope/i)
  })

  it('allows a later training run to reuse an artifact id without colliding with completed lifecycle intents', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const artifactId = 'artifact-reused-across-runs'
    const load = vi.fn(async (input: { artifact: AlicizationPersonaTrainingArtifact }) => ({
      loaderId: 'db-test-loader',
      receiptId: `receipt-${input.artifact.runId}`,
      activatedAt: 250,
    }))
    const unload = vi.fn(async () => {})
    const discardArtifact = vi.fn(async () => {})
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, artifactId),
      }),
      personaTrainingArtifactLoader: {
        load,
        unload,
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'artifact-id-reuse',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const first = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      expect(first.status).toBe('succeeded')
      await db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId: first.status === 'succeeded' ? first.increment.id : '',
      })

      const second = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      expect(second.status).toBe('succeeded')
      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId: second.status === 'succeeded' ? second.increment.id : '',
      })).resolves.toMatchObject({
        state: 'rolled-back',
      })
    }
    finally {
      await db.close()
    }

    expect(load).toHaveBeenCalledTimes(2)
    expect(unload).toHaveBeenCalledTimes(2)
    expect(discardArtifact).toHaveBeenCalledTimes(2)
  })

  it('rolls source governance back when its cleanup intent cannot join the transaction', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-governance-intent-atomicity'),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'governance-intent-atomicity',
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
      const source = snapshotBefore.examples.find(example => example.datasetId === dataset.id)
      expect(source).toBeTruthy()
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(rawDatabase, `
          CREATE TRIGGER fail_governance_cleanup_intent_insert
          BEFORE INSERT ON persona_training_artifact_cleanup_intents
          BEGIN
            SELECT RAISE(ABORT, 'forced governance cleanup intent failure');
          END
        `)
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await expect(db.revokePersonaTrainingDatasetSource({
        cardId: 'card-a',
        sourceId: source!.sourceId,
        sourceKind: source!.sourceKind,
      })).rejects.toThrow('forced governance cleanup intent failure')

      const snapshotAfter = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      expect(snapshotAfter.examples.find(example => example.sourceId === source!.sourceId)).toMatchObject({
        state: 'staged',
        allowTraining: true,
        revokedAt: null,
      })
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([
        expect.objectContaining({
          state: 'available',
          cleanup: null,
        }),
      ])
    }
    finally {
      await db.close()
    }
  })

  it('dead-letters malformed cleanup intent JSON instead of blocking database startup', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await runRaw(
        rawDatabase,
        `
        INSERT INTO persona_training_artifact_cleanup_intents (
          id, card_id, run_id, increment_id, artifact_id, artifact_json,
          loader_receipt_json, unload_operation_id, reason, stage,
          finalize_increment_state, status, attempts, last_error,
          created_at, updated_at, completed_at
        ) VALUES (
          'cleanup-malformed-json', 'card-a', 'run-malformed-json', NULL,
          'artifact-malformed-json', '{', NULL, 'cleanup-malformed-json:unload',
          'startup-corrupt-artifact', 'discard', NULL, 'pending', 0, NULL,
          1, 1, NULL
        )
        `,
      )
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const recovered = await setupAlicizationDb(userDataPath)
    await recovered.close()

    const persistedDatabase = await openRawDatabase(databasePath)
    try {
      await expect(queryRawRows<{ status: string, last_error: string | null }>(
        persistedDatabase,
        `
        SELECT status, last_error
        FROM persona_training_artifact_cleanup_intents
        WHERE id = 'cleanup-malformed-json'
        `,
      )).resolves.toEqual([{
        status: 'dead-letter',
        last_error: expect.stringContaining('malformed artifact JSON'),
      }])
    }
    finally {
      await closeRawDatabase(persistedDatabase)
    }
  })

  it('rolls dataset activation back when its cleanup intent cannot join the transaction', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-activation-intent-atomicity'),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
    })
    try {
      const first = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'activation-intent-atomicity-first',
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
        sourceSuffix: 'activation-intent-atomicity-second',
      })
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(rawDatabase, `
          CREATE TRIGGER fail_activation_cleanup_intent_insert
          BEFORE INSERT ON persona_training_artifact_cleanup_intents
          BEGIN
            SELECT RAISE(ABORT, 'forced activation cleanup intent failure');
          END
        `)
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await expect(db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: second.id,
      })).rejects.toThrow('forced activation cleanup intent failure')

      const snapshot = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      expect(snapshot.activeVersionId).toBe(first.id)
      expect(snapshot.versions.find(version => version.id === first.id)?.activeAt).not.toBeNull()
      expect(snapshot.versions.find(version => version.id === second.id)?.activeAt).toBeNull()
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([
        expect.objectContaining({
          datasetId: first.id,
          state: 'available',
          cleanup: null,
        }),
      ])
    }
    finally {
      await db.close()
    }
  })

  it('rolls dataset rollback back when its cleanup intent cannot join the transaction', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-rollback-intent-atomicity'),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
    })
    try {
      const first = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'rollback-intent-atomicity-first',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: first.id,
      })
      const second = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'rollback-intent-atomicity-second',
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
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(rawDatabase, `
          CREATE TRIGGER fail_rollback_cleanup_intent_insert
          BEFORE INSERT ON persona_training_artifact_cleanup_intents
          BEGIN
            SELECT RAISE(ABORT, 'forced rollback cleanup intent failure');
          END
        `)
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await expect(db.rollbackPersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: first.id,
      })).rejects.toThrow('forced rollback cleanup intent failure')

      const snapshot = await db.getPersonaTrainingDataset({ cardId: 'card-a' })
      expect(snapshot.activeVersionId).toBe(second.id)
      expect(snapshot.versions.find(version => version.id === first.id)?.activeAt).toBeNull()
      expect(snapshot.versions.find(version => version.id === second.id)?.activeAt).not.toBeNull()
      await expect(db.listPersonaTrainingIncrements({ cardId: 'card-a' })).resolves.toEqual([
        expect.objectContaining({
          datasetId: second.id,
          state: 'available',
          cleanup: null,
        }),
      ])
    }
    finally {
      await db.close()
    }
  })

  it('keeps the new dataset active but leaves its superseded increment available until cleanup finalizes', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-dataset-activation'),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
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
      expect(snapshot.activeVersionId).toBe(second.id)
      expect(snapshot.versions.find(version => version.id === first.id)?.activeAt).toBeNull()
      expect(snapshot.versions.find(version => version.id === second.id)?.activeAt).not.toBeNull()
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

  it('keeps the rollback target active but leaves the superseded increment available until cleanup finalizes', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-dataset-rollback'),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
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
      expect(snapshot.activeVersionId).toBe(first.id)
      expect(snapshot.versions.find(version => version.id === first.id)?.activeAt).not.toBeNull()
      expect(snapshot.versions.find(version => version.id === second.id)?.activeAt).toBeNull()
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

  it('keeps manual rollback finalize retryable when its audit cannot commit', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const discardArtifact = vi.fn(async () => {})
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-manual-rollback'),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: vi.fn(async () => {}),
        discardArtifact,
        reconcileArtifacts: vi.fn(async () => {}),
      },
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
      const failedDatabase = await openRawDatabase(databasePath)
      try {
        await expect(queryRawRows<{ stage: string, status: string }>(
          failedDatabase,
          'SELECT stage, status FROM persona_training_artifact_cleanup_intents',
        )).resolves.toEqual([{
          stage: 'finalize',
          status: 'pending',
        }])
        await runRaw(failedDatabase, 'DROP TRIGGER fail_manual_persona_increment_rollback_audit')
      }
      finally {
        await closeRawDatabase(failedDatabase)
      }

      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId,
      })).resolves.toMatchObject({
        id: incrementId,
        state: 'rolled-back',
      })
      expect(discardArtifact).toHaveBeenCalledOnce()
    }
    finally {
      await db.close()
    }
  })

  it('rejects cleanup finalization when the persisted intent owner tuple no longer matches', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-owner-mismatch'),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: vi.fn(async () => {}),
        discardArtifact: vi.fn(async () => {}),
        reconcileArtifacts: vi.fn(async () => {}),
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'cleanup-owner-mismatch',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const incrementId = result.status === 'succeeded' ? result.increment.id : ''
      await installFailingPersonaAuditTrigger(databasePath, {
        name: 'fail_owner_mismatch_finalize_once',
        action: 'training-increment-rolled-back',
      })
      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId,
      })).rejects.toThrow('forced persona audit failure')

      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(rawDatabase, 'DROP TRIGGER fail_owner_mismatch_finalize_once')
        await runRaw(
          rawDatabase,
          `UPDATE persona_training_artifact_cleanup_intents SET card_id = 'card-b'`,
        )
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId,
      })).rejects.toThrow(/scope|owner|stage transition/)
      await expect(db.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
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

  it('rejects cleanup begin when an existing intent id has a different owner or lifecycle state', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const artifactId = 'artifact-begin-owner-mismatch'
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, artifactId),
      }),
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'cleanup-begin-owner-mismatch',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const result = await db.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const increment = result.status === 'succeeded' ? result.increment : null
      expect(increment).toBeTruthy()
      const cleanupIntentId = personaTrainingCleanupIntentIdForTest({
        cardId: 'card-a',
        runId: increment!.artifact.runId,
        incrementId: increment!.id,
        artifactId,
      })
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(
          rawDatabase,
          `
          INSERT INTO persona_training_artifact_cleanup_intents (
            id, card_id, run_id, increment_id, artifact_id, artifact_json,
            loader_receipt_json, unload_operation_id, reason, stage,
            finalize_increment_state, status, attempts, last_error,
            created_at, updated_at, completed_at
          ) VALUES (?, 'card-b', ?, ?, ?, ?, NULL, ?, 'tampered-owner',
            'finalize', 'rolled-back', 'completed', 1, NULL, 1, 1, 1)
          `,
          [
            cleanupIntentId,
            increment!.artifact.runId,
            increment!.id,
            artifactId,
            JSON.stringify(increment!.artifact),
            `${cleanupIntentId}:unload`,
          ],
        )
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId: increment!.id,
      })).rejects.toThrow(/constraint|owner|scope/i)
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
          state: 'quarantined',
        }),
        expect.objectContaining({
          sourceKind: 'persona-reinforcement',
          allowTraining: false,
          state: 'quarantined',
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

  it('clears persona dataset versions, examples, exports, and provenance with conversation data', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath)
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'clear-persona-dataset',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      await db.exportPersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })

      await db.clearConversationData()

      await expect(db.getPersonaTrainingDataset({ cardId: 'card-a' })).resolves.toEqual({
        activeVersionId: null,
        versions: [],
        examples: [],
      })
    }
    finally {
      await db.close()
    }

    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const rows = await queryRawRows<{ table_name: string, count: number }>(
        rawDatabase,
        `
        SELECT 'datasets' AS table_name, COUNT(*) AS count FROM persona_training_datasets
        UNION ALL SELECT 'examples', COUNT(*) FROM persona_training_dataset_examples
        UNION ALL SELECT 'exports', COUNT(*) FROM persona_training_dataset_exports
        UNION ALL SELECT 'provenance', COUNT(*) FROM persona_training_source_provenance
        `,
      )
      expect(rows).toEqual([
        { table_name: 'datasets', count: 0 },
        { table_name: 'examples', count: 0 },
        { table_name: 'exports', count: 0 },
        { table_name: 'provenance', count: 0 },
      ])
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('clears Persona activation and cleanup intents without letting the old pipeline Map revive them', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-clear-lifecycle'),
      }),
      personaTrainingArtifactLoader: {
        load: async () => ({
          loaderId: 'clear-lifecycle-loader',
          receiptId: 'clear-lifecycle-receipt',
          activatedAt: 250,
        }),
        unload: async () => {},
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
    })
    try {
      const dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'card-a',
        sourceSuffix: 'clear-lifecycle',
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

      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(
          rawDatabase,
          `
          INSERT INTO persona_training_artifact_cleanup_intents (
            id, card_id, run_id, increment_id, artifact_id, artifact_json,
            loader_receipt_json, unload_operation_id, reason, stage,
            finalize_increment_state, status, attempts, last_error,
            created_at, updated_at, completed_at
          )
          SELECT
            'cleanup-clear-lifecycle', card_id, run_id, increment_id, artifact_id,
            artifact_json, loader_receipt_json, 'cleanup-clear-lifecycle:unload',
            'clear-lifecycle-test', 'finalize', NULL, 'completed', 1, NULL,
            created_at, updated_at, updated_at
          FROM persona_training_artifact_activation_intents
          WHERE artifact_id = 'artifact-clear-lifecycle'
          `,
        )
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await db.clearConversationData()

      await expect(db.rollbackPersonaTrainingIncrement({
        cardId: 'card-a',
        incrementId,
      })).resolves.toBeNull()
    }
    finally {
      await db.close()
    }

    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const rows = await queryRawRows<{ table_name: string, count: number }>(
        rawDatabase,
        `
        SELECT 'activation' AS table_name, COUNT(*) AS count
        FROM persona_training_artifact_activation_intents
        UNION ALL
        SELECT 'cleanup', COUNT(*)
        FROM persona_training_artifact_cleanup_intents
        `,
      )
      expect(rows).toEqual([
        { table_name: 'activation', count: 0 },
        { table_name: 'cleanup', count: 0 },
      ])
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('does not leave an empty staged dataset when inserting its examples fails', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath)
    try {
      await admitConfirmedPersonaSource(db, {
        cardId: 'default',
        sourceSuffix: 'stage-atomicity',
      })
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(
          rawDatabase,
          `
          CREATE TRIGGER fail_persona_dataset_example_insert
          BEFORE INSERT ON persona_training_dataset_examples
          BEGIN
            SELECT RAISE(ABORT, 'forced persona dataset example failure');
          END
          `,
        )
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await expect(db.stagePersonaTrainingDataset({
        cardId: 'default',
        consent: {
          granted: true,
          policyVersion: 'persona-training-consent-v1',
          scope: 'persona-dataset',
        },
      })).rejects.toThrow('forced persona dataset example failure')
    }
    finally {
      await db.close()
    }

    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await expect(queryRawRows<{ count: number }>(
        rawDatabase,
        'SELECT COUNT(*) AS count FROM persona_training_datasets',
      )).resolves.toEqual([{ count: 0 }])
      await expect(queryRawRows<{ count: number }>(
        rawDatabase,
        'SELECT COUNT(*) AS count FROM persona_training_dataset_examples',
      )).resolves.toEqual([{ count: 0 }])
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('rolls back the manifest append when marking the dataset exported fails', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const db = await setupAlicizationDb(userDataPath)
    let dataset: PersonaTrainingDatasetVersion | null = null
    try {
      dataset = await stageActivatablePersonaDataset(db, {
        cardId: 'default',
        sourceSuffix: 'export-atomicity',
      })
      const rawDatabase = await openRawDatabase(databasePath)
      try {
        await runRaw(
          rawDatabase,
          `
          CREATE TRIGGER fail_persona_dataset_exported_at
          BEFORE UPDATE OF exported_at ON persona_training_datasets
          WHEN NEW.exported_at IS NOT NULL
          BEGIN
            SELECT RAISE(ABORT, 'forced persona dataset export marker failure');
          END
          `,
        )
      }
      finally {
        await closeRawDatabase(rawDatabase)
      }

      await expect(db.exportPersonaTrainingDataset({
        cardId: 'default',
        datasetId: dataset.id,
      })).rejects.toThrow('forced persona dataset export marker failure')
    }
    finally {
      await db.close()
    }

    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await expect(queryRawRows<{ count: number }>(
        rawDatabase,
        'SELECT COUNT(*) AS count FROM persona_training_dataset_exports',
      )).resolves.toEqual([{ count: 0 }])
      await expect(queryRawRows<{ exported_at: number | null }>(
        rawDatabase,
        'SELECT exported_at FROM persona_training_datasets WHERE id = ?',
        [dataset!.id],
      )).resolves.toEqual([{ exported_at: null }])
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
  })

  it('preserves the current active version when activation or rollback targets a missing version', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const active = await stageActivatablePersonaDataset(db, {
        cardId: 'default',
        sourceSuffix: 'missing-target-preserves-active',
      })
      await db.activatePersonaTrainingDataset({
        cardId: 'default',
        datasetId: active.id,
      })

      await expect(db.activatePersonaTrainingDataset({
        cardId: 'default',
        datasetId: 'missing-dataset',
      })).rejects.toThrow('persona training dataset version not found')
      expect((await db.getPersonaTrainingDataset({ cardId: 'default' })).activeVersionId).toBe(active.id)

      await expect(db.rollbackPersonaTrainingDataset({
        cardId: 'default',
        datasetId: 'missing-dataset',
      })).rejects.toThrow('persona training dataset version not found')
      expect((await db.getPersonaTrainingDataset({ cardId: 'default' })).activeVersionId).toBe(active.id)
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
          run_id, card_id, dataset_id, manifest_hash, source_refs_json,
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
      const scope = await insertRawEligiblePersonaTrainingScope(rawDatabase, 'run-replaced-inode')
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-replaced-inode',
        status: 'completed',
        artifact,
        scope,
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId: 'run-replaced-inode',
        artifact,
        scope,
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

  it.each([
    {
      name: 'the dataset is no longer active',
      mutate: async (database: sqlite3.Database) => {
        await runRaw(
          database,
          `UPDATE persona_training_datasets SET active_at = NULL WHERE card_id = 'card-a'`,
        )
      },
    },
    {
      name: 'a source is revoked and no longer trainable',
      mutate: async (database: sqlite3.Database) => {
        await runRaw(
          database,
          `
          UPDATE persona_training_dataset_examples
          SET state = 'revoked', allow_training = 0, revoked_at = 400
          WHERE card_id = 'card-a'
          `,
        )
      },
    },
    {
      name: 'the current dataset manifest no longer matches the trained manifest',
      mutate: async (database: sqlite3.Database) => {
        await runRaw(
          database,
          `
          UPDATE persona_training_dataset_examples
          SET positive_example = positive_example || ' changed after training'
          WHERE card_id = 'card-a'
          `,
        )
      },
    },
  ])('does not reload a persisted Persona artifact after restart when $name', async ({ mutate }) => {
    const userDataPath = await createSandboxUserDataPath()
    const initialLoad = vi.fn(async () => ({
      loaderId: 'initial-loader',
      receiptId: 'receipt-before-eligibility-change',
      activatedAt: 200,
    }))
    const initialized = await setupAlicizationDb(userDataPath, {
      personaTrainingExecutor: async input => ({
        artifact: createPersonaTrainingArtifact(input.runId, 'artifact-restart-eligibility'),
      }),
      personaTrainingArtifactLoader: {
        load: initialLoad,
        unload: vi.fn(async () => {}),
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
    })
    let runId = ''
    try {
      const dataset = await stageActivatablePersonaDataset(initialized, {
        cardId: 'card-a',
        sourceSuffix: 'restart-eligibility',
      })
      await initialized.activatePersonaTrainingDataset({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      const result = await initialized.runPersonaTraining({
        cardId: 'card-a',
        datasetId: dataset.id,
      })
      expect(result.status).toBe('succeeded')
      runId = result.runId
    }
    finally {
      await initialized.close()
    }
    expect(initialLoad).toHaveBeenCalledOnce()

    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      await mutate(rawDatabase)
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const restartLoad = vi.fn(async () => ({
      loaderId: 'restart-loader',
      receiptId: 'receipt-must-not-be-used',
      activatedAt: 500,
    }))
    const unload = vi.fn(async () => {})
    const discardArtifact = vi.fn(async () => {})
    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: {
        load: restartLoad,
        unload,
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: vi.fn(async () => {}),
        discardArtifact,
      },
    })
    try {
      expect(restartLoad).not.toHaveBeenCalled()
      expect(unload).toHaveBeenCalledOnce()
      expect(discardArtifact).toHaveBeenCalledOnce()
      await expect(recovered.getPersonaTrainingRun({
        cardId: 'card-a',
        runId,
      })).resolves.toMatchObject({
        status: 'interrupted',
        failureReason: 'interrupted',
        artifact: null,
      })
      await expect(recovered.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          state: 'rolled-back',
        }),
      ])
    }
    finally {
      await recovered.close()
    }
  })

  it('reloads a persisted active artifact after restart and stores the fresh receipt on its run and increment', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const oldArtifact = createActivePersonaTrainingArtifact(
      'run-active-reload',
      'artifact-active-reload',
      'receipt-before-restart',
    )
    const loadOperationId = personaTrainingActivationOperationIdForTest({
      cardId: 'card-a',
      runId: 'run-active-reload',
      incrementId: 'persona-training-increment:run-active-reload',
      artifactId: oldArtifact.artifactId,
      mode: 'restart',
      expectedReceiptId: 'receipt-before-restart',
    })
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const scope = await insertRawEligiblePersonaTrainingScope(rawDatabase, 'run-active-reload')
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-active-reload',
        status: 'completed',
        artifact: oldArtifact,
        scope,
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId: 'run-active-reload',
        artifact: oldArtifact,
        scope,
      })
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
    const load = vi.fn(async () => ({
      loaderId: 'restart-loader',
      receiptId: 'receipt-after-restart',
      activatedAt: 300,
    }))

    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: {
        load,
        unload: vi.fn(async () => {}),
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: vi.fn(async () => {}),
        discardArtifact: vi.fn(async () => {}),
        reconcileArtifacts: vi.fn(async () => {}),
      },
    })
    try {
      expect(load).toHaveBeenCalledOnce()
      await expect(recovered.getPersonaTrainingRun({
        cardId: 'card-a',
        runId: 'run-active-reload',
      })).resolves.toMatchObject({
        status: 'completed',
        artifact: {
          activation: {
            status: 'active',
            loaderId: 'restart-loader',
            receiptId: 'receipt-after-restart',
            activatedAt: 300,
          },
        },
      })
      await expect(recovered.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          id: 'persona-training-increment:run-active-reload',
          state: 'available',
          artifact: expect.objectContaining({
            activation: expect.objectContaining({
              status: 'active',
              loaderId: 'restart-loader',
              receiptId: 'receipt-after-restart',
              activatedAt: 300,
            }),
          }),
        }),
      ])
    }
    finally {
      await recovered.close()
    }

    const persistedDatabase = await openRawDatabase(databasePath)
    try {
      const [runRow] = await queryRawRows<{ artifact_json: string }>(
        persistedDatabase,
        'SELECT artifact_json FROM persona_training_runs WHERE run_id = ?',
        ['run-active-reload'],
      )
      const [incrementRow] = await queryRawRows<{ artifact_json: string }>(
        persistedDatabase,
        'SELECT artifact_json FROM persona_training_increments WHERE run_id = ?',
        ['run-active-reload'],
      )
      expect(JSON.parse(runRow!.artifact_json)).toMatchObject({
        activation: {
          status: 'active',
          receiptId: 'receipt-after-restart',
        },
      })
      expect(JSON.parse(incrementRow!.artifact_json)).toEqual(JSON.parse(runRow!.artifact_json))
      await expect(queryRawRows<{
        load_operation_id: string
        loader_receipt_json: string
        stage: string
        status: string
      }>(
        persistedDatabase,
        `
        SELECT load_operation_id, loader_receipt_json, stage, status
        FROM persona_training_artifact_activation_intents
        WHERE run_id = ?
        `,
        ['run-active-reload'],
      )).resolves.toEqual([{
        load_operation_id: loadOperationId,
        loader_receipt_json: expect.stringContaining('receipt-after-restart'),
        stage: 'loaded',
        status: 'completed',
      }])
    }
    finally {
      await closeRawDatabase(persistedDatabase)
    }
  })

  it('replays a loaded restart activation before trusting its persisted receipt after another process restart', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const runId = 'run-loaded-restart-activation'
    const artifactId = 'artifact-loaded-restart-activation'
    const incrementId = `persona-training-increment:${runId}`
    const oldArtifact = createActivePersonaTrainingArtifact(
      runId,
      artifactId,
      'receipt-before-loaded-restart',
    )
    const reloadArtifact: AlicizationPersonaTrainingArtifact = {
      ...oldArtifact,
      activation: {
        status: 'inactive',
        reason: 'Awaiting a fresh receipt after restart.',
      },
    }
    const activatedArtifact: AlicizationPersonaTrainingArtifact = {
      ...reloadArtifact,
      activation: {
        status: 'active',
        reason: 'Loaded before the process exited.',
        loaderId: 'restart-loader',
        receiptId: 'receipt-loaded-before-process-exit',
        activatedAt: 300,
      },
    }
    const loadOperationId = personaTrainingActivationOperationIdForTest({
      cardId: 'card-a',
      runId,
      incrementId,
      artifactId,
      mode: 'restart',
      expectedReceiptId: 'receipt-before-loaded-restart',
    })
    const activationIntentId = loadOperationId.slice(0, -':load'.length)
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const scope = await insertRawEligiblePersonaTrainingScope(rawDatabase, runId)
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId,
        status: 'completed',
        artifact: oldArtifact,
        scope,
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId,
        artifact: oldArtifact,
        scope,
      })
      await runRaw(
        rawDatabase,
        `
        INSERT INTO persona_training_artifact_activation_intents (
          id, load_operation_id, mode, card_id, run_id, increment_id,
          artifact_id, artifact_json, expected_artifact_json,
          loader_receipt_json, activated_artifact_json, stage, status,
          last_error, created_at, updated_at, completed_at
        ) VALUES (?, ?, 'restart', 'card-a', ?, ?, ?, ?, ?, ?, ?, 'loaded', 'pending', NULL, 200, 300, NULL)
        `,
        [
          activationIntentId,
          loadOperationId,
          runId,
          incrementId,
          artifactId,
          JSON.stringify(reloadArtifact),
          JSON.stringify(oldArtifact),
          JSON.stringify({
            loaderId: 'restart-loader',
            receiptId: 'receipt-loaded-before-process-exit',
            activatedAt: 300,
            reason: 'Loaded before the process exited.',
          }),
          JSON.stringify(activatedArtifact),
        ],
      )
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
    const load = vi.fn(async () => ({
      loaderId: 'restart-loader',
      receiptId: 'receipt-loaded-before-process-exit',
      activatedAt: 300,
      reason: 'Reconfirmed after process restart.',
    }))

    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: {
        load,
        unload: vi.fn(async () => {}),
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: vi.fn(async () => {}),
        discardArtifact: vi.fn(async () => {}),
        reconcileArtifacts: vi.fn(async () => {}),
      },
    })
    try {
      expect(load).toHaveBeenCalledOnce()
      expect(load).toHaveBeenCalledWith(expect.objectContaining({
        operationId: loadOperationId,
      }))
      await expect(recovered.getPersonaTrainingRun({
        cardId: 'card-a',
        runId,
      })).resolves.toMatchObject({
        artifact: {
          activation: {
            status: 'active',
            receiptId: 'receipt-loaded-before-process-exit',
          },
        },
      })
    }
    finally {
      await recovered.close()
    }
  })

  it('keeps the fresh loader receipt in unload recovery when restart receipt persistence loses its CAS', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const runId = 'run-reload-cas-failure'
    const oldArtifact = createActivePersonaTrainingArtifact(
      runId,
      'artifact-reload-cas-failure',
      'receipt-before-restart-cas-failure',
    )
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const scope = await insertRawEligiblePersonaTrainingScope(rawDatabase, runId)
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId,
        status: 'completed',
        artifact: oldArtifact,
        scope,
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId,
        artifact: oldArtifact,
        scope,
      })
      await runRaw(rawDatabase, `
        CREATE TRIGGER fail_fresh_restart_receipt_persist
        BEFORE UPDATE OF artifact_json ON persona_training_runs
        WHEN NEW.artifact_json LIKE '%receipt-after-restart-cas-failure%'
        BEGIN
          SELECT RAISE(ABORT, 'forced fresh receipt CAS failure');
        END
      `)
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
    const unload = vi.fn(async () => {
      throw new Error('fresh restart receipt unload unavailable')
    })
    const discardArtifact = vi.fn(async () => {})

    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: {
        load: vi.fn(async () => ({
          loaderId: 'restart-loader',
          receiptId: 'receipt-after-restart-cas-failure',
          activatedAt: 300,
        })),
        unload,
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: vi.fn(async () => {}),
        discardArtifact,
        reconcileArtifacts: vi.fn(async () => {}),
      },
    })
    try {
      await expect(recovered.getPersonaTrainingRun({
        cardId: 'card-a',
        runId,
      })).resolves.toMatchObject({
        artifact: {
          activation: {
            status: 'inactive',
          },
        },
      })
      await expect(recovered.listPersonaTrainingRuns({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          artifact: expect.objectContaining({
            activation: expect.objectContaining({
              status: 'inactive',
            }),
          }),
        }),
      ])
      await expect(recovered.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          artifact: expect.objectContaining({
            activation: expect.objectContaining({
              status: 'inactive',
            }),
          }),
        }),
      ])
    }
    finally {
      await recovered.close()
    }

    expect(unload).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-a',
      operationId: expect.stringMatching(/:unload$/),
      receipt: expect.objectContaining({
        receiptId: 'receipt-after-restart-cas-failure',
      }),
    }))
    const persistedDatabase = await openRawDatabase(databasePath)
    try {
      const cleanupRows = await queryRawRows<{
        stage: string
        status: string
        loader_receipt_json: string
      }>(
        persistedDatabase,
        `
        SELECT stage, status, loader_receipt_json
        FROM persona_training_artifact_cleanup_intents
        `,
      )
      expect(cleanupRows).toEqual([
        expect.objectContaining({
          stage: 'unload',
          status: 'pending',
          loader_receipt_json: expect.stringContaining('receipt-after-restart-cas-failure'),
        }),
      ])
      await expect(queryRawRows<{
        loader_receipt_json: string
        stage: string
        status: string
      }>(
        persistedDatabase,
        `
        SELECT loader_receipt_json, stage, status
        FROM persona_training_artifact_activation_intents
        WHERE run_id = ?
        `,
        [runId],
      )).resolves.toEqual([{
        loader_receipt_json: expect.stringContaining('receipt-after-restart-cas-failure'),
        stage: 'loaded',
        status: 'completed',
      }])
    }
    finally {
      await closeRawDatabase(persistedDatabase)
    }
  })

  it('keeps restart invalid-receipt compensation at unload when the compensation attempt fails', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const runId = 'run-reload-invalid-receipt'
    const oldArtifact = createActivePersonaTrainingArtifact(
      runId,
      'artifact-reload-invalid-receipt',
      'receipt-before-invalid-reload',
    )
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const scope = await insertRawEligiblePersonaTrainingScope(rawDatabase, runId)
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId,
        status: 'completed',
        artifact: oldArtifact,
        scope,
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId,
        artifact: oldArtifact,
        scope,
      })
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }
    const unload = vi.fn(async () => {
      throw new Error('restart invalid receipt compensation unload failed')
    })
    const discardArtifact = vi.fn(async () => {})

    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: {
        load: vi.fn(async () => ({
          loaderId: 'restart-loader',
          receiptId: '',
          activatedAt: 300,
        })),
        unload,
      },
      personaTrainingArtifactLifecycle: {
        validateArtifact: vi.fn(async () => {}),
        discardArtifact,
        reconcileArtifacts: vi.fn(async () => {}),
      },
    })
    try {
      await expect(recovered.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).resolves.toEqual([
        expect.objectContaining({
          state: 'available',
          artifact: expect.objectContaining({
            activation: expect.objectContaining({
              status: 'inactive',
            }),
          }),
        }),
      ])
    }
    finally {
      await recovered.close()
    }

    const persistedDatabase = await openRawDatabase(databasePath)
    try {
      const cleanupRows = await queryRawRows<{
        stage: string
        status: string
        loader_receipt_json: string
      }>(
        persistedDatabase,
        `
        SELECT stage, status, loader_receipt_json
        FROM persona_training_artifact_cleanup_intents
        `,
      )
      expect(cleanupRows).toEqual([
        expect.objectContaining({
          stage: 'unload',
          status: 'pending',
          loader_receipt_json: expect.stringContaining('"receiptId":""'),
        }),
      ])
      await expect(queryRawRows<{
        loader_receipt_json: string
        stage: string
        status: string
      }>(
        persistedDatabase,
        `
        SELECT loader_receipt_json, stage, status
        FROM persona_training_artifact_activation_intents
        WHERE run_id = ?
        `,
        [runId],
      )).resolves.toEqual([{
        loader_receipt_json: expect.stringContaining('"receiptId":""'),
        stage: 'loaded',
        status: 'completed',
      }])
    }
    finally {
      await closeRawDatabase(persistedDatabase)
    }
    expect(discardArtifact).not.toHaveBeenCalled()
  })

  it.each([
    {
      name: 'the loader is unavailable',
      loader: undefined,
    },
    {
      name: 'the loader rejects the reload',
      loader: {
        load: vi.fn(async () => {
          throw new Error('restart adapter reload failed')
        }),
        unload: vi.fn(async () => {}),
      },
    },
  ])('fails closed without preserving an old active receipt when $name', async ({ loader }) => {
    const userDataPath = await createSandboxUserDataPath()
    const initialized = await setupAlicizationDb(userDataPath)
    await initialized.close()
    const databasePath = join(userDataPath, 'alicizations', 'alicization.db')
    const runId = loader ? 'run-reload-failed' : 'run-loader-unavailable'
    const oldArtifact = createActivePersonaTrainingArtifact(
      runId,
      `artifact-${runId}`,
      `old-receipt-${runId}`,
    )
    const rawDatabase = await openRawDatabase(databasePath)
    try {
      const scope = await insertRawEligiblePersonaTrainingScope(rawDatabase, runId)
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId,
        status: 'completed',
        artifact: oldArtifact,
        scope,
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId,
        artifact: oldArtifact,
        scope,
      })
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLoader: loader,
      personaTrainingArtifactLifecycle: {
        validateArtifact: vi.fn(async () => {}),
        discardArtifact: vi.fn(async () => {}),
        reconcileArtifacts: vi.fn(async () => {}),
      },
    })
    try {
      const recoveredRun = await recovered.getPersonaTrainingRun({
        cardId: 'card-a',
        runId,
      })
      expect(recoveredRun).toMatchObject(loader
        ? {
            status: 'completed',
            artifact: {
              activation: {
                status: 'inactive',
              },
            },
          }
        : {
            status: 'interrupted',
            artifact: null,
          })
      const increments = await recovered.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })
      expect(increments).toEqual([
        expect.objectContaining({
          id: `persona-training-increment:${runId}`,
          state: loader ? 'available' : 'rolled-back',
          ...(loader
            ? {
                artifact: expect.objectContaining({
                  activation: expect.objectContaining({
                    status: 'inactive',
                  }),
                }),
              }
            : {}),
        }),
      ])
      expect(increments[0]?.artifact.activation).not.toMatchObject({
        status: 'active',
        receiptId: `old-receipt-${runId}`,
      })
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
      const source = (await db.getPersonaTrainingDataset({ cardId: 'card-a' }))
        .examples
        .find(example => example.datasetId === dataset.id)
      expect(source).toBeTruthy()
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
        sourceId: source!.sourceId,
        sourceKind: source!.sourceKind,
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
      const validScope = await insertRawEligiblePersonaTrainingScope(rawDatabase, 'run-valid')
      await insertRawPersonaTrainingRun(rawDatabase, {
        runId: 'run-valid',
        status: 'completed',
        artifact: createPersonaTrainingArtifact('run-valid'),
        scope: validScope,
      })
      await insertRawPersonaTrainingIncrement(rawDatabase, {
        runId: 'run-valid',
        artifact: createPersonaTrainingArtifact('run-valid'),
        scope: validScope,
      })
    }
    finally {
      await closeRawDatabase(rawDatabase)
    }

    const recovered = await setupAlicizationDb(userDataPath, {
      personaTrainingArtifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
    })
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

  it('quarantines a malformed completed run while renderer-facing increment reads remain strict', async () => {
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
          run_id, card_id, dataset_id, manifest_hash, source_refs_json,
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
          '[{"sourceId":"source-invalid-artifact","sourceKind":"cleaned-long-term-reflection"}]',
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
          id, run_id, card_id, dataset_id, manifest_hash, source_refs_json,
          base_persona_revision, artifact_json, state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          'persona-training-increment:run-invalid-artifact',
          'run-invalid-artifact',
          'card-a',
          'dataset-invalid-artifact',
          'manifest-invalid-artifact',
          '[{"sourceId":"source-invalid-artifact","sourceKind":"cleaned-long-term-reflection"}]',
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
      })).resolves.toMatchObject({
        status: 'interrupted',
        failureReason: 'interrupted',
        artifact: null,
        error: expect.stringContaining('invalid persisted persona training artifact'),
      })
      await expect(reopened.listPersonaTrainingIncrements({
        cardId: 'card-a',
      })).rejects.toThrow('invalid persisted persona training artifact')
    }
    finally {
      await reopened.close()
    }
  })

  it('quarantines a completed run whose artifact belongs to another run while increment reads remain strict', async () => {
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
      })).resolves.toMatchObject({
        status: 'interrupted',
        failureReason: 'interrupted',
        artifact: null,
        error: expect.stringContaining('does not match persisted owner'),
      })
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
