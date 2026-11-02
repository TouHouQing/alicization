import type { LifeIngress } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'
import type { FileMutationRecovery, FileMutationSnapshot } from './file-mutation-recovery'
import type { createFileRecoveryVault } from './file-recovery-vault'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { platform } from 'node:process'

import * as v from 'valibot'

import { withFileMutationQueue } from '../../airi/mcp-servers/file-mutation-queue'
import { executionDigest } from './acceptance-compiler'
import { isMainFilesystemMutation } from './filesystem-mutation-input'
import { executionFileResources } from './resource-broker'
import { recordedExecutionResources } from './uncertain-resource-fence'

const maximumBytes = 2 * 1024 * 1024
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const path = v.pipe(v.string(), v.minLength(1), v.maxLength(4096), v.check(isAbsolute))
const count = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(maximumBytes))
const identity = v.nullable(v.pipe(v.string(), v.regex(/^\d+$/u), v.maxLength(64)))
const instant = v.pipe(v.number(), v.integer(), v.minValue(0))
export const fileRecoveryBlobSchema = v.strictObject({ kind: v.literal('file-recovery-blob-v1'), id: hash, bytes: count, sha256: hash, cipherBytes: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(3 * 1024 * 1024)), cipherSha256: hash })
export const fileVersionBeforeSchema = v.strictObject({ kind: v.literal('file-version-before-v1'), id: hash, cardId: id, effectId: id, turnId: id, path, existed: v.boolean(), device: identity, inode: identity, bytes: count, sha256: hash, blob: v.nullable(fileRecoveryBlobSchema), at: instant })
const beforeSchema = fileVersionBeforeSchema
const afterSchema = v.strictObject({ kind: v.literal('file-version-after-v1'), id: hash, cardId: id, effectId: id, beforeHash: hash, path, device: identity, inode: identity, bytes: count, sha256: hash, at: instant })
export type FileVersionBefore = v.InferOutput<typeof beforeSchema>
export type FileVersionAfter = v.InferOutput<typeof afterSchema>
const digestBytes = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

function checkedEntry<T>(entry: LifeIngress | null, source: string, schema: v.GenericSchema<unknown, T>) {
  if (!entry)
    return null
  const parsed = v.parse(schema, entry.payload)
  if (entry.source !== source || entry.status !== 'settled' || entry.payloadHash !== createHash('sha256').update(JSON.stringify(entry.payload)).digest('hex'))
    throw new Error('File version journal has no immutable settled record')
  return parsed
}

/** The existing life writer owns version metadata; the vault owns only ciphertext. */
export function createFileVersionRepository(options: {
  database: () => AlicizationDbService
  vault: ReturnType<typeof createFileRecoveryVault>
  now?: () => number
}) {
  const now = options.now ?? Date.now
  async function current(cardId: string, effectId: string, turnId: string) {
    const db = options.database()
    if ((await db.readLifeState()).cardId !== cardId)
      throw new Error('File recovery crossed its current card')
    const effect = await db.getLifeEffect(effectId)
    if (effect?.kind !== 'execute' || effect.status !== 'dispatched' || effect.turnId !== turnId || !isMainFilesystemMutation(effect.payload.capabilityId))
      throw new Error('File recovery has no dispatched file-writing owner')
    return { db, effect }
  }
  function snapshot(raw: FileMutationSnapshot) {
    if (!isAbsolute(raw.path) || resolve(raw.path) !== raw.path || raw.bytes.byteLength > maximumBytes || raw.existed !== Boolean(raw.device && raw.inode) || (raw.existed && !/^[1-9]\d{0,19}$/u.test(raw.inode ?? '')) || (!raw.existed && raw.bytes.byteLength !== 0))
      throw new Error('File recovery snapshot has no bounded file identity')
    return { ...raw, bytes: Buffer.from(raw.bytes) }
  }
  async function read(versionId: string, cardId: string) {
    v.parse(hash, versionId)
    const db = options.database()
    if ((await db.readLifeState()).cardId !== cardId)
      throw new Error('File recovery crossed its current card')
    const entry = await db.getLifeIngress(`file-version-before:${versionId}`)
    const before = checkedEntry(entry, 'file-version-before', beforeSchema)
    if (!before || before.id !== versionId || before.cardId !== cardId || executionDigest({ cardId, effectId: before.effectId }) !== versionId || resolve(before.path) !== before.path || entry!.sourceKey !== versionId || before.existed !== Boolean(before.blob && before.device && before.inode) || (before.blob && (before.blob.id !== versionId || before.blob.sha256 !== before.sha256 || before.blob.bytes !== before.bytes)))
      throw new Error('File recovery before-image does not match its journal')
    const origin = await db.getLifeEffect(before.effectId)
    const resources = origin && recordedExecutionResources(origin)
    const pathKey = `file-path:${platform === 'win32' ? before.path.toLowerCase() : before.path}`
    if (origin?.kind !== 'execute' || origin.turnId !== before.turnId || !isMainFilesystemMutation(origin.payload.capabilityId) || !resources?.includes(pathKey) || before.existed && !resources.includes(`file-inode:${before.device}:${before.inode}`))
      throw new Error('File recovery version left its original dispatched resource')
    const afterEntry = await db.getLifeIngress(`file-version-after:${versionId}`)
    const after = checkedEntry(afterEntry, 'file-version-after', afterSchema)
    if (after && (after.id !== versionId || after.cardId !== cardId || after.effectId !== before.effectId || after.beforeHash !== entry!.payloadHash || after.path !== before.path || !after.device || !after.inode || before.existed && (after.device !== before.device || after.inode !== before.inode) || afterEntry!.sourceKey !== versionId))
      throw new Error('File recovery after-image crossed its original version')
    const beforeHash = entry!.payloadHash
    const forgotten = await db.hasWithdrawnLifeEvidence([{ cardId, kind: 'file-version', id: versionId, version: beforeHash }])
    const cleanup = await db.getLifeIngress(`file-version-forget-result:${versionId}`)
    if (cleanup && (!forgotten || cleanup.source !== 'file-version-forget-result' || cleanup.sourceKey !== versionId || cleanup.status !== 'settled' || cleanup.payloadHash !== createHash('sha256').update(JSON.stringify(cleanup.payload)).digest('hex') || cleanup.payload.versionId !== versionId || cleanup.payload.beforeHash !== beforeHash || cleanup.payload.state !== 'removed'))
      throw new Error('File recovery cleanup receipt crossed its version')
    return { before, after, beforeHash, forgotten, cleanupCompleted: Boolean(cleanup) }
  }
  function forEffect(owner: { cardId: string, effectId: string, turnId: string }): FileMutationRecovery {
    return { begin: async (raw) => {
      const original = snapshot(raw)
      const { db, effect } = await current(owner.cardId, owner.effectId, owner.turnId)
      const resources = recordedExecutionResources(effect)
      const pathResource = (await executionFileResources(original.path)).find(item => item.startsWith('file-path:'))!
      if (!resources?.includes(pathResource))
        throw new Error('File recovery snapshot left its dispatched file resource')
      const versionId = executionDigest({ cardId: owner.cardId, effectId: owner.effectId })
      const existing = await db.getLifeIngress(`file-version-before:${versionId}`)
      const stored = checkedEntry(existing, 'file-version-before', beforeSchema)
      if (stored && await db.hasWithdrawnLifeEvidence([{ cardId: owner.cardId, kind: 'file-version', id: versionId, version: existing!.payloadHash }]))
        throw new Error('A forgotten file version cannot be captured again')
      const artifact = original.existed ? await options.vault.put(versionId, original.bytes) : null
      const before = v.parse(beforeSchema, { kind: 'file-version-before-v1', id: versionId, ...owner, path: original.path, existed: original.existed, device: original.device, inode: original.inode, bytes: original.bytes.length, sha256: digestBytes(original.bytes), blob: artifact, at: stored?.at ?? now() })
      if ((stored && executionDigest(stored) !== executionDigest(before)) || await db.getLifeIngress(`file-version-after:${versionId}`))
        throw new Error('File recovery cannot recapture another version under a used action')
      await current(owner.cardId, owner.effectId, owner.turnId)
      const entryId = `file-version-before:${versionId}`
      await db.commitLifeState({ cardId: owner.cardId, operationKey: entryId, changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: entryId, kind: 'tool-result', source: 'file-version-before', sourceKey: versionId, occurredAt: before.at, payload: before } }, { type: 'ingress-settle', id: entryId, status: 'settled' }] })
      const captured = await read(versionId, owner.cardId)
      return { complete: async (rawAfter) => {
        const observed = snapshot(rawAfter)
        if (!observed.existed || observed.path !== before.path || (before.existed && (observed.device !== before.device || observed.inode !== before.inode)))
          throw new Error('File recovery result left its original file handle')
        const currentDb = options.database()
        const actual = await read(versionId, owner.cardId)
        if (actual.beforeHash !== captured.beforeHash)
          throw new Error('File recovery original journal changed before result recording')
        const resultId = `file-version-after:${versionId}`
        const after = v.parse(afterSchema, { kind: 'file-version-after-v1', id: versionId, cardId: owner.cardId, effectId: owner.effectId, beforeHash: captured.beforeHash, path: observed.path, device: observed.device, inode: observed.inode, bytes: observed.bytes.length, sha256: digestBytes(observed.bytes), at: actual.after?.at ?? now() })
        await currentDb.commitLifeState({ cardId: owner.cardId, operationKey: resultId, changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: resultId, kind: 'tool-result', source: 'file-version-after', sourceKey: versionId, occurredAt: after.at, payload: after } }, { type: 'ingress-settle', id: resultId, status: 'settled' }] })
      } }
    } }
  }
  async function original(versionId: string, cardId: string) {
    const record = await read(versionId, cardId)
    if (record.forgotten)
      throw new Error('This original file version was withdrawn')
    return { ...record, bytes: record.before.blob ? await options.vault.read(record.before.blob) : null }
  }
  async function forget(versionId: string, cardId: string, expectedBeforeHash: string, assertCurrent: () => void) {
    const database = options.database()
    return withFileMutationQueue(join(dirname(database.dbPath), '.file-version-lifecycle'), async () => {
      const record = await read(versionId, cardId)
      if (options.database() !== database || record.beforeHash !== expectedBeforeHash)
        throw new Error('File version cleanup crossed its database or confirmation')
      const effect = await database.getLifeEffect(record.before.effectId)
      if (effect?.kind !== 'execute' || effect.turnId !== record.before.turnId || !isMainFilesystemMutation(effect.payload.capabilityId) || !['settled', 'failed', 'cancelled'].includes(effect.status))
        throw new Error('Stop and resolve the original file writer before cleanup')
      if (record.cleanupCompleted)
        return { state: 'forgotten' as const }
      assertCurrent()
      // The existing forget journal also prevents an older identity backup from
      // reviving this version. Commit withdrawal before deleting any ciphertext.
      if (!record.forgotten)
        await database.commitLifeState({ cardId, operationKey: `file-version-forget:${versionId}`, changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId, kind: 'file-version', id: versionId, version: record.beforeHash }, mode: 'forget', reason: 'host-requested-original-file-version-cleanup' }] })
      if (!(await read(versionId, cardId)).forgotten || options.database() !== database)
        throw new Error('File version cleanup lost its durable withdrawal')
      assertCurrent()
      if (record.before.blob)
        await options.vault.remove(record.before.blob)
      assertCurrent()
      const id = `file-version-forget-result:${versionId}`
      await database.commitLifeState({ cardId, operationKey: id, changes: [], mutations: [
        { type: 'ingress-accept', ingress: { id, kind: 'tool-result', source: 'file-version-forget-result', sourceKey: versionId, occurredAt: now(), payload: { versionId, beforeHash: record.beforeHash, state: 'removed', scope: 'current-card-ciphertext-only-business-file-untouched' } } },
        { type: 'ingress-settle', id, status: 'settled' },
      ] })
      return { state: 'forgotten' as const }
    })
  }
  async function list(cardId: string, afterId?: string) {
    const page = await options.database().readLifeIngressPage({ source: 'file-version-before', afterId, limit: 16 })
    if (page.cardId !== cardId)
      throw new Error('File recovery list crossed its current card')
    const entries = []
    for (const entry of page.entries) {
      const before = v.parse(beforeSchema, entry.payload)
      const { before: validated, after, forgotten, cleanupCompleted } = await read(before.id, cardId)
      // Private bytes and ciphertext locations never enter the surface listing.
      entries.push({ id: validated.id, effectId: validated.effectId, path: validated.path, originalExisted: validated.existed, originalBytes: validated.bytes, resultBytes: after?.bytes ?? null, state: forgotten ? cleanupCompleted ? 'forgotten' as const : 'forget-pending' as const : after ? 'recorded' as const : 'unknown' as const, at: validated.at })
    }
    return { entries, next: page.next }
  }
  return { forEffect, read, original, forget, list }
}
