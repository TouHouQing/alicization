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
  artifact: unknown
}

export interface PersonaTrainingExecutorConfigSnapshot {
  executable: string
  fixedArguments: string[]
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
  artifact: unknown
  state: PersonaTrainingPipelineIncrementState
  createdAt: number
}

export type PersonaTrainingPipelineRunStatus
  = 'queued'
    | 'running'
    | 'cancel_requested'
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
  artifact: unknown | null
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
  updateRun: (input: Partial<PersonaTrainingPipelineRunRecord> & Pick<PersonaTrainingPipelineRunRecord, 'runId'>) => Promise<void>
  createIncrement: (increment: PersonaTrainingPipelineIncrement) => Promise<void>
  updateIncrementState: (input: {
    incrementId: string
    state: PersonaTrainingPipelineIncrementState
  }) => Promise<void>
  appendEvent: (event: PersonaTrainingPipelineAuditEvent) => Promise<void>
  listIncrements: () => Promise<PersonaTrainingPipelineIncrement[]>
  getRun?: (runId: string) => Promise<PersonaTrainingPipelineRunRecord | null>
  listRuns?: (input: { cardId: string, limit?: number }) => Promise<PersonaTrainingPipelineRunRecord[]>
  interruptNonTerminalRuns?: (input: { cardId?: string | null, reason: string, at: number }) => Promise<number>
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
  terminalEventRecorded: boolean
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
    updateRun: async () => {},
    createIncrement: async () => {},
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

  async function persistRunUpdate(
    run: ActiveTrainingRun,
    update: Partial<PersonaTrainingPipelineRunRecord>,
  ) {
    Object.assign(run.record, update)
    await persistence.updateRun({
      runId: run.runId,
      ...update,
    })
  }

  async function hydratePersistedIncrements() {
    const persisted = await persistence.listIncrements()
    for (const increment of persisted) {
      if (!increments.has(increment.id)) {
        increments.set(increment.id, {
          ...increment,
          sourceIds: [...increment.sourceIds],
        })
      }
    }
  }

  async function updateRunTerminalState(input: {
    run: ActiveTrainingRun
    status: PersonaTrainingPipelineRunStatus
    error: string | null
    action: PersonaTrainingPipelineAuditAction
    reason: string | null
    finishedAt: number
    incrementId?: string | null
    failureReason?: PersonaTrainingPipelineFailureReason | null
    artifact?: unknown | null
  }) {
    await persistRunUpdate(input.run, {
      status: input.status,
      error: input.error,
      failureReason: input.failureReason ?? null,
      artifact: input.artifact,
      progress: input.status === 'completed' ? 1 : input.run.record.progress,
      stage: 'finalizing',
      updatedAt: input.finishedAt,
      finishedAt: input.finishedAt,
    })
    if (!input.run.terminalEventRecorded) {
      await appendAuditEvent({
        action: input.action,
        runId: input.run.runId,
        incrementId: input.incrementId ?? null,
        cardId: input.run.cardId,
        datasetId: input.run.datasetId,
        manifestHash: input.run.manifestHash ?? null,
        sourceIds: [...input.run.sourceIds],
        reason: input.reason,
        createdAt: input.finishedAt,
      })
      input.run.terminalEventRecorded = true
    }
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
      if (input.sourceId && run.datasetId) {
        await appendAuditEvent({
          action: 'training-increment-revoked',
          runId: run.runId,
          incrementId: null,
          cardId: run.cardId,
          datasetId: run.datasetId,
          manifestHash: run.manifestHash ?? null,
          sourceIds: [...run.sourceIds],
          reason: input.reason,
          createdAt: input.now,
        })
      }
    }
  }

  async function markIncrements(input: {
    cardId: string
    state: Extract<PersonaTrainingPipelineIncrementState, 'rolled-back' | 'revoked'>
    datasetId?: string
    excludeDatasetId?: string
    sourceId?: string
    now: number
  }) {
    await hydratePersistedIncrements()
    for (const increment of increments.values()) {
      if (increment.cardId !== input.cardId)
        continue
      if (input.datasetId && increment.datasetId !== input.datasetId)
        continue
      if (input.excludeDatasetId && increment.datasetId === input.excludeDatasetId)
        continue
      if (input.sourceId && !increment.sourceIds.includes(input.sourceId))
        continue
      const previousState = increment.state
      if (increment.state === 'available') {
        increment.state = input.state
        await persistence.updateIncrementState({
          incrementId: increment.id,
          state: increment.state,
        })
      }
      if (previousState !== 'revoked' && input.state === 'revoked') {
        await appendAuditEvent({
          action: 'training-increment-revoked',
          runId: null,
          incrementId: increment.id,
          cardId: increment.cardId,
          datasetId: increment.datasetId,
          manifestHash: increment.manifestHash,
          sourceIds: [...increment.sourceIds],
          reason: input.sourceId ? 'source-revoked' : 'dataset-rolled-back',
          createdAt: input.now,
        })
      }
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
      await persistRunUpdate(run, {
        status: 'running',
        stage: 'writing-input',
        startedAt,
        updatedAt: startedAt,
      })
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

      const trained = await input.trainingExecutor({
        runId: run.runId,
        cardId: run.cardId,
        datasetId: approved.dataset.id,
        manifest: approved.manifest,
        basePersonaRevision,
        configSnapshot: run.record.configSnapshot
          ? {
              ...run.record.configSnapshot,
              fixedArguments: [...run.record.configSnapshot.fixedArguments],
            }
          : null,
        signal: run.controller.signal,
        assertCurrent,
        onProgress: async (progress) => {
          if (run.terminalEventRecorded)
            return
          const normalizedProgress = Math.max(0, Math.min(0.99, Number(progress.progress) || 0))
          await persistRunUpdate(run, {
            stage: progress.stage,
            progress: Math.max(run.record.progress, normalizedProgress),
            progressMessage: progress.message?.trim() || null,
            updatedAt: input.now(),
          })
        },
      })

      await assertCurrent()
      await persistRunUpdate(run, {
        stage: 'finalizing',
        progress: Math.max(run.record.progress, 0.99),
        progressMessage: null,
        updatedAt: input.now(),
      })
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
      increments.set(increment.id, increment)
      await persistence.createIncrement(increment)
      try {
        await assertCurrent()
      }
      catch (error) {
        increment.state = run.invalidatedReason === 'source-revoked'
          ? 'revoked'
          : 'rolled-back'
        await persistence.updateIncrementState({
          incrementId: increment.id,
          state: increment.state,
        })
        throw error
      }
      await updateRunTerminalState({
        run,
        status: 'completed',
        error: null,
        action: 'training-completed',
        reason: null,
        incrementId: increment.id,
        artifact: trained.artifact,
        finishedAt: input.now(),
      })
      return {
        status: 'succeeded',
        runId: run.runId,
        increment,
      }
    }
    catch (error) {
      const reason = run.invalidatedReason
        ?? (error instanceof PersonaTrainingPipelineGateError ? error.reason : 'executor-failed')
      const message = errorMessageFrom(error) ?? String(error)
      const status: PersonaTrainingPipelineRunStatus = reason === 'cancelled'
        ? 'cancelled'
        : reason === 'interrupted'
          ? 'interrupted'
          : 'failed'
      if (!run.terminalEventRecorded) {
        await updateRunTerminalState({
          run,
          status,
          error: reason === 'cancelled' || reason === 'interrupted'
            ? (run.cancellationReason ?? message)
            : message,
          action: reason === 'cancelled'
            ? 'training-cancelled'
            : reason === 'interrupted'
              ? 'training-interrupted'
              : 'training-failed',
          reason: reason === 'cancelled' || reason === 'interrupted'
            ? (run.cancellationReason ?? reason)
            : reason,
          failureReason: reason,
          finishedAt: input.now(),
        })
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
      ? {
          ...rawConfig,
          fixedArguments: [...rawConfig.fixedArguments],
        }
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
      terminalEventRecorded: false,
      record: {
        ...record,
        sourceIds: [...record.sourceIds],
        configSnapshot: record.configSnapshot
          ? { ...record.configSnapshot, fixedArguments: [...record.configSnapshot.fixedArguments] }
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
          ? { ...record.configSnapshot, fixedArguments: [...record.configSnapshot.fixedArguments] }
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
        ? { ...persisted.configSnapshot, fixedArguments: [...persisted.configSnapshot.fixedArguments] }
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
          ? { ...run.configSnapshot, fixedArguments: [...run.configSnapshot.fixedArguments] }
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
    if (!isNonTerminalRunStatus(run.record.status)) {
      return {
        ...run.record,
        sourceIds: [...run.record.sourceIds],
        configSnapshot: run.record.configSnapshot
          ? { ...run.record.configSnapshot, fixedArguments: [...run.record.configSnapshot.fixedArguments] }
          : null,
      }
    }
    const reason = cancelInput.reason?.trim() || 'cancelled'
    run.invalidatedReason = 'cancelled'
    run.cancellationReason = reason
    const requestedAt = input.now()
    await persistRunUpdate(run, {
      status: 'cancel_requested',
      error: reason,
      failureReason: 'cancelled',
      cancellationRequestedAt: requestedAt,
      updatedAt: requestedAt,
    })
    run.controller.abort(reason)
    return { ...run.record, sourceIds: [...run.record.sourceIds] }
  }

  async function stop(reasonRaw: string) {
    const reason = reasonRaw.trim() || 'runtime-stopped'
    const completions: Promise<PersonaTrainingPipelineResult>[] = []
    for (const run of activeRuns.values()) {
      if (!isNonTerminalRunStatus(run.record.status)) {
        completions.push(run.completion)
        continue
      }
      run.invalidatedReason = 'interrupted'
      run.cancellationReason = reason
      if (!run.terminalEventRecorded) {
        await updateRunTerminalState({
          run,
          status: 'interrupted',
          error: reason,
          action: 'training-interrupted',
          reason,
          failureReason: 'interrupted',
          finishedAt: input.now(),
        })
      }
      run.controller.abort(reason)
      completions.push(run.completion)
    }
    await Promise.allSettled(completions)
  }

  async function activateVersion(activationInput: { cardId: string, datasetId: string }) {
    const cardId = normalizeCardId(activationInput.cardId)
    await invalidateRuns({
      cardId,
      reason: 'dataset-rolled-back',
      now: input.now(),
    })
    const activated = await input.datasetRuntime.activateVersion({
      cardId,
      datasetId: activationInput.datasetId,
    })
    if (activated) {
      await markIncrements({
        cardId,
        state: 'rolled-back',
        excludeDatasetId: activated.id,
        now: input.now(),
      })
    }
    return activated
  }

  async function rollbackVersion(rollbackInput: { cardId: string, datasetId: string }) {
    const cardId = normalizeCardId(rollbackInput.cardId)
    await invalidateRuns({
      cardId,
      reason: 'dataset-rolled-back',
      now: input.now(),
    })
    const rolledBack = await input.datasetRuntime.rollbackVersion({
      cardId,
      datasetId: rollbackInput.datasetId,
    })
    if (rolledBack) {
      await markIncrements({
        cardId,
        state: 'rolled-back',
        excludeDatasetId: rolledBack.id,
        now: input.now(),
      })
    }
    return rolledBack
  }

  async function revokeSource(revokeInput: { cardId: string, sourceId: string }) {
    const cardId = normalizeCardId(revokeInput.cardId)
    const sourceId = revokeInput.sourceId.trim()
    if (!sourceId)
      throw new Error('persona training pipeline source revoke requires sourceId')
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
    await markIncrements({
      cardId,
      sourceId,
      state: 'revoked',
      now: input.now(),
    })
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
      increment.state = 'rolled-back'
      await persistence.updateIncrementState({
        incrementId: increment.id,
        state: increment.state,
      })
      await appendAuditEvent({
        action: 'training-increment-rolled-back',
        runId: null,
        incrementId: increment.id,
        cardId: increment.cardId,
        datasetId: increment.datasetId,
        manifestHash: increment.manifestHash,
        sourceIds: [...increment.sourceIds],
        reason: 'manual-rollback',
        createdAt: input.now(),
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
