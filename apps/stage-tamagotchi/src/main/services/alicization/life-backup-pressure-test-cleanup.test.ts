import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { retirePressureFixtureAfterReserveStop } from './life-backup-pressure-test-cleanup'

it.each(['known-stop', 'changed-owner', 'other-directory', 'existing-receipt'])('retains a failure receipt and retires only the exact reserve-stopped fixture: %s', async (fault) => {
  const root = await mkdtemp(join(tmpdir(), fault === 'other-directory' ? 'life-unrelated-fixture-' : 'life-backup-catalog-pressure-'))
  const reports = await mkdtemp(join(tmpdir(), 'life-pressure-cleanup-evidence-'))
  const sentinel = join(root, 'synthetic-copy.db')
  await writeFile(sentinel, 'closed synthetic database bytes')
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: fault === 'changed-owner' ? 'other-owner' : 'alicization-owned-backup-catalog-pressure-v1', root, round: 1 }))
  try {
    if (fault === 'existing-receipt')
      await writeFile(join(reports, 'round-1-space-stop.json'), 'keep the original diagnostic')
    const attempt = retirePressureFixtureAfterReserveStop({ root, reportPath: reports, round: 1, freeBytes: '512', completeCopies: 26, elapsedMs: 100 })
    if (fault === 'known-stop') {
      const receipt = await attempt
      expect(JSON.parse(await readFile(receipt, 'utf8'))).toMatchObject({ root, passed: false, completeCopies: 26, databasesClosed: true, cleanupCompleted: true, minimumFreeBytes: '536870912' })
      await expect(readFile(sentinel)).rejects.toMatchObject({ code: 'ENOENT' })
    }
    else {
      await expect(attempt).rejects.toThrow()
      expect(await readFile(sentinel, 'utf8')).toBe('closed synthetic database bytes')
      if (fault === 'existing-receipt')
        expect(await readFile(join(reports, 'round-1-space-stop.json'), 'utf8')).toBe('keep the original diagnostic')
    }
  }
  finally { await rm(root, { recursive: true, force: true }); await rm(reports, { recursive: true, force: true }) }
})
