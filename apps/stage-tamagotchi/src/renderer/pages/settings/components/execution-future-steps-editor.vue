<script setup lang="ts">
import type { ExecutionCriterion, ExecutionWorkGraphChange, ExecutionWorkStepEdit, WorkPlan, WorkStepResult } from '../../../../shared/execution-contracts'

import { errorMessageFrom } from '@moeru/std'
import { Button, FieldCheckbox, Input, Select, Textarea } from '@proj-alicization/ui'
import { computed, shallowRef, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { applyWorkGraphChanges } from '../../../../shared/work-graph-editing'
import { isWorkStepEditableField, parseWorkStepEdit, workStepEditableFields } from '../../../../shared/work-step-editing'

const props = withDefaults(defineProps<{ plan: WorkPlan, results: WorkStepResult[], disabled: boolean, criteria?: ExecutionCriterion[] }>(), { criteria: () => [] })
const changesModel = defineModel<ExecutionWorkStepEdit[]>({ required: true })
// Consecutive field events can arrive before the parent's model echo renders.
const changes = shallowRef(changesModel.value)
watch(changesModel, (value) => {
  changes.value = value
}, { flush: 'sync' })
watch(changes, (value) => {
  changesModel.value = value
}, { flush: 'sync' })
const graphChanges = defineModel<ExecutionWorkGraphChange[]>('graphChanges', { required: true })
const { t } = useI18n()
const selectedId = shallowRef<string | number>('')
const templateId = shallowRef<string | number>('')
const afterId = shallowRef<string | number>('')
const graphError = shallowRef<string | null>(null)
function plain<T>(value: T) {
  return structuredClone(toRaw(value))
}
const protectedIds = computed(() => props.results.filter(result => result.planId === props.plan.id && result.planRevision === props.plan.revision && ['verified', 'running', 'awaiting-verification'].includes(result.state)).map(result => result.stepId))
const projection = computed(() => {
  try {
    return { steps: applyWorkGraphChanges(plain(props.plan).steps, graphChanges.value.length ? graphChanges.value.map(plain) : undefined, protectedIds.value).steps, error: null }
  }
  catch (error) { return { steps: props.plan.steps, error: errorMessageFrom(error) ?? '' } }
})
const fieldsFor = (step: WorkPlan['steps'][number]) => Object.keys(workStepEditableFields).filter(key => isWorkStepEditableField(key, step.input[key]) && !step.inputBindings?.some(binding => binding.parameter === key))
const steps = computed(() => projection.value.steps.filter(step => !protectedIds.value.includes(step.id)))
const label = (step: WorkPlan['steps'][number]) => `${projection.value.steps.findIndex(item => item.id === step.id) + 1}. ${t(`settings.life.execution.operation.${step.capabilityId.replace('tool.', '')}`)}`
const options = computed(() => steps.value.map(step => ({ value: step.id, label: label(step) })))
const graphOptions = computed(() => projection.value.steps.map(step => ({ value: step.id, label: label(step) })))
const selected = computed(() => steps.value.find(step => step.id === selectedId.value))
const fields = computed(() => selected.value ? fieldsFor(selected.value) : [])
const values = computed(() => Object.fromEntries(fields.value.map(key => [key, changes.value.find(item => item.stepId === selectedId.value)?.changes[key] ?? (workStepEditableFields[key].arguments ? JSON.stringify(selected.value!.input[key], null, 2) : String(selected.value!.input[key]))])))
watch(steps, () => {
  if (!steps.value.some(step => step.id === selectedId.value))
    selectedId.value = steps.value[0]?.id ?? ''
}, { immediate: true })
watch(selectedId, (value) => {
  templateId.value = value
  afterId.value = value
}, { immediate: true })
watch(projection, ({ steps }) => {
  const fallback = selectedId.value || steps.at(-1)?.id || ''
  if (!steps.some(step => step.id === templateId.value))
    templateId.value = fallback
  if (!steps.some(step => step.id === afterId.value))
    afterId.value = fallback
}, { immediate: true })
watch([() => props.plan.cardId, () => props.plan.id, () => props.plan.revision], () => {
  graphError.value = null
})
function changeGraph(change: ExecutionWorkGraphChange) {
  if (props.disabled)
    return
  try {
    if (change.kind === 'remove' && props.criteria.some(item => 'stepId' in item.predicate && item.predicate.stepId === change.stepId))
      throw new Error('The selected step is still required by the acceptance criteria')
    const next = [...graphChanges.value.map(plain), change]
    const graph = applyWorkGraphChanges(plain(props.plan).steps, next, protectedIds.value)
    graphChanges.value = graph.changed ? next : []
    changes.value = changes.value.filter(item => graph.steps.some(step => step.id === item.stepId))
    if (change.kind === 'insert-after') {
      const sourceDraft = changes.value.find(item => item.stepId === change.templateStepId)
      if (sourceDraft)
        changes.value = [...changes.value, { stepId: change.stepId, changes: { ...sourceDraft.changes } }]
      selectedId.value = change.stepId
    }
    graphError.value = null
  }
  catch (error) { graphError.value = errorMessageFrom(error) ?? '' }
}
function dependency(parentId: string, checked: boolean) {
  if (!selected.value)
    return
  const next = checked ? [...new Set([...selected.value.dependsOn, parentId])] : selected.value.dependsOn.filter(id => id !== parentId)
  changeGraph({ kind: 'dependencies', stepId: selected.value.id, dependsOn: next })
}
function resetGraph() {
  graphChanges.value = []
  changes.value = changes.value.filter(item => props.plan.steps.some(step => step.id === item.stepId) && !protectedIds.value.includes(item.stepId))
  graphError.value = null
}
function insertStep() {
  changeGraph({ kind: 'insert-after', stepId: `step-${crypto.randomUUID()}`, templateStepId: String(templateId.value), afterStepId: String(afterId.value) })
}
function update(key: string, text: string | number | undefined) {
  if (!selected.value || props.disabled)
    return
  const value = text === undefined ? '' : String(text)
  const entry = changes.value.find(item => item.stepId === selectedId.value)
  const next = { ...entry?.changes, [key]: value }
  // Formatting an argument array alone does not create a semantic edit.
  try {
    if (JSON.stringify(parseWorkStepEdit(key, value)) === JSON.stringify(selected.value.input[key]))
      delete next[key]
  }
  catch { /* Keep incomplete input in the draft; save reports validation errors. */ }
  changes.value = [...changes.value.filter(item => item.stepId !== selectedId.value), ...(Object.keys(next).length ? [{ stepId: String(selectedId.value), changes: next }] : [])]
}
</script>

<template>
  <section v-if="plan.steps.length" data-future-step-edits :data-work-selected-step-id="selected?.id ?? ''" class="border-t border-neutral-200 pt-4 space-y-3 dark:border-neutral-800">
    <h3 class="font-medium">
      {{ t('settings.life.execution.criteria.future_steps') }}
    </h3>
    <p class="text-sm text-neutral-500">
      {{ t('settings.life.execution.criteria.future_hint') }}
    </p>
    <Select v-if="steps.length" v-model="selectedId" :options="options" :disabled="disabled" :aria-label="t('settings.life.execution.edit.step')" />
    <p v-else class="text-sm text-neutral-500">
      {{ t('settings.life.execution.criteria.graph_no_pending') }}
    </p>
    <label v-for="key in fields" :key="key" class="block text-sm">
      {{ t(`settings.life.execution.edit.field.${key}`) }}
      <Textarea v-if="workStepEditableFields[key].multiline" :model-value="values[key]" :disabled="disabled" :maxlength="workStepEditableFields[key].maxLength" rows="3" @update:model-value="update(key, $event)" />
      <Input v-else :model-value="values[key]" :disabled="disabled" :maxlength="workStepEditableFields[key].maxLength" @update:model-value="update(key, $event)" />
      <span v-if="key === 'args'" class="text-xs text-neutral-500">{{ t('settings.life.execution.edit.args_hint') }}</span>
    </label>
    <details data-work-graph-edits class="text-sm space-y-3">
      <summary class="cursor-pointer font-medium">
        {{ t('settings.life.execution.criteria.graph_title') }}
      </summary>
      <p class="text-neutral-500">
        {{ t('settings.life.execution.criteria.graph_hint') }}
      </p>
      <label class="block">
        {{ t('settings.life.execution.criteria.graph_template') }}
        <Select v-model="templateId" :options="graphOptions" :disabled="disabled" :aria-label="t('settings.life.execution.criteria.graph_template')" />
      </label>
      <label class="block">
        {{ t('settings.life.execution.criteria.graph_after') }}
        <Select v-model="afterId" :options="graphOptions" :disabled="disabled" :aria-label="t('settings.life.execution.criteria.graph_after')" />
      </label>
      <div class="flex flex-wrap gap-2">
        <Button type="button" size="sm" :label="t('settings.life.execution.criteria.graph_insert')" :disabled="disabled || projection.steps.length >= 256 || graphChanges.length >= 256" @click="insertStep" />
        <Button v-if="selected" type="button" size="sm" :label="t('settings.life.execution.criteria.graph_remove')" :disabled="disabled || projection.steps.length <= 1 || graphChanges.length >= 256" @click="changeGraph({ kind: 'remove', stepId: selected.id })" />
      </div>
      <div v-if="selected" class="space-y-2">
        <p>{{ t('settings.life.execution.criteria.graph_dependencies') }}</p>
        <div class="max-h-48 overflow-y-auto space-y-2">
          <FieldCheckbox v-for="step in projection.steps.filter(item => item.id !== selectedId)" :key="step.id" :label="label(step)" :model-value="selected.dependsOn.includes(step.id)" :disabled="disabled || selected.inputBindings?.some(binding => binding.stepId === step.id) || graphChanges.length >= 256" @update:model-value="dependency(step.id, $event)" />
        </div>
      </div>
      <p v-if="graphChanges.length" role="status" class="text-neutral-500">
        {{ t('settings.life.execution.criteria.graph_count', { count: graphChanges.length }) }}
      </p>
      <Button type="button" size="sm" :label="t('settings.life.execution.criteria.graph_reset')" :disabled="disabled || !graphChanges.length" @click="resetGraph" />
      <div v-if="graphError !== null || projection.error !== null" role="alert" class="text-red-600">
        {{ t('settings.life.execution.criteria.graph_invalid') }}
        <details class="text-neutral-500">
          <summary>{{ t('settings.life.execution.criteria.diagnostics') }}</summary>
          {{ graphError ?? projection.error }}
        </details>
      </div>
    </details>
    <p role="status" class="text-sm text-neutral-500">
      {{ t('settings.life.execution.criteria.future_count', { count: changes.length }) }}
    </p>
    <Button v-if="selected" type="button" size="sm" :label="t('settings.life.execution.criteria.future_reset')" :disabled="disabled || !changes.some(item => item.stepId === selectedId)" @click="changes = changes.filter(item => item.stepId !== selectedId)" />
  </section>
</template>
