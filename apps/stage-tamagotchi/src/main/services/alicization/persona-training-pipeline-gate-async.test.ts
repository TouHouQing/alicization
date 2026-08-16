import type {
  PersonaTrainingDatasetManifest,
  PersonaTrainingDatasetRuntime,
  PersonaTrainingDatasetVersion,
} from './persona-training-dataset-runtime'
import type {
  PersonaTrainingExecutorInput,
  PersonaTrainingPipelineIncrement,
  PersonaTrainingPipelinePersistence,
  PersonaTrainingPipelineRunRecord,
} from './persona-training-pipeline-gate'

import { describe, expect, it, vi } from 'vitest'

import { createPersonaTrainingPipelineGate } from './persona-training-pipeline-gate'

const consent = {
  granted: true,
  policyVersion: 'persona-training-consent-v1',
  scope: 'persona-dataset',
  capturedAt: 100,
}

function createDataset(): PersonaTrainingDatasetVersion {
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
  }
}

function createManifest(): PersonaTrainingDatasetManifest {
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
  }
}

function createDatasetRuntime(): PersonaTrainingDatasetRuntime {
  const dataset = createDataset()
  const manifest = createManifest()
  return {
    stageVersion: async () => dataset,
    getSnapshot: async () => ({
      activeVersionId: dataset.id,
      versions: [dataset],
      examples: [],
    }),
    exportVersion: async () => ({
      dataset,
      manifest,
      qualityGate: {
        passed: true,
        criticalFindingCount: 0,
        warningFindingCount: 0,
        findings: [],
      },
    }),
    activateVersion: async () => dataset,
    rollbackVersion: async () => dataset,
    revokeSource: async () => ({ affected: 1 }),
    setExamplePolicy: async () => null,
  }
}

function createPersistence() {
  const runs = new Map<string, PersonaTrainingPipelineRunRecord>()
  const increments: PersonaTrainingPipelineIncrement[] = []
  const persistence: PersonaTrainingPipelinePersistence = {
    createRun: async (run) => {
      runs.set(run.runId, structuredClone(run))
    },
    updateRun: async (update) => {
      const current = runs.get(update.runId)
      if (current)
        runs.set(update.runId, { ...current, ...structuredClone(update) })
    },
    getRun: async runId => structuredClone(runs.get(runId) ?? null),
    listRuns: async ({ cardId }) => [...runs.values()]
      .filter(run => run.cardId === cardId)
      .map(run => structuredClone(run)),
    interruptNonTerminalRuns: async () => 0,
    createIncrement: async (increment) => {
      increments.push(structuredClone(increment))
    },
    updateIncrementState: async () => {},
    appendEvent: async () => {},
    listIncrements: async () => increments.map(increment => structuredClone(increment)),
  }
  return {
    increments,
    runs,
    persistence,
  }
}

describe('persona training pipeline asynchronous lifecycle', () => {
  it('returns a persisted queued run before the executor completes and persists progress', async () => {
    const storage = createPersistence()
    let finish!: () => void
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => {
        await input.onProgress?.({
          stage: 'training',
          progress: 0.4,
          message: 'training',
        })
        await new Promise<void>((resolve) => {
          finish = resolve
        })
        return { artifact: { artifactId: 'artifact-1' } }
      },
      resolveExecutorConfig: () => ({
        executable: '/tmp/trainer',
        fixedArguments: [],
        baseModel: 'base-model-v1',
        timeoutMs: 1_000,
      }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-async',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    const started = await gate.start({ cardId: 'card-a' })

    expect(started.run).toMatchObject({
      runId: 'run-async',
      status: 'queued',
      progress: 0,
    })
    await vi.waitFor(async () => {
      await expect(gate.getRun({ cardId: 'card-a', runId: 'run-async' })).resolves.toMatchObject({
        status: 'running',
        stage: 'training',
        progress: 0.4,
      })
    })
    finish()
    await vi.waitFor(async () => {
      await expect(gate.getRun({ cardId: 'card-a', runId: 'run-async' })).resolves.toMatchObject({
        status: 'completed',
        progress: 1,
      })
    })
  })

  it('persists cancel_requested before aborting and settles cancelled', async () => {
    const storage = createPersistence()
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => await new Promise((_, reject) => {
        if (input.signal.aborted) {
          reject(input.signal.reason)
          return
        }
        input.signal.addEventListener('abort', () => reject(input.signal.reason), { once: true })
      }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-cancel',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await vi.waitFor(() => expect(storage.runs.get('run-cancel')?.status).toBe('running'))
    const cancelRequested = await gate.cancel({
      cardId: 'card-a',
      runId: 'run-cancel',
      reason: 'user-requested',
    })

    expect(cancelRequested).toMatchObject({
      status: 'cancel_requested',
      error: 'user-requested',
    })
    await vi.waitFor(() => expect(storage.runs.get('run-cancel')?.status).toBe('cancelled'))
  })

  it('interrupts and awaits active work during shutdown', async () => {
    const storage = createPersistence()
    let processExited = false
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => await new Promise((_, reject) => {
        input.signal.addEventListener('abort', () => {
          setTimeout(() => {
            processExited = true
            reject(input.signal.reason)
          }, 10)
        }, { once: true })
      }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-interrupted',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await vi.waitFor(() => expect(storage.runs.get('run-interrupted')?.status).toBe('running'))
    await gate.stop('card-switch')

    expect(processExited).toBe(true)
    expect(storage.runs.get('run-interrupted')).toMatchObject({
      status: 'interrupted',
      error: 'card-switch',
    })
  })

  it('does not let cancellation overwrite a completed run while its audit event is still flushing', async () => {
    const storage = createPersistence()
    let releaseCompletedAudit!: () => void
    const completedAuditReleased = new Promise<void>((resolve) => {
      releaseCompletedAudit = resolve
    })
    let completedAuditStartedResolve!: () => void
    const completedAuditStarted = new Promise<void>((resolve) => {
      completedAuditStartedResolve = resolve
    })
    storage.persistence.appendEvent = async (event) => {
      if (event.action !== 'training-completed')
        return
      completedAuditStartedResolve()
      await completedAuditReleased
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async () => ({ artifact: { artifactId: 'artifact-completed' } }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-completed-audit',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await completedAuditStarted
    expect(storage.runs.get('run-completed-audit')?.status).toBe('completed')

    const cancellation = await gate.cancel({
      cardId: 'card-a',
      runId: 'run-completed-audit',
      reason: 'too-late',
    })

    expect(cancellation?.status).toBe('completed')
    expect(storage.runs.get('run-completed-audit')?.status).toBe('completed')
    releaseCompletedAudit()
  })

  it('keeps shutdown interruption authoritative when increment persistence is still in flight', async () => {
    const storage = createPersistence()
    let releaseIncrement!: () => void
    const incrementReleased = new Promise<void>((resolve) => {
      releaseIncrement = resolve
    })
    let incrementStartedResolve!: () => void
    const incrementStarted = new Promise<void>((resolve) => {
      incrementStartedResolve = resolve
    })
    storage.persistence.createIncrement = async (increment) => {
      storage.increments.push(structuredClone(increment))
      incrementStartedResolve()
      await incrementReleased
    }
    storage.persistence.updateIncrementState = async ({ incrementId, state }) => {
      const increment = storage.increments.find(item => item.id === incrementId)
      if (increment)
        increment.state = state
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async () => ({ artifact: { artifactId: 'artifact-interrupted' } }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-finalization-interrupted',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await incrementStarted
    const stopping = gate.stop('database-close')
    releaseIncrement()
    await stopping

    expect(storage.runs.get('run-finalization-interrupted')).toMatchObject({
      status: 'interrupted',
      failureReason: 'interrupted',
    })
    expect(storage.increments).toEqual([
      expect.objectContaining({
        state: 'rolled-back',
      }),
    ])
  })

  it('aborts an active run when one of its cleaned sources is revoked', async () => {
    const storage = createPersistence()
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => await new Promise((_, reject) => {
        if (input.signal.aborted) {
          reject(input.signal.reason)
          return
        }
        input.signal.addEventListener('abort', () => reject(input.signal.reason), { once: true })
      }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-revoked',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await vi.waitFor(() => expect(storage.runs.get('run-revoked')?.status).toBe('running'))
    await gate.revokeSource({ cardId: 'card-a', sourceId: 'reflection-1' })

    await vi.waitFor(() => expect(storage.runs.get('run-revoked')).toMatchObject({
      status: 'failed',
      failureReason: 'source-revoked',
    }))
  })
})
