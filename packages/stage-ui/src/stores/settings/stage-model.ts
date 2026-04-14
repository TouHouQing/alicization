import type { DisplayModel } from '../display-models'

import { defaultAlicizationStageModelId } from '@proj-alicization/stage-shared'
import { useLocalStorageManualReset } from '@proj-alicization/stage-shared/composables'
import { refManualReset, useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, watch } from 'vue'

import { DisplayModelFormat, useDisplayModelsStore } from '../display-models'

export type StageModelRenderer = 'live2d' | 'vrm' | 'disabled' | undefined

export const useSettingsStageModel = defineStore('settings-stage-model', () => {
  const displayModelsStore = useDisplayModelsStore()
  let stageModelUpdateSequence = 0
  let skipNextStageModelSelectedWatcher = 0
  const stageModelStorageKey = 'settings/stage/model'

  const stageModelSelectedState = useLocalStorageManualReset<string>(stageModelStorageKey, defaultAlicizationStageModelId)
  const stageModelSelected = computed<string>({
    get: () => stageModelSelectedState.value,
    set: (value) => {
      stageModelSelectedState.value = value
    },
  })
  const stageModelSelectedDisplayModel = refManualReset<DisplayModel | undefined>(undefined)
  const stageModelSelectedUrl = refManualReset<string | undefined>(undefined)
  const stageModelRenderer = refManualReset<StageModelRenderer>(undefined)

  const stageViewControlsEnabled = refManualReset<boolean>(false)

  function revokeStageModelUrl(url?: string) {
    if (url?.startsWith('blob:'))
      URL.revokeObjectURL(url)
  }

  function replaceStageModelUrl(nextUrl?: string) {
    if (stageModelSelectedUrl.value === nextUrl)
      return

    revokeStageModelUrl(stageModelSelectedUrl.value)
    stageModelSelectedUrl.value = nextUrl
  }

  async function updateStageModel() {
    const requestId = ++stageModelUpdateSequence
    const selectedModelId = stageModelSelectedState.value

    if (!selectedModelId) {
      replaceStageModelUrl(undefined)
      stageModelSelectedDisplayModel.value = undefined
      stageModelRenderer.value = 'disabled'
      return
    }

    let model: DisplayModel | undefined
    try {
      model = await displayModelsStore.getDisplayModel(selectedModelId)
    }
    catch (error) {
      console.warn('[settings-stage-model] failed to resolve selected model, fallback to defaults:', error)
      model = undefined
    }

    if (requestId !== stageModelUpdateSequence)
      return

    if (!model) {
      if (selectedModelId !== defaultAlicizationStageModelId) {
        skipNextStageModelSelectedWatcher += 1
        stageModelSelectedState.value = defaultAlicizationStageModelId
        // NOTICE: Resolve fallback model in the same call stack so the stage does not
        // stay in an undefined renderer state waiting for a secondary storage watcher tick.
        await updateStageModel()
        return
      }

      replaceStageModelUrl(undefined)
      stageModelSelectedDisplayModel.value = undefined
      stageModelRenderer.value = 'disabled'
      return
    }

    switch (model.format) {
      case DisplayModelFormat.Live2dZip:
        stageModelRenderer.value = 'live2d'
        break
      case DisplayModelFormat.VRM:
        stageModelRenderer.value = 'vrm'
        break
      default:
        stageModelRenderer.value = 'disabled'
        break
    }

    if (model.type === 'file') {
      const nextUrl = URL.createObjectURL(model.file)
      if (requestId !== stageModelUpdateSequence) {
        URL.revokeObjectURL(nextUrl)
        return
      }

      replaceStageModelUrl(nextUrl)
    }
    else {
      replaceStageModelUrl(model.url)
    }

    stageModelSelectedDisplayModel.value = model
  }

  async function initializeStageModel() {
    await updateStageModel()
  }

  useEventListener('unload', () => {
    revokeStageModelUrl(stageModelSelectedUrl.value)
  })

  watch(stageModelSelectedState, (_newValue, _oldValue) => {
    if (skipNextStageModelSelectedWatcher > 0) {
      skipNextStageModelSelectedWatcher -= 1
      return
    }

    void updateStageModel()
  })

  async function resetState() {
    revokeStageModelUrl(stageModelSelectedUrl.value)

    stageModelSelectedState.reset()
    stageModelSelectedDisplayModel.reset()
    stageModelSelectedUrl.reset()
    stageModelRenderer.reset()
    stageViewControlsEnabled.reset()

    await updateStageModel()
  }

  return {
    stageModelRenderer,
    stageModelSelected,
    stageModelSelectedUrl,
    stageModelSelectedDisplayModel,
    stageViewControlsEnabled,

    initializeStageModel,
    updateStageModel,
    resetState,
  }
})
