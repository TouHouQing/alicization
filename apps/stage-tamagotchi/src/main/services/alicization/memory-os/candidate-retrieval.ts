import type { OrganicMemoryPromptContext } from '../runtime-soul'

export type AlicizationMemoryCandidateKind
  = 'fact'
    | 'fragment'
    | 'episode'
    | 'conversation'
    | 'window'
    | 'consolidation'
    | 'procedure'

export interface AlicizationMemoryCandidateRetrievalItem {
  id: string
  kind: AlicizationMemoryCandidateKind
  summary: string | null
  provenance: string | null
  confidence: number | null
  selected: boolean
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
    ?? normalizeText(record?.turnId, 120)
    ?? fallback
}

function itemSummary(raw: unknown) {
  const record = asRecord(raw)
  return normalizeText(record?.summary)
    ?? normalizeText(record?.lesson)
    ?? normalizeText(record?.content)
    ?? normalizeText(record?.text)
    ?? normalizeText(record?.label)
    ?? normalizeText(record?.approach)
    ?? normalizeText([
      normalizeText(record?.userText, 110),
      normalizeText(record?.assistantText, 110),
    ].filter(Boolean).join(' / '))
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

function itemUpdatedAt(raw: unknown) {
  const record = asRecord(raw)
  const candidates = [
    record?.updatedAt,
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
  if (provenance === 'observed')
    return 0.95
  if (provenance === 'remembered')
    return 0.82
  if (provenance === 'reconstructed')
    return 0.58
  if (provenance === 'inferred')
    return 0.48
  if (provenance === 'dreamt')
    return 0.28
  return 0.62
}

function recencyScoreFromTimestamp(timestamp: number | null) {
  if (timestamp == null)
    return null
  const ageDays = Math.max(0, (Date.now() - timestamp) / (24 * 60 * 60 * 1000))
  return Math.max(0.2, Math.min(1, Number((1 / (1 + ageDays / 30)).toFixed(2))))
}

function deriveRanking(input: {
  raw: unknown
  selected: boolean
  confidence: number | null
  provenance: string | null
}) {
  const record = asRecord(input.raw)
  const semanticSimilarity = clamp01(
    record?.semanticSimilarity ?? record?.semanticScore ?? record?.score,
    input.confidence ?? 0,
  )
  const graphAffinity = record?.graphAffinity != null || record?.graphScore != null
    ? clamp01(record?.graphAffinity ?? record?.graphScore)
    : null
  const recencyScore = recencyScoreFromTimestamp(itemUpdatedAt(input.raw))
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

function selectedIds(context: OrganicMemoryPromptContext) {
  const deliberation = context.memoryDeliberation ?? null
  return new Set([
    ...(deliberation?.selectedEraIds ?? []),
    ...(deliberation?.selectedConsolidationIds ?? []),
    ...(deliberation?.selectedWindowIds ?? []),
    ...(deliberation?.selectedProcedureIds ?? []),
    ...(deliberation?.selectedEpisodeIds ?? []),
    ...(deliberation?.selectedConversationTurnIds ?? []),
    ...(deliberation?.selectedBundles ?? []).flatMap(item => [
      item.id,
      item.periodId,
      item.episodeId,
      item.procedureId,
      item.conversationTurnId,
    ]),
  ].filter((item): item is string => typeof item === 'string' && item.trim().length > 0))
}

function appendCandidates(input: {
  result: AlicizationMemoryCandidateRetrievalItem[]
  kind: AlicizationMemoryCandidateKind
  items: unknown[]
  selected: Set<string>
}) {
  for (const [index, item] of input.items.entries()) {
    const id = itemId(item, `${input.kind}:${index + 1}`)
    const provenance = itemProvenance(item)
    const confidence = itemConfidence(item)
    const selected = input.selected.has(id)
    input.result.push({
      id,
      kind: input.kind,
      summary: itemSummary(item),
      provenance,
      confidence,
      selected,
      ranking: deriveRanking({
        raw: item,
        selected,
        confidence,
        provenance,
      }),
    })
  }
}

export function deriveAlicizationMemoryCandidateRetrieval(input: {
  context: OrganicMemoryPromptContext
}): AlicizationMemoryCandidateRetrievalArtifact {
  const selected = selectedIds(input.context)
  const candidates: AlicizationMemoryCandidateRetrievalItem[] = []
  appendCandidates({
    result: candidates,
    kind: 'fact',
    items: input.context.retrievedFacts,
    selected,
  })
  appendCandidates({
    result: candidates,
    kind: 'fragment',
    items: input.context.recalledFragments,
    selected,
  })
  appendCandidates({
    result: candidates,
    kind: 'episode',
    items: input.context.recalledEpisodes ?? [],
    selected,
  })
  appendCandidates({
    result: candidates,
    kind: 'conversation',
    items: input.context.recalledConversationHistory ?? [],
    selected,
  })
  appendCandidates({
    result: candidates,
    kind: 'window',
    items: input.context.recollectedWindows ?? [],
    selected,
  })
  appendCandidates({
    result: candidates,
    kind: 'consolidation',
    items: input.context.consolidatedMemories ?? [],
    selected,
  })
  appendCandidates({
    result: candidates,
    kind: 'procedure',
    items: input.context.proceduralMemories ?? [],
    selected,
  })

  const counts = candidates.reduce<Record<AlicizationMemoryCandidateKind, number>>((acc, item) => {
    acc[item.kind] += 1
    return acc
  }, {
    fact: 0,
    fragment: 0,
    episode: 0,
    conversation: 0,
    window: 0,
    consolidation: 0,
    procedure: 0,
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
