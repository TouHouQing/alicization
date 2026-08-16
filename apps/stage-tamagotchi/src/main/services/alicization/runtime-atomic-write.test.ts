import { chmod, mkdir, mkdtemp, readFile, rename, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { writeAlicizationAtomicContent } from './runtime-atomic-write'

const tempRoots: string[] = []

afterEach(async () => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop()
    if (root)
      await rm(root, { recursive: true, force: true })
  }
})

async function createTempRoot() {
  const root = await mkdtemp(join(tmpdir(), 'alicization-atomic-write-'))
  tempRoots.push(root)
  return root
}

function permissions(mode: number) {
  return mode & 0o777
}

describe('writeAlicizationAtomicContent', () => {
  it('tightens existing POSIX directory and file permissions for durable private writes', async () => {
    const root = await createTempRoot()
    const journalDir = join(root, 'journal')
    const target = join(journalDir, 'marker.json')
    await mkdir(journalDir, { mode: 0o777 })
    await chmod(journalDir, 0o777)

    await writeAlicizationAtomicContent({
      path: target,
      category: 'semantic-scale-recovery',
      content: '{"version":2}',
      platform: 'linux',
      directoryMode: 0o700,
      fileMode: 0o600,
    })

    expect(permissions((await stat(journalDir)).mode)).toBe(0o700)
    expect(permissions((await stat(target)).mode)).toBe(0o600)
  })

  it('rejects unsupported fsync errors on POSIX instead of degrading durability', async () => {
    const root = await createTempRoot()
    const target = join(root, 'marker.json')
    const appendAuditLog = vi.fn()
    const fsyncPath = vi.fn(async () => {
      throw Object.assign(new Error('EPERM: operation not permitted, fsync'), {
        code: 'EPERM',
      })
    })

    await expect(writeAlicizationAtomicContent({
      path: target,
      category: 'semantic-scale-recovery',
      content: '{"version":2}',
      platform: 'linux',
      appendAuditLog,
      fsyncPath,
    })).rejects.toThrow('EPERM')
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('retries audited win32 rename failures through the injected rename operation', async () => {
    const root = await createTempRoot()
    const target = join(root, 'marker.json')
    const appendAuditLog = vi.fn()
    const renamePath = vi.fn(async (source: string, destination: string) => {
      if (renamePath.mock.calls.length === 1) {
        throw Object.assign(new Error('EPERM: target is locked'), {
          code: 'EPERM',
        })
      }
      await rename(source, destination)
    })

    await writeAlicizationAtomicContent({
      path: target,
      category: 'semantic-scale-recovery',
      content: '{"version":2}',
      platform: 'win32',
      processId: 123,
      now: () => 456,
      randomId: () => 'fixed',
      appendAuditLog,
      renamePath,
      renameRetryDelaysMs: [0, 0],
      sleep: async () => {},
    })

    await expect(readFile(target, 'utf8')).resolves.toBe('{"version":2}')
    expect(renamePath).toHaveBeenCalledTimes(2)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      category: 'semantic-scale-recovery',
      action: 'rename-retry',
      payload: expect.objectContaining({
        code: 'EPERM',
      }),
    }))
  })

  it('persists content when win32 file fsync reports EPERM and records degraded durability', async () => {
    const root = await createTempRoot()
    const target = join(root, 'SOUL.md')
    const appendAuditLog = vi.fn()
    const fsyncPath = vi.fn(async (path: string) => {
      if (path.endsWith('.tmp')) {
        const error = Object.assign(new Error('EPERM: operation not permitted, fsync'), { code: 'EPERM' })
        throw error
      }
    })

    await writeAlicizationAtomicContent({
      path: target,
      category: 'soul',
      content: '# SOUL\n',
      platform: 'win32',
      processId: 123,
      now: () => 456,
      randomId: () => 'fixed',
      appendAuditLog,
      fsyncPath,
      sleep: async () => {},
    })

    await expect(readFile(target, 'utf-8')).resolves.toBe('# SOUL\n')
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      category: 'soul',
      action: 'file-fsync-degraded',
      payload: expect.objectContaining({
        code: 'EPERM',
        platform: 'win32',
      }),
    }))
  })

  it('persists content when win32 directory fsync reports EPERM and records degraded durability', async () => {
    const root = await createTempRoot()
    const target = join(root, 'SOUL.md')
    const appendAuditLog = vi.fn()
    const fsyncPath = vi.fn(async (path: string) => {
      if (path === root) {
        const error = Object.assign(new Error('EPERM: operation not permitted, fsync'), { code: 'EPERM' })
        throw error
      }
    })

    await writeAlicizationAtomicContent({
      path: target,
      category: 'soul',
      content: '# SOUL\n',
      platform: 'win32',
      processId: 123,
      now: () => 456,
      randomId: () => 'fixed',
      appendAuditLog,
      fsyncPath,
      sleep: async () => {},
    })

    await expect(readFile(target, 'utf-8')).resolves.toBe('# SOUL\n')
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      category: 'soul',
      action: 'directory-fsync-degraded',
      payload: expect.objectContaining({
        platform: 'win32',
      }),
    }))
  })
})
