import type { DownloadItem } from 'electron'

import type { BrowserDownloadHandle, BrowserDownloadReservation, BrowserDownloadReservationEnd } from './browser-download-reservations'
import type { ExecutionResourceBroker, ResourceLease } from './resource-broker'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, realpath } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

import { assertActionDispatchCurrent } from './action-dispatch-context'
import { browserDownloadRuntimeId, downloadRequestIdentity } from './browser-download-reservations'
import { executionDirectoryTreeResources } from './resource-broker'

export interface BrowserDownloadReceipt {
  id: string
  cardId: string
  actionId: string
  observationId: string | null
  url: string
  path: string
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted' | 'unverified'
  bytes: number
  sha256: string | null
  at: number
}

/** DownloadItem identity, never a matching filename, owns a transfer. */
export function createBrowserDownloads(options: {
  root: string
  cardId: string
  record: (receipt: BrowserDownloadReceipt) => Promise<void>
  recordReservation: (reservation: BrowserDownloadReservation, end?: BrowserDownloadReservationEnd) => Promise<void>
  allowHostInterfaceReservations?: boolean
  resourceBroker?: ExecutionResourceBroker
  onError: (error: unknown) => void
}) {
  const active = new Map<string, { item: DownloadItem, receipt: BrowserDownloadReceipt, parentEffectId: string | null, signal?: AbortSignal, cancel: () => void, stopped: Promise<void>, terminal: boolean }>()
  const leases = new Map<string, ResourceLease>()
  const receipts = new Map<string, BrowserDownloadReceipt>()
  const writes = new Set<Promise<unknown>>()
  const reservations = new Map<string, { handle: BrowserDownloadHandle, reservation: BrowserDownloadReservation, signal?: AbortSignal, timer?: ReturnType<typeof setTimeout>, abort: () => void, persisting: Promise<void> }>()
  let prepared = false
  let root = resolve(options.root, createHash('sha256').update(options.cardId).digest('hex'))
  let closed = false
  let stopping: Promise<void> | undefined
  const report = (error: unknown) => {
    try { options.onError(error) }
    catch { /* Diagnostics do not own transfer state. */ }
  }
  function settleResource(id: string, stoppedAndDurable: boolean) {
    const lease = leases.get(id)
    if (!lease)
      return
    options.resourceBroker!.settle(lease, { stopped: stoppedAndDurable, uncertain: !stoppedAndDurable })
    if (stoppedAndDurable)
      leases.delete(id)
  }
  function enqueue(receipt: BrowserDownloadReceipt) {
    const snapshot = structuredClone(receipt)
    const write = Promise.resolve().then(() => options.record(snapshot)).then(() => {
      receipts.set(snapshot.id, snapshot)
      // This bound is presentation retention; it must never disable navigation.
      for (const [id] of receipts) {
        if (receipts.size <= 128)
          break
        if (!active.has(id))
          receipts.delete(id)
      }
    })
    writes.add(write)
    void write.catch((error) => {
      const transfer = active.get(receipt.id)
      if (transfer && !transfer.terminal) {
        try { transfer.item.cancel() }
        catch (cancelError) { report(cancelError) }
      }
      report(error)
    }).finally(() => writes.delete(write))
    return write
  }
  function detachReservation(entry: NonNullable<ReturnType<typeof reservations.get>>) {
    clearTimeout(entry.timer)
    entry.signal?.removeEventListener('abort', entry.abort)
    reservations.delete(entry.handle.id)
  }
  async function release(handle: BrowserDownloadHandle, end: BrowserDownloadReservationEnd = 'not-started') {
    const entry = reservations.get(handle.id)
    if (!entry || entry.handle !== handle)
      return
    detachReservation(entry)
    const write = entry.persisting.then(() => options.recordReservation(entry.reservation, end))
    writes.add(write)
    try { await write; settleResource(handle.id, true) }
    catch (error) { settleResource(handle.id, false); throw error }
    finally { writes.delete(write) }
  }
  async function reserve(action: { id: string, observationId: string | null, signal?: AbortSignal }, href: string) {
    action.signal?.throwIfAborted()
    if (leases.size >= 128 && options.resourceBroker) {
      const live = new Set(options.resourceBroker.snapshot().map(lease => lease.id))
      for (const [id, lease] of leases) {
        if (!live.has(lease.id))
          leases.delete(id)
      }
      if (leases.size >= 128)
        throw new Error('BROWSER_DOWNLOAD_UNRESOLVED_RESOURCE_BUDGET')
    }
    if (!prepared || closed || reservations.size >= 16)
      throw new Error('BROWSER_DOWNLOAD_RESERVATION_UNAVAILABLE')
    const authority = await assertActionDispatchCurrent(false)
    if (authority && (!authority.effectId || authority.cardId !== options.cardId || !authority.turnId) || !authority && !options.allowHostInterfaceReservations)
      throw new Error('BROWSER_DOWNLOAD_SOURCE_AUTHORITY_REQUIRED')
    const at = Date.now()
    const expiresAt = Math.min(at + 15000, authority?.expiresAt ?? Number.POSITIVE_INFINITY)
    if (expiresAt <= at)
      throw new Error('BROWSER_DOWNLOAD_AUTHORITY_EXPIRED')
    const id = randomUUID()
    const request = downloadRequestIdentity(href)
    const handle = Object.freeze({ id })
    const reservation: BrowserDownloadReservation = { version: 2, runtimeId: browserDownloadRuntimeId, id, cardId: options.cardId, actionId: action.id, observationId: action.observationId, directory: join(root, id), requestHash: request.hash, requestedUrl: request.publicUrl, origin: authority ? { kind: 'life-effect', effectId: authority.effectId!, turnId: authority.turnId! } : { kind: 'host-interface' }, at, expiresAt }
    if (options.resourceBroker) {
      const resources = await executionDirectoryTreeResources(reservation.directory)
      leases.set(id, options.resourceBroker.acquire({ owner: `browser-download:${options.cardId}:${id}`, effectId: `browser-download:${id}`, effectCardId: options.cardId, resources, resourceOnly: true, ttlMs: 120_000 }))
    }
    const abort = () => { void release(handle, 'cancelled').catch(report) }
    const persisting = Promise.resolve().then(() => options.recordReservation(reservation))
    writes.add(persisting)
    const entry = { handle, reservation, signal: action.signal, abort, timer: undefined as ReturnType<typeof setTimeout> | undefined, persisting }
    reservations.set(id, entry)
    try {
      await persisting
    }
    catch (error) {
      detachReservation(entry)
      // No handle has escaped and no native writer was admitted.
      settleResource(id, true)
      throw error
    }
    finally { writes.delete(persisting) }
    try {
      // Chromium's Windows recursive directory creation can fail beyond
      // MAX_PATH even though its native file writer accepts the same path.
      // Prepare the unique, journaled directory through Node before any link
      // activation; never rewrite the target or use a namespaced native path.
      await mkdir(reservation.directory)
      if (await realpath(reservation.directory) !== reservation.directory)
        throw new Error('BROWSER_DOWNLOAD_RESERVATION_PATH_CHANGED')
    }
    catch (error) {
      await release(handle, 'cancelled')
      throw error
    }
    if (closed || action.signal?.aborted || expiresAt <= Date.now()) {
      await release(handle, 'cancelled')
      throw new Error('BROWSER_DOWNLOAD_RESERVATION_CANCELLED')
    }
    try { await assertActionDispatchCurrent(false) }
    catch (error) { await release(handle, 'cancelled'); throw error }
    if (closed || action.signal?.aborted || expiresAt <= Date.now() || !reservations.has(id)) {
      await release(handle, 'cancelled')
      throw new Error('BROWSER_DOWNLOAD_RESERVATION_CANCELLED')
    }
    entry.timer = setTimeout(() => { void release(handle).catch(report) }, Math.max(1, expiresAt - Date.now()))
    entry.timer.unref?.()
    action.signal?.addEventListener('abort', abort, { once: true })
    return handle
  }
  function accept(item: DownloadItem, handle: BrowserDownloadHandle | null) {
    const entry = handle && reservations.get(handle.id)
    if (closed || !entry || entry.handle !== handle) {
      item.cancel()
      return null
    }
    if (entry.signal?.aborted || entry.reservation.expiresAt <= Date.now() || active.size >= 4 || item.getTotalBytes() > 64 * 1024 * 1024) {
      void release(entry.handle, 'cancelled').catch(report)
      item.cancel()
      return null
    }
    let requested: ReturnType<typeof downloadRequestIdentity>
    try { requested = downloadRequestIdentity(item.getURLChain()[0] ?? item.getURL()) }
    catch (error) { report(error); item.cancel(); return null }
    if (requested.hash !== entry.reservation.requestHash) {
      item.cancel()
      return null
    }
    detachReservation(entry)
    const { reservation, signal } = entry
    const id = reservation.id
    // Remote filenames cannot escape the owned directory or overwrite another
    // transfer. A UUID directory also keeps same-named downloads independent.
    let filename = [...basename(item.getFilename()).replace(/[<>:"/\\|?*\u0000-\u001F]/gu, '_')].slice(0, 160).join('').replace(/[. ]+$/u, '') || 'download'
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(filename))
      filename = `_${filename}`
    const path = join(root, id, filename)
    const url = new URL(item.getURL())
    // Signed query strings and URL credentials do not belong in task history.
    const receipt: BrowserDownloadReceipt = { id, cardId: options.cardId, actionId: reservation.actionId, observationId: reservation.observationId, url: `${url.origin}${url.pathname}`.slice(0, 8192), path, state: 'progressing', bytes: 0, sha256: null, at: Date.now() }
    const cancel = () => item.cancel()
    let nativeStopped!: () => void
    const stopped = new Promise<void>((resolve) => { nativeStopped = resolve })
    active.set(id, { item, receipt, parentEffectId: reservation.origin.kind === 'life-effect' ? reservation.origin.effectId : null, signal, cancel, stopped, terminal: false })
    signal?.addEventListener('abort', cancel, { once: true })
    // The begin event is persisted before a completed file may become evidence.
    const began = enqueue(receipt)
    const updated = (_event: unknown, state: string) => {
      if (active.get(id)?.terminal)
        return
      receipt.bytes = item.getReceivedBytes()
      const total = item.getTotalBytes()
      if (closed || signal?.aborted || receipt.bytes > 64 * 1024 * 1024 || total > 64 * 1024 * 1024 || state === 'interrupted')
        item.cancel()
    }
    item.on('updated', updated)
    let stopConfirmation: ReturnType<typeof setTimeout> | undefined
    const deadline = setTimeout(() => {
      if (active.get(id)?.terminal)
        return
      report(new Error('BROWSER_DOWNLOAD_DURATION_BUDGET'))
      try { item.cancel() }
      catch (error) { report(error) }
      if (!active.get(id)?.terminal) {
        stopConfirmation = setTimeout(() => {
          if (active.has(id) && !active.get(id)!.terminal)
            settleResource(id, false)
        }, 5000)
        stopConfirmation.unref?.()
      }
    }, Math.max(1, reservation.at + 120_000 - Date.now()))
    deadline.unref?.()
    item.once('done', (_event, state) => {
      active.get(id)!.terminal = true
      clearTimeout(deadline)
      clearTimeout(stopConfirmation)
      item.removeListener('updated', updated)
      const received = item.getReceivedBytes()
      const savedPath = item.getSavePath()
      receipt.bytes = received
      nativeStopped()
      signal?.removeEventListener('abort', cancel)
      const finished = (async () => {
        let durable = false
        try {
          await began
          receipt.state = state
          receipt.bytes = received
          if (state === 'completed') {
            // Check the exact DownloadItem path and stable file bytes after the
            // terminal event. A completed network event alone is insufficient.
            if (resolve(savedPath) !== path || await realpath(dirname(path)) !== resolve(root, id))
              throw new Error('BROWSER_DOWNLOAD_PATH_CHANGED')
            const file = await open(path, 'r')
            try {
              const before = await file.stat()
              if (!before.isFile() || before.size > 64 * 1024 * 1024 || before.size !== receipt.bytes)
                throw new Error('BROWSER_DOWNLOAD_SIZE_MISMATCH')
              const hash = createHash('sha256')
              let count = 0
              for await (const bytes of file.createReadStream({ autoClose: false })) {
                count += bytes.length
                if (count > 64 * 1024 * 1024)
                  throw new Error('BROWSER_DOWNLOAD_BYTE_BUDGET')
                hash.update(bytes)
              }
              const after = await file.stat()
              if (before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || count !== before.size)
                throw new Error('BROWSER_DOWNLOAD_CHANGED_DURING_READBACK')
              receipt.sha256 = hash.digest('hex')
            }
            finally { await file.close() }
          }
          receipt.at = Date.now()
          await enqueue(receipt)
          durable = true
        }
        catch (error) {
          receipt.state = 'unverified'
          receipt.sha256 = null
          receipts.set(id, structuredClone(receipt))
          report(error)
          try { await enqueue(receipt); durable = true }
          catch { /* The original persistence error is already reported. */ }
        }
        finally { settleResource(id, durable); active.delete(id) }
      })()
      writes.add(finished)
      void finished.finally(() => writes.delete(finished))
    })
    try {
      const lease = leases.get(id)
      if (lease)
        options.resourceBroker!.assert(lease)
      item.setSavePath(path)
    }
    catch (error) { report(error); item.cancel() }
    return id
  }
  async function prepare() { await mkdir(root, { recursive: true }); root = await realpath(root); prepared = true; return root }
  async function flush() { while (writes.size) await Promise.allSettled(writes) }
  async function cancelEffects(effectIds: readonly string[]) {
    if (effectIds.length > 256 || effectIds.some(id => !id || id.length > 512))
      throw new Error('BROWSER_DOWNLOAD_CANCELLATION_BUDGET')
    const owners = new Set(effectIds)
    let requested = 0
    for (const entry of [...reservations.values()]) {
      if (entry.reservation.origin.kind === 'life-effect' && owners.has(entry.reservation.origin.effectId)) {
        requested++
        // Revocation happens synchronously in release, before journal awaits.
        void release(entry.handle, 'cancelled').catch(report)
      }
    }
    const matches = [...active.values()].filter(entry => entry.parentEffectId && owners.has(entry.parentEffectId))
    for (const entry of matches) {
      if (!entry.terminal) {
        requested++
        try { entry.item.cancel() }
        catch (error) { report(error) }
      }
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([Promise.all(matches.map(entry => entry.stopped)), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('BROWSER_DOWNLOAD_STOP_UNCONFIRMED')), 5000) })])
      return { requested, stopped: true, state: 'stopped' }
    }
    catch { return { requested, stopped: false, state: 'stopping' } }
    finally { clearTimeout(timer) }
  }
  function close() {
    if (closed)
      return
    closed = true
    for (const { handle } of [...reservations.values()]) void release(handle, 'cancelled').catch(report)
    for (const entry of active.values()) {
      if (!entry.terminal) {
        try { entry.item.cancel() }
        catch (error) { report(error) }
      }
    }
  }
  async function waitForNativeStop() {
    const stopped = [...active.values()].map(entry => entry.stopped)
    close()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([Promise.all(stopped), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('BROWSER_DOWNLOAD_STOP_UNCONFIRMED')), 5000) })])
    }
    finally { clearTimeout(timer) }
  }
  function stop() { return stopping ??= waitForNativeStop() }
  return { cardId: options.cardId, prepare, reserve, release, accept, flush, close, stop, cancelEffects, writerStopped: (id: string) => !reservations.has(id) && !active.has(id), hasActiveWriters: () => reservations.size > 0 || active.size > 0, snapshot: () => [...receipts.values()].map(item => ({ ...structuredClone(item), ...(item.state === 'progressing' && active.has(item.id) ? { bytes: active.get(item.id)!.receipt.bytes } : {}) })) }
}
