import type { AlicizationMemoryWorkbenchItem } from '../../../shared/eventa'
import type { LongTermMemoryEvidenceCandidate } from './long-term-memory-recall'
import type { LongTermMemoryVectorRecord } from './long-term-memory-vector-store'

const evidenceKinds = new Set<LongTermMemoryEvidenceCandidate['kind']>([
  'fact',
  'reflection',
  'episode',
  'consolidation',
])

const sensitivities = new Set<NonNullable<LongTermMemoryEvidenceCandidate['sensitivity']>>([
  'public',
  'personal',
  'private',
  'secret',
])

function normalizeText(raw: unknown, maxChars = 360) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).trim()
    : ''
}

function normalizeKind(raw: unknown): LongTermMemoryEvidenceCandidate['kind'] {
  return typeof raw === 'string' && evidenceKinds.has(raw as LongTermMemoryEvidenceCandidate['kind'])
    ? raw as LongTermMemoryEvidenceCandidate['kind']
    : 'fact'
}

function normalizeSensitivity(raw: unknown): LongTermMemoryEvidenceCandidate['sensitivity'] {
  return typeof raw === 'string' && sensitivities.has(raw as NonNullable<LongTermMemoryEvidenceCandidate['sensitivity']>)
    ? raw as NonNullable<LongTermMemoryEvidenceCandidate['sensitivity']>
    : null
}

function normalizeScore(raw: unknown, fallback = 0.5) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return fallback
  return Math.max(0, Math.min(1, value))
}

const internalMemorySourceLabelPattern = /(?:^|\s)(?:working-memory-owner|async-memory|runtime-outcome|artifact-rollback|superseded-by|reopened-by|shadow-rule-extraction|dialogue-feedback|execution-audit|trusted-tool|learning-(?:verify|revise|internalized|validated))(?:[:\s-]|$)/iu
const factProjectionPrefixPattern = /^(?:user|assistant|host|alicization)\s+\S+\s+/iu
const factProjectionSuffixPattern = /\s+(?:relationship|procedure|self-model|experience|episodic|autobiographical|preference|fact)\s*$/iu
const factProjectionFragmentPattern = /^(?:user|assistant|host|alicization|prefers|likes|dislikes|relationship|procedure|self-model|experience|episodic|autobiographical|preference|fact)$/iu

function isInternalMemorySourceLabel(raw: string) {
  const normalized = raw.trim().toLowerCase()
  if (!normalized)
    return false

  return internalMemorySourceLabelPattern.test(normalized)
}

function stripInternalMemorySourceLabelSuffix(raw: string) {
  const normalized = normalizeText(raw, 720)
  if (!normalized)
    return ''

  const match = internalMemorySourceLabelPattern.exec(normalized)
  return match?.index === undefined
    ? normalized
    : normalized.slice(0, match.index).trim()
}

function stripFactProjectionResidue(raw: string) {
  let normalized = stripInternalMemorySourceLabelSuffix(raw)
  if (!normalized)
    return ''
  if (factProjectionFragmentPattern.test(normalized))
    return ''
  normalized = normalized.replace(factProjectionPrefixPattern, '').trim()
  normalized = normalized.replace(factProjectionSuffixPattern, '').trim()
  return factProjectionFragmentPattern.test(normalized) ? '' : normalized
}

function buildProviderCandidateSummary(
  values: Array<string | null | undefined>,
  source?: string,
) {
  const summaryParts: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = source === 'memory_facts'
      ? stripFactProjectionResidue(normalizeText(value, 720))
      : stripInternalMemorySourceLabelSuffix(normalizeText(value, 720))
    if (!normalized || isInternalMemorySourceLabel(normalized))
      continue
    const dedupeKey = normalized.toLocaleLowerCase()
    if (seen.has(dedupeKey))
      continue
    seen.add(dedupeKey)
    summaryParts.push(normalized)
  }
  return summaryParts.join(' ').slice(0, 720).trim()
}

export function memoryWorkbenchItemToEvidenceCandidate(item: AlicizationMemoryWorkbenchItem): LongTermMemoryEvidenceCandidate {
  return {
    id: item.id,
    kind: item.kind === 'procedure'
      ? 'episode'
      : normalizeKind(item.kind),
    summary: buildProviderCandidateSummary([item.summary, ...item.evidenceSnippets], item.source),
    source: normalizeText(item.source, 120),
    origin: item.source,
    confidence: normalizeScore(item.confidence),
    salience: normalizeScore(item.salience),
    updatedAt: item.updatedAt,
    occurredAt: item.createdAt,
    sensitivity: normalizeSensitivity(item.sensitivity),
  }
}

export function persistentVectorRecordToEvidenceCandidate(
  record: LongTermMemoryVectorRecord,
): LongTermMemoryEvidenceCandidate {
  const metadata = record.metadata ?? {}
  const workbenchItemId = normalizeText(metadata.workbenchItemId, 240)
  return {
    id: workbenchItemId || record.sourceId,
    kind: normalizeKind(metadata.kind),
    summary: buildProviderCandidateSummary([record.text], record.source),
    source: normalizeText(record.source, 120),
    origin: normalizeText(record.source, 120),
    confidence: normalizeScore(metadata.confidence),
    salience: normalizeScore(metadata.salience),
    updatedAt: record.updatedAt,
    sensitivity: normalizeSensitivity(metadata.sensitivity),
  }
}
