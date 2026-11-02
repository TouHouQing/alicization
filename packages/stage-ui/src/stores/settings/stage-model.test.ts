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

  it('keeps an in-flight archive readable across recovery refreshes and renamed IndexedDB File wrappers', async () => {
    const archive = { id: 'display-model-owned', format: 'live2d-zip', type: 'file', name: 'Imported model', importedAt: 1000, file: new File(['actual owned archive'], 'model.ZIP', { lastModified: 1000 }) }
    mockState.storageValues.set(stageModelStorageKey, archive.id)
    mockState.models.set(archive.id, archive)
    const store = useSettingsStageModel()
    await store.initializeStageModel()
    const source = store.stageModelSelectedUrl!
    const cacheRead = Promise.withResolvers<void>()
    const loading = cacheRead.promise.then(() => fetch(source).then(response => response.text()))
    try {
      // IndexedDB returns a new File wrapper; renaming changes catalogue text.
      mockState.models.set(archive.id, { ...archive, name: 'Renamed model', file: new File([archive.file], archive.file.name, { lastModified: 1000 }) })
      await store.initializeStageModel()
      await store.updateStageModel()
      cacheRead.resolve()
      await expect(loading).resolves.toBe('actual owned archive')
      expect(store.stageModelSelectedUrl).toBe(source)
      expect(store.stageModelSelectedDisplayModel?.name).toBe('Renamed model')
    }
    finally {
      cacheRead.resolve()
      await loading.catch(() => {})
      await store.resetState()
    }
  })

  it('replaces and revokes an imported archive when its source version changes', async () => {
    const archive = { id: 'display-model-owned', format: 'live2d-zip', type: 'file', name: 'Imported model', importedAt: 1000, file: new File(['old bytes'], 'model.zip', { lastModified: 1000 }) }
    mockState.storageValues.set(stageModelStorageKey, archive.id)
    mockState.models.set(archive.id, archive)
    const store = useSettingsStageModel()
    await store.initializeStageModel()
    const previous = store.stageModelSelectedUrl!
    try {
      mockState.models.set(archive.id, { ...archive, importedAt: 2000, file: new File(['replacement bytes'], 'model.zip', { lastModified: 2000 }) })
      await store.updateStageModel()
      await expect(fetch(previous)).rejects.toThrow()
      await expect(fetch(store.stageModelSelectedUrl!).then(response => response.text())).resolves.toBe('replacement bytes')
    }
    finally { await store.resetState() }
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
