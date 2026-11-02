import { describe, expect, it, vi } from 'vitest'

import { createForegroundBroker } from './foreground-broker'
import { createExecutionResourceBroker } from './resource-broker'

const target = { desktop: 'Default', windowId: '123', processId: 44, fingerprint: 'exact-observation' }
describe('foreground input and durable effect share one host fence', () => {
  it('adopts a current effect lease without releasing its enclosing owner early', async () => {
    const resources = createExecutionResourceBroker()
    const parent = resources.acquire({ owner: 'alice:turn', resources: ['physical-input:desktop'], effectId: 'effect', effectCardId: 'alice' })
    const foreground = createForegroundBroker(resources, { readTarget: async () => target, releaseOwnedInput: async () => true })
    const adopted = await foreground.acquire(parent.owner, target, parent)
    await foreground.beforeInjection(adopted)
    expect(await foreground.release(adopted)).toMatchObject({ stopped: true })
    resources.assert(parent)
    expect(() => resources.acquire({ owner: 'bob', resources: ['physical-input:Default'] })).toThrow()
    resources.settle(parent, { stopped: true, uncertain: false })
    expect(resources.acquire({ owner: 'bob', resources: ['physical-input:Default'] })).toBeTruthy()
  })

  it.each(['foreign-owner', 'unrelated-scope'])('cannot adopt %s authority', async (kind) => {
    const resources = createExecutionResourceBroker()
    const parent = resources.acquire({ owner: 'alice:turn', resources: [kind === 'unrelated-scope' ? 'browser:alice' : 'physical-input:desktop'] })
    const foreground = createForegroundBroker(resources, { readTarget: async () => target, releaseOwnedInput: async () => true })
    await expect(foreground.acquire(kind === 'foreign-owner' ? 'bob:turn' : parent.owner, target, parent)).rejects.toThrow('admitted action')
    resources.assert(parent)
  })

  it('keeps expired unresolved input exclusive across desktop names and cards', async () => {
    let now = 1000
    const resources = createExecutionResourceBroker(() => now)
    const parent = resources.acquire({ owner: 'alice:turn', resources: ['physical-input:desktop'], ttlMs: 10, effectId: 'effect', effectCardId: 'alice' })
    const foreground = createForegroundBroker(resources, { readTarget: async () => target, releaseOwnedInput: async () => false })
    const adopted = await foreground.acquire(parent.owner, target, parent)
    expect(await foreground.release(adopted)).toMatchObject({ stopped: false })
    now += 100_000
    expect(() => resources.acquire({ owner: 'bob', resources: ['physical-input:OtherDesktop'] })).toThrow()
    expect(() => foreground.resume()).toThrow('Old foreground writer')
  })

  it('checks the exact native target after adopting the existing action fence', async () => {
    const resources = createExecutionResourceBroker()
    const parent = resources.acquire({ owner: 'alice:turn', resources: ['physical-input:desktop'] })
    const readTarget = vi.fn(async () => target)
    const foreground = createForegroundBroker(resources, { readTarget, releaseOwnedInput: async () => true })
    const lease = await foreground.acquire(parent.owner, target, parent)
    readTarget.mockResolvedValue({ ...target, fingerprint: 'different-focus' })
    await expect(foreground.beforeInjection(lease)).rejects.toThrow('target or ownership changed')
    expect(await foreground.takeOver()).toMatchObject({ stopped: true })
    resources.assert(parent)
  })

  it('cannot widen a valid browser lease by editing its returned resource copy', async () => {
    const resources = createExecutionResourceBroker()
    const parent = resources.acquire({ owner: 'alice:turn', resources: ['browser:alice'] })
    parent.resources = ['physical-input:desktop']
    const readTarget = vi.fn(async () => target)
    const releaseOwnedInput = vi.fn(async () => true)
    const foreground = createForegroundBroker(resources, { readTarget, releaseOwnedInput })
    await expect(foreground.acquire(parent.owner, target, parent)).rejects.toMatchObject({ code: 'EXECUTION_LEASE_STALE' })
    expect(resources.snapshot()).toMatchObject([{ owner: 'alice:turn', resources: ['browser:alice'] }])
    expect(releaseOwnedInput).not.toHaveBeenCalled()
  })
})
