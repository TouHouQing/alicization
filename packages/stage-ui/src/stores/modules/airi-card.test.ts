import type { AiriCard } from './airi-card'

import { createPinia, defineStore, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useSettingsStageModel } from '../settings/stage-model'
import { useAiriCardStore } from './airi-card'
import { useConsciousnessStore } from './consciousness'
import { useSpeechStore } from './speech'

const storageState = vi.hoisted(() => ({
  cards: new Map<string, AiriCard>(),
  activeCardId: 'default',
}))

const stageModelState = vi.hoisted(() => ({
  updateCalls: [] as string[],
}))

function cloneValue<T>(value: T): T {
  if (value instanceof Map) {
    return new Map(
      [...value.entries()].map(([key, nestedValue]) => [key, cloneValue(nestedValue)]),
    ) as T
  }

  if (Array.isArray(value))
    return value.map(item => cloneValue(item)) as T

  if (value && typeof value === 'object')
    return JSON.parse(JSON.stringify(value)) as T

  return value
}

function flushStoreSync() {
  return Promise.resolve().then(() => Promise.resolve())
}

function createManualResetRef<T>(initialValue: T) {
  const seed = cloneValue(initialValue)
  const state = ref(cloneValue(initialValue)) as unknown as ReturnType<typeof ref<T>> & { reset: () => void }
  state.reset = () => {
    state.value = cloneValue(seed)
  }
  return state
}

function createCard(options?: {
  displayModelId?: string
  consciousnessProvider?: string
  consciousnessModel?: string
  speechProvider?: string
  speechModel?: string
  speechVoiceId?: string
}): AiriCard {
  const displayModelId = options?.displayModelId

  return {
    name: 'Test Card',
    version: '1.0.0',
    description: '',
    extensions: {
      airi: {
        modules: {
          consciousness: {
            provider: options?.consciousnessProvider ?? 'provider-default',
            model: options?.consciousnessModel ?? 'model-default',
          },
          speech: {
            provider: options?.speechProvider ?? 'speech-provider-default',
            model: options?.speechModel ?? 'speech-model-default',
            voice_id: options?.speechVoiceId ?? 'voice-default',
          },
          ...(displayModelId
            ? {
                displayModel: {
                  modelId: displayModelId,
                },
              }
            : {}),
        } as AiriCard['extensions']['airi']['modules'],
        agents: {},
      },
    },
  }
}

vi.mock('@proj-alicization/stage-shared', () => ({
  defaultAlicizationCardName: 'Alicization',
  defaultAlicizationStageModelId: 'preset-live2d-1',
}))

vi.mock('@proj-alicization/stage-shared/composables', () => ({
  useLocalStorageManualReset: (key: string, initialValue: unknown) => {
    if (key === 'airi-cards')
      return createManualResetRef(storageState.cards.size > 0 ? storageState.cards : cloneValue(initialValue))
    if (key === 'airi-card-active-id')
      return createManualResetRef(storageState.activeCardId || String(initialValue))

    return createManualResetRef(initialValue)
  },
}))

vi.mock('../alicization-bridge', () => ({
  hasAlicizationBridge: () => false,
  getAlicizationBridge: () => ({}),
}))

vi.mock('./consciousness', () => ({
  useConsciousnessStore: defineStore('mock-consciousness', () => {
    const activeProvider = ref('provider-default')
    const activeModel = ref('model-default')

    return {
      activeProvider,
      activeModel,
    }
  }),
}))

vi.mock('./speech', () => ({
  useSpeechStore: defineStore('mock-speech', () => {
    const activeSpeechProvider = ref('speech-provider-default')
    const activeSpeechModel = ref('speech-model-default')
    const activeSpeechVoiceId = ref('voice-default')

    return {
      activeSpeechProvider,
      activeSpeechModel,
      activeSpeechVoiceId,
    }
  }),
}))

vi.mock('../settings/stage-model', () => ({
  useSettingsStageModel: defineStore('mock-stage-model', () => {
    const stageModelSelected = ref('preset-live2d-1')
    const updateStageModel = vi.fn(async () => {
      stageModelState.updateCalls.push(stageModelSelected.value)
    })

    return {
      stageModelSelected,
      updateStageModel,
    }
  }),
}))

describe('airi-card store display model bindings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storageState.cards = new Map()
    storageState.activeCardId = 'default'
    stageModelState.updateCalls = []

    const consciousnessStore = useConsciousnessStore()
    consciousnessStore.activeProvider = 'provider-default'
    consciousnessStore.activeModel = 'model-default'

    const speechStore = useSpeechStore()
    speechStore.activeSpeechProvider = 'speech-provider-default'
    speechStore.activeSpeechModel = 'speech-model-default'
    speechStore.activeSpeechVoiceId = 'voice-default'

    const stageModelStore = useSettingsStageModel()
    stageModelStore.stageModelSelected = 'preset-live2d-1'
  })

  it('binds the default card to the default Alicization model during initialize', async () => {
    useSettingsStageModel().stageModelSelected = 'preset-vrm-2'

    const store = useAiriCardStore()
    store.initialize()
    await flushStoreSync()

    expect(store.getCard('default')?.extensions.airi.modules.displayModel.modelId).toBe('preset-live2d-1')
    expect(useSettingsStageModel().stageModelSelected).toBe('preset-live2d-1')
    expect(stageModelState.updateCalls.at(-1)).toBe('preset-live2d-1')
  })

  it('migrates legacy cards without a model binding to the current stage model', async () => {
    useSettingsStageModel().stageModelSelected = 'preset-vrm-1'
    storageState.activeCardId = 'card-a'
    storageState.cards = new Map([
      ['card-a', createCard()],
    ])

    const store = useAiriCardStore()
    store.initialize()
    await flushStoreSync()

    expect(store.getCard('card-a')?.extensions.airi.modules.displayModel.modelId).toBe('preset-vrm-1')
    expect(useSettingsStageModel().stageModelSelected).toBe('preset-vrm-1')
  })

  it('applies the active card model binding immediately on cold start', async () => {
    storageState.cards = new Map([
      ['default', createCard({ displayModelId: 'preset-vrm-2' })],
    ])

    useAiriCardStore()
    await flushStoreSync()

    expect(useSettingsStageModel().stageModelSelected).toBe('preset-vrm-2')
    expect(stageModelState.updateCalls).toContain('preset-vrm-2')
  })

  it('switches stage models when the active card changes', async () => {
    storageState.activeCardId = 'card-a'
    storageState.cards = new Map([
      ['card-a', createCard({ displayModelId: 'preset-live2d-2' })],
      ['card-b', createCard({ displayModelId: 'preset-vrm-1' })],
    ])

    const store = useAiriCardStore()
    await flushStoreSync()

    expect(useSettingsStageModel().stageModelSelected).toBe('preset-live2d-2')

    store.activeCardId = 'card-b'
    await flushStoreSync()

    expect(useSettingsStageModel().stageModelSelected).toBe('preset-vrm-1')
    expect(stageModelState.updateCalls.at(-1)).toBe('preset-vrm-1')
  })
})
