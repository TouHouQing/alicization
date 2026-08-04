import type { PersonaTrainingDatasetSource } from './persona-training-dataset-runtime'

import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  buildPersonaTrainingDatasetManifest,
  classifyPersonaTrainingDatasetSource,
  createPersonaTrainingDatasetRuntime,
  PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
  PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
} from './persona-training-dataset-runtime'

function createMemoryRepository() {
  const datasets: any[] = []
  const examples: any[] = []
  const exports: any[] = []
  const active = new Map<string, string>()

  return {
    datasets,
    examples,
    exports,
    active,
    repository: {
      listVersions: async (cardId: string) => datasets.filter(item => item.cardId === cardId),
      createVersion: async (input: any) => {
        const version = {
          ...input,
          id: `dataset:${input.cardId}:${input.version}`,
          createdAt: input.createdAt,
          exportedAt: null,
          activeAt: null,
          rolledBackAt: null,
        }
        datasets.push(version)
        return version
      },
      insertExamples: async (items: any[]) => {
        examples.push(...items)
        return items
      },
      listExamples: async (cardId: string, datasetId: string) => examples.filter(item => item.cardId === cardId && item.datasetId === datasetId),
      appendExport: async (input: any) => {
        exports.push(input)
        return input
      },
      setActiveVersion: async (cardId: string, datasetId: string, at: number) => {
        for (const item of datasets) {
          if (item.cardId === cardId)
            item.activeAt = null
        }
        active.set(cardId, datasetId)
        const dataset = datasets.find(item => item.cardId === cardId && item.id === datasetId)
        if (dataset)
          dataset.activeAt = at
        return dataset ?? null
      },
      rollbackToVersion: async (cardId: string, datasetId: string, at: number) => {
        const previousActiveId = active.get(cardId)
        const previousActive = datasets.find(item => item.cardId === cardId && item.id === previousActiveId)
        if (previousActive && previousActive.id !== datasetId) {
          previousActive.activeAt = null
          previousActive.rolledBackAt = at
        }
        const dataset = datasets.find(item => item.cardId === cardId && item.id === datasetId)
        if (!dataset)
          return null
        dataset.activeAt = at
        dataset.rolledBackAt = null
        active.set(cardId, datasetId)
        return dataset
      },
      revokeSource: async (cardId: string, sourceId: string, at: number) => {
        let affected = 0
        for (const example of examples) {
          if (example.cardId === cardId && example.sourceId === sourceId && example.state !== 'revoked') {
            example.state = 'revoked'
            example.allowTraining = false
            example.revokedAt = at
            affected += 1
          }
        }
        return affected
      },
      updateExamplePolicy: async (input: any) => {
        const example = examples.find(item => item.cardId === input.cardId && item.id === input.exampleId)
        if (!example || example.state === 'revoked')
          return null
        Object.assign(example, input)
        return example
      },
    },
  }
}

function cleanedSource(
  overrides: Partial<PersonaTrainingDatasetSource> = {},
): PersonaTrainingDatasetSource {
  return {
    cardId: 'card-a',
    sourceId: 'reflection-1',
    sourceKind: 'cleaned-long-term-reflection',
    status: 'confirmed',
    cleaned: true,
    summary: '在失败时直接说明事实。',
    lesson: '不要用预设回复掩盖失败。',
    sensitivity: 'personal',
    provenance: {
      kind: 'working-memory-cleaning',
      cleaningTransactionId: 'cleaning-1',
      cleanedAt: 1,
    },
    ...overrides,
  }
}

describe('persona training dataset runtime', () => {
  it('accepts only cleaned confirmed reflections and persona reinforcement, with training disabled by default', () => {
    expect(classifyPersonaTrainingDatasetSource({
      cardId: 'card-a',
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
      status: 'confirmed',
      cleaned: true,
      summary: '在失败时直接说明事实。',
      lesson: '不要用固定文案掩盖失败。',
      sensitivity: 'personal',
      provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: 'cleaning-1', cleanedAt: 1 },
    })).toMatchObject({
      accepted: true,
      allowTraining: false,
      piiStatus: 'clear',
    })

    expect(classifyPersonaTrainingDatasetSource({
      cardId: 'card-a',
      sourceId: 'raw-1',
      sourceKind: 'raw-transcript',
      status: 'confirmed',
      cleaned: false,
      summary: 'raw',
      lesson: 'raw',
      sensitivity: 'personal',
    }).accepted).toBe(false)

    expect(classifyPersonaTrainingDatasetSource({
      cardId: 'card-a',
      sourceId: 'failed-1',
      sourceKind: 'failure-artifact',
      status: 'confirmed',
      cleaned: false,
      summary: 'provider failed',
      lesson: 'fallback',
      sensitivity: 'personal',
    }).accepted).toBe(false)
  })

  it('quarantines PII and fixed-template residue instead of exporting it', () => {
    expect(classifyPersonaTrainingDatasetSource({
      cardId: 'card-a',
      sourceId: 'reflection-pii',
      sourceKind: 'cleaned-long-term-reflection',
      status: 'confirmed',
      cleaned: true,
      summary: '联系 alice@example.com',
      lesson: '记住这个邮箱。',
      sensitivity: 'personal',
      provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: 'cleaning-1', cleanedAt: 1 },
    })).toMatchObject({
      accepted: true,
      state: 'quarantined',
      piiStatus: 'detected',
    })

    expect(classifyPersonaTrainingDatasetSource({
      cardId: 'card-a',
      sourceId: 'reflection-template',
      sourceKind: 'cleaned-long-term-reflection',
      status: 'confirmed',
      cleaned: true,
      summary: 'fixed-template-residue',
      lesson: 'fixed-template-residue',
      sensitivity: 'personal',
      provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: 'cleaning-1', cleanedAt: 1 },
    })).toMatchObject({
      accepted: true,
      state: 'quarantined',
    })
  })

  it('deduplicates examples by deterministic content hash and preserves an immutable manifest', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 100,
      randomUUID: () => 'uuid-1',
      listSources: async () => [
        {
          cardId: 'card-a',
          sourceId: 'reflection-1',
          sourceKind: 'cleaned-long-term-reflection',
          status: 'confirmed',
          cleaned: true,
          summary: '在失败时直接说明事实。',
          lesson: '不要用固定文案掩盖失败。',
          sensitivity: 'personal',
          provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: 'cleaning-1', cleanedAt: 1 },
        },
        {
          cardId: 'card-a',
          sourceId: 'reflection-duplicate',
          sourceKind: 'cleaned-long-term-reflection',
          status: 'confirmed',
          cleaned: true,
          summary: '在失败时直接说明事实。',
          lesson: '不要用固定文案掩盖失败。',
          sensitivity: 'personal',
          provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: 'cleaning-2', cleanedAt: 1 },
        },
      ],
    })

    const version = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: false, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    expect(version.schemaVersion).toBe(PERSONA_TRAINING_DATASET_SCHEMA_VERSION)
    expect(memory.examples).toHaveLength(1)
    expect(memory.examples[0].allowTraining).toBe(false)

    const manifest = buildPersonaTrainingDatasetManifest({
      dataset: version,
      examples: memory.examples,
      exportedAt: 110,
    })
    expect(manifest.manifestHash).toMatch(/^[a-f0-9]{64}$/)
    expect(manifest.examples).toHaveLength(0)
    expect(buildPersonaTrainingDatasetManifest({
      dataset: version,
      examples: memory.examples,
      exportedAt: 111,
    }).manifestHash).toBe(manifest.manifestHash)
  })

  it('requires explicit consent and allowTraining before export, and supports active version rollback', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 200,
      randomUUID: () => 'uuid-2',
      listSources: async () => [{
        cardId: 'card-a',
        sourceId: 'reinforcement-1',
        sourceKind: 'persona-reinforcement',
        status: 'confirmed',
        cleaned: true,
        summary: '更重视直接说明召回不确定性。',
        lesson: '在不确定时说清楚。',
        sensitivity: 'public',
        provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: 'cleaning-1', cleanedAt: 1 },
      }],
    })

    const first = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    await runtime.setExamplePolicy({
      cardId: 'card-a',
      exampleId: memory.examples[0].id,
      allowTraining: true,
      consent: { granted: false, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    expect((await runtime.exportVersion({ cardId: 'card-a', datasetId: first.id })).manifest.examples).toHaveLength(0)

    await runtime.setExamplePolicy({
      cardId: 'card-a',
      exampleId: memory.examples[0].id,
      allowTraining: true,
      consent: { granted: true, policyVersion: 'v2', scope: 'persona-dataset' },
    })
    expect(memory.examples[0]).toMatchObject({
      state: 'staged',
      allowTraining: true,
      consentSnapshot: { granted: true },
    })
    const exported = await runtime.exportVersion({ cardId: 'card-a', datasetId: first.id })
    expect(exported.manifest.examples).toHaveLength(1)

    await runtime.activateVersion({ cardId: 'card-a', datasetId: first.id })
    const second = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v2', scope: 'persona-dataset' },
    })
    await runtime.setExamplePolicy({
      cardId: 'card-a',
      exampleId: memory.examples.find(item => item.datasetId === second.id).id,
      allowTraining: true,
      consent: { granted: true, policyVersion: 'v2', scope: 'persona-dataset' },
    })
    await runtime.activateVersion({ cardId: 'card-a', datasetId: second.id })
    await runtime.rollbackVersion({ cardId: 'card-a', datasetId: first.id })
    expect(memory.active.get('card-a')).toBe(first.id)
    expect(memory.datasets.find(item => item.id === first.id)).toMatchObject({
      activeAt: 200,
      rolledBackAt: null,
    })
    expect(memory.datasets.find(item => item.id === second.id)).toMatchObject({
      activeAt: null,
      rolledBackAt: 200,
    })

    await runtime.revokeSource({ cardId: 'card-a', sourceId: 'reinforcement-1' })
    expect(memory.examples[0]).toMatchObject({
      state: 'revoked',
      allowTraining: false,
    })
  })

  it('rejects a confirmed reflection when cleaning provenance is absent', () => {
    expect(classifyPersonaTrainingDatasetSource({
      cardId: 'card-a',
      sourceId: 'reflection-without-provenance',
      sourceKind: 'cleaned-long-term-reflection',
      status: 'confirmed',
      cleaned: true,
      summary: '这是一条看起来已经确认的反思。',
      lesson: '但它没有清洗事务来源。',
      sensitivity: 'personal',
    })).toMatchObject({
      accepted: false,
      state: 'quarantined',
      allowTraining: false,
      rejectionReason: 'source is not a cleaned confirmed persona source',
    })
  })

  it('rejects a source whose card ownership differs from the staged dataset', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 300,
      randomUUID: () => 'uuid-cross-card',
      listSources: async () => [
        cleanedSource({
          cardId: 'card-b',
          sourceId: 'foreign-reflection',
          allowTraining: true,
        }),
      ],
    })

    await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })

    expect(memory.examples).toHaveLength(0)
  })

  it('includes the example schema version in the stable content hash', () => {
    const result = classifyPersonaTrainingDatasetSource(cleanedSource())
    const expected = createHash('sha256')
      .update(JSON.stringify({
        schemaVersion: PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
        behaviorLesson: result.behaviorLesson,
        negativeExample: result.negativeExample,
        positiveExample: result.positiveExample,
        sourceKind: result.sourceKind,
      }))
      .digest('hex')

    expect(result.contentHash).toBe(expected)
  })

  it('quarantines private and secret sources and never lets policy enable them', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 400,
      randomUUID: () => 'uuid-sensitive',
      listSources: async () => [
        cleanedSource({
          sourceId: 'private-reflection',
          sensitivity: 'private',
        }),
        cleanedSource({
          sourceId: 'secret-reflection',
          sensitivity: 'secret',
          lesson: '这是另一条敏感反思。',
        }),
      ],
    })

    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    expect(memory.examples).toHaveLength(2)
    expect(memory.examples).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceId: 'private-reflection',
        state: 'quarantined',
        allowTraining: false,
      }),
      expect.objectContaining({
        sourceId: 'secret-reflection',
        state: 'quarantined',
        allowTraining: false,
      }),
    ]))

    const updated = await runtime.setExamplePolicy({
      cardId: 'card-a',
      exampleId: memory.examples[0].id,
      allowTraining: true,
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    expect(updated).toMatchObject({
      state: 'quarantined',
      allowTraining: false,
    })
    await expect(runtime.activateVersion({
      cardId: 'card-a',
      datasetId: dataset.id,
    })).rejects.toThrow('no eligible training examples')
  })

  it('requires granted dataset and example consent for export and activation', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 500,
      randomUUID: () => 'uuid-consent',
      listSources: async () => [cleanedSource()],
    })

    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: false, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    await runtime.setExamplePolicy({
      cardId: 'card-a',
      exampleId: memory.examples[0].id,
      allowTraining: true,
      consent: { granted: true, policyVersion: 'v2', scope: 'persona-dataset' },
    })

    expect((await runtime.exportVersion({
      cardId: 'card-a',
      datasetId: dataset.id,
    })).manifest.examples).toHaveLength(0)
    await expect(runtime.activateVersion({
      cardId: 'card-a',
      datasetId: dataset.id,
    })).rejects.toThrow('dataset consent is not granted')
  })

  it('keeps manifests reproducible with count, schema, hash, and cleaning provenance', async () => {
    const stage = async (sources: PersonaTrainingDatasetSource[]) => {
      const memory = createMemoryRepository()
      const runtime = createPersonaTrainingDatasetRuntime({
        repository: memory.repository,
        now: () => 600,
        randomUUID: () => 'uuid-manifest',
        listSources: async () => sources,
      })
      const dataset = await runtime.stageVersion({
        cardId: 'card-a',
        consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: 599 },
      })
      return buildPersonaTrainingDatasetManifest({
        dataset,
        examples: memory.examples,
        exportedAt: 610,
      })
    }
    const sourceA = cleanedSource({
      sourceId: 'reflection-a',
      allowTraining: true,
      provenance: {
        kind: 'working-memory-cleaning',
        cleaningTransactionId: 'cleaning-a',
        cleanedAt: 10,
      },
    })
    const sourceZ = cleanedSource({
      sourceId: 'reflection-z',
      allowTraining: true,
      provenance: {
        kind: 'working-memory-cleaning',
        cleaningTransactionId: 'cleaning-z',
        cleanedAt: 20,
      },
    })

    const forward = await stage([sourceA, sourceZ])
    const reverse = await stage([sourceZ, sourceA])

    expect(forward).toMatchObject({
      schemaVersion: PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
      exampleCount: 1,
      examples: [{
        sourceId: 'reflection-a',
        schemaVersion: PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
        provenance: {
          kind: 'working-memory-cleaning',
          cleaningTransactionId: 'cleaning-a',
          cleanedAt: 10,
        },
      }],
    })
    expect(forward.examples[0].contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(forward.manifestHash).toMatch(/^[a-f0-9]{64}$/)
    expect(reverse).toEqual(forward)
  })

  it('removes revoked sources from exports and effective active state without reauthorizing on rollback', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 700,
      randomUUID: () => 'uuid-revoke',
      listSources: async () => [cleanedSource({ allowTraining: true })],
    })

    const first = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    const second = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    await runtime.activateVersion({ cardId: 'card-a', datasetId: first.id })
    await runtime.activateVersion({ cardId: 'card-a', datasetId: second.id })
    await runtime.revokeSource({ cardId: 'card-a', sourceId: 'reflection-1' })

    expect((await runtime.exportVersion({
      cardId: 'card-a',
      datasetId: first.id,
    })).manifest.examples).toHaveLength(0)
    expect((await runtime.getSnapshot({ cardId: 'card-a' })).activeVersionId).toBeNull()
    await expect(runtime.rollbackVersion({
      cardId: 'card-a',
      datasetId: first.id,
    })).rejects.toThrow('no eligible training examples')
    expect(memory.examples.every(example =>
      example.state === 'revoked'
      && example.allowTraining === false
      && example.consentSnapshot.granted === true,
    )).toBe(true)
  })
})
