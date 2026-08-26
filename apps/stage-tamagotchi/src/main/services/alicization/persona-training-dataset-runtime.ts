import type {
  AlicizationPersonaTrainingSourceKind,
  AlicizationPersonaTrainingSourceRef,
} from '@proj-alicization/stage-shared'

import { createHash } from 'node:crypto'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

import { detectPersonaTrainingPii } from './persona-training-pii'

export const PERSONA_TRAINING_DATASET_SCHEMA_VERSION = 'persona-training-dataset-v1'
export const PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION = 'persona-training-example-v1'

export type PersonaTrainingDatasetSourceKind
  = | AlicizationPersonaTrainingSourceKind
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
  sourceKind: AlicizationPersonaTrainingSourceKind
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
  createVersionWithExamples?: (input: {
    dataset: Omit<PersonaTrainingDatasetVersion, 'exportedAt' | 'activeAt' | 'rolledBackAt'>
    examples: PersonaTrainingDatasetExample[]
  }) => Promise<PersonaTrainingDatasetVersion>
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
  appendExportAndMarkExported?: (input: {
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
  revokeSource: (cardId: string, sourceRef: AlicizationPersonaTrainingSourceRef, at: number) => Promise<number>
  updateExamplePolicy: (input: {
    cardId: string
    exampleId: string
    allowTraining: boolean
    consentSnapshot: PersonaTrainingDatasetConsentSnapshot
    state: PersonaTrainingDatasetExampleState
    piiReason: string | null
  }) => Promise<PersonaTrainingDatasetExample | null>
}

export interface PersonaTrainingDatasetRuntime {
  atomicTrainingGovernance?: boolean
  assertVersionActivatable?: (input: {
    cardId: string
    datasetId: string
  }) => Promise<PersonaTrainingDatasetVersion>
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
  revokeSource: (input: { cardId: string } & AlicizationPersonaTrainingSourceRef) => Promise<{ affected: number }>
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

function normalizeSourceConsent(
  input: PersonaTrainingDatasetConsentSnapshot | null | undefined,
  now: number,
) {
  if (input == null) {
    return {
      granted: false,
      policyVersion: '',
      scope: '',
      capturedAt: now,
    } satisfies PersonaTrainingDatasetConsentSnapshot
  }
  return {
    granted: input.granted === true,
    policyVersion: normalizePersonaTrainingDatasetText(input.policyVersion, 120),
    scope: normalizePersonaTrainingDatasetText(input.scope, 160),
    capturedAt: Number.isFinite(input.capturedAt)
      ? Math.max(0, Math.floor(Number(input.capturedAt)))
      : now,
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

function personaTrainingExampleContentHash(
  example: Pick<
    PersonaTrainingDatasetExample,
    'schemaVersion' | 'behaviorLesson' | 'positiveExample' | 'negativeExample' | 'sourceKind'
  >,
) {
  return contentHash({
    schemaVersion: example.schemaVersion,
    behaviorLesson: example.behaviorLesson,
    positiveExample: example.positiveExample,
    negativeExample: example.negativeExample,
    sourceKind: example.sourceKind,
  })
}

function personaTrainingManifestExampleContentHash(
  example: PersonaTrainingDatasetManifest['examples'][number],
) {
  return contentHash({
    schemaVersion: example.schemaVersion,
    behaviorLesson: example.behaviorLesson,
    positiveExample: example.positiveExample,
    negativeExample: example.negativeExample,
    sourceKind: example.sourceKind,
  })
}

function containsPii(...values: string[]) {
  return detectPersonaTrainingPii(...values).detected
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

function isSupportedPersonaTrainingSourceKind(
  sourceKind: string,
): sourceKind is PersonaTrainingDatasetExample['sourceKind'] {
  return sourceKind === 'cleaned-long-term-reflection'
    || sourceKind === 'persona-reinforcement'
}

function personaTrainingConsentMatches(
  left: PersonaTrainingDatasetConsentSnapshot,
  right: PersonaTrainingDatasetConsentSnapshot,
) {
  return left.granted === true
    && right.granted === true
    && left.policyVersion === right.policyVersion
    && left.scope === right.scope
}

function personaTrainingManifestHash(input: {
  datasetId: string
  cardId: string
  version: number
  schemaVersion: string
  consentSnapshot: PersonaTrainingDatasetConsentSnapshot
  exampleCount: number
  examples: PersonaTrainingDatasetManifest['examples']
}) {
  return createHash('sha256').update(JSON.stringify({
    datasetId: input.datasetId,
    cardId: input.cardId,
    version: input.version,
    schemaVersion: input.schemaVersion,
    consentSnapshot: input.consentSnapshot,
    exampleCount: input.exampleCount,
    examples: input.examples,
  })).digest('hex')
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
  const piiDetection = detectPersonaTrainingPii(
    source.summary,
    source.lesson,
    positiveExample,
    negativeExample ?? '',
  )
  const hasPii = piiDetection.detected
  const sensitive = isSensitivePersonaTrainingSource(source)
  const sourceConsentMissing = source.consent?.granted !== true
  const piiStatus: PersonaTrainingDatasetPiiStatus = hasPii ? 'detected' : 'clear'
  const quarantined = templateResidue || hasPii || sensitive || sourceConsentMissing
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
      ? piiDetection.reason
      : templateResidue
        ? 'fixed-template residue detected'
        : sensitive
          ? 'sensitive source requires quarantine'
          : sourceConsentMissing
            ? 'source consent is not granted'
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
    .map(example => ({
      example,
      recalculatedContentHash: personaTrainingExampleContentHash(example),
    }))
    .filter(({ example, recalculatedContentHash }) =>
      datasetConsentGranted
      && datasetSchemaSupported
      && example.cardId === input.dataset.cardId
      && example.datasetId === input.dataset.id
      && example.schemaVersion === PERSONA_TRAINING_EXAMPLE_SCHEMA_VERSION
      && isSupportedPersonaTrainingSourceKind(example.sourceKind)
      && example.state === 'staged'
      && example.allowTraining
      && example.piiStatus === 'clear'
      && personaTrainingConsentMatches(example.consentSnapshot, input.dataset.consentSnapshot)
      && !containsPii(example.behaviorLesson, example.positiveExample, example.negativeExample ?? '')
      && !containsFixedTemplateResidue(example.behaviorLesson, example.positiveExample, example.negativeExample ?? '')
      && !containsAlicizationFixedTemplateResidue(
        [example.behaviorLesson, example.positiveExample, example.negativeExample].filter(Boolean).join(' '),
        { provenance: 'internal-structured-fact' },
      )
      && example.contentHash === recalculatedContentHash
      && normalizeCleaningProvenance(example.provenance) != null,
    )
    .sort((left, right) =>
      left.recalculatedContentHash.localeCompare(right.recalculatedContentHash)
      || left.example.sourceId.localeCompare(right.example.sourceId),
    )
    .map(({ example, recalculatedContentHash }) => {
      const provenance = normalizeCleaningProvenance(example.provenance)!
      return {
        id: example.id,
        sourceId: example.sourceId,
        sourceKind: example.sourceKind,
        schemaVersion: example.schemaVersion,
        contentHash: recalculatedContentHash,
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
  const manifestHash = personaTrainingManifestHash(base)
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
  if (
    input.manifest.version !== input.dataset.version
    || input.manifest.schemaVersion !== input.dataset.schemaVersion
  ) {
    add('critical', 'manifest-version-mismatch', 'Persona/LoRA manifest version does not match the resolved dataset.')
  }
  if (
    input.manifest.consentSnapshot.granted !== input.dataset.consentSnapshot.granted
    || input.manifest.consentSnapshot.policyVersion !== input.dataset.consentSnapshot.policyVersion
    || input.manifest.consentSnapshot.scope !== input.dataset.consentSnapshot.scope
  ) {
    add('critical', 'manifest-consent-mismatch', 'Persona/LoRA manifest consent does not match the resolved dataset.')
  }
  if (input.manifest.exampleCount !== input.manifest.examples.length)
    add('critical', 'manifest-count-mismatch', 'Persona/LoRA manifest example count does not match exported examples.')
  if (input.manifest.manifestHash !== personaTrainingManifestHash(input.manifest))
    add('critical', 'manifest-hash-mismatch', 'Persona/LoRA manifest hash does not match its contents.')
  if (input.manifest.examples.length > 0 && !input.dataset.consentSnapshot.granted)
    add('critical', 'dataset-consent-missing', 'Persona/LoRA manifest contains examples without dataset consent.')

  const examplesById = new Map(input.examples.map(example => [example.id, example]))
  const contentHashes = new Set<string>()
  const contentHashMismatchIds = new Set<string>()
  const addContentHashMismatch = (exampleId: string) => {
    if (contentHashMismatchIds.has(exampleId))
      return
    contentHashMismatchIds.add(exampleId)
    add('critical', 'example-content-hash-mismatch', `Persona/LoRA example content hash does not match its current text: ${exampleId}`)
  }
  for (const example of input.examples) {
    if (
      example.cardId !== input.dataset.cardId
      || example.datasetId !== input.dataset.id
      || example.state !== 'staged'
      || !example.allowTraining
    ) {
      continue
    }
    if (!isSupportedPersonaTrainingSourceKind(example.sourceKind))
      add('critical', 'example-source-kind-unsupported', `Persona/LoRA staged example has an unsupported source kind: ${example.id}`)
    if (example.contentHash !== personaTrainingExampleContentHash(example))
      addContentHashMismatch(example.id)
    if (containsPii(example.behaviorLesson, example.positiveExample, example.negativeExample ?? ''))
      add('critical', 'pii-content-leak', `Persona/LoRA staged example text contains PII: ${example.id}`)
    if (
      containsFixedTemplateResidue(example.behaviorLesson, example.positiveExample, example.negativeExample ?? '')
      || containsAlicizationFixedTemplateResidue(
        [example.behaviorLesson, example.positiveExample, example.negativeExample].filter(Boolean).join(' '),
        { provenance: 'internal-structured-fact' },
      )
    ) {
      add('critical', 'template-content-leak', `Persona/LoRA staged example text contains fixed-template residue: ${example.id}`)
    }
  }
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
    if (!isSupportedPersonaTrainingSourceKind(source.sourceKind) || !isSupportedPersonaTrainingSourceKind(manifestExample.sourceKind))
      add('critical', 'example-source-kind-unsupported', `Persona/LoRA example source kind is not supported: ${source.id}`)
    const recalculatedContentHash = personaTrainingExampleContentHash(source)
    if (source.contentHash !== recalculatedContentHash || manifestExample.contentHash !== recalculatedContentHash)
      addContentHashMismatch(source.id)
    if (manifestExample.contentHash !== personaTrainingManifestExampleContentHash(manifestExample))
      addContentHashMismatch(source.id)
    if (source.state !== 'staged' || !source.allowTraining)
      add('critical', 'inactive-example-exported', `Persona/LoRA manifest exported a non-staged or no-training example: ${source.id}`)
    if (source.piiStatus !== 'clear')
      add('critical', 'pii-example-exported', `Persona/LoRA manifest exported a PII-tainted example: ${source.id}`)
    if (containsPii(source.behaviorLesson, source.positiveExample, source.negativeExample ?? ''))
      add('critical', 'pii-content-leak', `Persona/LoRA manifest exported an example whose text contains PII: ${source.id}`)
    if (containsFixedTemplateResidue(source.behaviorLesson, source.positiveExample, source.negativeExample ?? '')
      || containsAlicizationFixedTemplateResidue(
        [source.behaviorLesson, source.positiveExample, source.negativeExample].filter(Boolean).join(' '),
        { provenance: 'internal-structured-fact' },
      )) {
      add('critical', 'template-content-leak', `Persona/LoRA manifest exported an example whose text contains fixed-template residue: ${source.id}`)
    }
    if (!source.consentSnapshot.granted)
      add('critical', 'example-consent-missing', `Persona/LoRA manifest exported an example without example consent: ${source.id}`)
    if (!personaTrainingConsentMatches(source.consentSnapshot, input.dataset.consentSnapshot))
      add('critical', 'example-consent-mismatch', `Persona/LoRA example consent does not match its dataset: ${source.id}`)
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

  async function assertVersionActivatable(inputData: {
    cardId: string
    datasetId: string
  }) {
    return await requireActivatableDataset(
      normalizeCardId(inputData.cardId),
      inputData.datasetId,
    )
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
    const datasetInput = {
      id: `persona-dataset:${cardId}:${version}`,
      cardId,
      version,
      schemaVersion: PERSONA_TRAINING_DATASET_SCHEMA_VERSION,
      consentSnapshot: consent,
      createdAt: now,
    } satisfies Omit<PersonaTrainingDatasetVersion, 'exportedAt' | 'activeAt' | 'rolledBackAt'>
    const sourceResults = (await input.listSources(cardId))
      .filter(source => normalizePersonaTrainingDatasetText(source.cardId, 120) === cardId)
      .map(source => ({ source, result: classifyPersonaTrainingDatasetSource(source) }))
      .filter(item => item.result.accepted && item.result.sourceKind && item.result.contentHash)
      .sort((left, right) =>
        left.result.contentHash!.localeCompare(right.result.contentHash!)
        || normalizePersonaTrainingDatasetText(left.source.sourceId, 240)
          .localeCompare(normalizePersonaTrainingDatasetText(right.source.sourceId, 240)),
      )
    const buildExamples = (datasetId: string) => {
      const seenHashes = new Set<string>()
      return sourceResults
        .filter(({ result }) => {
          if (!result.contentHash || seenHashes.has(result.contentHash))
            return false
          seenHashes.add(result.contentHash)
          return true
        })
        .map(({ source, result }) => {
          const sourceConsent = normalizeSourceConsent(source.consent, now)
          const sourceConsentMatches = personaTrainingConsentMatches(sourceConsent, consent)
          return {
            id: `persona-example:${datasetId}:${result.contentHash}`,
            datasetId,
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
            consentSnapshot: sourceConsent,
            provenance: normalizeCleaningProvenance(source.provenance),
            allowTraining: result.allowTraining && consent.granted && sourceConsentMatches,
            state: sourceConsentMatches ? result.state : 'quarantined',
            createdAt: now,
            revokedAt: null,
            piiReason: sourceConsentMatches
              ? result.piiReason
              : sourceConsent.granted !== true
                ? 'source consent is not granted'
                : 'source consent does not match dataset policy',
          } satisfies PersonaTrainingDatasetExample
        })
    }
    if (input.repository.createVersionWithExamples) {
      return await input.repository.createVersionWithExamples({
        dataset: datasetInput,
        examples: buildExamples(datasetInput.id),
      })
    }
    const dataset = await input.repository.createVersion(datasetInput)
    const examples = buildExamples(dataset.id)
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
    const persistedExport = {
      id: `persona-export:${dataset.id}:${manifest.manifestHash}`,
      datasetId: dataset.id,
      cardId: dataset.cardId,
      manifestHash: manifest.manifestHash,
      manifestJson: JSON.stringify(manifest),
      exportedAt: manifest.exportedAt,
    }
    if (input.repository.appendExportAndMarkExported) {
      await input.repository.appendExportAndMarkExported(persistedExport)
    }
    else {
      await input.repository.appendExport(persistedExport)
      await input.repository.markExported?.(dataset.cardId, dataset.id, manifest.exportedAt)
    }
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

  async function revokeSource(revokeInput: { cardId: string } & AlicizationPersonaTrainingSourceRef) {
    const cardId = normalizeCardId(revokeInput.cardId)
    const sourceId = normalizePersonaTrainingDatasetText(revokeInput.sourceId, 240)
    if (!sourceId)
      throw new Error('persona training dataset source revoke requires sourceId')
    if (!isSupportedPersonaTrainingSourceKind(revokeInput.sourceKind))
      throw new Error('persona training dataset source revoke requires a supported sourceKind')
    const affected = await input.repository.revokeSource(
      cardId,
      {
        sourceId,
        sourceKind: revokeInput.sourceKind,
      },
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
    const dataset = versions.find(version => version.id === example.datasetId)
    const consentOnlyQuarantine = example.piiReason === null
      || example.piiReason === 'source consent is not granted'
      || example.piiReason === 'source consent does not match dataset policy'
    const canEnable = (example.state === 'staged' || example.state === 'quarantined')
      && example.piiStatus === 'clear'
      && normalizeCleaningProvenance(example.provenance) != null
      && dataset != null
      && example.sensitivity !== 'private'
      && example.sensitivity !== 'secret'
      && consentOnlyQuarantine
      && personaTrainingConsentMatches(consent, dataset.consentSnapshot)
    return await input.repository.updateExamplePolicy({
      cardId,
      exampleId,
      allowTraining: policyInput.allowTraining && canEnable,
      consentSnapshot: consent,
      state: dataset && canEnable
        ? 'staged'
        : 'quarantined',
      piiReason: canEnable ? null : example.piiReason,
    })
  }

  return {
    atomicTrainingGovernance: input.repository.atomicTrainingGovernance === true,
    assertVersionActivatable,
    stageVersion,
    getSnapshot,
    exportVersion,
    activateVersion,
    rollbackVersion,
    revokeSource,
    setExamplePolicy,
  }
}
