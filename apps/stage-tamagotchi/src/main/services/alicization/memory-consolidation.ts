import type { AlicizationEpisodicEventRecord } from '../../../shared/eventa'

import { buildProceduralMemoryAbstractions } from './memory-procedural-abstraction'

export interface AlicizationMemoryConsolidationRecord {
  id: string
  kind: 'daily' | 'weekly' | 'procedural'
  periodKey: string
  periodStartedAt: number
  periodEndedAt: number
  summary: string
  lesson: string | null
  cues: string[]
  confidence: number
  dominantProvenance: 'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed'
  derivedEventIds: string[]
  updatedAt: number
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
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

function buildDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function buildWeekKey(timestamp: number) {
  const date = new Date(timestamp)
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function pickDominantProvenance(values: Array<'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed'>) {
  const order = ['observed', 'remembered', 'inferred', 'reconstructed', 'dreamt'] as const
  let best: 'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed' = 'remembered'
  let bestScore = -1
  for (const candidate of order) {
    const score = values.filter(value => value === candidate).length
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best
}

function sortEvents(events: AlicizationEpisodicEventRecord[]) {
  return [...events].sort((left, right) => {
    if (left.salience !== right.salience)
      return right.salience - left.salience
    if (left.confidence !== right.confidence)
      return right.confidence - left.confidence
    return right.occurredAt - left.occurredAt
  })
}

function buildSummary(kind: 'daily' | 'weekly', periodKey: string, events: AlicizationEpisodicEventRecord[]) {
  const sorted = sortEvents(events)
  const lead = sorted[0] ?? null
  const cues = uniqueList(sorted.flatMap(event => [
    event.threadAnchor,
    event.whereSummary,
    event.whatHappened,
    event.relationshipMeaning,
  ]), 4)
  const label = kind === 'daily' ? `On ${periodKey}` : `During ${periodKey}`
  return sanitizeText(
    `${label}, the strongest remembered line was ${lead?.threadAnchor || lead?.whereSummary || 'an ongoing continuity seam'}; ${lead?.relationshipMeaning || lead?.whatHappened || cues[0] || 'the period stayed emotionally and relationally live.'}`,
    280,
  )
}

function buildLesson(events: AlicizationEpisodicEventRecord[]) {
  const lessons = uniqueList(events.flatMap(event => [
    event.lesson,
    event.relationshipMeaning,
    event.whatChanged,
  ]), 3)
  return lessons[0] ?? null
}

function buildConfidence(events: AlicizationEpisodicEventRecord[]) {
  if (events.length === 0)
    return 0
  const total = events.reduce((sum, event) => sum + event.confidence * 0.45 + event.salience * 0.45 + event.consolidationPriority * 0.1, 0)
  return clamp01(total / events.length)
}

export function buildMemoryConsolidationRecords(input: {
  events: AlicizationEpisodicEventRecord[]
  now: number
}): AlicizationMemoryConsolidationRecord[] {
  const events = [...input.events]
    .filter(event => event.provenance !== 'dreamt')
    .sort((left, right) => left.occurredAt - right.occurredAt)
  if (events.length === 0)
    return []

  const dailyBuckets = new Map<string, AlicizationEpisodicEventRecord[]>()
  const weeklyBuckets = new Map<string, AlicizationEpisodicEventRecord[]>()
  for (const event of events) {
    const dayKey = buildDayKey(event.occurredAt)
    const weekKey = buildWeekKey(event.occurredAt)
    dailyBuckets.set(dayKey, [...(dailyBuckets.get(dayKey) ?? []), event])
    weeklyBuckets.set(weekKey, [...(weeklyBuckets.get(weekKey) ?? []), event])
  }

  const consolidated: AlicizationMemoryConsolidationRecord[] = []
  for (const [periodKey, bucketEvents] of dailyBuckets) {
    const sorted = sortEvents(bucketEvents)
    consolidated.push({
      id: `daily:${periodKey}`,
      kind: 'daily',
      periodKey,
      periodStartedAt: Math.min(...bucketEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...bucketEvents.map(event => event.occurredAt)),
      summary: buildSummary('daily', periodKey, bucketEvents),
      lesson: buildLesson(bucketEvents),
      cues: uniqueList(sorted.flatMap(event => [
        event.threadAnchor,
        event.whereSummary,
        event.whatHappened,
        event.relationshipMeaning,
        event.lesson,
      ]), 5),
      confidence: buildConfidence(bucketEvents),
      dominantProvenance: pickDominantProvenance(sorted.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
      derivedEventIds: sorted.map(event => event.id),
      updatedAt: input.now,
    })
  }

  for (const [periodKey, bucketEvents] of weeklyBuckets) {
    const sorted = sortEvents(bucketEvents)
    consolidated.push({
      id: `weekly:${periodKey}`,
      kind: 'weekly',
      periodKey,
      periodStartedAt: Math.min(...bucketEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...bucketEvents.map(event => event.occurredAt)),
      summary: buildSummary('weekly', periodKey, bucketEvents),
      lesson: buildLesson(bucketEvents),
      cues: uniqueList(sorted.flatMap(event => [
        event.threadAnchor,
        event.whereSummary,
        event.relationshipMeaning,
        event.lesson,
      ]), 5),
      confidence: buildConfidence(bucketEvents),
      dominantProvenance: pickDominantProvenance(sorted.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
      derivedEventIds: sorted.map(event => event.id),
      updatedAt: input.now,
    })
  }

  const procedural = buildProceduralMemoryAbstractions({
    intent: {
      mode: 'execution-procedure',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchConversations: false,
      searchProceduralExperience: true,
      queryHints: [],
      rationale: 'derive persistent procedural abstraction',
      confidence: 1,
    },
    episodes: events,
  })
  for (const item of procedural) {
    const supporting = events.filter(event => {
      const anchor = `${event.threadAnchor ?? ''} ${event.whereSummary ?? ''} ${event.whatHappened} ${event.lesson ?? ''}`
      return anchor.toLowerCase().includes(item.label.toLowerCase())
        || item.cues.some(cue => anchor.toLowerCase().includes(cue.toLowerCase()))
    })
    if (supporting.length === 0)
      continue
    consolidated.push({
      id: `procedural:${item.id}`,
      kind: 'procedural',
      periodKey: item.id,
      periodStartedAt: Math.min(...supporting.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...supporting.map(event => event.occurredAt)),
      summary: sanitizeText(`The remembered way of handling ${item.label} is ${item.approach}.`, 280),
      lesson: item.pitfalls[0] ?? null,
      cues: uniqueList(item.cues, 5),
      confidence: item.confidence,
      dominantProvenance: pickDominantProvenance(supporting.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
      derivedEventIds: supporting.map(event => event.id),
      updatedAt: input.now,
    })
  }

  return consolidated
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        const rank = { daily: 0, weekly: 1, procedural: 2 } as const
        return rank[left.kind] - rank[right.kind]
      }
      if (left.periodEndedAt !== right.periodEndedAt)
        return right.periodEndedAt - left.periodEndedAt
      return right.confidence - left.confidence
    })
}

export function searchMemoryConsolidationRecords(input: {
  query: string
  records: AlicizationMemoryConsolidationRecord[]
  limit?: number
  recollectionIntent?: {
    mode: 'none' | 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
    temporalFocus: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
    searchEpisodes: boolean
    searchConversations: boolean
    searchProceduralExperience: boolean
    queryHints: string[]
    rationale: string
    confidence: number
  } | null
}): AlicizationMemoryConsolidationRecord[] {
  const query = sanitizeText(input.query, 320).toLowerCase()
  if (!query)
    return []
  const limit = Math.max(1, Math.min(8, Math.floor(input.limit ?? 4)))
  const intent = input.recollectionIntent ?? null
  const hints = uniqueList(intent?.queryHints ?? [], 8).map(item => item.toLowerCase())

  return [...input.records]
    .map((record) => {
      const haystack = `${record.summary} ${record.lesson ?? ''} ${record.cues.join(' ')}`.toLowerCase()
      let lexicalScore = haystack.includes(query) ? 1 : 0
      for (const hint of hints) {
        if (hint && haystack.includes(hint))
          lexicalScore += hint.length >= 10 ? 0.6 : 0.24
      }
      const proceduralBoost = intent?.searchProceduralExperience && record.kind === 'procedural' ? 0.28 : 0
      const distantBoost = (intent?.temporalFocus === 'cross-session' || intent?.temporalFocus === 'distant') && record.kind !== 'daily' ? 0.18 : 0
      const score = lexicalScore * 0.52 + record.confidence * 0.32 + proceduralBoost + distantBoost
      return {
        record,
        score,
      }
    })
    .filter(item => item.score > 0.18)
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return right.record.periodEndedAt - left.record.periodEndedAt
    })
    .slice(0, limit)
    .map(item => item.record)
}
