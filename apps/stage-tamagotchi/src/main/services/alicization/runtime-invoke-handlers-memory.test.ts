import { describe, expect, it, vi } from 'vitest'

import {
  electronAlicizationMemoryWorkbenchCancelQualityTrial,
  electronAlicizationMemoryWorkbenchListQualityTrialReports,
  electronAlicizationMemoryWorkbenchManageSemanticScaleJobs,
  electronAlicizationMemoryWorkbenchManageWorkingMemoryCleaningQueue,
  electronAlicizationMemoryWorkbenchRunQualityTrial,
} from '../../../shared/eventa'
import { registerAlicizationMemoryInvokeHandlers } from './runtime-invoke-handlers-memory'

function createQualityTrialReportWithPrivateDiagnostics() {
  return {
    version: 'memory-production-trial-runner-v1',
    id: 'quality-private',
    cardId: 'card-a',
    createdAt: 1,
    passed: false,
    summary: {
      dialogueReplayCount: 1,
      workingMemoryFixtureCount: 0,
      compressedContextBehaviorFixtureCount: 0,
      temporalConflictFixtureCount: 0,
      semanticScaleSoakRunCount: 0,
      experienceQualityFixtureCount: 0,
      scopeFuzzCaseCount: 0,
      longTermFixtureCount: 0,
      userTrialCount: 0,
      personaTrainingFixtureCount: 0,
      goldLabelCount: 0,
      goldRegressionPackId: null,
      failingStageIds: ['dialogue-replay'],
      notRunStageIds: [],
      optimizationFindingCount: 0,
      recommendedActionCount: 1,
      lastError: '模型服务请求超时：user_input=private-quality-error-sentinel Bearer private-secret-sentinel',
      privateSummaryDiagnostic: 'private-summary-diagnostic-sentinel',
    },
    stages: [{
      stage: 'dialogue-replay',
      id: 'dialogue-replay',
      passed: false,
      itemCount: 1,
      error: '模型服务请求超时：user_input=private-quality-error-sentinel Bearer private-secret-sentinel',
      privateStageDiagnostic: 'private-stage-diagnostic-sentinel',
    }],
    dialogueReplay: {
      version: 'memory-db-dialogue-replay-report-v1',
      id: 'replay-private',
      passed: false,
      createdAt: 1,
      summary: {
        turnCount: 1,
        succeededTurnCount: 0,
        failedTurnCount: 1,
        checkpointWriteCount: 0,
        personaWriteCount: 0,
        recalledEvidenceCount: 0,
        lastError: '模型服务请求超时：user_input=private-quality-error-sentinel Bearer private-secret-sentinel',
        privateDialogueDiagnostic: 'private-dialogue-diagnostic-sentinel',
      },
      turns: [{
        turnId: 'turn-private',
        providerMessages: [{
          role: 'user',
          content: 'private-provider-message-sentinel',
        }],
        providerOutput: 'private-provider-output-sentinel',
      }],
    },
    liveProviderTrial: null,
    runtimeHealth: {
      queue: {
        pending: 0,
        review: 0,
        applied: 0,
        failed: 1,
        deadLettered: 0,
      },
      recall: {
        lastLatencyMs: 10,
        p95LatencyMs: 20,
        lastError: 'recall failed: private-quality-error-sentinel',
      },
      embedding: {
        providerConfigured: true,
        modelId: 'embedding-model',
        dimensions: 1024,
        vectorSpaceId: 'embedding-space',
        reindexRequired: false,
        indexMode: 'sqlite-vec',
        approximate: false,
        degraded: true,
        nativeIndexReady: true,
        searchReady: true,
        lastError: 'embedding provider failed: private-quality-error-sentinel',
        canonicalCount: 1,
        indexedCount: 1,
        missingCount: 0,
        textHashMismatchCount: 0,
        staleOrFailedCount: 0,
        orphanedCount: 0,
        coverageRatio: 1,
        reindexJob: null,
      },
      errors: ['database failed: private-quality-error-sentinel'],
      privateRuntimeDiagnostic: 'private-runtime-diagnostic-sentinel',
    },
    quality: {
      version: 'memory-quality-harness-v1',
      passed: false,
      createdAt: 1,
      summary: {
        longTermFixtureCount: 0,
        workingMemoryFixtureCount: 0,
        userTrialCount: 0,
        personaTrainingFixtureCount: 0,
        failingFixtureIds: ['fixture-private'],
        recallAtK: 0,
        recallAt1: 0,
        recallAt3: 0,
        recallAt5: 0,
        wrongThreadRate: 0,
        semanticHitRate: 0,
        sourceTraceRate: 0,
        abstentionPrecision: 0,
        abstentionRecall: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        compressionLossCount: 0,
        blockedLeakCount: 0,
        optimizationFindingCount: 0,
        lastError: '模型服务请求超时：user_input=private-quality-error-sentinel Bearer private-secret-sentinel',
        privateQualityDiagnostic: 'private-quality-diagnostic-sentinel',
      },
      traces: [{
        fixtureId: 'fixture-private',
        rawDiagnostic: 'private-quality-trace-sentinel',
      }],
      longTerm: [],
      workingMemory: [],
      userTrials: [],
      personaTraining: [],
      optimizationFindings: [],
      recommendedNextActions: ['retry the provider with private-quality-action-sentinel'],
    },
    goldRegressionPack: null,
    regression: {
      recallAt1: 0,
      recallAt3: 0,
      recallAt5: 0,
      wrongThreadRate: 0,
      semanticHitRate: 0,
      sourceTraceRate: 0,
      abstentionPrecision: 0,
      abstentionRecall: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      staleMemoryLeakRate: null,
      temporalUpdateAccuracy: null,
      providerFailureRate: 1,
      queueFailureRate: 0,
      deadLetterRate: 0,
      embeddingCoverageRatio: null,
      privateRegressionDiagnostic: 'private-regression-diagnostic-sentinel',
    },
    compressedContextBehavior: null,
    temporalConflict: null,
    semanticScaleSoak: null,
    experienceQuality: null,
    scopeFuzz: null,
    recommendedNextActions: ['retry the provider with private-quality-action-sentinel'],
  }
}

describe('alicization memory invoke handlers', () => {
  it('propagates quality trial cancellation to the active card controller', async () => {
    const handlers = new Map<unknown, (payload: Record<string, unknown>) => Promise<unknown>>()
    let resolveStarted: (() => void) | undefined
    let observedSignal: AbortSignal | undefined
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve
    })
    const runMemoryWorkbenchProductionTrial = vi.fn(async (input: {
      signal?: AbortSignal
    }) => {
      observedSignal = input.signal
      resolveStarted?.()
      await new Promise<void>((resolve) => {
        input.signal?.addEventListener('abort', () => resolve(), { once: true })
      })
      return {
        ...createQualityTrialReportWithPrivateDiagnostics(),
        id: 'cancelled-quality-trial',
      }
    })

    registerAlicizationMemoryInvokeHandlers({
      registerInvokeHandler: (channel: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, async payload => await handler(payload))
      },
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      cardIdFrom: (scope?: { cardId?: string }) => scope?.cardId ?? 'default',
      getAlicizationDb: () => ({
        runMemoryWorkbenchProductionTrial,
      }),
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as unknown as Parameters<typeof registerAlicizationMemoryInvokeHandlers>[0])

    const runPromise = handlers.get(electronAlicizationMemoryWorkbenchRunQualityTrial)?.({
      cardId: 'card-a',
      mode: 'live-provider',
      sessionId: 'session-a',
    })
    await started

    const cancelResult = await handlers.get(electronAlicizationMemoryWorkbenchCancelQualityTrial)?.({
      cardId: 'card-a',
      reason: 'user cancelled quality trial',
    })

    expect(cancelResult).toEqual({
      cardId: 'card-a',
      cancelled: true,
      reason: 'user cancelled quality trial',
    })
    expect(observedSignal?.aborted).toBe(true)
    await expect(runPromise).resolves.toMatchObject({ id: 'cancelled-quality-trial' })
  })

  it('routes semantic scale job controls through the active card DB facade', async () => {
    const handlers = new Map<unknown, (payload: Record<string, unknown>) => Promise<unknown>>()
    const manageMemoryWorkbenchSemanticScaleJobs = vi.fn(async (payload: {
      cardId: string
      jobId?: string
      tier?: string
    }) => ({
      job: {
        jobId: payload.jobId ?? 'semantic-job-1',
        cardId: payload.cardId,
        tier: payload.tier ?? '10k',
        status: 'queued',
      },
      jobs: [],
    }))

    registerAlicizationMemoryInvokeHandlers({
      registerInvokeHandler: (channel: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, async payload => await handler(payload))
      },
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      cardIdFrom: (scope?: { cardId?: string }) => scope?.cardId ?? 'default',
      getAlicizationDb: () => ({
        manageMemoryWorkbenchSemanticScaleJobs,
      }),
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as unknown as Parameters<typeof registerAlicizationMemoryInvokeHandlers>[0])

    const handler = handlers.get(electronAlicizationMemoryWorkbenchManageSemanticScaleJobs)
    expect(handler).toBeDefined()

    await handler?.({
      cardId: 'card-a',
      action: 'start',
      tier: '100k',
      reason: 'run production scale',
      limit: 30,
    })

    expect(manageMemoryWorkbenchSemanticScaleJobs).toHaveBeenCalledWith({
      cardId: 'card-a',
      action: 'start',
      jobId: undefined,
      tier: '100k',
      reason: 'run production scale',
      limit: 30,
    })
  })

  it('sanitizes and routes WorkingMemory cleaning failure listing and retry actions', async () => {
    const handlers = new Map<unknown, (payload: Record<string, any>) => Promise<unknown>>()
    const manageMemoryWorkbenchWorkingMemoryCleaningQueue = vi.fn(async () => ({
      items: [],
      nextCursor: null,
      retried: [],
    }))

    registerAlicizationMemoryInvokeHandlers({
      registerInvokeHandler: (channel: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, async payload => await handler(payload))
      },
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      cardIdFrom: (scope?: { cardId?: string }) => scope?.cardId ?? 'default',
      getAlicizationDb: () => ({
        manageMemoryWorkbenchWorkingMemoryCleaningQueue,
      }),
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as unknown as Parameters<typeof registerAlicizationMemoryInvokeHandlers>[0])

    const handler = handlers.get(electronAlicizationMemoryWorkbenchManageWorkingMemoryCleaningQueue)
    expect(handler).toBeDefined()

    await handler?.({
      cardId: 'card-a',
      action: 'retry-dead-letter',
      itemIds: [' wm-lt-clean:one ', '', 'wm-lt-clean:two'],
      cursor: ' 3000:wm-lt-clean:cursor ',
      limit: 24,
    })

    expect(manageMemoryWorkbenchWorkingMemoryCleaningQueue).toHaveBeenCalledWith({
      cardId: 'card-a',
      action: 'retry-dead-letter',
      itemIds: ['wm-lt-clean:one', 'wm-lt-clean:two'],
      cursor: '3000:wm-lt-clean:cursor',
      limit: 24,
    })
  })

  it('lists persisted quality trial reports through the active card DB facade', async () => {
    const handlers = new Map<unknown, (payload: Record<string, unknown>) => Promise<unknown>>()
    const listMemoryQualityTrialReports = vi.fn(async () => ({
      items: [],
      nextCursor: null,
    }))

    registerAlicizationMemoryInvokeHandlers({
      registerInvokeHandler: (channel: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, async payload => await handler(payload))
      },
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      cardIdFrom: (scope?: { cardId?: string }) => scope?.cardId ?? 'default',
      getAlicizationDb: () => ({
        listMemoryQualityTrialReports,
      }),
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as unknown as Parameters<typeof registerAlicizationMemoryInvokeHandlers>[0])

    const handler = handlers.get(electronAlicizationMemoryWorkbenchListQualityTrialReports)
    expect(handler).toBeDefined()

    await handler?.({
      cardId: 'card-a',
      limit: 24,
      cursor: ' 123:quality-report ',
    })

    expect(listMemoryQualityTrialReports).toHaveBeenCalledWith({
      cardId: 'card-a',
      limit: 24,
      cursor: '123:quality-report',
    })
  })

  it('projects quality trial results to a safe renderer surface without private diagnostics', async () => {
    const handlers = new Map<unknown, (payload: Record<string, unknown>) => Promise<unknown>>()
    const rawReport = createQualityTrialReportWithPrivateDiagnostics()
    const listMemoryQualityTrialReports = vi.fn(async () => ({
      items: [{
        id: rawReport.id,
        cardId: rawReport.cardId,
        month: '2026-08',
        mode: 'historical-replay',
        sessionId: 'session-private',
        reportHash: 'sha256:private',
        report: rawReport,
        createdAt: rawReport.createdAt,
      }],
      nextCursor: null,
    }))
    const runMemoryWorkbenchProductionTrial = vi.fn(async () => rawReport)

    registerAlicizationMemoryInvokeHandlers({
      registerInvokeHandler: (channel: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, async payload => await handler(payload))
      },
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      cardIdFrom: (scope?: { cardId?: string }) => scope?.cardId ?? 'default',
      getAlicizationDb: () => ({
        listMemoryQualityTrialReports,
        runMemoryWorkbenchProductionTrial,
      }),
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as unknown as Parameters<typeof registerAlicizationMemoryInvokeHandlers>[0])

    const runResult = await handlers.get(electronAlicizationMemoryWorkbenchRunQualityTrial)?.({
      cardId: 'card-a',
      mode: 'historical-replay',
      sessionId: 'session-private',
    })
    const listResult = await handlers.get(electronAlicizationMemoryWorkbenchListQualityTrialReports)?.({
      cardId: 'card-a',
    })

    expect(runResult).toMatchObject({
      id: rawReport.id,
      summary: {
        lastError: 'timeout',
      },
      dialogueReplay: {
        summary: {
          failedTurnCount: 1,
          lastError: 'timeout',
        },
      },
      runtimeHealth: {
        recall: {
          lastError: 'recall',
        },
        embedding: {
          lastError: 'provider',
        },
        errors: ['database'],
      },
      recommendedNextActions: ['repair-provider'],
    })
    expect(JSON.stringify(runResult)).not.toContain('private-provider-message-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-provider-output-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-quality-trace-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-quality-error-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-secret-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-quality-action-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-summary-diagnostic-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-stage-diagnostic-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-dialogue-diagnostic-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-runtime-diagnostic-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-quality-diagnostic-sentinel')
    expect(JSON.stringify(runResult)).not.toContain('private-regression-diagnostic-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-provider-message-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-provider-output-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-quality-trace-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-quality-error-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-secret-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-quality-action-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-summary-diagnostic-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-stage-diagnostic-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-dialogue-diagnostic-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-runtime-diagnostic-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-quality-diagnostic-sentinel')
    expect(JSON.stringify(listResult)).not.toContain('private-regression-diagnostic-sentinel')
  })
})
