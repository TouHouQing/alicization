import type { AlicizationChatFinishEvent } from '../../../shared/eventa'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type { ChatRunState } from './runtime-soul'

interface AlicizationMainChatRunStateControllerOptions {
  runs: Map<string, ChatRunState>
  sessionTraceGetters: Map<string, () => AlicizationRuntimeCallChainSnapshot>
  recentlyFinishedRuns: Map<string, number>
  finishedRetentionMs: number
  normalizeCardId: (raw: unknown) => string
  appendRuntimeDebugLine: (event: string, payload: Record<string, unknown>) => Promise<void>
  emitFinishEvent: (state: ChatRunState, payload: AlicizationChatFinishEvent) => void
  getNow?: () => number
}

export function createAlicizationMainChatRunStateController(
  options: AlicizationMainChatRunStateControllerOptions,
) {
  const getNow = options.getNow ?? Date.now

  function createKey(cardId: string, turnId: string) {
    return `${options.normalizeCardId(cardId)}::${turnId.trim()}`
  }

  function rememberFinished(key: string, finishedAt = getNow()) {
    options.recentlyFinishedRuns.set(key, finishedAt)
    for (const [knownKey, knownFinishedAt] of options.recentlyFinishedRuns.entries()) {
      if (finishedAt - knownFinishedAt > options.finishedRetentionMs)
        options.recentlyFinishedRuns.delete(knownKey)
    }
  }

  function hasRecentlyFinished(key: string, now = getNow()) {
    const finishedAt = options.recentlyFinishedRuns.get(key)
    if (typeof finishedAt !== 'number')
      return false
    if (now - finishedAt > options.finishedRetentionMs) {
      options.recentlyFinishedRuns.delete(key)
      return false
    }
    return true
  }

  function setSessionTraceGetter(key: string, getter: () => AlicizationRuntimeCallChainSnapshot) {
    options.sessionTraceGetters.set(key, getter)
  }

  function clearFinishedRuns() {
    options.recentlyFinishedRuns.clear()
  }

  function clearAll() {
    options.sessionTraceGetters.clear()
    options.runs.clear()
    options.recentlyFinishedRuns.clear()
  }

  function finishRun(key: string, payload: Omit<AlicizationChatFinishEvent, 'cardId' | 'turnId'>) {
    const state = options.runs.get(key)
    if (!state)
      return
    if (state.state === 'finished')
      return

    state.state = 'finished'
    options.runs.delete(key)
    const sessionTrace = options.sessionTraceGetters.get(key)?.()
    options.sessionTraceGetters.delete(key)
    rememberFinished(key)

    void options.appendRuntimeDebugLine('chat-stream.finished', {
      cardId: state.cardId,
      turnId: state.turnId,
      status: payload.status,
      finishReason: payload.finishReason,
      error: payload.error,
      chunkCount: state.chunkCount,
      rawChunkChars: state.rawChunkChars,
      fullTextChars: payload.fullText?.length ?? 0,
      sessionPhases: sessionTrace?.phaseOrder ?? [],
      sessionTraceHistoryCount: sessionTrace?.history.length ?? 0,
    })

    options.emitFinishEvent(state, {
      cardId: state.cardId,
      turnId: state.turnId,
      ...payload,
    })
  }

  return {
    clearAll,
    clearFinishedRuns,
    createKey,
    finishRun,
    hasRecentlyFinished,
    setSessionTraceGetter,
  }
}
