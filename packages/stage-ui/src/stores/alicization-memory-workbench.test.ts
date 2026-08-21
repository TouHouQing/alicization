import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationMemoryWorkbenchStore } from './alicization-memory-workbench'

describe('alicization memory workbench store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays empty when bridge is unavailable', async () => {
    const store = useAlicizationMemoryWorkbenchStore()

    await store.refreshSnapshot()

    expect(store.snapshot).toBeNull()
    expect(store.lastError).toBeNull()
  })

  it('loads snapshot and recall probe through bridge', async () => {
    setAlicizationBridge({
      memoryWorkbenchGetSnapshot: vi.fn(async () => ({
        cardId: 'default',
        sessionId: null,
        updatedAt: 1,
        workingMemory: null,
        longTerm: {
          total: 0,
          byKind: {},
          items: [],
        },
        review: {
          pending: 0,
          items: [],
        },
        health: {
          status: 'ok',
          queue: { pending: 0, review: 0, applied: 0, failed: 0, deadLettered: 0 },
          recall: { lastLatencyMs: null, p95LatencyMs: null, lastError: null },
          embedding: { providerConfigured: false, modelId: null, dimensions: null, reindexRequired: false },
          errors: [],
        },
      })),
      memoryWorkbenchRecallProbe: vi.fn(async payload => ({
        query: payload.query,
        intent: {
          mode: 'episodic',
          shouldRecall: true,
          confidence: 0.8,
          rationale: 'shared memory cue',
          temporalFocus: 'unspecified',
          riskFlags: [],
        },
        plan: {
          keywordQueries: [payload.query],
          phraseQueries: ['打游戏'],
          charGramQueries: ['游戏'],
          semanticQueries: [],
          episodicQueries: [],
          threadHints: [],
          negativeCues: [],
          riskFlags: [],
        },
        evidence: [],
        latencyMs: 1,
        errors: [],
      })),
      bootstrap: vi.fn(),
      getSoul: vi.fn(),
      initializeGenesis: vi.fn(),
      updateSoul: vi.fn(),
      updatePersonality: vi.fn(),
      getKillSwitchState: vi.fn(),
      suspendKillSwitch: vi.fn(),
      resumeKillSwitch: vi.fn(),
      getMemoryStats: vi.fn(),
      runMemoryPrune: vi.fn(),
      updateMemoryStats: vi.fn(),
      retrieveMemoryFacts: vi.fn(),
      upsertMemoryFacts: vi.fn(),
      importLegacyMemory: vi.fn(),
      appendConversationTurn: vi.fn(),
      appendAuditLog: vi.fn(),
      realtimeExecute: vi.fn(),
      getSensorySnapshot: vi.fn(),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshSnapshot()
    await store.runRecallProbe('我们去打游戏吧')

    expect(store.snapshot?.health.status).toBe('ok')
    expect(store.recallProbe?.intent.mode).toBe('episodic')
  })

  it('restores a persisted embedding reindex job from the health snapshot', async () => {
    const reindexJob = {
      jobId: 'job-restored',
      cardId: 'default',
      status: 'running',
      modelId: 'local',
      dimensions: 3,
      total: 4,
      pending: 2,
      leased: 0,
      indexed: 2,
      retryable: 0,
      deadLettered: 0,
      cancelled: 0,
      progress: 0.5,
      lastError: null,
      createdAt: 1,
      updatedAt: 2,
      startedAt: 1,
      completedAt: null,
      nextRetryAt: null,
    } as const
    setAlicizationBridge({
      memoryWorkbenchGetSnapshot: vi.fn(async () => ({
        cardId: 'default',
        sessionId: null,
        updatedAt: 2,
        workingMemory: null,
        longTerm: { total: 0, byKind: {}, items: [] },
        review: { pending: 0, items: [] },
        health: {
          status: 'degraded',
          queue: { pending: 0, review: 0, applied: 0, failed: 0, deadLettered: 0 },
          recall: { lastLatencyMs: null, p95LatencyMs: null, lastError: null },
          embedding: {
            providerConfigured: true,
            modelId: 'local',
            dimensions: 3,
            reindexRequired: true,
            indexMode: 'brute-force',
            approximate: false,
            degraded: true,
            nativeIndexReady: false,
            searchReady: false,
            lastError: null,
            reindexJob,
          },
          errors: [],
        },
      })),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshSnapshot()

    expect(store.reindexResult?.jobId).toBe('job-restored')
    expect(store.reindexResult?.progress?.progress).toBe(0.5)
  })

  it('resets long-term cursor when filters change and appends when loading more', async () => {
    const firstItem = {
      id: 'memory-a',
      kind: 'reflection',
      summary: '用户想打游戏放松。',
      evidenceSnippets: [],
      sourceIds: ['memory-a'],
      confidence: 0.8,
      salience: 0.7,
      sensitivity: 'personal',
      visibility: 'explicit',
      training: 'blocked',
      source: 'memory_reflections',
      createdAt: 1,
      updatedAt: 2,
      lastAccessedAt: null,
      tombstoned: false,
    } as const
    const secondItem = {
      ...firstItem,
      id: 'memory-b',
      sourceIds: ['memory-b'],
      summary: '用户喜欢自然回复。',
    } as const
    const memoryWorkbenchListLongTerm = vi.fn()
      .mockResolvedValueOnce({ items: [firstItem], nextCursor: 'cursor-a' })
      .mockResolvedValueOnce({ items: [secondItem], nextCursor: null })

    setAlicizationBridge({
      memoryWorkbenchListLongTerm,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshLongTerm({ query: '游戏' })
    expect(store.longTermItems.map(item => item.id)).toEqual(['memory-a'])
    expect(store.longTermNextCursor).toBe('cursor-a')

    await store.loadMoreLongTerm()
    expect(store.longTermItems.map(item => item.id)).toEqual(['memory-a', 'memory-b'])
    expect(memoryWorkbenchListLongTerm).toHaveBeenLastCalledWith(expect.objectContaining({
      cursor: 'cursor-a',
      query: '游戏',
    }))
  })

  it('loads persona candidates and records embedding reindex result', async () => {
    const candidate = {
      id: 'persona-candidate:reflection-1',
      sourceMemoryIds: ['reflection-1'],
      behaviorLesson: '不要用固定模板遮盖失败。',
      positiveExample: '我会直接说明 provider 失败。',
      negativeExample: '不要套固定安抚模板。',
      privacyClass: 'personal-redacted',
      status: 'candidate',
      allowTraining: false,
      rejectionReason: null,
      createdAt: 1,
      updatedAt: 1,
    } as const
    setAlicizationBridge({
      memoryWorkbenchListPersonaCandidates: vi.fn(async () => ({ items: [candidate], nextCursor: null })),
      memoryWorkbenchApplyPersonaCandidateAction: vi.fn(async () => ({
        ...candidate,
        status: 'no-training',
        rejectionReason: 'user blocked',
        updatedAt: 2,
      })),
      memoryWorkbenchReindexEmbeddings: vi.fn(async () => ({
        scheduled: 1,
        indexed: 1,
        failed: 0,
        modelId: 'local',
        dimensions: 3,
        errors: [],
      })),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshPersonaCandidates()
    expect(store.personaCandidates.map(item => item.id)).toEqual(['persona-candidate:reflection-1'])

    await store.applyPersonaCandidateAction('persona-candidate:reflection-1', 'no-training')
    expect(store.personaCandidates[0]?.status).toBe('no-training')

    await store.reindexEmbeddings()
    expect(store.reindexResult?.indexed).toBe(1)
  })

  it('loads every gold-label page instead of silently stopping at the first page', async () => {
    const baseLabel = {
      id: 'gold-label',
      cardId: 'default',
      month: '2026-08',
      label: 'right' as const,
      reason: null,
      labelText: '记得对',
      description: '记忆使用正确。',
      evaluationClass: 'correct-recall' as const,
      benchmarkDimensions: ['information-extraction' as const],
      query: '你还记得这件事吗？',
      sessionId: 'session-gold',
      turnId: 'turn-gold',
      decisionTraceId: null,
      assistantReply: '记得。',
      retrievedEvidenceSnapshot: [],
      expectedMemoryIds: ['memory-gold'],
      retrievedCandidateIds: ['memory-gold'],
      surfacedMemoryIds: ['memory-gold'],
      wrongThreadIds: [],
      note: null,
      humanConfirmed: true,
      createdAt: 1,
    }
    const firstPage = Array.from({ length: 200 }, (_, index) => ({
      ...baseLabel,
      id: `gold-label-${index}`,
      createdAt: index + 1,
    }))
    const memoryWorkbenchListQualityGoldLabels = vi.fn()
      .mockResolvedValueOnce({ items: firstPage, nextCursor: 'gold-cursor' })
      .mockResolvedValueOnce({
        items: [{ ...baseLabel, id: 'gold-label-200', createdAt: 201 }],
        nextCursor: null,
      })
    setAlicizationBridge({
      memoryWorkbenchListQualityGoldLabels,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.loadMonthlyGoldLabels('2026-08')

    expect(store.monthlyGoldLabels).toHaveLength(201)
    expect(memoryWorkbenchListQualityGoldLabels).toHaveBeenNthCalledWith(2, {
      month: '2026-08',
      limit: 500,
      cursor: 'gold-cursor',
    })
  })

  it('controls a persisted reindex job through status, cancel, and dead-letter retry actions', async () => {
    const progress = {
      jobId: 'job-1',
      cardId: 'default',
      status: 'queued',
      modelId: 'local',
      dimensions: 3,
      total: 2,
      pending: 2,
      leased: 0,
      indexed: 0,
      retryable: 0,
      deadLettered: 0,
      cancelled: 0,
      progress: 0,
      lastError: null,
      createdAt: 1,
      updatedAt: 1,
      startedAt: null,
      completedAt: null,
      nextRetryAt: null,
    } as const
    const memoryWorkbenchReindexEmbeddings = vi.fn()
      .mockResolvedValueOnce({ jobId: 'job-1', status: 'queued', scheduled: 2, indexed: 0, failed: 0, modelId: 'local', dimensions: 3, errors: [], progress })
      .mockResolvedValueOnce({ jobId: 'job-1', status: 'running', scheduled: 2, indexed: 1, failed: 0, modelId: 'local', dimensions: 3, errors: [], progress: { ...progress, status: 'running', indexed: 1, pending: 1, progress: 0.5 } })
      .mockResolvedValueOnce({ jobId: 'job-1', status: 'cancelled', scheduled: 2, indexed: 1, failed: 0, modelId: 'local', dimensions: 3, errors: ['用户取消 embedding 重建'], progress: { ...progress, status: 'cancelled', indexed: 1, pending: 0, cancelled: 1, progress: 1, lastError: '用户取消 embedding 重建' } })
      .mockResolvedValueOnce({
        jobId: 'job-1',
        status: 'failed',
        scheduled: 2,
        indexed: 1,
        failed: 1,
        modelId: 'local',
        dimensions: 3,
        errors: ['provider rejected item'],
        progress: { ...progress, status: 'failed', indexed: 1, pending: 0, deadLettered: 1, progress: 1, lastError: 'provider rejected item' },
        deadLetterItems: [{
          itemId: 'item-dead-letter',
          source: 'memory_reflections',
          sourceId: 'reflection-dead-letter',
          attemptCount: 3,
          lastError: 'provider rejected item',
        }],
      })
      .mockResolvedValueOnce({ jobId: 'job-1', status: 'queued', scheduled: 2, indexed: 1, failed: 0, modelId: 'local', dimensions: 3, errors: [], progress: { ...progress, status: 'queued', indexed: 1, pending: 1, deadLettered: 0, progress: 0.5 }, deadLetterItems: [] })
    setAlicizationBridge({ memoryWorkbenchReindexEmbeddings } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.reindexEmbeddings()
    await store.refreshReindexJob('job-1')
    await store.cancelReindexJob('job-1', '用户取消 embedding 重建')
    await store.refreshReindexJob('job-1')
    expect(store.reindexDeadLetterItems).toEqual([
      expect.objectContaining({
        itemId: 'item-dead-letter',
        sourceId: 'reflection-dead-letter',
        attemptCount: 3,
      }),
    ])
    await store.retryDeadLetterReindex('job-1', ['item-dead-letter'])

    expect(memoryWorkbenchReindexEmbeddings.mock.calls.map(call => call[0])).toEqual([
      { action: 'start' },
      { action: 'status', jobId: 'job-1' },
      { action: 'cancel', jobId: 'job-1', reason: '用户取消 embedding 重建' },
      { action: 'status', jobId: 'job-1' },
      { action: 'retry-dead-letter', jobId: 'job-1', itemIds: ['item-dead-letter'] },
    ])
    expect(store.reindexResult?.status).toBe('queued')
    expect(store.reindexDeadLetterItems).toEqual([])
  })

  it('lists paginated WorkingMemory cleaning failures and observes single-item retry as pending', async () => {
    const failedItem = {
      itemId: 'wm-lt-clean:failed',
      source: 'working-memory-owner',
      sourceId: 'queue-failed',
      status: 'failed',
      attemptCount: 1,
      lastError: 'raw sqlite busy error',
      createdAt: 1_000,
      updatedAt: 2_000,
      nextAttemptAt: 3_000,
    } as const
    const deadLetteredItem = {
      ...failedItem,
      itemId: 'wm-lt-clean:dead',
      sourceId: 'queue-dead',
      status: 'dead-lettered',
      attemptCount: 3,
      lastError: 'raw provider rejection',
      updatedAt: 1_500,
      nextAttemptAt: null,
    } as const
    const retriedItem = {
      ...failedItem,
      status: 'pending-cleaning',
      attemptCount: 0,
      updatedAt: 4_000,
      nextAttemptAt: 4_000,
    } as const
    const memoryWorkbenchManageWorkingMemoryCleaningQueue = vi.fn()
      .mockResolvedValueOnce({
        items: [failedItem],
        nextCursor: '2000:wm-lt-clean:failed',
        retried: [],
      })
      .mockResolvedValueOnce({
        items: [deadLetteredItem],
        nextCursor: null,
        retried: [],
      })
      .mockResolvedValueOnce({
        items: [deadLetteredItem],
        nextCursor: null,
        retried: [retriedItem],
      })
    const memoryWorkbenchGetSnapshot = vi.fn(async () => ({
      cardId: 'default',
      sessionId: null,
      updatedAt: 4_000,
      workingMemory: null,
      longTerm: { total: 0, byKind: {}, items: [] },
      review: { pending: 0, items: [] },
      health: {
        status: 'degraded',
        queue: { pending: 1, review: 0, applied: 0, failed: 0, deadLettered: 1 },
        recall: { lastLatencyMs: null, p95LatencyMs: null, lastError: null },
        embedding: { providerConfigured: false, modelId: null, dimensions: null, reindexRequired: false },
        errors: [],
      },
    }))
    setAlicizationBridge({
      memoryWorkbenchManageWorkingMemoryCleaningQueue,
      memoryWorkbenchGetSnapshot,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshWorkingMemoryCleaningFailures()
    await store.loadMoreWorkingMemoryCleaningFailures()

    expect(store.workingMemoryCleaningFailures.map(item => item.itemId)).toEqual([
      'wm-lt-clean:failed',
      'wm-lt-clean:dead',
    ])

    await store.retryWorkingMemoryCleaningFailures(['wm-lt-clean:failed'])

    expect(memoryWorkbenchManageWorkingMemoryCleaningQueue.mock.calls.map(call => call[0])).toEqual([
      { action: 'list', limit: 24, cursor: null },
      { action: 'list', limit: 24, cursor: '2000:wm-lt-clean:failed' },
      { action: 'retry-dead-letter', itemIds: ['wm-lt-clean:failed'], limit: 24, cursor: null },
    ])
    expect(store.workingMemoryCleaningFailures.map(item => item.itemId)).toEqual(['wm-lt-clean:dead'])
    expect(store.workingMemoryCleaningRetriedItems).toEqual([
      expect.objectContaining({
        itemId: 'wm-lt-clean:failed',
        status: 'pending-cleaning',
        lastError: 'raw sqlite busy error',
      }),
    ])
    expect(store.health?.queue).toEqual({
      pending: 1,
      review: 0,
      applied: 0,
      failed: 0,
      deadLettered: 1,
    })
  })

  it('ignores card-scoped cleaning results that finish after the workbench scope is reset', async () => {
    let resolveCleaningQueue: ((value: any) => void) | undefined
    setAlicizationBridge({
      memoryWorkbenchManageWorkingMemoryCleaningQueue: vi.fn(() => new Promise((resolve) => {
        resolveCleaningQueue = resolve
      })),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    const pending = store.refreshWorkingMemoryCleaningFailures()
    store.resetCardScope()
    resolveCleaningQueue?.({
      items: [{
        itemId: 'old-card-failure',
        source: 'working-memory-owner',
        sourceId: 'old-card-queue',
        status: 'failed',
        attemptCount: 1,
        lastError: 'old card error',
        createdAt: 1,
        updatedAt: 2,
        nextAttemptAt: 3,
      }],
      nextCursor: null,
      retried: [],
    })

    await pending

    expect(store.workingMemoryCleaningFailures).toEqual([])
    expect(store.workingMemoryCleaningFailuresNextCursor).toBeNull()
  })

  it('polls an active reindex job until it reaches a terminal state', async () => {
    vi.useFakeTimers()
    const progress = {
      jobId: 'job-polling',
      cardId: 'default',
      status: 'queued',
      modelId: 'local',
      dimensions: 3,
      total: 2,
      pending: 2,
      leased: 0,
      indexed: 0,
      retryable: 0,
      deadLettered: 0,
      cancelled: 0,
      progress: 0,
      lastError: null,
      createdAt: 1,
      updatedAt: 1,
      startedAt: null,
      completedAt: null,
      nextRetryAt: null,
    } as const
    const memoryWorkbenchReindexEmbeddings = vi.fn()
      .mockResolvedValueOnce({
        jobId: 'job-polling',
        status: 'queued',
        scheduled: 2,
        indexed: 0,
        failed: 0,
        modelId: 'local',
        dimensions: 3,
        errors: [],
        progress,
      })
      .mockResolvedValueOnce({
        jobId: 'job-polling',
        status: 'running',
        scheduled: 2,
        indexed: 1,
        failed: 0,
        modelId: 'local',
        dimensions: 3,
        errors: [],
        progress: { ...progress, status: 'running', indexed: 1, pending: 1, progress: 0.5 },
      })
      .mockResolvedValueOnce({
        jobId: 'job-polling',
        status: 'completed',
        scheduled: 2,
        indexed: 2,
        failed: 0,
        modelId: 'local',
        dimensions: 3,
        errors: [],
        progress: { ...progress, status: 'completed', indexed: 2, pending: 0, progress: 1, completedAt: 3 },
      })
    setAlicizationBridge({ memoryWorkbenchReindexEmbeddings } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.reindexEmbeddings()
    await vi.advanceTimersByTimeAsync(4_000)

    expect(store.reindexResult?.status).toBe('completed')
    expect(memoryWorkbenchReindexEmbeddings).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(4_000)
    expect(memoryWorkbenchReindexEmbeddings).toHaveBeenCalledTimes(3)
  })

  it('starts and polls only the active semantic scale job until completion', async () => {
    vi.useFakeTimers()
    const queued = {
      jobId: 'semantic-job-polling',
      cardId: 'default',
      tier: '100k',
      corpusSize: 100_000,
      status: 'queued',
      deadLettered: false,
      attemptCount: 0,
      maxAttempts: 3,
      nextRetryAt: null,
      leaseExpiresAt: null,
      progress: {
        phase: 'queued',
        completed: 0,
        total: 0,
        ratio: 0,
        indexedCount: 0,
        queryCount: 0,
        corpusSize: 100_000,
      },
      report: null,
      lastError: null,
      createdAt: 1,
      updatedAt: 1,
      startedAt: null,
      completedAt: null,
    } as const
    const memoryWorkbenchManageSemanticScaleJobs = vi.fn()
      .mockResolvedValueOnce({ job: queued, jobs: [queued] })
      .mockResolvedValueOnce({
        job: {
          ...queued,
          status: 'completed',
          progress: {
            ...queued.progress,
            phase: 'completed',
            completed: 224,
            total: 224,
            ratio: 1,
            indexedCount: 100_000,
            queryCount: 24,
          },
          report: {
            id: 'semantic-scale-completed',
            passed: true,
            summary: {
              corpusSize: 100_000,
              queryCount: 24,
              p95LatencyMs: 10,
              p99LatencyMs: 12,
              recallAtK: 1,
              falseRecallRate: 0,
              coverageRatio: 1,
              failingChecks: [],
            },
          },
          completedAt: 2,
        },
        jobs: [],
      })
    setAlicizationBridge({ memoryWorkbenchManageSemanticScaleJobs } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.startSemanticScaleJob('100k')
    expect(store.semanticScaleJob?.status).toBe('queued')

    await vi.advanceTimersByTimeAsync(2_000)
    expect(store.semanticScaleJob?.status).toBe('completed')
    expect(memoryWorkbenchManageSemanticScaleJobs.mock.calls.map(call => call[0])).toEqual([
      { action: 'start', tier: '100k' },
      { action: 'status', jobId: 'semantic-job-polling' },
    ])

    await vi.advanceTimersByTimeAsync(4_000)
    expect(memoryWorkbenchManageSemanticScaleJobs).toHaveBeenCalledTimes(2)
  })

  it('preserves failed semantic quality diagnostics and stops polling at dead-letter', async () => {
    vi.useFakeTimers()
    const queued = {
      jobId: 'semantic-job-quality-failure',
      cardId: 'default',
      tier: '10k',
      corpusSize: 10_000,
      status: 'queued',
      deadLettered: false,
      attemptCount: 0,
      maxAttempts: 1,
      nextRetryAt: null,
      leaseExpiresAt: null,
      progress: {
        phase: 'queued',
        completed: 0,
        total: 0,
        ratio: 0,
        indexedCount: 0,
        queryCount: 0,
        corpusSize: 10_000,
      },
      report: null,
      lastError: null,
      createdAt: 1,
      updatedAt: 1,
      startedAt: null,
      completedAt: null,
    } as const
    const qualityFailure = {
      ...queued,
      status: 'failed',
      deadLettered: true,
      attemptCount: 1,
      report: {
        id: 'semantic-scale-quality-failure',
        passed: false,
        summary: {
          corpusSize: 10_000,
          queryCount: 24,
          p95LatencyMs: 2_500,
          p99LatencyMs: 4_500,
          recallAtK: 0.8,
          falseRecallRate: 0.1,
          coverageRatio: 0.9,
          failingChecks: ['recall-at-k', 'p95-latency'],
        },
        recommendedNextActions: ['inspect recall misses'],
      },
      lastError: 'semantic scale quality checks failed: recall-at-k, p95-latency',
      completedAt: 2,
    } as const
    const memoryWorkbenchManageSemanticScaleJobs = vi.fn()
      .mockResolvedValueOnce({ job: queued, jobs: [queued] })
      .mockResolvedValueOnce({ job: qualityFailure, jobs: [qualityFailure] })
    setAlicizationBridge({ memoryWorkbenchManageSemanticScaleJobs } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.startSemanticScaleJob('10k')
    await vi.advanceTimersByTimeAsync(2_000)

    expect(store.semanticScaleJob).toMatchObject({
      status: 'failed',
      deadLettered: true,
      report: {
        passed: false,
        summary: {
          failingChecks: ['recall-at-k', 'p95-latency'],
        },
        recommendedNextActions: ['inspect recall misses'],
      },
    })

    await vi.advanceTimersByTimeAsync(4_000)
    expect(memoryWorkbenchManageSemanticScaleJobs).toHaveBeenCalledTimes(2)
  })

  it('selects an active semantic history job and polls only that job', async () => {
    vi.useFakeTimers()
    const baseJob = {
      cardId: 'default',
      tier: '10k',
      corpusSize: 10_000,
      deadLettered: false,
      attemptCount: 1,
      maxAttempts: 3,
      nextRetryAt: null,
      leaseExpiresAt: 10_000,
      progress: {
        phase: 'indexing',
        completed: 1,
        total: 20,
        ratio: 0.05,
        indexedCount: 500,
        queryCount: 0,
        corpusSize: 10_000,
      },
      report: null,
      lastError: null,
      createdAt: 1,
      updatedAt: 1,
      startedAt: 1,
      completedAt: null,
    } as const
    const activeJob = {
      ...baseJob,
      jobId: 'semantic-job-active-history',
      status: 'running',
    } as const
    const latestDeadLetter = {
      ...baseJob,
      jobId: 'semantic-job-latest-dead-letter',
      status: 'failed',
      deadLettered: true,
      createdAt: 2,
      updatedAt: 2,
      completedAt: 2,
    } as const
    const completedActiveJob = {
      ...activeJob,
      status: 'completed',
      leaseExpiresAt: null,
      progress: {
        ...activeJob.progress,
        phase: 'completed',
        completed: 20,
        ratio: 1,
        indexedCount: 10_000,
      },
      completedAt: 3,
    } as const
    const memoryWorkbenchManageSemanticScaleJobs = vi.fn()
      .mockResolvedValueOnce({
        job: latestDeadLetter,
        jobs: [latestDeadLetter, activeJob],
      })
      .mockResolvedValueOnce({
        job: completedActiveJob,
        jobs: [completedActiveJob],
      })
    setAlicizationBridge({ memoryWorkbenchManageSemanticScaleJobs } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.loadSemanticScaleJobs()
    expect(store.semanticScaleJob?.jobId).toBe(latestDeadLetter.jobId)

    store.selectSemanticScaleJob(activeJob.jobId)
    expect(store.semanticScaleJob?.jobId).toBe(activeJob.jobId)

    await vi.advanceTimersByTimeAsync(2_000)
    expect(memoryWorkbenchManageSemanticScaleJobs).toHaveBeenLastCalledWith({
      action: 'status',
      jobId: activeJob.jobId,
    })
    expect(store.semanticScaleJob).toMatchObject({
      jobId: activeJob.jobId,
      status: 'completed',
    })
    expect(store.semanticScaleJobs.find(job => job.jobId === activeJob.jobId)?.status).toBe('completed')
  })

  it('allows multiple semantic scale jobs to be queued and selects the newest one', async () => {
    const createQueuedJob = (jobId: string, createdAt: number) => ({
      jobId,
      cardId: 'default',
      tier: '10k',
      corpusSize: 10_000,
      status: 'queued',
      deadLettered: false,
      attemptCount: 0,
      maxAttempts: 3,
      nextRetryAt: null,
      leaseExpiresAt: null,
      progress: {
        phase: 'queued',
        completed: 0,
        total: 0,
        ratio: 0,
        indexedCount: 0,
        queryCount: 0,
        corpusSize: 10_000,
      },
      report: null,
      lastError: null,
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      completedAt: null,
    } as const)
    const first = createQueuedJob('semantic-job-first', 1)
    const second = createQueuedJob('semantic-job-second', 2)
    const memoryWorkbenchManageSemanticScaleJobs = vi.fn()
      .mockResolvedValueOnce({ job: first, jobs: [first] })
      .mockResolvedValueOnce({ job: second, jobs: [second] })
    setAlicizationBridge({ memoryWorkbenchManageSemanticScaleJobs } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.startSemanticScaleJob('10k')
    await store.startSemanticScaleJob('10k')

    expect(memoryWorkbenchManageSemanticScaleJobs).toHaveBeenCalledTimes(2)
    expect(store.semanticScaleJob?.jobId).toBe(second.jobId)
    expect(store.semanticScaleJobs.map(job => job.jobId)).toEqual([
      second.jobId,
      first.jobId,
    ])
  })

  it('clears semantic scale state and ignores stale async results after a card switch', async () => {
    let resolveList: ((value: any) => void) | undefined
    const memoryWorkbenchManageSemanticScaleJobs = vi.fn(() => new Promise((resolve) => {
      resolveList = resolve
    }))
    setAlicizationBridge({ memoryWorkbenchManageSemanticScaleJobs } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    const pending = store.loadSemanticScaleJobs()
    expect(store.semanticScaleLoading).toBe(true)

    store.resetSemanticScaleJobContext()
    expect(store.semanticScaleLoading).toBe(false)
    expect(store.semanticScaleJob).toBeNull()
    expect(store.semanticScaleJobs).toEqual([])

    resolveList?.({
      job: {
        jobId: 'stale-semantic-job',
        status: 'completed',
      },
      jobs: [{
        jobId: 'stale-semantic-job',
        status: 'completed',
      }],
    })
    await expect(pending).resolves.toEqual([])
    expect(store.semanticScaleJob).toBeNull()
    expect(store.semanticScaleJobs).toEqual([])
  })

  it('discovers embedding models and tests embedding connectivity through the bridge', async () => {
    const memoryWorkbenchListEmbeddingModels = vi.fn(async payload => ({
      items: [
        {
          id: 'text-embedding-3-small',
          name: 'text-embedding-3-small',
          provider: 'openai-compatible',
          description: 'small embedding model',
        },
      ],
      query: payload.query ?? null,
    }))
    const memoryWorkbenchTestEmbeddingConnection = vi.fn(async () => ({
      ok: true,
      modelId: 'text-embedding-3-small',
      dimensions: 1536,
      latencyMs: 12,
      error: null,
    }))

    setAlicizationBridge({
      memoryWorkbenchListEmbeddingModels,
      memoryWorkbenchTestEmbeddingConnection,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.discoverEmbeddingModels({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.test/v1/',
      query: 'embedding',
    })
    expect(store.embeddingModels.map(model => model.id)).toEqual(['text-embedding-3-small'])
    expect(memoryWorkbenchListEmbeddingModels).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: 'https://api.example.test/v1/',
      query: 'embedding',
    }))

    await store.testEmbeddingConnection({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.test/v1/',
      model: 'text-embedding-3-small',
    })
    expect(store.embeddingConnectionTest?.dimensions).toBe(1536)
    expect(memoryWorkbenchTestEmbeddingConnection).toHaveBeenCalledWith(expect.objectContaining({
      model: 'text-embedding-3-small',
    }))
  })

  it('keeps persona dataset governance actions in the bridge without starting training', async () => {
    const dataset = {
      cardId: 'default',
      activeVersionId: 'dataset:default:1',
      versions: [{
        id: 'dataset:default:1',
        cardId: 'default',
        version: 1,
        schemaVersion: 'persona-training-dataset-v1',
        consentSnapshot: {
          granted: false,
          policyVersion: 'v1',
          scope: 'persona-dataset',
          capturedAt: 1,
        },
        createdAt: 1,
        exportedAt: null,
        activeAt: null,
        rolledBackAt: null,
      }],
      examples: [],
    } as const
    const memoryWorkbenchGetPersonaTrainingDataset = vi.fn(async () => dataset)
    const memoryWorkbenchStagePersonaTrainingDataset = vi.fn(async () => dataset.versions[0])
    const memoryWorkbenchExportPersonaTrainingDataset = vi.fn(async () => ({
      dataset: dataset.versions[0],
      manifest: {
        datasetId: dataset.versions[0].id,
        cardId: 'default',
        version: 1,
        schemaVersion: 'persona-training-dataset-v1',
        exportedAt: 2,
        consentSnapshot: dataset.versions[0].consentSnapshot,
        examples: [],
        manifestHash: 'hash',
      },
    }))
    const memoryWorkbenchActivatePersonaTrainingDataset = vi.fn(async () => dataset.versions[0])
    const memoryWorkbenchRollbackPersonaTrainingDataset = vi.fn(async () => dataset.versions[0])
    const memoryWorkbenchSetPersonaTrainingDatasetExamplePolicy = vi.fn(async () => null)
    const memoryWorkbenchRevokePersonaTrainingDatasetSource = vi.fn(async () => ({ affected: 1 }))
    setAlicizationBridge({
      memoryWorkbenchGetPersonaTrainingDataset,
      memoryWorkbenchStagePersonaTrainingDataset,
      memoryWorkbenchExportPersonaTrainingDataset,
      memoryWorkbenchActivatePersonaTrainingDataset,
      memoryWorkbenchRollbackPersonaTrainingDataset,
      memoryWorkbenchSetPersonaTrainingDatasetExamplePolicy,
      memoryWorkbenchRevokePersonaTrainingDatasetSource,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshPersonaTrainingDataset()
    await store.stagePersonaTrainingDataset({ granted: false, policyVersion: 'v1', scope: 'persona-dataset' })
    await store.exportPersonaTrainingDataset(dataset.versions[0].id)
    await store.activatePersonaTrainingDataset(dataset.versions[0].id)
    await store.rollbackPersonaTrainingDataset(dataset.versions[0].id)
    await store.setPersonaTrainingDatasetExamplePolicy({
      exampleId: 'example-1',
      allowTraining: true,
      consent: { granted: true, policyVersion: 'v2', scope: 'persona-dataset' },
    })
    await store.revokePersonaTrainingDatasetSource('reflection-1')

    expect(memoryWorkbenchStagePersonaTrainingDataset).toHaveBeenCalledWith(expect.objectContaining({
      consent: { granted: false, policyVersion: 'v1', scope: 'persona-dataset' },
    }))
    expect(memoryWorkbenchExportPersonaTrainingDataset).toHaveBeenCalledWith({
      datasetId: dataset.versions[0].id,
    })
    expect(memoryWorkbenchSetPersonaTrainingDatasetExamplePolicy).toHaveBeenCalledWith(expect.objectContaining({
      allowTraining: true,
    }))
    expect(memoryWorkbenchRevokePersonaTrainingDatasetSource).toHaveBeenCalledWith({
      sourceId: 'reflection-1',
    })
    expect(store.personaTrainingDatasetExport?.manifest.manifestHash).toBe('hash')
  })

  it.each([
    {
      action: 'activatePersonaTrainingDataset' as const,
      bridgeAction: 'memoryWorkbenchActivatePersonaTrainingDataset' as const,
      id: 'dataset-activate',
      payload: { datasetId: 'dataset-activate' },
    },
    {
      action: 'rollbackPersonaTrainingDataset' as const,
      bridgeAction: 'memoryWorkbenchRollbackPersonaTrainingDataset' as const,
      id: 'dataset-rollback',
      payload: { datasetId: 'dataset-rollback' },
    },
    {
      action: 'revokePersonaTrainingDatasetSource' as const,
      bridgeAction: 'memoryWorkbenchRevokePersonaTrainingDatasetSource' as const,
      id: 'source-revoke',
      payload: { sourceId: 'source-revoke' },
    },
  ])('refreshes persona dataset, runs, and increments after $action succeeds', async ({
    action,
    bridgeAction,
    id,
    payload,
  }) => {
    const mutation = vi.fn(async () => ({ affected: 1 }))
    const memoryWorkbenchGetPersonaTrainingDataset = vi.fn(async () => ({
      cardId: 'default',
      activeVersionId: null,
      versions: [],
      examples: [],
    }))
    const memoryWorkbenchListPersonaTrainingRuns = vi.fn(async () => ({ items: [] }))
    const memoryWorkbenchListPersonaTrainingIncrements = vi.fn(async () => ({ items: [] }))
    setAlicizationBridge({
      [bridgeAction]: mutation,
      memoryWorkbenchGetPersonaTrainingDataset,
      memoryWorkbenchListPersonaTrainingRuns,
      memoryWorkbenchListPersonaTrainingIncrements,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store[action](id)

    expect(mutation).toHaveBeenCalledWith(payload)
    expect(memoryWorkbenchGetPersonaTrainingDataset).toHaveBeenCalledOnce()
    expect(memoryWorkbenchListPersonaTrainingRuns).toHaveBeenCalledOnce()
    expect(memoryWorkbenchListPersonaTrainingIncrements).toHaveBeenCalledOnce()
  })

  it.each([
    {
      action: 'activatePersonaTrainingDataset' as const,
      bridgeAction: 'memoryWorkbenchActivatePersonaTrainingDataset' as const,
      id: 'dataset-activate',
    },
    {
      action: 'rollbackPersonaTrainingDataset' as const,
      bridgeAction: 'memoryWorkbenchRollbackPersonaTrainingDataset' as const,
      id: 'dataset-rollback',
    },
    {
      action: 'revokePersonaTrainingDatasetSource' as const,
      bridgeAction: 'memoryWorkbenchRevokePersonaTrainingDatasetSource' as const,
      id: 'source-revoke',
    },
  ])('refreshes all persona training state without swallowing the original $action error', async ({
    action,
    bridgeAction,
    id,
  }) => {
    const mutationError = `${action} partially failed`
    const mutation = vi.fn(async () => {
      throw new Error(mutationError)
    })
    const memoryWorkbenchGetPersonaTrainingDataset = vi.fn(async () => ({
      cardId: 'default',
      activeVersionId: null,
      versions: [],
      examples: [],
    }))
    const memoryWorkbenchListPersonaTrainingRuns = vi.fn(async () => {
      throw new Error('runs refresh failed')
    })
    const memoryWorkbenchListPersonaTrainingIncrements = vi.fn(async () => ({ items: [] }))
    setAlicizationBridge({
      [bridgeAction]: mutation,
      memoryWorkbenchGetPersonaTrainingDataset,
      memoryWorkbenchListPersonaTrainingRuns,
      memoryWorkbenchListPersonaTrainingIncrements,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await expect(store[action](id)).resolves.toBeNull()

    expect(memoryWorkbenchGetPersonaTrainingDataset).toHaveBeenCalledOnce()
    expect(memoryWorkbenchListPersonaTrainingRuns).toHaveBeenCalledOnce()
    expect(memoryWorkbenchListPersonaTrainingIncrements).toHaveBeenCalledOnce()
    expect(store.lastError).toBe(mutationError)
  })

  it('keeps persona training loading active until concurrent run and increment refreshes settle', async () => {
    let resolveRuns: ((value: { items: [] }) => void) | undefined
    setAlicizationBridge({
      memoryWorkbenchListPersonaTrainingRuns: vi.fn(async () => await new Promise<{ items: [] }>((resolve) => {
        resolveRuns = resolve
      })),
      memoryWorkbenchListPersonaTrainingIncrements: vi.fn(async () => ({ items: [] })),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    const runsRefresh = store.refreshPersonaTrainingRuns()
    const incrementsRefresh = store.refreshPersonaTrainingIncrements()
    await incrementsRefresh

    expect(store.personaTrainingRunLoading).toBe(true)
    resolveRuns?.({ items: [] })
    await runsRefresh
    expect(store.personaTrainingRunLoading).toBe(false)
  })

  it('starts persona training without blocking and polls the persisted run to completion', async () => {
    vi.useFakeTimers()
    const queuedRun = {
      runId: 'run-1',
      cardId: 'default',
      datasetId: 'dataset-1',
      manifestHash: 'manifest-1',
      sourceIds: ['reflection-1'],
      basePersonaRevision: 'persona-core-v1',
      status: 'queued',
      stage: 'writing-input',
      progress: 0,
      progressMessage: null,
      failureReason: null,
      configSnapshot: {
        executable: '/usr/local/bin/persona-trainer',
        baseModel: 'base-model-v1',
        timeoutMs: 60_000,
      },
      artifact: null,
      error: null,
      queuedAt: 1,
      startedAt: null,
      updatedAt: 1,
      finishedAt: null,
      cancellationRequestedAt: null,
    } as const
    const completedRun = {
      ...queuedRun,
      status: 'completed',
      stage: 'finalizing',
      progress: 1,
      artifact: {
        schemaVersion: 'alicization-persona-training-artifact-v1',
        artifactId: 'artifact-1',
        runId: 'run-1',
        kind: 'lora-adapter',
        path: '/tmp/artifact-1/adapter.bin',
        sha256: 'hash',
        sizeBytes: 12,
        baseModel: 'base-model-v1',
        compatibility: {
          status: 'compatible',
          baseModel: 'base-model-v1',
        },
        activation: {
          status: 'unsupported',
          reason: 'No loader receipt.',
        },
        finishedAt: 2,
      },
      updatedAt: 2,
      finishedAt: 2,
    } as const
    const memoryWorkbenchRunPersonaTraining = vi.fn(async () => ({ run: queuedRun }))
    const memoryWorkbenchGetPersonaTrainingRun = vi.fn(async () => completedRun)
    const memoryWorkbenchListPersonaTrainingRuns = vi.fn(async () => ({ items: [completedRun] }))
    const memoryWorkbenchListPersonaTrainingIncrements = vi.fn(async () => ({ items: [] }))
    setAlicizationBridge({
      memoryWorkbenchRunPersonaTraining,
      memoryWorkbenchGetPersonaTrainingRun,
      memoryWorkbenchListPersonaTrainingRuns,
      memoryWorkbenchListPersonaTrainingIncrements,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.runPersonaTraining('dataset-1')

    expect(store.personaTrainingRun).toMatchObject({
      runId: 'run-1',
      status: 'queued',
    })
    await vi.advanceTimersByTimeAsync(2_000)
    expect(memoryWorkbenchGetPersonaTrainingRun).toHaveBeenCalledWith({ runId: 'run-1' })
    expect(store.personaTrainingRun).toMatchObject({
      status: 'completed',
      progress: 1,
    })
    expect(store.personaTrainingRuns).toEqual([completedRun])
  })

  it('clears card-scoped persona training state and stops polling before a card switch', async () => {
    vi.useFakeTimers()
    const queuedRun = {
      runId: 'run-old-card',
      cardId: 'old-card',
      datasetId: 'dataset-old',
      manifestHash: 'manifest-old',
      sourceIds: ['reflection-old'],
      basePersonaRevision: 'persona-core-v1',
      status: 'queued',
      stage: 'writing-input',
      progress: 0,
      progressMessage: null,
      failureReason: null,
      configSnapshot: null,
      artifact: null,
      error: null,
      queuedAt: 1,
      startedAt: null,
      updatedAt: 1,
      finishedAt: null,
      cancellationRequestedAt: null,
    } as const
    const memoryWorkbenchRunPersonaTraining = vi.fn(async () => ({ run: queuedRun }))
    const memoryWorkbenchGetPersonaTrainingRun = vi.fn(async () => queuedRun)
    setAlicizationBridge({
      memoryWorkbenchRunPersonaTraining,
      memoryWorkbenchGetPersonaTrainingRun,
    } as any)
    const store = useAlicizationMemoryWorkbenchStore()
    await store.runPersonaTraining('dataset-old')

    store.resetPersonaTrainingScope()
    await vi.advanceTimersByTimeAsync(2_000)

    expect(memoryWorkbenchGetPersonaTrainingRun).not.toHaveBeenCalled()
    expect(store.personaTrainingRun).toBeNull()
    expect(store.personaTrainingRuns).toEqual([])
    expect(store.personaTrainingIncrements).toEqual([])
  })

  it('persists and tests the local persona trainer configuration through the bridge', async () => {
    const config = {
      executable: '/usr/local/bin/persona-trainer',
      baseModel: 'base-model-v1',
      timeoutMs: 60_000,
    }
    const memoryWorkbenchGetPersonaTrainingExecutorConfig = vi.fn(async () => ({
      configured: true,
      config,
      error: null,
    }))
    const memoryWorkbenchSetPersonaTrainingExecutorConfig = vi.fn(async () => ({
      configured: true,
      config,
      error: null,
    }))
    const memoryWorkbenchTestPersonaTrainingExecutor = vi.fn(async () => ({
      ok: true,
      executable: config.executable,
      error: null,
    }))
    setAlicizationBridge({
      memoryWorkbenchGetPersonaTrainingExecutorConfig,
      memoryWorkbenchSetPersonaTrainingExecutorConfig,
      memoryWorkbenchTestPersonaTrainingExecutor,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.loadPersonaTrainingExecutorConfig()
    await store.savePersonaTrainingExecutorConfig(config)
    await store.testPersonaTrainingExecutor(config)

    expect(store.personaTrainingExecutorConfigState).toMatchObject({
      configured: true,
      config,
    })
    expect(store.personaTrainingExecutorConnection).toMatchObject({
      ok: true,
      executable: config.executable,
    })
    expect(memoryWorkbenchSetPersonaTrainingExecutorConfig).toHaveBeenCalledWith({
      config,
    })
    expect(memoryWorkbenchTestPersonaTrainingExecutor).toHaveBeenCalledWith({
      config,
    })
  })

  it('runs quality trials and records beginner recall gold labels through the bridge', async () => {
    const label = {
      id: 'gold-1',
      cardId: 'default',
      month: '2026-08',
      label: 'missing',
      reason: 'expired',
      labelText: '没想起来',
      description: '这次应该想起某段记忆，但她没有想起。',
      evaluationClass: 'missed-recall',
      benchmarkDimensions: ['information-extraction', 'multi-session-reasoning'],
      query: '你还记得 SiliconFlow baseUrl 吗？',
      sessionId: 'session-gold',
      assistantReply: '你之前纠正过，baseUrl 只填主域名。',
      retrievedEvidenceSnapshot: [],
      expectedMemoryIds: ['reflection-siliconflow-baseurl'],
      retrievedCandidateIds: [],
      surfacedMemoryIds: [],
      wrongThreadIds: [],
      turnId: 'turn-gold',
      decisionTraceId: null,
      note: null,
      humanConfirmed: true,
      createdAt: 1,
    } as const
    const report = {
      version: 'memory-production-trial-runner-v1',
      id: 'trial-1',
      cardId: 'default',
      createdAt: 2,
      passed: false,
      summary: {
        dialogueReplayCount: 0,
        workingMemoryFixtureCount: 0,
        compressedContextBehaviorFixtureCount: 0,
        temporalConflictFixtureCount: 0,
        semanticScaleSoakRunCount: 0,
        experienceQualityFixtureCount: 0,
        scopeFuzzCaseCount: 0,
        longTermFixtureCount: 1,
        userTrialCount: 0,
        personaTrainingFixtureCount: 0,
        goldLabelCount: 0,
        goldRegressionPackId: null,
        failingStageIds: ['long-term-recall'],
        notRunStageIds: [],
        optimizationFindingCount: 0,
        recommendedActionCount: 1,
        lastError: null,
      },
      stages: [{ stage: 'long-term-recall', id: 'long-term-recall', passed: false, itemCount: 1, error: null }],
      quality: {
        passed: false,
        summary: {
          failingFixtureIds: ['gold-1'],
          recallAtK: 0,
          compressionLossCount: 0,
          blockedLeakCount: 0,
          optimizationFindingCount: 0,
          lastError: null,
        },
        traces: [{ fixtureId: 'gold-1', selectedIds: [], rankReasonsById: {} }],
        longTerm: [],
        workingMemory: [],
        userTrials: [],
        personaTraining: [],
        optimizationFindings: [],
        recommendedNextActions: ['补充当前 baseUrl 记忆。'],
      },
      compressedContextBehavior: null,
      temporalConflict: null,
      semanticScaleSoak: null,
      experienceQuality: null,
      scopeFuzz: null,
      goldRegressionPack: null,
      recommendedNextActions: ['补充当前 baseUrl 记忆。'],
    } as const
    const memoryWorkbenchListReplaySessions = vi.fn()
      .mockResolvedValueOnce({
        items: [{
          sessionId: 'session-new',
          title: '新的记忆会话',
          firstTurnAt: 10,
          lastTurnAt: 20,
          userTurnCount: 2,
          assistantTurnCount: 2,
          checkpointUpdatedAt: 30,
          activityUpdatedAt: 30,
        }],
        nextCursor: 'next-session-page',
      })
      .mockResolvedValueOnce({
        items: [{
          sessionId: 'session-old',
          title: '旧的记忆会话',
          firstTurnAt: 1,
          lastTurnAt: 5,
          userTurnCount: 1,
          assistantTurnCount: 1,
          checkpointUpdatedAt: 6,
          activityUpdatedAt: 6,
        }],
        nextCursor: null,
      })
    const memoryWorkbenchListQualityGoldLabels = vi.fn(async () => ({ items: [label], nextCursor: null }))
    const memoryWorkbenchRecordQualityGoldLabel = vi.fn(async () => label)
    const memoryWorkbenchRunQualityTrial = vi.fn(async () => report)
    const memoryWorkbenchBuildMonthlyGoldRegression = vi.fn(async () => ({
      version: 'memory-quality-monthly-gold-regression-pack-v2',
      packId: 'pack-default-2026-08',
      revision: 1,
      cardId: 'default',
      month: '2026-08',
      frozenAt: 3,
      contentHash: 'sha256:gold',
      sourceLabelIds: ['gold-1'],
      itemCount: 1,
      itemsSnapshot: [label],
      items: [label],
    }))
    setAlicizationBridge({
      memoryWorkbenchListReplaySessions,
      memoryWorkbenchListQualityGoldLabels,
      memoryWorkbenchRecordQualityGoldLabel,
      memoryWorkbenchRunQualityTrial,
      memoryWorkbenchBuildMonthlyGoldRegression,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.loadMonthlyGoldLabels('2026-08')
    await store.applyGoldLabel({
      month: '2026-08',
      label: 'missing',
      reason: 'expired',
      query: '你还记得 SiliconFlow baseUrl 吗？',
      sessionId: 'session-gold',
      turnId: 'turn-gold',
      assistantReply: '你之前纠正过，baseUrl 只填主域名。',
      retrievedEvidenceSnapshot: [],
      expectedMemoryIds: ['reflection-siliconflow-baseurl'],
      note: '她应该想起这条明确纠正。',
    })
    await store.loadQualityReplaySessions()
    await store.loadMoreQualityReplaySessions()
    store.selectQualityTrialSession('session-new')
    store.setQualityTrialMode('live-provider')
    await store.runQualityTrial('2026-08')
    await store.buildMonthlyGoldRegression('2026-08')

    expect(store.monthlyGoldLabels).toEqual([label])
    expect(store.qualityTrialReport?.summary.longTermFixtureCount).toBe(1)
    expect(store.qualityReplaySessions.map(item => item.sessionId)).toEqual([
      'session-new',
      'session-old',
    ])
    expect(store.selectedQualitySessionId).toBe('session-new')
    expect(store.monthlyGoldRegressionPack?.itemCount).toBe(1)
    expect(memoryWorkbenchListReplaySessions).toHaveBeenNthCalledWith(1, {
      limit: 20,
    })
    expect(memoryWorkbenchListReplaySessions).toHaveBeenNthCalledWith(2, {
      cursor: 'next-session-page',
      limit: 20,
    })
    expect(memoryWorkbenchRecordQualityGoldLabel).toHaveBeenCalledWith(expect.objectContaining({
      label: 'missing',
      reason: 'expired',
      query: '你还记得 SiliconFlow baseUrl 吗？',
      note: '她应该想起这条明确纠正。',
    }))
    expect(memoryWorkbenchRunQualityTrial).toHaveBeenCalledWith({
      mode: 'live-provider',
      month: '2026-08',
      sessionId: 'session-new',
    })
  })

  it('keeps quality trials explicit and clears stale results when the session context changes', async () => {
    const report = {
      version: 'memory-production-trial-runner-v1',
      id: 'quality-report-session-a',
      cardId: 'default',
      createdAt: 1,
      passed: true,
      stages: [],
      summary: {
        stageCount: 0,
        passedStageCount: 0,
        failedStageIds: [],
        failingStageIds: [],
        notRunStageIds: [],
        workingMemoryFixtureCount: 0,
        compressedContextBehaviorFixtureCount: 0,
        longTermFixtureCount: 0,
        temporalConflictFixtureCount: 0,
        scopeFuzzCaseCount: 0,
        personaTrainingExampleCount: 0,
        dialogueReplayCount: 0,
        liveProviderTrialCount: 0,
        runtimeHealthProbeCount: 0,
        semanticScaleSoakRunCount: 0,
        experienceQualityFixtureCount: 0,
        averageScore: 1,
      },
      quality: {
        workingMemory: null,
        compressedContextBehavior: null,
        longTerm: [],
        temporalConflict: null,
        scopeFuzz: null,
        personaTraining: null,
        experienceQuality: null,
      },
      dialogueReplay: null,
      liveProviderTrial: null,
      runtimeHealth: null,
      semanticScaleSoak: null,
      recommendedNextActions: [],
    } as const
    const memoryWorkbenchRunQualityTrial = vi.fn(async () => report)
    setAlicizationBridge({
      memoryWorkbenchRunQualityTrial,
      memoryWorkbenchListReplaySessions: vi.fn(async () => ({
        items: [{
          sessionId: 'session-a',
          title: '会话 A',
          firstTurnAt: 1,
          lastTurnAt: 2,
          userTurnCount: 1,
          assistantTurnCount: 1,
          checkpointUpdatedAt: 3,
          activityUpdatedAt: 3,
        }],
        nextCursor: null,
      })),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.loadQualityReplaySessions()

    expect(store.selectedQualitySessionId).toBe('session-a')
    await store.runQualityTrial('2026-08')
    expect(store.qualityTrialReport?.id).toBe('quality-report-session-a')

    store.setQualityTrialMode('live-provider')
    expect(store.qualityTrialReport).toBeNull()

    store.resetQualityTrialContext()
    expect(store.qualityReplaySessions).toEqual([])
    expect(store.selectedQualitySessionId).toBe('')
    expect(store.qualityTrialMode).toBe('historical-replay')
  })

  it('releases quality trial loading when an in-flight result is invalidated by context changes', async () => {
    let resolveTrial: ((value: any) => void) | undefined
    const memoryWorkbenchRunQualityTrial = vi.fn(() => new Promise((resolve) => {
      resolveTrial = resolve
    }))
    setAlicizationBridge({
      memoryWorkbenchRunQualityTrial,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    store.selectQualityTrialSession('session-a')
    const pending = store.runQualityTrial('2026-08')

    expect(store.qualityTrialLoading).toBe(true)
    store.setQualityTrialMode('live-provider')
    expect(store.qualityTrialLoading).toBe(false)

    resolveTrial?.({
      id: 'stale-report',
    })
    await expect(pending).resolves.toBeNull()
    expect(store.qualityTrialReport).toBeNull()
  })

  it('cancels the active quality trial through the bridge and clears stale report state', async () => {
    let resolveTrial: ((value: any) => void) | undefined
    const memoryWorkbenchRunQualityTrial = vi.fn(() => new Promise((resolve) => {
      resolveTrial = resolve
    }))
    const memoryWorkbenchCancelQualityTrial = vi.fn(async () => ({
      cardId: 'default',
      cancelled: true,
      reason: 'user cancelled quality trial',
    }))
    setAlicizationBridge({
      memoryWorkbenchRunQualityTrial,
      memoryWorkbenchCancelQualityTrial,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    store.selectQualityTrialSession('session-a')
    void store.runQualityTrial('2026-08')
    expect(store.qualityTrialLoading).toBe(true)

    await store.cancelQualityTrial('user cancelled quality trial')

    expect(memoryWorkbenchCancelQualityTrial).toHaveBeenCalledWith({
      reason: 'user cancelled quality trial',
    })
    expect(store.qualityTrialLoading).toBe(false)
    expect(store.qualityTrialReport).toBeNull()

    resolveTrial?.({ id: 'late-report' })
    await vi.waitFor(() => expect(store.qualityTrialLoading).toBe(false))
    expect(store.qualityTrialReport).toBeNull()
  })

  it('does not start a quality trial without an explicitly selected replay session', async () => {
    const memoryWorkbenchRunQualityTrial = vi.fn()
    setAlicizationBridge({
      memoryWorkbenchRunQualityTrial,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    const result = await store.runQualityTrial('2026-08')

    expect(result).toBeNull()
    expect(memoryWorkbenchRunQualityTrial).not.toHaveBeenCalled()
  })
})
