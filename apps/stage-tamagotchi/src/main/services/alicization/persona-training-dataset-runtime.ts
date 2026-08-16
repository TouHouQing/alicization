import { createHash } from 'node:crypto'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

export const PERSONA_TRAINING_DATASET_SCHEMA_VERSION = 'persona-training-dataset-v1'
export const PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION = 'persona-training-example-v1'

export type PersonaTrainingDatasetSourceKind
  = | 'cleaned-long-term-reflection'
    | 'persona-reinforcement'
    | 'raw-transcript'
    | 'review-queue'
    | 'failure-artifact'
    | 'internal-cue'

export type PersonaTrainingDatasetExampleState = 'staged' | 'quarantined' | 'revoked'
export type PersonaTrainingDatasetPiiStatus = 'clear' | 'detected' | 'not-checked'

export interface PersonaTrainingDatasetConsentSnapshot {
  granted: boolean
  policyVersion: string
  scope: string
  capturedAt?: number
}

export interface PersonaTrainingDatasetCleaningProvenance {
  kind: 'working-memory-cleaning'
  cleaningTransactionId: string
  cleanedAt: number
}

export interface PersonaTrainingDatasetSource {
  cardId: string
  sourceId: string
  sourceKind: PersonaTrainingDatasetSourceKind | string
  status: string
  cleaned: boolean
  summary: string
  lesson: string
  positiveExample?: string | null
  negativeExample?: string | null
  sensitivity?: 'public' | 'personal' | 'private' | 'secret' | string | null
  allowTraining?: boolean
  consent?: PersonaTrainingDatasetConsentSnapshot | null
  provenance?: PersonaTrainingDatasetCleaningProvenance | null
}

export interface PersonaTrainingDatasetExample {
  id: string
  datasetId: string
  cardId: string
  schemaVersion: string
  sourceId: string
  sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
  contentHash: string
  behaviorLesson: string
  positiveExample: string
  negativeExample: string | null
  sensitivity: string
  piiStatus: PersonaTrainingDatasetPiiStatus
  piiReason: string | null
  consentSnapshot: PersonaTrainingDatasetConsentSnapshot
  provenance?: PersonaTrainingDatasetCleaningProvenance | null
  allowTraining: boolean
  state: PersonaTrainingDatasetExampleState
  createdAt: number
  revokedAt?: number | null
}

export interface PersonaTrainingDatasetVersion {
  id: string
  cardId: string
  version: number
  schemaVersion: string
  consentSnapshot: PersonaTrainingDatasetConsentSnapshot
  createdAt: number
  exportedAt: number | null
  activeAt: number | null
  rolledBackAt: number | null
}

export interface PersonaTrainingDatasetManifest {
  datasetId: string
  cardId: string
  version: number
  schemaVersion: string
  exportedAt: number
  consentSnapshot: PersonaTrainingDatasetConsentSnapshot
  exampleCount: number
  examples: Array<{
    id: string
    sourceId: string
    sourceKind: PersonaTrainingDatasetExample['sourceKind']
    schemaVersion: string
    contentHash: string
    provenance: PersonaTrainingDatasetCleaningProvenance
    behaviorLesson: string
    positiveExample: string
    negativeExample: string | null
  }>
  manifestHash: string
}

export interface PersonaTrainingDatasetQualityGateResult {
  passed: boolean
  criticalFindingCount: number
  warningFindingCount: number
  findings: Array<{
    severity: 'critical' | 'warning'
    code: string
    message: string
  }>
}

export interface PersonaTrainingDatasetRepository {
  atomicTrainingGovernance?: boolean
  listVersions: (cardId: string) => Promise<PersonaTrainingDatasetVersion[]>
  createVersion: (input: Omit<PersonaTrainingDatasetVersion, 'exportedAt' | 'activeAt' | 'rolledBackAt'>) => Promise<PersonaTrainingDatasetVersion>
  insertExamples: (examples: PersonaTrainingDatasetExample[]) => Promise<PersonaTrainingDatasetExample[]>
  listExamples: (cardId: string, datasetId: string) => Promise<PersonaTrainingDatasetExample[]>
  appendExport: (input: {
    id: string
    datasetId: string
    cardId: string
    manifestHash: string
    manifestJson: string
    exportedAt: number
  }) => Promise<void>
  markExported?: (cardId: string, datasetId: string, exportedAt: number) => Promise<void>
  setActiveVersion: (cardId: string, datasetId: string, at: number) => Promise<PersonaTrainingDatasetVersion | null>
  rollbackToVersion: (cardId: string, datasetId: string, at: number) => Promise<PersonaTrainingDatasetVersion | null>
  revokeSource: (cardId: string, sourceId: string, at: number) => Promise<number>
  updateExamplePolicy: (input: {
    cardId: string
    exampleId: string
    allowTraining: boolean
    consentSnapshot: PersonaTrainingDatasetConsentSnapshot
  }) => Promise<PersonaTrainingDatasetExample | null>
}

export interface PersonaTrainingDatasetRuntime {
  atomicTrainingGovernance?: boolean
  stageVersion: (input: {
    cardId: string
    consent: PersonaTrainingDatasetConsentSnapshot
  }) => Promise<PersonaTrainingDatasetVersion>
  getSnapshot: (input: { cardId: string }) => Promise<{
    activeVersionId: string | null
    versions: PersonaTrainingDatasetVersion[]
    examples: PersonaTrainingDatasetExample[]
  }>
  exportVersion: (input: { cardId: string, datasetId?: string | null }) => Promise<{
    dataset: PersonaTrainingDatasetVersion
    manifest: PersonaTrainingDatasetManifest
    qualityGate: PersonaTrainingDatasetQualityGateResult
  }>
  activateVersion: (input: { cardId: string, datasetId: string }) => Promise<PersonaTrainingDatasetVersion | null>
  rollbackVersion: (input: { cardId: string, datasetId: string }) => Promise<PersonaTrainingDatasetVersion | null>
  revokeSource: (input: { cardId: string, sourceId: string }) => Promise<{ affected: number }>
  setExamplePolicy: (input: {
    cardId: string
    exampleId: string
    allowTraining: boolean
    consent: PersonaTrainingDatasetConsentSnapshot
  }) => Promise<PersonaTrainingDatasetExample | null>
}

export function normalizePersonaTrainingDatasetText(raw: unknown, maxChars = 720) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
}

function normalizeConsent(input: PersonaTrainingDatasetConsentSnapshot | null | undefined, now: number) {
  return {
    granted: input?.granted === true,
    policyVersion: normalizePersonaTrainingDatasetText(input?.policyVersion, 120) || 'persona-training-consent-v1',
    scope: normalizePersonaTrainingDatasetText(input?.scope, 160) || 'persona-dataset',
    capturedAt: Number.isFinite(input?.capturedAt) ? Math.max(0, Math.floor(Number(input?.capturedAt))) : now,
  } satisfies PersonaTrainingDatasetConsentSnapshot
}

function contentHash(input: {
  schemaVersion: string
  behaviorLesson: string
  positiveExample: string
  negativeExample: string | null
  sourceKind: string
}) {
  return createHash('sha256')
    .update(JSON.stringify({
      schemaVersion: input.schemaVersion,
      behaviorLesson: input.behaviorLesson,
      negativeExample: input.negativeExample,
      positiveExample: input.positiveExample,
      sourceKind: input.sourceKind,
    }))
    .digest('hex')
}

function containsPii(...values: string[]) {
  const text = values.join(' ')
  return /\b[\w.%+-]+@[\w.-]+\.[A-Z]{2,}\b/i.test(text)
    || /(?:\+?86[-\s]?)?1[3-9]\d{9}\b/u.test(text)
    || /\b(?:sk|api|key|token)[-_]?[\dA-Z]{12,}\b/iu.test(text)
    || /\b(?:\d{1,3}\.){3}\d{1,3}\b/u.test(text)
    || /\b\d{17}[\dXx]\b/u.test(text)
    || /\b(?:\d[ -]?){13,19}\b/u.test(text)
}

function containsFixedTemplateResidue(...values: string[]) {
  const text = values.join(' ')
  return /fixed[-_ ]template|internal[-_ ]cue|opening[-_ ]policy|relationship[-_ ]cadence|visibility\s*=\s*redacted_internal/iu.test(text)
}

function normalizeCleaningProvenance(
  input: PersonaTrainingDatasetCleaningProvenance | null | undefined,
): PersonaTrainingDatasetCleaningProvenance | null {
  const cleaningTransactionId = normalizePersonaTrainingDatasetText(input?.cleaningTransactionId, 240)
  const cleanedAt = Number(input?.cleanedAt)
  if (input?.kind !== 'working-memory-cleaning' || !cleaningTransactionId || !Number.isFinite(cleanedAt) || cleanedAt < 0)
    return null
  return {
    kind: 'working-memory-cleaning',
    cleaningTransactionId,
    cleanedAt: Math.floor(cleanedAt),
  }
}

function isSensitivePersonaTrainingSource(source: PersonaTrainingDatasetSource) {
  const sensitivity = normalizePersonaTrainingDatasetText(source.sensitivity, 40).toLowerCase()
  return sensitivity === 'private' || sensitivity === 'secret'
}

export function classifyPersonaTrainingDatasetSource(source: PersonaTrainingDatasetSource): {
  accepted: boolean
  state: PersonaTrainingDatasetExampleState
  allowTraining: boolean
  piiStatus: PersonaTrainingDatasetPiiStatus
  piiReason: string | null
  sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement' | null
  behaviorLesson: string
  positiveExample: string
  negativeExample: string | null
  contentHash: string | null
  rejectionReason?: string
} {
  const sourceKind = source.sourceKind === 'cleaned-long-term-reflection' || source.sourceKind === 'persona-reinforcement'
    ? source.sourceKind
    : null
  const behaviorLesson = normalizePersonaTrainingDatasetText(source.lesson || source.summary)
  const positiveExample = normalizePersonaTrainingDatasetText(source.positiveExample || behaviorLesson)
  const negativeExample = normalizePersonaTrainingDatasetText(source.negativeExample) || null

  const cleaningProvenance = normalizeCleaningProvenance(source.provenance)

  if (!sourceKind || source.status !== 'confirmed' || source.cleaned !== true || !cleaningProvenance || !behaviorLesson || !positiveExample) {
    return {
      accepted: false,
      state: 'quarantined',
      allowTraining: false,
      piiStatus: 'not-checked',
      piiReason: null,
      sourceKind,
      behaviorLesson,
      positiveExample,
      negativeExample,
      contentHash: null,
      rejectionReason: 'source is not a cleaned confirmed persona source',
    }
  }

  const templateResidue = containsAlicizationFixedTemplateResidue(
    [source.summary, source.lesson, positiveExample, negativeExample].filter(Boolean).join(' '),
    { provenance: 'internal-structured-fact' },
  ) || containsFixedTemplateResidue(source.summary, source.lesson, positiveExample, negativeExample ?? '')
  const hasPii = containsPii(source.summary, source.lesson, positiveExample, negativeExample ?? '')
  const sensitive = isSensitivePersonaTrainingSource(source)
  const piiStatus: PersonaTrainingDatasetPiiStatus = hasPii ? 'detected' : 'clear'
  const quarantined = templateResidue || hasPii || sensitive
  const hash = contentHash({
    schemaVersion: PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION,
    behaviorLesson,
    positiveExample,
    negativeExample,
    sourceKind,
  })

  return {
    accepted: true,
    state: quarantined ? 'quarantined' : 'staged',
    allowTraining: quarantined ? false : source.allowTraining === true,
    piiStatus,
    piiReason: hasPii
      ? 'possible personal identifier detected'
      : templateResidue
        ? 'fixed-template residue detected'
        : sensitive
          ? 'sensitive source requires quarantine'
          : null,
    sourceKind,
    behaviorLesson,
    positiveExample,
    negativeExample,
    contentHash: hash,
  }
}

export function buildPersonaTrainingDatasetManifest(input: {
  dataset: PersonaTrainingDatasetVersion
  examples: PersonaTrainingDatasetExample[]
  exportedAt: number
}): PersonaTrainingDatasetManifest {
  const datasetConsentGranted = input.dataset.consentSnapshot.granted === true
  const datasetSchemaSupported = input.dataset.schemaVersion === PERSONA_TRAINING_DATASET_SCHEMA_VERSION
  const eligibleExamples = input.examples
    .filter(example =>
      datasetConsentGranted
      && datasetSchemaSupported
      && example.cardId === input.dataset.cardId
      && example.datasetId === input.dataset.id
      && example.schemaVersion === PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION
      && example.state === 'staged'
      && example.allowTraining
      && example.piiStatus === 'clear'
      && example.consentSnapshot.granted
      && normalizeCleaningProvenance(example.provenance) != null,
    )
    .sort((left, right) =>
      left.contentHash.localeCompare(right.contentHash)
      || left.sourceId.localeCompare(right.sourceId),
    )
    .map((example) => {
      const provenance = normalizeCleaningProvenance(example.provenance)!
      return {
        id: example.id,
        sourceId: example.sourceId,
        sourceKind: example.sourceKind,
        schemaVersion: example.schemaVersion,
        contentHash: example.contentHash,
        provenance,
        behaviorLesson: example.behaviorLesson,
        positiveExample: example.positiveExample,
        negativeExample: example.negativeExample,
      }
    })
  const base = {
    datasetId: input.dataset.id,
    cardId: input.dataset.cardId,
    version: input.dataset.version,
    schemaVersion: input.dataset.schemaVersion,
    consentSnapshot: input.dataset.consentSnapshot,
    exampleCount: eligibleExamples.length,
    examples: eligibleExamples,
  }
  const manifestHash = createHash('sha256').update(JSON.stringify(base)).digest('hex')
  return {
    ...base,
    exportedAt: Math.max(0, Math.floor(input.exportedAt)),
    manifestHash,
  }
}

export function evaluatePersonaTrainingDatasetManifestQualityGate(input: {
  dataset: PersonaTrainingDatasetVersion
  examples: PersonaTrainingDatasetExample[]
  manifest: PersonaTrainingDatasetManifest
}): PersonaTrainingDatasetQualityGateResult {
  const findings: PersonaTrainingDatasetQualityGateResult['findings'] = []
  const add = (severity: 'critical' | 'warning', code: string, message: string) => {
    findings.push({ severity, code, message })
  }
  if (input.dataset.schemaVersion !== PERSONA_TRAINING_DATASET_SCHEMA_VERSION)
    add('critical', 'schema-mismatch', 'Persona/LoRA dataset schema is not supported.')
  if (input.manifest.datasetId !== input.dataset.id || input.manifest.cardId !== input.dataset.cardId)
    add('critical', 'manifest-dataset-mismatch', 'Persona/LoRA manifest does not belong to the resolved dataset.')
  if (input.manifest.exampleCount !== input.manifest.examples.length)
    add('critical', 'manifest-count-mismatch', 'Persona/LoRA manifest example count does not match exported examples.')
  if (input.manifest.examples.length > 0 && !input.dataset.consentSnapshot.granted)
    add('critical', 'dataset-consent-missing', 'Persona/LoRA manifest contains examples without dataset consent.')

  const examplesById = new Map(input.examples.map(example => [example.id, example]))
  const contentHashes = new Set<string>()
  for (const manifestExample of input.manifest.examples) {
    const source = examplesById.get(manifestExample.id)
    if (!source) {
      add('critical', 'manifest-source-missing', `Persona/LoRA manifest example is missing its runtime source: ${manifestExample.id}`)
      continue
    }
    if (contentHashes.has(manifestExample.contentHash))
      add('critical', 'duplicate-content-hash', `Persona/LoRA manifest duplicated content hash: ${manifestExample.contentHash}`)
    contentHashes.add(manifestExample.contentHash)
    if (source.cardId !== input.dataset.cardId || source.datasetId !== input.dataset.id)
      add('critical', 'cross-dataset-example', `Persona/LoRA manifest leaked an example from another card or dataset: ${source.id}`)
    if (source.schemaVersion !== PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION || manifestExample.schemaVersion !== PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION)
      add('critical', 'example-schema-mismatch', `Persona/LoRA example schema is not supported: ${source.id}`)
    if (source.state !== 'staged' || !source.allowTraining)
      add('critical', 'inactive-example-exported', `Persona/LoRA manifest exported a non-staged or no-training example: ${source.id}`)
    if (source.piiStatus !== 'clear')
      add('critical', 'pii-example-exported', `Persona/LoRA manifest exported a PII-tainted example: ${source.id}`)
    if (!source.consentSnapshot.granted)
      add('critical', 'example-consent-missing', `Persona/LoRA manifest exported an example without example consent: ${source.id}`)
    if (!normalizeCleaningProvenance(source.provenance))
      add('critical', 'cleaning-provenance-missing', `Persona/LoRA manifest exported an example without cleaning provenance: ${source.id}`)
  }

  const criticalFindingCount = findings.filter(finding => finding.severity === 'critical').length
  const warningFindingCount = findings.filter(finding => finding.severity === 'warning').length
  return {
    passed: criticalFindingCount === 0,
    criticalFindingCount,
    warningFindingCount,
    findings,
  }
}

export function createPersonaTrainingDatasetRuntime(input: {
  repository: PersonaTrainingDatasetRepository
  now: () => number
  randomUUID: () => string
  listSources: (cardId: string) => Promise<PersonaTrainingDatasetSource[]>
}): PersonaTrainingDatasetRuntime {
  function normalizeCardId(cardId: string) {
    const normalized = normalizePersonaTrainingDatasetText(cardId, 120)
    if (!normalized)
      throw new Error('persona training dataset requires cardId')
    return normalized
  }

  async function listScopedVersions(cardId: string) {
    return (await input.repository.listVersions(cardId))
      .filter(version => version.cardId === cardId)
  }

  async function listScopedExamples(cardId: string, datasetId: string) {
    return (await input.repository.listExamples(cardId, datasetId))
      .filter(example => example.cardId === cardId && example.datasetId === datasetId)
  }

  async function resolveDataset(cardId: string, datasetId?: string | null) {
    const normalizedCardId = normalizeCardId(cardId)
    const versions = await listScopedVersions(normalizedCardId)
    const normalizedDatasetId = normalizePersonaTrainingDatasetText(datasetId, 180)
    const dataset = normalizedDatasetId
      ? versions.find(version => version.id === normalizedDatasetId)
      : versions.sort((left, right) => right.version - left.version)[0]
    if (!dataset)
      throw new Error('persona training dataset version not found')
    return dataset
  }

  async function buildCurrentManifest(dataset: PersonaTrainingDatasetVersion, exportedAt: number) {
    const examples = await listScopedExamples(dataset.cardId, dataset.id)
    const manifest = buildPersonaTrainingDatasetManifest({
      dataset,
      examples,
      exportedAt,
    })
    const qualityGate = evaluatePersonaTrainingDatasetManifestQualityGate({
      dataset,
      examples,
      manifest,
    })
    return { manifest, examples, qualityGate }
  }

  async function requireActivatableDataset(cardId: string, datasetId: string) {
    const dataset = await resolveDataset(cardId, datasetId)
    if (!dataset.consentSnapshot.granted)
      throw new Error('persona training dataset consent is not granted')
    const { manifest, qualityGate } = await buildCurrentManifest(dataset, input.now())
    if (!qualityGate.passed)
      throw new Error(`persona training dataset quality gate failed: ${qualityGate.findings.map(finding => finding.code).join(', ')}`)
    if (manifest.exampleCount === 0)
      throw new Error('persona training dataset has no eligible training examples')
    return dataset
  }

  async function stageVersion(stageInput: {
    cardId: string
    consent: PersonaTrainingDatasetConsentSnapshot
  }) {
    const cardId = normalizeCardId(stageInput.cardId)
    const now = input.now()
    const consent = normalizeConsent(stageInput.consent, now)
    const versions = await listScopedVersions(cardId)
    const version = (versions.reduce((max, item) => Math.max(max, item.version), 0) || 0) + 1
    const dataset = await input.repository.createVersion({
      id: `persona-dataset:${cardId}:${version}`,
      cardId,
      version,
      schemaVersion: PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
      consentSnapshot: consent,
      createdAt: now,
    })
    const sourceResults = (await input.listSources(cardId))
      .filter(source => normalizePersonaTrainingDatasetText(source.cardId, 120) === cardId)
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
        id: `persona-example:${dataset.id}:${result.contentHash}`,
        datasetId: dataset.id,
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
        consentSnapshot: consent,
        provenance: normalizeCleaningProvenance(source.provenance),
        allowTraining: result.allowTraining && consent.granted,
        state: result.state,
        createdAt: now,
        revokedAt: null,
      } satisfies PersonaTrainingDatasetExample))
    if (examples.length > 0)
      await input.repository.insertExamples(examples)
    return dataset
  }

  async function getSnapshot(snapshotInput: { cardId: string }) {
    const cardId = normalizeCardId(snapshotInput.cardId)
    const versions = await listScopedVersions(cardId)
    const examples = (await Promise.all(
      versions.map(version => listScopedExamples(cardId, version.id)),
    )).flat()
    const activeCandidates = versions.filter(version => version.activeAt != null)
    let activeVersionId: string | null = null
    for (const version of activeCandidates) {
      const manifest = buildPersonaTrainingDatasetManifest({
        dataset: version,
        examples: examples.filter(example => example.datasetId === version.id),
        exportedAt: input.now(),
      })
      if (manifest.exampleCount > 0) {
        activeVersionId = version.id
        break
      }
    }
    return {
      activeVersionId,
      versions: versions.sort((left, right) => right.version - left.version),
      examples,
    }
  }

  async function exportVersion(exportInput: { cardId: string, datasetId?: string | null }) {
    const dataset = await resolveDataset(exportInput.cardId, exportInput.datasetId)
    const { manifest, qualityGate } = await buildCurrentManifest(dataset, input.now())
    if (!qualityGate.passed)
      throw new Error(`persona training dataset quality gate failed: ${qualityGate.findings.map(finding => finding.code).join(', ')}`)
    await input.repository.appendExport({
      id: `persona-export:${dataset.id}:${manifest.manifestHash}`,
      datasetId: dataset.id,
      cardId: dataset.cardId,
      manifestHash: manifest.manifestHash,
      manifestJson: JSON.stringify(manifest),
      exportedAt: manifest.exportedAt,
    })
    await input.repository.markExported?.(dataset.cardId, dataset.id, manifest.exportedAt)
    return { dataset, manifest, qualityGate }
  }

  async function activateVersion(activationInput: { cardId: string, datasetId: string }) {
    const cardId = normalizeCardId(activationInput.cardId)
    const dataset = await requireActivatableDataset(cardId, activationInput.datasetId)
    return await input.repository.setActiveVersion(cardId, dataset.id, input.now())
  }

  async function rollbackVersion(rollbackInput: { cardId: string, datasetId: string }) {
    const cardId = normalizeCardId(rollbackInput.cardId)
    const dataset = await requireActivatableDataset(cardId, rollbackInput.datasetId)
    return await input.repository.rollbackToVersion(cardId, dataset.id, input.now())
  }

  async function revokeSource(revokeInput: { cardId: string, sourceId: string }) {
    const cardId = normalizeCardId(revokeInput.cardId)
    const sourceId = normalizePersonaTrainingDatasetText(revokeInput.sourceId, 240)
    if (!sourceId)
      throw new Error('persona training dataset source revoke requires sourceId')
    const affected = await input.repository.revokeSource(
      cardId,
      sourceId,
      input.now(),
    )
    return { affected }
  }

  async function setExamplePolicy(policyInput: {
    cardId: string
    exampleId: string
    allowTraining: boolean
    consent: PersonaTrainingDatasetConsentSnapshot
  }) {
    const cardId = normalizeCardId(policyInput.cardId)
    const exampleId = normalizePersonaTrainingDatasetText(policyInput.exampleId, 360)
    if (!exampleId)
      throw new Error('persona training dataset policy requires exampleId')
    const consent = normalizeConsent(policyInput.consent, input.now())
    const versions = await listScopedVersions(cardId)
    const examples = (await Promise.all(
      versions.map(version => listScopedExamples(cardId, version.id)),
    )).flat()
    const example = examples.find(item => item.id === exampleId)
    if (!example)
      return null
    const canEnable = example.state === 'staged'
      && example.piiStatus === 'clear'
      && normalizeCleaningProvenance(example.provenance) != null
      && consent.granted
    return await input.repository.updateExamplePolicy({
      cardId,
      exampleId,
      allowTraining: policyInput.allowTraining && canEnable,
      consentSnapshot: consent,
    })
  }

  return {
    atomicTrainingGovernance: input.repository.atomicTrainingGovernance === true,
    stageVersion,
    getSnapshot,
    exportVersion,
    activateVersion,
    rollbackVersion,
    revokeSource,
    setExamplePolicy,
  }
}
