import { Buffer } from 'node:buffer'
import { opendir, realpath } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'

/** Bounded metadata discovery; nested links are observations, never traversal authority. */
export async function readLocalDirectory(input: { path: string, recursive?: boolean, maxEntries?: number, maxReturnBytes?: number, signal?: AbortSignal }) {
  const root = await realpath(input.path)
  const queue = [{ path: root, depth: 0 }]
  const entries: Array<{ name: string, path: string, type: string }> = []
  const maximum = Math.min(2000, Math.max(1, Number(input.maxEntries) || 200))
  const byteLimit = Math.min(256000, Math.max(1000, Number(input.maxReturnBytes) || 64000))
  let bytes = 0
  let directories = 0
  let truncated = false
  let budgetReached = false
  while (queue.length) {
    input.signal?.throwIfAborted()
    const current = queue.shift()!
    const canonical = await realpath(current.path)
    const local = relative(root, canonical)
    if (canonical !== current.path || local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local))
      throw new Error('Directory identity changed during discovery')
    if (++directories > 512) {
      truncated = true
      break
    }
    const directory = await opendir(canonical)
    for await (const item of directory) {
      input.signal?.throwIfAborted()
      const path = join(canonical, item.name)
      const entry = { name: relative(root, path), path, type: item.isSymbolicLink() ? 'link' : item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other' }
      const size = Buffer.byteLength(JSON.stringify(entry), 'utf8')
      if (entries.length >= maximum || bytes + size > byteLimit) {
        truncated = true
        budgetReached = true
        break
      }
      entries.push(entry)
      bytes += size
      if (input.recursive && item.isDirectory() && !item.isSymbolicLink()) {
        if (current.depth >= 8)
          truncated = true
        else queue.push({ path, depth: current.depth + 1 })
      }
    }
    if (budgetReached)
      break
  }
  return { path: root, entries, truncated: truncated || queue.length > 0, scope: 'observed-directory-metadata-only' }
}
