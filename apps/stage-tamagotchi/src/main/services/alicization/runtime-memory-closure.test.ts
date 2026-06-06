import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeMemoryClosure } from './runtime-memory-closure'

interface RuntimeMemoryClosureMindTurnWriteback {
  payload?: {
    humanlikeMemoryCandidate?: {
      naturalRecallLine?: string
    }
  } & Record<string, unknown>
}

describe('runtime memory closure', () => {
  it('persists outcome closure into memory stores and person-state update ledger', async () => {
    const appendRelationshipOutcomes = vi.fn(async () => {})
    const appendEpisodicEvents = vi.fn(async () => {})
    const appendPersonaReinforcementEvents = vi.fn(async () => {})
    const appendPersonStateEvolutionEntries = vi.fn(async () => {})
    const upsertMemoryReflections = vi.fn(async () => {})
    const upsertMemoryFacts = vi.fn(async () => {})
    const applyMemoryFactCorrections = vi.fn(async () => {})
    const readMindHead = vi.fn(async () => null)
    const upsertMindHead = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async () => {})
    const listMemoryFacts = vi.fn(async () => [])
    const withCardScope = vi.fn(async (_cardId, task) => await task())
    const appendAuditLog = vi.fn(async () => {})
    const assimilateMemoryFactsDetailed = vi.fn((input: any) => ({
      facts: input.facts.map((fact: any) => ({
        ...fact,
        knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
        validationStatus: fact.validationStatus ?? 'unverified',
        sourceLabel: fact.sourceLabel ?? '',
        conflictsWith: fact.conflictsWith ?? [],
        supersedes: fact.supersedes ?? [],
      })),
      corrections: [],
    }))

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 5_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => assimilateMemoryFactsDetailed(input).facts,
        assimilateMemoryFactsDetailed,
      },
      appendAuditLog,
      alicizationDb: {
        appendRelationshipOutcomes,
        appendEpisodicEvents,
        appendPersonaReinforcementEvents,
        appendPersonStateEvolutionEntries,
        upsertMemoryReflections,
        upsertMemoryFacts,
        applyMemoryFactCorrections,
        listMemoryFacts,
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
    expect(listMemoryFacts).toHaveBeenCalled()
    expect(assimilateMemoryFactsDetailed).toHaveBeenCalledWith(expect.objectContaining({
      source: 'rule',
    }))
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

  it('carries a humanlike memory candidate through person-state mind-turn writeback so closure memories are audit-visible instead of helper-only', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 21_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: 18_000,
          summary: 'Older memory only said the host wanted a concise status recap.',
          dominantContexts: ['execution'],
          relationshipShift: {
            trustDelta: 0,
            closenessDelta: 0,
            burdenDelta: 0,
            boundaryDelta: 0,
            repairDelta: 0,
          },
          reinforcementBias: {},
          preferenceHints: [],
          sensitivityHints: [],
          repairHints: ['Repair continuity before widening warmth.'],
          burdenHints: [],
          narrative: ['Older generic status recap memory.'],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'execution',
            summary: 'Older memory only said the host wanted a concise status recap.',
            createdAt: 18_000,
          }],
        } as unknown as T),
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:humanlike-candidate',
        turnId: 'turn-humanlike-writeback',
        sessionId: 'session-humanlike-writeback',
        sourceKind: 'execution',
        actionSummary: 'execution callback: host worried she would disconnect and become a generic tool shell while embodiment closure stayed unfinished.',
        closenessDelta: -0.01,
        trustDelta: 0.05,
        burdenDelta: 0.02,
        boundaryDelta: -0.01,
        misreadDelta: 0.01,
        repairDelta: 0.08,
        openLoopDelta: 0.08,
        summary: 'The host cared more about same-her relationship continuity than a raw callback status recap.',
        createdAt: 20_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:humanlike-candidate',
        turnId: 'turn-humanlike-writeback',
        sessionId: 'session-humanlike-writeback',
        sourceKind: 'execution',
        dimension: 'gentle-repair',
        delta: 0.07,
        valence: 'reinforce',
        summary: 'Repair-first continuity should stay low-pressure and body-aware before widening warmth.',
        createdAt: 20_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:humanlike-candidate',
        turnId: 'turn-humanlike-writeback',
        sessionId: 'session-humanlike-writeback',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 20_800,
        withWhom: ['host'],
        threadAnchor: 'same-her embodiment closure',
        whatHappened: 'The host said not to become a tool shell and asked to keep closing the embodiment loop.',
        felt: 'slight guilt and unfinishedness',
        emotionTags: ['repair', 'unfinishedness', 'continuity'],
        relationshipMeaning: 'The relationship meaning is one continuous digital life, not generic task-shell reporting.',
        lesson: 'Return repair-first, slower and lower-pressure, with face, voice, pause, and lipsync derived from the same memory-emotion state.',
        confidence: 0.86,
      }],
    })

    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          humanlikeMemoryCandidate: expect.objectContaining({
            sourceChannels: expect.arrayContaining(['execution', 'host-emotion', 'self-emotion', 'embodiment']),
            relationshipContext: expect.objectContaining({
              summary: expect.stringContaining('tool shell'),
            }),
            emotionalResidue: expect.objectContaining({
              tags: expect.arrayContaining(['slight-guilt', 'unfinishedness', 'protective-continuity']),
            }),
            initiativeOpportunity: expect.objectContaining({
              kind: 'low-pressure-follow-up',
            }),
            embodimentTrace: expect.objectContaining({
              expressionState: expect.objectContaining({
                pacing: 'slower',
              }),
            }),
            metabolism: expect.objectContaining({
              revisionEvents: expect.arrayContaining([
                expect.objectContaining({
                  conflictingMemoryIds: expect.arrayContaining(['previous-person-state:0']),
                }),
              ]),
            }),
            auditTrail: expect.objectContaining({
              correctionSurface: expect.objectContaining({
                userCorrectableFields: expect.arrayContaining(['relationshipContext', 'emotionalResidue']),
              }),
            }),
          }),
        }),
      }),
    ]))
  })

  it('lets host audit corrections shape the next runtime humanlike memory candidate instead of staying audit-only', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})
    const listMindTurnEvents = vi.fn(async () => [{
      id: 'mind-turn:event:correction-1',
      decisionTraceId: 'humanlike-memory-correction:old-candidate',
      turnId: 'turn-audit-correction',
      sessionId: 'session-audit',
      origin: 'user-turn' as const,
      kind: 'humanlike-memory-corrected' as const,
      payload: {
        candidateId: 'humanlike-memory-candidate:old-candidate',
        field: 'relationshipContext',
        previousValue: 'The host was pushing progress pressure.',
        correctedValue: '我是在测试她是不是持续的人，不是催进度。',
        reason: 'Host corrected why this memory should exist.',
      },
      createdAt: 30_200,
    }])

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 31_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        listMindTurnEvents,
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:host-correction-runtime',
        turnId: 'turn-after-host-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution',
        actionSummary: 'continued the memory closure after the host corrected the prior relationship-context audit entry.',
        closenessDelta: 0.01,
        trustDelta: 0.05,
        burdenDelta: -0.01,
        boundaryDelta: 0,
        misreadDelta: -0.02,
        repairDelta: 0.08,
        openLoopDelta: 0.04,
        summary: 'The next closure should carry the host correction forward rather than repeat a progress-pressure misread.',
        createdAt: 30_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:host-correction-runtime',
        turnId: 'turn-after-host-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution',
        dimension: 'companionship',
        delta: 0.07,
        valence: 'reinforce',
        summary: 'Corrected memory meaning should make future recall more same-person and less task-shell.',
        createdAt: 30_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:host-correction-runtime',
        turnId: 'turn-after-host-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 30_800,
        withWhom: ['host'],
        threadAnchor: 'host corrected memory meaning',
        whatHappened: 'The host asked to continue after correcting the memory audit meaning.',
        relationshipMeaning: 'The correction means the host was testing same-person continuity, not applying progress pressure.',
        lesson: 'Carry host-corrected memory meaning forward before choosing tone, initiative, or embodiment.',
        confidence: 0.84,
      }],
    })

    expect(listMindTurnEvents).toHaveBeenCalledWith({
      kind: 'humanlike-memory-corrected',
      limit: 12,
    })
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          humanlikeMemoryCandidate: expect.objectContaining({
            relationshipContext: expect.objectContaining({
              summary: expect.stringContaining('不是催进度'),
            }),
            auditTrail: expect.objectContaining({
              whyRemember: expect.stringContaining('host correction'),
            }),
            naturalRecallLine: expect.stringContaining('我记得你纠正过'),
          }),
        }),
      }),
    ]))
    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.naturalRecallLine).toContain('不是催进度')
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
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
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
