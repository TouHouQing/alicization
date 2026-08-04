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

export function memoryWorkbenchItemToEvidenceCandidate(item: AlicizationMemoryWorkbenchItem): LongTermMemoryEvidenceCandidate {
  return {
    id: item.id,
    kind: item.kind === 'procedure'
      ? 'episode'
      : normalizeKind(item.kind),
    summary: normalizeText([item.summary, ...item.evidenceSnippets].filter(Boolean).join(' '), 720),
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
    summary: normalizeText(record.text, 720),
    source: normalizeText(record.source, 120),
    origin: normalizeText(record.source, 120),
    confidence: normalizeScore(metadata.confidence),
    salience: normalizeScore(metadata.salience),
    updatedAt: record.updatedAt,
    sensitivity: normalizeSensitivity(metadata.sensitivity),
  }
}
