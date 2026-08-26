import { describe, expect, it, vi } from 'vitest'

import {
  electronAlicizationDeleteCardScope,
  electronAlicizationLlmSyncConfig,
} from '../../../shared/eventa'
import { registerAlicizationMaintenanceInvokeHandlers } from './runtime-invoke-handlers-maintenance'

function createHarness(input?: {
  persistLlmConfigToDisk?: (payload: unknown) => Promise<void>
  resolveEmbeddingVectorSpaceIdForConfig?: (payload: unknown) => string | null
  startEmbeddingReindexForActiveCard?: (...args: any[]) => Promise<void>
  resumePendingEmbeddingReindexJobs?: (...args: any[]) => Promise<void>
  activeCardId?: string
  vectorSpaceIds?: Array<string | null>
}) {
  const handlers = new Map<unknown, (...args: any[]) => Promise<unknown>>()
  const calls: string[] = []
  const setActiveProviderId = vi.fn()
  const setActiveModelId = vi.fn()
  const setProviderCredentials = vi.fn()
  const persistLlmConfigToDisk = vi.fn(input?.persistLlmConfigToDisk ?? (async () => {
    calls.push('persist')
  }))
  const resumePendingEmbeddingReindexJobs = vi.fn(input?.resumePendingEmbeddingReindexJobs ?? (async () => {
    calls.push('resume')
  }))
  const appendAuditLog = vi.fn(async () => {})
  const startEmbeddingReindexForActiveCard = vi.fn(input?.startEmbeddingReindexForActiveCard ?? (async () => {
    calls.push('reindex')
  }))
  const deleteCardScopeData = vi.fn(async () => {})
  const vectorSpaceIds = [...(input?.vectorSpaceIds ?? ['space-a', 'space-a'])]

  let activeCardId = input?.activeCardId ?? 'default'
  const firstDb = { id: 'db-default' }
  registerAlicizationMaintenanceInvokeHandlers({
    registerInvokeHandler: (channel: unknown, handler: (...args: any[]) => Promise<unknown>) => handlers.set(channel, handler),
    withCardScope: async (_cardId: unknown, task: () => Promise<unknown>) => await task(),
    cardIdFrom: (scope?: { cardId?: unknown }) => String(scope?.cardId ?? 'default'),
    getActiveCardId: () => activeCardId,
    getAlicizationDb: () => firstDb,
    appendAuditLog,
    executeBuiltinRealtimeQuery: vi.fn(),
    defaultAlicizationCardId: 'default',
    normalizeCardId: (raw: unknown) => String(raw ?? 'default'),
    switchCardScope: vi.fn(),
    resolveCardPaths: () => ({ soulRoot: '/tmp/alicization-card' }),
    rm: vi.fn(),
    proactiveLoopStateByCard: new Map(),
    perceptionStateByCard: new Map(),
    visualPresenceStateByCard: new Map(),
    visualPresenceCapturePersistMetaByCard: new Map(),
    emitVisualPresenceState: vi.fn(),
    screenSemanticCacheByCard: new Map(),
    subconsciousStateByCard: new Map(),
    activeSessionIdByCard: new Map(),
    clearDialogueDeliveryCardState: vi.fn(),
    clearDialogueSessionMirrorCard: vi.fn(),
    clearExecutionDeliveryStateMemory: vi.fn(),
    bootstrap: vi.fn(),
    deleteCardScopeData,
    deleteAllAlicizationData: vi.fn(),
    ensureSubconsciousState: vi.fn(),
    runSubconsciousTickAcrossCards: vi.fn(),
    runDreamAcrossCards: vi.fn(),
    sanitizeText: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
    normalizeProviderCredentialsMap: (raw: unknown) => raw as Record<string, Record<string, unknown>>,
    setActiveProviderId,
    setActiveModelId,
    setProviderCredentials,
    persistLlmConfigToDisk,
    resumePendingEmbeddingReindexJobs,
    getEmbeddingVectorSpaceId: () => vectorSpaceIds.shift() ?? null,
    resolveEmbeddingVectorSpaceIdForConfig: input?.resolveEmbeddingVectorSpaceIdForConfig ?? (() => vectorSpaceIds[0] ?? null),
    startEmbeddingReindexForActiveCard,
    getActiveProviderId: () => 'old-provider',
    getActiveModelId: () => 'old-model',
    getProviderCredentials: () => ({
      __alicizationMemoryEmbedding: {
        model: 'old-embedding',
      },
    }),
  } as any)

  return {
    appendAuditLog,
    calls,
    deleteCardScopeData,
    handlers,
    persistLlmConfigToDisk,
    resumePendingEmbeddingReindexJobs,
    setActiveModelId,
    setActiveProviderId,
    setProviderCredentials,
    startEmbeddingReindexForActiveCard,
    setActiveCardId: (value: string) => activeCardId = value,
    firstDb,
  }
}

describe('alicization maintenance invoke handlers', () => {
  it('routes card deletion through the lifecycle owner', async () => {
    const harness = createHarness()

    await harness.handlers.get(electronAlicizationDeleteCardScope)!({
      cardId: 'card-a',
    })

    expect(harness.deleteCardScopeData).toHaveBeenCalledWith('card-a', 'renderer')
  })

  it('persists provider config before resuming pending embedding reindex jobs', async () => {
    const harness = createHarness()

    await harness.handlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai-compatible',
      activeModelId: 'chat-model',
      providerCredentials: {
        __alicizationMemoryEmbedding: {
          baseUrl: 'https://api.example.test',
          apiKey: 'secret',
          model: 'embedding-model',
          dimensions: 3,
        },
      },
    })

    expect(harness.calls).toEqual(['persist', 'resume'])
    expect(harness.persistLlmConfigToDisk).toHaveBeenCalledWith({
      activeProviderId: 'openai-compatible',
      activeModelId: 'chat-model',
      providerCredentials: {
        __alicizationMemoryEmbedding: {
          baseUrl: 'https://api.example.test',
          apiKey: 'secret',
          model: 'embedding-model',
          dimensions: 3,
        },
      },
    })
  })

  it('does not mutate runtime config when durable persistence fails', async () => {
    const harness = createHarness({
      persistLlmConfigToDisk: async () => {
        throw new Error('disk full')
      },
    })

    await expect(harness.handlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai-compatible',
      activeModelId: 'chat-model',
      providerCredentials: {
        __alicizationMemoryEmbedding: {
          baseUrl: 'https://api.example.test',
          model: 'embedding-model',
          dimensions: 3,
        },
      },
    })).rejects.toThrow('disk full')

    expect(harness.setActiveProviderId).not.toHaveBeenCalled()
    expect(harness.setActiveModelId).not.toHaveBeenCalled()
    expect(harness.setProviderCredentials).not.toHaveBeenCalled()
    expect(harness.resumePendingEmbeddingReindexJobs).not.toHaveBeenCalled()
    expect(harness.startEmbeddingReindexForActiveCard).not.toHaveBeenCalled()
  })

  it('validates the next embedding vector space before persisting config', async () => {
    const harness = createHarness({
      resolveEmbeddingVectorSpaceIdForConfig: () => {
        throw new Error('Invalid URL')
      },
    })

    await expect(harness.handlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai-compatible',
      activeModelId: 'chat-model',
      providerCredentials: {
        __alicizationMemoryEmbedding: {
          baseUrl: 'not-a-url',
          model: 'embedding-model',
          dimensions: 3,
        },
      },
    })).rejects.toThrow('Invalid URL')

    expect(harness.persistLlmConfigToDisk).not.toHaveBeenCalled()
    expect(harness.setActiveProviderId).not.toHaveBeenCalled()
    expect(harness.setActiveModelId).not.toHaveBeenCalled()
    expect(harness.setProviderCredentials).not.toHaveBeenCalled()
  })

  it('starts a fresh embedding reindex when the persisted vector space changes', async () => {
    const harness = createHarness({
      vectorSpaceIds: ['space-a', 'space-b'],
    })

    await harness.handlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai-compatible',
      activeModelId: 'chat-model',
      providerCredentials: {
        __alicizationMemoryEmbedding: {
          baseUrl: 'https://api.example.test',
          model: 'embedding-model-b',
          dimensions: 4,
        },
      },
    })

    expect(harness.calls).toEqual(['persist', 'reindex', 'resume'])
    expect(harness.startEmbeddingReindexForActiveCard).toHaveBeenCalledTimes(1)
  })

  it('keeps a committed config successful when background reindex fails', async () => {
    const harness = createHarness({
      resolveEmbeddingVectorSpaceIdForConfig: () => 'space-b',
      startEmbeddingReindexForActiveCard: async () => {
        throw new Error('reindex queue unavailable')
      },
      vectorSpaceIds: ['space-a'],
    })

    await expect(harness.handlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai-compatible',
      activeModelId: 'chat-model',
      providerCredentials: {
        __alicizationMemoryEmbedding: {
          baseUrl: 'https://api.example.test',
          model: 'embedding-model-b',
          dimensions: 4,
        },
      },
    })).resolves.toBeUndefined()
    await vi.waitFor(() => {
      expect(harness.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'embedding-maintenance-failed',
        payload: expect.objectContaining({
          errors: expect.arrayContaining(['reindex: reindex queue unavailable']),
        }),
      }))
    })

    expect(harness.persistLlmConfigToDisk).toHaveBeenCalledTimes(1)
    expect(harness.setActiveProviderId).toHaveBeenCalledWith('openai-compatible')
    expect(harness.resumePendingEmbeddingReindexJobs).toHaveBeenCalledTimes(1)
  })

  it('binds background embedding maintenance to the card and database captured at config save time', async () => {
    const scopes: Array<{ cardId: string, db: unknown }> = []
    const harness = createHarness({
      activeCardId: 'card-a',
      startEmbeddingReindexForActiveCard: async (scope: { cardId: string, database: unknown }) => {
        scopes.push({ cardId: scope.cardId, db: scope.database })
      },
      resumePendingEmbeddingReindexJobs: async (scope: { cardId: string, database: unknown }) => {
        scopes.push({ cardId: scope.cardId, db: scope.database })
      },
      vectorSpaceIds: ['space-a', 'space-b'],
    })

    await harness.handlers.get(electronAlicizationLlmSyncConfig)!({
      activeProviderId: 'openai-compatible',
      activeModelId: 'chat-model',
      providerCredentials: {
        __alicizationMemoryEmbedding: {
          baseUrl: 'https://api.example.test',
          model: 'embedding-model-b',
          dimensions: 4,
        },
      },
    })
    harness.setActiveCardId('card-b')

    await vi.waitFor(() => expect(scopes).toHaveLength(2))
    expect(scopes).toEqual([
      { cardId: 'card-a', db: harness.firstDb },
      { cardId: 'card-a', db: harness.firstDb },
    ])
  })
})
