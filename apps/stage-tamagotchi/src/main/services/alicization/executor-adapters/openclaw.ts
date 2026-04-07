import type {
  AlicizationChannelCapability,
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationOpenClawCommandInput,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '@proj-alicization/stage-shared'

import { createHash } from 'node:crypto'
import { env } from 'node:process'

import {
  buildAlicizationExecutionRuntimeContextBlock,
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'

import { resolveOpenClawEventChannel } from './embodied-channel'

const openClawDefaultTimeoutMs = 300_000
const openClawMaxTimeoutMs = 900_000
const openClawCapabilityProbeTimeoutMs = 2_500
const openClawEventChunkChars = 1_500
const openClawMaxPreviewChars = 4_000
const openClawDefaultSenderId = 'alicization_host'
const openClawDefaultRoleName = 'alicization'

type AlicizationTaskPermissionMode = 'none' | 'implicit' | 'explicit'
type AlicizationTaskEffect = 'observe' | 'mutate' | 'high-impact'

interface AlicizationOpenClawRuntimeConfig {
  baseUrl: string | null
  authToken: string | null
  defaultSenderId: string
  timeoutMs: number
}

interface AlicizationOpenClawCommandSpec {
  rawInstruction: string
  instruction: string
  instructionPreview: string
  baseUrl: string
  authToken: string | null
  timeoutMs: number
  senderId: string
  roleName: string
  sessionId: string
  sessionAffinityKey: string
  runtimeContext: AlicizationExecutionRuntimeContext | null
}

interface AlicizationOpenClawExecutionRuntimeResult {
  ok: boolean
  reply: string
  sessionId: string
  durationMs: number
  aborted: boolean
  timedOut: boolean
  errorCode?: string
  errorMessage?: string
  raw?: unknown
}

export interface AlicizationOpenClawAdapterInput {
  thread: AlicizationTaskThreadRecord
  command: AlicizationOpenClawCommandInput
  abortSignal?: AbortSignal
  now?: () => number
}

export interface AlicizationOpenClawAdapterResult {
  ok: boolean
  summary: string
  output: string | null
  errorCode?: string
  errorMessage?: string
  finalStatus: AlicizationTaskThreadStatus
  events: AlicizationExecutionEventInput[]
  externalSessionId?: string | null
}

function normalizeText(raw: unknown, maxChars = openClawMaxPreviewChars) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function segmentOutput(raw: string) {
  if (!raw)
    return []

  const segments: string[] = []
  for (let index = 0; index < raw.length; index += openClawEventChunkChars)
    segments.push(raw.slice(index, index + openClawEventChunkChars))
  return segments
}

function normalizeOptionalText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return null
  const normalized = raw.trim().slice(0, maxChars)
  return normalized || null
}

function normalizeTimeoutMs(raw: unknown, fallback = openClawDefaultTimeoutMs) {
  const numeric = Number(raw)
  if (!Number.isFinite(numeric))
    return fallback
  return Math.max(300, Math.min(openClawMaxTimeoutMs, Math.floor(numeric)))
}

function buildOpenClawHeaders(authToken: string | null) {
  if (!authToken)
    return {}

  return {
    'Authorization': `Bearer ${authToken}`,
    'x-openclaw-token': authToken,
  }
}

function resolveOpenClawConfig(): AlicizationOpenClawRuntimeConfig {
  const baseUrl = normalizeOptionalText(env.ALICIZATION_OPENCLAW_URL, 2_000)
  const authToken = normalizeOptionalText(env.ALICIZATION_OPENCLAW_TOKEN, 4_000)
  const defaultSenderId = normalizeOptionalText(env.ALICIZATION_OPENCLAW_DEFAULT_SENDER_ID, 160)
    ?? openClawDefaultSenderId

  return {
    baseUrl: baseUrl ? baseUrl.replace(/\/+$/, '') : null,
    authToken,
    defaultSenderId,
    timeoutMs: normalizeTimeoutMs(env.ALICIZATION_OPENCLAW_TIMEOUT_MS),
  }
}

function resolveThreadPermissionMode(thread: AlicizationTaskThreadRecord): AlicizationTaskPermissionMode {
  const metadataTask = thread.metadata?.task
  if (metadataTask && typeof metadataTask === 'object' && 'permissionMode' in metadataTask) {
    const permissionMode = (metadataTask as { permissionMode?: unknown }).permissionMode
    if (permissionMode === 'explicit' || permissionMode === 'implicit' || permissionMode === 'none')
      return permissionMode
  }

  return thread.origin === 'user-turn' ? 'implicit' : 'none'
}

function resolveThreadEffect(thread: AlicizationTaskThreadRecord): AlicizationTaskEffect {
  const metadataTask = thread.metadata?.task
  if (metadataTask && typeof metadataTask === 'object' && 'effect' in metadataTask) {
    const effect = (metadataTask as { effect?: unknown }).effect
    if (effect === 'observe' || effect === 'mutate' || effect === 'high-impact')
      return effect
  }

  return 'mutate'
}

function readGovernorSessionResume(thread: AlicizationTaskThreadRecord) {
  const metadata = thread.metadata
  if (!metadata || typeof metadata !== 'object')
    return null
  const governor = 'governor' in metadata ? metadata.governor : null
  if (!governor || typeof governor !== 'object')
    return null
  const sessionResume = 'sessionResume' in governor ? governor.sessionResume : null
  if (!sessionResume || typeof sessionResume !== 'object')
    return null
  return sessionResume as {
    affinityKey?: unknown
    externalSessionId?: unknown
  }
}

function buildOpenClawSessionId(input: {
  explicitSessionId?: string | null
  sessionAffinityKey: string
  senderId: string
  roleName: string
}) {
  const explicitSessionId = normalizeOptionalText(input.explicitSessionId, 160)
  if (explicitSessionId)
    return explicitSessionId

  const hash = createHash('sha256')
  hash.update(input.sessionAffinityKey)
  hash.update('\n')
  hash.update(input.senderId)
  hash.update('\n')
  hash.update(input.roleName)
  return hash.digest('hex').slice(0, 32)
}

function buildFailureSummary(thread: AlicizationTaskThreadRecord, message: string) {
  const goal = normalizeText(thread.goal, 140) || 'the current embodied task'
  const reason = normalizeText(message, 200) || 'unknown error'
  return `OpenClaw execution failed for ${goal}: ${reason}`
}

function isAbortError(error: unknown) {
  return typeof error === 'object'
    && error != null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

async function fetchOpenClawJson(input: {
  url: string
  authToken: string | null
  timeoutMs: number
  signal?: AbortSignal
  body?: Record<string, unknown>
}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('openclaw-timeout')), input.timeoutMs)
  const onAbort = () => {
    controller.abort(input.signal?.reason ?? new Error('openclaw-aborted'))
  }

  if (input.signal) {
    if (input.signal.aborted)
      onAbort()
    else
      input.signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    const response = await fetch(input.url, {
      method: input.body ? 'POST' : 'GET',
      headers: {
        'content-type': 'application/json',
        ...buildOpenClawHeaders(input.authToken),
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
      signal: controller.signal,
    })
    const json = await response.json().catch(() => null)
    return {
      ok: response.ok,
      status: response.status,
      json,
    }
  }
  finally {
    clearTimeout(timeout)
    if (input.signal)
      input.signal.removeEventListener('abort', onAbort)
  }
}

export async function probeOpenClawCapability(): Promise<AlicizationChannelCapability> {
  const config = resolveOpenClawConfig()
  if (!config.baseUrl) {
    return {
      channel: 'openclaw',
      available: false,
      enabled: false,
      ready: false,
      sessionAffinity: true,
      reason: 'openclaw-url-missing',
    }
  }

  try {
    const health = await fetchOpenClawJson({
      url: `${config.baseUrl}/health`,
      authToken: config.authToken,
      timeoutMs: openClawCapabilityProbeTimeoutMs,
    })
    if (!health.ok) {
      return {
        channel: 'openclaw',
        available: true,
        enabled: true,
        ready: false,
        sessionAffinity: true,
        reason: `openclaw-health-http-${health.status}`,
      }
    }

    return {
      channel: 'openclaw',
      available: true,
      enabled: true,
      ready: true,
      sessionAffinity: true,
      reason: null,
    }
  }
  catch (error) {
    const reason = isAbortError(error)
      ? 'openclaw-health-timeout'
      : normalizeText(error instanceof Error ? error.message : String(error), 200) || 'openclaw-health-failed'
    return {
      channel: 'openclaw',
      available: true,
      enabled: true,
      ready: false,
      sessionAffinity: true,
      reason,
    }
  }
}

export function readOpenClawCapabilitySnapshot(): AlicizationChannelCapability {
  const config = resolveOpenClawConfig()
  if (!config.baseUrl) {
    return {
      channel: 'openclaw',
      available: false,
      enabled: false,
      ready: false,
      sessionAffinity: true,
      reason: 'openclaw-url-missing',
    }
  }

  return {
    channel: 'openclaw',
    available: true,
    enabled: true,
    ready: false,
    sessionAffinity: true,
    reason: 'openclaw-health-unverified',
  }
}

function buildOpenClawCommandSpec(input: AlicizationOpenClawAdapterInput) {
  const rawInstruction = typeof input.command.instruction === 'string'
    ? input.command.instruction.trim()
    : ''
  if (!rawInstruction) {
    return {
      ok: false as const,
      errorCode: 'OPENCLAW_INSTRUCTION_REQUIRED',
      errorMessage: 'OpenClaw dispatch requires a non-empty instruction.',
    }
  }

  const config = resolveOpenClawConfig()
  if (!config.baseUrl) {
    return {
      ok: false as const,
      errorCode: 'OPENCLAW_NOT_CONFIGURED',
      errorMessage: 'OpenClaw is not configured. Set ALICIZATION_OPENCLAW_URL before dispatch.',
    }
  }

  const permissionMode = resolveThreadPermissionMode(input.thread)
  const effect = resolveThreadEffect(input.thread)
  if (effect === 'high-impact' && permissionMode !== 'explicit') {
    return {
      ok: false as const,
      errorCode: 'OPENCLAW_PERMISSION_REQUIRED',
      errorMessage: 'High-impact OpenClaw dispatch requires explicit permission before execution.',
    }
  }
  if (effect === 'mutate' && permissionMode === 'none') {
    return {
      ok: false as const,
      errorCode: 'OPENCLAW_PERMISSION_REQUIRED',
      errorMessage: 'Mutating OpenClaw dispatch requires at least implicit permission before execution.',
    }
  }

  const senderId = normalizeOptionalText(input.command.senderId, 160) ?? config.defaultSenderId
  const roleName = normalizeOptionalText(input.command.roleName, 160) ?? openClawDefaultRoleName
  const governorSessionResume = readGovernorSessionResume(input.thread)
  const sessionAffinityKey = normalizeOptionalText(input.command.sessionAffinityKey, 200)
    ?? normalizeOptionalText(governorSessionResume?.affinityKey, 200)
    ?? normalizeOptionalText(input.thread.sessionId, 200)
    ?? input.thread.id
  const runtimeContext = normalizeAlicizationExecutionRuntimeContext(input.command.runtimeContext)
  const runtimeContextBlock = buildAlicizationExecutionRuntimeContextBlock(runtimeContext)
  const instruction = runtimeContextBlock
    ? [
        runtimeContextBlock,
        '',
        '[ALICIZATION_EXECUTION_TASK]',
        rawInstruction,
      ].join('\n')
    : rawInstruction
  const sessionId = buildOpenClawSessionId({
    explicitSessionId: input.command.sessionId ?? normalizeOptionalText(governorSessionResume?.externalSessionId, 160),
    sessionAffinityKey,
    senderId,
    roleName,
  })

  return {
    ok: true as const,
    spec: {
      rawInstruction,
      instruction,
      instructionPreview: normalizeText(rawInstruction, 260),
      baseUrl: config.baseUrl,
      authToken: config.authToken,
      timeoutMs: normalizeTimeoutMs(input.command.timeoutMs, config.timeoutMs),
      senderId,
      roleName,
      sessionId,
      sessionAffinityKey,
      runtimeContext,
    } satisfies AlicizationOpenClawCommandSpec,
  }
}

async function runOpenClawCommand(
  spec: AlicizationOpenClawCommandSpec,
  thread: AlicizationTaskThreadRecord,
  abortSignal?: AbortSignal,
  now: () => number = Date.now,
): Promise<AlicizationOpenClawExecutionRuntimeResult> {
  const startedAt = now()

  try {
    const response = await fetchOpenClawJson({
      url: `${spec.baseUrl}/neko/send`,
      authToken: spec.authToken,
      timeoutMs: spec.timeoutMs,
      signal: abortSignal,
      body: {
        channel_id: 'neko',
        sender_id: spec.senderId,
        session_id: spec.sessionId,
        text: spec.instruction,
        meta: {
          reply_timeout: Math.max(1, Math.ceil(spec.timeoutMs / 1000)),
          conversation_id: normalizeOptionalText(thread.sessionId, 160) ?? spec.sessionId,
          role_name: spec.roleName,
          alicization_runtime_context: spec.runtimeContext,
        },
      },
    })

    if (!response.ok) {
      return {
        ok: false,
        reply: '',
        sessionId: spec.sessionId,
        durationMs: Math.max(0, now() - startedAt),
        aborted: false,
        timedOut: false,
        errorCode: 'OPENCLAW_HTTP_ERROR',
        errorMessage: `OpenClaw returned HTTP ${response.status}.`,
        raw: response.json,
      }
    }

    if (!response.json || typeof response.json !== 'object') {
      return {
        ok: false,
        reply: '',
        sessionId: spec.sessionId,
        durationMs: Math.max(0, now() - startedAt),
        aborted: false,
        timedOut: false,
        errorCode: 'OPENCLAW_INVALID_RESPONSE',
        errorMessage: 'OpenClaw returned a non-object JSON payload.',
        raw: response.json,
      }
    }

    const payload = response.json as Record<string, unknown>
    const reply = normalizeText(payload.reply, openClawMaxPreviewChars)
    const sessionId = normalizeOptionalText(payload.session_id, 160) ?? spec.sessionId
    if (!reply) {
      return {
        ok: false,
        reply: '',
        sessionId,
        durationMs: Math.max(0, now() - startedAt),
        aborted: false,
        timedOut: false,
        errorCode: 'OPENCLAW_EMPTY_REPLY',
        errorMessage: 'OpenClaw did not return a final reply.',
        raw: payload,
      }
    }

    return {
      ok: true,
      reply,
      sessionId,
      durationMs: Math.max(0, now() - startedAt),
      aborted: false,
      timedOut: false,
      raw: payload,
    }
  }
  catch (error) {
    const timedOut = isAbortError(error) && abortSignal?.aborted !== true
    const aborted = isAbortError(error) && abortSignal?.aborted === true
    return {
      ok: false,
      reply: '',
      sessionId: spec.sessionId,
      durationMs: Math.max(0, now() - startedAt),
      aborted,
      timedOut,
      errorCode: timedOut ? 'OPENCLAW_TIMEOUT' : aborted ? 'OPENCLAW_ABORTED' : 'OPENCLAW_REQUEST_FAILED',
      errorMessage: timedOut
        ? `OpenClaw request timed out after ${spec.timeoutMs}ms.`
        : normalizeText(error instanceof Error ? error.message : String(error), 220) || 'OpenClaw request failed.',
    }
  }
}

export async function executeOpenClawTaskThread(input: AlicizationOpenClawAdapterInput): Promise<AlicizationOpenClawAdapterResult> {
  const now = input.now ?? Date.now
  const thread = input.thread
  const eventChannel = resolveOpenClawEventChannel(thread.selectedChannel)
  const normalized = buildOpenClawCommandSpec(input)
  if (!normalized.ok) {
    const createdAt = now()
    return {
      ok: false,
      summary: buildFailureSummary(thread, normalized.errorMessage),
      output: null,
      errorCode: normalized.errorCode,
      errorMessage: normalized.errorMessage,
      finalStatus: 'failed',
      events: [{
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: eventChannel,
        kind: 'result',
        threadStatus: 'failed',
        payload: {
          instruction: input.command.instruction,
          transportChannel: 'openclaw',
          errorCode: normalized.errorCode,
          errorMessage: normalized.errorMessage,
        },
        createdAt,
      }],
    }
  }

  const spec = normalized.spec
  const dispatchCreatedAt = now()
  const dispatchEvent: AlicizationExecutionEventInput = {
    threadId: thread.id,
    decisionTraceId: thread.decisionTraceId,
    turnId: thread.turnId,
    sessionId: thread.sessionId,
    origin: thread.origin,
    channel: eventChannel,
    kind: 'dispatch',
    threadStatus: 'running',
    payload: {
      instruction: spec.instructionPreview,
      transportChannel: 'openclaw',
      timeoutMs: spec.timeoutMs,
      senderId: spec.senderId,
      roleName: spec.roleName,
      sessionId: spec.sessionId,
      sessionAffinityKey: spec.sessionAffinityKey,
      hasRuntimeContext: spec.runtimeContext !== null,
      runtimeContext: spec.runtimeContext,
    },
    createdAt: dispatchCreatedAt,
  }

  const runtimeResult = await runOpenClawCommand(spec, thread, input.abortSignal, now)
  const stepBaseAt = Math.max(dispatchCreatedAt + 1, now())
  const replySegments = segmentOutput(runtimeResult.reply)
  const stepEvents = replySegments.map((segment, index): AlicizationExecutionEventInput => ({
    threadId: thread.id,
    decisionTraceId: thread.decisionTraceId,
    turnId: thread.turnId,
    sessionId: thread.sessionId,
    origin: thread.origin,
    channel: eventChannel,
    kind: 'step',
    threadStatus: 'running',
    payload: {
      stream: 'reply',
      index,
      text: segment,
      transportChannel: 'openclaw',
      sessionId: runtimeResult.sessionId,
    },
    createdAt: stepBaseAt + index,
  }))

  if (runtimeResult.aborted) {
    const cancelAt = stepBaseAt + replySegments.length
    return {
      ok: false,
      summary: 'OpenClaw execution was cancelled because the kill switch changed while the embodied executor was running.',
      output: runtimeResult.reply || null,
      errorCode: runtimeResult.errorCode,
      errorMessage: runtimeResult.errorMessage,
      finalStatus: 'cancelled',
      externalSessionId: runtimeResult.sessionId,
      events: [
        dispatchEvent,
        ...stepEvents,
        {
          threadId: thread.id,
          decisionTraceId: thread.decisionTraceId,
          turnId: thread.turnId,
          sessionId: thread.sessionId,
          origin: thread.origin,
          channel: eventChannel,
          kind: 'cancel',
          threadStatus: 'cancelled',
          payload: {
            instruction: spec.instructionPreview,
            transportChannel: 'openclaw',
            durationMs: runtimeResult.durationMs,
            sessionId: runtimeResult.sessionId,
            errorCode: runtimeResult.errorCode,
            errorMessage: runtimeResult.errorMessage,
          },
          createdAt: cancelAt,
        },
      ],
    }
  }

  const success = runtimeResult.ok
  const resultAt = stepBaseAt + replySegments.length
  return {
    ok: success,
    summary: success
      ? normalizeText(runtimeResult.reply, 220) || `OpenClaw execution completed for ${normalizeText(thread.goal, 140) || 'the current embodied task'}.`
      : buildFailureSummary(thread, runtimeResult.errorMessage ?? 'unknown error'),
    output: runtimeResult.reply || null,
    errorCode: success ? undefined : runtimeResult.errorCode,
    errorMessage: success ? undefined : runtimeResult.errorMessage,
    finalStatus: success ? 'completed' : 'failed',
    externalSessionId: runtimeResult.sessionId,
    events: [
      dispatchEvent,
      ...stepEvents,
      {
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: eventChannel,
        kind: 'result',
        threadStatus: success ? 'completed' : 'failed',
        payload: {
          instruction: spec.instructionPreview,
          transportChannel: 'openclaw',
          durationMs: runtimeResult.durationMs,
          sessionId: runtimeResult.sessionId,
          senderId: spec.senderId,
          roleName: spec.roleName,
          timedOut: runtimeResult.timedOut,
          reply: normalizeText(runtimeResult.reply, 1_000),
          errorCode: runtimeResult.errorCode,
          errorMessage: runtimeResult.errorMessage,
        },
        createdAt: resultAt,
      },
    ],
  }
}
