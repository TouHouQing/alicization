import { mkdtemp, readFile, rm } from 'node:fs/promises'
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

describe('writeAlicizationAtomicContent', () => {
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

    await writeAlicizationAtomicContent({
      path: target,
      category: 'soul',
      content: '# SOUL\n',
      platform: 'win32',
      processId: 123,
      now: () => 456,
      randomId: () => 'fixed',
      appendAuditLog,
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
