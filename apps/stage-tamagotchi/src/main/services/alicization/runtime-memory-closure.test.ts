import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeMemoryClosure } from './runtime-memory-closure'

describe('runtime memory closure', () => {
  it('persists outcome closure into memory stores and person-state update ledger', async () => {
    const appendRelationshipOutcomes = vi.fn(async () => {})
    const appendEpisodicEvents = vi.fn(async () => {})
    const appendPersonaReinforcementEvents = vi.fn(async () => {})
    const appendPersonStateEvolutionEntries = vi.fn(async () => {})
    const upsertMemoryReflections = vi.fn(async () => {})
    const upsertMemoryFacts = vi.fn(async () => {})
    const readMindHead = vi.fn(async () => null)
    const upsertMindHead = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async () => {})
    const withCardScope = vi.fn(async (_cardId, task) => await task())
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 5_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      appendAuditLog,
      alicizationDb: {
        appendRelationshipOutcomes,
        appendEpisodicEvents,
        appendPersonaReinforcementEvents,
        appendPersonStateEvolutionEntries,
        upsertMemoryReflections,
        upsertMemoryFacts,
        readMindHead,
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:closure',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        actionSummary: 'reply landed',
        closenessDelta: 0.06,
        trustDelta: 0.08,
        burdenDelta: 0,
        boundaryDelta: 0,
        misreadDelta: 0,
        repairDelta: 0.04,
        openLoopDelta: 0,
        summary: 'The reply landed as more lived-in and less robotic.',
        createdAt: 4_800,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:closure',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        dimension: 'companionship',
        delta: 0.08,
        valence: 'reinforce',
        summary: 'Living companionship landed better than a shell reply.',
        createdAt: 4_850,
      }],
      memoryFacts: [{
        subject: 'relationship',
        predicate: 'preference',
        object: 'lived-in directness',
        confidence: 0.82,
      }],
      reflections: [],
      episodicEvents: [],
    })

    expect(appendRelationshipOutcomes).toHaveBeenCalled()
    expect(appendPersonaReinforcementEvents).toHaveBeenCalled()
    expect(upsertMemoryFacts).toHaveBeenCalledWith(expect.any(Array), 'rule')
    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        version: 'person-state-update-surface-v1',
      }),
    )
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        decisionTraceId: 'mind:test:closure',
        kind: 'person-state-updated',
      }),
    ]))
    expect(appendPersonStateEvolutionEntries).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        cardId: 'default',
        sourceKind: 'person-state-update',
      }),
    ]))
    expect(withCardScope).not.toHaveBeenCalled()
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('routes autobiographical episode backfill through scoped persistence for non-active cards', async () => {
    const appendEpisodicEvents = vi.fn(async () => {})
    const withCardScope = vi.fn(async (_cardId, task) => await task())

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 8_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents: async () => {},
      },
    })

    await runtime.persistAutobiographicalEpisodes('other-card', {
      label: 'session-mirror.autobio',
      events: [{
        cardId: 'other-card',
        sourceKind: 'maintenance',
        provenance: 'remembered',
        occurredAt: 7_500,
        withWhom: ['host'],
        whatHappened: 'We stayed on the same runtime seam.',
        confidence: 0.74,
      }],
    })

    expect(withCardScope).toHaveBeenCalled()
    expect(appendEpisodicEvents).toHaveBeenCalled()
  })
})
