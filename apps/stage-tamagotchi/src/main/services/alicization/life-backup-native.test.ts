import type { BrowserWindow } from 'electron'

import { EventEmitter } from 'node:events'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { runNativeLifeBackupCommand } from './life-backup-native'

const electron = vi.hoisted(() => ({ show: vi.fn(), quit: vi.fn(), relaunch: vi.fn() }))
vi.mock('electron', () => ({ app: { getLocale: () => 'zh-Hans', quit: electron.quit, relaunch: electron.relaunch }, dialog: { showMessageBox: electron.show } }))
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks() })

describe('native backup confirmation binding', () => {
  it('does not request restore on cancellation or when the reviewing window closes', async () => {
    const window = Object.assign(new EventEmitter(), { isDestroyed: () => false }) as unknown as BrowserWindow
    const runtime = { list: vi.fn(async () => []), create: vi.fn(), requestRestore: vi.fn(async () => {}) }
    electron.show.mockResolvedValueOnce({ response: 0 })
    const command = { cardId: 'alice', action: 'restore' as const, backupId: 'backup', expectedManifestHash: 'reviewed' }
    expect(await runNativeLifeBackupCommand(runtime, command, window)).toMatchObject({ status: 'cancelled' })
    electron.show.mockImplementationOnce(async (_window, options) => {
      window.emit('closed')
      expect(options.signal.aborted).toBe(true)
      return { response: 1 }
    })
    expect(await runNativeLifeBackupCommand(runtime, command, window)).toMatchObject({ status: 'cancelled' })
    expect(runtime.requestRestore).not.toHaveBeenCalled()
    expect(electron.relaunch).not.toHaveBeenCalled()
    expect(window.listenerCount('closed')).toBe(0)
  })
  it('persists the exact reviewed backup before scheduling restart and keeps persistence failures visible', async () => {
    vi.useFakeTimers()
    const window = Object.assign(new EventEmitter(), { isDestroyed: () => false }) as unknown as BrowserWindow
    const runtime = { list: vi.fn(async () => []), create: vi.fn(), requestRestore: vi.fn(async () => {}) }
    electron.show.mockResolvedValue({ response: 1 })
    const command = { cardId: 'alice', action: 'restore' as const, backupId: 'backup', expectedManifestHash: 'reviewed' }
    expect(await runNativeLifeBackupCommand(runtime, command, window)).toMatchObject({ status: 'restarting' })
    expect(runtime.requestRestore).toHaveBeenCalledWith('backup', 'reviewed')
    expect(electron.relaunch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(electron.relaunch).toHaveBeenCalledOnce()
    expect(electron.quit).toHaveBeenCalledOnce()
    runtime.requestRestore.mockRejectedValueOnce(new Error('snapshot-changed'))
    await expect(runNativeLifeBackupCommand(runtime, command, window)).rejects.toThrow('snapshot-changed')
    expect(vi.getTimerCount()).toBe(0)
  })
})
