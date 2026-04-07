import type { AlicizationChatAbortPayload, AlicizationChatAbortResult } from '../../../shared/eventa'
import type { ChatRunState } from './runtime-soul'

interface AlicizationMainChatAbortRunStateFacade {
  createKey: (cardId: string, turnId: string) => string
  hasRecentlyFinished: (key: string) => boolean
  finishRun: (key: string, payload: {
    status: 'completed' | 'aborted' | 'failed'
    finishReason: string
    fullText?: string
    error?: string
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

function abortAlicizationChatRun(input: {
  key: string
  run: ChatRunState
  reason: string
  mainChatRunState: AlicizationMainChatAbortRunStateFacade
  createAbortError: (reason: string) => Error
}) {
  input.run.state = 'aborted'
  input.run.controller.abort(input.createAbortError(input.reason))
  input.mainChatRunState.finishRun(input.key, {
    status: 'aborted',
    finishReason: input.reason,
  })
}

export function abortAlicizationRunningChatRuns(input: AbortAlicizationRunningChatRunsOptions) {
  let aborted = 0
  for (const [key, run] of input.runs) {
    if (run.state !== 'running')
      continue
    abortAlicizationChatRun({
      key,
      run,
      reason: input.reason,
      mainChatRunState: input.mainChatRunState,
      createAbortError: input.createAbortError,
    })
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

  abortAlicizationChatRun({
    key,
    run,
    reason: input.payload.reason ?? 'manual',
    mainChatRunState: input.mainChatRunState,
    createAbortError: input.createAbortError,
  })
  await input.appendRuntimeDebugLine('chat-abort.accepted', {
    cardId: input.payload.cardId,
    turnId: input.payload.turnId,
    reason: input.payload.reason ?? 'manual',
    transport: 'direct',
  })
  return {
    accepted: true,
    state: 'aborted',
  }
}
