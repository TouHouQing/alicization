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
    input.result.push({
      id,
      kind: input.kind,
      summary: itemSummary(item),
      provenance: itemProvenance(item),
      confidence: itemConfidence(item),
      selected: input.selected.has(id),
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
      .map(item => item.id),
  }
}
