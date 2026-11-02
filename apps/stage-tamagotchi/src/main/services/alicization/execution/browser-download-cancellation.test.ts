import type { DownloadItem } from 'electron'

import { EventEmitter } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { withActionDispatch } from './action-dispatch-context'
import { createBrowserDownloads } from './browser-downloads'

function item() {
  let path = ''
  const download = Object.assign(new EventEmitter(), { getFilename: () => 'report.txt', getURL: () => 'https://example.invalid/report', getURLChain: () => ['https://example.invalid/report'], getReceivedBytes: () => 0, getTotalBytes: () => 100, getSavePath: () => path, setSavePath: (next: string) => { path = next }, cancel: vi.fn(() => download.emit('done', {}, 'cancelled')) })
  return download
}

describe('cancelling only native transfers owned by the stopped responsibility', () => {
  it('stops the matching native writer without waiting for its card-scoped journal or cancelling another effect', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-download-cancel-'))
    const gate = Promise.withResolvers<void>()
    const errors: unknown[] = []
    const manager = createBrowserDownloads({ root, cardId: 'alice', recordReservation: vi.fn(), record: async (receipt) => {
      if (receipt.state === 'cancelled')
        await gate.promise
    }, onError: error => errors.push(error) })
    const reserve = (effectId: string) => withActionDispatch(async () => ({ cardId: 'alice', effectId, turnId: 'current-task-run', expiresAt: Date.now() + 15000 }), () => manager.reserve({ id: effectId, observationId: 'observation' }, 'https://example.invalid/report'))
    try {
      await manager.prepare()
      const first = item()
      const second = item()
      const firstHandle = await reserve('first')
      const secondHandle = await reserve('second')
      manager.accept(first as unknown as DownloadItem, firstHandle)
      manager.accept(second as unknown as DownloadItem, secondHandle)
      await manager.flush()
      expect(await manager.cancelEffects(['first'])).toMatchObject({ requested: 1, stopped: true })
      expect(first.cancel).toHaveBeenCalledOnce()
      expect(second.cancel).not.toHaveBeenCalled()
      // The terminal journal is still held, as it can be by the host stop scope.
      expect(manager.snapshot().find(receipt => receipt.id === firstHandle.id)?.state).toBe('progressing')
      gate.resolve()
      await manager.flush()
      expect(manager.snapshot().find(receipt => receipt.id === firstHandle.id)).toMatchObject({ state: 'cancelled', sha256: null })
      expect(manager.snapshot().find(receipt => receipt.id === secondHandle.id)?.state).toBe('progressing')
      const pending = await reserve('not-yet-native')
      expect(await manager.cancelEffects(['not-yet-native'])).toMatchObject({ requested: 1, stopped: true })
      const late = item()
      expect(manager.accept(late as unknown as DownloadItem, pending)).toBeNull()
      expect(late.cancel).toHaveBeenCalledOnce()
      expect(errors).toEqual([])
    }
    finally { gate.resolve(); await manager.stop(); await manager.flush(); await rm(root, { recursive: true, force: true }) }
  })

  it('reports stopping until the native writer acknowledges cancellation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-download-cancel-timeout-'))
    const manager = createBrowserDownloads({ root, cardId: 'alice', recordReservation: vi.fn(), record: vi.fn(), onError: vi.fn() })
    const download = item()
    download.cancel = vi.fn()
    try {
      await manager.prepare()
      const handle = await withActionDispatch(async () => ({ cardId: 'alice', effectId: 'held-native', turnId: 'current-task-run', expiresAt: Date.now() + 15000 }), () => manager.reserve({ id: 'held-native-action', observationId: null }, 'https://example.invalid/report'))
      manager.accept(download as unknown as DownloadItem, handle)
      await manager.flush()
      vi.useFakeTimers()
      const pending = manager.cancelEffects(['held-native'])
      await vi.advanceTimersByTimeAsync(5001)
      expect(await pending).toMatchObject({ stopped: false, state: 'stopping' })
      expect(download.cancel).toHaveBeenCalledOnce()
      download.emit('done', {}, 'cancelled')
      await manager.flush()
      expect(await manager.cancelEffects(['held-native'])).toMatchObject({ stopped: true, state: 'stopped' })
    }
    finally { vi.useRealTimers(); download.emit('done', {}, 'cancelled'); await manager.stop(); await manager.flush(); await rm(root, { recursive: true, force: true }) }
  })
})
