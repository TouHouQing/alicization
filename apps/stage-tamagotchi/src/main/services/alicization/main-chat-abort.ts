import type { AlicizationChatAbortPayload, AlicizationChatAbortResult } from '../../../shared/eventa'
import type { ChatRunState } from './runtime-soul'

import {
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'

import {
  createAlicizationRendererWatchdogAbortError,
  resolveAlicizationRuntimeTimeoutReason,
} from './turn-os/runtime-errors'

interface AlicizationMainChatAbortRunStateFacade {
  createKey: (cardId: string, turnId: string) => string
  hasRecentlyFinished: (key: string) => boolean
  finishRun: (key: string, payload: {
    status: 'completed' | 'aborted' | 'timed-out' | 'failed'
    finishReason: string
    fullText?: string
    error?: string
    failureSurface?: ReturnType<typeof resolveAlicizationChatFailureSurface>
  }) => void
}

interface AbortAlicizationDirectChatRunOptions {
  payload: AlicizationChatAbortPayload
  getRun: (key: string) => ChatRunState | undefined
  mainChatRunState: AlicizationMainChatAbortRunStateFacade
  createAbortError: (reason: string) => Error
  appendRuntimeDebugLine: (event: string, payload: Record<string, unknown>) => Promise<void>
}

interface AbortAlicizationRunningChatRunsOptions {
  runs: Iterable<[string, ChatRunState]>
  reason: string
  mainChatRunState: AlicizationMainChatAbortRunStateFacade
  createAbortError: (reason: string) => Error
}

async function abortAlicizationChatRun(input: {
  key: string
  run: ChatRunState
  reason: unknown
  timeout?: NonNullable<AlicizationChatAbortPayload['timeout']>
  mainChatRunState: AlicizationMainChatAbortRunStateFacade
  createAbortError: (reason: string) => Error
}) {
  const timeoutError = input.timeout
    ? createAlicizationRendererWatchdogAbortError(input.timeout)
    : null
  const cancellationReason = timeoutError ?? input.reason
  const cancelTurn = input.run.cancelTurn
  if (cancelTurn) {
    const accepted = await cancelTurn(cancellationReason)
    if (!accepted)
      return false
  }

  input.run.state = 'aborted'
  if (!cancelTurn) {
    input.run.controller.abort(
      timeoutError ?? input.createAbortError(String(input.reason)),
    )
  }

  const timeoutReason = timeoutError
    ? resolveAlicizationRuntimeTimeoutReason(timeoutError)
    : null
  if (timeoutReason && input.timeout) {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: timeoutReason === 'chat-provider-continuation-timeout'
        ? 'provider-continuation-timeout'
        : 'timeout',
      timeout: {
        providerId: 'renderer-watchdog',
        model: 'unknown-model',
        phase: input.timeout.timeoutStage === 'tool-execution'
          ? 'tool-result-handoff'
          : timeoutReason === 'chat-first-event-timeout'
            ? 'provider-first-event'
            : timeoutReason === 'chat-preparation-timeout'
              ? 'preparation'
              : 'provider-continuation',
        timeoutPhase: input.timeout.timeoutPhase,
        timeoutStage: input.timeout.timeoutStage,
        timeoutReason,
        timeoutMs: input.timeout.timeoutMs,
        elapsedMs: input.timeout.elapsedMs,
        lastEventType: input.timeout.lastEventType,
        sawAnyEvent: input.timeout.sawAnyEvent,
        sawProgress: input.timeout.sawProgress,
        descriptor: input.timeout,
      },
    })
    input.mainChatRunState.finishRun(input.key, {
      status: 'timed-out',
      finishReason: timeoutReason,
      error: failureSurface.reply,
      failureSurface,
    })
  }
  else {
    input.mainChatRunState.finishRun(input.key, {
      status: 'aborted',
      finishReason: String(input.reason),
    })
  }
  return true
}

export async function abortAlicizationRunningChatRuns(input: AbortAlicizationRunningChatRunsOptions) {
  let aborted = 0
  for (const [key, run] of input.runs) {
    if (run.state !== 'running')
      continue
    const accepted = await abortAlicizationChatRun({
      key,
      run,
      reason: input.reason,
      mainChatRunState: input.mainChatRunState,
      createAbortError: input.createAbortError,
    })
    if (accepted)
      aborted += 1
  }
  return aborted
}

export async function abortAlicizationDirectChatRun(
  input: AbortAlicizationDirectChatRunOptions,
): Promise<AlicizationChatAbortResult> {
  const key = input.mainChatRunState.createKey(input.payload.cardId, input.payload.turnId)
  const run = input.getRun(key)
  if (!run) {
    if (input.mainChatRunState.hasRecentlyFinished(key)) {
      return {
        accepted: false,
        state: 'finished',
      }
    }
    return {
      accepted: false,
      state: 'not-found',
    }
  }

  if (run.state === 'finished') {
    return {
      accepted: false,
      state: 'finished',
    }
  }

  const accepted = await abortAlicizationChatRun({
    key,
    run,
    reason: input.payload.reason ?? 'manual',
    ...(input.payload.timeout ? { timeout: input.payload.timeout } : {}),
    mainChatRunState: input.mainChatRunState,
    createAbortError: input.createAbortError,
  })
  if (!accepted) {
    return {
      accepted: false,
      state: 'finished',
    }
  }
  await input.appendRuntimeDebugLine('chat-abort.accepted', {
    cardId: input.payload.cardId,
    turnId: input.payload.turnId,
    reason: input.payload.reason ?? 'manual',
    transport: 'direct',
    ...(input.payload.timeout ? { timeout: input.payload.timeout } : {}),
  })
  return {
    accepted: true,
    state: 'aborted',
  }
}
