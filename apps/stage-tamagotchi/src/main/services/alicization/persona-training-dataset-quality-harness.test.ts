import type { PersonaTrainingDatasetExample, PersonaTrainingDatasetSource } from './persona-training-dataset-runtime'

import { describe, expect, it } from 'vitest'

import {
  buildPersonaDatasetQualityFixtureFromRuntimeSnapshot,
  runPersonaTrainingDatasetQualityHarnessFixture,
} from './persona-training-dataset-quality-harness'

const now = Date.parse('2026-08-04T12:00:00.000Z')

function cleanedSource(overrides: Partial<PersonaTrainingDatasetSource> = {}): PersonaTrainingDatasetSource {
  return {
    cardId: 'alice-main',
    sourceId: 'reflection-clean',
    sourceKind: 'cleaned-long-term-reflection',
    status: 'confirmed',
    cleaned: true,
    summary: '失败时要直接说明 provider 或工具问题。',
    lesson: '透明说明失败，不把错误伪装成人格回复。',
    positiveExample: '这次是 provider 超时，我先说明失败原因。',
    negativeExample: '把超时包装成正常陪伴。',
    sensitivity: 'personal',
    allowTraining: true,
    consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
    provenance: {
      kind: 'working-memory-cleaning',
      cleaningTransactionId: 'cleaning-1',
      cleanedAt: now - 1000,
    },
    ...overrides,
  }
}

describe('persona training dataset quality harness', () => {
  it('simulates the Persona/LoRA cleaning loop and exports only cleaned eligible examples', () => {
    const result = runPersonaTrainingDatasetQualityHarnessFixture({
      fixture: {
        id: 'persona-cleaning-real-user-trial',
        cardId: 'alice-main',
        createdAt: now,
        consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
        sources: [
          cleanedSource(),
          cleanedSource({
            sourceId: 'reflection-duplicate',
          }),
          cleanedSource({
            sourceId: 'reflection-pii',
            summary: '用户邮箱 alice@example.com 不能进训练。',
            lesson: '发现 PII 先隔离。',
            allowTraining: true,
          }),
          cleanedSource({
            sourceId: 'reflection-template',
            summary: 'fixed-template-residue',
            lesson: 'fixed-template-residue',
            allowTraining: true,
          }),
          cleanedSource({
            sourceId: 'reflection-private',
            summary: 'private source requires quarantine',
            lesson: '敏感来源要隔离。',
            sensitivity: 'private',
            allowTraining: true,
          }),
          cleanedSource({
            sourceId: 'raw-transcript-1',
            sourceKind: 'raw-transcript',
            cleaned: false,
            summary: 'raw transcript: 用户逐字说过失败透明。',
            lesson: 'raw transcript',
          }),
          cleanedSource({
            sourceId: 'review-queue-1',
            sourceKind: 'review-queue',
            status: 'candidate',
            cleaned: true,
            summary: 'review 队列候选不能进训练。',
            lesson: 'review queue candidate',
          }),
          cleanedSource({
            sourceId: 'failure-artifact-1',
            sourceKind: 'failure-artifact',
            cleaned: false,
            summary: 'provider failed with HTTP 400',
            lesson: '失败 artifact 只能审计。',
          }),
          cleanedSource({
            sourceId: 'internal-cue-1',
            sourceKind: 'internal-cue',
            summary: 'opening_policy relationship_cadence visibility=redacted_internal',
            lesson: 'internal cue',
          }),
          cleanedSource({
            cardId: 'other-card',
            sourceId: 'foreign-reflection',
            summary: '其他 card 的人格样本不能串进 alice-main。',
            lesson: '跨 card 样本不能混用。',
          }),
        ],
        expectedExportedSourceRefs: [{
          sourceId: 'reflection-clean',
          sourceKind: 'cleaned-long-term-reflection',
        }],
        forbiddenExportedSourceRefs: [
          { sourceId: 'reflection-pii', sourceKind: 'cleaned-long-term-reflection' },
          { sourceId: 'reflection-template', sourceKind: 'cleaned-long-term-reflection' },
          { sourceId: 'reflection-private', sourceKind: 'cleaned-long-term-reflection' },
          { sourceId: 'raw-transcript-1', sourceKind: 'raw-transcript' },
          { sourceId: 'review-queue-1', sourceKind: 'review-queue' },
          { sourceId: 'failure-artifact-1', sourceKind: 'failure-artifact' },
          { sourceId: 'internal-cue-1', sourceKind: 'internal-cue' },
          { sourceId: 'foreign-reflection', sourceKind: 'cleaned-long-term-reflection' },
        ],
        expectedQuarantinedSourceRefs: [
          { sourceId: 'reflection-pii', sourceKind: 'cleaned-long-term-reflection' },
          { sourceId: 'reflection-template', sourceKind: 'cleaned-long-term-reflection' },
          { sourceId: 'reflection-private', sourceKind: 'cleaned-long-term-reflection' },
        ],
        expectedRejectedSourceRefs: [
          { sourceId: 'raw-transcript-1', sourceKind: 'raw-transcript' },
          { sourceId: 'review-queue-1', sourceKind: 'review-queue' },
          { sourceId: 'failure-artifact-1', sourceKind: 'failure-artifact' },
          { sourceId: 'internal-cue-1', sourceKind: 'internal-cue' },
        ],
        expectedDedupeCount: 1,
      },
    })

    expect(result.passed).toBe(true)
    expect(result.manifest.examples.map(item => item.sourceId)).toEqual(['reflection-clean'])
    expect(result.metrics).toMatchObject({
      exportedExampleCount: 1,
      expectedExportMissCount: 0,
      forbiddenExportLeakCount: 0,
      unsafeSourceExportLeakCount: 0,
      piiExportLeakCount: 0,
      templateResidueExportLeakCount: 0,
      consentLeakCount: 0,
      defaultTrainingLeakCount: 0,
      crossCardLeakCount: 0,
      missingProvenanceAcceptedCount: 0,
      expectedQuarantineMissCount: 0,
      expectedRejectMissCount: 0,
      dedupeCollisionCount: 1,
      dedupeGapCount: 0,
      sourceTraceRate: 1,
      schemaSupported: true,
    })
    expect(result.findings).toEqual([])
    expect(result.trace.selectedIds).toEqual([
      '["cleaned-long-term-reflection","reflection-clean"]',
    ])
  })

  it('uses the production PII boundary for user paths without blocking project paths', () => {
    const result = runPersonaTrainingDatasetQualityHarnessFixture({
      fixture: {
        id: 'persona-pii-path-boundary',
        cardId: 'alice-main',
        createdAt: now,
        consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
        sources: [
          cleanedSource({
            sourceId: 'reflection-user-home',
            summary: '文件在 /Users/alice/Documents/private-notes.md。',
            lesson: '不要训练用户目录。',
          }),
          cleanedSource({
            sourceId: 'reflection-project-path',
            summary: '项目入口位于 apps/stage-tamagotchi/src/main。',
            lesson: '可以保留不含用户身份的项目结构经验。',
          }),
        ],
        expectedExportedSourceRefs: [{
          sourceId: 'reflection-project-path',
          sourceKind: 'cleaned-long-term-reflection',
        }],
        forbiddenExportedSourceRefs: [{
          sourceId: 'reflection-user-home',
          sourceKind: 'cleaned-long-term-reflection',
        }],
        expectedQuarantinedSourceRefs: [{
          sourceId: 'reflection-user-home',
          sourceKind: 'cleaned-long-term-reflection',
        }],
      },
    })

    expect(result.passed).toBe(true)
    expect(result.manifest.examples.map(example => example.sourceId)).toEqual(['reflection-project-path'])
    expect(result.examples.find(example => example.sourceId === 'reflection-user-home')).toMatchObject({
      state: 'quarantined',
      piiStatus: 'detected',
      piiReason: expect.stringContaining('user-home-path'),
    })
  })

  it('builds quality fixtures from real runtime examples and respects revoked sources', () => {
    const baseExample: PersonaTrainingDatasetExample = {
      id: 'persona-example-1',
      datasetId: 'dataset-1',
      cardId: 'alice-main',
      schemaVersion: 'persona-training-example-v1',
      sourceId: 'reflection-clean',
      sourceKind: 'cleaned-long-term-reflection',
      contentHash: 'hash-1',
      behaviorLesson: '透明说明失败。',
      positiveExample: 'Provider 失败了，我直接说明原因。',
      negativeExample: null,
      sensitivity: 'personal',
      piiStatus: 'clear',
      piiReason: null,
      consentSnapshot: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
      provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: 'cleaning-1', cleanedAt: now - 1 },
      allowTraining: true,
      state: 'staged',
      createdAt: now,
      revokedAt: null,
    }

    const fixture = buildPersonaDatasetQualityFixtureFromRuntimeSnapshot({
      id: 'runtime-snapshot-quality',
      cardId: 'alice-main',
      createdAt: now,
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
      examples: [baseExample],
    })
    const passed = runPersonaTrainingDatasetQualityHarnessFixture({ fixture })
    expect(passed.passed).toBe(true)
    expect(passed.manifest.examples.map(item => item.sourceId)).toEqual(['reflection-clean'])

    const revokedFixture = buildPersonaDatasetQualityFixtureFromRuntimeSnapshot({
      id: 'runtime-snapshot-revoked-quality',
      cardId: 'alice-main',
      createdAt: now,
      consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
      examples: [{ ...baseExample, state: 'revoked', allowTraining: false, revokedAt: now + 1 }],
    })
    const revoked = runPersonaTrainingDatasetQualityHarnessFixture({ fixture: revokedFixture })
    expect(revoked.passed).toBe(true)
    expect(revoked.manifest.examples).toEqual([])
  })

  it('turns consent and schema gaps into optimization findings instead of pretending the dataset is usable', () => {
    const result = runPersonaTrainingDatasetQualityHarnessFixture({
      fixture: {
        id: 'persona-consent-schema-gap',
        cardId: 'alice-main',
        createdAt: now,
        consent: { granted: false, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
        datasetSchemaVersion: 'persona-training-dataset-legacy',
        sources: [
          cleanedSource(),
        ],
        expectedExportedSourceRefs: [{
          sourceId: 'reflection-clean',
          sourceKind: 'cleaned-long-term-reflection',
        }],
      },
    })

    expect(result.passed).toBe(false)
    expect(result.manifest.examples).toEqual([])
    expect(result.metrics.expectedExportMissCount).toBe(1)
    expect(result.metrics.schemaSupported).toBe(false)
    expect(result.findings.map(item => item.code)).toEqual(expect.arrayContaining([
      'persona-dataset-expected-export-miss',
      'persona-dataset-schema-mismatch',
    ]))
    expect(result.recommendedNextActions).toEqual(expect.arrayContaining([
      '检查 cleaned long-term reflection、persona reinforcement、consent 和 allowTraining 的治理链路。',
      '固定 persona dataset schema/version 门禁，旧版本必须迁移后才能导出或激活。',
    ]))
  })

  it('detects a runtime snapshot whose staged example consent does not match the dataset policy', () => {
    const result = runPersonaTrainingDatasetQualityHarnessFixture({
      fixture: {
        id: 'persona-consent-policy-mismatch',
        cardId: 'alice-main',
        createdAt: now,
        consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
        sources: [cleanedSource({
          consent: { granted: true, policyVersion: 'v2', scope: 'other-scope', capturedAt: now },
          allowTraining: true,
        })],
        expectedExportedSourceRefs: [],
        forbiddenExportedSourceRefs: [{
          sourceId: 'reflection-clean',
          sourceKind: 'cleaned-long-term-reflection',
        }],
      },
    })

    expect(result.passed).toBe(false)
    expect(result.manifest.examples).toEqual([])
    expect(result.findings.map(item => item.code)).toContain('persona-dataset-consent-leak')
    expect(result.findings.map(item => item.message)).toContain(
      'Persona/LoRA 数据集有 1 条样本的 consent 与数据集策略不一致。',
    )
  })

  it('does not synthesize dataset consent for a quality fixture whose source consent is missing', () => {
    const result = runPersonaTrainingDatasetQualityHarnessFixture({
      fixture: {
        id: 'persona-source-consent-missing',
        cardId: 'alice-main',
        createdAt: now,
        consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
        sources: [cleanedSource({
          consent: null,
          allowTraining: true,
        })],
        expectedExportedSourceRefs: [],
        forbiddenExportedSourceRefs: [{
          sourceId: 'reflection-clean',
          sourceKind: 'cleaned-long-term-reflection',
        }],
        expectedQuarantinedSourceRefs: [{
          sourceId: 'reflection-clean',
          sourceKind: 'cleaned-long-term-reflection',
        }],
      },
    })

    expect(result.passed).toBe(false)
    expect(result.manifest.examples).toEqual([])
    expect(result.findings.map(item => item.code)).toContain('persona-dataset-consent-leak')
    expect(result.findings.map(item => item.message)).toContain(
      'Persona/LoRA 数据集有 1 条样本缺少有效的来源 consent。',
    )
  })

  it('keeps same-id reflection and reinforcement sources distinct throughout quality evaluation', () => {
    const result = runPersonaTrainingDatasetQualityHarnessFixture({
      fixture: {
        id: 'persona-composite-source-quality',
        cardId: 'alice-main',
        createdAt: now,
        consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
        sources: [
          cleanedSource({
            sourceId: 'shared-source',
            sourceKind: 'cleaned-long-term-reflection',
            summary: '清洗后的长期反思。',
            lesson: '长期反思保留来源类型。',
          }),
          cleanedSource({
            sourceId: 'shared-source',
            sourceKind: 'persona-reinforcement',
            summary: '确认后的人格强化。',
            lesson: '人格强化保留来源类型。',
            provenance: {
              kind: 'working-memory-cleaning',
              cleaningTransactionId: 'cleaning-reinforcement',
              cleanedAt: now - 500,
            },
          }),
        ],
        expectedExportedSourceRefs: [
          { sourceId: 'shared-source', sourceKind: 'cleaned-long-term-reflection' },
          { sourceId: 'shared-source', sourceKind: 'persona-reinforcement' },
        ],
      },
    })

    expect(result.passed).toBe(true)
    expect(result.manifest.examples.map(example => ({
      sourceId: example.sourceId,
      sourceKind: example.sourceKind,
    }))).toEqual(expect.arrayContaining([
      { sourceId: 'shared-source', sourceKind: 'cleaned-long-term-reflection' },
      { sourceId: 'shared-source', sourceKind: 'persona-reinforcement' },
    ]))
    expect(result.metrics.exportedExampleCount).toBe(2)
  })
})
