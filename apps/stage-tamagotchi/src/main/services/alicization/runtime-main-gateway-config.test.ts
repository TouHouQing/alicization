import { describe, expect, it, vi } from 'vitest'

import { syncAlicizationMainChatLlmRoute } from './main-chat-llm-route-sync'
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

  it('routes ordinary dialogue through an active Persona runtime', () => {
    const runtime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => 'cloud-provider',
      getActiveModelId: () => 'cloud-model',
      getProviderCredentials: () => ({}),
      getPersonaRuntimeRoute: () => ({
        providerId: 'llama.cpp-persona',
        model: 'alicization-persona',
        baseUrl: 'http://127.0.0.1:18181/v1',
      }),
    })

    const resolved = runtime.resolveMainGatewayConfig({
      cardId: 'card-a',
    })

    expect(resolved?.providerId).toBe('llama.cpp-persona')
    expect(resolved?.model).toBe('alicization-persona')
    expect(resolved?.baseUrl).toBe('http://127.0.0.1:18181/v1/')
  })

  it('keeps an explicit route authoritative over the active Persona runtime', () => {
    const runtime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => 'cloud-provider',
      getActiveModelId: () => 'cloud-model',
      getProviderCredentials: () => ({}),
      getPersonaRuntimeRoute: () => ({
        providerId: 'llama.cpp-persona',
        model: 'alicization-persona',
        baseUrl: 'http://127.0.0.1:18181/v1',
      }),
    })

    const resolved = runtime.resolveMainGatewayConfig({
      providerId: 'explicit-cloud-provider',
      model: 'explicit-cloud-model',
      providerConfig: {
        baseUrl: 'https://example.test/v1',
      },
    })

    expect(resolved?.providerId).toBe('explicit-cloud-provider')
    expect(resolved?.model).toBe('explicit-cloud-model')
    expect(resolved?.baseUrl).toBe('https://example.test/v1/')
  })

  it('keeps Persona overlay routing stable across renderer route synchronization', async () => {
    let activeProviderId = 'cloud-provider'
    let activeModelId = 'cloud-model'
    const runtime = createAlicizationMainGatewayConfigRuntime({
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      getActiveProviderId: () => activeProviderId,
      getActiveModelId: () => activeModelId,
      getProviderCredentials: () => ({}),
      getPersonaRuntimeRoute: () => ({
        providerId: 'llama.cpp-persona',
        model: 'alicization-persona',
        baseUrl: 'http://127.0.0.1:18181/v1',
      }),
    })

    const first = runtime.resolveMainGatewayConfig({
      providerId: activeProviderId,
      model: activeModelId,
    })
    expect(first?.providerId).toBe('llama.cpp-persona')

    await syncAlicizationMainChatLlmRoute({
      mainGateway: first!,
      providerConfig: {},
      normalizeProviderConfig: vi.fn(() => ({})),
      getProviderCredentials: () => ({}),
      getActiveProviderId: () => activeProviderId,
      getActiveModelId: () => activeModelId,
      setProviderCredentials: vi.fn(),
      setActiveProviderId: value => activeProviderId = value,
      setActiveModelId: value => activeModelId = value,
    })

    const second = runtime.resolveMainGatewayConfig({
      providerId: activeProviderId,
      model: activeModelId,
    })
    expect(activeProviderId).toBe('cloud-provider')
    expect(activeModelId).toBe('cloud-model')
    expect(second?.providerId).toBe('llama.cpp-persona')
    expect(second?.model).toBe('alicization-persona')
  })
})
