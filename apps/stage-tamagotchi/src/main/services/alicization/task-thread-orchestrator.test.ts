import type { AlicizationDispatchTaskThreadResult, AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import type { AlicizationTaskThreadDispatchPort } from './task-thread-dispatcher'

import { describe, expect, it, vi } from 'vitest'

import { createTaskThreadOrchestrator } from './task-thread-orchestrator'

function createThread(
  id: string,
  selectedChannel: AlicizationTaskThreadRecord['selectedChannel'],
): AlicizationTaskThreadRecord {
  return {
    id,
    decisionTraceId: `mind:trace:${id}`,
    turnId: `turn:${id}`,
    sessionId: `session:${id}`,
    origin: 'user-turn',
    goal: `Goal for ${id}`,
    kind: selectedChannel === 'cli' ? 'run-command' : 'codebase-edit',
    status: 'planned',
    selectedChannel,
    proposedChannel: selectedChannel,
    summary: null,
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'mutate',
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: null,
    completedAt: null,
  }
}

function createPort(threads: AlicizationTaskThreadRecord[]): AlicizationTaskThreadDispatchPort {
  const threadById = new Map(threads.map(thread => [thread.id, thread]))
  return {
    getTaskThread: vi.fn(async (id: string) => threadById.get(id)),
    upsertTaskThread: vi.fn(async input => input as AlicizationTaskThreadRecord),
    appendExecutionEvents: vi.fn(async () => {}),
    upsertExecutorSession: vi.fn(async () => {}),
    appendAuditLog: vi.fn(async () => {}),
  }
}

function createDeferredGate() {
  let resolveGate: () => void = () => {}
  const promise = new Promise<void>((resolve) => {
    resolveGate = resolve
  })
  return {
    wait: promise,
    release: resolveGate,
  }
}

function buildDispatchResult(thread: AlicizationTaskThreadRecord): AlicizationDispatchTaskThreadResult {
  return {
    thread: {
      ...thread,
      status: 'completed',
      summary: `completed:${thread.id}`,
      updatedAt: 200,
      completedAt: 200,
      lastEventAt: 200,
    },
    createdEventKinds: ['dispatch', 'result'],
    ok: true,
    summary: `completed:${thread.id}`,
    output: null,
  }
}

describe('task-thread orchestrator', () => {
  it('serializes codex and claude-code dispatches by channel', async () => {
    const threadA = createThread('thread-codex-1', 'codex')
    const threadB = createThread('thread-codex-2', 'codex')
    const port = createPort([threadA, threadB])
    const gateA = createDeferredGate()
    const gateB = createDeferredGate()
    const started: string[] = []
    let active = 0
    let maxActive = 0

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        started.push(thread.id)
        active += 1
        maxActive = Math.max(maxActive, active)
        if (thread.id === threadA.id)
          await gateA.wait
        else
          await gateB.wait
        active -= 1
        return buildDispatchResult(thread)
      },
    })

    const promiseA = orchestrator.dispatch({
      port,
      input: { threadId: threadA.id },
    })
    const promiseB = orchestrator.dispatch({
      port,
      input: { threadId: threadB.id },
    })

    await vi.waitFor(() => {
      expect(started).toEqual([threadA.id])
      expect(maxActive).toBe(1)
    })

    gateA.release()
    await vi.waitFor(() => {
      expect(started).toEqual([threadA.id, threadB.id])
      expect(maxActive).toBe(1)
    })

    gateB.release()
    const [resultA, resultB] = await Promise.all([promiseA, promiseB])
    expect(resultA.ok).toBe(true)
    expect(resultB.ok).toBe(true)
  })

  it('deduplicates in-flight dispatches for the same thread', async () => {
    const thread = createThread('thread-codex-dedupe', 'codex')
    const port = createPort([thread])
    const gate = createDeferredGate()
    let runCount = 0
    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async () => {
        runCount += 1
        await gate.wait
        return buildDispatchResult(thread)
      },
    })

    const dispatchA = orchestrator.dispatch({
      port,
      input: { threadId: thread.id },
    })
    const dispatchB = orchestrator.dispatch({
      port,
      input: { threadId: thread.id },
    })

    await vi.waitFor(() => {
      expect(runCount).toBe(1)
    })
    gate.release()
    const [resultA, resultB] = await Promise.all([dispatchA, dispatchB])
    expect(runCount).toBe(1)
    expect(resultA.summary).toBe(resultB.summary)
  })

  it('allows parallel dispatch for non-serialized channels', async () => {
    const threadA = createThread('thread-cli-1', 'cli')
    const threadB = createThread('thread-cli-2', 'cli')
    const port = createPort([threadA, threadB])
    const gateA = createDeferredGate()
    const gateB = createDeferredGate()
    let active = 0
    let maxActive = 0

    const orchestrator = createTaskThreadOrchestrator({
      runDispatch: async ({ input }) => {
        const thread = await port.getTaskThread(input.threadId)
        if (!thread)
          throw new Error('thread not found')
        active += 1
        maxActive = Math.max(maxActive, active)
        if (thread.id === threadA.id)
          await gateA.wait
        else
          await gateB.wait
        active -= 1
        return buildDispatchResult(thread)
      },
    })

    const promiseA = orchestrator.dispatch({
      port,
      input: { threadId: threadA.id },
    })
    const promiseB = orchestrator.dispatch({
      port,
      input: { threadId: threadB.id },
    })

    await vi.waitFor(() => {
      expect(maxActive).toBe(2)
    })

    gateA.release()
    gateB.release()
    await Promise.all([promiseA, promiseB])
  })
})
