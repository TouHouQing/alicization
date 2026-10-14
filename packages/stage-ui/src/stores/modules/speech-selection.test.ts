import { createPinia, defineStore, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'

const configuredProviders = ref([{ id: 'openai-compatible-audio-speech' }])

vi.mock('@proj-alicization/stage-shared/composables', () => ({ useLocalStorageManualReset: <T>(_key: string, initialValue: T) => Object.assign(ref(initialValue), { reset: vi.fn() }) }))
vi.mock('../providers', () => ({ useProvidersStore: defineStore('speech-qa-providers', () => ({ allAudioSpeechProvidersMetadata: ref([]), configuredSpeechProvidersMetadata: computed(() => configuredProviders.value), getProviderMetadata: () => ({ capabilities: {} }), getModelsForProvider: () => [], getProviderConfig: () => ({ model: 'qa-model', voice: 'qa-voice' }), isLoadingModels: {}, modelLoadError: {} })) }))

describe('speech selection survives capability checks', () => {
  it('keeps the selected provider and voice when an asynchronous check temporarily removes configured services', async () => {
    setActivePinia(createPinia())
    const { useSpeechStore } = await import('./speech')
    const speech = useSpeechStore()
    speech.activeSpeechProvider = 'openai-compatible-audio-speech'
    speech.activeSpeechModel = 'qa-model'
    speech.activeSpeechVoiceId = 'qa-voice'
    await nextTick()
    configuredProviders.value = []
    await nextTick()
    expect(speech.activeSpeechProvider).toBe('openai-compatible-audio-speech')
    expect(speech.activeSpeechVoiceId).toBe('qa-voice')
  })
})
