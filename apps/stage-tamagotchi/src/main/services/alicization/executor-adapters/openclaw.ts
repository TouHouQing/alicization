import type {
  AlicizationChannelCapability,
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationOpenClawCommandInput,
  AlicizationOpenClawContentPart,
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
import { resolveThreadPermissionMode } from './thread-permission'

const openClawDefaultTimeoutMs = 300_000
const openClawMaxTimeoutMs = 900_000
const openClawCapabilityProbeTimeoutMs = 2_500
const openClawEventChunkChars = 1_500
const openClawMaxPreviewChars = 4_000
const openClawDefaultSenderId = 'alicization_host'
const openClawDefaultRoleName = 'alicization'

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
  channelId: string
  conversationId: string
  sessionId: string
  sessionAffinityKey: string
  contentParts: AlicizationOpenClawContentPart[]
  images: Array<string | Record<string, unknown>>
  audios: Array<string | Record<string, unknown>>
  files: Array<string | Record<string, unknown>>
  meta: Record<string, unknown> | null
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

function normalizeFlexiblePayloadItems(raw: unknown) {
  if (!Array.isArray(raw))
    return [] as Array<string | Record<string, unknown>>

  return raw
    .map((item) => {
      if (typeof item === 'string') {
        const text = normalizeText(item, 2_000)
        return text || null
      }
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const entries = Object.entries(item).filter(([, value]) => value !== undefined)
        if (entries.length === 0)
          return null
        return Object.fromEntries(entries)
      }
      return null
    })
    .filter((item): item is string | Record<string, unknown> => item !== null)
}

function normalizeOpenClawContentParts(raw: unknown): AlicizationOpenClawContentPart[] {
  if (!Array.isArray(raw))
    return []

  const parts: AlicizationOpenClawContentPart[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      continue
    const item = entry as Record<string, unknown>
    const type = normalizeText(item.type, 32).toLowerCase()
    if (type !== 'text' && type !== 'image' && type !== 'audio' && type !== 'file' && type !== 'video')
      continue

    const part: AlicizationOpenClawContentPart = {
      type: type as AlicizationOpenClawContentPart['type'],
    }
    const text = normalizeOptionalText(item.text, 10_000)
    const imageUrl = normalizeOptionalText(item.image_url, 10_000)
    const videoUrl = normalizeOptionalText(item.video_url, 10_000)
    const data = normalizeOptionalText(item.data, 120_000)
    const format = normalizeOptionalText(item.format, 48)
    const fileUrl = normalizeOptionalText(item.file_url, 10_000)
    const filename = normalizeOptionalText(item.filename, 256)
    const fileId = normalizeOptionalText(item.file_id, 256)
    if (text)
      part.text = text
    if (imageUrl)
      part.image_url = imageUrl
    if (videoUrl)
      part.video_url = videoUrl
    if (data)
      part.data = data
    if (format)
      part.format = format
    if (fileUrl)
      part.file_url = fileUrl
    if (filename)
      part.filename = filename
    if (fileId)
      part.file_id = fileId
    parts.push(part)
  }

  return parts
}

function normalizeOpenClawMeta(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(([, value]) => value !== undefined)
  if (entries.length === 0)
    return null
  return Object.fromEntries(entries)
}

function extractOpenClawReply(payload: Record<string, unknown>) {
  const directReply = normalizeText(payload.reply, openClawMaxPreviewChars)
  if (directReply)
    return directReply

  const contentParts = Array.isArray(payload.content_parts)
    ? payload.content_parts
    : []
  const textParts = contentParts
    .map((part) => {
      if (!part || typeof part !== 'object' || Array.isArray(part))
        return ''
      const partRecord = part as Record<string, unknown>
      const partType = normalizeText(partRecord.type, 24).toLowerCase()
      if (partType !== 'text')
        return ''
      return normalizeText(partRecord.text, openClawMaxPreviewChars)
    })
    .filter(Boolean)
  if (textParts.length === 0)
    return ''
  return normalizeText(textParts.join('\n'), openClawMaxPreviewChars)
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

function resolveThreadEffect(thread: AlicizationTaskThreadRecord): AlicizationTaskEffect {
  const metadataTask = thread.metadata?.task
  if (metadataTask && typeof metadataTask === 'object' && 'effect' in metadataTask) {
    const effect = (metadataTask as { effect?: unknown }).effect
    if (effect === 'observe' || effect === 'mutate' || effect === 'high-impact')
      return effect
  }

  return 'mutate'
}

function readTaskMetadataText(thread: AlicizationTaskThreadRecord, key: 'riskBudget' | 'justification') {
  const metadataTask = thread.metadata?.task
  if (!metadataTask || typeof metadataTask !== 'object')
    return null

  const value = (metadataTask as Record<string, unknown>)[key]
  return typeof value === 'string'
    ? value.trim().slice(0, 80) || null
    : null
}

function buildBlockedDispatchSafetyGate(thread: AlicizationTaskThreadRecord, errorCode: string) {
  if (errorCode !== 'OPENCLAW_PERMISSION_REQUIRED')
    return null

  const effect = resolveThreadEffect(thread)
  const permissionMode = resolveThreadPermissionMode(thread)
  const riskPolicy = effect === 'high-impact'
    ? 'explicit-confirmation-required'
    : 'implicit-or-explicit-confirmation-required'

  return {
    effect,
    permissionMode,
    riskBudget: readTaskMetadataText(thread, 'riskBudget'),
    justification: readTaskMetadataText(thread, 'justification'),
    confirmationRequired: true,
    riskPolicy,
    auditability: 'blocked-before-dispatch',
    interruptibility: 'no-network-request-started',
  }
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
  const contentParts = normalizeOpenClawContentParts(input.command.contentParts)
  const images = normalizeFlexiblePayloadItems(input.command.images)
  const audios = normalizeFlexiblePayloadItems(input.command.audios)
  const files = normalizeFlexiblePayloadItems(input.command.files)
  const hasStructuredPayload = contentParts.length > 0 || images.length > 0 || audios.length > 0 || files.length > 0
  if (!rawInstruction && !hasStructuredPayload) {
    return {
      ok: false as const,
      errorCode: 'OPENCLAW_INSTRUCTION_REQUIRED',
      errorMessage: 'OpenClaw dispatch requires a non-empty instruction or structured payload.',
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
  const instructionBody = rawInstruction
    ? [
        '[ALICIZATION_EXECUTION_TASK]',
        rawInstruction,
      ].join('\n')
    : ''
  const instruction = runtimeContextBlock
    ? [runtimeContextBlock, instructionBody].filter(Boolean).join('\n\n')
    : rawInstruction
  const sessionId = buildOpenClawSessionId({
    explicitSessionId: input.command.sessionId ?? normalizeOptionalText(governorSessionResume?.externalSessionId, 160),
    sessionAffinityKey,
    senderId,
    roleName,
  })
  const channelId = normalizeOptionalText(input.command.channelId, 120) ?? 'neko'
  const conversationId = normalizeOptionalText(input.command.conversationId, 160)
    ?? normalizeOptionalText(input.thread.sessionId, 160)
    ?? sessionId
  const instructionPreview = normalizeText(rawInstruction, 260)
    || normalizeText(contentParts.find(part => part.type === 'text')?.text, 260)
    || '[structured-openclaw-payload]'

  return {
    ok: true as const,
    spec: {
      rawInstruction,
      instruction,
      instructionPreview,
      baseUrl: config.baseUrl,
      authToken: config.authToken,
      timeoutMs: normalizeTimeoutMs(input.command.timeoutMs, config.timeoutMs),
      senderId,
      roleName,
      channelId,
      conversationId,
      sessionId,
      sessionAffinityKey,
      contentParts,
      images,
      audios,
      files,
      meta: normalizeOpenClawMeta(input.command.meta),
      runtimeContext,
    } satisfies AlicizationOpenClawCommandSpec,
  }
}

async function runOpenClawCommand(
  spec: AlicizationOpenClawCommandSpec,
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
        channel_id: spec.channelId,
        sender_id: spec.senderId,
        session_id: spec.sessionId,
        text: spec.instruction || undefined,
        content_parts: spec.contentParts.length > 0 ? spec.contentParts : undefined,
        images: spec.images.length > 0 ? spec.images : undefined,
        audios: spec.audios.length > 0 ? spec.audios : undefined,
        files: spec.files.length > 0 ? spec.files : undefined,
        meta: {
          ...spec.meta,
          reply_timeout: Math.max(1, Math.ceil(spec.timeoutMs / 1000)),
          conversation_id: spec.conversationId,
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
    const reply = extractOpenClawReply(payload)
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
    const runtimeContext = normalizeAlicizationExecutionRuntimeContext(input.command.runtimeContext)
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
          adapter: 'openclaw',
          instruction: input.command.instruction,
          transportChannel: 'openclaw',
          channelId: normalizeOptionalText(input.command.channelId, 120) ?? 'neko',
          conversationId: normalizeOptionalText(input.command.conversationId, 160) ?? normalizeOptionalText(thread.sessionId, 160) ?? null,
          errorCode: normalized.errorCode,
          errorMessage: normalized.errorMessage,
          safetyGate: buildBlockedDispatchSafetyGate(thread, normalized.errorCode),
          hasRuntimeContext: runtimeContext !== null,
          runtimeContext,
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
      channelId: spec.channelId,
      conversationId: spec.conversationId,
      sessionId: spec.sessionId,
      sessionAffinityKey: spec.sessionAffinityKey,
      hasStructuredPayload: spec.contentParts.length > 0 || spec.images.length > 0 || spec.audios.length > 0 || spec.files.length > 0,
      contentPartCount: spec.contentParts.length,
      imageCount: spec.images.length,
      audioCount: spec.audios.length,
      fileCount: spec.files.length,
      hasRuntimeContext: spec.runtimeContext !== null,
      runtimeContext: spec.runtimeContext,
    },
    createdAt: dispatchCreatedAt,
  }

  const runtimeResult = await runOpenClawCommand(spec, input.abortSignal, now)
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
            channelId: spec.channelId,
            conversationId: spec.conversationId,
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
          channelId: spec.channelId,
          conversationId: spec.conversationId,
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
