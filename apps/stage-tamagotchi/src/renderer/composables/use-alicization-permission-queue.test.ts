import type { AlicizationSafetyPermissionRequest } from '../../shared/eventa'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useAlicizationPermissionQueue } from './use-alicization-permission-queue'

function request(token: string, timeoutMs = 1000): AlicizationSafetyPermissionRequest {
  return { cardId: 'alice', token, requestId: `request:${token}`, riskLevel: 'danger', actionCategory: 'write', serverName: 'filesystem', toolName: 'write_file', reason: 'scope', createdAt: Date.now(), timeoutMs, supportsRememberSession: false }
}

describe('permission display lifecycle', () => {
  afterEach(() => vi.useRealTimers())

  it('expires the current request and advances to the next without input', async () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const queue = scope.run(() => useAlicizationPermissionQueue({ isCurrentCard: cardId => cardId === 'alice', resolve: vi.fn() }))!
    queue.push(request('one', 1000))
    queue.push(request('two', 2000))
    await vi.advanceTimersByTimeAsync(1001)
    expect(queue.current.value?.token).toBe('two')
    await vi.advanceTimersByTimeAsync(1000)
    expect(queue.current.value).toBeNull()
    expect(queue.pending.value).toHaveLength(0)
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not discard the next request when a closed request finishes its RPC later', async () => {
    let finish!: () => void
    const scope = effectScope()
    const resolve = vi.fn(() => new Promise<void>((done) => {
      finish = done
    }))
    const queue = scope.run(() => useAlicizationPermissionQueue({ isCurrentCard: () => true, resolve }))!
    const first = request('one')
    queue.push(first)
    queue.push(request('two'))
    const decision = queue.decide({ allow: true, rememberSession: true })
    queue.close(first)
    expect(queue.current.value?.token).toBe('two')
    expect(queue.resolving.value).toBe(false)
    finish()
    await decision
    expect(queue.current.value?.token).toBe('two')
    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ token: 'one', rememberSession: false }))
    scope.stop()
  })

  it('rejects expired and other-card requests, deduplicates delivery, and clears on scope change', () => {
    const scope = effectScope()
    const queue = scope.run(() => useAlicizationPermissionQueue({ isCurrentCard: cardId => cardId === 'alice', resolve: vi.fn() }))!
    queue.push({ ...request('expired'), createdAt: Date.now() - 5000 })
    queue.push({ ...request('other'), cardId: 'other' })
    queue.push(request('one'))
    queue.push(request('one'))
    expect(queue.pending.value).toHaveLength(0)
    expect(queue.current.value?.token).toBe('one')
    queue.clear()
    expect(queue.current.value).toBeNull()
    scope.stop()
  })
})
