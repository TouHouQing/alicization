import type {
  AlicizationMindTurnEventRecord,
  AlicizationPersonaReinforcementDimension,
  AlicizationRelationshipOutcomeSourceKind,
  AlicizationPersonStateUpdateRecord as SharedAlicizationPersonStateUpdateRecord,
  AlicizationPersonStateUpdateSurface as SharedAlicizationPersonStateUpdateSurface,
} from '../../../shared/eventa'
import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'

import { Buffer } from 'node:buffer'

export type AlicizationPersonStateUpdateSurface = SharedAlicizationPersonStateUpdateSurface
export type AlicizationPersonStateUpdateRecord = SharedAlicizationPersonStateUpdateRecord

const reinforcementDimensions: AlicizationPersonaReinforcementDimension[] = [
  'companionship',
  'truthful-grounding',
  'gentle-repair',
  'autonomy-respect',
  'unfinished-thread-return',
  'temper-guardedness',
  'temper-directness',
]

function clamp(value: number, maxAbs = 0.5) {
  if (!Number.isFinite(value))
    return 0
  return Number(Math.max(-maxAbs, Math.min(maxAbs, value)).toFixed(3))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

type AlicizationPersonStateEvidenceKind = 'relationship-outcome' | 'reinforcement'

export function buildAlicizationPersonStateEvidenceRef(
  kind: AlicizationPersonStateEvidenceKind,
  rawId: unknown,
) {
  const normalized = sanitizeText(rawId, 220)
  if (!normalized)
    return ''
  return `${kind}:${Buffer.from(normalized, 'utf8').toString('base64url')}`
}

function sanitizeEvidenceId(raw: unknown, maxChars = 180) {
  const normalized = sanitizeText(raw, maxChars)
  const match = /^(relationship-outcome|reinforcement):([\w-]+)$/u.exec(normalized)
  if (!match)
    return ''
  const decoded = Buffer.from(match[2], 'base64url').toString('utf8')
  return buildAlicizationPersonStateEvidenceRef(
    match[1] as AlicizationPersonStateEvidenceKind,
    decoded,
  ) === normalized
    ? normalized
    : ''
}

export function isAlicizationPersonStateEvidenceId(raw: unknown) {
  return Boolean(sanitizeEvidenceId(raw))
}

function asObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
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

function numericOr(raw: unknown, fallback = 0) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function contextFromSourceKind(raw: unknown) {
  const normalized = sanitizeText(raw, 48).toLowerCase()
  if (normalized === 'execution' || normalized === 'execution-proposal' || normalized === 'execution-result')
    return 'execution'
  if (normalized === 'reply' || normalized === 'dialogue-feedback')
    return 'dialogue'
  if (normalized === 'proactive' || normalized === 'dream' || normalized === 'dream-reforge')
    return 'proactive'
  return null
}

function mergeSurface(previous: AlicizationPersonStateUpdateSurface | null, next: AlicizationPersonStateUpdateSurface) {
  if (!previous)
    return next

  const mergedTrail = [
    ...next.sourceTrail,
    ...normalizePersonStateSourceTrail(previous.sourceTrail, previous.updatedAt),
  ]
    .sort((left, right) => right.createdAt - left.createdAt)
    .filter((entry, index, array) => array.findIndex(candidate => candidate.kind === entry.kind && candidate.summary === entry.summary) === index)
    .slice(0, 12)

  const mergedRelationshipShift = {
    trustDelta: clamp(previous.relationshipShift.trustDelta + next.relationshipShift.trustDelta),
    closenessDelta: clamp(previous.relationshipShift.closenessDelta + next.relationshipShift.closenessDelta),
    burdenDelta: clamp(previous.relationshipShift.burdenDelta + next.relationshipShift.burdenDelta),
    boundaryDelta: clamp(previous.relationshipShift.boundaryDelta + next.relationshipShift.boundaryDelta),
    repairDelta: clamp(previous.relationshipShift.repairDelta + next.relationshipShift.repairDelta),
  }

  const mergedReinforcementBias
    = reinforcementDimensions.reduce<AlicizationPersonStateUpdateSurface['reinforcementBias']>((acc, dimension) => {
      const value = previous.reinforcementBias[dimension]
      if (typeof value === 'number' && Number.isFinite(value))
        acc[dimension] = clamp(value, 0.8)
      return acc
    }, {})
  for (const [dimension, delta] of Object.entries(next.reinforcementBias)) {
    const key = dimension as AlicizationPersonaReinforcementDimension
    mergedReinforcementBias[key] = clamp(Number(mergedReinforcementBias[key] ?? 0) + Number(delta ?? 0), 0.8)
  }

  return {
    ...next,
    updatedAt: Math.max(previous.updatedAt, next.updatedAt),
    summary: sanitizeEvidenceId(next.summary),
    dominantContexts: uniqueList([
      ...next.dominantContexts,
      ...normalizePersonStateContexts(previous.dominantContexts),
    ], 6),
    relationshipShift: mergedRelationshipShift,
    reinforcementBias: mergedReinforcementBias,
    preferenceHints: [],
    sensitivityHints: [],
    repairHints: [],
    burdenHints: [],
    narrative: [],
    sourceTrail: mergedTrail,
    affectiveResidue: null,
  }
}

function buildPersonStateClosureEvidence(input: {
  closure: AlicizationOutcomeClosureResult
  now: number
}) {
  const relationship = input.closure.relationshipOutcomes.map((outcome, index) => ({
    kind: 'relationship-outcome' as const,
    id: buildAlicizationPersonStateEvidenceRef(
      'relationship-outcome',
      outcome.id || `relationship-outcome-${numericOr(outcome.createdAt, input.now)}-${index + 1}`,
    ),
    sourceKind: outcome.sourceKind,
    createdAt: numericOr(outcome.createdAt, input.now),
  }))
  const reinforcement = input.closure.reinforcementEvents.map((event, index) => ({
    kind: 'reinforcement' as const,
    id: buildAlicizationPersonStateEvidenceRef(
      'reinforcement',
      event.id || `reinforcement-${numericOr(event.createdAt, input.now)}-${index + 1}`,
    ),
    sourceKind: event.sourceKind,
    createdAt: numericOr(event.createdAt, input.now),
  }))
  return {
    relationship,
    reinforcement,
    all: [...relationship, ...reinforcement]
      .sort((left, right) => right.createdAt - left.createdAt),
  }
}

export function collectAlicizationPersonStateClosureEvidenceIds(
  closure: AlicizationOutcomeClosureResult,
  now: number,
) {
  return buildPersonStateClosureEvidence({
    closure,
    now,
  }).all.map(item => item.id)
}

export function buildAlicizationPersonStateUpdateSurface(input: {
  closure: AlicizationOutcomeClosureResult
  previous?: AlicizationPersonStateUpdateSurface | null
  now: number
}) {
  const relationshipShift = input.closure.relationshipOutcomes.reduce((acc, outcome) => ({
    trustDelta: clamp(acc.trustDelta + outcome.trustDelta),
    closenessDelta: clamp(acc.closenessDelta + outcome.closenessDelta),
    burdenDelta: clamp(acc.burdenDelta + outcome.burdenDelta),
    boundaryDelta: clamp(acc.boundaryDelta + outcome.boundaryDelta),
    repairDelta: clamp(acc.repairDelta + outcome.repairDelta),
  }), {
    trustDelta: 0,
    closenessDelta: 0,
    burdenDelta: 0,
    boundaryDelta: 0,
    repairDelta: 0,
  })

  const reinforcementBias = input.closure.reinforcementEvents.reduce<AlicizationPersonStateUpdateSurface['reinforcementBias']>((acc, event) => {
    const direction = event.valence === 'reinforce' ? 1 : -1
    acc[event.dimension] = clamp(Number(acc[event.dimension] ?? 0) + event.delta * direction, 0.8)
    return acc
  }, {})

  const evidence = buildPersonStateClosureEvidence({
    closure: input.closure,
    now: input.now,
  })
  const dominantContexts = uniqueList([
    'general',
    ...evidence.all.map(item => contextFromSourceKind(item.sourceKind)),
  ], 6)
  const sourceTrail = [
    ...evidence.relationship,
    ...evidence.reinforcement,
  ]
    .map(entry => ({
      kind: entry.kind,
      sourceKind: entry.sourceKind,
      summary: entry.id,
      createdAt: entry.createdAt,
    }))
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 12)
  const next: AlicizationPersonStateUpdateSurface = {
    version: 'person-state-update-surface-v1',
    updatedAt: input.now,
    summary: evidence.all[0]?.id ?? '',
    dominantContexts,
    relationshipShift,
    reinforcementBias,
    preferenceHints: [],
    sensitivityHints: [],
    repairHints: [],
    burdenHints: [],
    narrative: [],
    sourceTrail,
    affectiveResidue: null,
  }

  return mergeSurface(input.previous ?? null, next)
}

function normalizeOutcomeSourceKind(raw: unknown): AlicizationRelationshipOutcomeSourceKind | null {
  const normalized = sanitizeText(raw, 48).toLowerCase()
  if (normalized === 'reply' || normalized === 'dialogue-feedback')
    return 'reply'
  if (normalized === 'proactive' || normalized === 'dream' || normalized === 'dream-reforge')
    return 'proactive'
  if (normalized === 'execution' || normalized === 'execution-proposal' || normalized === 'execution-result')
    return 'execution'
  return null
}

const personStateContexts = new Set(['general', 'execution', 'dialogue', 'proactive'])

function normalizePersonStateContexts(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return uniqueList(
    raw
      .filter((item): item is string => typeof item === 'string')
      .map(item => sanitizeText(item, 32).toLowerCase())
      .filter(item => personStateContexts.has(item)),
    8,
  )
}

function normalizePersonStateSourceTrail(raw: unknown, fallbackCreatedAt: number) {
  if (!Array.isArray(raw))
    return []
  return raw
    .map((entry) => {
      const candidate = asObject(entry)
      const sourceKind = normalizeOutcomeSourceKind(candidate?.sourceKind)
      const kind = sanitizeText(candidate?.kind, 64)
      const summary = sanitizeEvidenceId(candidate?.summary, 180)
      if (!sourceKind || (kind !== 'relationship-outcome' && kind !== 'reinforcement') || !summary)
        return null
      return {
        kind: kind as 'relationship-outcome' | 'reinforcement',
        sourceKind,
        summary,
        createdAt: Math.max(0, Math.floor(Number(candidate?.createdAt ?? fallbackCreatedAt))),
      }
    })
    .filter((entry): entry is AlicizationPersonStateUpdateRecord['sourceTrail'][number] => Boolean(entry))
    .slice(0, 12)
}

export function normalizeAlicizationPersonStateUpdateSurface(raw: unknown): AlicizationPersonStateUpdateSurface | null {
  const candidate = asObject(raw)
  if (sanitizeText(candidate?.version, 48) !== 'person-state-update-surface-v1')
    return null

  const summary = sanitizeEvidenceId(candidate?.summary, 220)
  if (!summary)
    return null

  const relationshipShift = asObject(candidate?.relationshipShift)
  const reinforcementBias = asObject(candidate?.reinforcementBias)
  const updatedAt = Math.max(0, Math.floor(Number(candidate?.updatedAt ?? 0)))
  const sourceTrail = normalizePersonStateSourceTrail(candidate?.sourceTrail, updatedAt)
  if (!sourceTrail.some(entry => entry.summary === summary))
    return null

  return {
    version: 'person-state-update-surface-v1',
    updatedAt,
    summary,
    dominantContexts: normalizePersonStateContexts(candidate?.dominantContexts),
    relationshipShift: {
      trustDelta: clamp(normalizeNumeric(relationshipShift?.trustDelta)),
      closenessDelta: clamp(normalizeNumeric(relationshipShift?.closenessDelta)),
      burdenDelta: clamp(normalizeNumeric(relationshipShift?.burdenDelta)),
      boundaryDelta: clamp(normalizeNumeric(relationshipShift?.boundaryDelta)),
      repairDelta: clamp(normalizeNumeric(relationshipShift?.repairDelta)),
    },
    reinforcementBias: reinforcementDimensions.reduce<Partial<Record<AlicizationPersonaReinforcementDimension, number>>>((acc, dimension) => {
      const value = reinforcementBias?.[dimension]
      if (typeof value === 'number' && Number.isFinite(value))
        acc[dimension] = clamp(value, 0.8)
      return acc
    }, {}),
    preferenceHints: [],
    sensitivityHints: [],
    repairHints: [],
    burdenHints: [],
    narrative: [],
    sourceTrail,
    affectiveResidue: null,
  }
}

function inferPersonStateUpdateOrigin(sourceKinds: AlicizationRelationshipOutcomeSourceKind[]) {
  if (sourceKinds.length === 1 && sourceKinds[0] === 'proactive')
    return 'subconscious-proactive' as const
  if (sourceKinds.length === 0)
    return 'system' as const
  return 'user-turn' as const
}

function normalizeNumeric(raw: unknown) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}

function extractClosureMetadata(closure: AlicizationOutcomeClosureResult) {
  const candidates = [
    ...closure.relationshipOutcomes.map(item => ({
      decisionTraceId: sanitizeText(item.decisionTraceId, 96) || null,
      turnId: sanitizeText(item.turnId, 96) || null,
      sessionId: sanitizeText(item.sessionId, 96) || null,
      createdAt: normalizeNumeric(item.createdAt),
      sourceKind: normalizeOutcomeSourceKind(item.sourceKind),
    })),
    ...closure.reinforcementEvents.map(item => ({
      decisionTraceId: sanitizeText(item.decisionTraceId, 96) || null,
      turnId: sanitizeText(item.turnId, 96) || null,
      sessionId: sanitizeText(item.sessionId, 96) || null,
      createdAt: normalizeNumeric(item.createdAt),
      sourceKind: normalizeOutcomeSourceKind(item.sourceKind),
    })),
    ...closure.episodicEvents.map(item => ({
      decisionTraceId: sanitizeText(item.decisionTraceId, 96) || null,
      turnId: sanitizeText(item.turnId, 96) || null,
      sessionId: sanitizeText(item.sessionId, 96) || null,
      createdAt: normalizeNumeric(item.occurredAt),
      sourceKind: normalizeOutcomeSourceKind(item.sourceKind),
    })),
  ]
    .sort((left, right) => right.createdAt - left.createdAt)

  const latest = candidates[0] ?? null
  const sourceKinds = uniqueList(candidates.map(item => item.sourceKind), 3)
    .filter((item): item is AlicizationRelationshipOutcomeSourceKind => item === 'reply' || item === 'proactive' || item === 'execution')

  return {
    decisionTraceId: latest?.decisionTraceId ?? null,
    turnId: latest?.turnId ?? null,
    sessionId: latest?.sessionId ?? null,
    createdAt: latest?.createdAt ?? 0,
    sourceKinds,
  }
}

export function buildAlicizationPersonStateUpdateRecord(input: {
  closure: AlicizationOutcomeClosureResult
  surface: AlicizationPersonStateUpdateSurface
  createdAt?: number
  activeThreadId?: string | null
}): AlicizationPersonStateUpdateRecord {
  const metadata = extractClosureMetadata(input.closure)
  const createdAt = Number.isFinite(input.createdAt)
    ? Math.max(0, Math.floor(Number(input.createdAt)))
    : metadata.createdAt > 0
      ? metadata.createdAt
      : input.surface.updatedAt
  const sourceTrail = normalizePersonStateSourceTrail(input.surface.sourceTrail, createdAt)
  const summary = sanitizeEvidenceId(input.surface.summary, 220)
  const knownEvidenceIds = new Set([
    ...collectAlicizationPersonStateClosureEvidenceIds(input.closure, input.surface.updatedAt),
    ...sourceTrail.map(entry => entry.summary),
  ])

  return {
    decisionTraceId: metadata.decisionTraceId,
    turnId: metadata.turnId,
    sessionId: metadata.sessionId,
    origin: inferPersonStateUpdateOrigin(metadata.sourceKinds),
    createdAt,
    activeThreadId: sanitizeText(input.activeThreadId, 120) || null,
    version: input.surface.version,
    updatedAt: input.surface.updatedAt,
    summary: knownEvidenceIds.has(summary) ? summary : '',
    dominantContexts: normalizePersonStateContexts(input.surface.dominantContexts),
    relationshipShift: {
      trustDelta: clamp(input.surface.relationshipShift.trustDelta),
      closenessDelta: clamp(input.surface.relationshipShift.closenessDelta),
      burdenDelta: clamp(input.surface.relationshipShift.burdenDelta),
      boundaryDelta: clamp(input.surface.relationshipShift.boundaryDelta),
      repairDelta: clamp(input.surface.relationshipShift.repairDelta),
    },
    reinforcementBias: reinforcementDimensions.reduce<Partial<Record<AlicizationPersonaReinforcementDimension, number>>>((acc, dimension) => {
      const value = input.surface.reinforcementBias[dimension]
      if (typeof value === 'number' && Number.isFinite(value))
        acc[dimension] = clamp(value, 0.8)
      return acc
    }, {}),
    preferenceHints: [],
    sensitivityHints: [],
    repairHints: [],
    burdenHints: [],
    narrative: [],
    sourceTrail,
    affectiveResidue: null,
    sourceKinds: metadata.sourceKinds,
    sourceCounts: {
      relationshipOutcomes: input.closure.relationshipOutcomes.length,
      reinforcementEvents: input.closure.reinforcementEvents.length,
      episodicEvents: input.closure.episodicEvents.length,
      reflections: input.closure.reflections.length,
      memoryFacts: input.closure.memoryFacts.length,
    },
  }
}

export function personStateUpdateRecordFromMindTurnEvent(event: AlicizationMindTurnEventRecord): AlicizationPersonStateUpdateRecord | null {
  if (event.kind !== 'person-state-updated')
    return null

  const payload = asObject(event.payload)
  if (!payload)
    return null

  const surface = normalizeAlicizationPersonStateUpdateSurface(payload)
  if (!surface)
    return null

  return {
    ...surface,
    decisionTraceId: sanitizeText(event.decisionTraceId, 96) || null,
    turnId: sanitizeText(event.turnId, 96) || null,
    sessionId: sanitizeText(event.sessionId, 96) || null,
    origin: event.origin,
    createdAt: Math.max(0, Math.floor(Number(event.createdAt ?? 0))),
    activeThreadId: sanitizeText(payload.activeThreadId, 120) || null,
    sourceKinds: Array.isArray(payload.sourceKinds)
      ? payload.sourceKinds
          .map(item => normalizeOutcomeSourceKind(item))
          .filter((item): item is AlicizationRelationshipOutcomeSourceKind => Boolean(item))
      : [],
    sourceCounts: {
      relationshipOutcomes: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.relationshipOutcomes ?? 0))),
      reinforcementEvents: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.reinforcementEvents ?? 0))),
      episodicEvents: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.episodicEvents ?? 0))),
      reflections: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.reflections ?? 0))),
      memoryFacts: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.memoryFacts ?? 0))),
    },
  }
}
