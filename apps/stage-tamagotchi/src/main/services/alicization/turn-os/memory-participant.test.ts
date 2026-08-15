import type { AlicizationLongTermMemoryRecallProviderEvidence } from '../main-chat-memory-context'

import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationMemoryParticipant,
} from './memory-participant'

function createScope() {
  return {
    turnId: 'turn-memory',
    cardId: 'card-1',
    userId: 'user-1',
    conversationId: 'conversation-1',
  }
}

function createMemoryEvidence(): AlicizationLongTermMemoryRecallProviderEvidence[] {
  return [{
    id: 'memory-1',
    kind: 'fact' as const,
    summary: '用户喜欢先说结论。',
    source: 'confirmed',
    confidence: 0.92,
    queryMatches: ['先说结论'],
    rankReasons: ['scope-match', 'semantic-match'],
    scope: {
      userId: 'user-1',
      cardId: 'card-1',
    },
    provenance: 'remembered',
    salience: 0.8,
    updatedAt: 20,
    occurredAt: null,
    threadId: null,
    threadAnchor: null,
    cues: ['先说结论'],
    entities: ['用户'],
    sensitivity: 'personal',
    retrievalScore: 0.88,
    evidenceVersion: 'long-term-memory-evidence-v1',
    version: 'long-term-memory-evidence-v1',
  }]
}

describe('memoryOS Turn participant', () => {
  it('records compression, scoped recall evidence, and a pending write proposal', async () => {
    const events: Array<{
      eventType: string
      payload: unknown
    }> = []
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent: vi.fn(async (event) => {
        events.push(event)
      }),
    })

    await participant.recordWorkingMemory({
      sessionId: 'session-1',
      snapshot: {
        version: 'working-memory-v1',
        updatedAt: 100,
        compressedTimeline: [{
          id: 'episodelet-1',
          sourceTurnIds: ['turn-old'],
          summary: '旧对话已压缩。',
        }],
        compression: {
          level: 'light',
          sourceTurnIds: ['turn-old'],
          lastCompressedAt: 100,
        },
      },
    })
    await participant.recordLongTermRecall({
      sessionId: 'session-1',
      status: 'recalled',
      evidence: createMemoryEvidence(),
      confidence: 0.92,
    })
    const proposal = participant.prepareWrite({
      sessionId: 'session-1',
      items: [{
        id: 'queue-1',
        sourceTurnIds: ['turn-current:user'],
        kind: 'preference',
        summary: '用户喜欢先说结论。',
        reason: 'candidate:preference',
        evidenceSnippets: ['用户喜欢先说结论。'],
        salience: 0.8,
        confidence: 0.86,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
        source: 'working-memory-owner',
      }],
    })

    expect(proposal).toMatchObject({
      version: 'memory-write-proposal-v1',
      status: 'pending',
      scope: createScope(),
      sessionId: 'session-1',
    })
    expect(events.map(event => event.eventType)).toEqual([
      'working_memory.compression.started',
      'working_memory.compression.completed',
      'working_memory.snapshot.created',
      'long_term_memory.recall.started',
      'long_term_memory.recall.evidence',
      'long_term_memory.recall.completed',
    ])
    expect(events.find(event => event.eventType === 'long_term_memory.recall.evidence')?.payload)
      .toMatchObject({
        scope: {
          userId: 'user-1',
          cardId: 'card-1',
        },
        provenance: 'remembered',
        rankReasons: ['scope-match', 'semantic-match'],
        evidenceVersion: 'long-term-memory-evidence-v1',
      })
  })

  it('does not replay old compression events when the snapshot was not compressed this turn', async () => {
    const events: Array<{ eventType: string, payload: unknown }> = []
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent: vi.fn(async (event) => {
        events.push(event)
      }),
    })

    await participant.recordWorkingMemory({
      sessionId: 'session-1',
      snapshot: {
        version: 'working-memory-v1',
        updatedAt: 200,
        compressedTimeline: [{
          id: 'episodelet-old',
          sourceTurnIds: ['turn-old'],
          summary: '之前已经压缩。',
        }],
        compression: {
          level: 'light',
          sourceTurnIds: ['turn-old'],
          lastCompressedAt: 100,
        },
      },
    })

    expect(events.map(event => event.eventType)).toEqual([
      'working_memory.snapshot.created',
    ])
  })

  it.each([
    'visibleMode',
    'speechPlan',
    'surfaceMode',
    'mustSay',
    'visibility',
  ])('rejects recall evidence containing the forbidden field %s', async (field) => {
    const appendEvent = vi.fn(async () => {})
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent,
    })
    const evidence = {
      ...createMemoryEvidence()[0],
      [field]: 'must not cross the memory boundary',
    } as AlicizationLongTermMemoryRecallProviderEvidence

    await expect(participant.recordLongTermRecall({
      sessionId: 'session-1',
      status: 'recalled',
      evidence: [evidence],
      confidence: 0.92,
    })).rejects.toThrow(`memory recall evidence[0] contains forbidden field ${field}`)
    expect(appendEvent).not.toHaveBeenCalled()
  })

  it.each([
    'scope',
    'provenance',
    'rankReasons',
    'confidence',
    'evidenceVersion',
    'version',
  ])('rejects recall evidence without required field %s', async (field) => {
    const appendEvent = vi.fn(async () => {})
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent,
    })
    const evidence = {
      ...createMemoryEvidence()[0],
      [field]: undefined,
    } as unknown as AlicizationLongTermMemoryRecallProviderEvidence

    await expect(participant.recordLongTermRecall({
      sessionId: 'session-1',
      status: 'recalled',
      evidence: [evidence],
      confidence: 0.92,
    })).rejects.toThrow(`memory recall evidence[0] ${field}`)
    expect(appendEvent).not.toHaveBeenCalled()
  })

  it.each([
    ['userId', 'other-user'],
    ['cardId', 'other-card'],
  ] as const)('rejects recall evidence whose scope.%s differs from the participant scope', async (field, value) => {
    const appendEvent = vi.fn(async () => {})
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent,
    })
    const baseEvidence = createMemoryEvidence()[0]
    const evidence = {
      ...baseEvidence,
      scope: {
        ...baseEvidence.scope,
        [field]: value,
      },
    }

    await expect(participant.recordLongTermRecall({
      sessionId: 'session-1',
      status: 'recalled',
      evidence: [evidence],
      confidence: 0.92,
    })).rejects.toThrow(`memory recall evidence[0] scope.${field} must match participant scope`)
    expect(appendEvent).not.toHaveBeenCalled()
  })

  it.each([
    ['kind', 'unsupported-kind', 'kind'],
    ['provenance', 'fabricated', 'provenance'],
    ['confidence', 1.2, 'confidence'],
    ['rankReasons', [], 'rankReasons'],
    ['evidenceVersion', 'long-term-memory-evidence-v2', 'evidenceVersion'],
    ['version', 'long-term-memory-evidence-v2', 'version'],
    ['summary', 'mode=internal; lifecycle=held', 'summary'],
  ])('rejects untyped or unclean recall evidence field %s', async (field, value, expectedLabel) => {
    const appendEvent = vi.fn(async () => {})
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent,
    })
    const evidence = {
      ...createMemoryEvidence()[0],
      [field]: value,
    } as unknown as AlicizationLongTermMemoryRecallProviderEvidence

    await expect(participant.recordLongTermRecall({
      sessionId: 'session-1',
      status: 'recalled',
      evidence: [evidence],
      confidence: 0.92,
    })).rejects.toThrow(`memory recall evidence[0] ${expectedLabel}`)
    expect(appendEvent).not.toHaveBeenCalled()
  })

  it('rejects nested scope fields outside the typed evidence contract', async () => {
    const appendEvent = vi.fn(async () => {})
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent,
    })
    const baseEvidence = createMemoryEvidence()[0]
    const evidence = {
      ...baseEvidence,
      scope: {
        ...baseEvidence.scope,
        visibility: 'hidden',
      },
    } as unknown as AlicizationLongTermMemoryRecallProviderEvidence

    await expect(participant.recordLongTermRecall({
      sessionId: 'session-1',
      status: 'recalled',
      evidence: [evidence],
      confidence: 0.92,
    })).rejects.toThrow('memory recall evidence[0] scope contains forbidden field visibility')
    expect(appendEvent).not.toHaveBeenCalled()
  })

  it('only accepts a proposal for a completed visible turn and rejects all other outcomes', async () => {
    const events: Array<{
      eventType: string
      payload: unknown
    }> = []
    const enqueue = vi.fn(async () => ({
      ownerSettlements: [],
    }))
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent: vi.fn(async (event) => {
        events.push(event)
      }),
      enqueue,
    })
    const proposal = participant.prepareWrite({
      sessionId: 'session-1',
      items: [{
        id: 'queue-1',
        sourceTurnIds: ['turn-current:user'],
        kind: 'preference',
        summary: '用户喜欢先说结论。',
        reason: 'candidate:preference',
        evidenceSnippets: ['用户喜欢先说结论。'],
        salience: 0.8,
        confidence: 0.86,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
        source: 'working-memory-owner',
      }],
    })

    await participant.settleWrite({
      proposal,
      status: 'completed',
      visibleReplyCommitted: true,
      enqueueItems: proposal.items,
      assistantText: '我会先说结论。',
    })
    await participant.settleWrite({
      proposal,
      status: 'provider-failed',
      visibleReplyCommitted: false,
      enqueueItems: [],
      assistantText: '',
    })

    expect(events.map(event => event.eventType)).toContain('memory.write.accepted')
    expect(events.map(event => event.eventType)).toContain('memory.write.rejected')
    expect(enqueue).toHaveBeenCalledOnce()
    expect(events.find(event => event.eventType === 'memory.write.accepted')?.payload)
      .toMatchObject({
        scope: createScope(),
        sessionId: 'session-1',
        visibleReplyCommitted: true,
      })
  })

  it('rejects a write proposal whose scope differs from the participant scope', async () => {
    const appendEvent = vi.fn(async () => {})
    const enqueue = vi.fn(async () => ({
      ownerSettlements: [],
    }))
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent,
      enqueue,
    })
    const proposal = participant.prepareWrite({
      sessionId: 'session-1',
      items: [{
        id: 'queue-scope',
        sourceTurnIds: ['turn-current:user'],
        kind: 'preference',
        summary: '用户喜欢先说结论。',
        reason: 'candidate:preference',
        evidenceSnippets: ['用户喜欢先说结论。'],
        salience: 0.8,
        confidence: 0.86,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
        source: 'working-memory-owner',
      }],
    })
    const mismatchedProposal = {
      ...proposal,
      scope: {
        ...proposal.scope,
        userId: 'other-user',
      },
    }

    await expect(participant.settleWrite({
      proposal: mismatchedProposal,
      status: 'completed',
      visibleReplyCommitted: true,
      enqueueItems: proposal.items,
      assistantText: '我会先说结论。',
    })).rejects.toThrow('memory proposal scope must match participant scope')
    expect(appendEvent).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
  })

  it.each([
    ['version', 'memory-write-proposal-v2'],
    ['status', 'accepted'],
  ] as const)('rejects a write proposal with invalid %s', async (field, value) => {
    const appendEvent = vi.fn(async () => {})
    const enqueue = vi.fn(async () => ({
      ownerSettlements: [],
    }))
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent,
      enqueue,
    })
    const proposal = participant.prepareWrite({
      sessionId: 'session-1',
      items: [{
        id: 'queue-metadata',
        sourceTurnIds: ['turn-current:user'],
        kind: 'preference',
        summary: '用户喜欢先说结论。',
        reason: 'candidate:preference',
        evidenceSnippets: ['用户喜欢先说结论。'],
        salience: 0.8,
        confidence: 0.86,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
        source: 'working-memory-owner',
      }],
    })
    const invalidProposal = {
      ...proposal,
      [field]: value,
    } as unknown as typeof proposal

    await expect(participant.settleWrite({
      proposal: invalidProposal,
      status: 'completed',
      visibleReplyCommitted: true,
      enqueueItems: proposal.items,
      assistantText: '我会先说结论。',
    })).rejects.toThrow(`memory proposal ${field} is unsupported`)
    expect(appendEvent).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('rejects accepted enqueue items that differ from the proposal items', async () => {
    const appendEvent = vi.fn(async () => {})
    const enqueue = vi.fn(async () => ({
      ownerSettlements: [],
    }))
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent,
      enqueue,
    })
    const proposal = participant.prepareWrite({
      sessionId: 'session-1',
      items: [{
        id: 'queue-items',
        sourceTurnIds: ['turn-current:user'],
        kind: 'preference',
        summary: '用户喜欢先说结论。',
        reason: 'candidate:preference',
        evidenceSnippets: ['用户喜欢先说结论。'],
        salience: 0.8,
        confidence: 0.86,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
        source: 'working-memory-owner',
      }],
    })
    const enqueueItems = structuredClone(proposal.items)
    enqueueItems[0].summary = '被替换的候选。'

    await expect(participant.settleWrite({
      proposal,
      status: 'completed',
      visibleReplyCommitted: true,
      enqueueItems,
      assistantText: '我会先说结论。',
    })).rejects.toThrow('memory settlement enqueueItems must match proposal items')
    expect(appendEvent).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('records each memory owner settlement and marks partial persistence explicitly', async () => {
    const events: Array<{
      eventType: string
      payload: unknown
    }> = []
    const enqueue = vi.fn(async () => ({
      ownerSettlements: [
        {
          owner: 'working-memory-checkpoint',
          status: 'succeeded' as const,
        },
        {
          owner: 'long-term-memory-queue',
          status: 'failed' as const,
          errorSummary: 'queue write failed',
        },
        {
          owner: 'persona-learning',
          status: 'skipped' as const,
          reason: 'owner-unavailable',
        },
      ],
    }))
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent: vi.fn(async (event) => {
        events.push(event)
      }),
      enqueue,
    })
    const proposal = participant.prepareWrite({
      sessionId: 'session-1',
      items: [{
        id: 'queue-final',
        sourceTurnIds: ['turn-final:user'],
        kind: 'preference',
        summary: '用户希望最终候选以成功回复为准。',
        reason: 'candidate:preference',
        evidenceSnippets: ['最终候选以成功回复为准。'],
        salience: 0.8,
        confidence: 0.86,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
        source: 'working-memory-owner',
      }],
    })

    await participant.settleWrite({
      proposal,
      status: 'completed',
      visibleReplyCommitted: true,
      enqueueItems: proposal.items,
      assistantText: '最终成功回复。',
    })

    const ownerEvents = events.filter(event => event.eventType === 'memory.owner.settled')
    expect(ownerEvents).toHaveLength(3)
    expect(ownerEvents.map(event => event.payload)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        owner: 'working-memory-checkpoint',
        status: 'succeeded',
      }),
      expect.objectContaining({
        owner: 'long-term-memory-queue',
        status: 'failed',
        errorSummary: 'queue write failed',
      }),
      expect.objectContaining({
        owner: 'persona-learning',
        status: 'skipped',
        reason: 'owner-unavailable',
      }),
    ]))
    expect(events.find(event => event.eventType === 'memory.write.accepted')?.payload)
      .toMatchObject({
        outcome: 'partial',
        itemCount: 1,
        sourceTurnIds: ['turn-final:user'],
      })
  })

  it('does not let memory event persistence failures escape into dialogue execution', async () => {
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent: vi.fn(async () => {
        throw new Error('event store unavailable')
      }),
    })

    await expect(participant.recordLongTermRecall({
      sessionId: 'session-1',
      status: 'empty',
      evidence: [],
      confidence: 0,
    })).resolves.toEqual({
      persisted: false,
      error: 'event store unavailable',
    })
  })

  it('does not execute a memory write when the proposal event is not durable', async () => {
    const enqueue = vi.fn(async () => ({
      ownerSettlements: [],
    }))
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent: vi.fn(async (event) => {
        if (event.eventType === 'memory.write.proposed')
          throw new Error('event store unavailable')
      }),
      enqueue,
    })
    const proposal = participant.prepareWrite({
      sessionId: 'session-1',
      items: [{
        id: 'queue-1',
        sourceTurnIds: ['turn-current:user'],
        kind: 'preference',
        summary: '用户喜欢先说结论。',
        reason: 'candidate:preference',
        evidenceSnippets: ['用户喜欢先说结论。'],
        salience: 0.8,
        confidence: 0.86,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
        source: 'working-memory-owner',
      }],
    })

    await expect(participant.settleWrite({
      proposal,
      status: 'completed',
      visibleReplyCommitted: true,
      enqueueItems: proposal.items,
      assistantText: '我会记住这个偏好。',
    })).resolves.toEqual({
      persisted: false,
      error: 'event store unavailable',
    })
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('turns an enqueue rejection into a memory rejection event without escaping', async () => {
    const events: Array<{
      eventType: string
      payload: any
    }> = []
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent: vi.fn(async (event) => {
        events.push(event)
      }),
      enqueue: vi.fn(async () => {
        throw new Error('long-term queue unavailable')
      }),
    })
    const proposal = participant.prepareWrite({
      sessionId: 'session-1',
      items: [{
        id: 'queue-enqueue-rejection',
        sourceTurnIds: ['turn-current:user'],
        kind: 'preference',
        summary: '用户喜欢先说结论。',
        reason: 'candidate:preference',
        evidenceSnippets: ['用户喜欢先说结论。'],
        salience: 0.8,
        confidence: 0.86,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
        source: 'working-memory-owner',
      }],
    })

    await expect(participant.settleWrite({
      proposal,
      status: 'completed',
      visibleReplyCommitted: true,
      enqueueItems: proposal.items,
      assistantText: '我会先说结论。',
    })).resolves.toEqual({
      persisted: true,
      error: null,
    })
    expect(events.map(event => event.eventType)).toEqual([
      'memory.write.proposed',
      'memory.write.rejected',
    ])
    expect(events[1]?.payload).toMatchObject({
      status: 'memory-write-persistence-failed',
      error: 'long-term queue unavailable',
    })
  })

  it('publishes only a partial accepted audit when an owner settlement event is not durable', async () => {
    const events: Array<{
      eventType: string
      payload: any
    }> = []
    const participant = createAlicizationMemoryParticipant({
      scope: createScope(),
      appendEvent: vi.fn(async (event) => {
        if (
          event.eventType === 'memory.owner.settled'
          && (event.payload as any).owner === 'long-term-memory-queue'
        ) {
          throw new Error('owner settlement event store unavailable')
        }
        events.push(event)
      }),
      enqueue: vi.fn(async () => ({
        ownerSettlements: [
          {
            owner: 'working-memory-checkpoint',
            status: 'succeeded' as const,
          },
          {
            owner: 'long-term-memory-queue',
            status: 'succeeded' as const,
          },
        ],
      })),
    })
    const proposal = participant.prepareWrite({
      sessionId: 'session-1',
      items: [{
        id: 'queue-1',
        sourceTurnIds: ['turn-current:user'],
        kind: 'preference',
        summary: '用户喜欢先说结论。',
        reason: 'candidate:preference',
        evidenceSnippets: ['用户喜欢先说结论。'],
        salience: 0.8,
        confidence: 0.86,
        sensitivity: 'personal',
        allowTraining: false,
        status: 'pending-cleaning',
        rejectionReasons: [],
        contaminationFlags: [],
        createdAt: 100,
        source: 'working-memory-owner',
      }],
    })

    await participant.settleWrite({
      proposal,
      status: 'completed',
      visibleReplyCommitted: true,
      enqueueItems: proposal.items,
      assistantText: '我会先说结论。',
    })

    expect(events.find(event => event.eventType === 'memory.write.accepted')?.payload)
      .toMatchObject({
        outcome: 'partial',
        settlementEventFailureCount: 1,
        unpersistedOwnerSettlements: [
          expect.objectContaining({
            owner: 'long-term-memory-queue',
            status: 'succeeded',
            persistenceError: 'owner settlement event store unavailable',
          }),
        ],
      })
  })
})
