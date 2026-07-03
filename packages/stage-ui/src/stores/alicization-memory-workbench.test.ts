import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationMemoryWorkbenchStore } from './alicization-memory-workbench'

describe('alicization memory workbench store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
  })

  it('stays empty when bridge is unavailable', async () => {
    const store = useAlicizationMemoryWorkbenchStore()

    await store.refreshSnapshot()

    expect(store.snapshot).toBeNull()
    expect(store.lastError).toBeNull()
  })

  it('loads snapshot and recall probe through bridge', async () => {
    setAlicizationBridge({
      memoryWorkbenchGetSnapshot: vi.fn(async () => ({
        cardId: 'default',
        sessionId: null,
        updatedAt: 1,
        workingMemory: null,
        longTerm: {
          total: 0,
          byKind: {},
          items: [],
        },
        review: {
          pending: 0,
          items: [],
        },
        health: {
          status: 'ok',
          queue: { pending: 0, review: 0, applied: 0, failed: 0, deadLettered: 0 },
          recall: { lastLatencyMs: null, p95LatencyMs: null, lastError: null },
          embedding: { providerConfigured: false, modelId: null, dimensions: null, reindexRequired: false },
          errors: [],
        },
      })),
      memoryWorkbenchRecallProbe: vi.fn(async payload => ({
        query: payload.query,
        intent: {
          mode: 'episodic',
          shouldRecall: true,
          confidence: 0.8,
          rationale: 'shared memory cue',
          temporalFocus: 'unspecified',
          riskFlags: [],
        },
        plan: {
          keywordQueries: [payload.query],
          phraseQueries: ['打游戏'],
          charGramQueries: ['游戏'],
          semanticQueries: [],
          episodicQueries: [],
          threadHints: [],
          negativeCues: [],
          confidencePolicy: 'direct',
        },
        evidence: [],
        latencyMs: 1,
        errors: [],
      })),
      bootstrap: vi.fn(),
      getSoul: vi.fn(),
      initializeGenesis: vi.fn(),
      updateSoul: vi.fn(),
      updatePersonality: vi.fn(),
      getKillSwitchState: vi.fn(),
      suspendKillSwitch: vi.fn(),
      resumeKillSwitch: vi.fn(),
      getMemoryStats: vi.fn(),
      runMemoryPrune: vi.fn(),
      updateMemoryStats: vi.fn(),
      retrieveMemoryFacts: vi.fn(),
      upsertMemoryFacts: vi.fn(),
      importLegacyMemory: vi.fn(),
      appendConversationTurn: vi.fn(),
      appendAuditLog: vi.fn(),
      realtimeExecute: vi.fn(),
      getSensorySnapshot: vi.fn(),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshSnapshot()
    await store.runRecallProbe('我们去打游戏吧')

    expect(store.snapshot?.health.status).toBe('ok')
    expect(store.recallProbe?.intent.mode).toBe('episodic')
  })
})
