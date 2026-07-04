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

  it('resets long-term cursor when filters change and appends when loading more', async () => {
    const firstItem = {
      id: 'memory-a',
      kind: 'reflection',
      summary: '用户想打游戏放松。',
      evidenceSnippets: [],
      sourceIds: ['memory-a'],
      confidence: 0.8,
      salience: 0.7,
      sensitivity: 'personal',
      visibility: 'explicit',
      training: 'blocked',
      source: 'memory_reflections',
      createdAt: 1,
      updatedAt: 2,
      lastAccessedAt: null,
      tombstoned: false,
    } as const
    const secondItem = {
      ...firstItem,
      id: 'memory-b',
      sourceIds: ['memory-b'],
      summary: '用户喜欢自然回复。',
    } as const
    const memoryWorkbenchListLongTerm = vi.fn()
      .mockResolvedValueOnce({ items: [firstItem], nextCursor: 'cursor-a' })
      .mockResolvedValueOnce({ items: [secondItem], nextCursor: null })

    setAlicizationBridge({
      memoryWorkbenchListLongTerm,
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshLongTerm({ query: '游戏' })
    expect(store.longTermItems.map(item => item.id)).toEqual(['memory-a'])
    expect(store.longTermNextCursor).toBe('cursor-a')

    await store.loadMoreLongTerm()
    expect(store.longTermItems.map(item => item.id)).toEqual(['memory-a', 'memory-b'])
    expect(memoryWorkbenchListLongTerm).toHaveBeenLastCalledWith(expect.objectContaining({
      cursor: 'cursor-a',
      query: '游戏',
    }))
  })

  it('loads persona candidates and records embedding reindex result', async () => {
    const candidate = {
      id: 'persona-candidate:reflection-1',
      sourceMemoryIds: ['reflection-1'],
      behaviorLesson: '不要用固定模板遮盖失败。',
      positiveExample: '我会直接说明 provider 失败。',
      negativeExample: '不要套固定安抚模板。',
      privacyClass: 'personal-redacted',
      status: 'candidate',
      allowTraining: false,
      rejectionReason: null,
      createdAt: 1,
      updatedAt: 1,
    } as const
    setAlicizationBridge({
      memoryWorkbenchListPersonaCandidates: vi.fn(async () => ({ items: [candidate], nextCursor: null })),
      memoryWorkbenchApplyPersonaCandidateAction: vi.fn(async () => ({
        ...candidate,
        status: 'no-training',
        rejectionReason: 'user blocked',
        updatedAt: 2,
      })),
      memoryWorkbenchReindexEmbeddings: vi.fn(async () => ({
        scheduled: 1,
        indexed: 1,
        failed: 0,
        modelId: 'local',
        dimensions: 3,
        errors: [],
      })),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshPersonaCandidates()
    expect(store.personaCandidates.map(item => item.id)).toEqual(['persona-candidate:reflection-1'])

    await store.applyPersonaCandidateAction('persona-candidate:reflection-1', 'no-training')
    expect(store.personaCandidates[0]?.status).toBe('no-training')

    await store.reindexEmbeddings()
    expect(store.reindexResult?.indexed).toBe(1)
  })
})
