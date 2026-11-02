import type { DownloadItem } from 'electron'

import type { BrowserDownloadReservation } from './browser-download-reservations'
import type { BrowserDownloadReceipt } from './browser-downloads'

import { createHash, randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { withActionDispatch } from './action-dispatch-context'
import { readBrowserDownloadAdmissions, readBrowserDownloads, recordBrowserDownload, recoverBrowserDownloads } from './browser-download-repository'
import { browserDownloadRuntimeId, downloadRequestIdentity, recordBrowserDownloadReservation } from './browser-download-reservations'
import { createBrowserDownloads } from './browser-downloads'

function download(name: string, bytes = 4) {
  let path = ''
  const item = Object.assign(new EventEmitter(), {
    getFilename: () => name,
    getURL: () => 'https://user:password@example.invalid/result?token=private',
    getURLChain: () => ['https://user:password@example.invalid/result?token=private'],
    getReceivedBytes: () => bytes,
    getTotalBytes: () => bytes,
    getSavePath: () => path,
    setSavePath: (value: string) => { path = value },
    cancel: vi.fn(() => item.emit('done', {}, 'cancelled')),
  })
  return item
}

describe('owned browser download lifecycle', () => {
  it('releases a journaled reservation when its exact directory cannot be created, without admitting native input', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-parent-refusal-'))
    const states: string[] = []
    const manager = createBrowserDownloads({ root, cardId: 'alice', allowHostInterfaceReservations: true, recordReservation: async (reservation, end) => {
      states.push(end ?? 'prepared')
      if (!end)
        await writeFile(reservation.directory, 'Owned blocking fixture', { flag: 'wx' })
    }, record: async () => {}, onError: () => {} })
    try {
      await manager.prepare()
      const native = download('report.txt')
      await expect(manager.reserve({ id: 'owned-action', observationId: null }, native.getURL())).rejects.toThrow()
      expect(states).toEqual(['prepared', 'cancelled'])
      expect(native.getSavePath()).toBe('')
      expect(manager.hasActiveWriters()).toBe(false)
      expect(manager.snapshot()).toEqual([])
    }
    finally { manager.close(); await manager.flush(); await rm(root, { recursive: true, force: true }) }
  })

  it.each([0, 160])('creates the exact reserved native directory before admitting a download, extra depth %i', async (depth) => {
    const base = await mkdtemp(join(tmpdir(), 'alicization-download-parent-'))
    const root = depth ? join(base, 'p'.repeat(depth)) : base
    const records: BrowserDownloadReservation[] = []
    const manager = createBrowserDownloads({ root, cardId: 'alice', allowHostInterfaceReservations: true, recordReservation: async (reservation) => { records.push(reservation) }, record: async () => {}, onError: () => {} })
    try {
      await manager.prepare()
      const native = download('report.txt')
      const handle = await manager.reserve({ id: 'owned-action', observationId: null }, native.getURL())
      expect(records).toHaveLength(1)
      const reservation = records[0]
      expect(reservation.id).toBe(handle.id)
      // Chromium's Windows recursive directory creation can interrupt a long
      // target even when Node can create it. The native item receives a ready
      // directory inside its exact immutable reservation.
      expect((await stat(reservation.directory)).isDirectory()).toBe(true)
      expect(await realpath(reservation.directory)).toBe(reservation.directory)
      manager.accept(native as unknown as DownloadItem, handle)
      expect(native.getSavePath()).toBe(join(reservation.directory, 'report.txt'))
      await manager.stop()
      await manager.flush()
    }
    finally { manager.close(); await manager.flush(); await rm(base, { recursive: true, force: true }) }
  })

  it('recovers a previous process without claiming no side effect, preserves partial bytes, and leaves the current native owner alone', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-orphan-'))
    let db = await setupAlicizationDb(join(root, 'db'), { cardId: 'alice' })
    const ownerDirectory = join(root, createHash('sha256').update('alice').digest('hex'))
    await mkdir(ownerDirectory, { recursive: true })
    const canonicalOwner = await realpath(ownerDirectory)
    const oldRuntime = randomUUID()
    const request = downloadRequestIdentity('https://example.invalid/report?private=hidden')
    const reserve = async (runtimeId: string, actionId: string) => {
      const id = randomUUID()
      const at = Date.now()
      const reservation: BrowserDownloadReservation = { version: 2, runtimeId, id, cardId: 'alice', actionId, observationId: 'observed-page', directory: join(canonicalOwner, id), requestedUrl: request.publicUrl, requestHash: request.hash, origin: { kind: 'host-interface' }, at, expiresAt: at + 15000 }
      await recordBrowserDownloadReservation(db, reservation, { root, allowHostInterface: true })
      return reservation
    }
    try {
      const started = await reserve(oldRuntime, 'started')
      const prepared = await reserve(oldRuntime, 'unknown-start')
      const corrupt = await reserve(oldRuntime, 'corrupt-begin')
      const live = await reserve(browserDownloadRuntimeId, 'current-process')
      const path = join(started.directory, 'partial.txt')
      await mkdir(started.directory)
      await writeFile(path, 'part')
      const before = await stat(path)
      const receipt: BrowserDownloadReceipt = { id: started.id, cardId: 'alice', actionId: started.actionId, observationId: started.observationId, url: request.publicUrl, path, state: 'progressing', bytes: 4, sha256: null, at: Date.now() }
      await recordBrowserDownload(db, receipt)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'corrupt-download-fault-fixture', changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: `browser-download:${corrupt.id}`, source: 'browser-download', sourceKey: corrupt.id, kind: 'tool-result', occurredAt: Date.now(), payload: { ...receipt, id: corrupt.id, actionId: corrupt.actionId, path: join(corrupt.directory, 'crossed.txt'), bytes: -1 } } }] })
      await db.close()
      db = await setupAlicizationDb(join(root, 'db'), { cardId: 'alice' })
      expect((await recoverBrowserDownloads(db)).sort()).toEqual([started.id, prepared.id, corrupt.id].sort())
      expect(await recoverBrowserDownloads(db)).toEqual([])
      expect(await readBrowserDownloads(db)).toMatchObject([{ id: started.id, state: 'unverified', sha256: null, bytes: 4 }])
      const admissions = await readBrowserDownloadAdmissions(db)
      expect(admissions.find(item => item.id === prepared.id)).toMatchObject({ state: 'unverified', scope: 'download-intent-only-no-file-evidence' })
      expect(admissions.find(item => item.id === corrupt.id)).toMatchObject({ state: 'unverified', scope: 'download-intent-only-no-file-evidence' })
      expect(await db.getLifeIngress(`browser-download-reservation-result:${corrupt.id}`)).toMatchObject({ payload: { reason: 'previous-runtime-beginning-is-corrupt-or-crosses-its-owner', originalBeginHash: expect.stringMatching(/^[a-f\d]{64}$/u) } })
      expect(admissions.find(item => item.id === live.id)).toMatchObject({ state: 'prepared' })
      expect((await db.getLifeIngress(`browser-download-reservation:${live.id}`))?.status).toBe('accepted')
      expect((await db.getLifeIngress(`browser-download-reservation:${prepared.id}`))?.status).toBe('settled')
      expect((await stat(path)).mtimeMs).toBe(before.mtimeMs)
      expect(await readFile(path, 'utf8')).toBe('part')
      expect(JSON.stringify(admissions)).not.toContain('private=hidden')
      await expect(recordBrowserDownload(db, { ...receipt, state: 'completed', sha256: 'a'.repeat(64), at: Date.now() })).rejects.toThrow('different terminal')
      await expect(recordBrowserDownloadReservation(db, prepared, { root, allowHostInterface: true }, 'not-started')).rejects.toThrow('different terminal')
      await recordBrowserDownloadReservation(db, live, { root, allowHostInterface: true }, 'not-started')
      expect((await db.readLifeState()).obligations).toEqual([])
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('journals the actual browser effect identity, refuses cross-card receipts and preserves unused admission across reopen', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-owner-'))
    let db = await setupAlicizationDb(join(root, 'db'), { cardId: 'alice' })
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getEffect: db.getLifeEffect, getIngress: db.getLifeIngress, now: Date.now })
    const signal = new AbortController().signal
    const manager = createBrowserDownloads({ root, cardId: 'alice', record: receipt => recordBrowserDownload(db, receipt), recordReservation: (reservation, end) => recordBrowserDownloadReservation(db, reservation, { root }, end), onError: () => {} })
    try {
      await manager.prepare()
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '下载这份报告' }] }, signal)
      const parameters = { selector: 'element:current-report' }
      const prepared = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'click-report', capabilityId: 'tool.browser_click_element', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.browser_click_element')!.effects }, signal)
      await prepared.authorizeDispatch(parameters)
      const native = download('report.txt')
      const permit = await withActionDispatch(prepared.assertDispatchCurrent, () => manager.reserve({ id: 'native-action', observationId: 'actual-page', signal }, native.getURL()))
      expect(await db.getLifeIngress(`browser-download-reservation:${permit.id}`)).toMatchObject({ source: 'browser-download-reservation', payload: { origin: { kind: 'life-effect', effectId: prepared.id, turnId: 'request' }, actionId: 'native-action', observationId: 'actual-page' } })
      await db.close()
      db = await setupAlicizationDb(join(root, 'db'), { cardId: 'alice' })
      expect((await db.getLifeIngress(`browser-download-reservation:${permit.id}`))?.status).toBe('accepted')
      expect(await readBrowserDownloads(db)).toEqual([])
      const receipt: BrowserDownloadReceipt = { id: permit.id, cardId: 'bob', actionId: 'native-action', observationId: 'actual-page', path: join(root, 'fake.txt'), url: 'https://example.invalid/result', state: 'completed', bytes: 4, sha256: 'a'.repeat(64), at: Date.now() }
      await expect(recordBrowserDownload(db, receipt)).rejects.toThrow('card owner')
      await manager.release(permit)
      expect(await db.getLifeIngress(`browser-download-reservation-result:${permit.id}`)).toMatchObject({ payload: { state: 'not-started', origin: { effectId: prepared.id } } })
      expect(await readBrowserDownloads(db)).toEqual([])
      expect(native.getSavePath()).toBe('')
    }
    finally { manager.close(); await manager.flush(); await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('waits for durable admission and rechecks the main authority before returning an activation permit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-admission-'))
    let finish!: () => void
    let entered!: () => void
    const persisted = new Promise<void>((resolve) => { finish = resolve })
    const started = new Promise<void>((resolve) => { entered = resolve })
    const events: Array<string | undefined> = []
    let current = true
    const check = vi.fn(async () => {
      if (!current)
        throw new Error('authority withdrawn')
      return { expiresAt: Date.now() + 10000, cardId: 'alice', effectId: 'effect', turnId: 'turn' }
    })
    const manager = createBrowserDownloads({ root, cardId: 'alice', record: async () => {}, recordReservation: async (_reservation, end) => { events.push(end); if (!end) { entered(); await persisted } }, onError: () => {} })
    try {
      await manager.prepare()
      let returned = false
      const reserving = withActionDispatch(check, () => manager.reserve({ id: 'action', observationId: 'page' }, download('file').getURL())).then(() => { returned = true })
      const rejected = expect(reserving).rejects.toThrow('authority withdrawn')
      await started
      expect(returned).toBe(false)
      current = false
      finish()
      await rejected
      await manager.flush()
      expect(events).toEqual([undefined, 'cancelled'])
      expect(check).toHaveBeenCalledTimes(3)
    }
    finally { finish(); manager.close(); await manager.flush(); await rm(root, { recursive: true, force: true }) }
  })

  it('retains the exact pre-start cancellation when shutdown races a pending journal write', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-close-admission-'))
    let finish!: () => void
    let entered!: () => void
    const persisted = new Promise<void>((resolve) => { finish = resolve })
    const started = new Promise<void>((resolve) => { entered = resolve })
    const records: string[] = []
    const manager = createBrowserDownloads({ root, cardId: 'alice', allowHostInterfaceReservations: true, record: async () => {}, recordReservation: async (_reservation, end) => { if (!end) { entered(); await persisted } records.push(end ?? 'prepared') }, onError: () => {} })
    try {
      await manager.prepare()
      const reserving = manager.reserve({ id: 'action', observationId: null }, download('file').getURL())
      const rejected = expect(reserving).rejects.toThrow('CANCELLED')
      await started
      manager.close()
      let drained = false
      const draining = manager.flush().then(() => { drained = true })
      await Promise.resolve()
      expect(drained).toBe(false)
      finish()
      await rejected
      await draining
      expect(records).toEqual(['prepared', 'cancelled'])
    }
    finally { finish(); manager.close(); await manager.flush(); await rm(root, { recursive: true, force: true }) }
  })

  it('rejects cloned, replayed and wrong-URL permits while preserving the actual matching native item', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-permit-'))
    const manager = createBrowserDownloads({ root, cardId: 'alice', allowHostInterfaceReservations: true, record: async () => {}, recordReservation: async () => {}, onError: () => {} })
    try {
      await manager.prepare()
      const handle = await manager.reserve({ id: 'one', observationId: 'page' }, download('file').getURL())
      const clone = download('clone')
      expect(manager.accept(clone as unknown as DownloadItem, { ...handle })).toBeNull()
      const wrong = download('wrong')
      wrong.getURLChain = () => ['https://other.invalid/result']
      expect(manager.accept(wrong as unknown as DownloadItem, handle)).toBeNull()
      const actual = download('actual')
      expect(manager.accept(actual as unknown as DownloadItem, handle)).toBe(handle.id)
      const replay = download('replay')
      expect(manager.accept(replay as unknown as DownloadItem, handle)).toBeNull()
      expect(clone.cancel).toHaveBeenCalledOnce()
      expect(wrong.cancel).toHaveBeenCalledOnce()
      expect(replay.cancel).toHaveBeenCalledOnce()
      expect(actual.cancel).not.toHaveBeenCalled()
      await manager.stop()
      await manager.stop()
      expect(actual.cancel).toHaveBeenCalledOnce()
      await manager.flush()
      expect(manager.snapshot()).toMatchObject([{ state: 'cancelled', actionId: 'one' }])
    }
    finally { manager.close(); await manager.flush(); await rm(root, { recursive: true, force: true }) }
  })

  it('separates native stop from journal drain and never promotes an unpersisted completion', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-drain-'))
    let persist!: () => void
    const records: BrowserDownloadReceipt[] = []
    const journal = new Promise<void>((resolve) => { persist = resolve })
    const manager = createBrowserDownloads({ root, cardId: 'alice', allowHostInterfaceReservations: true, recordReservation: async () => {}, record: async (receipt) => {
      if (receipt.state === 'progressing')
        await journal; records.push(receipt)
    }, onError: () => {} })
    try {
      await manager.prepare()
      const item = download('file')
      manager.accept(item as unknown as DownloadItem, await manager.reserve({ id: 'one', observationId: null }, item.getURL()))
      await manager.stop()
      expect(item.cancel).toHaveBeenCalledOnce()
      expect(manager.snapshot()).toEqual([])
      let drained = false
      const draining = manager.flush().then(() => { drained = true })
      await Promise.resolve()
      expect(drained).toBe(false)
      persist()
      await draining
      expect(records.map(item => item.state)).toEqual(['progressing', 'cancelled'])
      expect(manager.snapshot()).toMatchObject([{ state: 'cancelled', sha256: null }])
    }
    finally { persist(); manager.close(); await manager.flush(); await rm(root, { recursive: true, force: true }) }
  })

  it('refuses activation without an explicit source owner or after journal failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-denial-'))
    const recordReservation = vi.fn(async () => { throw new Error('disk unavailable') })
    const manager = createBrowserDownloads({ root, cardId: 'alice', recordReservation, record: async () => {}, onError: () => {} })
    const host = createBrowserDownloads({ root, cardId: 'alice', allowHostInterfaceReservations: true, recordReservation, record: async () => {}, onError: () => {} })
    try {
      await manager.prepare()
      await host.prepare()
      await expect(manager.reserve({ id: 'one', observationId: null }, download('file').getURL())).rejects.toThrow('SOURCE_AUTHORITY')
      expect(recordReservation).not.toHaveBeenCalled()
      await expect(host.reserve({ id: 'two', observationId: null }, download('file').getURL())).rejects.toThrow('disk unavailable')
      expect(recordReservation).toHaveBeenCalledOnce()
      expect(host.snapshot()).toEqual([])
    }
    finally { manager.close(); host.close(); await Promise.all([manager.flush(), host.flush()]); await rm(root, { recursive: true, force: true }) }
  })
  it('binds same-named files to distinct transfers and records stable bytes through the life writer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-'))
    const db = await setupAlicizationDb(join(root, 'db'), { cardId: 'alice' })
    const errors: unknown[] = []
    const manager = createBrowserDownloads({ root, cardId: 'alice', record: receipt => recordBrowserDownload(db, receipt), recordReservation: (reservation, end) => recordBrowserDownloadReservation(db, reservation, { root, allowHostInterface: true }, end), allowHostInterfaceReservations: true, onError: error => errors.push(error) })
    try {
      await manager.prepare()
      const a = download('../../same.txt')
      const b = download('same.txt')
      manager.accept(a as unknown as DownloadItem, await manager.reserve({ id: 'action-one', observationId: 'page-one' }, a.getURL()))
      manager.accept(b as unknown as DownloadItem, await manager.reserve({ id: 'action-two', observationId: 'page-two' }, b.getURL()))
      expect(a.getSavePath()).not.toBe(b.getSavePath())
      for (const item of [a, b]) {
        await mkdir(dirname(item.getSavePath()), { recursive: true })
        await writeFile(item.getSavePath(), 'data')
        item.emit('done', {}, 'completed')
      }
      await manager.flush()
      const receipts = await readBrowserDownloads(db)
      expect(receipts).toHaveLength(2)
      expect(receipts.every(item => item.state === 'completed' && item.sha256 === createHash('sha256').update('data').digest('hex'))).toBe(true)
      expect(receipts.map(item => item.actionId).sort()).toEqual(['action-one', 'action-two'])
      expect(JSON.stringify(receipts)).not.toContain('password')
      expect(JSON.stringify(receipts)).not.toContain('token=')
      expect(await readFile(receipts[0]!.path, 'utf8')).toBe('data')
      expect(errors).toEqual([])
    }
    finally { manager.close(); await manager.flush(); await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('cancels unsolicited, oversized and aborted transfers and never certifies a missing or mismatched file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-fault-'))
    const records: BrowserDownloadReceipt[] = []
    const manager = createBrowserDownloads({ root, cardId: 'alice', record: async (receipt) => { records.push(receipt) }, recordReservation: async () => {}, allowHostInterfaceReservations: true, onError: () => {} })
    try {
      await manager.prepare()
      const unsolicited = download('unrequested.txt')
      expect(manager.accept(unsolicited as unknown as DownloadItem, null)).toBeNull()
      expect(unsolicited.cancel).toHaveBeenCalledOnce()
      const missing = download('missing.txt')
      manager.accept(missing as unknown as DownloadItem, await manager.reserve({ id: 'missing', observationId: null }, missing.getURL()))
      missing.emit('done', {}, 'completed')
      await manager.flush()
      expect(manager.snapshot().find(item => item.actionId === 'missing')).toMatchObject({ state: 'unverified', sha256: null })
      const controller = new AbortController()
      const cancelled = download('cancelled.txt')
      manager.accept(cancelled as unknown as DownloadItem, await manager.reserve({ id: 'cancelled', observationId: null, signal: controller.signal }, cancelled.getURL()))
      controller.abort()
      const oversized = download('too-large.txt', 65 * 1024 * 1024)
      manager.accept(oversized as unknown as DownloadItem, await manager.reserve({ id: 'oversized', observationId: null }, oversized.getURL()))
      oversized.emit('updated', {}, 'progressing')
      await manager.flush()
      expect(cancelled.cancel).toHaveBeenCalledOnce()
      expect(oversized.cancel).toHaveBeenCalledOnce()
      expect(records.filter(item => item.state === 'completed')).toEqual([])
    }
    finally { manager.close(); await manager.flush(); await rm(root, { recursive: true, force: true }) }
  })

  it('keeps an interrupted process unverified after reopen and rejects a fabricated completion', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-download-restart-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const id = randomUUID()
      const ownerDirectory = join(root, createHash('sha256').update('alice').digest('hex'))
      await mkdir(ownerDirectory, { recursive: true })
      const directory = join(await realpath(ownerDirectory), id)
      const at = Date.now()
      const request = downloadRequestIdentity('https://example.invalid/result')
      const reservation: BrowserDownloadReservation = { version: 2, runtimeId: browserDownloadRuntimeId, id, cardId: 'alice', actionId: 'one', observationId: null, directory, requestedUrl: request.publicUrl, requestHash: request.hash, origin: { kind: 'host-interface' }, at, expiresAt: at + 15000 }
      await recordBrowserDownloadReservation(db, reservation, { root, allowHostInterface: true })
      const receipt: BrowserDownloadReceipt = { id, cardId: 'alice', actionId: 'one', observationId: null, url: request.publicUrl, path: join(directory, 'file.txt'), state: 'progressing', bytes: 0, sha256: null, at }
      await recordBrowserDownload(db, receipt)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect(await readBrowserDownloads(db)).toMatchObject([{ id, state: 'unverified', sha256: null }])
      await expect(recordBrowserDownload(db, { ...receipt, path: join(root, 'other.txt'), state: 'completed', sha256: 'a'.repeat(64) })).rejects.toThrow('exact persisted beginning')
      expect((await readBrowserDownloads(db))[0]?.state).toBe('unverified')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
