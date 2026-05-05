import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationEventGraphMutation,
  createAlicizationMemoryEventGraphRuntime,
  type AlicizationEventGraphSourceEvent,
} from './memory-event-graph-runtime'

function createEvent(overrides: Partial<AlicizationEventGraphSourceEvent> & { id: string }): AlicizationEventGraphSourceEvent {
  const now = Date.now()
  const { id, ...rest } = overrides
  return {
    id,
    cardId: 'card-1',
    sourceKind: 'dialogue-turn',
    provenance: 'observed',
    occurredAt: now,
    whereSummary: null,
    withWhom: ['host'],
    threadAnchor: null,
    whatHappened: `event ${overrides.id}`,
    felt: null,
    emotionTags: [],
    whatChanged: null,
    relationshipMeaning: null,
    lesson: null,
    sourceSummary: null,
    confidence: 0.8,
    salience: 0.7,
    sceneAttachment: 0.3,
    derivedFrom: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...rest,
  }
}

describe('memory-event-graph-runtime', () => {
  it('collapses event graph neighborhoods into situation candidates with selected and rejected clusters', async () => {
    const events = [
      createEvent({
        id: 'event-1',
        threadAnchor: 'runtime repair',
        whereSummary: 'Code window',
        whatHappened: 'We patched the runtime repair path.',
        relationshipMeaning: 'Prefer concrete payoff over empty planning.',
        lesson: 'Patch first, verify, then report.',
        tags: ['runtime', 'repair', 'verify'],
        derivedFrom: [
          { kind: 'task-thread', id: 'runtime-repair', label: 'runtime repair' },
        ],
      }),
      createEvent({
        id: 'event-2',
        threadAnchor: 'runtime repair',
        whereSummary: 'Code window',
        whatHappened: 'We verified the runtime repair path after patching.',
        relationshipMeaning: 'Prefer concrete payoff over empty planning.',
        lesson: 'Patch first, verify, then report.',
        tags: ['runtime', 'repair', 'verify'],
        derivedFrom: [
          { kind: 'task-thread', id: 'runtime-repair', label: 'runtime repair' },
        ],
      }),
      createEvent({
        id: 'event-3',
        threadAnchor: 'late-night care',
        whereSummary: 'chat',
        whatHappened: 'The host asked for comfort late at night.',
        relationshipMeaning: 'Care should not become a task-planning shell.',
        tags: ['care', 'late-night'],
      }),
    ]
    const mutation = buildAlicizationEventGraphMutation(events)
    const nodeRows = mutation.nodes.map(node => ({
      node_id: node.nodeId,
      card_id: node.cardId,
      node_kind: node.nodeKind,
      canonical_key: node.canonicalKey,
      label: node.label,
      semantic_text: node.semanticText,
      provenance: node.provenance,
      source_event_id: node.sourceEventId,
      payload_json: node.payload ? JSON.stringify(node.payload) : null,
      created_at: node.createdAt,
      updated_at: node.updatedAt,
    }))
    const edgeRows = mutation.edges.map(edge => ({
      edge_id: edge.edgeId,
      card_id: edge.cardId,
      source_node_id: edge.sourceNodeId,
      target_node_id: edge.targetNodeId,
      edge_kind: edge.edgeKind,
      weight: edge.weight,
      provenance: edge.provenance,
      payload_json: edge.payload ? JSON.stringify(edge.payload) : null,
      created_at: edge.createdAt,
      updated_at: edge.updatedAt,
    }))
    const runtime = createAlicizationMemoryEventGraphRuntime({
      database: {} as never,
      run: vi.fn(),
      all: vi.fn(async (_database, sql, params) => {
        const ids = Array.isArray(params)
          ? params.filter(item => typeof item === 'string') as string[]
          : []
        if (sql.includes('FROM event_graph_nodes')) {
          return nodeRows.filter(row => ids.includes(row.node_id)) as never[]
        }
        if (sql.includes('FROM event_graph_edges')) {
          return edgeRows.filter(row =>
            ids.includes(row.source_node_id) || ids.includes(row.target_node_id),
          ) as never[]
        }
        return []
      }),
      clamp01: value => Math.max(0, Math.min(1, value)),
      normalizeOrganicMemoryText: (raw, maxChars) => typeof raw === 'string' ? raw.slice(0, maxChars) : '',
    })

    const candidateSet = await runtime.collapseEventGraphSituationCandidates({
      cardId: 'card-1',
      eventIds: events.map(event => event.id),
      queryTexts: ['继续按之前 runtime repair 的 patch verify 流程做完'],
      selectedEventId: 'event-1',
    })

    expect(candidateSet.version).toBe('memory-situation-candidates-v1')
    expect(candidateSet.selected).toHaveLength(1)
    expect(candidateSet.selected[0]).toEqual(expect.objectContaining({
      situationKind: 'repair-arc',
      procedureKey: 'runtime-repair',
      status: 'selected',
      selectedEvidenceIds: expect.arrayContaining(['event-1', 'event-2']),
    }))
    expect(candidateSet.rejected.length).toBeGreaterThanOrEqual(1)
    expect(candidateSet.rejected[0]?.suppressionReasons).toContain('event-graph-competing-cluster')
    expect(candidateSet.selected[0]?.competingCandidateIds.length).toBeGreaterThan(0)
  })
})
