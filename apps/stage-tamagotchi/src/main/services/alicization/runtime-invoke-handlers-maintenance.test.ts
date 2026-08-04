import { describe, expect, it, vi } from 'vitest'

import {
  electronAlicizationLlmSyncConfig,
} from '../../../shared/eventa'
import { registerAlicizationMaintenanceInvokeHandlers } from './runtime-invoke-handlers-maintenance'

describe('alicization maintenance invoke handlers', () => {
  it('persists provider config before resuming pending embedding reindex jobs', async () => {
    const handlers = new Map<unknown, (...args: any[]) => Promise<unknown>>()
    const calls: string[] = []
    registerAlicizationMaintenanceInvokeHandlers({
      registerInvokeHandler: (channel, handler) => handlers.set(channel, handler),
      withCardScope: async (_cardId, task) => await task(),
      cardIdFrom: () => 'default',
      getActiveCardId: () => 'default',
      getAlicizationDb: () => ({ appendAuditLog: vi.fn() }),
      appendAuditLog: vi.fn(),
      executeBuiltinRealtimeQuery: vi.fn(),
      defaultAlicizationCardId: 'default',
      normalizeCardId: raw => String(raw ?? 'default'),
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
      deleteAllAlicizationData: vi.fn(),
      ensureSubconsciousState: vi.fn(),
      runSubconsciousTickAcrossCards: vi.fn(),
      runDreamAcrossCards: vi.fn(),
      sanitizeText: raw => typeof raw === 'string' ? raw.trim() : '',
      normalizeProviderCredentialsMap: raw => raw as Record<string, Record<string, unknown>>,
      setActiveProviderId: vi.fn(),
      setActiveModelId: vi.fn(),
      setProviderCredentials: vi.fn(),
      persistLlmConfigToDisk: vi.fn(async () => {
        calls.push('persist')
      }),
      resumePendingEmbeddingReindexJobs: vi.fn(async () => {
        calls.push('resume')
      }),
      getActiveProviderId: () => '',
      getActiveModelId: () => '',
      getProviderCredentials: () => ({}),
    })

    await handlers.get(electronAlicizationLlmSyncConfig)!({
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

    expect(calls).toEqual(['persist', 'resume'])
  })
})
