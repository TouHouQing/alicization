import type { IpcMainEvent } from 'electron'

import { describe, expect, it, vi } from 'vitest'

import { electronLifeObligationHistory } from '../../../shared/life-events'
import { registerLifeInvokeHandlers } from './runtime-invoke-handlers-life'

describe('trusted read-only history surface', () => {
  it('validates the sender, shape and owner and never interrupts execution to browse history', async () => {
    const handlers = new Map<unknown, (input: unknown, metadata: { raw: { ipcMainEvent: IpcMainEvent } }) => Promise<unknown>>()
    const history = vi.fn(async () => ({ cardId: 'alice', items: [], nextCursor: null }))
    const userCommand = vi.fn()
    const scopes = vi.fn()
    registerLifeInvokeHandlers({ register: (event, handler) => handlers.set(event, handler), obligationHistory: history, withCardScope: async (cardId, task, options) => {
      scopes(cardId, task, options)
      if (cardId !== 'alice')
        throw new Error('Foreign card')
      return task()
    }, withUserCommand: userCommand, readClosure: vi.fn(), read: vi.fn(), commit: vi.fn(), getIngress: vi.fn(), getUserInput: vi.fn(), copyText: vi.fn(), readSetting: vi.fn(), hasPublishedTurn: vi.fn(), getSurface: vi.fn(), surfaceVisible: () => true, rescheduleTimer: vi.fn(), cancelExecution: vi.fn() })
    const invoke = handlers.get(electronLifeObligationHistory)!
    const metadata = (url: string) => ({ raw: { ipcMainEvent: { sender: { id: 42, isDestroyed: () => false, getURL: () => url } } as unknown as IpcMainEvent } })
    await expect(invoke({ cardId: 'alice' }, metadata('https://foreign.invalid/'))).rejects.toThrow('trusted')
    expect(history).not.toHaveBeenCalled()
    const local = metadata('file:///app/renderer/index.html#/settings/life')
    await expect(invoke({ cardId: 'alice', limit: 51 }, local)).rejects.toThrow()
    await expect(invoke({ cardId: 'bob' }, local)).rejects.toThrow('Foreign')
    await expect(invoke({ cardId: 'alice', limit: 20, execute: true }, local)).rejects.toThrow()
    expect(history).not.toHaveBeenCalled()
    expect(await invoke({ cardId: 'alice', limit: 20 }, local)).toEqual({ cardId: 'alice', items: [], nextCursor: null })
    expect(scopes).toHaveBeenLastCalledWith('alice', expect.any(Function), { lane: 'background', label: 'life-obligation-history', skipQueueWhenScopeAlreadyActive: true })
    expect(userCommand).not.toHaveBeenCalled()
  })
})
