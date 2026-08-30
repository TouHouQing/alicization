import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMemoryEpisodicReconsolidationRuntime } from './memory-episodic-reconsolidation-runtime'

describe('memory episodic reconsolidation runtime', () => {
  it('persists recalled episodic events through one transaction', async () => {
    const run = vi.fn(async () => ({}))
    const enqueueWrite = async <T>(task: () => Promise<T>): Promise<T> => await task()
    const runtime = createAlicizationMemoryEpisodicReconsolidationRuntime({
      database: {} as never,
      run,
      enqueueWrite,
      runInTransaction: async (_database, task) => await task(),
    })

    await runtime.persistRecalledEvents([
      {
        id: 'episode-1',
        confidence: 0.84,
        emotionTags: ['focused'],
        relationshipMeaning: 'Return to the same seam before branching.',
        lesson: 'Keep the seam coherent.',
        updatedAt: 10,
        lastRecalledAt: 10,
        recallCount: 2,
        reconsolidationCount: 1,
        latestReconsolidation: {
          at: 10,
          decisionTraceId: 'trace-1',
          provenance: 'reconstructed',
          confidence: 0.84,
          reason: 'Recall re-bound the seam.',
          emotionTags: ['focused'],
          relationshipMeaning: 'Return to the same seam before branching.',
          lesson: 'Keep the seam coherent.',
        },
      } as any,
    ])

    expect(run).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('INSERT INTO episodic_reconsolidation_overlays'), expect.any(Array))
    expect(run).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('UPDATE episodic_events'), expect.any(Array))
  })

  it('reconciles ranked candidates and persists the returned reconsolidated events', async () => {
    const run = vi.fn(async () => ({}))
    const enqueueWrite = async <T>(task: () => Promise<T>): Promise<T> => await task()
    const runtime = createAlicizationMemoryEpisodicReconsolidationRuntime({
      database: {} as never,
      run,
      enqueueWrite,
      runInTransaction: async (_database, task) => await task(),
    })

    const returned = await runtime.reconcileSelectedEvents({
      selected: [
        {
          event: {
            id: 'episode-1',
            cardId: 'default',
            decisionTraceId: null,
            turnId: 'turn-1',
            sessionId: 'session-1',
            sourceKind: 'execution-result',
            provenance: 'observed',
            occurredAt: 1,
            whereSummary: 'terminal',
            withWhom: ['host'],
            threadAnchor: 'runtime seam',
            whatHappened: 'We repaired the runtime seam.',
            felt: 'focused',
            emotionTags: ['focused'],
            whatChanged: 'The seam stabilized.',
            relationshipMeaning: 'Stay on the same seam.',
            lesson: 'Return to the seam before branching.',
            sourceSummary: 'runtime repair',
            confidence: 0.82,
            salience: 0.8,
            sceneAttachment: 0.7,
            consolidationPriority: 0.6,
            relationshipShift: null,
            derivedFrom: [],
            tags: ['runtime seam'],
            createdAt: 1,
            updatedAt: 1,
            lastRecalledAt: null,
            recallCount: 0,
            reconsolidationCount: 0,
            latestReconsolidation: null,
            memoryTier: 'warm',
          },
          score: 0.92,
          adjustedScore: 0.9,
          affectScore: 0.2,
          relationshipScore: 0.18,
          falseMemoryRisk: false,
          interferencePenalty: 0,
          contradictionSignal: {
            conflictingIds: [],
            penalty: 0,
            unresolved: false,
            reason: '',
          },
        },
      ],
      recalledAt: 20,
      affectAnchors: ['focused'],
      relationshipAnchors: ['same seam'],
      carryAsMemory: true,
      correctionShapingRationale: 'The same seam is live again.',
      reconsolidationDecisionTraceId: 'trace-1',
    })

    expect(returned).toHaveLength(1)
    expect(returned[0]?.reconsolidationCount).toBe(1)
    expect(returned[0]?.latestReconsolidation?.decisionTraceId).toBe('trace-1')
    expect(run).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('INSERT INTO episodic_reconsolidation_overlays'), expect.any(Array))
    expect(run).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('UPDATE episodic_events'), expect.any(Array))
  })

  it('serializes reconsolidation writes through the host database write queue', async () => {
    const run = vi.fn(async () => ({}))
    const enqueueWrite = vi.fn(<T>(task: () => Promise<T>): Promise<T> => task())
    const runtime = createAlicizationMemoryEpisodicReconsolidationRuntime({
      database: {} as never,
      run,
      enqueueWrite: enqueueWrite as unknown as <T>(task: () => Promise<T>) => Promise<T>,
      runInTransaction: async (_database, task) => await task(),
    })

    await runtime.persistRecalledEvents([{
      id: 'episode-queued',
      confidence: 0.8,
      emotionTags: [],
      relationshipMeaning: null,
      lesson: null,
      updatedAt: 10,
      lastRecalledAt: 10,
      recallCount: 1,
      reconsolidationCount: 0,
      latestReconsolidation: null,
    } as any])

    expect(enqueueWrite).toHaveBeenCalledOnce()
  })
})
