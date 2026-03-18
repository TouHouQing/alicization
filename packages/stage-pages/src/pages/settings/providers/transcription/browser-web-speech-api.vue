<script setup lang="ts">
import type { RemovableRef } from '@vueuse/core'

import {
  Alert,
  ErrorContainer,
  ProviderBasicSettings,
  ProviderSettingsContainer,
  ProviderSettingsLayout,
} from '@proj-alicization/stage-ui/components'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { streamWebSpeechAPITranscription } from '@proj-alicization/stage-ui/stores/providers/web-speech-api'
import { useSettingsAudioDevice } from '@proj-alicization/stage-ui/stores/settings'
import { Button, FieldSelect } from '@proj-alicization/ui'
import { until } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const providerId = 'browser-web-speech-api'
const { t } = useI18n()
const router = useRouter()

const providersStore = useProvidersStore()
const { providers } = storeToRefs(providersStore) as { providers: RemovableRef<Record<string, any>> }

providersStore.initializeProvider(providerId)

const providerMetadata = computed(() => providersStore.getProviderMetadata(providerId))

// Web Speech API settings (no API key needed, but language and options)
const settings = computed({
  get: () => providers.value[providerId] || {},
  set: (value) => {
    providers.value[providerId] = value
  },
})

const language = computed({
  get: () => settings.value?.language || 'en-US',
  set: (value) => {
    if (!providers.value[providerId])
      providers.value[providerId] = {}
    providers.value[providerId].language = value
  },
})

const continuous = computed({
  get: () => settings.value?.continuous ?? true,
  set: (value) => {
    if (!providers.value[providerId])
      providers.value[providerId] = {}
    providers.value[providerId].continuous = value
  },
})

const interimResults = computed({
  get: () => settings.value?.interimResults ?? true,
  set: (value) => {
    if (!providers.value[providerId])
      providers.value[providerId] = {}
    providers.value[providerId].interimResults = value
  },
})

// Common language options for Web Speech API
const languageOptions = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'English (UK)', value: 'en-GB' },
  { label: 'Spanish', value: 'es-ES' },
  { label: 'French', value: 'fr-FR' },
  { label: 'German', value: 'de-DE' },
  { label: 'Italian', value: 'it-IT' },
  { label: 'Portuguese', value: 'pt-BR' },
  { label: 'Japanese', value: 'ja-JP' },
  { label: 'Korean', value: 'ko-KR' },
  { label: 'Chinese (Simplified)', value: 'zh-CN' },
  { label: 'Chinese (Traditional)', value: 'zh-TW' },
  { label: 'Russian', value: 'ru-RU' },
]

function ensureProviderSettings() {
  if (!providers.value[providerId]) {
    providers.value[providerId] = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
    }
  }
}

function handleResetSettings() {
  providers.value[providerId] = {
    language: 'en-US',
    continuous: true,
    interimResults: true,
  }
}

// Check if Web Speech API is available
const isWebSpeechAPIAvailable = computed(() => {
  return typeof window !== 'undefined'
    && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
})

onMounted(async () => {
  ensureProviderSettings()
  // Audio devices are loaded on demand when user requests them
})

// Speech-to-Text test state (always uses Web Speech API)
const { stopStream, startStream } = useSettingsAudioDevice()
const { audioInputs, selectedAudioInput, stream } = storeToRefs(useSettingsAudioDevice())

const isTestingSTT = ref(false)
const testTranscriptionText = ref<string>('')
const testTranscriptionError = ref<string>('')
const testTranscriptionResult = ref<any>(null)
const isTranscribing = ref(false)
const testStreamingText = ref<string>('')
const testStatusMessage = ref<string>('')
const testStreamWasStarted = ref(false)
const testRecognitionInstance = ref<any>(null)
const testAbortController = ref<AbortController | null>(null)

function handleStreamStartError() {
  testTranscriptionError.value = t('settings.pages.providers.provider.browser-web-speech-api.test.errors.start_stream')
  testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.start_stream_error')
  isTranscribing.value = false
  isTestingSTT.value = false
  testStreamWasStarted.value = false
}

// Speech-to-Text test functions (hardcoded to use Web Speech API)
async function startSTTTest() {
  if (!selectedAudioInput.value) {
    testTranscriptionError.value = t('settings.pages.providers.provider.browser-web-speech-api.test.errors.select_device')
    return
  }

  if (!isWebSpeechAPIAvailable.value) {
    testTranscriptionError.value = t('settings.pages.providers.provider.browser-web-speech-api.test.errors.not_available')
    return
  }

  testTranscriptionError.value = ''
  testTranscriptionText.value = ''
  testStreamingText.value = ''
  testStatusMessage.value = ''
  isTestingSTT.value = true
  isTranscribing.value = true

  try {
    // Ensure audio stream is available
    if (!stream.value) {
      testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.starting_stream')
      testStreamWasStarted.value = true
      await startStream()

      // Wait for the stream to become available with a 3-second timeout.
      try {
        await until(stream).toBeTruthy({ timeout: 3000, throwOnTimeout: true })
      }
      catch {
        handleStreamStartError()
        return
      }

      // Type guard: until guarantees stream.value is truthy, but TypeScript doesn't know this
      if (!stream.value) {
        handleStreamStartError()
        return
      }
    }
    else {
      testStreamWasStarted.value = false
    }

    // Always use Web Speech API for this provider page - call it directly
    testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.starting_transcription')
    console.info('Starting STT test with Web Speech API (direct call)')

    // Call Web Speech API directly instead of going through the hearing pipeline
    // This ensures we always use Web Speech API on this page
    const abortController = new AbortController()
    testAbortController.value = abortController

    if (!stream.value) {
      testTranscriptionError.value = t('settings.pages.providers.provider.browser-web-speech-api.test.errors.audio_unavailable')
      testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.audio_unavailable')
      isTranscribing.value = false
      isTestingSTT.value = false
      return
    }

    const result = streamWebSpeechAPITranscription(stream.value, {
      language: language.value,
      continuous: continuous.value,
      interimResults: interimResults.value,
      abortSignal: abortController.signal,
      onSentenceEnd: (delta) => {
        if (delta && delta.trim()) {
          testStreamingText.value += `${delta} `
          testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.transcribing')
          isTranscribing.value = true
          console.info('Web Speech API test received sentence:', delta)
        }
      },
      onSpeechEnd: (text) => {
        if (text) {
          testTranscriptionText.value = text
          testStreamingText.value = ''
          testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.complete')
          isTranscribing.value = false
          console.info('Web Speech API test completed with text:', text)
        }
        else {
          testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.waiting')
          isTranscribing.value = false
        }
      },
    })

    // Store recognition instance and result for cleanup
    testRecognitionInstance.value = (result as any).recognition
    testTranscriptionResult.value = result

    testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.listening')
    isTranscribing.value = false // Not actively transcribing yet, just listening
  }
  catch (err) {
    testTranscriptionError.value = err instanceof Error ? err.message : String(err)
    testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.generic_error', { error: testTranscriptionError.value })
    isTranscribing.value = false
    isTestingSTT.value = false
    console.error('Web Speech API test error:', err)
  }
}

async function stopSTTTest() {
  isTestingSTT.value = false
  isTranscribing.value = false
  testStatusMessage.value = t('settings.pages.providers.provider.browser-web-speech-api.test.status.stopped')

  try {
    // Stop recognition instance if we have one
    if (testRecognitionInstance.value) {
      try {
        testRecognitionInstance.value.stop()
      }
      catch (err) { console.warn('Error stopping recognition instance:', err) }
      testRecognitionInstance.value = null
    }

    // Abort the abort controller
    if (testAbortController.value && !testAbortController.value.signal.aborted) {
      testAbortController.value.abort()
      testAbortController.value = null
    }
  }
  catch (err) {
    console.error('Error stopping STT test:', err)
  }

  // Finalize transcription if we have streaming text
  if (testStreamingText.value.trim() && !testTranscriptionText.value) {
    testTranscriptionText.value = testStreamingText.value.trim()
  }

  // Stop the stream if we started it for testing
  if (testStreamWasStarted.value) {
    try {
      stopStream()
      testStreamWasStarted.value = false
    }
    catch (err) {
      console.error('Error stopping test stream:', err)
    }
  }

  testTranscriptionResult.value = null
}

onUnmounted(() => {
  stopSTTTest()
})
</script>

<template>
  <ProviderSettingsLayout
    :provider-name="providerMetadata?.localizedName || 'Web Speech API'"
    :provider-icon="providerMetadata?.icon"
    :provider-icon-color="providerMetadata?.iconColor"
    :on-back="() => router.back()"
  >
    <div flex="~ col md:row gap-6">
      <ProviderSettingsContainer class="w-full md:w-[40%] space-y-6">
        <Alert
          v-if="!isWebSpeechAPIAvailable"
          type="error"
        >
          <template #title>
            {{ t('settings.pages.providers.provider.browser-web-speech-api.alerts.not_available.title') }}
          </template>
          <template #content>
            {{ t('settings.pages.providers.provider.browser-web-speech-api.alerts.not_available.description') }}
          </template>
        </Alert>

        <Alert
          v-else
          type="info"
        >
          <template #title>
            {{ t('settings.pages.providers.provider.browser-web-speech-api.alerts.browser_native.title') }}
          </template>
          <template #content>
            {{ t('settings.pages.providers.provider.browser-web-speech-api.alerts.browser_native.description') }}
          </template>
        </Alert>

        <ProviderBasicSettings
          :title="t('settings.pages.providers.common.section.basic.title')"
          :description="t('settings.pages.providers.common.section.basic.description')"
          :on-reset="handleResetSettings"
        >
          <div class="space-y-4">
            <div class="border border-blue-200 rounded-lg bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <div class="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <div i-solar:info-circle-line-duotone class="text-sm" />
                <span class="text-xs font-medium">{{ t('settings.pages.providers.provider.browser-web-speech-api.basic.no_api_key') }}</span>
              </div>
            </div>

            <FieldSelect
              v-model="language"
              :label="t('settings.pages.providers.provider.browser-web-speech-api.basic.language.label')"
              :description="t('settings.pages.providers.provider.browser-web-speech-api.basic.language.description')"
              :options="languageOptions"
              layout="vertical"
            />

            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input
                  v-model="continuous"
                  type="checkbox"
                  class="border-neutral-300 rounded text-primary-600 dark:border-neutral-700 dark:bg-neutral-900 focus:ring-primary-500"
                >
                <span class="text-sm font-medium">{{ t('settings.pages.providers.provider.browser-web-speech-api.basic.continuous.label') }}</span>
              </label>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ t('settings.pages.providers.provider.browser-web-speech-api.basic.continuous.description') }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input
                  v-model="interimResults"
                  type="checkbox"
                  class="border-neutral-300 rounded text-primary-600 dark:border-neutral-700 dark:bg-neutral-900 focus:ring-primary-500"
                >
                <span class="text-sm font-medium">{{ t('settings.pages.providers.provider.browser-web-speech-api.basic.interim_results.label') }}</span>
              </label>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ t('settings.pages.providers.provider.browser-web-speech-api.basic.interim_results.description') }}
              </p>
            </div>
          </div>
        </ProviderBasicSettings>
      </ProviderSettingsContainer>

      <!-- Speech-to-Text Test Section -->
      <div flex="~ col gap-6" class="w-full md:w-[60%]">
        <div w-full rounded-xl bg="neutral-50 dark:[rgba(0,0,0,0.3)]" p-4 flex="~ col gap-4">
          <h2 class="text-lg text-neutral-500 md:text-2xl dark:text-neutral-400">
            {{ t('settings.pages.providers.provider.browser-web-speech-api.test.title') }}
          </h2>
          <div text="sm neutral-400 dark:neutral-500" mb-2>
            {{ t('settings.pages.providers.provider.browser-web-speech-api.test.description') }}
          </div>

          <div v-if="!isWebSpeechAPIAvailable" class="border border-amber-200 rounded-lg bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <div class="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <div i-solar:warning-circle-line-duotone class="text-lg" />
              <span class="text-sm font-medium">{{ t('settings.pages.providers.provider.browser-web-speech-api.test.not_available') }}</span>
            </div>
          </div>

          <div v-else class="flex flex-col gap-4">
            <!-- Audio Input Device Selector - Always visible when Web Speech API is available -->
            <div class="flex items-center gap-2">
              <FieldSelect
                v-model="selectedAudioInput"
                :label="t('settings.pages.providers.provider.browser-web-speech-api.test.audio_input.label')"
                :description="t('settings.pages.providers.provider.browser-web-speech-api.test.audio_input.description')"
                :options="audioInputs.map(input => ({
                  label: input.label || input.deviceId,
                  value: input.deviceId,
                }))"
                :placeholder="t('settings.pages.providers.provider.browser-web-speech-api.test.audio_input.placeholder')"
                layout="vertical"
                class="flex-1"
              />
            </div>

            <!-- Warning if no device selected -->
            <div v-if="!selectedAudioInput" class="border border-amber-200 rounded-lg bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <div class="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <div i-solar:warning-circle-line-duotone class="text-lg" />
                <span class="text-sm font-medium">{{ t('settings.pages.providers.provider.browser-web-speech-api.test.audio_input.select_hint') }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Button
                :disabled="!selectedAudioInput || (isTranscribing && !isTestingSTT)"
                class="flex-1"
                @click="isTestingSTT ? stopSTTTest() : startSTTTest()"
              >
                <div v-if="isTranscribing" class="mr-2 animate-spin">
                  <div i-solar:spinner-line-duotone text-lg />
                </div>
                <div v-else-if="isTestingSTT" class="mr-2">
                  <div i-solar:stop-circle-line-duotone text-lg />
                </div>
                <div v-else class="mr-2">
                  <div i-solar:microphone-line-duotone text-lg />
                </div>
                {{ isTestingSTT ? t('settings.pages.providers.provider.browser-web-speech-api.test.actions.stop') : isTranscribing ? t('settings.pages.providers.provider.browser-web-speech-api.test.actions.transcribing') : t('settings.pages.providers.provider.browser-web-speech-api.test.actions.start') }}
              </Button>
            </div>

            <ErrorContainer v-if="testTranscriptionError" :title="t('settings.pages.providers.provider.browser-web-speech-api.test.error_title')" :error="testTranscriptionError" />

            <div v-if="testStatusMessage" class="border border-primary-200 rounded-lg bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-900/20">
              <div class="flex items-center gap-2 text-primary-700 dark:text-primary-400">
                <div v-if="isTranscribing" class="animate-spin text-sm" i-solar:spinner-line-duotone />
                <div v-else class="text-sm" i-solar:info-circle-line-duotone />
                <span class="text-sm font-medium">{{ testStatusMessage }}</span>
              </div>
            </div>

            <div class="border border-blue-200 rounded-lg bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <div class="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <div i-solar:info-circle-line-duotone class="text-sm" />
                <span class="text-xs">{{ t('settings.pages.providers.provider.browser-web-speech-api.test.streaming_hint') }}</span>
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="mb-1 block text-sm text-neutral-700 font-medium dark:text-neutral-300">
                  {{ t('settings.pages.providers.provider.browser-web-speech-api.test.result.title') }}
                </label>
                <div
                  v-if="testTranscriptionText || testStreamingText"
                  class="min-h-[100px] border border-neutral-200 rounded-lg bg-white p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <div v-if="testStreamingText" class="text-neutral-600 dark:text-neutral-400">
                    <div class="mb-2 font-medium">
                      {{ t('settings.pages.providers.provider.browser-web-speech-api.test.result.current_streaming') }}
                    </div>
                    <div class="whitespace-pre-wrap">
                      {{ testStreamingText }}
                    </div>
                  </div>
                  <div v-if="testTranscriptionText" class="text-neutral-700 dark:text-neutral-200">
                    <div v-if="testStreamingText" class="mb-2 mt-3 border-t border-neutral-200 pt-2 font-medium dark:border-neutral-700">
                      {{ t('settings.pages.providers.provider.browser-web-speech-api.test.result.final') }}
                    </div>
                    <div class="whitespace-pre-wrap">
                      {{ testTranscriptionText }}
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="min-h-[100px] border border-neutral-300 rounded-lg border-dashed bg-neutral-50 p-3 text-sm text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-500"
                >
                  {{ t('settings.pages.providers.provider.browser-web-speech-api.test.result.empty') }}
                </div>
              </div>

              <div class="text-xs text-neutral-500 dark:text-neutral-400">
                <div>{{ t('settings.pages.providers.provider.browser-web-speech-api.test.summary.provider') }} <span class="font-medium">Web Speech API</span></div>
                <div>{{ t('settings.pages.providers.provider.browser-web-speech-api.test.summary.language') }} <span class="font-medium">{{ language }}</span></div>
                <div>{{ t('settings.pages.providers.provider.browser-web-speech-api.test.summary.mode') }} <span class="font-medium">{{ t('settings.pages.providers.provider.browser-web-speech-api.test.summary.streaming_mode') }}</span></div>
                <div>{{ t('settings.pages.providers.provider.browser-web-speech-api.test.summary.continuous') }} <span class="font-medium">{{ continuous ? t('settings.pages.providers.provider.browser-web-speech-api.test.summary.yes') : t('settings.pages.providers.provider.browser-web-speech-api.test.summary.no') }}</span></div>
                <div>{{ t('settings.pages.providers.provider.browser-web-speech-api.test.summary.interim_results') }} <span class="font-medium">{{ interimResults ? t('settings.pages.providers.provider.browser-web-speech-api.test.summary.yes') : t('settings.pages.providers.provider.browser-web-speech-api.test.summary.no') }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ProviderSettingsLayout>
</template>

<route lang="yaml">
meta:
  layout: settings
  stageTransition:
    name: slide
</route>
