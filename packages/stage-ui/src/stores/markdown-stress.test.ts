import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useMarkdownStressStore } from './markdown-stress'

const activeProvider = ref('mock-provider')
const activeModel = ref('mock-model')
const ingestMock = vi.fn()
const getProviderInstanceMock = vi.fn(async () => ({ chat: () => ({}) }))
const getProviderConfigMock = vi.fn(() => ({ apiKey: 'test-key' }))
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

vi.mock('./chat', () => ({
  useChatOrchestratorStore: () => ({
    ingest: ingestMock,
  }),
}))

vi.mock('./llm', () => ({
  useLLM: () => ({
    stream: vi.fn(),
  }),
}))

vi.mock('./modules/consciousness', () => ({
  useConsciousnessStore: () => ({
    activeProvider,
    activeModel,
  }),
}))

vi.mock('./providers', () => ({
  useProvidersStore: () => ({
    getProviderInstance: getProviderInstanceMock,
    getProviderConfig: getProviderConfigMock,
  }),
}))

vi.mock('./perf-tracer-bridge', () => ({
  usePerfTracerBridgeStore: () => ({
    requestEnable: vi.fn(),
    requestDisable: vi.fn(),
  }),
}))

describe('markdown stress store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    activeProvider.value = 'mock-provider'
    activeModel.value = 'mock-model'
    ingestMock.mockReset()
    getProviderInstanceMock.mockClear()
    getProviderConfigMock.mockClear()
    consoleErrorSpy.mockClear()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('sends markdown stress dialogue through the configured provider', async () => {
    const store = useMarkdownStressStore()
    store.scheduleDelayMs = 0
    store.isMock = false

    await store.scheduleRun()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(ingestMock).toHaveBeenCalled()
    expect(ingestMock.mock.calls[0]?.[0]).toContain('Give me a huge stress-test JavaScript block')
    expect(ingestMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      providerId: 'mock-provider',
      model: 'mock-model',
      providerConfig: { apiKey: 'test-key' },
      origin: 'system',
    }))
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
