import { describe, expect, it } from 'vitest'

import {
  runMemorySemanticScaleSoakHarness,
} from './memory-semantic-scale-soak-harness'

describe('memory semantic scale soak harness', () => {
  it('fails the production gate when deterministic vectors, self queries, or missing resource preflight are used', () => {
    const report = runMemorySemanticScaleSoakHarness({
      id: 'semantic-scale-production-fake',
      createdAt: 1,
      gate: 'production',
      resourcePreflight: null,
      searches: [{
        id: 'deterministic-self-query',
        corpusSize: 100_000,
        indexMode: 'sqlite-vec',
        approximate: false,
        degraded: false,
        nativeIndexReady: true,
        coverageRatio: 1,
        vectorInput: 'deterministic',
        adapterImplementation: 'unknown',
        queries: [{
          id: 'self-query',
          queryText: 'same vector as the stored record',
          queryMode: 'self',
          queryVectorHash: 'same',
          expectedVectorHash: 'same',
          expectedTopIds: ['expected'],
          returnedIds: ['expected'],
          latencyMs: 1,
        }],
      }],
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failingChecks).toEqual(expect.arrayContaining([
      'production-provider-required',
      'production-adapter-identity-missing',
      'resource-preflight-missing',
      'self-query-used',
    ]))
  })

  it('fails the production gate when resource preflight predicts insufficient disk or memory', () => {
    const report = runMemorySemanticScaleSoakHarness({
      id: 'semantic-scale-resource-preflight',
      createdAt: 1,
      gate: 'production',
      resourcePreflight: {
        passed: false,
        requiredDiskBytes: 10_000,
        availableDiskBytes: 1,
        requiredMemoryBytes: 10_000,
        availableMemoryBytes: 1,
        failures: ['disk-space-insufficient', 'memory-headroom-insufficient'],
      },
      searches: [],
    })

    expect(report.passed).toBe(false)
    expect(report.resourcePreflight).toMatchObject({
      passed: false,
      failures: ['disk-space-insufficient', 'memory-headroom-insufficient'],
    })
    expect(report.summary.failingChecks).toEqual(expect.arrayContaining([
      'resource-preflight-failed',
    ]))
  })

  it('evaluates 10k-scale vector search, provider degradation, model switch reindex, and durable job recovery', () => {
    const report = runMemorySemanticScaleSoakHarness({
      id: 'semantic-scale-10k',
      createdAt: Date.parse('2026-08-04T14:30:00.000Z'),
      minimumCorpusSize: 10_000,
      maxP95LatencyMs: 120,
      maxP99LatencyMs: 240,
      minimumCoverageRatio: 0.999,
      searches: [{
        id: 'sqlite-vec-10k',
        corpusSize: 10_000,
        indexMode: 'sqlite-vec',
        approximate: false,
        degraded: false,
        nativeIndexReady: true,
        coverageRatio: 1,
        queries: [
          {
            id: 'query-provider-transparency',
            expectedTopIds: ['reflection-provider-transparency'],
            returnedIds: ['reflection-provider-transparency', 'reflection-unrelated'],
            latencyMs: 42,
          },
          {
            id: 'query-working-memory-owner',
            expectedTopIds: ['fact-working-memory-owner'],
            returnedIds: ['fact-working-memory-owner'],
            latencyMs: 77,
          },
          {
            id: 'query-temporal-update',
            expectedTopIds: ['fact-current-preference'],
            returnedIds: ['fact-current-preference'],
            latencyMs: 101,
          },
        ],
      }],
      providerDegradation: {
        id: 'provider-outage-lexical-fallback',
        providerError: 'embedding provider failed with HTTP 503',
        lexicalFallbackIds: ['reflection-provider-transparency'],
        expectedTopIds: ['reflection-provider-transparency'],
        errorVisible: true,
      },
      reindex: {
        previous: {
          modelId: 'embedding-old',
          dimensions: 768,
          vectorSpaceId: 'space-old',
        },
        active: {
          modelId: 'embedding-new',
          dimensions: 1024,
          vectorSpaceId: 'space-new',
        },
        reindexRequired: true,
        progress: {
          total: 10_000,
          indexed: 9_998,
          retryable: 0,
          deadLettered: 2,
          cancelled: 0,
          status: 'failed',
          lastError: 'two items dead-lettered after provider retries',
        },
        observations: {
          cancellationObserved: true,
          retryObserved: true,
          deadLetterObserved: true,
          crashRecoveryObserved: true,
        },
      },
    })

    expect(report.passed).toBe(true)
    expect(report.summary.corpusSize).toBe(10_000)
    expect(report.searchMetrics[0]?.p95LatencyMs).toBe(101)
    expect(report.searchMetrics[0]?.p99LatencyMs).toBe(101)
    expect(report.searchMetrics[0]?.recallAtK).toBe(1)
    expect(report.providerDegradation?.passed).toBe(true)
    expect(report.reindex?.passed).toBe(true)
    expect(report.recommendedNextActions).toEqual([])
  })

  it('fails loudly when the native index degrades, recall leaks, or reindex state is hidden', () => {
    const report = runMemorySemanticScaleSoakHarness({
      id: 'semantic-scale-degraded',
      createdAt: 1,
      minimumCorpusSize: 10_000,
      maxP95LatencyMs: 100,
      maxP99LatencyMs: 200,
      minimumCoverageRatio: 0.99,
      searches: [{
        id: 'brute-force-degraded',
        corpusSize: 10_000,
        indexMode: 'brute-force',
        approximate: false,
        degraded: true,
        nativeIndexReady: false,
        coverageRatio: 0.8,
        queries: [{
          id: 'leaky-query',
          expectedTopIds: ['expected'],
          returnedIds: ['wrong-thread'],
          forbiddenIds: ['wrong-thread'],
          latencyMs: 250,
        }],
      }],
      providerDegradation: {
        id: 'provider-error-hidden',
        providerError: 'provider unavailable',
        lexicalFallbackIds: [],
        expectedTopIds: ['expected'],
        errorVisible: false,
      },
      reindex: {
        previous: {
          modelId: 'same-model',
          dimensions: 3,
          vectorSpaceId: 'space-a',
        },
        active: {
          modelId: 'same-model',
          dimensions: 3,
          vectorSpaceId: 'space-b',
        },
        reindexRequired: false,
        progress: {
          total: 2,
          indexed: 0,
          retryable: 1,
          deadLettered: 0,
          cancelled: 0,
          status: 'running',
          lastError: null,
        },
        observations: {
          cancellationObserved: false,
          retryObserved: false,
          deadLetterObserved: false,
          crashRecoveryObserved: false,
        },
      },
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failingChecks).toEqual(expect.arrayContaining([
      'index-mode-degraded',
      'coverage-too-low',
      'latency-p95-too-high',
      'semantic-recall-miss',
      'provider-error-not-visible',
      'model-switch-reindex-missing',
      'reindex-recovery-observation-missing',
    ]))
    expect(report.recommendedNextActions.length).toBeGreaterThan(0)
  })
})
