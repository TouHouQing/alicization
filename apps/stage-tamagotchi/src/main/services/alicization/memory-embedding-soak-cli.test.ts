import type { MemorySemanticScaleSoakReport } from './memory-semantic-scale-soak-harness'
import type { MemorySemanticScaleOperationalProbeReport } from './memory-semantic-scale-soak-runtime'

import { describe, expect, it, vi } from 'vitest'

import {
  parseMemoryEmbeddingSoakCliArgs,
  runMemoryEmbeddingSoakCli,
} from './memory-embedding-soak-cli'

function report(overrides: Partial<MemorySemanticScaleSoakReport> = {}) {
  return {
    version: 'memory-semantic-scale-soak-harness-v1',
    id: 'memory-semantic-scale-job:cli-10k',
    createdAt: 1,
    passed: true,
    summary: {
      corpusSize: 10_000,
      queryCount: 24,
      p95LatencyMs: 4,
      p99LatencyMs: 6,
      recallAtK: 1,
      falseRecallRate: 0,
      coverageRatio: 1,
      failingChecks: [],
    },
    searchMetrics: [],
    providerDegradation: null,
    reindex: null,
    recommendedNextActions: [],
    ...overrides,
  } satisfies MemorySemanticScaleSoakReport
}

function operationalProbes(
  overrides: Partial<MemorySemanticScaleOperationalProbeReport> = {},
): MemorySemanticScaleOperationalProbeReport {
  return {
    version: 'memory-semantic-scale-operational-probes-v1',
    mode: 'sqlite-runtime-fixture',
    createdAt: 1,
    passed: true,
    providerDegradation: {
      id: 'provider-degradation',
      providerError: 'embedding provider failed with HTTP 503',
      fallbackRecallAtK: 1,
      errorVisible: true,
      passed: true,
      failures: [],
    },
    reindex: {
      reindexRequired: true,
      modelSpaceChanged: true,
      progress: {
        total: 1,
        indexed: 0,
        retryable: 0,
        deadLettered: 1,
        cancelled: 0,
        status: 'failed',
        lastError: 'controlled dead letter',
      },
      observations: {
        cancellationObserved: true,
        retryObserved: true,
        deadLetterObserved: true,
        crashRecoveryObserved: true,
      },
      passed: true,
      failures: [],
    },
    lifecycle: {
      cancellation: {
        passed: true,
        finalStatus: 'cancelled',
      },
      retry: {
        passed: true,
        attempts: 2,
        finalStatus: 'completed',
      },
      deadLetter: {
        passed: true,
        attempts: 2,
        deadLettered: 1,
        finalStatus: 'failed',
      },
      crashRecovery: {
        passed: true,
        recoveredLeases: 1,
        finalStatus: 'completed',
      },
    },
    failures: [],
    ...overrides,
  }
}

describe('memory embedding soak CLI', () => {
  it('parses novice-friendly 10k and 100k size aliases', () => {
    expect(parseMemoryEmbeddingSoakCliArgs([
      '--user-data-path',
      '/tmp/alicization',
      '--size',
      '100k',
      '--card-id',
      'card-a',
      '--report',
      '/tmp/embedding-soak.json',
      '--max-p95-ms',
      '120',
      '--max-p99-ms',
      '240',
    ])).toEqual({
      userDataPath: '/tmp/alicization',
      cardId: 'card-a',
      tier: '100k',
      reportPath: '/tmp/embedding-soak.json',
      dimensions: null,
      maxP95LatencyMs: 120,
      maxP99LatencyMs: 240,
    })

    expect(parseMemoryEmbeddingSoakCliArgs(['--size=10000'])).toMatchObject({
      tier: '10k',
      maxP95LatencyMs: 3_000,
      maxP99LatencyMs: 5_000,
    })
  })

  it('runs with the persisted provider, reports provider metadata, and writes JSON without the API key', async () => {
    const executeJob = vi.fn(async (input: { embeddingProvider?: { modelId: string, dimensions: number, vectorSpaceId?: string } | null }) => {
      expect(input.embeddingProvider).toMatchObject({
        modelId: 'BAAI/bge-m3',
        dimensions: 1024,
      })
      return report()
    })
    const writeReport = vi.fn(async () => {})
    const writeOutput = vi.fn()
    const result = await runMemoryEmbeddingSoakCli({
      args: {
        userDataPath: '/tmp/alicization',
        cardId: 'default',
        tier: '10k',
        reportPath: '/tmp/embedding-soak.json',
        dimensions: null,
        maxP95LatencyMs: 3_000,
        maxP99LatencyMs: 5_000,
      },
      resolveProvider: vi.fn(async () => ({
        modelId: 'BAAI/bge-m3',
        dimensions: 1024,
        vectorSpaceId: 'embedding-space:v1:test',
        embedTexts: vi.fn(async (texts: string[]) => texts.map(text => ({
          text,
          vector: Array.from({ length: 1024 }, () => 0),
        }))),
      })),
      executeJob,
      runOperationalProbes: vi.fn(async () => operationalProbes()),
      writeReport,
      writeOutput,
      createTempDir: vi.fn(async () => '/tmp/embedding-soak-job'),
      removeTempDir: vi.fn(async () => {}),
      now: () => 1,
    })

    expect(result.exitCode).toBe(0)
    expect(result.report).toMatchObject({
      passed: true,
      embedding: {
        configured: true,
        modelId: 'BAAI/bge-m3',
        dimensions: 1024,
        vectorSpaceId: 'embedding-space:v1:test',
      },
      acceptance: {
        passed: true,
        requiredCorpusSize: 10_000,
        maxP95LatencyMs: 3_000,
        maxP99LatencyMs: 5_000,
      },
    })
    expect(JSON.stringify(result.report)).not.toContain('secret')
    expect(writeReport).toHaveBeenCalledWith('/tmp/embedding-soak.json', expect.stringContaining('"embedding"'))
    expect(writeOutput).toHaveBeenCalledOnce()
  })

  it('returns a transparent non-zero report when no embedding provider is configured', async () => {
    const result = await runMemoryEmbeddingSoakCli({
      args: {
        userDataPath: '/tmp/alicization',
        cardId: 'default',
        tier: '10k',
        reportPath: '/tmp/embedding-soak.json',
        dimensions: null,
        maxP95LatencyMs: 3_000,
        maxP99LatencyMs: 5_000,
      },
      resolveProvider: vi.fn(async () => null),
      executeJob: vi.fn(async (input: { embeddingProvider?: unknown }) => {
        expect(input.embeddingProvider).toBeNull()
        return report({
          passed: false,
          summary: {
            ...report().summary,
            failingChecks: ['production-provider-required'],
          },
        })
      }),
      runOperationalProbes: vi.fn(async () => operationalProbes()),
      writeReport: vi.fn(async () => {}),
      writeOutput: vi.fn(),
      createTempDir: vi.fn(async () => '/tmp/embedding-soak-job'),
      removeTempDir: vi.fn(async () => {}),
      now: () => 1,
    })

    expect(result.exitCode).toBe(2)
    expect(result.report).toMatchObject({
      passed: false,
      embedding: {
        configured: false,
        modelId: null,
      },
    })
  })

  it('fails the report gate when operational probes are missing instead of treating unexecuted coverage as passed', async () => {
    const result = await runMemoryEmbeddingSoakCli({
      args: {
        userDataPath: '/tmp/alicization',
        cardId: 'default',
        tier: '100k',
        reportPath: '/tmp/embedding-soak.json',
        dimensions: null,
        maxP95LatencyMs: 100,
        maxP99LatencyMs: 200,
      },
      resolveProvider: vi.fn(async () => ({
        modelId: 'BAAI/bge-m3',
        dimensions: 1024,
        vectorSpaceId: 'embedding-space:v1:test',
        embedTexts: vi.fn(async (texts: string[]) => texts.map(text => ({
          text,
          vector: Array.from({ length: 1024 }, () => 0),
        }))),
      })),
      executeJob: vi.fn(async () => report({
        summary: {
          ...report().summary,
          corpusSize: 100_000,
          p95LatencyMs: 90,
          p99LatencyMs: 150,
        },
      })),
      runOperationalProbes: vi.fn(async () => null),
      writeReport: vi.fn(async () => {}),
      writeOutput: vi.fn(),
      createTempDir: vi.fn(async () => '/tmp/embedding-soak-job'),
      removeTempDir: vi.fn(async () => {}),
      now: () => 1,
    })

    expect(result.exitCode).toBe(2)
    expect(result.report).toMatchObject({
      passed: false,
      acceptance: {
        passed: false,
      },
      summary: {
        failingChecks: expect.arrayContaining([
          'provider-degradation-probe-missing',
          'model-switch-reindex-probe-missing',
          'reindex-cancellation-probe-missing',
          'reindex-retry-probe-missing',
          'reindex-dead-letter-probe-missing',
          'reindex-crash-recovery-probe-missing',
        ]),
      },
    })
  })
})
