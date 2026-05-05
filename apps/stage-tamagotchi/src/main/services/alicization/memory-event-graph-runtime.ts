import type { AlicizationDerivedMemoryReference, AlicizationMemoryProvenance } from '../../../shared/eventa'

import type sqlite3 from 'sqlite3'

import type {
  AlicizationMemorySituationCandidate,
  AlicizationMemorySituationCandidateSet,
  AlicizationMemorySituationKind,
} from '@proj-alicization/stage-shared'

import { scoreSemanticRecall } from './memory-semantic-retrieval'

export type AlicizationEventGraphNodeKind
  = | 'event'
    | 'person'
    | 'task-thread'
    | 'repair-arc'
    | 'scene'
    | 'relationship-meaning'
    | 'reference'

export type AlicizationEventGraphEdgeKind
  = | 'with-person'
    | 'belongs-thread'
    | 'part-of-repair-arc'
    | 'happened-in-scene'
    | 'carries-relationship-meaning'
    | 'derived-from'

export interface AlicizationEventGraphNodeRecord {
  nodeId: string
  cardId: string
  nodeKind: AlicizationEventGraphNodeKind
  canonicalKey: string
  label: string
  semanticText: string
  provenance: AlicizationMemoryProvenance
  sourceEventId: string | null
  payload: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

export interface AlicizationEventGraphEdgeRecord {
  edgeId: string
  cardId: string
  sourceNodeId: string
  targetNodeId: string
  edgeKind: AlicizationEventGraphEdgeKind
  weight: number
  provenance: AlicizationMemoryProvenance
  payload: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

export interface AlicizationEventGraphNeighborhood {
  nodes: AlicizationEventGraphNodeRecord[]
  edges: AlicizationEventGraphEdgeRecord[]
}

export interface AlicizationEventGraphSourceEvent {
  id: string
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sourceKind: string
  provenance: AlicizationMemoryProvenance
  occurredAt: number
  whereSummary: string | null
  withWhom: string[]
  threadAnchor: string | null
  whatHappened: string
  felt: string | null
  emotionTags: string[]
  whatChanged: string | null
  relationshipMeaning: string | null
  lesson: string | null
  sourceSummary: string | null
  confidence: number
  salience: number
  sceneAttachment: number
  relationshipShift?: {
    closenessDelta: number
    trustDelta: number
    burdenDelta: number
    boundaryDelta: number
    misreadDelta: number
    repairDelta: number
    openLoopDelta: number
  } | null
  derivedFrom: AlicizationDerivedMemoryReference[]
  tags: string[]
  createdAt: number
  updatedAt: number
}

interface DbEventGraphNodeRow {
  node_id: string
  card_id: string
  node_kind: AlicizationEventGraphNodeKind
  canonical_key: string
  label: string
  semantic_text: string
  provenance: AlicizationMemoryProvenance
  source_event_id: string | null
  payload_json: string | null
  created_at: number
  updated_at: number
}

interface DbEventGraphEdgeRow {
  edge_id: string
  card_id: string
  source_node_id: string
  target_node_id: string
  edge_kind: AlicizationEventGraphEdgeKind
  weight: number
  provenance: AlicizationMemoryProvenance
  payload_json: string | null
  created_at: number
  updated_at: number
}

interface CreateAlicizationMemoryEventGraphRuntimeOptions {
  database: sqlite3.Database
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  clamp01: (value: number) => number
  normalizeOrganicMemoryText: (raw: unknown, maxChars: number) => string
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ')
      : ''
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

function parseJsonObject(raw: string | null) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

function slugify(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

function chunkValues<T>(values: T[], chunkSize = 180) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += chunkSize)
    chunks.push(values.slice(index, index + chunkSize))
  return chunks
}

function buildEventNodeId(eventId: string) {
  return `event:${eventId}`
}

function buildCanonicalNodeId(prefix: string, raw: string) {
  return `${prefix}:${slugify(raw)}`.slice(0, 160)
}

function normalizeDerivedReferenceKey(reference: AlicizationDerivedMemoryReference) {
  const id = typeof reference.id === 'string' && reference.id.trim()
    ? reference.id.trim()
    : null
  const label = typeof reference.label === 'string' && reference.label.trim()
    ? reference.label.trim()
    : null
  return {
    id,
    label,
    rawKey: id || label || reference.kind,
  }
}

function shouldBuildRepairArc(event: AlicizationEventGraphSourceEvent) {
  if ((event.relationshipShift?.repairDelta ?? 0) > 0)
    return true
  const text = [
    event.whatHappened,
    event.whatChanged ?? '',
    event.sourceSummary ?? '',
    ...event.tags,
    ...event.emotionTags,
  ].join(' ').toLowerCase()
  return /repair|fix|mend|reopen|lighter touch|back off|修复|回收|回拉|留白/u.test(text)
}

function edgeKindWeight(kind: AlicizationEventGraphEdgeKind) {
  switch (kind) {
    case 'derived-from':
      return 0.42
    case 'belongs-thread':
      return 0.34
    case 'part-of-repair-arc':
      return 0.3
    case 'carries-relationship-meaning':
      return 0.32
    case 'happened-in-scene':
      return 0.22
    case 'with-person':
      return 0.18
    default:
      return 0.2
  }
}

function inferSituationKindFromNodeKinds(nodeKinds: Set<AlicizationEventGraphNodeKind>): AlicizationMemorySituationKind {
  if (nodeKinds.has('repair-arc'))
    return 'repair-arc'
  if (nodeKinds.has('task-thread'))
    return 'task-thread'
  if (nodeKinds.has('relationship-meaning'))
    return 'relationship-arc'
  if (nodeKinds.has('scene'))
    return 'episodic-scene'
  return 'mixed'
}

function mapDerivedReferenceToNode(input: {
  reference: AlicizationDerivedMemoryReference
  cardId: string
  provenance: AlicizationMemoryProvenance
  sourceEventId: string
  createdAt: number
  updatedAt: number
}) {
  const key = normalizeDerivedReferenceKey(input.reference)
  if (!key.rawKey)
    return null

  const rawKind = input.reference.kind
  const nodeKind: AlicizationEventGraphNodeKind = rawKind === 'episodic-event'
    ? 'event'
    : rawKind === 'task-thread'
      ? 'task-thread'
      : rawKind === 'scene'
        ? 'scene'
        : rawKind === 'relationship-outcome'
          ? 'relationship-meaning'
          : rawKind === 'execution-event'
            ? 'task-thread'
            : 'reference'
  const nodeId = rawKind === 'episodic-event' && key.id
    ? buildEventNodeId(key.id)
    : rawKind === 'task-thread' && key.id
      ? `task-thread:${key.id}`
      : rawKind === 'scene' && key.id
        ? `scene:${key.id}`
        : buildCanonicalNodeId(nodeKind, key.rawKey)
  const label = key.label || key.id || input.reference.kind
  return {
    node: {
      nodeId,
      cardId: input.cardId,
      nodeKind,
      canonicalKey: key.rawKey,
      label,
      semanticText: uniqueList([label, input.reference.kind]).join(' | '),
      provenance: input.provenance,
      sourceEventId: rawKind === 'episodic-event' && key.id ? key.id : input.sourceEventId,
      payload: {
        referenceKind: input.reference.kind,
        referenceId: key.id,
        referenceLabel: key.label,
      },
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    } satisfies AlicizationEventGraphNodeRecord,
    edgeKind: 'derived-from' as const,
    weight: rawKind === 'episodic-event' ? 0.92 : rawKind === 'task-thread' ? 0.84 : 0.72,
    payload: {
      referenceKind: input.reference.kind,
    },
  }
}

export function buildAlicizationEventGraphMutation(events: AlicizationEventGraphSourceEvent[]) {
  const nodeMap = new Map<string, AlicizationEventGraphNodeRecord>()
  const edgeMap = new Map<string, AlicizationEventGraphEdgeRecord>()

  const upsertNode = (node: AlicizationEventGraphNodeRecord) => {
    const existing = nodeMap.get(node.nodeId)
    if (!existing) {
      nodeMap.set(node.nodeId, node)
      return
    }
    nodeMap.set(node.nodeId, {
      ...existing,
      label: existing.label.length >= node.label.length ? existing.label : node.label,
      semanticText: uniqueList([existing.semanticText, node.semanticText], 12).join(' | '),
      sourceEventId: existing.sourceEventId ?? node.sourceEventId,
      payload: existing.payload ?? node.payload,
      createdAt: Math.min(existing.createdAt, node.createdAt),
      updatedAt: Math.max(existing.updatedAt, node.updatedAt),
    })
  }

  const upsertEdge = (edge: AlicizationEventGraphEdgeRecord) => {
    const existing = edgeMap.get(edge.edgeId)
    if (!existing) {
      edgeMap.set(edge.edgeId, edge)
      return
    }
    edgeMap.set(edge.edgeId, {
      ...existing,
      weight: Math.max(existing.weight, edge.weight),
      payload: existing.payload ?? edge.payload,
      createdAt: Math.min(existing.createdAt, edge.createdAt),
      updatedAt: Math.max(existing.updatedAt, edge.updatedAt),
    })
  }

  const connect = (input: {
    cardId: string
    provenance: AlicizationMemoryProvenance
    sourceNodeId: string
    targetNodeId: string
    edgeKind: AlicizationEventGraphEdgeKind
    weight: number
    payload?: Record<string, unknown> | null
    createdAt: number
    updatedAt: number
  }) => {
    const edgeId = `${input.sourceNodeId}->${input.edgeKind}->${input.targetNodeId}`.slice(0, 320)
    upsertEdge({
      edgeId,
      cardId: input.cardId,
      sourceNodeId: input.sourceNodeId,
      targetNodeId: input.targetNodeId,
      edgeKind: input.edgeKind,
      weight: Math.max(0, Math.min(1, input.weight)),
      provenance: input.provenance,
      payload: input.payload ?? null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    })
  }

  for (const event of events) {
    const eventNodeId = buildEventNodeId(event.id)
    upsertNode({
      nodeId: eventNodeId,
      cardId: event.cardId,
      nodeKind: 'event',
      canonicalKey: event.id,
      label: event.whatHappened,
      semanticText: uniqueList([
        event.threadAnchor,
        event.whereSummary,
        event.whatHappened,
        event.felt,
        event.whatChanged,
        event.relationshipMeaning,
        event.lesson,
        event.sourceSummary,
        ...event.tags,
        ...event.emotionTags,
      ], 16).join(' | '),
      provenance: event.provenance,
      sourceEventId: event.id,
      payload: {
        sourceKind: event.sourceKind,
        confidence: event.confidence,
        salience: event.salience,
        sceneAttachment: event.sceneAttachment,
      },
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    })

    for (const person of uniqueList(event.withWhom, 6)) {
      const nodeId = buildCanonicalNodeId('person', person)
      upsertNode({
        nodeId,
        cardId: event.cardId,
        nodeKind: 'person',
        canonicalKey: person,
        label: person,
        semanticText: person,
        provenance: event.provenance,
        sourceEventId: event.id,
        payload: null,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
      connect({
        cardId: event.cardId,
        provenance: event.provenance,
        sourceNodeId: eventNodeId,
        targetNodeId: nodeId,
        edgeKind: 'with-person',
        weight: 0.62,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
    }

    if (event.whereSummary) {
      const nodeId = buildCanonicalNodeId('scene', event.whereSummary)
      upsertNode({
        nodeId,
        cardId: event.cardId,
        nodeKind: 'scene',
        canonicalKey: event.whereSummary,
        label: event.whereSummary,
        semanticText: uniqueList([event.whereSummary, event.threadAnchor, ...event.tags], 8).join(' | '),
        provenance: event.provenance,
        sourceEventId: event.id,
        payload: {
          sceneAttachment: event.sceneAttachment,
        },
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
      connect({
        cardId: event.cardId,
        provenance: event.provenance,
        sourceNodeId: eventNodeId,
        targetNodeId: nodeId,
        edgeKind: 'happened-in-scene',
        weight: 0.58 + event.sceneAttachment * 0.22,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
    }

    const threadKeys = uniqueList([
      ...event.derivedFrom
        .filter(item => item.kind === 'task-thread')
        .map(item => item.id || item.label || ''),
      event.threadAnchor,
    ], 4)
    for (const threadKey of threadKeys) {
      const nodeId = threadKey.startsWith('thread-') || threadKey.includes(':')
        ? `task-thread:${threadKey}`.slice(0, 160)
        : buildCanonicalNodeId('task-thread', threadKey)
      upsertNode({
        nodeId,
        cardId: event.cardId,
        nodeKind: 'task-thread',
        canonicalKey: threadKey,
        label: threadKey,
        semanticText: uniqueList([threadKey, event.threadAnchor, event.lesson, event.relationshipMeaning], 8).join(' | '),
        provenance: event.provenance,
        sourceEventId: event.id,
        payload: null,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
      connect({
        cardId: event.cardId,
        provenance: event.provenance,
        sourceNodeId: eventNodeId,
        targetNodeId: nodeId,
        edgeKind: 'belongs-thread',
        weight: 0.7,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
    }

    for (const meaning of uniqueList([event.relationshipMeaning, event.lesson], 4)) {
      const nodeId = buildCanonicalNodeId('relationship-meaning', meaning)
      upsertNode({
        nodeId,
        cardId: event.cardId,
        nodeKind: 'relationship-meaning',
        canonicalKey: meaning,
        label: meaning,
        semanticText: uniqueList([meaning, event.whatChanged, ...event.emotionTags], 8).join(' | '),
        provenance: event.provenance,
        sourceEventId: event.id,
        payload: null,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
      connect({
        cardId: event.cardId,
        provenance: event.provenance,
        sourceNodeId: eventNodeId,
        targetNodeId: nodeId,
        edgeKind: 'carries-relationship-meaning',
        weight: 0.76,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
    }

    if (shouldBuildRepairArc(event)) {
      const repairKey = uniqueList([
        event.decisionTraceId ?? null,
        event.turnId ?? null,
        event.threadAnchor,
        event.whatChanged,
      ], 1)[0]
      if (repairKey) {
        const nodeId = buildCanonicalNodeId('repair-arc', repairKey)
        upsertNode({
          nodeId,
          cardId: event.cardId,
          nodeKind: 'repair-arc',
          canonicalKey: repairKey,
          label: event.threadAnchor || repairKey,
          semanticText: uniqueList([
            event.whatHappened,
            event.whatChanged,
            event.relationshipMeaning,
            event.lesson,
            ...event.tags,
            ...event.emotionTags,
          ], 12).join(' | '),
          provenance: event.provenance,
          sourceEventId: event.id,
          payload: {
            relationshipShift: event.relationshipShift ?? null,
          },
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        })
        connect({
          cardId: event.cardId,
          provenance: event.provenance,
          sourceNodeId: eventNodeId,
          targetNodeId: nodeId,
          edgeKind: 'part-of-repair-arc',
          weight: 0.68 + Math.max(0, event.relationshipShift?.repairDelta ?? 0) * 0.9,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        })
      }
    }

    for (const reference of event.derivedFrom) {
      const mapped = mapDerivedReferenceToNode({
        reference,
        cardId: event.cardId,
        provenance: event.provenance,
        sourceEventId: event.id,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
      if (!mapped)
        continue
      upsertNode(mapped.node)
      connect({
        cardId: event.cardId,
        provenance: event.provenance,
        sourceNodeId: eventNodeId,
        targetNodeId: mapped.node.nodeId,
        edgeKind: mapped.edgeKind,
        weight: mapped.weight,
        payload: mapped.payload,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
    }
  }

  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()],
  }
}

export function createAlicizationMemoryEventGraphRuntime(
  options: CreateAlicizationMemoryEventGraphRuntimeOptions,
) {
  function mapNodeRow(row: DbEventGraphNodeRow): AlicizationEventGraphNodeRecord {
    return {
      nodeId: row.node_id,
      cardId: row.card_id,
      nodeKind: row.node_kind,
      canonicalKey: row.canonical_key,
      label: row.label,
      semanticText: row.semantic_text,
      provenance: row.provenance,
      sourceEventId: row.source_event_id,
      payload: parseJsonObject(row.payload_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  function mapEdgeRow(row: DbEventGraphEdgeRow): AlicizationEventGraphEdgeRecord {
    return {
      edgeId: row.edge_id,
      cardId: row.card_id,
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      edgeKind: row.edge_kind,
      weight: options.clamp01(row.weight),
      provenance: row.provenance,
      payload: parseJsonObject(row.payload_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async function upsertGraphForEpisodicEvents(events: AlicizationEventGraphSourceEvent[]) {
    if (events.length === 0)
      return

    const mutation = buildAlicizationEventGraphMutation(events)
    for (const node of mutation.nodes) {
      await options.run(
        options.database,
        `
        INSERT INTO event_graph_nodes (
          node_id,
          card_id,
          node_kind,
          canonical_key,
          label,
          semantic_text,
          provenance,
          source_event_id,
          payload_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(node_id)
        DO UPDATE SET
          card_id = excluded.card_id,
          node_kind = excluded.node_kind,
          canonical_key = excluded.canonical_key,
          label = excluded.label,
          semantic_text = excluded.semantic_text,
          provenance = excluded.provenance,
          source_event_id = COALESCE(event_graph_nodes.source_event_id, excluded.source_event_id),
          payload_json = COALESCE(event_graph_nodes.payload_json, excluded.payload_json),
          updated_at = excluded.updated_at
        `,
        [
          node.nodeId,
          node.cardId,
          node.nodeKind,
          node.canonicalKey,
          node.label,
          node.semanticText,
          node.provenance,
          node.sourceEventId,
          node.payload ? JSON.stringify(node.payload) : null,
          node.createdAt,
          node.updatedAt,
        ],
      )
    }

    for (const edge of mutation.edges) {
      await options.run(
        options.database,
        `
        INSERT INTO event_graph_edges (
          edge_id,
          card_id,
          source_node_id,
          target_node_id,
          edge_kind,
          weight,
          provenance,
          payload_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(edge_id)
        DO UPDATE SET
          card_id = excluded.card_id,
          source_node_id = excluded.source_node_id,
          target_node_id = excluded.target_node_id,
          edge_kind = excluded.edge_kind,
          weight = MAX(event_graph_edges.weight, excluded.weight),
          provenance = excluded.provenance,
          payload_json = COALESCE(event_graph_edges.payload_json, excluded.payload_json),
          updated_at = excluded.updated_at
        `,
        [
          edge.edgeId,
          edge.cardId,
          edge.sourceNodeId,
          edge.targetNodeId,
          edge.edgeKind,
          edge.weight,
          edge.provenance,
          edge.payload ? JSON.stringify(edge.payload) : null,
          edge.createdAt,
          edge.updatedAt,
        ],
      )
    }
  }

  async function loadNodesByIds(nodeIds: string[]) {
    if (nodeIds.length === 0)
      return [] as AlicizationEventGraphNodeRecord[]

    const rows: DbEventGraphNodeRow[] = []
    for (const chunk of chunkValues(nodeIds)) {
      const placeholders = chunk.map(() => '?').join(', ')
      rows.push(...await options.all<DbEventGraphNodeRow>(
        options.database,
        `
        SELECT *
        FROM event_graph_nodes
        WHERE node_id IN (${placeholders})
        `,
        chunk,
      ))
    }
    return rows.map(mapNodeRow)
  }

  async function loadEdgesForNodeIds(nodeIds: string[], limit = 4000) {
    if (nodeIds.length === 0)
      return [] as AlicizationEventGraphEdgeRecord[]

    const rows: DbEventGraphEdgeRow[] = []
    const safeLimit = Math.max(1, Math.min(20_000, Math.floor(limit)))
    for (const chunk of chunkValues(nodeIds, 120)) {
      const placeholders = chunk.map(() => '?').join(', ')
      rows.push(...await options.all<DbEventGraphEdgeRow>(
        options.database,
        `
        SELECT *
        FROM event_graph_edges
        WHERE source_node_id IN (${placeholders})
           OR target_node_id IN (${placeholders})
        ORDER BY updated_at DESC
        LIMIT ?
        `,
        [...chunk, ...chunk, safeLimit],
      ))
    }

    const deduped = new Map<string, AlicizationEventGraphEdgeRecord>()
    for (const row of rows) {
      const mapped = mapEdgeRow(row)
      const existing = deduped.get(mapped.edgeId)
      if (!existing || mapped.updatedAt > existing.updatedAt)
        deduped.set(mapped.edgeId, mapped)
    }
    return [...deduped.values()]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, safeLimit)
  }

  async function listEventGraphNeighborhood(input: {
    eventIds?: string[]
    nodeIds?: string[]
    limit?: number
  }): Promise<AlicizationEventGraphNeighborhood> {
    const seedNodeIds = uniqueList([
      ...(input.nodeIds ?? []),
      ...(input.eventIds ?? []).map(buildEventNodeId),
    ], 800)
    if (seedNodeIds.length === 0)
      return { nodes: [], edges: [] }

    const edges = await loadEdgesForNodeIds(seedNodeIds, input.limit ?? 4000)
    const neighborNodeIds = uniqueList([
      ...seedNodeIds,
      ...edges.map(edge => edge.sourceNodeId),
      ...edges.map(edge => edge.targetNodeId),
    ], 4000)
    const nodes = await loadNodesByIds(neighborNodeIds)
    return {
      nodes,
      edges,
    }
  }

  async function scoreEventGraphNeighborhood(input: {
    eventIds: string[]
    queryTexts: string[]
  }) {
    const neighborhood = await listEventGraphNeighborhood({
      eventIds: input.eventIds,
      limit: Math.max(400, input.eventIds.length * 24),
    })
    const nodeById = new Map(neighborhood.nodes.map(node => [node.nodeId, node] as const))
    const boostByEventId = new Map<string, number>()

    for (const eventId of input.eventIds) {
      const eventNodeId = buildEventNodeId(eventId)
      const connectedEdges = neighborhood.edges.filter(edge =>
        edge.sourceNodeId === eventNodeId || edge.targetNodeId === eventNodeId,
      )
      let totalBoost = 0
      for (const edge of connectedEdges) {
        const neighborNodeId = edge.sourceNodeId === eventNodeId
          ? edge.targetNodeId
          : edge.sourceNodeId
        const neighbor = nodeById.get(neighborNodeId)
        if (!neighbor)
          continue
        const semanticMatch = scoreSemanticRecall({
          queryTexts: input.queryTexts,
          candidateTexts: [
            neighbor.label,
            neighbor.semanticText,
            edge.edgeKind,
            typeof edge.payload?.referenceKind === 'string' ? edge.payload.referenceKind : '',
          ],
        })
        if (semanticMatch <= 0.04)
          continue
        totalBoost += semanticMatch * edge.weight * edgeKindWeight(edge.edgeKind)
      }
      boostByEventId.set(eventId, options.clamp01(totalBoost))
    }

    return boostByEventId
  }

  async function collapseEventGraphSituationCandidates(input: {
    cardId: string
    eventIds: string[]
    queryTexts: string[]
    selectedEventId?: string | null
    maxCandidates?: number
  }): Promise<AlicizationMemorySituationCandidateSet> {
    const neighborhood = await listEventGraphNeighborhood({
      eventIds: input.eventIds,
      limit: Math.max(400, input.eventIds.length * 24),
    })
    const nodeById = new Map(neighborhood.nodes.map(node => [node.nodeId, node] as const))
    const eventNodeIds = new Set(input.eventIds.map(buildEventNodeId))
    const adjacency = new Map<string, Set<string>>()
    const addAdjacent = (left: string, right: string) => {
      if (!adjacency.has(left))
        adjacency.set(left, new Set())
      adjacency.get(left)!.add(right)
    }
    for (const edge of neighborhood.edges) {
      addAdjacent(edge.sourceNodeId, edge.targetNodeId)
      addAdjacent(edge.targetNodeId, edge.sourceNodeId)
    }

    const visited = new Set<string>()
    const clusters: string[][] = []
    for (const eventNodeId of eventNodeIds) {
      if (visited.has(eventNodeId))
        continue
      const queue = [eventNodeId]
      const cluster: string[] = []
      visited.add(eventNodeId)
      while (queue.length > 0) {
        const current = queue.shift()!
        const currentNode = nodeById.get(current)
        if (currentNode?.nodeKind === 'event' && eventNodeIds.has(current))
          cluster.push(current)
        for (const neighborId of adjacency.get(current) ?? []) {
          const neighborNode = nodeById.get(neighborId)
          if (!neighborNode)
            continue
          if (neighborNode.nodeKind === 'person')
            continue
          if (neighborNode.nodeKind === 'event' && !eventNodeIds.has(neighborId))
            continue
          if (visited.has(neighborId))
            continue
          visited.add(neighborId)
          queue.push(neighborId)
        }
      }
      clusters.push(cluster)
    }

    const candidates: AlicizationMemorySituationCandidate[] = clusters.map((cluster, index) => {
      const clusterNodes = cluster
        .map(nodeId => nodeById.get(nodeId))
        .filter(Boolean) as AlicizationEventGraphNodeRecord[]
      const clusterEdges = neighborhood.edges.filter(edge =>
        cluster.includes(edge.sourceNodeId) || cluster.includes(edge.targetNodeId),
      )
      const semanticScore = scoreSemanticRecall({
        queryTexts: input.queryTexts,
        candidateTexts: [
          ...clusterNodes.map(node => node.label),
          ...clusterNodes.map(node => node.semanticText),
          ...clusterEdges.map(edge => edge.edgeKind),
        ],
      })
      const nodeKinds = new Set<AlicizationEventGraphNodeKind>(
        cluster.flatMap((nodeId) => {
          const linkedKinds = [nodeById.get(nodeId)?.nodeKind].filter(Boolean) as AlicizationEventGraphNodeKind[]
          for (const edge of clusterEdges) {
            if (edge.sourceNodeId === nodeId)
              linkedKinds.push(nodeById.get(edge.targetNodeId)?.nodeKind as AlicizationEventGraphNodeKind)
            if (edge.targetNodeId === nodeId)
              linkedKinds.push(nodeById.get(edge.sourceNodeId)?.nodeKind as AlicizationEventGraphNodeKind)
          }
          return linkedKinds.filter(Boolean)
        }),
      )
      const eventLabels = clusterNodes.map(node => node.label).filter(Boolean)
      const taskThreadNode = clusterEdges
        .flatMap((edge) => [nodeById.get(edge.sourceNodeId), nodeById.get(edge.targetNodeId)])
        .find(node => node?.nodeKind === 'task-thread')
      const repairArcNode = clusterEdges
        .flatMap((edge) => [nodeById.get(edge.sourceNodeId), nodeById.get(edge.targetNodeId)])
        .find(node => node?.nodeKind === 'repair-arc')
      const relationshipNode = clusterEdges
        .flatMap((edge) => [nodeById.get(edge.sourceNodeId), nodeById.get(edge.targetNodeId)])
        .find(node => node?.nodeKind === 'relationship-meaning')
      const sceneNode = clusterEdges
        .flatMap((edge) => [nodeById.get(edge.sourceNodeId), nodeById.get(edge.targetNodeId)])
        .find(node => node?.nodeKind === 'scene')
      const selected = input.selectedEventId
        ? cluster.includes(buildEventNodeId(input.selectedEventId))
        : index === 0
      const competingCandidateIds = clusters
        .filter(other => other !== cluster)
        .map((_, otherIndex) => `memory-situation:${otherIndex + 1}`)
        .slice(0, 6)

      return {
        candidateId: `memory-situation:${index + 1}`,
        sourceKinds: ['event-graph', 'episodic-event'],
        situationKind: inferSituationKindFromNodeKinds(nodeKinds),
        eraKey: sceneNode?.canonicalKey ?? null,
        relationshipArcKey: relationshipNode?.canonicalKey ?? null,
        procedureKey: taskThreadNode?.canonicalKey ?? null,
        selfModelKey: null,
        worldClaimKeys: [],
        selectedEvidenceIds: cluster.map(nodeId => nodeId.replace(/^event:/, '')),
        competingCandidateIds,
        suppressionReasons: selected ? [] : ['event-graph-competing-cluster'],
        confidence: options.clamp01(semanticScore + Math.min(0.3, cluster.length * 0.08)),
        latencyCost: options.clamp01(0.18 + cluster.length * 0.06),
        status: selected ? 'selected' : 'rejected',
        statusReason: selected
          ? 'highest event-graph neighborhood continuity match'
          : 'competing event-graph neighborhood scored lower for this cue set',
        summary: uniqueList([
          repairArcNode?.label,
          taskThreadNode?.label,
          relationshipNode?.label,
          sceneNode?.label,
          ...eventLabels,
        ], 3).join(' / ') || `memory situation ${index + 1}`,
        evidenceSummary: uniqueList([
          ...clusterEdges.map(edge => edge.edgeKind),
          ...eventLabels,
        ], 8).join(' | ') || null,
      } satisfies AlicizationMemorySituationCandidate
    })
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, Math.max(1, input.maxCandidates ?? 6))
      .map((candidate, index, all) => ({
        ...candidate,
        status: index === 0 ? 'selected' : candidate.status,
        statusReason: index === 0
          ? 'highest event-graph neighborhood continuity match'
          : candidate.statusReason,
        competingCandidateIds: all
          .filter(other => other.candidateId !== candidate.candidateId)
          .map(other => other.candidateId)
          .slice(0, 6),
      }))

    return {
      version: 'memory-situation-candidates-v1',
      producedAt: Date.now(),
      queryTexts: uniqueList(input.queryTexts, 8),
      candidates,
      selected: candidates.filter(item => item.status === 'selected'),
      rejected: candidates.filter(item => item.status === 'rejected'),
      suppressed: candidates.filter(item => item.status === 'suppressed'),
      delayed: candidates.filter(item => item.status === 'delayed'),
      unresolved: candidates.filter(item => item.status === 'unresolved'),
    } satisfies AlicizationMemorySituationCandidateSet
  }

  return {
    collapseEventGraphSituationCandidates,
    upsertGraphForEpisodicEvents,
    listEventGraphNeighborhood,
    scoreEventGraphNeighborhood,
  }
}
