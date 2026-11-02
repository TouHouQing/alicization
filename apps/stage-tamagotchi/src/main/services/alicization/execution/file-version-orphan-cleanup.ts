import type { AlicizationDbService } from '../db'
import type { createFileRecoveryVault } from './file-recovery-vault'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { fileVersionBeforeSchema } from './file-version-repository'
import { isMainFilesystemMutation } from './filesystem-mutation-input'

const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const snapshotSchema = v.strictObject({ id: hash, bytes: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(3 * 1024 * 1024)), sha256: hash, identity: v.pipe(v.string(), v.regex(/^\d+:\d+$/u)), modifiedNs: v.pipe(v.string(), v.regex(/^\d+$/u)) })
const scope = 'unreferenced-ciphertext-only-no-business-file-or-task-outcome'
type Snapshot = v.InferOutput<typeof snapshotSchema>
const rawDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

/** Orphans have no version journal AND no still-pending original writer. */
export async function collectFileVersionOrphans(options: {
  database: AlicizationDbService
  vault: ReturnType<typeof createFileRecoveryVault>
  assertCurrent: () => void
  now?: () => number
}) {
  const { database, vault, assertCurrent } = options
  const now = options.now ?? Date.now
  assertCurrent()
  const cardId = (await database.readLifeState()).cardId
  const inventory = await vault.list()
  const candidates = inventory.blobs.filter(item => item.modifiedAt <= now() - 86400000)
  const resumable: Snapshot[] = []
  let cursor: string | undefined
  let audits = 0
  do {
    assertCurrent()
    const page = await database.readLifeIngressPage({ source: 'file-version-orphan-cleanup', afterId: cursor, limit: 64 })
    if (page.cardId !== cardId || (audits += page.entries.length) > 131072)
      throw new Error('File recovery orphan audit exceeded its card or history budget')
    for (const entry of page.entries) {
      const snapshot = v.parse(snapshotSchema, entry.payload.snapshot)
      const prefix = `file-version-orphan:${executionDigest({ cardId, snapshot })}`
      if (entry.kind !== 'system' || entry.payload.cardId !== cardId || entry.payload.scope !== scope || entry.payloadHash !== rawDigest(entry.payload) || entry.sourceKey !== entry.id || entry.id !== `${prefix}:${entry.payload.stage}` || !['prepared', 'observed'].includes(String(entry.payload.stage)))
        throw new Error('File recovery orphan audit crossed its immutable snapshot')
      if (entry.payload.stage === 'prepared' && entry.status === 'held') {
        if (resumable.length >= 4096)
          throw new Error('File recovery orphan pending cleanup budget exceeded')
        resumable.push(snapshot)
      }
      else if (entry.status !== 'settled') {
        throw new Error('File recovery orphan audit has an invalid lifecycle')
      }
    }
    if (page.next && (!page.entries.length || page.next === cursor))
      throw new Error('File recovery orphan audit repeated its cursor')
    cursor = page.next ?? undefined
  } while (cursor)
  if (!candidates.length && !resumable.length)
    return { inspected: 0, removed: 0 }
  const referenced = new Set<string>()
  let afterId: string | undefined
  let scanned = 0
  do {
    assertCurrent()
    const page = await database.readLifeIngressPage({ source: 'file-version-before', afterId, limit: 64 })
    if (page.cardId !== cardId || (scanned += page.entries.length) > 131072)
      throw new Error('File recovery orphan scan exceeded its card or history budget')
    for (const entry of page.entries) {
      const before = v.parse(fileVersionBeforeSchema, entry.payload)
      if (entry.status !== 'settled' || entry.id !== `file-version-before:${before.id}` || entry.sourceKey !== before.id || before.cardId !== cardId || entry.payloadHash !== rawDigest(entry.payload) || before.existed !== Boolean(before.blob && before.device && before.inode) || before.blob && (before.blob.id !== before.id || before.blob.sha256 !== before.sha256 || before.blob.bytes !== before.bytes))
        throw new Error('File recovery orphan scan found an invalid version journal')
      referenced.add(before.id)
    }
    if (page.next && (!page.entries.length || page.next === afterId))
      throw new Error('File recovery orphan scan repeated its history cursor')
    afterId = page.next ?? undefined
  } while (afterId)
  const pendingIds = async () => new Set((await database.readPendingLifeExecutionEffects()).filter(effect => isMainFilesystemMutation(effect.payload.capabilityId)).map(effect => executionDigest({ cardId, effectId: effect.id })))
  const pending = await pendingIds()
  let removed = 0
  // Apply the deletion budget after excluding protected objects; old live
  // versions and pending captures must not starve later unreferenced blobs.
  const work = [...resumable.map(snapshot => ({ id: snapshot.id, snapshot })), ...candidates.filter(item => !resumable.some(snapshot => snapshot.id === item.id)).map(item => ({ id: item.id, snapshot: null as Snapshot | null }))].filter(item => !referenced.has(item.id) && !pending.has(item.id)).slice(0, 16)
  for (const candidate of work) {
    assertCurrent()
    if (referenced.has(candidate.id) || pending.has(candidate.id))
      continue
    const snapshot = candidate.snapshot ?? await vault.inspectOrphan(candidate.id, now() - 86400000)
    if (!snapshot)
      continue
    const id = `file-version-orphan:${executionDigest({ cardId, snapshot })}`
    const payload = { cardId, snapshot, scope }
    const write = async (stage: 'prepared' | 'observed') => {
      const entryId = `${id}:${stage}`
      const existing = await database.getLifeIngress(entryId)
      if (existing) {
        if (existing.source !== 'file-version-orphan-cleanup' || existing.sourceKey !== entryId || existing.payloadHash !== rawDigest(existing.payload) || executionDigest(existing.payload) !== executionDigest({ ...payload, stage }) || existing.status !== (stage === 'prepared' ? 'held' : 'settled'))
          throw new Error('File recovery orphan cleanup changed before retry')
        return
      }
      await database.commitLifeState({ cardId, operationKey: entryId, changes: [], mutations: [
        { type: 'ingress-accept', ingress: { id: entryId, kind: 'system', source: 'file-version-orphan-cleanup', sourceKey: entryId, occurredAt: now(), payload: { ...payload, stage } } },
        { type: 'ingress-settle', id: entryId, status: stage === 'prepared' ? 'held' : 'settled' },
        ...(stage === 'observed' ? [{ type: 'ingress-settle' as const, id: `${id}:prepared`, expectedStatus: 'held' as const, status: 'settled' as const }] : []),
      ] })
    }
    await write('prepared')
    assertCurrent()
    if ((await database.readLifeState()).cardId !== cardId || await database.getLifeIngress(`file-version-before:${candidate.id}`) || (await pendingIds()).has(candidate.id))
      throw new Error('File recovery orphan acquired a reference or writer during cleanup')
    assertCurrent()
    const result = await vault.removeOrphan(snapshot)
    await write('observed')
    removed += Number(result.removed)
  }
  return { inspected: work.length, removed }
}
