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
const baseModel = shallowRef('')
const timeoutSeconds = shallowRef('3600')
const backend = shallowRef<'external' | 'mlx-lm'>('mlx-lm')
const iterations = shallowRef('600')
const learningRate = shallowRef('0.00001')
const loraLayers = shallowRef('8')
const batchSize = shallowRef('1')
const maxSeqLength = shallowRef('2048')
const maskPrompt = shallowRef(false)
const seed = shallowRef('42')

const config = computed<AlicizationPersonaTrainingExecutorConfig | null>(() => {
  const timeoutMs = Number(timeoutSeconds.value) * 1_000
  if (!executable.value.trim() || !baseModel.value.trim() || !Number.isFinite(timeoutMs) || timeoutMs < 10)
    return null
  return {
    executable: executable.value.trim(),
    baseModel: baseModel.value.trim(),
    timeoutMs: Math.floor(timeoutMs),
    backend: backend.value,
    iterations: Math.floor(Number(iterations.value)),
    learningRate: Number(learningRate.value),
    loraLayers: Math.floor(Number(loraLayers.value)),
    batchSize: Math.floor(Number(batchSize.value)),
    maxSeqLength: Math.floor(Number(maxSeqLength.value)),
    maskPrompt: maskPrompt.value,
    seed: Math.floor(Number(seed.value)),
  }
})

function syncForm(next: AlicizationPersonaTrainingExecutorConfig | null) {
  executable.value = next?.executable ?? ''
  baseModel.value = next?.baseModel ?? ''
  timeoutSeconds.value = String(Math.max(1, Math.round((next?.timeoutMs ?? 3_600_000) / 1_000)))
  backend.value = next?.backend ?? 'mlx-lm'
  iterations.value = String(next?.iterations ?? 600)
  learningRate.value = String(next?.learningRate ?? 0.00001)
  loraLayers.value = String(next?.loraLayers ?? 8)
  batchSize.value = String(next?.batchSize ?? 1)
  maxSeqLength.value = String(next?.maxSeqLength ?? 2048)
  maskPrompt.value = next?.maskPrompt === true
  seed.value = String(next?.seed ?? 42)
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
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_backend') }}</span>
        <select
          v-model="backend"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option value="mlx-lm">MLX-LM（Apple Silicon）</option>
          <option value="external">{{ t('settings.pages.memory.workbench.options.persona_training_external') }}</option>
        </select>
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_iterations') }}</span>
        <input v-model="iterations" type="number" min="1" step="1" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_learning_rate') }}</span>
        <input v-model="learningRate" type="number" min="0.0000001" max="1" step="0.000001" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_lora_layers') }}</span>
        <input v-model="loraLayers" type="number" min="1" step="1" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_batch_size') }}</span>
        <input v-model="batchSize" type="number" min="1" step="1" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_max_seq_length') }}</span>
        <input v-model="maxSeqLength" type="number" min="64" step="64" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['grid', 'gap-1']">
        <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.persona_training_seed') }}</span>
        <input v-model="seed" type="number" min="0" step="1" :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']">
      </label>
      <label :class="['flex', 'items-center', 'gap-2', 'text-xs', 'text-neutral-600', 'dark:text-neutral-300']">
        <input v-model="maskPrompt" type="checkbox">
        {{ t('settings.pages.memory.workbench.fields.persona_training_mask_prompt') }}
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
        <span :class="['ml-2', 'font-mono']">
          {{ t(`settings.pages.memory.workbench.states.persona_training_executor_status_${personaTrainingExecutorConnection.status.replaceAll('-', '_')}`) }}
        </span>
        <span v-if="personaTrainingExecutorConnection.executable"> · {{ personaTrainingExecutorConnection.executable }}</span>
        <div v-if="personaTrainingExecutorConnection.error" :class="['mt-1', 'text-rose-600', 'dark:text-rose-300']">
          {{ personaTrainingExecutorConnection.error }}
        </div>
        <div
          v-if="personaTrainingExecutorConnection.diagnostic && personaTrainingExecutorConnection.diagnostic.action !== 'none'"
          :class="['mt-2', 'text-neutral-600', 'dark:text-neutral-300']"
        >
          {{ t(`settings.pages.memory.workbench.states.persona_training_diagnostic_${personaTrainingExecutorConnection.diagnostic.action.replaceAll('-', '_')}`) }}
          <code
            v-if="personaTrainingExecutorConnection.diagnostic.command"
            :class="['mt-1', 'block', 'overflow-x-auto', 'border', 'border-neutral-200', 'bg-neutral-100', 'p-2', 'dark:border-neutral-800', 'dark:bg-neutral-900']"
          >{{ personaTrainingExecutorConnection.diagnostic.command }}</code>
        </div>
      </div>
    </div>
  </section>
</template>
