import type { AlicizationExecutionEventInput, AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execPath, platform } from 'node:process'

import { expect, it } from 'vitest'

import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createAlicizationMainGatewayWorkCoordinator } from '../main-gateway-work-coordinator'
import { createInitiativeStopObserver } from './initiative-stop-observer'
import { createExecutionResourceBroker } from './resource-broker'
import { createExecutionUserCommandScope } from './user-command-scope'
import { runWindowsProcessCommand } from './windows-process-command'
import { isVerifiedWindowsProcessJobStop } from './windows-process-job'

it.skipIf(platform !== 'win32')('foreground controls stop an actual read-only initiative and reject foreign, cloned or mutating stop evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'owned-initiative-priority-'))
  const thread: AlicizationTaskThreadRecord = {
    id: 'initiative-native-stop',
    attemptId: 'attempt-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'subconscious-proactive',
    goal: 'Inspect the owned test workspace',
    kind: 'codebase-investigation',
    status: 'planned',
    selectedChannel: 'codex',
    proposedChannel: 'codex',
    summary: 'Owned read-only investigation',
    metadata: { task: { effect: 'observe', permissionMode: 'none' } },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastEventAt: null,
    completedAt: null,
  }
  const coordinator = createAlicizationMainGatewayWorkCoordinator()
  const broker = createExecutionResourceBroker()
  const interrupts = createExecutionInterruptRegistry(broker, { foregroundActive: () => coordinator.snapshot().activeForegroundCount > 0 })
  const observer = createInitiativeStopObserver(thread)
  const ready = join(root, 'ready.txt')
  const controller = new AbortController()
  let finished = false
  const work = interrupts.run({ cardId: 'alice', threadId: thread.id, signal: controller.signal, backgroundInitiative: true, confirmStopped: observer.confirmStopped }, async (signal) => {
    const startedAt = Date.now()
    const result = await runWindowsProcessCommand({
      command: execPath,
      args: ['-e', 'require("node:fs").writeFileSync(process.argv[1],"ready");setInterval(()=>{},1000)', ready],
      cwd: root,
      env: process.env,
      owner: `${thread.id}:${thread.turnId}`,
      protectedRoot: join(root, 'native'),
      prefix: 'OWNED_INITIATIVE',
      timeoutMs: 20_000,
      maxBytes: 2048,
      signal,
      authorize: async () => !signal.aborted,
      now: Date.now,
      startedAt,
    })
    const event: AlicizationExecutionEventInput = { threadId: thread.id, attemptId: thread.attemptId, turnId: thread.turnId, origin: thread.origin, channel: 'codex', kind: 'cancel', threadStatus: 'cancelled', payload: { adapter: 'codex', processTree: result.processTree }, createdAt: Date.now() }
    expect(result.aborted).toBe(true)
    expect(isVerifiedWindowsProcessJobStop(result.processTree, `${thread.id}:${thread.turnId}`)).toBe(true)
    expect(isVerifiedWindowsProcessJobStop(result.processTree, 'foreign-owner')).toBe(false)
    expect(isVerifiedWindowsProcessJobStop(structuredClone(result.processTree), `${thread.id}:${thread.turnId}`)).toBe(false)
    expect(Object.isFrozen(result.processTree)).toBe(true)
    expect(Object.isFrozen(result.processTree?.receipt)).toBe(true)
    for (const invalid of [
      { ...event, threadId: 'foreign-thread' },
      { ...event, attemptId: 'old-attempt' },
      { ...event, turnId: 'old-turn' },
      { ...event, channel: 'cli' as const },
      { ...event, payload: { adapter: 'claude-code', processTree: result.processTree } },
      { ...event, payload: { adapter: 'codex', processTree: structuredClone(result.processTree) } },
    ]) {
      const reject = createInitiativeStopObserver(thread)
      reject.observe([invalid])
      expect(await reject.confirmStopped()).toBe(false)
    }
    for (const effect of ['mutate', 'high-impact']) {
      const mutating = createInitiativeStopObserver({ ...thread, metadata: { task: { effect } } })
      mutating.observe([event])
      expect(await mutating.confirmStopped()).toBe(false)
    }
    observer.observe([event])
    expect(await observer.confirmStopped()).toBe(true)
    finished = true
    return result
  })
  // Attach a rejection observer before waiting for the native ready marker.
  const settled = work.then(value => ({ value }), error => ({ error }))
  try {
    const deadline = Date.now() + 15_000
    while (!await readFile(ready, 'utf8').catch(() => null)) {
      if (finished || Date.now() >= deadline)
        throw new Error('Owned initiative failed to become ready')
      await new Promise(resolveDelay => setTimeout(resolveDelay, 20))
    }
    const command = createExecutionUserCommandScope({
      coordinator,
      entered: () => { expect(interrupts.cancelInitiatives()).toMatchObject({ requested: 1 }) },
      scope: async (_cardId, task) => {
        expect(coordinator.snapshot().activeForegroundCount).toBe(1)
        // Cancellation has not acknowledged actual process closure yet.
        expect(() => broker.acquire({ owner: 'premature-user', resources: ['host:execution'] })).toThrow('another executor')
        expect(await settled).not.toHaveProperty('error')
        return task()
      },
      settled: () => {},
    })
    await command('alice', async () => {
      expect(broker.snapshot()).toEqual([])
      const lease = broker.acquire({ owner: 'foreground-user', resources: ['host:execution'] })
      broker.settle(lease, { stopped: true, uncertain: false })
    })
    expect(coordinator.snapshot().activeForegroundCount).toBe(0)
    expect(interrupts.isActive()).toBe(false)
  }
  finally {
    controller.abort()
    await settled
    coordinator.close()
    await rm(root, { recursive: true, force: true })
  }
}, 35_000)
