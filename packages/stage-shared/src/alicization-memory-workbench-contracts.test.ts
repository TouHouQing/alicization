import type {
  AlicizationMemoryQualityGoldLabelPayload,
  AlicizationMemoryQualityMonthlyGoldRegressionPack,
  AlicizationPersonaTrainingPipelineIncrement,
} from './alicization-memory-workbench-contracts'

import { describe, expect, it } from 'vitest'

import { parseAlicizationPersonaTrainingArtifact } from './alicization-memory-workbench-contracts'

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
