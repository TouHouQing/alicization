import type { RemovableRef } from '@vueuse/core'

import { errorMessageFrom } from '@moeru/std'
import { useDebounceFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useProvidersStore } from '../stores/providers'

export function useProviderValidation(providerId: string) {
  const { t } = useI18n()
  const router = useRouter()
  const providersStore = useProvidersStore()
  const { providers } = storeToRefs(providersStore) as { providers: RemovableRef<Record<string, any>> }

  const providerMetadata = computed(() => providersStore.getProviderMetadata(providerId))

  // --- Internal Computed Properties for Credentials ---
  const credentials = computed(() => providers.value[providerId] || {})

  const apiKey = computed({
    get: () => credentials.value.apiKey || '',
    set: (value) => {
      if (!providers.value[providerId])
        providers.value[providerId] = {}
      providers.value[providerId].apiKey = value
    },
  })

  const baseUrl = computed({
    get: () => credentials.value.baseUrl || '',
    set: (value) => {
      if (!providers.value[providerId])
        providers.value[providerId] = {}
      providers.value[providerId].baseUrl = value
    },
  })

  const accountId = computed({
    get: () => credentials.value.accountId || '',
    set: (value) => {
      if (!providers.value[providerId])
        providers.value[providerId] = {}
      providers.value[providerId].accountId = value
    },
  })
  // --- End of Internal Computed Properties ---

  const debounceTime = 500
  const isValidating = ref(0)
  const isValid = ref(false)
  const validationMessage = ref('')

  const hasManualValidators = computed(() => !!providerMetadata.value?.validators.runManualValidation)
  const isManualTesting = ref(false)
  const manualTestPassed = ref(false)
  const manualTestMessage = ref('')
  let disposed = false
  let configurationRevision = 0
  let validationRun = 0
  let manualRun = 0
  let completionTimer: ReturnType<typeof setTimeout> | undefined

  function invalidatePending() {
    configurationRevision++
    clearTimeout(completionTimer)
    completionTimer = undefined
    isValidating.value = 0
    isManualTesting.value = false
  }

  function configurationSnapshot() {
    // Nested headers must stay on the endpoint that requested them, even when
    // the live form changes while a provider performs multiple network checks.
    const config = structuredClone(toRaw(credentials.value))
    for (const key of ['apiKey', 'baseUrl', 'accountId']) {
      if (typeof config[key] === 'string')
        config[key] = config[key].trim()
    }
    return config
  }

  onBeforeUnmount(() => {
    disposed = true
    invalidatePending()
  })

  async function validateConfiguration() {
    const metadata = providerMetadata.value
    if (disposed || !metadata)
      return

    const revision = configurationRevision
    const run = ++validationRun
    const current = () => !disposed && revision === configurationRevision && run === validationRun
    clearTimeout(completionTimer)
    completionTimer = undefined
    isValidating.value = 1
    validationMessage.value = ''
    const startValidationTimestamp = performance.now()
    let finalValidationMessage = ''

    try {
      const validationResult = await metadata.validators.validateProviderConfig(configurationSnapshot())
      if (!current())
        return
      isValid.value = validationResult.valid

      if (!isValid.value)
        finalValidationMessage = validationResult.reason

      // When a provider validates successfully on its settings page,
      // mark it as added so it appears in the model selector (e.g. Consciousness module).
      // This fixes providers like LM Studio that use default config and may not
      // need an API key, yet should be selectable after successful validation.
      if (isValid.value) {
        providersStore.markProviderAdded(providerId)
      }
    }
    catch (error) {
      if (!current())
        return
      isValid.value = false
      finalValidationMessage = t('settings.dialogs.onboarding.validationError', {
        error: errorMessageFrom(error),
      })
    }
    finally {
      if (current()) {
        completionTimer = setTimeout(() => {
          if (current()) {
            isValidating.value = 0
            validationMessage.value = finalValidationMessage
            completionTimer = undefined
          }
        }, Math.max(0, debounceTime - (performance.now() - startValidationTimestamp)))
      }
    }
  }

  const debouncedValidateConfiguration = useDebounceFn((revision: number) => {
    if (disposed || revision !== configurationRevision)
      return
    const config = credentials.value
    const hasApiKey = 'apiKey' in config && !!config.apiKey?.trim()
    const hasBaseUrl = 'baseUrl' in config && !!config.baseUrl?.trim()
    const hasAccountId = 'accountId' in config && !!config.accountId?.trim()

    if (!hasApiKey && !hasBaseUrl && !hasAccountId) {
      isValid.value = false
      validationMessage.value = ''
      isValidating.value = 0
      return
    }
    validateConfiguration()
  }, debounceTime)

  onMounted(() => {
    providersStore.initializeProvider(providerId)
    if (Object.keys(credentials.value).some(key => !!credentials.value[key])) {
      validateConfiguration()
    }
  })

  watch(credentials, () => {
    invalidatePending()
    isValid.value = false
    validationMessage.value = ''
    debouncedValidateConfiguration(configurationRevision)
    // Reset manual test state when credentials change
    manualTestPassed.value = false
    manualTestMessage.value = ''
  }, { deep: true, flush: 'sync' })

  async function runManualTest() {
    const validators = providerMetadata.value?.validators
    if (disposed || !validators?.runManualValidation)
      return

    const revision = configurationRevision
    const run = ++manualRun
    const current = () => !disposed && revision === configurationRevision && run === manualRun
    isManualTesting.value = true
    manualTestPassed.value = false
    manualTestMessage.value = ''

    try {
      const result = await validators.runManualValidation(configurationSnapshot())
      if (!current())
        return
      manualTestPassed.value = result.valid
      if (!result.valid)
        manualTestMessage.value = result.reason
    }
    catch (error) {
      if (!current())
        return
      manualTestPassed.value = false
      manualTestMessage.value = errorMessageFrom(error) ?? 'Unknown error'
    }
    finally {
      if (current())
        isManualTesting.value = false
    }
  }

  function handleResetSettings() {
    if (disposed)
      return
    invalidatePending()
    const defaultOptions = providerMetadata.value?.defaultOptions ? providerMetadata.value.defaultOptions() : {}
    providers.value[providerId] = { ...defaultOptions }
    isValid.value = false
    validationMessage.value = ''
    isValidating.value = 0
    manualTestPassed.value = false
    manualTestMessage.value = ''
  }

  function forceValid() {
    if (disposed)
      return
    invalidatePending()
    isValid.value = true
    validationMessage.value = ''
    manualTestMessage.value = ''
    providersStore.forceProviderConfigured(providerId)
  }

  return {
    t,
    router,
    providerMetadata,
    apiKey,
    baseUrl,
    accountId,
    isValidating,
    isValid,
    validationMessage,
    handleResetSettings,
    forceValid,
    // Manual test generation
    hasManualValidators,
    isManualTesting,
    manualTestPassed,
    manualTestMessage,
    runManualTest,
  }
}
