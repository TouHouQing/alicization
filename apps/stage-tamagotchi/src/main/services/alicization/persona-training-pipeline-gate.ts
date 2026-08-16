import type {
  AlicizationPersonaTrainingArtifact,
} from '@proj-alicization/stage-shared'

import type {
  PersonaTrainingDatasetExample,
  PersonaTrainingDatasetManifest,
  PersonaTrainingDatasetRuntime,
  PersonaTrainingDatasetVersion,
} from './persona-training-dataset-runtime'

import { errorMessageFrom } from '@moeru/std'

import {
  buildPersonaTrainingDatasetManifest,
  PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
  PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
} from './persona-training-dataset-runtime'

export type PersonaTrainingPipelineIncrementState
  = 'available'
    | 'rolled-back'
    | 'revoked'

function throwCleanupErrors(errors: unknown[], context: string): never {
  if (errors.length === 1)
    throw errors[0]
  const details = errors
    .map(error => errorMessageFrom(error) ?? String(error))
    .join('; ')
  throw new AggregateError(errors, `${context}: ${details}`)
}

export interface PersonaTrainingExecutorInput {
  runId: string
  cardId: string
  datasetId: string
  manifest: PersonaTrainingDatasetManifest
  basePersonaRevision: string
  configSnapshot: PersonaTrainingExecutorConfigSnapshot | null
  signal: AbortSignal
  assertCurrent: () => Promise<void>
  onProgress?: (progress: {
    stage: PersonaTrainingPipelineRunStage
    progress: number
    message?: string | null
  }) => Promise<void>
}

export interface PersonaTrainingExecutorOutput {
  artifact: AlicizationPersonaTrainingArtifact
}

export class PersonaTrainingExecutorArtifactError extends Error {
  constructor(
    message: string,
    readonly artifact: AlicizationPersonaTrainingArtifact,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'PersonaTrainingExecutorArtifactError'
  }
}

export interface PersonaTrainingArtifactReconciliationInput {
  availableArtifacts: AlicizationPersonaTrainingArtifact[]
  onOrphanCleanupFailure: (input: {
    artifact: AlicizationPersonaTrainingArtifact
    error: unknown
  }) => Promise<void>
}

export interface PersonaTrainingArtifactLifecycle {
  validateArtifact: (artifact: AlicizationPersonaTrainingArtifact) => Promise<void>
  discardArtifact: (artifact: AlicizationPersonaTrainingArtifact) => Promise<void>
  reconcileArtifacts?: (input: PersonaTrainingArtifactReconciliationInput) => Promise<void>
}

export interface PersonaTrainingArtifactCleanupIntent {
  id: string
  cardId: string
  runId: string
  incrementId: string | null
  artifact: AlicizationPersonaTrainingArtifact
  reason: string
  status: 'pending'
  attempts: number
  lastError: string
  createdAt: number
  updatedAt: number
}

export interface PersonaTrainingExecutorConfigSnapshot {
  executable: string
  baseModel: string
  timeoutMs: number
}

export interface PersonaTrainingPipelineIncrement {
  id: string
  kind: 'persona-lora-increment'
  cardId: string
  datasetId: string
  manifestHash: string
  sourceIds: string[]
  basePersonaRevision: string
  artifact: AlicizationPersonaTrainingArtifact
  state: PersonaTrainingPipelineIncrementState
  createdAt: number
}

export type PersonaTrainingPipelineRunStatus
  = 'queued'
    | 'running'
    | 'cancel_requested'
    | 'terminalizing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'interrupted'

export type PersonaTrainingPipelineRunStage
  = 'writing-input'
    | 'spawning'
    | 'training'
    | 'validating-artifact'
    | 'finalizing'

export interface PersonaTrainingPipelineRunRecord {
  runId: string
  cardId: string
  datasetId: string
  manifestHash: string
  sourceIds: string[]
  basePersonaRevision: string
  status: PersonaTrainingPipelineRunStatus
  stage: PersonaTrainingPipelineRunStage
  progress: number
  progressMessage: string | null
  failureReason: PersonaTrainingPipelineFailureReason | null
  configSnapshot: PersonaTrainingExecutorConfigSnapshot | null
  artifact: AlicizationPersonaTrainingArtifact | null
  error: string | null
  queuedAt: number
  startedAt: number | null
  updatedAt: number
  finishedAt: number | null
  cancellationRequestedAt: number | null
}

export type PersonaTrainingPipelineAuditAction
  = 'training-queued'
    | 'training-started'
    | 'training-completed'
    | 'training-failed'
    | 'training-cancelled'
    | 'training-interrupted'
    | 'training-increment-rolled-back'
    | 'training-increment-revoked'

export interface PersonaTrainingPipelineAuditEvent {
  action: PersonaTrainingPipelineAuditAction
  runId: string | null
  incrementId: string | null
  cardId: string
  datasetId: string
  manifestHash: string | null
  sourceIds: string[]
  reason: string | null
  createdAt: number
}

export interface PersonaTrainingPipelinePersistence {
  createRun: (run: PersonaTrainingPipelineRunRecord) => Promise<void>
  updateRun: (input: Partial<PersonaTrainingPipelineRunRecord> & Pick<PersonaTrainingPipelineRunRecord, 'runId'>) => Promise<boolean>
  completeRunWithIncrement: (input: {
    run: PersonaTrainingPipelineRunRecord
    increment: PersonaTrainingPipelineIncrement
    event: PersonaTrainingPipelineAuditEvent
  }) => Promise<{
    completed: boolean
    reason?: PersonaTrainingPipelineFailureReason
    error?: string
  }>
  finishRun: (input: {
    run: PersonaTrainingPipelineRunRecord
    event: PersonaTrainingPipelineAuditEvent
  }) => Promise<boolean>
  updateIncrementState: (input: {
    incrementId: string
    state: PersonaTrainingPipelineIncrementState
  }) => Promise<void>
  transitionIncrementWithAudit?: (input: {
    incrementId: string
    state: PersonaTrainingPipelineIncrementState
    event: PersonaTrainingPipelineAuditEvent
  }) => Promise<boolean>
  recordArtifactCleanupIntent?: (intent: PersonaTrainingArtifactCleanupIntent) => Promise<void>
  appendEvent: (event: PersonaTrainingPipelineAuditEvent) => Promise<void>
  listIncrements: () => Promise<PersonaTrainingPipelineIncrement[]>
  getRun?: (runId: string) => Promise<PersonaTrainingPipelineRunRecord | null>
  listRuns?: (input: { cardId: string, limit?: number }) => Promise<PersonaTrainingPipelineRunRecord[]>
  reconcileAfterRestart?: (input: {
    cardId?: string | null
    reason: string
    at: number
  }) => Promise<{
    interruptedRuns: number
    rolledBackIncrements: number
  }>
}

export type PersonaTrainingPipelineFailureReason
  = 'executor-failed'
    | 'source-revoked'
    | 'dataset-rolled-back'
    | 'dataset-not-active'
    | 'manifest-no-longer-usable'
    | 'cancelled'
    | 'interrupted'

export type PersonaTrainingPipelineResult
  = {
    status: 'succeeded'
    runId: string
    increment: PersonaTrainingPipelineIncrement
  }
  | {
    status: 'failed'
    runId: string
    reason: PersonaTrainingPipelineFailureReason
    error: string
  }

export interface PersonaTrainingPipelineGate {
  start: (input: { cardId: string, datasetId?: string | null }) => Promise<{ run: PersonaTrainingPipelineRunRecord }>
  getRun: (input: { cardId: string, runId: string }) => Promise<PersonaTrainingPipelineRunRecord | null>
  listRuns: (input: { cardId: string, limit?: number }) => Promise<PersonaTrainingPipelineRunRecord[]>
  train: (input: { cardId: string, datasetId?: string | null }) => Promise<PersonaTrainingPipelineResult>
  cancel: (input: { runId: string, cardId?: string, reason?: string | null }) => Promise<PersonaTrainingPipelineRunRecord | null>
  stop: (reason: string) => Promise<void>
  activateVersion: (input: { cardId: string, datasetId: string }) => Promise<PersonaTrainingDatasetVersion | null>
  rollbackVersion: (input: { cardId: string, datasetId: string }) => Promise<PersonaTrainingDatasetVersion | null>
  revokeSource: (input: { cardId: string, sourceId: string }) => Promise<{ affected: number }>
  rollbackIncrement: (input: { incrementId: string, cardId?: string }) => Promise<PersonaTrainingPipelineIncrement | null>
  listIncrements: () => PersonaTrainingPipelineIncrement[]
  listPersistedIncrements: () => Promise<PersonaTrainingPipelineIncrement[]>
  listUsableIncrements: () => PersonaTrainingPipelineIncrement[]
}

interface ActiveTrainingRun {
  runId: string
  cardId: string
  datasetId: string
  manifestHash: string | null
  sourceIds: Set<string>
  controller: AbortController
  invalidatedReason: PersonaTrainingPipelineFailureReason | null
  cancellationReason: string | null
  terminalizing: boolean
  terminalEventRecorded: boolean
  mutationQueue: Promise<void>
  record: PersonaTrainingPipelineRunRecord
  completion: Promise<PersonaTrainingPipelineResult>
}

class PersonaTrainingPipelineGateError extends Error {
  constructor(
    readonly reason: PersonaTrainingPipelineFailureReason,
    message: string,
  ) {
    super(message)
    this.name = 'PersonaTrainingPipelineGateError'
  }
}

function isAllowedTrainingSourceKind(sourceKind: string) {
  return sourceKind === 'cleaned-long-term-reflection'
    || sourceKind === 'persona-reinforcement'
}

function assertManifestShape(input: {
  dataset: PersonaTrainingDatasetVersion
  manifest: PersonaTrainingDatasetManifest
}) {
  if (input.manifest.datasetId !== input.dataset.id || input.manifest.cardId !== input.dataset.cardId)
    throw new Error('persona training manifest does not belong to the active dataset')
  if (
    input.dataset.schemaVersion !== PERSONA_TRAINING_DATASET_SCHEMA_VERSION
    || input.manifest.schemaVersion !== PERSONA_TRAINING_DATASET_SCHEMA_VERSION
    || input.manifest.version !== input.dataset.version
  ) {
    throw new Error('persona training manifest schema or version is not supported')
  }
  if (input.manifest.exampleCount !== input.manifest.examples.length || input.manifest.exampleCount === 0)
    throw new Error('persona training manifest has no usable examples')
  if (!input.manifest.consentSnapshot.granted)
    throw new Error('persona training manifest consent is not granted')
  if (
    input.manifest.consentSnapshot.policyVersion !== input.dataset.consentSnapshot.policyVersion
    || input.manifest.consentSnapshot.scope !== input.dataset.consentSnapshot.scope
  ) {
    throw new Error('persona training manifest consent does not match the active dataset')
  }
  if (!input.manifest.manifestHash)
    throw new Error('persona training manifest hash is missing')
  for (const example of input.manifest.examples) {
    if (!isAllowedTrainingSourceKind(example.sourceKind))
      throw new Error(`persona training manifest contains forbidden source kind: ${example.sourceKind}`)
    if (example.schemaVersion !== PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION)
      throw new Error(`persona training manifest contains unsupported example schema: ${example.id}`)
    if (example.provenance.kind !== 'working-memory-cleaning' || !example.provenance.cleaningTransactionId)
      throw new Error(`persona training manifest example is missing cleaning provenance: ${example.id}`)
  }
}

function findCurrentExample(
  examples: PersonaTrainingDatasetExample[],
  manifestExample: PersonaTrainingDatasetManifest['examples'][number],
) {
  return examples.find(example => example.id === manifestExample.id)
}

function isNonTerminalRunStatus(status: PersonaTrainingPipelineRunStatus) {
  return status === 'queued'
    || status === 'running'
    || status === 'cancel_requested'
}

export function createPersonaTrainingPipelineGate(input: {
  datasetRuntime: PersonaTrainingDatasetRuntime
  trainingExecutor: (input: PersonaTrainingExecutorInput) => Promise<PersonaTrainingExecutorOutput>
  artifactLifecycle?: PersonaTrainingArtifactLifecycle
  resolveExecutorConfig?: () => PersonaTrainingExecutorConfigSnapshot | null | Promise<PersonaTrainingExecutorConfigSnapshot | null>
  persistence?: PersonaTrainingPipelinePersistence
  now: () => number
  randomUUID: () => string
  basePersonaRevision: () => string | Promise<string>
}): PersonaTrainingPipelineGate {
  const increments = new Map<string, PersonaTrainingPipelineIncrement>()
  const activeRuns = new Map<string, ActiveTrainingRun>()
  const persistence: PersonaTrainingPipelinePersistence = input.persistence ?? {
    createRun: async () => {},
    updateRun: async () => true,
    completeRunWithIncrement: async () => ({ completed: true }),
    finishRun: async () => true,
    updateIncrementState: async () => {},
    appendEvent: async () => {},
    listIncrements: async () => [],
  }

  function normalizeCardId(cardId: string) {
    const normalized = cardId.trim()
    if (!normalized)
      throw new Error('persona training pipeline requires cardId')
    return normalized
  }

  async function appendAuditEvent(event: PersonaTrainingPipelineAuditEvent) {
    await persistence.appendEvent({
      ...event,
      sourceIds: [...event.sourceIds],
    })
  }

  function enqueueRunMutation<T>(
    run: ActiveTrainingRun,
    mutation: () => Promise<T>,
  ) {
    const operation = run.mutationQueue.then(mutation)
    run.mutationQueue = operation.then(
      () => undefined,
      () => undefined,
    )
    return operation
  }

  async function persistNonTerminalRunUpdate(
    run: ActiveTrainingRun,
    update: Partial<PersonaTrainingPipelineRunRecord>,
  ) {
    const applied = await persistence.updateRun({
      runId: run.runId,
      ...update,
    })
    if (applied)
      Object.assign(run.record, update)
    return applied
  }

  async function hydratePersistedIncrements() {
    const persisted = await persistence.listIncrements()
    for (const increment of persisted) {
      increments.set(increment.id, {
        ...increment,
        sourceIds: [...increment.sourceIds],
      })
    }
  }

  function terminalAuditEvent(input: {
    run: ActiveTrainingRun
    action: PersonaTrainingPipelineAuditAction
    reason: string | null
    createdAt: number
    incrementId?: string | null
  }) {
    return {
      action: input.action,
      runId: input.run.runId,
      incrementId: input.incrementId ?? null,
      cardId: input.run.cardId,
      datasetId: input.run.datasetId,
      manifestHash: input.run.manifestHash ?? null,
      sourceIds: [...input.run.sourceIds],
      reason: input.reason,
      createdAt: input.createdAt,
    } satisfies PersonaTrainingPipelineAuditEvent
  }

  async function terminalizeRun(terminalInput: {
    run: ActiveTrainingRun
    status: Extract<PersonaTrainingPipelineRunStatus, 'completed' | 'failed' | 'cancelled' | 'interrupted'>
    error: string | null
    action: PersonaTrainingPipelineAuditAction
    reason: string | null
    finishedAt: number
    increment?: PersonaTrainingPipelineIncrement
    failureReason?: PersonaTrainingPipelineFailureReason | null
    artifact?: AlicizationPersonaTrainingArtifact | null
  }) {
    if (
      terminalInput.run.terminalizing
      || terminalInput.run.terminalEventRecorded
      || !isNonTerminalRunStatus(terminalInput.run.record.status)
    ) {
      return false
    }

    return await enqueueRunMutation(terminalInput.run, async () => {
      if (
        terminalInput.run.terminalizing
        || terminalInput.run.terminalEventRecorded
        || !isNonTerminalRunStatus(terminalInput.run.record.status)
      ) {
        return false
      }
      const terminalizingAt = input.now()
      const transitioned = await persistence.updateRun({
        runId: terminalInput.run.runId,
        status: 'terminalizing',
        stage: 'finalizing',
        progressMessage: null,
        updatedAt: terminalizingAt,
      })
      if (!transitioned)
        return false
      terminalInput.run.terminalizing = true
      Object.assign(terminalInput.run.record, {
        status: 'terminalizing',
        stage: 'finalizing',
        progressMessage: null,
        updatedAt: terminalizingAt,
      })

      const finalRecord: PersonaTrainingPipelineRunRecord = {
        ...terminalInput.run.record,
        sourceIds: [...terminalInput.run.record.sourceIds],
        status: terminalInput.status,
        error: terminalInput.error,
        failureReason: terminalInput.failureReason ?? null,
        artifact: terminalInput.artifact ?? null,
        progress: terminalInput.status === 'completed' ? 1 : terminalInput.run.record.progress,
        stage: 'finalizing',
        updatedAt: terminalInput.finishedAt,
        finishedAt: terminalInput.finishedAt,
      }
      const event = terminalAuditEvent({
        run: terminalInput.run,
        action: terminalInput.action,
        reason: terminalInput.reason,
        createdAt: terminalInput.finishedAt,
        incrementId: terminalInput.increment?.id ?? null,
      })
      if (terminalInput.status === 'completed' && terminalInput.increment) {
        const completed = await persistence.completeRunWithIncrement({
          run: finalRecord,
          increment: terminalInput.increment,
          event,
        })
        if (!completed.completed) {
          throw new PersonaTrainingPipelineGateError(
            completed.reason ?? 'manifest-no-longer-usable',
            completed.error ?? 'persona training completion preconditions no longer hold',
          )
        }
        increments.set(terminalInput.increment.id, terminalInput.increment)
      }
      else {
        const finished = await persistence.finishRun({
          run: finalRecord,
          event,
        })
        if (!finished)
          return false
      }
      Object.assign(terminalInput.run.record, finalRecord)
      terminalInput.run.terminalEventRecorded = true
      return true
    })
  }

  async function finishTerminalizingRun(terminalInput: {
    run: ActiveTrainingRun
    status: Extract<PersonaTrainingPipelineRunStatus, 'failed' | 'cancelled' | 'interrupted'>
    error: string
    action: PersonaTrainingPipelineAuditAction
    reason: string
    failureReason: PersonaTrainingPipelineFailureReason
    finishedAt: number
  }) {
    if (!terminalInput.run.terminalizing || terminalInput.run.terminalEventRecorded)
      return false
    return await enqueueRunMutation(terminalInput.run, async () => {
      const finalRecord: PersonaTrainingPipelineRunRecord = {
        ...terminalInput.run.record,
        sourceIds: [...terminalInput.run.record.sourceIds],
        status: terminalInput.status,
        stage: 'finalizing',
        error: terminalInput.error,
        failureReason: terminalInput.failureReason,
        updatedAt: terminalInput.finishedAt,
        finishedAt: terminalInput.finishedAt,
      }
      const finished = await persistence.finishRun({
        run: finalRecord,
        event: terminalAuditEvent({
          run: terminalInput.run,
          action: terminalInput.action,
          reason: terminalInput.reason,
          createdAt: terminalInput.finishedAt,
        }),
      })
      if (!finished)
        return false
      Object.assign(terminalInput.run.record, finalRecord)
      terminalInput.run.terminalEventRecorded = true
      return true
    })
  }

  async function invalidateRuns(input: {
    cardId: string
    reason: PersonaTrainingPipelineFailureReason
    sourceId?: string
    now: number
  }) {
    for (const run of activeRuns.values()) {
      if (run.cardId !== input.cardId)
        continue
      if (input.sourceId && run.datasetId && !run.sourceIds.has(input.sourceId))
        continue
      run.invalidatedReason = input.reason
      run.controller.abort(input.reason)
    }
  }

  async function markIncrements(markInput: {
    cardId: string
    state: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'>
    datasetId?: string
    excludeDatasetId?: string
    sourceId?: string
    now: number
  }) {
    await hydratePersistedIncrements()
    const cleanupErrors: unknown[] = []
    for (const increment of increments.values()) {
      if (increment.cardId !== markInput.cardId)
        continue
      if (markInput.datasetId && increment.datasetId !== markInput.datasetId)
        continue
      if (markInput.excludeDatasetId && increment.datasetId === markInput.excludeDatasetId)
        continue
      if (markInput.sourceId && !increment.sourceIds.includes(markInput.sourceId))
        continue
      const previousState = increment.state
      const shouldTransition = markInput.state === 'revoked'
        ? increment.state !== 'revoked'
        : increment.state === 'available'
      if (shouldTransition) {
        await persistence.updateIncrementState({
          incrementId: increment.id,
          state: markInput.state,
        })
        increment.state = markInput.state
      }
      if (shouldTransition && previousState !== 'revoked' && markInput.state === 'revoked') {
        await appendAuditEvent({
          action: 'training-increment-revoked',
          runId: null,
          incrementId: increment.id,
          cardId: increment.cardId,
          datasetId: increment.datasetId,
          manifestHash: increment.manifestHash,
          sourceIds: [...increment.sourceIds],
          reason: markInput.sourceId ? 'source-revoked' : 'dataset-rolled-back',
          createdAt: markInput.now,
        })
      }
      if (shouldTransition) {
        try {
          await discardArtifactWithRecovery({
            artifact: increment.artifact,
            cardId: increment.cardId,
            incrementId: increment.id,
            reason: markInput.state === 'revoked' ? 'source-revoked' : 'dataset-rolled-back',
            now: markInput.now,
          })
        }
        catch (error) {
          cleanupErrors.push(error)
        }
      }
    }
    if (cleanupErrors.length > 0)
      throwCleanupErrors(cleanupErrors, 'persona training artifact cleanup failed')
  }

  async function discardUnavailableIncrements(
    candidates: PersonaTrainingPipelineIncrement[],
    reason: string,
  ) {
    const cleanupErrors: unknown[] = []
    for (const increment of candidates) {
      try {
        await discardArtifactWithRecovery({
          artifact: increment.artifact,
          cardId: increment.cardId,
          incrementId: increment.id,
          reason,
          now: input.now(),
        })
      }
      catch (error) {
        cleanupErrors.push(error)
      }
    }
    if (cleanupErrors.length > 0)
      throwCleanupErrors(cleanupErrors, 'persona training artifact cleanup failed')
  }

  async function discardArtifactWithRecovery(inputData: {
    artifact: AlicizationPersonaTrainingArtifact
    cardId: string
    runId?: string
    incrementId: string | null
    reason: string
    now: number
  }) {
    if (!input.artifactLifecycle)
      return
    try {
      await input.artifactLifecycle.discardArtifact(inputData.artifact)
    }
    catch (cleanupError) {
      const cleanupMessage = errorMessageFrom(cleanupError) ?? String(cleanupError)
      const intent = {
        id: `persona-training-artifact-cleanup:${inputData.cardId}:${inputData.artifact.artifactId}`,
        cardId: inputData.cardId,
        runId: inputData.runId ?? inputData.artifact.runId,
        incrementId: inputData.incrementId,
        artifact: inputData.artifact,
        reason: inputData.reason,
        status: 'pending' as const,
        attempts: 1,
        lastError: cleanupMessage,
        createdAt: inputData.now,
        updatedAt: inputData.now,
      } satisfies PersonaTrainingArtifactCleanupIntent
      try {
        if (!persistence.recordArtifactCleanupIntent)
          throw new Error('cleanup recovery intent persistence is unavailable')
        await persistence.recordArtifactCleanupIntent(intent)
      }
      catch (intentError) {
        throw new Error(
          `persona training artifact cleanup failed: ${cleanupMessage}; `
          + `cleanup recovery intent persistence failed: ${errorMessageFrom(intentError) ?? String(intentError)}`,
          { cause: cleanupError },
        )
      }
      throw new Error(
        `persona training artifact cleanup failed: ${cleanupMessage}; cleanup recovery intent recorded`,
        { cause: cleanupError },
      )
    }
  }

  async function assertDatasetIsActive(scope: {
    cardId: string
    dataset: PersonaTrainingDatasetVersion
    manifest: PersonaTrainingDatasetManifest
  }) {
    const snapshot = await input.datasetRuntime.getSnapshot({ cardId: scope.cardId })
    const version = snapshot.versions.find(item => item.id === scope.dataset.id)
    if (
      snapshot.activeVersionId !== scope.dataset.id
      || !version
      || version.activeAt == null
      || version.rolledBackAt != null
    ) {
      throw new PersonaTrainingPipelineGateError(
        'dataset-not-active',
        'persona training dataset is no longer active',
      )
    }

    const currentExamples = snapshot.examples.filter(example => example.datasetId === scope.dataset.id)
    if (currentExamples.length === 0)
      return

    const currentManifest = buildPersonaTrainingDatasetManifest({
      dataset: scope.dataset,
      examples: currentExamples,
      exportedAt: scope.manifest.exportedAt,
    })
    if (
      currentManifest.manifestHash !== scope.manifest.manifestHash
      || currentManifest.exampleCount !== scope.manifest.exampleCount
      || currentManifest.examples.length !== scope.manifest.examples.length
    ) {
      throw new PersonaTrainingPipelineGateError(
        'manifest-no-longer-usable',
        'persona training manifest no longer matches the dataset snapshot',
      )
    }

    for (const manifestExample of scope.manifest.examples) {
      const currentExample = findCurrentExample(currentExamples, manifestExample)
      if (
        !currentExample
        || currentExample.state !== 'staged'
        || !currentExample.allowTraining
        || currentExample.piiStatus !== 'clear'
        || !currentExample.consentSnapshot.granted
      ) {
        throw new PersonaTrainingPipelineGateError(
          'manifest-no-longer-usable',
          `persona training manifest source is no longer usable: ${manifestExample.sourceId}`,
        )
      }
    }
  }

  async function resolveApprovedManifest(scope: {
    cardId: string
    datasetId?: string | null
  }) {
    const snapshot = await input.datasetRuntime.getSnapshot({ cardId: scope.cardId })
    const requestedDatasetId = scope.datasetId?.trim() || null
    const activeDatasetId = snapshot.activeVersionId
    if (!activeDatasetId)
      throw new PersonaTrainingPipelineGateError('dataset-not-active', 'persona training dataset is not active')
    if (requestedDatasetId && requestedDatasetId !== activeDatasetId)
      throw new PersonaTrainingPipelineGateError('dataset-not-active', 'requested persona training dataset is not active')

    const dataset = snapshot.versions.find(version => version.id === activeDatasetId)
    if (!dataset || dataset.activeAt == null || dataset.rolledBackAt != null)
      throw new PersonaTrainingPipelineGateError('dataset-not-active', 'persona training dataset is not active')

    const exported = await input.datasetRuntime.exportVersion({
      cardId: scope.cardId,
      datasetId: dataset.id,
    })
    if (!exported.qualityGate.passed)
      throw new Error(`persona training dataset quality gate failed: ${exported.qualityGate.findings.map(finding => finding.code).join(', ')}`)
    if (exported.dataset.id !== dataset.id || exported.dataset.activeAt == null || exported.dataset.rolledBackAt != null)
      throw new PersonaTrainingPipelineGateError('dataset-not-active', 'persona training dataset is no longer active')

    assertManifestShape({
      dataset: exported.dataset,
      manifest: exported.manifest,
    })
    await assertDatasetIsActive({
      cardId: scope.cardId,
      dataset: exported.dataset,
      manifest: exported.manifest,
    })
    return exported
  }

  async function executeTrainingRun(inputScope: {
    run: ActiveTrainingRun
    approved: Awaited<ReturnType<typeof resolveApprovedManifest>>
    basePersonaRevision: string
  }): Promise<PersonaTrainingPipelineResult> {
    const { approved, basePersonaRevision, run } = inputScope
    let trainedArtifact: AlicizationPersonaTrainingArtifact | null = null
    const assertCurrent = async () => {
      if (run.invalidatedReason)
        throw new PersonaTrainingPipelineGateError(run.invalidatedReason, `persona training run was invalidated: ${run.invalidatedReason}`)
      await assertDatasetIsActive({
        cardId: run.cardId,
        dataset: approved.dataset,
        manifest: approved.manifest,
      })
      if (run.invalidatedReason)
        throw new PersonaTrainingPipelineGateError(run.invalidatedReason, `persona training run was invalidated: ${run.invalidatedReason}`)
    }
    const startedAt = input.now()

    try {
      await enqueueRunMutation(run, async () => {
        const started = await persistNonTerminalRunUpdate(run, {
          status: 'running',
          stage: 'writing-input',
          startedAt,
          updatedAt: startedAt,
        })
        if (!started)
          throw new Error('persona training run could not enter running state')
        await appendAuditEvent({
          action: 'training-started',
          runId: run.runId,
          incrementId: null,
          cardId: run.cardId,
          datasetId: approved.dataset.id,
          manifestHash: approved.manifest.manifestHash,
          sourceIds: [...run.sourceIds],
          reason: null,
          createdAt: startedAt,
        })
      })

      const trained = await input.trainingExecutor({
        runId: run.runId,
        cardId: run.cardId,
        datasetId: approved.dataset.id,
        manifest: approved.manifest,
        basePersonaRevision,
        configSnapshot: run.record.configSnapshot
          ? { ...run.record.configSnapshot }
          : null,
        signal: run.controller.signal,
        assertCurrent,
        onProgress: async (progress) => {
          if (run.terminalizing || run.terminalEventRecorded)
            return
          await enqueueRunMutation(run, async () => {
            if (run.terminalizing || run.terminalEventRecorded || !isNonTerminalRunStatus(run.record.status))
              return
            const normalizedProgress = Math.max(0, Math.min(0.99, Number(progress.progress) || 0))
            await persistNonTerminalRunUpdate(run, {
              stage: progress.stage,
              progress: Math.max(run.record.progress, normalizedProgress),
              progressMessage: progress.message?.trim() || null,
              updatedAt: input.now(),
            })
          })
        },
      })
      trainedArtifact = trained.artifact

      await assertCurrent()
      const increment: PersonaTrainingPipelineIncrement = {
        id: `persona-training-increment:${run.runId}`,
        kind: 'persona-lora-increment',
        cardId: run.cardId,
        datasetId: approved.dataset.id,
        manifestHash: approved.manifest.manifestHash,
        sourceIds: approved.manifest.examples.map(example => example.sourceId),
        basePersonaRevision,
        artifact: trained.artifact,
        state: 'available',
        createdAt: input.now(),
      }
      const completed = await terminalizeRun({
        run,
        status: 'completed',
        error: null,
        action: 'training-completed',
        reason: null,
        increment,
        artifact: trained.artifact,
        finishedAt: input.now(),
      })
      if (!completed)
        throw new Error('persona training run lost its completion transition')
      return {
        status: 'succeeded',
        runId: run.runId,
        increment,
      }
    }
    catch (error) {
      if (!trainedArtifact && error instanceof PersonaTrainingExecutorArtifactError)
        trainedArtifact = error.artifact
      const reason = run.invalidatedReason
        ?? (error instanceof PersonaTrainingPipelineGateError ? error.reason : 'executor-failed')
      let message = errorMessageFrom(error) ?? String(error)
      if (trainedArtifact && input.artifactLifecycle) {
        try {
          await discardArtifactWithRecovery({
            artifact: trainedArtifact,
            cardId: run.cardId,
            runId: run.runId,
            incrementId: null,
            reason: reason === 'executor-failed' ? 'training-failed' : reason,
            now: input.now(),
          })
        }
        catch (cleanupError) {
          message = `${message}; persona training artifact cleanup failed: ${errorMessageFrom(cleanupError) ?? String(cleanupError)}`
        }
      }
      const status: PersonaTrainingPipelineRunStatus = reason === 'cancelled'
        ? 'cancelled'
        : reason === 'interrupted'
          ? 'interrupted'
          : 'failed'
      const terminalError = reason === 'cancelled' || reason === 'interrupted'
        ? (run.cancellationReason ?? message)
        : message
      const terminalAction = reason === 'cancelled'
        ? 'training-cancelled'
        : reason === 'interrupted'
          ? 'training-interrupted'
          : 'training-failed'
      const terminalReason = reason === 'cancelled' || reason === 'interrupted'
        ? (run.cancellationReason ?? reason)
        : reason
      if (!run.terminalEventRecorded) {
        if (run.terminalizing) {
          await finishTerminalizingRun({
            run,
            status,
            error: terminalError,
            action: terminalAction,
            reason: terminalReason,
            failureReason: reason,
            finishedAt: input.now(),
          })
        }
        else {
          await terminalizeRun({
            run,
            status,
            error: terminalError,
            action: terminalAction,
            reason: terminalReason,
            failureReason: reason,
            finishedAt: input.now(),
          })
        }
      }
      return {
        status: 'failed',
        runId: run.runId,
        reason,
        error: message,
      }
    }
    finally {
      activeRuns.delete(run.runId)
    }
  }

  async function start(startInput: { cardId: string, datasetId?: string | null }) {
    const cardId = normalizeCardId(startInput.cardId)
    const approved = await resolveApprovedManifest({
      cardId,
      datasetId: startInput.datasetId,
    })
    const runId = input.randomUUID()
    const basePersonaRevision = await input.basePersonaRevision()
    const rawConfig = await input.resolveExecutorConfig?.() ?? null
    const configSnapshot = rawConfig
      ? { ...rawConfig }
      : null
    const queuedAt = input.now()
    const record: PersonaTrainingPipelineRunRecord = {
      runId,
      cardId,
      datasetId: approved.dataset.id,
      manifestHash: approved.manifest.manifestHash,
      sourceIds: approved.manifest.examples.map(example => example.sourceId),
      basePersonaRevision,
      status: 'queued',
      stage: 'writing-input',
      progress: 0,
      progressMessage: null,
      failureReason: null,
      configSnapshot,
      artifact: null,
      error: null,
      queuedAt,
      startedAt: null,
      updatedAt: queuedAt,
      finishedAt: null,
      cancellationRequestedAt: null,
    }
    await persistence.createRun(record)
    const run: ActiveTrainingRun = {
      runId,
      cardId,
      datasetId: approved.dataset.id,
      manifestHash: approved.manifest.manifestHash,
      sourceIds: new Set(record.sourceIds),
      controller: new AbortController(),
      invalidatedReason: null,
      cancellationReason: null,
      terminalizing: false,
      terminalEventRecorded: false,
      mutationQueue: Promise.resolve(),
      record: {
        ...record,
        sourceIds: [...record.sourceIds],
        configSnapshot: record.configSnapshot
          ? { ...record.configSnapshot }
          : null,
      },
      completion: Promise.resolve({
        status: 'failed',
        runId,
        reason: 'executor-failed',
        error: 'persona training has not started',
      }),
    }
    activeRuns.set(runId, run)
    run.completion = executeTrainingRun({
      run,
      approved,
      basePersonaRevision,
    })
    void run.completion.catch(() => {})
    return {
      run: {
        ...record,
        sourceIds: [...record.sourceIds],
        configSnapshot: record.configSnapshot
          ? { ...record.configSnapshot }
          : null,
      },
    }
  }

  async function getRun(getInput: { cardId: string, runId: string }) {
    const cardId = normalizeCardId(getInput.cardId)
    const active = activeRuns.get(getInput.runId)?.record ?? null
    const persisted = persistence.getRun
      ? await persistence.getRun(getInput.runId)
      : active
    if (!persisted || persisted.cardId !== cardId)
      return null
    return {
      ...persisted,
      sourceIds: [...persisted.sourceIds],
      configSnapshot: persisted.configSnapshot
        ? { ...persisted.configSnapshot }
        : null,
    }
  }

  async function listRuns(listInput: { cardId: string, limit?: number }) {
    const cardId = normalizeCardId(listInput.cardId)
    const persisted = persistence.listRuns
      ? await persistence.listRuns({ cardId, limit: listInput.limit })
      : [...activeRuns.values()].map(run => run.record)
    return persisted
      .filter(run => run.cardId === cardId)
      .slice(0, Math.max(1, Math.min(100, Math.floor(listInput.limit ?? 20))))
      .map(run => ({
        ...run,
        sourceIds: [...run.sourceIds],
        configSnapshot: run.configSnapshot
          ? { ...run.configSnapshot }
          : null,
      }))
  }

  async function train(trainInput: { cardId: string, datasetId?: string | null }): Promise<PersonaTrainingPipelineResult> {
    const started = await start(trainInput)
    const active = activeRuns.get(started.run.runId)
    if (!active)
      throw new Error('persona training run completed before its result could be observed')
    return await active.completion
  }

  async function cancel(cancelInput: { runId: string, cardId?: string, reason?: string | null }) {
    const run = activeRuns.get(cancelInput.runId)
    if (!run)
      return null
    if (cancelInput.cardId && run.cardId !== normalizeCardId(cancelInput.cardId))
      return null
    if (run.terminalizing || !isNonTerminalRunStatus(run.record.status)) {
      return {
        ...run.record,
        sourceIds: [...run.record.sourceIds],
        configSnapshot: run.record.configSnapshot
          ? { ...run.record.configSnapshot }
          : null,
      }
    }
    const reason = cancelInput.reason?.trim() || 'cancelled'
    run.invalidatedReason = 'cancelled'
    run.cancellationReason = reason
    const requestedAt = input.now()
    const cancelled = await enqueueRunMutation(run, async () => {
      if (run.terminalizing || !isNonTerminalRunStatus(run.record.status))
        return false
      return await persistNonTerminalRunUpdate(run, {
        status: 'cancel_requested',
        error: reason,
        failureReason: 'cancelled',
        cancellationRequestedAt: requestedAt,
        updatedAt: requestedAt,
      })
    })
    if (cancelled)
      run.controller.abort(reason)
    return { ...run.record, sourceIds: [...run.record.sourceIds] }
  }

  async function stop(reasonRaw: string) {
    const reason = reasonRaw.trim() || 'runtime-stopped'
    const runs = [...activeRuns.values()]
    for (const run of runs) {
      run.invalidatedReason ??= 'interrupted'
      run.cancellationReason ??= reason
      run.controller.abort(reason)
    }

    const terminalizations = runs.map(async (run) => {
      if (run.terminalizing || !isNonTerminalRunStatus(run.record.status))
        return
      await terminalizeRun({
        run,
        status: 'interrupted',
        error: reason,
        action: 'training-interrupted',
        reason,
        failureReason: 'interrupted',
        finishedAt: input.now(),
      })
    })
    const [terminalizationResults, completionResults] = await Promise.all([
      Promise.allSettled(terminalizations),
      Promise.allSettled(runs.map(run => run.completion)),
    ])
    const errors = [...terminalizationResults, ...completionResults]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason)
    if (errors.length > 0)
      throwCleanupErrors(errors, 'persona training shutdown failed')
  }

  async function activateVersion(activationInput: { cardId: string, datasetId: string }) {
    const cardId = normalizeCardId(activationInput.cardId)
    await hydratePersistedIncrements()
    const previousAvailable = [...increments.values()]
      .filter(increment => increment.cardId === cardId && increment.state === 'available')
    const activated = await input.datasetRuntime.activateVersion({
      cardId,
      datasetId: activationInput.datasetId,
    })
    if (activated) {
      await invalidateRuns({
        cardId,
        reason: 'dataset-rolled-back',
        now: input.now(),
      })
      if (input.datasetRuntime.atomicTrainingGovernance === true) {
        await hydratePersistedIncrements()
        await discardUnavailableIncrements(previousAvailable.filter((increment) => {
          const current = increments.get(increment.id)
          return current?.state === 'rolled-back'
        }), 'dataset-rolled-back')
      }
      else {
        await markIncrements({
          cardId,
          state: 'rolled-back',
          excludeDatasetId: activated.id,
          now: input.now(),
        })
      }
    }
    return activated
  }

  async function rollbackVersion(rollbackInput: { cardId: string, datasetId: string }) {
    const cardId = normalizeCardId(rollbackInput.cardId)
    await hydratePersistedIncrements()
    const previousAvailable = [...increments.values()]
      .filter(increment => increment.cardId === cardId && increment.state === 'available')
    const rolledBack = await input.datasetRuntime.rollbackVersion({
      cardId,
      datasetId: rollbackInput.datasetId,
    })
    if (rolledBack) {
      await invalidateRuns({
        cardId,
        reason: 'dataset-rolled-back',
        now: input.now(),
      })
      if (input.datasetRuntime.atomicTrainingGovernance === true) {
        await hydratePersistedIncrements()
        await discardUnavailableIncrements(previousAvailable.filter((increment) => {
          const current = increments.get(increment.id)
          return current?.state === 'rolled-back'
        }), 'dataset-rolled-back')
      }
      else {
        await markIncrements({
          cardId,
          state: 'rolled-back',
          excludeDatasetId: rolledBack.id,
          now: input.now(),
        })
      }
    }
    return rolledBack
  }

  async function revokeSource(revokeInput: { cardId: string, sourceId: string }) {
    const cardId = normalizeCardId(revokeInput.cardId)
    const sourceId = revokeInput.sourceId.trim()
    if (!sourceId)
      throw new Error('persona training pipeline source revoke requires sourceId')
    await hydratePersistedIncrements()
    const previousAvailable = [...increments.values()]
      .filter(increment => increment.cardId === cardId
        && increment.state === 'available'
        && increment.sourceIds.includes(sourceId))
    const result = await input.datasetRuntime.revokeSource({
      cardId,
      sourceId,
    })
    await invalidateRuns({
      cardId,
      sourceId,
      reason: 'source-revoked',
      now: input.now(),
    })
    if (input.datasetRuntime.atomicTrainingGovernance === true) {
      await hydratePersistedIncrements()
      await discardUnavailableIncrements(previousAvailable.filter((increment) => {
        const current = increments.get(increment.id)
        return current?.state === 'revoked'
      }), 'source-revoked')
    }
    else {
      await markIncrements({
        cardId,
        sourceId,
        state: 'revoked',
        now: input.now(),
      })
    }
    return result
  }

  async function rollbackIncrement(rollbackInput: { incrementId: string, cardId?: string }) {
    await hydratePersistedIncrements()
    const increment = increments.get(rollbackInput.incrementId)
    if (!increment)
      return null
    if (rollbackInput.cardId && increment.cardId !== normalizeCardId(rollbackInput.cardId))
      return null
    if (increment.state === 'available') {
      const event = {
        action: 'training-increment-rolled-back',
        runId: null,
        incrementId: increment.id,
        cardId: increment.cardId,
        datasetId: increment.datasetId,
        manifestHash: increment.manifestHash,
        sourceIds: [...increment.sourceIds],
        reason: 'manual-rollback',
        createdAt: input.now(),
      } satisfies PersonaTrainingPipelineAuditEvent
      if (persistence.transitionIncrementWithAudit) {
        const transitioned = await persistence.transitionIncrementWithAudit({
          incrementId: increment.id,
          state: 'rolled-back',
          event,
        })
        if (!transitioned) {
          await hydratePersistedIncrements()
          return increments.get(increment.id) ?? null
        }
      }
      else {
        await persistence.updateIncrementState({
          incrementId: increment.id,
          state: 'rolled-back',
        })
        await appendAuditEvent(event)
      }
      increment.state = 'rolled-back'
      await discardArtifactWithRecovery({
        artifact: increment.artifact,
        cardId: increment.cardId,
        incrementId: increment.id,
        reason: 'manual-rollback',
        now: input.now(),
      })
    }
    return { ...increment }
  }

  function listIncrements() {
    return [...increments.values()].map(increment => ({ ...increment }))
  }

  function listUsableIncrements() {
    return listIncrements().filter(increment => increment.state === 'available')
  }

  async function listPersistedIncrements() {
    const persisted = await persistence.listIncrements()
    return persisted.map(increment => ({ ...increment, sourceIds: [...increment.sourceIds] }))
  }

  return {
    start,
    getRun,
    listRuns,
    train,
    cancel,
    stop,
    activateVersion,
    rollbackVersion,
    revokeSource,
    rollbackIncrement,
    listIncrements,
    listPersistedIncrements,
    listUsableIncrements,
  }
}
