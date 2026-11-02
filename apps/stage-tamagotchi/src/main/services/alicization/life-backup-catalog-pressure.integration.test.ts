import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { copyFile, lstat, mkdir, mkdtemp, open, readFile, rm, statfs, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createOwnedLifeBackupRuntime } from './life-backup-owner'
import { retirePressureFixtureAfterReserveStop } from './life-backup-pressure-test-cleanup'
import { applyPendingLifeRestore } from './life-backup-runtime'

const run = promisify(execFile)
const digest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex')

it.skipIf(process.platform !== 'win32' || process.env.ALICIZATION_RUN_BACKUP_CATALOG_PRESSURE !== '1').each([1, 2, 3])('keeps 1001 complete fixed-source snapshot copies, another identity and damaged metadata separate through actual restore, round %s', async (round) => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-catalog-pressure-'))
  expect(relative(tmpdir(), root)).not.toMatch(/^\.\.|^[A-Z]:/iu)
  const reportPath = process.env.ALICIZATION_BACKUP_CATALOG_REPORT_ROOT
  if (!reportPath)
    throw new Error('Pressure acceptance needs its retained external report directory')
  expect(relative(resolve('output'), resolve(reportPath))).not.toMatch(/^\.\.|^[A-Z]:/iu)
  expect((await lstat(reportPath)).isSymbolicLink()).toBe(false)
  const startedAt = Date.now()
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-catalog-pressure-v1', root, round }))
  // Compression belongs only to this new synthetic directory. The catalog
  // holds complete regular SQLite copies; it never uses hard links as backups.
  await run(join(process.env.SystemRoot!, 'System32', 'compact.exe'), ['/C', '/Q', root], { windowsHide: true })
  await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'if(!((Get-Item -LiteralPath $env:ALICIZATION_OWNED_COMPRESSION_ROOT).Attributes -band [IO.FileAttributes]::Compressed)){exit 1}'], { windowsHide: true, env: { ...process.env, ALICIZATION_OWNED_COMPRESSION_ROOT: root } })
  const alice = await setupAlicizationDb(root, { cardId: 'alice' })
  const bob = await setupAlicizationDb(root, { cardId: 'bob' })
  let aliceClosed = false
  let bobClosed = false
  let completed = false
  let spaceStop: { freeBytes: string, completeCopies: number } | null = null
  try {
    const aliceSoul = join(root, 'alicizations', 'cards', 'alice', 'SOUL.md')
    const bobSoul = join(root, 'alicizations', 'cards', 'bob', 'SOUL.md')
    await writeFile(aliceSoul, 'Alice fixed backup identity 中文🙂')
    await writeFile(bobSoul, 'Bob independent identity')
    const owner = { cardId: 'alice', database: alice }
    const backups = createOwnedLifeBackupRuntime({ userDataPath: root, currentOwner: () => owner })
    const seed = await backups.create()
    const catalog = join(root, 'alicizations', 'life-backups')
    const seedRoot = join(catalog, seed.id)
    const originalManifest = JSON.parse(await readFile(join(seedRoot, 'manifest.json'), 'utf8'))
    const expected = new Map([[seed.id, seed.manifestHash]])
    let middle = seed
    const minimumFree = 512n * 1024n * 1024n
    for (let index = 1; index <= 1000; index++) {
      if (index % 25 === 1) {
        const space = await statfs(root, { bigint: true })
        if (space.bavail * space.bsize < minimumFree) {
          spaceStop = { freeBytes: String(space.bavail * space.bsize), completeCopies: expected.size }
          throw new Error('Owned pressure test stopped before consuming reserved host space')
        }
      }
      const id = randomUUID()
      const target = join(catalog, id)
      await mkdir(target)
      await copyFile(join(seedRoot, 'alicization.db'), join(target, 'alicization.db'))
      await copyFile(join(seedRoot, 'SOUL.md'), join(target, 'SOUL.md'))
      const file = await lstat(join(target, 'alicization.db'))
      expect(file.isFile() && !file.isSymbolicLink() && file.nlink === 1).toBe(true)
      const manifest = { ...originalManifest, id, createdAt: originalManifest.createdAt + index }
      const raw = JSON.stringify(manifest)
      const handle = await open(join(target, 'manifest.json'), 'wx')
      try { await handle.writeFile(raw); await handle.sync() }
      finally { await handle.close() }
      expected.set(id, digest(raw))
      if (index === 500)
        middle = { ...seed, id, createdAt: manifest.createdAt, manifestHash: digest(raw) }
    }
    const bobBackup = await createOwnedLifeBackupRuntime({ userDataPath: root, currentOwner: () => ({ cardId: 'bob', database: bob }) }).create()
    const badId = randomUUID()
    await mkdir(join(catalog, badId))
    await writeFile(join(catalog, badId, 'manifest.json'), '{preserve damaged metadata')
    const first = await backups.inspect()
    const second = await backups.inspect()
    expect(first.backups).toHaveLength(1001)
    expect(new Map(first.backups.map(item => [item.id, item.manifestHash]))).toEqual(expected)
    expect(second).toEqual(first)
    expect(first.backups.some(item => item.id === bobBackup.id)).toBe(false)
    expect(first.issues).toEqual([{ backupId: badId, ownership: 'unidentified', code: 'unreadable-manifest' }])
    expect(first.backups.map(item => item.createdAt)).toEqual(first.backups.map(item => item.createdAt).sort((a, b) => b - a))
    const paged = new Map<string, string>()
    let cursor: string | undefined
    let pages = 0
    do {
      // The ordinary RPC constructs a new facade each time. Its index and
      // authenticated cursor must remain on this exact database/life owner.
      const facade = createOwnedLifeBackupRuntime({ userDataPath: root, currentOwner: () => owner })
      const page = await facade.inspectPage({ limit: 100, cursor })
      expect(page.cardId).toBe('alice')
      expect(page.total).toBe(1001)
      expect(page.issuesTotal).toBe(1)
      expect(page.issues).toEqual(first.issues)
      expect(page.backups.length).toBeLessThanOrEqual(100)
      for (const backup of page.backups) {
        expect(paged.has(backup.id)).toBe(false)
        paged.set(backup.id, backup.manifestHash)
      }
      cursor = page.nextCursor ?? undefined
      pages++
    } while (cursor)
    expect(pages).toBe(11)
    expect(paged).toEqual(expected)
    await backups.requestRestore(middle.id, middle.manifestHash)
    await writeFile(aliceSoul, 'Alice current identity retained before restore')
    const bobBytes = await readFile(bobSoul)
    await alice.close()
    aliceClosed = true
    await bob.close()
    bobClosed = true
    const restored = await applyPendingLifeRestore(root)
    expect(restored).toMatchObject({ cardId: 'alice', backupId: middle.id })
    expect(await readFile(aliceSoul, 'utf8')).toBe('Alice fixed backup identity 中文🙂')
    expect(await readFile(join(restored!.beforeDirectory, 'SOUL.md'), 'utf8')).toBe('Alice current identity retained before restore')
    expect(await readFile(bobSoul)).toEqual(bobBytes)
    expect(await readFile(join(catalog, badId, 'manifest.json'), 'utf8')).toBe('{preserve damaged metadata')
    const reopened = await setupAlicizationDb(root, { cardId: 'alice' })
    try { expect((await reopened.readLifeState()).cardId).toBe('alice') }
    finally { await reopened.close() }
    const report = { format: 'alicization-backup-catalog-pressure-v2', round, completed: true, sameFixedSourceCopies: 1001, separateIdentityBackups: 1, retainedCorruptEntries: 1, selectedBackupId: middle.id, selectedManifestHash: middle.manifestHash, actualRestoreAndReopen: true, elapsedMs: Date.now() - startedAt, boundedCatalogImplemented: true, catalogPages: pages, pageLimit: 100, automaticRetentionImplemented: false }
    await writeFile(join(reportPath, `round-${round}.json`), JSON.stringify(report, null, 2), { flag: 'wx' })
    completed = true
  }
  finally {
    if (!aliceClosed)
      await alice.close()
    if (!bobClosed)
      await bob.close()
    if (completed) {
      await rm(root, { recursive: true, force: true })
    }
    else if (spaceStop) {
      // A known reserve stop needs a small failure receipt, not hundreds of
      // redundant synthetic copies. Unknown failures retain their full fixture.
      await retirePressureFixtureAfterReserveStop({ root, reportPath, round, ...spaceStop, elapsedMs: Date.now() - startedAt })
    }
  }
}, 600000)
