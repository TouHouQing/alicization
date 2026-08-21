import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  return {
    ...actual,
    statfs: vi.fn(async () => ({
      bavail: 1,
      bsize: 1,
    })),
  }
})

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os')
  return {
    ...actual,
    freemem: vi.fn(() => 1),
  }
})

const sandboxDirs: string[] = []

afterEach(async () => {
  await Promise.all(sandboxDirs.splice(0).map(dir =>
    rm(dir, { recursive: true, force: true })))
})

describe('memory semantic scale resource gate', () => {
  it('fails before native index initialization when the resource preflight cannot pass', async () => {
    const { executeMemorySemanticScaleJob } = await import('./memory-semantic-scale-job-runtime')
    const tempDir = await mkdtemp(join(tmpdir(), 'alicization-semantic-scale-resource-gate-'))
    sandboxDirs.push(tempDir)

    const report = await executeMemorySemanticScaleJob({
      jobId: 'resource-gate-failure',
      cardId: 'card-resource-gate',
      tier: '10k',
      corpusSize: 10_000,
      embeddingProvider: {
        modelId: 'resource-gate-provider',
        dimensions: 12,
        embedTexts: async texts => texts.map(text => ({
          text,
          vector: Array.from({ length: 12 }, () => 0),
        })),
      },
      createdAt: 1,
      tempDir,
      signal: new AbortController().signal,
      onProgress: async () => {},
    })

    expect(report.passed).toBe(false)
    expect(report.searchMetrics).toEqual([])
    expect(report.resourcePreflight).toMatchObject({
      passed: false,
      failures: ['disk-space-insufficient', 'memory-headroom-insufficient'],
    })
    expect(report.summary.failingChecks).toEqual(expect.arrayContaining([
      'resource-preflight-failed',
      'production-search-observations-missing',
    ]))
  })
})
