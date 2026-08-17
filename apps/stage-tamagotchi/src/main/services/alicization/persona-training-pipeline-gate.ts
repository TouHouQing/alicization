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

export interface PersonaTrainingArtifactLoaderReceipt {
  loaderId: string
  receiptId: string
  activatedAt: number
  reason?: string | null
}

export interface PersonaTrainingArtifactLoaderReceiptSnapshot {
  loaderId: string | null
  receiptId: string | null
  activatedAt: number | null
  reason: string | null
}

export interface PersonaTrainingArtifactLoader {
  load: (input: {
    cardId: string
    artifact: AlicizationPersonaTrainingArtifact
    signal: AbortSignal
    /**
     * Stable across retries. Loader implementations must return the same
     * semantic activation receipt for the same operationId.
     */
    operationId: string
  }) => Promise<PersonaTrainingArtifactLoaderReceipt>
  unload: (input: {
    cardId: string
    artifact: AlicizationPersonaTrainingArtifact
    reason: string
    /**
     * Stable across retries. Loader implementations must treat the same
     * operationId as an idempotent unload request.
     */
    operationId: string
    receipt?: PersonaTrainingArtifactLoaderReceiptSnapshot | null
  }) => Promise<void>
}

export type PersonaTrainingArtifactActivationMode = 'initial' | 'restart'
export type PersonaTrainingArtifactActivationStage = 'prepared' | 'loaded'

export interface PersonaTrainingArtifactActivationIntent {
  id: string
  loadOperationId: string
  mode: PersonaTrainingArtifactActivationMode
  cardId: string
  runId: string
  incrementId: string
  artifactId: string
  artifact: AlicizationPersonaTrainingArtifact
  expectedArtifact: AlicizationPersonaTrainingArtifact | null
  loaderReceipt: PersonaTrainingArtifactLoaderReceiptSnapshot | null
  activatedArtifact: AlicizationPersonaTrainingArtifact | null
  stage: PersonaTrainingArtifactActivationStage
  status: 'pending' | 'completed'
  lastError: string | null
  createdAt: number
  updatedAt: number
}

export interface PersonaTrainingArtifactActivationOwner {
  intentId: string
  cardId: string
  runId: string
  incrementId: string
  artifactId: string
  expectedStage: PersonaTrainingArtifactActivationStage
  expectedStatus: 'pending'
}

export type PersonaTrainingArtifactCleanupStage
  = 'unload'
    | 'discard'
    | 'finalize'

export interface PersonaTrainingArtifactCleanupIntent {
  id: string
  unloadOperationId: string
  cardId: string
  runId: string
  incrementId: string | null
  artifact: AlicizationPersonaTrainingArtifact
  loaderReceipt: PersonaTrainingArtifactLoaderReceiptSnapshot | null
  reason: string
  stage: PersonaTrainingArtifactCleanupStage
  finalizeIncrementState: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'> | null
  status: 'pending' | 'completed'
  attempts: number
  lastError: string | null
  createdAt: number
  updatedAt: number
}

export interface PersonaTrainingArtifactCleanupOwner {
  intentId: string
  cardId: string
  runId: string
  incrementId: string | null
  artifactId: string
  expectedStage: PersonaTrainingArtifactCleanupStage
  expectedStatus: 'pending'
}

export interface PersonaTrainingRestartCandidate {
  run: PersonaTrainingPipelineRunRecord
  increment: PersonaTrainingPipelineIncrement | null
  consistencyError: string | null
}

export type PersonaTrainingDatasetGovernanceMutation
  = {
    kind: 'activate-version' | 'rollback-version'
    cardId: string
    dataset: PersonaTrainingDatasetVersion
    at: number
    cleanupIntents: PersonaTrainingArtifactCleanupIntent[]
  }
  | {
    kind: 'revoke-source'
    cardId: string
    sourceId: string
    at: number
    cleanupIntents: PersonaTrainingArtifactCleanupIntent[]
  }

export type PersonaTrainingDatasetGovernanceMutationResult
  = {
    kind: 'activate-version' | 'rollback-version'
    dataset: PersonaTrainingDatasetVersion
  }
  | {
    kind: 'revoke-source'
    affected: number
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
  cleanup: {
    status: 'pending'
    stage: PersonaTrainingArtifactCleanupStage
    lastError: string | null
  } | null
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
    activation?: PersonaTrainingArtifactActivationOwner | null
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
  beginArtifactActivation?: (
    intent: PersonaTrainingArtifactActivationIntent,
  ) => Promise<PersonaTrainingArtifactActivationIntent>
  recordArtifactActivationReceipt?: (input: PersonaTrainingArtifactActivationOwner & {
    loaderReceipt: PersonaTrainingArtifactLoaderReceiptSnapshot
    activatedArtifact: AlicizationPersonaTrainingArtifact | null
    error: string | null
    at: number
  }) => Promise<boolean>
  failArtifactActivation?: (input: PersonaTrainingArtifactActivationOwner & {
    error: string
    at: number
  }) => Promise<boolean>
  handoffArtifactActivationToCleanup?: (input: PersonaTrainingArtifactActivationOwner & {
    cleanupIntent: PersonaTrainingArtifactCleanupIntent
    at: number
  }) => Promise<PersonaTrainingArtifactCleanupIntent>
  completeRestartArtifactActivation?: (input: PersonaTrainingArtifactActivationOwner & {
    expectedArtifact: AlicizationPersonaTrainingArtifact
    artifact: AlicizationPersonaTrainingArtifact
    at: number
  }) => Promise<boolean>
  completeArtifactActivation?: (input: PersonaTrainingArtifactActivationOwner & {
    at: number
  }) => Promise<boolean>
  listArtifactActivationIntents?: (input: {
    cardId?: string | null
    status?: 'pending' | 'completed'
  }) => Promise<PersonaTrainingArtifactActivationIntent[]>
  recordArtifactCleanupIntent?: (intent: PersonaTrainingArtifactCleanupIntent) => Promise<void>
  beginArtifactCleanup?: (intent: PersonaTrainingArtifactCleanupIntent) => Promise<PersonaTrainingArtifactCleanupIntent>
  advanceArtifactCleanup?: (input: PersonaTrainingArtifactCleanupOwner & {
    stage: PersonaTrainingArtifactCleanupStage
    artifact: AlicizationPersonaTrainingArtifact
    at: number
  }) => Promise<boolean>
  failArtifactCleanup?: (input: PersonaTrainingArtifactCleanupOwner & {
    attempts: number
    error: string
    at: number
  }) => Promise<boolean>
  completeArtifactCleanup?: (input: Omit<PersonaTrainingArtifactCleanupOwner, 'expectedStage'> & {
    expectedStage: 'finalize'
    attempts: number
    at: number
    transition: {
      incrementId: string
      state: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'>
      event: PersonaTrainingPipelineAuditEvent
    } | null
  }) => Promise<boolean>
  listArtifactCleanupIntents?: (input: {
    cardId?: string | null
    status?: 'pending' | 'completed'
  }) => Promise<PersonaTrainingArtifactCleanupIntent[]>
  listRestartCandidates?: (input: {
    cardId?: string | null
  }) => Promise<PersonaTrainingRestartCandidate[]>
  listRestartOrphanIncrements?: (input: {
    cardId?: string | null
  }) => Promise<PersonaTrainingPipelineIncrement[]>
  commitDatasetGovernanceWithArtifactCleanup?: (
    input: PersonaTrainingDatasetGovernanceMutation,
  ) => Promise<PersonaTrainingDatasetGovernanceMutationResult>
  compareAndSetRestartArtifact?: (input: {
    cardId: string
    runId: string
    incrementId: string
    artifactId: string
    expectedArtifact: AlicizationPersonaTrainingArtifact
    artifact: AlicizationPersonaTrainingArtifact
    at: number
  }) => Promise<boolean>
  listRestartRuns?: (input: {
    cardId?: string | null
  }) => Promise<PersonaTrainingPipelineRunRecord[]>
  interruptRunAfterRestart?: (input: {
    cardId: string
    runId: string
    expectedStatus: PersonaTrainingPipelineRunStatus
    reason: string
    at: number
    event: PersonaTrainingPipelineAuditEvent
  }) => Promise<boolean>
  appendEvent: (event: PersonaTrainingPipelineAuditEvent) => Promise<void>
  listIncrements: () => Promise<PersonaTrainingPipelineIncrement[]>
  getRun?: (runId: string) => Promise<PersonaTrainingPipelineRunRecord | null>
  listRuns?: (input: { cardId: string, limit?: number }) => Promise<PersonaTrainingPipelineRunRecord[]>
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
  reconcileAfterRestart: (input: {
    cardId?: string | null
    reason: string
  }) => Promise<{
    interruptedRuns: number
    rolledBackIncrements: number
  }>
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

class PersonaTrainingArtifactActivationError extends Error {
  constructor(
    message: string,
    readonly cleanupStage: Extract<PersonaTrainingArtifactCleanupStage, 'unload' | 'discard'>,
    readonly loaderReceipt: PersonaTrainingArtifactLoaderReceiptSnapshot,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'PersonaTrainingArtifactActivationError'
  }
}

class PersonaTrainingArtifactLoadPendingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PersonaTrainingArtifactLoadPendingError'
  }
}

function snapshotPersonaTrainingArtifactLoaderReceipt(
  receipt: unknown,
): PersonaTrainingArtifactLoaderReceiptSnapshot {
  const candidate = receipt && typeof receipt === 'object' && !Array.isArray(receipt)
    ? receipt as Record<string, unknown>
    : {}
  return {
    loaderId: typeof candidate.loaderId === 'string' ? candidate.loaderId : null,
    receiptId: typeof candidate.receiptId === 'string' ? candidate.receiptId : null,
    activatedAt: Number.isSafeInteger(candidate.activatedAt) && Number(candidate.activatedAt) >= 0
      ? Number(candidate.activatedAt)
      : null,
    reason: typeof candidate.reason === 'string' ? candidate.reason : null,
  }
}

function personaTrainingArtifactLoaderReceiptFromArtifact(
  artifact: AlicizationPersonaTrainingArtifact,
) {
  if (artifact.activation.status !== 'active')
    return null
  return {
    loaderId: artifact.activation.loaderId,
    receiptId: artifact.activation.receiptId,
    activatedAt: artifact.activation.activatedAt,
    reason: artifact.activation.reason,
  } satisfies PersonaTrainingArtifactLoaderReceiptSnapshot
}

function personaTrainingArtifactCleanupIntentId(input: {
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

function personaTrainingArtifactCleanupOperationId(
  intentId: string,
  stage: Extract<PersonaTrainingArtifactCleanupStage, 'unload'>,
) {
  return `${intentId}:${stage}`
}

function personaTrainingArtifactActivationOperationId(input: {
  cardId: string
  runId: string
  incrementId: string
  artifactId: string
  mode: 'initial' | 'restart'
  expectedReceiptId?: string | null
}) {
  const cycle = input.mode === 'restart'
    ? `:${encodeURIComponent(input.expectedReceiptId?.trim() || 'no-receipt')}`
    : ''
  const operationScope = [
    'persona-training-artifact-activation',
    input.cardId,
    input.runId,
    input.incrementId,
    input.artifactId,
    input.mode,
  ].map(encodeURIComponent).join(':')
  return `${operationScope}${cycle}:load`
}

function personaTrainingArtifactActivationIntentId(operationId: string) {
  return operationId.endsWith(':load') ? operationId.slice(0, -':load'.length) : operationId
}

function activatedPersonaTrainingArtifactFromReceipt(input: {
  artifact: AlicizationPersonaTrainingArtifact
  receipt: PersonaTrainingArtifactLoaderReceiptSnapshot
}) {
  const loaderId = input.receipt.loaderId?.trim() ?? ''
  const receiptId = input.receipt.receiptId?.trim() ?? ''
  const invalidFields = [
    !loaderId ? 'loaderId' : null,
    !receiptId ? 'receiptId' : null,
    input.receipt.activatedAt == null ? 'activatedAt' : null,
  ].filter((field): field is string => field != null)
  if (invalidFields.length > 0) {
    throw new PersonaTrainingArtifactActivationError(
      `persona training artifact loader returned an invalid activation receipt: ${invalidFields.join(', ')}`,
      'unload',
      input.receipt,
    )
  }
  return {
    ...input.artifact,
    activation: {
      status: 'active',
      reason: input.receipt.reason?.trim() || `Loaded by ${loaderId}.`,
      loaderId,
      receiptId,
      activatedAt: input.receipt.activatedAt!,
    },
  } satisfies AlicizationPersonaTrainingArtifact
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
  artifactLoader?: PersonaTrainingArtifactLoader
  artifactRecoveryTimeoutMs?: number
  defaultCardId?: string
  resolveExecutorConfig?: () => PersonaTrainingExecutorConfigSnapshot | null | Promise<PersonaTrainingExecutorConfigSnapshot | null>
  persistence?: PersonaTrainingPipelinePersistence
  now: () => number
  randomUUID: () => string
  basePersonaRevision: () => string | Promise<string>
}): PersonaTrainingPipelineGate {
  if (input.artifactLoader && !input.artifactLifecycle)
    throw new Error('persona training artifactLoader requires artifactLifecycle')

  const increments = new Map<string, PersonaTrainingPipelineIncrement>()
  const activationIntents = new Map<string, PersonaTrainingArtifactActivationIntent>()
  const cleanupIntents = new Map<string, PersonaTrainingArtifactCleanupIntent>()
  const incrementMutationQueues = new Map<string, Promise<void>>()
  const activeRuns = new Map<string, ActiveTrainingRun>()
  const artifactRecoveryTimeoutMs = Math.max(
    1,
    Math.floor(input.artifactRecoveryTimeoutMs ?? 5_000),
  )
  const persistence: PersonaTrainingPipelinePersistence = input.persistence ?? {
    createRun: async () => {},
    updateRun: async () => true,
    completeRunWithIncrement: async () => ({ completed: true }),
    finishRun: async () => true,
    updateIncrementState: async () => {},
    recordArtifactCleanupIntent: async () => {},
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
    activationIntent?: PersonaTrainingArtifactActivationIntent | null
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
          activation: terminalInput.activationIntent
            ? activationOwner(terminalInput.activationIntent)
            : null,
        })
        if (!completed.completed) {
          throw new PersonaTrainingPipelineGateError(
            completed.reason ?? 'manifest-no-longer-usable',
            completed.error ?? 'persona training completion preconditions no longer hold',
          )
        }
        increments.set(terminalInput.increment.id, terminalInput.increment)
        if (terminalInput.activationIntent)
          activationIntents.delete(terminalInput.activationIntent.id)
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

  async function enqueueIncrementMutation<T>(
    incrementId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = incrementMutationQueues.get(incrementId) ?? Promise.resolve()
    const current = previous
      .catch(() => {})
      .then(operation)
    const tail = current.then(() => {}, () => {})
    incrementMutationQueues.set(incrementId, tail)
    try {
      return await current
    }
    finally {
      if (incrementMutationQueues.get(incrementId) === tail)
        incrementMutationQueues.delete(incrementId)
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
    for (const candidate of increments.values()) {
      const incrementId = candidate.id
      if (candidate.cardId !== markInput.cardId)
        continue
      if (markInput.datasetId && candidate.datasetId !== markInput.datasetId)
        continue
      if (markInput.excludeDatasetId && candidate.datasetId === markInput.excludeDatasetId)
        continue
      if (markInput.sourceId && !candidate.sourceIds.includes(markInput.sourceId))
        continue
      try {
        await enqueueIncrementMutation(incrementId, async () => {
          const increment = increments.get(incrementId)
          if (!increment)
            return
          if (increment.cardId !== markInput.cardId)
            return
          if (markInput.datasetId && increment.datasetId !== markInput.datasetId)
            return
          if (markInput.excludeDatasetId && increment.datasetId === markInput.excludeDatasetId)
            return
          if (markInput.sourceId && !increment.sourceIds.includes(markInput.sourceId))
            return
          const shouldTransition = markInput.state === 'revoked'
            ? increment.state !== 'revoked'
            : increment.state === 'available'
          if (!shouldTransition)
            return
          const event = {
            action: markInput.state === 'revoked'
              ? 'training-increment-revoked'
              : 'training-increment-rolled-back',
            runId: null,
            incrementId: increment.id,
            cardId: increment.cardId,
            datasetId: increment.datasetId,
            manifestHash: increment.manifestHash,
            sourceIds: [...increment.sourceIds],
            reason: markInput.sourceId ? 'source-revoked' : 'dataset-rolled-back',
            createdAt: markInput.now,
          } satisfies PersonaTrainingPipelineAuditEvent
          if (markInput.state === 'revoked' && increment.state === 'rolled-back') {
            await finalizeIncrementCleanup({
              increment,
              state: 'revoked',
              event,
            })
            return
          }
          await discardArtifactWithRecovery({
            artifact: increment.artifact,
            cardId: increment.cardId,
            incrementId: increment.id,
            reason: markInput.state === 'revoked' ? 'source-revoked' : 'dataset-rolled-back',
            now: markInput.now,
            transition: {
              increment,
              state: markInput.state,
              event,
            },
          })
        })
      }
      catch (error) {
        cleanupErrors.push(error)
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
    for (const candidate of candidates) {
      try {
        await enqueueIncrementMutation(candidate.id, async () => {
          const increment = increments.get(candidate.id) ?? candidate
          await discardArtifactWithRecovery({
            artifact: increment.artifact,
            cardId: increment.cardId,
            incrementId: increment.id,
            reason,
            now: input.now(),
          })
        })
      }
      catch (error) {
        cleanupErrors.push(error)
      }
    }
    if (cleanupErrors.length > 0)
      throwCleanupErrors(cleanupErrors, 'persona training artifact cleanup failed')
  }

  function artifactCleanupIntentId(inputData: {
    cardId: string
    runId?: string
    incrementId: string | null
    artifact: AlicizationPersonaTrainingArtifact
  }) {
    return personaTrainingArtifactCleanupIntentId({
      cardId: inputData.cardId,
      runId: inputData.runId ?? inputData.artifact.runId,
      incrementId: inputData.incrementId,
      artifactId: inputData.artifact.artifactId,
    })
  }

  function inactiveArtifactAfterUnload(
    artifact: AlicizationPersonaTrainingArtifact,
    reason: string,
  ): AlicizationPersonaTrainingArtifact {
    return {
      ...artifact,
      activation: {
        status: 'inactive',
        reason: `Unloaded for ${reason}.`,
      },
    }
  }

  interface ArtifactCleanupInput {
    artifact: AlicizationPersonaTrainingArtifact
    cardId: string
    runId?: string
    incrementId: string | null
    reason: string
    now: number
    initialStage?: PersonaTrainingArtifactCleanupStage
    loaderReceipt?: PersonaTrainingArtifactLoaderReceiptSnapshot | null
    finalizeIncrementState?: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'> | null
  }

  function buildArtifactCleanupIntent(inputData: ArtifactCleanupInput) {
    const id = artifactCleanupIntentId(inputData)
    return {
      id,
      unloadOperationId: personaTrainingArtifactCleanupOperationId(id, 'unload'),
      cardId: inputData.cardId,
      runId: inputData.runId ?? inputData.artifact.runId,
      incrementId: inputData.incrementId,
      artifact: inputData.artifact,
      loaderReceipt: inputData.loaderReceipt
        ?? personaTrainingArtifactLoaderReceiptFromArtifact(inputData.artifact),
      reason: inputData.reason,
      stage: inputData.initialStage
        ?? (inputData.artifact.activation.status === 'active' ? 'unload' : 'discard'),
      finalizeIncrementState: inputData.finalizeIncrementState ?? null,
      status: 'pending',
      attempts: 0,
      lastError: null,
      createdAt: inputData.now,
      updatedAt: inputData.now,
    } satisfies PersonaTrainingArtifactCleanupIntent
  }

  function activationOwner(
    intent: PersonaTrainingArtifactActivationIntent,
  ): PersonaTrainingArtifactActivationOwner {
    return {
      intentId: intent.id,
      cardId: intent.cardId,
      runId: intent.runId,
      incrementId: intent.incrementId,
      artifactId: intent.artifactId,
      expectedStage: intent.stage,
      expectedStatus: 'pending',
    }
  }

  async function beginArtifactActivation(inputData: {
    mode: PersonaTrainingArtifactActivationMode
    cardId: string
    runId: string
    incrementId: string
    artifact: AlicizationPersonaTrainingArtifact
    expectedArtifact: AlicizationPersonaTrainingArtifact | null
    now: number
  }) {
    const expectedReceiptId = inputData.expectedArtifact?.activation.status === 'active'
      ? inputData.expectedArtifact.activation.receiptId
      : null
    const loadOperationId = personaTrainingArtifactActivationOperationId({
      cardId: inputData.cardId,
      runId: inputData.runId,
      incrementId: inputData.incrementId,
      artifactId: inputData.artifact.artifactId,
      mode: inputData.mode,
      expectedReceiptId,
    })
    const id = personaTrainingArtifactActivationIntentId(loadOperationId)
    const existing = activationIntents.get(id)
    if (existing?.status === 'pending')
      return existing
    const intent = {
      id,
      loadOperationId,
      mode: inputData.mode,
      cardId: inputData.cardId,
      runId: inputData.runId,
      incrementId: inputData.incrementId,
      artifactId: inputData.artifact.artifactId,
      artifact: inputData.artifact,
      expectedArtifact: inputData.expectedArtifact,
      loaderReceipt: null,
      activatedArtifact: null,
      stage: 'prepared',
      status: 'pending',
      lastError: null,
      createdAt: inputData.now,
      updatedAt: inputData.now,
    } satisfies PersonaTrainingArtifactActivationIntent
    const persisted = persistence.beginArtifactActivation
      ? await persistence.beginArtifactActivation(intent)
      : intent
    if (
      persisted.id !== intent.id
      || persisted.loadOperationId !== intent.loadOperationId
      || persisted.mode !== intent.mode
      || persisted.cardId !== intent.cardId
      || persisted.runId !== intent.runId
      || persisted.incrementId !== intent.incrementId
      || persisted.artifactId !== intent.artifactId
      || persisted.artifact.runId !== intent.runId
      || persisted.artifact.artifactId !== intent.artifactId
      || persisted.status !== 'pending'
      || persisted.stage !== 'prepared'
    ) {
      throw new Error('persona training artifact activation intent owner or lifecycle state does not match its begin request')
    }
    activationIntents.set(persisted.id, persisted)
    return persisted
  }

  async function recordArtifactActivationReceipt(
    intent: PersonaTrainingArtifactActivationIntent,
    receipt: PersonaTrainingArtifactLoaderReceiptSnapshot,
    at: number,
  ) {
    let activatedArtifact: AlicizationPersonaTrainingArtifact | null = null
    let activationError: PersonaTrainingArtifactActivationError | null = null
    try {
      activatedArtifact = activatedPersonaTrainingArtifactFromReceipt({
        artifact: intent.artifact,
        receipt,
      })
    }
    catch (error) {
      if (!(error instanceof PersonaTrainingArtifactActivationError))
        throw error
      activationError = error
    }
    if (persistence.recordArtifactActivationReceipt) {
      const recorded = await persistence.recordArtifactActivationReceipt({
        ...activationOwner(intent),
        loaderReceipt: receipt,
        activatedArtifact,
        error: activationError?.message ?? null,
        at,
      })
      if (!recorded)
        throw new Error('persona training artifact activation lost its receipt compare-and-set')
    }
    const next = {
      ...intent,
      loaderReceipt: receipt,
      activatedArtifact,
      stage: 'loaded',
      lastError: activationError?.message ?? null,
      updatedAt: at,
    } satisfies PersonaTrainingArtifactActivationIntent
    activationIntents.set(next.id, next)
    return {
      intent: next,
      activationError,
    }
  }

  async function loadArtifactActivation(
    intent: PersonaTrainingArtifactActivationIntent,
    signal: AbortSignal,
    timeoutMs?: number,
  ) {
    if (!input.artifactLoader)
      throw new Error('persona training artifact loader is unavailable')
    try {
      const receipt = timeoutMs == null
        ? await input.artifactLoader.load({
            cardId: intent.cardId,
            artifact: intent.artifact,
            signal,
            operationId: intent.loadOperationId,
          })
        : await (async () => {
            const recoveryController = new AbortController()
            const abortRecovery = () => recoveryController.abort(signal.reason)
            if (signal.aborted)
              abortRecovery()
            else
              signal.addEventListener('abort', abortRecovery, { once: true })
            let timeoutHandle: ReturnType<typeof setTimeout> | null = null
            try {
              const timeoutError = new Error(
                `persona training artifact recovery load timed out after ${timeoutMs}ms`,
              )
              const timeout = new Promise<never>((_, reject) => {
                timeoutHandle = setTimeout(() => {
                  recoveryController.abort(timeoutError)
                  reject(timeoutError)
                }, timeoutMs)
              })
              return await Promise.race([
                input.artifactLoader!.load({
                  cardId: intent.cardId,
                  artifact: intent.artifact,
                  signal: recoveryController.signal,
                  operationId: intent.loadOperationId,
                }),
                timeout,
              ])
            }
            finally {
              if (timeoutHandle)
                clearTimeout(timeoutHandle)
              signal.removeEventListener('abort', abortRecovery)
            }
          })()
      return await recordArtifactActivationReceipt(
        intent,
        snapshotPersonaTrainingArtifactLoaderReceipt(receipt),
        input.now(),
      )
    }
    catch (error) {
      if (error instanceof PersonaTrainingArtifactActivationError)
        throw error
      const message = errorMessageFrom(error) ?? String(error)
      if (persistence.failArtifactActivation) {
        await persistence.failArtifactActivation({
          ...activationOwner(intent),
          error: message,
          at: input.now(),
        })
      }
      throw new PersonaTrainingArtifactLoadPendingError(
        `persona training artifact load is pending recovery: ${message}`,
        { cause: error },
      )
    }
  }

  async function handoffArtifactActivationToCleanup(inputData: {
    intent: PersonaTrainingArtifactActivationIntent
    reason: string
    transition?: {
      increment: PersonaTrainingPipelineIncrement
      state: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'>
      event: PersonaTrainingPipelineAuditEvent
    } | null
  }) {
    const cleanupIntent = buildArtifactCleanupIntent({
      artifact: inputData.intent.activatedArtifact ?? inputData.intent.artifact,
      cardId: inputData.intent.cardId,
      runId: inputData.intent.runId,
      incrementId: inputData.transition?.increment.id ?? null,
      reason: inputData.reason,
      now: input.now(),
      initialStage: 'unload',
      loaderReceipt: inputData.intent.loaderReceipt,
      finalizeIncrementState: inputData.transition?.state ?? null,
    })
    const persistedCleanup = persistence.handoffArtifactActivationToCleanup
      ? await persistence.handoffArtifactActivationToCleanup({
          ...activationOwner(inputData.intent),
          cleanupIntent,
          at: input.now(),
        })
      : await beginArtifactCleanup({
          artifact: cleanupIntent.artifact,
          cardId: cleanupIntent.cardId,
          runId: cleanupIntent.runId,
          incrementId: cleanupIntent.incrementId,
          reason: cleanupIntent.reason,
          now: cleanupIntent.createdAt,
          initialStage: cleanupIntent.stage,
          loaderReceipt: cleanupIntent.loaderReceipt,
          finalizeIncrementState: cleanupIntent.finalizeIncrementState,
        })
    activationIntents.delete(inputData.intent.id)
    cleanupIntents.set(persistedCleanup.id, persistedCleanup)
    return persistedCleanup
  }

  async function beginArtifactCleanup(inputData: ArtifactCleanupInput) {
    const id = artifactCleanupIntentId(inputData)
    const existing = cleanupIntents.get(id)
    if (existing?.status === 'pending')
      return existing
    const intent = buildArtifactCleanupIntent(inputData)
    const persisted = persistence.beginArtifactCleanup
      ? await persistence.beginArtifactCleanup(intent)
      : intent
    cleanupIntents.set(id, persisted)
    if (persisted.incrementId) {
      const increment = increments.get(persisted.incrementId)
      if (increment) {
        increment.cleanup = {
          status: 'pending',
          stage: persisted.stage,
          lastError: persisted.lastError,
        }
      }
    }
    return persisted
  }

  async function advanceArtifactCleanup(
    intent: PersonaTrainingArtifactCleanupIntent,
    stage: PersonaTrainingArtifactCleanupStage,
    artifact: AlicizationPersonaTrainingArtifact,
    at: number,
  ) {
    if (persistence.advanceArtifactCleanup) {
      const advanced = await persistence.advanceArtifactCleanup({
        intentId: intent.id,
        cardId: intent.cardId,
        runId: intent.runId,
        incrementId: intent.incrementId,
        artifactId: intent.artifact.artifactId,
        expectedStage: intent.stage,
        expectedStatus: 'pending',
        stage,
        artifact,
        at,
      })
      if (!advanced)
        throw new Error(`persona training artifact cleanup lost its ${intent.stage} stage transition`)
    }
    const next = {
      ...intent,
      artifact,
      stage,
      lastError: null,
      updatedAt: at,
    } satisfies PersonaTrainingArtifactCleanupIntent
    cleanupIntents.set(intent.id, next)
    if (next.incrementId) {
      const increment = increments.get(next.incrementId)
      if (increment) {
        increment.artifact = artifact
        increment.cleanup = {
          status: 'pending',
          stage: next.stage,
          lastError: null,
        }
      }
    }
    return next
  }

  async function failArtifactCleanup(
    intent: PersonaTrainingArtifactCleanupIntent,
    cleanupError: unknown,
    at: number,
  ) {
    const cleanupMessage = errorMessageFrom(cleanupError) ?? String(cleanupError)
    const failed = {
      ...intent,
      status: 'pending',
      attempts: intent.attempts + 1,
      lastError: cleanupMessage,
      updatedAt: at,
    } satisfies PersonaTrainingArtifactCleanupIntent
    cleanupIntents.set(intent.id, failed)
    if (failed.incrementId) {
      const increment = increments.get(failed.incrementId)
      if (increment) {
        increment.cleanup = {
          status: 'pending',
          stage: failed.stage,
          lastError: failed.lastError,
        }
      }
    }
    try {
      if (persistence.failArtifactCleanup) {
        const recorded = await persistence.failArtifactCleanup({
          intentId: failed.id,
          cardId: failed.cardId,
          runId: failed.runId,
          incrementId: failed.incrementId,
          artifactId: failed.artifact.artifactId,
          expectedStage: failed.stage,
          expectedStatus: 'pending',
          attempts: failed.attempts,
          error: cleanupMessage,
          at,
        })
        if (!recorded)
          throw new Error('cleanup recovery intent stage no longer matches')
      }
      else {
        if (!persistence.recordArtifactCleanupIntent)
          throw new Error('cleanup recovery intent persistence is unavailable')
        await persistence.recordArtifactCleanupIntent(failed)
      }
    }
    catch (intentError) {
      throw new Error(
        `persona training artifact cleanup failed: ${cleanupMessage}; `
        + `cleanup recovery intent persistence failed: ${errorMessageFrom(intentError) ?? String(intentError)}`,
        { cause: cleanupError },
      )
    }
    throw new Error(
      `persona training artifact cleanup failed at ${failed.stage}: ${cleanupMessage}; cleanup recovery intent recorded`,
      { cause: cleanupError },
    )
  }

  async function finalizeIncrementCleanup(inputData: {
    increment: PersonaTrainingPipelineIncrement
    state: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'>
    event: PersonaTrainingPipelineAuditEvent
  }) {
    if (inputData.increment.state === inputData.state)
      return
    if (persistence.transitionIncrementWithAudit) {
      const transitioned = await persistence.transitionIncrementWithAudit({
        incrementId: inputData.increment.id,
        state: inputData.state,
        event: inputData.event,
      })
      if (!transitioned) {
        await hydratePersistedIncrements()
        const persisted = increments.get(inputData.increment.id)
        if (persisted?.state !== inputData.state) {
          throw new Error(
            `persona training increment cleanup finalization lost its state transition: expected ${inputData.state}, found ${persisted?.state ?? 'missing'}`,
          )
        }
      }
    }
    else {
      await persistence.updateIncrementState({
        incrementId: inputData.increment.id,
        state: inputData.state,
      })
      await appendAuditEvent(inputData.event)
    }
    inputData.increment.state = inputData.state
    const current = increments.get(inputData.increment.id)
    if (current)
      current.state = inputData.state
  }

  async function completeArtifactCleanup(inputData: {
    intent: PersonaTrainingArtifactCleanupIntent
    transition: {
      increment: PersonaTrainingPipelineIncrement
      state: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'>
      event: PersonaTrainingPipelineAuditEvent
    } | null
    at: number
  }) {
    const attempts = inputData.intent.attempts + 1
    if (persistence.completeArtifactCleanup) {
      const completed = await persistence.completeArtifactCleanup({
        intentId: inputData.intent.id,
        cardId: inputData.intent.cardId,
        runId: inputData.intent.runId,
        incrementId: inputData.intent.incrementId,
        artifactId: inputData.intent.artifact.artifactId,
        expectedStage: 'finalize',
        expectedStatus: 'pending',
        attempts,
        at: inputData.at,
        transition: inputData.transition
          ? {
              incrementId: inputData.transition.increment.id,
              state: inputData.transition.state,
              event: inputData.transition.event,
            }
          : null,
      })
      if (!completed)
        throw new Error('persona training artifact cleanup lost its finalize stage transition')
      if (inputData.transition) {
        inputData.transition.increment.state = inputData.transition.state
        const current = increments.get(inputData.transition.increment.id)
        if (current)
          current.state = inputData.transition.state
      }
    }
    else if (inputData.transition) {
      await finalizeIncrementCleanup(inputData.transition)
    }
    cleanupIntents.delete(inputData.intent.id)
    if (inputData.intent.incrementId) {
      const increment = increments.get(inputData.intent.incrementId)
      if (increment)
        increment.cleanup = null
    }
  }

  async function discardArtifactWithRecovery(inputData: {
    artifact: AlicizationPersonaTrainingArtifact
    cardId: string
    runId?: string
    incrementId: string | null
    reason: string
    now: number
    initialStage?: PersonaTrainingArtifactCleanupStage
    loaderReceipt?: PersonaTrainingArtifactLoaderReceiptSnapshot | null
    transition?: {
      increment: PersonaTrainingPipelineIncrement
      state: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'>
      event: PersonaTrainingPipelineAuditEvent
    } | null
  }) {
    const artifactLifecycle = input.artifactLifecycle
    if (!artifactLifecycle) {
      const intent = await beginArtifactCleanup({
        ...inputData,
        initialStage: inputData.artifact.activation.status === 'active' ? 'unload' : 'discard',
        finalizeIncrementState: inputData.transition?.state ?? null,
      })
      return await failArtifactCleanup(
        intent,
        new Error('persona training artifact lifecycle is unavailable for discard'),
        input.now(),
      )
    }
    let intent = await beginArtifactCleanup({
      ...inputData,
      finalizeIncrementState: inputData.transition?.state ?? null,
    })
    let transition: {
      increment: PersonaTrainingPipelineIncrement
      state: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'>
      event: PersonaTrainingPipelineAuditEvent
    } | null = inputData.transition ?? null
    if (!transition && intent.incrementId && intent.finalizeIncrementState) {
      const increment = increments.get(intent.incrementId)
      if (increment) {
        transition = {
          increment,
          state: intent.finalizeIncrementState,
          event: {
            action: intent.finalizeIncrementState === 'revoked'
              ? 'training-increment-revoked'
              : 'training-increment-rolled-back',
            runId: null,
            incrementId: increment.id,
            cardId: increment.cardId,
            datasetId: increment.datasetId,
            manifestHash: increment.manifestHash,
            sourceIds: [...increment.sourceIds],
            reason: intent.reason,
            createdAt: input.now(),
          },
        }
      }
    }
    try {
      if (intent.stage === 'unload') {
        if (!input.artifactLoader)
          throw new Error('persona training artifact loader is unavailable for active artifact cleanup')
        await input.artifactLoader.unload({
          cardId: intent.cardId,
          artifact: intent.artifact,
          reason: intent.reason,
          operationId: intent.unloadOperationId,
          receipt: intent.loaderReceipt,
        })
        const inactiveArtifact = inactiveArtifactAfterUnload(intent.artifact, intent.reason)
        intent = await advanceArtifactCleanup(intent, 'discard', inactiveArtifact, input.now())
      }
      if (intent.stage === 'discard') {
        await artifactLifecycle.discardArtifact(intent.artifact)
        intent = await advanceArtifactCleanup(intent, 'finalize', intent.artifact, input.now())
      }
      if (intent.stage === 'finalize') {
        await completeArtifactCleanup({
          intent,
          transition,
          at: input.now(),
        })
      }
    }
    catch (cleanupError) {
      await failArtifactCleanup(intent, cleanupError, input.now())
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
    let activationIntent: PersonaTrainingArtifactActivationIntent | null = null
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
      const artifactAwaitingLoader = input.artifactLoader
        ? {
            ...trained.artifact,
            activation: {
              status: 'inactive' as const,
              reason: 'Awaiting durable artifact loader activation.',
            },
          }
        : trained.artifact.activation.status === 'unsupported'
          ? trained.artifact
          : {
              ...trained.artifact,
              activation: {
                status: 'unsupported' as const,
                reason: 'No artifact loader is configured.',
              },
            }
      trainedArtifact = artifactAwaitingLoader

      await assertCurrent()
      if (input.artifactLoader) {
        if (artifactAwaitingLoader.compatibility.status !== 'compatible') {
          throw new Error(
            `persona training artifact is not compatible with the configured loader: ${artifactAwaitingLoader.compatibility.reason ?? artifactAwaitingLoader.compatibility.status}`,
          )
        }
        activationIntent = await beginArtifactActivation({
          mode: 'initial',
          cardId: run.cardId,
          runId: run.runId,
          incrementId: `persona-training-increment:${run.runId}`,
          artifact: artifactAwaitingLoader,
          expectedArtifact: null,
          now: input.now(),
        })
        const loaded = await loadArtifactActivation(activationIntent, run.controller.signal)
        activationIntent = loaded.intent
        if (loaded.activationError) {
          await handoffArtifactActivationToCleanup({
            intent: activationIntent,
            reason: 'invalid-activation-receipt',
          })
          try {
            await discardArtifactWithRecovery({
              artifact: activationIntent.artifact,
              cardId: activationIntent.cardId,
              runId: activationIntent.runId,
              incrementId: null,
              reason: 'invalid-activation-receipt',
              now: input.now(),
              initialStage: 'unload',
              loaderReceipt: activationIntent.loaderReceipt,
            })
          }
          catch (cleanupError) {
            throw new PersonaTrainingArtifactActivationError(
              `${loaded.activationError.message}; compensation cleanup failed: ${errorMessageFrom(cleanupError) ?? String(cleanupError)}`,
              'unload',
              activationIntent.loaderReceipt ?? snapshotPersonaTrainingArtifactLoaderReceipt(null),
              { cause: cleanupError },
            )
          }
          throw loaded.activationError
        }
        trainedArtifact = activationIntent.activatedArtifact!
      }
      await assertCurrent()
      const increment: PersonaTrainingPipelineIncrement = {
        id: `persona-training-increment:${run.runId}`,
        kind: 'persona-lora-increment',
        cardId: run.cardId,
        datasetId: approved.dataset.id,
        manifestHash: approved.manifest.manifestHash,
        sourceIds: approved.manifest.examples.map(example => example.sourceId),
        basePersonaRevision,
        artifact: trainedArtifact,
        state: 'available',
        cleanup: null,
        createdAt: input.now(),
      }
      const completed = await terminalizeRun({
        run,
        status: 'completed',
        error: null,
        action: 'training-completed',
        reason: null,
        increment,
        activationIntent,
        artifact: trainedArtifact,
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
      const cleanupReason = reason === 'executor-failed' ? 'training-failed' : reason
      if (
        activationIntent
        && !(error instanceof PersonaTrainingArtifactLoadPendingError)
        && activationIntents.has(activationIntent.id)
      ) {
        try {
          await handoffArtifactActivationToCleanup({
            intent: activationIntent,
            reason: cleanupReason,
          })
          await discardArtifactWithRecovery({
            artifact: activationIntent.activatedArtifact ?? activationIntent.artifact,
            cardId: activationIntent.cardId,
            runId: activationIntent.runId,
            incrementId: null,
            reason: cleanupReason,
            now: input.now(),
            initialStage: 'unload',
            loaderReceipt: activationIntent.loaderReceipt,
          })
        }
        catch (cleanupError) {
          message = `${message}; persona training artifact cleanup failed: ${errorMessageFrom(cleanupError) ?? String(cleanupError)}`
        }
      }
      else if (
        trainedArtifact
        && input.artifactLifecycle
        && !(error instanceof PersonaTrainingArtifactLoadPendingError)
        && !activationIntent
      ) {
        try {
          await discardArtifactWithRecovery({
            artifact: trainedArtifact,
            cardId: run.cardId,
            runId: run.runId,
            incrementId: null,
            reason: cleanupReason,
            now: input.now(),
            initialStage: error instanceof PersonaTrainingArtifactActivationError
              ? error.cleanupStage
              : undefined,
            loaderReceipt: error instanceof PersonaTrainingArtifactActivationError
              ? error.loaderReceipt
              : undefined,
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

  function restartInterruptedEvent(
    run: PersonaTrainingPipelineRunRecord,
    reason: string,
    at: number,
  ): PersonaTrainingPipelineAuditEvent {
    return {
      action: 'training-interrupted',
      runId: run.runId,
      incrementId: null,
      cardId: run.cardId,
      datasetId: run.datasetId,
      manifestHash: run.manifestHash,
      sourceIds: [...run.sourceIds],
      reason,
      createdAt: at,
    }
  }

  async function interruptRestartedRun(
    run: PersonaTrainingPipelineRunRecord,
    reason: string,
  ) {
    if (!persistence.interruptRunAfterRestart)
      return false
    const at = input.now()
    return await persistence.interruptRunAfterRestart({
      cardId: run.cardId,
      runId: run.runId,
      expectedStatus: run.status,
      reason,
      at,
      event: restartInterruptedEvent(run, reason, at),
    })
  }

  function restartInactiveArtifact(
    artifact: AlicizationPersonaTrainingArtifact,
    reason: string,
  ): AlicizationPersonaTrainingArtifact {
    return {
      ...artifact,
      activation: {
        status: 'inactive',
        reason,
      },
    }
  }

  async function persistRestartArtifact(inputData: {
    candidate: PersonaTrainingRestartCandidate
    expectedArtifact: AlicizationPersonaTrainingArtifact
    artifact: AlicizationPersonaTrainingArtifact
  }) {
    const increment = inputData.candidate.increment
    if (!increment || !persistence.compareAndSetRestartArtifact)
      throw new Error('persona training restart artifact receipt persistence is unavailable')
    const persisted = await persistence.compareAndSetRestartArtifact({
      cardId: inputData.candidate.run.cardId,
      runId: inputData.candidate.run.runId,
      incrementId: increment.id,
      artifactId: inputData.expectedArtifact.artifactId,
      expectedArtifact: inputData.expectedArtifact,
      artifact: inputData.artifact,
      at: input.now(),
    })
    if (!persisted)
      throw new Error('persona training restart artifact receipt persistence lost its compare-and-set')
    inputData.candidate.run.artifact = inputData.artifact
    increment.artifact = inputData.artifact
    increments.set(increment.id, increment)
  }

  function restartRollbackTransition(
    increment: PersonaTrainingPipelineIncrement,
    reason: string,
  ) {
    return {
      increment,
      state: 'rolled-back' as const,
      event: {
        action: 'training-increment-rolled-back' as const,
        runId: increment.artifact.runId,
        incrementId: increment.id,
        cardId: increment.cardId,
        datasetId: increment.datasetId,
        manifestHash: increment.manifestHash,
        sourceIds: [...increment.sourceIds],
        reason,
        createdAt: input.now(),
      },
    }
  }

  async function cleanupRestartCandidate(inputData: {
    candidate: PersonaTrainingRestartCandidate
    artifact: AlicizationPersonaTrainingArtifact
    reason: string
    initialStage?: Extract<PersonaTrainingArtifactCleanupStage, 'unload' | 'discard'>
    loaderReceipt?: PersonaTrainingArtifactLoaderReceiptSnapshot | null
  }) {
    const increment = inputData.candidate.increment
    if (!increment)
      return false
    try {
      await discardArtifactWithRecovery({
        artifact: inputData.artifact,
        cardId: increment.cardId,
        runId: increment.artifact.runId,
        incrementId: increment.id,
        reason: inputData.reason,
        now: input.now(),
        initialStage: inputData.initialStage,
        loaderReceipt: inputData.loaderReceipt,
        transition: restartRollbackTransition(increment, inputData.reason),
      })
    }
    catch {
      return false
    }
    return await interruptRestartedRun(inputData.candidate.run, inputData.reason)
  }

  async function completeRestartActivation(
    intent: PersonaTrainingArtifactActivationIntent,
    candidate: PersonaTrainingRestartCandidate,
  ) {
    const increment = candidate.increment
    const activatedArtifact = intent.activatedArtifact
    const expectedArtifact = intent.expectedArtifact
    if (!increment || !activatedArtifact || !expectedArtifact)
      throw new Error('persona training restart activation intent is incomplete')
    if (persistence.completeRestartArtifactActivation) {
      const completed = await persistence.completeRestartArtifactActivation({
        ...activationOwner(intent),
        expectedArtifact,
        artifact: activatedArtifact,
        at: input.now(),
      })
      if (!completed)
        throw new Error('persona training restart activation lost its atomic compare-and-set')
    }
    else {
      await persistRestartArtifact({
        candidate,
        expectedArtifact,
        artifact: activatedArtifact,
      })
      if (persistence.completeArtifactActivation) {
        const completed = await persistence.completeArtifactActivation({
          ...activationOwner(intent),
          at: input.now(),
        })
        if (!completed)
          throw new Error('persona training restart activation lost its completion compare-and-set')
      }
    }
    candidate.run.artifact = activatedArtifact
    increment.artifact = activatedArtifact
    increments.set(increment.id, increment)
    activationIntents.delete(intent.id)
  }

  async function restartCandidateEligibilityError(
    candidate: PersonaTrainingRestartCandidate,
  ) {
    try {
      const snapshot = await input.datasetRuntime.getSnapshot({
        cardId: candidate.run.cardId,
      })
      const dataset = snapshot.versions.find(version =>
        version.id === candidate.run.datasetId
        && version.cardId === candidate.run.cardId,
      )
      if (
        !dataset
        || snapshot.activeVersionId !== dataset.id
        || dataset.activeAt == null
        || dataset.rolledBackAt != null
        || !dataset.consentSnapshot.granted
      ) {
        return 'the trained dataset is no longer active and consented'
      }

      const examples = snapshot.examples.filter(example =>
        example.cardId === candidate.run.cardId
        && example.datasetId === dataset.id,
      )
      const currentManifest = buildPersonaTrainingDatasetManifest({
        dataset,
        examples,
        exportedAt: candidate.run.finishedAt ?? candidate.run.updatedAt,
      })
      if (
        currentManifest.exampleCount === 0
        || currentManifest.manifestHash !== candidate.run.manifestHash
      ) {
        return 'the trained manifest no longer matches the current eligible dataset'
      }

      const persistedSourceIds = [...new Set(candidate.run.sourceIds)].sort()
      const currentSourceIds = [...new Set(
        currentManifest.examples.map(example => example.sourceId),
      )].sort()
      if (
        persistedSourceIds.length === 0
        || persistedSourceIds.length !== currentSourceIds.length
        || persistedSourceIds.some((sourceId, index) => sourceId !== currentSourceIds[index])
      ) {
        return 'the trained sources are no longer staged, consented, PII-clear, and provenance-backed'
      }
      return null
    }
    catch (error) {
      return `the trained dataset could not be revalidated: ${errorMessageFrom(error) ?? String(error)}`
    }
  }

  async function reconcileRestartCandidate(candidate: PersonaTrainingRestartCandidate) {
    const increment = candidate.increment
    if (!increment || candidate.consistencyError || !candidate.run.artifact) {
      if (increment) {
        const cleaned = await cleanupRestartCandidate({
          candidate,
          artifact: increment.artifact,
          reason: `application-restarted-with-inconsistent-training-completion${candidate.consistencyError ? `: ${candidate.consistencyError}` : ''}`,
        })
        return {
          interruptedRuns: cleaned ? 1 : 0,
          rolledBackIncrements: cleaned ? 1 : 0,
        }
      }
      const interrupted = await interruptRestartedRun(
        candidate.run,
        `application-restarted-with-inconsistent-training-completion${candidate.consistencyError ? `: ${candidate.consistencyError}` : ''}`,
      )
      return {
        interruptedRuns: interrupted ? 1 : 0,
        rolledBackIncrements: 0,
      }
    }

    const artifact = candidate.run.artifact
    const eligibilityError = await restartCandidateEligibilityError(candidate)
    if (eligibilityError) {
      const reason = `application-restarted-with-ineligible-training-dataset: ${eligibilityError}`
      const cleaned = await cleanupRestartCandidate({
        candidate,
        artifact,
        reason,
        initialStage: artifact.activation.status === 'active' ? 'unload' : 'discard',
      })
      return {
        interruptedRuns: cleaned ? 1 : 0,
        rolledBackIncrements: cleaned ? 1 : 0,
      }
    }

    try {
      await input.artifactLifecycle?.validateArtifact(artifact)
    }
    catch (error) {
      const reason = `application-restarted-with-invalid-training-artifact: ${errorMessageFrom(error) ?? String(error)}`
      const cleaned = await cleanupRestartCandidate({
        candidate,
        artifact,
        reason,
        initialStage: artifact.activation.status === 'active' ? 'unload' : 'discard',
      })
      return {
        interruptedRuns: cleaned ? 1 : 0,
        rolledBackIncrements: cleaned ? 1 : 0,
      }
    }

    if (artifact.activation.status !== 'active')
      return { interruptedRuns: 0, rolledBackIncrements: 0 }

    const reloadCandidate = restartInactiveArtifact(
      artifact,
      'The previous loader receipt expired; a fresh receipt is required after restart.',
    )
    if (!input.artifactLoader) {
      const reason = 'persona training artifact loader is unavailable for restart activation'
      try {
        await persistRestartArtifact({
          candidate,
          expectedArtifact: artifact,
          artifact: reloadCandidate,
        })
      }
      catch {
        return { interruptedRuns: 0, rolledBackIncrements: 0 }
      }
      const cleaned = await cleanupRestartCandidate({
        candidate,
        artifact: reloadCandidate,
        reason,
        initialStage: 'discard',
      })
      return {
        interruptedRuns: cleaned ? 1 : 0,
        rolledBackIncrements: cleaned ? 1 : 0,
      }
    }

    let activationIntent = await beginArtifactActivation({
      mode: 'restart',
      cardId: candidate.run.cardId,
      runId: candidate.run.runId,
      incrementId: increment.id,
      artifact: reloadCandidate,
      expectedArtifact: artifact,
      now: input.now(),
    })
    let loaded: Awaited<ReturnType<typeof loadArtifactActivation>>
    try {
      loaded = await loadArtifactActivation(
        activationIntent,
        new AbortController().signal,
        artifactRecoveryTimeoutMs,
      )
      activationIntent = loaded.intent
    }
    catch {
      return { interruptedRuns: 0, rolledBackIncrements: 0 }
    }

    if (loaded.activationError) {
      const reason = `application-restarted-with-invalid-training-artifact: ${loaded.activationError.message}`
      await handoffArtifactActivationToCleanup({
        intent: activationIntent,
        reason,
        transition: restartRollbackTransition(increment, reason),
      })
      const cleaned = await cleanupRestartCandidate({
        candidate,
        artifact: activationIntent.artifact,
        reason,
        initialStage: 'unload',
        loaderReceipt: activationIntent.loaderReceipt,
      })
      return {
        interruptedRuns: cleaned ? 1 : 0,
        rolledBackIncrements: cleaned ? 1 : 0,
      }
    }

    try {
      await completeRestartActivation(activationIntent, candidate)
      return { interruptedRuns: 0, rolledBackIncrements: 0 }
    }
    catch (error) {
      const reason = `application-restarted-with-invalid-training-artifact: ${errorMessageFrom(error) ?? String(error)}`
      await handoffArtifactActivationToCleanup({
        intent: activationIntent,
        reason,
        transition: restartRollbackTransition(increment, reason),
      })
      const cleaned = await cleanupRestartCandidate({
        candidate,
        artifact: activationIntent.activatedArtifact ?? activationIntent.artifact,
        reason,
        initialStage: 'unload',
        loaderReceipt: activationIntent.loaderReceipt,
      })
      return {
        interruptedRuns: cleaned ? 1 : 0,
        rolledBackIncrements: cleaned ? 1 : 0,
      }
    }
  }

  async function reconcileAfterRestart(reconcileInput: {
    cardId?: string | null
    reason: string
  }) {
    try {
      await hydratePersistedIncrements()
    }
    catch {
      // Restart candidates are parsed independently so malformed legacy rows
      // cannot prevent unrelated cleanup and stale-run recovery.
    }
    let interruptedRuns = 0
    let rolledBackIncrements = 0

    const pendingActivations = await persistence.listArtifactActivationIntents?.({
      cardId: reconcileInput.cardId,
      status: 'pending',
    }) ?? []
    for (const intent of pendingActivations)
      activationIntents.set(intent.id, intent)
    for (const persistedIntent of pendingActivations.filter(intent => intent.mode === 'initial')) {
      let intent = persistedIntent
      try {
        const loaded = await loadArtifactActivation(
          intent,
          new AbortController().signal,
          artifactRecoveryTimeoutMs,
        )
        intent = loaded.intent
        const reason = loaded.activationError
          ? `application-restarted-with-invalid-training-artifact: ${loaded.activationError.message}`
          : 'application-restarted-before-initial-artifact-activation-committed'
        await handoffArtifactActivationToCleanup({
          intent,
          reason,
        })
        await discardArtifactWithRecovery({
          artifact: intent.activatedArtifact ?? intent.artifact,
          cardId: intent.cardId,
          runId: intent.runId,
          incrementId: null,
          reason,
          now: input.now(),
          initialStage: 'unload',
          loaderReceipt: intent.loaderReceipt,
        })
      }
      catch {
        // The pending activation or cleanup intent remains the durable recovery point.
      }
    }

    const pendingIntents = await persistence.listArtifactCleanupIntents?.({
      cardId: reconcileInput.cardId,
      status: 'pending',
    }) ?? []
    for (const intent of pendingIntents) {
      cleanupIntents.set(intent.id, intent)
      const before = intent.incrementId
        ? increments.get(intent.incrementId)?.state
        : null
      try {
        await discardArtifactWithRecovery({
          artifact: intent.artifact,
          cardId: intent.cardId,
          runId: intent.runId,
          incrementId: intent.incrementId,
          reason: intent.reason,
          now: input.now(),
          initialStage: intent.stage === 'finalize' ? undefined : intent.stage,
          loaderReceipt: intent.loaderReceipt,
        })
      }
      catch {
        continue
      }
      if (before === 'available' && intent.finalizeIncrementState)
        rolledBackIncrements += 1
    }

    const staleRuns = await persistence.listRestartRuns?.({
      cardId: reconcileInput.cardId,
    }) ?? []
    for (const run of staleRuns) {
      if (await interruptRestartedRun(run, reconcileInput.reason))
        interruptedRuns += 1
    }

    const candidates = await persistence.listRestartCandidates?.({
      cardId: reconcileInput.cardId,
    }) ?? []
    for (const candidate of candidates) {
      const result = await reconcileRestartCandidate(candidate)
      interruptedRuns += result.interruptedRuns
      rolledBackIncrements += result.rolledBackIncrements
    }

    const orphanIncrements = await persistence.listRestartOrphanIncrements?.({
      cardId: reconcileInput.cardId,
    }) ?? []
    for (const increment of orphanIncrements) {
      increments.set(increment.id, increment)
      try {
        await discardArtifactWithRecovery({
          artifact: increment.artifact,
          cardId: increment.cardId,
          runId: increment.artifact.runId,
          incrementId: increment.id,
          reason: 'application-restarted-with-inconsistent-training-increment',
          now: input.now(),
          transition: restartRollbackTransition(
            increment,
            'application-restarted-with-inconsistent-training-increment',
          ),
        })
        rolledBackIncrements += 1
      }
      catch {
        // The pending cleanup intent is the durable recovery point.
      }
    }

    if (input.artifactLifecycle?.reconcileArtifacts) {
      let availableArtifacts: AlicizationPersonaTrainingArtifact[] = []
      try {
        availableArtifacts = (await persistence.listIncrements())
          .filter(increment =>
            increment.state === 'available'
            && (!reconcileInput.cardId || increment.cardId === reconcileInput.cardId),
          )
          .map(increment => increment.artifact)
      }
      catch {
        availableArtifacts = candidates
          .flatMap(candidate => candidate.increment?.state === 'available'
            ? [candidate.increment.artifact]
            : [])
      }
      await input.artifactLifecycle.reconcileArtifacts({
        availableArtifacts,
        onOrphanCleanupFailure: async ({ artifact, error }) => {
          const cardId = reconcileInput.cardId?.trim() || input.defaultCardId?.trim()
          if (!cardId)
            throw new Error('persona training orphan cleanup recovery requires cardId')
          const id = personaTrainingArtifactCleanupIntentId({
            cardId,
            runId: artifact.runId,
            incrementId: null,
            artifactId: artifact.artifactId,
          })
          const at = input.now()
          const intent = {
            id,
            unloadOperationId: personaTrainingArtifactCleanupOperationId(id, 'unload'),
            cardId,
            runId: artifact.runId,
            incrementId: null,
            artifact,
            loaderReceipt: personaTrainingArtifactLoaderReceiptFromArtifact(artifact),
            reason: 'startup-orphan-artifact',
            stage: artifact.activation.status === 'active' ? 'unload' : 'discard',
            finalizeIncrementState: null,
            status: 'pending',
            attempts: 1,
            lastError: errorMessageFrom(error) ?? String(error),
            createdAt: at,
            updatedAt: at,
          } satisfies PersonaTrainingArtifactCleanupIntent
          cleanupIntents.set(intent.id, intent)
          await persistence.recordArtifactCleanupIntent?.(intent)
        },
      })
    }

    return {
      interruptedRuns,
      rolledBackIncrements,
    }
  }

  async function resumePendingArtifactCleanups(inputData: {
    cardId: string
    reason: 'source-revoked' | 'dataset-rolled-back'
  }) {
    const errors: unknown[] = []
    const pending = [...cleanupIntents.values()]
      .filter(intent =>
        intent.status === 'pending'
        && intent.cardId === inputData.cardId
        && intent.reason === inputData.reason,
      )
    for (const intent of pending) {
      try {
        await discardArtifactWithRecovery({
          artifact: intent.artifact,
          cardId: intent.cardId,
          runId: intent.runId,
          incrementId: intent.incrementId,
          reason: intent.reason,
          now: input.now(),
          loaderReceipt: intent.loaderReceipt,
        })
      }
      catch (error) {
        errors.push(error)
      }
    }
    if (errors.length > 0)
      throwCleanupErrors(errors, 'persona training artifact cleanup recovery failed')
  }

  function buildDatasetGovernanceCleanupIntents(inputData: {
    increments: PersonaTrainingPipelineIncrement[]
    reason: 'dataset-rolled-back' | 'source-revoked'
    state: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'>
    at: number
  }) {
    return inputData.increments.map(increment => buildArtifactCleanupIntent({
      artifact: increment.artifact,
      cardId: increment.cardId,
      runId: increment.artifact.runId,
      incrementId: increment.id,
      reason: inputData.reason,
      now: inputData.at,
      finalizeIncrementState: inputData.state,
    }))
  }

  function registerPersistedGovernanceCleanupIntents(
    intents: PersonaTrainingArtifactCleanupIntent[],
  ) {
    for (const intent of intents) {
      cleanupIntents.set(intent.id, intent)
      if (!intent.incrementId)
        continue
      const increment = increments.get(intent.incrementId)
      if (!increment)
        continue
      increment.cleanup = {
        status: 'pending',
        stage: intent.stage,
        lastError: intent.lastError,
      }
    }
  }

  async function activateVersion(activationInput: { cardId: string, datasetId: string }) {
    const cardId = normalizeCardId(activationInput.cardId)
    await resumePendingArtifactCleanups({
      cardId,
      reason: 'dataset-rolled-back',
    })
    await hydratePersistedIncrements()
    const previousAvailable = [...increments.values()]
      .filter(increment => increment.cardId === cardId && increment.state === 'available')
    if (
      persistence.commitDatasetGovernanceWithArtifactCleanup
      && input.datasetRuntime.assertVersionActivatable
    ) {
      const dataset = await input.datasetRuntime.assertVersionActivatable({
        cardId,
        datasetId: activationInput.datasetId,
      })
      const at = input.now()
      const cleanupCandidates = previousAvailable
        .filter(increment => increment.datasetId !== dataset.id)
      const cleanupIntentsToPersist = buildDatasetGovernanceCleanupIntents({
        increments: cleanupCandidates,
        reason: 'dataset-rolled-back',
        state: 'rolled-back',
        at,
      })
      const committed = await persistence.commitDatasetGovernanceWithArtifactCleanup({
        kind: 'activate-version',
        cardId,
        dataset,
        at,
        cleanupIntents: cleanupIntentsToPersist,
      })
      if (committed.kind !== 'activate-version')
        throw new Error('persona training dataset activation persistence returned the wrong governance result')
      registerPersistedGovernanceCleanupIntents(cleanupIntentsToPersist)
      await invalidateRuns({
        cardId,
        reason: 'dataset-rolled-back',
        now: at,
      })
      await markIncrements({
        cardId,
        state: 'rolled-back',
        excludeDatasetId: committed.dataset.id,
        now: at,
      })
      return committed.dataset
    }
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
    await resumePendingArtifactCleanups({
      cardId,
      reason: 'dataset-rolled-back',
    })
    await hydratePersistedIncrements()
    const previousAvailable = [...increments.values()]
      .filter(increment => increment.cardId === cardId && increment.state === 'available')
    if (
      persistence.commitDatasetGovernanceWithArtifactCleanup
      && input.datasetRuntime.assertVersionActivatable
    ) {
      const dataset = await input.datasetRuntime.assertVersionActivatable({
        cardId,
        datasetId: rollbackInput.datasetId,
      })
      const at = input.now()
      const cleanupCandidates = previousAvailable
        .filter(increment => increment.datasetId !== dataset.id)
      const cleanupIntentsToPersist = buildDatasetGovernanceCleanupIntents({
        increments: cleanupCandidates,
        reason: 'dataset-rolled-back',
        state: 'rolled-back',
        at,
      })
      const committed = await persistence.commitDatasetGovernanceWithArtifactCleanup({
        kind: 'rollback-version',
        cardId,
        dataset,
        at,
        cleanupIntents: cleanupIntentsToPersist,
      })
      if (committed.kind !== 'rollback-version')
        throw new Error('persona training dataset rollback persistence returned the wrong governance result')
      registerPersistedGovernanceCleanupIntents(cleanupIntentsToPersist)
      await invalidateRuns({
        cardId,
        reason: 'dataset-rolled-back',
        now: at,
      })
      await markIncrements({
        cardId,
        state: 'rolled-back',
        excludeDatasetId: committed.dataset.id,
        now: at,
      })
      return committed.dataset
    }
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
    await resumePendingArtifactCleanups({
      cardId,
      reason: 'source-revoked',
    })
    await hydratePersistedIncrements()
    const previousAvailable = [...increments.values()]
      .filter(increment => increment.cardId === cardId
        && increment.state === 'available'
        && increment.sourceIds.includes(sourceId))
    if (persistence.commitDatasetGovernanceWithArtifactCleanup) {
      const at = input.now()
      const cleanupIntentsToPersist = buildDatasetGovernanceCleanupIntents({
        increments: previousAvailable,
        reason: 'source-revoked',
        state: 'revoked',
        at,
      })
      const committed = await persistence.commitDatasetGovernanceWithArtifactCleanup({
        kind: 'revoke-source',
        cardId,
        sourceId,
        at,
        cleanupIntents: cleanupIntentsToPersist,
      })
      if (committed.kind !== 'revoke-source')
        throw new Error('persona training source revoke persistence returned the wrong governance result')
      registerPersistedGovernanceCleanupIntents(cleanupIntentsToPersist)
      await invalidateRuns({
        cardId,
        sourceId,
        reason: 'source-revoked',
        now: at,
      })
      await markIncrements({
        cardId,
        sourceId,
        state: 'revoked',
        now: at,
      })
      return { affected: committed.affected }
    }
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
    return await enqueueIncrementMutation(rollbackInput.incrementId, async () => {
      await hydratePersistedIncrements()
      const increment = increments.get(rollbackInput.incrementId)
      if (!increment)
        return null
      if (rollbackInput.cardId && increment.cardId !== normalizeCardId(rollbackInput.cardId))
        return null
      const pendingCleanup = cleanupIntents.get(artifactCleanupIntentId({
        cardId: increment.cardId,
        incrementId: increment.id,
        artifact: increment.artifact,
      }))
      if (increment.state === 'available' || pendingCleanup?.status === 'pending') {
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
        await discardArtifactWithRecovery({
          artifact: increment.artifact,
          cardId: increment.cardId,
          incrementId: increment.id,
          reason: 'manual-rollback',
          now: input.now(),
          transition: {
            increment,
            state: 'rolled-back',
            event,
          },
        })
      }
      return { ...increment }
    })
  }

  function listIncrements() {
    return [...increments.values()].map(increment => ({ ...increment }))
  }

  function listUsableIncrements() {
    const pendingCleanupIncrementIds = new Set(
      [...cleanupIntents.values()]
        .filter(intent => intent.status === 'pending')
        .map(intent => intent.incrementId),
    )
    const pendingActivationIncrementIds = new Set(
      [...activationIntents.values()]
        .filter(intent => intent.status === 'pending')
        .map(intent => intent.incrementId),
    )
    return listIncrements().filter(increment =>
      increment.state === 'available'
      && !pendingCleanupIncrementIds.has(increment.id)
      && !pendingActivationIncrementIds.has(increment.id),
    )
  }

  async function listPersistedIncrements() {
    const persisted = await persistence.listIncrements()
    return persisted.map(increment => ({ ...increment, sourceIds: [...increment.sourceIds] }))
  }

  return {
    reconcileAfterRestart,
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
