import type { IpcMain } from 'electron'

import { EventEmitter } from 'node:events'

import { defineInvoke } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/renderer'
import { describe, expect, it, vi } from 'vitest'

import { electronOpenSettings } from '../../../shared/eventa'
import { createSettingsNavigationService } from './settings-navigation'

function createRenderer(ipcMain: EventEmitter, id: number) {
  const events = new EventEmitter()
  const contents = {
    id,
    isDestroyed: () => false,
    send: vi.fn((channel: string, payload: unknown) => events.emit(channel, {}, payload)),
  }
  const send = vi.fn((channel: string, payload: unknown) => {
    queueMicrotask(() => ipcMain.emit(channel, { sender: contents }, payload))
  })
  const ipc = Object.assign(events, { send })
  const { context } = createContext(ipc as unknown as Parameters<typeof createContext>[0])
  return { invoke: defineInvoke(context, electronOpenSettings), contents, send, dispose: () => events.removeAllListeners() }
}

describe('settings navigation replies to its actual renderer owner', () => {
  it('acknowledges concurrent stage and onboarding requests on their own transports', async () => {
    const ipcMain = new EventEmitter()
    const openWindow = vi.fn(async () => {})
    const service = createSettingsNavigationService(ipcMain as unknown as IpcMain, { openWindow })
    const stage = createRenderer(ipcMain, 1)
    const onboarding = createRenderer(ipcMain, 2)
    try {
      await Promise.all([stage.invoke({ route: '/settings' }), onboarding.invoke({ route: '/settings/models' })])
      expect(openWindow).toHaveBeenCalledTimes(2)
      expect(openWindow).toHaveBeenCalledWith('/settings')
      expect(openWindow).toHaveBeenCalledWith('/settings/models')
      expect(stage.contents.send).toHaveBeenCalledOnce()
      expect(onboarding.contents.send).toHaveBeenCalledOnce()
    }
    finally {
      service.dispose()
      stage.dispose()
      onboarding.dispose()
    }
  })

  it('returns a settings failure to onboarding so its renderer can retry', async () => {
    const ipcMain = new EventEmitter()
    const openWindow = vi.fn(async () => {}).mockRejectedValueOnce(new Error('Settings unavailable'))
    const service = createSettingsNavigationService(ipcMain as unknown as IpcMain, { openWindow })
    const onboarding = createRenderer(ipcMain, 2)
    try {
      await expect(onboarding.invoke({ route: '/settings/models' })).rejects.toThrow('Settings unavailable')
      await onboarding.invoke({ route: '/settings/models' })
      expect(openWindow).toHaveBeenCalledTimes(2)
      expect(onboarding.contents.send).toHaveBeenCalledTimes(2)
    }
    finally {
      service.dispose()
      onboarding.dispose()
    }
  })

  it('unsubscribes from late navigation messages when its desktop owner closes', async () => {
    const ipcMain = new EventEmitter()
    const openWindow = vi.fn(async () => {})
    const service = createSettingsNavigationService(ipcMain as unknown as IpcMain, { openWindow })
    const onboarding = createRenderer(ipcMain, 2)
    try {
      await onboarding.invoke({ route: '/settings/models' })
      const [channel, payload] = onboarding.send.mock.calls[0]
      service.dispose()
      ipcMain.emit(channel, { sender: onboarding.contents }, payload)
      await Promise.resolve()
      expect(openWindow).toHaveBeenCalledOnce()
      expect(ipcMain.listenerCount('eventa-message')).toBe(0)
    }
    finally {
      service.dispose()
      onboarding.dispose()
    }
  })
})
