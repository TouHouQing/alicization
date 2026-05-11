import { useLocalStorage } from '@vueuse/core'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import { useAlicizationEpoch1Store } from './alicization-epoch1'
import { useConsciousnessStore } from './modules/consciousness'
import { useProvidersStore } from './providers'

const credentialBasedEssentialProviderIds = ['openai', 'anthropic', 'google-generative-ai', 'openrouter-ai', 'deepseek'] as const

function hasNonEmptyText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const providersStore = useProvidersStore()
  const consciousnessStore = useConsciousnessStore()
  const alicizationEpoch1Store = useAlicizationEpoch1Store()
  const { activeProvider, activeModel } = storeToRefs(consciousnessStore)

  function isChatProvider(providerId: string) {
    return providersStore.providerMetadata[providerId]?.category === 'chat'
  }

  const hasCompletedSetup = useLocalStorage('onboarding/completed', false)
  const hasSkippedSetup = useLocalStorage('onboarding/skipped', false)
  const showingSetup = ref(false)
  const shouldShowSetup = computed({
    get: () => showingSetup.value,
    set: value => showingSetup.value = value,
  })

  const hasChatProviderConfigured = computed(() => {
    return Object.entries(providersStore.configuredProviders)
      .some(([providerId, configured]) => configured && isChatProvider(providerId))
  })

  const hasCredentialBackedChatProviderConfigured = computed(() => {
    return credentialBasedEssentialProviderIds.some((providerId) => {
      const providerConfig = providersStore.providers[providerId] as Record<string, unknown> | undefined
      if (!providerConfig)
        return false
      return hasNonEmptyText(providerConfig.apiKey)
    })
  })

  const hasPersistedActiveProviderSelection = computed(() => {
    const providerId = activeProvider.value
    if (!providerId || !isChatProvider(providerId) || !hasNonEmptyText(activeModel.value))
      return false
    return !!providersStore.providers[providerId] || !!providersStore.addedProviders[providerId]
  })

  // NOTICE: runtime selection can be valid before provider metadata/category fully hydrates.
  const hasRuntimeProviderSelection = computed(() => {
    return hasNonEmptyText(activeProvider.value) && hasNonEmptyText(activeModel.value)
  })

  const hasPersistedChatProviderConfig = computed(() => {
    return (providersStore.persistedChatProvidersMetadata?.length ?? 0) > 0
  })

  const hasConfiguredChatProvider = computed(() => {
    return hasCredentialBackedChatProviderConfigured.value
      || hasChatProviderConfigured.value
      || hasPersistedChatProviderConfig.value
      || hasPersistedActiveProviderSelection.value
      || hasRuntimeProviderSelection.value
  })

  const hasGenesisReady = computed(() => !alicizationEpoch1Store.needsGenesis)
  const preferredEntryStepId = computed(() => {
    return hasGenesisReady.value ? 'provider-selection' : 'welcome'
  })

  const needsOnboarding = computed(() => {
    if (hasSkippedSetup.value)
      return false
    if (hasCompletedSetup.value && hasGenesisReady.value)
      return false
    if (hasConfiguredChatProvider.value && hasGenesisReady.value)
      return false
    return true
  })

  watch(needsOnboarding, (needSetup) => {
    if (!needSetup)
      showingSetup.value = false
  })

  function initializeSetupCheck() {
    if (!needsOnboarding.value) {
      showingSetup.value = false
      if (hasConfiguredChatProvider.value && hasGenesisReady.value && !hasSkippedSetup.value && !hasCompletedSetup.value)
        hasCompletedSetup.value = true
      return
    }

    showingSetup.value = true
  }

  function markSetupCompleted() {
    hasCompletedSetup.value = true
    hasSkippedSetup.value = false
    showingSetup.value = false
  }

  function markSetupSkipped() {
    hasSkippedSetup.value = true
    showingSetup.value = false
  }

  function resetSetupState() {
    hasCompletedSetup.value = false
    hasSkippedSetup.value = false
    showingSetup.value = false
  }

  function forceShowSetup() {
    showingSetup.value = true
  }

  return {
    hasCompletedSetup,
    hasSkippedSetup,
    showingSetup,
    shouldShowSetup,
    hasChatProviderConfigured,
    hasCredentialBackedChatProviderConfigured,
    hasPersistedActiveProviderSelection,
    hasRuntimeProviderSelection,
    hasPersistedChatProviderConfig,
    hasConfiguredChatProvider,
    hasGenesisReady,
    preferredEntryStepId,
    needsOnboarding,

    initializeSetupCheck,
    markSetupCompleted,
    markSetupSkipped,
    resetSetupState,
    forceShowSetup,
  }
})
