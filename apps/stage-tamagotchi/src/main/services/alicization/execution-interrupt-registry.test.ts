import { describe, expect, it, vi } from 'vitest'

import { createExecutionInterruptRegistry } from './execution-interrupt-registry'
import { createExecutionResourceBroker } from './execution/resource-broker'

describe('bounded execution interruption', () => {
  it('admits an invited personal child under its current foreground resource owner', async () => {
    const broker = createExecutionResourceBroker()
    const registry = createExecutionInterruptRegistry(broker, { foregroundActive: () => true })
    const parent = broker.acquire({ owner: 'current-human-turn', resources: ['host:execution'] })
    const invitation = vi.fn(async () => broker.assert(parent))
    const callback = vi.fn(async (signal: AbortSignal) => {
      signal.throwIfAborted()
      expect(broker.snapshot()).toHaveLength(2)
      expect(broker.snapshot().every(lease => lease.owner === parent.owner)).toBe(true)
      return 'created'
    })
    await expect(broker.withOwner(parent.owner, () => registry.run({ cardId: 'alice', threadId: 'personal:invited', backgroundInitiative: true, foregroundInvitation: invitation }, callback))).resolves.toBe('created')
    expect(invitation).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(broker.snapshot()).toHaveLength(1)
    broker.settle(parent, { stopped: true, uncertain: false })
  })

  it('refuses a withdrawn invitation even after the foreground owner has ended', async () => {
    const broker = createExecutionResourceBroker()
    const registry = createExecutionInterruptRegistry(broker, { foregroundActive: () => false })
    const callback = vi.fn()
    const invitation = vi.fn(async () => {
      throw new DOMException('Invitation withdrawn', 'AbortError')
    })
    await expect(registry.run({ cardId: 'alice', threadId: 'personal:withdrawn', backgroundInitiative: true, foregroundInvitation: invitation }, callback)).rejects.toMatchObject({ name: 'AbortError' })
    expect(callback).not.toHaveBeenCalled()
    expect(broker.snapshot()).toEqual([])
    expect(registry.isActive()).toBe(false)
  })

  it('rechecks an invitation after waiting for another writer before calling the adapter', async () => {
    const broker = createExecutionResourceBroker()
    const registry = createExecutionInterruptRegistry(broker, { foregroundActive: () => true })
    const held = broker.acquire({ owner: 'older-writer', resources: ['host:execution'] })
    let current = true
    const invitation = vi.fn(async () => {
      if (!current)
        throw new DOMException('New human turn', 'AbortError')
    })
    const callback = vi.fn()
    const pending = registry.run({ cardId: 'alice', threadId: 'personal:waiting', backgroundInitiative: true, foregroundInvitation: invitation }, callback).then(() => null, error => error)
    await vi.waitFor(() => expect(invitation).toHaveBeenCalledTimes(1))
    current = false
    broker.settle(held, { stopped: true, uncertain: false })
    expect(await pending).toMatchObject({ name: 'AbortError' })
    expect(invitation).toHaveBeenCalledTimes(2)
    expect(callback).not.toHaveBeenCalled()
    expect(broker.snapshot()).toEqual([])
  })

  it('rechecks foreground admission after waiting for the host without quarantining an unstarted callback', async () => {
    const broker = createExecutionResourceBroker()
    let foreground = false
    const registry = createExecutionInterruptRegistry(broker, { foregroundActive: () => foreground })
    const held = broker.acquire({ owner: 'other-user', resources: ['host:execution'] })
    const callback = vi.fn()
    const pending = registry.run({ cardId: 'alice', threadId: 'waiting-initiative', backgroundInitiative: true }, callback).then(() => null, error => error)
    foreground = true
    broker.settle(held, { stopped: true, uncertain: false })
    expect(await pending).toMatchObject({ name: 'AbortError' })
    expect(callback).not.toHaveBeenCalled()
    expect(broker.snapshot()).toEqual([])
  })

  it('yields an actual initiative owner to foreground work but retains its resource until acknowledged stop', async () => {
    const broker = createExecutionResourceBroker()
    let foreground = false
    let stopped = false
    const registry = createExecutionInterruptRegistry(broker, { foregroundActive: () => foreground })
    const entered = Promise.withResolvers<AbortSignal>()
    const acknowledged = Promise.withResolvers<void>()
    const pending = registry.run({ cardId: 'alice', threadId: 'initiative', backgroundInitiative: true, confirmStopped: async () => stopped }, async (signal) => {
      entered.resolve(signal)
      await acknowledged.promise
      signal.throwIfAborted()
    }).then(() => null, error => error)
    const signal = await entered.promise
    foreground = true
    expect(registry.cancelInitiatives()).toMatchObject({ requested: 1, state: 'stopping' })
    expect(signal.aborted).toBe(true)
    expect(() => broker.acquire({ owner: 'new-user-write', resources: ['host:execution'] })).toThrow('another executor')
    stopped = true
    acknowledged.resolve()
    expect(await pending).toMatchObject({ name: 'AbortError' })
    expect(broker.snapshot()).toEqual([])
  })

  it('refuses a late initiative before its callback can start when foreground work is already active', async () => {
    const broker = createExecutionResourceBroker()
    const registry = createExecutionInterruptRegistry(broker, { foregroundActive: () => true })
    const callback = vi.fn()
    await expect(registry.run({ cardId: 'alice', threadId: 'late', backgroundInitiative: true }, callback)).rejects.toMatchObject({ name: 'AbortError' })
    expect(callback).not.toHaveBeenCalled()
    expect(broker.snapshot()).toEqual([])
    expect(registry.isActive()).toBe(false)
  })

  it('keeps unacknowledged initiative resources quarantined and does not cancel an explicitly requested owner', async () => {
    const registry = createExecutionInterruptRegistry()
    const initiative = Promise.withResolvers<void>()
    const requested = Promise.withResolvers<void>()
    let requestedSignal: AbortSignal | undefined
    const first = registry.run({ cardId: 'alice', threadId: 'initiative', backgroundInitiative: true }, async () => initiative.promise)
    const second = registry.run({ cardId: 'alice', threadId: 'user-task' }, async (signal) => { requestedSignal = signal; await requested.promise })
    expect(registry.cancelInitiatives()).toMatchObject({ requested: 1 })
    expect(requestedSignal?.aborted).toBe(false)
    initiative.resolve()
    requested.resolve()
    await Promise.all([first, second])

    const broker = createExecutionResourceBroker()
    const held = createExecutionInterruptRegistry(broker)
    const entered = Promise.withResolvers<void>()
    const exited = Promise.withResolvers<void>()
    const pending = held.run({ cardId: 'alice', threadId: 'unknown', backgroundInitiative: true, confirmStopped: async () => false }, async () => { entered.resolve(); await exited.promise })
    await entered.promise
    held.cancelInitiatives()
    exited.resolve()
    await pending
    expect(broker.snapshot()).toMatchObject([{ uncertain: true }])
    expect(() => broker.acquire({ owner: 'new-user-write', resources: ['host:execution'] })).toThrow('reconciliation')
  })

  it('suspends an exact card, then all owners, without acknowledging an adapter stop early', async () => {
    const registry = createExecutionInterruptRegistry()
    const signals: AbortSignal[] = []
    const finishes: Array<() => void> = []
    const work = (signal: AbortSignal) => new Promise<void>((resolve) => {
      signals.push(signal)
      finishes.push(resolve)
    })
    const tasks = [
      registry.run({ cardId: 'a:b', threadId: 'c' }, work),
      registry.run({ cardId: 'a', threadId: 'b:c' }, work),
      registry.run({ cardId: 'a:b', threadId: 'd' }, work),
    ]
    expect(registry.cancelAll('a:b')).toEqual({ requested: 2, state: 'stopping' })
    expect(signals.map(signal => signal.aborted)).toEqual([true, false, true])
    expect(registry.cancelAll()).toEqual({ requested: 3, state: 'stopping' })
    expect(signals.every(signal => signal.aborted)).toBe(true)
    finishes.forEach(finish => finish())
    await Promise.all(tasks)
    expect(registry.cancelAll()).toEqual({ requested: 0, state: 'stopped' })
  })

  it('cancels the selected card and task without interrupting another task', async () => {
    const registry = createExecutionInterruptRegistry()
    const signals: AbortSignal[] = []
    const finishes: Array<() => void> = []
    const work = (signal: AbortSignal) => new Promise<void>((resolve) => {
      signals.push(signal)
      finishes.push(resolve)
    })
    const first = registry.run({ cardId: 'alice', threadId: 'one' }, work)
    const second = registry.run({ cardId: 'bob', threadId: 'one' }, work)
    await expect(registry.run({ cardId: 'alice', threadId: 'one' }, work)).rejects.toThrow('active execution owner')
    registry.cancel('alice', 'one')
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    finishes.forEach(finish => finish())
    await Promise.all([first, second])
    await registry.run({ cardId: 'alice', threadId: 'one' }, async signal => expect(signal.aborted).toBe(false))
  })
})
