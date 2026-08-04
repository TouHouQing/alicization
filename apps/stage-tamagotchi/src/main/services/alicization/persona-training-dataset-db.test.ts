import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'

const sandboxDirs: string[] = []

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
