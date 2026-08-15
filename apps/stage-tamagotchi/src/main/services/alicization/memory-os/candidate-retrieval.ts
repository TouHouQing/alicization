import type { OrganicMemoryPromptContext } from '../runtime-soul'

import {
  normalizeAlicizationMemoryProvenance,
  scoreAlicizationMemoryProvenanceTrust,
} from '@proj-alicization/stage-shared'

export type AlicizationMemoryCandidateKind
  = 'fact'
    | 'fragment'
    | 'episode'
    | 'window'
    | 'consolidation'
    | 'procedure'
    | 'situation'

export interface AlicizationMemoryCandidateRetrievalItem {
  id: string
  kind: AlicizationMemoryCandidateKind
  summary: string | null
  provenance: string | null
  confidence: number | null
  selected: boolean
  metadata: {
    threadId: string | null
    sessionId: string | null
    eraId: string | null
    sourceConfidence: number | null
    conflictIds: string[]
    supersedes: string[]
    lastValidatedAt: number | null
    updatedAt: number | null
  }
  ranking: {
    semanticSimilarity: number | null
    graphAffinity: number | null
    recencyScore: number | null
    provenanceTrust: number
    relationshipThreadMatch: number | null
    conflictPenalty: number
    latencyCost: number | null
    finalScore: number
    reasons: string[]
  }
}

export interface AlicizationMemoryCandidateRetrievalArtifact {
  version: 'memory-candidate-retrieval-v1'
  candidates: AlicizationMemoryCandidateRetrievalItem[]
  counts: Record<AlicizationMemoryCandidateKind, number>
  selectedCandidateIds: string[]
}

function asRecord(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function normalizeText(raw: unknown, maxChars = 220) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars) || null
    : null
}

function normalizeNumber(raw: unknown) {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : null
}

function clamp01(raw: unknown, fallback = 0) {
  const value = normalizeNumber(raw)
  if (value == null)
    return fallback
  return Math.max(0, Math.min(1, value))
}

function itemId(raw: unknown, fallback: string) {
  const record = asRecord(raw)
  return normalizeText(record?.id, 120)
    ?? normalizeText(record?.candidateId, 120)
    ?? fallback
}

function itemSummary(raw: unknown) {
  const record = asRecord(raw)
  const summaryMaxChars = record?.candidateId != null || record?.situationKind != null ? 520 : 220
  return normalizeText(record?.summary, summaryMaxChars)
    ?? normalizeText(record?.lesson)
    ?? normalizeText(record?.content)
    ?? normalizeText(record?.text)
    ?? normalizeText(record?.label)
    ?? normalizeText(record?.approach)
}

function itemProvenance(raw: unknown) {
  const record = asRecord(raw)
  return normalizeText(record?.provenance, 64)
    ?? normalizeText(record?.dominantProvenance, 64)
}

function itemConfidence(raw: unknown) {
  const record = asRecord(raw)
  return normalizeNumber(record?.confidence)
}

function itemStringList(raw: unknown, maxItems = 8) {
  if (!Array.isArray(raw))
    return []
  return raw
    .map(item => normalizeText(item, 120))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems)
}

function boundedCandidateStringList(raw: unknown, maxItems: number) {
  if (!Array.isArray(raw) || raw.length > maxItems)
    return null
  const values = raw.map(item => normalizeText(item, 120))
  return values.every((item): item is string => Boolean(item))
    ? values
    : null
}

function itemMetadata(raw: unknown) {
  const record = asRecord(raw)
  return {
    threadId: normalizeText(record?.threadId, 120)
      ?? normalizeText(record?.threadAnchor, 120)
      ?? normalizeText(record?.relationshipArcKey, 120)
      ?? normalizeText(record?.procedureKey, 120)
      ?? null,
    sessionId: normalizeText(record?.sessionId, 120) ?? null,
    eraId: normalizeText(record?.eraId, 120)
      ?? normalizeText(record?.eraKey, 120)
      ?? normalizeText(record?.periodKey, 120)
      ?? null,
    sourceConfidence: normalizeNumber(record?.sourceConfidence)
      ?? normalizeNumber(record?.confidence)
      ?? null,
    conflictIds: itemStringList(record?.conflictsWith).length > 0
      ? itemStringList(record?.conflictsWith)
      : itemStringList(record?.competingCandidateIds),
    supersedes: itemStringList(record?.supersedes),
    lastValidatedAt: normalizeNumber(record?.lastValidatedAt)
      ?? normalizeNumber(record?.validatedAt)
      ?? null,
    updatedAt: itemUpdatedAt(raw),
  }
}

function itemUpdatedAt(raw: unknown) {
  const record = asRecord(raw)
  const candidates = [
    record?.updatedAt,
    record?.producedAt,
    record?.createdAt,
    record?.occurredAt,
    record?.endedAt,
    record?.periodEndedAt,
  ]
  for (const candidate of candidates) {
    const value = normalizeNumber(candidate)
    if (value != null)
      return value
  }
  return null
}

function trustForProvenance(provenance: string | null) {
  return scoreAlicizationMemoryProvenanceTrust(
    provenance == null ? null : normalizeAlicizationMemoryProvenance(provenance, 'remembered'),
  )
}

function recencyScoreFromTimestamp(input: {
  timestamp: number | null
  referenceNow: number | null
}) {
  if (input.timestamp == null || input.referenceNow == null)
    return null
  const ageDays = Math.max(0, (input.referenceNow - input.timestamp) / (24 * 60 * 60 * 1000))
  return Math.max(0.2, Math.min(1, Number((1 / (1 + ageDays / 30)).toFixed(2))))
}

function collectCandidateReferenceNow(context: OrganicMemoryPromptContext, explicitNow?: number | null) {
  if (Number.isFinite(explicitNow))
    return Math.max(0, Number(explicitNow))
  if (Number.isFinite(context.memoryResolutionLedger?.producedAt))
    return Math.max(0, Number(context.memoryResolutionLedger?.producedAt))

  const timestamps = [
    ...context.retrievedFacts.map(itemUpdatedAt),
    ...context.recalledFragments.map(itemUpdatedAt),
    ...(context.recalledEpisodes ?? []).map(itemUpdatedAt),
    ...(context.recollectedWindows ?? []).map(itemUpdatedAt),
    ...(context.consolidatedMemories ?? []).map(itemUpdatedAt),
    ...(context.proceduralMemories ?? []).map(itemUpdatedAt),
    ...(context.memorySituationCandidates?.candidates ?? []).map(itemUpdatedAt),
  ].filter((value): value is number => value != null)

  return timestamps.length > 0
    ? Math.max(...timestamps)
    : null
}

function deriveRanking(input: {
  raw: unknown
  selected: boolean
  confidence: number | null
  provenance: string | null
  referenceNow: number | null
}) {
  const record = asRecord(input.raw)
  const semanticSimilarity = clamp01(
    record?.semanticSimilarity ?? record?.semanticScore ?? record?.score,
    input.confidence ?? 0,
  )
  const graphAffinity = record?.graphAffinity != null || record?.graphScore != null
    ? clamp01(record?.graphAffinity ?? record?.graphScore)
    : null
  const recencyScore = recencyScoreFromTimestamp({
    timestamp: itemUpdatedAt(input.raw),
    referenceNow: input.referenceNow,
  })
  const provenanceTrust = trustForProvenance(input.provenance)
  const relationshipThreadMatch = record?.relationshipThreadMatch != null || record?.threadMatch != null
    ? clamp01(record?.relationshipThreadMatch ?? record?.threadMatch)
    : null
  const conflictPenalty = clamp01(record?.conflictPenalty ?? record?.conflictPressure, 0)
  const latencyCost = record?.latencyCost != null
    ? clamp01(record?.latencyCost)
    : null
  const weighted = [
    semanticSimilarity * 0.32,
    (graphAffinity ?? semanticSimilarity) * 0.16,
    (recencyScore ?? 0.55) * 0.12,
    provenanceTrust * 0.18,
    (relationshipThreadMatch ?? 0.55) * 0.14,
    input.selected ? 0.12 : 0,
    -conflictPenalty * 0.2,
    -(latencyCost ?? 0) * 0.08,
  ].reduce((sum, value) => sum + value, 0)
  const reasons = [
    input.selected ? 'selected-by-deliberation' : null,
    input.confidence != null ? 'confidence-signal' : null,
    input.provenance ? `provenance:${input.provenance}` : null,
    graphAffinity != null ? 'graph-affinity' : null,
    recencyScore != null ? 'recency-signal' : null,
    relationshipThreadMatch != null ? 'relationship-thread-match' : null,
    conflictPenalty > 0 ? 'conflict-penalty' : null,
    latencyCost != null ? 'latency-cost' : null,
  ].filter((item): item is string => Boolean(item))

  return {
    semanticSimilarity,
    graphAffinity,
    recencyScore,
    provenanceTrust,
    relationshipThreadMatch,
    conflictPenalty,
    latencyCost,
    finalScore: Math.max(0, Math.min(1, Number(weighted.toFixed(2)))),
    reasons,
  }
}

function humanizeCandidateKey(raw: unknown, maxChars = 160) {
  const normalized = normalizeText(raw, maxChars)
  if (!normalized)
    return null
  return normalized.replace(/[-_]+/g, ' ')
}

function pickSituationRelationshipContext(context: OrganicMemoryPromptContext, raw: Record<string, unknown>) {
  const queryText = (context.memorySituationCandidates?.queryTexts ?? [])
    .map(item => normalizeText(item, 180))
    .find((item): item is string => Boolean(item))
  return queryText
    ?? humanizeCandidateKey(raw.relationshipArcKey)
    ?? humanizeCandidateKey(raw.procedureKey)
    ?? null
}

function buildSituationCandidateSummary(input: {
  context: OrganicMemoryPromptContext
  raw: Record<string, unknown>
}) {
  const baseSummary = normalizeText(input.raw.summary, 280)
  const relationshipContext = pickSituationRelationshipContext(input.context, input.raw)
  const hostAttitude = normalizeText(input.context.hostAttitude, 180)
  const affectiveResidue = normalizeText(input.context.affectiveResidue?.summary, 180)
  const executionCarry = normalizeText(
    input.context.learningExecutionState?.lastCompletedSummary
    ?? input.context.learningExecutionState?.currentBlockedReason
    ?? null,
    180,
  )
  const embodimentCarry = normalizeText(
    input.context.personStateProjection?.relationshipDoctrine
    ?? input.context.personStateProjection?.summary
    ?? null,
    180,
  )

  return [
    baseSummary,
    relationshipContext ? `relationship context: ${relationshipContext}` : null,
    hostAttitude ? `host attitude: ${hostAttitude}` : null,
    affectiveResidue ? `affective residue: ${affectiveResidue}` : null,
    executionCarry ? `execution carry: ${executionCarry}` : null,
    embodimentCarry ? `embodiment carry: ${embodimentCarry}` : null,
  ].filter((item): item is string => Boolean(item)).join(' | ')
}

function collectLongTermEvidenceOwnerIds(context: OrganicMemoryPromptContext) {
  const ownerIds = new Set<string>()
  const add = (raw: unknown) => {
    const id = normalizeText(raw, 180)
    if (id)
      ownerIds.add(id)
  }

  for (const fact of context.retrievedFacts)
    add(fact.id)
  for (const episode of context.recalledEpisodes ?? [])
    add(episode.id)
  for (const window of context.recollectedWindows ?? [])
    add(window.id)
  for (const consolidation of context.consolidatedMemories ?? []) {
    add(consolidation.id)
    for (const eventId of consolidation.derivedEventIds ?? [])
      add(eventId)
  }
  for (const procedure of context.proceduralMemories ?? [])
    add(procedure.id)
  for (const reflection of context.recentMemoryReflections ?? [])
    add(reflection.id)
  for (const outcome of context.recentRelationshipOutcomes ?? [])
    add(outcome.id)
  for (const graph of context.claimEvidenceGraphs ?? []) {
    add(graph.claimId)
    for (const evidence of [...graph.supportingEvidence, ...graph.contradictingEvidence]) {
      const sourceKind = normalizeText(evidence.sourceKind, 64)
      const evidenceId = normalizeText(evidence.evidenceId, 180)
      const sourceId = normalizeText(evidence.sourceId, 180)
      if (
        !evidenceId
        || sourceKind === 'conversation'
        || sourceKind === 'conversation-turn'
        || (sourceId != null && evidenceId === sourceId)
      ) {
        continue
      }
      ownerIds.add(evidenceId)
    }
  }

  return ownerIds
}

function buildMemorySituationCandidateItems(context: OrganicMemoryPromptContext) {
  const producedAt = Number.isFinite(context.memorySituationCandidates?.producedAt)
    ? Number(context.memorySituationCandidates?.producedAt)
    : null
  const longTermEvidenceOwnerIds = collectLongTermEvidenceOwnerIds(context)
  return (context.memorySituationCandidates?.candidates ?? []).flatMap((candidate) => {
    const raw = asRecord(candidate) ?? {}
    const rawSourceKinds = boundedCandidateStringList(raw.sourceKinds, 10)
    if (!rawSourceKinds)
      return []
    const sourceKinds = rawSourceKinds.filter(kind => [
      'event-graph',
      'episodic-event',
      'fact',
      'consolidation',
      'procedure',
      'relationship',
      'self-model',
      'world-model',
    ].includes(kind))
    if (sourceKinds.length === 0 || sourceKinds.length !== rawSourceKinds.length)
      return []
    const selectedEvidenceIds = boundedCandidateStringList(raw.selectedEvidenceIds, 24)
    if (
      !selectedEvidenceIds
      || selectedEvidenceIds.length === 0
      || selectedEvidenceIds.some(id => !longTermEvidenceOwnerIds.has(id))
    ) {
      return []
    }
    const confidence = clamp01(raw.confidence, 0.55)
    const competingCandidateIds = itemStringList(raw.competingCandidateIds, 12)
    const suppressionReasons = itemStringList(raw.suppressionReasons, 12)
    const selected = normalizeText(raw.status, 32) === 'selected'
    const relationshipArcKey = normalizeText(raw.relationshipArcKey, 160)
    const procedureKey = normalizeText(raw.procedureKey, 160)
    const eraKey = normalizeText(raw.eraKey, 160)

    return [{
      ...raw,
      id: normalizeText(raw.candidateId, 180) ?? null,
      summary: buildSituationCandidateSummary({
        context,
        raw,
      }),
      provenance: 'reconstructed',
      producedAt,
      updatedAt: producedAt,
      sourceConfidence: confidence,
      semanticScore: confidence,
      graphAffinity: confidence,
      relationshipThreadMatch: relationshipArcKey || procedureKey ? 0.92 : selected ? 0.84 : 0.68,
      conflictPressure: suppressionReasons.length > 0
        ? Math.min(1, Number((0.18 + suppressionReasons.length * 0.08).toFixed(2)))
        : 0,
      conflictsWith: competingCandidateIds,
      threadId: relationshipArcKey ?? procedureKey ?? eraKey ?? null,
      eraId: eraKey,
      status: normalizeText(raw.status, 32) ?? null,
      selectedEvidenceIds,
      sourceKinds,
    }]
  })
}

function selectedIds(context: OrganicMemoryPromptContext) {
  const deliberation = context.memoryDeliberation ?? null
  return new Set([
    ...(deliberation?.selectedEraIds ?? []),
    ...(deliberation?.selectedConsolidationIds ?? []),
    ...(deliberation?.selectedWindowIds ?? []),
    ...(deliberation?.selectedProcedureIds ?? []),
    ...(deliberation?.selectedEpisodeIds ?? []),
    ...(deliberation?.selectedBundles ?? []).flatMap(item => [
      item.id,
      item.periodId,
      item.episodeId,
      item.procedureId,
    ]),
  ].filter((item): item is string => typeof item === 'string' && item.trim().length > 0))
}

function appendCandidates(input: {
  result: AlicizationMemoryCandidateRetrievalItem[]
  kind: AlicizationMemoryCandidateKind
  items: unknown[]
  selected: Set<string>
  referenceNow: number | null
}) {
  for (const [index, item] of input.items.entries()) {
    const id = itemId(item, `${input.kind}:${index + 1}`)
    const provenance = itemProvenance(item)
    const confidence = itemConfidence(item)
    const selected = input.selected.has(id) || normalizeText(asRecord(item)?.status, 32) === 'selected'
    const metadata = itemMetadata(item)
    input.result.push({
      id,
      kind: input.kind,
      summary: itemSummary(item),
      provenance,
      confidence,
      selected,
      metadata,
      ranking: deriveRanking({
        raw: item,
        selected,
        confidence,
        provenance,
        referenceNow: input.referenceNow,
      }),
    })
  }
}

export function deriveAlicizationMemoryCandidateRetrieval(input: {
  context: OrganicMemoryPromptContext
  nowMs?: number | null
}): AlicizationMemoryCandidateRetrievalArtifact {
  const selected = selectedIds(input.context)
  const referenceNow = collectCandidateReferenceNow(input.context, input.nowMs)
  const candidates: AlicizationMemoryCandidateRetrievalItem[] = []
  appendCandidates({
    result: candidates,
    kind: 'fact',
    items: input.context.retrievedFacts,
    selected,
    referenceNow,
  })
  appendCandidates({
    result: candidates,
    kind: 'fragment',
    items: input.context.recalledFragments,
    selected,
    referenceNow,
  })
  appendCandidates({
    result: candidates,
    kind: 'episode',
    items: input.context.recalledEpisodes ?? [],
    selected,
    referenceNow,
  })
  appendCandidates({
    result: candidates,
    kind: 'window',
    items: input.context.recollectedWindows ?? [],
    selected,
    referenceNow,
  })
  appendCandidates({
    result: candidates,
    kind: 'consolidation',
    items: input.context.consolidatedMemories ?? [],
    selected,
    referenceNow,
  })
  appendCandidates({
    result: candidates,
    kind: 'procedure',
    items: input.context.proceduralMemories ?? [],
    selected,
    referenceNow,
  })
  appendCandidates({
    result: candidates,
    kind: 'situation',
    items: buildMemorySituationCandidateItems(input.context),
    selected,
    referenceNow,
  })

  const counts = candidates.reduce<Record<AlicizationMemoryCandidateKind, number>>((acc, item) => {
    acc[item.kind] += 1
    return acc
  }, {
    fact: 0,
    fragment: 0,
    episode: 0,
    window: 0,
    consolidation: 0,
    procedure: 0,
    situation: 0,
  })

  return {
    version: 'memory-candidate-retrieval-v1',
    candidates,
    counts,
    selectedCandidateIds: candidates
      .filter(item => item.selected)
      .sort((left, right) => right.ranking.finalScore - left.ranking.finalScore)
      .map(item => item.id),
  }
}
