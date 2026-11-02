import { link, mkdir, mkdtemp, readdir, readFile, rename, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeBackupRuntime } from './life-backup-runtime'
import { lifeSchemaVersion } from './life-schema-version'
import { createFileRecoveryTestFixture } from './test-support/file-recovery-fixture'

it.each(['partial-snapshot', 'state-changed', 'schema-unavailable'] as const)('retires only its unpublished backup after %s and preserves the current life', async (failure) => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-failure-'))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-failure-v1', failure, root }))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const soul = join(root, 'alicizations', 'cards', 'alice', 'SOUL.md')
  await writeFile(soul, 'Same persisting identity 中文🙂')
  const outsider = join(root, 'unrelated-backup')
  await mkdir(outsider)
  await writeFile(join(outsider, 'keep.txt'), 'Keep this unrelated artifact')
  try {
    const runtime = createLifeBackupRuntime({
      userDataPath: root,
      cardId: () => 'alice',
      snapshot: async (path) => {
        if (failure === 'partial-snapshot') {
          await writeFile(path, 'Partial snapshot bytes')
          throw new Error('owned-snapshot-failure')
        }
        await db.snapshotLifeDatabase(path)
        if (failure === 'state-changed')
          await db.upsertTaskThread({ id: 'new-during-snapshot', goal: 'A current accepted responsibility', kind: 'mixed', status: 'planned' })
      },
      state: db.readLifeState,
      schema: async () => {
        if (failure === 'schema-unavailable')
          throw new Error('owned-schema-unavailable')
        return lifeSchemaVersion
      },
    })
    await expect(runtime.create()).rejects.toThrow(failure === 'partial-snapshot' ? 'owned-snapshot-failure' : failure === 'state-changed' ? 'Life state changed' : 'owned-schema-unavailable')
    expect(await runtime.list()).toEqual([])
    const remaining = await readdir(join(root, 'alicizations', 'life-backups'))
    await writeFile(join(root, 'failure-receipt.json'), JSON.stringify({ failure, remaining, identityIntact: await readFile(soul, 'utf8') === 'Same persisting identity 中文🙂' }, null, 2))
    expect(remaining).toEqual([])
    expect(await readFile(soul, 'utf8')).toBe('Same persisting identity 中文🙂')
    expect(await readFile(join(outsider, 'keep.txt'), 'utf8')).toBe('Keep this unrelated artifact')
    if (failure === 'state-changed')
      expect((await db.readLifeState()).obligations.some(item => item.threadId === 'new-during-snapshot')).toBe(true)
  }
  finally {
    await db.close()
    // Retain this small owned fixture and failure receipt until this matrix
    // and any conservative cleanup are reviewed; never sweep its parent.
  }
})

it.each(['unexpected-file', 'linked-directory', 'replaced-directory', 'published-manifest', 'hardlinked-file'] as const)('retains staging after %s instead of deleting unfamiliar data', async (condition) => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-conservative-'))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-failure-v1', condition, root }))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const outsider = join(root, 'unrelated')
  await mkdir(outsider)
  await writeFile(join(outsider, 'keep.txt'), 'Unrelated original bytes')
  let snapshot = ''
  try {
    const runtime = createLifeBackupRuntime({ userDataPath: root, cardId: () => 'alice', state: db.readLifeState, schema: async () => lifeSchemaVersion, snapshot: async (path) => {
      snapshot = path
      const directory = dirname(path)
      await writeFile(path, 'Private partial snapshot')
      if (condition === 'unexpected-file')
        await writeFile(join(directory, 'keep.bin'), 'Unfamiliar bytes')
      if (condition === 'linked-directory')
        await symlink(outsider, join(directory, 'file-recovery'), 'junction')
      if (condition === 'replaced-directory') {
        await rename(directory, `${directory}-moved`)
        await mkdir(directory)
        await writeFile(path, 'Replacement directory bytes')
      }
      if (condition === 'published-manifest')
        await writeFile(join(directory, 'manifest.json'), '{}')
      if (condition === 'hardlinked-file')
        await link(join(outsider, 'keep.txt'), join(directory, 'SOUL.md'))
      throw new Error('owned-partial-backup-failed')
    } })
    await expect(runtime.create()).rejects.toThrow('owned-partial-backup-failed')
    expect(await readFile(snapshot, 'utf8')).toBe(condition === 'replaced-directory' ? 'Replacement directory bytes' : 'Private partial snapshot')
    expect(await readFile(join(outsider, 'keep.txt'), 'utf8')).toBe('Unrelated original bytes')
    if (condition === 'unexpected-file')
      expect(await readFile(join(dirname(snapshot), 'keep.bin'), 'utf8')).toBe('Unfamiliar bytes')
    if (condition === 'replaced-directory')
      expect(await readFile(join(`${dirname(snapshot)}-moved`, 'alicization.db'), 'utf8')).toBe('Private partial snapshot')
    await writeFile(join(root, 'retained-receipt.json'), JSON.stringify({ condition, snapshot, unrelatedOriginalPreserved: true }))
  }
  finally { await db.close() }
})

it('retires copied ciphertext after an unpublished backup fails while preserving original recovery versions', async () => {
  const fixture = await createFileRecoveryTestFixture()
  try {
    const path = join(fixture.root, 'owned-report.txt')
    await writeFile(path, 'Private original 中文🙂')
    await fixture.save(path, 'Current verified output')
    const version = (await fixture.versions.list('alice')).entries[0]
    const record = await fixture.versions.read(version.id, 'alice')
    const ciphertextPath = join(dirname(fixture.db().dbPath), 'file-recovery', `${record.before.blob!.id}.blob`)
    const ciphertext = await readFile(ciphertextPath)
    const runtime = createLifeBackupRuntime({ userDataPath: fixture.root, cardId: () => 'alice', snapshot: fixture.db().snapshotLifeDatabase, state: fixture.db().readLifeState, schema: async () => { throw new Error('schema-after-ciphertext-copy-failed') } })
    await expect(runtime.create()).rejects.toThrow('schema-after-ciphertext-copy-failed')
    expect(await readdir(join(fixture.root, 'alicizations', 'life-backups'))).toEqual([])
    expect(await readFile(ciphertextPath)).toEqual(ciphertext)
    expect(await fixture.versions.read(version.id, 'alice')).toEqual(record)
    expect(await readFile(path, 'utf8')).toBe('Current verified output')
  }
  finally { await fixture.close() }
})
