import { describe, expect, it } from 'vitest'

import { createAlicizationMainGatewayConfigRuntime } from './runtime-main-gateway-config'

describe('runtime-main-gateway-config', () => {
  it('resolves from remembered card route when global active route is empty', () => {
    let activeProviderId = ''
    let activeModelId = ''
    let providerCredentials: Record<string, Record<string, unknown>> = {}

    const runtime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => activeProviderId,
      getActiveModelId: () => activeModelId,
      getProviderCredentials: () => providerCredentials,
    })

    runtime.rememberMainGatewayRoute({
      cardId: 'card-a',
      mainGateway: {
        providerId: 'openai-compatible',
        model: 'gpt-4.1-mini',
      },
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://example.test/v1/',
      },
    })

    const resolved = runtime.resolveMainGatewayConfig({
      cardId: 'card-a',
    })

    expect(resolved).not.toBeNull()
    expect(resolved?.providerId).toBe('openai-compatible')
    expect(resolved?.model).toBe('gpt-4.1-mini')
    expect(resolved?.baseUrl).toBe('https://example.test/v1/')

    activeProviderId = 'ignored'
    activeModelId = 'ignored'
    providerCredentials = {}
  })

  it('prefers explicit request route over remembered card route', () => {
    const runtime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => '',
      getActiveModelId: () => '',
      getProviderCredentials: () => ({}),
    })

    runtime.rememberMainGatewayRoute({
      cardId: 'card-a',
      mainGateway: {
        providerId: 'openai-compatible',
        model: 'old-model',
      },
      providerConfig: {
        apiKey: 'old-key',
        baseUrl: 'https://old.example.test/v1/',
      },
    })

    const resolved = runtime.resolveMainGatewayConfig({
      cardId: 'card-a',
      providerId: 'openrouter',
      model: 'gpt-5-mini',
      providerConfig: {
        apiKey: 'new-key',
        baseUrl: 'https://openrouter.ai/api/v1/',
      },
    })

    expect(resolved).not.toBeNull()
    expect(resolved?.providerId).toBe('openrouter')
    expect(resolved?.model).toBe('gpt-5-mini')
    expect(resolved?.baseUrl).toBe('https://openrouter.ai/api/v1/')
  })
})
