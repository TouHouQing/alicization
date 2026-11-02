import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { realpath, stat } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { platform } from 'node:process'

import { assertResourceOnlyFilesystemScopes, executionResourcesOverlap } from './resource-overlap'

export interface ResourceLease { id: string, owner: string, resources: string[], epoch: string, fencingToken: number, expiresAt: number, effectId?: string, effectCardId?: string, resourceOnly?: true, coordinationOnly?: true }

/** Resolve existing aliases and a new file's real parent before assigning a lock. */
export async function executionFileResources(path: string) {
  if (!isAbsolute(path))
    throw new TypeError('Execution resource path must be absolute')
  let canonical = resolve(path)
  let inode: string | null = null
  let sharedInode: string | null = null
  let parent = canonical
  const tail: string[] = []
  while (true) {
    try {
      const real = await realpath(parent)
      canonical = resolve(real, ...tail.reverse())
      if (!tail.length) {
        const info = await stat(real, { bigint: true })
        if (info.ino)
          inode = `file-inode:${info.dev}:${info.ino}`
        if (info.isFile() && info.nlink > 1n) {
          if (!info.ino)
            throw new Error('A shared file has no observable object identity')
          sharedInode = `file-shared-inode:${info.dev}:${info.ino}`
        }
      }
      break
    }
    catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT')
        throw error
      const next = dirname(parent)
      if (next === parent)
        throw new Error('Execution resource has no accessible parent')
      tail.push(parent.slice(next.length).replace(/^[/\\]+/u, ''))
      parent = next
    }
  }
  const pathId = `file-path:${platform === 'win32' ? canonical.toLowerCase() : canonical}`
  return inode ? [pathId, inode, ...(sharedInode ? [sharedInode] : [])] : [pathId]
}

export async function executionFileResource(path: string) {
  const resources = await executionFileResources(path)
  return resources.find(id => id.startsWith('file-inode:')) ?? resources[0]
}

export async function executionDirectoryTreeResources(path: string) {
  const resources = await executionFileResources(path)
  const canonical = resources.find(key => key.startsWith('file-path:'))!
  return [canonical.replace(/^file-path:/u, 'file-tree:')]
}

export function createExecutionResourceBroker(now: () => number = Date.now) {
  const epoch = randomUUID()
  const leases = new Map<string, ResourceLease & { uncertain: boolean }>()
  const context = new AsyncLocalStorage<string>()
  const changed = new Set<() => void>()
  let sequence = 0
  function acquire(input: { owner: string, resources: string[], ttlMs?: number, effectId?: string, effectCardId?: string, resourceOnly?: true, coordinationOnly?: true }): ResourceLease {
    // An asynchronous native writer cannot share its parent's permission to
    // mutate the same path while it is still writing there.
    const owner = input.resourceOnly ? input.owner : context.getStore() ?? input.owner
    const resources = [...new Set(input.resources)].sort()
    if (!owner || owner.length > 1024 || resources.length > 128 || resources.some(id => !id || id.length > 4096))
      throw new TypeError('Invalid resource lease identity or budget')
    if (input.resourceOnly)
      assertResourceOnlyFilesystemScopes(resources)
    if (input.coordinationOnly && (input.resourceOnly || input.effectId || resources.length !== 1 || resources[0] !== 'host:execution'))
      throw new Error('Step coordination cannot claim an operation resource')
    // Expiry prohibits dispatch, but never proves that the old writer stopped.
    const conflicts = [...leases.values()].find(lease => (lease.owner !== owner || lease.uncertain || lease.expiresAt <= now()) && executionResourcesOverlap(lease.resources, resources, { leftResourceOnly: lease.resourceOnly, rightResourceOnly: input.resourceOnly, leftCoordinationOnly: lease.coordinationOnly && !lease.uncertain && lease.expiresAt > now(), rightCoordinationOnly: input.coordinationOnly }))
    if (conflicts) {
      const resourceConflict = Object.freeze({ owner: conflicts.owner, effectId: conflicts.effectId ?? null, uncertain: conflicts.uncertain, expired: conflicts.expiresAt <= now(), resourceKinds: Object.freeze([...new Set(conflicts.resources.map(key => key.split(':')[0]))]) })
      throw Object.assign(new Error(conflicts.uncertain ? 'Resource awaits effect reconciliation' : 'Resource is owned by another executor'), { code: 'EXECUTION_RESOURCE_BUSY', resourceConflict })
    }
    const lease = { id: randomUUID(), owner, resources, epoch, fencingToken: ++sequence, expiresAt: now() + Math.min(300_000, Math.max(1, input.ttlMs ?? 60_000)), uncertain: false, ...(input.effectId ? { effectId: input.effectId, effectCardId: input.effectCardId } : {}), ...(input.resourceOnly ? { resourceOnly: true as const } : {}), ...(input.coordinationOnly ? { coordinationOnly: true as const } : {}) }
    leases.set(lease.id, lease)
    return { ...lease, resources: [...lease.resources] }
  }
  /** A copied token cannot change the issued scope, role or effect owner. */
  function ownedLease(lease: ResourceLease) {
    const current = leases.get(lease.id)
    if (!current || current.epoch !== lease.epoch || current.fencingToken !== lease.fencingToken || current.owner !== lease.owner
      || current.effectId !== lease.effectId || current.effectCardId !== lease.effectCardId
      || current.resourceOnly !== lease.resourceOnly || current.coordinationOnly !== lease.coordinationOnly
      || current.resources.length !== lease.resources.length || current.resources.some((resource, index) => resource !== lease.resources[index])) {
      throw Object.assign(new Error('Execution resource lease is stale or its binding changed'), { code: 'EXECUTION_LEASE_STALE' })
    }
    return current
  }
  function assert(lease: ResourceLease) {
    const current = ownedLease(lease)
    if (current.uncertain || current.expiresAt <= now())
      throw Object.assign(new Error('Execution resource lease is stale or held for reconciliation'), { code: 'EXECUTION_LEASE_STALE' })
  }
  function renew(lease: ResourceLease, ttlMs = 60_000) {
    assert(lease)
    const current = leases.get(lease.id)!
    current.expiresAt = now() + Math.min(300_000, Math.max(1, ttlMs))
    lease.expiresAt = current.expiresAt
  }
  function settle(lease: ResourceLease, input: { stopped: boolean, uncertain: boolean }) {
    const current = ownedLease(lease)
    if (input.stopped && !input.uncertain) {
      leases.delete(lease.id)
    }
    else { current.uncertain = true }
    for (const listener of [...changed]) listener()
  }
  /** Hold the resource while inspecting a stopped writer's exact effect. */
  function beginResolution(effectId: string, resources: string[], effectCardId: string | undefined, hostTakeover: boolean) {
    const overlaps = (lease: ResourceLease) => executionResourcesOverlap(lease.resources, resources, { leftResourceOnly: lease.resourceOnly })
    const matchesEffect = (lease: ResourceLease) => lease.effectId === effectId && lease.effectCardId === effectCardId
    const held = [...leases.values()].filter(lease => matchesEffect(lease) || overlaps(lease))
    const effectOwners = new Set(held.filter(matchesEffect).map(lease => lease.owner))
    const aggregate = (lease: ResourceLease) => !lease.effectId && lease.resources.length === 1 && lease.resources[0] === 'host:execution' && effectOwners.has(lease.owner)
    if (held.some(lease => !lease.uncertain || !hostTakeover && !matchesEffect(lease) && !aggregate(lease)))
      throw Object.assign(new Error('Reconciliation cannot displace a live or unrelated resource owner'), { code: 'EXECUTION_RESOURCE_BUSY' })
    const lease = { id: randomUUID(), owner: `reconcile:${effectCardId ?? ''}:${effectId}`, effectId, effectCardId, resources: [...new Set(resources)].sort(), epoch, fencingToken: ++sequence, expiresAt: now() + 60_000, uncertain: false }
    leases.set(lease.id, lease)
    let finished = false
    return {
      assert: () => {
        if (finished)
          throw new Error('Reconciliation lease already ended'); assert(lease)
      },
      finish: (resolved: boolean) => {
        if (finished)
          return
        // Release the quarantine only after the life writer committed the proof.
        if (resolved)
          assert(lease)
        finished = true
        leases.delete(lease.id)
        if (resolved) {
          for (const previous of held) {
            const current = leases.get(previous.id)
            if (current?.uncertain && matchesEffect(current) && current.fencingToken === previous.fencingToken)
              leases.delete(previous.id)
          }
          // A cancelled task can also hold a global execution lease. Keep it
          // until every effect owned by that task has actually been reconciled.
          for (const previous of held.filter(aggregate)) {
            // Parent coordination and its delegated executor can each retain a
            // stopped aggregate. They must not indefinitely quarantine each
            // other after the final owned effect is resolved.
            if (![...leases.values()].some(item => item.owner === previous.owner && (!item.uncertain || !aggregate(item)))) {
              const current = leases.get(previous.id)
              if (current?.uncertain && current.fencingToken === previous.fencingToken)
                leases.delete(previous.id)
            }
          }
        }
        for (const listener of [...changed]) listener()
      },
    }
  }
  const beginReconciliation = (effectId: string, resources: string[], effectCardId?: string) => beginResolution(effectId, resources, effectCardId, false)
  // A host may acknowledge an unknowable outcome without erasing another
  // uncertain operation. Live owners and the bootstrap guard remain fenced.
  const beginHostTakeover = (effectId: string, resources: string[], effectCardId: string) => beginResolution(effectId, resources, effectCardId, true)
  /** Reconstruct a quarantine, never an executable lease or an old boot token. */
  function restoreQuarantine(input: { cardId: string, effectId: string, resources: string[], resourceOnly?: true }) {
    if (!input.cardId || !input.effectId || !input.resources.length || input.resources.length > 128 || input.resources.some(id => !id || id.length > 4096))
      throw new TypeError('Invalid restored execution quarantine')
    const resources = [...new Set(input.resources)].sort()
    if (input.resourceOnly)
      assertResourceOnlyFilesystemScopes(resources)
    const previous = [...leases.values()].find(lease => lease.effectCardId === input.cardId && lease.effectId === input.effectId)
    if (previous) {
      if (!previous.uncertain || previous.resourceOnly !== input.resourceOnly || JSON.stringify(previous.resources) !== JSON.stringify(resources))
        throw new Error('Restored execution effect conflicts with an existing owner')
      return
    }
    const id = randomUUID()
    leases.set(id, { id, owner: `restart:${input.cardId}:${input.effectId}`, resources, effectId: input.effectId, effectCardId: input.cardId, epoch, fencingToken: ++sequence, expiresAt: now(), uncertain: true, ...(input.resourceOnly ? { resourceOnly: true as const } : {}) })
  }
  async function acquireWhenFree(input: { owner: string, resources: string[], ttlMs?: number, coordinationOnly?: true }, signal: AbortSignal) {
    const deadline = now() + 600_000
    while (true) {
      signal.throwIfAborted()
      try { return acquire(input) }
      catch (error) {
        if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EXECUTION_RESOURCE_BUSY')
          throw error
      }
      if (changed.size >= 64)
        throw new Error('Execution resource wait queue is full')
      await new Promise<void>((resolve, reject) => {
        const remaining = deadline - now()
        const clean = () => { clearTimeout(timer); changed.delete(release); signal.removeEventListener('abort', abort) }
        const release = () => { clean(); resolve() }
        const abort = () => { clean(); reject(signal.reason) }
        const timer = setTimeout(() => { clean(); reject(new Error('Execution resource wait exceeded its budget')) }, Math.max(1, remaining))
        timer.unref?.()
        changed.add(release)
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted)
          abort()
      })
    }
  }
  return { acquire, acquireWhenFree, assert, settle, renew, beginReconciliation, beginHostTakeover, restoreQuarantine, epoch, withOwner: <T>(owner: string, task: () => Promise<T>) => context.run(owner, task), snapshot: () => [...leases.values()].map(item => ({ ...item, resources: [...item.resources] })) }
}

export type ExecutionResourceBroker = ReturnType<typeof createExecutionResourceBroker>
