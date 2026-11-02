<script setup lang="ts">
import type { WorkPlan, WorkStepResult } from '../../../../shared/execution-contracts'

import { errorMessageFrom } from '@moeru/std'
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button, Input, Select, Textarea } from '@proj-alicization/ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { electronLifeExecutionRevise } from '../../../../shared/life-events'
import { isWorkStepEditableField, workStepEditableFields } from '../../../../shared/work-step-editing'

const props = defineProps<{ plan: WorkPlan, results: WorkStepResult[] }>()
const emit = defineEmits<{ saved: [], close: [] }>()
const { t } = useI18n()
const revise = useElectronEventaInvoke(electronLifeExecutionRevise)
const selectedId = ref<string | number>('')
const draft = ref<Record<string, string>>({})
const pending = ref(false)
const error = ref<string | null>(null)
const steps = computed(() => props.plan.steps.filter(step => !props.results.some(result => result.stepId === step.id && ['verified', 'running', 'awaiting-verification'].includes(result.state))))
const options = computed(() => steps.value.map(step => ({ value: step.id, label: `${props.plan.steps.indexOf(step) + 1}. ${t(`settings.life.execution.operation.${step.capabilityId.replace('tool.', '')}`)}` })))
const selected = computed(() => steps.value.find(step => step.id === selectedId.value))
const fields = computed(() => selected.value ? Object.keys(workStepEditableFields).filter(key => isWorkStepEditableField(key, selected.value!.input[key]) && !selected.value!.inputBindings?.some(binding => binding.parameter === key)) : [])
watch(steps, () => {
  if (!steps.value.some(step => step.id === selectedId.value))
    selectedId.value = steps.value[0]?.id ?? ''
}, { immediate: true })
// A refreshed snapshot can replace the plan object without changing its
// revision. Only a different editor scope may replace the host's draft.
watch([() => props.plan.cardId, () => props.plan.id, () => props.plan.revision, selectedId], () => {
  draft.value = Object.fromEntries(fields.value.map(key => [key, workStepEditableFields[key].arguments ? JSON.stringify(selected.value?.input[key], null, 2) : String(selected.value?.input[key] ?? '')]))
  error.value = null
}, { immediate: true })
async function save() {
  if (pending.value || !selected.value || !fields.value.length)
    return
  pending.value = true
  error.value = null
  try {
    await revise({ cardId: props.plan.cardId, planId: props.plan.id, expectedRevision: props.plan.revision, stepId: selected.value.id, changes: Object.fromEntries(fields.value.map(key => [key, draft.value[key]])), requestId: crypto.randomUUID() })
    emit('saved')
  }
  catch (caught) { error.value = errorMessageFrom(caught) ?? t('settings.life.execution.failed') }
  finally { pending.value = false }
}
</script>

<template>
  <form :aria-label="t('settings.life.execution.edit.title')" class="mt-3 space-y-3" @submit.prevent="save">
    <p class="text-sm text-neutral-500">
      {{ t('settings.life.execution.edit.hint') }}
    </p>
    <Select v-model="selectedId" :options="options" :title="t('settings.life.execution.edit.step')" :disabled="pending" />
    <label v-for="key in fields" :key="key" class="block text-sm">
      {{ t(`settings.life.execution.edit.field.${key}`) }}
      <Textarea v-if="workStepEditableFields[key].multiline" v-model="draft[key]" :disabled="pending" :maxlength="workStepEditableFields[key].maxLength" rows="4" />
      <Input v-else v-model="draft[key]" :disabled="pending" :maxlength="workStepEditableFields[key].maxLength" />
      <span v-if="key === 'args'" class="text-xs text-neutral-500">{{ t('settings.life.execution.edit.args_hint') }}</span>
    </label>
    <p v-if="error" role="alert" class="text-sm text-red-600">
      {{ error }}
    </p>
    <div class="flex gap-2">
      <Button type="submit" size="sm" :label="t('settings.life.execution.edit.save')" :disabled="pending || !fields.length" />
      <Button type="button" size="sm" :label="t('settings.life.execution.edit.close')" :disabled="pending" @click="emit('close')" />
    </div>
  </form>
</template>
