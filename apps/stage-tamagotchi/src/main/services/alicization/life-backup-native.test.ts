import type { BrowserWindow } from 'electron'

import type { LifeBackupIssue } from '../../../shared/life-backup-contracts'

import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeBackupSnapshotConflict } from './life-backup-conflict'
import { runNativeLifeBackupCommand } from './life-backup-native'
import { createOwnedLifeBackupRuntime } from './life-backup-owner'

const electron = vi.hoisted(() => ({ show: vi.fn(), quit: vi.fn(), relaunch: vi.fn() }))
vi.mock('electron', () => ({ app: { getLocale: () => 'zh-Hans', quit: electron.quit, relaunch: electron.relaunch }, dialog: { showMessageBox: electron.show } }))
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks() })

function mockRuntime(issues: LifeBackupIssue[] = []) {
  return { inspect: vi.fn(async () => ({ cardId: 'alice', backups: [], issues })), inspectPage: vi.fn(async () => ({ cardId: 'alice', backups: [], issues, total: 0, issuesTotal: issues.length, nextCursor: null })), list: vi.fn(async () => []), create: vi.fn(), requestRestore: vi.fn(async () => {}) }
}

describe('native backup confirmation binding', () => {
  it('returns a deferred result only for a retired incoherent snapshot and leaves ordinary failures visible', async () => {
    const runtime = mockRuntime()
    const window = Object.assign(new EventEmitter(), { isDestroyed: () => false }) as unknown as BrowserWindow
    runtime.create.mockRejectedValueOnce(createLifeBackupSnapshotConflict())
    expect(await runNativeLifeBackupCommand(runtime, { cardId: 'alice', action: 'create' }, window)).toEqual({ status: 'deferred', cardId: 'alice', backups: [], issues: [] })
    expect(runtime.inspectPage).not.toHaveBeenCalled()
    expect(electron.relaunch).not.toHaveBeenCalled()
    runtime.create.mockRejectedValueOnce(new Error('Unpublished cleanup refused'))
    await expect(runNativeLifeBackupCommand(runtime, { cardId: 'alice', action: 'create' }, window)).rejects.toThrow('Unpublished cleanup refused')
  })
  it('rejects an approved dialog from the previous life without requesting restore or restarting the new life', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-backup-dialog-owner-'))
    await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-dialog-v1', root }))
    const alice = await setupAlicizationDb(root, { cardId: 'alice' })
    const bob = await setupAlicizationDb(root, { cardId: 'bob' })
    let active = { cardId: 'alice', database: alice }
    try {
      const runtime = createOwnedLifeBackupRuntime({ userDataPath: root, currentOwner: () => active })
      const backup = await runtime.create()
      const window = Object.assign(new EventEmitter(), { isDestroyed: () => false }) as unknown as BrowserWindow
      electron.show.mockImplementationOnce(async () => {
        active = { cardId: 'bob', database: bob }
        return { response: 1 }
      })
      await expect(runNativeLifeBackupCommand(runtime, { cardId: 'alice', action: 'restore', backupId: backup.id, expectedManifestHash: backup.manifestHash }, window)).rejects.toThrow('owner changed')
      await expect(readFile(join(root, 'alicizations', 'life-backups', 'restore-request.json'))).rejects.toMatchObject({ code: 'ENOENT' })
      expect((await alice.readLifeState()).cardId).toBe('alice')
      expect((await bob.readLifeState()).cardId).toBe('bob')
      expect(electron.relaunch).not.toHaveBeenCalled()
      expect(electron.quit).not.toHaveBeenCalled()
      expect(window.listenerCount('closed')).toBe(0)
    }
    finally {
      await alice.close()
      await bob.close()
    }
  })
  it('returns the inspected life and unreadable-record notice through ordinary list and create commands', async () => {
    const window = Object.assign(new EventEmitter(), { isDestroyed: () => false }) as unknown as BrowserWindow
    const issue = { backupId: 'unidentified-record', ownership: 'unidentified', code: 'unreadable-manifest' } as const
    const runtime = mockRuntime([issue])
    for (const action of ['list', 'create'] as const)
      expect(await runNativeLifeBackupCommand(runtime, { cardId: 'alice', action }, window)).toEqual({ status: action === 'list' ? 'listed' : 'created', cardId: 'alice', backups: [], issues: [issue], page: { total: 0, issuesTotal: 1, nextCursor: null } })
    expect(runtime.create).toHaveBeenCalledOnce()
    expect(runtime.requestRestore).not.toHaveBeenCalled()
    expect(electron.show).not.toHaveBeenCalled()
    expect(electron.relaunch).not.toHaveBeenCalled()
  })
  it('does not request restore on cancellation or when the reviewing window closes', async () => {
    const window = Object.assign(new EventEmitter(), { isDestroyed: () => false }) as unknown as BrowserWindow
    const runtime = mockRuntime()
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
  it('keeps the current pagination cursor on ordinary list and a cancelled native restore dialog', async () => {
    const window = Object.assign(new EventEmitter(), { isDestroyed: () => false }) as unknown as BrowserWindow
    const runtime = mockRuntime()
    await runNativeLifeBackupCommand(runtime, { cardId: 'alice', action: 'list', cursor: 'reviewed-page', limit: 20 }, window)
    expect(runtime.inspectPage).toHaveBeenLastCalledWith({ cursor: 'reviewed-page', limit: 20, refresh: undefined })
    electron.show.mockResolvedValueOnce({ response: 0 })
    await runNativeLifeBackupCommand(runtime, { cardId: 'alice', action: 'restore', backupId: 'reviewed-backup', expectedManifestHash: 'reviewed-hash', cursor: 'reviewed-page', limit: 20 }, window)
    expect(runtime.inspectPage).toHaveBeenLastCalledWith({ cursor: 'reviewed-page', limit: 20, refresh: undefined })
    expect(runtime.requestRestore).not.toHaveBeenCalled()
  })
  it('persists the exact reviewed backup before scheduling restart and keeps persistence failures visible', async () => {
    vi.useFakeTimers()
    const window = Object.assign(new EventEmitter(), { isDestroyed: () => false }) as unknown as BrowserWindow
    const runtime = mockRuntime()
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
