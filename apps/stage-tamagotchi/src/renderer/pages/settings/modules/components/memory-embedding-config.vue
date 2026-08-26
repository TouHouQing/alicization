<script setup lang="ts">
import { errorMessageFrom } from '@moeru/std'
import { getAlicizationBridge, hasAlicizationBridge } from '@proj-alicization/stage-ui/stores/alicization-bridge'
import { useAlicizationMemoryWorkbenchStore } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'
import { useConsciousnessStore } from '@proj-alicization/stage-ui/stores/modules/consciousness'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { Button } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const MEMORY_EMBEDDING_CONFIG_KEY = '__alicizationMemoryEmbedding'
const LEGACY_MEMORY_EMBEDDING_CONFIG_KEY = 'alicizationMemoryEmbedding'

const store = useAlicizationMemoryWorkbenchStore()
const providersStore = useProvidersStore()
const consciousnessStore = useConsciousnessStore()
const { t } = useI18n()
const {
  embeddingModels,
  embeddingModelDiscoveryLoading,
  embeddingModelDiscoveryResult,
  embeddingConnectionTesting,
  embeddingConnectionTest,
} = storeToRefs(store)
const { providers } = storeToRefs(providersStore)
const { activeProvider, activeModel } = storeToRefs(consciousnessStore)

const memoryEmbeddingProviderId = shallowRef('openai-compatible')
const memoryEmbeddingBaseUrl = shallowRef('')
const memoryEmbeddingApiKey = shallowRef('')
const memoryEmbeddingModel = shallowRef('')
const memoryEmbeddingModelSearch = shallowRef('')
const memoryEmbeddingDimensions = shallowRef('')
const savedAt = shallowRef<number | null>(null)
const embeddingConfigSaving = shallowRef(false)
const embeddingConfigSaveError = shallowRef<string | null>(null)
let embeddingModelDiscoveryTimer: ReturnType<typeof setTimeout> | null = null

const filteredEmbeddingModels = computed(() => {
  const query = memoryEmbeddingModelSearch.value.trim().toLowerCase()
  if (!query)
    return embeddingModels.value
  return embeddingModels.value.filter((model) => {
    return [
      model.id,
      model.name,
      model.provider,
      model.description ?? '',
    ].join(' ').toLowerCase().includes(query)
  })
})

const canDiscoverEmbeddingModels = computed(() => Boolean(memoryEmbeddingBaseUrl.value.trim()))
const canTestEmbeddingConnection = computed(() => Boolean(memoryEmbeddingBaseUrl.value.trim() && memoryEmbeddingModel.value.trim()))
const savedStatus = computed(() => {
  if (!savedAt.value)
    return null
  return t('settings.pages.memory.workbench.states.embedding_config_saved')
})

function clearEmbeddingModelDiscoveryTimer() {
  if (!embeddingModelDiscoveryTimer)
    return
  clearTimeout(embeddingModelDiscoveryTimer)
  embeddingModelDiscoveryTimer = null
}

function readEmbeddingConfig() {
  const config = providers.value[MEMORY_EMBEDDING_CONFIG_KEY] ?? providers.value[LEGACY_MEMORY_EMBEDDING_CONFIG_KEY] ?? {}
  memoryEmbeddingProviderId.value = String(config.providerId ?? 'openai-compatible')
  memoryEmbeddingBaseUrl.value = String(config.baseUrl ?? config.baseURL ?? '')
  memoryEmbeddingApiKey.value = String(config.apiKey ?? '')
  memoryEmbeddingModel.value = String(config.model ?? config.memoryEmbeddingModel ?? '')
  memoryEmbeddingModelSearch.value = memoryEmbeddingModel.value
  memoryEmbeddingDimensions.value = String(config.dimensions ?? config.memoryEmbeddingDimensions ?? '')
}

async function saveEmbeddingConfig() {
  const current = providers.value[MEMORY_EMBEDDING_CONFIG_KEY] ?? {}
  const dimensions = Number(memoryEmbeddingDimensions.value)
  const nextMemoryConfig = {
    ...current,
    apiKey: memoryEmbeddingApiKey.value.trim(),
    baseUrl: memoryEmbeddingBaseUrl.value.trim(),
    dimensions: Number.isFinite(dimensions) && dimensions > 0 ? Math.floor(dimensions) : undefined,
    model: memoryEmbeddingModel.value.trim(),
    providerId: memoryEmbeddingProviderId.value.trim() || 'openai-compatible',
  }
  const nextProviders = JSON.parse(JSON.stringify({
    ...providers.value,
    [MEMORY_EMBEDDING_CONFIG_KEY]: nextMemoryConfig,
  })) as Record<string, Record<string, unknown>>
  delete nextProviders[LEGACY_MEMORY_EMBEDDING_CONFIG_KEY]
  if (!hasAlicizationBridge() || !getAlicizationBridge().syncLlmConfig) {
    embeddingConfigSaveError.value = t('settings.pages.memory.workbench.states.embedding_config_save_unavailable')
    savedAt.value = null
    return
  }

  embeddingConfigSaving.value = true
  embeddingConfigSaveError.value = null
  savedAt.value = null
  try {
    await getAlicizationBridge().syncLlmConfig!({
      activeProviderId: activeProvider.value || '',
      activeModelId: activeModel.value || '',
      providerCredentials: nextProviders,
    })
    providers.value = nextProviders
    savedAt.value = Date.now()
    await store.refreshSnapshot()
  }
  catch (error) {
    embeddingConfigSaveError.value = errorMessageFrom(error) ?? String(error)
  }
  finally {
    embeddingConfigSaving.value = false
  }
}

async function discoverEmbeddingModels() {
  savedAt.value = null
  await store.discoverEmbeddingModels({
    apiKey: memoryEmbeddingApiKey.value.trim() || null,
    baseUrl: memoryEmbeddingBaseUrl.value.trim(),
    query: memoryEmbeddingModelSearch.value.trim() || null,
  })
}

function selectEmbeddingModel(model: { id: string, dimensions: number | null }) {
  memoryEmbeddingModel.value = model.id
  memoryEmbeddingModelSearch.value = model.id
  if (model.dimensions)
    memoryEmbeddingDimensions.value = String(model.dimensions)
  markEmbeddingConfigDirty()
}

async function testEmbeddingConnection() {
  savedAt.value = null
  const dimensions = Number(memoryEmbeddingDimensions.value)
  const result = await store.testEmbeddingConnection({
    apiKey: memoryEmbeddingApiKey.value.trim() || null,
    baseUrl: memoryEmbeddingBaseUrl.value.trim(),
    dimensions: Number.isFinite(dimensions) && dimensions > 0 ? Math.floor(dimensions) : null,
    model: memoryEmbeddingModel.value.trim(),
  })
  if (result?.ok && result.dimensions)
    memoryEmbeddingDimensions.value = String(result.dimensions)
}

function scheduleEmbeddingModelDiscovery() {
  clearEmbeddingModelDiscoveryTimer()
  if (!canDiscoverEmbeddingModels.value || !memoryEmbeddingApiKey.value.trim())
    return
  embeddingModelDiscoveryTimer = setTimeout(() => {
    void discoverEmbeddingModels()
  }, 700)
}

function markEmbeddingConfigDirty() {
  savedAt.value = null
  embeddingConfigSaveError.value = null
  store.embeddingConnectionTest = null
}

onMounted(() => readEmbeddingConfig())

onUnmounted(() => clearEmbeddingModelDiscoveryTimer())

watch(
  () => providers.value[MEMORY_EMBEDDING_CONFIG_KEY],
  () => readEmbeddingConfig(),
  { deep: true },
)

watch(
  () => providers.value[LEGACY_MEMORY_EMBEDDING_CONFIG_KEY],
  () => readEmbeddingConfig(),
  { deep: true },
)

watch([memoryEmbeddingBaseUrl, memoryEmbeddingApiKey], () => {
  markEmbeddingConfigDirty()
  scheduleEmbeddingModelDiscovery()
})

watch([memoryEmbeddingProviderId, memoryEmbeddingModel, memoryEmbeddingDimensions], () => {
  markEmbeddingConfigDirty()
})
</script>

<template>
  <section :class="['border', 'border-neutral-200', 'bg-white/80', 'p-4', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
    <div :class="['flex', 'flex-col', 'gap-2', 'lg:flex-row', 'lg:items-start', 'lg:justify-between']">
      <div>
        <h2 :class="['text-sm', 'font-semibold', 'text-neutral-950', 'dark:text-neutral-50']">
          {{ t('settings.pages.memory.workbench.fields.embedding_configuration') }}
        </h2>
        <p :class="['mt-1', 'max-w-3xl', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ t('settings.pages.memory.workbench.fields.embedding_configuration_description') }}
        </p>
      </div>
      <div :class="['flex', 'flex-wrap', 'gap-2']">
        <Button
          :label="t('settings.pages.memory.workbench.actions.discover_embedding_models')"
          icon="i-solar:magnifer-bold-duotone"
          size="sm"
          :disabled="!canDiscoverEmbeddingModels"
          :loading="embeddingModelDiscoveryLoading"
          @click="discoverEmbeddingModels()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.test_embedding_connection')"
          icon="i-solar:plug-circle-bold-duotone"
          size="sm"
          variant="secondary"
          :disabled="!canTestEmbeddingConnection"
          :loading="embeddingConnectionTesting"
          @click="testEmbeddingConnection()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.save_embedding_config')"
          icon="i-solar:diskette-bold-duotone"
          size="sm"
          variant="secondary"
          :loading="embeddingConfigSaving"
          :disabled="embeddingConfigSaving"
          @click="saveEmbeddingConfig()"
        />
      </div>
    </div>

    <div :class="['mt-4', 'grid', 'grid-cols-1', 'gap-3', 'lg:grid-cols-2', 'xl:grid-cols-4']">
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.embedding_provider') }}</span>
        <input
          v-model="memoryEmbeddingProviderId"
          :placeholder="t('settings.pages.memory.workbench.placeholders.embedding_provider')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
      </label>
      <label :class="['grid', 'gap-1', 'xl:col-span-2']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.embedding_base_url') }}</span>
        <input
          v-model="memoryEmbeddingBaseUrl"
          :placeholder="t('settings.pages.memory.workbench.placeholders.embedding_base_url')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.embedding_api_key') }}</span>
        <input
          v-model="memoryEmbeddingApiKey"
          type="password"
          autocomplete="off"
          :placeholder="t('settings.pages.memory.workbench.placeholders.embedding_api_key')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
      </label>
      <label :class="['grid', 'gap-1', 'lg:col-span-2']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.embedding_model_search') }}</span>
        <input
          v-model="memoryEmbeddingModelSearch"
          :placeholder="t('settings.pages.memory.workbench.placeholders.embedding_model_search')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
          @keydown.enter.prevent="discoverEmbeddingModels()"
        >
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.embedding_model') }}</span>
        <input
          v-model="memoryEmbeddingModel"
          :placeholder="t('settings.pages.memory.workbench.placeholders.embedding_model')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.embedding_dimensions') }}</span>
        <input
          v-model="memoryEmbeddingDimensions"
          inputmode="numeric"
          :placeholder="t('settings.pages.memory.workbench.placeholders.embedding_dimensions')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
      </label>
    </div>

    <div
      v-if="savedStatus"
      :class="['mt-3', 'border', 'border-emerald-200', 'bg-emerald-50', 'p-2', 'text-xs', 'text-emerald-700', 'dark:border-emerald-900', 'dark:bg-emerald-950/30', 'dark:text-emerald-200']"
    >
      {{ savedStatus }}
    </div>
    <div
      v-if="embeddingConfigSaveError"
      :class="['mt-3', 'border', 'border-red-200', 'bg-red-50', 'p-2', 'text-xs', 'text-red-700', 'dark:border-red-900', 'dark:bg-red-950/30', 'dark:text-red-200']"
    >
      {{ embeddingConfigSaveError }}
    </div>

    <div :class="['mt-4', 'grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-[minmax(0,1fr)_320px]']">
      <div :class="['min-h-24', 'border', 'border-neutral-200', 'dark:border-neutral-800']">
        <div :class="['border-b', 'border-neutral-200', 'px-3', 'py-2', 'text-xs', 'text-neutral-500', 'dark:border-neutral-800']">
          {{ t('settings.pages.memory.workbench.fields.embedding_models') }}
          <span v-if="embeddingModelDiscoveryResult">
            · {{ filteredEmbeddingModels.length }} / {{ embeddingModels.length }}
          </span>
        </div>
        <div v-if="filteredEmbeddingModels.length === 0" :class="['p-3', 'text-sm', 'text-neutral-500']">
          {{ embeddingModelDiscoveryResult?.error ?? t('settings.pages.memory.workbench.states.empty_embedding_models') }}
        </div>
        <div v-else :class="['max-h-64', 'overflow-auto']">
          <button
            v-for="model in filteredEmbeddingModels"
            :key="model.id"
            type="button"
            :class="[
              'flex', 'w-full', 'items-start', 'justify-between', 'gap-3', 'border-b', 'border-neutral-100', 'px-3', 'py-2', 'text-left', 'text-sm', 'last:border-b-0', 'dark:border-neutral-900',
              memoryEmbeddingModel === model.id ? 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900',
            ]"
            @click="selectEmbeddingModel(model)"
          >
            <span :class="['min-w-0']">
              <span :class="['block', 'truncate', 'font-medium']">{{ model.name || model.id }}</span>
              <span :class="['block', 'truncate', 'text-xs', memoryEmbeddingModel === model.id ? 'text-white/70 dark:text-neutral-700' : 'text-neutral-500']">{{ model.id }}</span>
            </span>
            <span :class="['shrink-0', 'text-xs', memoryEmbeddingModel === model.id ? 'text-white/70 dark:text-neutral-700' : 'text-neutral-500']">
              {{ model.dimensions ?? '-' }}
            </span>
          </button>
        </div>
      </div>
      <div :class="['border', embeddingConnectionTest?.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300', 'p-3', 'text-sm']">
        <div :class="['font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.embedding_connection') }}
        </div>
        <div :class="['mt-2', 'grid', 'gap-1', 'text-xs']">
          <div>{{ t('settings.pages.memory.workbench.fields.status') }}: {{ embeddingConnectionTest ? (embeddingConnectionTest.ok ? t('settings.pages.memory.workbench.fields.available') : t('settings.pages.memory.workbench.fields.unavailable')) : '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.model') }}: {{ embeddingConnectionTest?.modelId ?? '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.dimensions') }}: {{ embeddingConnectionTest?.dimensions ?? '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.recall_latency') }}: {{ embeddingConnectionTest?.latencyMs ?? '-' }} ms</div>
          <div v-if="embeddingConnectionTest?.error">
            {{ t('settings.pages.memory.workbench.fields.errors') }}: {{ embeddingConnectionTest.error }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
