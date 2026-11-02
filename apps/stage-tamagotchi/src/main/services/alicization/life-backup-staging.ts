import type { BigIntStats } from 'node:fs'

import { lstat, opendir, realpath, rmdir, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

const identity = (info: BigIntStats) => `${info.dev}:${info.ino}`
const snapshotNames = new Set(['alicization.db', 'alicization.db-journal', 'alicization.db-wal', 'alicization.db-shm', 'SOUL.md'])

/** Roll back this call's unpublished copies; never sweep the backup parent. */
export async function removeUnpublishedLifeBackup(input: { directory: string, root: string, identity: string }) {
  const root = await realpath(input.root)
  const name = basename(input.directory)
  if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/u.test(name))
    throw new Error('Backup staging requires its fresh backup identity')
  const target = join(root, name)
  if (await realpath(dirname(input.directory)) !== root || await realpath(input.directory) !== target)
    throw new Error('Backup staging directory left its original parent')
  const directories = [{ path: target, identity: input.identity }]
  const files: Array<{ path: string, info: BigIntStats }> = []
  const assertUnpublished = async () => {
    try {
      await lstat(join(target, 'manifest.json'))
      return false
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw error
      return true
    }
  }
  const assertDirectories = async () => {
    if (await realpath(input.root) !== root)
      throw new Error('Backup staging parent changed during cleanup')
    for (const directory of directories) {
      const info = await lstat(directory.path, { bigint: true })
      if (!info.isDirectory() || info.isSymbolicLink() || identity(info) !== directory.identity || await realpath(directory.path) !== directory.path)
        throw new Error('Backup staging directory changed before cleanup')
    }
    if (!await assertUnpublished())
      throw new Error('A published backup cannot be removed as staging')
  }
  if (!await assertUnpublished())
    return { removed: false, published: true, files: 0 }
  await assertDirectories()
  let entries = 0
  for await (const entry of await opendir(target)) {
    if (++entries > 4104)
      throw new Error('Backup staging exceeded its entry budget')
    const path = join(target, entry.name)
    const info = await lstat(path, { bigint: true })
    if (entry.name === 'file-recovery' && info.isDirectory() && !info.isSymbolicLink()) {
      directories.push({ path, identity: identity(info) })
      for await (const blob of await opendir(path)) {
        if (++entries > 4104 || !/^[a-f\d]{64}\.blob$/u.test(blob.name))
          throw new Error('Backup staging contains an unexpected recovery entry')
        files.push({ path: join(path, blob.name), info: await lstat(join(path, blob.name), { bigint: true }) })
      }
    }
    else if (snapshotNames.has(entry.name) || /^manifest\.json\.[a-f\d-]{36}\.tmp$/u.test(entry.name)) {
      files.push({ path, info })
    }
    else {
      throw new Error('Backup staging contains an unexpected entry')
    }
  }
  // Validate the complete bounded set before removing the first file. A link,
  // foreign entry or a replaced directory retains the whole staging tree.
  if (files.some(({ info }) => !info.isFile() || info.isSymbolicLink() || info.nlink !== 1n))
    throw new Error('Backup staging contains a linked or non-file entry')
  for (const file of files) {
    await assertDirectories()
    const current = await lstat(file.path, { bigint: true })
    if (!current.isFile() || current.isSymbolicLink() || current.nlink !== 1n || identity(current) !== identity(file.info) || current.size !== file.info.size || current.mtimeNs !== file.info.mtimeNs)
      throw new Error('Backup staging file changed before cleanup')
    await unlink(file.path)
  }
  if (directories.length > 1) {
    await assertDirectories()
    await rmdir(directories.pop()!.path)
  }
  await assertDirectories()
  await rmdir(target)
  return { removed: true, published: false, files: files.length }
}
