import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

import { afterEach, describe, expect, it } from 'vitest'

import { executeMemorySemanticScaleJob } from './memory-semantic-scale-job-runtime'

const sandboxDirs: string[] = []

async function runProductionSoak(corpusSize: 10_000 | 100_000) {
  const tempDir = await mkdtemp(join(tmpdir(), 'alicization-semantic-scale-production-test-'))
  sandboxDirs.push(tempDir)
  const startedAt = performance.now()
  const report = await executeMemorySemanticScaleJob({
    jobId: `production-${corpusSize}`,
    cardId: 'card-production-soak',
    tier: corpusSize === 100_000 ? '100k' : '10k',
    corpusSize,
    createdAt: Date.parse('2026-08-16T00:00:00.000Z'),
    tempDir,
    signal: new AbortController().signal,
    onProgress: async () => {},
  })
  return {
    elapsedMs: performance.now() - startedAt,
    report,
  }
}

afterEach(async () => {
  await Promise.all(sandboxDirs.splice(0).map(dir =>
    rm(dir, { recursive: true, force: true })))
})

describe('memory semantic scale production job execution', () => {
  it('runs the production sqlite-vec job path at 10k scale', async () => {
    const result = await runProductionSoak(10_000)

    expect(result.report.passed, JSON.stringify(result.report.summary)).toBe(true)
    expect(result.report.summary.corpusSize).toBe(10_000)
    expect(result.report.searchMetrics).toEqual([
      expect.objectContaining({
        corpusSize: 10_000,
        indexMode: 'sqlite-vec',
        nativeIndexReady: true,
      }),
    ])
    expect(result.elapsedMs).toBeLessThan(60_000)
  }, 60_000)

  it.runIf(process.env.ALICIZATION_MEMORY_SOAK_100K === '1')(
    'runs the production sqlite-vec job path at 100k scale within the soak budget',
    async () => {
      const result = await runProductionSoak(100_000)

      expect(result.report.passed, JSON.stringify(result.report.summary)).toBe(true)
      expect(result.report.summary.corpusSize).toBe(100_000)
      expect(result.report.searchMetrics).toEqual([
        expect.objectContaining({
          corpusSize: 100_000,
          indexMode: 'sqlite-vec',
          nativeIndexReady: true,
        }),
      ])
      expect(result.elapsedMs).toBeLessThan(180_000)
    },
    180_000,
  )
})
