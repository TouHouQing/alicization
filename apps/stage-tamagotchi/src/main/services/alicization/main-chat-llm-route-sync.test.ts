import { describe, expect, it, vi } from 'vitest'

import { syncAlicizationMainChatLlmRoute } from './main-chat-llm-route-sync'

function createInput(overrides?: Partial<Parameters<typeof syncAlicizationMainChatLlmRoute>[0]>) {
  const providerCredentials = {
    openai: {
      apiKey: 'old-key',
    },
  }

  return {
    mainGateway: {
      providerId: 'openai',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1/',
      probeHeaders: {
        Authorization: 'Bearer new-key',
      },
      provider: {} as never,
    },
    providerConfig: {
      apiKey: 'new-key',
      baseUrl: 'https://api.openai.com/v1',
    },
    normalizeProviderConfig: vi.fn((value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {}),
    getProviderCredentials: vi.fn(() => providerCredentials),
    setProviderCredentials: vi.fn(),
    setActiveProviderId: vi.fn(),
    setActiveModelId: vi.fn(),
    persistLlmConfigToDisk: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('main chat llm route sync', () => {
  it('updates the active route and merges provider credentials', async () => {
    const input = createInput()

    const result = await syncAlicizationMainChatLlmRoute(input)

    expect(input.setActiveProviderId).toHaveBeenCalledWith('openai')
    expect(input.setActiveModelId).toHaveBeenCalledWith('gpt-4o-mini')
    expect(input.setProviderCredentials).toHaveBeenCalledWith({
      openai: {
        apiKey: 'new-key',
        baseUrl: 'https://api.openai.com/v1',
      },
    })
    expect(input.persistLlmConfigToDisk).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      persistedConfigKeys: ['apiKey', 'baseUrl'],
    })
  })

  it('keeps existing credentials when the payload config is empty', async () => {
    const input = createInput({
      providerConfig: {},
    })

    const result = await syncAlicizationMainChatLlmRoute(input)

    expect(input.setProviderCredentials).not.toHaveBeenCalled()
    expect(result).toEqual({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4o-mini',
      persistedConfigKeys: ['apiKey'],
    })
  })
})
