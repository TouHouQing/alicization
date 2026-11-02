import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { open, realpath, stat } from 'node:fs/promises'

/** Bound the read itself, including a file growing or being replaced after open. */
export async function readStableExecutionArtifact(path: string, maximumBytes = 4_194_304) {
  const resolved = await realpath(path)
  const file = await open(resolved, 'r')
  try {
    const before = await file.stat()
    if (!before.isFile() || before.size > maximumBytes)
      throw new Error('ARTIFACT_OUTSIDE_VERIFICATION_BUDGET')
    const bytes = Buffer.alloc(before.size)
    let position = 0
    while (position < bytes.length) {
      const read = await file.read(bytes, position, bytes.length - position, position)
      if (read.bytesRead === 0)
        break
      position += read.bytesRead
    }
    const after = await file.stat()
    const current = await stat(path)
    if (position !== before.size || await realpath(path) !== resolved || [after, current].some(value => value.dev !== before.dev || value.ino !== before.ino || value.size !== before.size || value.mtimeMs !== before.mtimeMs || value.ctimeMs !== before.ctimeMs))
      throw new Error('ARTIFACT_CHANGED_DURING_VERIFICATION')
    return { bytes, sha256: createHash('sha256').update(bytes).digest('hex') }
  }
  finally { await file.close() }
}
