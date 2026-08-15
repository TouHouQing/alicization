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
      expectedMemoryIds: ['reflection-siliconflow-baseurl'],
      retrievedCandidateIds: [],
      surfacedMemoryIds: [],
      wrongThreadIds: [],
      turnId: null,
      decisionTraceId: null,
      note: null,
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
        }],
        nextCursor: null,
      })
    const memoryWorkbenchListQualityGoldLabels = vi.fn(async () => ({ items: [label], nextCursor: null }))
    const memoryWorkbenchRecordQualityGoldLabel = vi.fn(async () => label)
    const memoryWorkbenchRunQualityTrial = vi.fn(async () => report)
    const memoryWorkbenchBuildMonthlyGoldRegression = vi.fn(async () => ({
      version: 'memory-quality-monthly-gold-regression-pack-v1',
      cardId: 'default',
      month: '2026-08',
      itemCount: 1,
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
      note: expect.stringContaining('expired'),
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
        }],
        nextCursor: null,
      })),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.loadQualityReplaySessions()

    expect(store.selectedQualitySessionId).toBe('')
    await expect(store.runQualityTrial('2026-08')).resolves.toBeNull()
    expect(memoryWorkbenchRunQualityTrial).not.toHaveBeenCalled()

    store.selectQualityTrialSession('session-a')
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
