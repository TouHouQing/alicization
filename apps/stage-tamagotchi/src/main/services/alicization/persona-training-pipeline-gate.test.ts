import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import type {
  PersonaTrainingDatasetExample,
  PersonaTrainingDatasetManifest,
  PersonaTrainingDatasetQualityGateResult,
  PersonaTrainingDatasetRuntime,
  PersonaTrainingDatasetVersion,
} from './persona-training-dataset-runtime'
import type {
  PersonaTrainingPipelineAuditEvent,
  PersonaTrainingPipelineIncrement,
  PersonaTrainingPipelineRunRecord,
} from './persona-training-pipeline-gate'

import { describe, expect, it, vi } from 'vitest'

import {
  createPersonaTrainingPipelineGate,
} from './persona-training-pipeline-gate'

const consent = {
  granted: true,
  policyVersion: 'persona-training-consent-v1',
  scope: 'persona-dataset',
  capturedAt: 100,
}

function createArtifact(
  runId: string,
  artifactId = `artifact-${runId}`,
): AlicizationPersonaTrainingArtifact {
  return {
    schemaVersion: 'alicization-persona-training-artifact-v1',
    artifactId,
    runId,
    kind: 'lora-adapter',
    path: `/tmp/persona-training/${artifactId}/adapter.safetensors`,
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

function createDataset(overrides: Partial<PersonaTrainingDatasetVersion> = {}): PersonaTrainingDatasetVersion {
  return {
    id: 'dataset-1',
    cardId: 'card-a',
    version: 1,
    schemaVersion: 'persona-training-dataset-v1',
    consentSnapshot: consent,
    createdAt: 1,
    exportedAt: 100,
    activeAt: 100,
    rolledBackAt: null,
    ...overrides,
  }
}

function createManifest(overrides: Partial<PersonaTrainingDatasetManifest> = {}): PersonaTrainingDatasetManifest {
  return {
    datasetId: 'dataset-1',
    cardId: 'card-a',
    version: 1,
    schemaVersion: 'persona-training-dataset-v1',
    exportedAt: 100,
    consentSnapshot: consent,
    exampleCount: 1,
    examples: [{
      id: 'example-1',
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
      schemaVersion: 'persona-training-example-v1',
      contentHash: 'hash-1',
      provenance: {
        kind: 'working-memory-cleaning',
        cleaningTransactionId: 'cleaning-1',
        cleanedAt: 99,
      },
      behaviorLesson: '失败时透明说明。',
      positiveExample: '我会直接说明失败原因。',
      negativeExample: null,
    }],
    manifestHash: 'manifest-hash-1',
    ...overrides,
  }
}

function createQualityGate(passed: boolean): PersonaTrainingDatasetQualityGateResult {
  return {
    passed,
    criticalFindingCount: passed ? 0 : 1,
    warningFindingCount: 0,
    findings: passed
      ? []
      : [{
          severity: 'critical',
          code: 'schema-mismatch',
          message: 'quality gate failed',
        }],
  }
}

function createDatasetRuntime(input: {
  dataset?: PersonaTrainingDatasetVersion
  manifest?: PersonaTrainingDatasetManifest
  qualityGate?: PersonaTrainingDatasetQualityGateResult
  activeVersionId?: string | null
  examples?: PersonaTrainingDatasetExample[]
} = {}) {
  let dataset = input.dataset ?? createDataset()
  let activeVersionId = input.activeVersionId === undefined ? dataset.id : input.activeVersionId
  const runtime: PersonaTrainingDatasetRuntime = {
    stageVersion: async () => dataset,
    getSnapshot: async () => ({
      activeVersionId,
      versions: [dataset],
      examples: input.examples ?? [],
    }),
    exportVersion: async () => ({
      dataset,
      manifest: input.manifest ?? createManifest({ datasetId: dataset.id, cardId: dataset.cardId }),
      qualityGate: input.qualityGate ?? createQualityGate(true),
    }),
    activateVersion: async () => dataset,
    rollbackVersion: async () => {
      activeVersionId = 'dataset-rollback'
      dataset = createDataset({
        id: 'dataset-rollback',
        activeAt: 101,
        rolledBackAt: null,
      })
      return dataset
    },
    revokeSource: async () => ({ affected: 1 }),
    setExamplePolicy: async () => null,
  }
  return runtime
}

function createPersistenceRecorder() {
  const runs: PersonaTrainingPipelineRunRecord[] = []
  const increments: PersonaTrainingPipelineIncrement[] = []
  const events: PersonaTrainingPipelineAuditEvent[] = []
  return {
    runs,
    increments,
    events,
    persistence: {
      createRun: async (run: PersonaTrainingPipelineRunRecord) => {
        runs.push({ ...run, sourceIds: [...run.sourceIds] })
      },
      updateRun: async (input: Partial<PersonaTrainingPipelineRunRecord> & Pick<PersonaTrainingPipelineRunRecord, 'runId'>) => {
        const run = runs.find(item => item.runId === input.runId)
        if (!run || !['queued', 'running', 'cancel_requested'].includes(run.status))
          return false
        Object.assign(run, input, input.sourceIds ? { sourceIds: [...input.sourceIds] } : {})
        return true
      },
      completeRunWithIncrement: async (input: {
        run: PersonaTrainingPipelineRunRecord
        increment: PersonaTrainingPipelineIncrement
        event: PersonaTrainingPipelineAuditEvent
      }) => {
        const run = runs.find(item => item.runId === input.run.runId)
        if (!run || run.status !== 'terminalizing')
          return { completed: false }
        Object.assign(run, input.run)
        const increment = input.increment
        increments.push({ ...increment, sourceIds: [...increment.sourceIds] })
        events.push({ ...input.event, sourceIds: [...input.event.sourceIds] })
        return { completed: true }
      },
      finishRun: async (input: {
        run: PersonaTrainingPipelineRunRecord
        event: PersonaTrainingPipelineAuditEvent
      }) => {
        const run = runs.find(item => item.runId === input.run.runId)
        if (!run || run.status !== 'terminalizing')
          return false
        Object.assign(run, input.run)
        events.push({ ...input.event, sourceIds: [...input.event.sourceIds] })
        return true
      },
      updateIncrementState: async (input: { incrementId: string, state: PersonaTrainingPipelineIncrement['state'] }) => {
        const increment = increments.find(item => item.id === input.incrementId)
        if (increment)
          increment.state = input.state
      },
      appendEvent: async (event: PersonaTrainingPipelineAuditEvent) => {
        events.push({ ...event, sourceIds: [...event.sourceIds] })
      },
      listIncrements: async () => increments.map(increment => ({ ...increment, sourceIds: [...increment.sourceIds] })),
    },
  }
}

describe('persona training pipeline gate', () => {
  it('persists the approved manifest boundary and training completion lifecycle', async () => {
    const recorder = createPersistenceRecorder()
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      persistence: recorder.persistence,
      now: () => 200,
      randomUUID: () => 'run-persisted',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'succeeded',
    })

    expect(recorder.runs).toEqual([expect.objectContaining({
      runId: 'run-persisted',
      cardId: 'card-a',
      datasetId: 'dataset-1',
      manifestHash: 'manifest-hash-1',
      status: 'completed',
    })])
    expect(recorder.increments).toEqual([expect.objectContaining({
      id: 'persona-training-increment:run-persisted',
      manifestHash: 'manifest-hash-1',
      state: 'available',
    })])
    expect(recorder.events.map(event => event.action)).toEqual([
      'training-started',
      'training-completed',
    ])
    expect(recorder.events[0]).toMatchObject({
      runId: 'run-persisted',
      datasetId: 'dataset-1',
      manifestHash: 'manifest-hash-1',
    })
  })

  it('persists cancellation and source revocation without allowing the consumer result', async () => {
    const recorder = createPersistenceRecorder()
    let resolveTraining!: (value: { artifact: AlicizationPersonaTrainingArtifact }) => void
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async () => await new Promise<{ artifact: AlicizationPersonaTrainingArtifact }>((resolve) => {
        resolveTraining = resolve
      }),
      persistence: recorder.persistence,
      now: () => 200,
      randomUUID: () => 'run-cancelled',
      basePersonaRevision: () => 'persona-core-v1',
    })

    const training = gate.train({ cardId: 'card-a' })
    await vi.waitFor(() => expect(resolveTraining).toBeTypeOf('function'))
    await gate.cancel({ runId: 'run-cancelled', reason: 'user-requested' })
    resolveTraining({ artifact: createArtifact('run-cancelled', 'artifact-must-not-be-used') })

    await expect(training).resolves.toMatchObject({
      status: 'failed',
      reason: 'cancelled',
    })
    expect(recorder.runs).toEqual([expect.objectContaining({
      runId: 'run-cancelled',
      status: 'cancelled',
      error: 'user-requested',
    })])
    expect(recorder.events.map(event => event.action)).toEqual([
      'training-started',
      'training-cancelled',
    ])
    expect(recorder.increments).toEqual([])
  })

  it('persists rollback and revoke state transitions for completed increments', async () => {
    const recorder = createPersistenceRecorder()
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      persistence: recorder.persistence,
      now: () => 200,
      randomUUID: () => 'run-state-transitions',
      basePersonaRevision: () => 'persona-core-v1',
    })

    const result = await gate.train({ cardId: 'card-a' })
    const incrementId = result.status === 'succeeded' ? result.increment.id : ''
    await gate.rollbackIncrement({ incrementId })
    await gate.revokeSource({ cardId: 'card-a', sourceId: 'reflection-1' })

    expect(recorder.increments[0]).toMatchObject({
      id: incrementId,
      state: 'revoked',
    })
    expect(recorder.events.map(event => event.action)).toEqual([
      'training-started',
      'training-completed',
      'training-increment-rolled-back',
      'training-increment-revoked',
    ])
    expect(recorder.events.slice(2)).toEqual([
      expect.objectContaining({ incrementId }),
      expect.objectContaining({ incrementId }),
    ])
  })

  it('does not invoke a training consumer unless the manifest is active and quality-gate passed', async () => {
    const executor = async () => ({ artifact: createArtifact('run-should-not-run') })
    const inactiveRuntime = createDatasetRuntime({
      dataset: createDataset({ activeAt: null }),
    })
    const inactiveGate = createPersonaTrainingPipelineGate({
      datasetRuntime: inactiveRuntime,
      trainingExecutor: executor,
      now: () => 200,
      randomUUID: () => 'run-inactive',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(inactiveGate.train({ cardId: 'card-a' })).rejects.toThrow('active')

    const qualityFailedGate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime({
        qualityGate: createQualityGate(false),
      }),
      trainingExecutor: executor,
      now: () => 200,
      randomUUID: () => 'run-quality-failed',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(qualityFailedGate.train({ cardId: 'card-a' })).rejects.toThrow('quality gate')
  })

  it('rejects a quality-approved manifest whose content or provenance no longer matches the dataset snapshot', async () => {
    const executor = vi.fn(async () => ({ artifact: createArtifact('run-must-not-run') }))
    const currentExample: PersonaTrainingDatasetExample = {
      id: 'example-1',
      datasetId: 'dataset-1',
      cardId: 'card-a',
      schemaVersion: 'persona-training-example-v1',
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
      contentHash: 'current-hash',
      behaviorLesson: '当前清洗后的行为经验。',
      positiveExample: '当前正例。',
      negativeExample: null,
      sensitivity: 'personal',
      piiStatus: 'clear',
      piiReason: null,
      consentSnapshot: consent,
      provenance: {
        kind: 'working-memory-cleaning',
        cleaningTransactionId: 'current-cleaning',
        cleanedAt: 100,
      },
      allowTraining: true,
      state: 'staged',
      createdAt: 100,
      revokedAt: null,
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime({
        manifest: createManifest({
          examples: [{
            ...createManifest().examples[0]!,
            contentHash: 'tampered-hash',
            provenance: {
              kind: 'working-memory-cleaning',
              cleaningTransactionId: 'tampered-cleaning',
              cleanedAt: 100,
            },
          }],
        }),
        examples: [currentExample],
      }),
      trainingExecutor: executor,
      now: () => 200,
      randomUUID: () => 'run-tampered-manifest',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).rejects.toThrow('manifest')
    expect(executor).not.toHaveBeenCalled()
  })

  it('keeps raw transcript and failure artifact source kinds outside the training consumer boundary', async () => {
    const executor = async () => ({ artifact: createArtifact('run-should-not-run') })
    const forbiddenManifest = createManifest({
      examples: [{
        ...createManifest().examples[0]!,
        sourceKind: 'failure-artifact' as 'cleaned-long-term-reflection',
      }],
    })
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime({
        manifest: forbiddenManifest,
      }),
      trainingExecutor: executor,
      now: () => 200,
      randomUUID: () => 'run-forbidden-source',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).rejects.toThrow('forbidden source kind')
  })

  it('passes only the active quality-approved manifest to the executor and records a rollbackable increment', async () => {
    const calls: unknown[] = []
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input) => {
        calls.push(input)
        return { artifact: createArtifact(input.runId) }
      },
      now: () => 200,
      randomUUID: () => 'run-success',
      basePersonaRevision: () => 'persona-core-v1',
    })

    const result = await gate.train({ cardId: 'card-a' })

    expect(result).toMatchObject({
      status: 'succeeded',
      runId: 'run-success',
      increment: {
        id: 'persona-training-increment:run-success',
        kind: 'persona-lora-increment',
        datasetId: 'dataset-1',
        manifestHash: 'manifest-hash-1',
        basePersonaRevision: 'persona-core-v1',
        artifact: expect.objectContaining({
          artifactId: 'artifact-run-success',
          runId: 'run-success',
        }),
        state: 'available',
      },
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      cardId: 'card-a',
      datasetId: 'dataset-1',
      manifest: { manifestHash: 'manifest-hash-1' },
      basePersonaRevision: 'persona-core-v1',
    })
    expect(gate.listIncrements()).toEqual([expect.objectContaining({
      id: 'persona-training-increment:run-success',
      state: 'available',
    })])
  })

  it('isolates executor failures without creating a persona increment or changing the persona core', async () => {
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async () => {
        throw new Error('trainer crashed')
      },
      now: () => 200,
      randomUUID: () => 'run-failed',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      runId: 'run-failed',
      reason: 'executor-failed',
      error: 'trainer crashed',
    })
    expect(gate.listIncrements()).toEqual([])
  })

  it('aborts a running training task and blocks its result when a source is revoked', async () => {
    let resolveTraining!: (value: { artifact: AlicizationPersonaTrainingArtifact }) => void
    let executorSignal: AbortSignal | undefined
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input) => {
        executorSignal = input.signal
        return await new Promise<{ artifact: AlicizationPersonaTrainingArtifact }>((resolve) => {
          resolveTraining = resolve
        })
      },
      now: () => 200,
      randomUUID: () => 'run-revoked',
      basePersonaRevision: () => 'persona-core-v1',
    })

    const training = gate.train({ cardId: 'card-a' })
    await vi.waitFor(() => expect(resolveTraining).toBeTypeOf('function'))
    await gate.revokeSource({ cardId: 'card-a', sourceId: 'reflection-1' })
    resolveTraining({ artifact: createArtifact('run-revoked', 'artifact-must-not-be-used') })

    await expect(training).resolves.toMatchObject({
      status: 'failed',
      runId: 'run-revoked',
      reason: 'source-revoked',
    })
    expect(executorSignal?.aborted).toBe(true)
    expect(gate.listIncrements()).toEqual([])
  })

  it('marks a completed increment rolled back so it cannot be used again', async () => {
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      now: () => 200,
      randomUUID: () => 'run-rollback',
      basePersonaRevision: () => 'persona-core-v1',
    })

    const result = await gate.train({ cardId: 'card-a' })
    const incrementId = result.status === 'succeeded' ? result.increment.id : ''
    const rolledBack = await gate.rollbackIncrement({ incrementId })

    expect(rolledBack).toMatchObject({
      id: incrementId,
      state: 'rolled-back',
    })
    expect(gate.listUsableIncrements()).toEqual([])
  })

  it('rehydrates increment state after atomic dataset governance updates the persistence owner', async () => {
    const recorder = createPersistenceRecorder()
    const datasetRuntime = createDatasetRuntime()
    datasetRuntime.atomicTrainingGovernance = true
    datasetRuntime.activateVersion = async () => {
      const persisted = recorder.increments[0]
      if (persisted)
        persisted.state = 'rolled-back'
      return createDataset()
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime,
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      persistence: recorder.persistence,
      now: () => 200,
      randomUUID: () => 'run-atomic-governance',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'succeeded',
    })
    expect(gate.listUsableIncrements()).toHaveLength(1)

    await gate.activateVersion({
      cardId: 'card-a',
      datasetId: 'dataset-1',
    })

    expect(gate.listUsableIncrements()).toEqual([])
    expect(gate.listIncrements()).toEqual([
      expect.objectContaining({
        state: 'rolled-back',
      }),
    ])
  })

  it('does not invalidate an active run when atomic dataset activation fails to commit', async () => {
    const datasetRuntime = createDatasetRuntime()
    datasetRuntime.atomicTrainingGovernance = true
    datasetRuntime.activateVersion = async () => {
      throw new Error('dataset activation transaction failed')
    }
    let resolveTraining!: (value: { artifact: AlicizationPersonaTrainingArtifact }) => void
    let executorSignal: AbortSignal | undefined
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime,
      trainingExecutor: async (input) => {
        executorSignal = input.signal
        return await new Promise<{ artifact: AlicizationPersonaTrainingArtifact }>((resolve) => {
          resolveTraining = resolve
        })
      },
      now: () => 200,
      randomUUID: () => 'run-activation-failure',
      basePersonaRevision: () => 'persona-core-v1',
    })

    const training = gate.train({ cardId: 'card-a' })
    await vi.waitFor(() => expect(resolveTraining).toBeTypeOf('function'))

    await expect(gate.activateVersion({
      cardId: 'card-a',
      datasetId: 'dataset-1',
    })).rejects.toThrow('dataset activation transaction failed')
    expect(executorSignal?.aborted).toBe(false)

    resolveTraining({ artifact: createArtifact('run-activation-failure') })
    await expect(training).resolves.toMatchObject({
      status: 'succeeded',
    })
  })

  it('invalidates old training runs and increments when the active dataset is rolled back', async () => {
    let resolveTraining!: (value: { artifact: AlicizationPersonaTrainingArtifact }) => void
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async () => await new Promise<{ artifact: AlicizationPersonaTrainingArtifact }>((resolve) => {
        resolveTraining = resolve
      }),
      now: () => 200,
      randomUUID: () => 'run-dataset-rollback',
      basePersonaRevision: () => 'persona-core-v1',
    })

    const training = gate.train({ cardId: 'card-a' })
    await vi.waitFor(() => expect(resolveTraining).toBeTypeOf('function'))
    const rollback = gate.rollbackVersion({
      cardId: 'card-a',
      datasetId: 'dataset-rollback',
    })
    resolveTraining({ artifact: createArtifact('run-dataset-rollback', 'artifact-must-not-be-used') })

    await expect(training).resolves.toMatchObject({
      status: 'failed',
      reason: 'dataset-rolled-back',
    })
    await expect(rollback).resolves.toMatchObject({
      id: 'dataset-rollback',
    })
    expect(gate.listUsableIncrements()).toEqual([])
  })
})
