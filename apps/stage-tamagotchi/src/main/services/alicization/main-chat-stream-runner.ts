import type {
  AlicizationProviderMemoryEvidence,
} from '@proj-alicization/stage-shared'
import type { Message, Tool } from '@xsai/shared-chat'

import type {
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallInput,
  AlicizationChatToolProgressInput,
  AlicizationChatToolResultInput,
  AlicizationEmotionalKernelSnapshot,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationProviderRetryOverrides } from './provider-retry-policy'
import type { AlicizationModelAction } from './turn-os/event-loop'
import type { AlicizationTurnRuntimeContext } from './turn-os/runtime'
import type {
  AlicizationVisibleReplyClosureArtifact,
  AlicizationVisibleReplyCriticArtifact,
  AlicizationVisibleReplyRealizationArtifact,
} from './visible-reply/facade'

import { Buffer } from 'node:buffer'

import Ajv from 'ajv'
import addFormats from 'ajv-formats'

import { errorMessageFrom } from '@moeru/std'
import {
  createAlicizationProviderVisibleArtifact,
  extractAlicizationToolExecutionFailure,
  isAlicizationToolExecutionFailureResult,
} from '@proj-alicization/stage-shared'
import { streamText } from '@xsai/stream-text'

import { shouldEmitAlicizationChatMetaUpdate } from './main-chat-stream-meta-policy'
import {
  awaitAlicizationPromiseWithAbort,
  createAbortError,
  isMainGatewayProgressEventType,
  normalizeMainGatewayStreamEventType,
  readRawTextDelta,
  sanitizeText,
} from './main-chat-stream-primitives'
import { createAlicizationMainChatToolCallIdentityRegistry } from './main-chat-tool-call-identity'
import {
  alicizationProviderEmptyCompletionErrorCode,
  resolveAlicizationProviderRetryDeadline,
  resolveAlicizationProviderRetryDecision,
  waitForAlicizationProviderRetry,
} from './provider-retry-policy'
import { adaptAlicizationProviderTools } from './provider-tool-compatibility'
import { parseReminderToolResultForDebug, sanitizeBriefText } from './runtime-realtime'
import { createAlicizationTurnRuntime } from './turn-os/runtime'
import { createAlicizationMainWatchdogAbortError } from './turn-os/runtime-errors'
import { resolveAlicizationPreparedVisibleReplyExecution } from './visible-reply/facade'
import {
  AlicizationVisibleReplySettlementBlockedError,
  validateAlicizationProviderSettlementPayload,
} from './visible-reply/settlement'

type StreamTextInvoker = (input: Record<string, unknown>) => unknown
type AlicizationStreamEmotionalKernelShape = AlicizationEmotionalKernelSnapshot
interface AlicizationProviderStreamReader {
  read: () => Promise<{ done: boolean, value?: unknown }>
  releaseLock?: () => void
  cancel?: (reason?: unknown) => Promise<void>
}

const providerReaderCancelTimeoutMs = 1_000
const providerToolArgumentsValidator = addFormats(new Ajv({
  allErrors: true,
  coerceTypes: false,
  removeAdditional: false,
  strict: false,
  useDefaults: false,
}))

interface AlicizationProviderFullStream {
  getReader?: () => AlicizationProviderStreamReader
}

type AlicizationProviderStreamPhase = 'requesting'
  | 'headers-received'
  | 'provider-progress'
  | 'tool-argument-streaming'
  | 'tool-running'
  | 'completed'
  | 'failed'

function observeStreamTextResultErrors(
  result: unknown,
  onError: (error: unknown) => void,
) {
  if (!result || typeof result !== 'object')
    return

  const streamResult = result as Record<string, unknown>
  for (const key of ['messages', 'steps', 'totalUsage', 'usage'] as const) {
    const pending = streamResult[key]
    if (pending && typeof (pending as PromiseLike<unknown>).then === 'function')
      void Promise.resolve(pending).catch(onError)
  }
}

function readProviderFullStream(result: unknown) {
  if (!result || typeof result !== 'object')
    return null

  const fullStream = (result as Record<string, unknown>).fullStream
  if (!fullStream || typeof fullStream !== 'object')
    return null

  const readerFactory = (fullStream as AlicizationProviderFullStream).getReader
  return typeof readerFactory === 'function'
    ? fullStream as AlicizationProviderFullStream
    : null
}

function createAlicizationToolExecutionError(
  failure: NonNullable<ReturnType<typeof extractAlicizationToolExecutionFailure>>,
) {
  return Object.assign(new Error(failure.message), {
    name: 'AlicizationToolExecutionError',
    failureKind: 'tool-execution',
    toolName: failure.toolName,
    errorCode: failure.code,
    errorMessage: failure.message,
  })
}

function isTerminalToolResult(result: unknown) {
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return false
  return (result as Record<string, unknown>).continuationPolicy === 'stop'
}

type StreamToolArguments
  = | { status: 'present', value: Record<string, unknown> }
    | { status: 'missing' }
    | { status: 'invalid' }

function readStreamToolArgumentsResult(event: Record<string, unknown>): StreamToolArguments {
  for (const key of ['arguments', 'args'] as const) {
    if (!(key in event))
      continue
    const raw = event[key]
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return {
        status: 'present',
        value: raw as Record<string, unknown>,
      }
    }
    if (typeof raw !== 'string' || !raw.trim())
      return { status: 'invalid' }
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          status: 'present',
          value: parsed as Record<string, unknown>,
        }
      }
      return { status: 'invalid' }
    }
    catch {
      return { status: 'invalid' }
    }
  }
  return { status: 'missing' }
}

function readStreamToolArguments(event: Record<string, unknown>) {
  const result = readStreamToolArgumentsResult(event)
  return result.status === 'present'
    ? result.value
    : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isExplicitlyParameterlessTool(tool: Tool | undefined) {
  const parameters = tool?.function.parameters
  if (!isRecord(parameters) || parameters.type !== 'object')
    return false
  if (
    !isRecord(parameters.properties)
    || Object.keys(parameters.properties).length > 0
    || parameters.additionalProperties !== false
  ) {
    return false
  }
  return parameters.required === undefined
    || (Array.isArray(parameters.required) && parameters.required.length === 0)
}

function createProviderToolProtocolError(
  code: 'chat-provider-tool-arguments-invalid'
    | 'chat-provider-parallel-tool-calls',
  message: string,
) {
  return Object.assign(
    new Error(`${code}: ${message}`),
    {
      code,
      name: 'AlicizationProviderProtocolError',
    },
  )
}

function assertProviderToolArguments(
  tool: Tool | undefined,
  input: Record<string, unknown>,
) {
  if (!tool) {
    throw createProviderToolProtocolError(
      'chat-provider-tool-arguments-invalid',
      'Provider requested a tool that was not offered for this model step',
    )
  }

  try {
    const validate = providerToolArgumentsValidator.compile(
      tool.function.parameters,
    )
    if (validate(input))
      return

    throw createProviderToolProtocolError(
      'chat-provider-tool-arguments-invalid',
      `Provider arguments for tool "${tool.function.name}" failed schema validation: ${
        providerToolArgumentsValidator.errorsText(validate.errors, {
          dataVar: 'arguments',
          separator: '; ',
        })
      }`,
    )
  }
  catch (error) {
    if (
      error
      && typeof error === 'object'
      && (error as { code?: unknown }).code === 'chat-provider-tool-arguments-invalid'
    ) {
      throw error
    }
    throw createProviderToolProtocolError(
      'chat-provider-tool-arguments-invalid',
      `Tool "${tool.function.name}" has an invalid parameter schema: ${errorMessageFrom(error)}`,
    )
  }
}

export interface AlicizationMainChatStreamRunnerResult {
  finishReason: string
  fullText: string
  origin: 'provider'
  learningPolicy: {
    allowLongTermCondensation: true
    allowPersonaLearning: true
    allowTraining: false
  }
  failureSurface: null
  memoryEvidence: AlicizationProviderMemoryEvidence | null
  visibleReplyExecution: AlicizationVisibleReplyExecution
  visibleReplyRealization: AlicizationVisibleReplyRealizationArtifact
}

export interface AlicizationMainChatStreamMetaController {
  emit: (reply: string, options?: { force?: boolean }) => void
  getLastReply: () => string
}

interface AlicizationStructuredVisibleReplySettlementInput {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
  visibleReplyRealization?: AlicizationVisibleReplyRealizationArtifact | null
}

export interface RunAlicizationMainChatStreamOptions {
  payload: AlicizationChatStartPayload
  prepared: AlicizationPreparedMainChatExecutionResult
  headers?: Record<string, string>
  controller: AbortController
  firstEventTimeoutMs: number
  providerContinuationTimeoutMs?: number
  isRunActive: () => boolean
  incrementChunkStats: (rawDelta: string) => void
  emitChunk: (payload: AlicizationChatStreamChunkEvent) => void
  emitToolCall: (payload: AlicizationChatToolCallInput) => void
  emitToolResult: (payload: AlicizationChatToolResultInput) => void
  subscribeToolExecutionProgress?: (
    listener: (event: Omit<AlicizationChatToolProgressInput, 'cardId' | 'turnId'>) => void,
  ) => () => void
  streamMeta: AlicizationMainChatStreamMetaController
  nonProgressEventTypes: Set<string>
  generateNonStreaming: (input: {
    chatConfig: AlicizationPreparedMainChatExecutionResult['chatConfig']
    messages: AlicizationPreparedMainChatExecutionResult['messages']
    headers?: Record<string, string>
    tools: AlicizationPreparedMainChatExecutionResult['tools']
    toolChoice: AlicizationPreparedMainChatExecutionResult['toolChoice']
    emotionalKernel?: AlicizationStreamEmotionalKernelShape | null
    timeoutMs: number
    abortSignal?: AbortSignal
    cardId?: string
    turnId?: string
  }) => Promise<{
    finishReason: string
    fullText: string
  }>
  logReminderToolCall?: (input: {
    toolCallId: string
    toolName: string
    argumentsPreview: string
  }) => Promise<void> | void
  logReminderToolResult?: (input: {
    toolCallId: string
    summary: ReturnType<typeof parseReminderToolResultForDebug>
  }) => Promise<void> | void
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void>
  settleStructuredVisibleReply?: (
    input: AlicizationStructuredVisibleReplySettlementInput,
  ) => Promise<AlicizationStructuredVisibleReplySettlementInput | null>
    | AlicizationStructuredVisibleReplySettlementInput
    | null
  delayVisibleRelease?: boolean
  streamTextImpl?: StreamTextInvoker
  turnRuntimeContext?: AlicizationTurnRuntimeContext | null
  providerRetryAttempt?: number
  providerRetryDeadlineAt?: number | null
  providerRetryPolicy?: AlicizationProviderRetryOverrides
}

export type AlicizationMainChatProviderStepResult
  = | {
    kind: 'action'
    action: AlicizationModelAction
  }
  | {
    kind: 'reply'
    finishReason: string
    fullText: string
    text: string
  }

export interface RunAlicizationMainChatProviderStepOptions {
  payload: AlicizationChatStartPayload
  prepared: AlicizationPreparedMainChatExecutionResult
  messages: Message[]
  headers?: Record<string, string>
  controller: AbortController
  signal?: AbortSignal
  firstEventTimeoutMs: number
  providerContinuationTimeoutMs?: number
  providerReaderCancelTimeoutMs?: number
  isRunActive: () => boolean
  nonProgressEventTypes: Set<string>
  emitToolCall: (payload: AlicizationChatToolCallInput) => void
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void>
  streamTextImpl?: StreamTextInvoker
  providerRetryAttempt?: number
  providerRetryDeadlineAt?: number | null
  providerRetryPolicy?: AlicizationProviderRetryOverrides
}

function createProviderProposalTools(tools: Tool[] | undefined) {
  return tools?.map(tool => ({
    ...tool,
    execute: async () => ({
      status: 'proposed',
    }),
  }))
}

function projectRegisteredProviderTools(
  prepared: AlicizationPreparedMainChatExecutionResult,
  providerId: string,
) {
  const activeTools = prepared.tools?.filter((tool) => {
    const manifest = prepared.toolRegistry.resolveAdapterToolName(tool.function.name)
      ?? prepared.toolRegistry.list().find(candidate =>
        candidate.providerToolName === sanitizeText(tool.function.name),
      )
    return Boolean(
      manifest
      && prepared.toolRegistry.resolveActive(manifest.capabilityId),
    )
  })
  return adaptAlicizationProviderTools({
    providerId,
    tools: activeTools,
    resolveProviderToolName: (toolName) => {
      const manifest = prepared.toolRegistry.resolveAdapterToolName(toolName)
        ?? prepared.toolRegistry.list().find(candidate =>
          candidate.providerToolName === sanitizeText(toolName),
        )
      return manifest?.providerToolName
    },
  })
}

function resolveActiveProviderToolManifest(
  prepared: AlicizationPreparedMainChatExecutionResult,
  providerToolName: string,
) {
  const normalizedName = sanitizeText(providerToolName)
  if (!normalizedName)
    return undefined

  const manifest = prepared.toolRegistry.list().find(candidate =>
    candidate.providerToolName === normalizedName,
  )
  return manifest
    ? prepared.toolRegistry.resolveActive(manifest.capabilityId)
    : undefined
}

function appendProviderToolCallMessage(
  messages: Message[],
  input: {
    input: Record<string, unknown>
    toolCallId: string
    toolName: string
  },
) {
  messages.push({
    role: 'assistant',
    content: '',
    tool_calls: [{
      id: input.toolCallId,
      type: 'function',
      function: {
        name: input.toolName,
        arguments: JSON.stringify(input.input),
      },
    }],
  })
}

function createProviderFinishMissingError() {
  return Object.assign(
    new Error('chat-provider-finish-missing: Provider stream reached EOF without a finish event'),
    {
      code: 'chat-provider-finish-missing',
      name: 'AlicizationProviderProtocolError',
    },
  )
}

function createProviderEmptyCompletionError() {
  return Object.assign(
    new Error('Provider completed without a reply or tool action'),
    {
      code: alicizationProviderEmptyCompletionErrorCode,
      name: 'AlicizationProviderProtocolError',
    },
  )
}

export async function runAlicizationMainChatProviderStep(
  input: RunAlicizationMainChatProviderStepOptions,
): Promise<AlicizationMainChatProviderStepResult> {
  const startedAt = Date.now()
  const providerRetryAttempt = input.providerRetryAttempt ?? 0
  const providerRetriesEnabled = input.providerRetryPolicy?.maxRetries === undefined
    || !Number.isFinite(input.providerRetryPolicy.maxRetries)
    || input.providerRetryPolicy.maxRetries > 0
  const providerRetryDeadlineAt = input.providerRetryDeadlineAt !== undefined
    ? input.providerRetryDeadlineAt
    : resolveAlicizationProviderRetryDeadline({
        deadlineAt: input.providerRetryPolicy?.deadlineAt,
        baseDelayMs: input.providerRetryPolicy?.baseDelayMs,
        maxDelayMs: input.providerRetryPolicy?.maxDelayMs,
        maxRetries: input.providerRetryPolicy?.maxRetries,
        maxTotalRetryWindowMs: input.providerRetryPolicy?.maxTotalRetryWindowMs,
        timeoutMs: input.firstEventTimeoutMs,
      })
  const invokeStreamText = input.streamTextImpl ?? (streamText as StreamTextInvoker)
  const providerTools = createProviderProposalTools(projectRegisteredProviderTools(
    input.prepared,
    input.payload.providerId,
  ))
  const toolCallIdentity = input.prepared.toolCallIdentity
    ?? createAlicizationMainChatToolCallIdentityRegistry()
  const providerController = new AbortController()
  const forwardAbort = () => {
    if (!providerController.signal.aborted) {
      providerController.abort(
        input.signal?.reason
        ?? input.controller.signal.reason
        ?? createAbortError('chat-abort'),
      )
    }
  }
  if (input.controller.signal.aborted || input.signal?.aborted) {
    forwardAbort()
  }
  else {
    input.controller.signal.addEventListener('abort', forwardAbort, { once: true })
    input.signal?.addEventListener('abort', forwardAbort, { once: true })
  }

  let outputObserved = false
  let sawAnyEvent = false
  let lastEventType = ''
  let reader: AlicizationProviderStreamReader | null = null
  let readerCompleted = false
  let wakeLegacyEventWaiter: (() => void) | null = null
  let attemptCleanupDone = false
  let firstEventTimeout: ReturnType<typeof setTimeout> | undefined
  let livenessTimeout: ReturnType<typeof setTimeout> | undefined
  let idleTimeout: ReturnType<typeof setTimeout> | undefined
  let continuationTimeout: ReturnType<typeof setTimeout> | undefined
  let providerRetryDeadlineTimeout: ReturnType<typeof setTimeout> | undefined
  let pendingAction: AlicizationModelAction | null = null

  const clearFirstEventWatchdog = () => {
    if (firstEventTimeout) {
      clearTimeout(firstEventTimeout)
      firstEventTimeout = undefined
    }
  }
  const clearLivenessWatchdog = () => {
    if (livenessTimeout) {
      clearTimeout(livenessTimeout)
      livenessTimeout = undefined
    }
  }
  const clearIdleWatchdog = () => {
    if (idleTimeout) {
      clearTimeout(idleTimeout)
      idleTimeout = undefined
    }
  }
  const clearContinuationWatchdog = () => {
    if (continuationTimeout) {
      clearTimeout(continuationTimeout)
      continuationTimeout = undefined
    }
  }
  const clearProviderRetryDeadline = () => {
    if (providerRetryDeadlineTimeout) {
      clearTimeout(providerRetryDeadlineTimeout)
      providerRetryDeadlineTimeout = undefined
    }
  }
  const armContinuationWatchdog = () => {
    clearContinuationWatchdog()
    const providerContinuationTimeoutMs = input.providerContinuationTimeoutMs
    if (!providerContinuationTimeoutMs)
      return
    continuationTimeout = setTimeout(() => {
      if (!providerController.signal.aborted) {
        providerController.abort(createAlicizationMainWatchdogAbortError({
          timeoutPhase: 'idle-timeout',
          timeoutStage: 'provider-continuation',
          timeoutMs: providerContinuationTimeoutMs,
          elapsedMs: Date.now() - startedAt,
          lastEventType: lastEventType || null,
          sawAnyEvent,
          sawProgress: outputObserved,
        }, 'chat-provider-continuation-timeout'))
      }
    }, Math.max(1, providerContinuationTimeoutMs))
  }
  const armLivenessWatchdog = () => {
    clearLivenessWatchdog()
    livenessTimeout = setTimeout(() => {
      if (outputObserved || providerController.signal.aborted)
        return
      providerController.abort(createAlicizationMainWatchdogAbortError({
        timeoutPhase: 'liveness-timeout',
        timeoutStage: 'provider',
        timeoutMs: input.firstEventTimeoutMs,
        elapsedMs: Date.now(),
        lastEventType: lastEventType || null,
        sawAnyEvent,
        sawProgress: outputObserved,
      }, 'chat-provider-liveness-timeout'))
    }, Math.max(1, input.firstEventTimeoutMs))
  }
  const armIdleWatchdog = () => {
    clearIdleWatchdog()
    const providerContinuationTimeoutMs = input.providerContinuationTimeoutMs
    if (!providerContinuationTimeoutMs)
      return
    idleTimeout = setTimeout(() => {
      if (!outputObserved || providerController.signal.aborted)
        return
      providerController.abort(createAlicizationMainWatchdogAbortError({
        timeoutPhase: 'idle-timeout',
        timeoutStage: 'provider',
        timeoutMs: providerContinuationTimeoutMs,
        elapsedMs: Date.now() - startedAt,
        lastEventType: lastEventType || null,
        sawAnyEvent,
        sawProgress: outputObserved,
      }, 'chat-provider-idle-timeout'))
    }, Math.max(1, providerContinuationTimeoutMs))
  }
  firstEventTimeout = setTimeout(() => {
    if (providerController.signal.aborted || outputObserved)
      return
    if (sawAnyEvent) {
      armLivenessWatchdog()
      return
    }
    providerController.abort(createAlicizationMainWatchdogAbortError({
      timeoutPhase: 'first-event-timeout',
      timeoutStage: 'provider',
      timeoutMs: input.firstEventTimeoutMs,
      elapsedMs: Date.now(),
      lastEventType: lastEventType || null,
      sawAnyEvent,
      sawProgress: outputObserved,
    }, 'chat-first-event-timeout'))
  }, Math.max(1, input.firstEventTimeoutMs))
  if (
    providerRetriesEnabled
    && providerRetryDeadlineAt !== null
    && providerRetryDeadlineAt !== undefined
  ) {
    providerRetryDeadlineTimeout = setTimeout(() => {
      if (!providerController.signal.aborted) {
        providerController.abort(createAlicizationMainWatchdogAbortError({
          timeoutPhase: 'idle-timeout',
          timeoutStage: 'provider',
          timeoutMs: Math.max(0, providerRetryDeadlineAt - Date.now()),
          elapsedMs: Date.now(),
          lastEventType: lastEventType || null,
          sawAnyEvent,
          sawProgress: outputObserved,
        }, 'chat-provider-retry-deadline'))
      }
    }, Math.max(0, providerRetryDeadlineAt - Date.now()))
  }

  const appendDebugLine = (event: string, payload: Record<string, unknown>) => {
    if (!input.appendRuntimeDebugLine)
      return
    void input.appendRuntimeDebugLine(event, {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      ...payload,
    })
  }

  const cleanupProviderAttempt = async (reason = 'provider-step-settled') => {
    if (attemptCleanupDone)
      return
    attemptCleanupDone = true
    clearFirstEventWatchdog()
    clearLivenessWatchdog()
    clearIdleWatchdog()
    clearContinuationWatchdog()
    clearProviderRetryDeadline()
    wakeLegacyEventWaiter = null
    input.controller.signal.removeEventListener('abort', forwardAbort)
    input.signal?.removeEventListener('abort', forwardAbort)

    if (reader && !readerCompleted) {
      if (!providerController.signal.aborted)
        providerController.abort(createAbortError(reason))
      try {
        const cancelPromise = reader.cancel?.(providerController.signal.reason)
        if (cancelPromise) {
          let cancelTimeout: ReturnType<typeof setTimeout> | undefined
          await Promise.race([
            Promise.resolve(cancelPromise).catch(() => {}),
            new Promise<void>((resolve) => {
              cancelTimeout = setTimeout(
                resolve,
                Math.max(
                  1,
                  input.providerReaderCancelTimeoutMs
                  ?? providerReaderCancelTimeoutMs,
                ),
              )
            }),
          ])
          if (cancelTimeout)
            clearTimeout(cancelTimeout)
        }
      }
      catch {
        // Cleanup must preserve the Provider error that settled this attempt.
      }
    }

    try {
      reader?.releaseLock?.()
    }
    catch {
      // Cleanup must preserve the Provider error that settled this attempt.
    }
  }

  try {
    if (!input.isRunActive())
      throw createAbortError('chat-run-inactive')

    const queuedEvents: unknown[] = []
    const enqueueLegacyEvent = (event: unknown) => {
      queuedEvents.push(event)
      const wake = wakeLegacyEventWaiter
      wakeLegacyEventWaiter = null
      wake?.()
    }
    const result = await awaitAlicizationPromiseWithAbort(
      Promise.resolve(invokeStreamText({
        ...input.prepared.chatConfig,
        maxSteps: 1,
        messages: input.messages,
        headers: input.headers,
        abortSignal: providerController.signal,
        tools: providerTools,
        toolChoice: input.prepared.toolChoice,
        parallelToolCalls: false,
        onEvent: enqueueLegacyEvent,
      })),
      providerController.signal,
    )
    observeStreamTextResultErrors(result, error => providerController.abort(error))
    const fullStream = readProviderFullStream(result)
    reader = fullStream?.getReader?.() ?? null
    const fullTextParts: string[] = []
    let finishReason: string | null = null
    let finishObserved = false

    const handleEvent = (rawEvent: unknown): AlicizationMainChatProviderStepResult | null => {
      const event = rawEvent && typeof rawEvent === 'object'
        ? rawEvent as Record<string, unknown>
        : {}
      const eventType = normalizeMainGatewayStreamEventType(event.type)
      if (eventType) {
        sawAnyEvent = true
        lastEventType = eventType
      }

      if (isMainGatewayProgressEventType(eventType) && eventType !== 'error') {
        if (!outputObserved)
          clearFirstEventWatchdog()
        clearLivenessWatchdog()
        outputObserved = true
        if (eventType === 'finish') {
          clearIdleWatchdog()
          clearContinuationWatchdog()
        }
        else if (eventType === 'tool-call') {
          clearIdleWatchdog()
          armContinuationWatchdog()
        }
        else {
          armIdleWatchdog()
        }
      }
      else if (eventType && input.nonProgressEventTypes.size < 12) {
        input.nonProgressEventTypes.add(eventType)
        if (outputObserved)
          armIdleWatchdog()
      }

      if (eventType === 'text-delta') {
        fullTextParts.push(readRawTextDelta(event))
        return null
      }

      if (eventType === 'tool-call') {
        if (pendingAction) {
          throw createProviderToolProtocolError(
            'chat-provider-parallel-tool-calls',
            'Provider emitted more than one tool call in a single model step',
          )
        }
        const toolName = sanitizeText(event.toolName ?? event.name)
        if (!toolName)
          throw new TypeError('Provider tool call is missing toolName')
        const toolArguments = readStreamToolArgumentsResult(event)
        const providerTool = providerTools?.find(
          tool => sanitizeText(tool.function.name) === toolName,
        )
        const toolInput = toolArguments.status === 'present'
          ? toolArguments.value
          : toolArguments.status === 'missing'
            && isExplicitlyParameterlessTool(providerTool)
            ? {}
            : null
        if (!toolInput) {
          throw createProviderToolProtocolError(
            'chat-provider-tool-arguments-invalid',
            toolArguments.status === 'invalid'
              ? `Provider emitted invalid JSON arguments for tool "${toolName}"`
              : `Provider omitted required arguments for tool "${toolName}"`,
          )
        }
        assertProviderToolArguments(providerTool, toolInput)
        const providerInvocation = input.prepared.toolRegistry
          .resolveProviderInvocation(toolName, toolInput)
        if (!providerInvocation) {
          throw createProviderToolProtocolError(
            'chat-provider-tool-arguments-invalid',
            `Provider tool "${toolName}" is not registered, is not eligible for this input, or has been revoked`,
          )
        }
        const toolCallId = toolCallIdentity.resolveProviderToolCall({
          arguments: toolInput,
          phase: 'call',
          toolCallId: event.toolCallId,
          toolName,
        })
        pendingAction = {
          actionId: `${input.payload.turnId}:action:${toolCallId}`,
          toolCallId,
          providerToolName: toolName,
          capabilityId: providerInvocation.capabilityId,
          input: toolInput,
        }
        return null
      }

      if (eventType === 'finish') {
        finishObserved = true
        finishReason = sanitizeText(
          event.finishReason ?? event.finish_reason ?? event.reason,
          'stop',
        )
        return null
      }

      if (eventType === 'error')
        throw event.error ?? new Error('chat Provider stream failed')

      return null
    }

    if (reader) {
      while (true) {
        const next = await awaitAlicizationPromiseWithAbort(
          reader.read(),
          providerController.signal,
        )
        if (next.done) {
          readerCompleted = true
          break
        }
        const step = handleEvent(next.value)
        if (step)
          return step
        if (finishObserved)
          break
      }
    }
    else {
      let terminalEventObserved = false
      while (!terminalEventObserved) {
        while (queuedEvents.length > 0) {
          const event = queuedEvents.shift()
          const eventType = normalizeMainGatewayStreamEventType(
            (event as { type?: unknown } | null)?.type,
          )
          const step = handleEvent(event)
          if (step)
            return step
          if (eventType === 'finish')
            terminalEventObserved = true
        }
        if (terminalEventObserved)
          break

        await awaitAlicizationPromiseWithAbort(
          new Promise<void>((resolve) => {
            if (queuedEvents.length > 0) {
              resolve()
              return
            }
            wakeLegacyEventWaiter = resolve
          }),
          providerController.signal,
        )
      }
    }

    const fullText = fullTextParts.join('')
    const text = fullText.trim()
    if (!finishObserved)
      throw createProviderFinishMissingError()
    const completedAction = pendingAction as (
      AlicizationModelAction & {
        input: Record<string, unknown>
        toolCallId: string
      }
    ) | null
    if (completedAction) {
      appendProviderToolCallMessage(input.messages, {
        input: completedAction.input,
        toolCallId: completedAction.toolCallId,
        toolName: completedAction.providerToolName,
      })
      input.emitToolCall({
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        toolCallId: completedAction.toolCallId,
        toolName: completedAction.providerToolName,
        arguments: completedAction.input,
      })
      return {
        kind: 'action',
        action: completedAction,
      }
    }
    if (!text && !outputObserved)
      throw createAbortError('chat-first-event-timeout')
    if (!text)
      throw createProviderEmptyCompletionError()

    return {
      kind: 'reply',
      finishReason: finishReason ?? 'stop',
      fullText,
      text,
    }
  }
  catch (error) {
    const retryDecision = resolveAlicizationProviderRetryDecision(error, {
      attempt: providerRetryAttempt,
      options: {
        ...input.providerRetryPolicy,
        operation: 'main-chat-stream',
        signal: input.signal ?? input.controller.signal,
        deadlineAt: providerRetryDeadlineAt,
        replayState: {
          // Provider-step text is still provisional. The EventLoop settles and
          // publishes it only after the complete payload passes visible-reply
          // validation, so a partial delta has not become user-visible yet.
          hasVisibleProgress: false,
          hasToolCall: pendingAction !== null,
          hasToolSideEffect: false,
        },
      },
    })
    if (!retryDecision.retry)
      throw error

    appendDebugLine('chat-provider-step.retry-scheduled', {
      attempt: providerRetryAttempt,
      nextAttempt: retryDecision.nextAttempt,
      delayMs: retryDecision.delayMs,
      reason: retryDecision.reason,
    })
    await cleanupProviderAttempt('provider-retry')
    await waitForAlicizationProviderRetry({
      delayMs: retryDecision.delayMs,
      signal: input.signal ?? input.controller.signal,
      sleep: input.providerRetryPolicy?.sleep,
    })
    return await runAlicizationMainChatProviderStep({
      ...input,
      providerRetryAttempt: retryDecision.nextAttempt,
      providerRetryDeadlineAt,
    })
  }
  finally {
    await cleanupProviderAttempt()
  }
}

function buildPublicCriticSummary(
  critic: AlicizationVisibleReplyCriticArtifact | null | undefined,
) {
  if (!critic)
    return null

  return {
    version: 'visible-reply-critic-public-summary-v1' as const,
    status: critic.status,
    providerMindRequired: critic.providerMindRequired,
    reasonCodes: [...critic.reasonCodes],
  }
}

function buildPublicClosureSummary(
  closure: AlicizationVisibleReplyClosureArtifact | null | undefined,
) {
  if (!closure)
    return null

  return {
    version: 'visible-reply-closure-public-summary-v1' as const,
    status: closure.status,
    reasonCodes: [...closure.reasonCodes],
    initialCriticStatus: closure.initialCritic?.status ?? null,
    finalCriticStatus: closure.finalCritic?.status ?? null,
  }
}

function buildObservedVisibleReplyRealization(input: {
  visibleText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
}): AlicizationVisibleReplyRealizationArtifact {
  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority: input.visibleReplyExecution.actualVisibleReplyAuthority,
    providerMindExecuted: input.visibleReplyExecution.providerMindExecuted,
    mode: input.visibleReplyExecution.mode,
    visibleText: input.visibleText,
    visibleReplyValidationStatus: 'approved',
    nonHumanAuthoredStatus: null,
    blockedReasons: [],
    reason: input.visibleReplyExecution.reason,
    critic: buildPublicCriticSummary(input.critic),
    closure: buildPublicClosureSummary(input.closure),
  }
}

function assertProviderVisibleReplyExecution(
  execution: AlicizationVisibleReplyExecution,
  closure: AlicizationVisibleReplyClosureArtifact | null,
) {
  if (
    execution.providerMindExecuted === true
    && execution.actualVisibleReplyAuthority === 'llm-mind'
  ) {
    return
  }

  throw new AlicizationVisibleReplySettlementBlockedError(
    'provider-visible-reply-authority-invalid',
    closure,
  )
}

function createProviderResult(input: {
  finishReason: string
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  visibleReplyRealization: AlicizationVisibleReplyRealizationArtifact
  memoryUsage: Parameters<typeof createAlicizationProviderVisibleArtifact>[0]['memoryUsage']
  memoryEvidence: AlicizationProviderMemoryEvidence | null
}) {
  const artifact = createAlicizationProviderVisibleArtifact({
    reply: input.visibleReplyRealization.visibleText ?? '',
    memoryUsage: input.memoryUsage,
  })

  return {
    finishReason: input.finishReason,
    fullText: input.fullText,
    origin: artifact.origin,
    learningPolicy: {
      allowLongTermCondensation: artifact.allowLongTermCondensation,
      allowPersonaLearning: artifact.allowPersonaLearning,
      allowTraining: artifact.allowTraining,
    },
    failureSurface: null,
    memoryEvidence: input.memoryEvidence,
    visibleReplyExecution: input.visibleReplyExecution,
    visibleReplyRealization: input.visibleReplyRealization,
  } satisfies AlicizationMainChatStreamRunnerResult
}

export async function runAlicizationMainChatStream(
  input: RunAlicizationMainChatStreamOptions,
): Promise<AlicizationMainChatStreamRunnerResult> {
  const providerMessages = input.prepared.messages
  const normalizedPayload = input.payload
  const providerTools = projectRegisteredProviderTools(
    input.prepared,
    normalizedPayload.providerId,
  )
  const providerRetryAttempt = input.providerRetryAttempt ?? 0
  const providerRetriesEnabled = input.providerRetryPolicy?.maxRetries === undefined
    || !Number.isFinite(input.providerRetryPolicy.maxRetries)
    || input.providerRetryPolicy.maxRetries > 0
  const providerRetryDeadlineAt = input.providerRetryDeadlineAt !== undefined
    ? input.providerRetryDeadlineAt
    : resolveAlicizationProviderRetryDeadline({
        deadlineAt: input.providerRetryPolicy?.deadlineAt,
        baseDelayMs: input.providerRetryPolicy?.baseDelayMs,
        maxDelayMs: input.providerRetryPolicy?.maxDelayMs,
        maxRetries: input.providerRetryPolicy?.maxRetries,
        maxTotalRetryWindowMs: input.providerRetryPolicy?.maxTotalRetryWindowMs,
        timeoutMs: input.firstEventTimeoutMs,
      })
  const offeredToolNames = Array.isArray(providerTools)
    ? providerTools.map(tool => sanitizeText(tool.function?.name)).filter(Boolean)
    : []
  const originalToolNames = Array.isArray(input.prepared.tools)
    ? input.prepared.tools.map(tool => sanitizeText(tool.function?.name)).filter(Boolean)
    : []
  const omittedToolNames = originalToolNames.filter(toolName => !offeredToolNames.includes(toolName))
  const turnRuntime = createAlicizationTurnRuntime()
  const reminderToolCallIds = new Set<string>()
  const announcedToolCallIds = new Set<string>()
  const toolNamesById = new Map<string, string>()
  const toolCallIdentity = input.prepared.toolCallIdentity
    ?? createAlicizationMainChatToolCallIdentityRegistry()
  const startedAt = Date.now()
  let lastEventType = ''
  const appendStreamDebugLine = (event: string, payload: Record<string, unknown>) => {
    if (!input.appendRuntimeDebugLine)
      return
    void input.appendRuntimeDebugLine(event, {
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      ...payload,
    })
  }

  const markProviderStreamPhase = (
    phase: AlicizationProviderStreamPhase,
    event: string,
    payload: Record<string, unknown> = {},
  ) => {
    appendStreamDebugLine(event, {
      elapsedMs: Date.now() - startedAt,
      streamPhase: phase,
      ...payload,
    })
  }

  const settleVisibleReplyLifecycle = (
    surface: AlicizationVisibleReplyRealizationArtifact,
  ) => {
    if (!input.turnRuntimeContext)
      return
    turnRuntime.settleSurface({
      context: input.turnRuntimeContext,
      surface,
    })
    turnRuntime.settleDelivery({
      context: input.turnRuntimeContext,
      surface,
    })
  }

  const emitProviderVisibleReply = (
    visibleText: string,
    memoryUsage: Parameters<typeof createAlicizationProviderVisibleArtifact>[0]['memoryUsage'],
  ) => {
    if (!visibleText || !input.isRunActive())
      return

    const artifact = createAlicizationProviderVisibleArtifact({
      reply: visibleText,
      memoryUsage,
    })
    input.incrementChunkStats(visibleText)
    input.emitChunk({
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      text: visibleText,
      origin: artifact.origin,
      learningPolicy: {
        allowLongTermCondensation: artifact.allowLongTermCondensation,
        allowPersonaLearning: artifact.allowPersonaLearning,
        allowTraining: artifact.allowTraining,
      },
      failureSurface: null,
    })
    if (shouldEmitAlicizationChatMetaUpdate({
      delta: visibleText,
      reply: visibleText,
      previousReply: input.streamMeta.getLastReply(),
    })) {
      input.streamMeta.emit(visibleText)
    }
  }

  const settleObservedReply = async (inputSurface: {
    fullText: string
    visibleText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
  }): Promise<AlicizationVisibleReplyRealizationArtifact> => {
    const settled = await input.settleStructuredVisibleReply?.({
      fullText: inputSurface.fullText,
      visibleReplyExecution: inputSurface.visibleReplyExecution,
    }) ?? null
    const critic = settled?.critic ?? null
    const closure = settled?.closure ?? null

    assertProviderVisibleReplyExecution(inputSurface.visibleReplyExecution, closure)

    return buildObservedVisibleReplyRealization({
      visibleText: inputSurface.visibleText,
      visibleReplyExecution: inputSurface.visibleReplyExecution,
      critic,
      closure,
    })
  }

  if (input.prepared.hasVisualGrounding) {
    const visualOneShot = await input.generateNonStreaming({
      chatConfig: input.prepared.chatConfig,
      messages: providerMessages,
      headers: input.headers,
      tools: providerTools,
      toolChoice: input.prepared.toolChoice,
      timeoutMs: input.firstEventTimeoutMs,
      abortSignal: input.controller.signal,
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
    })
    const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: input.prepared,
      mode: 'provider-one-shot',
      providerMindExecuted: true,
      reason: 'visual-grounding-one-shot',
    })
    const rawFullText = visualOneShot.fullText || ''
    const validation = validateAlicizationProviderSettlementPayload({
      fullText: rawFullText,
      prepared: input.prepared,
      allowPlainTextProviderReply: true,
    })
    const validatedPayload = validation.payload
    if (!validation.valid || !validatedPayload) {
      throw new AlicizationVisibleReplySettlementBlockedError(
        `provider-settlement-invalid:${validation.issues.join(',')}`,
        null,
      )
    }
    const visibleReplyRealization = await settleObservedReply({
      fullText: rawFullText,
      visibleText: validatedPayload.reply,
      visibleReplyExecution,
    })

    emitProviderVisibleReply(
      validatedPayload.reply,
      validatedPayload.memoryUsage,
    )
    settleVisibleReplyLifecycle(visibleReplyRealization)

    return createProviderResult({
      finishReason: visualOneShot.finishReason || 'stop',
      fullText: rawFullText,
      visibleReplyExecution,
      visibleReplyRealization,
      memoryUsage: validatedPayload.memoryUsage,
      memoryEvidence: validatedPayload.memoryEvidence,
    })
  }

  const invokeStreamText = input.streamTextImpl ?? (streamText as StreamTextInvoker)
  let finishReason = 'stop'
  let fullText = ''
  let sawProgressEvent = false
  let pendingProgressEventObserved = false
  let pendingProgressDebugEmitted = false
  let sawAnyEvent = false
  let firstEventGraceApplied = false
  let sawToolExecutionProgress = false
  let unsubscribeToolExecutionProgress: (() => void) | undefined
  const toolExecutionFailureState: {
    failure: NonNullable<ReturnType<typeof extractAlicizationToolExecutionFailure>> | null
  } = {
    failure: null,
  }
  const emittedToolResultIds = new Set<string>()
  const activeProviderToolCallIds = new Set<string>()
  const emitToolResultOnce = (toolCallId: string, toolName: string, result: unknown) => {
    if (!toolCallId || emittedToolResultIds.has(toolCallId))
      return false
    emittedToolResultIds.add(toolCallId)
    input.emitToolResult({
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      toolCallId,
      toolName,
      result,
    })
    return true
  }
  const providerToolsForExecution = providerTools?.map((providerTool) => {
    if (typeof providerTool.execute !== 'function')
      return providerTool

    return {
      ...providerTool,
      execute: async (toolInput: unknown, executeOptions: Record<string, unknown>) => {
        const result = await providerTool.execute(toolInput as never, executeOptions as never)
        const toolName = sanitizeText(providerTool.function?.name) || 'tool'
        const failure = isAlicizationToolExecutionFailureResult(result)
          ? extractAlicizationToolExecutionFailure(result, toolName)
          : null
        if (!failure && !isTerminalToolResult(result))
          return result

        const toolCallId = toolCallIdentity.resolveToolResult({
          arguments: toolInput && typeof toolInput === 'object' && !Array.isArray(toolInput)
            ? toolInput as Record<string, unknown>
            : undefined,
          result,
          toolCallId: sanitizeText(executeOptions.toolCallId),
          toolName,
        })
        toolNamesById.set(toolCallId, toolName)
        if (failure)
          toolExecutionFailureState.failure ??= failure
        emitToolResultOnce(toolCallId, toolName, result)

        const terminalFailure = failure ?? {
          code: 'TOOL_EXECUTION_TERMINAL',
          message: `Tool "${toolName}" returned a terminal result.`,
          toolName,
        }
        throw createAlicizationToolExecutionError(terminalFailure)
      },
    }
  })
  const providerController = new AbortController()
  const forwardTurnAbort = () => {
    if (!providerController.signal.aborted) {
      providerController.abort(
        input.controller.signal.reason ?? createAbortError('chat-abort'),
      )
    }
  }
  if (input.controller.signal.aborted)
    forwardTurnAbort()
  else
    input.controller.signal.addEventListener('abort', forwardTurnAbort, { once: true })
  const providerRetryDeadlineTimeout
    = providerRetriesEnabled
      && providerRetryDeadlineAt !== null
      && providerRetryDeadlineAt !== undefined
      ? setTimeout(() => {
          if (!providerController.signal.aborted)
            providerController.abort(createAbortError('chat-provider-retry-deadline'))
        }, Math.max(0, providerRetryDeadlineAt - Date.now()))
      : undefined
  const firstEventGraceTimeoutMs = Math.max(
    1_000,
    Math.min(12_000, Math.floor(input.firstEventTimeoutMs * 0.2)),
  )
  const providerContinuationTimeoutMs
    = input.providerContinuationTimeoutMs ?? input.firstEventTimeoutMs
  appendStreamDebugLine('chat-stream.invoke-stream-text', {
    elapsedMs: 0,
    firstEventTimeoutMs: input.firstEventTimeoutMs,
    firstEventGraceTimeoutMs,
    providerContinuationTimeoutMs,
    hasVisualGrounding: input.prepared.hasVisualGrounding,
    messageCount: providerMessages.length,
    toolCount: Array.isArray(providerTools) ? providerTools.length : 0,
    omittedToolNames,
    waitForTools: input.prepared.waitForTools,
  })
  markProviderStreamPhase('requesting', 'chat-stream.request-started', {
    messageBytes: Buffer.byteLength(JSON.stringify(providerMessages)),
    toolBytes: Buffer.byteLength(JSON.stringify(providerTools ?? [])),
    toolCount: Array.isArray(providerTools) ? providerTools.length : 0,
  })

  try {
    await new Promise<void>((resolve, reject) => {
      let providerDeadline: ReturnType<typeof setTimeout> | null = null
      let settled = false
      let providerContinuationState: 'none' | 'awaiting-progress' | 'streaming' = 'none'
      const pendingToolResultHandoffIds = new Set<string>()
      let activeFullStreamReader: AlicizationProviderStreamReader | null = null
      const clearProviderDeadline = () => {
        if (!providerDeadline)
          return
        clearTimeout(providerDeadline)
        providerDeadline = null
      }
      const cancelActiveFullStreamReader = (reason: unknown) => {
        const reader = activeFullStreamReader
        if (!reader?.cancel)
          return
        activeFullStreamReader = null
        void reader.cancel(reason).catch(() => {})
      }
      const createProviderWatchdogError = (
        timeoutReason: import('./turn-os/runtime-errors').AlicizationRuntimeTimeoutReason,
        timeoutPhase: 'first-event-timeout' | 'liveness-timeout' | 'idle-timeout',
        timeoutStage: 'provider' | 'tool-execution' | 'provider-continuation',
        timeoutMs: number,
      ) => createAlicizationMainWatchdogAbortError({
        timeoutPhase,
        timeoutStage,
        timeoutMs,
        elapsedMs: Date.now() - startedAt,
        lastEventType: lastEventType || null,
        sawAnyEvent,
        sawProgress: sawProgressEvent || pendingProgressEventObserved,
      }, timeoutReason)
      const armProviderDeadline = (
        delayMs: number,
        reason: 'initial' | 'grace' | 'liveness' | 'idle' | 'tool-result' | 'continuation',
      ) => {
        clearProviderDeadline()
        providerDeadline = setTimeout(() => {
          if (settled || !input.isRunActive())
            return

          if (reason === 'continuation') {
            if (providerContinuationState === 'none')
              return
            appendStreamDebugLine('chat-stream.provider-continuation-timeout-fired', {
              elapsedMs: Date.now() - startedAt,
              lastEventType: lastEventType || null,
              continuationState: providerContinuationState,
            })
            markProviderStreamPhase('failed', 'chat-stream.timeout-fired', {
              timeoutPhase: reason,
              lastEventType: lastEventType || null,
            })
            const timeoutError = createProviderWatchdogError(
              'chat-provider-continuation-timeout',
              'idle-timeout',
              'provider-continuation',
              providerContinuationTimeoutMs,
            )
            if (!providerController.signal.aborted) {
              providerController.abort(timeoutError)
              return
            }
            rejectOnce(timeoutError)
            return
          }

          if (reason === 'tool-result') {
            if (pendingToolResultHandoffIds.size === 0)
              return
            appendStreamDebugLine('chat-stream.tool-result-handoff-timeout-fired', {
              elapsedMs: Date.now() - startedAt,
              lastEventType: lastEventType || null,
            })
            markProviderStreamPhase('failed', 'chat-stream.timeout-fired', {
              timeoutPhase: reason,
              lastEventType: lastEventType || null,
            })
            const timeoutError = createProviderWatchdogError(
              'chat-tool-result-handoff-timeout',
              'idle-timeout',
              'tool-execution',
              providerContinuationTimeoutMs,
            )
            if (!providerController.signal.aborted) {
              providerController.abort(timeoutError)
              return
            }
            rejectOnce(timeoutError)
            return
          }

          if (reason === 'liveness') {
            if (sawProgressEvent || pendingProgressEventObserved)
              return
            appendStreamDebugLine('chat-stream.provider-liveness-timeout-fired', {
              elapsedMs: Date.now() - startedAt,
              lastEventType: lastEventType || null,
              sawAnyEvent,
              sawProgress: sawProgressEvent || pendingProgressEventObserved,
              nonProgressEventTypes: [...input.nonProgressEventTypes],
            })
            markProviderStreamPhase('failed', 'chat-stream.timeout-fired', {
              timeoutPhase: 'liveness',
              timeoutReason: 'chat-provider-liveness-timeout',
              sawAnyEvent,
              lastEventType: lastEventType || null,
            })
            const timeoutError = createProviderWatchdogError(
              'chat-provider-liveness-timeout',
              'liveness-timeout',
              'provider',
              input.firstEventTimeoutMs,
            )
            if (!providerController.signal.aborted) {
              providerController.abort(timeoutError)
              return
            }
            rejectOnce(timeoutError)
            return
          }

          if (reason === 'idle') {
            if (!sawProgressEvent && !pendingProgressEventObserved)
              return
            appendStreamDebugLine('chat-stream.provider-idle-timeout-fired', {
              elapsedMs: Date.now() - startedAt,
              lastEventType: lastEventType || null,
              sawAnyEvent,
              sawProgress: sawProgressEvent || pendingProgressEventObserved,
            })
            markProviderStreamPhase('failed', 'chat-stream.timeout-fired', {
              timeoutPhase: 'idle',
              timeoutReason: 'chat-provider-idle-timeout',
              sawAnyEvent,
              lastEventType: lastEventType || null,
            })
            const timeoutError = createProviderWatchdogError(
              'chat-provider-idle-timeout',
              'idle-timeout',
              'provider',
              providerContinuationTimeoutMs,
            )
            if (!providerController.signal.aborted) {
              providerController.abort(timeoutError)
              return
            }
            rejectOnce(timeoutError)
            return
          }

          if (sawProgressEvent || pendingProgressEventObserved)
            return

          if (reason === 'initial' && sawAnyEvent && !firstEventGraceApplied) {
            firstEventGraceApplied = true
            appendStreamDebugLine('chat-stream.first-event-timeout-grace-armed', {
              elapsedMs: Date.now() - startedAt,
              graceTimeoutMs: firstEventGraceTimeoutMs,
              lastEventType: lastEventType || null,
              nonProgressEventTypes: [...input.nonProgressEventTypes],
            })
            armProviderDeadline(firstEventGraceTimeoutMs, 'grace')
            return
          }

          if (reason === 'grace') {
            appendStreamDebugLine('chat-stream.first-event-timeout-fired', {
              elapsedMs: Date.now() - startedAt,
              timeoutPhase: reason,
              timeoutReason: 'chat-provider-liveness-timeout',
              sawAnyEvent,
              firstEventGraceApplied,
              lastEventType: lastEventType || null,
              nonProgressEventTypes: [...input.nonProgressEventTypes],
            })
            appendStreamDebugLine('chat-stream.provider-liveness-timeout-fired', {
              elapsedMs: Date.now() - startedAt,
              lastEventType: lastEventType || null,
              sawAnyEvent,
              sawProgress: false,
              nonProgressEventTypes: [...input.nonProgressEventTypes],
            })
            markProviderStreamPhase('failed', 'chat-stream.timeout-fired', {
              timeoutPhase: 'liveness',
              timeoutReason: 'chat-provider-liveness-timeout',
              sawAnyEvent,
              lastEventType: lastEventType || null,
            })
            const timeoutError = createProviderWatchdogError(
              'chat-provider-liveness-timeout',
              'liveness-timeout',
              'provider',
              firstEventGraceTimeoutMs,
            )
            if (!providerController.signal.aborted) {
              providerController.abort(timeoutError)
              return
            }
            rejectOnce(timeoutError)
            return
          }

          appendStreamDebugLine('chat-stream.first-event-timeout-fired', {
            elapsedMs: Date.now() - startedAt,
            timeoutPhase: reason,
            sawAnyEvent,
            firstEventGraceApplied,
            lastEventType: lastEventType || null,
            nonProgressEventTypes: [...input.nonProgressEventTypes],
          })
          markProviderStreamPhase('failed', 'chat-stream.timeout-fired', {
            timeoutPhase: reason,
            sawAnyEvent,
            lastEventType: lastEventType || null,
          })
          const timeoutError = createProviderWatchdogError(
            'chat-first-event-timeout',
            'first-event-timeout',
            'provider',
            input.firstEventTimeoutMs,
          )
          if (!providerController.signal.aborted) {
            providerController.abort(timeoutError)
            return
          }
          rejectOnce(timeoutError)
        }, delayMs)
      }
      armProviderDeadline(input.firstEventTimeoutMs, 'initial')

      unsubscribeToolExecutionProgress = input.subscribeToolExecutionProgress?.((event) => {
        if (settled || !input.isRunActive())
          return

        sawToolExecutionProgress = true
        const toolName = sanitizeText(event.toolName) || 'tool'
        const toolCallId = toolCallIdentity.resolveProgressToolCall({
          toolCallId: event.toolCallId,
          toolName,
        })
        const progressSignal = event.signal
          ?? (event.phase === 'completed'
            || event.phase === 'failed'
            || event.phase === 'cancelled'
            || event.phase === 'timeout'
            ? 'terminal'
            : 'semantic-progress')
        appendStreamDebugLine('chat-stream.tool-progress-observed', {
          elapsedMs: Date.now() - startedAt,
          toolCallId,
          toolName: toolName || null,
          signal: progressSignal,
          phase: event.phase,
          toolElapsedMs: event.elapsedMs,
          timeoutMs: event.timeoutMs ?? null,
          adapterEventType: sanitizeText(event.adapterEventType) || null,
          summary: sanitizeBriefText(sanitizeText(event.summary), 220) || null,
          errorCode: sanitizeText(event.errorCode) || null,
          errorMessage: sanitizeBriefText(sanitizeText(event.errorMessage), 320) || null,
        })

        if (progressSignal !== 'terminal') {
          markProviderStreamPhase('tool-running', 'chat-stream.tool-execution-active', {
            toolCallId: sanitizeText(event.toolCallId) || null,
            toolName,
            signal: progressSignal,
            phase: event.phase,
          })
          return
        }

        const terminalProgressFailure = event.phase === 'failed'
          || event.phase === 'cancelled'
          || event.phase === 'timeout'
          ? extractAlicizationToolExecutionFailure({
              failureKind: 'tool-execution',
              continuationPolicy: 'stop',
              status: event.phase === 'cancelled' ? 'cancelled' : 'failed',
              toolName,
              errorCode: sanitizeText(event.errorCode)
                || (event.phase === 'timeout' ? 'TOOL_EXECUTION_TIMEOUT' : 'TOOL_EXECUTION_FAILED'),
              errorMessage: sanitizeText(event.errorMessage)
                || sanitizeText(event.summary)
                || `Tool execution ${event.phase}.`,
            }, toolName)
          : null
        if (terminalProgressFailure) {
          activeProviderToolCallIds.delete(toolCallId)
          toolExecutionFailureState.failure ??= terminalProgressFailure
          pendingToolResultHandoffIds.clear()
          markProviderStreamPhase('failed', 'chat-stream.tool-execution-failed', {
            toolCallId,
            toolName,
            phase: event.phase,
            errorCode: terminalProgressFailure.code,
            errorMessage: terminalProgressFailure.message,
          })
          if (!providerController.signal.aborted) {
            providerController.abort(createAlicizationToolExecutionError(terminalProgressFailure))
          }
          return
        }

        activeProviderToolCallIds.delete(toolCallId)
        pendingToolResultHandoffIds.add(toolCallId)
        markProviderStreamPhase('requesting', 'chat-stream.tool-result-handoff-started', {
          toolCallId,
          toolName,
          phase: event.phase,
          timeoutMs: providerContinuationTimeoutMs,
        })
        armProviderDeadline(providerContinuationTimeoutMs, 'tool-result')
      })

      const abortHandler = () => {
        clearProviderDeadline()
        cancelActiveFullStreamReader(
          providerController.signal.reason ?? createAbortError('chat-abort'),
        )
        input.controller.signal.removeEventListener('abort', forwardTurnAbort)
        markProviderStreamPhase('failed', 'chat-stream.request-aborted', {
          reason: errorMessageFrom(providerController.signal.reason)
            ?? String(providerController.signal.reason ?? 'chat-abort'),
        })
        rejectOnce(providerController.signal.reason ?? createAbortError('chat-abort'))
      }
      if (providerController.signal.aborted) {
        input.controller.signal.removeEventListener('abort', forwardTurnAbort)
        reject(providerController.signal.reason ?? createAbortError('chat-abort'))
        return
      }
      providerController.signal.addEventListener('abort', abortHandler, { once: true })

      const resolveOnce = () => {
        if (settled)
          return
        settled = true
        clearProviderDeadline()
        providerController.signal.removeEventListener('abort', abortHandler)
        input.controller.signal.removeEventListener('abort', forwardTurnAbort)
        resolve()
      }
      function rejectOnce(nextError: unknown) {
        if (settled)
          return
        settled = true
        clearProviderDeadline()
        providerController.signal.removeEventListener('abort', abortHandler)
        input.controller.signal.removeEventListener('abort', forwardTurnAbort)
        reject(nextError)
      }
      const rejectInvocation = (nextError: unknown) => {
        if (settled || !input.isRunActive())
          return
        if (toolExecutionFailureState.failure) {
          rejectOnce(createAlicizationToolExecutionError(toolExecutionFailureState.failure))
          return
        }
        appendStreamDebugLine('chat-stream.invoke-rejected', {
          elapsedMs: Date.now() - startedAt,
          lastEventType: lastEventType || null,
          reason: errorMessageFrom(nextError) ?? String(nextError),
        })
        rejectOnce(nextError)
      }

      async function handleProviderEvent(event: any) {
        if (settled || providerController.signal.aborted)
          return
        const rawEventType = sanitizeText(event?.type)
        const eventType = normalizeMainGatewayStreamEventType(rawEventType)
        const wasFirstEvent = !sawAnyEvent
        if (eventType)
          sawAnyEvent = true
        lastEventType = rawEventType || eventType
        if (wasFirstEvent && eventType) {
          markProviderStreamPhase('provider-progress', 'chat-stream.first-event', {
            eventType,
          })
        }

        if (isMainGatewayProgressEventType(eventType)) {
          const isProviderContinuationEvidence = eventType === 'text-delta'
            || eventType === 'reasoning-delta'
            || eventType === 'tool-call-streaming-start'
            || eventType === 'tool-call-delta'
            || eventType === 'tool-call'
          if (providerContinuationState !== 'none' && isProviderContinuationEvidence) {
            const wasAwaitingProgress = providerContinuationState === 'awaiting-progress'
            providerContinuationState = 'streaming'
            armProviderDeadline(providerContinuationTimeoutMs, 'continuation')
            if (wasAwaitingProgress) {
              markProviderStreamPhase('provider-progress', 'chat-stream.provider-continuation-progress', {
                eventType,
              })
            }
          }
          else if (providerContinuationState === 'none') {
            clearProviderDeadline()
          }
          if (!sawProgressEvent && !pendingProgressDebugEmitted) {
            appendStreamDebugLine('chat-stream.first-progress-event', {
              elapsedMs: Date.now() - startedAt,
              eventType,
            })
          }
          sawProgressEvent = true
          pendingProgressEventObserved = false
          if (
            providerContinuationState === 'none'
            && eventType !== 'tool-call'
            && eventType !== 'tool-call-streaming-start'
            && eventType !== 'tool-call-delta'
            && eventType !== 'tool-result'
            && eventType !== 'finish'
          ) {
            armProviderDeadline(providerContinuationTimeoutMs, 'idle')
          }
        }
        else if (eventType && input.nonProgressEventTypes.size < 12) {
          const previousSize = input.nonProgressEventTypes.size
          input.nonProgressEventTypes.add(eventType)
          if (input.nonProgressEventTypes.size !== previousSize) {
            appendStreamDebugLine('chat-stream.non-progress-event', {
              elapsedMs: Date.now() - startedAt,
              eventType,
              observedNonProgressCount: input.nonProgressEventTypes.size,
            })
          }
          if (sawProgressEvent && providerContinuationState === 'none')
            armProviderDeadline(providerContinuationTimeoutMs, 'idle')
        }

        if (eventType === 'text-delta') {
          if (!input.isRunActive() || toolExecutionFailureState.failure)
            return
          fullText += readRawTextDelta(event)
          return
        }

        if (eventType === 'tool-call') {
          if (!input.isRunActive() || toolExecutionFailureState.failure)
            return
          if (providerContinuationState !== 'none')
            clearProviderDeadline()
          const observedToolName = sanitizeText(event.toolName ?? event.name)
          const providerTool = providerTools?.find(
            tool => sanitizeText(tool.function.name) === observedToolName,
          )
          const toolArgumentsResult = readStreamToolArgumentsResult(event)
          const toolInput = toolArgumentsResult.status === 'present'
            ? toolArgumentsResult.value
            : toolArgumentsResult.status === 'missing'
              && isExplicitlyParameterlessTool(providerTool)
              ? {}
              : null
          if (!toolInput) {
            throw createProviderToolProtocolError(
              'chat-provider-tool-arguments-invalid',
              toolArgumentsResult.status === 'invalid'
                ? `Provider emitted invalid JSON arguments for tool "${observedToolName}"`
                : `Provider omitted required arguments for tool "${observedToolName}"`,
            )
          }
          assertProviderToolArguments(providerTool, toolInput)
          const providerInvocation = input.prepared.toolRegistry
            .resolveProviderInvocation(observedToolName, toolInput)
          if (!providerInvocation) {
            throw createProviderToolProtocolError(
              'chat-provider-tool-arguments-invalid',
              `Provider tool "${observedToolName}" is not registered, is not eligible for this input, or has been revoked`,
            )
          }
          markProviderStreamPhase('tool-running', 'chat-stream.tool-execution-started', {
            toolName: observedToolName || null,
            toolCallId: sanitizeText(event.toolCallId) || null,
          })
          const providedToolCallId = sanitizeText(event.toolCallId)
          const toolArguments = toolInput
          const toolCallId = toolCallIdentity.resolveProviderToolCall({
            arguments: toolArguments,
            phase: 'call',
            toolCallId: providedToolCallId,
            toolName: observedToolName,
          })
          if (toolCallId && observedToolName)
            toolNamesById.set(toolCallId, observedToolName)
          activeProviderToolCallIds.add(toolCallId)
          if (observedToolName === 'set_reminder') {
            if (toolCallId)
              reminderToolCallIds.add(toolCallId)
            await input.logReminderToolCall?.({
              toolCallId,
              toolName: observedToolName,
              argumentsPreview: sanitizeBriefText(JSON.stringify(toolArguments ?? {}), 200),
            })
          }
          if (!announcedToolCallIds.has(toolCallId)) {
            announcedToolCallIds.add(toolCallId)
            input.emitToolCall({
              cardId: normalizedPayload.cardId,
              turnId: normalizedPayload.turnId,
              toolCallId,
              toolName: observedToolName,
              arguments: toolArguments,
            })
          }
          return
        }

        if (eventType === 'tool-call-streaming-start') {
          if (!input.isRunActive() || toolExecutionFailureState.failure)
            return
          if (providerContinuationState !== 'none')
            clearProviderDeadline()
          const toolName = sanitizeText(event.toolName ?? event.name)
          if (!resolveActiveProviderToolManifest(input.prepared, toolName)) {
            throw createProviderToolProtocolError(
              'chat-provider-tool-arguments-invalid',
              `Provider tool "${toolName}" is not registered, is not eligible for this input, or has been revoked`,
            )
          }
          markProviderStreamPhase('tool-argument-streaming', 'chat-stream.tool-argument-started', {
            toolName: toolName || null,
            toolCallId: sanitizeText(event.toolCallId) || null,
          })
          const providedToolCallId = sanitizeText(event.toolCallId)
          const toolCallId = toolCallIdentity.resolveProviderToolCall({
            phase: 'streaming-start',
            toolCallId: providedToolCallId,
            toolName,
          })
          if (announcedToolCallIds.has(toolCallId))
            return
          toolNamesById.set(toolCallId, toolName)
          activeProviderToolCallIds.add(toolCallId)
          announcedToolCallIds.add(toolCallId)
          input.emitToolCall({
            cardId: normalizedPayload.cardId,
            turnId: normalizedPayload.turnId,
            toolCallId,
            toolName,
          })
          return
        }

        if (eventType === 'tool-result') {
          if (!input.isRunActive())
            return
          const rawToolCallId = sanitizeText(event.toolCallId)
          const rawToolName = sanitizeText(event.toolName ?? event.name)
          const toolArguments = readStreamToolArguments(event)
          const toolCallId = toolCallIdentity.resolveToolResult({
            arguments: toolArguments,
            result: event.result,
            toolCallId: rawToolCallId,
            toolName: rawToolName || 'tool',
          })
          const toolName = toolNamesById.get(toolCallId)
            ?? toolCallIdentity.getToolName(toolCallId)
            ?? rawToolName
            ?? 'tool'
          activeProviderToolCallIds.delete(toolCallId)
          markProviderStreamPhase('provider-progress', 'chat-stream.tool-execution-completed', {
            toolName,
            toolCallId,
          })
          if (
            !toolExecutionFailureState.failure
            && isAlicizationToolExecutionFailureResult(event.result)
          ) {
            toolExecutionFailureState.failure = extractAlicizationToolExecutionFailure(event.result, toolName)
          }
          if (toolExecutionFailureState.failure) {
            pendingToolResultHandoffIds.clear()
            emitToolResultOnce(toolCallId, toolName, event.result)
            if (!input.controller.signal.aborted) {
              providerController.abort(createAlicizationToolExecutionError(toolExecutionFailureState.failure))
            }
            return
          }
          if (isTerminalToolResult(event.result)) {
            pendingToolResultHandoffIds.clear()
            emitToolResultOnce(toolCallId, toolName, event.result)
            const terminalToolError = Object.assign(
              new Error(`Tool "${toolName}" returned a terminal result.`),
              {
                name: 'AlicizationToolExecutionError',
                failureKind: 'tool-execution',
                toolName,
                errorCode: 'TOOL_EXECUTION_TERMINAL',
                errorMessage: `Tool "${toolName}" returned a terminal result.`,
              },
            )
            if (!providerController.signal.aborted)
              providerController.abort(terminalToolError)
            return
          }
          if (reminderToolCallIds.has(toolCallId)) {
            await input.logReminderToolResult?.({
              toolCallId,
              summary: parseReminderToolResultForDebug(event.result),
            })
          }
          emitToolResultOnce(toolCallId, toolName, event.result)
          pendingToolResultHandoffIds.delete(toolCallId)
          if (pendingToolResultHandoffIds.size > 0)
            return
          providerContinuationState = 'awaiting-progress'
          markProviderStreamPhase('requesting', 'chat-stream.provider-continuation-started', {
            toolName,
            toolCallId,
            timeoutMs: providerContinuationTimeoutMs,
          })
          armProviderDeadline(providerContinuationTimeoutMs, 'continuation')
          return
        }

        if (eventType === 'finish') {
          if (!input.isRunActive())
            return
          finishReason = sanitizeText(event.finishReason ?? event.finish_reason ?? event.reason, 'stop')
          appendStreamDebugLine('chat-stream.finish-event', {
            elapsedMs: Date.now() - startedAt,
            finishReason,
            fullTextChars: fullText.length,
          })
          if (activeProviderToolCallIds.size > 0 || pendingToolResultHandoffIds.size > 0) {
            appendStreamDebugLine('chat-stream.provider-finish-before-tool-result', {
              elapsedMs: Date.now() - startedAt,
              finishReason,
              fullTextChars: fullText.length,
              activeToolCallCount: activeProviderToolCallIds.size,
              pendingToolResultHandoffCount: pendingToolResultHandoffIds.size,
            })
            return
          }
          if (providerContinuationState !== 'none') {
            const isTerminalProviderFinish = finishReason !== 'tool_calls'
              && finishReason !== 'tool-calls'
            if (isTerminalProviderFinish) {
              providerContinuationState = 'none'
              clearProviderDeadline()
              markProviderStreamPhase('completed', 'chat-stream.provider-finished', {
                finishReason,
              })
              appendStreamDebugLine('chat-stream.provider-continuation-terminal-finish', {
                elapsedMs: Date.now() - startedAt,
                finishReason,
                fullTextChars: fullText.length,
              })
              resolveOnce()
              return
            }
            appendStreamDebugLine('chat-stream.provider-continuation-incomplete-finish', {
              elapsedMs: Date.now() - startedAt,
              finishReason,
              fullTextChars: fullText.length,
            })
            return
          }
          if (
            input.prepared.waitForTools
            && (finishReason === 'tool_calls' || finishReason === 'tool-calls')
          ) {
            return
          }
          markProviderStreamPhase('completed', 'chat-stream.provider-finished', {
            finishReason,
          })
          resolveOnce()
          return
        }

        if (eventType === 'error') {
          if (!input.isRunActive())
            return
          markProviderStreamPhase('failed', 'chat-stream.provider-error')
          appendStreamDebugLine('chat-stream.error-event', {
            elapsedMs: Date.now() - startedAt,
            reason: errorMessageFrom(event.error) ?? String(event.error ?? 'chat stream error'),
          })
          const providerError = event.error ?? new Error('chat stream error')
          cancelActiveFullStreamReader(providerError)
          if (!providerController.signal.aborted) {
            providerController.abort(providerError)
            return
          }
          rejectOnce(providerError)
        }
      }

      const queuedLegacyEvents: unknown[] = []
      let legacyEventQueue = Promise.resolve()
      let legacyEventQueueHasWork = false
      let providerEventSource: 'pending' | 'full-stream' | 'legacy-on-event' = 'pending'
      const enqueueLegacyEvent = (event: unknown) => {
        legacyEventQueueHasWork = true
        const next = legacyEventQueue.then(async () => await handleProviderEvent(event))
        legacyEventQueue = next.catch(rejectInvocation).finally(() => {
          legacyEventQueueHasWork = false
        })
        void legacyEventQueue
      }
      const observePendingProviderEvent = (event: unknown) => {
        const rawEventType = sanitizeText((event as { type?: unknown } | null)?.type)
        const eventType = normalizeMainGatewayStreamEventType(rawEventType)
        if (!eventType)
          return

        if (!sawAnyEvent) {
          sawAnyEvent = true
          lastEventType = rawEventType || eventType
        }
        if (isMainGatewayProgressEventType(eventType)) {
          pendingProgressEventObserved = true
          if (eventType !== 'tool-call'
            && eventType !== 'tool-call-streaming-start'
            && eventType !== 'tool-call-delta'
            && eventType !== 'tool-result'
            && eventType !== 'finish') {
            armProviderDeadline(providerContinuationTimeoutMs, 'idle')
          }
          if (!sawProgressEvent && !pendingProgressDebugEmitted) {
            pendingProgressDebugEmitted = true
            appendStreamDebugLine('chat-stream.first-progress-event', {
              elapsedMs: Date.now() - startedAt,
              eventType,
              source: 'pending-on-event',
            })
          }
          return
        }
        if (input.nonProgressEventTypes.size < 12) {
          const previousSize = input.nonProgressEventTypes.size
          input.nonProgressEventTypes.add(eventType)
          if (input.nonProgressEventTypes.size !== previousSize) {
            appendStreamDebugLine('chat-stream.non-progress-event', {
              elapsedMs: Date.now() - startedAt,
              eventType,
              observedNonProgressCount: input.nonProgressEventTypes.size,
              source: 'pending-on-event',
            })
          }
        }
      }
      const handleLegacyProviderEvent = (event: unknown) => {
        if (providerEventSource === 'pending') {
          observePendingProviderEvent(event)
          const eventType = normalizeMainGatewayStreamEventType(
            sanitizeText((event as { type?: unknown } | null)?.type),
          )
          if (eventType === 'tool-call-streaming-start') {
            enqueueLegacyEvent(event)
            return
          }
          queuedLegacyEvents.push(event)
          return
        }
        if (providerEventSource === 'legacy-on-event')
          enqueueLegacyEvent(event)
      }

      void Promise.resolve(invokeStreamText({
        ...input.prepared.chatConfig,
        maxSteps: 10,
        messages: providerMessages,
        headers: input.headers,
        abortSignal: providerController.signal,
        tools: providerToolsForExecution,
        toolChoice: input.prepared.toolChoice,
        onEvent: handleLegacyProviderEvent,
      }))
        .then(async (result) => {
          observeStreamTextResultErrors(result, rejectInvocation)
          const fullStream = readProviderFullStream(result)
          if (!fullStream) {
            providerEventSource = 'legacy-on-event'
            const legacyEvents = queuedLegacyEvents.splice(0)
            if (legacyEventQueueHasWork)
              await legacyEventQueue
            for (const event of legacyEvents)
              await handleProviderEvent(event)
            return
          }

          providerEventSource = 'full-stream'
          const legacyToolEvents = queuedLegacyEvents
            .splice(0)
            .filter((event) => {
              const eventType = normalizeMainGatewayStreamEventType(
                sanitizeText((event as { type?: unknown } | null)?.type),
              )
              return eventType === 'tool-call'
                || eventType === 'tool-result'
            })
          if (legacyEventQueueHasWork)
            await legacyEventQueue
          for (const event of legacyToolEvents)
            await handleProviderEvent(event)
          const reader = fullStream.getReader?.()
          if (!reader) {
            rejectInvocation(new Error('chat-stream-reader-unavailable'))
            return
          }
          activeFullStreamReader = reader

          try {
            while (true) {
              if (settled)
                break
              const next = await awaitAlicizationPromiseWithAbort(
                reader.read(),
                providerController.signal,
              )
              if (next.done || settled || providerController.signal.aborted)
                break
              await handleProviderEvent(next.value)
            }

            if (!settled) {
              if (activeProviderToolCallIds.size > 0 || pendingToolResultHandoffIds.size > 0)
                rejectOnce(new Error('chat-tool-result-handoff-incomplete'))
              else if (providerContinuationState !== 'none')
                rejectOnce(new Error('chat-provider-continuation-incomplete'))
              else if (sawProgressEvent)
                resolveOnce()
              else
                rejectOnce(createAbortError('chat-first-event-timeout'))
            }
          }
          catch (error) {
            rejectInvocation(error)
          }
          finally {
            if (activeFullStreamReader === reader)
              activeFullStreamReader = null
            reader.releaseLock?.()
          }
        })
        .catch(rejectInvocation)
    })
  }
  catch (error) {
    const maxRetries = input.providerRetryPolicy?.maxRetries ?? 5
    const retryDecision = resolveAlicizationProviderRetryDecision(error, {
      attempt: providerRetryAttempt,
      options: {
        ...input.providerRetryPolicy,
        operation: 'main-chat-stream',
        signal: input.controller.signal,
        deadlineAt: providerRetryDeadlineAt,
        replayState: {
          hasVisibleProgress: fullText.trim().length > 0,
          hasToolCall: announcedToolCallIds.size > 0
            || activeProviderToolCallIds.size > 0
            || emittedToolResultIds.size > 0,
          hasToolSideEffect: sawToolExecutionProgress
            || emittedToolResultIds.size > 0
            || Boolean(toolExecutionFailureState.failure),
        },
      },
    })
    if (retryDecision.retry) {
      appendStreamDebugLine('chat-stream.provider-retry-scheduled', {
        providerId: normalizedPayload.providerId ?? null,
        model: normalizedPayload.model ?? input.prepared.chatConfig.model ?? null,
        attempt: providerRetryAttempt,
        nextAttempt: retryDecision.nextAttempt,
        maxRetries,
        status: retryDecision.status,
        delayMs: retryDecision.delayMs,
        reason: retryDecision.reason,
      })
      await waitForAlicizationProviderRetry({
        delayMs: retryDecision.delayMs,
        signal: input.controller.signal,
        sleep: input.providerRetryPolicy?.sleep,
      })
      appendStreamDebugLine('chat-stream.provider-retry-started', {
        providerId: normalizedPayload.providerId ?? null,
        model: normalizedPayload.model ?? input.prepared.chatConfig.model ?? null,
        attempt: retryDecision.nextAttempt,
        maxRetries,
        status: retryDecision.status,
        delayMs: retryDecision.delayMs,
        reason: retryDecision.reason,
      })
      return runAlicizationMainChatStream({
        ...input,
        providerRetryAttempt: retryDecision.nextAttempt,
        providerRetryDeadlineAt,
      })
    }
    if (
      retryDecision.terminalReason === 'retry-budget-exhausted'
      || retryDecision.terminalReason === 'deadline-exhausted'
    ) {
      appendStreamDebugLine('chat-stream.provider-retry-exhausted', {
        providerId: normalizedPayload.providerId ?? null,
        model: normalizedPayload.model ?? input.prepared.chatConfig.model ?? null,
        attempt: providerRetryAttempt,
        maxRetries,
        status: retryDecision.status,
        reason: retryDecision.terminalReason,
      })
    }
    if (!toolExecutionFailureState.failure)
      throw error
  }
  finally {
    if (providerRetryDeadlineTimeout)
      clearTimeout(providerRetryDeadlineTimeout)
    unsubscribeToolExecutionProgress?.()
  }

  const toolExecutionFailure = toolExecutionFailureState.failure
  if (toolExecutionFailure) {
    throw createAlicizationToolExecutionError(toolExecutionFailure)
  }

  if (!sawProgressEvent && input.isRunActive()) {
    appendStreamDebugLine('chat-stream.completed-without-progress', {
      elapsedMs: Date.now() - startedAt,
      sawAnyEvent,
      firstEventGraceApplied,
      lastEventType: lastEventType || null,
      nonProgressEventTypes: [...input.nonProgressEventTypes],
    })
    throw createAbortError('chat-first-event-timeout')
  }

  const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
    prepared: input.prepared,
    mode: 'provider-stream',
    providerMindExecuted: true,
    reason: 'provider-stream',
  })
  const validation = validateAlicizationProviderSettlementPayload({
    fullText,
    prepared: input.prepared,
    allowPlainTextProviderReply: true,
  })
  const validatedPayload = validation.payload
  if (!validation.valid || !validatedPayload) {
    throw new AlicizationVisibleReplySettlementBlockedError(
      `provider-settlement-invalid:${validation.issues.join(',')}`,
      null,
    )
  }
  const visibleReplyRealization = await settleObservedReply({
    fullText,
    visibleText: validatedPayload.reply,
    visibleReplyExecution,
  })

  emitProviderVisibleReply(
    validatedPayload.reply,
    validatedPayload.memoryUsage,
  )
  appendStreamDebugLine('chat-stream.visible-release-after-closure', {
    elapsedMs: Date.now() - startedAt,
    visibleChars: validatedPayload.reply.length,
    closureStatus: visibleReplyRealization.closure?.status ?? null,
  })
  settleVisibleReplyLifecycle(visibleReplyRealization)

  return createProviderResult({
    finishReason,
    fullText,
    visibleReplyExecution,
    visibleReplyRealization,
    memoryUsage: validatedPayload.memoryUsage,
    memoryEvidence: validatedPayload.memoryEvidence,
  })
}
