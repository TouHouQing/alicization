import type {
  AlicizationMemoryQualityGoldLabelPayload,
  AlicizationMemoryQualityMonthlyGoldRegressionPack,
  AlicizationMemoryQualityTrialReport,
  AlicizationPersonaTrainingPipelineIncrement,
} from './alicization-memory-workbench-contracts'

import { describe, expect, it } from 'vitest'

import {
  parseAlicizationPersonaTrainingArtifact,
  projectAlicizationMemoryQualityTrialReportSurface,
} from './alicization-memory-workbench-contracts'

describe('alicization persona training artifact contract', () => {
  it('exposes pending cleanup availability metadata on persona increments', () => {
    const increment = {
      id: 'persona-training-increment:run-cleanup',
      kind: 'persona-lora-increment',
      cardId: 'card-a',
      datasetId: 'dataset-a',
      manifestHash: 'manifest-a',
      sourceRefs: [{
        sourceId: 'reflection-a',
        sourceKind: 'cleaned-long-term-reflection',
      }],
      basePersonaRevision: 'persona-core-v1',
      artifact: {
        schemaVersion: 'alicization-persona-training-artifact-v1',
        artifactId: 'artifact-cleanup',
        runId: 'run-cleanup',
        kind: 'lora-adapter',
        path: '/tmp/artifact-cleanup.safetensors',
        sha256: 'a'.repeat(64),
        sizeBytes: 1,
        baseModel: 'base-model-v1',
        compatibility: {
          status: 'compatible',
          baseModel: 'base-model-v1',
        },
        activation: {
          status: 'inactive',
          reason: 'Cleanup is pending.',
        },
      },
      state: 'available',
      cleanup: {
        status: 'pending',
        stage: 'discard',
        lastError: 'artifact store unavailable',
      },
      createdAt: 1,
    } satisfies AlicizationPersonaTrainingPipelineIncrement

    expect(increment.cleanup).toEqual({
      status: 'pending',
      stage: 'discard',
      lastError: 'artifact store unavailable',
    })
  })

  it('accepts the complete shared artifact schema', () => {
    expect(parseAlicizationPersonaTrainingArtifact({
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-1',
      runId: 'run-1',
      kind: 'lora-adapter',
      path: '/tmp/persona-training/artifacts/artifact-1/output/adapter.safetensors',
      sha256: 'a'.repeat(64),
      sizeBytes: 1024,
      baseModel: 'base-model-v1',
      compatibility: {
        status: 'compatible',
        baseModel: 'base-model-v1',
        reason: null,
      },
      activation: {
        status: 'unsupported',
        reason: 'No loader receipt is available.',
      },
    })).toMatchObject({
      artifactId: 'artifact-1',
      runId: 'run-1',
      kind: 'lora-adapter',
    })
  })

  it('preserves omitted compatibility metadata on legacy artifacts', () => {
    const artifact = parseAlicizationPersonaTrainingArtifact({
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-legacy',
      runId: 'run-legacy',
      kind: 'lora-adapter',
      path: '/tmp/persona-training/artifacts/artifact-legacy/output/adapter.safetensors',
      sha256: 'a'.repeat(64),
      sizeBytes: 1024,
      baseModel: 'base-model-v1',
      compatibility: {
        status: 'compatible',
        baseModel: 'base-model-v1',
        reason: null,
      },
      activation: {
        status: 'unsupported',
        reason: 'No loader receipt is available.',
      },
    })

    expect(artifact).not.toHaveProperty('compatibilityReason')
  })

  it('keeps training readiness separate from dialogue readiness for MLX artifacts', () => {
    expect(parseAlicizationPersonaTrainingArtifact({
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-mlx',
      runId: 'run-mlx',
      kind: 'lora-adapter',
      path: '/tmp/persona-training/artifacts/artifact-mlx/output/adapters.safetensors',
      sha256: 'd'.repeat(64),
      sizeBytes: 42,
      baseModel: 'base-model-v1',
      trainingReady: true,
      dialogueReady: false,
      compatibilityReason: '需要真实转换后才能被 llama.cpp 使用。',
      format: 'mlx-safetensors',
      producerBackend: 'mlx-lm',
      loaderTarget: 'llama.cpp',
      conversion: {
        status: 'required',
        sourceArtifactId: 'artifact-mlx',
      },
      compatibility: {
        status: 'incompatible',
        baseModel: 'base-model-v1',
        reason: '需要真实转换后才能被 llama.cpp 使用。',
      },
      activation: {
        status: 'unsupported',
        reason: '训练产物未进入对话运行时。',
      },
    })).toMatchObject({
      trainingReady: true,
      dialogueReady: false,
      format: 'mlx-safetensors',
      producerBackend: 'mlx-lm',
      loaderTarget: 'llama.cpp',
      conversion: { status: 'required' },
      compatibility: { status: 'incompatible' },
    })
  })

  it('accepts an active artifact only when it carries a real loader receipt', () => {
    expect(parseAlicizationPersonaTrainingArtifact({
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-active',
      runId: 'run-active',
      kind: 'lora-adapter',
      path: '/tmp/persona-training/artifacts/artifact-active/output/adapter.safetensors',
      sha256: 'b'.repeat(64),
      sizeBytes: 2048,
      baseModel: 'base-model-v1',
      compatibility: {
        status: 'compatible',
        baseModel: 'base-model-v1',
      },
      activation: {
        status: 'active',
        reason: 'Loaded by the local adapter runtime.',
        loaderId: 'test-loader',
        receiptId: 'receipt-active',
        activatedAt: 123,
      },
    })).toMatchObject({
      activation: {
        status: 'active',
        loaderId: 'test-loader',
        receiptId: 'receipt-active',
        activatedAt: 123,
      },
    })
  })

  it.each([
    null,
    '123',
    1.5,
    -1,
  ])('rejects active artifact activatedAt values that are not native non-negative safe integers: %j', (activatedAt) => {
    expect(() => parseAlicizationPersonaTrainingArtifact({
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-invalid-activation-time',
      runId: 'run-invalid-activation-time',
      kind: 'lora-adapter',
      path: '/tmp/persona-training/artifacts/artifact-invalid-activation-time/output/adapter.safetensors',
      sha256: 'c'.repeat(64),
      sizeBytes: 2048,
      baseModel: 'base-model-v1',
      compatibility: {
        status: 'compatible',
        baseModel: 'base-model-v1',
      },
      activation: {
        status: 'active',
        reason: 'Loaded by the local adapter runtime.',
        loaderId: 'test-loader',
        receiptId: 'receipt-active',
        activatedAt,
      },
    })).toThrow('activation.activatedAt must be a non-negative safe integer')
  })

  it.each([
    null,
    { artifactPath: '/tmp/legacy.safetensors' },
    {
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-1',
      runId: 'run-1',
      kind: 'lora-adapter',
      path: '/tmp/adapter.safetensors',
      sha256: 'not-a-sha256',
      sizeBytes: -1,
      baseModel: 'base-model-v1',
      compatibility: {
        status: 'compatible',
        baseModel: 'base-model-v1',
      },
      activation: {
        status: 'unsupported',
        reason: '',
      },
    },
    {
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-array-status',
      runId: 'run-array-status',
      kind: 'lora-adapter',
      path: '/tmp/adapter-array-status.safetensors',
      sha256: 'a'.repeat(64),
      sizeBytes: 1024,
      baseModel: 'base-model-v1',
      compatibility: {
        status: ['compatible'],
        baseModel: 'base-model-v1',
      },
      activation: {
        status: 'unsupported',
        reason: 'No loader receipt is available.',
      },
    },
    {
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-object-status',
      runId: 'run-object-status',
      kind: 'lora-adapter',
      path: '/tmp/adapter-object-status.safetensors',
      sha256: 'a'.repeat(64),
      sizeBytes: 1024,
      baseModel: 'base-model-v1',
      compatibility: {
        status: {
          toString: (): string => 'compatible',
        },
        baseModel: 'base-model-v1',
      },
      activation: {
        status: 'unsupported',
        reason: 'No loader receipt is available.',
      },
    },
    {
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-active-without-receipt',
      runId: 'run-active-without-receipt',
      kind: 'lora-adapter',
      path: '/tmp/adapter-active-without-receipt.safetensors',
      sha256: 'a'.repeat(64),
      sizeBytes: 1024,
      baseModel: 'base-model-v1',
      compatibility: {
        status: 'compatible',
        baseModel: 'base-model-v1',
      },
      activation: {
        status: 'active',
        reason: 'Claims to be active without evidence.',
      },
    },
  ])('rejects an invalid persisted artifact %#', (artifact) => {
    expect(() => parseAlicizationPersonaTrainingArtifact(artifact))
      .toThrow('invalid Alicization persona training artifact')
  })
})

describe('alicization memory quality gold contract', () => {
  it('binds a human label to the replay turn, reply, and immutable evidence snapshot', () => {
    const payload = {
      cardId: 'card-a',
      conversationSampleId: 'memory-quality-sample:card-a:session-a:turn-a',
      month: '2026-08',
      label: 'missing',
      reason: 'expired',
      query: '你还记得我现在使用什么编辑器吗？',
      sessionId: 'session-a',
      turnId: 'turn-a',
      decisionTraceId: 'trace-a',
      assistantReply: '我这次没有想起来。',
      retrievedEvidenceSnapshot: [{
        id: 'memory-editor-v2',
        kind: 'fact',
        summary: '用户现在使用 Zed。',
        source: 'memory_facts',
        score: 0.91,
        confidence: 0.95,
        sensitivity: 'personal',
        scope: {
          userId: 'user-a',
          cardId: 'card-a',
        },
        provenance: 'remembered',
        evidenceVersion: 'evidence-v1',
        version: 'memory-v2',
        queryMatches: ['编辑器'],
        rankReasons: ['semantic-match'],
      }],
      expectedMemoryIds: ['memory-editor-v2'],
      retrievedCandidateIds: ['memory-editor-v2'],
      surfacedMemoryIds: [],
      wrongThreadIds: [],
      note: '人工确认：应该召回但没有出现在回复中。',
    } satisfies AlicizationMemoryQualityGoldLabelPayload

    expect(payload.sessionId).toBe('session-a')
    expect(payload.retrievedEvidenceSnapshot).toHaveLength(1)
    expect(payload.assistantReply).toContain('没有想起来')
  })

  it('requires a frozen pack snapshot rather than a live label list', () => {
    const pack = {
      version: 'memory-quality-monthly-gold-regression-pack-v2',
      packId: 'gold-pack-card-a-2026-08',
      revision: 1,
      cardId: 'card-a',
      month: '2026-08',
      frozenAt: 1_755_000_000_000,
      contentHash: 'sha256:abc',
      sourceLabelIds: ['gold-label-a'],
      itemCount: 1,
      itemsSnapshot: [],
      items: [],
    } satisfies AlicizationMemoryQualityMonthlyGoldRegressionPack

    expect(pack.frozenAt).toBeGreaterThan(0)
    expect(pack.contentHash).toMatch(/^sha256:/u)
    expect(pack.itemsSnapshot).toEqual([])
  })
})

describe('alicization memory quality renderer projection', () => {
  it('keeps bounded quality diagnostics while dropping raw report fields', () => {
    const report = {
      version: 'memory-production-trial-runner-v1',
      id: 'quality-report-1',
      cardId: 'card-a',
      createdAt: 1,
      passed: false,
      summary: {
        dialogueReplayCount: 0,
        workingMemoryFixtureCount: 1,
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
        optimizationFindingCount: 1,
        recommendedActionCount: 1,
        lastError: 'timeout',
      },
      stages: [],
      dialogueReplay: null,
      liveProviderTrial: null,
      runtimeHealth: null,
      quality: {
        version: 'memory-quality-harness-v1',
        passed: false,
        createdAt: 1,
        summary: {
          longTermFixtureCount: 1,
          workingMemoryFixtureCount: 1,
          userTrialCount: 0,
          personaTrainingFixtureCount: 0,
          failingFixtureIds: ['fixture-1'],
          recallAtK: 1,
          recallAt1: 1,
          recallAt3: 1,
          recallAt5: 1,
          wrongThreadRate: 0,
          semanticHitRate: 1,
          sourceTraceRate: 1,
          abstentionPrecision: 1,
          abstentionRecall: 1,
          p50LatencyMs: 10,
          p95LatencyMs: 20,
          p99LatencyMs: 30,
          compressionLossCount: 0,
          blockedLeakCount: 0,
          optimizationFindingCount: 1,
          lastError: null,
        },
        traces: [{
          id: 'trace-1',
          fixtureId: 'fixture-1',
          owner: 'LongTermMemoryRecall',
          query: 'private raw user query',
          intentMode: 'semantic',
          queryPlan: {
            lexicalQueries: ['private query plan'],
            phraseQueries: [],
            semanticQueries: [],
            threadHints: [],
          },
          selectedIds: ['memory-1'],
          rejectedIds: ['memory-2'],
          forbiddenIds: ['memory-3'],
          rankReasonsById: {
            'memory-1': ['semantic-match', 'private quality query'],
          },
          semantic: {
            available: true,
            providerId: 'provider-1',
            modelId: 'model-1',
            dimensions: 1024,
            reindexRequired: false,
          },
          metrics: {
            recallAtK: 1,
            precisionAtK: 1,
            mrr: 1,
            ndcg: 1,
            falseRecallRate: 0,
            wrongThreadRate: 0,
            blockedLeakCount: 0,
            semanticHitRate: 1,
            sourceTraceRate: 1,
            latencyMs: 10,
          },
          error: null,
          createdAt: 1,
          privateTraceDiagnostic: 'private-quality-trace-sentinel',
        }],
        longTerm: [],
        workingMemory: [],
        userTrials: [],
        personaTraining: [],
        optimizationFindings: [{
          code: 'long-term-recall-miss',
          severity: 'critical',
          fixtureId: 'fixture-1',
          message: 'private finding message',
          suggestedAction: 'repair recall',
        }],
        recommendedNextActions: ['repair recall'],
      },
      finalReplayGate: {
        version: 'final-replay-gate-v1',
        passed: false,
        failingKeys: ['long-term-recall', 'private-failing-key'],
        metrics: {
          recallAt3: 0.5,
          precisionAt3: 0.5,
          wrongThreadRate: 0.5,
          templateLeakageFailCount: 1,
          authorityLeakCount: 2,
          localHumanlikeVisibleFallbackCount: 3,
          latencyBudgetPass: false,
          privateMetric: 'private-final-gate-metric',
        },
        privateFinalReplayDiagnostic: 'private-final-replay-sentinel',
      },
      goldRegressionPack: null,
      regression: {
        recallAt1: 1,
        recallAt3: 1,
        recallAt5: 1,
        wrongThreadRate: 0,
        semanticHitRate: 1,
        sourceTraceRate: 1,
        abstentionPrecision: 1,
        abstentionRecall: 1,
        p50LatencyMs: 10,
        p95LatencyMs: 20,
        p99LatencyMs: 30,
        staleMemoryLeakRate: 0,
        temporalUpdateAccuracy: 1,
        providerFailureRate: 0,
        queueFailureRate: 0,
        deadLetterRate: 0,
        embeddingCoverageRatio: 1,
      },
      compressedContextBehavior: null,
      temporalConflict: null,
      semanticScaleSoak: null,
      experienceQuality: null,
      scopeFuzz: null,
      recommendedNextActions: ['repair recall'],
    } as unknown as AlicizationMemoryQualityTrialReport

    const surface = projectAlicizationMemoryQualityTrialReportSurface(report)

    expect(surface.finalReplayGate).toMatchObject({
      version: 'final-replay-gate-v1',
      passed: false,
      failingKeys: ['long-term-recall', 'private-failing-key'],
      metrics: {
        recallAt3: 0.5,
        precisionAt3: 0.5,
        wrongThreadRate: 0.5,
        templateLeakageFailCount: 1,
        authorityLeakCount: 2,
        localHumanlikeVisibleFallbackCount: 3,
        latencyBudgetPass: false,
      },
    })
    expect(surface.quality.traces).toEqual([expect.objectContaining({
      id: 'trace-1',
      fixtureId: 'fixture-1',
      owner: 'LongTermMemoryRecall',
      selectedIds: ['memory-1'],
      semantic: {
        available: true,
        providerId: 'provider-1',
        modelId: 'model-1',
        dimensions: 1024,
        reindexRequired: false,
      },
      rankReasonsById: {
        'memory-1': ['semantic-match'],
      },
    })])
    expect(JSON.stringify(surface)).not.toContain('private raw user query')
    expect(JSON.stringify(surface)).not.toContain('private query plan')
    expect(JSON.stringify(surface)).not.toContain('private-quality-trace-sentinel')
    expect(JSON.stringify(surface)).not.toContain('private-final-replay-sentinel')
    expect(JSON.stringify(surface)).not.toContain('private-final-gate-metric')
    expect(JSON.stringify(surface)).not.toContain('private finding message')
  })
})
