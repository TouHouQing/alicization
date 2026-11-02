import { readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { applyPendingLifeRestore, createLifeBackupRuntime } from '../life-backup-runtime'
import { lifeSchemaVersion } from '../life-schema-version'
import { createFileRecoveryTestFixture } from '../test-support/file-recovery-fixture'
import { createHostFileRecoveryControl } from './host-file-recovery-control'

function host(f: Awaited<ReturnType<typeof createFileRecoveryTestFixture>>) {
  return createHostFileRecoveryControl({ database: f.databasePort, versions: () => f.versions, broker: f.broker, otherWritersStopped: () => true, inspectNativeProcess: async () => 'stopped', stopNativeProcess: async () => 'stopped' })
}
function backups(f: Awaited<ReturnType<typeof createFileRecoveryTestFixture>>) {
  return createLifeBackupRuntime({ userDataPath: f.root, cardId: () => 'alice', snapshot: f.db().snapshotLifeDatabase, state: f.db().readLifeState, schema: async () => lifeSchemaVersion })
}

it.each([true, false])('withdraws only a separately confirmed recovery version, preserving the business file (original=%s)', async (existed) => {
  const f = await createFileRecoveryTestFixture()
  const h = host(f)
  try {
    const path = join(f.root, 'report.txt')
    if (existed)
      await writeFile(path, 'private original')
    const effectId = await f.save(path, 'business content')
    const versionId = (await f.versions.list('alice')).entries[0].id
    const old = await backups(f).create()
    let confirmation = await h.preview('alice', versionId, 9)
    await expect(h.forget('alice', versionId, confirmation.token!, 9)).rejects.toThrow('confirmation')
    confirmation = await h.preview('alice', versionId, 9, 'forget')
    await expect(h.restore('alice', versionId, confirmation.token!, 9)).rejects.toThrow('confirmation')
    confirmation = await h.preview('alice', versionId, 9, 'forget')
    await expect(h.forget('alice', versionId, confirmation.token!, 10)).rejects.toThrow('confirmation')
    confirmation = await h.preview('alice', versionId, 9, 'forget')
    expect(await h.forget('alice', versionId, confirmation.token!, 9)).toEqual({ state: 'forgotten' })
    expect(await readFile(path, 'utf8')).toBe('business content')
    expect((await f.db().getLifeEffect(effectId))?.status).toBe('settled')
    await expect(stat(join(dirname(f.db().dbPath), 'file-recovery', `${versionId}.blob`))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(f.versions.original(versionId, 'alice')).rejects.toThrow('withdrawn')
    expect((await h.list('alice')).entries[0].state).toBe('forgotten')
    expect(await h.preview('alice', versionId, 9)).toMatchObject({ state: 'forgotten', token: null })
    await expect(backups(f).requestRestore(old.id, old.manifestHash)).rejects.toThrow('forgotten source')
    const current = await backups(f).create()
    const manifest = JSON.parse(await readFile(join(f.root, 'alicizations/life-backups', current.id, 'manifest.json'), 'utf8'))
    expect(manifest.fileRecovery).toEqual([])
    await backups(f).requestRestore(current.id, current.manifestHash)
    await f.reopen(() => applyPendingLifeRestore(f.root))
    await expect(f.versions.original(versionId, 'alice')).rejects.toThrow('withdrawn')
    expect((await f.versions.list('alice')).entries[0].state).toBe('forgotten')
    expect(await readFile(path, 'utf8')).toBe('business content')
    expect(f.broker.snapshot()).toEqual([])
  }
  finally { await h.dispose(); await f.close() }
})

it.each(['withdrawal-failure', 'changed-ciphertext', 'result-failure', 'interrupted'] as const)('retains truthful, resumable cleanup after %s', async (failure) => {
  const f = await createFileRecoveryTestFixture()
  const h = host(f)
  let interrupted: Promise<void> | undefined
  try {
    const path = join(f.root, 'report.txt')
    await writeFile(path, 'original')
    await f.save(path, 'business content')
    const versionId = (await f.versions.list('alice')).entries[0].id
    const blob = join(dirname(f.db().dbPath), 'file-recovery', `${versionId}.blob`)
    const cipher = await readFile(blob)
    const database = f.db()
    let inject = true
    f.database({ ...database, commitLifeState: async (input, options) => {
      if (inject && failure === 'withdrawal-failure' && input.operationKey.startsWith('file-version-forget:'))
        throw new Error('injected withdrawal failure')
      if (inject && failure === 'result-failure' && input.operationKey.startsWith('file-version-forget-result:'))
        throw new Error('injected cleanup result failure')
      const receipt = await database.commitLifeState(input, options)
      if (inject && failure === 'interrupted' && input.operationKey.startsWith('file-version-forget:'))
        interrupted = h.interrupt()
      return receipt
    } })
    if (failure === 'changed-ciphertext')
      await writeFile(blob, 'another object must not be deleted')
    let confirmation = await h.preview('alice', versionId, 9, 'forget')
    await expect(h.forget('alice', versionId, confirmation.token!, 9)).rejects.toThrow()
    await interrupted
    expect(await readFile(path, 'utf8')).toBe('business content')
    if (failure === 'withdrawal-failure') {
      expect((await f.versions.original(versionId, 'alice')).bytes?.toString()).toBe('original')
      expect(await readFile(blob)).toEqual(cipher)
    }
    else {
      expect((await h.list('alice')).entries[0].state).toBe('forget-pending')
      await expect(f.versions.original(versionId, 'alice')).rejects.toThrow('withdrawn')
      if (failure === 'changed-ciphertext') {
        expect(await readFile(blob, 'utf8')).toBe('another object must not be deleted')
        await writeFile(blob, cipher)
      }
    }
    inject = false
    confirmation = await h.preview('alice', versionId, 9, 'forget')
    expect(await h.forget('alice', versionId, confirmation.token!, 9)).toEqual({ state: 'forgotten' })
    expect(await readFile(path, 'utf8')).toBe('business content')
    await expect(stat(blob)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(f.broker.snapshot()).toEqual([])
  }
  finally { await h.dispose(); await f.close() }
})
