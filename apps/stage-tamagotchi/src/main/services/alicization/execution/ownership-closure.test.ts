import { link, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { createActionPermitAuthority } from './action-permit'
import { createForegroundBroker } from './foreground-broker'
import { createExecutionResourceBroker, executionFileResource } from './resource-broker'
import { createWindowsInputLedger } from './windows-input-ledger'

describe('execution writer and input ownership', () => {
  it('publishes the stop gate before an owned-input cleanup callback can reenter', async () => {
    const resource = createExecutionResourceBroker()
    const target = { desktop: 'isolated', windowId: 'one', processId: 10, fingerprint: 'exact-native-owner' }
    const readTarget = vi.fn(async () => target)
    let lease!: Awaited<ReturnType<ReturnType<typeof createForegroundBroker>['acquire']>>
    let nested!: Promise<{ stopped: boolean, state: string }>
    const foreground = createForegroundBroker(resource, { readTarget, releaseOwnedInput: async () => {
      nested = foreground.release(lease)
      await expect(foreground.beforeInjection(lease)).rejects.toThrow('stopping')
      return true
    } })
    lease = await foreground.acquire('one', target)
    expect(await foreground.release(lease)).toEqual({ stopped: true, state: 'stopped' })
    expect(await nested).toEqual({ stopped: true, state: 'stopped' })
    expect(readTarget).toHaveBeenCalledOnce()
    expect(resource.snapshot()).toEqual([])
  })

  it('stops new injection as soon as foreground release starts, including a pending target read', async () => {
    const resource = createExecutionResourceBroker()
    const target = { desktop: 'isolated', windowId: 'one', processId: 10, fingerprint: 'exact-native-owner' }
    let finishRead!: (value: typeof target) => void
    let finishRelease!: (value: boolean) => void
    let read: () => Promise<typeof target> = async () => target
    const releaseOwnedInput = vi.fn(() => new Promise<boolean>((resolve) => { finishRelease = resolve }))
    const foreground = createForegroundBroker(resource, { readTarget: () => read(), releaseOwnedInput })
    const lease = await foreground.acquire('one', target)
    read = () => new Promise(resolve => finishRead = resolve)
    const injection = foreground.beforeInjection(lease)
    const rejected = expect(injection).rejects.toThrow()
    await vi.waitFor(() => expect(finishRead).toBeTypeOf('function'))
    const firstRelease = foreground.release(lease)
    const secondRelease = foreground.release(lease)
    await vi.waitFor(() => expect(finishRelease).toBeTypeOf('function'))
    finishRead(target)
    await rejected
    expect(releaseOwnedInput).toHaveBeenCalledOnce()
    finishRelease(true)
    expect(await firstRelease).toEqual({ stopped: true, state: 'stopped' })
    expect(await secondRelease).toEqual({ stopped: true, state: 'stopped' })
    expect(resource.snapshot()).toEqual([])
  })

  it.each(['cancel', 'takeover'] as const)('does not press a key after %s during the physical-state read', async (reason) => {
    let observed!: (held: boolean) => void
    const down = vi.fn(async () => {})
    const abort = new AbortController()
    const ledger = createWindowsInputLedger({ assertTarget: async () => {}, isPhysicallyDown: () => new Promise<boolean>((resolve) => { observed = resolve }), down, up: async () => {} })
    const chord = ledger.chord([17], abort.signal)
    const rejected = expect(chord).rejects.toThrow()
    await vi.waitFor(() => expect(observed).toBeTypeOf('function'))
    const stopped = reason === 'takeover' ? ledger.takeOver() : undefined
    if (reason === 'cancel')
      abort.abort()
    observed(false)
    await rejected
    await stopped
    expect(down).not.toHaveBeenCalled()
    expect(ledger.ownedKeys()).toEqual([])
  })

  it('resolves hard-link aliases and never gives an expired but unstopped writer another owner', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-resource-'))
    try {
      await writeFile(join(root, 'first'), 'owned')
      await link(join(root, 'first'), join(root, 'alias'))
      expect(await executionFileResource(join(root, 'first'))).toBe(await executionFileResource(join(root, 'alias')))
      let now = 0
      const broker = createExecutionResourceBroker(() => now)
      const lease = broker.acquire({ owner: 'card-a:cli', resources: [await executionFileResource(join(root, 'first'))], ttlMs: 10 })
      now = 11
      expect(() => broker.assert(lease)).toThrow('stale')
      expect(() => broker.acquire({ owner: 'card-b:codex', resources: [lease.resources[0]] })).toThrow('another executor')
      broker.settle(lease, { stopped: true, uncertain: true })
      expect(() => broker.acquire({ owner: 'card-b:codex', resources: [lease.resources[0]] })).toThrow('reconciliation')
      broker.settle(lease, { stopped: true, uncertain: false })
      expect(broker.acquire({ owner: 'card-b:codex', resources: [lease.resources[0]] }).fencingToken).toBeGreaterThan(lease.fencingToken)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('binds a single-use permit to exact target, content, revision and resource lease', () => {
    const broker = createExecutionResourceBroker()
    const lease = broker.acquire({ owner: 'one', resources: ['browser:a'] })
    const authority = createActionPermitAuthority(broker)
    const binding = { cardId: 'a', rootObligationId: 'goal', obligationGeneration: 1, planId: 'plan', planRevision: 1, stepId: 'send', attemptId: 'attempt', capabilityId: 'click', inputHash: 'input', targetObservationId: 'observation', targetFingerprint: 'target', effectDigest: 'message-and-recipient', approvalRef: 'approval' }
    const permit = authority.issue(binding, lease)
    expect(() => authority.consume(permit.id, { ...binding, effectDigest: 'changed-message' })).toThrow('different effect')
    authority.consume(permit.id, binding)
    expect(() => authority.consume(permit.id, binding)).toThrow('absent')
    const second = authority.issue(binding, lease)
    authority.revokeRoot('a', 'goal')
    expect(() => authority.consume(second.id, binding)).toThrow('absent')
  })

  it('releases its own modifier after mid-chord cancellation and never releases a user-held key', async () => {
    const events: string[] = []
    const controller = new AbortController()
    const ledger = createWindowsInputLedger({ assertTarget: async () => {}, isPhysicallyDown: async key => key === 66, down: async (key) => { events.push(`down:${key}`); controller.abort() }, up: async (key) => { events.push(`up:${key}`) } })
    await expect(ledger.chord([17, 65], controller.signal)).rejects.toThrow()
    expect(events).toEqual(['down:17', 'up:17'])
    expect(ledger.ownedKeys()).toEqual([])
    await expect(ledger.chord([66])).rejects.toThrow('User input owns')
    expect(events).toEqual(['down:17', 'up:17'])
  })

  it('retains failed key release and refuses new input until takeover cleanup succeeds', async () => {
    let fail = true
    const ledger = createWindowsInputLedger({ assertTarget: async () => {}, isPhysicallyDown: async () => false, down: async () => {}, up: async () => {
      if (fail)
        throw new Error('injected failure')
    } })
    await expect(ledger.chord([17])).rejects.toThrow('reconciliation')
    expect(ledger.ownedKeys()).toEqual([17])
    await expect(ledger.chord([65])).rejects.toThrow('stopped')
    fail = false
    expect(await ledger.takeOver()).toBe(true)
    expect(ledger.ownedKeys()).toEqual([])
  })

  it('does not inject key-up after a user physically takes ownership mid-chord', async () => {
    let physicallyHeld = false
    const releases: number[] = []
    const ledger = createWindowsInputLedger({ assertTarget: async () => {}, isPhysicallyDown: async () => physicallyHeld, down: async () => { physicallyHeld = true }, up: async (key) => { releases.push(key) } })
    await ledger.chord([17])
    expect(releases).toEqual([])
    expect(await ledger.takeOver()).toBe(true)
    expect(releases).toEqual([])
  })

  it('serializes acquisition and preserves quarantine until actual owned-input cleanup succeeds', async () => {
    const resource = createExecutionResourceBroker()
    const target = { desktop: 'isolated', windowId: 'one', processId: 10, fingerprint: 'pid-start-and-class' }
    let resolveTarget: ((value: typeof target) => void) | undefined
    let failRelease = true
    const foreground = createForegroundBroker(resource, { readTarget: () => new Promise((resolve) => { resolveTarget = resolve }), releaseOwnedInput: async () => {
      if (failRelease)
        throw new Error('release failed')
      return true
    } })
    const first = foreground.acquire('one', target)
    await expect(foreground.acquire('one', target)).rejects.toThrow()
    resolveTarget!(target)
    await first
    expect(await foreground.takeOver()).toMatchObject({ stopped: false })
    expect(() => foreground.resume()).toThrow('has not stopped')
    expect(() => resource.acquire({ owner: 'another', resources: ['physical-input:isolated'] })).toThrow('reconciliation')
    failRelease = false
    expect(await foreground.takeOver()).toMatchObject({ stopped: true })
    foreground.resume()
    expect(resource.snapshot()).toEqual([])
  })

  it('rejects takeover and lease expiry occurring during a foreground target read', async () => {
    let now = 0
    const resource = createExecutionResourceBroker(() => now)
    const target = { desktop: 'isolated', windowId: 'one', processId: 10, fingerprint: 'exact' }
    let read: () => Promise<typeof target> = async () => target
    const foreground = createForegroundBroker(resource, { readTarget: () => read(), releaseOwnedInput: async () => true })
    const lease = await foreground.acquire('one', target)
    read = async () => { now = 16000; return target }
    await expect(foreground.beforeInjection(lease)).rejects.toThrow('stale')
    expect(await foreground.takeOver()).toMatchObject({ stopped: true })
    foreground.resume()
    read = async () => { await foreground.takeOver(); return target }
    await expect(foreground.acquire('one', target)).rejects.toThrow('target changed')
    expect(resource.snapshot()).toEqual([])
  })
})
