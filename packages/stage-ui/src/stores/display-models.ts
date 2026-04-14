import localforage from 'localforage'

import { loadLive2DModelPreview as generateLive2DPreview } from '@proj-alicization/stage-ui-live2d/utils/live2d-preview'
import { loadVrmModelPreview as generateVrmPreview } from '@proj-alicization/stage-ui-three/utils/vrm-preview'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import '@proj-alicization/stage-ui-live2d/utils/live2d-zip-loader'
import '@proj-alicization/stage-ui-live2d/utils/live2d-opfs-registration'

export enum DisplayModelFormat {
  Live2dZip = 'live2d-zip',
  Live2dDirectory = 'live2d-directory',
  VRM = 'vrm',
  PMXZip = 'pmx-zip',
  PMXDirectory = 'pmx-directory',
  PMD = 'pmd',
}

export type DisplayModel
  = | DisplayModelFile
    | DisplayModelURL

const presetLive2dProUrl = new URL('../assets/live2d/models/hiyori_pro_zh.zip', import.meta.url).href
const presetLive2dFreeUrl = new URL('../assets/live2d/models/hiyori_free_zh.zip', import.meta.url).href
const presetLive2dPreview = new URL('../assets/live2d/models/hiyori/preview.png', import.meta.url).href
const presetVrmAvatarAUrl = new URL('../assets/vrm/models/AvatarSample-A/AvatarSample_A.vrm', import.meta.url).href
const presetVrmAvatarAPreview = new URL('../assets/vrm/models/AvatarSample-A/preview.png', import.meta.url).href
const presetVrmAvatarBUrl = new URL('../assets/vrm/models/AvatarSample-B/AvatarSample_B.vrm', import.meta.url).href
const presetVrmAvatarBPreview = new URL('../assets/vrm/models/AvatarSample-B/preview.png', import.meta.url).href

export interface DisplayModelFile {
  id: string
  format: DisplayModelFormat
  type: 'file'
  file: File
  name: string
  previewImage?: string
  importedAt: number
}

export interface DisplayModelURL {
  id: string
  format: DisplayModelFormat
  type: 'url'
  url: string
  name: string
  previewImage?: string
  importedAt: number
}

const displayModelsPresets: DisplayModel[] = [
  { id: 'preset-live2d-1', format: DisplayModelFormat.Live2dZip, type: 'url', url: presetLive2dProUrl, name: 'Hiyori (Pro)', previewImage: presetLive2dPreview, importedAt: 1733113886840 },
  { id: 'preset-live2d-2', format: DisplayModelFormat.Live2dZip, type: 'url', url: presetLive2dFreeUrl, name: 'Hiyori (Free)', previewImage: presetLive2dPreview, importedAt: 1733113886840 },
  { id: 'preset-vrm-1', format: DisplayModelFormat.VRM, type: 'url', url: presetVrmAvatarAUrl, name: 'AvatarSample_A', previewImage: presetVrmAvatarAPreview, importedAt: 1733113886840 },
  { id: 'preset-vrm-2', format: DisplayModelFormat.VRM, type: 'url', url: presetVrmAvatarBUrl, name: 'AvatarSample_B', previewImage: presetVrmAvatarBPreview, importedAt: 1733113886840 },
]
const displayModelsLoadingWaitTimeoutMs = 4_000
const displayModelsOperationTimeoutMs = 4_000
const displayModelsLoadingPollIntervalMs = 40

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export const useDisplayModelsStore = defineStore('display-models', () => {
  const displayModels = ref<DisplayModel[]>([])

  const displayModelsFromIndexedDBLoading = ref(false)

  async function waitForDisplayModelsIdle(operation: string) {
    const startedAt = Date.now()
    while (displayModelsFromIndexedDBLoading.value) {
      const elapsed = Date.now() - startedAt
      if (elapsed >= displayModelsLoadingWaitTimeoutMs) {
        // NOTICE: IndexedDB iterate/get can stall indefinitely in damaged browser storage states.
        // Force-unblocking prevents stage boot from being permanently stuck on "loading".
        console.warn('[display-models] loading flag stuck, force reset to unblock stage boot', {
          elapsed,
          operation,
        })
        displayModelsFromIndexedDBLoading.value = false
        return
      }

      await sleep(displayModelsLoadingPollIntervalMs)
    }
  }

  async function withTimeout<T>(operation: string, task: Promise<T>, timeoutMs = displayModelsOperationTimeoutMs) {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    try {
      return await Promise.race<T>([
        task,
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`[display-models] ${operation} timed out after ${timeoutMs}ms`))
          }, timeoutMs)
        }),
      ])
    }
    finally {
      if (timeoutHandle)
        clearTimeout(timeoutHandle)
    }
  }

  async function loadDisplayModelsFromIndexedDB() {
    await waitForDisplayModelsIdle('loadDisplayModelsFromIndexedDB')

    displayModelsFromIndexedDBLoading.value = true
    const models = [...displayModelsPresets]
    let ignoreIterateResults = false

    try {
      await withTimeout('localforage.iterate', localforage.iterate<{ format: DisplayModelFormat, file: File, importedAt: number, previewImage?: string }, void>((val, key) => {
        if (ignoreIterateResults)
          return

        if (key.startsWith('display-model-')) {
          models.push({ id: key, format: val.format, type: 'file', file: val.file, name: val.file.name, importedAt: val.importedAt, previewImage: val.previewImage })
        }
      }))
    }
    catch (err) {
      ignoreIterateResults = true
      console.error('[display-models] failed to load models from indexeddb, fallback to presets for this cycle:', err)
    }
    finally {
      displayModelsFromIndexedDBLoading.value = false
    }

    displayModels.value = models.sort((a, b) => b.importedAt - a.importedAt)
  }

  async function getDisplayModel(id: string) {
    await waitForDisplayModelsIdle('getDisplayModel')

    let modelFromFile: DisplayModelFile | null = null
    try {
      modelFromFile = await withTimeout('localforage.getItem', localforage.getItem<DisplayModelFile>(id))
    }
    catch (error) {
      console.warn('[display-models] failed to read model from indexeddb, fallback to presets:', error)
    }

    if (modelFromFile) {
      return modelFromFile
    }

    // Fallback to in-memory presets if not found in localforage
    return displayModelsPresets.find(model => model.id === id)
  }

  const loadLive2DModelPreview = (file: File) => generateLive2DPreview(file)

  async function loadVrmModelPreview(file: File) {
    return generateVrmPreview(file)
  }

  async function addDisplayModel(format: DisplayModelFormat, file: File) {
    await waitForDisplayModelsIdle('addDisplayModel')
    const newDisplayModel: DisplayModelFile = { id: `display-model-${nanoid()}`, format, type: 'file', file, name: file.name, importedAt: Date.now() }

    if (format === DisplayModelFormat.Live2dZip) {
      const previewImage = await loadLive2DModelPreview(file)
      newDisplayModel.previewImage = previewImage
    }
    else if (format === DisplayModelFormat.VRM) {
      const previewImage = await loadVrmModelPreview(file)
      newDisplayModel.previewImage = previewImage
    }

    displayModels.value.unshift(newDisplayModel)

    localforage.setItem<DisplayModelFile>(newDisplayModel.id, newDisplayModel)
      .catch(err => console.error(err))
  }

  async function renameDisplayModel(id: string, name: string) {
    await waitForDisplayModelsIdle('renameDisplayModel')
    const displayModel = await withTimeout('localforage.getItem(rename)', localforage.getItem<DisplayModelFile>(id))
    if (!displayModel)
      return

    displayModel.name = name
    await withTimeout('localforage.setItem(rename)', localforage.setItem<DisplayModelFile>(id, displayModel))
    displayModels.value = displayModels.value.map((model) => {
      if (model.id !== id)
        return model

      if (model.type === 'file')
        return { ...model, name }

      return model
    })
  }

  async function removeDisplayModel(id: string) {
    await waitForDisplayModelsIdle('removeDisplayModel')
    await withTimeout('localforage.removeItem', localforage.removeItem(id))
    displayModels.value = displayModels.value.filter(model => model.id !== id)
  }

  async function resetDisplayModels() {
    await loadDisplayModelsFromIndexedDB()
    const userModelIds = displayModels.value.filter(model => model.type === 'file').map(model => model.id)
    for (const id of userModelIds) {
      await removeDisplayModel(id)
    }

    displayModels.value = [...displayModelsPresets].sort((a, b) => b.importedAt - a.importedAt)
  }

  return {
    displayModels,
    displayModelsFromIndexedDBLoading,

    loadDisplayModelsFromIndexedDB,
    getDisplayModel,
    addDisplayModel,
    renameDisplayModel,
    removeDisplayModel,
    resetDisplayModels,
  }
})
