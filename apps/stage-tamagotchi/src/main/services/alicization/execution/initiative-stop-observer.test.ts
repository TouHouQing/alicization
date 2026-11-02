import type { AlicizationExecutionEventInput, AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { describe, expect, it } from 'vitest'

import { persistCancelledBeforeDispatch } from '../task-thread-dispatcher'
import { createInitiativeStopObserver } from './initiative-stop-observer'
import { processDispatchRefusal } from './process-dispatch-authority'

function createThread(): AlicizationTaskThreadRecord {
  return {
    id: 'initiative',
    attemptId: 'attempt-1',
    decisionTraceId: 'trace',
    turnId: 'turn',
    sessionId: 'session',
    origin: 'subconscious-proactive',
    goal: 'Read the owned report',
    kind: 'codebase-investigation',
    status: 'planned',
    selectedChannel: 'codex',
    proposedChannel: 'codex',
    summary: null,
    metadata: { task: { effect: 'observe' } },
    createdAt: 1,
    updatedAt: 1,
    lastEventAt: null,
    completedAt: null,
  }
}

describe('initiative stop acknowledgement', () => {
  it('recognizes a main-owned native dispatch refusal and rejects a serialized or stale claim', async () => {
    const thread = createThread()
    const refusal = processDispatchRefusal(thread, 'codex', { aborted: true, errorCode: 'CODEX_ABORTED' }, () => 2)
    const event = { ...refusal.events[0], attemptId: thread.attemptId }
    const stopped = createInitiativeStopObserver(thread)
    stopped.observe([event])
    expect(await stopped.confirmStopped()).toBe(true)
    for (const invalid of [structuredClone(event), { ...event, attemptId: 'old-attempt' }, { ...event, threadId: 'other-thread' }, { ...event, channel: 'cli' as const }]) {
      const observer = createInitiativeStopObserver(thread)
      observer.observe([invalid])
      expect(await observer.confirmStopped()).toBe(false)
    }
  })

  it('persists dispatcher cancellation before native entry and preserves its local proof through event tagging', async () => {
    const thread = createThread()
    const events: AlicizationExecutionEventInput[] = []
    const observer = createInitiativeStopObserver(thread)
    const result = await persistCancelledBeforeDispatch({
      port: {
        getTaskThread: async () => thread,
        upsertTaskThread: async input => ({ ...thread, ...input, id: input.id ?? thread.id }),
        appendExecutionEvents: async (batch) => { events.push(...batch); observer.observe(batch.map(event => ({ ...event }))) },
      },
      thread,
      reason: 'Foreground request preempted initiative',
      now: () => 2,
      persistenceTimeoutMs: 1000,
    })
    expect(result.finalStatus).toBe('cancelled')
    expect(events).toHaveLength(1)
    expect(await observer.confirmStopped()).toBe(true)
    expect(await createInitiativeStopObserver(thread).confirmStopped()).toBe(false)
  })

  it('keeps cancelled status and provider-authored process flags insufficient for resource release', async () => {
    const thread = createThread()
    const observer = createInitiativeStopObserver(thread)
    observer.observe([{ threadId: thread.id, attemptId: thread.attemptId, turnId: thread.turnId, origin: thread.origin, channel: 'codex', kind: 'cancel', threadStatus: 'cancelled', payload: { adapter: 'codex', processStarted: false, sideEffectState: 'none', processTree: { treeStopped: true, receipt: { treeStopped: true, activeProcesses: 0, errorCode: null } } }, createdAt: 2 }])
    expect(await observer.confirmStopped()).toBe(false)
  })
})
