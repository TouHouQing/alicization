import { lstat, open, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

/** Retire only a closed synthetic pressure fixture after its known reserve stop. */
export async function retirePressureFixtureAfterReserveStop(input: { root: string, reportPath: string, round: number, freeBytes: string, completeCopies: number, elapsedMs: number }) {
  const root = resolve(input.root)
  const identity = JSON.parse(await readFile(join(root, 'owner.json'), 'utf8'))
  const info = await lstat(root)
  const reports = await lstat(input.reportPath)
  if (!info.isDirectory() || info.isSymbolicLink() || !reports.isDirectory() || reports.isSymbolicLink() || dirname(root) !== resolve(tmpdir()) || !/^life-backup-catalog-pressure-[a-z\d]{6}$/iu.test(basename(root)) || identity.format !== 'alicization-owned-backup-catalog-pressure-v1' || identity.root !== root || identity.round !== input.round || ![1, 2, 3].includes(input.round))
    throw new Error('Refusing to clean a pressure directory with changed ownership')
  const stopped = { format: 'alicization-backup-catalog-pressure-space-stop-v1', ...input, root, minimumFreeBytes: String(512n * 1024n * 1024n), passed: false, databasesClosed: true, cleanupCompleted: false }
  const receipt = join(input.reportPath, `round-${input.round}-space-stop.json`)
  const handle = await open(receipt, 'wx')
  try { await handle.writeFile(JSON.stringify(stopped, null, 2)); await handle.sync() }
  finally { await handle.close() }
  await rm(root, { recursive: true, force: true })
  await writeFile(receipt, JSON.stringify({ ...stopped, cleanupCompleted: true }, null, 2))
  return receipt
}
