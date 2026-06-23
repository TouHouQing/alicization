import type { AlicizationEpisodicEventRecord, AlicizationMemoryProvenance } from '../../../shared/eventa'

import {
  pickDominantAlicizationMemoryProvenance,
  shouldAlicizationMemoryProvenanceEnterLongTermConsolidation,
} from '@proj-alicization/stage-shared'

import { buildProceduralMemoryAbstractions } from './memory-procedural-abstraction'
import {
  scoreSemanticGraphWalk,
  scoreSemanticRecall,
} from './memory-semantic-retrieval'
import {
  deriveConsolidationMemoryTier,
  scoreMemoryTierReachability,
} from './memory-tiering'

export interface AlicizationMemoryConsolidationRecord {
  id: string
  kind: 'daily' | 'weekly' | 'procedural' | 'autobiographical'
  facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
  periodKey: string
  periodStartedAt: number
  periodEndedAt: number
  summary: string
  lesson: string | null
  cues: string[]
  confidence: number
  dominantProvenance: AlicizationMemoryProvenance
  derivedEventIds: string[]
  updatedAt: number
  memoryTier?: 'hot' | 'warm' | 'cold' | null
  metadata?: Record<string, unknown> | null
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

function lowerText(...values: Array<string | null | undefined>) {
  return values.map(value => sanitizeText(value, 320)).filter(Boolean).join(' ').toLowerCase()
}

const samePersonContinuityPattern = /same[- ]?person|same[- ]?her|same living line|continuous digital life|tool shell|generic shell|同一个她|同一条线|数字生命|工具壳/u
const progressPressurePattern = /progress pressure|status recap|status report|generic recap|催进度|催状态|状态汇报/u
const progressPressureNegationPattern = /not a status report|not .*status recap|不是状态汇报|不是催进度|不是催状态/u
const continuityWorryPattern = /worr|afraid|drift|split|断线|滑成|担心/u
const correctedMeaningPattern = /corrected|host corrected|纠正|更正|corrected meaning|first interpretation/u
const tentativeRecallPattern = /tentative|not sure|uncertain|maybe|might|seems|不完全确定|似乎|也许/u
const phaseOneDigitalLifePattern = /phase[- ]?1|local digital life|digital life|数字生命/u
const executionCallbackPattern = /execution callback|callback|回调/u
const unfinishedClosurePattern = /unfinished|open loop|closure|still open|same living line|未完成|闭环|还缺/u
const lowerPressurePattern = /lower-pressure|lower pressure|低压|轻一点|measured-return|leave more room/u
const slowerPacingPattern = /slower pacing|slower|慢一点|更慢/u
const stableGazePattern = /stable gaze|gaze stable|steady gaze|视线更稳|视线稳定/u
const metabolismPattern = /downrank|merge|forget|superseded|older status shell|temporary noise|stale emotional wobble/u

function collectEventTexts(event: AlicizationEpisodicEventRecord) {
  return [
    event.threadAnchor,
    event.whereSummary,
    event.whatHappened,
    event.felt,
    event.whatChanged,
    event.relationshipMeaning,
    event.lesson,
    event.sourceSummary,
    event.latestReconsolidation?.reason ?? null,
    event.latestReconsolidation?.relationshipMeaning ?? null,
    event.latestReconsolidation?.lesson ?? null,
    ...event.emotionTags,
    ...(event.latestReconsolidation?.emotionTags ?? []),
    ...event.tags,
  ]
}

function inferRelationshipPrimaryIntent(text: string) {
  const samePerson = samePersonContinuityPattern.test(text)
  const continuityWorry = continuityWorryPattern.test(text)
  const progressPressure = progressPressurePattern.test(text) && !progressPressureNegationPattern.test(text)
  if (progressPressure && (samePerson || continuityWorry))
    return 'mixed'
  if (samePerson)
    return 'same-person-test'
  if (continuityWorry)
    return 'continuity-worry'
  if (progressPressure)
    return 'progress-pressure'
  return 'ordinary-relationship'
}

function buildHumanlikeCarryMetadata(events: AlicizationEpisodicEventRecord[]) {
  const textParts = events.flatMap(collectEventTexts)
  const combined = lowerText(...textParts)
  if (!combined)
    return null

  const relationshipPrimaryIntent = inferRelationshipPrimaryIntent(combined)
  const emotionalResidueTags = uniqueList(events.flatMap(event => [
    ...event.emotionTags,
    ...(event.latestReconsolidation?.emotionTags ?? []),
  ]), 8)
  const embodimentCadenceParts = uniqueList([
    lowerPressurePattern.test(combined) ? 'lower-pressure voice' : null,
    slowerPacingPattern.test(combined) ? 'slower pacing' : null,
    stableGazePattern.test(combined) ? 'stable gaze' : null,
  ], 4)
  const metabolismSummary = uniqueList(events.map((event) => {
    const reason = sanitizeText(event.latestReconsolidation?.reason, 220)
    return metabolismPattern.test(reason) ? reason : null
  }), 1)[0]
  || (correctedMeaningPattern.test(combined) && samePersonContinuityPattern.test(combined)
    ? 'Downrank the older status shell and keep the corrected same-person continuity meaning active.'
    : null)
  const autobiographicalDelta = uniqueList([
    ...events.map(event => sanitizeText(event.latestReconsolidation?.lesson, 220) || null),
    ...events.map(event => sanitizeText(event.lesson, 220) || null),
    correctedMeaningPattern.test(combined) && samePersonContinuityPattern.test(combined)
      ? 'I learned to carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation.'
      : null,
  ], 1)[0] ?? null

  return {
    relationshipPrimaryIntent,
    relationshipSignals: uniqueList([
      samePersonContinuityPattern.test(combined) ? 'same-person-continuity' : null,
      continuityWorryPattern.test(combined) ? 'continuity-worry' : null,
      progressPressurePattern.test(combined) && !progressPressureNegationPattern.test(combined) ? 'progress-pressure' : null,
      correctedMeaningPattern.test(combined) ? 'host-corrected-meaning' : null,
    ], 6),
    recallCertainty: correctedMeaningPattern.test(combined)
      ? 'corrected'
      : tentativeRecallPattern.test(combined)
        ? 'tentative'
        : 'steady',
    emotionalResidueTags,
    embodimentSummary: uniqueList(events.flatMap(event => [
      event.relationshipMeaning,
      event.whatChanged,
      event.latestReconsolidation?.relationshipMeaning ?? null,
    ]), 2).join(' '),
    embodimentCadence: embodimentCadenceParts.join(', ') || null,
    metabolismSummary,
    autobiographicalDelta,
  } satisfies Record<string, unknown>
}

function buildProjectStateCarryMetadata(events: AlicizationEpisodicEventRecord[]) {
  const combined = lowerText(...events.flatMap(collectEventTexts))
  const sourceTags = uniqueList([
    (phaseOneDigitalLifePattern.test(combined) || samePersonContinuityPattern.test(combined) || unfinishedClosurePattern.test(combined))
      ? 'project-state-carry'
      : null,
    executionCallbackPattern.test(combined)
      ? 'continuity-execution-callback-project-carry'
      : null,
  ], 4)

  if (sourceTags.length === 0)
    return null

  const inwardLine = sanitizeText([
    (phaseOneDigitalLifePattern.test(combined) || samePersonContinuityPattern.test(combined))
      ? 'Same Phase 1 digital life.'
      : '',
    executionCallbackPattern.test(combined)
      ? 'Some closure already landed.'
      : '',
    unfinishedClosurePattern.test(combined)
      ? 'Unfinished closure still needs the same living line.'
      : '',
  ].filter(Boolean).join(' '), 220)

  return inwardLine
    ? {
        selfContinuityInwardLine: inwardLine,
        selfContinuitySourceTags: sourceTags,
      }
    : null
}

function buildConsolidationMetadata(events: AlicizationEpisodicEventRecord[]) {
  const humanlikeCarry = buildHumanlikeCarryMetadata(events)
  const projectState = buildProjectStateCarryMetadata(events)
  if (!humanlikeCarry && !projectState)
    return null
  return {
    ...(humanlikeCarry ? { humanlikeCarry } : {}),
    ...(projectState ? { projectState } : {}),
  } satisfies Record<string, unknown>
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

const pickDominantProvenance = pickDominantAlicizationMemoryProvenance

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

function inferAutobiographicalFacets(event: AlicizationEpisodicEventRecord): Array<NonNullable<AlicizationMemoryConsolidationRecord['facet']>> {
  const text = [
    event.threadAnchor,
    event.whereSummary,
    event.whatHappened,
    event.felt,
    event.whatChanged,
    event.relationshipMeaning,
    event.lesson,
    event.sourceSummary,
    ...event.emotionTags,
    ...event.tags,
  ].filter(Boolean).join(' ').toLowerCase()

  const facets = new Set<NonNullable<AlicizationMemoryConsolidationRecord['facet']>>()

  if (
    event.sourceKind === 'dream'
    || event.sourceKind === 'dream-reforge'
    || event.sourceKind === 'reflection'
    || event.sourceKind === 'maintenance'
    || /identity|self|incarnation|doctrine|persona|temperament|same[- ]?person|same[- ]?her|same living line|continuous digital life|tool shell|generic shell|corrected meaning|defending the first interpretation|我更想|我开始|我学会|我不再|同一个她|同一条线|数字生命|工具壳/u.test(text)
  ) {
    facets.add('self-era')
  }

  if (
    event.sourceKind === 'dialogue-feedback'
    || /relationship|bond|closeness|distance|repair|boundary|intrusive|lighter touch|space before closeness|host needed space|room before closeness|same[- ]?person|same[- ]?her|tool shell|generic shell|host corrected|not a status report|not .*status recap|progress pressure|same living line|同一个她|工具壳|不是状态汇报|不是催进度/u.test(text)
  ) {
    facets.add('relationship-era')
  }

  if (
    event.sourceKind === 'execution-proposal'
    || event.sourceKind === 'execution-result'
    || /runtime|cli|codex|claude|patch|verify|test|workflow|procedure|task|执行|修复|continuity/u.test(text)
  ) {
    facets.add('task-era')
  }

  if (facets.size === 0)
    facets.add('phase')

  return [...facets]
}

function deriveDominantMood(events: AlicizationEpisodicEventRecord[]) {
  const ranked = uniqueList(events.flatMap(event => [
    ...event.emotionTags,
    event.felt,
  ]), 6)
  return ranked[0] ?? null
}

function deriveRecurrentBurden(events: AlicizationEpisodicEventRecord[]) {
  const burdenCandidates = uniqueList(events.flatMap(event => [
    event.lesson,
    event.relationshipMeaning,
    event.whatChanged,
  ]), 6)
  return burdenCandidates.find(item => /space|room|pressure|intrusive|burden|repair|boundary|focused windows|closeness|重压|空间|边界|修复|压力/u.test(item))
    ?? burdenCandidates[0]
    ?? null
}

function buildAutobiographicalSummary(input: {
  facet: NonNullable<AlicizationMemoryConsolidationRecord['facet']>
  periodKey: string
  events: AlicizationEpisodicEventRecord[]
}) {
  const sorted = sortEvents(input.events)
  const lead = sorted[0] ?? null
  const dominantMood = deriveDominantMood(input.events)
  const recurrentBurden = deriveRecurrentBurden(input.events)
  const facetLabel = input.facet === 'relationship-era'
    ? 'relationship era'
    : input.facet === 'task-era'
      ? 'task era'
      : input.facet === 'self-era'
        ? 'self era'
        : 'phase'
  return sanitizeText([
    `During ${input.periodKey}, the dominant ${facetLabel} centered on ${lead?.relationshipMeaning || lead?.lesson || lead?.threadAnchor || lead?.whatHappened || 'an ongoing continuity seam'}.`,
    dominantMood ? `The dominant mood was ${dominantMood}.` : '',
    recurrentBurden ? `The recurrent burden was ${recurrentBurden}.` : '',
  ].filter(Boolean).join(' '), 320)
}

function buildAutobiographicalCues(events: AlicizationEpisodicEventRecord[]) {
  const dominantMood = deriveDominantMood(events)
  const recurrentBurden = deriveRecurrentBurden(events)
  return uniqueList(events.flatMap(event => [
    event.threadAnchor,
    event.whereSummary,
    event.relationshipMeaning,
    event.lesson,
    dominantMood,
    recurrentBurden,
  ]), 6)
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
    .filter(event => shouldAlicizationMemoryProvenanceEnterLongTermConsolidation(event.provenance))
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
    const record: AlicizationMemoryConsolidationRecord = {
      id: `daily:${periodKey}`,
      kind: 'daily',
      facet: null,
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
      metadata: buildConsolidationMetadata(sorted),
      updatedAt: input.now,
    }
    record.memoryTier = deriveConsolidationMemoryTier(record, input.now)
    consolidated.push(record)
  }

  for (const [periodKey, bucketEvents] of weeklyBuckets) {
    const sorted = sortEvents(bucketEvents)
    const weeklyRecord: AlicizationMemoryConsolidationRecord = {
      id: `weekly:${periodKey}`,
      kind: 'weekly',
      facet: null,
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
      metadata: buildConsolidationMetadata(sorted),
      updatedAt: input.now,
    }
    weeklyRecord.memoryTier = deriveConsolidationMemoryTier(weeklyRecord, input.now)
    consolidated.push(weeklyRecord)

    if (bucketEvents.length >= 2) {
      const autobiographicalBuckets = new Map<NonNullable<AlicizationMemoryConsolidationRecord['facet']>, AlicizationEpisodicEventRecord[]>()
      for (const event of bucketEvents) {
        for (const facet of inferAutobiographicalFacets(event))
          autobiographicalBuckets.set(facet, [...(autobiographicalBuckets.get(facet) ?? []), event])
      }
      autobiographicalBuckets.set('phase', bucketEvents)

      for (const [facet, facetEvents] of autobiographicalBuckets) {
        if (facet !== 'phase' && facetEvents.length < 2)
          continue
        const rankedEvents = sortEvents(facetEvents)
        const autobiographicalRecord: AlicizationMemoryConsolidationRecord = {
          id: `autobio:${facet}:${periodKey}`,
          kind: 'autobiographical',
          facet,
          periodKey,
          periodStartedAt: Math.min(...facetEvents.map(event => event.occurredAt)),
          periodEndedAt: Math.max(...facetEvents.map(event => event.occurredAt)),
          summary: buildAutobiographicalSummary({
            facet,
            periodKey,
            events: facetEvents,
          }),
          lesson: buildLesson(facetEvents),
          cues: buildAutobiographicalCues(facetEvents),
          confidence: buildConfidence(facetEvents),
          dominantProvenance: pickDominantProvenance(rankedEvents.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
          derivedEventIds: rankedEvents.map(event => event.id),
          metadata: buildConsolidationMetadata(rankedEvents),
          updatedAt: input.now,
        }
        autobiographicalRecord.memoryTier = deriveConsolidationMemoryTier(autobiographicalRecord, input.now)
        consolidated.push(autobiographicalRecord)
      }
    }
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
    const supporting = events.filter((event) => {
      const anchor = `${event.threadAnchor ?? ''} ${event.whereSummary ?? ''} ${event.whatHappened} ${event.lesson ?? ''}`
      return anchor.toLowerCase().includes(item.label.toLowerCase())
        || item.cues.some(cue => anchor.toLowerCase().includes(cue.toLowerCase()))
    })
    if (supporting.length === 0)
      continue
    const proceduralRecord: AlicizationMemoryConsolidationRecord = {
      id: `procedural:${item.id}`,
      kind: 'procedural',
      facet: null,
      periodKey: item.id,
      periodStartedAt: Math.min(...supporting.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...supporting.map(event => event.occurredAt)),
      summary: sanitizeText(`The remembered way of handling ${item.label} is ${item.approach}.`, 280),
      lesson: item.pitfalls[0] ?? null,
      cues: uniqueList(item.cues, 5),
      confidence: item.confidence,
      dominantProvenance: pickDominantProvenance(supporting.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
      derivedEventIds: supporting.map(event => event.id),
      metadata: buildConsolidationMetadata(supporting),
      updatedAt: input.now,
    }
    proceduralRecord.memoryTier = deriveConsolidationMemoryTier(proceduralRecord, input.now)
    consolidated.push(proceduralRecord)
  }

  return consolidated
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        const rank = { daily: 0, weekly: 1, autobiographical: 2, procedural: 3 } as const
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
    recollectionAgenda?: {
      whyRecallNow: string
      goalSimilarity: number
      relationshipNeed: number
      affectivePull: number
      sceneFamiliarity: number
      candidateTimeScopes: Array<{
        scope: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
        weight: number
        rationale?: string | null
      }>
      candidateEraFacets: Array<{
        facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | 'window'
        weight: number
        rationale?: string | null
      }>
      candidateProcedureLines: string[]
      uncertaintyTolerance: 'low' | 'medium' | 'high'
    } | null
  } | null
}): AlicizationMemoryConsolidationRecord[] {
  const query = sanitizeText(input.query, 320).toLowerCase()
  if (!query)
    return []
  const limit = Math.max(1, Math.min(8, Math.floor(input.limit ?? 4)))
  const intent = input.recollectionIntent ?? null
  const hints = uniqueList(intent?.queryHints ?? [], 8).map(item => item.toLowerCase())
  const agenda = intent?.recollectionAgenda ?? null
  const semanticGraph = scoreSemanticGraphWalk({
    nodes: input.records.map(record => ({
      id: record.id,
      primaryText: record.summary,
      semanticTexts: [record.lesson ?? '', ...record.cues],
      groupKeys: [record.kind, record.facet ?? '', record.memoryTier ?? ''],
      neighborKeys: [...record.cues, ...record.derivedEventIds],
    })),
    queryTexts: [query, ...hints, ...(agenda?.candidateProcedureLines ?? [])],
    getId: node => node.id,
  })

  return [...input.records]
    .map((record) => {
      const haystack = `${record.summary} ${record.lesson ?? ''} ${record.cues.join(' ')}`.toLowerCase()
      let lexicalScore = haystack.includes(query) ? 1 : 0
      for (const hint of hints) {
        if (hint && haystack.includes(hint))
          lexicalScore += hint.length >= 10 ? 0.6 : 0.24
      }
      const proceduralBoost = intent?.searchProceduralExperience && record.kind === 'procedural' ? 0.28 : 0
      const autobiographicalBoost = (intent?.mode === 'autobiographical-history' || intent?.mode === 'relationship-history') && record.kind === 'autobiographical'
        ? 0.24
        : 0
      const relationshipEraBoost = intent?.mode === 'relationship-history' && record.facet === 'relationship-era' ? 0.14 : 0
      const taskEraBoost = (intent?.mode === 'execution-procedure' || intent?.mode === 'experience-pattern') && record.facet === 'task-era' ? 0.14 : 0
      const selfEraBoost = intent?.mode === 'autobiographical-history' && record.facet === 'self-era' ? 0.14 : 0
      const distantBoost = (intent?.temporalFocus === 'cross-session' || intent?.temporalFocus === 'distant') && record.kind !== 'daily' ? 0.18 : 0
      const agendaProcedureBoost = agenda && agenda.candidateProcedureLines.length > 0
        ? agenda.candidateProcedureLines.some(line => haystack.includes(line.toLowerCase()))
          ? 0.08 + clamp01(agenda.goalSimilarity) * 0.12
          : 0
        : 0
      const agendaFacetBoost = agenda && record.facet
        ? (agenda.candidateEraFacets.find(item => item.facet === record.facet)?.weight ?? 0) * 0.18
        : 0
      const agendaTimeBoost = agenda && agenda.candidateTimeScopes.some(item => item.scope === 'cross-session' || item.scope === 'distant')
        ? record.kind !== 'daily'
          ? Math.max(...agenda.candidateTimeScopes.map(item => clamp01(item.weight))) * 0.12
          : 0
        : 0
      const semanticScore = scoreSemanticRecall({
        queryTexts: [query, ...hints, ...(agenda?.candidateProcedureLines ?? [])],
        candidateTexts: [record.summary, record.lesson ?? '', ...record.cues],
      })
      const graphBoost = semanticGraph.graphBoostById.get(record.id) ?? 0
      const tierBoost = scoreMemoryTierReachability({
        tier: record.memoryTier ?? deriveConsolidationMemoryTier(record, Date.now()),
        vagueQuery: query.split(/\s+/u).length <= 3,
        temporalFocus: intent?.temporalFocus ?? null,
        longHorizonPreferred: intent?.temporalFocus === 'cross-session' || intent?.temporalFocus === 'distant',
      })
      const score = lexicalScore * 0.46
        + record.confidence * 0.3
        + semanticScore * 0.22
        + graphBoost * 0.16
        + proceduralBoost
        + autobiographicalBoost
        + relationshipEraBoost
        + taskEraBoost
        + selfEraBoost
        + distantBoost
        + tierBoost
        + agendaProcedureBoost
        + agendaFacetBoost
        + agendaTimeBoost
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
