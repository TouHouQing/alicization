import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, realpath, rm, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, join } from 'node:path'

import { assertExecutionStorageCapacity } from './storage-budget'

/** Copy bounded, stable bytes before approval so the selected file cannot drift. */
export async function prepareBrowserUpload(paths: string[], root: string, signal?: AbortSignal) {
  if (paths.length < 1 || paths.length > 4 || paths.some(path => typeof path !== 'string' || !isAbsolute(path)))
    throw new Error('BROWSER_UPLOAD_REQUIRES_ONE_TO_FOUR_ABSOLUTE_FILES')
  const id = randomUUID()
  await assertExecutionStorageCapacity(root, 16 * 1024 * 1024)
  signal?.throwIfAborted()
  await mkdir(root, { recursive: true })
  const stage = join(await realpath(root), id)
  await mkdir(stage)
  const files: Array<{ original: string, path: string, name: string, bytes: number, sha256: string }> = []
  try {
    let total = 0
    for (const [index, path] of paths.entries()) {
      signal?.throwIfAborted()
      const original = await realpath(path)
      const file = await open(original, 'r')
      try {
        const before = await file.stat()
        if (!before.isFile() || before.size > 4 * 1024 * 1024 || total + before.size > 16 * 1024 * 1024)
          throw new Error('BROWSER_UPLOAD_BYTE_BUDGET')
        const buffer = Buffer.alloc(before.size + 1)
        let count = 0
        while (count < buffer.length) {
          signal?.throwIfAborted()
          const { bytesRead } = await file.read(buffer, count, Math.min(65536, buffer.length - count), count)
          if (!bytesRead)
            break
          count += bytesRead
        }
        const bytes = buffer.subarray(0, count)
        const after = await file.stat()
        if (before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || bytes.length !== before.size)
          throw new Error('BROWSER_UPLOAD_SOURCE_CHANGED')
        signal?.throwIfAborted()
        total += bytes.length
        const directory = join(stage, String(index))
        await mkdir(directory)
        const name = basename(original)
        const snapshot = join(directory, name)
        await writeFile(snapshot, bytes, { flag: 'wx', mode: 0o600 })
        files.push({ original, path: snapshot, name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
      }
      finally { await file.close() }
    }
    return { id, files, dispose: () => rm(stage, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) }
  }
  catch (error) { await rm(stage, { recursive: true, force: true }); throw error }
}
