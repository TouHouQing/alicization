import { createHash } from 'node:crypto'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative } from 'node:path'

import sqlite3 from 'sqlite3'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { sqliteFileSystemPath } from '../sqlite-file-path'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { createExecutionResourceBroker } from './resource-broker'

it.each(['payload', 'generation', 'receipt'] as const)('atomically rejects an independent reconciliation whose %s changes before the actual SQLite commit', async (fault) => {
  const directory = await mkdtemp(join(tmpdir(), 'alicization-recovery-fence-'))
  const database = await setupAlicizationDb(directory, { cardId: 'alice' })
  try {
    const payload = { capabilityId: 'cli', parameters: { command: 'owned-fixture' }, resourceSnapshot: { version: 1, keys: ['host:execution'] } }
    await database.commitLifeState({ cardId: 'alice', operationKey: 'prepare', changes: [], mutations: [
      { type: 'effect-prepare', effect: { id: 'effect', operationKey: 'effect', kind: 'execute', turnId: 'request', actionId: 'action', generation: 1, payload } },
      { type: 'effect-transition', id: 'effect', expected: 'prepared', status: 'claimed' },
      { type: 'effect-transition', id: 'effect', expected: 'claimed', status: 'dispatched' },
      { type: 'effect-transition', id: 'effect', expected: 'dispatched', status: 'uncertain', receipt: { outcome: 'failure', marker: 'original' } },
    ] })
    const original = (await database.getLifeEffect('effect'))!
    const broker = createExecutionResourceBroker()
    broker.restoreQuarantine({ cardId: 'alice', effectId: original.id, resources: ['host:execution'] })
    const commit = database.commitLifeState.bind(database)
    let raced = original
    const intercepted = vi.spyOn(database, 'commitLifeState').mockImplementationOnce(async (input) => {
      // Fault injection writes only this test's database, after the independent
      // read and immediately before the production writer's actual transaction.
      const ownedPath = relative(await realpath(directory), await realpath(database.dbPath))
      expect(isAbsolute(ownedPath) || ownedPath.startsWith('..')).toBe(false)
      const connection = new sqlite3.Database(sqliteFileSystemPath(database.dbPath))
      try {
        const changed = JSON.stringify({ ...payload, sourceWithdrawn: true })
        const sql = fault === 'payload'
          ? 'UPDATE life_effect_intents SET payload_ref_json=?,intent_hash=? WHERE card_id=? AND effect_id=?'
          : fault === 'generation'
            ? 'UPDATE life_effect_intents SET generation=generation+1 WHERE card_id=? AND effect_id=?'
            : 'UPDATE life_effect_intents SET receipt_ref_json=? WHERE card_id=? AND effect_id=?'
        const parameters = fault === 'payload' ? [changed, createHash('sha256').update(changed).digest('hex'), 'alice', original.id] : fault === 'generation' ? ['alice', original.id] : [JSON.stringify({ outcome: 'failure', marker: 'newer' }), 'alice', original.id]
        await new Promise<void>((resolve, reject) => connection.run(sql, parameters, error => error ? reject(error) : resolve()))
      }
      finally { await new Promise<void>((resolve, reject) => connection.close(error => error ? reject(error) : resolve())) }
      raced = (await database.getLifeEffect(original.id))!
      return commit(input)
    })
    try {
      await expect(recoverExecutionEffect({ database, broker, effect: original, writerStopped: () => true, observe: { cli: async observed => ({ effectId: observed.id, independent: true, verdict: 'not-applied', evidence: { receiptId: 'independent-read' } }) } })).rejects.toThrow('snapshot fence')
    }
    finally { intercepted.mockRestore() }
    expect(await database.getLifeEffect(original.id)).toEqual(raced)
    expect(raced.status).toBe('uncertain')
    expect((await database.readLifeState()).ingress.filter(item => item.source === 'execution-reconciliation')).toEqual([])
    expect(() => broker.acquire({ owner: 'new-writer', resources: ['host:execution'] })).toThrow('reconciliation')
  }
  finally {
    await database.close()
    await rm(directory, { recursive: true, force: true })
  }
})
