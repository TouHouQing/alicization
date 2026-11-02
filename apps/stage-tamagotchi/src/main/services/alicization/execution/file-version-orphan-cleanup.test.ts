import type { LifeCommitInput } from '../../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { readFile, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { createFileRecoveryTestFixture } from '../test-support/file-recovery-fixture'
import { executionDigest } from './acceptance-compiler'
import { createFileRecoveryVault } from './file-recovery-vault'
import { collectFileVersionOrphans } from './file-version-orphan-cleanup'
import { createHostEffectControl } from './host-effect-control'
import { createExecutionResourceBroker } from './resource-broker'

const id = (value: string) => createHash('sha256').update(value).digest('hex')
function noKey(): never { throw new Error('Orphan maintenance never decrypts') }
const vault = (directory: string) => createFileRecoveryVault({ root: directory, seal: noKey, unseal: noKey })
async function old(path: string) { const time = new Date(Date.now() - 172800000); await utimes(path, time, time) }

it('removes a real failed pre-journal capture and a zero-length partial blob, preserving live and fresh versions', async () => {
  const f = await createFileRecoveryTestFixture()
  try {
    const directory = join(dirname(f.db().dbPath), 'file-recovery')
    const livePath = join(f.root, 'live.txt')
    await writeFile(livePath, 'private live content')
    await f.save(livePath, 'live business content')
    const live = (await f.versions.list('alice')).entries[0]
    await old(join(directory, `${live.id}.blob`))
    const path = join(f.root, 'original.txt')
    await writeFile(path, 'private original')
    const database = f.db()
    f.database({ ...database, commitLifeState: async (input, options) => {
      if (input.operationKey.startsWith('file-version-before:') || input.operationKey.startsWith('observe:'))
        throw new Error('injected pre-journal failure with unavailable outcome journal')
      return database.commitLifeState(input, options)
    } })
    await expect(f.save(path, 'must not write')).rejects.toThrow('pre-journal')
    f.database(database)
    await f.recover()
    const effect = (await database.readLifeState()).effects.find(item => item.kind === 'execute' && item.status === 'uncertain')!
    const orphan = executionDigest({ cardId: 'alice', effectId: effect.id })
    await old(join(directory, `${orphan}.blob`))
    f.database(database)
    // The adapter promise has ended. A restarted runtime has fresh volatile
    // leases while the durable dispatched effect still requires takeover.
    const control = createHostEffectControl({ database: f.db, broker: createExecutionResourceBroker(), writerStopped: () => true })
    const confirmation = await control({ cardId: 'alice', effectId: effect.id, action: 'preview' }, 1)
    if (confirmation.state !== 'preview')
      throw new Error('Expected explicit stopped-writer takeover')
    await control({ cardId: 'alice', effectId: effect.id, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 1)
    const partial = id('zero-length-partial')
    await writeFile(join(directory, `${partial}.blob`), '')
    await old(join(directory, `${partial}.blob`))
    const fresh = id('fresh-unreferenced')
    await writeFile(join(directory, `${fresh}.blob`), 'fresh pending bytes')
    const result = await collectFileVersionOrphans({ database, vault: vault(directory), assertCurrent: () => {} })
    expect(result.removed).toBe(2)
    for (const name of [orphan, partial])
      await expect(stat(join(directory, `${name}.blob`))).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await f.versions.original(live.id, 'alice')).bytes?.toString()).toBe('private live content')
    expect(await readFile(join(directory, `${fresh}.blob`), 'utf8')).toBe('fresh pending bytes')
    expect(await readFile(path, 'utf8')).toBe('private original')
    expect(await readFile(livePath, 'utf8')).toBe('live business content')
    expect((await database.readLifeIngressPage({ source: 'file-version-orphan-cleanup' })).entries.every(item => item.status === 'settled')).toBe(true)
  }
  finally { await f.close() }
})

it('retains an old real pre-journal ciphertext while its original dispatched outcome remains unknown', async () => {
  const f = await createFileRecoveryTestFixture()
  try {
    const path = join(f.root, 'original.txt')
    await writeFile(path, 'original')
    const database = f.db()
    f.database({ ...database, commitLifeState: async (input, options) => {
      if (input.operationKey.startsWith('file-version-before:') || input.operationKey.startsWith('observe:'))
        throw new Error('injected pre-journal failure with unavailable outcome journal')
      return database.commitLifeState(input, options)
    } })
    await expect(f.save(path, 'must not write')).rejects.toThrow()
    f.database(database)
    await f.recover()
    const effect = (await database.readPendingLifeExecutionEffects())[0]
    const versionId = executionDigest({ cardId: 'alice', effectId: effect.id })
    const directory = join(dirname(database.dbPath), 'file-recovery')
    const blob = join(directory, `${versionId}.blob`)
    await old(blob)
    expect(await collectFileVersionOrphans({ database, vault: vault(directory), assertCurrent: () => {} })).toEqual({ inspected: 0, removed: 0 })
    expect((await stat(blob)).size).toBeGreaterThan(0)
    expect(await readFile(path, 'utf8')).toBe('original')
    expect((await database.getLifeEffect(effect.id))?.status).toBe('uncertain')
  }
  finally { await f.close() }
})

it('cleans an old unreferenced capture after the actual no-write failure was durably settled', async () => {
  const f = await createFileRecoveryTestFixture()
  try {
    const path = join(f.root, 'known-unwritten.txt')
    await writeFile(path, 'host original')
    const database = f.db()
    f.database({ ...database, commitLifeState: async (input, options) => {
      if (input.operationKey.startsWith('file-version-before:'))
        throw new Error('injected before-image journal failure')
      return database.commitLifeState(input, options)
    } })
    await expect(f.save(path, 'must not write')).rejects.toThrow('journal failure')
    const effect = (await database.readLifeState()).effects.find(item => item.kind === 'execute')!
    expect(effect).toMatchObject({ status: 'settled', receipt: { outcome: 'failure' } })
    expect(await database.readPendingLifeExecutionEffects()).toEqual([])
    expect(f.broker.snapshot()).toEqual([])
    const directory = join(dirname(database.dbPath), 'file-recovery')
    const blob = join(directory, `${executionDigest({ cardId: 'alice', effectId: effect.id })}.blob`)
    await old(blob)
    expect(await collectFileVersionOrphans({ database, vault: vault(directory), assertCurrent: () => {} })).toEqual({ inspected: 1, removed: 1 })
    await expect(stat(blob)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(path, 'utf8')).toBe('host original')
  }
  finally { await f.close() }
})

it('reaches an orphan beyond a batch of referenced old versions without removing any referenced bytes', async () => {
  const f = await createFileRecoveryTestFixture()
  try {
    const path = join(f.root, 'many-versions.txt')
    await writeFile(path, 'initial version')
    for (let index = 0; index < 16; index++)
      await f.save(path, `retained version ${index}`)
    const versions = (await f.versions.list('alice')).entries
    expect(versions).toHaveLength(16)
    const directory = join(dirname(f.db().dbPath), 'file-recovery')
    for (const version of versions)
      await old(join(directory, `${version.id}.blob`))
    const orphanId = 'f'.repeat(64)
    expect(versions.every(version => version.id < orphanId)).toBe(true)
    const orphan = join(directory, `${orphanId}.blob`)
    await writeFile(orphan, '')
    await old(orphan)
    const result = await collectFileVersionOrphans({ database: f.db(), vault: vault(directory), assertCurrent: () => {} })
    expect(result.removed).toBe(1)
    await expect(stat(orphan)).rejects.toMatchObject({ code: 'ENOENT' })
    for (const version of versions)
      expect((await f.versions.original(version.id, 'alice')).bytes).toBeInstanceOf(Buffer)
    expect(await readFile(path, 'utf8')).toBe('retained version 15')
  }
  finally { await f.close() }
}, 30000)

it.each(['prepared-failure', 'changed-after-audit', 'observed-failure'] as const)('preserves or resumes orphan cleanup after %s', async (failure) => {
  const f = await createFileRecoveryTestFixture()
  try {
    const path = join(f.root, 'business.txt')
    await f.save(path, 'business file')
    const directory = join(dirname(f.db().dbPath), 'file-recovery')
    const storage = vault(directory)
    await storage.list()
    const orphanId = id('old-orphan')
    const orphan = join(directory, `${orphanId}.blob`)
    await writeFile(orphan, '')
    await old(orphan)
    const database = f.db()
    let inject = true
    const wrapped = { ...database, commitLifeState: async (input: LifeCommitInput, options?: Parameters<typeof database.commitLifeState>[1]) => {
      if (inject && input.operationKey.startsWith('file-version-orphan:') && input.operationKey.endsWith(failure === 'prepared-failure' ? ':prepared' : ':observed') && failure !== 'changed-after-audit')
        throw new Error('injected orphan audit failure')
      const receipt = await database.commitLifeState(input, options)
      if (inject && failure === 'changed-after-audit' && input.operationKey.startsWith('file-version-orphan:') && input.operationKey.endsWith(':prepared'))
        await writeFile(orphan, 'later object must survive')
      return receipt
    } }
    await expect(collectFileVersionOrphans({ database: wrapped, vault: storage, assertCurrent: () => {} })).rejects.toThrow()
    expect(await readFile(path, 'utf8')).toBe('business file')
    if (failure === 'prepared-failure') {
      expect((await stat(orphan)).size).toBe(0)
      inject = false
      expect((await collectFileVersionOrphans({ database: wrapped, vault: storage, assertCurrent: () => {} })).removed).toBe(1)
    }
    else if (failure === 'changed-after-audit') {
      expect(await readFile(orphan, 'utf8')).toBe('later object must survive')
      await expect(collectFileVersionOrphans({ database, vault: storage, assertCurrent: () => {} })).rejects.toThrow('changed')
    }
    else {
      await expect(stat(orphan)).rejects.toMatchObject({ code: 'ENOENT' })
      await f.reopen()
      const resumed = await collectFileVersionOrphans({ database: f.db(), vault: vault(directory), assertCurrent: () => {} })
      expect(resumed).toEqual({ inspected: 1, removed: 0 })
      const journal = await f.db().readLifeIngressPage({ source: 'file-version-orphan-cleanup' })
      expect(journal.entries).toHaveLength(2)
      expect(journal.entries.every(item => item.status === 'settled')).toBe(true)
      expect(await collectFileVersionOrphans({ database: f.db(), vault: vault(directory), assertCurrent: () => {} })).toEqual({ inspected: 0, removed: 0 })
    }
  }
  finally { await f.close() }
})
