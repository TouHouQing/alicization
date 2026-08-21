import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { executeMemorySemanticScaleJob } from './memory-semantic-scale-job-runtime'

const sandboxDirs: string[] = []

function createTestEmbeddingProvider(): LongTermMemoryEmbeddingProvider {
  const vectorFor = (index: number, dimensions: number, query: boolean) => {
    let state = (Math.imul(index + 1, 0x9E3779B1) ^ 0x85EBCA6B) >>> 0
    const vector = Array.from({ length: dimensions }, (_item, dimension) => {
      state ^= state << 13
      state ^= state >>> 17
      state ^= state << 5
      const centered = ((state >>> 0) / 0xFFFF_FFFF) * 2 - 1
      return centered + ((index + dimension) % dimensions === 0 ? 0.05 : 0)
    })
    if (query)
      vector[0] = (vector[0] ?? 0) + 0.001
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
    return vector.map(value => value / norm)
  }

  return {
    modelId: 'semantic-scale-test-provider',
    dimensions: 12,
    embedTexts: async texts => texts.map((text) => {
      const match = text.match(/(\d{8})$/u)
      const index = match ? Number(match[1]) : 0
      return {
        text,
        vector: vectorFor(index, 12, text.includes(' query about ')),
      }
    }),
  }
}

async function runProductionSoak(
  corpusSize: 10_000 | 100_000,
  embeddingProvider?: LongTermMemoryEmbeddingProvider,
  resourceProbe?: {
    statfs: (path: string) => Promise<{ bavail: number, bsize: number }>
    freemem: () => number
  },
) {
  const tempDir = await mkdtemp(join(tmpdir(), 'alicization-semantic-scale-production-test-'))
  sandboxDirs.push(tempDir)
  const startedAt = performance.now()
  const report = await executeMemorySemanticScaleJob({
    jobId: `production-${corpusSize}`,
    cardId: 'card-production-soak',
    tier: corpusSize === 100_000 ? '100k' : '10k',
    corpusSize,
    embeddingProvider,
    resourceProbe,
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
  it('fails transparently when the production job has no configured embedding provider', async () => {
    const result = await runProductionSoak(10_000)

    expect(result.report.passed).toBe(false)
    expect(result.report.summary.failingChecks).toContain('production-provider-required')
    expect(result.report.resourceMetrics).toEqual(expect.objectContaining({
      dimensions: 12,
      vectorInput: 'unavailable',
      elapsedMs: expect.any(Number),
      peakRssBytes: expect.any(Number),
      sqliteBytes: expect.any(Number),
      sqliteWalBytes: expect.any(Number),
      cpuUserMs: expect.any(Number),
      cpuSystemMs: expect.any(Number),
    }))
  }, 60_000)

  it('fails fast when the production resource preflight predicts exhaustion', async () => {
    const embedTexts = vi.fn(async (texts: string[]) => texts.map((text: string, index: number) => ({
      text,
      vector: Array.from({ length: 12 }, (_item, vectorIndex) =>
        vectorIndex === index ? 1 : 0),
    })))
    const result = await runProductionSoak(10_000, {
      modelId: 'semantic-scale-test-provider',
      dimensions: 12,
      embedTexts,
    }, {
      statfs: async () => ({
        bavail: 0,
        bsize: 1,
      }),
      freemem: () => 0,
    })

    expect(result.report.passed).toBe(false)
    expect(result.report.summary.failingChecks).toContain('resource-preflight-failed')
    expect(embedTexts).not.toHaveBeenCalled()
    expect(result.report.searchMetrics).toEqual([])
  }, 60_000)

  it.runIf(process.env.ALICIZATION_MEMORY_SOAK_100K === '1')(
    'runs the production sqlite-vec job path at 100k scale within the soak budget',
    async () => {
      const result = await runProductionSoak(100_000, createTestEmbeddingProvider())

      expect(result.report.passed, JSON.stringify(result.report.summary)).toBe(true)
      expect(result.report.summary.corpusSize).toBe(100_000)
      expect(result.report.searchMetrics).toEqual([
        expect.objectContaining({
          corpusSize: 100_000,
          indexMode: 'sqlite-vec',
          nativeIndexReady: true,
        }),
      ])
      expect(result.report.resourceMetrics).toEqual(expect.objectContaining({
        dimensions: 12,
        vectorInput: 'provider',
        elapsedMs: expect.any(Number),
        peakRssBytes: expect.any(Number),
        sqliteBytes: expect.any(Number),
        sqliteWalBytes: expect.any(Number),
        cpuUserMs: expect.any(Number),
        cpuSystemMs: expect.any(Number),
      }))
      expect(result.elapsedMs).toBeLessThan(180_000)
    },
    180_000,
  )
})
