import type {
  AlicizationEpisodicEventRecord,
  AlicizationMemoryFact,
  AlicizationMemoryReflectionRecord,
} from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { LongTermMemoryEvidenceCandidate } from './long-term-memory-recall'

function normalizeText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 10, maxChars = 120) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, maxChars)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function memoryFactToLongTermEvidenceCandidate(fact: AlicizationMemoryFact): LongTermMemoryEvidenceCandidate {
  return {
    id: fact.id,
    kind: 'fact',
    summary: normalizeText(`${fact.subject} ${fact.predicate} ${fact.object}`, 320),
    source: 'memory_facts',
    confidence: fact.confidence,
    salience: fact.validationStatus === 'validated' ? 0.78 : 0.58,
    updatedAt: fact.updatedAt,
    cues: uniqueTexts([
      fact.subject,
      fact.predicate,
      fact.object,
      fact.memoryDomain ?? '',
      fact.sourceLabel ?? '',
    ], 10, 120),
    entities: uniqueTexts([fact.subject], 4, 80),
    sensitivity: 'personal',
  }
}

export function memoryReflectionToLongTermEvidenceCandidate(reflection: AlicizationMemoryReflectionRecord): LongTermMemoryEvidenceCandidate {
  return {
    id: reflection.id,
    kind: 'reflection',
    summary: normalizeText(`${reflection.summary} ${reflection.lesson}`, 360),
    source: 'memory_reflections',
    confidence: reflection.confidence,
    salience: reflection.status === 'confirmed' ? 0.82 : 0.64,
    updatedAt: reflection.updatedAt,
    cues: uniqueTexts([
      reflection.summary,
      reflection.lesson,
      reflection.targetScope,
      reflection.status,
    ], 10, 120),
    entities: ['user', 'alicization'],
    sensitivity: 'personal',
  }
}

export function episodicEventToLongTermEvidenceCandidate(event: AlicizationEpisodicEventRecord): LongTermMemoryEvidenceCandidate {
  return {
    id: event.id,
    kind: 'episode',
    summary: normalizeText([
      event.threadAnchor,
      event.whatHappened,
      event.whatChanged,
      event.relationshipMeaning,
      event.lesson,
    ].filter(Boolean).join(' '), 420),
    source: 'episodic_events',
    confidence: event.confidence,
    salience: event.salience,
    occurredAt: event.occurredAt,
    updatedAt: event.updatedAt,
    threadAnchor: event.threadAnchor,
    cues: uniqueTexts([
      event.threadAnchor,
      event.whatHappened,
      event.whatChanged,
      event.relationshipMeaning,
      event.lesson,
      ...event.tags,
      ...event.emotionTags,
    ], 12, 120),
    entities: uniqueTexts(event.withWhom, 6, 80),
    sensitivity: 'personal',
  }
}

export function memoryConsolidationToLongTermEvidenceCandidate(
  record: AlicizationMemoryConsolidationRecord,
): LongTermMemoryEvidenceCandidate {
  return {
    id: record.id,
    kind: 'consolidation',
    summary: normalizeText([record.summary, record.lesson].filter(Boolean).join(' '), 420),
    source: 'memory_consolidations',
    confidence: record.confidence,
    salience: record.kind === 'autobiographical' ? 0.78 : 0.66,
    occurredAt: record.periodEndedAt,
    updatedAt: record.updatedAt,
    cues: uniqueTexts([
      record.kind,
      record.facet ?? '',
      record.summary,
      record.lesson ?? '',
      ...record.cues,
    ], 12, 120),
    entities: ['user', 'alicization'],
    sensitivity: 'personal',
  }
}
