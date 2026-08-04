import type {
  PersonaTrainingDatasetConsentSnapshot,
  PersonaTrainingDatasetExample,
  PersonaTrainingDatasetManifest,
  PersonaTrainingDatasetSource,
  PersonaTrainingDatasetVersion,
} from './persona-training-dataset-runtime'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

import {
  buildPersonaTrainingDatasetManifest,
  classifyPersonaTrainingDatasetSource,
  normalizePersonaTrainingDatasetText,
  PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
  PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
} from './persona-training-dataset-runtime'

export type PersonaTrainingDatasetQualityFindingCode
  = | 'persona-dataset-expected-export-miss'
    | 'persona-dataset-forbidden-export-leak'
    | 'persona-dataset-quarantine-miss'
    | 'persona-dataset-rejection-miss'
    | 'persona-dataset-raw-source-leak'
    | 'persona-dataset-review-source-leak'
    | 'persona-dataset-failure-source-leak'
    | 'persona-dataset-internal-cue-leak'
    | 'persona-dataset-pii-export-leak'
    | 'persona-dataset-template-residue-leak'
    | 'persona-dataset-consent-leak'
    | 'persona-dataset-default-training-leak'
    | 'persona-dataset-cross-card-leak'
    | 'persona-dataset-missing-provenance'
    | 'persona-dataset-dedupe-gap'
    | 'persona-dataset-schema-mismatch'

export interface PersonaTrainingDatasetQualityFinding {
  code: PersonaTrainingDatasetQualityFindingCode
  severity: 'critical' | 'warning' | 'info'
  fixtureId: string
  message: string
  suggestedAction: string
}

export interface PersonaTrainingDatasetQualityFixture {
  id: string
  cardId: string
  createdAt: number
  consent: PersonaTrainingDatasetConsentSnapshot
  sources: PersonaTrainingDatasetSource[]
  datasetSchemaVersion?: string
  expectedExportedSourceIds?: string[]
  forbiddenExportedSourceIds?: string[]
  expectedQuarantinedSourceIds?: string[]
  expectedRejectedSourceIds?: string[]
  expectedDedupeCount?: number
}

export interface PersonaTrainingDatasetQualityMetrics {
  acceptedSourceCount: number
  stagedExampleCount: number
  quarantinedExampleCount: number
  rejectedSourceCount: number
  exportedExampleCount: number
  expectedExportMissCount: number
  forbiddenExportLeakCount: number
  expectedQuarantineMissCount: number
  expectedRejectMissCount: number
  unsafeSourceExportLeakCount: number
  piiExportLeakCount: number
  templateResidueExportLeakCount: number
  consentLeakCount: number
  defaultTrainingLeakCount: number
  crossCardLeakCount: number
  missingProvenanceAcceptedCount: number
  dedupeCollisionCount: number
  dedupeGapCount: number
  sourceTraceRate: number
  schemaSupported: boolean
}

export interface PersonaTrainingDatasetQualityTrace {
  id: string
  fixtureId: string
  owner: 'PersonaTrainingDataset'
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  metrics: PersonaTrainingDatasetQualityMetrics
  error: string | null
  createdAt: number
}

export interface PersonaTrainingDatasetQualityResult {
  fixtureId: string
  dataset: PersonaTrainingDatasetVersion
  manifest: PersonaTrainingDatasetManifest
  examples: PersonaTrainingDatasetExample[]
  metrics: PersonaTrainingDatasetQualityMetrics
  findings: PersonaTrainingDatasetQualityFinding[]
  recommendedNextActions: string[]
  trace: PersonaTrainingDatasetQualityTrace
  passed: boolean
}

function normalizeConsent(input: PersonaTrainingDatasetConsentSnapshot, now: number): PersonaTrainingDatasetConsentSnapshot {
  return {
    granted: input.granted === true,
    policyVersion: normalizePersonaTrainingDatasetText(input.policyVersion, 120) || 'persona-training-consent-v1',
    scope: normalizePersonaTrainingDatasetText(input.scope, 160) || 'persona-dataset',
    capturedAt: Number.isFinite(input.capturedAt) ? Math.max(0, Math.floor(Number(input.capturedAt))) : now,
  }
}

function normalizeCardId(cardId: string) {
  return normalizePersonaTrainingDatasetText(cardId, 120)
}

function containsPiiText(...values: string[]) {
  const text = values.join(' ')
  return /\b[\w.%+-]+@[\w.-]+\.[A-Z]{2,}\b/i.test(text)
    || /(?:\+?86[-\s]?)?1[3-9]\d{9}\b/u.test(text)
    || /\b(?:sk|api|key|token)[-_]?[\dA-Z]{12,}\b/iu.test(text)
    || /\b(?:\d{1,3}\.){3}\d{1,3}\b/u.test(text)
    || /\b\d{17}[\dXx]\b/u.test(text)
    || /\b(?:\d[ -]?){13,19}\b/u.test(text)
}

function containsTemplateResidueText(...values: string[]) {
  const text = values.join(' ')
  return containsAlicizationFixedTemplateResidue(text, {
    provenance: 'internal-structured-fact',
  }) || /fixed[-_ ]template|internal[-_ ]cue|opening[-_ ]policy|relationship[-_ ]cadence|visibility\s*=\s*redacted_internal/iu.test(text)
}

function sourceHasUnsafeKind(source: PersonaTrainingDatasetSource) {
  return source.sourceKind === 'raw-transcript'
    || source.sourceKind === 'review-queue'
    || source.sourceKind === 'failure-artifact'
    || source.sourceKind === 'internal-cue'
}

function sourceHasPii(source: PersonaTrainingDatasetSource) {
  return containsPiiText(
    source.summary,
    source.lesson,
    source.positiveExample ?? '',
    source.negativeExample ?? '',
  )
}

function sourceHasTemplateResidue(source: PersonaTrainingDatasetSource) {
  return containsTemplateResidueText(
    source.summary,
    source.lesson,
    source.positiveExample ?? '',
    source.negativeExample ?? '',
  )
}

function hasValidCleaningProvenance(source: PersonaTrainingDatasetSource) {
  return source.provenance?.kind === 'working-memory-cleaning'
    && Boolean(normalizePersonaTrainingDatasetText(source.provenance.cleaningTransactionId, 240))
    && Number.isFinite(source.provenance.cleanedAt)
    && Number(source.provenance.cleanedAt) >= 0
}

function uniqueActions(findings: PersonaTrainingDatasetQualityFinding[]) {
  return [...new Set(findings.map(item => item.suggestedAction))]
}

function buildDataset(input: {
  fixture: PersonaTrainingDatasetQualityFixture
  consent: PersonaTrainingDatasetConsentSnapshot
}) {
  return {
    id: `persona-dataset-quality:${input.fixture.cardId}:1`,
    cardId: input.fixture.cardId,
    version: 1,
    schemaVersion: input.fixture.datasetSchemaVersion ?? PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
    consentSnapshot: input.consent,
    createdAt: input.fixture.createdAt,
    exportedAt: null,
    activeAt: null,
    rolledBackAt: null,
  } satisfies PersonaTrainingDatasetVersion
}

function buildExamples(input: {
  fixture: PersonaTrainingDatasetQualityFixture
  dataset: PersonaTrainingDatasetVersion
  consent: PersonaTrainingDatasetConsentSnapshot
}) {
  const cardId = normalizeCardId(input.fixture.cardId)
  const sourceResults = input.fixture.sources
    .filter(source => normalizeCardId(source.cardId) === cardId)
    .map(source => ({ source, result: classifyPersonaTrainingDatasetSource(source) }))
    .filter(item => item.result.accepted && item.result.sourceKind && item.result.contentHash)
    .sort((left, right) =>
      left.result.contentHash!.localeCompare(right.result.contentHash!)
      || normalizePersonaTrainingDatasetText(left.source.sourceId, 240)
        .localeCompare(normalizePersonaTrainingDatasetText(right.source.sourceId, 240)),
    )

  const seenHashes = new Set<string>()
  const examples = sourceResults
    .filter(({ result }) => {
      if (!result.contentHash || seenHashes.has(result.contentHash))
        return false
      seenHashes.add(result.contentHash)
      return true
    })
    .map(({ source, result }) => ({
      id: `persona-example:${input.dataset.id}:${result.contentHash}`,
      datasetId: input.dataset.id,
      cardId,
      schemaVersion: PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
      sourceId: normalizePersonaTrainingDatasetText(source.sourceId, 240),
      sourceKind: result.sourceKind!,
      contentHash: result.contentHash!,
      behaviorLesson: result.behaviorLesson,
      positiveExample: result.positiveExample,
      negativeExample: result.negativeExample,
      sensitivity: normalizePersonaTrainingDatasetText(source.sensitivity, 40) || 'personal',
      piiStatus: result.piiStatus,
      piiReason: result.piiReason,
      consentSnapshot: input.consent,
      provenance: source.provenance ?? null,
      allowTraining: result.allowTraining && input.consent.granted,
      state: result.state,
      createdAt: input.fixture.createdAt,
      revokedAt: null,
    } satisfies PersonaTrainingDatasetExample))

  return {
    sourceResults,
    examples,
    dedupeCollisionCount: sourceResults.length - examples.length,
  }
}

function buildFindings(input: {
  fixture: PersonaTrainingDatasetQualityFixture
  manifest: PersonaTrainingDatasetManifest
  examples: PersonaTrainingDatasetExample[]
  metrics: PersonaTrainingDatasetQualityMetrics
  sourcesById: Map<string, PersonaTrainingDatasetSource>
}) {
  const findings: PersonaTrainingDatasetQualityFinding[] = []
  const add = (
    code: PersonaTrainingDatasetQualityFindingCode,
    severity: PersonaTrainingDatasetQualityFinding['severity'],
    message: string,
    suggestedAction: string,
  ) => {
    findings.push({
      code,
      severity,
      fixtureId: input.fixture.id,
      message,
      suggestedAction,
    })
  }

  if (!input.metrics.schemaSupported) {
    add(
      'persona-dataset-schema-mismatch',
      'critical',
      'Persona/LoRA 数据集 schema 与当前 runtime 不一致。',
      '固定 persona dataset schema/version 门禁，旧版本必须迁移后才能导出或激活。',
    )
  }

  if (input.metrics.expectedExportMissCount > 0) {
    add(
      'persona-dataset-expected-export-miss',
      'critical',
      `Persona/LoRA 数据集漏掉 ${input.metrics.expectedExportMissCount} 条期望训练样本。`,
      '检查 cleaned long-term reflection、persona reinforcement、consent 和 allowTraining 的治理链路。',
    )
  }

  if (input.metrics.forbiddenExportLeakCount > 0) {
    add(
      'persona-dataset-forbidden-export-leak',
      'critical',
      `Persona/LoRA 数据集导出了 ${input.metrics.forbiddenExportLeakCount} 条禁止样本。`,
      '在 export manifest 前再次过滤 forbidden、revoked、quarantined 和 no-training 样本。',
    )
  }

  if (input.metrics.expectedQuarantineMissCount > 0) {
    add(
      'persona-dataset-quarantine-miss',
      'critical',
      `Persona/LoRA 数据集有 ${input.metrics.expectedQuarantineMissCount} 条风险样本没有进入隔离态。`,
      'PII、固定模板、private/secret 和敏感来源必须停在 quarantined，不能继续走训练授权。',
    )
  }

  if (input.metrics.expectedRejectMissCount > 0) {
    add(
      'persona-dataset-rejection-miss',
      'critical',
      `Persona/LoRA 数据集有 ${input.metrics.expectedRejectMissCount} 条非法来源没有被拒绝。`,
      'raw transcript、review queue、failure artifact、internal cue 和无清洗来源样本必须在 staging 前被拒绝。',
    )
  }

  if (input.metrics.unsafeSourceExportLeakCount > 0) {
    add(
      'persona-dataset-raw-source-leak',
      'critical',
      `Persona/LoRA 数据集导出了 ${input.metrics.unsafeSourceExportLeakCount} 条 raw/review/failure/internal 来源。`,
      '只允许 cleaned-long-term-reflection 与 persona-reinforcement 进入 LoRA/persona 数据集。',
    )
  }

  const exportedSources = input.manifest.examples
    .map(example => input.sourcesById.get(example.sourceId))
    .filter((source): source is PersonaTrainingDatasetSource => Boolean(source))
  if (exportedSources.some(source => source.sourceKind === 'review-queue')) {
    add(
      'persona-dataset-review-source-leak',
      'critical',
      'Persona/LoRA 数据集包含 review 队列候选。',
      '保持 review 队列候选与已确认长期记忆、训练样本三者边界分离。',
    )
  }
  if (exportedSources.some(source => source.sourceKind === 'failure-artifact')) {
    add(
      'persona-dataset-failure-source-leak',
      'critical',
      'Persona/LoRA 数据集包含失败 artifact。',
      '失败 artifact 只能进入审计与健康指标，不能进入人格训练。',
    )
  }
  if (exportedSources.some(source => source.sourceKind === 'internal-cue')) {
    add(
      'persona-dataset-internal-cue-leak',
      'critical',
      'Persona/LoRA 数据集包含内部治理 cue。',
      '删除内部 cue 到训练数据的任何转换路径，只保留用户可审查的清洗后行为样本。',
    )
  }

  if (input.metrics.piiExportLeakCount > 0) {
    add(
      'persona-dataset-pii-export-leak',
      'critical',
      `Persona/LoRA 数据集导出了 ${input.metrics.piiExportLeakCount} 条疑似 PII 样本。`,
      '扩展 PII 检测、人工确认和 redaction 之后再允许样本进入导出 manifest。',
    )
  }

  if (input.metrics.templateResidueExportLeakCount > 0) {
    add(
      'persona-dataset-template-residue-leak',
      'critical',
      `Persona/LoRA 数据集导出了 ${input.metrics.templateResidueExportLeakCount} 条固定模板残留样本。`,
      '在候选凝练、数据集 staging 和 manifest export 三层阻断固定模板残留。',
    )
  }

  if (input.metrics.consentLeakCount > 0) {
    add(
      'persona-dataset-consent-leak',
      'critical',
      'Persona/LoRA 数据集在 consent 未授予时仍导出训练样本。',
      '导出和激活都必须同时检查 dataset consent 与 example consent。',
    )
  }

  if (input.metrics.defaultTrainingLeakCount > 0) {
    add(
      'persona-dataset-default-training-leak',
      'critical',
      `Persona/LoRA 数据集有 ${input.metrics.defaultTrainingLeakCount} 条样本在未显式授权时开启训练。`,
      '保持 allowTraining 默认 false，只有用户显式同意且样本清洗通过后才能开启。',
    )
  }

  if (input.metrics.crossCardLeakCount > 0) {
    add(
      'persona-dataset-cross-card-leak',
      'critical',
      `Persona/LoRA 数据集跨 card 导出了 ${input.metrics.crossCardLeakCount} 条样本。`,
      '在 source query、dataset staging、manifest export 和 rollback 中全部携带 cardId scope。',
    )
  }

  if (input.metrics.missingProvenanceAcceptedCount > 0 || input.metrics.sourceTraceRate < 1) {
    add(
      'persona-dataset-missing-provenance',
      'critical',
      'Persona/LoRA 数据集存在缺少清洗事务来源的训练样本。',
      '每条训练样本必须带 working-memory-cleaning provenance，支持审计、撤回和回滚。',
    )
  }

  if (input.metrics.dedupeGapCount > 0) {
    add(
      'persona-dataset-dedupe-gap',
      'warning',
      `Persona/LoRA 数据集去重数量与预期相差 ${input.metrics.dedupeGapCount} 条。`,
      '用 schemaVersion + behaviorLesson + examples + sourceKind 的稳定 hash 做跨版本去重。',
    )
  }

  return findings
}

export function runPersonaTrainingDatasetQualityHarnessFixture(input: {
  fixture: PersonaTrainingDatasetQualityFixture
}): PersonaTrainingDatasetQualityResult {
  const fixture = input.fixture
  const cardId = normalizeCardId(fixture.cardId)
  const consent = normalizeConsent(fixture.consent, fixture.createdAt)
  const dataset = buildDataset({
    fixture: {
      ...fixture,
      cardId,
    },
    consent,
  })
  const sourceById = new Map(fixture.sources.map(source => [
    normalizePersonaTrainingDatasetText(source.sourceId, 240),
    source,
  ]))
  const rejectedIds = fixture.sources
    .filter(source => !classifyPersonaTrainingDatasetSource(source).accepted)
    .map(source => normalizePersonaTrainingDatasetText(source.sourceId, 240))
    .filter(Boolean)
  const built = buildExamples({
    fixture: {
      ...fixture,
      cardId,
    },
    dataset,
    consent,
  })
  const manifest = buildPersonaTrainingDatasetManifest({
    dataset,
    examples: built.examples,
    exportedAt: fixture.createdAt,
  })
  const exportedIds = manifest.examples.map(example => example.sourceId)
  const exportedSet = new Set(exportedIds)
  const expectedExportedIds = (fixture.expectedExportedSourceIds ?? []).map(id => normalizePersonaTrainingDatasetText(id, 240)).filter(Boolean)
  const forbiddenExportedIds = (fixture.forbiddenExportedSourceIds ?? []).map(id => normalizePersonaTrainingDatasetText(id, 240)).filter(Boolean)
  const expectedQuarantinedIds = (fixture.expectedQuarantinedSourceIds ?? []).map(id => normalizePersonaTrainingDatasetText(id, 240)).filter(Boolean)
  const expectedRejectedIds = (fixture.expectedRejectedSourceIds ?? []).map(id => normalizePersonaTrainingDatasetText(id, 240)).filter(Boolean)
  const expectedExportMissCount = expectedExportedIds.filter(id => !exportedSet.has(id)).length
  const forbiddenExportLeakCount = forbiddenExportedIds.filter(id => exportedSet.has(id)).length
  const exampleBySourceId = new Map(built.examples.map(example => [example.sourceId, example]))
  const rejectedSet = new Set(rejectedIds)
  const expectedQuarantineMissCount = expectedQuarantinedIds.filter(id => exampleBySourceId.get(id)?.state !== 'quarantined').length
  const expectedRejectMissCount = expectedRejectedIds.filter(id => !rejectedSet.has(id)).length
  const exportedSources = exportedIds
    .map(id => sourceById.get(id))
    .filter((source): source is PersonaTrainingDatasetSource => Boolean(source))
  const unsafeSourceExportLeakCount = exportedSources.filter(source => sourceHasUnsafeKind(source)).length
  const piiExportLeakCount = exportedSources.filter(source => sourceHasPii(source)).length
  const templateResidueExportLeakCount = exportedSources.filter(source => sourceHasTemplateResidue(source)).length
  const consentLeakCount = consent.granted ? 0 : manifest.examples.length
  const defaultTrainingLeakCount = built.examples.filter((example) => {
    const source = sourceById.get(example.sourceId)
    return example.allowTraining && source?.allowTraining !== true
  }).length
  const crossCardLeakCount = built.examples.filter(example => example.cardId !== cardId).length
  const missingProvenanceAcceptedCount = built.examples.filter((example) => {
    const source = sourceById.get(example.sourceId)
    return !source || !hasValidCleaningProvenance(source)
  }).length
  const traceableExportedCount = manifest.examples.filter(example =>
    Boolean(example.sourceId)
    && Boolean(example.contentHash)
    && hasValidCleaningProvenance(sourceById.get(example.sourceId)!),
  ).length
  const sourceTraceRate = manifest.examples.length === 0
    ? 1
    : traceableExportedCount / manifest.examples.length
  const dedupeGapCount = fixture.expectedDedupeCount == null
    ? 0
    : Math.abs(fixture.expectedDedupeCount - built.dedupeCollisionCount)
  const metrics: PersonaTrainingDatasetQualityMetrics = {
    acceptedSourceCount: built.sourceResults.length,
    stagedExampleCount: built.examples.filter(example => example.state === 'staged').length,
    quarantinedExampleCount: built.examples.filter(example => example.state === 'quarantined').length,
    rejectedSourceCount: rejectedIds.length,
    exportedExampleCount: manifest.examples.length,
    expectedExportMissCount,
    forbiddenExportLeakCount,
    expectedQuarantineMissCount,
    expectedRejectMissCount,
    unsafeSourceExportLeakCount,
    piiExportLeakCount,
    templateResidueExportLeakCount,
    consentLeakCount,
    defaultTrainingLeakCount,
    crossCardLeakCount,
    missingProvenanceAcceptedCount,
    dedupeCollisionCount: built.dedupeCollisionCount,
    dedupeGapCount,
    sourceTraceRate,
    schemaSupported: dataset.schemaVersion === PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
  }
  const findings = buildFindings({
    fixture,
    manifest,
    examples: built.examples,
    metrics,
    sourcesById: sourceById,
  })
  const trace: PersonaTrainingDatasetQualityTrace = {
    id: `persona-training-dataset-quality:${fixture.id}:${fixture.createdAt}`,
    fixtureId: fixture.id,
    owner: 'PersonaTrainingDataset',
    selectedIds: exportedIds,
    rejectedIds,
    forbiddenIds: forbiddenExportedIds,
    rankReasonsById: Object.fromEntries(manifest.examples.map(example => [example.sourceId, [
      'persona-dataset:manifest-exported',
      `schema:${example.schemaVersion}`,
      `state:${built.examples.find(item => item.id === example.id)?.state ?? 'unknown'}`,
    ]])),
    metrics,
    error: findings.some(item => item.severity === 'critical')
      ? findings.filter(item => item.severity === 'critical').map(item => item.code).join(';')
      : null,
    createdAt: fixture.createdAt,
  }

  return {
    fixtureId: fixture.id,
    dataset,
    manifest,
    examples: built.examples,
    metrics,
    findings,
    recommendedNextActions: uniqueActions(findings),
    trace,
    passed: findings.every(item => item.severity !== 'critical'),
  }
}

export function runPersonaTrainingDatasetQualityHarnessSuite(input: {
  fixtures: PersonaTrainingDatasetQualityFixture[]
}) {
  const results = input.fixtures.map(fixture => runPersonaTrainingDatasetQualityHarnessFixture({ fixture }))
  return {
    results,
    traces: results.map(result => result.trace),
    passed: results.every(result => result.passed),
    findings: results.flatMap(result => result.findings),
    recommendedNextActions: [...new Set(results.flatMap(result => result.recommendedNextActions))],
  }
}
