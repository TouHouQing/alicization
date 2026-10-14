<script setup lang="ts">
import type { SpeechProvider } from '@xsai-ext/providers/utils'

import { errorMessageFrom } from '@moeru/std'
import {
  SpeechPlayground,
  SpeechProviderSettings,
} from '@proj-alicization/stage-ui/components'
import { useSpeechStore } from '@proj-alicization/stage-ui/stores/modules/speech'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { getDefaultKokoroModel, kokoroModelsToModelInfo } from '@proj-alicization/stage-ui/workers/kokoro/constants'
import { Button, Callout, Progress, Select } from '@proj-alicization/ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const providerId = 'kokoro-local'
const defaultModel = 'kokoro-82m'
const speechStore = useSpeechStore()
const providersStore = useProvidersStore()
const { t } = useI18n()
const loadedModel = ref('')
const loadError = ref('')
const loadProgress = ref(0)

// Get provider config
const providerConfig = computed(() => {
  return providersStore.getProviderConfig(providerId)
})

// Check if WebGPU is supported
const hasWebGPU = typeof navigator !== 'undefined' && !!navigator.gpu

// Track voices loading state
const voicesLoading = ref(false)

// Model computed property
const model = computed({
  get(): string {
    const currentValue = providerConfig.value?.model as string
    if (currentValue)
      return currentValue

    return getDefaultKokoroModel(hasWebGPU)
  },
  set(val: string) {
    const config = providersStore.getProviderConfig(providerId)
    config.model = val
  },
})

// Model options for the dropdown
const availableVoices = computed(() => loadedModel.value === model.value ? speechStore.availableVoices[providerId] || [] : [])

const modelOptions = computed(() => {
  // These choices are local metadata and must exist on the first render.
  return kokoroModelsToModelInfo(hasWebGPU, t).map(m => ({
    label: m.name,
    value: m.id,
  }))
})

// Generate speech with Kokoro-specific parameters
async function handleGenerateSpeech(input: string, voiceId: string, _useSSML: boolean) {
  try {
    const provider = await providersStore.getProviderInstance(providerId) as SpeechProvider
    if (!provider) {
      console.error('[Kokoro Playground] Failed to get provider instance')
      throw new Error('Failed to initialize speech provider')
    }

    const config = providersStore.getProviderConfig(providerId)
    const selectedModel = config.model as string | undefined || defaultModel

    const result = await speechStore.speech(
      provider,
      selectedModel,
      input,
      voiceId,
      {
        ...config,
      },
    )

    return result
  }
  catch (error) {
    console.error('[Kokoro Playground] Error generating speech:', error)
    throw error
  }
}

async function loadSelectedModel() {
  if (voicesLoading.value)
    return
  voicesLoading.value = true
  loadedModel.value = ''
  loadError.value = ''
  loadProgress.value = 0
  try {
    const config = providersStore.getProviderConfig(providerId)
    config.model = model.value
    const metadata = providersStore.getProviderMetadata(providerId)
    const validationResult = await metadata.validators.validateProviderConfig(config)
    if (!validationResult.valid)
      throw new Error(validationResult.reason)
    if (!metadata.capabilities.loadModel)
      throw new Error('Kokoro model loading is unavailable')
    await metadata.capabilities.loadModel(config, {
      onProgress: (progress) => {
        if ('progress' in progress && typeof progress.progress === 'number')
          loadProgress.value = Math.max(0, Math.min(100, progress.progress))
      },
    })
    const voices = await speechStore.loadVoicesForProvider(providerId)
    if (!voices.length)
      throw new Error('The loaded model did not provide any voices')
    loadedModel.value = model.value
  }
  catch (error) {
    loadError.value = errorMessageFrom(error) ?? t('settings.pages.providers.provider.kokoro-local.loading.failed')
  }
  finally {
    voicesLoading.value = false
  }
}

watch(model, () => {
  loadedModel.value = ''
  loadError.value = ''
  loadProgress.value = 0
})
</script>

<template>
  <SpeechProviderSettings
    :provider-id="providerId"
    :default-model="defaultModel"
    :auto-load-voices="false"
    :show-api-key="false"
  >
    <template #voice-settings>
      <!-- Model Selection -->
      <div class="space-y-3">
        <Callout :label="t('settings.pages.providers.provider.kokoro-local.fields.field.model.label')">
          <div>
            <p>{{ t('settings.pages.providers.provider.kokoro-local.fields.field.model.description') }}</p>
          </div>
        </Callout>
        <div>
          <Select
            v-model="model"
            :options="modelOptions"
            :disabled="voicesLoading"
            :placeholder="t('settings.pages.providers.provider.common.speech_model.select_placeholder')"
          />
        </div>
        <p class="text-sm text-neutral-500">
          {{ t('settings.pages.providers.provider.kokoro-local.loading.description') }}
        </p>
        <Button
          :disabled="voicesLoading"
          :loading="voicesLoading"
          :label="t(voicesLoading ? 'settings.pages.providers.provider.kokoro-local.loading.busy' : loadError ? 'settings.pages.providers.provider.kokoro-local.loading.retry' : 'settings.pages.providers.provider.kokoro-local.loading.start')"
          @click="loadSelectedModel"
        />
        <div v-if="voicesLoading" role="status">
          <Progress :progress="loadProgress" />
          <p>{{ t('settings.pages.providers.provider.kokoro-local.loading.progress', { percent: Math.round(loadProgress) }) }}</p>
        </div>
        <p v-if="loadError" role="alert" class="text-sm text-red-600 dark:text-red-400">
          {{ t('settings.pages.providers.provider.kokoro-local.loading.failed') }}
        </p>
        <details v-if="loadError" class="text-sm text-neutral-500">
          <summary>{{ t('settings.pages.providers.provider.kokoro-local.loading.details') }}</summary>
          <p class="break-words">
            {{ loadError }}
          </p>
        </details>
      </div>
    </template>

    <!-- Replace the default playground with our standalone component -->
    <template #playground>
      <SpeechPlayground
        :available-voices="availableVoices"
        :generate-speech="handleGenerateSpeech"
        :api-key-configured="loadedModel === model"
        :voices-loading="voicesLoading"
        :default-text="t('settings.pages.providers.provider.kokoro-local.playground.default-text')"
      />
    </template>
  </SpeechProviderSettings>
</template>

<route lang="yaml">
  meta:
    layout: settings
    stageTransition:
      name: slide
</route>
