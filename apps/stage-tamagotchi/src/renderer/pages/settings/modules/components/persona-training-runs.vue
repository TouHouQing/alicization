<script setup lang="ts">
import type { AlicizationPersonaTrainingPipelineRunRecord } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { useAlicizationMemoryWorkbenchStore } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'
import { Button } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  datasetId?: string | null
}>()

const store = useAlicizationMemoryWorkbenchStore()
const { t } = useI18n()
const {
  personaTrainingExecutorConfigState,
  personaTrainingIncrements,
  personaTrainingRun,
  personaTrainingRunLoading,
  personaTrainingRuns,
} = storeToRefs(store)

const activeStatuses = new Set(['queued', 'running', 'cancel_requested', 'terminalizing'])
const cancelableStatuses = new Set(['queued', 'running', 'cancel_requested'])
const canStart = computed(() => Boolean(props.datasetId && personaTrainingExecutorConfigState.value.configured))
const hasActiveRun = computed(() => Boolean(personaTrainingRun.value && activeStatuses.has(personaTrainingRun.value.status)))
const canCancel = computed(() => Boolean(personaTrainingRun.value && cancelableStatuses.has(personaTrainingRun.value.status)))
const progressWidth = computed(() => `${Math.round((personaTrainingRun.value?.progress ?? 0) * 100)}%`)

function statusLabel(run: AlicizationPersonaTrainingPipelineRunRecord) {
  return t(`settings.pages.memory.workbench.states.persona_training_${run.status}`)
}

function stageLabel(run: AlicizationPersonaTrainingPipelineRunRecord) {
  return t(`settings.pages.memory.workbench.states.persona_training_stage_${run.stage.replaceAll('-', '_')}`)
}

function compatibilityLabel(status: 'compatible' | 'incompatible' | 'unknown') {
  return t(`settings.pages.memory.workbench.states.persona_training_compatibility_${status}`)
}

function activationLabel(status: 'active' | 'inactive' | 'unsupported') {
  return t(`settings.pages.memory.workbench.states.persona_training_activation_${status}`)
}

function incrementStateLabel(state: 'available' | 'rolled-back' | 'revoked') {
  return t(`settings.pages.memory.workbench.states.persona_training_increment_${state.replaceAll('-', '_')}`)
}

function cleanupStageLabel(stage: 'unload' | 'discard' | 'finalize') {
  return t(`settings.pages.memory.workbench.states.persona_training_cleanup_stage_${stage}`)
}

function formatTimestamp(value: number | null) {
  return value == null || value <= 0 ? '-' : new Date(value).toLocaleString()
}

function cancelActiveRun() {
  if (personaTrainingRun.value)
    void store.cancelPersonaTraining(personaTrainingRun.value.runId, 'user-requested')
}

function refreshPersonaTrainingState() {
  return Promise.all([
    store.refreshPersonaTrainingRuns(),
    store.refreshPersonaTrainingIncrements(),
  ])
}

onMounted(refreshPersonaTrainingState)
</script>

<template>
  <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
    <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
      <div>
        <h2 :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_runs') }}
        </h2>
        <p :class="['mt-1', 'text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_runs_description') }}
        </p>
      </div>
      <div :class="['flex', 'flex-wrap', 'gap-2']">
        <Button
          :label="t('settings.pages.memory.workbench.actions.run_persona_training')"
          icon="i-solar:play-bold-duotone"
          size="sm"
          :disabled="!canStart || hasActiveRun"
          :loading="personaTrainingRunLoading && !personaTrainingRun"
          @click="store.runPersonaTraining(datasetId)"
        />
        <Button
          v-if="canCancel"
          :label="t('settings.pages.memory.workbench.actions.cancel_persona_training')"
          icon="i-solar:stop-circle-bold-duotone"
          size="sm"
          variant="secondary"
          :loading="personaTrainingRunLoading"
          @click="cancelActiveRun()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.refresh_persona_training')"
          icon="i-solar:refresh-bold-duotone"
          size="sm"
          variant="secondary"
          :loading="personaTrainingRunLoading"
          @click="refreshPersonaTrainingState"
        />
      </div>
    </div>

    <div v-if="personaTrainingRun" :class="['mt-4', 'border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
      <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
        <div :class="['text-sm', 'font-semibold']">
          {{ statusLabel(personaTrainingRun) }}
        </div>
        <div :class="['font-mono', 'text-xs', 'text-neutral-500']">
          {{ personaTrainingRun.runId }}
        </div>
      </div>
      <div :class="['mt-2', 'h-2', 'overflow-hidden', 'bg-neutral-100', 'dark:bg-neutral-900']">
        <div :class="['h-full', 'bg-emerald-500', 'transition-[width]']" :style="{ width: progressWidth }" />
      </div>
      <div :class="['mt-2', 'grid', 'grid-cols-1', 'gap-1', 'text-xs', 'text-neutral-500', 'md:grid-cols-3']">
        <div>{{ t('settings.pages.memory.workbench.fields.persona_training_stage') }}: {{ stageLabel(personaTrainingRun) }}</div>
        <div>{{ t('settings.pages.memory.workbench.fields.persona_training_progress') }}: {{ Math.round(personaTrainingRun.progress * 100) }}%</div>
        <div>{{ t('settings.pages.memory.workbench.fields.updated_at') }}: {{ formatTimestamp(personaTrainingRun.updatedAt) }}</div>
      </div>
      <div v-if="personaTrainingRun.progressMessage" :class="['mt-2', 'text-sm']">
        {{ personaTrainingRun.progressMessage }}
      </div>
      <div v-if="personaTrainingRun.error" :class="['mt-2', 'text-sm', 'text-rose-600', 'dark:text-rose-300']">
        {{ personaTrainingRun.error }}
      </div>
      <div v-if="personaTrainingRun.artifact" :class="['mt-3', 'border-t', 'border-neutral-200', 'pt-3', 'text-xs', 'dark:border-neutral-800']">
        <div>{{ t('settings.pages.memory.workbench.fields.persona_training_artifact') }}: {{ personaTrainingRun.artifact.artifactId }}</div>
        <div :class="['mt-1']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_compatibility') }}:
          {{ compatibilityLabel(personaTrainingRun.artifact.compatibility.status) }}
        </div>
        <div
          v-if="personaTrainingRun.artifact.compatibility.reason"
          :class="['mt-1', 'break-words', 'text-neutral-500']"
        >
          {{ t('settings.pages.memory.workbench.fields.persona_training_compatibility_reason') }}:
          {{ personaTrainingRun.artifact.compatibility.reason }}
        </div>
        <div :class="['mt-1']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_activation') }}:
          {{ activationLabel(personaTrainingRun.artifact.activation.status) }}
        </div>
        <div :class="['mt-1', 'break-words', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_activation_reason') }}:
          {{ personaTrainingRun.artifact.activation.reason }}
        </div>
        <div
          v-if="personaTrainingRun.artifact.activation.status === 'active'"
          :class="['mt-2', 'grid', 'gap-1', 'text-neutral-500']"
        >
          <div>
            {{ t('settings.pages.memory.workbench.fields.persona_training_loader_id') }}:
            <span :class="['break-all', 'font-mono']">{{ personaTrainingRun.artifact.activation.loaderId }}</span>
          </div>
          <div>
            {{ t('settings.pages.memory.workbench.fields.persona_training_receipt_id') }}:
            <span :class="['break-all', 'font-mono']">{{ personaTrainingRun.artifact.activation.receiptId }}</span>
          </div>
          <div>
            {{ t('settings.pages.memory.workbench.fields.persona_training_activated_at') }}:
            {{ formatTimestamp(personaTrainingRun.artifact.activation.activatedAt) }}
          </div>
        </div>
        <div :class="['mt-1', 'break-all', 'font-mono', 'text-neutral-500']">
          {{ personaTrainingRun.artifact.path }}
        </div>
      </div>
    </div>

    <div :class="['mt-4', 'grid', 'grid-cols-1', 'gap-4', 'xl:grid-cols-2']">
      <div>
        <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_history') }}
        </div>
        <div v-if="personaTrainingRuns.length === 0" :class="['mt-2', 'border', 'border-dashed', 'border-neutral-300', 'p-3', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
          {{ t('settings.pages.memory.workbench.states.empty_persona_training_runs') }}
        </div>
        <template v-else>
          <button
            v-for="run in personaTrainingRuns"
            :key="run.runId"
            type="button"
            :class="[
              'mt-2', 'block', 'w-full', 'border', 'p-3', 'text-left',
              personaTrainingRun?.runId === run.runId
                ? 'border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900'
                : 'border-neutral-200 dark:border-neutral-800',
            ]"
            @click="store.refreshPersonaTrainingRun(run.runId)"
          >
            <div :class="['flex', 'items-center', 'justify-between', 'gap-2', 'text-xs']">
              <span>{{ statusLabel(run) }}</span>
              <span :class="['text-neutral-500']">{{ formatTimestamp(run.queuedAt) }}</span>
            </div>
            <div :class="['mt-1', 'truncate', 'font-mono', 'text-xs', 'text-neutral-500']">
              {{ run.runId }}
            </div>
          </button>
        </template>
      </div>

      <div>
        <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_increments') }}
        </div>
        <div v-if="personaTrainingIncrements.length === 0" :class="['mt-2', 'border', 'border-dashed', 'border-neutral-300', 'p-3', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
          {{ t('settings.pages.memory.workbench.states.empty_persona_training_increments') }}
        </div>
        <article v-for="increment in personaTrainingIncrements" :key="increment.id" :class="['mt-2', 'border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
          <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
            <span v-if="increment.cleanup" :class="['font-medium', 'text-amber-700', 'dark:text-amber-300']">
              {{ t('settings.pages.memory.workbench.states.persona_training_cleanup_pending') }}
            </span>
            <span v-else>{{ incrementStateLabel(increment.state) }}</span>
            <span>{{ formatTimestamp(increment.createdAt) }}</span>
          </div>
          <div :class="['mt-1', 'truncate', 'font-mono', 'text-xs']">
            {{ increment.id }}
          </div>
          <div v-if="increment.cleanup" :class="['mt-2', 'border-l-2', 'border-amber-400', 'pl-2', 'text-xs']">
            <div>
              {{ t('settings.pages.memory.workbench.fields.persona_training_cleanup_stage') }}:
              {{ cleanupStageLabel(increment.cleanup.stage) }}
            </div>
            <div v-if="increment.cleanup.lastError" :class="['mt-1', 'break-words', 'text-rose-600', 'dark:text-rose-300']">
              {{ t('settings.pages.memory.workbench.fields.persona_training_cleanup_error') }}:
              {{ increment.cleanup.lastError }}
            </div>
          </div>
          <Button
            v-if="increment.state === 'available'"
            :class="['mt-2']"
            :label="t('settings.pages.memory.workbench.actions.rollback_persona_increment')"
            icon="i-solar:restart-bold-duotone"
            size="sm"
            variant="secondary"
            :disabled="Boolean(increment.cleanup)"
            :loading="personaTrainingRunLoading"
            @click="store.rollbackPersonaTrainingIncrement(increment.id)"
          />
        </article>
      </div>
    </div>
  </section>
</template>
