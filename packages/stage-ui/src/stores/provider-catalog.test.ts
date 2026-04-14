import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { providerOpenAICompatible } from '../libs/providers/providers/openai-compatible'
import { useProviderCatalogStore } from './provider-catalog'

const providersStoreMock = {
  providerMetadata: {
    [providerOpenAICompatible.id]: { id: providerOpenAICompatible.id },
  } as Record<string, { id: string }>,
  providers: {} as Record<string, Record<string, unknown>>,
  markProviderAdded: vi.fn(),
  forceProviderConfigured: vi.fn(),
  validateProvider: vi.fn(async () => true),
  deleteProvider: vi.fn(),
}

vi.mock('../database/repos/providers.repo', () => ({
  providersRepo: {
    getAll: vi.fn(async () => ({})),
    saveAll: vi.fn(async () => {}),
    upsert: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  },
}))

vi.mock('../composables/api', () => ({
  client: {
    api: {
      providers: {
        '$get': vi.fn(async () => ({ ok: true, json: async () => [] })),
        '$post': vi.fn(async () => ({ ok: true, json: async () => ({ id: 'real-id', definitionId: 'openai-compatible', name: 'OpenAI Compatible', config: {}, validated: false, validationBypassed: false }) })),
        ':id': {
          $delete: vi.fn(async () => ({ ok: true })),
          $patch: vi.fn(async () => ({ ok: true, json: async () => ({}) })),
        },
      },
    },
  },
}))

vi.mock('./providers', () => ({
  useProvidersStore: () => providersStoreMock,
}))

describe('store provider-catalog', () => {
  beforeEach(() => {
    // creates a fresh pinia and makes it active
    // so it's automatically picked up by any useStore() call
    // without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
    providersStoreMock.providers = {}
    providersStoreMock.markProviderAdded.mockClear()
    providersStoreMock.forceProviderConfigured.mockClear()
    providersStoreMock.validateProvider.mockClear()
    providersStoreMock.deleteProvider.mockClear()
  })

  it('add', async () => {
    const store = useProviderCatalogStore()
    await store.addProvider(providerOpenAICompatible.id)

    expect(Object.values(store.configs)).toHaveLength(1)
    expect(Object.values(store.configs)[0].id).toBeDefined()
    expect(Object.values(store.configs)[0].definitionId).toBe(providerOpenAICompatible.id)
    expect(Object.values(store.configs)[0].name).toBe('OpenAI Compatible')
    expect(Object.values(store.configs)[0].config).toStrictEqual({})
    expect(providersStoreMock.providers[providerOpenAICompatible.id]).toStrictEqual({})
    expect(providersStoreMock.markProviderAdded).toHaveBeenCalledWith(providerOpenAICompatible.id)
    expect(providersStoreMock.validateProvider).toHaveBeenCalledWith(providerOpenAICompatible.id, { force: true })
  })

  it('remove', async () => {
    const store = useProviderCatalogStore()
    await store.addProvider(providerOpenAICompatible.id)

    const providerId = Object.keys(store.configs)[0]
    await store.removeProvider(providerId)

    expect(Object.values(store.configs)).toHaveLength(0)
    expect(providersStoreMock.deleteProvider).toHaveBeenCalledWith(providerOpenAICompatible.id)
  })

  it('force marks provider as configured when validation is bypassed', async () => {
    const store = useProviderCatalogStore()
    await store.addProvider(providerOpenAICompatible.id)
    const providerId = Object.keys(store.configs)[0]

    providersStoreMock.forceProviderConfigured.mockClear()
    providersStoreMock.validateProvider.mockClear()
    await store.commitProviderConfig(providerId, { apiKey: 'token' }, {
      validated: false,
      validationBypassed: true,
    })

    expect(providersStoreMock.forceProviderConfigured).toHaveBeenCalledWith(providerOpenAICompatible.id)
    expect(providersStoreMock.validateProvider).not.toHaveBeenCalled()
  })
})
