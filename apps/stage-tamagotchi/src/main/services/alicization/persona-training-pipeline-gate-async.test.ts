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

import {
  createPersonaTrainingPipelineGate,
  PersonaTrainingExecutorArtifactError,
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

  it('aborts every active run before waiting for any terminalization', async () => {
    const storage = createPersistence()
    const baseUpdateRun = storage.persistence.updateRun
    let terminalizingStartedResolve!: () => void
    const terminalizingStarted = new Promise<void>((resolve) => {
      terminalizingStartedResolve = resolve
    })
    let releaseTerminalizing!: () => void
    const terminalizingReleased = new Promise<void>((resolve) => {
      releaseTerminalizing = resolve
    })
    const signals = new Map<string, AbortSignal>()
    storage.persistence.updateRun = async (update) => {
      if (update.status === 'terminalizing' && update.runId === 'run-stop-first') {
        terminalizingStartedResolve()
        await terminalizingReleased
      }
      return await baseUpdateRun(update)
    }
    let runSequence = 0
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => {
        signals.set(input.runId, input.signal)
        await new Promise<void>((resolve) => {
          if (input.signal.aborted) {
            resolve()
            return
          }
          input.signal.addEventListener('abort', () => resolve(), { once: true })
        })
        throw input.signal.reason
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => `run-stop-${runSequence++ === 0 ? 'first' : 'second'}`,
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await gate.start({ cardId: 'card-a' })
    await vi.waitFor(() => {
      expect(signals.has('run-stop-first')).toBe(true)
      expect(signals.has('run-stop-second')).toBe(true)
    })

    const stopping = gate.stop('database-close')
    await terminalizingStarted
    expect(signals.get('run-stop-first')?.aborted).toBe(true)
    expect(signals.get('run-stop-second')?.aborted).toBe(true)

    releaseTerminalizing()
    await stopping
  })

  it('aborts a run even when shutdown finds its completion transaction already terminalizing', async () => {
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
    let executorSignal!: AbortSignal
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => {
        executorSignal = input.signal
        return { artifact: createArtifact(input.runId, 'artifact-terminalizing-stop') }
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-terminalizing-stop',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await completionStarted
    const stopping = gate.stop('database-close')
    try {
      expect(executorSignal.aborted).toBe(true)
    }
    finally {
      releaseCompletion()
      await stopping
    }
  })

  it('waits for the trainer to exit after terminalizing persistence rejects during shutdown', async () => {
    const storage = createPersistence()
    const baseUpdateRun = storage.persistence.updateRun
    storage.persistence.updateRun = async (update) => {
      if (update.status === 'terminalizing')
        throw new Error('terminalizing persistence unavailable')
      return await baseUpdateRun(update)
    }
    let abortObservedResolve!: () => void
    const abortObserved = new Promise<void>((resolve) => {
      abortObservedResolve = resolve
    })
    let releaseExecutorExit!: () => void
    const executorExitReleased = new Promise<void>((resolve) => {
      releaseExecutorExit = resolve
    })
    let executorReadyResolve!: () => void
    const executorReady = new Promise<void>((resolve) => {
      executorReadyResolve = resolve
    })
    let executorExited = false
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => await new Promise((_, reject) => {
        const handleAbort = () => {
          abortObservedResolve()
          void executorExitReleased.then(() => {
            executorExited = true
            reject(input.signal.reason)
          })
        }
        input.signal.addEventListener('abort', handleAbort, { once: true })
        executorReadyResolve()
        if (input.signal.aborted)
          handleAbort()
      }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-stop-persistence-failure',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await vi.waitFor(() => expect(storage.runs.get('run-stop-persistence-failure')?.status).toBe('running'))
    await executorReady
    const stopping = gate.stop('card-switch')
    await abortObserved
    const settledBeforeExit = await Promise.race([
      stopping.then(() => true, () => true),
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), 20)),
    ])
    expect(settledBeforeExit).toBe(false)

    releaseExecutorExit()
    await expect(stopping).rejects.toThrow('terminalizing persistence unavailable')
    expect(executorExited).toBe(true)
  })

  it('discards a late artifact even when shutdown persisted the terminal event first', async () => {
    const storage = createPersistence()
    const artifact = createArtifact('run-late-artifact-after-stop', 'artifact-late-after-stop')
    const discardArtifact = vi.fn(async () => {})
    const baseFinishRun = storage.persistence.finishRun
    let terminalEventPersistedResolve!: () => void
    const terminalEventPersisted = new Promise<void>((resolve) => {
      terminalEventPersistedResolve = resolve
    })
    let executorReadyResolve!: () => void
    const executorReady = new Promise<void>((resolve) => {
      executorReadyResolve = resolve
    })
    storage.persistence.finishRun = async (input) => {
      const finished = await baseFinishRun(input)
      if (finished && input.run.status === 'interrupted')
        terminalEventPersistedResolve()
      return finished
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => await new Promise((resolve) => {
        const handleAbort = () => {
          void terminalEventPersisted.then(() => resolve({ artifact }))
        }
        input.signal.addEventListener('abort', handleAbort, { once: true })
        executorReadyResolve()
        if (input.signal.aborted)
          handleAbort()
      }),
      artifactLifecycle: {
        discardArtifact,
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-late-artifact-after-stop',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await gate.start({ cardId: 'card-a' })
    await vi.waitFor(() => expect(storage.runs.get('run-late-artifact-after-stop')?.status).toBe('running'))
    await executorReady
    await gate.stop('database-close')

    expect(discardArtifact).toHaveBeenCalledWith(artifact)
    expect(storage.runs.get('run-late-artifact-after-stop')).toMatchObject({
      status: 'interrupted',
      artifact: null,
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
    const cancellation = gate.cancel({
      cardId: 'card-a',
      runId: 'run-terminalizing',
      reason: 'too-late',
    })
    const stopping = gate.stop('database-close')

    releaseTerminalizing()
    const [cancelledRecord] = await Promise.all([cancellation, lateProgressResult, stopping])
    expect(cancelledRecord).toMatchObject({
      status: 'completed',
    })

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

  it.each([
    ['a false compare-and-set', 'false'],
    ['a rejected compare-and-set', 'reject'],
  ])('keeps a run cancellable when terminalizing persistence reports %s', async (_, failureMode) => {
    const storage = createPersistence()
    const baseUpdateRun = storage.persistence.updateRun
    let terminalizingAttempts = 0
    let releaseFirstTerminalizing!: () => void
    const firstTerminalizingReleased = new Promise<void>((resolve) => {
      releaseFirstTerminalizing = resolve
    })
    let firstTerminalizingStartedResolve!: () => void
    const firstTerminalizingStarted = new Promise<void>((resolve) => {
      firstTerminalizingStartedResolve = resolve
    })
    storage.persistence.updateRun = async (update) => {
      if (update.status !== 'terminalizing')
        return await baseUpdateRun(update)
      terminalizingAttempts += 1
      if (terminalizingAttempts === 1) {
        firstTerminalizingStartedResolve()
        await firstTerminalizingReleased
        if (failureMode === 'reject')
          throw new Error('terminalizing persistence unavailable')
        return false
      }
      return await baseUpdateRun(update)
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => ({ artifact: createArtifact(input.runId, 'artifact-terminalizing-retry') }),
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => `run-terminalizing-${failureMode}`,
      basePersonaRevision: () => 'persona-core-v1',
    } as any)
    const runId = `run-terminalizing-${failureMode}`

    await gate.start({ cardId: 'card-a' })
    await firstTerminalizingStarted
    const cancellation = gate.cancel({
      cardId: 'card-a',
      runId,
      reason: 'cancel-after-terminalizing-cas-failure',
    })
    releaseFirstTerminalizing()

    await expect(cancellation).resolves.toMatchObject({
      status: 'cancel_requested',
      failureReason: 'cancelled',
    })
    await vi.waitFor(() => expect(storage.runs.get(runId)).toMatchObject({
      status: 'cancelled',
      failureReason: 'cancelled',
    }))
    expect(terminalizingAttempts).toBeGreaterThanOrEqual(2)
    expect(storage.increments).toEqual([])
  })

  it('discards a published artifact when the completion transaction cannot commit', async () => {
    const storage = createPersistence()
    const artifact = createArtifact('run-completion-compensation', 'artifact-completion-compensation')
    const discardArtifact = vi.fn(async () => {})
    storage.persistence.completeRunWithIncrement = async () => {
      throw new Error('forced completion audit failure')
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async () => ({ artifact }),
      artifactLifecycle: {
        discardArtifact,
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-completion-compensation',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      reason: 'executor-failed',
      error: 'forced completion audit failure',
    })
    expect(discardArtifact).toHaveBeenCalledWith(artifact)
    expect(storage.increments).toEqual([])
    expect(storage.runs.get('run-completion-compensation')).toMatchObject({
      status: 'failed',
      artifact: null,
    })
  })

  it('persists a retryable cleanup intent when artifact compensation fails', async () => {
    const storage = createPersistence()
    const artifact = createArtifact('run-cleanup-intent', 'artifact-cleanup-intent')
    const recordArtifactCleanupIntent = vi.fn(async () => {})
    ;(storage.persistence as any).recordArtifactCleanupIntent = recordArtifactCleanupIntent
    storage.persistence.completeRunWithIncrement = async () => {
      throw new Error('forced completion failure')
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async () => ({ artifact }),
      artifactLifecycle: {
        discardArtifact: async () => {
          throw new Error('artifact cleanup unavailable')
        },
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-cleanup-intent',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringContaining('artifact cleanup unavailable'),
    })
    expect(recordArtifactCleanupIntent).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-a',
      runId: 'run-cleanup-intent',
      incrementId: null,
      artifact,
      reason: 'training-failed',
      lastError: 'artifact cleanup unavailable',
    }))
  })

  it('compensates a published artifact exposed through a structured executor failure', async () => {
    const storage = createPersistence()
    const artifact = createArtifact('run-structured-cleanup', 'artifact-structured-cleanup')
    const discardArtifact = vi.fn(async () => {
      throw new Error('artifact cleanup unavailable')
    })
    const recordArtifactCleanupIntent = vi.fn(async () => {})
    ;(storage.persistence as any).recordArtifactCleanupIntent = recordArtifactCleanupIntent
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async () => {
        throw new PersonaTrainingExecutorArtifactError(
          'run directory cleanup unavailable',
          artifact,
        )
      },
      artifactLifecycle: {
        discardArtifact,
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-structured-cleanup',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringContaining('run directory cleanup unavailable'),
    })
    expect(discardArtifact).toHaveBeenCalledWith(artifact)
    expect(recordArtifactCleanupIntent).toHaveBeenCalledWith(expect.objectContaining({
      artifact,
      runId: 'run-structured-cleanup',
      reason: 'training-failed',
    }))
  })

  it('summarizes every cleanup reason when multiple artifact compensations fail', async () => {
    const storage = createPersistence()
    ;(storage.persistence as any).recordArtifactCleanupIntent = vi.fn(async () => {})
    let runSequence = 0
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async (input: PersonaTrainingExecutorInput) => ({
        artifact: createArtifact(input.runId, `artifact-${input.runId}`),
      }),
      artifactLifecycle: {
        discardArtifact: async (artifact: AlicizationPersonaTrainingArtifact) => {
          throw new Error(`cleanup unavailable for ${artifact.artifactId}`)
        },
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => `run-cleanup-${++runSequence}`,
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'succeeded',
    })
    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'succeeded',
    })

    let cleanupFailure: unknown
    try {
      await gate.revokeSource({
        cardId: 'card-a',
        sourceId: 'reflection-1',
        sourceKind: 'cleaned-long-term-reflection',
      })
    }
    catch (error) {
      cleanupFailure = error
    }

    expect(cleanupFailure).toBeInstanceOf(AggregateError)
    expect((cleanupFailure as Error).message).toContain('cleanup unavailable for artifact-run-cleanup-1')
    expect((cleanupFailure as Error).message).toContain('cleanup unavailable for artifact-run-cleanup-2')
  })

  it('discards a completed artifact only after source revoke governance commits', async () => {
    const storage = createPersistence()
    const artifact = createArtifact('run-completed-source-revoke', 'artifact-completed-source-revoke')
    const discardArtifact = vi.fn(async () => {})
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async () => ({ artifact }),
      artifactLifecycle: {
        discardArtifact,
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-completed-source-revoke',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'succeeded',
    })
    await gate.revokeSource({
      cardId: 'card-a',
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
    })

    expect(discardArtifact).toHaveBeenCalledWith(artifact)
    expect(gate.listUsableIncrements()).toEqual([])
  })

  it('keeps a completed artifact available when source revoke governance rolls back', async () => {
    const storage = createPersistence()
    const artifact = createArtifact('run-source-revoke-rollback', 'artifact-source-revoke-rollback')
    const discardArtifact = vi.fn(async () => {})
    const datasetRuntime = createDatasetRuntime()
    datasetRuntime.revokeSource = async () => {
      throw new Error('forced source revoke audit failure')
    }
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime,
      trainingExecutor: async () => ({ artifact }),
      artifactLifecycle: {
        discardArtifact,
      },
      persistence: storage.persistence,
      now: () => 200,
      randomUUID: () => 'run-source-revoke-rollback',
      basePersonaRevision: () => 'persona-core-v1',
    } as any)

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'succeeded',
    })
    await expect(gate.revokeSource({
      cardId: 'card-a',
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
    })).rejects.toThrow('forced source revoke audit failure')

    expect(discardArtifact).not.toHaveBeenCalled()
    expect(gate.listUsableIncrements()).toEqual([
      expect.objectContaining({
        artifact,
        state: 'available',
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
    await gate.revokeSource({
      cardId: 'card-a',
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
    })

    await vi.waitFor(() => expect(storage.runs.get('run-revoked')).toMatchObject({
      status: 'failed',
      failureReason: 'source-revoked',
    }))
  })
})
