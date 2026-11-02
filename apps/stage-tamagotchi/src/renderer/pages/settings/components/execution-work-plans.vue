<script setup lang="ts">
import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { LifeStateView } from '../../../../shared/life-contracts'

import { errorMessageFrom } from '@moeru/std'
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button } from '@proj-alicization/ui'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ExecutionCriteriaEditor from './execution-criteria-editor.vue'
import ExecutionStepEditor from './execution-step-editor.vue'

import { projectExecutionArtifacts } from '../../../../shared/execution-artifacts'
import { executionWorkBlocker } from '../../../../shared/execution-work-blocker'
import { electronLifeExecutionArtifact, electronLifeExecutionReobserve, electronLifeExecutionReview, electronLifeExecutionRun, electronLifeExecutionStop } from '../../../../shared/life-events'

const props = defineProps<{ view: LifeStateView, refresh: () => Promise<void> }>()
const { t } = useI18n()
const run = useElectronEventaInvoke(electronLifeExecutionRun)
const reobserve = useElectronEventaInvoke(electronLifeExecutionReobserve)
const stop = useElectronEventaInvoke(electronLifeExecutionStop)
const review = useElectronEventaInvoke(electronLifeExecutionReview)
const openArtifact = useElectronEventaInvoke(electronLifeExecutionArtifact)
const pending = ref<string | null>(null)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const editing = ref<string | null>(null)
const changingCriteria = ref<string | null>(null)
function beginEdit(planId: string, kind: 'steps' | 'criteria') {
  notice.value = null
  error.value = null
  editing.value = kind === 'steps' ? planId : null
  changingCriteria.value = kind === 'criteria' ? planId : null
}
const plans = computed(() => (props.view.execution?.plans ?? []).map((plan) => {
  const goal = props.view.obligations.find(item => item.id === plan.rootObligationId)
  const slice = props.view.execution?.slices.find(item => item.planId === plan.id && item.planRevision === plan.revision)
  const results = props.view.execution?.results.filter(item => item.planId === plan.id && item.planRevision === plan.revision) ?? []
  const steps = plan.steps.map(step => ({ ...step, result: results.find(item => item.stepId === step.id) }))
  const criteria = goal?.proof.acceptance?.criteria ?? []
  const artifacts = projectExecutionArtifacts(goal, plan)
  const reviews = criteria.filter(item => item.predicate.kind === 'user-review')
  return { plan, goal, slice, steps, results, artifacts, reviews, blocker: executionWorkBlocker(props.view, plan), browserPending: steps.some(step => step.capabilityId.startsWith('tool.browser_') && step.result?.state !== 'verified'), repairable: steps.some(step => !['verified', 'running', 'awaiting-verification'].includes(step.result?.state ?? 'pending')), observed: steps.filter(item => item.result?.state === 'verified').length, stopped: !slice || ['yielded', 'waiting', 'stopped'].includes(slice.state), terminal: !goal || Boolean(goal.invalidatedBy) || ['fulfilled', 'cancelled', 'superseded', 'failed'].includes(goal.status) }
}))
async function reviewResult(item: typeof plans.value[number], criterionId: string, approved: boolean) {
  if (!item.goal?.proof.acceptance)
    return
  const cardId = props.view.cardId
  pending.value = item.plan.id
  error.value = null
  notice.value = t('settings.life.execution.reviewing')
  try {
    const result = await review({ cardId, obligationId: item.goal.id, expectedGeneration: item.goal.generation, contractHash: item.goal.proof.acceptance.contractHash, criterionId, approved, requestId: crypto.randomUUID() })
    if (props.view.cardId === cardId) {
      notice.value = t(`settings.life.execution.notice.${result.state}`, t('settings.life.execution.updated'))
      error.value = null
      await props.refresh()
    }
  }
  catch (caught) {
    if (props.view.cardId === cardId)
      error.value = errorMessageFrom(caught) ?? t('settings.life.execution.failed')
  }
  finally { pending.value = null }
}
async function showArtifact(item: typeof plans.value[number], criterionId: string) {
  if (!item.goal)
    return
  pending.value = item.plan.id
  try {
    await openArtifact({ cardId: props.view.cardId, obligationId: item.goal.id, expectedGeneration: item.goal.generation, criterionId })
  }
  catch (caught) { error.value = errorMessageFrom(caught) ?? t('settings.life.execution.failed') }
  finally { pending.value = null }
}
async function command(plan: WorkPlan, action: 'resume' | 'reobserve' | 'pause' | 'cancel') {
  const cardId = props.view.cardId
  pending.value = plan.id
  error.value = null
  try {
    const input = { cardId, planId: plan.id, expectedRevision: plan.revision, requestId: crypto.randomUUID() }
    const result = action === 'reobserve' ? await reobserve(input) : action === 'resume' ? await run(input) : await stop({ ...input, action })
    if (props.view.cardId === cardId) {
      notice.value = t(`settings.life.execution.notice.${result.state}`, t('settings.life.execution.updated'))
      await props.refresh()
    }
  }
  catch (caught) {
    if (props.view.cardId === cardId)
      error.value = errorMessageFrom(caught) ?? t('settings.life.execution.failed')
  }
  finally { pending.value = null }
}
async function stepSaved(planId: string) {
  pending.value = planId
  notice.value = null
  try {
    await props.refresh()
    notice.value = t('settings.life.execution.edit.saved')
    editing.value = null
  }
  catch (caught) { error.value = errorMessageFrom(caught) ?? t('settings.life.execution.failed') }
  finally { pending.value = null }
}
async function criteriaSaved(planId: string) {
  pending.value = planId
  notice.value = null
  try {
    await props.refresh()
    notice.value = t('settings.life.execution.criteria.saved')
    changingCriteria.value = null
  }
  catch (caught) { error.value = errorMessageFrom(caught) ?? t('settings.life.execution.failed') }
  finally { pending.value = null }
}
</script>

<template>
  <section v-if="plans.length" :aria-label="t('settings.life.execution.title')" class="space-y-4">
    <h2 class="text-lg font-medium">
      {{ t('settings.life.execution.title') }}
    </h2>
    <p v-if="error" role="alert" class="text-sm text-red-600">
      {{ error }}
    </p>
    <p v-if="notice" role="status" class="text-sm text-neutral-500">
      {{ notice }}
    </p>
    <article v-for="item in plans" :key="item.plan.id" :data-work-plan-id="item.plan.id" :data-work-obligation-id="item.goal?.id" :data-work-generation="item.goal?.generation" :data-work-plan-revision="item.plan.revision" :data-work-contract-hash="item.plan.acceptanceHash" class="border-b border-neutral-200 pb-4 dark:border-neutral-800">
      <h3 class="font-medium">
        {{ item.goal?.summary }}
      </h3>
      <p v-if="item.goal" role="status" class="mt-1 text-sm">
        {{ item.goal.status === 'fulfilled' ? t('settings.life.execution.confirmed') : t(`settings.life.status.${item.goal.status}`) }}
      </p>
      <p class="mt-1 text-sm text-neutral-500">
        {{ t('settings.life.execution.progress', { done: item.observed, total: item.steps.length }) }}
      </p>
      <p v-if="item.slice" role="status" class="mt-1 text-sm">
        {{ t(`settings.life.execution.window.${item.slice.state}`) }}
      </p>
      <p v-if="item.observed === item.steps.length && !item.terminal" class="mt-1 text-sm text-amber-600">
        {{ t('settings.life.awaiting_proof') }}
      </p>
      <p v-if="item.blocker" :data-work-blocker="item.blocker.reason" role="status" class="mt-2 text-sm text-amber-600 dark:text-amber-400">
        {{ t(`settings.life.execution.blocker.${!item.blocker.canResume && ['foreground-required', 'observation-required', 'provider-unavailable'].includes(item.blocker.reason) ? 'native-target-required' : item.blocker.reason}`) }}
      </p>
      <div v-if="!item.terminal" class="mt-3 flex flex-wrap gap-2">
        <Button v-if="item.stopped && item.goal?.proof.acceptance" size="sm" :label="t('settings.life.execution.criteria.title')" :disabled="pending !== null || item.results.some(result => ['running', 'awaiting-verification'].includes(result.state))" @click="beginEdit(item.plan.id, 'criteria')" />
        <Button v-if="item.stopped && item.repairable" size="sm" :label="t('settings.life.execution.edit.title')" :disabled="pending !== null" @click="beginEdit(item.plan.id, 'steps')" />
        <Button v-if="item.stopped && item.browserPending" data-work-browser-reobserve size="sm" :label="t('settings.life.execution.reobserve')" :disabled="pending !== null" @click="command(item.plan, 'reobserve')" />
        <Button v-if="item.stopped" data-work-resume size="sm" :label="t(item.blocker?.canResume && ['foreground-required', 'observation-required', 'provider-unavailable'].includes(item.blocker.reason) ? 'settings.life.execution.native_recheck' : 'settings.life.execution.resume')" :disabled="pending !== null || item.blocker?.canResume === false" @click="command(item.plan, 'resume')" />
        <Button v-if="!item.stopped && item.slice?.state !== 'stopping'" size="sm" :label="t('settings.life.execution.pause')" :disabled="pending !== null" @click="command(item.plan, 'pause')" />
        <Button size="sm" :label="t('settings.life.execution.cancel')" :disabled="pending !== null" @click="command(item.plan, 'cancel')" />
      </div>
      <ExecutionStepEditor v-if="editing === item.plan.id && item.stopped && !item.terminal" :plan="item.plan" :results="item.results" @close="editing = null" @saved="stepSaved(item.plan.id)" />
      <ExecutionCriteriaEditor v-if="changingCriteria === item.plan.id && item.stopped && !item.terminal && item.goal?.proof.acceptance" :plan="item.plan" :acceptance="item.goal.proof.acceptance" :results="item.results" @close="changingCriteria = null" @saved="criteriaSaved(item.plan.id)" />
      <div v-if="item.observed && item.artifacts.length" class="mt-3 flex flex-wrap gap-2">
        <Button v-for="artifact in item.artifacts" :key="artifact.id" size="sm" :label="t('settings.life.execution.open_artifact', { name: artifact.name })" :disabled="pending !== null" @click="showArtifact(item, artifact.id)" />
      </div>
      <div v-if="item.observed === item.steps.length && ['blocked', 'verifying'].includes(item.goal?.status ?? '')" class="mt-4 space-y-3">
        <div v-for="criterion in item.reviews" :key="criterion.id">
          <p v-if="criterion.predicate.kind === 'user-review'" class="text-sm">
            {{ criterion.predicate.question }}
          </p>
          <div class="mt-2 flex gap-2">
            <Button size="sm" :label="t('settings.life.execution.approve')" :disabled="pending !== null" @click="reviewResult(item, criterion.id, true)" />
            <Button size="sm" :label="t('settings.life.execution.reject')" :disabled="pending !== null" @click="reviewResult(item, criterion.id, false)" />
          </div>
        </div>
      </div>
      <details class="mt-3 text-sm">
        <summary class="cursor-pointer">
          {{ t('settings.life.execution.details') }}
        </summary>
        <ol class="mt-2 space-y-2">
          <li v-for="(step, index) in item.steps" :key="step.id" class="flex justify-between gap-4">
            <span>{{ index + 1 }}. {{ t(`settings.life.execution.operation.${step.capabilityId.replace('tool.', '')}`) }}</span>
            <span>{{ t(`settings.life.execution.step.${step.result?.state ?? 'pending'}`) }}</span>
            <span v-if="step.result?.createdAt" class="text-neutral-500">{{ new Date(step.result.createdAt).toLocaleTimeString() }}</span>
          </li>
        </ol>
      </details>
    </article>
  </section>
</template>
