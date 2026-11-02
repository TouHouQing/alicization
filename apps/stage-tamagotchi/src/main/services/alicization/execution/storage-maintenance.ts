import type { ExecutionStorageStatus } from '../../../../shared/execution-storage-contracts'

import { statfs } from 'node:fs/promises'

import { awaitAlicizationPromiseWithAbort } from '../main-chat-stream-primitives'

export interface ExecutionCachePort { size: () => Promise<number>, clear: () => Promise<void> }
const lowSpaceBytes = 512n * 1024n * 1024n
const maximumCacheBytes = 128 * 1024 * 1024
const worthwhileCacheBytes = 4 * 1024 * 1024

/** One host cache owner. No persona/database/filesystem-delete port is exposed. */
export function createExecutionStorageMaintenance(options: {
  root: string
  cache: ExecutionCachePort
  canMaintain: (explicit: boolean) => boolean
  probe?: () => Promise<bigint>
  now?: () => number
  deadlineMs?: number
  observe?: (status: ExecutionStorageStatus) => void
}) {
  const now = options.now ?? Date.now
  const deadlineMs = options.deadlineMs ?? 3000
  if (!Number.isInteger(deadlineMs) || deadlineMs < 25 || deadlineMs > 10_000)
    throw new TypeError('Storage maintenance requires a bounded deadline')
  const probe = options.probe ?? (async () => {
    const info = await statfs(options.root, { bigint: true })
    return info.bavail * info.bsize
  })
  let state: ExecutionStorageStatus = { state: 'unknown', pressure: 'unknown', availableBytes: null, cacheBytes: null, checkedAt: null, cleanedAt: null, releasedCacheBytes: 0, cleanupPending: false }
  let closed = false
  let timer: ReturnType<typeof setInterval> | undefined
  let job: { explicit: boolean, cleaning: boolean, attempted: boolean, finished: boolean, expiresAt: number, promise: Promise<ExecutionStorageStatus> } | null = null
  const snapshot = (): ExecutionStorageStatus => ({ ...state, cleanupPending: Boolean(job?.cleaning) })
  function publish(next: ExecutionStorageStatus) {
    if (closed)
      return
    const previous = state
    state = next
    if (previous.pressure !== state.pressure || previous.cleanedAt !== state.cleanedAt || (previous.state !== state.state && state.state === 'failed')) {
      try {
        options.observe?.(snapshot())
      }
      catch { /* Diagnostic delivery cannot prevent disk recovery. */ }
    }
  }
  async function run(owner: NonNullable<typeof job>) {
    try {
      const available = await probe()
      const cacheBytes = await options.cache.size()
      if (closed)
        return snapshot()
      if (available < 0n || !Number.isSafeInteger(cacheBytes) || cacheBytes < 0)
        throw new Error('Storage probe returned invalid sizes')
      const pressure = available < lowSpaceBytes ? 'low' : 'normal'
      publish({ ...state, state: 'ready', pressure, availableBytes: String(available), cacheBytes, checkedAt: now() })
      const due = state.cleanedAt === null || now() - state.cleanedAt >= 60_000
      const necessary = owner.explicit || (due && (cacheBytes > maximumCacheBytes || (pressure === 'low' && cacheBytes >= worthwhileCacheBytes)))
      if (!necessary)
        return snapshot()
      if (!options.canMaintain(owner.explicit)) {
        publish({ ...state, state: 'deferred' })
        return snapshot()
      }
      if (closed)
        return snapshot()
      owner.attempted = true
      owner.cleaning = true
      publish({ ...state, state: 'cleaning' })
      await options.cache.clear()
      if (closed) {
        owner.cleaning = false
        return snapshot()
      }
      const after = await options.cache.size()
      const availableAfter = await probe()
      if (!Number.isSafeInteger(after) || after < 0 || availableAfter < 0n)
        throw new Error('Storage readback returned invalid sizes')
      owner.cleaning = false
      publish({ ...state, state: 'ready', pressure: availableAfter < lowSpaceBytes ? 'low' : 'normal', availableBytes: String(availableAfter), cacheBytes: after, checkedAt: now(), cleanedAt: now(), releasedCacheBytes: Math.max(0, cacheBytes - after) })
      return snapshot()
    }
    catch {
      owner.cleaning = false
      if (!closed)
        publish({ ...state, state: 'failed', checkedAt: now() })
      return snapshot()
    }
    finally {
      owner.finished = true
    }
  }
  async function bounded(owner: NonNullable<typeof job>, signal?: AbortSignal) {
    let timeout: ReturnType<typeof setTimeout> | undefined
    const pending = Promise.race([owner.promise, new Promise<ExecutionStorageStatus>((resolve) => {
      timeout = setTimeout(() => resolve(snapshot()), Math.max(0, owner.expiresAt - now()))
    })])
    try {
      return await (signal ? awaitAlicizationPromiseWithAbort(pending, signal) : pending)
    }
    finally {
      clearTimeout(timeout)
    }
  }
  async function inspect(input: { clearCache?: boolean, signal?: AbortSignal } = {}): Promise<ExecutionStorageStatus> {
    input.signal?.throwIfAborted()
    if (closed)
      return snapshot()
    if (!job) {
      // A timed-out fresh probe cannot reuse yesterday's healthy reading.
      state = { ...state, state: 'unknown', pressure: 'unknown' }
      const owner = { explicit: input.clearCache === true, cleaning: false, attempted: false, finished: false, expiresAt: now() + deadlineMs, promise: Promise.resolve(snapshot()) }
      job = owner
      owner.promise = run(owner).finally(() => {
        if (job === owner)
          job = null
      })
    }
    else if (input.clearCache) {
      job.explicit = true
    }
    const owner = job
    const result = await bounded(owner, input.signal)
    // A finished read cannot consume a later explicit request. Join its owner
    // release first, then start one fresh cleanup; failed/deferred jobs stay put.
    if (input.clearCache && owner.finished && !owner.attempted && result.state === 'ready')
      return inspect(input)
    return result
  }
  return {
    inspect,
    snapshot,
    optionalWorkAllowed: async (signal?: AbortSignal) => {
      const current = await inspect({ signal })
      return current.pressure === 'normal' && current.state !== 'closed' && current.state !== 'failed'
    },
    start: () => {
      if (closed || timer)
        return
      void inspect()
      timer = setInterval(() => {
        void inspect()
      }, 60_000)
      timer.unref()
    },
    close: async () => {
      closed = true
      if (timer)
        clearInterval(timer)
      state = { ...state, state: 'closed' }
      if (job)
        await bounded(job)
      return snapshot()
    },
  }
}
