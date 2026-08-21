import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import type {
  PersonaTrainingDatasetExample,
  PersonaTrainingDatasetManifest,
  PersonaTrainingDatasetQualityGateResult,
  PersonaTrainingDatasetRuntime,
  PersonaTrainingDatasetVersion,
} from './persona-training-dataset-runtime'
import type {
  PersonaTrainingArtifactActivationIntent,
  PersonaTrainingArtifactCleanupIntent,
  PersonaTrainingPipelineAuditEvent,
  PersonaTrainingPipelineIncrement,
  PersonaTrainingPipelinePersistence,
  PersonaTrainingPipelineRunRecord,
} from './persona-training-pipeline-gate'

import { describe, expect, it, vi } from 'vitest'

import { buildPersonaTrainingDatasetManifest } from './persona-training-dataset-runtime'
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
  it('rejects an artifact loader when no lifecycle owner can discard its artifacts', () => {
    expect(() => createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async () => ({
          loaderId: 'test-loader',
          receiptId: 'receipt-without-lifecycle',
          activatedAt: 201,
        }),
        unload: async () => {},
      },
      now: () => 200,
      randomUUID: () => 'run-loader-without-lifecycle',
      basePersonaRevision: () => 'persona-core-v1',
    })).toThrow('artifactLoader requires artifactLifecycle')
  })

  it('rejects a completed activation intent instead of reusing it as a new load operation', async () => {
    const recorder = createPersistenceRecorder()
    const persistence: PersonaTrainingPipelinePersistence = {
      ...recorder.persistence,
      beginArtifactActivation: async intent => ({
        ...intent,
        status: 'completed',
      }),
    }
    const load = vi.fn(async () => ({
      loaderId: 'test-loader',
      receiptId: 'receipt-must-not-load',
      activatedAt: 201,
    }))
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load,
        unload: async () => {},
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
      persistence,
      now: () => 200,
      randomUUID: () => 'run-completed-activation-intent',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringContaining('activation intent owner or lifecycle state'),
    })
    expect(load).not.toHaveBeenCalled()
  })

  it('rejects an incompatible artifact before creating an external loader side effect', async () => {
    const load = vi.fn(async () => ({
      loaderId: 'test-loader',
      receiptId: 'receipt-must-not-load',
      activatedAt: 201,
    }))
    const discardArtifact = vi.fn(async () => {})
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({
        artifact: {
          ...createArtifact(input.runId),
          compatibility: {
            status: 'incompatible',
            baseModel: 'another-base-model',
            reason: 'base model mismatch',
          },
        },
      }),
      artifactLoader: {
        load,
        unload: async () => {},
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
      now: () => 200,
      randomUUID: () => 'run-incompatible-loader-artifact',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringContaining('not compatible'),
    })
    expect(load).not.toHaveBeenCalled()
    expect(discardArtifact).toHaveBeenCalledOnce()
  })

  it('rejects an artifact that is not training-ready before creating a loader side effect', async () => {
    const load = vi.fn(async () => ({
      loaderId: 'test-loader',
      receiptId: 'receipt-must-not-load-training-incomplete',
      activatedAt: 201,
    }))
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({
        artifact: {
          ...createArtifact(input.runId),
          trainingReady: false,
          dialogueReady: true,
        },
      }),
      artifactLoader: {
        load,
        unload: async () => {},
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
      now: () => 200,
      randomUUID: () => 'run-training-incomplete-artifact',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringContaining('not compatible'),
    })
    expect(load).not.toHaveBeenCalled()
  })

  it('rejects MLX safetensors unless the artifact declares an MLX runtime loader target', async () => {
    const load = vi.fn(async () => ({
      loaderId: 'test-loader',
      receiptId: 'receipt-must-not-load-mlx-artifact',
      activatedAt: 201,
    }))
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({
        artifact: {
          ...createArtifact(input.runId),
          trainingReady: true,
          dialogueReady: true,
          format: 'mlx-safetensors',
          loaderTarget: 'unknown',
        },
      }),
      artifactLoader: {
        load,
        unload: async () => {},
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
      now: () => 200,
      randomUUID: () => 'run-mlx-unknown-target',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringContaining('not compatible'),
    })
    expect(load).not.toHaveBeenCalled()
  })

  it('rejects an artifact that is explicitly not dialogue-ready even if compatibility looks acceptable', async () => {
    const load = vi.fn(async () => ({
      loaderId: 'test-loader',
      receiptId: 'receipt-must-not-load-dialogue-incomplete',
      activatedAt: 201,
    }))
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({
        artifact: {
          ...createArtifact(input.runId),
          trainingReady: true,
          dialogueReady: false,
          format: 'gguf',
          loaderTarget: 'llama.cpp',
        },
      }),
      artifactLoader: {
        load,
        unload: async () => {},
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
      now: () => 200,
      randomUUID: () => 'run-dialogue-incomplete-artifact',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringContaining('not compatible'),
    })
    expect(load).not.toHaveBeenCalled()
  })

  it('persists the approved manifest boundary and training completion lifecycle', async () => {
    const recorder = createPersistenceRecorder()
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
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
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
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

  it('marks an artifact active only with a loader receipt and unloads it before rollback cleanup', async () => {
    const lifecycle: string[] = []
    const load = vi.fn(async () => {
      lifecycle.push('load')
      return {
        loaderId: 'test-loader',
        receiptId: 'receipt-1',
        activatedAt: 201,
        reason: 'Loaded by the test adapter runtime.',
      }
    })
    const unload = vi.fn(async () => {
      lifecycle.push('unload')
    })
    const discardArtifact = vi.fn(async () => {
      lifecycle.push('discard')
    })
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load,
        unload,
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
      now: () => 200,
      randomUUID: () => 'run-loader-backed',
      basePersonaRevision: () => 'persona-core-v1',
    })

    const result = await gate.train({ cardId: 'card-a' })

    expect(result).toMatchObject({
      status: 'succeeded',
      increment: {
        artifact: {
          activation: {
            status: 'active',
            loaderId: 'test-loader',
            receiptId: 'receipt-1',
            activatedAt: 201,
          },
        },
      },
    })
    expect(load).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'persona-training-artifact-activation:card-a:run-loader-backed:persona-training-increment%3Arun-loader-backed:artifact-run-loader-backed:initial:load',
    }))
    const incrementId = result.status === 'succeeded' ? result.increment.id : ''
    await gate.rollbackIncrement({ cardId: 'card-a', incrementId })
    expect(unload).toHaveBeenCalledOnce()
    expect(lifecycle).toEqual(['load', 'unload', 'discard'])
  })

  it('forces an executor-declared active artifact to unsupported when no loader exists', async () => {
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({
        artifact: {
          ...createArtifact(input.runId),
          activation: {
            status: 'active',
            reason: 'Executor attempted to bypass the loader.',
            loaderId: 'untrusted-executor',
            receiptId: 'untrusted-receipt',
            activatedAt: 200,
          },
        },
      }),
      now: () => 200,
      randomUUID: () => 'run-untrusted-active-artifact',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'succeeded',
      increment: {
        artifact: {
          activation: {
            status: 'unsupported',
          },
        },
      },
    })
  })

  it('keeps rollback pending and unusable when no artifact lifecycle can discard the artifact', async () => {
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      now: () => 200,
      randomUUID: () => 'run-cleanup-without-lifecycle',
      basePersonaRevision: () => 'persona-core-v1',
    })
    const result = await gate.train({ cardId: 'card-a' })
    const incrementId = result.status === 'succeeded' ? result.increment.id : ''

    await expect(gate.rollbackIncrement({
      cardId: 'card-a',
      incrementId,
    })).rejects.toThrow('artifact lifecycle is unavailable')
    expect(gate.listIncrements()).toEqual([
      expect.objectContaining({
        id: incrementId,
        state: 'available',
      }),
    ])
    expect(gate.listUsableIncrements()).toEqual([])
  })

  it('compensates a loader side effect when its activation receipt is invalid', async () => {
    const unload = vi.fn(async () => {})
    const discardArtifact = vi.fn(async () => {})
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async () => ({
          loaderId: ' ',
          receiptId: 'receipt-invalid-loader',
          activatedAt: 201,
        }),
        unload,
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
      now: () => 200,
      randomUUID: () => 'run-invalid-loader-receipt',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringContaining('invalid activation receipt'),
    })
    expect(unload).toHaveBeenCalledOnce()
    expect(discardArtifact).toHaveBeenCalledOnce()
    expect(gate.listIncrements()).toEqual([])
  })

  it('reports both an invalid activation receipt and its failed compensation unload', async () => {
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async () => ({
          loaderId: 'test-loader',
          receiptId: '',
          activatedAt: 201,
        }),
        unload: async () => {
          throw new Error('receipt compensation unload failed')
        },
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
      now: () => 200,
      randomUUID: () => 'run-invalid-receipt-unload-failure',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringMatching(/invalid activation receipt.*receipt compensation unload failed/),
    })
    expect(gate.listIncrements()).toEqual([])
  })

  it('hands a loaded adapter to durable cleanup when run completion cannot commit', async () => {
    const recorder = createPersistenceRecorder()
    recorder.persistence.completeRunWithIncrement = async () => {
      throw new Error('forced completion transaction failure')
    }
    const unload = vi.fn(async () => {})
    const discardArtifact = vi.fn(async () => {})
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async () => ({
          loaderId: 'test-loader',
          receiptId: 'receipt-completion-failure',
          activatedAt: 201,
        }),
        unload,
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
      persistence: recorder.persistence,
      now: () => 200,
      randomUUID: () => 'run-loaded-completion-failure',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'failed',
      error: 'forced completion transaction failure',
    })
    expect(unload).toHaveBeenCalledWith(expect.objectContaining({
      receipt: expect.objectContaining({
        receiptId: 'receipt-completion-failure',
      }),
    }))
    expect(discardArtifact).toHaveBeenCalledOnce()
    expect(gate.listIncrements()).toEqual([])
  })

  it('keeps a manual rollback retryable in the same process when unload fails', async () => {
    const unload = vi.fn()
      .mockRejectedValueOnce(new Error('adapter unload unavailable'))
      .mockResolvedValueOnce(undefined)
    const discardArtifact = vi.fn(async () => {})
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async () => ({
          loaderId: 'test-loader',
          receiptId: 'receipt-retry-unload',
          activatedAt: 201,
        }),
        unload,
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
      now: () => 200,
      randomUUID: () => 'run-retry-unload',
      basePersonaRevision: () => 'persona-core-v1',
    })
    const result = await gate.train({ cardId: 'card-a' })
    const incrementId = result.status === 'succeeded' ? result.increment.id : ''

    await expect(gate.rollbackIncrement({
      cardId: 'card-a',
      incrementId,
    })).rejects.toThrow('adapter unload unavailable')
    expect(gate.listIncrements()).toEqual([
      expect.objectContaining({
        id: incrementId,
        state: 'available',
      }),
    ])
    expect(discardArtifact).not.toHaveBeenCalled()

    await expect(gate.rollbackIncrement({
      cardId: 'card-a',
      incrementId,
    })).resolves.toMatchObject({
      id: incrementId,
      state: 'rolled-back',
    })
    expect(unload).toHaveBeenCalledTimes(2)
    expect(discardArtifact).toHaveBeenCalledOnce()
  })

  it('resumes at discard after unload succeeds so retry does not unload twice', async () => {
    const unload = vi.fn(async () => {})
    const discardArtifact = vi.fn()
      .mockRejectedValueOnce(new Error('artifact discard unavailable'))
      .mockResolvedValueOnce(undefined)
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async () => ({
          loaderId: 'test-loader',
          receiptId: 'receipt-retry-discard',
          activatedAt: 201,
        }),
        unload,
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
      now: () => 200,
      randomUUID: () => 'run-retry-discard',
      basePersonaRevision: () => 'persona-core-v1',
    })
    const result = await gate.train({ cardId: 'card-a' })
    const incrementId = result.status === 'succeeded' ? result.increment.id : ''

    await expect(gate.rollbackIncrement({
      cardId: 'card-a',
      incrementId,
    })).rejects.toThrow('artifact discard unavailable')
    await expect(gate.rollbackIncrement({
      cardId: 'card-a',
      incrementId,
    })).resolves.toMatchObject({
      id: incrementId,
      state: 'rolled-back',
    })

    expect(unload).toHaveBeenCalledOnce()
    expect(discardArtifact).toHaveBeenCalledTimes(2)
  })

  it('serializes concurrent cleanup requests for the same increment', async () => {
    let releaseUnload!: () => void
    const unloadStarted = new Promise<void>((resolve) => {
      releaseUnload = resolve
    })
    let finishUnload!: () => void
    const unloadCanFinish = new Promise<void>((resolve) => {
      finishUnload = resolve
    })
    const unload = vi.fn(async () => {
      releaseUnload()
      await unloadCanFinish
    })
    const discardArtifact = vi.fn(async () => {})
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async () => ({
          loaderId: 'test-loader',
          receiptId: 'receipt-concurrent-cleanup',
          activatedAt: 201,
        }),
        unload,
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
      now: () => 200,
      randomUUID: () => 'run-concurrent-cleanup',
      basePersonaRevision: () => 'persona-core-v1',
    })
    const result = await gate.train({ cardId: 'card-a' })
    const incrementId = result.status === 'succeeded' ? result.increment.id : ''

    const firstRollback = gate.rollbackIncrement({
      cardId: 'card-a',
      incrementId,
    })
    await unloadStarted
    const secondRollback = gate.rollbackIncrement({
      cardId: 'card-a',
      incrementId,
    })
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(unload).toHaveBeenCalledOnce()
    finishUnload()
    await expect(Promise.all([firstRollback, secondRollback])).resolves.toEqual([
      expect.objectContaining({ state: 'rolled-back' }),
      expect.objectContaining({ state: 'rolled-back' }),
    ])
    expect(discardArtifact).toHaveBeenCalledOnce()
  })

  it('replays the same unload operation id when persistence crashes after the adapter accepted unload', async () => {
    const recorder = createPersistenceRecorder()
    const cleanupIntents = new Map<string, PersonaTrainingArtifactCleanupIntent>()
    let failUnloadStagePersistence = true
    let semanticUnloadCount = 0
    const acceptedOperations = new Set<string>()
    const unload = vi.fn(async (input: { operationId: string }) => {
      if (acceptedOperations.has(input.operationId))
        return
      acceptedOperations.add(input.operationId)
      semanticUnloadCount += 1
    })
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async () => ({
          loaderId: 'test-loader',
          receiptId: 'receipt-crash-window',
          activatedAt: 201,
        }),
        unload,
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
      persistence: {
        ...recorder.persistence,
        beginArtifactCleanup: async (intent) => {
          cleanupIntents.set(intent.id, intent)
          return intent
        },
        advanceArtifactCleanup: async (input) => {
          if (input.expectedStage === 'unload' && failUnloadStagePersistence) {
            failUnloadStagePersistence = false
            throw new Error('simulated crash before unload stage persistence')
          }
          const current = cleanupIntents.get(input.intentId)
          if (!current || current.stage !== input.expectedStage)
            return false
          cleanupIntents.set(input.intentId, {
            ...current,
            artifact: input.artifact,
            stage: input.stage,
          })
          return true
        },
        failArtifactCleanup: async () => true,
        completeArtifactCleanup: async () => true,
      },
      now: () => 200,
      randomUUID: () => 'run-unload-crash-window',
      basePersonaRevision: () => 'persona-core-v1',
    })
    const result = await gate.train({ cardId: 'card-a' })
    const incrementId = result.status === 'succeeded' ? result.increment.id : ''

    await expect(gate.rollbackIncrement({
      cardId: 'card-a',
      incrementId,
    })).rejects.toThrow('simulated crash before unload stage persistence')
    await expect(gate.rollbackIncrement({
      cardId: 'card-a',
      incrementId,
    })).resolves.toMatchObject({
      state: 'rolled-back',
    })

    expect(unload).toHaveBeenCalledTimes(2)
    expect(unload.mock.calls[0]?.[0].operationId).toBe(unload.mock.calls[1]?.[0].operationId)
    expect(unload.mock.calls[0]?.[0].operationId).toMatch(/^persona-training-artifact-cleanup:card-a:run-unload-crash-window:persona-training-increment%3Arun-unload-crash-window:artifact-run-unload-crash-window:unload$/)
    expect(semanticUnloadCount).toBe(1)
  })

  it('resumes staged cleanup when source revoke is repeated after governance already changed state', async () => {
    const unload = vi.fn(async () => {})
    const discardArtifact = vi.fn()
      .mockRejectedValueOnce(new Error('revoked artifact discard unavailable'))
      .mockResolvedValueOnce(undefined)
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async () => ({
          loaderId: 'test-loader',
          receiptId: 'receipt-source-revoke-retry',
          activatedAt: 201,
        }),
        unload,
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact,
      },
      now: () => 200,
      randomUUID: () => 'run-source-revoke-cleanup-retry',
      basePersonaRevision: () => 'persona-core-v1',
    })
    await expect(gate.train({ cardId: 'card-a' })).resolves.toMatchObject({
      status: 'succeeded',
    })

    await expect(gate.revokeSource({
      cardId: 'card-a',
      sourceId: 'reflection-1',
    })).rejects.toThrow('revoked artifact discard unavailable')
    expect(gate.listIncrements()).toEqual([
      expect.objectContaining({
        state: 'available',
      }),
    ])
    expect(gate.listUsableIncrements()).toEqual([])

    await expect(gate.revokeSource({
      cardId: 'card-a',
      sourceId: 'reflection-1',
    })).resolves.toMatchObject({
      affected: 1,
    })
    expect(unload).toHaveBeenCalledOnce()
    expect(discardArtifact).toHaveBeenCalledTimes(2)
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
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
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

  it('keeps an available increment unusable while its durable activation intent is pending', async () => {
    const recorder = createPersistenceRecorder()
    const artifact = createArtifact('run-pending-activation', 'artifact-pending-activation')
    const increment = {
      id: 'persona-training-increment:run-pending-activation',
      kind: 'persona-lora-increment',
      cardId: 'card-a',
      datasetId: 'dataset-1',
      manifestHash: 'manifest-hash-1',
      sourceIds: ['reflection-1'],
      basePersonaRevision: 'persona-core-v1',
      artifact,
      state: 'available',
      cleanup: null,
      createdAt: 200,
    } satisfies PersonaTrainingPipelineIncrement
    recorder.increments.push(increment)
    const activationIntent = {
      id: 'persona-training-artifact-activation:card-a:artifact-pending-activation:restart:old-receipt',
      loadOperationId: 'persona-training-artifact-activation:card-a:artifact-pending-activation:restart:old-receipt:load',
      mode: 'restart',
      cardId: 'card-a',
      runId: artifact.runId,
      incrementId: increment.id,
      artifactId: artifact.artifactId,
      artifact,
      expectedArtifact: {
        ...artifact,
        activation: {
          status: 'active',
          reason: 'Loaded before restart.',
          loaderId: 'test-loader',
          receiptId: 'old-receipt',
          activatedAt: 100,
        },
      },
      loaderReceipt: null,
      activatedArtifact: null,
      stage: 'prepared',
      status: 'pending',
      lastError: null,
      createdAt: 200,
      updatedAt: 200,
    } satisfies PersonaTrainingArtifactActivationIntent
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      persistence: {
        ...recorder.persistence,
        listArtifactActivationIntents: async () => [activationIntent],
      },
      now: () => 200,
      randomUUID: () => 'run-unused',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await gate.reconcileAfterRestart({
      cardId: 'card-a',
      reason: 'application-restarted-before-training-completed',
    })

    expect(gate.listIncrements()).toEqual([
      expect.objectContaining({
        id: increment.id,
        state: 'available',
      }),
    ])
    expect(gate.listUsableIncrements()).toEqual([])
  })

  it('cleans up an ineligible restart candidate without loading its pending activation', async () => {
    const recorder = createPersistenceRecorder()
    const artifact = {
      ...createArtifact('run-ineligible-restart', 'artifact-ineligible-restart'),
      activation: {
        status: 'active' as const,
        reason: 'Loaded before restart.',
        loaderId: 'test-loader',
        receiptId: 'receipt-before-restart',
        activatedAt: 100,
      },
    }
    const reloadArtifact = {
      ...artifact,
      activation: {
        status: 'inactive' as const,
        reason: 'The previous loader receipt expired.',
      },
    }
    const increment: PersonaTrainingPipelineIncrement = {
      id: 'persona-training-increment:run-ineligible-restart',
      kind: 'persona-lora-increment',
      cardId: 'card-a',
      datasetId: 'dataset-1',
      manifestHash: 'manifest-hash-1',
      sourceIds: ['reflection-1'],
      basePersonaRevision: 'persona-core-v1',
      artifact,
      state: 'available',
      cleanup: null,
      createdAt: 200,
    }
    recorder.increments.push(increment)
    const run: PersonaTrainingPipelineRunRecord = {
      runId: artifact.runId,
      cardId: 'card-a',
      datasetId: 'dataset-1',
      manifestHash: 'manifest-hash-1',
      sourceIds: ['reflection-1'],
      basePersonaRevision: 'persona-core-v1',
      status: 'completed',
      stage: 'finalizing',
      progress: 1,
      progressMessage: null,
      failureReason: null,
      configSnapshot: null,
      artifact,
      error: null,
      queuedAt: 100,
      startedAt: 100,
      updatedAt: 200,
      finishedAt: 200,
      cancellationRequestedAt: null,
    }
    let pendingActivation: PersonaTrainingArtifactActivationIntent | null = {
      id: 'persona-training-artifact-activation:card-a:run-ineligible-restart:restart:old-receipt',
      loadOperationId: 'persona-training-artifact-activation:card-a:run-ineligible-restart:restart:old-receipt:load',
      mode: 'restart',
      cardId: 'card-a',
      runId: run.runId,
      incrementId: increment.id,
      artifactId: artifact.artifactId,
      artifact: reloadArtifact,
      expectedArtifact: artifact,
      loaderReceipt: null,
      activatedArtifact: null,
      stage: 'prepared',
      status: 'pending',
      lastError: null,
      createdAt: 200,
      updatedAt: 200,
    }
    let cleanupCompleted = false
    const load = vi.fn(async () => ({
      loaderId: 'test-loader',
      receiptId: 'receipt-after-restart',
      activatedAt: 201,
    }))
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime(),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load,
        unload: async () => {},
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
      persistence: {
        ...recorder.persistence,
        listArtifactActivationIntents: async () => pendingActivation ? [pendingActivation] : [],
        handoffArtifactActivationToCleanup: async ({ cleanupIntent }) => {
          pendingActivation = null
          return cleanupIntent
        },
        completeArtifactCleanup: async ({ transition }) => {
          cleanupCompleted = true
          if (transition)
            increment.state = transition.state
          return true
        },
        listRestartCandidates: async () => [{
          run,
          increment,
          consistencyError: null,
        }],
        interruptRunAfterRestart: async () => {
          run.status = 'interrupted'
          return true
        },
      },
      now: () => 200,
      randomUUID: () => 'run-unused',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(gate.reconcileAfterRestart({
      cardId: 'card-a',
      reason: 'application-restarted-before-training-completed',
    })).resolves.toEqual({
      interruptedRuns: 1,
      rolledBackIncrements: 1,
    })

    expect(load).not.toHaveBeenCalled()
    expect(pendingActivation).toBeNull()
    expect(cleanupCompleted).toBe(true)
    expect(increment.state).toBe('rolled-back')
  })

  it('bounds restart loader recovery and preserves the pending activation intent', async () => {
    const recorder = createPersistenceRecorder()
    const dataset = createDataset()
    const examples: PersonaTrainingDatasetExample[] = [{
      id: 'example-restart-timeout',
      datasetId: dataset.id,
      cardId: dataset.cardId,
      schemaVersion: 'persona-training-example-v1',
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
      contentHash: 'restart-timeout-hash',
      behaviorLesson: '重启恢复超时时保持激活意图可重试。',
      positiveExample: '我会等待加载器恢复完成。',
      negativeExample: null,
      sensitivity: 'personal',
      piiStatus: 'clear',
      piiReason: null,
      consentSnapshot: consent,
      provenance: {
        kind: 'working-memory-cleaning',
        cleaningTransactionId: 'restart-timeout-cleaning',
        cleanedAt: 99,
      },
      allowTraining: true,
      state: 'staged',
      createdAt: 100,
      revokedAt: null,
    }]
    const manifest = buildPersonaTrainingDatasetManifest({
      dataset,
      examples,
      exportedAt: 200,
    })
    const sourceIds = manifest.examples.map(example => example.sourceId)
    const artifact = {
      ...createArtifact('run-restart-timeout', 'artifact-restart-timeout'),
      activation: {
        status: 'active' as const,
        reason: 'Loaded before restart.',
        loaderId: 'test-loader',
        receiptId: 'receipt-before-restart-timeout',
        activatedAt: 100,
      },
    }
    const increment = {
      id: 'persona-training-increment:run-restart-timeout',
      kind: 'persona-lora-increment',
      cardId: 'card-a',
      datasetId: 'dataset-1',
      manifestHash: manifest.manifestHash,
      sourceIds,
      basePersonaRevision: 'persona-core-v1',
      artifact,
      state: 'available',
      cleanup: null,
      createdAt: 200,
    } satisfies PersonaTrainingPipelineIncrement
    recorder.increments.push(increment)
    const run = {
      runId: artifact.runId,
      cardId: 'card-a',
      datasetId: 'dataset-1',
      manifestHash: manifest.manifestHash,
      sourceIds,
      basePersonaRevision: 'persona-core-v1',
      status: 'completed',
      stage: 'finalizing',
      progress: 1,
      progressMessage: null,
      failureReason: null,
      configSnapshot: null,
      artifact,
      error: null,
      queuedAt: 100,
      startedAt: 100,
      updatedAt: 200,
      finishedAt: 200,
      cancellationRequestedAt: null,
    } satisfies PersonaTrainingPipelineRunRecord
    const aborted = vi.fn()
    const gate = createPersonaTrainingPipelineGate({
      datasetRuntime: createDatasetRuntime({ dataset, examples }),
      trainingExecutor: async input => ({ artifact: createArtifact(input.runId) }),
      artifactLoader: {
        load: async ({ signal }) => await new Promise((_, reject) => {
          signal.addEventListener('abort', () => {
            aborted()
            reject(signal.reason)
          }, { once: true })
        }),
        unload: async () => {},
      },
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
      persistence: {
        ...recorder.persistence,
        listRestartCandidates: async () => [{
          run,
          increment,
          consistencyError: null,
        }],
        beginArtifactActivation: async intent => intent,
        failArtifactActivation: async () => true,
      },
      artifactRecoveryTimeoutMs: 20,
      now: () => 200,
      randomUUID: () => 'run-unused',
      basePersonaRevision: () => 'persona-core-v1',
    })

    await expect(Promise.race([
      gate.reconcileAfterRestart({
        cardId: 'card-a',
        reason: 'application-restarted-before-training-completed',
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('restart recovery remained blocked')), 250)),
    ])).resolves.toEqual({
      interruptedRuns: 0,
      rolledBackIncrements: 0,
    })
    expect(aborted).toHaveBeenCalledOnce()
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
      artifactLifecycle: {
        validateArtifact: async () => {},
        discardArtifact: async () => {},
      },
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
