import { mkdtemp, readFile, rmdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupFileLogger } from './file-logger'

const fixture = vi.hoisted(() => ({ userData: '' }))
vi.mock('electron', () => ({ app: { getPath: () => fixture.userData } }))

describe('file logger descriptor lifetime with real filesystem writes', () => {
  let logPath: string | null = null
  afterEach(async () => {
    if (logPath)
      await unlink(logPath)
    if (fixture.userData) {
      await rmdir(join(fixture.userData, 'logs'))
      await rmdir(fixture.userData)
    }
  })

  it('drains concurrent accepted writes and closes without waiting on a FileHandle reference', async () => {
    fixture.userData = await mkdtemp(join(tmpdir(), 'alicization-file-logger-'))
    const logger = await setupFileLogger()
    logPath = logger.logFilePath
    expect(logPath).toBeTruthy()
    const lines = Array.from({ length: 1000 }, (_, index) => `accepted-${index}`)
    const pending = lines.map(line => logger.appendLog(line))
    const closing = logger.close()
    await logger.appendLog('late-entry')
    await Promise.all([...pending, closing, logger.close()])
    const content = await readFile(logPath!, 'utf8')
    expect(content.split('\n').slice(1, -1)).toEqual(lines)
    expect(content).not.toContain('late-entry')
  })
})
