import type { LifeCommitInput, LifeCommitReceipt, LifeEffect, LifeIngress, LifeOwnerVersion, LifeSoulActivation, LifeStateView } from '../../../../shared/life-contracts'

import { createHash, randomUUID } from 'node:crypto'

// A composition-test port, not a substitute for repository integration tests.
// Domain SQL, migration, source validity and physical proof use real SQLite tests.
export function createLifeDatabaseTestPort(options: { cardId: string, values: Map<string, string>, writeMeta: (key: string, value: string, options?: { signal?: AbortSignal }) => Promise<void> }) {
  let revision = 0
  const owners = new Map<string, LifeOwnerVersion>()
  const ingress = new Map<string, LifeIngress>()
  const effects = new Map<string, LifeEffect>()
  const souls = new Map<string, LifeSoulActivation>()
  const receipts = new Map<string, { hash: string, receipt: LifeCommitReceipt }>()
  const listeners = new Set<(receipt: LifeCommitReceipt) => void>()
  const digest = (value: string) => createHash('sha256').update(value).digest('hex')
  const readLifeState = async (): Promise<LifeStateView> => ({ cardId: options.cardId, revision, owners: [...owners.values()], values: Object.fromEntries(options.values), obligations: [], ingress: [...ingress.values()].reverse(), effects: [...effects.values()], soulActivations: [...souls.values()].filter(item => ['prepared', 'file-replaced', 'conflicted'].includes(item.status)) })
  const commitLifeState = async (input: LifeCommitInput, writeOptions?: { signal?: AbortSignal }): Promise<LifeCommitReceipt> => {
    writeOptions?.signal?.throwIfAborted()
    if (input.cardId !== options.cardId)
      throw new Error('Test life port crossed card scope')
    const requestHash = digest(JSON.stringify(input))
    const duplicate = receipts.get(input.operationKey)
    if (duplicate) {
      if (duplicate.hash !== requestHash)
        throw new Error('Operation key content changed')
      return { ...duplicate.receipt, status: 'duplicate' }
    }
    for (const absent of input.expectedAbsentOwners ?? []) {
      if (owners.has(absent))
        throw new Error('Previously absent life owner became present')
    }
    for (const expected of input.expectedOwners ?? []) {
      const current = owners.get(expected.owner)
      if (current?.contentHash !== expected.contentHash || current.revision !== expected.revision)
        throw new Error('Consumed owner changed')
    }
    const before = new Map(options.values)
    const changes = [...input.changes]
    for (const mutation of input.mutations ?? []) {
      if (mutation.type === 'growth-save') {
        if ((options.values.get(mutation.key) ?? null) !== mutation.expectedValue)
          throw new Error('Growth state changed')
        changes.push({ owner: 'growth', key: mutation.key, value: mutation.snapshotJson })
      }
    }
    try {
      for (const change of changes) {
        if ('expectedValue' in change && (options.values.get(change.key) ?? null) !== change.expectedValue)
          throw new Error('Owner compare-and-set failed')
        await options.writeMeta(change.key, change.value, writeOptions)
      }
    }
    catch (error) {
      options.values.clear()
      for (const [key, value] of before)
        options.values.set(key, value)
      throw error
    }
    revision++
    const changed = changes.map(change => ({ owner: change.owner, revision, contentHash: digest(change.value), metaKey: change.key }))
    for (const owner of changed)
      owners.set(owner.owner, owner)
    for (const mutation of input.mutations ?? []) {
      if (mutation.type === 'ingress-accept') {
        const event = mutation.ingress
        ingress.set(event.id, { ...event, payloadHash: digest(JSON.stringify(event.payload)), observedAt: Date.now(), status: 'accepted' })
      }
      else if (mutation.type === 'ingress-settle') {
        const event = ingress.get(mutation.id)
        if (event)
          event.status = mutation.status
      }
      else if (mutation.type === 'effect-prepare') {
        const event = mutation.effect
        effects.set(event.id, { ...event, status: 'prepared', receipt: null, leaseUntil: null })
      }
      else if (mutation.type === 'effect-transition') {
        const event = effects.get(mutation.id)
        if (event) {
          event.status = mutation.status
          event.receipt = mutation.receipt ?? null
        }
      }
      else if (mutation.type === 'soul-prepare') {
        souls.set(mutation.intent.id, { ...mutation.intent })
      }
      else if (mutation.type === 'soul-transition') {
        const soul = souls.get(mutation.id)
        if (soul)
          soul.status = mutation.status
      }
    }
    const receipt: LifeCommitReceipt = { cardId: options.cardId, status: 'committed', commitId: randomUUID(), revision, owners: changed, committedAt: Date.now() }
    receipts.set(input.operationKey, { hash: requestHash, receipt })
    for (const listener of listeners)
      listener(receipt)
    return receipt
  }
  const getLifeUserInput = async (id: string): Promise<Record<string, unknown> | null> => {
    const event = ingress.get(id)
    const message = event?.kind === 'user-turn' ? event.payload.currentMessage : null
    return message && typeof message === 'object' && !Array.isArray(message) ? message as Record<string, unknown> : null
  }
  return { getLifeUserInput, getLifeIngress: async (id: string) => ingress.get(id) ?? null, getLifeEffect: async (id: string) => effects.get(id) ?? null, readLifeState, commitLifeState, resumeLifeEvidenceCleanup: async () => ({ resumed: 0, remaining: 0 }), onLifeCommitted: (listener: (receipt: LifeCommitReceipt) => void) => { listeners.add(listener); return () => listeners.delete(listener) }, readLifeFactVersions: async () => [], hasPublishedLifeTurn: async () => true, listPresentedLifeTurnIds: async (_cardId: string, ids: string[]) => new Set(ids) }
}
