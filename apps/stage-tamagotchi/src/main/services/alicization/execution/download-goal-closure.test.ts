import type { DownloadItem } from 'electron'

import type { ExecutionCriterion } from '../../../../shared/execution-contracts'

import { createHash, randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { projectExecutionArtifacts } from '../../../../shared/execution-artifacts'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { readBrowserDownloads, recordBrowserDownload } from './browser-download-repository'
import { recordBrowserDownloadReservation } from './browser-download-reservations'
import { readBrowserDownloadQuarantines } from './browser-download-resource-recovery'
import { createBrowserDownloads } from './browser-downloads'
import { verifyExecutionDownload } from './download-goal-verifier'
import { createHostDownloadControl } from './host-download-control'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

async function fixture(review = false, holdCompleted = false, failTerminal = false, onSettled?: Parameters<typeof createWorkPlanExecutionRuntime>[0]['onSettled']) {
  const root = await mkdtemp(join(tmpdir(), 'life-download-goal-'))
  let db = await setupAlicizationDb(join(root, 'db'), { cardId: 'alice' })
  const bytes = 'downloaded report'
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const url = 'https://example.invalid/report?private=secret'
  const errors: unknown[] = []
  const broker = createExecutionResourceBroker()
  const terminalJournal = Promise.withResolvers<void>()
  let terminalHeld = false
  const manager = createBrowserDownloads({ root: join(root, 'transfers'), cardId: 'alice', resourceBroker: broker, record: async (receipt) => {
    if (failTerminal && receipt.state !== 'progressing')
      throw new Error('synthetic terminal journal failure')
    if (holdCompleted && receipt.state === 'completed') {
      terminalHeld = true
      await terminalJournal.promise
    }
    await recordBrowserDownload(db, receipt)
  }, recordReservation: (reservation, end) => recordBrowserDownloadReservation(db, reservation, { root: join(root, 'transfers') }, end), onError: error => errors.push(error) })
  await manager.prepare()
  let path = ''
  const item = Object.assign(new EventEmitter(), { getFilename: () => 'report.txt', getURL: () => url, getURLChain: () => [url], getReceivedBytes: () => Buffer.byteLength(bytes), getTotalBytes: () => Buffer.byteLength(bytes), getSavePath: () => path, setSavePath: (next: string) => { path = next }, cancel: vi.fn(() => item.emit('done', {}, 'cancelled')) })
  const click = vi.fn(async () => {
    const actionId = randomUUID()
    const handle = await manager.reserve({ id: actionId, observationId: 'actual-current-observation' }, url)
    manager.accept(item as unknown as DownloadItem, handle)
    await manager.flush()
    await mkdir(dirname(path), { recursive: true })
    return { ok: true, status: 'completed', finalStatus: 'completed', browserActionId: actionId, downloadReservationId: handle.id }
  })
  const binding = { kind: 'managed' as const, id: 'test-native-owner' }
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, captureBrowserBinding: () => binding, isBrowserBindingCurrent: current => current?.id === binding.id, broker, interrupts: createExecutionInterruptRegistry(broker), tools: { 'tool.browser_click_element': click }, onSettled, stopChildEffects: async (cardId, effectIds) => {
    expect(cardId).toBe('alice')
    return manager.cancelEffects(effectIds)
  }, onError: error => errors.push(error) })
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  await life.admit({ cardId: 'alice', turnId: 'download-request', conversationId: 'primary', messages: [{ role: 'user', content: '下载当前页面指定报告，必须是约定的字节。' }] }, new AbortController().signal)
  const predicate = { kind: 'browser-download' as const, stepId: 'activate-download', minimumBytes: 1, sha256 }
  const criteria: ExecutionCriterion[] = [{ id: 'download', required: true, proofScope: 'bytes', predicate }]
  if (review)
    criteria.push({ id: 'host-review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '下载的报告符合要求吗？', artifactIds: ['download'] } })
  const admitted = await runtime.propose({ cardId: 'alice', turnId: 'download-request', goal: '保存报告', criteria, steps: [{ id: 'activate-download', dependsOn: [], capabilityId: 'tool.browser_click_element', input: { selector: 'element:synthetic-observed-link' }, acceptanceCriterionIds: ['download'] }] })
  await vi.waitFor(() => expect(runtime.isActive()).toBe(false), { timeout: 7000 })
  const state = async () => {
    const view = await db.readLifeState({ executionPlanId: admitted.planId })
    const goal = view.obligations.find(item => item.threadId === admitted.rootThreadId)!
    return { view, goal, contract: goal.proof.acceptance! }
  }
  return { root, db: () => db, broker, runtime, manager, item, click, state, admitted, errors, bytes, predicate, terminalHeld: () => terminalHeld, releaseTerminal: () => terminalJournal.resolve(), path: () => path, complete: async () => { await writeFile(path, bytes); item.emit('done', {}, 'completed'); await manager.flush() }, reopen: async () => { await runtime.dispose(); await db.close(); db = await setupAlicizationDb(join(root, 'db'), { cardId: 'alice' }) }, close: async () => { terminalJournal.resolve(); await runtime.dispose(); await manager.stop(); await manager.flush(); await db.close(); await rm(root, { recursive: true, force: true }) } }
}

describe('native download bytes close the accepted responsibility without replaying its activation', () => {
  it('finishes native verification before a reentrant delivery callback, so another wake cannot await itself', async () => {
    let enabled = false
    let runtime: ReturnType<typeof createWorkPlanExecutionRuntime> | undefined
    let delivered = false
    const release = Promise.withResolvers<void>()
    const entered = Promise.withResolvers<void>()
    const f = await fixture(false, false, false, async () => {
      if (!enabled)
        return
      entered.resolve()
      await Promise.race([runtime!.notifyDownload('alice'), release.promise])
      delivered = true
    })
    runtime = f.runtime
    let verification: Promise<unknown> | undefined
    try {
      enabled = true
      await f.complete()
      verification = f.runtime.notifyDownload('alice')
      await entered.promise
      await vi.waitFor(() => expect(delivered).toBe(true), { timeout: 500 })
      await verification
      expect((await f.state()).goal.status).toBe('fulfilled')
      expect(f.click).toHaveBeenCalledOnce()
      expect(f.broker.snapshot()).toEqual([])
    }
    finally { release.resolve(); await verification; await f.close() }
  })
  it('lets the actual host take over a stopped child after terminal persistence failed, ending the same goal without claiming download success', async () => {
    const f = await fixture(false, false, true)
    try {
      await writeFile(f.path(), 'partial')
      await f.manager.stop()
      await f.manager.flush()
      const control = createHostDownloadControl({ database: f.db, broker: f.broker, writerStopped: (_cardId, id) => f.manager.writerStopped(id) && !f.runtime.isActive() })
      const list = await control({ cardId: 'alice', action: 'list-downloads' }, 1)
      expect(list.state).toBe('download-list')
      if (list.state !== 'download-list')
        throw new Error('Missing child resource list')
      expect(list.items).toHaveLength(1)
      const effectId = list.items[0].effectId
      const preview = await control({ cardId: 'alice', effectId, action: 'preview' }, 1)
      if (preview.state !== 'preview')
        throw new Error('Missing child resource review')
      expect(preview.goals).toEqual(['保存报告'])
      const originalGoal = (await f.state()).goal
      expect(await control({ cardId: 'alice', effectId, action: 'takeover', token: preview.token, confirmedStopped: true }, 1)).toEqual({ state: 'host-taken-over' })
      await f.runtime.notifyDownload('alice')
      expect((await f.state()).goal.status).toBe('cancelled')
      expect((await f.state()).goal.verification).toBeNull()
      expect((await f.db().getLifeIngress(`browser-download-resource-release:${effectId.replace('browser-download:', '')}`))?.payload.originalGoal).toMatchObject({ id: originalGoal.id, generation: originalGoal.generation, verification: originalGoal.verification })
      expect(f.click).toHaveBeenCalledOnce()
      expect(await readFile(f.path(), 'utf8')).toBe('partial')
      expect(await readBrowserDownloadQuarantines(f.db(), 'next-runtime')).toEqual([])
      expect((await readBrowserDownloads(f.db()))[0].state).toBe('unverified')
      expect(f.errors.length).toBeGreaterThan(0)
      expect(f.broker.snapshot()).toEqual([])
    }
    finally { await f.close() }
  })
  it('ties displayed/opened artifacts and host review to actual download bytes, rejecting a later host edit', async () => {
    const f = await fixture(true)
    try {
      const pending = await f.state()
      const plan = pending.view.execution!.plans[0]
      expect(projectExecutionArtifacts(pending.goal, plan)).toEqual([])
      await f.complete()
      await f.runtime.notifyDownload('alice')
      const ready = await f.state()
      expect(ready.goal.status).toBe('blocked')
      expect(projectExecutionArtifacts(ready.goal, plan)).toMatchObject([{ id: 'download', path: f.path(), name: 'report.txt' }])
      const target = { cardId: 'alice', obligationId: ready.goal.id, expectedGeneration: ready.goal.generation, criterionId: 'download' }
      expect(await f.runtime.downloadArtifact(target)).toBe(f.path())
      await expect(f.runtime.downloadArtifact({ ...target, cardId: 'bob' })).rejects.toThrow('no longer available')
      await expect(f.runtime.downloadArtifact({ ...target, expectedGeneration: ready.goal.generation + 1 })).rejects.toThrow('no longer available')
      const review = { cardId: 'alice', obligationId: ready.goal.id, expectedGeneration: ready.goal.generation, contractHash: ready.contract.contractHash, criterionId: 'host-review', approved: true, requestId: 'host-read-the-downloaded-report' }
      await writeFile(f.path(), 'edited after download')
      await expect(f.runtime.review(review)).rejects.toThrow('independently verified bytes')
      await expect(f.runtime.downloadArtifact(target)).rejects.toThrow('no longer matches')
      expect((await f.state()).goal.status).toBe('blocked')
      await writeFile(f.path(), f.bytes)
      expect(await f.runtime.review(review)).toEqual({ state: 'satisfied' })
      const accepted = await f.state()
      expect(accepted.goal).toMatchObject({ status: 'fulfilled', verification: { independent: false } })
      expect(f.click).toHaveBeenCalledTimes(1)
      expect(f.errors).toEqual([])
    }
    finally { await f.close() }
  })

  it('refuses crossed terminal/origin/beginning records and observes hash or byte requirements independently', async () => {
    const f = await fixture()
    try {
      await f.complete()
      const ready = await f.state()
      const verify = (database = f.db(), predicate = f.predicate) => verifyExecutionDownload({ database, ...ready, predicate })
      expect(await verify()).toMatchObject({ verdict: 'satisfied' })
      expect(await verify(f.db(), { ...f.predicate, sha256: '0'.repeat(64) })).toMatchObject({ verdict: 'not-satisfied' })
      expect(await verify(f.db(), { ...f.predicate, minimumBytes: 1000 })).toMatchObject({ verdict: 'not-satisfied' })
      for (const fault of ['terminal-owner', 'terminal-schema', 'beginning', 'origin'] as const) {
        const database = { ...f.db(), getLifeIngress: async (id: string) => {
          const actual = await f.db().getLifeIngress(id)
          if (!actual)
            return actual
          if (fault === 'terminal-owner' && id.startsWith('browser-download-result:'))
            return { ...actual, payload: { ...actual.payload, cardId: 'bob' } }
          if (fault === 'terminal-schema' && id.startsWith('browser-download-result:'))
            return { ...actual, payload: { ...actual.payload, sha256: 'not-a-hash' } }
          if (fault === 'beginning' && id.startsWith('browser-download:'))
            return { ...actual, payload: { ...actual.payload, path: join(f.root, 'unrelated-file') } }
          if (fault === 'origin' && id.startsWith('browser-download-reservation:'))
            return { ...actual, payload: { ...actual.payload, origin: { kind: 'host-interface' } } }
          return actual
        } }
        expect(await verify(database), fault).toMatchObject({ verdict: 'unknown' })
      }
      expect(await readFile(f.path(), 'utf8')).toBe(f.bytes)
      expect(f.click).toHaveBeenCalledTimes(1)
      expect(f.errors).toEqual([])
    }
    finally { await f.close() }
  })
  it('waits for native completion, reads the owned bytes, wakes verification only and remains idempotent past history pagination and restart', async () => {
    const f = await fixture()
    try {
      const pending = await f.state()
      expect(pending.goal).toMatchObject({ status: 'blocked', verification: { verdict: 'unknown' } })
      expect((pending.goal.verification!.evidence.criteria as Array<{ evidence: { reason: string } }>)[0].evidence.reason).toBe('awaiting-native-download-terminal-evidence')
      await f.runtime.notifyDownload('alice')
      expect((await f.state()).goal.status).toBe('blocked')
      await f.complete()
      const before = await stat(f.path())
      await f.runtime.notifyDownload('alice')
      const complete = await f.state()
      expect(complete.goal).toMatchObject({ status: 'fulfilled', verification: { verdict: 'satisfied', independent: true } })
      expect(JSON.stringify(complete.goal.verification)).toContain(f.path().replace(/\\/gu, '\\\\'))
      expect(JSON.stringify(complete.goal.verification)).not.toContain('private=secret')
      await f.runtime.notifyDownload('alice')
      expect(f.click).toHaveBeenCalledTimes(1)
      expect((await stat(f.path())).mtimeMs).toBe(before.mtimeMs)
      for (let index = 0; index < 110; index++) {
        const id = `noise:${index}`
        await f.db().commitLifeState({ cardId: 'alice', operationKey: id, changes: [], mutations: [{ type: 'ingress-accept', ingress: { id, source: 'test-noise', sourceKey: id, kind: 'system', occurredAt: Date.now(), payload: {} } }, { type: 'ingress-settle', id, status: 'settled' }] })
      }
      await f.reopen()
      const reopened = await f.state()
      expect(await verifyExecutionDownload({ database: f.db(), ...reopened, predicate: f.predicate })).toMatchObject({ verdict: 'satisfied' })
      await writeFile(f.path(), 'host edit')
      expect(await verifyExecutionDownload({ database: f.db(), ...reopened, predicate: f.predicate })).toMatchObject({ verdict: 'not-satisfied' })
      expect(await readFile(f.path(), 'utf8')).toBe('host edit')
      expect(f.errors).toEqual([])
    }
    finally { await f.close() }
  }, 20_000)

  it.each(['pause', 'cancel'] as const)('keeps an explicit %s authoritative after a later native completion', async (action) => {
    const f = await fixture(false, true)
    try {
      await f.runtime.wakeReady()
      const completion = f.complete()
      await vi.waitFor(() => expect(f.terminalHeld()).toBe(true))
      await f.runtime.stop({ cardId: 'alice', planId: f.admitted.planId, expectedRevision: 1, requestId: `host-${action}`, action })
      const stopped = await f.state()
      f.releaseTerminal()
      await completion
      await f.runtime.notifyDownload('alice')
      const after = await f.state()
      expect(after.goal.status).toBe(stopped.goal.status)
      expect(after.goal.revision).toBe(stopped.goal.revision)
      expect(f.click).toHaveBeenCalledTimes(1)
      expect((await readBrowserDownloads(f.db()))[0].state).toBe('completed')
      expect(f.item.cancel).not.toHaveBeenCalled()
      expect(f.errors).toEqual([])
    }
    finally { await f.close() }
  })

  it.each(['pause', 'cancel'] as const)('actually stops an unfinished download on host %s and preserves its partial observed result', async (action) => {
    const f = await fixture()
    try {
      await writeFile(f.path(), 'partial')
      f.item.getReceivedBytes = () => 7
      const result = await f.runtime.stop({ cardId: 'alice', planId: f.admitted.planId, expectedRevision: 1, requestId: `stop-native-${action}`, action })
      expect(result).toMatchObject({ state: 'stopped', childResources: { requested: 1, stopped: true } })
      await f.manager.flush()
      expect(f.item.cancel).toHaveBeenCalledOnce()
      expect((await readBrowserDownloads(f.db()))[0]).toMatchObject({ state: 'cancelled', sha256: null, bytes: 7 })
      expect(await readFile(f.path(), 'utf8')).toBe('partial')
      await f.runtime.notifyDownload('alice')
      expect((await f.state()).goal.status).toBe(action === 'cancel' ? 'cancelled' : 'blocked')
      expect(f.click).toHaveBeenCalledTimes(1)
      expect(f.errors).toEqual([])
    }
    finally { await f.close() }
  })
})
