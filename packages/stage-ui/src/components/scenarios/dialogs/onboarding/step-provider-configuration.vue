<script setup lang="ts">
import type { ProviderMetadata } from '../../../../stores/providers'
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler, ProviderConfigData } from './types'

import { errorMessageFrom } from '@moeru/std'
import { Button, Callout, FieldInput } from '@proj-alicization/ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useProvidersStore } from '../../../../stores/providers'
import { Alert } from '../../../misc'
import { ProviderAccountIdInput } from '../../../scenarios/providers'

interface Props {
  selectedProviderId: string
  selectedProvider: ProviderMetadata | null
  onNext: OnboardingStepNextHandler
  onPrevious: OnboardingStepPrevHandler
}

const props = defineProps<Props>()
const { t } = useI18n()
const providersStore = useProvidersStore()

const apiKey = ref('')
const baseUrl = ref('')
const accountId = ref('')

const validation = ref<'unchecked' | 'pending' | 'succeed' | 'failed'>('unchecked')
const validationError = ref<any>()
let validationRevision = 0

function invalidateValidation() {
  // A provider's network check may finish after an edit, back navigation or
  // unmount. Discard its result; it never validates the new form or next page.
  validationRevision++
  validation.value = 'unchecked'
  validationError.value = undefined
}

onBeforeUnmount(invalidateValidation)

// Initialize form with default values when provider changes
function initializeForm() {
  invalidateValidation()
  const provider = props.selectedProvider
  if (!provider)
    return

  const config = providersStore.getProviderConfig(provider.id) ?? provider.defaultOptions?.() ?? {}
  baseUrl.value = typeof config.baseUrl === 'string' ? config.baseUrl : ''
  apiKey.value = typeof config.apiKey === 'string' ? config.apiKey : ''
  accountId.value = typeof config.accountId === 'string' ? config.accountId : ''
}

// Watch for provider changes
watch(() => [props.selectedProviderId, props.selectedProvider?.id], initializeForm, { flush: 'sync' })

watch([apiKey, baseUrl, accountId], invalidateValidation, { flush: 'sync' })

// Computed properties
const needsApiKey = computed(() => {
  if (!props.selectedProvider)
    return false
  return props.selectedProvider.id !== 'ollama' && props.selectedProvider.id !== 'player2'
})

const needsBaseUrl = computed(() => {
  if (!props.selectedProvider)
    return false
  return props.selectedProvider.id !== 'cloudflare-workers-ai'
})

const canProceed = computed(() => {
  if (!props.selectedProviderId)
    return false

  if (needsApiKey.value && !apiKey.value.trim())
    return false

  if (needsBaseUrl.value && !baseUrl.value.trim())
    return false

  return validation.value !== 'pending'
})

const primaryActionLabel = computed(() => {
  return validation.value === 'failed'
    ? t('settings.dialogs.onboarding.retry')
    : t('settings.dialogs.onboarding.next')
})

async function validateConfiguration(): Promise<{ revision: number, config: ProviderConfigData } | null> {
  if (!props.selectedProvider || !canProceed.value)
    return null

  const revision = ++validationRevision
  const providerId = props.selectedProvider.id
  const input = { apiKey: apiKey.value.trim(), baseUrl: baseUrl.value.trim(), accountId: accountId.value.trim() }

  validation.value = 'pending'
  validationError.value = undefined

  try {
    // Prepare config object
    const config: Record<string, unknown> = {}

    if (needsApiKey.value)
      config.apiKey = input.apiKey
    if (needsBaseUrl.value)
      config.baseUrl = input.baseUrl
    if (providerId === 'cloudflare-workers-ai')
      config.accountId = input.accountId

    // Validate using provider's validator
    const metadata = providersStore.getProviderMetadata(providerId)
    const validationResult = await metadata.validators.validateProviderConfig(config)
    if (revision !== validationRevision)
      return null
    validation.value = validationResult.valid ? 'succeed' : 'failed'
    if (validation.value === 'failed') {
      validationError.value = validationResult.reason
    }
    else {
      return { revision, config: input }
    }
  }
  catch (error) {
    if (revision !== validationRevision)
      return null
    validation.value = 'failed'
    validationError.value = t('settings.dialogs.onboarding.validationError', {
      error: errorMessageFrom(error),
    })
  }
  return null
}

async function handleNext() {
  const validated = await validateConfiguration()
  if (validated?.revision === validationRevision)
    await props.onNext(validated.config)
}

async function handlePrevious() {
  invalidateValidation()
  await props.onPrevious()
}

async function handleContinueAnyway() {
  if (!props.selectedProvider || validation.value !== 'failed')
    return
  const providerId = props.selectedProvider.id

  await props.onNext({
    apiKey: apiKey.value.trim(),
    baseUrl: baseUrl.value.trim(),
    accountId: accountId.value.trim(),
  })
  providersStore.forceProviderConfigured(providerId)
}

// Placeholder helpers
function getApiKeyPlaceholder(providerId: string): string {
  const placeholders: Record<string, string> = {
    'openai': 'sk-...',
    'anthropic': 'sk-ant-...',
    'google-generative-ai': 'AI...',
    'openrouter-ai': 'sk-or-...',
    'deepseek': 'sk-...',
    'xai': 'xai-...',
    'together-ai': 'togetherapi-...',
    'mistral-ai': 'mis-...',
    'moonshot-ai': 'ms-...',
    'modelscope': 'ms-...',
    'fireworks-ai': 'fw-...',
    'featherless-ai': 'fw-...',
    'nvidia': 'nvapi-...',
    'novita-ai': 'nvt-...',
  }

  return placeholders[providerId] || 'API Key'
}

function getBaseUrlPlaceholder(_providerId: string): string {
  const defaultOptions = props.selectedProvider?.defaultOptions?.() || {}
  return (defaultOptions as any)?.baseUrl || 'https://api.example.com/v1/'
}

// Initialize on mount
initializeForm()
</script>

<template>
  <div h-full flex flex-col gap-4>
    <div sticky top-0 z-100 flex flex-shrink-0 items-center gap-2>
      <button type="button" :aria-label="t('settings.common.back')" outline-none @click="handlePrevious">
        <div i-solar:alt-arrow-left-line-duotone h-5 w-5 />
      </button>
      <h2 class="flex-1 text-center text-xl text-neutral-800 font-semibold md:text-left md:text-2xl dark:text-neutral-100">
        {{ t('settings.dialogs.onboarding.configureProvider', { provider: props.selectedProvider?.localizedName }) }}
      </h2>
      <div h-5 w-5 />
    </div>
    <div v-if="props.selectedProvider" flex-1 overflow-y-auto space-y-4>
      <Callout :label="t('settings.dialogs.onboarding.credentialsTitle')" theme="violet">
        <p>{{ t('settings.dialogs.onboarding.credentialsHelp') }}</p>
      </Callout>
      <div class="space-y-4">
        <!-- API Key Input -->
        <div v-if="needsApiKey">
          <FieldInput
            v-model="apiKey"
            :placeholder="getApiKeyPlaceholder(props.selectedProvider.id)"
            type="password"
            :label="t('settings.dialogs.onboarding.apiKey')"
            :description="t('settings.dialogs.onboarding.apiKeyHelp', { provider: props.selectedProvider.localizedName })"
            required
          />
        </div>

        <!-- Base URL Input -->
        <div v-if="needsBaseUrl">
          <FieldInput
            v-model="baseUrl"
            :placeholder="getBaseUrlPlaceholder(props.selectedProvider.id)"
            type="text"
            :label="t('settings.dialogs.onboarding.baseUrl')"
            :description="t('settings.dialogs.onboarding.baseUrlHelp')"
          />
        </div>

        <!-- Account ID for Cloudflare -->
        <div v-if="props.selectedProvider.id === 'cloudflare-workers-ai'">
          <ProviderAccountIdInput v-model="accountId" />
        </div>
      </div>

      <!-- Validation Status -->
      <Alert v-if="validation === 'failed'" type="error">
        <template #title>
          <div class="w-full flex items-center justify-between">
            <span>{{ t('settings.dialogs.onboarding.validationFailed') }}</span>
            <button
              type="button"
              class="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-600 font-medium transition-colors dark:bg-red-800/30 hover:bg-red-200 dark:text-red-300 dark:hover:bg-red-700/40"
              @click="handleContinueAnyway"
            >
              {{ t('settings.pages.providers.common.continueAnyway') }}
            </button>
          </div>
        </template>
        <template v-if="validationError" #content>
          <p>{{ t('settings.dialogs.onboarding.connectionHelp') }}</p>
          <details class="mt-2">
            <summary class="cursor-pointer">
              {{ t('settings.dialogs.onboarding.errorDetails') }}
            </summary>
            <pre class="mt-2 whitespace-pre-wrap break-all">{{ String(validationError).replace(/<[^>]*>/g, '') }}</pre>
          </details>
        </template>
      </Alert>
    </div>

    <!-- Action Buttons -->
    <Button
      :label="primaryActionLabel"
      :loading="validation === 'pending'"
      :disabled="!canProceed"
      @click="handleNext"
    />
  </div>
</template>
