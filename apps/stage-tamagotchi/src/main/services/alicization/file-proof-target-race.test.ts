import { createHash } from 'node:crypto'
import { mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { verifyLifeFileProof } from './life-goal-verifier'

vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>()
  return { ...actual, realpath: vi.fn(actual.realpath) }
})

it('refuses the old open handle when the accepted target name is replaced during byte verification', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-proof-target-race-'))
  const path = join(root, 'target.txt')
  const displaced = join(root, 'displaced.txt')
  const text = 'The originally expected contents'
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  await writeFile(path, text)
  vi.mocked(realpath)
    .mockImplementationOnce(() => actual.realpath(path))
    .mockImplementationOnce(async () => {
      await rename(path, displaced)
      await writeFile(path, 'A different file now occupies the accepted target name')
      return actual.realpath(path)
    })
  try {
    const result = await verifyLifeFileProof({ path, contentHash: createHash('sha256').update(text).digest('hex') })
    expect(result.verdict).toBe('unknown')
    expect(result.evidence.reason).toBe('file-target-changed-during-verification')
    expect(await readFile(displaced, 'utf8')).toBe(text)
    expect(await readFile(path, 'utf8')).toBe('A different file now occupies the accepted target name')
  }
  finally { await rm(root, { recursive: true, force: true }) }
})
