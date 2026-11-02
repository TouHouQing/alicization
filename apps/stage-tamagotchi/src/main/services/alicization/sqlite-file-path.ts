import { toNamespacedPath } from 'node:path'
import { platform } from 'node:process'

/**
 * Filesystem paths only. SQLite URI/options and in-memory names are not inputs.
 * Extended Windows paths also cover the longer journal and VACUUM filenames,
 * without changing the host's long-path policy or the public database identity.
 */
export function sqliteFileSystemPath(path: string) {
  return platform === 'win32' ? toNamespacedPath(path) : path
}
