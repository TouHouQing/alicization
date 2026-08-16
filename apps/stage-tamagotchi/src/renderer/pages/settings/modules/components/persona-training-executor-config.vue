<script setup lang="ts">
import type { AlicizationPersonaTrainingExecutorConfig } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { useAlicizationMemoryWorkbenchStore } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'
import { Button } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const store = useAlicizationMemoryWorkbenchStore()
const { t } = useI18n()
const {
  personaTrainingExecutorConfigState,
  personaTrainingExecutorConnection,
  personaTrainingExecutorLoading,
} = storeToRefs(store)

const executable = shallowRef('')
const fixedArgumentsText = shallowRef('')
const baseModel = shallowRef('')
const timeoutSeconds = shallowRef('3600')

const config = computed<AlicizationPersonaTrainingExecutorConfig | null>(() => {
  const timeoutMs = Number(timeoutSeconds.value) * 1_000
  if (!executable.value.trim() || !baseModel.value.trim() || !Number.isFinite(timeoutMs) || timeoutMs < 10)
    return null
  return {
    executable: executable.value.trim(),
    fixedArguments: fixedArgumentsText.value
      .split('\n')
      .map(argument => argument.trim())
      .filter(Boolean),
    baseModel: baseModel.value.trim(),
    timeoutMs: Math.floor(timeoutMs),
  }
})

function syncForm(next: AlicizationPersonaTrainingExecutorConfig | null) {
  executable.value = next?.executable ?? ''
  fixedArgumentsText.value = next?.fixedArguments.join('\n') ?? ''
  baseModel.value = next?.baseModel ?? ''
  timeoutSeconds.value = String(Math.max(1, Math.round((next?.timeoutMs ?? 3_600_000) / 1_000)))
}

async function saveConfig() {
  if (config.value)
    await store.savePersonaTrainingExecutorConfig(config.value)
}

async function clearConfig() {
  await store.savePersonaTrainingExecutorConfig(null)
  personaTrainingExecutorConnection.value = null
  syncForm(null)
}

async function testConnection() {
  if (config.value)
    await store.testPersonaTrainingExecutor(config.value)
}

watch(
  () => personaTrainingExecutorConfigState.value.config,
  next => syncForm(next),
  { immediate: true },
)

onMounted(async () => {
  await store.loadPersonaTrainingExecutorConfig()
})
</script>

<template>
  <section :class="['border', 'border-neutral-200', 'bg-white/80', 'p-4', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
    <div :class="['flex', 'flex-col', 'gap-2', 'lg:flex-row', 'lg:items-start', 'lg:justify-between']">
      <div>
        <h2 :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_executor') }}
        </h2>
        <p :class="['mt-1', 'max-w-3xl', 'text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_executor_description') }}
        </p>
      </div>
      <div :class="['flex', 'flex-wrap', 'gap-2']">
        <Button
          :label="t('settings.pages.memory.workbench.actions.test_persona_training_executor')"
          icon="i-solar:plug-circle-bold-duotone"
          size="sm"
          variant="secondary"
          :disabled="!config"
          :loading="personaTrainingExecutorLoading"
          @click="testConnection()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.save_persona_training_executor')"
          icon="i-solar:diskette-bold-duotone"
          size="sm"
          :disabled="!config"
          :loading="personaTrainingExecutorLoading"
          @click="saveConfig()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.clear_persona_training_executor')"
          icon="i-solar:trash-bin-trash-bold-duotone"
          size="sm"
          variant="secondary"
          :disabled="!personaTrainingExecutorConfigState.configured"
          @click="clearConfig()"
        />
      </div>
    </div>

    <div :class="['mt-4', 'grid', 'grid-cols-1', 'gap-3', 'lg:grid-cols-2']">
      <label :class="['grid', 'gap-1', 'lg:col-span-2']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_executable') }}</span>
        <input
          v-model="executable"
          :placeholder="t('settings.pages.memory.workbench.placeholders.persona_training_executable')"
          autocomplete="off"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'font-mono', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_base_model') }}</span>
        <input
          v-model="baseModel"
          :placeholder="t('settings.pages.memory.workbench.placeholders.persona_training_base_model')"
          autocomplete="off"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_timeout') }}</span>
        <input
          v-model="timeoutSeconds"
          type="number"
          min="1"
          step="1"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
      </label>
      <label :class="['grid', 'gap-1', 'lg:col-span-2']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_fixed_arguments') }}</span>
        <textarea
          v-model="fixedArgumentsText"
          rows="3"
          :placeholder="t('settings.pages.memory.workbench.placeholders.persona_training_fixed_arguments')"
          :class="['min-w-0', 'resize-y', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'font-mono', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        />
      </label>
    </div>

    <div
      :class="[
        'mt-3', 'border', 'p-3', 'text-xs',
        personaTrainingExecutorConfigState.configured
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300',
      ]"
    >
      {{ personaTrainingExecutorConfigState.configured
        ? t('settings.pages.memory.workbench.states.persona_training_executor_configured')
        : t('settings.pages.memory.workbench.states.persona_training_executor_not_configured') }}
      <div v-if="personaTrainingExecutorConfigState.error" :class="['mt-1', 'text-rose-600', 'dark:text-rose-300']">
        {{ personaTrainingExecutorConfigState.error }}
      </div>
      <div v-if="personaTrainingExecutorConnection" :class="['mt-2']">
        {{ personaTrainingExecutorConnection.ok
          ? t('settings.pages.memory.workbench.states.persona_training_executor_connected')
          : t('settings.pages.memory.workbench.states.persona_training_executor_connection_failed') }}
        <span v-if="personaTrainingExecutorConnection.executable"> · {{ personaTrainingExecutorConnection.executable }}</span>
        <div v-if="personaTrainingExecutorConnection.error" :class="['mt-1', 'text-rose-600', 'dark:text-rose-300']">
          {{ personaTrainingExecutorConnection.error }}
        </div>
      </div>
    </div>
  </section>
</template>
