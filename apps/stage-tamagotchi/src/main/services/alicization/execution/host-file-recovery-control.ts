import type { FileRecoveryResult } from '../../../../shared/file-recovery-contracts'
import type { LifeCommitInput, LifeEffect, LifeMutation } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'
import type { FileRecoveryNativeProcess } from './file-recovery-native-contracts'
import type { createFileVersionRepository } from './file-version-repository'
import type { ExecutionResourceBroker } from './resource-broker'

import { createHash, randomUUID } from 'node:crypto'

import * as v from 'valibot'

import { inspectFilesystemWritePrecondition } from '../../airi/mcp-servers/local-filesystem'
import { executionDigest } from './acceptance-compiler'
import { compensateExecutionFile } from './compensation'
import { fileRecoveryNativeProcessSchema } from './file-recovery-native-contracts'
import { isMainFilesystemMutation } from './filesystem-mutation-input'
import { executionFileResources } from './resource-broker'
import { recordedExecutionResources } from './uncertain-resource-fence'

type Versions = ReturnType<typeof createFileVersionRepository>
const pending = (effect: LifeEffect) => ['prepared', 'claimed', 'dispatched', 'uncertain'].includes(effect.status)
const recoveryEffect = (effect: LifeEffect | null) => effect?.kind === 'execute' && effect.payload.capabilityId === 'host.filesystem_restore_version'

/** Trusted local host actions reuse the existing effect writer and recovery fence. */
export function createHostFileRecoveryControl(options: {
  database: () => AlicizationDbService
  versions: (database: AlicizationDbService) => Versions
  broker: ExecutionResourceBroker
  otherWritersStopped: () => boolean
  inspectNativeProcess: (process: FileRecoveryNativeProcess) => Promise<'running' | 'stopped' | 'unknown'>
  stopNativeProcess: (process: FileRecoveryNativeProcess) => Promise<'stopped' | 'unknown'>
  now?: () => number
}) {
  const now = options.now ?? Date.now
  const confirmations = new Map<number, { token: string, expiresAt: number, cardId: string, versionId: string, binding: string, purpose: 'restore' | 'forget' }>()
  const active = new Map<string, { cardId: string, controller: AbortController, promise: Promise<unknown> }>()
  const writes = new Map<string, Set<Promise<unknown>>>()
  const operations = new Set<Promise<unknown>>()
  let interruption = 0
  let closed = false
  function journal(database: AlicizationDbService, effectId: string, input: LifeCommitInput) {
    const promise = database.commitLifeState(input)
    let pending = writes.get(effectId)
    if (!pending) {
      pending = new Set()
      writes.set(effectId, pending)
    }
    const owned = pending
    owned.add(promise)
    void promise.finally(() => {
      owned.delete(promise)
      if (!owned.size)
        writes.delete(effectId)
    }).catch(() => {})
    return promise
  }
  async function drain(effectId: string) {
    while (writes.get(effectId)?.size)
      await Promise.allSettled(writes.get(effectId)!)
  }
  async function history(database: AlicizationDbService, cardId: string, versionId: string) {
    const source = `file-recovery-request:${versionId}`
    const page = await database.readLifeIngressPage({ source, limit: 64 })
    if (page.cardId !== cardId || page.next)
      throw new Error('File recovery history exceeded its card or attempt budget')
    const effects: LifeEffect[] = []
    for (const entry of page.entries) {
      const request = entry.payload
      const effect = typeof request.effectId === 'string' ? await database.getLifeEffect(request.effectId) : null
      if (entry.status !== 'settled' || request.versionId !== versionId || entry.sourceKey !== request.recoveryId || !recoveryEffect(effect) || effect!.id !== `file-restore:${request.recoveryId}` || effect!.payload.requestId !== entry.id || executionDigest(effect!.payload) !== request.effectHash)
        throw new Error('File recovery history crossed its immutable operation')
      effects.push(effect!)
    }
    return effects
  }
  async function snapshot(cardId: string, versionId: string, purpose: 'restore' | 'forget' = 'restore') {
    const database = options.database()
    const versions = options.versions(database)
    const record = await versions.read(versionId, cardId)
    const original = await database.getLifeEffect(record.before.effectId)
    const run = original?.turnId ? await database.getLifeIngress(original.turnId.startsWith('task-run:') ? original.turnId : `user:${original.turnId}`) : null
    const planId = run?.source === 'work-plan-scheduler' && typeof run.payload.planId === 'string' ? run.payload.planId : undefined
    const view = await database.readLifeState(planId ? { executionPlanId: planId } : undefined)
    if (view.cardId !== cardId)
      throw new Error('File recovery crossed its current card')
    const goals = view.obligations.filter(goal => ['accepted', 'waiting', 'in-progress', 'verifying', 'blocked'].includes(goal.status) && (goal.id === run?.payload.rootObligationId || original?.turnId && (goal.threadId === original.turnId || goal.sourceTurnId === original.turnId)))
    if (goals.length > 32)
      throw new Error('File recovery has too many related responsibilities')
    const attempts = await history(database, cardId, versionId)
    const current = await inspectFilesystemWritePrecondition(record.before.path).catch(() => null)
    const matches = Boolean(record.after && current?.exists && current.canonicalPath === record.before.path && current.device === record.after.device && current.inode === record.after.inode && current.contentHash === record.after.sha256)
    const reason = (() => {
      if (record.forgotten && (purpose === 'restore' || record.cleanupCompleted))
        return 'forgotten'
      if (original?.kind !== 'execute' || !isMainFilesystemMutation(original.payload.capabilityId) || original.turnId !== record.before.turnId || !(purpose === 'forget' ? ['settled', 'failed', 'cancelled'] : ['settled']).includes(original.status))
        return 'source-unsettled'
      if (attempts.some(pending))
        return 'unresolved-restore'
      if (!options.otherWritersStopped() || active.size > 0)
        return 'busy'
      if (purpose === 'forget')
        return 'ready'
      if (!record.after)
        return 'no-observed-version'
      if (attempts.some(effect => effect.status === 'settled' && effect.receipt?.outcome === 'success'))
        return 'already-restored'
      if (attempts.length >= 64)
        return 'attempt-budget'
      return matches ? 'ready' : 'file-changed'
    })()
    const versionBinding = executionDigest({ cardId, versionId, before: record.before, beforeHash: record.beforeHash, after: record.after, original, forgotten: record.forgotten, cleanupCompleted: record.cleanupCompleted })
    const binding = executionDigest({ versionBinding, current, attempts, goals: goals.map(goal => ({ id: goal.id, generation: goal.generation, revision: goal.revision, status: goal.status })) })
    return { database, versions, record, original, goals, current, attempts, view, reason, versionBinding, binding }
  }
  async function list(cardId: string, afterId?: string) {
    const database = options.database()
    const page = await options.versions(database).list(cardId, afterId)
    const entries = []
    for (const entry of page.entries) {
      const attempts = await history(database, cardId, entry.id)
      entries.push({ ...entry, state: ['forgotten', 'forget-pending'].includes(entry.state) ? entry.state : attempts.some(pending) ? 'restore-unknown' : attempts.some(effect => effect.status === 'settled' && effect.receipt?.outcome === 'success') ? 'restored' : entry.state, recoveryEffectIds: attempts.filter(pending).map(effect => effect.id) })
    }
    return { entries, next: page.next }
  }
  async function preview(cardId: string, versionId: string, surfaceId: number, purpose: 'restore' | 'forget' = 'restore') {
    if (closed)
      throw new Error('File recovery is shutting down')
    for (const [id, current] of confirmations) {
      if (current.expiresAt <= now())
        confirmations.delete(id)
    }
    confirmations.delete(surfaceId)
    const current = await snapshot(cardId, versionId, purpose)
    const details = { purpose, path: current.record.before.path, mode: current.record.before.existed ? 'restore-original' as const : 'remove-created' as const, originalBytes: current.record.before.bytes, originalHash: current.record.before.sha256, writtenHash: current.record.after?.sha256 ?? null, goals: current.goals.map(goal => goal.summary), recoveryEffectIds: current.attempts.filter(pending).map(effect => effect.id) }
    if (current.reason !== 'ready')
      return { ...details, state: current.reason, token: null, expiresAt: null }
    // Verify decryption before offering a destructive confirmation. Bytes stay
    // in the main process and are read again under the actual confirmation.
    if (purpose === 'restore')
      await current.versions.original(versionId, cardId)
    if (confirmations.size >= 64)
      throw new Error('Too many file recovery confirmations are open')
    const token = randomUUID()
    const expiresAt = now() + 120_000
    confirmations.set(surfaceId, { token, expiresAt, cardId, versionId, binding: current.binding, purpose })
    return { ...details, state: 'ready', token, expiresAt }
  }
  async function restoreInner(cardId: string, versionId: string, token: string, surfaceId: number, admittedInterruption: number): Promise<Omit<Extract<FileRecoveryResult, { kind: 'restore' }>, 'kind'>> {
    const confirmation = confirmations.get(surfaceId)
    confirmations.delete(surfaceId)
    if (closed || !confirmation || confirmation.purpose !== 'restore' || confirmation.token !== token || confirmation.cardId !== cardId || confirmation.versionId !== versionId || confirmation.expiresAt <= now())
      throw new Error('File recovery confirmation expired or changed')
    const initial = await snapshot(cardId, versionId)
    if (initial.reason !== 'ready' || initial.binding !== confirmation.binding)
      throw new Error('File recovery target or responsibility changed; preview it again')
    const original = await initial.versions.original(versionId, cardId)
    const recoveryId = randomUUID()
    const effectId = `file-restore:${recoveryId}`
    const requestId = `file-recovery-request:${recoveryId}`
    const resources = await executionFileResources(original.before.path)
    const payload = { capabilityId: 'host.filesystem_restore_version', requestId, hostOnly: true, parameters: { path: original.before.path, versionId, originalEffectId: original.before.effectId, beforeHash: original.before.sha256, afterHash: original.after!.sha256, mode: original.before.existed ? 'restore-original' : 'remove-created' }, resourceSnapshot: { version: 1, keys: resources }, effectContract: { version: 'life-capability-effects-v1', sideEffect: 'mutation', retryClass: 'manual-only', verifier: 'independent-goal-proof', compensation: 'manual-review' } }
    const admittedAt = now()
    const admission: LifeCommitInput = { cardId, operationKey: requestId, expectedRevision: initial.view.revision, changes: [], mutations: [
      { type: 'ingress-accept', ingress: { id: requestId, kind: 'system', source: `file-recovery-request:${versionId}`, sourceKey: recoveryId, occurredAt: admittedAt, payload: { cardId, versionId, recoveryId, effectId, effectHash: executionDigest(payload), surfaceId, at: admittedAt } } },
      { type: 'ingress-settle', id: requestId, status: 'settled' },
      { type: 'effect-prepare', effect: { id: effectId, operationKey: effectId, kind: 'execute', turnId: null, actionId: requestId, generation: 0, payload } },
      { type: 'effect-transition', id: effectId, expected: 'prepared', status: 'claimed', leaseUntil: admittedAt + 60_000 },
      { type: 'effect-transition', id: effectId, expected: 'claimed', status: 'dispatched', leaseUntil: admittedAt + 60_000 },
    ] }
    for (let attempt = 0; ; attempt++) {
      if (closed || admittedInterruption !== interruption || confirmation.expiresAt <= now())
        throw new Error('File recovery confirmation expired during admission')
      try {
        await journal(initial.database, effectId, admission)
        break
      }
      catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'LIFE_STATE_CONFLICT' || attempt >= 3)
          throw error
        const fresh = await snapshot(cardId, versionId)
        if (fresh.reason !== 'ready' || fresh.binding !== confirmation.binding)
          throw new Error('File recovery confirmation changed during admission')
        admission.expectedRevision = fresh.view.revision
      }
    }
    const controller = new AbortController()
    if (closed || admittedInterruption !== interruption)
      controller.abort(new Error('File recovery interrupted during admission'))
    const database = initial.database
    const stillOwned = async () => {
      if (closed || options.database() !== database || !options.otherWritersStopped())
        return false
      const current = await snapshot(cardId, versionId)
      const effect = await database.getLifeEffect(effectId)
      return current.versionBinding === initial.versionBinding && effect?.status === 'dispatched' && executionDigest(effect.payload) === executionDigest(payload)
    }
    const promise = (async () => {
      try {
        const result = await compensateExecutionFile({ cardId, effectId: original.before.effectId, recoveryId, path: original.before.path, device: original.after!.device!, inode: original.after!.inode!, writtenHash: original.after!.sha256, backupHash: original.before.sha256, backupBytes: original.bytes ?? new Uint8Array(), ...(!original.before.existed ? { removeCreated: true as const } : {}) }, { broker: options.broker, signal: controller.signal, effectOwnsVersion: stillOwned, audit: async (event) => {
          const stage = String(event.stage)
          const id = stage === 'native-started' ? `file-recovery-process:${recoveryId}` : `file-recovery-audit:${recoveryId}:${stage}`
          const mutations: LifeMutation[] = [{ type: 'ingress-accept', ingress: { id, kind: 'tool-result', source: 'file-recovery-audit', sourceKey: `${recoveryId}:${stage}`, occurredAt: now(), payload: { ...event, recoveryEffectId: effectId, versionId } } }, { type: 'ingress-settle', id, status: 'settled' }]
          if (stage === 'prepared') {
            const current = await snapshot(cardId, versionId)
            const goals = current.goals.map(goal => ({ id: goal.id, generation: goal.generation, revision: goal.revision, status: goal.status }))
            const expected = initial.goals.map(goal => ({ id: goal.id, generation: goal.generation, revision: goal.revision, status: goal.status }))
            if (current.versionBinding !== initial.versionBinding || executionDigest(goals) !== executionDigest(expected))
              throw new Error('Related work changed before restoration could stop it')
            mutations.push(...current.goals.map(goal => ({ type: 'obligation-update' as const, id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'cancelled' as const })))
          }
          if (stage === 'observed') {
            const result = event.result as Record<string, unknown>
            const status = result.effectMayHaveOccurred === true ? 'uncertain' : result.ok === true ? 'settled' : 'failed'
            mutations.push({ type: 'effect-transition', id: effectId, expected: 'dispatched', status, receipt: { outcome: status === 'settled' ? 'success' : status === 'uncertain' ? 'unknown' : 'failure', observedAt: now(), output: { ...result, versionId, originalEffectId: original.before.effectId, proofScope: 'file-version-only-no-original-goal-completion' } } })
          }
          await journal(database, effectId, { cardId, operationKey: id, changes: [], mutations })
        } })
        return { state: result.ok === true ? 'restored' as const : result.effectMayHaveOccurred === true ? 'unknown' as const : 'not-restored' as const, effectId }
      }
      catch (error) {
        const held = options.broker.snapshot().some(lease => lease.effectId === effectId && lease.effectCardId === cardId && lease.uncertain)
        const effect = await database.getLifeEffect(effectId)
        if (effect?.status === 'dispatched')
          await journal(database, effectId, { cardId, operationKey: `file-recovery-interrupted:${recoveryId}`, changes: [], mutations: [{ type: 'effect-transition', id: effectId, expected: 'dispatched', status: held ? 'uncertain' : 'failed', receipt: { outcome: held ? 'unknown' : 'failure', observedAt: now(), output: { ok: false, effectMayHaveOccurred: held, proofScope: 'no-restoration-or-goal-success' } } }] })
        throw error
      }
      finally {
        await drain(effectId)
        active.delete(effectId)
      }
    })()
    active.set(effectId, { cardId, controller, promise })
    return promise
  }
  function restore(cardId: string, versionId: string, token: string, surfaceId: number) {
    // Track admission/decryption too: shutdown cannot close the card database
    // between a journal commit and registration of the native worker owner.
    const promise = restoreInner(cardId, versionId, token, surfaceId, interruption)
    operations.add(promise)
    void promise.finally(() => operations.delete(promise)).catch(() => {})
    return promise
  }
  function forget(cardId: string, versionId: string, token: string, surfaceId: number) {
    const confirmation = confirmations.get(surfaceId)
    confirmations.delete(surfaceId)
    const epoch = interruption
    const promise = (async () => {
      if (closed || !confirmation || confirmation.purpose !== 'forget' || confirmation.token !== token || confirmation.cardId !== cardId || confirmation.versionId !== versionId || confirmation.expiresAt <= now())
        throw new Error('File version cleanup confirmation expired or changed')
      const initial = await snapshot(cardId, versionId, 'forget')
      if (initial.reason !== 'ready' || initial.binding !== confirmation.binding)
        throw new Error('File version cleanup changed; preview it again')
      const resources = initial.original && recordedExecutionResources(initial.original)
      if (!resources?.length)
        throw new Error('File version cleanup has no recorded original resource')
      const owner = `file-version-cleanup:${randomUUID()}`
      return options.broker.withOwner(owner, async () => {
        const lease = options.broker.acquire({ owner, resources })
        const assertCurrent = () => {
          if (closed || epoch !== interruption || now() >= confirmation.expiresAt || options.database() !== initial.database || !options.otherWritersStopped())
            throw new Error('File version cleanup lost its stopped owner')
          options.broker.assert(lease)
        }
        try {
          assertCurrent()
          const fresh = await snapshot(cardId, versionId, 'forget')
          if (fresh.binding !== confirmation.binding || fresh.reason !== 'ready')
            throw new Error('File version cleanup changed under its resource lease')
          return await initial.versions.forget(versionId, cardId, initial.record.beforeHash, assertCurrent)
        }
        finally {
          // Only the confirmed ciphertext is touched; no business-file writer
          // is launched. A partial cleanup stays withdrawn and can be retried.
          options.broker.settle(lease, { stopped: true, uncertain: false })
        }
      })
    })()
    operations.add(promise)
    void promise.finally(() => operations.delete(promise)).catch(() => {})
    return promise
  }
  async function nativeProcess(cardId: string, effectId: string) {
    const database = options.database()
    if ((await database.readLifeState()).cardId !== cardId)
      throw new Error('Native restoration crossed its current card')
    const effect = await database.getLifeEffect(effectId)
    if (!recoveryEffect(effect) || !effectId.startsWith('file-restore:'))
      throw new Error('This operation is not a host file restoration')
    const entry = await database.getLifeIngress(`file-recovery-process:${effectId.slice('file-restore:'.length)}`)
    if (!entry)
      return null
    const value = entry.payload
    if (entry.status !== 'settled' || entry.source !== 'file-recovery-audit' || entry.sourceKey !== `${effectId.slice('file-restore:'.length)}:native-started` || entry.payloadHash !== createHash('sha256').update(JSON.stringify(value)).digest('hex') || value.recoveryId !== effectId.slice('file-restore:'.length) || value.cardId !== cardId || value.versionId !== (effect!.payload.parameters as Record<string, unknown>)?.versionId || value.effectId !== (effect!.payload.parameters as Record<string, unknown>)?.originalEffectId || value.recoveryEffectId !== effectId || value.stage !== 'native-started')
      throw new Error('Native restoration process identity changed')
    return v.parse(fileRecoveryNativeProcessSchema, value)
  }
  async function nativeStopped(cardId: string, effectId: string) {
    const running = active.get(effectId)
    if (running) {
      if (running.cardId !== cardId)
        throw new Error('Native restoration crossed its active card')
      return false
    }
    const process = await nativeProcess(cardId, effectId)
    if (writes.size)
      return false
    // This permits only the existing explicit host stop attestation. Absence
    // of a startup record never certifies a file outcome or a completed goal.
    return !process || await options.inspectNativeProcess(process) === 'stopped'
  }
  async function stop(cardId: string, effectId: string): Promise<Omit<Extract<FileRecoveryResult, { kind: 'stop' }>, 'kind'>> {
    const running = active.get(effectId)
    if (running) {
      if (running.cardId !== cardId)
        throw new Error('File recovery cancellation crossed its card')
      running.controller.abort(new Error('Host stopped file restoration'))
      return { state: 'stopping' }
    }
    const process = await nativeProcess(cardId, effectId)
    return { state: process ? await options.stopNativeProcess(process) : 'unknown' }
  }
  async function interrupt() {
    interruption++
    confirmations.clear()
    for (const item of active.values())
      item.controller.abort(new Error('File recovery runtime is closing'))
    while (active.size || writes.size || operations.size)
      await Promise.allSettled([...operations, ...[...active.values()].map(item => item.promise), ...[...writes.values()].flatMap(items => [...items])])
  }
  async function dispose() { closed = true; await interrupt() }
  return { list, preview, restore, forget, stop, nativeStopped, interrupt, dispose, isActive: () => operations.size > 0 || active.size > 0 || writes.size > 0 }
}
