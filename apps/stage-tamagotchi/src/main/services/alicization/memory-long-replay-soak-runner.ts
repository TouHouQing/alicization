import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type {
  MemoryDialogueReplayDatabase,
  MemoryDialogueReplayProviderAdapter,
  MemoryDialogueReplayReport,
  MemoryDialogueReplayStageName,
  MemoryDialogueReplayTurnInput,
  MemoryDialogueReplayTurnReport,
} from './memory-db-dialogue-replay-harness'
import type {
  SimpleRecallGoldEvaluationClass,
  SimpleRecallGoldLabel,
  SimpleRecallGoldReason,
} from './memory-os/simple-recall-gold-labels'
import type { MemoryProductionTrialDialogueReplayResult } from './memory-production-trial-runner'

import { Buffer } from 'node:buffer'

import { errorMessageFrom } from '@moeru/std'

import { serializeWorkingMemoryCheckpoint } from './life-core/working-memory-checkpoint'
import { replayMemoryDialogue } from './memory-db-dialogue-replay-harness'

export const defaultMemoryLongReplaySoakRounds = 16
export const maxMemoryLongReplaySoakRounds = 256

export interface MemoryLongReplaySoakGoldLabel {
  turnId: string
  label?: SimpleRecallGoldLabel
  evaluationClass?: SimpleRecallGoldEvaluationClass
  reason?: SimpleRecallGoldReason | null
  expectedMemoryIds?: string[]
  wrongThreadIds?: string[]
  staleMemoryIds?: string[]
}

export type MemoryLongReplaySoakGoldClassification
  = | 'correct'
    | 'miss'
    | 'wrong'
    | 'wrong-thread'
    | 'stale'
    | 'abstain'

export interface MemoryLongReplaySoakGoldEvaluation {
  classification: MemoryLongReplaySoakGoldClassification
  label: SimpleRecallGoldLabel | null
  evaluationClass: SimpleRecallGoldEvaluationClass | null
  reason: SimpleRecallGoldReason | null
  expectedMemoryIds: string[]
  recalledEvidenceIds: string[]
  wrongThreadIds: string[]
  staleMemoryIds: string[]
}

export interface MemoryLongReplaySoakTurnReport {
  round: number
  turnId: string
  latencyMs: number
  replay: MemoryDialogueReplayTurnReport
  gold: MemoryLongReplaySoakGoldEvaluation | null
}

export interface MemoryLongReplaySoakRestartContext {
  id: string
  cardId: string
  sessionId: string
  round: number
  previousRound: MemoryLongReplaySoakRoundReport | null
  db: MemoryDialogueReplayDatabase
  provider: MemoryDialogueReplayProviderAdapter
}

export interface MemoryLongReplaySoakRestartResult {
  db?: MemoryDialogueReplayDatabase
  provider?: MemoryDialogueReplayProviderAdapter
}

export interface MemoryLongReplaySoakRestartOptions {
  rounds?: number[]
  hook: (
    input: MemoryLongReplaySoakRestartContext,
  ) => Promise<MemoryLongReplaySoakRestartResult | void>
}

export interface MemoryLongReplaySoakFailureInjection {
  providerFailureRounds?: number[]
  providerFailureTurnIds?: string[]
  providerFailureMessage?: string
  restartFailureRounds?: number[]
  restartFailureMessage?: string
}

export interface MemoryLongReplaySoakObserverContext {
  id: string
  cardId: string
  sessionId: string
  round: number
  db: MemoryDialogueReplayDatabase
}

export interface MemoryLongReplaySoakObservers {
  monotonicNow?: () => number
  checkpointSizeBytes?: (input: {
    round: number
    turnId: string
    phase: 'hydration' | 'writeback'
    snapshot: WorkingMemorySnapshot
    serialized: string
  }) => number | Promise<number>
  sqliteSizeBytes?: (
    input: MemoryLongReplaySoakObserverContext & {
      phase: 'before' | 'after'
    },
  ) => number | null | Promise<number | null>
  onError?: (
    error: string,
    input: MemoryLongReplaySoakObserverContext & {
      phase: 'restart' | 'replay' | 'checkpoint-observer' | 'sqlite-observer'
      turnId?: string | null
    },
  ) => void | Promise<void>
}

export interface MemoryLongReplaySoakInput {
  id: string
  cardId: string
  sessionId: string
  userId: string
  createdAt?: number
  turns: MemoryDialogueReplayTurnInput[]
  db: MemoryDialogueReplayDatabase
  provider: MemoryDialogueReplayProviderAdapter
  rounds?: number
  maxRounds?: number
  maxRawTurns?: number
  recallLimit?: number
  goldLabels?: MemoryLongReplaySoakGoldLabel[]
  restart?: MemoryLongReplaySoakRestartOptions
  failureInjection?: MemoryLongReplaySoakFailureInjection
  observers?: MemoryLongReplaySoakObservers
}

export interface MemoryLongReplaySoakRestartReport {
  status: 'not-requested' | 'succeeded' | 'failed'
  error: string | null
}

export interface MemoryLongReplaySoakRoundReport {
  round: number
  status: 'succeeded' | 'failed'
  restart: MemoryLongReplaySoakRestartReport
  latencyMs: {
    p50: number | null
    p95: number | null
    p99: number | null
    sampleCount: number
  }
  dialogueReplay: MemoryDialogueReplayReport | null
  productionTrialReplay: MemoryProductionTrialDialogueReplayResult | null
  turns: MemoryLongReplaySoakTurnReport[]
  error: string | null
}

export interface MemoryLongReplaySoakReport {
  version: 'memory-long-replay-soak-report-v1'
  id: string
  cardId: string
  sessionId: string
  createdAt: number
  passed: boolean
  config: {
    requestedRounds: number
    executedRounds: number
    maxRounds: number
    turnTemplateCount: number
    maxRawTurns: number
    recallLimit: number
    personaWriteback: 'disabled'
  }
  summary: {
    roundCount: number
    succeededRoundCount: number
    failedRoundCount: number
    turnCount: number
    succeededTurnCount: number
    failedTurnCount: number
    recalledEvidenceCount: number
    providerFailureCount: number
    restartAttemptCount: number
    restartFailureCount: number
    duplicateWritebackCount: number
    lastError: string | null
    stageCounts: Record<MemoryDialogueReplayStageName, number>
  }
  gold: {
    sampleCount: number
    correctCount: number
    missCount: number
    wrongCount: number
    wrongThreadCount: number
    staleCount: number
    abstainCount: number
  }
  latencyMs: {
    p50: number | null
    p95: number | null
    p99: number | null
    sampleCount: number
  }
  checkpoint: {
    sampleCount: number
    writeCount: number
    duplicateWritebackCount: number
    initialBytes: number | null
    finalBytes: number | null
    maxBytes: number | null
    growthBytes: number | null
    observerErrorCount: number
  }
  sqlite: {
    sampleCount: number
    initialBytes: number | null
    finalBytes: number | null
    maxBytes: number | null
    growthBytes: number | null
    observerErrorCount: number
  }
  rounds: MemoryLongReplaySoakRoundReport[]
  turns: MemoryLongReplaySoakTurnReport[]
  errors: string[]
}

interface CheckpointObservation {
  bytes: number
  signature: string
}

const replayStageNames: MemoryDialogueReplayStageName[] = [
  'hydration',
  'compression',
  'context-assembly',
  'recall',
  'provider-adapter',
  'commit',
]

function normalizeText(raw: unknown, maxChars: number) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/gu, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
}

function normalizePositiveInteger(
  raw: unknown,
  fallback: number,
  maximum: number,
) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return fallback
  return Math.max(1, Math.min(maximum, Math.floor(value)))
}

function normalizeMetricBytes(raw: unknown) {
  const value = Number(raw)
  return Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : null
}

function uniqueIds(values: unknown[] | null | undefined) {
  const result: string[] = []
  for (const value of values ?? []) {
    const normalized = normalizeText(value, 180)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
  }
  return result
}

function errorText(error: unknown) {
  return errorMessageFrom(error)?.trim()
    || String(error ?? 'unknown memory long replay soak error')
}

function isSelectedRound(rounds: number[] | undefined, round: number) {
  return rounds?.some(value => Math.floor(Number(value)) === round) ?? false
}

function nearestRank(values: number[], percentile: number) {
  const sorted = values
    .filter(Number.isFinite)
    .map(value => Math.max(0, Number(value)))
    .sort((left, right) => left - right)
  if (sorted.length === 0)
    return null
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil(sorted.length * percentile) - 1),
  )
  return sorted[index] ?? null
}

function summarizeLatencies(values: number[]) {
  return {
    p50: nearestRank(values, 0.5),
    p95: nearestRank(values, 0.95),
    p99: nearestRank(values, 0.99),
    sampleCount: values.filter(Number.isFinite).length,
  }
}

function summarizeSizes(values: number[]) {
  const normalized = values.filter(Number.isFinite)
  const initialBytes = normalized[0] ?? null
  const finalBytes = normalized.at(-1) ?? null
  return {
    sampleCount: normalized.length,
    initialBytes,
    finalBytes,
    maxBytes: normalized.length > 0 ? Math.max(...normalized) : null,
    growthBytes: initialBytes === null || finalBytes === null
      ? null
      : finalBytes - initialBytes,
  }
}

function createStageCounts(): Record<MemoryDialogueReplayStageName, number> {
  return Object.fromEntries(
    replayStageNames.map(name => [name, 0]),
  ) as Record<MemoryDialogueReplayStageName, number>
}

function createFailedTurnReport(
  turnId: string,
  error: string,
): MemoryDialogueReplayTurnReport {
  return {
    turnId,
    status: 'failed',
    providerOutput: null,
    providerMessages: [],
    recalledEvidenceIds: [],
    stages: [],
    writeback: {
      checkpoint: 'skipped',
      persona: 'skipped',
    },
    error,
  }
}

function buildDialogueReplayReport(input: {
  id: string
  createdAt: number
  turns: MemoryDialogueReplayTurnReport[]
}): MemoryDialogueReplayReport {
  const succeededTurnCount = input.turns.filter(turn => turn.status === 'succeeded').length
  const failedTurnCount = input.turns.length - succeededTurnCount
  const checkpointWriteCount = input.turns.filter(
    turn => turn.writeback.checkpoint === 'written',
  ).length
  const personaWriteCount = input.turns.filter(
    turn => turn.writeback.persona === 'written',
  ).length
  const recalledEvidenceCount = input.turns.reduce(
    (sum, turn) => sum + turn.recalledEvidenceIds.length,
    0,
  )

  return {
    version: 'memory-db-dialogue-replay-report-v1',
    id: input.id,
    passed: input.turns.length > 0 && failedTurnCount === 0,
    createdAt: input.createdAt,
    summary: {
      turnCount: input.turns.length,
      succeededTurnCount,
      failedTurnCount,
      checkpointWriteCount,
      personaWriteCount,
      recalledEvidenceCount,
      lastError: [...input.turns].reverse().find(turn => turn.error)?.error ?? null,
    },
    turns: input.turns,
  }
}

function evaluationClassForLabel(
  label: MemoryLongReplaySoakGoldLabel,
): SimpleRecallGoldEvaluationClass | null {
  if (label.evaluationClass)
    return label.evaluationClass
  if (label.label === 'right')
    return 'correct-recall'
  if (label.label === 'missing')
    return 'missed-recall'
  if (label.label === 'wrong')
    return 'false-recall'
  if (label.label === 'unwanted')
    return 'should-abstain'
  return null
}

function overlaps(left: string[], right: string[]) {
  const rightIds = new Set(right)
  return left.some(id => rightIds.has(id))
}

function evaluateGold(input: {
  label: MemoryLongReplaySoakGoldLabel
  recalledEvidenceIds: string[]
}): MemoryLongReplaySoakGoldEvaluation {
  const expectedMemoryIds = uniqueIds(input.label.expectedMemoryIds)
  const recalledEvidenceIds = uniqueIds(input.recalledEvidenceIds)
  const wrongThreadIds = uniqueIds(input.label.wrongThreadIds)
  const staleMemoryIds = uniqueIds(input.label.staleMemoryIds)
  const evaluationClass = evaluationClassForLabel(input.label)
  const expectedHit = overlaps(recalledEvidenceIds, expectedMemoryIds)
  const wrongThreadHit = overlaps(recalledEvidenceIds, wrongThreadIds)
    || (
      input.label.reason === 'wrong-thread'
      && wrongThreadIds.length === 0
      && recalledEvidenceIds.length > 0
    )
  const staleHit = overlaps(recalledEvidenceIds, staleMemoryIds)
    || (
      input.label.reason === 'expired'
      && staleMemoryIds.length === 0
      && recalledEvidenceIds.length > 0
    )
  const shouldAbstain = evaluationClass === 'should-abstain'
    || input.label.reason === 'should-abstain'
    || input.label.reason === 'not-needed'
  const shouldCountAsMiss = expectedMemoryIds.length > 0
    ? !expectedHit
    : evaluationClass === 'missed-recall'

  let classification: MemoryLongReplaySoakGoldClassification = 'correct'
  if (wrongThreadHit) {
    classification = 'wrong-thread'
  }
  else if (staleHit) {
    classification = 'stale'
  }
  else if (shouldAbstain) {
    classification = recalledEvidenceIds.length === 0 ? 'abstain' : 'wrong'
  }
  else if (shouldCountAsMiss) {
    classification = 'miss'
  }
  else if (
    evaluationClass === 'false-recall'
    && recalledEvidenceIds.length > 0
  ) {
    classification = 'wrong'
  }

  return {
    classification,
    label: input.label.label ?? null,
    evaluationClass,
    reason: input.label.reason ?? null,
    expectedMemoryIds,
    recalledEvidenceIds,
    wrongThreadIds,
    staleMemoryIds,
  }
}

function buildGoldSummary(
  turns: MemoryLongReplaySoakTurnReport[],
): MemoryLongReplaySoakReport['gold'] {
  const classifications = turns
    .map(turn => turn.gold?.classification)
    .filter((classification): classification is MemoryLongReplaySoakGoldClassification =>
      Boolean(classification),
    )
  return {
    sampleCount: classifications.length,
    correctCount: classifications.filter(value => value === 'correct').length,
    missCount: classifications.filter(value => value === 'miss').length,
    wrongCount: classifications.filter(value => value === 'wrong').length,
    wrongThreadCount: classifications.filter(value => value === 'wrong-thread').length,
    staleCount: classifications.filter(value => value === 'stale').length,
    abstainCount: classifications.filter(value => value === 'abstain').length,
  }
}

export async function runMemoryLongReplaySoak(
  input: MemoryLongReplaySoakInput,
): Promise<MemoryLongReplaySoakReport> {
  const id = normalizeText(input.id, 180) || 'memory-long-replay-soak'
  const cardId = normalizeText(input.cardId, 120) || 'default'
  const sessionId = normalizeText(input.sessionId, 180) || 'memory-long-replay-soak'
  const userId = normalizeText(input.userId, 180) || 'local-user'
  const createdAt = Number.isFinite(input.createdAt)
    ? Math.max(0, Math.floor(Number(input.createdAt)))
    : Date.now()
  const maxRounds = normalizePositiveInteger(
    input.maxRounds,
    maxMemoryLongReplaySoakRounds,
    maxMemoryLongReplaySoakRounds,
  )
  const requestedRounds = normalizePositiveInteger(
    input.rounds,
    defaultMemoryLongReplaySoakRounds,
    maxMemoryLongReplaySoakRounds,
  )
  const executedRounds = Math.min(requestedRounds, maxRounds)
  const maxRawTurns = normalizePositiveInteger(input.maxRawTurns, 6, 128)
  const recallLimit = normalizePositiveInteger(input.recallLimit, 5, 128)
  const monotonicNow = input.observers?.monotonicNow
    ?? (() => globalThis.performance.now())
  const goldByTurnId = new Map(
    (input.goldLabels ?? [])
      .map(label => [normalizeText(label.turnId, 180), label] as const)
      .filter(([turnId]) => Boolean(turnId)),
  )
  const rounds: MemoryLongReplaySoakRoundReport[] = []
  const turns: MemoryLongReplaySoakTurnReport[] = []
  const errors: string[] = []
  const turnLatencies: number[] = []
  const checkpointSizes: number[] = []
  const sqliteSizes: number[] = []
  const checkpointWriteSignatures = new Set<string>()
  let checkpointWriteCount = 0
  let duplicateWritebackCount = 0
  let checkpointObserverErrorCount = 0
  let sqliteObserverErrorCount = 0
  let restartAttemptCount = 0
  let restartFailureCount = 0
  let currentDb = input.db
  let currentProvider = input.provider
  let previousRound: MemoryLongReplaySoakRoundReport | null = null

  async function notifyError(
    error: string,
    context: MemoryLongReplaySoakObserverContext & {
      phase: 'restart' | 'replay' | 'checkpoint-observer' | 'sqlite-observer'
      turnId?: string | null
    },
  ) {
    errors.push(error)
    try {
      await input.observers?.onError?.(error, context)
    }
    catch {
      // Error observation must never hide the original soak failure.
    }
  }

  async function observeSqlite(
    round: number,
    phase: 'before' | 'after',
  ) {
    if (!input.observers?.sqliteSizeBytes)
      return
    const context = {
      id,
      cardId,
      sessionId,
      round,
      db: currentDb,
    }
    try {
      const observed = normalizeMetricBytes(
        await input.observers.sqliteSizeBytes({
          ...context,
          phase,
        }),
      )
      if (observed !== null)
        sqliteSizes.push(observed)
    }
    catch (error) {
      sqliteObserverErrorCount += 1
      await notifyError(errorText(error), {
        ...context,
        phase: 'sqlite-observer',
      })
    }
  }

  async function observeCheckpoint(observationInput: {
    round: number
    turnId: string
    phase: 'hydration' | 'writeback'
    snapshot: WorkingMemorySnapshot
  }): Promise<CheckpointObservation | null> {
    try {
      const serialized = serializeWorkingMemoryCheckpoint(observationInput.snapshot)
      const measured = input.observers?.checkpointSizeBytes
        ? await input.observers.checkpointSizeBytes({
            ...observationInput,
            serialized,
          })
        : Buffer.byteLength(serialized, 'utf8')
      const bytes = normalizeMetricBytes(measured)
      if (bytes === null)
        throw new Error('checkpoint size observer returned a non-finite value')
      checkpointSizes.push(bytes)
      return {
        bytes,
        signature: serialized,
      }
    }
    catch (error) {
      checkpointObserverErrorCount += 1
      await notifyError(errorText(error), {
        id,
        cardId,
        sessionId,
        round: observationInput.round,
        db: currentDb,
        phase: 'checkpoint-observer',
        turnId: observationInput.turnId,
      })
      return null
    }
  }

  if (input.turns.length === 0) {
    await notifyError('memory long replay soak requires at least one turn', {
      id,
      cardId,
      sessionId,
      round: 0,
      db: currentDb,
      phase: 'replay',
      turnId: null,
    })
  }

  for (let round = 1; round <= executedRounds && input.turns.length > 0; round += 1) {
    const roundTurns: MemoryLongReplaySoakTurnReport[] = []
    let restart: MemoryLongReplaySoakRestartReport = {
      status: 'not-requested',
      error: null,
    }

    await observeSqlite(round, 'before')

    const shouldRestart = round > 1
      && Boolean(input.restart)
      && (
        input.restart?.rounds === undefined
        || isSelectedRound(input.restart.rounds, round)
      )
    if (shouldRestart && input.restart) {
      restartAttemptCount += 1
      try {
        if (isSelectedRound(input.failureInjection?.restartFailureRounds, round)) {
          throw new Error(
            normalizeText(input.failureInjection?.restartFailureMessage, 480)
            || `restart failure injected for round ${round}`,
          )
        }
        const result = await input.restart.hook({
          id,
          cardId,
          sessionId,
          round,
          previousRound,
          db: currentDb,
          provider: currentProvider,
        })
        currentDb = result?.db ?? currentDb
        currentProvider = result?.provider ?? currentProvider
        restart = {
          status: 'succeeded',
          error: null,
        }
      }
      catch (error) {
        const message = errorText(error)
        restartFailureCount += 1
        restart = {
          status: 'failed',
          error: message,
        }
        await notifyError(message, {
          id,
          cardId,
          sessionId,
          round,
          db: currentDb,
          phase: 'restart',
          turnId: null,
        })
      }
    }

    if (restart.status !== 'failed') {
      for (const turn of input.turns) {
        const turnId = normalizeText(turn.turnId, 180) || `round-${round}-turn`
        const replayDb: MemoryDialogueReplayDatabase = {
          getWorkingMemoryCheckpoint: async (lookupCardId, lookupSessionId) => {
            const snapshot = await currentDb.getWorkingMemoryCheckpoint(
              lookupCardId,
              lookupSessionId,
            )
            if (snapshot) {
              await observeCheckpoint({
                round,
                turnId,
                phase: 'hydration',
                snapshot,
              })
            }
            return snapshot
          },
          upsertWorkingMemoryCheckpoint: async (snapshot) => {
            await currentDb.upsertWorkingMemoryCheckpoint(snapshot)
            checkpointWriteCount += 1
            const observation = await observeCheckpoint({
              round,
              turnId,
              phase: 'writeback',
              snapshot,
            })
            if (observation) {
              if (checkpointWriteSignatures.has(observation.signature))
                duplicateWritebackCount += 1
              checkpointWriteSignatures.add(observation.signature)
            }
          },
          retrieveLongTermMemoryEvidence: async recallInput =>
            await currentDb.retrieveLongTermMemoryEvidence(recallInput),
        }
        const replayProvider: MemoryDialogueReplayProviderAdapter = {
          generate: async (providerInput) => {
            const shouldFail = isSelectedRound(
              input.failureInjection?.providerFailureRounds,
              round,
            ) || (input.failureInjection?.providerFailureTurnIds ?? []).some(
              value => normalizeText(value, 180) === turnId,
            )
            if (shouldFail) {
              throw new Error(
                normalizeText(input.failureInjection?.providerFailureMessage, 480)
                || `provider failure injected for round ${round}, turn ${turnId}`,
              )
            }
            const output = await currentProvider.generate(providerInput)
            return {
              text: output.text,
              memoryEvidence: output.memoryEvidence ?? null,
            }
          },
        }

        const startedAt = monotonicNow()
        let replayTurn: MemoryDialogueReplayTurnReport
        try {
          const replay = await replayMemoryDialogue({
            id: `${id}:round-${round}:${turnId}`,
            cardId,
            sessionId,
            userId,
            turns: [{
              ...turn,
              turnId,
            }],
            db: replayDb,
            provider: replayProvider,
            maxRawTurns,
            recallLimit,
          })
          replayTurn = replay.turns[0]
            ?? createFailedTurnReport(turnId, 'memory replay returned no turn report')
        }
        catch (error) {
          replayTurn = createFailedTurnReport(turnId, errorText(error))
        }
        const latencyMs = Math.max(0, monotonicNow() - startedAt)
        turnLatencies.push(latencyMs)
        const goldLabel = goldByTurnId.get(turnId)
        const turnReport: MemoryLongReplaySoakTurnReport = {
          round,
          turnId,
          latencyMs,
          replay: replayTurn,
          gold: goldLabel
            ? evaluateGold({
                label: goldLabel,
                recalledEvidenceIds: replayTurn.recalledEvidenceIds,
              })
            : null,
        }
        turns.push(turnReport)
        roundTurns.push(turnReport)
        if (replayTurn.error) {
          await notifyError(replayTurn.error, {
            id,
            cardId,
            sessionId,
            round,
            db: currentDb,
            phase: 'replay',
            turnId,
          })
        }
      }
    }

    await observeSqlite(round, 'after')

    const roundReplay = roundTurns.length > 0
      ? buildDialogueReplayReport({
          id: `${id}:round-${round}`,
          createdAt: input.turns.at(-1)?.now ?? createdAt,
          turns: roundTurns.map(turn => turn.replay),
        })
      : null
    const productionTrialReplay: MemoryProductionTrialDialogueReplayResult | null = roundReplay
      ? {
          id: roundReplay.id,
          passed: roundReplay.passed,
          turnCount: roundReplay.summary.turnCount,
          report: roundReplay,
          error: roundReplay.summary.lastError,
        }
      : null
    const roundError = restart.error
      ?? [...roundTurns].reverse().find(turn => turn.replay.error)?.replay.error
      ?? null
    const roundReport: MemoryLongReplaySoakRoundReport = {
      round,
      status: restart.status === 'failed' || roundTurns.some(turn => turn.replay.status === 'failed')
        ? 'failed'
        : 'succeeded',
      restart,
      latencyMs: summarizeLatencies(roundTurns.map(turn => turn.latencyMs)),
      dialogueReplay: roundReplay,
      productionTrialReplay,
      turns: roundTurns,
      error: roundError,
    }
    rounds.push(roundReport)
    previousRound = roundReport
  }

  const stageCounts = createStageCounts()
  for (const turn of turns) {
    for (const stage of turn.replay.stages)
      stageCounts[stage.name] += 1
  }
  const succeededTurnCount = turns.filter(turn => turn.replay.status === 'succeeded').length
  const failedTurnCount = turns.length - succeededTurnCount
  const succeededRoundCount = rounds.filter(round => round.status === 'succeeded').length
  const failedRoundCount = rounds.length - succeededRoundCount
  const providerFailureCount = turns.filter(turn =>
    turn.replay.stages.some(
      stage => stage.name === 'provider-adapter' && stage.status === 'failed',
    ),
  ).length
  const recalledEvidenceCount = turns.reduce(
    (sum, turn) => sum + turn.replay.recalledEvidenceIds.length,
    0,
  )
  const checkpointSizeSummary = summarizeSizes(checkpointSizes)
  const sqliteSizeSummary = summarizeSizes(sqliteSizes)
  const lastError = rounds.toReversed().find(round => round.error)?.error
    ?? errors.at(-1)
    ?? null

  return {
    version: 'memory-long-replay-soak-report-v1',
    id,
    cardId,
    sessionId,
    createdAt,
    passed: input.turns.length > 0
      && rounds.length === executedRounds
      && failedRoundCount === 0
      && checkpointObserverErrorCount === 0
      && sqliteObserverErrorCount === 0,
    config: {
      requestedRounds,
      executedRounds,
      maxRounds,
      turnTemplateCount: input.turns.length,
      maxRawTurns,
      recallLimit,
      personaWriteback: 'disabled',
    },
    summary: {
      roundCount: rounds.length,
      succeededRoundCount,
      failedRoundCount,
      turnCount: turns.length,
      succeededTurnCount,
      failedTurnCount,
      recalledEvidenceCount,
      providerFailureCount,
      restartAttemptCount,
      restartFailureCount,
      duplicateWritebackCount,
      lastError,
      stageCounts,
    },
    gold: buildGoldSummary(turns),
    latencyMs: summarizeLatencies(turnLatencies),
    checkpoint: {
      ...checkpointSizeSummary,
      writeCount: checkpointWriteCount,
      duplicateWritebackCount,
      observerErrorCount: checkpointObserverErrorCount,
    },
    sqlite: {
      ...sqliteSizeSummary,
      observerErrorCount: sqliteObserverErrorCount,
    },
    rounds,
    turns,
    errors,
  }
}

export function serializeMemoryLongReplaySoakReport(
  report: MemoryLongReplaySoakReport,
) {
  return JSON.stringify(report, null, 2)
}
