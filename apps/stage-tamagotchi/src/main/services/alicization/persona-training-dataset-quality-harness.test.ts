import type { PersonaTrainingDatasetSource } from './persona-training-dataset-runtime'

import { describe, expect, it } from 'vitest'

import {
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
        expectedExportedSourceIds: ['reflection-clean'],
        forbiddenExportedSourceIds: [
          'reflection-pii',
          'reflection-template',
          'reflection-private',
          'raw-transcript-1',
          'review-queue-1',
          'failure-artifact-1',
          'internal-cue-1',
          'foreign-reflection',
        ],
        expectedQuarantinedSourceIds: [
          'reflection-pii',
          'reflection-template',
          'reflection-private',
        ],
        expectedRejectedSourceIds: [
          'raw-transcript-1',
          'review-queue-1',
          'failure-artifact-1',
          'internal-cue-1',
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
    expect(result.trace.selectedIds).toEqual(['reflection-clean'])
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
        expectedExportedSourceIds: ['reflection-clean'],
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
})
