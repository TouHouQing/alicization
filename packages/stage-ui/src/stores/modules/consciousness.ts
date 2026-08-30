import { useLocalStorageManualReset } from '@proj-alicization/stage-shared/composables'
import { refManualReset } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useProvidersStore } from '../providers'

export const useConsciousnessStore = defineStore('consciousness', () => {
  const providersStore = useProvidersStore()

  // State
  const activeProvider = useLocalStorageManualReset<string>('settings/consciousness/active-provider', '')
  const activeModel = useLocalStorageManualReset<string>('settings/consciousness/active-model', '')
  const activeCustomModelName = useLocalStorageManualReset<string>('settings/consciousness/active-custom-model', '')
  const expandedDescriptions = refManualReset<Record<string, boolean>>(() => ({}))
  const modelSearchQuery = refManualReset<string>('')
  const runtimeConfigHydrated = ref(false)
  let resolveRuntimeConfigReady: () => void = () => {}
  const runtimeConfigReady = new Promise<void>((resolve) => {
    resolveRuntimeConfigReady = resolve
  })

  // Computed properties
  const supportsModelListing = computed(() => {
    if (!activeProvider.value)
      return false
    return providersStore.getProviderMetadata(activeProvider.value)?.capabilities.listModels !== undefined
  })

  const providerModels = computed(() => {
    return providersStore.getModelsForProvider(activeProvider.value)
  })

  const isLoadingActiveProviderModels = computed(() => {
    return providersStore.isLoadingModels[activeProvider.value] || false
  })

  const activeProviderModelError = computed(() => {
    return providersStore.modelLoadError[activeProvider.value] || null
  })

  const filteredModels = computed(() => {
    if (!modelSearchQuery.value.trim()) {
      return providerModels.value
    }

    const query = modelSearchQuery.value.toLowerCase().trim()
    return providerModels.value.filter(model =>
      model.name.toLowerCase().includes(query)
      || model.id.toLowerCase().includes(query)
      || (model.description && model.description.toLowerCase().includes(query)),
    )
  })

  function resetModelSelection() {
    activeModel.reset()
    activeCustomModelName.reset()
    expandedDescriptions.reset()
    modelSearchQuery.reset()
  }

  async function loadModelsForProvider(provider: string) {
    if (provider && providersStore.getProviderMetadata(provider)?.capabilities.listModels !== undefined) {
      await providersStore.fetchModelsForProvider(provider)
    }
  }

  async function getModelsForProvider(provider: string) {
    if (provider && providersStore.getProviderMetadata(provider)?.capabilities.listModels !== undefined) {
      return providersStore.getModelsForProvider(provider)
    }

    return []
  }

  const configured = computed(() => {
    return !!activeProvider.value && !!activeModel.value
  })

  function resetState() {
    activeProvider.reset()
    resetModelSelection()
  }

  function markRuntimeConfigHydrated() {
    if (runtimeConfigHydrated.value)
      return

    runtimeConfigHydrated.value = true
    resolveRuntimeConfigReady()
  }

  async function waitForRuntimeConfig(options?: { timeoutMs?: number }) {
    if (runtimeConfigHydrated.value)
      return true

    const timeoutMs = Math.max(0, options?.timeoutMs ?? 1500)
    if (timeoutMs === 0)
      return runtimeConfigHydrated.value

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<boolean>((resolve) => {
      timeoutHandle = setTimeout(() => resolve(false), timeoutMs)
    })
    const ready = runtimeConfigReady.then(() => true)
    const result = await Promise.race([ready, timeout])
    if (timeoutHandle)
      clearTimeout(timeoutHandle)
    return result
  }

  return {
    // State
    configured,
    activeProvider,
    activeModel,
    customModelName: activeCustomModelName,
    expandedDescriptions,
    modelSearchQuery,
    runtimeConfigHydrated,

    // Computed
    supportsModelListing,
    providerModels,
    isLoadingActiveProviderModels,
    activeProviderModelError,
    filteredModels,

    // Actions
    resetModelSelection,
    loadModelsForProvider,
    getModelsForProvider,
    resetState,
    markRuntimeConfigHydrated,
    waitForRuntimeConfig,
  }
})
