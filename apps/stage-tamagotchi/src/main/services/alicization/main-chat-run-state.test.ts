import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type { ChatRunState } from './runtime-soul'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMainChatRunStateController } from './main-chat-run-state'

function createController() {
  let now = 1_000
  const runs = new Map<string, ChatRunState>()
  const sessionTraceGetters = new Map<string, () => AlicizationRuntimeCallChainSnapshot>()
  const recentlyFinishedRuns = new Map<string, number>()
  const appendRuntimeDebugLine = vi.fn(async () => {})
  const emitFinishEvent = vi.fn()
  const controller = createAlicizationMainChatRunStateController({
    runs,
    sessionTraceGetters,
    recentlyFinishedRuns,
    finishedRetentionMs: 100,
    normalizeCardId: raw => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
    appendRuntimeDebugLine,
    emitFinishEvent,
    getNow: () => now,
  })

  return {
    controller,
    runs,
    sessionTraceGetters,
    recentlyFinishedRuns,
    appendRuntimeDebugLine,
    emitFinishEvent,
    setNow(value: number) {
      now = value
    },
  }
}

describe('main chat run state', () => {
  it('creates normalized run keys', () => {
    const { controller } = createController()

    expect(controller.createKey(' card-1 ', ' turn-1 ')).toBe('card-1::turn-1')
  })

  it('finishes a run and emits trace-aware finish metadata', () => {
    const {
      controller,
      runs,
      sessionTraceGetters,
      recentlyFinishedRuns,
      appendRuntimeDebugLine,
      emitFinishEvent,
    } = createController()
    const key = controller.createKey('card-1', 'turn-1')
    runs.set(key, {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      chunkCount: 2,
      rawChunkChars: 11,
      state: 'running',
    })
    sessionTraceGetters.set(key, () => ({
      currentChain: [],
      currentDepth: 0,
      history: [
        {
          callId: 'prepare',
          depth: 0,
          startedAt: 1,
          finishedAt: 2,
          durationMs: 1,
          status: 'completed',
          metadata: null,
          errorMessage: null,
        },
      ],
      maxDepth: 12,
      phaseOrder: ['prepare', 'stream'],
    }))

    controller.finishRun(key, {
      status: 'completed',
      finishReason: 'stop',
      fullText: 'hello world',
    })

    expect(runs.has(key)).toBe(false)
    expect(sessionTraceGetters.has(key)).toBe(false)
    expect(recentlyFinishedRuns.get(key)).toBe(1_000)
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.finished', {
      cardId: 'card-1',
      turnId: 'turn-1',
      status: 'completed',
      finishReason: 'stop',
      error: undefined,
      chunkCount: 2,
      rawChunkChars: 11,
      fullTextChars: 11,
      sessionPhases: ['prepare', 'stream'],
      sessionTraceHistoryCount: 1,
    })
    expect(emitFinishEvent).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      state: 'finished',
    }), {
      cardId: 'card-1',
      turnId: 'turn-1',
      status: 'completed',
      finishReason: 'stop',
      fullText: 'hello world',
    })
  })

  it('expires recently finished keys after the retention window', () => {
    const { controller, runs, recentlyFinishedRuns, setNow } = createController()
    const key = controller.createKey('card-1', 'turn-1')
    runs.set(key, {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running',
    })

    controller.finishRun(key, {
      status: 'aborted',
      finishReason: 'manual',
    })

    expect(controller.hasRecentlyFinished(key)).toBe(true)
    setNow(1_101)
    expect(controller.hasRecentlyFinished(key)).toBe(false)
    expect(recentlyFinishedRuns.has(key)).toBe(false)
  })

  it('keeps a short-lived finish payload snapshot for recently finished runs', () => {
    const { controller, runs, setNow } = createController()
    const key = controller.createKey('card-1', 'turn-1')
    runs.set(key, {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running',
    })

    controller.finishRun(key, {
      status: 'completed',
      finishReason: 'stop',
      fullText: 'hello world',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'test-finish-payload',
      },
      visibleReplyCritic: {
        mustPreserve: ['same digital life continuity'],
        mustAvoid: [],
        reasons: ['semantic-judge:project-state-same-her-missing'],
      } as any,
      visibleReplyClosure: {
        status: 'rewritten',
        reasonCodes: ['project-state-same-her-continuity-required'],
      } as any,
    })

    expect(controller.getRecentlyFinishedPayload(key)).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      visibleReplyExecution: expect.objectContaining({
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
      }),
      visibleReplyCritic: expect.objectContaining({
        mustPreserve: expect.arrayContaining([
          'same digital life continuity',
        ]),
        reasons: expect.arrayContaining([
          'semantic-judge:project-state-same-her-missing',
        ]),
      }),
      visibleReplyClosure: expect.objectContaining({
        status: 'rewritten',
        reasonCodes: expect.arrayContaining([
          'project-state-same-her-continuity-required',
        ]),
      }),
    }))

    setNow(1_101)
    expect(controller.getRecentlyFinishedPayload(key)).toBeNull()
  })

  it('ignores missing or already finished runs', () => {
    const { controller, runs, appendRuntimeDebugLine, emitFinishEvent } = createController()
    const key = controller.createKey('card-1', 'turn-1')
    runs.set(key, {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'finished',
    })

    controller.finishRun('missing', {
      status: 'failed',
      finishReason: 'error',
      error: 'boom',
    })
    controller.finishRun(key, {
      status: 'failed',
      finishReason: 'error',
      error: 'boom',
    })

    expect(appendRuntimeDebugLine).not.toHaveBeenCalled()
    expect(emitFinishEvent).not.toHaveBeenCalled()
    expect(runs.get(key)?.state).toBe('finished')
  })

  it('clears transient run state caches together during teardown', () => {
    const { controller, runs, sessionTraceGetters, recentlyFinishedRuns } = createController()
    const key = controller.createKey('card-1', 'turn-1')
    runs.set(key, {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running',
    })
    controller.setSessionTraceGetter(key, () => ({
      currentChain: [],
      currentDepth: 0,
      history: [],
      maxDepth: 12,
      phaseOrder: [],
    }))
    recentlyFinishedRuns.set('stale', 1)

    controller.clearAll()

    expect(runs.size).toBe(0)
    expect(sessionTraceGetters.size).toBe(0)
    expect(recentlyFinishedRuns.size).toBe(0)
  })
})
