import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFileLogger } from './file-logger'

const fixture = vi.hoisted(() => ({
  appendFile: vi.fn(),
  close: vi.fn(),
}))
vi.mock('electron', () => ({ app: { getPath: () => 'C:/qa-user-data' } }))
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  stat: vi.fn(async () => ({ size: 100 })),
  open: vi.fn(async () => ({ fd: 42, ...fixture })),
}))

describe('file logger shutdown', () => {
  beforeEach(() => {
    fixture.appendFile.mockReset().mockResolvedValue(undefined)
    fixture.close.mockReset().mockResolvedValue(undefined)
  })

  it('drains accepted writes in order, closes once, and refuses late entries', async () => {
    const logger = await setupFileLogger()
    let release!: () => void
    fixture.appendFile.mockImplementationOnce(() => new Promise<void>((resolve) => {
      release = resolve
    }))
    const first = logger.appendLog('first')
    const second = logger.appendLog('second')
    const close = logger.close()
    const repeatedClose = logger.close()
    await logger.appendLog('late')
    expect(fixture.close).not.toHaveBeenCalled()
    release()
    await Promise.all([first, second, close, repeatedClose])
    expect(fixture.appendFile.mock.calls.slice(1).map(call => call[0])).toEqual(['first\n', 'second\n'])
    expect(fixture.close).toHaveBeenCalledOnce()
  })

  it('continues draining after a failed write and still releases the file', async () => {
    const logger = await setupFileLogger()
    fixture.appendFile.mockRejectedValueOnce(new Error('Disk write failed'))
    await Promise.all([logger.appendLog('failed'), logger.appendLog('next'), logger.close()])
    expect(fixture.appendFile).toHaveBeenLastCalledWith('next\n')
    expect(fixture.close).toHaveBeenCalledOnce()
  })

  it('reports a close failure so application exit cannot declare a clean flush', async () => {
    const logger = await setupFileLogger()
    fixture.close.mockRejectedValueOnce(new Error('Close failed'))
    await expect(logger.close()).rejects.toThrow('Close failed')
    await logger.appendLog('too late')
    expect(fixture.appendFile).toHaveBeenCalledOnce()
    expect(fixture.close).toHaveBeenCalledOnce()
  })
})
