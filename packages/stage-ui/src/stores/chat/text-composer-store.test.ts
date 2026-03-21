import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useChatTextComposerStore } from './text-composer-store'

const activeProvider = ref('mock-provider')
const activeModel = ref('mock-model')
const sending = ref(false)
const messages = ref<any[]>([])
const ingestMock = vi.fn()
const getProviderConfigMock = vi.fn(() => ({ apiKey: 'test-key' }))
const getProviderInstanceMock = vi.fn(async () => ({ chat: () => ({}) }))

vi.mock('../chat', () => ({
  useChatOrchestratorStore: () => ({
    sending,
    ingest: ingestMock,
  }),
}))

vi.mock('../modules/consciousness', () => ({
  useConsciousnessStore: () => ({
    activeProvider,
    activeModel,
  }),
}))

vi.mock('../providers', () => ({
  useProvidersStore: () => ({
    getProviderConfig: getProviderConfigMock,
    getProviderInstance: getProviderInstanceMock,
  }),
}))

vi.mock('./session-store', () => ({
  useChatSessionStore: () => ({
    messages,
  }),
}))

describe('chat text composer manual abort handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    activeProvider.value = 'mock-provider'
    activeModel.value = 'mock-model'
    sending.value = false
    messages.value = []
    ingestMock.mockReset()
    getProviderConfigMock.mockClear()
    getProviderInstanceMock.mockClear()
  })

  it('does not append an error bubble when the current Alicization turn is manually aborted', async () => {
    ingestMock.mockRejectedValueOnce(new Error('Alicization turn aborted (manual)'))

    const store = useChatTextComposerStore()
    store.setDraft('重新看看我屏幕')

    await expect(store.sendCurrentMessage()).resolves.toBe(false)

    expect(store.draft).toBe('')
    expect(messages.value).toEqual([])
  })

  it('still restores the draft and appends an error for real send failures', async () => {
    ingestMock.mockRejectedValueOnce(new Error('network exploded'))

    const store = useChatTextComposerStore()
    store.setDraft('帮我看看这个 diff')

    await expect(store.sendCurrentMessage()).resolves.toBe(false)

    expect(store.draft).toBe('帮我看看这个 diff')
    expect(messages.value).toEqual([{
      role: 'error',
      content: 'network exploded',
    }])
  })
})
