import type { ExecutionStorageCommand, ExecutionStorageStatus } from '../../../../shared/execution-storage-contracts'

import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'

import { useExecutionStorage } from './use-execution-storage'

const ready: ExecutionStorageStatus = { state: 'ready', pressure: 'normal', availableBytes: '1000000000', cacheBytes: 100, checkedAt: 1, cleanedAt: null, releasedCacheBytes: 0, cleanupPending: false }

describe('storage controls follow the active surface', () => {
  it('ignores late responses from a previous card and ignores duplicate clicks', async () => {
    const scope = effectScope()
    const card = shallowRef('alice')
    let old!: (value: ExecutionStorageStatus) => void
    const command = vi.fn((input: ExecutionStorageCommand) => input.cardId === 'alice'
      ? new Promise<ExecutionStorageStatus>((resolve) => {
          old = resolve
        })
      : Promise.resolve(ready))
    const view = scope.run(() => useExecutionStorage(() => card.value, command))!
    await view.clearCache()
    expect(command).toHaveBeenCalledTimes(1)
    card.value = 'bob'
    await nextTick()
    old({ ...ready, pressure: 'low' })
    await nextTick()
    expect(view.status.value?.pressure).toBe('normal')
    await view.clearCache()
    expect(command).toHaveBeenLastCalledWith({ cardId: 'bob', action: 'clear-cache' })
    scope.stop()
  })

  it('keeps a failed request visible and recovers through a new inspection', async () => {
    const scope = effectScope()
    const command = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(ready)
    const view = scope.run(() => useExecutionStorage(() => 'alice', command))!
    await nextTick()
    expect(view.failed.value).toBe(true)
    await view.refresh()
    expect(view.failed.value).toBe(false)
    expect(view.status.value).toEqual(ready)
    scope.stop()
  })
})
