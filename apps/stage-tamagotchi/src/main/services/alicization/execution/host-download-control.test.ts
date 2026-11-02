import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import sqlite3 from '../sqlite3-runtime'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { recordBrowserDownload } from './browser-download-repository'
import { recordBrowserDownloadReservation } from './browser-download-reservations'
import { readBrowserDownloadQuarantines } from './browser-download-resource-recovery'
import { createHostDownloadControl } from './host-download-control'
import { createHostExecutionRecovery } from './host-recovery'
import { createExecutionResourceBroker, executionFileResources } from './resource-broker'

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'host-native-download-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const downloadRoot = join(root, 'downloads')
  const cardRoot = join(downloadRoot, createHash('sha256').update('alice').digest('hex'))
  await mkdir(cardRoot, { recursive: true })
  const id = randomUUID()
  const at = Date.now()
  const reservation = { version: 2 as const, runtimeId: 'previous-runtime', id, cardId: 'alice', actionId: 'old-click', observationId: null, directory: join(await realpath(cardRoot), id), requestedUrl: 'https://example.invalid/report', requestHash: 'a'.repeat(64), origin: { kind: 'host-interface' as const }, at, expiresAt: at + 15000 }
  await recordBrowserDownloadReservation(db, reservation, { root: downloadRoot, allowHostInterface: true })
  await mkdir(reservation.directory)
  const path = join(reservation.directory, 'partial.txt')
  await writeFile(path, 'partial bytes preserved')
  const broker = createExecutionResourceBroker()
  for (const owner of await readBrowserDownloadQuarantines(db, 'new-runtime'))
    broker.restoreQuarantine({ cardId: 'alice', ...owner })
  let stopped = false
  let now = Date.now()
  const control = createHostDownloadControl({ database: () => db, broker, writerStopped: () => stopped, now: () => now })
  const command = { cardId: 'alice', effectId: `browser-download:${id}` }
  const preview = async (surface = 1) => {
    const result = await control({ ...command, action: 'preview' }, surface)
    if (result.state !== 'preview')
      throw new Error('Missing native resource preview')
    return result
  }
  return { root, db, broker, reservation, path, command, control, preview, stopped: (value: boolean) => { stopped = value }, advance: (ms: number) => { now += ms }, close: async () => { await db.close(); await rm(root, { recursive: true, force: true }) } }
}

describe('governed host takeover of an unknown native download child', () => {
  it('requires a stopped writer and exact one-use surface confirmation, preserves bytes and survives an unrelated writer clock change', async () => {
    const f = await fixture()
    const registry = createExecutionInterruptRegistry(f.broker)
    let queued: Promise<void> | undefined
    try {
      expect(await f.control({ cardId: 'alice', action: 'list-downloads' }, 1)).toMatchObject({ state: 'download-list', items: [{ effectId: f.command.effectId, directory: f.reservation.directory }], next: null })
      const first = await f.preview()
      await expect(f.control({ ...f.command, action: 'takeover', token: first.token, confirmedStopped: true }, 1)).rejects.toThrow('not stopped')
      f.stopped(true)
      await expect(f.control({ ...f.command, action: 'takeover', token: first.token, confirmedStopped: true }, 1)).rejects.toThrow('expired or changed')
      const second = await f.preview()
      await expect(f.control({ ...f.command, action: 'takeover', token: second.token, confirmedStopped: true }, 2)).rejects.toThrow('expired or changed')
      expect(await f.control({ ...f.command, action: 'recheck' }, 1)).toEqual({ state: 'unknown' })
      let dispatched = false
      queued = registry.run({ cardId: 'alice', threadId: 'queued-opaque-work' }, async () => { dispatched = true })
      await Promise.resolve()
      expect(registry.isActive()).toBe(true)
      expect(dispatched).toBe(false)
      const original = f.db.commitLifeState
      vi.spyOn(f.db, 'commitLifeState').mockImplementationOnce(async (input, options) => {
        await original({ cardId: 'alice', operationKey: 'unrelated-body-clock', changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: 'unrelated-body-clock', kind: 'system', source: 'test-body-health', sourceKey: 'clock', occurredAt: Date.now(), payload: {} } }] })
        return original(input, options)
      })
      expect(await f.control({ ...f.command, action: 'takeover', token: second.token, confirmedStopped: true }, 1)).toEqual({ state: 'host-taken-over' })
      await queued
      expect(dispatched).toBe(true)
      expect(await readFile(f.path, 'utf8')).toBe('partial bytes preserved')
      expect(f.broker.snapshot()).toEqual([])
      expect((await f.db.getLifeIngress(`browser-download-resource-release:${f.reservation.id}`))?.payload).toMatchObject({ independent: false, confirmedStopped: true, stopEvidence: 'host-attestation', scope: 'resource-only-no-transfer-or-goal-success' })
      expect(await readBrowserDownloadQuarantines(f.db, 'next-runtime')).toEqual([])
      expect((await f.db.readLifeState()).effects).toEqual([])
      await expect(f.control({ ...f.command, action: 'takeover', token: second.token, confirmedStopped: true }, 1)).rejects.toThrow('ownership changed')
    }
    finally { registry.cancelAll(); await queued?.catch(() => {}); await f.close() }
  })

  it.each(['expiry', 'new-native-evidence', 'foreign-card'] as const)('rejects %s without releasing or rewriting the unknown operation', async (fault) => {
    const f = await fixture()
    try {
      f.stopped(true)
      const preview = await f.preview()
      if (fault === 'expiry')
        f.advance(120001)
      if (fault === 'new-native-evidence')
        await recordBrowserDownload(f.db, { id: f.reservation.id, cardId: 'alice', actionId: 'old-click', observationId: null, url: f.reservation.requestedUrl, path: f.path, state: 'progressing', bytes: 0, sha256: null, at: Date.now() })
      await expect(f.control({ ...f.command, cardId: fault === 'foreign-card' ? 'other-card' : 'alice', action: 'takeover', token: preview.token, confirmedStopped: true }, 1)).rejects.toThrow()
      expect(f.broker.snapshot()).toHaveLength(1)
      const resources = await executionFileResources(f.path)
      expect(() => f.broker.acquire({ owner: 'other', resources })).toThrow('reconciliation')
      expect(await readFile(f.path, 'utf8')).toBe('partial bytes preserved')
      expect(await f.db.getLifeIngress(`browser-download-resource-release:${f.reservation.id}`)).toBeNull()
    }
    finally { await f.close() }
  })

  it.each(['hash', 'bytes'] as const)('retains the bootstrap fence on a corrupt reservation %s before materializing untrusted history', async (fault) => {
    const f = await fixture()
    try {
      const raw = await new Promise<import('sqlite3').Database>((resolve, reject) => {
        const connection = new sqlite3.Database(f.db.dbPath, error => error ? reject(error) : resolve(connection))
      })
      try {
        await new Promise<void>((resolve, reject) => raw.run(`UPDATE life_ingress SET payload_ref_json=${fault === 'hash' ? '\'{"changed":true}\'' : 'zeroblob(1048577)'} WHERE ingress_id=?`, [`browser-download-reservation:${f.reservation.id}`], error => error ? reject(error) : resolve()))
      }
      finally { await new Promise<void>((resolve, reject) => raw.close(error => error ? reject(error) : resolve())) }
      const broker = createExecutionResourceBroker()
      const recovery = createHostExecutionRecovery({ userDataPath: f.root, broker, readCardEffects: async () => [], readCardDownloadResources: () => readBrowserDownloadQuarantines(f.db, 'new-runtime') })
      await expect(recovery.restore()).rejects.toThrow(fault === 'hash' ? 'durable hash' : 'byte budget')
      expect(() => broker.acquire({ owner: 'other-work', resources: ['host:execution'] })).toThrow('another executor')
      const resources = await executionFileResources(f.path)
      expect(() => broker.acquire({ owner: 'other-file', resources })).toThrow('another executor')
      expect(await readFile(f.path, 'utf8')).toBe('partial bytes preserved')
    }
    finally { await f.close() }
  })
})
