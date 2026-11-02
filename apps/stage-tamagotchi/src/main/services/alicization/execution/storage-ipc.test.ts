import type { IpcMainEvent } from 'electron'

import { describe, expect, it, vi } from 'vitest'

import { electronLifeExecutionStorage } from '../../../../shared/life-events'
import { registerLifeInvokeHandlers } from '../runtime-invoke-handlers-life'

describe('trusted host cache controls', () => {
  it('validates the local surface and card and reserves user control only for explicit cleanup', async () => {
    const handlers = new Map<unknown, (input: unknown, metadata: { raw: { ipcMainEvent: IpcMainEvent } }) => Promise<unknown>>()
    const command = vi.fn(async () => ({ state: 'ready' as const, pressure: 'normal' as const, availableBytes: '1000000000', cacheBytes: 0, checkedAt: 1, cleanedAt: null, releasedCacheBytes: 0, cleanupPending: false }))
    const scopes = vi.fn()
    const userCommand = vi.fn(async (card: string, task: () => Promise<unknown>) => {
      if (card !== 'alice')
        throw new Error('Foreign card')
      return task()
    })
    registerLifeInvokeHandlers({ register: (event, handler) => handlers.set(event, handler), storageCommand: command, withCardScope: async (card, task, options) => {
      scopes(card, options)
      if (card !== 'alice')
        throw new Error('Foreign card')
      return task()
    }, withUserCommand: userCommand as never, readClosure: vi.fn(), read: vi.fn(), commit: vi.fn(), getIngress: vi.fn(), getUserInput: vi.fn(), copyText: vi.fn(), readSetting: vi.fn(), hasPublishedTurn: vi.fn(), getSurface: vi.fn(), surfaceVisible: () => true, rescheduleTimer: vi.fn(), cancelExecution: vi.fn() })
    const invoke = handlers.get(electronLifeExecutionStorage)!
    const metadata = (url: string) => ({ raw: { ipcMainEvent: { sender: { id: 42, isDestroyed: () => false, getURL: () => url } } as unknown as IpcMainEvent } })
    await expect(invoke({ cardId: 'alice', action: 'clear-cache' }, metadata('https://foreign.invalid/'))).rejects.toThrow('trusted')
    const local = metadata('file:///app/renderer/index.html#/settings/life')
    await expect(invoke({ cardId: 'bob', action: 'inspect' }, local)).rejects.toThrow('Foreign')
    await expect(invoke({ cardId: 'alice', action: 'delete-data' }, local)).rejects.toThrow()
    await expect(invoke({ cardId: 'alice', action: 'clear-cache', path: 'C:/' }, local)).rejects.toThrow()
    expect(command).not.toHaveBeenCalled()
    await invoke({ cardId: 'alice', action: 'inspect' }, local)
    expect(scopes).toHaveBeenLastCalledWith('alice', { lane: 'background', label: 'execution-storage-status', skipQueueWhenScopeAlreadyActive: true })
    expect(userCommand).not.toHaveBeenCalled()
    await invoke({ cardId: 'alice', action: 'clear-cache' }, local)
    expect(userCommand).toHaveBeenCalledTimes(1)
    expect(command).toHaveBeenLastCalledWith({ cardId: 'alice', action: 'clear-cache' })
  })
})
