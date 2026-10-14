import { lstat, mkdir, realpath } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export async function resolveOwnedArtifactDirectory(path: string) {
  let directory = resolve(path)
  while (true) {
    try {
      if ((await lstat(directory)).isSymbolicLink())
        throw new Error('Owned artifact workspace must not be redirected by a symbolic link')
    }
    catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT')
        throw error
    }
    const parent = dirname(directory)
    if (parent === directory)
      break
    directory = parent
  }
  await mkdir(path, { recursive: true })
  // Recheck after creation so an existing junction cannot redirect a new
  // application-owned workspace outside its selected directory.
  directory = resolve(path)
  while (true) {
    if ((await lstat(directory)).isSymbolicLink())
      throw new Error('Owned artifact workspace must not be redirected by a symbolic link')
    const parent = dirname(directory)
    if (parent === directory)
      break
    directory = parent
  }
  return realpath(path)
}
