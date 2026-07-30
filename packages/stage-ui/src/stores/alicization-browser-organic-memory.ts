import type {
  AlicizationEpisodicEventRecord,
  AlicizationMemoryProvenance,
  AlicizationOrganicMemorySnapshot,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousFragmentSourceKind,
} from './alicization-bridge'

import {
  buildAlicizationBrowserAffectiveResidueMemory,
  pickDominantAlicizationMemoryProvenance,
} from '@proj-alicization/stage-shared'

export interface BrowserMemoryConsolidationSnapshot {
  id: string
  kind: 'procedural' | 'autobiographical'
  facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
  periodKey: string
  periodStartedAt: number
  periodEndedAt: number
  summary: string
  lesson: string | null
  cues: string[]
  confidence: number
  dominantProvenance: AlicizationMemoryProvenance
}

interface ReviewableRelationshipReconsolidation {
  at: number
  decisionTraceId: string
  provenance: 'observed' | 'remembered'
  confidence: number
  reason: string
  emotionTags: string[]
  relationshipMeaning: string
  lesson: string
}

const minimumReviewableRelationshipConfidence = 0.75

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  const normalized = raw.trim().replace(/\s+/g, ' ')
  return normalized || fallback
}

function sanitizeBriefText(raw: unknown, maxChars = 220) {
  return sanitizeText(raw).slice(0, maxChars)
}

function uniqueTexts(values: Array<unknown>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeBriefText(value, 220)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function resolveReviewableRelationshipReconsolidation(
  event: AlicizationEpisodicEventRecord,
): ReviewableRelationshipReconsolidation | null {
  const reconsolidation = event.latestReconsolidation
  if (!reconsolidation)
    return null

  const at = Number(reconsolidation.at)
  const confidence = Number(reconsolidation.confidence)
  const decisionTraceId = sanitizeText(reconsolidation.decisionTraceId)
  const reason = sanitizeBriefText(reconsolidation.reason, 220)
  const relationshipMeaning = sanitizeBriefText(reconsolidation.relationshipMeaning, 280)
  const lesson = sanitizeBriefText(reconsolidation.lesson, 220)
  const provenance = reconsolidation.provenance
  if (
    !Number.isFinite(at)
    || at <= 0
    || !decisionTraceId
    || (provenance !== 'observed' && provenance !== 'remembered')
    || !Number.isFinite(confidence)
    || confidence < minimumReviewableRelationshipConfidence
    || confidence > 1
    || !reason
    || !relationshipMeaning
    || !lesson
  ) {
    return null
  }

  return {
    at,
    decisionTraceId,
    provenance,
    confidence,
    reason,
    emotionTags: uniqueTexts(reconsolidation.emotionTags, 5),
    relationshipMeaning,
    lesson,
  }
}

export function buildBrowserHostPersonModel(_events: AlicizationEpisodicEventRecord[]) {
  return null
}

export function buildBrowserMemoryConsolidations(events: AlicizationEpisodicEventRecord[]): BrowserMemoryConsolidationSnapshot[] {
  if (events.length === 0)
    return []

  const recent = [...events]
    .sort((left, right) => right.occurredAt - left.occurredAt || right.salience - left.salience)
    .slice(0, 20)
  const latest = recent[0] ?? null
  const relationshipEvidence = recent
    .map(resolveReviewableRelationshipReconsolidation)
    .filter((item): item is ReviewableRelationshipReconsolidation => item !== null)
    .sort((left, right) => right.confidence - left.confidence || right.at - left.at)
  const taskEvents = recent.filter((event) => {
    const text = `${event.sourceKind} ${event.threadAnchor ?? ''} ${event.whatHappened} ${event.lesson ?? ''}`
    return /execution|reply|proposal|result|callback|cli|codex|claude|patch|verify|runtime|执行|回调|补丁|核验/u.test(text)
  })
  const selfEvents = recent.filter((event) => {
    const text = `${event.sourceKind} ${event.whatHappened} ${event.lesson ?? ''}`
    return event.sourceKind === 'dream-reforge' || /self|my own line|自己的线|自我|hold my line|identity/iu.test(text)
  })

  const summaries: BrowserMemoryConsolidationSnapshot[] = []
  if (latest) {
    summaries.push({
      id: `browser-autobio-phase:${latest.id}`,
      kind: 'autobiographical',
      facet: 'phase',
      periodKey: new Date(latest.occurredAt).toISOString().slice(0, 10),
      periodStartedAt: Math.min(...recent.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...recent.map(event => event.occurredAt)),
      summary: sanitizeBriefText(latest.whatHappened, 280),
      lesson: sanitizeBriefText(latest.latestReconsolidation?.lesson ?? '', 220) || null,
      cues: uniqueTexts([latest.threadAnchor, latest.whereSummary, latest.whatHappened], 5),
      confidence: clamp01((latest.confidence * 0.62) + (latest.salience * 0.38)),
      dominantProvenance: latest.latestReconsolidation?.provenance ?? latest.provenance,
    })
  }
  if (relationshipEvidence.length > 0) {
    const strongest = relationshipEvidence[0]!
    summaries.push({
      id: `browser-autobio-relationship:${strongest.decisionTraceId}`,
      kind: 'autobiographical',
      facet: 'relationship-era',
      periodKey: `relationship-${new Date(strongest.at).toISOString().slice(0, 10)}`,
      periodStartedAt: Math.min(...relationshipEvidence.map(item => item.at)),
      periodEndedAt: Math.max(...relationshipEvidence.map(item => item.at)),
      summary: strongest.relationshipMeaning,
      lesson: strongest.lesson,
      cues: uniqueTexts(relationshipEvidence.flatMap(item => [
        item.relationshipMeaning,
        item.lesson,
        item.reason,
        ...item.emotionTags,
      ]), 5),
      confidence: clamp01(relationshipEvidence.reduce((sum, item) => sum + item.confidence, 0) / relationshipEvidence.length),
      dominantProvenance: pickDominantAlicizationMemoryProvenance(relationshipEvidence.map(item => item.provenance)),
    })
  }
  if (taskEvents.length > 0) {
    const strongest = taskEvents[0]!
    summaries.push({
      id: `browser-autobio-task:${strongest.id}`,
      kind: 'autobiographical',
      facet: 'task-era',
      periodKey: `task-${sanitizeText(strongest.threadAnchor || strongest.whereSummary || 'general', 'general').slice(0, 48)}`,
      periodStartedAt: Math.min(...taskEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...taskEvents.map(event => event.occurredAt)),
      summary: sanitizeBriefText(strongest.whatHappened || strongest.lesson || strongest.whatChanged || '', 280),
      lesson: sanitizeBriefText(strongest.latestReconsolidation?.lesson ?? '', 220) || null,
      cues: uniqueTexts(taskEvents.flatMap(event => [event.threadAnchor, event.whatHappened]), 5),
      confidence: clamp01(taskEvents.reduce((sum, event) => sum + event.confidence, 0) / taskEvents.length),
      dominantProvenance: pickDominantAlicizationMemoryProvenance(taskEvents.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
    })

    summaries.push({
      id: `browser-procedural:${strongest.id}`,
      kind: 'procedural',
      facet: null,
      periodKey: sanitizeBriefText(strongest.threadAnchor || strongest.whereSummary || 'general', 96) || 'general',
      periodStartedAt: Math.min(...taskEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...taskEvents.map(event => event.occurredAt)),
      summary: sanitizeBriefText(strongest.whatHappened || strongest.lesson || strongest.whatChanged || '', 280),
      lesson: sanitizeBriefText(strongest.latestReconsolidation?.lesson ?? '', 220) || null,
      cues: uniqueTexts(taskEvents.flatMap(event => [event.threadAnchor, event.whereSummary, ...event.tags]), 5),
      confidence: clamp01(taskEvents.reduce((sum, event) => sum + event.confidence * 0.6 + event.salience * 0.4, 0) / taskEvents.length),
      dominantProvenance: pickDominantAlicizationMemoryProvenance(taskEvents.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
    })
  }
  if (selfEvents.length > 0) {
    const strongest = selfEvents[0]!
    summaries.push({
      id: `browser-autobio-self:${strongest.id}`,
      kind: 'autobiographical',
      facet: 'self-era',
      periodKey: `self-${new Date(strongest.occurredAt).toISOString().slice(0, 10)}`,
      periodStartedAt: Math.min(...selfEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...selfEvents.map(event => event.occurredAt)),
      summary: sanitizeBriefText(strongest.whatHappened || strongest.lesson || strongest.whatChanged || '', 280),
      lesson: sanitizeBriefText(strongest.latestReconsolidation?.lesson ?? '', 220) || null,
      cues: uniqueTexts(selfEvents.flatMap(event => [event.whatHappened, event.threadAnchor]), 5),
      confidence: clamp01(selfEvents.reduce((sum, event) => sum + event.confidence, 0) / selfEvents.length),
      dominantProvenance: pickDominantAlicizationMemoryProvenance(selfEvents.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
    })
  }

  return summaries.slice(0, 6)
}

export function buildBrowserOrganicMemorySnapshot(input: {
  now: () => number
  soul: { frontmatter: { host_attitude: string, core_incarnation: string } }
  organicMemory: {
    activeThoughts: AlicizationOrganicMemorySnapshot['activeThoughts']
    subconsciousFragments: AlicizationSubconsciousFragment[]
    lastDreamedAt: number | null
  }
  recentEpisodicEvents: AlicizationEpisodicEventRecord[]
  mapFragmentSourceToProvenance: (sourceKind: AlicizationSubconsciousFragmentSourceKind) => AlicizationMemoryProvenance
}): AlicizationOrganicMemorySnapshot {
  const hostPersonModel = buildBrowserHostPersonModel(input.recentEpisodicEvents)
  const memoryConsolidations = buildBrowserMemoryConsolidations(input.recentEpisodicEvents)
  const affectiveResidue = buildAlicizationBrowserAffectiveResidueMemory({
    now: input.now(),
    hostPersonModel,
    recollectionForeground: null,
    recentEpisodicEvents: input.recentEpisodicEvents,
    selfEvolution: null,
  })

  return {
    hostAttitude: input.soul.frontmatter.host_attitude,
    coreIncarnation: input.soul.frontmatter.core_incarnation,
    activeThoughts: [...input.organicMemory.activeThoughts].sort((left, right) => right.updatedAt - left.updatedAt),
    subconsciousCount: input.organicMemory.subconsciousFragments.length,
    recentSubconsciousFragments: [...input.organicMemory.subconsciousFragments]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 12)
      .map(fragment => ({
        ...fragment,
        provenance: fragment.provenance ?? input.mapFragmentSourceToProvenance(fragment.sourceKind),
      })),
    recentEpisodicEvents: input.recentEpisodicEvents,
    hostPersonModel,
    memoryConsolidations,
    recollectionIntent: null,
    recollectionPlan: null,
    recollectionSpeechPlan: null,
    recollectionForeground: null,
    knowledgeEvidence: null,
    selfEvolution: null,
    affectiveResidue,
    recallLatencyPolicy: null,
    derivedMindStateBundle: null,
    memoryStageReplay: null,
    memoryResolutionLedger: null,
    learningExecutionState: null,
    lastDreamedAt: input.organicMemory.lastDreamedAt,
  }
}
