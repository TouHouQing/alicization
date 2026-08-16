import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

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
      if (!current || !['queued', 'running', 'cancel_requested'].includes(current.status))
        return false
      runs.set(update.runId, { ...current, ...structuredClone(update) })
      return true
    },
    getRun: async runId => structuredClone(runs.get(runId) ?? null),
    listRuns: async ({ cardId }) => [...runs.values()]
      .filter(run => run.cardId === cardId)
      .map(run => structuredClone(run)),
    completeRunWithIncrement: async ({ run, increment }) => {
      const current = runs.get(run.runId)
      if (!current || current.status !== 'terminalizing')
        return { completed: false }
      increments.push(structuredClone(increment))
      runs.set(run.runId, structuredClone(run))
      return { completed: true }
    },
    finishRun: async ({ run }) => {
      const current = runs.get(run.runId)
      if (!current || current.status !== 'terminalizing')
        return false
      runs.set(run.runId, structuredClone(run))
      return true
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
        return { artifact: createArtifact(input.runId, 'artifact-1') }
      },
      resolveExecutorConfig: () => ({
        executable: '/tmp/trainer',
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
    let executorStartedResolve!: () => void
    const executorStarted = new Promise<void>((resolve) => {
      executorStartedResolve = resolve
    })
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => await new Promise((_, reject) => {
        executorStartedResolve()
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
    await executorStarted
    await gate.stop('card-switch')

    expect(processExited).toBe(true)
    expect(storage.runs.get('run-interrupted')).toMatchObject({
      status: 'interrupted',
      error: 'card-switch',
    })
  })

  it('does not let cancellation overwrite a run while its completion transaction is in flight', async () => {
    const storage = createPersistence()
    const baseCompleteRunWithIncrement = storage.persistence.completeRunWithIncrement
    let releaseCompletion!: () => void
    const completionReleased = new Promise<void>((resolve) => {
      releaseCompletion = resolve
    })
    let completionStartedResolve!: () => void
    const completionStarted = new Promise<void>((resolve) => {
      completionStartedResolve = resolve
    })
    storage.persistence.completeRunWithIncrement = async (input) => {
      completionStartedResolve()
      await completionReleased
      return await baseCompleteRunWithIncrement(input)
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => ({ artifact: createArtifact(input.runId, 'artifact-completed') }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-completed-audit',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await completionStarted
    expect(storage.runs.get('run-completed-audit')?.status).toBe('terminalizing')

    const cancellation = await gate.cancel({
      cardId: 'card-a',
      runId: 'run-completed-audit',
      reason: 'too-late',
    })

    expect(cancellation?.status).toBe('terminalizing')
    releaseCompletion()
    await vi.waitFor(() => expect(storage.runs.get('run-completed-audit')?.status).toBe('completed'))
  })

  it('does not let shutdown overwrite a run once transactional completion has started', async () => {
    const storage = createPersistence()
    const baseCompleteRunWithIncrement = storage.persistence.completeRunWithIncrement
    let releaseCompletion!: () => void
    const completionReleased = new Promise<void>((resolve) => {
      releaseCompletion = resolve
    })
    let completionStartedResolve!: () => void
    const completionStarted = new Promise<void>((resolve) => {
      completionStartedResolve = resolve
    })
    storage.persistence.completeRunWithIncrement = async (input) => {
      completionStartedResolve()
      await completionReleased
      return await baseCompleteRunWithIncrement(input)
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => ({ artifact: createArtifact(input.runId, 'artifact-interrupted') }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-finalization-interrupted',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await completionStarted
    const stopping = gate.stop('database-close')
    releaseCompletion()
    await stopping

    expect(storage.runs.get('run-finalization-interrupted')).toMatchObject({
      status: 'completed',
      failureReason: null,
    })
    expect(storage.increments).toEqual([
      expect.objectContaining({
        state: 'available',
      }),
    ])
  })

  it('serializes terminalizing with late progress, cancel, and stop without overwriting completion', async () => {
    const storage = createPersistence()
    const updates: Array<Partial<PersonaTrainingPipelineRunRecord> & { runId: string }> = []
    const baseUpdateRun = storage.persistence.updateRun
    let releaseTerminalizing!: () => void
    const terminalizingReleased = new Promise<void>((resolve) => {
      releaseTerminalizing = resolve
    })
    storage.persistence.updateRun = async (update) => {
      updates.push(structuredClone(update))
      if (update.status === 'terminalizing') {
        await terminalizingReleased
      }
      return await baseUpdateRun(update)
    }
    storage.persistence.completeRunWithIncrement = async ({
      run,
      increment,
    }) => {
      storage.increments.push(structuredClone(increment))
      storage.runs.set(run.runId, structuredClone(run))
      return { completed: true }
    }
    let lateProgress!: NonNullable<PersonaTrainingExecutorInput['onProgress']>
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => {
        lateProgress = input.onProgress!
        return { artifact: createArtifact(input.runId, 'artifact-terminalized') }
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-terminalizing',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await vi.waitFor(() => expect(updates.some(update => update.status === 'terminalizing')).toBe(true))
    const lateProgressResult = lateProgress({
      stage: 'training',
      progress: 0.2,
      message: 'late-progress',
    })
    const cancellation = await gate.cancel({
      cardId: 'card-a',
      runId: 'run-terminalizing',
      reason: 'too-late',
    })
    const stopping = gate.stop('database-close')

    expect(cancellation).toMatchObject({
      status: 'terminalizing',
    })
    releaseTerminalizing()
    await Promise.all([lateProgressResult, stopping])

    await vi.waitFor(() => expect(storage.runs.get('run-terminalizing')).toMatchObject({
      status: 'completed',
      stage: 'finalizing',
      progress: 1,
      progressMessage: null,
    }))
    const terminalizingIndex = updates.findIndex(update => update.status === 'terminalizing')
    expect(updates.slice(terminalizingIndex + 1)).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        stage: 'training',
        progressMessage: 'late-progress',
      }),
      expect.objectContaining({
        status: 'cancel_requested',
      }),
      expect.objectContaining({
        status: 'interrupted',
      }),
    ]))
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
