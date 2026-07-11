import type { createSpeechPipeline, IntentHandle, IntentOptions, TextToken } from '@proj-alicization/pipelines-audio'

import type { SpeechIntentStartPayload, SpeechIntentTokenPayload } from './bus'

import { createPushStream } from '@proj-alicization/pipelines-audio'
import {
  containsAlicizationFixedTemplateResidue,
  normalizeAlicizationRuntimeDigest,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'
import { Mutex } from 'es-toolkit'
import { nanoid } from 'nanoid'

import { buildPreDialogueSendIdentityFromSnapshots } from '../../stores/chat/pre-dialogue-send-identity'
import {
  getSpeechBusContext,
  speechIntentCancelEvent,
  speechIntentEndEvent,
  speechIntentFlushEvent,
  speechIntentLiteralEvent,
  speechIntentSpecialEvent,
  speechIntentStartEvent,
  speechOwnerCancelEvent,
} from './bus'

function createId(prefix: string) {
  return `${prefix}-${nanoid()}`
}

function normalizeSpeechMetadataText(raw: unknown, maxLength: number) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxLength, '')
  return normalized || null
}

function sanitizeSpeechMetadataValue<T>(value: T): T {
  if (typeof value === 'string') {
    return (
      containsAlicizationFixedTemplateResidue(value)
        ? null
        : value
    ) as T
  }
  if (Array.isArray(value))
    return value.map(item => sanitizeSpeechMetadataValue(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, sanitizeSpeechMetadataValue(item)]),
    ) as T
  }
  return value
}

function sanitizeSpeechTokenValue(value: unknown) {
  if (typeof value !== 'string')
    return undefined

  const normalized = sanitizeAlicizationProviderFacingText(value, 1200, '')
  return normalized || undefined
}

function isThinSamePhaseCarryLine(line: string | null) {
  const normalized = line?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.startsWith('same phase 1 digital life.')
    && normalized.includes('some closure already landed')
    && normalized.includes('same living line')
    && !normalized.includes('before speaking')
    && !normalized.includes('what has landed')
    && !normalized.includes('life loop is still open')
}

function isSameHerInwardLowPressureHeadline(line: string | null) {
  const normalized = line?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return (
    normalized.includes('embodiment_status')
    && normalized.includes('low-pressure-inward-carry')
  ) || (
    normalized.includes('holding together mainly through')
    && normalized.includes('low-pressure')
    && (
      normalized.includes('same line inward')
      || normalized.includes('same living line')
      || normalized.includes('same-her-inward-carry')
      || normalized.includes('quiet-companionship')
    )
  )
}

function buildCompactSameHerInwardLowPressureAwarenessLine() {
  return ''
}

function isAnthropomorphicHostFacingSameHerHeadline(line: string | null) {
  const normalized = line?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('anthropomorphic emotional closure')
    && (normalized.includes('same-her inward-carry observability') || normalized.includes('continuity inward-carry observability'))
    && normalized.includes('measured-return')
}

function buildCompactAnthropomorphicHostFacingAwarenessLine() {
  return ''
}

function normalizeIntentMetadata(raw: IntentOptions['metadata']) {
  if (!raw || typeof raw !== 'object')
    return null

  const metadata = sanitizeSpeechMetadataValue({ ...raw })
  const projectState = 'projectState' in metadata
    && metadata.projectState
    && typeof metadata.projectState === 'object'
    && !Array.isArray(metadata.projectState)
    ? metadata.projectState as Record<string, unknown>
    : null
  const preDialogueClosure = 'preDialogueClosure' in metadata
    && metadata.preDialogueClosure
    && typeof metadata.preDialogueClosure === 'object'
    && !Array.isArray(metadata.preDialogueClosure)
    ? metadata.preDialogueClosure as Record<string, unknown>
    : null
  const preDialogueAwareness = 'preDialogueAwareness' in metadata
    && metadata.preDialogueAwareness
    && typeof metadata.preDialogueAwareness === 'object'
    && !Array.isArray(metadata.preDialogueAwareness)
    ? metadata.preDialogueAwareness as Record<string, unknown>
    : null
  const runtimeDigest = 'runtimeDigest' in metadata
    && metadata.runtimeDigest
    && typeof metadata.runtimeDigest === 'object'
    && !Array.isArray(metadata.runtimeDigest)
    ? normalizeAlicizationRuntimeDigest(metadata.runtimeDigest)
    : null
  const runtimeProjectState = runtimeDigest?.projectState
    && typeof runtimeDigest.projectState === 'object'
    && !Array.isArray(runtimeDigest.projectState)
    ? runtimeDigest.projectState as Record<string, unknown>
    : null
  const effectiveProjectState = projectState ?? runtimeProjectState
  const rebuiltAwareness = (effectiveProjectState || preDialogueClosure)
    ? buildPreDialogueSendIdentityFromSnapshots({
        projectStateContinuitySnapshot: effectiveProjectState as any,
        preDialogueClosureSnapshot: preDialogueClosure as any,
        preDialogueAwarenessSnapshot: preDialogueAwareness as any,
      })
    : null
  const effectivePreDialogueAwareness = rebuiltAwareness
    ? {
        status: rebuiltAwareness.status,
        summaryLine: rebuiltAwareness.summaryLine,
        companionHeadlineLine: rebuiltAwareness.companionHeadlineLine,
        companionBriefingLine: rebuiltAwareness.companionBriefingLine,
        companionNextClosureLine: rebuiltAwareness.companionNextClosureLine,
        awarenessLine: rebuiltAwareness.awarenessLine,
        emotionalClosureCue: rebuiltAwareness.emotionalClosureCue,
        reasonPreview: rebuiltAwareness.reasonPreview,
      }
    : preDialogueAwareness
  if (!effectivePreDialogueAwareness)
    return metadata

  const companionHeadlineLine = normalizeSpeechMetadataText(effectivePreDialogueAwareness.companionHeadlineLine, 320)
  const normalizedAwarenessLine = normalizeSpeechMetadataText(effectivePreDialogueAwareness.awarenessLine, 320)
  const companionBriefingLine = normalizeSpeechMetadataText(effectivePreDialogueAwareness.companionBriefingLine, 320)
  const awarenessOnlyRepeatsHeadline = Boolean(
    normalizedAwarenessLine
    && companionHeadlineLine
    && normalizedAwarenessLine === companionHeadlineLine,
  )
  const preferredAwarenessSeed = normalizedAwarenessLine && normalizedAwarenessLine !== companionHeadlineLine
    ? normalizedAwarenessLine
    : companionBriefingLine ?? normalizedAwarenessLine
  const mergedInwardLowPressureAwarenessLine
    = awarenessOnlyRepeatsHeadline
      && companionBriefingLine
      && isThinSamePhaseCarryLine(companionBriefingLine)
      && isSameHerInwardLowPressureHeadline(companionHeadlineLine)
      ? buildCompactSameHerInwardLowPressureAwarenessLine()
      : null
  const mergedAnthropomorphicHostFacingAwarenessLine
    = awarenessOnlyRepeatsHeadline
      && companionBriefingLine
      && isThinSamePhaseCarryLine(companionBriefingLine)
      && isAnthropomorphicHostFacingSameHerHeadline(companionHeadlineLine)
      ? buildCompactAnthropomorphicHostFacingAwarenessLine()
      : null
  const awarenessLine = awarenessOnlyRepeatsHeadline && companionBriefingLine
    ? (mergedAnthropomorphicHostFacingAwarenessLine ?? mergedInwardLowPressureAwarenessLine)
    : resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          preDialogueAwarenessLine: preferredAwarenessSeed,
          awarenessLine: preferredAwarenessSeed,
          companionHeadlineLine,
          companionBriefingLine,
          preDialogueAwarenessSummary: normalizeSpeechMetadataText(effectivePreDialogueAwareness.summaryLine, 320),
          emotionalClosureSummary: normalizeSpeechMetadataText(effectivePreDialogueAwareness.emotionalClosureCue, 320),
        },
      })

  return {
    ...metadata,
    preDialogueAwareness: {
      ...effectivePreDialogueAwareness,
      companionHeadlineLine,
      summaryLine: normalizeSpeechMetadataText(effectivePreDialogueAwareness.summaryLine, 320),
      companionBriefingLine,
      companionNextClosureLine: normalizeSpeechMetadataText(effectivePreDialogueAwareness.companionNextClosureLine, 320),
      awarenessLine,
      emotionalClosureCue: normalizeSpeechMetadataText(effectivePreDialogueAwareness.emotionalClosureCue, 320),
      reasonPreview: Array.isArray(effectivePreDialogueAwareness.reasonPreview)
        ? effectivePreDialogueAwareness.reasonPreview
            .map(reason => normalizeSpeechMetadataText(reason, 320))
            .filter((reason): reason is string => Boolean(reason))
        : [],
    },
  }
}

type HostSpeechPipeline = Pick<ReturnType<typeof createSpeechPipeline<unknown>>, 'openIntent'> & {
  cancelOwner?: (ownerId: string, reason?: string) => void
  stopAll?: (reason: string) => void
}

function wrapHostIntentHandle(intent: IntentHandle): IntentHandle {
  return {
    ...intent,
    writeLiteral(value: string) {
      const sanitized = sanitizeSpeechTokenValue(value)
      if (sanitized)
        intent.writeLiteral(sanitized)
    },
    writeSpecial(value: string) {
      const sanitized = sanitizeSpeechTokenValue(value)
      if (sanitized)
        intent.writeSpecial(sanitized)
    },
    writeFlush() {
      intent.writeFlush()
    },
    end() {
      intent.end()
    },
    cancel(reason?: string) {
      intent.cancel(reason)
    },
  }
}

export interface SpeechPipelineRuntime {
  openIntent: (options?: IntentOptions) => IntentHandle
  cancelOwner: (ownerId: string, reason?: string) => void
  registerHost: (pipeline: HostSpeechPipeline) => Promise<void>
  isHost: () => boolean
  dispose: () => Promise<void>
}

export function createSpeechPipelineRuntime(): SpeechPipelineRuntime {
  const mutex = new Mutex()
  const originId = `speech-${nanoid()}`

  let hostPipeline: HostSpeechPipeline | null = null
  let hostReady = false
  let bound = false

  const busDisposers: Array<() => void> = []
  const localRemoteIntentMap = new Map<string, IntentHandle>()
  const remoteIntentMap = new Map<string, IntentHandle>()
  const context = getSpeechBusContext()

  function bindBusListener<T>(event: T, listener: (evt: any) => void) {
    const stop = context.on(event as never, listener)
    if (typeof stop === 'function')
      busDisposers.push(stop)
  }

  function clearSpeechBusBindings() {
    while (busDisposers.length > 0) {
      const dispose = busDisposers.pop()
      dispose?.()
    }
    bound = false
  }

  function bindSpeechBusToHost() {
    if (bound)
      return
    bound = true

    bindBusListener(speechIntentStartEvent, (evt) => {
      const payload = (evt as { body?: SpeechIntentStartPayload })?.body
      if (!payload || payload.originId === originId)
        return

      if (!hostPipeline)
        return

      if (remoteIntentMap.has(payload.intentId))
        return

      const intent = wrapHostIntentHandle(hostPipeline.openIntent({
        intentId: payload.intentId,
        streamId: payload.streamId,
        ownerId: payload.ownerId,
        priority: payload.priority,
        behavior: payload.behavior,
        metadata: normalizeIntentMetadata(payload.metadata ?? null),
      }))

      remoteIntentMap.set(payload.intentId, intent)
    })

    const applyToken = (payload: SpeechIntentTokenPayload, writer: (intent: IntentHandle, value?: string) => void) => {
      if (!payload || payload.originId === originId)
        return
      const intent = remoteIntentMap.get(payload.intentId)
      if (!intent) {
        if (!hostPipeline)
          return
        const fallback = wrapHostIntentHandle(hostPipeline.openIntent({
          intentId: payload.intentId,
          streamId: payload.streamId,
          ownerId: payload.ownerId,
          priority: payload.priority,
          behavior: payload.behavior,
          metadata: normalizeIntentMetadata(payload.metadata ?? null),
        }))
        remoteIntentMap.set(payload.intentId, fallback)
        writer(fallback, sanitizeSpeechTokenValue(payload.value))
        return
      }
      writer(intent, sanitizeSpeechTokenValue(payload.value))
    }

    bindBusListener(speechIntentLiteralEvent, (evt) => {
      const payload = evt?.body
      if (!payload)
        return

      applyToken(payload, (intent, value) => {
        if (value)
          intent.writeLiteral(value)
      })
    })

    bindBusListener(speechIntentSpecialEvent, (evt) => {
      const payload = evt?.body
      if (!payload)
        return

      applyToken(payload, (intent, value) => {
        if (value)
          intent.writeSpecial(value)
      })
    })

    bindBusListener(speechIntentFlushEvent, (evt) => {
      const payload = evt?.body
      if (!payload)
        return

      applyToken(payload, (intent) => {
        intent.writeFlush()
      })
    })

    bindBusListener(speechIntentEndEvent, (evt) => {
      const payload = evt?.body
      if (!payload || payload.originId === originId)
        return
      const intent = remoteIntentMap.get(payload.intentId)
      if (!intent)
        return
      intent.end()
      remoteIntentMap.delete(payload.intentId)
    })

    bindBusListener(speechIntentCancelEvent, (evt) => {
      const payload = evt?.body
      if (!payload || payload.originId === originId)
        return
      const intent = remoteIntentMap.get(payload.intentId)
      if (!intent)
        return
      intent.cancel(payload.reason)
      remoteIntentMap.delete(payload.intentId)
    })

    bindBusListener(speechOwnerCancelEvent, (evt) => {
      const payload = evt?.body
      if (!payload || payload.originId === originId || !payload.ownerId)
        return

      cancelOwner(payload.ownerId, payload.reason, { emitBusEvent: false })
    })
  }

  function cancelLocalRemoteOwner(ownerId: string, reason?: string) {
    const ownedIntentIds = [...localRemoteIntentMap.values()]
      .filter(intent => intent.ownerId === ownerId)
      .map(intent => intent.intentId)

    for (const intentId of ownedIntentIds) {
      const intent = localRemoteIntentMap.get(intentId)
      intent?.cancel(reason ?? 'owner-canceled')
    }
  }

  function clearRemoteOwner(ownerId: string) {
    for (const [intentId, intent] of remoteIntentMap.entries()) {
      if (intent.ownerId !== ownerId)
        continue
      remoteIntentMap.delete(intentId)
    }
  }

  function createRemoteIntent(options?: IntentOptions): IntentHandle {
    const intentId = options?.intentId ?? createId('intent')
    const streamId = options?.streamId ?? createId('stream')
    const priority = typeof options?.priority === 'number' ? options?.priority : undefined
    const behavior = options?.behavior
    const ownerId = options?.ownerId
    const metadata = normalizeIntentMetadata(options?.metadata)

    const { stream, write, close } = createPushStream<TextToken>()
    let sequence = 0
    let closed = false

    function closeRemoteIntent(
      kind: 'cancel' | 'end',
      reason?: string,
    ) {
      if (closed)
        return
      closed = true
      close()
      localRemoteIntentMap.delete(intentId)
      if (kind === 'end') {
        context.emit(speechIntentEndEvent, {
          originId,
          intentId,
          streamId,
        })
        return
      }
      context.emit(speechIntentCancelEvent, {
        originId,
        intentId,
        streamId,
        reason,
      })
    }

    context.emit(speechIntentStartEvent, {
      originId,
      intentId,
      streamId,
      ownerId,
      priority,
      behavior,
      ...(metadata != null ? { metadata } : {}),
    })

    const handle: IntentHandle = {
      intentId,
      streamId,
      ownerId,
      priority: priority ?? 0,
      stream,
      writeLiteral(value: string) {
        if (closed)
          return
        write({
          type: 'literal',
          value,
          streamId,
          intentId,
          sequence,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        })
        context.emit(speechIntentLiteralEvent, {
          originId,
          intentId,
          streamId,
          sequence: sequence++,
          value,
          ownerId,
          priority,
          behavior,
          ...(metadata != null ? { metadata } : {}),
        })
      },
      writeSpecial(value: string) {
        if (closed)
          return
        write({
          type: 'special',
          value,
          streamId,
          intentId,
          sequence,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        })
        context.emit(speechIntentSpecialEvent, {
          originId,
          intentId,
          streamId,
          sequence: sequence++,
          value,
          ownerId,
          priority,
          behavior,
          ...(metadata != null ? { metadata } : {}),
        })
      },
      writeFlush() {
        if (closed)
          return
        write({
          type: 'flush',
          streamId,
          intentId,
          sequence,
          createdAt: Date.now(),
          ...(metadata != null ? { metadata } : {}),
        })
        context.emit(speechIntentFlushEvent, {
          originId,
          intentId,
          streamId,
          sequence: sequence++,
          ownerId,
          priority,
          behavior,
          ...(metadata != null ? { metadata } : {}),
        })
      },
      end() {
        closeRemoteIntent('end')
      },
      cancel(reason?: string) {
        closeRemoteIntent('cancel', reason)
      },
    }

    localRemoteIntentMap.set(intentId, handle)
    return handle
  }

  async function registerHost(pipeline: HostSpeechPipeline) {
    await mutex.acquire()
    try {
      if (hostPipeline)
        return
      hostPipeline = pipeline
      hostReady = true
      bindSpeechBusToHost()
    }
    finally {
      mutex.release()
    }
  }

  function openIntent(options?: IntentOptions) {
    if (hostPipeline) {
      if (!options)
        return wrapHostIntentHandle(hostPipeline.openIntent(options))

      const metadata = normalizeIntentMetadata(options.metadata)
      return wrapHostIntentHandle(hostPipeline.openIntent({
        ...options,
        ...(metadata != null ? { metadata } : {}),
      }))
    }

    return createRemoteIntent(options)
  }

  function cancelOwner(
    ownerId: string,
    reason?: string,
    options?: {
      emitBusEvent?: boolean
    },
  ) {
    const normalizedOwnerId = ownerId.trim()
    if (!normalizedOwnerId)
      return

    cancelLocalRemoteOwner(normalizedOwnerId, reason)
    hostPipeline?.cancelOwner?.(normalizedOwnerId, reason ?? 'owner-canceled')
    clearRemoteOwner(normalizedOwnerId)

    if (options?.emitBusEvent === false)
      return

    context.emit(speechOwnerCancelEvent, {
      originId,
      ownerId: normalizedOwnerId,
      reason,
    })
  }

  function isHost() {
    return hostReady && !!hostPipeline
  }

  async function dispose() {
    await mutex.acquire()
    try {
      const activeHostPipeline = hostPipeline
      hostPipeline = null
      hostReady = false

      for (const intent of localRemoteIntentMap.values())
        intent.cancel('runtime-dispose')
      localRemoteIntentMap.clear()

      for (const intent of remoteIntentMap.values())
        intent.cancel('runtime-dispose')
      remoteIntentMap.clear()

      clearSpeechBusBindings()
      activeHostPipeline?.stopAll?.('runtime-dispose')
    }
    finally {
      mutex.release()
    }
  }

  return {
    openIntent,
    cancelOwner: (ownerId: string, reason?: string) => cancelOwner(ownerId, reason),
    registerHost,
    isHost,
    dispose,
  }
}
