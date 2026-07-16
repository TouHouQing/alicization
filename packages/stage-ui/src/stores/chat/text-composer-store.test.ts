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

vi.mock('../alicization-self-evolution-inspector', () => ({
  useAlicizationSelfEvolutionInspectorStore: () => {
    throw new Error('text composer must not depend on renderer inspector state')
  },
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

function sentOptions() {
  return ingestMock.mock.calls[0]?.[1]
}

describe('chat text composer', () => {
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

  it('does not append an error bubble when the current turn is manually aborted', async () => {
    ingestMock.mockRejectedValueOnce(new Error('Alicization turn aborted (manual)'))

    const store = useChatTextComposerStore()
    store.setDraft('重新看看我屏幕')

    await expect(store.sendCurrentMessage()).resolves.toBe(false)

    expect(store.draft).toBe('')
    expect(messages.value).toEqual([])
  })

  it('restores the draft and reports real send failures', async () => {
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

  it('does not attach renderer-authored reply governance to ordinary dialogue', async () => {
    ingestMock.mockResolvedValueOnce(undefined)

    const store = useChatTextComposerStore()
    store.setDraft('今天好累')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expect(ingestMock).toHaveBeenCalledWith('今天好累', expect.objectContaining({
      providerId: 'mock-provider',
      model: 'mock-model',
    }))
    expect(sentOptions()).not.toHaveProperty('preDialogueSendIdentity')
  })

  it('leaves explicit project-state questions to memory recall or real tool facts', async () => {
    ingestMock.mockResolvedValueOnce(undefined)

    const store = useChatTextComposerStore()
    store.setDraft('现在记忆闭环做到哪一步了')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expect(ingestMock.mock.calls[0]?.[0]).toBe('现在记忆闭环做到哪一步了')
    expect(ingestMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      providerId: 'mock-provider',
      model: 'mock-model',
      providerConfig: { apiKey: 'test-key' },
    }))
    expect(sentOptions()).not.toHaveProperty('preDialogueSendIdentity')
  })

  it('sends normally without any renderer pre-dialogue identity dependency', async () => {
    ingestMock.mockResolvedValueOnce(undefined)

    const store = useChatTextComposerStore()
    store.setDraft('现在记忆闭环做到哪一步了')

    await expect(store.sendCurrentMessage()).resolves.toBe(true)

    expect(sentOptions()).not.toHaveProperty('preDialogueSendIdentity')
  })
})
