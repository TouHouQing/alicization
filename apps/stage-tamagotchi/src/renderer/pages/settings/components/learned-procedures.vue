<script setup lang="ts">
import type { ProcedureCommand, ProcedurePerformanceSample, ProcedureSummary } from '../../../../shared/procedure-contracts'

import { errorMessageFrom } from '@moeru/std'
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button, Select } from '@proj-alicization/ui'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { electronLifeProcedure } from '../../../../shared/life-events'

const props = defineProps<{ cardId: string }>()
const { t } = useI18n()
const command = useElectronEventaInvoke(electronLifeProcedure)
const items = ref<ProcedureSummary[]>([])
const pending = ref(false)
const evaluating = ref(false)
const failed = ref(false)
const notice = ref('')
const comparisonTo = ref<Record<string, string | number>>({})
let sequence = 0

function baselineOptions(item: ProcedureSummary) {
  const eligible = items.value.filter(previous => previous.candidateId !== item.candidateId && item.comparisonFamily && previous.comparisonFamily === item.comparisonFamily && (previous.evaluation?.status === 'passed' || previous.repair))
  const established = eligible.at(-1)
  return [{ label: t('settings.life.procedures.comparison_auto'), value: '' }, ...(established ? [established] : eligible).map(previous => ({ label: `${t('settings.life.procedures.method', { id: previous.id.slice(-6) })} · ${previous.version.slice(0, 8)}`, value: previous.candidateId }))]
}

function performance(samples: ProcedurePerformanceSample[]) {
  return { completed: samples.filter(sample => sample.fulfilled).length, total: samples.length, operations: samples.reduce((total, sample) => total + sample.operations, 0), rework: samples.reduce((total, sample) => total + sample.rework, 0), approvals: samples.reduce((total, sample) => total + sample.approvals, 0), seconds: (samples.reduce((total, sample) => total + sample.elapsedMs, 0) / 1000).toFixed(1) }
}

function evaluate(item: ProcedureSummary) {
  const selected = comparisonTo.value[item.candidateId]
  return act({ cardId: props.cardId, action: 'evaluate', candidateId: item.candidateId, ...(selected ? { baselineCandidateId: String(selected) } : {}) })
}

function pageCount(item: ProcedureSummary) {
  return item.operations.includes('tool.browser_read_page') && item.operations.includes('tool.filesystem_write_file') ? item.parameters.filter(parameter => parameter.kind === 'url' && parameter.role === 'page-url').length : 0
}

async function act(input: ProcedureCommand) {
  const current = ++sequence
  pending.value = true
  evaluating.value = input.action === 'evaluate'
  failed.value = false
  notice.value = ''
  try {
    const result = await command(input)
    if (current !== sequence || props.cardId !== input.cardId)
      return
    items.value = result.items
    if (result.status !== 'listed')
      notice.value = result.status
  }
  catch (caught) {
    console.warn('[learned-procedures] Command did not settle:', errorMessageFrom(caught))
    if (current === sequence && props.cardId === input.cardId) {
      failed.value = true
      // A later projection failure can follow a durable revocation. Read its
      // actual state; never replay the failed mutation or leave it shown active.
      if (input.action !== 'list') {
        try {
          const refreshed = await command({ cardId: input.cardId, action: 'list' })
          if (current === sequence && props.cardId === input.cardId)
            items.value = refreshed.items
        }
        catch { /* The explicit refresh control remains available. */ }
      }
    }
  }
  finally {
    if (current === sequence) {
      pending.value = false
      evaluating.value = false
    }
  }
}
async function cancel() {
  const cardId = props.cardId
  try {
    await command({ cardId, action: 'cancel-evaluation' })
  }
  catch {
    if (props.cardId === cardId)
      failed.value = true
  }
}
watch(() => props.cardId, (cardId) => {
  items.value = []
  comparisonTo.value = {}
  void act({ cardId, action: 'list' })
}, { immediate: true })
</script>

<template>
  <section data-learned-procedures class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-lg font-medium">
        {{ t('settings.life.procedures.title') }}
      </h2>
      <Button :disabled="pending" @click="act({ cardId, action: 'list' })">
        {{ t('settings.life.procedures.refresh') }}
      </Button>
    </div>
    <p class="text-sm text-neutral-500">
      {{ t('settings.life.procedures.description') }}
    </p>
    <p v-if="failed" role="alert" class="text-sm text-red-600">
      {{ t('settings.life.procedures.error') }}
    </p>
    <p v-if="notice" role="status" class="text-sm">
      {{ t(`settings.life.procedures.notices.${notice}`) }}
    </p>
    <p v-if="!items.length && !pending" class="text-sm text-neutral-500">
      {{ t('settings.life.procedures.empty') }}
    </p>
    <Button v-if="evaluating" @click="cancel">
      {{ t('settings.life.procedures.cancel') }}
    </Button>
    <article v-for="item in items" :key="item.candidateId" :data-procedure-id="item.id" :data-procedure-version="item.version" class="border border-neutral-200 rounded-lg p-4 dark:border-neutral-700">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-medium">
          {{ pageCount(item) > 1 ? t('settings.life.procedures.page_copy', { count: pageCount(item) }) : t('settings.life.procedures.method', { id: item.id.slice(-6) }) }}
        </h3>
        <span class="text-sm">{{ t(`settings.life.procedures.status.${item.repair ? 'needs-repair' : item.sourceValid ? item.status : 'withdrawn'}`) }}</span>
      </div>
      <p v-if="pageCount(item) > 1" class="text-xs text-neutral-500">
        {{ t('settings.life.procedures.method', { id: item.id.slice(-6) }) }}
      </p>
      <p class="my-2 text-sm text-neutral-500">
        {{ item.operations.map(operation => t(`settings.life.execution.operation.${operation.replace('tool.', '')}`)).join(' · ') }}
      </p>
      <p v-if="item.evaluation" class="text-sm">
        {{ t('settings.life.procedures.evaluation', { passed: item.evaluation.cases.filter(test => test.passed).length, total: item.evaluation.cases.length }) }}
      </p>
      <div v-if="item.evaluation?.comparison" class="mt-2 text-sm" data-procedure-comparison :data-procedure-comparison-baseline="item.evaluation.comparison.baselineHash">
        <p>{{ t(`settings.life.procedures.comparison_verdict.${item.evaluation.comparison.verdict}`) }}</p>
        <p>{{ t('settings.life.procedures.comparison_before', performance(item.evaluation.comparison.baseline)) }}</p>
        <p>{{ t('settings.life.procedures.comparison_after', performance(item.evaluation.comparison.candidate)) }}</p>
        <p class="text-xs text-neutral-500">
          {{ t('settings.life.procedures.comparison_scope') }}
        </p>
      </div>
      <p v-if="item.evaluation?.comparisonFailure" role="status" class="mt-2 text-sm text-amber-600">
        {{ t('settings.life.procedures.comparison_unavailable') }}
      </p>
      <p v-if="item.repair" role="status" class="mt-2 text-sm text-amber-600">
        {{ t('settings.life.procedures.repair_hint') }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <Select v-if="item.sourceValid && item.status === 'candidate' && baselineOptions(item).length > 1" v-model="comparisonTo[item.candidateId]" :options="baselineOptions(item)" :title="t('settings.life.procedures.comparison_select')" :disabled="pending" />
        <Button v-if="item.sourceValid && item.status === 'candidate'" :disabled="pending" @click="evaluate(item)">
          {{ t('settings.life.procedures.evaluate') }}
        </Button>
        <Button v-if="item.sourceValid && item.status === 'candidate' && item.evaluation?.status === 'passed'" :disabled="pending" @click="act({ cardId, action: 'activate', id: item.id, version: item.version })">
          {{ t('settings.life.procedures.activate') }}
        </Button>
        <Button v-if="item.sourceValid && item.status === 'active'" :disabled="pending" @click="act({ cardId, action: 'revoke', id: item.id, version: item.version })">
          {{ t('settings.life.procedures.revoke') }}
        </Button>
        <Button v-if="item.sourceValid && item.status === 'rolled-back'" :disabled="pending" @click="act({ cardId, action: 'rollback', id: item.id, version: item.version })">
          {{ t('settings.life.procedures.rollback') }}
        </Button>
      </div>
    </article>
  </section>
</template>
