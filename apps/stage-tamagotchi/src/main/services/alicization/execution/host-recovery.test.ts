import type { LifeEffect } from '../../../../shared/life-contracts'

import { link, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import sqlite3 from '../sqlite3-runtime'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { createHostExecutionRecovery } from './host-recovery'
import { createExecutionResourceBroker, executionFileResources } from './resource-broker'

async function readCardEffects(root: string, cardId: string) {
  const db = await setupAlicizationDb(root, { cardId, readOnly: true })
  try { return await db.readPendingLifeExecutionEffects() }
  finally { await db.close() }
}

describe('host execution quarantine across cards and boot epochs', () => {
  it.each(['count', 'bytes', 'receipt-bytes'])('retains the boot guard on pending intent %s overflow before materializing payloads', async (overflow) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-host-recovery-budget-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.commitLifeState({ cardId: 'alice', operationKey: 'seed', changes: [], mutations: [
        { type: 'effect-prepare', effect: { id: 'effect', operationKey: 'effect', kind: 'execute', turnId: null, actionId: null, generation: 0, payload: { capabilityId: 'unknown' } } },
        { type: 'effect-transition', id: 'effect', expected: 'prepared', status: 'claimed' },
        { type: 'effect-transition', id: 'effect', expected: 'claimed', status: 'dispatched' },
      ] })
      const raw = await new Promise<import('sqlite3').Database>((resolve, reject) => {
        const connection = new sqlite3.Database(db.dbPath, error => error ? reject(error) : resolve(connection))
      })
      try {
        const sql = overflow === 'count'
          ? `WITH RECURSIVE copies(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM copies WHERE n<4096)
             INSERT INTO life_effect_intents(card_id,effect_id,operation_key,kind,intent_hash,payload_ref_json,producer_commit_id,turn_id,action_id,generation,guard_read_set_json,status,created_at,updated_at)
             SELECT card_id,'overflow-'||n,'overflow-'||n,kind,intent_hash,payload_ref_json,producer_commit_id,turn_id,action_id,generation,guard_read_set_json,status,created_at,updated_at FROM life_effect_intents,copies WHERE effect_id='effect'`
          : `UPDATE life_effect_intents SET ${overflow === 'bytes' ? 'payload_ref_json' : 'receipt_ref_json'} = zeroblob(16777217) WHERE effect_id = 'effect'`
        await new Promise<void>((resolve, reject) => raw.run(sql, error => error ? reject(error) : resolve()))
      }
      finally {
        await new Promise<void>((resolve, reject) => raw.close(error => error ? reject(error) : resolve()))
      }
      const broker = createExecutionResourceBroker()
      const recovery = createHostExecutionRecovery({ userDataPath: root, broker, readCardEffects: cardId => readCardEffects(root, cardId) })
      await expect(recovery.restore()).rejects.toThrow('recovery read budget')
      expect(() => broker.acquire({ owner: 'other', resources: ['file-path:anything'] })).toThrow('another executor')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('restores inactive-card file aliases and releases only the exact card/effect after independent proof', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-host-recovery-'))
    const oldBroker = createExecutionResourceBroker()
    const broker = createExecutionResourceBroker()
    try {
      const paths: string[] = []
      const hashes: Uint8Array[] = []
      const effectIds: string[] = []
      for (const cardId of ['alice', '晴天']) {
        const db = await setupAlicizationDb(root, { cardId })
        try {
          const path = join(root, `${cardId}.txt`)
          paths.push(path)
          const life = createLifeTurnRuntime({ resourceBroker: oldBroker, read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
          await life.admit({ cardId, turnId: 'same-turn', conversationId: 'chat', messages: [{ role: 'user', content: '保存这份报告' }] }, new AbortController().signal)
          const action = await life.beforeAction({ cardId, turnId: 'same-turn', actionId: 'save', capabilityId: 'tool.filesystem_write_file', parameters: { path, content: cardId }, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, new AbortController().signal)
          effectIds.push(action.id)
          await writeFile(path, cardId)
          if (cardId === 'alice')
            await life.afterAction({ cardId, id: action.id, outcome: 'failure', output: { effectMayHaveOccurred: true }, interrupted: true })
        }
        finally { await db.close() }
        hashes.push(await readFile(join(root, 'alicizations/cards', cardId, 'alicization.db')))
      }
      expect(effectIds[0]).toBe(effectIds[1])
      const alias = join(root, 'alias.txt')
      await link(paths[0], alias)
      await mkdir(join(root, 'alicizations/cards', 'profile-only'))
      const read = vi.fn((cardId: string) => readCardEffects(root, cardId))
      const recovery = createHostExecutionRecovery({ userDataPath: root, broker, readCardEffects: read })
      const first = recovery.restore()
      expect(recovery.restore()).toBe(first)
      expect(await first).toEqual({ cards: 2, quarantines: 2 })
      expect(read).toHaveBeenCalledTimes(2)
      for (const [index, cardId] of ['alice', '晴天'].entries())
        expect(await readFile(join(root, 'alicizations/cards', cardId, 'alicization.db'))).toEqual(hashes[index])
      for (const path of [...paths, alias]) {
        const resources = await executionFileResources(path)
        expect(() => broker.acquire({ owner: 'new-card:new-task', resources })).toThrow('reconciliation')
      }
      expect(() => broker.assert(oldBroker.snapshot()[0])).toThrow('stale')
      const otherResources = await executionFileResources(paths[1])
      expect(() => broker.beginReconciliation(effectIds[0], otherResources, 'alice')).toThrow('unrelated')
      expect(broker.snapshot()).toHaveLength(2)

      const db = await setupAlicizationDb(root, { cardId: 'alice' })
      try {
        const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
        await life.recover('alice')
        const effect = (await db.getLifeEffect(effectIds[0]))!
        expect((await recoverExecutionEffect({ database: db, broker, effect, writerStopped: () => true }))?.verdict).toBe('applied')
        expect(broker.snapshot()).toHaveLength(1)
        expect(broker.snapshot()[0].effectCardId).toBe('晴天')
        const next = broker.acquire({ owner: 'new-card:new-task', resources: await executionFileResources(alias) })
        broker.settle(next, { stopped: true, uncertain: false })
        expect(() => broker.acquire({ owner: 'new-card:new-task', resources: otherResources })).toThrow('reconciliation')
        expect(await readFile(paths[1], 'utf8')).toBe('晴天')
      }
      finally { await db.close() }
    }
    finally { await rm(root, { recursive: true, force: true }) }
  }, 15_000)

  it('keeps host writes blocked until every card has been read and retains the guard on failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-host-recovery-failure-'))
    try {
      for (const cardId of ['a', 'b']) {
        await mkdir(join(root, 'alicizations/cards', cardId), { recursive: true })
        await writeFile(join(root, 'alicizations/cards', cardId, 'alicization.db'), 'fixture')
      }
      const broker = createExecutionResourceBroker()
      let proceed!: () => void
      const pending = new Promise<void>((resolve) => { proceed = resolve })
      const read = vi.fn(async (cardId: string) => {
        if (cardId === 'a') {
          await pending
          return []
        }
        throw new Error('Unreadable card database')
      })
      const recovery = createHostExecutionRecovery({ userDataPath: root, broker, readCardEffects: read })
      const result = recovery.restore()
      await vi.waitFor(() => expect(read).toHaveBeenCalledWith('a'))
      expect(() => broker.acquire({ owner: 'another-card', resources: ['file-path:anything'] })).toThrow('another executor')
      proceed()
      await expect(result).rejects.toThrow('Unreadable')
      expect(() => broker.acquire({ owner: 'another-card', resources: ['browser:another-card'] })).toThrow('another executor')
      expect(broker.snapshot()).toHaveLength(1)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it.each(['read-only', 'unknown-adapter', 'invalid-path'])('handles %s pending effects without weakening the boot fence', async (scenario) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-host-recovery-scope-'))
    try {
      await mkdir(join(root, 'alicizations/cards/a'), { recursive: true })
      await writeFile(join(root, 'alicizations/cards/a/alicization.db'), 'fixture')
      const broker = createExecutionResourceBroker()
      const effect: LifeEffect = { id: 'effect', operationKey: 'effect', kind: 'execute', status: 'uncertain', turnId: 'turn', actionId: 'action', generation: 0, receipt: null, leaseUntil: null, payload: scenario === 'read-only'
        ? { capabilityId: 'tool.filesystem_read_file', parameters: { path: 'bad-path' }, effectContract: { retryClass: 'read-only', sideEffect: 'read' } }
        : scenario === 'invalid-path' ? { capabilityId: 'tool.filesystem_write_file', parameters: { path: 'relative.txt' }, resourceSnapshot: { version: 1, keys: ['file-path:original'] } } : { capabilityId: 'plugin.unknown-action' } }
      const recovery = createHostExecutionRecovery({ userDataPath: root, broker, readCardEffects: async () => [effect] })
      if (scenario === 'invalid-path') {
        await expect(recovery.restore()).rejects.toThrow('absolute')
        expect(() => broker.acquire({ owner: 'other', resources: ['file-path:unrelated'] })).toThrow('another executor')
      }
      else {
        await recovery.restore()
        if (scenario === 'read-only')
          expect(broker.snapshot()).toEqual([])
        else
          expect(() => broker.acquire({ owner: 'other', resources: ['file-path:unrelated'] })).toThrow('reconciliation')
      }
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('rejects changed pending intent bytes before accepting a narrower resource scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-host-intent-hash-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.commitLifeState({ cardId: 'alice', operationKey: 'seed', changes: [], mutations: [
        { type: 'effect-prepare', effect: { id: 'effect', operationKey: 'effect', kind: 'execute', turnId: null, actionId: null, generation: 0, payload: { capabilityId: 'unknown' } } },
        { type: 'effect-transition', id: 'effect', expected: 'prepared', status: 'claimed' },
        { type: 'effect-transition', id: 'effect', expected: 'claimed', status: 'dispatched' },
      ] })
      const raw = await new Promise<import('sqlite3').Database>((resolve, reject) => {
        const connection = new sqlite3.Database(db.dbPath, error => error ? reject(error) : resolve(connection))
      })
      try {
        await new Promise<void>((resolve, reject) => raw.run(`UPDATE life_effect_intents SET payload_ref_json = '{}' WHERE card_id = 'alice'`, error => error ? reject(error) : resolve()))
      }
      finally { await new Promise<void>((resolve, reject) => raw.close(error => error ? reject(error) : resolve())) }
      const broker = createExecutionResourceBroker()
      const recovery = createHostExecutionRecovery({ userDataPath: root, broker, readCardEffects: cardId => readCardEffects(root, cardId) })
      await expect(recovery.restore()).rejects.toThrow('durable intents')
      expect(() => broker.acquire({ owner: 'other', resources: ['file-path:anything'] })).toThrow('another executor')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
