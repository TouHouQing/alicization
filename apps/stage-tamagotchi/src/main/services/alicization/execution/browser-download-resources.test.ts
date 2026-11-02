import type { DownloadItem } from 'electron'

import type { BrowserDownloadReservation } from './browser-download-reservations'

import { createHash, randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { link, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { withActionDispatch } from './action-dispatch-context'
import { readBrowserDownloadQuarantines } from './browser-download-resource-recovery'
import { createBrowserDownloads } from './browser-downloads'
import { createHostExecutionRecovery } from './host-recovery'
import { createExecutionResourceBroker, executionFileResources } from './resource-broker'

function nativeItem() {
  let path = ''
  const item = Object.assign(new EventEmitter(), { getFilename: () => 'partial.txt', getURL: () => 'https://example.invalid/download', getURLChain: () => ['https://example.invalid/download'], getReceivedBytes: () => 1, getTotalBytes: () => 100, getSavePath: () => path, setSavePath: (next: string) => { path = next }, cancel: vi.fn(() => item.emit('done', {}, 'cancelled')) })
  return item
}

describe('native download child resource ownership', () => {
  it('fences a real hard link outside the native subtree in both acquisition orders and releases it only after cancellation is durable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'download-outside-hard-link-'))
    const broker = createExecutionResourceBroker()
    const errors: unknown[] = []
    const manager = createBrowserDownloads({ root: join(root, 'downloads'), cardId: 'alice', resourceBroker: broker, recordReservation: vi.fn(), record: vi.fn(), onError: error => errors.push(error) })
    const reserve = (effectId: string) => withActionDispatch(async () => ({ cardId: 'alice', effectId, turnId: 'turn', expiresAt: Date.now() + 15000 }), () => manager.reserve({ id: effectId, observationId: null }, 'https://example.invalid/download'))
    try {
      await manager.prepare()
      const first = await reserve('first-native-writer')
      const item = nativeItem()
      manager.accept(item as unknown as DownloadItem, first)
      await manager.flush()
      const nativePath = item.getSavePath()
      await mkdir(join(root, 'outside'), { recursive: true })
      await writeFile(nativePath, 'native partial bytes')
      const alias = join(root, 'outside', 'alias.txt')
      await link(nativePath, alias)
      const aliasResources = await executionFileResources(alias)
      expect(aliasResources.some(key => key.startsWith('file-shared-inode:'))).toBe(true)
      expect(() => broker.acquire({ owner: 'alias-writer', resources: aliasResources })).toThrow('another executor')
      expect(await readFile(alias, 'utf8')).toBe('native partial bytes')
      const unrelated = broker.acquire({ owner: 'unrelated', resources: await executionFileResources(join(root, 'outside', 'ordinary.txt')) })
      broker.settle(unrelated, { stopped: true, uncertain: false })
      expect(await manager.cancelEffects(['first-native-writer'])).toMatchObject({ stopped: true })
      await manager.flush()
      const external = broker.acquire({ owner: 'alias-writer', resources: aliasResources })
      // No complete hard-link inventory exists. The inverse order must also
      // hold the shared object while refusing a new native subtree writer.
      try {
        await expect(reserve('second-native-writer')).rejects.toThrow('another executor')
      }
      finally {
        broker.settle(external, { stopped: true, uncertain: false })
      }
      const next = await reserve('third-native-writer')
      expect(next.id).not.toBe(first.id)
      await manager.cancelEffects(['third-native-writer'])
      await manager.flush()
      expect(await readFile(nativePath, 'utf8')).toBe('native partial bytes')
      expect(broker.snapshot()).toEqual([])
      expect(errors).toEqual([])
    }
    finally {
      await manager.stop()
      await manager.flush()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('fences the actual native subtree through parent completion, aliases and a held terminal journal without locking unrelated work', async () => {
    const root = await mkdtemp(join(tmpdir(), 'download-resource-child-'))
    const broker = createExecutionResourceBroker()
    const journal = Promise.withResolvers<void>()
    const errors: unknown[] = []
    const manager = createBrowserDownloads({ root, cardId: 'alice', resourceBroker: broker, recordReservation: vi.fn(), record: async (receipt) => {
      if (receipt.state !== 'progressing')
        await journal.promise
    }, onError: error => errors.push(error) })
    try {
      const directory = await manager.prepare()
      const alias = join(root, 'alias')
      await symlink(directory, alias, 'junction')
      const parent = broker.acquire({ owner: 'parent-click', resources: ['host:execution'], coordinationOnly: true })
      const handle = await broker.withOwner(parent.owner, () => withActionDispatch(async () => ({ cardId: 'alice', effectId: 'parent-effect', turnId: 'turn', expiresAt: Date.now() + 15000 }), () => manager.reserve({ id: 'click', observationId: null }, 'https://example.invalid/download')))
      const item = nativeItem()
      manager.accept(item as unknown as DownloadItem, handle)
      await manager.flush()
      broker.settle(parent, { stopped: true, uncertain: false })
      const resource = await executionFileResources(join(alias, handle.id, 'partial.txt'))
      expect(() => broker.acquire({ owner: 'other-write', resources: resource })).toThrow('another executor')
      const other = broker.acquire({ owner: 'other-work', resources: ['host:execution'], coordinationOnly: true })
      const file = broker.acquire({ owner: 'other-work', resources: await executionFileResources(join(directory, `${handle.id}-sibling`, 'partial.txt')) })
      broker.settle(file, { stopped: true, uncertain: false })
      broker.settle(other, { stopped: true, uncertain: false })
      expect(await manager.cancelEffects(['parent-effect'])).toMatchObject({ stopped: true })
      expect(() => broker.acquire({ owner: 'new-write', resources: resource })).toThrow('another executor')
      journal.resolve()
      await manager.flush()
      const next = broker.acquire({ owner: 'new-write', resources: resource })
      broker.settle(next, { stopped: true, uncertain: false })
      expect(broker.snapshot()).toEqual([])
      expect(errors).toEqual([])
    }
    finally { journal.resolve(); await manager.stop(); await manager.flush(); await rm(root, { recursive: true, force: true }) }
  })

  it('cancels at a finite duration but never frees an unacknowledged native writer on expiry or a failed terminal journal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'download-resource-expiry-'))
    let now = Date.now()
    const broker = createExecutionResourceBroker(() => now)
    const manager = createBrowserDownloads({ root, cardId: 'alice', resourceBroker: broker, recordReservation: vi.fn(), record: async (receipt) => {
      if (receipt.state !== 'progressing')
        throw new Error('terminal journal unavailable')
    }, onError: vi.fn() })
    const item = nativeItem()
    item.cancel = vi.fn()
    try {
      await manager.prepare()
      const handle = await withActionDispatch(async () => ({ cardId: 'alice', effectId: 'parent', turnId: 'turn', expiresAt: now + 15000 }), () => manager.reserve({ id: 'click', observationId: null }, 'https://example.invalid/download'))
      vi.useFakeTimers()
      manager.accept(item as unknown as DownloadItem, handle)
      await manager.flush()
      const resources = await executionFileResources(item.getSavePath())
      now += 126000
      await vi.advanceTimersByTimeAsync(126000)
      expect(item.cancel).toHaveBeenCalledOnce()
      expect(broker.snapshot()[0].uncertain).toBe(true)
      expect(() => broker.acquire({ owner: 'other', resources })).toThrow('reconciliation')
      item.emit('done', {}, 'cancelled')
      await manager.flush()
      expect(broker.snapshot()[0].uncertain).toBe(true)
      expect(() => broker.acquire({ owner: 'other', resources })).toThrow('reconciliation')
    }
    finally {
      vi.useRealTimers(); if (item.listenerCount('done'))
        item.emit('done', {}, 'cancelled'); await manager.stop(); await manager.flush(); await rm(root, { recursive: true, force: true })
    }
  })

  it('rebuilds old unknown native owners beyond presentation history on the same host recovery fence and across a read-only DB reopen', async () => {
    const root = await mkdtemp(join(tmpdir(), 'download-resource-restart-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const downloads = join(root, 'downloads', createHash('sha256').update('alice').digest('hex'))
    await mkdir(downloads, { recursive: true })
    const canonical = await realpath(downloads)
    const unknownId = '00000000-0000-0000-0000-000000000000'
    const ids = [unknownId, ...Array.from({ length: 130 }, () => randomUUID())]
    try {
      for (let offset = 0; offset < ids.length; offset += 16) {
        await db.commitLifeState({ cardId: 'alice', operationKey: `seed-${offset}`, changes: [], mutations: ids.slice(offset, offset + 16).flatMap((id) => {
          const reservation: BrowserDownloadReservation = { version: 2, runtimeId: 'previous-runtime', id, cardId: 'alice', actionId: `click-${id}`, observationId: null, directory: join(canonical, id), requestHash: 'a'.repeat(64), requestedUrl: 'https://example.invalid/download', origin: { kind: 'host-interface' }, at: 100, expiresAt: 15100 }
          return [
            { type: 'ingress-accept' as const, ingress: { id: `browser-download-reservation:${id}`, kind: 'tool-result' as const, source: 'browser-download-reservation', sourceKey: id, occurredAt: 100 + offset, payload: { ...reservation } } },
            { type: 'ingress-settle' as const, id: `browser-download-reservation:${id}`, status: 'settled' as const },
            { type: 'ingress-accept' as const, ingress: { id: `browser-download-reservation-result:${id}`, kind: 'tool-result' as const, source: 'browser-download-reservation-result', sourceKey: id, occurredAt: 200 + offset, payload: { ...reservation, state: id === unknownId ? 'unverified' : 'not-started', ...(id === unknownId ? { scope: 'intent-only-native-start-and-artifact-unknown' } : { closedAt: 200 }) } } },
            { type: 'ingress-settle' as const, id: `browser-download-reservation-result:${id}`, status: 'settled' as const },
          ]
        }) })
      }
      expect((await db.readLifeState()).ingress.some(entry => entry.id === `browser-download-reservation:${unknownId}`)).toBe(false)
      await expect(db.readLifeIngressPage({ source: 'browser-download-reservation', limit: 65 })).rejects.toThrow('budget')
      const broker = createExecutionResourceBroker()
      const recovery = createHostExecutionRecovery({ userDataPath: root, broker, readCardEffects: async () => [], readCardDownloadResources: async (cardId) => {
        const reopened = await setupAlicizationDb(root, { cardId, readOnly: true })
        try { return await readBrowserDownloadQuarantines(reopened) }
        finally { await reopened.close() }
      } })
      expect(await recovery.restore()).toEqual({ cards: 1, quarantines: 1 })
      expect(broker.snapshot()[0]).toMatchObject({ effectId: `browser-download:${unknownId}`, effectCardId: 'alice', uncertain: true, resourceOnly: true })
      const resources = await executionFileResources(join(canonical, unknownId, 'partial.txt'))
      expect(() => broker.acquire({ owner: 'new-card', resources })).toThrow('reconciliation')
      const independent = broker.acquire({ owner: 'independent-work', resources: ['host:execution'], coordinationOnly: true })
      broker.settle(independent, { stopped: true, uncertain: false })
      expect(await readBrowserDownloadQuarantines(db, 'previous-runtime')).toEqual([])
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
