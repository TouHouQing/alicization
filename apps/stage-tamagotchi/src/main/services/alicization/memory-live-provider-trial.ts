import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'
import type { AlicizationMainChatMemoryContext } from './main-chat-memory-context'
import type {
  MemoryDialogueReplayProviderMessage,
  MemoryDialogueReplayReport,
  MemoryDialogueReplayTurnInput,
  MemoryDialogueReplayTurnReport,
} from './memory-db-dialogue-replay-harness'

import { errorMessageFrom } from '@moeru/std'

import { replayMemoryDialogue } from './memory-db-dialogue-replay-harness'

export interface AlicizationMemoryTrialProvider {
  generate: (input: {
    cardId: string
    sessionId: string
    turnId: string
    messages: MemoryDialogueReplayProviderMessage[]
    memoryContext: AlicizationMainChatMemoryContext
    workingMemory: WorkingMemorySnapshot
    recalledMemory: LongTermMemoryEvidenceBundle
    timeoutMs: number
    signal: AbortSignal
  }) => Promise<{
    text: string
    providerId: string
    modelId: string
    finishReason: string | null
    retryCount: number
    latencyMs: number
  }>
}

export interface MemoryLiveProviderTrialDatabase {
  getWorkingMemoryCheckpoint: (
    cardId: string,
    sessionId: string,
  ) => Promise<WorkingMemorySnapshot | null>
  retrieveLongTermMemoryEvidenceReadOnly: (input: {
    cardId: string
    userId?: string
    currentUserText: string
    workingMemoryQueryHints?: string[]
    currentThreadTitle?: string | null
    activeTask?: string | null
    limit?: number
  }) => Promise<LongTermMemoryEvidenceBundle>
  readPersonaState?: () => Promise<unknown>
}

export interface MemoryLiveProviderTrace {
  providerId: string
  modelId: string
  finishReason: string | null
  retryCount: number
  latencyMs: number
  outputLength: number
}

export interface MemoryLiveProviderTrialTurnReport extends MemoryDialogueReplayTurnReport {
  providerTrace: MemoryLiveProviderTrace | null
}

export interface MemoryLiveProviderTrialReport {
  version: 'memory-live-provider-trial-v1'
  id: string
  cardId: string
  sessionId: string
  createdAt: number
  passed: boolean
  summary: {
    turnCount: number
    succeededTurnCount: number
    failedTurnCount: number
    recalledEvidenceCount: number
    providerCallCount: number
    providerRetryCount: number
    providerFailureRate: number
    p50LatencyMs: number
    p95LatencyMs: number
    p99LatencyMs: number
    lastError: string | null
  }
  turns: MemoryLiveProviderTrialTurnReport[]
  productionWrites: []
}

function normalizePositiveInteger(raw: unknown, fallback: number, maximum: number) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return fallback
  return Math.max(1, Math.min(maximum, Math.floor(value)))
}

function percentile(values: number[], percentileValue: number) {
  const sorted = values
    .filter(Number.isFinite)
    .map(value => Math.max(0, Math.floor(value)))
    .sort((left, right) => left - right)
  if (sorted.length === 0)
    return 0
  const rank = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1))
  return sorted[rank] ?? 0
}

function redactSensitiveValues(raw: string, sensitiveValues: string[]) {
  return sensitiveValues
    .map(value => value.trim())
    .filter(value => value.length > 0)
    .sort((left, right) => right.length - left.length)
    .reduce(
      (text, value) => text.split(value).join('[redacted-input]'),
      raw,
    )
}

function errorText(error: unknown, sensitiveValues: string[] = []) {
  const raw = redactSensitiveValues(
    errorMessageFrom(error)?.trim()
    ?? String(error ?? 'unknown live provider trial error'),
    sensitiveValues,
  )
  return raw
    .replace(/Authorization\s*:\s*Bearer\s+[\w.~+/=-]+/giu, 'Authorization: Bearer [redacted]')
    .replace(/(["']?(?:authorization|api[_ -]?key|token|secret|password)["']?\s*[:=]\s*["']?)(?:Bearer\s+)?[^"'\s,;}]+/giu, '$1[redacted]')
    .replace(/(["']?user[_ -]?input["']?\s*[:=]\s*["']?)[^"',;}]+/giu, '$1[redacted-input]')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 480)
}

function abortError(signal: AbortSignal, fallback: string) {
  const reason = signal.reason
  if (reason instanceof Error)
    return reason
  if (typeof reason === 'string' && reason.trim())
    return new Error(reason.trim())
  return new Error(fallback)
}

function failedTurn(input: {
  turnId: string
  error: string
}): MemoryLiveProviderTrialTurnReport {
  return {
    turnId: input.turnId,
    status: 'failed',
    providerOutput: null,
    providerMessages: [],
    recalledEvidenceIds: [],
    stages: [],
    writeback: {
      checkpoint: 'skipped',
      persona: 'skipped',
    },
    providerTrace: null,
    error: input.error,
  }
}

async function awaitWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted)
    throw abortError(signal, 'memory live provider trial cancelled')

  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal, 'memory live provider trial cancelled'))
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

function createTurnSignal(input: {
  parentSignal?: AbortSignal
  timeoutMs: number
}) {
  const controller = new AbortController()
  const forwardAbort = () => {
    if (!controller.signal.aborted)
      controller.abort(input.parentSignal?.reason ?? new Error('memory live provider trial cancelled'))
  }
  if (input.parentSignal?.aborted)
    forwardAbort()
  else
    input.parentSignal?.addEventListener('abort', forwardAbort, { once: true })

  const timeout = setTimeout(() => {
    if (!controller.signal.aborted)
      controller.abort(new Error(`memory live provider trial turn timed out after ${input.timeoutMs}ms`))
  }, input.timeoutMs)

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout)
      input.parentSignal?.removeEventListener('abort', forwardAbort)
    },
  }
}

export async function runMemoryLiveProviderTrial(input: {
  id: string
  cardId: string
  sessionId: string
  userId: string
  turns: MemoryDialogueReplayTurnInput[]
  db: MemoryLiveProviderTrialDatabase
  provider: AlicizationMemoryTrialProvider['generate']
  signal?: AbortSignal
  maxTurns?: number
  maxRawTurns?: number
  recallLimit?: number
  perTurnTimeoutMs?: number
  totalTimeoutMs?: number
}): Promise<MemoryLiveProviderTrialReport> {
  const maxTurns = normalizePositiveInteger(input.maxTurns, 8, 64)
  const perTurnTimeoutMs = normalizePositiveInteger(input.perTurnTimeoutMs, 45_000, 300_000)
  const totalTimeoutMs = normalizePositiveInteger(input.totalTimeoutMs, 180_000, 1_800_000)
  const selectedTurns = input.turns.slice(0, maxTurns)
  const trialController = new AbortController()
  const forwardAbort = () => {
    if (!trialController.signal.aborted)
      trialController.abort(input.signal?.reason ?? new Error('memory live provider trial cancelled'))
  }
  if (input.signal?.aborted)
    forwardAbort()
  else
    input.signal?.addEventListener('abort', forwardAbort, { once: true })
  const totalTimeout = setTimeout(() => {
    if (!trialController.signal.aborted)
      trialController.abort(new Error(`memory live provider trial timed out after ${totalTimeoutMs}ms`))
  }, totalTimeoutMs)

  let localCheckpoint: WorkingMemorySnapshot | null = null
  let localPersonaState: unknown
  const turns: MemoryLiveProviderTrialTurnReport[] = []
  const traces = new Map<string, MemoryLiveProviderTrace>()

  try {
    if (trialController.signal.aborted) {
      const error = errorText(abortError(trialController.signal, 'memory live provider trial cancelled'))
      return {
        version: 'memory-live-provider-trial-v1',
        id: input.id,
        cardId: input.cardId,
        sessionId: input.sessionId,
        createdAt: Date.now(),
        passed: false,
        summary: {
          turnCount: 0,
          succeededTurnCount: 0,
          failedTurnCount: 0,
          recalledEvidenceCount: 0,
          providerCallCount: 0,
          providerRetryCount: 0,
          providerFailureRate: 0,
          p50LatencyMs: 0,
          p95LatencyMs: 0,
          p99LatencyMs: 0,
          lastError: error,
        },
        turns: [],
        productionWrites: [],
      }
    }

    const [initialCheckpoint, initialPersonaState] = await awaitWithAbort(
      Promise.all([
        input.db.getWorkingMemoryCheckpoint(input.cardId, input.sessionId),
        input.db.readPersonaState ? input.db.readPersonaState() : Promise.resolve(undefined),
      ]),
      trialController.signal,
    )
    localCheckpoint = structuredClone(initialCheckpoint)
    localPersonaState = structuredClone(initialPersonaState)

    for (const turn of selectedTurns) {
      if (trialController.signal.aborted) {
        turns.push(failedTurn({
          turnId: turn.turnId,
          error: errorText(abortError(trialController.signal, 'memory live provider trial cancelled')),
        }))
        break
      }

      const turnSignal = createTurnSignal({
        parentSignal: trialController.signal,
        timeoutMs: perTurnTimeoutMs,
      })
      try {
        const replay = await awaitWithAbort(replayMemoryDialogue({
          id: `${input.id}:${turn.turnId}`,
          cardId: input.cardId,
          sessionId: input.sessionId,
          userId: input.userId,
          turns: [turn],
          maxRawTurns: input.maxRawTurns,
          recallLimit: input.recallLimit,
          db: {
            getWorkingMemoryCheckpoint: async () =>
              localCheckpoint ? structuredClone(localCheckpoint) : null,
            upsertWorkingMemoryCheckpoint: async (snapshot) => {
              localCheckpoint = structuredClone(snapshot)
            },
            retrieveLongTermMemoryEvidence: async recallInput =>
              await input.db.retrieveLongTermMemoryEvidenceReadOnly(recallInput),
            readPersonaState: async () => structuredClone(localPersonaState),
            persistPersonaState: async (next) => {
              localPersonaState = structuredClone(next)
            },
          },
          provider: {
            generate: async (providerInput) => {
              const output = await awaitWithAbort(input.provider({
                cardId: input.cardId,
                sessionId: input.sessionId,
                turnId: providerInput.turnId,
                messages: providerInput.messages,
                memoryContext: providerInput.memoryContext,
                workingMemory: providerInput.workingMemory,
                recalledMemory: providerInput.recalledMemory,
                timeoutMs: perTurnTimeoutMs,
                signal: turnSignal.signal,
              }), turnSignal.signal)
              traces.set(providerInput.turnId, {
                providerId: output.providerId,
                modelId: output.modelId,
                finishReason: output.finishReason,
                retryCount: output.retryCount,
                latencyMs: output.latencyMs,
                outputLength: output.text.length,
              })
              return {
                text: output.text,
              }
            },
          },
        }), turnSignal.signal)
        const replayTurn = replay.turns[0]
        if (replayTurn) {
          const providerTrace = traces.get(replayTurn.turnId) ?? null
          const sensitiveValues = [
            turn.userText,
            ...replayTurn.providerMessages.map(message => message.content),
          ]
          turns.push({
            ...replayTurn,
            providerMessages: replayTurn.status === 'failed'
              ? []
              : replayTurn.providerMessages,
            stages: replayTurn.stages.map(stage => ({
              ...stage,
              ...(stage.name === 'provider-adapter'
                ? {
                    details: {
                      ...stage.details,
                      providerTrace,
                    },
                  }
                : {}),
              error: stage.error ? errorText(stage.error, sensitiveValues) : null,
            })),
            providerTrace,
            error: replayTurn.error ? errorText(replayTurn.error, sensitiveValues) : null,
          })
        }
      }
      finally {
        turnSignal.dispose()
      }
    }
  }
  catch (error) {
    const turnId = selectedTurns[Math.min(turns.length, selectedTurns.length - 1)]?.turnId
      ?? 'memory-live-provider-trial'
    turns.push(failedTurn({
      turnId,
      error: errorText(error),
    }))
  }
  finally {
    clearTimeout(totalTimeout)
    input.signal?.removeEventListener('abort', forwardAbort)
  }

  const succeededTurnCount = turns.filter(turn => turn.status === 'succeeded').length
  const failedTurnCount = turns.length - succeededTurnCount
  const recalledEvidenceCount = turns.reduce(
    (sum, turn) => sum + turn.recalledEvidenceIds.length,
    0,
  )
  const lastError = [...turns].reverse().find(turn => turn.error)?.error ?? null
  const providerTraces = [...traces.values()]
  const providerLatencies = providerTraces.map(trace => trace.latencyMs)

  return {
    version: 'memory-live-provider-trial-v1',
    id: input.id,
    cardId: input.cardId,
    sessionId: input.sessionId,
    createdAt: selectedTurns.at(-1)?.now ?? Date.now(),
    passed: selectedTurns.length > 0
      && turns.length === selectedTurns.length
      && failedTurnCount === 0,
    summary: {
      turnCount: turns.length,
      succeededTurnCount,
      failedTurnCount,
      recalledEvidenceCount,
      providerCallCount: traces.size,
      providerRetryCount: providerTraces.reduce((sum, trace) => sum + trace.retryCount, 0),
      providerFailureRate: turns.length > 0
        ? Number((failedTurnCount / turns.length).toFixed(4))
        : 0,
      p50LatencyMs: percentile(providerLatencies, 0.5),
      p95LatencyMs: percentile(providerLatencies, 0.95),
      p99LatencyMs: percentile(providerLatencies, 0.99),
      lastError,
    },
    turns,
    productionWrites: [],
  }
}

export function projectMemoryLiveProviderTrialToDialogueReplay(
  report: MemoryLiveProviderTrialReport,
): MemoryDialogueReplayReport {
  return {
    version: 'memory-db-dialogue-replay-report-v1',
    id: report.id,
    passed: report.passed,
    createdAt: report.createdAt,
    summary: {
      turnCount: report.summary.turnCount,
      succeededTurnCount: report.summary.succeededTurnCount,
      failedTurnCount: report.summary.failedTurnCount,
      checkpointWriteCount: 0,
      personaWriteCount: 0,
      recalledEvidenceCount: report.summary.recalledEvidenceCount,
      lastError: report.summary.lastError,
    },
    turns: report.turns.map(({ providerTrace: _providerTrace, ...turn }) => ({
      ...turn,
      writeback: {
        ...turn.writeback,
        checkpoint: 'skipped',
      },
    })),
  }
}
