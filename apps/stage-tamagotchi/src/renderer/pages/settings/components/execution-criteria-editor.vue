<script setup lang="ts">
import type { ExecutionCriterion, ExecutionWorkGraphChange, ExecutionWorkStepEdit, TaskAcceptance, WorkPlan, WorkStepResult } from '../../../../shared/execution-contracts'

import { errorMessageFrom } from '@moeru/std'
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button, FieldCheckbox, Input, Select, Textarea } from '@proj-alicization/ui'
import { computed, ref, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ExecutionFutureStepsEditor from './execution-future-steps-editor.vue'

import { electronLifeExecutionCriteriaChange } from '../../../../shared/life-events'
import { applyWorkGraphChanges, duplicateWorkMutationError } from '../../../../shared/work-graph-editing'

const props = withDefaults(defineProps<{ plan: WorkPlan, acceptance: TaskAcceptance, results?: WorkStepResult[] }>(), { results: () => [] })
const emit = defineEmits<{ saved: [], close: [] }>()
const { t } = useI18n()
const change = useElectronEventaInvoke(electronLifeExecutionCriteriaChange)
const criteria = ref<ExecutionCriterion[]>([])
const stepChanges = ref<ExecutionWorkStepEdit[]>([])
const graphChanges = ref<ExecutionWorkGraphChange[]>([])
const pending = ref(false)
const error = ref<string | null>(null)
const newKind = ref<string | number>('text-content')
const projectedSteps = computed(() => {
  try {
    const protectedIds = props.results.filter(result => result.planId === props.plan.id && result.planRevision === props.plan.revision && ['verified', 'running', 'awaiting-verification'].includes(result.state)).map(result => result.stepId)
    return applyWorkGraphChanges(structuredClone(toRaw(props.plan)).steps, graphChanges.value.length ? graphChanges.value.map(item => structuredClone(toRaw(item))) : undefined, protectedIds).steps
  }
  catch { return props.plan.steps }
})
const downloadSteps = computed(() => props.plan.browserBinding?.kind === 'managed' ? projectedSteps.value.filter(step => step.capabilityId === 'tool.browser_click_element').map(step => ({ value: step.id, label: step.id })) : [])
const readSteps = computed(() => projectedSteps.value.filter(step => step.capabilityId === 'tool.filesystem_read_file').map(step => ({ value: step.id, label: step.id })))
const choices = computed(() => ['text-content', 'json-structure', 'file-bytes', 'directory-members', 'user-review', ...(readSteps.value.length ? ['file-matches-read'] : []), ...(downloadSteps.value.length ? ['browser-download'] : [])].map(value => ({ value, label: t(`settings.life.execution.criteria.kind.${value}`) })))
const reviewArtifacts = computed(() => criteria.value.flatMap((item) => {
  if (item.predicate.kind === 'browser-download')
    return [{ id: item.id, label: t('settings.life.execution.criteria.download_artifact', { step: item.predicate.stepId }) }]
  return ['file-bytes', 'file-matches-read', 'text-content', 'json-structure'].includes(item.predicate.kind) && 'path' in item.predicate ? [{ id: item.id, label: item.predicate.path || t('settings.life.execution.criteria.unnamed') }] : []
}))
const cloneCriteria = (values: ExecutionCriterion[]) => values.map(item => structuredClone(toRaw(item)))
// Compare scope values separately: an equivalent live snapshot must not
// discard criteria the host is still editing.
watch([() => props.plan.cardId, () => props.plan.id, () => props.plan.revision, () => props.acceptance.obligationGeneration, () => props.acceptance.contractHash], () => {
  criteria.value = cloneCriteria(props.acceptance.criteria)
  stepChanges.value = []
  graphChanges.value = []
  error.value = null
}, { immediate: true })
function add(value: string | number) {
  const kind = String(value)
  const fileIds = criteria.value.filter(item => ['file-bytes', 'file-matches-read', 'text-content', 'json-structure', 'browser-download'].includes(item.predicate.kind)).map(item => item.id)
  const predicate: ExecutionCriterion['predicate'] = kind === 'user-review'
    ? { kind: 'user-review', question: '', artifactIds: fileIds }
    : kind === 'browser-download'
      ? { kind: 'browser-download', stepId: String(downloadSteps.value[0]?.value ?? ''), minimumBytes: 1 }
      : kind === 'file-matches-read'
        ? { kind: 'file-matches-read', path: '', stepId: String(readSteps.value[0]?.value ?? '') }
        : kind === 'json-structure'
          ? { kind: 'json-structure', path: '', requiredKeys: [] }
          : kind === 'file-bytes'
            ? { kind: 'file-bytes', path: '', sha256: '' }
            : kind === 'directory-members'
              ? { kind: 'directory-members', path: '', names: [], exact: true }
              : { kind: 'text-content', path: '', includes: [] }
  criteria.value.push({ id: `requirement-${crypto.randomUUID()}`, required: true, predicate, proofScope: kind === 'user-review' ? 'user-reported' : ['file-bytes', 'file-matches-read', 'browser-download'].includes(kind) ? 'bytes' : 'structure' })
}
function remove(id: string) {
  criteria.value = criteria.value.filter(item => item.id !== id).map(item => 'artifactIds' in item.predicate ? { ...item, predicate: { ...item.predicate, artifactIds: item.predicate.artifactIds.filter(ref => ref !== id) } } : item)
}
function selectReviewArtifact(item: ExecutionCriterion, id: string, selected: boolean) {
  if (item.predicate.kind !== 'user-review')
    return
  item.predicate.artifactIds = selected ? [...new Set([...item.predicate.artifactIds, id])] : item.predicate.artifactIds.filter(ref => ref !== id)
}
function lines(item: ExecutionCriterion, value: string, field: 'includes' | 'requiredKeys' | 'names') {
  const entries = value.split(/\r?\n/u).filter(line => line.trim())
  if (field === 'includes' && item.predicate.kind === 'text-content')
    item.predicate.includes = entries
  else if (field === 'requiredKeys' && item.predicate.kind === 'json-structure')
    item.predicate.requiredKeys = entries
  else if (field === 'names' && item.predicate.kind === 'directory-members')
    item.predicate.names = entries
}
async function save() {
  if (pending.value)
    return
  pending.value = true
  error.value = null
  try {
    await change({ cardId: props.plan.cardId, planId: props.plan.id, expectedRevision: props.plan.revision, expectedGeneration: props.acceptance.obligationGeneration, contractHash: props.acceptance.contractHash, criteria: cloneCriteria(criteria.value), ...(stepChanges.value.length ? { stepChanges: stepChanges.value.map(item => structuredClone(toRaw(item))) } : {}), ...(graphChanges.value.length ? { graphChanges: graphChanges.value.map(item => structuredClone(toRaw(item))) } : {}), requestId: crypto.randomUUID() })
    emit('saved')
  }
  catch (caught) { error.value = errorMessageFrom(caught) ?? '' }
  finally { pending.value = false }
}
</script>

<template>
  <form :aria-label="t('settings.life.execution.criteria.title')" class="mt-3 space-y-4" @submit.prevent="save">
    <p class="text-sm text-neutral-500">
      {{ t('settings.life.execution.criteria.hint') }}
    </p>
    <fieldset v-for="(item, index) in criteria" :key="item.id" :disabled="pending" class="border-b border-neutral-200 pb-4 space-y-3 dark:border-neutral-800">
      <legend class="font-medium">
        {{ index + 1 }}. {{ t(`settings.life.execution.criteria.kind.${item.predicate.kind}`) }}
      </legend>
      <FieldCheckbox v-model="item.required" :label="t('settings.life.execution.criteria.required')" />
      <label v-if="'path' in item.predicate" class="block text-sm">
        {{ t('settings.life.execution.edit.field.path') }}
        <Input v-model="item.predicate.path" required :maxlength="512" />
      </label>
      <label v-if="item.predicate.kind === 'text-content'" class="block text-sm">
        {{ t('settings.life.execution.criteria.includes') }}
        <Textarea :model-value="item.predicate.includes.join('\n')" required :maxlength="32768" rows="3" @update:model-value="lines(item, $event, 'includes')" />
      </label>
      <label v-else-if="item.predicate.kind === 'json-structure'" class="block text-sm">
        {{ t('settings.life.execution.criteria.keys') }}
        <Textarea :model-value="item.predicate.requiredKeys.join('\n')" :maxlength="32768" rows="3" @update:model-value="lines(item, $event, 'requiredKeys')" />
      </label>
      <label v-else-if="item.predicate.kind === 'file-bytes'" class="block text-sm">
        {{ t('settings.life.execution.criteria.hash') }}
        <Input v-model="item.predicate.sha256" required pattern="[a-f0-9]{64}" :maxlength="64" />
      </label>
      <label v-else-if="item.predicate.kind === 'file-matches-read'" class="block text-sm">
        {{ t('settings.life.execution.criteria.read_step') }}
        <Select v-model="item.predicate.stepId" :options="readSteps" :aria-label="t('settings.life.execution.criteria.read_step')" />
      </label>
      <div v-else-if="item.predicate.kind === 'browser-download'" class="space-y-2">
        <label class="block text-sm">
          {{ t('settings.life.execution.criteria.download_step') }}
          <Select v-model="item.predicate.stepId" :options="downloadSteps" :aria-label="t('settings.life.execution.criteria.download_step')" />
        </label>
        <label class="block text-sm">
          {{ t('settings.life.execution.criteria.minimum_bytes') }}
          <Input v-model.number="item.predicate.minimumBytes" type="number" :min="0" :max="67108864" required />
        </label>
        <label class="block text-sm">
          {{ t('settings.life.execution.criteria.optional_hash') }}
          <Input :model-value="item.predicate.sha256 ?? ''" pattern="[a-f0-9]{64}" :maxlength="64" @update:model-value="item.predicate.sha256 = String($event) || undefined" />
        </label>
      </div>
      <template v-else-if="item.predicate.kind === 'directory-members'">
        <label class="block text-sm">
          {{ t('settings.life.execution.criteria.members') }}
          <Textarea :model-value="item.predicate.names.join('\n')" :maxlength="32768" rows="3" @update:model-value="lines(item, $event, 'names')" />
        </label>
        <FieldCheckbox v-model="item.predicate.exact" :label="t('settings.life.execution.criteria.exact')" />
      </template>
      <div v-else-if="item.predicate.kind === 'user-review'" class="space-y-2">
        <label class="block text-sm">
          {{ t('settings.life.execution.criteria.question') }}
          <Textarea v-model="item.predicate.question" required :maxlength="512" rows="2" />
        </label>
        <p class="text-sm text-neutral-500">
          {{ t('settings.life.execution.criteria.review_files') }}
        </p>
        <FieldCheckbox v-for="artifact in reviewArtifacts" :key="artifact.id" :model-value="item.predicate.artifactIds.includes(artifact.id)" :label="artifact.label" @update:model-value="selectReviewArtifact(item, artifact.id, $event)" />
      </div>
      <p v-else class="text-sm text-neutral-500">
        {{ t('settings.life.execution.criteria.fixed') }}
      </p>
      <Button type="button" size="sm" :label="t('settings.life.execution.criteria.remove')" @click="remove(item.id)" />
    </fieldset>
    <div v-if="criteria.length < 64" class="max-w-sm space-y-2">
      <label class="block text-sm">
        {{ t('settings.life.execution.criteria.choose') }}
        <Select v-model="newKind" :options="choices" :disabled="pending" :aria-label="t('settings.life.execution.criteria.choose')" />
      </label>
      <Button type="button" size="sm" :label="t('settings.life.execution.criteria.add')" :disabled="pending" @click="add(newKind)" />
    </div>
    <ExecutionFutureStepsEditor v-model="stepChanges" v-model:graph-changes="graphChanges" :plan="plan" :results="results" :criteria="criteria" :disabled="pending" />
    <div v-if="error !== null" role="alert" class="text-sm text-red-600">
      {{ t(error.includes(duplicateWorkMutationError) ? 'settings.life.execution.criteria.graph_new_target' : 'settings.life.execution.criteria.failed') }}
      <details v-if="error" class="mt-2 text-neutral-500">
        <summary>{{ t('settings.life.execution.criteria.diagnostics') }}</summary>
        {{ error }}
      </details>
    </div>
    <div class="flex gap-2">
      <Button type="submit" size="sm" :label="t('settings.life.execution.criteria.save')" :disabled="pending || !criteria.some(item => item.required)" />
      <Button type="button" size="sm" :label="t('settings.life.execution.edit.close')" :disabled="pending" @click="emit('close')" />
    </div>
  </form>
</template>
