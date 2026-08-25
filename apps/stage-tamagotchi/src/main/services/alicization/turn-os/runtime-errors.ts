export type AlicizationRuntimeTimeoutReason
  = | 'chat-first-event-timeout'
    | 'chat-preparation-timeout'
    | 'chat-provider-liveness-timeout'
    | 'chat-provider-idle-timeout'
    | 'chat-provider-continuation-timeout'
    | 'chat-provider-retry-deadline'
    | 'chat-tool-result-handoff-timeout'
    | 'main-gateway-attempt-timeout'
    | 'main-gateway-timeout'
    | 'main-gateway-timeout-recovery'
    | 'main-gateway-visual-one-shot-timeout'

const runtimeTimeoutReasons: readonly AlicizationRuntimeTimeoutReason[] = [
  'chat-first-event-timeout',
  'chat-preparation-timeout',
  'chat-provider-liveness-timeout',
  'chat-provider-idle-timeout',
  'chat-provider-continuation-timeout',
  'chat-provider-retry-deadline',
  'chat-tool-result-handoff-timeout',
  'main-gateway-attempt-timeout',
  'main-gateway-timeout',
  'main-gateway-timeout-recovery',
  'main-gateway-visual-one-shot-timeout',
]

type RendererTimeoutPhase = 'first-event-timeout' | 'liveness-timeout' | 'idle-timeout'
type RendererTimeoutStage = 'provider' | 'tool-execution' | 'provider-continuation'

function isAlicizationRuntimeTimeoutReason(
  reason: unknown,
): reason is AlicizationRuntimeTimeoutReason {
  return typeof reason === 'string'
    && runtimeTimeoutReasons.includes(reason as AlicizationRuntimeTimeoutReason)
}

export function readAlicizationRuntimeTimeoutDescriptor(
  error: unknown,
): import('@proj-alicization/stage-shared').AlicizationChatTimeoutDescriptor | null {
  if (!error || typeof error !== 'object')
    return null

  const raw = (error as Record<string, unknown>).timeoutDescriptor
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const descriptor = raw as Record<string, unknown>
  if (
    (descriptor.origin !== 'renderer-watchdog' && descriptor.origin !== 'main-watchdog')
    || (descriptor.timeoutPhase !== 'first-event-timeout'
      && descriptor.timeoutPhase !== 'liveness-timeout'
      && descriptor.timeoutPhase !== 'idle-timeout')
    || (descriptor.timeoutStage !== 'provider'
      && descriptor.timeoutStage !== 'tool-execution'
      && descriptor.timeoutStage !== 'provider-continuation')
    || typeof descriptor.timeoutMs !== 'number'
    || !Number.isFinite(descriptor.timeoutMs)
    || typeof descriptor.elapsedMs !== 'number'
    || !Number.isFinite(descriptor.elapsedMs)
    || (typeof descriptor.lastEventType !== 'string' && descriptor.lastEventType !== null)
    || typeof descriptor.sawAnyEvent !== 'boolean'
    || typeof descriptor.sawProgress !== 'boolean'
  ) {
    return null
  }

  return descriptor as unknown as import('@proj-alicization/stage-shared').AlicizationChatTimeoutDescriptor
}

function resolveRendererWatchdogTimeoutReason(
  record: Record<string, unknown>,
): AlicizationRuntimeTimeoutReason | null {
  if (
    record.errorCode !== 'ALICIZATION_RENDERER_STREAM_TIMEOUT'
    || record.timeoutOrigin !== 'renderer-watchdog'
  ) {
    return null
  }

  const phase = record.timeoutPhase
  const stage = record.timeoutStage
  if (
    (phase !== 'first-event-timeout'
      && phase !== 'liveness-timeout'
      && phase !== 'idle-timeout')
    || (stage !== 'provider'
      && stage !== 'tool-execution'
      && stage !== 'provider-continuation')
  ) {
    return null
  }

  const rendererPhase = phase as RendererTimeoutPhase
  const rendererStage = stage as RendererTimeoutStage
  if (rendererPhase === 'first-event-timeout' && rendererStage === 'provider')
    return 'chat-first-event-timeout'
  if (
    rendererPhase === 'liveness-timeout'
    && rendererStage === 'provider'
  ) {
    return 'chat-provider-liveness-timeout'
  }
  if (
    rendererPhase === 'idle-timeout'
    && rendererStage === 'provider'
  ) {
    return 'chat-provider-idle-timeout'
  }
  if (
    (rendererPhase === 'liveness-timeout' || rendererPhase === 'idle-timeout')
    && rendererStage === 'tool-execution'
  ) {
    return 'chat-tool-result-handoff-timeout'
  }
  if (
    rendererPhase === 'idle-timeout'
    && rendererStage === 'provider-continuation'
  ) {
    return 'chat-provider-continuation-timeout'
  }
  return null
}

export function resolveAlicizationRuntimeTimeoutReason(
  error: unknown,
): AlicizationRuntimeTimeoutReason | null {
  if (!error || typeof error !== 'object')
    return null

  const record = error as Record<string, unknown>
  const rendererReason = resolveRendererWatchdogTimeoutReason(record)
  if (rendererReason)
    return rendererReason

  if (
    record.errorCode !== 'ALICIZATION_RUNTIME_TIMEOUT'
    || (record.timeoutOrigin !== 'runtime-watchdog'
      && record.timeoutOrigin !== 'main-watchdog')
    || !isAlicizationRuntimeTimeoutReason(record.timeoutReason)
  ) {
    return null
  }

  return record.timeoutReason
}

export function createAlicizationRuntimeAbortError(reason?: string) {
  const normalizedReason = reason?.trim() || 'unknown'
  const error = new DOMException(
    `Alicization runtime aborted: ${normalizedReason}`,
    'AbortError',
  )
  if (!isAlicizationRuntimeTimeoutReason(normalizedReason))
    return error

  return Object.assign(error, {
    errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
    failureKind: 'timeout',
    timeoutOrigin: 'runtime-watchdog',
    timeoutReason: normalizedReason,
  })
}

export function createAlicizationRendererWatchdogAbortError(
  descriptor: import('@proj-alicization/stage-shared').AlicizationChatTimeoutDescriptor,
) {
  const error = new DOMException(
    `Alicization renderer watchdog timed out: ${descriptor.timeoutPhase}/${descriptor.timeoutStage}`,
    'AbortError',
  )
  const timeoutReason = resolveAlicizationRuntimeTimeoutReason({
    errorCode: 'ALICIZATION_RENDERER_STREAM_TIMEOUT',
    timeoutOrigin: 'renderer-watchdog',
    timeoutPhase: descriptor.timeoutPhase,
    timeoutStage: descriptor.timeoutStage,
  })
  return Object.assign(error, {
    errorCode: 'ALICIZATION_RENDERER_STREAM_TIMEOUT',
    failureKind: 'timeout',
    timeoutOrigin: 'renderer-watchdog',
    timeoutPhase: descriptor.timeoutPhase,
    timeoutStage: descriptor.timeoutStage,
    timeoutReason,
    timeoutMs: descriptor.timeoutMs,
    elapsedMs: descriptor.elapsedMs,
    lastEventType: descriptor.lastEventType,
    sawAnyEvent: descriptor.sawAnyEvent,
    sawProgress: descriptor.sawProgress,
    timeoutDescriptor: descriptor,
  })
}

export function createAlicizationMainWatchdogAbortError(
  descriptor: Omit<import('@proj-alicization/stage-shared').AlicizationChatTimeoutDescriptor, 'origin'>,
  timeoutReason: AlicizationRuntimeTimeoutReason,
) {
  const completeDescriptor = {
    ...descriptor,
    origin: 'main-watchdog' as const,
  }
  const error = new DOMException(
    `Alicization main watchdog timed out: ${timeoutReason}`,
    'AbortError',
  )
  return Object.assign(error, {
    errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
    failureKind: 'timeout',
    timeoutOrigin: 'main-watchdog',
    timeoutReason,
    timeoutDescriptor: completeDescriptor,
  })
}
