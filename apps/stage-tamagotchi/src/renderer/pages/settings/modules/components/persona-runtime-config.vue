<script setup lang="ts">
import type { AlicizationPersonaRuntimeConfig } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { useAlicizationMemoryWorkbenchStore } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'
import { Button } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const store = useAlicizationMemoryWorkbenchStore()
const { t } = useI18n()
const {
  personaRuntimeConfigState,
  personaRuntimeConnection,
  personaRuntimeLoading,
} = storeToRefs(store)

const executable = shallowRef('')
const modelPath = shallowRef('')
const host = shallowRef('127.0.0.1')
const port = shallowRef('18181')
const modelAlias = shallowRef('alicization-persona')
const startupTimeoutSeconds = shallowRef('120')

const config = computed<AlicizationPersonaRuntimeConfig | null>(() => {
  const parsedPort = Number(port.value)
  const startupTimeoutMs = Number(startupTimeoutSeconds.value) * 1_000
  if (
    !executable.value.trim()
    || !modelPath.value.trim()
    || !host.value.trim()
    || !modelAlias.value.trim()
    || !Number.isSafeInteger(parsedPort)
    || !Number.isSafeInteger(startupTimeoutMs)
  ) {
    return null
  }
  return {
    executable: executable.value.trim(),
    modelPath: modelPath.value.trim(),
    host: host.value.trim(),
    port: parsedPort,
    modelAlias: modelAlias.value.trim(),
    startupTimeoutMs,
  }
})

function syncForm(next: AlicizationPersonaRuntimeConfig | null) {
  executable.value = next?.executable ?? ''
  modelPath.value = next?.modelPath ?? ''
  host.value = next?.host ?? '127.0.0.1'
  port.value = String(next?.port ?? 18181)
  modelAlias.value = next?.modelAlias ?? 'alicization-persona'
  startupTimeoutSeconds.value = String(Math.max(1, Math.round((next?.startupTimeoutMs ?? 120_000) / 1_000)))
}

async function saveConfig() {
  if (config.value)
    await store.savePersonaRuntimeConfig(config.value)
}

async function clearConfig() {
  await store.savePersonaRuntimeConfig(null)
  personaRuntimeConnection.value = null
  syncForm(null)
}

async function testConnection() {
  if (config.value)
    await store.testPersonaRuntime(config.value)
}

watch(
  () => personaRuntimeConfigState.value.config,
  next => syncForm(next),
  { immediate: true },
)

onMounted(async () => {
  await store.loadPersonaRuntimeConfig()
})
</script>

<template>
  <section :class="['border', 'border-neutral-200', 'bg-white/80', 'p-4', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
    <div :class="['flex', 'flex-col', 'gap-2', 'lg:flex-row', 'lg:items-start', 'lg:justify-between']">
      <div>
        <h2 :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.persona_runtime') }}
        </h2>
        <p :class="['mt-1', 'max-w-3xl', 'text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.persona_runtime_description') }}
        </p>
      </div>
      <div :class="['flex', 'flex-wrap', 'gap-2']">
        <Button
          :label="t('settings.pages.memory.workbench.actions.test_persona_runtime')"
          icon="i-solar:plug-circle-bold-duotone"
          size="sm"
          variant="secondary"
          :disabled="!config"
          :loading="personaRuntimeLoading"
          @click="testConnection()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.save_persona_runtime')"
          icon="i-solar:diskette-bold-duotone"
          size="sm"
          :disabled="!config"
          :loading="personaRuntimeLoading"
          @click="saveConfig()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.clear_persona_runtime')"
          icon="i-solar:trash-bin-trash-bold-duotone"
          size="sm"
          variant="secondary"
          :disabled="!personaRuntimeConfigState.configured"
          @click="clearConfig()"
        />
      </div>
    </div>

    <div :class="['mt-4', 'grid', 'grid-cols-1', 'gap-3', 'lg:grid-cols-2']">
      <label :class="['grid', 'gap-1', 'lg:col-span-2']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_runtime_executable') }}</span>
        <input v-model="executable" :placeholder="t('settings.pages.memory.workbench.placeholders.persona_runtime_executable')" autocomplete="off" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'font-mono', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1', 'lg:col-span-2']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_runtime_model_path') }}</span>
        <input v-model="modelPath" :placeholder="t('settings.pages.memory.workbench.placeholders.persona_runtime_model_path')" autocomplete="off" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'font-mono', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_runtime_host') }}</span>
        <input v-model="host" autocomplete="off" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_runtime_port') }}</span>
        <input v-model="port" type="number" min="1024" max="65535" step="1" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_runtime_model_alias') }}</span>
        <input v-model="modelAlias" autocomplete="off" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_runtime_startup_timeout') }}</span>
        <input v-model="startupTimeoutSeconds" type="number" min="1" step="1" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
    </div>

    <div :class="['mt-3', 'border', 'p-3', 'text-xs', personaRuntimeConfigState.active ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300']">
      {{ personaRuntimeConfigState.active
        ? t('settings.pages.memory.workbench.states.persona_runtime_active')
        : personaRuntimeConfigState.configured
          ? t('settings.pages.memory.workbench.states.persona_runtime_configured')
          : t('settings.pages.memory.workbench.states.persona_runtime_not_configured') }}
      <div v-if="personaRuntimeConfigState.routeBaseUrl" :class="['mt-1', 'font-mono']">
        {{ personaRuntimeConfigState.routeBaseUrl }}
      </div>
      <div v-if="personaRuntimeConfigState.artifactId" :class="['mt-1', 'font-mono']">
        {{ personaRuntimeConfigState.artifactId }}
      </div>
      <div v-if="personaRuntimeConfigState.error" :class="['mt-1', 'text-rose-600', 'dark:text-rose-300']">
        {{ personaRuntimeConfigState.error }}
      </div>
      <div v-if="personaRuntimeConnection" :class="['mt-2']">
        {{ personaRuntimeConnection.ok
          ? t('settings.pages.memory.workbench.states.persona_runtime_connected')
          : t('settings.pages.memory.workbench.states.persona_runtime_connection_failed') }}
        <span v-if="personaRuntimeConnection.baseUrl"> · {{ personaRuntimeConnection.baseUrl }}</span>
        <div v-if="personaRuntimeConnection.error" :class="['mt-1', 'text-rose-600', 'dark:text-rose-300']">
          {{ personaRuntimeConnection.error }}
        </div>
      </div>
    </div>
  </section>
</template>
