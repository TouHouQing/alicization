import type {
  PersonaTrainingDatasetExample,
  PersonaTrainingDatasetSource,
} from './persona-training-dataset-runtime'

import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  buildPersonaTrainingDatasetManifest,
  classifyPersonaTrainingDatasetSource,
  createPersonaTrainingDatasetRuntime,
  evaluatePersonaTrainingDatasetManifestQualityGate,
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
      revokeSource: async (cardId: string, sourceRef: {
        sourceId: string
        sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
      }, at: number) => {
        let affected = 0
        for (const example of examples) {
          if (
            example.cardId === cardId
            && example.sourceId === sourceRef.sourceId
            && example.sourceKind === sourceRef.sourceKind
            && example.state !== 'revoked'
          ) {
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
    consent: {
      granted: true,
      policyVersion: 'v1',
      scope: 'persona-dataset',
    },
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

  it.each([
    ['user-home-path', '文件在 /Users/alice/Documents/private-notes.md。'],
    ['account-identifier', '我的 GitHub 用户名是 alice-dev。'],
    ['precise-address', '住址是北京市朝阳区建国路88号A座1201室。'],
    ['labeled-real-name', '真实姓名：张三'],
  ])('quarantines cleaned sources containing %s PII', (category, summary) => {
    expect(classifyPersonaTrainingDatasetSource(cleanedSource({
      summary,
      lesson: '不要把这条敏感信息用于人格训练。',
      allowTraining: true,
    }))).toMatchObject({
      accepted: true,
      state: 'quarantined',
      allowTraining: false,
      piiStatus: 'detected',
      piiReason: expect.stringContaining(category),
    })
  })

  it.each([
    '项目位于 apps/stage-tamagotchi/src/main。',
    'Codex 可执行文件通常放在 /usr/local/bin/codex。',
    '我们上周在北京讨论了长期记忆。',
    '使用 @proj-alicization/stage-shared 包。',
  ])('keeps ordinary project and place descriptions clear: %s', (summary) => {
    expect(classifyPersonaTrainingDatasetSource(cleanedSource({
      summary,
      lesson: summary,
      allowTraining: true,
    }))).toMatchObject({
      accepted: true,
      state: 'staged',
      allowTraining: true,
      piiStatus: 'clear',
      piiReason: null,
    })
  })

  it('keeps an explicitly non-consented source quarantined even when the dataset consent is granted', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 150,
      randomUUID: () => 'uuid-source-consent',
      listSources: async () => [cleanedSource({
        allowTraining: true,
        consent: {
          granted: false,
          policyVersion: 'v1',
          scope: 'persona-dataset',
        },
      })],
    })

    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })

    expect(memory.examples).toMatchObject([{
      state: 'quarantined',
      allowTraining: false,
      piiReason: 'source consent is not granted',
    }])
    expect((await runtime.exportVersion({ cardId: 'card-a', datasetId: dataset.id })).manifest.examples).toEqual([])
  })

  it('does not synthesize dataset consent for a source whose consent is missing', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 175,
      randomUUID: () => 'uuid-source-consent-missing',
      listSources: async () => [cleanedSource({
        allowTraining: true,
        consent: null,
      })],
    })

    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })

    expect(memory.examples).toMatchObject([{
      state: 'quarantined',
      allowTraining: false,
      consentSnapshot: {
        granted: false,
      },
      piiReason: 'source consent is not granted',
    }])
    expect((await runtime.exportVersion({ cardId: 'card-a', datasetId: dataset.id })).manifest.examples).toEqual([])
  })

  it('allows an explicitly consented policy action to release a previously unconsented source', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 180,
      randomUUID: () => 'uuid-explicit-consent',
      listSources: async () => [cleanedSource({
        allowTraining: false,
        consent: null,
      })],
    })
    const consent = {
      granted: true,
      policyVersion: 'v1',
      scope: 'persona-dataset',
    }
    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent,
    })

    const updated = await runtime.setExamplePolicy({
      cardId: 'card-a',
      exampleId: memory.examples[0].id,
      allowTraining: true,
      consent,
    })

    expect(updated).toMatchObject({
      state: 'staged',
      allowTraining: true,
      piiReason: null,
      consentSnapshot: {
        granted: true,
        policyVersion: 'v1',
        scope: 'persona-dataset',
      },
    })
    await expect(runtime.activateVersion({
      cardId: 'card-a',
      datasetId: dataset.id,
    })).resolves.toMatchObject({
      id: dataset.id,
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
          consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
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
          consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
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
        consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
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
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    expect(memory.examples[0]).toMatchObject({
      state: 'staged',
      allowTraining: true,
      consentSnapshot: { granted: true },
    })
    const exported = await runtime.exportVersion({ cardId: 'card-a', datasetId: first.id })
    expect(exported.manifest.examples).toHaveLength(1)
    expect(exported.qualityGate).toMatchObject({
      passed: true,
      criticalFindingCount: 0,
    })

    await runtime.activateVersion({ cardId: 'card-a', datasetId: first.id })
    const second = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    await runtime.setExamplePolicy({
      cardId: 'card-a',
      exampleId: memory.examples.find(item => item.datasetId === second.id).id,
      allowTraining: true,
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
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

    await runtime.revokeSource({
      cardId: 'card-a',
      sourceId: 'reinforcement-1',
      sourceKind: 'persona-reinforcement',
    })
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

  it('does not authorize an example with consent from another dataset policy', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 450,
      randomUUID: () => 'uuid-consent-policy',
      listSources: async () => [cleanedSource()],
    })
    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })

    const updated = await runtime.setExamplePolicy({
      cardId: 'card-a',
      exampleId: memory.examples[0].id,
      allowTraining: true,
      consent: { granted: true, policyVersion: 'v2', scope: 'another-scope' },
    })

    expect(updated).toMatchObject({
      allowTraining: false,
      state: 'quarantined',
      consentSnapshot: {
        granted: true,
        policyVersion: 'v2',
        scope: 'another-scope',
      },
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
    await runtime.revokeSource({
      cardId: 'card-a',
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
    })

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

  it('revokes only the matching source kind when two persona sources share the same source id', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 725,
      randomUUID: () => 'uuid-composite-source',
      listSources: async () => [
        cleanedSource({
          sourceId: 'shared-source',
          sourceKind: 'cleaned-long-term-reflection',
          summary: '清洗后的长期反思。',
          lesson: '长期反思保持来源类型可追溯。',
          allowTraining: true,
        }),
        cleanedSource({
          sourceId: 'shared-source',
          sourceKind: 'persona-reinforcement',
          summary: '经过确认的人格强化。',
          lesson: '人格强化保持来源类型可追溯。',
          allowTraining: true,
          provenance: {
            kind: 'working-memory-cleaning',
            cleaningTransactionId: 'cleaning-reinforcement',
            cleanedAt: 2,
          },
        }),
      ],
    })

    await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    const sourceRef = {
      cardId: 'card-a',
      sourceId: 'shared-source',
      sourceKind: 'cleaned-long-term-reflection' as const,
    }
    await runtime.revokeSource(sourceRef)

    expect(memory.examples).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceId: 'shared-source',
        sourceKind: 'cleaned-long-term-reflection',
        state: 'revoked',
        allowTraining: false,
      }),
      expect.objectContaining({
        sourceId: 'shared-source',
        sourceKind: 'persona-reinforcement',
        state: 'staged',
        allowTraining: true,
      }),
    ]))
  })

  it('blocks runtime examples with unsupported source kinds before they reach the manifest', () => {
    const dataset = {
      id: 'dataset:card-a:1',
      cardId: 'card-a',
      version: 1,
      schemaVersion: PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
      consentSnapshot: {
        granted: true,
        policyVersion: 'v1',
        scope: 'persona-dataset',
      },
      createdAt: 1,
      exportedAt: null,
      activeAt: null,
      rolledBackAt: null,
    }
    const unsafeExample = {
      id: 'example:raw',
      datasetId: dataset.id,
      cardId: dataset.cardId,
      schemaVersion: PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
      sourceId: 'raw-transcript-1',
      sourceKind: 'raw-transcript',
      contentHash: 'raw-hash',
      behaviorLesson: 'raw',
      positiveExample: 'raw',
      negativeExample: null,
      sensitivity: 'personal',
      piiStatus: 'clear',
      piiReason: null,
      consentSnapshot: { ...dataset.consentSnapshot, granted: true },
      provenance: {
        kind: 'working-memory-cleaning',
        cleaningTransactionId: 'cleaning-raw',
        cleanedAt: 1,
      },
      allowTraining: true,
      state: 'staged',
      createdAt: 1,
      revokedAt: null,
    } as unknown as PersonaTrainingDatasetExample

    const manifest = buildPersonaTrainingDatasetManifest({
      dataset,
      examples: [unsafeExample],
      exportedAt: 2,
    })

    expect(manifest.examples).toEqual([])
  })

  it('requires example consent to match the dataset policy snapshot', () => {
    const dataset = {
      id: 'dataset:card-a:1',
      cardId: 'card-a',
      version: 1,
      schemaVersion: PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
      consentSnapshot: {
        granted: true,
        policyVersion: 'v1',
        scope: 'persona-dataset',
      },
      createdAt: 1,
      exportedAt: null,
      activeAt: null,
      rolledBackAt: null,
    }
    const example = {
      id: 'example:mismatched-consent',
      datasetId: dataset.id,
      cardId: dataset.cardId,
      schemaVersion: PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
      contentHash: 'content-hash',
      behaviorLesson: '保留用户明确认可的行为经验。',
      positiveExample: '我会保留用户明确认可的行为经验。',
      negativeExample: null,
      sensitivity: 'personal',
      piiStatus: 'clear',
      piiReason: null,
      consentSnapshot: {
        granted: true,
        policyVersion: 'v2',
        scope: 'different-scope',
      },
      provenance: {
        kind: 'working-memory-cleaning',
        cleaningTransactionId: 'cleaning-1',
        cleanedAt: 1,
      },
      allowTraining: true,
      state: 'staged',
      createdAt: 1,
      revokedAt: null,
    } satisfies PersonaTrainingDatasetExample

    const manifest = buildPersonaTrainingDatasetManifest({
      dataset,
      examples: [example],
      exportedAt: 2,
    })

    expect(manifest.examples).toEqual([])
  })

  it('fails the quality gate when the manifest hash does not match its contents', () => {
    const dataset = {
      id: 'dataset:card-a:1',
      cardId: 'card-a',
      version: 1,
      schemaVersion: PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
      consentSnapshot: {
        granted: true,
        policyVersion: 'v1',
        scope: 'persona-dataset',
      },
      createdAt: 1,
      exportedAt: null,
      activeAt: null,
      rolledBackAt: null,
    }
    const example = {
      id: 'example:hash',
      datasetId: dataset.id,
      cardId: dataset.cardId,
      schemaVersion: PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
      contentHash: 'content-hash',
      behaviorLesson: '在训练前保持样本可追溯。',
      positiveExample: '我会在训练前保持样本可追溯。',
      negativeExample: null,
      sensitivity: 'personal',
      piiStatus: 'clear',
      piiReason: null,
      consentSnapshot: { ...dataset.consentSnapshot },
      provenance: {
        kind: 'working-memory-cleaning',
        cleaningTransactionId: 'cleaning-1',
        cleanedAt: 1,
      },
      allowTraining: true,
      state: 'staged',
      createdAt: 1,
      revokedAt: null,
    } satisfies PersonaTrainingDatasetExample
    const built = buildPersonaTrainingDatasetManifest({
      dataset,
      examples: [example],
      exportedAt: 2,
    })

    const qualityGate = evaluatePersonaTrainingDatasetManifestQualityGate({
      dataset,
      examples: [example],
      manifest: {
        ...built,
        manifestHash: 'tampered-manifest-hash',
      },
    })

    expect(qualityGate).toMatchObject({
      passed: false,
      findings: expect.arrayContaining([
        expect.objectContaining({ code: 'manifest-hash-mismatch' }),
      ]),
    })
  })

  it('rejects a manifest whose training text was changed while its outer hash was recomputed', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 700,
      randomUUID: () => 'uuid-manifest-text-tamper',
      listSources: async () => [cleanedSource({ allowTraining: true })],
    })
    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    const exported = await runtime.exportVersion({
      cardId: 'card-a',
      datasetId: dataset.id,
    })
    expect(exported.qualityGate.passed).toBe(true)

    const tamperedExamples = exported.manifest.examples.map(example => ({
      ...example,
      positiveExample: `${example.positiveExample} 篡改后的训练文本`,
    }))
    const tamperedBase = {
      datasetId: exported.manifest.datasetId,
      cardId: exported.manifest.cardId,
      version: exported.manifest.version,
      schemaVersion: exported.manifest.schemaVersion,
      consentSnapshot: exported.manifest.consentSnapshot,
      exampleCount: tamperedExamples.length,
      examples: tamperedExamples,
    }
    const tamperedManifest = {
      ...tamperedBase,
      exportedAt: exported.manifest.exportedAt,
      manifestHash: createHash('sha256')
        .update(JSON.stringify(tamperedBase))
        .digest('hex'),
    }

    const qualityGate = evaluatePersonaTrainingDatasetManifestQualityGate({
      dataset,
      examples: memory.examples,
      manifest: tamperedManifest,
    })

    expect(qualityGate).toMatchObject({
      passed: false,
      findings: expect.arrayContaining([
        expect.objectContaining({ code: 'example-content-hash-mismatch' }),
      ]),
    })
  })

  it('blocks export when persisted text was tampered without updating its content hash', async () => {
    const memory = createMemoryRepository()
    const runtime = createPersonaTrainingDatasetRuntime({
      repository: memory.repository,
      now: () => 800,
      randomUUID: () => 'uuid-content-tamper',
      listSources: async () => [cleanedSource({ allowTraining: true })],
    })
    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })
    memory.examples[0].behaviorLesson = '数据库中的训练文本已被篡改，但旧哈希仍被保留。'

    await expect(runtime.exportVersion({
      cardId: 'card-a',
      datasetId: dataset.id,
    })).rejects.toThrow('example-content-hash-mismatch')
    expect(memory.exports).toEqual([])
  })

  it('uses the repository atomic primitive when staging a dataset with examples', async () => {
    const memory = createMemoryRepository()
    let atomicCalls = 0
    let fallbackCalls = 0
    const baseRepository = memory.repository
    const repository = {
      ...baseRepository,
      createVersion: async (input: any) => {
        fallbackCalls += 1
        return await baseRepository.createVersion(input)
      },
      insertExamples: async (items: any[]) => {
        fallbackCalls += 1
        return await baseRepository.insertExamples(items)
      },
      createVersionWithExamples: async (input: { dataset: any, examples: any[] }) => {
        atomicCalls += 1
        const dataset = await baseRepository.createVersion(input.dataset)
        if (input.examples.length > 0)
          await baseRepository.insertExamples(input.examples)
        return dataset
      },
    }
    const runtime = createPersonaTrainingDatasetRuntime({
      repository,
      now: () => 900,
      randomUUID: () => 'uuid-atomic-stage',
      listSources: async () => [cleanedSource({ allowTraining: true })],
    })

    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })

    expect(dataset.id).toBe('dataset:card-a:1')
    expect(atomicCalls).toBe(1)
    expect(fallbackCalls).toBe(0)
    expect(memory.datasets).toHaveLength(1)
    expect(memory.examples).toHaveLength(1)
  })

  it('uses the repository atomic primitive when exporting a manifest', async () => {
    const memory = createMemoryRepository()
    let atomicCalls = 0
    const baseRepository = memory.repository
    const repository = {
      ...baseRepository,
      appendExport: async () => {
        throw new Error('non-atomic export path must not be used')
      },
      markExported: async () => {
        throw new Error('non-atomic export marker must not be used')
      },
      appendExportAndMarkExported: async (input: any) => {
        atomicCalls += 1
        await baseRepository.appendExport(input)
      },
    }
    const runtime = createPersonaTrainingDatasetRuntime({
      repository,
      now: () => 901,
      randomUUID: () => 'uuid-atomic-export',
      listSources: async () => [cleanedSource({ allowTraining: true })],
    })
    const dataset = await runtime.stageVersion({
      cardId: 'card-a',
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset' },
    })

    const exported = await runtime.exportVersion({
      cardId: 'card-a',
      datasetId: dataset.id,
    })

    expect(exported.qualityGate.passed).toBe(true)
    expect(atomicCalls).toBe(1)
    expect(memory.exports).toHaveLength(1)
  })

  it.each([
    ['PII', '联系 alice@example.com', '记住这个邮箱。', 'pii-content-leak'],
    ['fixed-template residue', 'fixed-template-residue', 'fixed-template-residue', 'template-content-leak'],
  ])('fails the quality gate when exported text contains %s', (_label, summary, lesson, code) => {
    const dataset = {
      id: 'dataset:card-a:content-safety',
      cardId: 'card-a',
      version: 1,
      schemaVersion: PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
      consentSnapshot: {
        granted: true,
        policyVersion: 'v1',
        scope: 'persona-dataset',
      },
      createdAt: 1,
      exportedAt: null,
      activeAt: null,
      rolledBackAt: null,
    }
    const example = {
      id: `example:${code}`,
      datasetId: dataset.id,
      cardId: dataset.cardId,
      schemaVersion: PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
      sourceId: `reflection:${code}`,
      sourceKind: 'cleaned-long-term-reflection',
      contentHash: `content:${code}`,
      behaviorLesson: lesson,
      positiveExample: summary,
      negativeExample: null,
      sensitivity: 'personal',
      piiStatus: 'clear',
      piiReason: null,
      consentSnapshot: { ...dataset.consentSnapshot },
      provenance: {
        kind: 'working-memory-cleaning',
        cleaningTransactionId: `cleaning:${code}`,
        cleanedAt: 1,
      },
      allowTraining: true,
      state: 'staged',
      createdAt: 1,
      revokedAt: null,
    } satisfies PersonaTrainingDatasetExample
    const manifest = buildPersonaTrainingDatasetManifest({
      dataset,
      examples: [example],
      exportedAt: 2,
    })

    const qualityGate = evaluatePersonaTrainingDatasetManifestQualityGate({
      dataset,
      examples: [example],
      manifest,
    })

    expect(qualityGate).toMatchObject({
      passed: false,
      findings: expect.arrayContaining([
        expect.objectContaining({ code }),
      ]),
    })
  })
})
