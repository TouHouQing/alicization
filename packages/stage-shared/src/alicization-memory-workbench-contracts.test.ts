import type { AlicizationPersonaTrainingPipelineIncrement } from './alicization-memory-workbench-contracts'

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
      sourceIds: ['reflection-a'],
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
