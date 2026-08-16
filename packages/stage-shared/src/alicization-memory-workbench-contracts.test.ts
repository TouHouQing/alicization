import { describe, expect, it } from 'vitest'

import { parseAlicizationPersonaTrainingArtifact } from './alicization-memory-workbench-contracts'

describe('alicization persona training artifact contract', () => {
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
          toString: () => 'compatible',
        },
        baseModel: 'base-model-v1',
      },
      activation: {
        status: 'unsupported',
        reason: 'No loader receipt is available.',
      },
    },
  ])('rejects an invalid persisted artifact %#', (artifact) => {
    expect(() => parseAlicizationPersonaTrainingArtifact(artifact))
      .toThrow('invalid Alicization persona training artifact')
  })
})
