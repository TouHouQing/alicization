import { describe, expect, it } from 'vitest'

import { createAlicizationMemoryRelationshipRuntime } from './memory-relationship-runtime'

function reflectionRow(id: string, updatedAt: number) {
  return {
    id,
    card_id: 'card-a',
    decision_trace_id: null,
    turn_id: null,
    session_id: null,
    source_kind: 'reflection',
    target_scope: 'self',
    summary: `summary-${id}`,
    lesson: `lesson-${id}`,
    status: 'confirmed' as const,
    confidence: 0.8,
    supporting_fact_ids_json: null,
    supporting_outcome_ids_json: null,
    created_at: updatedAt,
    updated_at: updatedAt,
    confirmed_at: updatedAt,
    denied_at: null,
  }
}

function reinforcementRow(id: string, createdAt: number) {
  return {
    id,
    card_id: 'card-a',
    decision_trace_id: null,
    turn_id: null,
    session_id: null,
    source_kind: 'relationship',
    dimension: 'warmth',
    delta: 0.2,
    valence: 'reinforce',
    summary: `summary-${id}`,
    created_at: createdAt,
  }
}

function createRuntime(rows: unknown[]) {
  return createAlicizationMemoryRelationshipRuntime({
    database: {} as never,
    now: () => 100,
    randomUUID: () => 'generated-id',
    run: async () => ({}),
    get: async () => undefined,
    all: async <T>() => rows as T[],
    enqueueWrite: async task => await task(),
    runInTransaction: async (_database, task) => await task(),
    clamp01: value => Math.max(0, Math.min(1, value)),
    clampRelationshipDelta: value => value,
    parseJsonStringArray: () => [],
    normalizeOrganicMemoryText: (raw, maxChars) => String(raw ?? '').slice(0, maxChars),
  })
}

describe('memory relationship runtime pagination', () => {
  it('returns a stable reflection cursor for same-timestamp rows', async () => {
    const runtime = createRuntime([
      reflectionRow('reflection-a', 100),
      reflectionRow('reflection-b', 100),
    ])

    const firstPage = await runtime.listMemoryReflectionsPage({
      cardId: 'card-a',
      limit: 1,
    })

    expect(firstPage.items.map(item => item.id)).toEqual(['reflection-a'])
    expect(firstPage.nextCursor).toBeTruthy()

    const secondPage = await createRuntime([
      reflectionRow('reflection-b', 100),
    ]).listMemoryReflectionsPage({
      cardId: 'card-a',
      limit: 1,
      cursor: firstPage.nextCursor,
    })

    expect(secondPage.items.map(item => item.id)).toEqual(['reflection-b'])
    expect(secondPage.nextCursor).toBeNull()
  })

  it('paginates persona reinforcement events with created-at and id ordering', async () => {
    const runtime = createRuntime([
      reinforcementRow('reinforcement-a', 100),
      reinforcementRow('reinforcement-b', 100),
    ])

    const firstPage = await runtime.listPersonaReinforcementEventsPage({
      cardId: 'card-a',
      limit: 1,
    })

    expect(firstPage.items.map(item => item.id)).toEqual(['reinforcement-a'])
    expect(firstPage.nextCursor).toBeTruthy()

    const secondPage = await createRuntime([
      reinforcementRow('reinforcement-b', 100),
    ]).listPersonaReinforcementEventsPage({
      cardId: 'card-a',
      limit: 1,
      cursor: firstPage.nextCursor,
    })

    expect(secondPage.items.map(item => item.id)).toEqual(['reinforcement-b'])
    expect(secondPage.nextCursor).toBeNull()
  })
})
