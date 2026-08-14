import type { AlicizationExecutionChannel } from './alicization-transport-contracts'

export type AlicizationRuntimeToolProjectionPhase
  = | 'started'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'timeout'

export type AlicizationRuntimeToolProgressSignal
  = | 'liveness'
    | 'semantic-progress'
    | 'terminal'

export interface AlicizationRuntimeToolProjectionStep {
  signal: AlicizationRuntimeToolProgressSignal | null
  elapsedMs: number | null
  occurredAt: number | null
  eventId: string | null
  threadId: string | null
  adapterEventType: string | null
  itemType: string | null
  summary: string | null
  command: string | null
  commandStatus: string | null
  commandExitCode: number | null
  outputPreview: string | null
}

export interface AlicizationRuntimeToolCardProjection {
  toolCallId: string
  toolName: string
  selectedChannel: AlicizationExecutionChannel | null
  phase: AlicizationRuntimeToolProjectionPhase
  terminal: boolean
  revision: number
  elapsedMs: number | null
  timeoutMs: number | null
  errorCode: string | null
  errorMessage: string | null
  step: AlicizationRuntimeToolProjectionStep | null
  result: unknown
}

interface AlicizationRuntimeToolFactBase {
  toolCallId: string
  toolName: string
  selectedChannel?: AlicizationExecutionChannel | string | null
}

export interface AlicizationRuntimeToolCallFact extends AlicizationRuntimeToolFactBase {
  type: 'tool-call'
  arguments?: unknown
}

export interface AlicizationRuntimeToolProgressFact extends AlicizationRuntimeToolFactBase {
  type: 'tool-progress'
  signal?: AlicizationRuntimeToolProgressSignal
  phase: AlicizationRuntimeToolProjectionPhase
  elapsedMs: number
  timeoutMs?: number
  errorCode?: string
  errorMessage?: string
  occurredAt?: number
  eventId?: string
  threadId?: string
  adapterEventType?: string
  itemType?: string
  summary?: string
  command?: string
  commandStatus?: string
  commandExitCode?: number
  outputPreview?: string
}

export interface AlicizationRuntimeToolResultFact extends AlicizationRuntimeToolFactBase {
  type: 'tool-result'
  phase?: Extract<
    AlicizationRuntimeToolProjectionPhase,
    'completed' | 'failed' | 'cancelled' | 'timeout'
  >
  result?: unknown
}

export type AlicizationRuntimeToolProjectionFact
  = | AlicizationRuntimeToolCallFact
    | AlicizationRuntimeToolProgressFact
    | AlicizationRuntimeToolResultFact

export type AlicizationRuntimeToolEventType = AlicizationRuntimeToolProjectionFact['type']

export class AlicizationToolEventDeliveryError extends Error {
  readonly code = 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED'
  readonly eventType: AlicizationRuntimeToolEventType
  readonly toolCallId: string
  readonly toolName: string

  constructor(
    cause: unknown,
    event: {
      type: AlicizationRuntimeToolEventType
      toolCallId: string
      toolName?: string
    },
  ) {
    super(cause instanceof Error ? cause.message : String(cause))
    this.name = 'AlicizationToolEventDeliveryError'
    this.eventType = event.type
    this.toolCallId = event.toolCallId
    this.toolName = event.toolName?.trim() || 'tool'
    ;(this as Error & { cause?: unknown }).cause = cause
  }
}

export interface AlicizationRuntimeToolProjectionUpdate {
  factType: AlicizationRuntimeToolProjectionFact['type']
  accepted: boolean
  traceOnly: boolean
  card: AlicizationRuntimeToolCardProjection
}

export interface AlicizationRuntimeToolProjectionReducer {
  reduce: (
    fact: AlicizationRuntimeToolProjectionFact,
    options?: {
      confirmSelectedChannel?: boolean
      traceOnly?: boolean
    },
  ) => AlicizationRuntimeToolProjectionUpdate
  getCard: (toolCallId: string) => AlicizationRuntimeToolCardProjection | null
  listCards: () => AlicizationRuntimeToolCardProjection[]
  listTrace: () => AlicizationRuntimeToolProjectionUpdate[]
}

const executionChannels = new Set<AlicizationExecutionChannel>([
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
])

const terminalPhases = new Set<AlicizationRuntimeToolProjectionPhase>([
  'completed',
  'failed',
  'cancelled',
  'timeout',
])

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableText(value: unknown) {
  return normalizeText(value) || null
}

function normalizeNonNegativeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, value)
    : null
}

function normalizeInteger(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : null
}

export function normalizeAlicizationExecutionChannel(value: unknown): AlicizationExecutionChannel | null {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replaceAll('_', '-')
  return executionChannels.has(normalized as AlicizationExecutionChannel)
    ? normalized as AlicizationExecutionChannel
    : null
}

function readRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function resolveAlicizationRuntimeToolName(toolName: unknown) {
  const normalized = normalizeText(toolName) || 'tool'
  switch (normalized) {
    case 'executor_run_coding_agent':
      return 'coding_agent'
    case 'executor_run_cli':
      return 'cli'
    case 'executor_run_codex':
      return 'codex'
    case 'executor_run_claude_code':
      return 'claude_code'
    default:
      return normalized
  }
}

export function resolveAlicizationRuntimeToolSelectedChannel(input: {
  selectedChannel?: unknown
  toolName?: unknown
}): AlicizationExecutionChannel | null {
  const explicit = normalizeAlicizationExecutionChannel(input.selectedChannel)
  if (explicit)
    return explicit

  const toolName = resolveAlicizationRuntimeToolName(input.toolName)
  if (toolName === 'cli' || toolName === 'codex')
    return toolName
  if (toolName === 'claude_code')
    return 'claude-code'
  if (toolName === 'openclaw' || toolName === 'openfang')
    return toolName
  return null
}

function resolveLegacyToolNameChannel(toolName: unknown): AlicizationExecutionChannel | null {
  const resolvedToolName = resolveAlicizationRuntimeToolName(toolName)
  if (resolvedToolName === 'cli' || resolvedToolName === 'codex')
    return resolvedToolName
  if (resolvedToolName === 'claude_code')
    return 'claude-code'
  if (resolvedToolName === 'openclaw' || resolvedToolName === 'openfang')
    return resolvedToolName
  return null
}

export function resolveAlicizationRuntimeToolResultPhase(
  result: unknown,
): Extract<
  AlicizationRuntimeToolProjectionPhase,
  'completed' | 'failed' | 'cancelled' | 'timeout'
> {
  const record = readRecord(result)
  const status = normalizeText(record?.status).toLowerCase()
  const finalStatus = normalizeText(record?.finalStatus).toLowerCase()
  const errorCode = normalizeText(record?.errorCode).toLowerCase()

  if (
    status === 'cancelled'
    || finalStatus === 'cancelled'
    || record?.cancelled === true
  ) {
    return 'cancelled'
  }
  if (
    status === 'timeout'
    || finalStatus === 'timeout'
    || /(?:^|_)timeout$/u.test(errorCode)
  ) {
    return 'timeout'
  }
  if (
    status === 'failed'
    || status === 'blocked'
    || finalStatus === 'failed'
    || record?.ok === false
    || Boolean(errorCode)
  ) {
    return 'failed'
  }
  return 'completed'
}

function isTerminalPhase(phase: AlicizationRuntimeToolProjectionPhase) {
  return terminalPhases.has(phase)
}

function buildProgressStep(
  fact: AlicizationRuntimeToolProgressFact,
): AlicizationRuntimeToolProjectionStep {
  return {
    signal: fact.signal ?? null,
    elapsedMs: normalizeNonNegativeNumber(fact.elapsedMs),
    occurredAt: normalizeNonNegativeNumber(fact.occurredAt),
    eventId: normalizeNullableText(fact.eventId),
    threadId: normalizeNullableText(fact.threadId),
    adapterEventType: normalizeNullableText(fact.adapterEventType),
    itemType: normalizeNullableText(fact.itemType),
    summary: normalizeNullableText(fact.summary),
    command: normalizeNullableText(fact.command),
    commandStatus: normalizeNullableText(fact.commandStatus),
    commandExitCode: normalizeInteger(fact.commandExitCode),
    outputPreview: normalizeNullableText(fact.outputPreview),
  }
}

function isProgressFactOlderThanPrevious(
  fact: AlicizationRuntimeToolProgressFact,
  previous: AlicizationRuntimeToolCardProjection,
) {
  const previousStep = previous.step
  if (!previousStep)
    return false

  const incomingEventId = normalizeNullableText(fact.eventId)
  if (incomingEventId && incomingEventId === previousStep.eventId)
    return true

  const incomingOccurredAt = normalizeNonNegativeNumber(fact.occurredAt)
  const previousOccurredAt = previousStep.occurredAt
  if (
    incomingOccurredAt !== null
    && previousOccurredAt !== null
  ) {
    if (incomingOccurredAt < previousOccurredAt)
      return true
    if (
      incomingOccurredAt === previousOccurredAt
      && fact.elapsedMs < (previousStep.elapsedMs ?? previous.elapsedMs ?? 0)
    ) {
      return true
    }
    return false
  }

  const incomingElapsedMs = normalizeNonNegativeNumber(fact.elapsedMs)
  const previousElapsedMs = previousStep.elapsedMs ?? previous.elapsedMs
  return incomingElapsedMs !== null
    && previousElapsedMs !== null
    && incomingElapsedMs < previousElapsedMs
}

function cloneProjectionResult(result: unknown) {
  if (result === undefined || result === null || typeof result !== 'object')
    return result
  return structuredClone(result)
}

function copyCard(card: AlicizationRuntimeToolCardProjection) {
  return {
    ...card,
    step: card.step ? { ...card.step } : null,
    result: cloneProjectionResult(card.result),
  }
}

function projectFactWithoutMutation(
  fact: AlicizationRuntimeToolProjectionFact,
  previous: AlicizationRuntimeToolCardProjection | undefined,
): AlicizationRuntimeToolCardProjection {
  if (previous?.terminal)
    return previous

  const toolCallId = normalizeText(fact.toolCallId)
  const toolName = resolveAlicizationRuntimeToolName(
    fact.toolName || previous?.toolName,
  )
  const selectedChannel = normalizeAlicizationExecutionChannel(fact.selectedChannel)
    ?? previous?.selectedChannel
    ?? resolveLegacyToolNameChannel(toolName)
  const phase = fact.type === 'tool-call'
    ? previous?.phase ?? 'started'
    : fact.type === 'tool-progress'
      ? fact.phase
      : fact.phase ?? resolveAlicizationRuntimeToolResultPhase(fact.result)

  return {
    toolCallId,
    toolName: previous?.toolName ?? toolName,
    selectedChannel,
    phase: previous?.phase ?? phase,
    terminal: previous?.terminal ?? isTerminalPhase(phase),
    revision: previous?.revision ?? 0,
    elapsedMs: previous?.elapsedMs
      ?? (fact.type === 'tool-progress' ? normalizeNonNegativeNumber(fact.elapsedMs) : null),
    timeoutMs: previous?.timeoutMs
      ?? (fact.type === 'tool-progress' ? normalizeNonNegativeNumber(fact.timeoutMs) : null),
    errorCode: previous?.errorCode
      ?? (fact.type === 'tool-progress' ? normalizeNullableText(fact.errorCode) : null),
    errorMessage: previous?.errorMessage
      ?? (fact.type === 'tool-progress' ? normalizeNullableText(fact.errorMessage) : null),
    step: previous?.step
      ?? (fact.type === 'tool-progress' ? buildProgressStep(fact) : null),
    result: previous?.result
      ?? (fact.type === 'tool-result' ? cloneProjectionResult(fact.result) : undefined),
  }
}

export function createAlicizationRuntimeToolProjectionReducer():
AlicizationRuntimeToolProjectionReducer {
  const cards = new Map<string, AlicizationRuntimeToolCardProjection>()
  const confirmedChannels = new Map<string, AlicizationExecutionChannel>()
  const trace: AlicizationRuntimeToolProjectionUpdate[] = []

  const appendTrace = (
    update: AlicizationRuntimeToolProjectionUpdate,
  ): AlicizationRuntimeToolProjectionUpdate => {
    const snapshot = {
      ...update,
      card: copyCard(update.card),
    }
    trace.push(snapshot)
    return snapshot
  }

  const reduce = (
    fact: AlicizationRuntimeToolProjectionFact,
    options?: {
      confirmSelectedChannel?: boolean
      traceOnly?: boolean
    },
  ): AlicizationRuntimeToolProjectionUpdate => {
    const toolCallId = normalizeText(fact.toolCallId)
    if (!toolCallId) {
      return appendTrace({
        factType: fact.type,
        accepted: false,
        traceOnly: true,
        card: {
          toolCallId: '',
          toolName: resolveAlicizationRuntimeToolName(fact.toolName),
          selectedChannel: normalizeAlicizationExecutionChannel(fact.selectedChannel),
          phase: 'failed',
          terminal: true,
          revision: 0,
          elapsedMs: null,
          timeoutMs: null,
          errorCode: 'TOOL_PROJECTION_INVALID',
          errorMessage: 'Runtime tool projection dropped a fact without a canonical toolCallId.',
          step: null,
          result: undefined,
        },
      })
    }

    const previous = cards.get(toolCallId)
    if (options?.traceOnly) {
      return appendTrace({
        factType: fact.type,
        accepted: false,
        traceOnly: true,
        card: projectFactWithoutMutation(fact, previous),
      })
    }

    if (
      previous?.terminal
      && fact.type === 'tool-result'
      && previous.result === undefined
      && (fact.phase ?? resolveAlicizationRuntimeToolResultPhase(fact.result)) === previous.phase
    ) {
      const completed = {
        ...previous,
        revision: previous.revision + 1,
        result: cloneProjectionResult(fact.result),
      }
      cards.set(toolCallId, completed)
      return appendTrace({
        factType: fact.type,
        accepted: true,
        traceOnly: false,
        card: completed,
      })
    }

    if (previous?.terminal) {
      return appendTrace({
        factType: fact.type,
        accepted: false,
        traceOnly: true,
        card: previous,
      })
    }

    const toolName = resolveAlicizationRuntimeToolName(
      fact.toolName || previous?.toolName,
    )
    const explicitSelectedChannel = normalizeAlicizationExecutionChannel(
      fact.selectedChannel,
    )
    const selectedChannel = confirmedChannels.get(toolCallId)
      ?? explicitSelectedChannel
      ?? previous?.selectedChannel
      ?? resolveLegacyToolNameChannel(toolName)
    const phase = fact.type === 'tool-call'
      ? previous?.phase ?? 'started'
      : fact.type === 'tool-progress'
        ? fact.phase
        : fact.phase ?? resolveAlicizationRuntimeToolResultPhase(fact.result)
    const terminal = isTerminalPhase(phase)

    if (
      previous
      && fact.type === 'tool-progress'
      && isProgressFactOlderThanPrevious(fact, previous)
    ) {
      return appendTrace({
        factType: fact.type,
        accepted: false,
        traceOnly: true,
        card: previous,
      })
    }

    const next: AlicizationRuntimeToolCardProjection = {
      toolCallId,
      toolName: previous?.toolName ?? toolName,
      selectedChannel,
      phase: previous?.terminal ? previous.phase : phase,
      terminal: previous?.terminal || terminal,
      revision: (previous?.revision ?? 0) + 1,
      elapsedMs: fact.type === 'tool-progress'
        ? normalizeNonNegativeNumber(fact.elapsedMs)
        : previous?.elapsedMs ?? null,
      timeoutMs: fact.type === 'tool-progress'
        ? normalizeNonNegativeNumber(fact.timeoutMs) ?? previous?.timeoutMs ?? null
        : previous?.timeoutMs ?? null,
      errorCode: fact.type === 'tool-progress'
        ? normalizeNullableText(fact.errorCode) ?? previous?.errorCode ?? null
        : previous?.errorCode ?? null,
      errorMessage: fact.type === 'tool-progress'
        ? normalizeNullableText(fact.errorMessage) ?? previous?.errorMessage ?? null
        : previous?.errorMessage ?? null,
      step: fact.type === 'tool-progress'
        ? buildProgressStep(fact)
        : previous?.step ?? null,
      result: fact.type === 'tool-result'
        ? cloneProjectionResult(fact.result)
        : previous?.result,
    }

    cards.set(toolCallId, next)
    if (
      explicitSelectedChannel
      && options?.confirmSelectedChannel !== false
      && !confirmedChannels.has(toolCallId)
    ) {
      confirmedChannels.set(toolCallId, explicitSelectedChannel)
    }
    return appendTrace({
      factType: fact.type,
      accepted: true,
      traceOnly: false,
      card: next,
    })
  }

  return {
    reduce,
    getCard(toolCallId) {
      const card = cards.get(normalizeText(toolCallId))
      return card ? copyCard(card) : null
    },
    listCards() {
      return [...cards.values()].map(copyCard)
    },
    listTrace() {
      return trace.map(update => ({
        ...update,
        card: copyCard(update.card),
      }))
    },
  }
}
