<script setup lang="ts">
import type { AlicizationSimpleRecallGoldLabel } from '@proj-alicization/stage-ui/stores/alicization-bridge'
import type { AlicizationMemoryQualityGoldLabelReason } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'

import { useAlicizationMemoryWorkbenchStore } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'
import { useAiriCardStore } from '@proj-alicization/stage-ui/stores/modules/airi-card'
import { Button } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import MemoryEmbeddingConfig from './components/memory-embedding-config.vue'
import MemoryQualitySessionPicker from './components/memory-quality-session-picker.vue'

const store = useAlicizationMemoryWorkbenchStore()
const cardStore = useAiriCardStore()
const { t } = useI18n()
const { activeCardId } = storeToRefs(cardStore)
const {
  activeTab,
  longTermItems,
  longTermFilters,
  longTermNextCursor,
  personaCandidates,
  personaLoading,
  personaTrainingDataset,
  personaTrainingDatasetExport,
  personaTrainingDatasetLoading,
  personaTrainingIncrements,
  personaTrainingRun,
  personaTrainingRunLoading,
  skills,
  skillLoading,
  reindexLoading,
  reindexResult,
  reindexDeadLetterItems,
  qualityTrialLoading,
  qualityTrialReport,
  qualityReplaySessions,
  qualityReplaySessionsLoading,
  qualityReplaySessionsNextCursor,
  selectedQualitySessionId,
  qualityTrialMode,
  goldLabelLoading,
  goldLabelMonth,
  monthlyGoldLabels,
  monthlyGoldRegressionPack,
  recallProbe,
  recallQuery,
  loading,
  listLoading,
  probeLoading,
  reviewActionLoadingId,
  lastError,
  workingMemory,
  reviewItems,
  health,
  pendingReviewCount,
} = storeToRefs(store)

const reindexProgress = computed(() => reindexResult.value?.progress ?? null)
const personaTrainingConsentGranted = ref(false)
const personaTrainingPolicyVersion = ref('persona-training-consent-v1')
const personaTrainingScope = ref('persona-dataset')
const selectedGoldLabelReason = ref<AlicizationMemoryQualityGoldLabelReason | null>(null)

const tabs = computed(() => [
  { id: 'working' as const, icon: 'i-solar:clipboard-list-bold-duotone', label: t('settings.pages.memory.workbench.tabs.working') },
  { id: 'long-term' as const, icon: 'i-solar:database-bold-duotone', label: t('settings.pages.memory.workbench.tabs.long_term') },
  { id: 'review' as const, icon: 'i-solar:checklist-bold-duotone', label: t('settings.pages.memory.workbench.tabs.review') },
  { id: 'probe' as const, icon: 'i-solar:magnifer-bold-duotone', label: t('settings.pages.memory.workbench.tabs.probe') },
  { id: 'persona' as const, icon: 'i-solar:user-heart-bold-duotone', label: t('settings.pages.memory.workbench.tabs.persona') },
  { id: 'quality' as const, icon: 'i-solar:clipboard-check-bold-duotone', label: t('settings.pages.memory.workbench.tabs.quality') },
  { id: 'health' as const, icon: 'i-solar:pulse-2-bold-duotone', label: t('settings.pages.memory.workbench.tabs.health') },
  { id: 'skills' as const, icon: 'i-solar:stars-bold-duotone', label: t('settings.pages.memory.workbench.tabs.skills') },
])

const kindOptions = ['all', 'fact', 'episode', 'reflection', 'consolidation'] as const
const sensitivityOptions = ['all', 'public', 'personal', 'private', 'secret'] as const
const visibilityOptions = ['all', 'explicit', 'inward-only'] as const
const trainingOptions = ['all', 'allowed', 'blocked'] as const
type LongTermFilterGroup = 'kind' | 'sensitivity' | 'visibility' | 'training'

const longTermFilterLabelKeys = {
  kind: {
    all: 'settings.pages.memory.workbench.filters.kind.all',
    fact: 'settings.pages.memory.workbench.filters.kind.fact',
    episode: 'settings.pages.memory.workbench.filters.kind.episode',
    reflection: 'settings.pages.memory.workbench.filters.kind.reflection',
    consolidation: 'settings.pages.memory.workbench.filters.kind.consolidation',
  },
  sensitivity: {
    all: 'settings.pages.memory.workbench.filters.sensitivity.all',
    public: 'settings.pages.memory.workbench.filters.sensitivity.public',
    personal: 'settings.pages.memory.workbench.filters.sensitivity.personal',
    private: 'settings.pages.memory.workbench.filters.sensitivity.private',
    secret: 'settings.pages.memory.workbench.filters.sensitivity.secret',
  },
  visibility: {
    'all': 'settings.pages.memory.workbench.filters.visibility.all',
    'explicit': 'settings.pages.memory.workbench.filters.visibility.explicit',
    'inward-only': 'settings.pages.memory.workbench.filters.visibility.inward_only',
  },
  training: {
    all: 'settings.pages.memory.workbench.filters.training.all',
    allowed: 'settings.pages.memory.workbench.filters.training.allowed',
    blocked: 'settings.pages.memory.workbench.filters.training.blocked',
  },
} as const

const reindexStatusLabelKeys = {
  queued: 'settings.pages.memory.workbench.states.reindex_queued',
  running: 'settings.pages.memory.workbench.states.reindex_running',
  cancel_requested: 'settings.pages.memory.workbench.states.reindex_cancel_requested',
  completed: 'settings.pages.memory.workbench.states.reindex_completed',
  cancelled: 'settings.pages.memory.workbench.states.reindex_cancelled',
  failed: 'settings.pages.memory.workbench.states.reindex_failed',
} as const

const datasetStateLabelKeys = {
  staged: 'settings.pages.memory.workbench.states.dataset_staged',
  quarantined: 'settings.pages.memory.workbench.states.dataset_quarantined',
  revoked: 'settings.pages.memory.workbench.states.dataset_revoked',
} as const

const piiStatusLabelKeys = {
  'clear': 'settings.pages.memory.workbench.states.pii_clear',
  'detected': 'settings.pages.memory.workbench.states.pii_detected',
  'not-checked': 'settings.pages.memory.workbench.states.pii_not_checked',
} as const

const healthStatusLabelKeys = {
  ok: 'settings.pages.memory.workbench.states.health_ok',
  degraded: 'settings.pages.memory.workbench.states.health_degraded',
  error: 'settings.pages.memory.workbench.states.health_error',
} as const

const indexModeLabelKeys = {
  'sqlite-vec': 'settings.pages.memory.workbench.states.index_sqlite_vec',
  'hnsw': 'settings.pages.memory.workbench.states.index_hnsw',
  'ann': 'settings.pages.memory.workbench.states.index_ann',
  'brute-force': 'settings.pages.memory.workbench.states.index_brute_force',
} as const

const personaCandidateStatusLabelKeys = {
  'candidate': 'settings.pages.memory.workbench.states.persona_candidate_candidate',
  'approved': 'settings.pages.memory.workbench.states.persona_candidate_approved',
  'rejected': 'settings.pages.memory.workbench.states.persona_candidate_rejected',
  'no-training': 'settings.pages.memory.workbench.states.persona_candidate_no_training',
} as const

const personaPrivacyLabelKeys = {
  'public': 'settings.pages.memory.workbench.states.persona_privacy_public',
  'personal-redacted': 'settings.pages.memory.workbench.states.persona_privacy_personal_redacted',
} as const

const qualityGoldLabelButtons = computed<Array<{
  value: AlicizationSimpleRecallGoldLabel
  label: string
  description: string
  variant?: 'secondary' | 'danger'
}>>(() => [
  {
    value: 'right',
    label: t('settings.pages.memory.workbench.quality.labels.right'),
    description: t('settings.pages.memory.workbench.quality.descriptions.right'),
  },
  {
    value: 'missing',
    label: t('settings.pages.memory.workbench.quality.labels.missing'),
    description: t('settings.pages.memory.workbench.quality.descriptions.missing'),
    variant: 'secondary',
  },
  {
    value: 'wrong',
    label: t('settings.pages.memory.workbench.quality.labels.wrong'),
    description: t('settings.pages.memory.workbench.quality.descriptions.wrong'),
    variant: 'danger',
  },
  {
    value: 'unwanted',
    label: t('settings.pages.memory.workbench.quality.labels.unwanted'),
    description: t('settings.pages.memory.workbench.quality.descriptions.unwanted'),
    variant: 'secondary',
  },
])

const qualityGoldReasonOptions = computed<Array<{
  value: AlicizationMemoryQualityGoldLabelReason
  label: string
  description: string
}>>(() => [
  {
    value: 'wrong-thread',
    label: t('memory-workbench.quality.reasons.wrong-thread.label'),
    description: t('memory-workbench.quality.reasons.wrong-thread.description'),
  },
  {
    value: 'expired',
    label: t('memory-workbench.quality.reasons.expired.label'),
    description: t('memory-workbench.quality.reasons.expired.description'),
  },
  {
    value: 'not-needed',
    label: t('memory-workbench.quality.reasons.not-needed.label'),
    description: t('memory-workbench.quality.reasons.not-needed.description'),
  },
  {
    value: 'should-abstain',
    label: t('memory-workbench.quality.reasons.should-abstain.label'),
    description: t('memory-workbench.quality.reasons.should-abstain.description'),
  },
])

interface QualityPanelDetail {
  id: string
  title: string
  description: string
  meta: string[]
}

const healthStatusClass = computed(() => {
  if (health.value?.status === 'ok')
    return 'text-emerald-600 dark:text-emerald-300'
  if (health.value?.status === 'degraded')
    return 'text-amber-600 dark:text-amber-300'
  return 'text-rose-600 dark:text-rose-300'
})

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.map(item => asRecord(item)).filter((item): item is Record<string, unknown> => item !== null)
    : []
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function qualityRankReasonSummary(trace: Record<string, unknown>) {
  const rankReasonsById = asRecord(trace.rankReasonsById)
  if (!rankReasonsById)
    return []
  return Object.entries(rankReasonsById).slice(0, 4).map(([id, reasons]) =>
    `${id}: ${asStringArray(reasons).slice(0, 3).join(', ') || '-'}`,
  )
}

const qualityFailureDetails = computed<QualityPanelDetail[]>(() => {
  const report = qualityTrialReport.value
  if (!report)
    return []

  const stageDetails = report.stages
    .filter(stage => !stage.passed)
    .map(stage => ({
      id: `stage:${stage.id}`,
      title: `${t('settings.pages.memory.workbench.fields.failing_stages')}: ${stage.id}`,
      description: stage.error ?? '-',
      meta: [
        `${stage.stage}`,
        `${t('settings.pages.memory.workbench.fields.count')}: ${stage.itemCount}`,
      ],
    }))

  const traces = asRecordArray(report.quality.traces)
  const traceDetails = report.quality.summary.failingFixtureIds.map((fixtureId) => {
    const trace = traces.find(item => item.fixtureId === fixtureId || item.id === fixtureId)
    const selectedIds = asStringArray(trace?.selectedIds)
    const rankReasons = trace ? qualityRankReasonSummary(trace) : []
    return {
      id: `fixture:${fixtureId}`,
      title: `${t('settings.pages.memory.workbench.fields.failing_fixtures')}: ${fixtureId}`,
      description: typeof trace?.error === 'string' ? trace.error : listText(selectedIds),
      meta: [
        ...rankReasons,
        ...(selectedIds.length > 0 ? [`${t('settings.pages.memory.workbench.fields.surfaced_ids')}: ${listText(selectedIds)}`] : []),
      ],
    }
  })

  const experienceFindings = asRecordArray(report.experienceQuality?.findings).map((item, index) => ({
    id: `experience:${String(item.fixtureId ?? index)}:${String(item.code ?? 'finding')}`,
    title: `${t('settings.pages.memory.workbench.fields.experience_quality')}: ${String(item.code ?? '-')}`,
    description: String(item.message ?? '-'),
    meta: [
      String(item.fixtureId ?? '-'),
      String(item.suggestedAction ?? '-'),
    ].filter(item => item !== '-'),
  }))

  return [...stageDetails, ...traceDetails, ...experienceFindings]
})

function listText(values: string[]) {
  return values.length > 0 ? values.join(' / ') : '-'
}

function formatTimestamp(value: number | null | undefined) {
  if (!value)
    return '-'
  return new Date(value).toLocaleString()
}

function formatLongTermFilterLabel(group: LongTermFilterGroup, value: string) {
  return t(longTermFilterLabelKeys[group][value as keyof typeof longTermFilterLabelKeys[typeof group]] ?? value)
}

function formatReindexStatus(value: string) {
  return t(reindexStatusLabelKeys[value as keyof typeof reindexStatusLabelKeys] ?? value)
}

function formatDatasetState(value: string) {
  return t(datasetStateLabelKeys[value as keyof typeof datasetStateLabelKeys] ?? value)
}

function formatPiiStatus(value: string) {
  return t(piiStatusLabelKeys[value as keyof typeof piiStatusLabelKeys] ?? value)
}

function formatHealthStatus(value: string) {
  return t(healthStatusLabelKeys[value as keyof typeof healthStatusLabelKeys] ?? value)
}

function formatIndexMode(value: string) {
  return t(indexModeLabelKeys[value as keyof typeof indexModeLabelKeys] ?? value)
}

function formatBoolean(value: boolean | null | undefined) {
  return value ? t('settings.pages.memory.workbench.states.yes') : t('settings.pages.memory.workbench.states.no')
}

function formatCoverageRatio(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '-'
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function formatPersonaCandidateStatus(value: string) {
  return t(personaCandidateStatusLabelKeys[value as keyof typeof personaCandidateStatusLabelKeys] ?? value)
}

function formatPersonaPrivacyClass(value: string) {
  return t(personaPrivacyLabelKeys[value as keyof typeof personaPrivacyLabelKeys] ?? value)
}

function formatQualityScore(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '-'
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function resetLongTermFilters() {
  longTermFilters.value = {
    query: '',
    kind: 'all',
    sensitivity: 'all',
    visibility: 'all',
    training: 'all',
    source: '',
  }
  void store.refreshLongTerm()
}

function currentPersonaConsent() {
  return {
    granted: personaTrainingConsentGranted.value,
    policyVersion: personaTrainingPolicyVersion.value.trim() || 'persona-training-consent-v1',
    scope: personaTrainingScope.value.trim() || 'persona-dataset',
  }
}

function stagePersonaDataset() {
  void store.stagePersonaTrainingDataset(currentPersonaConsent())
}

function exportPersonaDataset(datasetId?: string | null) {
  void store.exportPersonaTrainingDataset(datasetId)
}

function activatePersonaDataset(datasetId: string) {
  void store.activatePersonaTrainingDataset(datasetId)
}

function rollbackPersonaDataset(datasetId: string) {
  void store.rollbackPersonaTrainingDataset(datasetId)
}

function updatePersonaExamplePolicy(exampleId: string, allowTraining: boolean) {
  void store.setPersonaTrainingDatasetExamplePolicy({
    exampleId,
    allowTraining,
    consent: currentPersonaConsent(),
  })
}

function revokePersonaSource(sourceId: string) {
  void store.revokePersonaTrainingDatasetSource(sourceId)
}

function loadQualityGoldLabels() {
  void store.loadMonthlyGoldLabels(goldLabelMonth.value)
}

function runQualityTrial() {
  void store.runQualityTrial(goldLabelMonth.value)
}

function buildGoldRegression() {
  void store.buildMonthlyGoldRegression(goldLabelMonth.value)
}

function applyProbeGoldLabel(label: AlicizationSimpleRecallGoldLabel) {
  const query = (recallProbe.value?.query ?? recallQuery.value).trim()
  if (!query)
    return
  const evidenceIds = recallProbe.value?.evidence.map(item => item.id) ?? []
  void store.applyGoldLabel({
    month: goldLabelMonth.value,
    label,
    reason: selectedGoldLabelReason.value,
    query,
    expectedMemoryIds: label === 'right' ? evidenceIds : [],
    retrievedCandidateIds: evidenceIds,
    surfacedMemoryIds: evidenceIds,
    wrongThreadIds: label === 'wrong' ? evidenceIds : [],
    note: qualityGoldLabelButtons.value.find(item => item.value === label)?.description ?? null,
  }).then((result) => {
    if (result)
      selectedGoldLabelReason.value = null
  })
}

function reloadQualityTrialContext() {
  store.resetQualityTrialContext()
  void store.loadQualityReplaySessions()
}

onMounted(() => {
  void store.refreshSnapshot()
  void store.refreshPersonaCandidates()
  void store.refreshPersonaTrainingDataset()
  void store.refreshPersonaTrainingIncrements()
  void store.refreshSkills(false)
  void store.loadMonthlyGoldLabels(goldLabelMonth.value)
  reloadQualityTrialContext()
})

watch(activeCardId, () => {
  reloadQualityTrialContext()
})
</script>

<template>
  <div :class="['flex', 'min-h-0', 'flex-col', 'gap-4', 'pb-10']">
    <header :class="['flex', 'flex-col', 'gap-3', 'md:flex-row', 'md:items-end', 'md:justify-between']">
      <div>
        <h1 :class="['text-2xl', 'font-semibold', 'text-neutral-950', 'dark:text-neutral-50']">
          {{ t('settings.pages.memory.workbench.title') }}
        </h1>
        <p :class="['mt-1', 'max-w-3xl', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ t('settings.pages.memory.workbench.description') }}
        </p>
      </div>
      <Button
        :label="t('settings.pages.memory.workbench.actions.refresh')"
        icon="i-solar:refresh-bold-duotone"
        size="sm"
        :loading="loading"
        @click="store.refreshSnapshot()"
      />
    </header>

    <section :class="['grid', 'grid-cols-2', 'gap-3', 'lg:grid-cols-4']">
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.health') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold', healthStatusClass]">
          {{ health?.status ? formatHealthStatus(health.status) : '-' }}
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.pending_review') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold']">
          {{ pendingReviewCount }}
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.recall_latency') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold']">
          {{ health?.recall.lastLatencyMs ?? '-' }} ms
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.queue') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold']">
          {{ health?.queue.pending ?? 0 }} / {{ health?.queue.failed ?? 0 }}
        </div>
      </div>
    </section>

    <div
      v-if="lastError"
      :class="['border', 'border-rose-300', 'bg-rose-50', 'p-3', 'text-sm', 'text-rose-700', 'dark:border-rose-900', 'dark:bg-rose-950/40', 'dark:text-rose-200']"
    >
      {{ lastError }}
    </div>

    <MemoryEmbeddingConfig />

    <nav :class="['flex', 'flex-wrap', 'gap-2', 'border-b', 'border-neutral-200', 'pb-2', 'dark:border-neutral-800']">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="[
          'inline-flex', 'items-center', 'gap-2', 'border', 'px-3', 'py-2', 'text-sm',
          activeTab === tab.id
            ? 'border-neutral-950 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950'
            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900',
        ]"
        @click="activeTab = tab.id"
      >
        <span :class="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <section v-if="activeTab === 'working'" :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-2']">
      <div v-if="!workingMemory" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_working') }}
      </div>
      <template v-else>
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.thread') }}
          </div>
          <div :class="['mt-1', 'text-sm', 'font-medium']">
            {{ workingMemory.threadTitle ?? '-' }}
          </div>
          <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.active_task') }}
          </div>
          <div :class="['mt-1', 'text-sm']">
            {{ workingMemory.activeTask ?? '-' }}
          </div>
        </div>
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.corrections') }}
          </div>
          <div :class="['mt-1', 'text-sm']">
            {{ listText(workingMemory.userCorrections) }}
          </div>
          <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.query_hints') }}
          </div>
          <div :class="['mt-1', 'text-sm']">
            {{ listText(workingMemory.queryHints) }}
          </div>
        </div>
      </template>
    </section>

    <section v-else-if="activeTab === 'long-term'" :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['grid', 'grid-cols-1', 'gap-2', 'md:grid-cols-3', 'xl:grid-cols-6']">
        <input
          v-model="longTermFilters.query"
          :aria-label="t('settings.pages.memory.workbench.actions.search')"
          :placeholder="t('settings.pages.memory.workbench.placeholders.long_term_search')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
          @keydown.enter.prevent="store.refreshLongTerm()"
        >
        <select
          v-model="longTermFilters.kind"
          :aria-label="t('settings.pages.memory.workbench.fields.kind')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in kindOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('kind', option) }}
          </option>
        </select>
        <select
          v-model="longTermFilters.sensitivity"
          :aria-label="t('settings.pages.memory.workbench.fields.sensitivity')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in sensitivityOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('sensitivity', option) }}
          </option>
        </select>
        <select
          v-model="longTermFilters.visibility"
          :aria-label="t('settings.pages.memory.workbench.fields.visibility')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in visibilityOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('visibility', option) }}
          </option>
        </select>
        <select
          v-model="longTermFilters.training"
          :aria-label="t('settings.pages.memory.workbench.fields.training')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in trainingOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('training', option) }}
          </option>
        </select>
        <input
          v-model="longTermFilters.source"
          :aria-label="t('settings.pages.memory.workbench.fields.source')"
          :placeholder="t('settings.pages.memory.workbench.placeholders.long_term_source')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
      </div>
      <div :class="['flex', 'flex-wrap', 'gap-2']">
        <Button
          :label="t('settings.pages.memory.workbench.actions.search')"
          icon="i-solar:magnifer-bold-duotone"
          size="sm"
          :loading="listLoading"
          @click="store.refreshLongTerm()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.reset')"
          icon="i-solar:restart-bold-duotone"
          size="sm"
          variant="secondary"
          @click="resetLongTermFilters()"
        />
      </div>
      <div v-if="longTermItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_long_term') }}
      </div>
      <article v-for="item in longTermItems" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
          <span>{{ t('settings.pages.memory.workbench.fields.kind') }}: {{ formatLongTermFilterLabel('kind', item.kind) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.sensitivity') }}: {{ formatLongTermFilterLabel('sensitivity', item.sensitivity) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.visibility') }}: {{ formatLongTermFilterLabel('visibility', item.visibility) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.training') }}: {{ formatLongTermFilterLabel('training', item.training) }}</span>
        </div>
        <div :class="['mt-2', 'text-sm', 'font-medium']">
          {{ item.summary }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ listText(item.evidenceSnippets) }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-1', 'gap-2', 'text-xs', 'text-neutral-500', 'md:grid-cols-3']">
          <div>{{ t('settings.pages.memory.workbench.fields.source') }}: {{ item.source }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.confidence') }}: {{ item.confidence.toFixed(2) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.salience') }}: {{ item.salience.toFixed(2) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.source_ids') }}: {{ listText(item.sourceIds) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.updated_at') }}: {{ formatTimestamp(item.updatedAt) }}</div>
        </div>
      </article>
      <Button
        v-if="longTermNextCursor"
        :label="t('settings.pages.memory.workbench.actions.load_more')"
        icon="i-solar:alt-arrow-down-bold-duotone"
        size="sm"
        variant="secondary"
        :loading="listLoading"
        @click="store.loadMoreLongTerm()"
      />
    </section>

    <section v-else-if="activeTab === 'review'" :class="['flex', 'flex-col', 'gap-3']">
      <div v-if="reviewItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_review') }}
      </div>
      <article v-for="item in reviewItems" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-medium']">
          {{ item.summary }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ listText(item.reviewReasons) }}
        </div>
        <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
          <Button size="sm" :label="t('settings.pages.memory.workbench.actions.approve')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'approve')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.reject')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'reject')" />
          <Button size="sm" variant="danger" :label="t('settings.pages.memory.workbench.actions.tombstone')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'tombstone')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.inward_only')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'inward-only')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.no_training')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'no-training')" />
        </div>
      </article>

      <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-col', 'gap-3', 'lg:flex-row', 'lg:items-start', 'lg:justify-between']">
          <div>
            <h2 :class="['text-sm', 'font-semibold']">
              {{ t('settings.pages.memory.workbench.fields.persona_dataset') }}
            </h2>
            <p :class="['mt-1', 'text-xs', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.persona_dataset_description') }}
            </p>
          </div>
          <div :class="['flex', 'flex-wrap', 'gap-2']">
            <Button
              :label="t('settings.pages.memory.workbench.actions.stage_persona_dataset')"
              icon="i-solar:layers-minimalistic-bold-duotone"
              size="sm"
              :loading="personaTrainingDatasetLoading"
              @click="stagePersonaDataset()"
            />
            <Button
              :label="t('settings.pages.memory.workbench.actions.export_persona_dataset')"
              icon="i-solar:export-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="personaTrainingDatasetLoading"
              :disabled="!personaTrainingDataset?.versions.length"
              @click="exportPersonaDataset(personaTrainingDataset?.activeVersionId)"
            />
          </div>
        </div>

        <div :class="['mt-4', 'grid', 'grid-cols-1', 'gap-3', 'md:grid-cols-3']">
          <label :class="['flex', 'items-center', 'gap-2', 'text-sm']">
            <input v-model="personaTrainingConsentGranted" type="checkbox">
            <span>{{ t('settings.pages.memory.workbench.fields.dataset_consent') }}</span>
          </label>
          <label :class="['grid', 'gap-1']">
            <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.dataset_policy_version') }}</span>
            <input
              v-model="personaTrainingPolicyVersion"
              :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
            >
          </label>
          <label :class="['grid', 'gap-1']">
            <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.dataset_scope') }}</span>
            <input
              v-model="personaTrainingScope"
              :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
            >
          </label>
        </div>

        <div v-if="!personaTrainingDataset" :class="['mt-4', 'border', 'border-dashed', 'border-neutral-300', 'p-4', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
          {{ t('settings.pages.memory.workbench.states.empty_persona_dataset') }}
        </div>
        <template v-else>
          <div :class="['mt-4', 'grid', 'grid-cols-1', 'gap-2', 'text-sm', 'md:grid-cols-3']">
            <div>{{ t('settings.pages.memory.workbench.fields.dataset_active') }}: {{ personaTrainingDataset.activeVersionId ?? '-' }}</div>
            <div>{{ t('settings.pages.memory.workbench.fields.dataset_examples') }}: {{ personaTrainingDataset.examples.length }}</div>
            <div v-if="personaTrainingDatasetExport">
              {{ t('settings.pages.memory.workbench.fields.dataset_hash') }}: {{ personaTrainingDatasetExport.manifest.manifestHash }}
            </div>
          </div>

          <div :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-4', 'dark:border-neutral-800']">
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.dataset_versions') }}
            </div>
            <div :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
              <article v-for="version in personaTrainingDataset.versions" :key="version.id" :class="['border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
                <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
                  <span>v{{ version.version }}</span>
                  <span>{{ version.schemaVersion }}</span>
                  <span>{{ t('settings.pages.memory.workbench.fields.dataset_active') }}: {{ formatBoolean(version.activeAt !== null) }}</span>
                  <span>{{ t('settings.pages.memory.workbench.fields.dataset_manifest') }}: {{ formatBoolean(version.exportedAt !== null) }}</span>
                </div>
                <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
                  {{ t('settings.pages.memory.workbench.fields.dataset_consent') }}:
                  {{ formatBoolean(version.consentSnapshot.granted) }}
                  · {{ version.consentSnapshot.policyVersion }}
                  · {{ version.consentSnapshot.scope }}
                </div>
                <div :class="['mt-2', 'flex', 'flex-wrap', 'gap-2']">
                  <Button
                    v-if="personaTrainingDataset.activeVersionId !== version.id"
                    :label="t('settings.pages.memory.workbench.actions.activate_persona_dataset')"
                    icon="i-solar:check-circle-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :loading="personaTrainingDatasetLoading"
                    @click="activatePersonaDataset(version.id)"
                  />
                  <Button
                    v-if="personaTrainingDataset.activeVersionId !== version.id"
                    :label="t('settings.pages.memory.workbench.actions.rollback_persona_dataset')"
                    icon="i-solar:history-2-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :loading="personaTrainingDatasetLoading"
                    @click="rollbackPersonaDataset(version.id)"
                  />
                  <Button
                    :label="t('settings.pages.memory.workbench.actions.export_persona_dataset')"
                    icon="i-solar:export-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :loading="personaTrainingDatasetLoading"
                    @click="exportPersonaDataset(version.id)"
                  />
                </div>
              </article>
            </div>
          </div>

          <div :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-4', 'dark:border-neutral-800']">
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.dataset_examples') }}
            </div>
            <div v-if="personaTrainingDataset.examples.length === 0" :class="['mt-2', 'text-sm', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.states.empty_persona_dataset_examples') }}
            </div>
            <div v-else :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
              <article v-for="example in personaTrainingDataset.examples" :key="example.id" :class="['border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
                <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
                  <span>{{ formatDatasetState(example.state) }}</span>
                  <span>{{ t('settings.pages.memory.workbench.fields.pii_status') }}: {{ formatPiiStatus(example.piiStatus) }}</span>
                  <span>{{ t('settings.pages.memory.workbench.fields.training') }}: {{ formatBoolean(example.allowTraining) }}</span>
                </div>
                <div :class="['mt-2', 'text-sm', 'font-medium']">
                  {{ example.behaviorLesson }}
                </div>
                <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
                  {{ example.sourceKind }} · {{ example.sourceId }}
                </div>
                <div v-if="example.piiReason" :class="['mt-1', 'text-xs', 'text-rose-600', 'dark:text-rose-300']">
                  {{ example.piiReason }}
                </div>
                <div :class="['mt-2', 'flex', 'flex-wrap', 'gap-2']">
                  <Button
                    :label="t('settings.pages.memory.workbench.actions.allow_persona_training')"
                    icon="i-solar:check-circle-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :disabled="!personaTrainingConsentGranted || example.state !== 'staged' || example.piiStatus !== 'clear'"
                    :loading="personaTrainingDatasetLoading"
                    @click="updatePersonaExamplePolicy(example.id, true)"
                  />
                  <Button
                    :label="t('settings.pages.memory.workbench.actions.block_persona_training')"
                    icon="i-solar:shield-cross-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :loading="personaTrainingDatasetLoading"
                    @click="updatePersonaExamplePolicy(example.id, false)"
                  />
                  <Button
                    :label="t('settings.pages.memory.workbench.actions.revoke_persona_source')"
                    icon="i-solar:trash-bin-2-bold-duotone"
                    size="sm"
                    variant="danger"
                    :loading="personaTrainingDatasetLoading"
                    @click="revokePersonaSource(example.sourceId)"
                  />
                </div>
              </article>
            </div>
          </div>
        </template>
      </section>
    </section>

    <section v-else-if="activeTab === 'probe'" :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['flex', 'gap-2']">
        <input
          v-model="recallQuery"
          :class="['min-w-0', 'flex-1', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
          @keydown.enter.prevent="store.runRecallProbe()"
        >
        <Button :label="t('settings.pages.memory.workbench.actions.run_probe')" icon="i-solar:magnifer-bold-duotone" :loading="probeLoading" @click="store.runRecallProbe()" />
      </div>
      <div v-if="!recallProbe" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_probe') }}
      </div>
      <div v-else :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-[320px_minmax(0,1fr)]']">
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            intent
          </div>
          <pre :class="['mt-2', 'whitespace-pre-wrap', 'text-xs']">{{ JSON.stringify(recallProbe.intent, null, 2) }}</pre>
          <div :class="['mt-3', 'border-t', 'border-neutral-200', 'pt-3', 'text-xs', 'text-neutral-500', 'dark:border-neutral-800']">
            <div>
              {{ t('settings.pages.memory.workbench.fields.semantic_channel') }}:
              {{ recallProbe.semantic.available ? t('settings.pages.memory.workbench.fields.available') : t('settings.pages.memory.workbench.fields.unavailable') }}
            </div>
            <div>{{ t('settings.pages.memory.workbench.fields.model') }}: {{ recallProbe.semantic.modelId ?? '-' }}</div>
            <div>{{ t('settings.pages.memory.workbench.fields.dimensions') }}: {{ recallProbe.semantic.dimensions ?? '-' }}</div>
            <div v-if="recallProbe.semantic.error">
              {{ t('settings.pages.memory.workbench.fields.errors') }}: {{ recallProbe.semantic.error }}
            </div>
          </div>
        </div>
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.evidence') }}
          </div>
          <article v-for="item in recallProbe.evidence" :key="item.id" :class="['mt-3', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
            <div :class="['text-sm', 'font-medium']">
              {{ item.summary }}
            </div>
            <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
              {{ listText(item.rankReasons) }}
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'quality'" :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-[360px_minmax(0,1fr)]']">
      <div :class="['flex', 'flex-col', 'gap-3']">
        <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-sm', 'font-semibold']">
            {{ t('settings.pages.memory.workbench.quality.title') }}
          </div>
          <p :class="['mt-1', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.quality.description') }}
          </p>
          <label :class="['mt-4', 'grid', 'gap-1']">
            <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.month') }}</span>
            <input
              v-model="goldLabelMonth"
              :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
              placeholder="2026-08"
              @keydown.enter.prevent="loadQualityGoldLabels()"
            >
          </label>
          <MemoryQualitySessionPicker
            :selected-session-id="selectedQualitySessionId"
            :mode="qualityTrialMode"
            :sessions="qualityReplaySessions"
            :loading="qualityReplaySessionsLoading"
            :has-more="Boolean(qualityReplaySessionsNextCursor)"
            @update:selected-session-id="store.selectQualityTrialSession"
            @update:mode="store.setQualityTrialMode"
            @load-more="store.loadMoreQualityReplaySessions()"
          />
          <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
            <Button
              :label="t('settings.pages.memory.workbench.actions.load_gold_labels')"
              icon="i-solar:calendar-search-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="goldLabelLoading"
              @click="loadQualityGoldLabels()"
            />
            <Button
              :label="t('settings.pages.memory.workbench.actions.run_quality_trial')"
              icon="i-solar:play-circle-bold-duotone"
              size="sm"
              :loading="qualityTrialLoading"
              :disabled="qualityReplaySessionsLoading || !selectedQualitySessionId"
              @click="runQualityTrial()"
            />
            <Button
              :label="t('settings.pages.memory.workbench.actions.build_gold_regression')"
              icon="i-solar:archive-check-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="goldLabelLoading"
              @click="buildGoldRegression()"
            />
          </div>
        </section>

        <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-sm', 'font-semibold']">
            {{ t('settings.pages.memory.workbench.quality.feedback_title') }}
          </div>
          <p :class="['mt-1', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.quality.feedback_description') }}
          </p>
          <label :class="['mt-3', 'flex', 'flex-col', 'gap-1', 'text-xs', 'text-neutral-500']">
            <span>{{ t('memory-workbench.quality.reason_label') }}</span>
            <select
              v-model="selectedGoldLabelReason"
              :aria-label="t('memory-workbench.quality.reason_label')"
              :class="['border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'text-neutral-900', 'dark:border-neutral-700', 'dark:bg-neutral-950', 'dark:text-neutral-100']"
            >
              <option :value="null">
                {{ t('memory-workbench.quality.reason_none') }}
              </option>
              <option v-for="option in qualityGoldReasonOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <div :class="['mt-3', 'flex', 'flex-col', 'gap-2']">
            <Button
              v-for="option in qualityGoldLabelButtons"
              :key="option.value"
              :label="option.label"
              size="sm"
              :variant="option.variant"
              :loading="goldLabelLoading"
              :disabled="!(recallProbe?.query || recallQuery.trim())"
              @click="applyProbeGoldLabel(option.value)"
            />
          </div>
          <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.query') }}:
            {{ recallProbe?.query ?? recallQuery }}
          </div>
        </section>
      </div>

      <div :class="['flex', 'flex-col', 'gap-3']">
        <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
            <div>
              <div :class="['text-sm', 'font-semibold']">
                {{ t('settings.pages.memory.workbench.quality.report_title') }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.month') }}: {{ goldLabelMonth }}
              </div>
            </div>
            <div :class="['text-sm', qualityTrialReport?.passed ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300']">
              {{ qualityTrialReport ? (qualityTrialReport.passed ? t('settings.pages.memory.workbench.states.quality_passed') : t('settings.pages.memory.workbench.states.quality_failed')) : '-' }}
            </div>
          </div>
          <div v-if="!qualityTrialReport" :class="['mt-4', 'border', 'border-dashed', 'border-neutral-300', 'p-4', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
            {{ t('settings.pages.memory.workbench.states.empty_quality_report') }}
          </div>
          <template v-else>
            <div :class="['mt-4', 'grid', 'grid-cols-2', 'gap-2', 'text-sm', 'lg:grid-cols-4']">
              <div>{{ t('settings.pages.memory.workbench.fields.long_term_fixtures') }}: {{ qualityTrialReport.summary.longTermFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.working_memory_fixtures') }}: {{ qualityTrialReport.summary.workingMemoryFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.compressed_context_fixtures') }}: {{ qualityTrialReport.summary.compressedContextBehaviorFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.temporal_conflict_fixtures') }}: {{ qualityTrialReport.summary.temporalConflictFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_soak') }}: {{ qualityTrialReport.summary.semanticScaleSoakRunCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.experience_quality') }}: {{ qualityTrialReport.summary.experienceQualityFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.scope_fuzz_cases') }}: {{ qualityTrialReport.summary.scopeFuzzCaseCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.persona_fixtures') }}: {{ qualityTrialReport.summary.personaTrainingFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.dialogue_replay') }}: {{ qualityTrialReport.summary.dialogueReplayCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.recall_at_k') }}: {{ formatQualityScore(qualityTrialReport.quality.summary.recallAtK) }}</div>
            </div>
            <div v-if="qualityTrialReport.dialogueReplay" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.dialogue_replay') }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-2', 'gap-2', 'text-sm', 'lg:grid-cols-4']">
                <div>{{ t('settings.pages.memory.workbench.fields.replay_turns') }}: {{ qualityTrialReport.dialogueReplay.summary.turnCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_succeeded_turns') }}: {{ qualityTrialReport.dialogueReplay.summary.succeededTurnCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_failed_turns') }}: {{ qualityTrialReport.dialogueReplay.summary.failedTurnCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_checkpoint_writes') }}: {{ qualityTrialReport.dialogueReplay.summary.checkpointWriteCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_recalled_evidence') }}: {{ qualityTrialReport.dialogueReplay.summary.recalledEvidenceCount }}</div>
              </div>
              <div v-if="qualityTrialReport.dialogueReplay.summary.lastError" :class="['mt-2', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
                {{ t('settings.pages.memory.workbench.fields.last_error') }}:
                {{ qualityTrialReport.dialogueReplay.summary.lastError }}
              </div>
              <details v-if="qualityTrialReport.dialogueReplay.turns.length > 0" :class="['mt-3', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
                <summary :class="['cursor-pointer', 'text-xs', 'font-semibold', 'text-neutral-500']">
                  {{ t('settings.pages.memory.workbench.fields.replay_turn_trace') }}
                </summary>
                <pre :class="['mt-2', 'max-h-80', 'overflow-auto', 'whitespace-pre-wrap', 'text-xs']">{{ JSON.stringify(qualityTrialReport.dialogueReplay.turns, null, 2) }}</pre>
              </details>
            </div>
            <div v-if="qualityTrialReport.runtimeHealth" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.runtime_health') }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-2', 'gap-2', 'text-sm', 'lg:grid-cols-3']">
                <div>{{ t('settings.pages.memory.workbench.fields.queue_pending') }}: {{ qualityTrialReport.runtimeHealth.queue.pending }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.queue_review') }}: {{ qualityTrialReport.runtimeHealth.queue.review }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.queue_applied') }}: {{ qualityTrialReport.runtimeHealth.queue.applied }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.queue_failed') }}: {{ qualityTrialReport.runtimeHealth.queue.failed }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.queue_dead_lettered') }}: {{ qualityTrialReport.runtimeHealth.queue.deadLettered }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.recall_latency') }}: {{ qualityTrialReport.runtimeHealth.recall.lastLatencyMs ?? '-' }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.recall_p95') }}: {{ qualityTrialReport.runtimeHealth.recall.p95LatencyMs ?? '-' }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.embedding_provider') }}: {{ qualityTrialReport.runtimeHealth.embedding.providerConfigured ? t('settings.pages.memory.workbench.states.configured') : t('settings.pages.memory.workbench.states.not_configured') }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.model') }}: {{ qualityTrialReport.runtimeHealth.embedding.modelId ?? '-' }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.dimensions') }}: {{ qualityTrialReport.runtimeHealth.embedding.dimensions ?? '-' }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.index_mode') }}: {{ formatIndexMode(qualityTrialReport.runtimeHealth.embedding.indexMode) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.degraded') }}: {{ formatBoolean(qualityTrialReport.runtimeHealth.embedding.degraded) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.native_index') }}: {{ formatBoolean(qualityTrialReport.runtimeHealth.embedding.nativeIndexReady) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.reindex_required') }}: {{ formatBoolean(qualityTrialReport.runtimeHealth.embedding.reindexRequired) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.search_ready') }}: {{ formatBoolean(qualityTrialReport.runtimeHealth.embedding.searchReady) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.coverage_ratio') }}: {{ formatCoverageRatio(qualityTrialReport.runtimeHealth.embedding.coverageRatio) }}</div>
              </div>
              <div v-if="qualityTrialReport.runtimeHealth.recall.lastError" :class="['mt-2', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
                {{ t('settings.pages.memory.workbench.fields.recall_health') }}:
                {{ qualityTrialReport.runtimeHealth.recall.lastError }}
              </div>
              <div v-if="qualityTrialReport.runtimeHealth.embedding.lastError" :class="['mt-2', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
                {{ t('settings.pages.memory.workbench.fields.embedding_health') }}:
                {{ qualityTrialReport.runtimeHealth.embedding.lastError }}
              </div>
              <ul v-if="qualityTrialReport.runtimeHealth.errors.length > 0" :class="['mt-2', 'list-disc', 'space-y-1', 'pl-5', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
                <li v-for="error in qualityTrialReport.runtimeHealth.errors" :key="error">
                  {{ error }}
                </li>
              </ul>
            </div>
            <div v-if="qualityTrialReport.summary.failingStageIds.length > 0" :class="['mt-3', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
              {{ t('settings.pages.memory.workbench.fields.failing_stages') }}:
              {{ listText(qualityTrialReport.summary.failingStageIds) }}
            </div>
            <div v-if="qualityFailureDetails.length > 0" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.quality_findings') }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-1', 'gap-2', 'xl:grid-cols-2']">
                <article v-for="item in qualityFailureDetails" :key="item.id" :class="['border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
                  <div :class="['text-sm', 'font-medium']">
                    {{ item.title }}
                  </div>
                  <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
                    {{ item.description }}
                  </div>
                  <ul v-if="item.meta.length > 0" :class="['mt-2', 'list-disc', 'space-y-1', 'pl-4', 'text-xs', 'text-neutral-500']">
                    <li v-for="meta in item.meta" :key="meta">
                      {{ meta }}
                    </li>
                  </ul>
                </article>
              </div>
            </div>
            <div v-if="qualityTrialReport.recommendedNextActions.length > 0" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.recommended_actions') }}
              </div>
              <ul :class="['mt-2', 'list-disc', 'space-y-1', 'pl-5', 'text-sm']">
                <li v-for="action in qualityTrialReport.recommendedNextActions" :key="action">
                  {{ action }}
                </li>
              </ul>
            </div>
            <details :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <summary :class="['cursor-pointer', 'text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.trace') }}
              </summary>
              <pre :class="['mt-2', 'max-h-80', 'overflow-auto', 'whitespace-pre-wrap', 'text-xs']">{{ JSON.stringify(qualityTrialReport.quality.traces, null, 2) }}</pre>
            </details>
          </template>
        </section>

        <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
            <div :class="['text-sm', 'font-semibold']">
              {{ t('settings.pages.memory.workbench.quality.gold_labels_title') }}
            </div>
            <div :class="['text-xs', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.count') }}:
              {{ monthlyGoldRegressionPack?.itemCount ?? monthlyGoldLabels.length }}
            </div>
          </div>
          <div v-if="monthlyGoldLabels.length === 0" :class="['mt-4', 'border', 'border-dashed', 'border-neutral-300', 'p-4', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
            {{ t('settings.pages.memory.workbench.states.empty_gold_labels') }}
          </div>
          <div v-else :class="['mt-3', 'flex', 'flex-col', 'gap-2']">
            <article v-for="item in monthlyGoldLabels" :key="item.id" :class="['border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
              <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
                <span>{{ item.labelText }}</span>
                <span v-if="item.reason">
                  {{ t(`memory-workbench.quality.reasons.${item.reason}.label`) }}
                </span>
                <span>{{ item.evaluationClass }}</span>
                <span>{{ formatTimestamp(item.createdAt) }}</span>
              </div>
              <div :class="['mt-2', 'text-sm', 'font-medium']">
                {{ item.query }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-1', 'gap-1', 'text-xs', 'text-neutral-500', 'md:grid-cols-3']">
                <div>{{ t('settings.pages.memory.workbench.fields.expected_ids') }}: {{ listText(item.expectedMemoryIds) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.surfaced_ids') }}: {{ listText(item.surfacedMemoryIds) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.wrong_thread_ids') }}: {{ listText(item.wrongThreadIds) }}</div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>

    <section v-else-if="activeTab === 'persona'" :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['flex', 'flex-wrap', 'gap-2']">
        <Button
          :label="t('settings.pages.memory.workbench.actions.refresh')"
          icon="i-solar:refresh-bold-duotone"
          size="sm"
          :loading="personaLoading"
          @click="store.refreshPersonaCandidates()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.run_persona_training')"
          icon="i-solar:play-bold-duotone"
          size="sm"
          variant="secondary"
          :loading="personaTrainingRunLoading"
          :disabled="!personaTrainingDataset?.activeVersionId"
          @click="store.runPersonaTraining(personaTrainingDataset?.activeVersionId)"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.refresh_persona_training')"
          icon="i-solar:refresh-bold-duotone"
          size="sm"
          variant="secondary"
          :loading="personaTrainingRunLoading"
          @click="store.refreshPersonaTrainingIncrements()"
        />
      </div>
      <div v-if="personaTrainingRun" :class="['border', personaTrainingRun.status === 'failed' ? 'border-rose-200 dark:border-rose-900' : 'border-emerald-200 dark:border-emerald-900', 'p-4']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_last_run') }}
        </div>
        <div :class="['mt-2', 'text-sm']">
          {{ personaTrainingRun.status === 'succeeded'
            ? t('settings.pages.memory.workbench.states.persona_training_succeeded')
            : t('settings.pages.memory.workbench.states.persona_training_failed') }}
          · {{ personaTrainingRun.runId }}
        </div>
        <div v-if="personaTrainingRun.status === 'failed'" :class="['mt-1', 'text-sm', 'text-rose-600', 'dark:text-rose-300']">
          {{ personaTrainingRun.error }}
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.persona_training_increments') }}
        </div>
        <div v-if="personaTrainingIncrements.length === 0" :class="['mt-2', 'text-sm', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.states.empty_persona_training_increments') }}
        </div>
        <article v-for="increment in personaTrainingIncrements" :key="increment.id" :class="['mt-3', 'border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
          <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
            <span>{{ increment.id }}</span>
            <span>{{ increment.state }}</span>
            <span>{{ formatTimestamp(increment.createdAt) }}</span>
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.dataset_manifest') }}: {{ increment.manifestHash }}
          </div>
          <Button
            v-if="increment.state === 'available'"
            :class="['mt-2']"
            :label="t('settings.pages.memory.workbench.actions.rollback_persona_increment')"
            icon="i-solar:restart-bold-duotone"
            size="sm"
            variant="secondary"
            :loading="personaTrainingRunLoading"
            @click="store.rollbackPersonaTrainingIncrement(increment.id)"
          />
        </article>
      </div>
      <div v-if="personaCandidates.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_persona') }}
      </div>
      <article v-for="item in personaCandidates" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
          <span>{{ t('settings.pages.memory.workbench.fields.candidate_status') }}: {{ formatPersonaCandidateStatus(item.status) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.privacy_class') }}: {{ formatPersonaPrivacyClass(item.privacyClass) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.training') }}: {{ item.allowTraining ? t('settings.pages.memory.workbench.filters.training.allowed') : t('settings.pages.memory.workbench.filters.training.blocked') }}</span>
        </div>
        <div :class="['mt-3', 'text-xs', 'font-semibold', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.behavior_lesson') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-medium']">
          {{ item.behaviorLesson }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-1', 'gap-3', 'lg:grid-cols-2']">
          <div>
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.positive_example') }}
            </div>
            <div :class="['mt-1', 'text-sm']">
              {{ item.positiveExample }}
            </div>
          </div>
          <div>
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.negative_example') }}
            </div>
            <div :class="['mt-1', 'text-sm']">
              {{ item.negativeExample ?? '-' }}
            </div>
          </div>
        </div>
        <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.source_ids') }}: {{ listText(item.sourceMemoryIds) }}
        </div>
        <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
          <Button size="sm" :label="t('settings.pages.memory.workbench.actions.approve_candidate')" :loading="personaLoading" @click="store.applyPersonaCandidateAction(item.id, 'approve')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.reject_candidate')" :loading="personaLoading" @click="store.applyPersonaCandidateAction(item.id, 'reject')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.no_training')" :loading="personaLoading" @click="store.applyPersonaCandidateAction(item.id, 'no-training')" />
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'skills'" :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
        <div>
          <h2 :class="['text-lg', 'font-semibold']">
            {{ t('settings.pages.memory.workbench.skills.title') }}
          </h2>
          <p :class="['mt-1', 'text-sm', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.skills.description') }}
          </p>
        </div>
        <Button
          :label="t('settings.pages.memory.workbench.actions.refresh')"
          icon="i-solar:refresh-bold-duotone"
          size="sm"
          :loading="skillLoading"
          @click="store.refreshSkills(false)"
        />
      </div>
      <div v-if="skills.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.skills.empty') }}
      </div>
      <article v-for="skill in skills" :key="`${skill.id}@${skill.version}`" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
          <span class="font-semibold">{{ skill.id }}@{{ skill.version }}</span>
          <span>{{ skill.activationStatus }}</span>
          <span>{{ skill.evaluationStatus }}</span>
          <span>{{ skill.risk }}</span>
        </div>
        <div :class="['mt-2', 'text-sm']">
          {{ skill.description }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.skills.permissions') }}: {{ listText(skill.permissions) }}
        </div>
        <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
          <Button
            v-if="skill.activationStatus !== 'active'"
            :label="t('settings.pages.memory.workbench.skills.activate')"
            icon="i-solar:play-bold-duotone"
            size="sm"
            :loading="skillLoading"
            @click="store.activateSkill(skill.id, skill.version)"
          />
          <Button
            v-if="skill.activationStatus === 'active'"
            :label="t('settings.pages.memory.workbench.skills.rollback')"
            icon="i-solar:restart-bold-duotone"
            size="sm"
            variant="secondary"
            :loading="skillLoading"
            @click="store.rollbackSkill(skill.id, skill.version)"
          />
          <Button
            v-if="skill.activationStatus !== 'revoked'"
            :label="t('settings.pages.memory.workbench.skills.revoke')"
            icon="i-solar:forbidden-circle-bold-duotone"
            size="sm"
            variant="danger"
            :loading="skillLoading"
            @click="store.revokeSkill(skill.id, skill.version)"
          />
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'health'" :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-2']">
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.queue_health') }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-2', 'gap-2', 'text-sm']">
          <div>{{ t('settings.pages.memory.workbench.fields.queue_pending') }}: {{ health?.queue.pending ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.queue_review') }}: {{ health?.queue.review ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.queue_applied') }}: {{ health?.queue.applied ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.queue_failed') }}: {{ health?.queue.failed ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.queue_dead_lettered') }}: {{ health?.queue.deadLettered ?? 0 }}</div>
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.recall_health') }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-1', 'gap-2', 'text-sm']">
          <div>{{ t('settings.pages.memory.workbench.fields.recall_latency') }}: {{ health?.recall.lastLatencyMs ?? '-' }} ms</div>
          <div>{{ t('settings.pages.memory.workbench.fields.recall_p95') }}: {{ health?.recall.p95LatencyMs ?? '-' }} ms</div>
          <div>{{ t('settings.pages.memory.workbench.fields.errors') }}: {{ health?.recall.lastError ?? '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.semantic_channel') }}: {{ health?.embedding.providerConfigured ? t('settings.pages.memory.workbench.fields.available') : t('settings.pages.memory.workbench.fields.unavailable') }}</div>
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
          <div :class="['text-sm', 'font-semibold']">
            {{ t('settings.pages.memory.workbench.fields.embedding_health') }}
          </div>
          <Button
            :label="t('settings.pages.memory.workbench.actions.reindex_embeddings')"
            icon="i-solar:refresh-bold-duotone"
            size="sm"
            :loading="reindexLoading"
            @click="store.reindexEmbeddings()"
          />
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-1', 'gap-2', 'text-sm']">
          <div>{{ t('settings.pages.memory.workbench.fields.embedding') }}: {{ health?.embedding.providerConfigured ? t('settings.pages.memory.workbench.states.configured') : t('settings.pages.memory.workbench.states.not_configured') }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.model') }}: {{ health?.embedding.modelId ?? reindexProgress?.modelId ?? '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.dimensions') }}: {{ health?.embedding.dimensions ?? reindexProgress?.dimensions ?? '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.index_mode') }}: {{ health?.embedding.indexMode ? formatIndexMode(health.embedding.indexMode) : '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.approximate') }}: {{ formatBoolean(health?.embedding.approximate) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.degraded') }}: {{ formatBoolean(health?.embedding.degraded) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.native_index') }}: {{ formatBoolean(health?.embedding.nativeIndexReady) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.search_ready') }}: {{ formatBoolean(health?.embedding.searchReady) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.reindex_required') }}: {{ formatBoolean(health?.embedding.reindexRequired) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.canonical_count') }}: {{ health?.embedding.canonicalCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.indexed_count') }}: {{ health?.embedding.indexedCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.missing_count') }}: {{ health?.embedding.missingCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.text_hash_mismatch_count') }}: {{ health?.embedding.textHashMismatchCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.stale_or_failed_count') }}: {{ health?.embedding.staleOrFailedCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.orphaned_count') }}: {{ health?.embedding.orphanedCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.coverage_ratio') }}: {{ formatCoverageRatio(health?.embedding.coverageRatio) }}</div>
          <div v-if="reindexProgress">
            {{ t('settings.pages.memory.workbench.fields.reindex_status') }}:
            {{ formatReindexStatus(reindexProgress.status) }}
            ({{ reindexProgress.indexed }}/{{ reindexProgress.total }})
          </div>
          <div v-if="reindexProgress">
            {{ t('settings.pages.memory.workbench.fields.reindex_progress') }}:
            {{ Math.round(reindexProgress.progress * 100) }}%
          </div>
          <div v-if="reindexProgress?.lastError" :class="['text-rose-600', 'dark:text-rose-300']">
            {{ t('settings.pages.memory.workbench.fields.errors') }}: {{ reindexProgress.lastError }}
          </div>
          <div v-if="reindexResult">
            {{ t('settings.pages.memory.workbench.fields.indexed') }}: {{ reindexResult.indexed }} /
            {{ t('settings.pages.memory.workbench.fields.failed') }}: {{ reindexResult.failed }}
          </div>
          <div v-if="reindexProgress && ['queued', 'running', 'cancel_requested'].includes(reindexProgress.status)" :class="['flex', 'flex-wrap', 'gap-2']">
            <Button
              :label="t('settings.pages.memory.workbench.actions.cancel_reindex')"
              icon="i-solar:close-circle-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="reindexLoading"
              @click="store.cancelReindexJob(reindexProgress.jobId, t('settings.pages.memory.workbench.states.cancelled_by_user'))"
            />
          </div>
          <div v-if="reindexProgress?.status === 'failed' && reindexProgress.deadLettered > 0" :class="['flex', 'flex-wrap', 'gap-2']">
            <Button
              :label="t('settings.pages.memory.workbench.actions.retry_dead_letter')"
              icon="i-solar:restart-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="reindexLoading"
              @click="store.retryDeadLetterReindex(reindexProgress.jobId)"
            />
          </div>
          <div v-if="reindexDeadLetterItems.length > 0" :class="['flex', 'flex-col', 'gap-2', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.dead_letter_items') }}
            </div>
            <article v-for="deadLetterItem in reindexDeadLetterItems" :key="deadLetterItem.itemId" :class="['border', 'border-rose-200', 'p-3', 'dark:border-rose-900']">
              <div :class="['text-xs', 'text-neutral-500']">
                {{ deadLetterItem.source }} · {{ deadLetterItem.sourceId }}
              </div>
              <div :class="['mt-1', 'text-xs']">
                {{ t('settings.pages.memory.workbench.fields.attempt_count') }}: {{ deadLetterItem.attemptCount }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-rose-600', 'dark:text-rose-300']">
                {{ deadLetterItem.lastError ?? '-' }}
              </div>
              <Button
                :class="['mt-2']"
                :label="t('settings.pages.memory.workbench.actions.retry_dead_letter_item')"
                icon="i-solar:restart-bold-duotone"
                size="sm"
                variant="secondary"
                :loading="reindexLoading"
                @click="store.retryDeadLetterReindex(reindexProgress!.jobId, [deadLetterItem.itemId])"
              />
            </article>
          </div>
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.errors') }}
        </div>
        <div :class="['mt-3', 'text-sm', 'text-neutral-500']">
          {{ listText(health?.errors ?? []) }}
        </div>
      </div>
      <details :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800', 'xl:col-span-2']">
        <summary :class="['cursor-pointer', 'text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.debug_details') }}
        </summary>
        <pre :class="['mt-3', 'whitespace-pre-wrap', 'text-xs']">{{ JSON.stringify(health, null, 2) }}</pre>
      </details>
    </section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.memory.workbench.title
  subtitleKey: settings.pages.modules.title
  descriptionKey: settings.pages.memory.workbench.description
  icon: i-solar:database-bold-duotone
  stageTransition:
    name: slide
</route>
