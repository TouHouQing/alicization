import { createPinia, defineStore, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useSettingsStageModel } from './stage-model'

const stageModelStorageKey = 'settings/stage/model'
const defaultStageModelId = vi.hoisted(() => 'preset-live2d-1')

const mockState = vi.hoisted(() => ({
  getDisplayModelCalls: [] as string[],
  models: new Map<string, any>(),
  storageValues: new Map<string, unknown>(),
}))

vi.mock('@proj-alicization/stage-shared', () => ({
  defaultAlicizationStageModelId: defaultStageModelId,
}))

vi.mock('@proj-alicization/stage-shared/composables', () => ({
  useLocalStorageManualReset: (key: string, initialValue: unknown) => {
    const value = mockState.storageValues.has(key)
      ? mockState.storageValues.get(key)
      : initialValue
    const state = ref(value)
    const seed = initialValue
    ;(state as typeof state & { reset: () => void }).reset = () => {
      state.value = seed
      mockState.storageValues.set(key, seed)
    }
    return state
  },
}))

vi.mock('../display-models', () => {
  const DisplayModelFormat = {
    Live2dZip: 'live2d-zip',
    Live2dDirectory: 'live2d-directory',
    VRM: 'vrm',
    PMXZip: 'pmx-zip',
    PMXDirectory: 'pmx-directory',
    PMD: 'pmd',
  } as const

  return {
    DisplayModelFormat,
    useDisplayModelsStore: defineStore('mock-display-models', () => {
      async function getDisplayModel(id: string) {
        mockState.getDisplayModelCalls.push(id)
        return mockState.models.get(id)
      }

      return {
        getDisplayModel,
      }
    }),
  }
})

function flushStoreSync() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe('settings stage model store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockState.getDisplayModelCalls = []
    mockState.models = new Map()
    mockState.storageValues = new Map()
  })

  it('falls back to the default stage model when the saved model id is missing', async () => {
    mockState.storageValues.set(stageModelStorageKey, 'deleted-model')
    mockState.models.set(defaultStageModelId, {
      id: defaultStageModelId,
      format: 'live2d-zip',
      importedAt: Date.now(),
      name: 'Fallback Model',
      type: 'url',
      url: 'https://example.com/fallback.zip',
    })

    const store = useSettingsStageModel()
    await store.updateStageModel()
    await flushStoreSync()

    expect(mockState.getDisplayModelCalls).toEqual(['deleted-model', defaultStageModelId])
    expect(store.stageModelSelected).toBe(defaultStageModelId)
    expect(store.stageModelRenderer).toBe('live2d')
    expect(store.stageModelSelectedUrl).toBe('https://example.com/fallback.zip')
  })

  it('keeps renderer disabled when both saved and default stage models are missing', async () => {
    mockState.storageValues.set(stageModelStorageKey, 'deleted-model')

    const store = useSettingsStageModel()
    await store.updateStageModel()
    await flushStoreSync()

    expect(mockState.getDisplayModelCalls).toEqual(['deleted-model', defaultStageModelId])
    expect(store.stageModelSelected).toBe(defaultStageModelId)
    expect(store.stageModelRenderer).toBe('disabled')
    expect(store.stageModelSelectedUrl).toBeUndefined()
  })
})
