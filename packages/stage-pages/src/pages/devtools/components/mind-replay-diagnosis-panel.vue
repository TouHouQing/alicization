<script setup lang="ts">
import type {
  AlicizationMindReplayBenchmarkDimensionGroup,
  AlicizationMindReplayBenchmarkTurnDiagnosis,
  AlicizationMindReplayHumanRatingDimensionRow,
  AlicizationMindReplayMemoryHealthComparisonRow,
  AlicizationMindReplayRegressionTriageRow,
  AlicizationMindReplayShipGateRow,
} from '@proj-alicization/stage-ui/stores/alicization-mind-replay'
import type { AlicizationRunReplayBenchmarkResult } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { Button, FieldInput, SelectTab } from '@proj-alicization/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import MindReplayBenchmarkReport from './mind-replay-benchmark-report.vue'

const props = defineProps<{
  report: AlicizationRunReplayBenchmarkResult | null
  loading: boolean
  supported: boolean
  packId: 'default-humanlike-memory-v1' | 'sampled-humanlike-memory-v1' | 'backlog-humanlike-memory-v1' | 'growth-humanlike-memory-v1'
  sampleLimit: number
  dimensionGroups: AlicizationMindReplayBenchmarkDimensionGroup[]
  humanRatingRows: AlicizationMindReplayHumanRatingDimensionRow[]
  shipGateRows: AlicizationMindReplayShipGateRow[]
  regressionTriageRows: AlicizationMindReplayRegressionTriageRow[]
  selectedDimension: string
  failingTurns: AlicizationMindReplayBenchmarkTurnDiagnosis[]
  selectedTurnId: string | null
  memoryHealthRows: AlicizationMindReplayMemoryHealthComparisonRow[]
}>()

const emit = defineEmits<{
  (event: 'update:packId', value: 'default-humanlike-memory-v1' | 'sampled-humanlike-memory-v1' | 'backlog-humanlike-memory-v1' | 'growth-humanlike-memory-v1'): void
  (event: 'update:sampleLimit', value: number): void
  (event: 'update:selectedDimension', value: string): void
  (event: 'update:selectedTurnId', value: string | null): void
  (event: 'run'): void
  (event: 'inspectTurn', value: string | null): void
}>()

const { t, te } = useI18n()
const i18nPageKey = 'settings.pages.system.sections.section.developer.sections.section.mind-replay.page.diagnosis'

function tDiagnosis(path: string, fallback: string, params?: Record<string, unknown>) {
  const key = `${i18nPageKey}.${path}`
  if (!te(key))
    return fallback
  return String(t(key, params ?? {}))
}

const sampleLimitText = computed({
  get: () => String(props.sampleLimit),
  set: (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed))
      return
    emit('update:sampleLimit', parsed)
  },
})

const packOptions = computed(() => [
  {
    label: tDiagnosis('packs.sampled', 'Sampled'),
    value: 'sampled-humanlike-memory-v1',
  },
  {
    label: tDiagnosis('packs.backlog', 'Backlog'),
    value: 'backlog-humanlike-memory-v1',
  },
  {
    label: tDiagnosis('packs.default', 'Default'),
    value: 'default-humanlike-memory-v1',
  },
  {
    label: tDiagnosis('packs.growth', 'Growth'),
    value: 'growth-humanlike-memory-v1',
  },
])

const dimensionOptions = computed(() => [
  {
    label: tDiagnosis('dimensions.all', 'All'),
    value: 'all',
  },
  ...props.dimensionGroups.map(group => ({
    label: `${group.key} (${group.failingTurnCount})`,
    value: group.key,
  })),
])

function updatePackId(value: unknown) {
  if (value === 'sampled-humanlike-memory-v1' || value === 'backlog-humanlike-memory-v1' || value === 'default-humanlike-memory-v1' || value === 'growth-humanlike-memory-v1')
    emit('update:packId', value)
}

function updateSelectedDimension(value: unknown) {
  emit('update:selectedDimension', typeof value === 'string' ? value : 'all')
}

function pickDimensionTone(status: 'pass' | 'fail') {
  if (status === 'fail') {
    return [
      'border-amber-300',
      'bg-amber-50/70',
      'text-amber-900',
      'dark:border-amber-800/70',
      'dark:bg-amber-950/20',
      'dark:text-amber-100',
    ]
  }

  return [
    'border-emerald-300',
    'bg-emerald-50/70',
    'text-emerald-900',
    'dark:border-emerald-800/70',
    'dark:bg-emerald-950/20',
    'dark:text-emerald-100',
  ]
}

function turnTraceLabel(turn: AlicizationMindReplayBenchmarkTurnDiagnosis) {
  if (turn.decisionTraceId)
    return turn.decisionTraceId
  return `${turn.tracePointerKind}:${turn.turnId}`
}
</script>

<template>
  <section
    :class="[
      'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
      'bg-white/70', 'p-4',
      'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
    ]"
  >
    <div :class="['mb-4', 'flex', 'flex-col', 'gap-3']">
      <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-3']">
        <div>
          <div :class="['text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ tDiagnosis('title', 'Diagnosis Console') }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tDiagnosis('description', 'Group failing dimensions, drill into failing turns, and compare benchmark telemetry against memory health snapshots.') }}
          </div>
        </div>
        <Button
          :label="tDiagnosis('actions.run', 'Run Diagnosis')"
          icon="i-solar:play-circle-bold-duotone"
          size="sm"
          :disabled="loading || !supported"
          @click="emit('run')"
        />
      </div>

      <div :class="['grid', 'gap-3', 'lg:grid-cols-[minmax(0,1fr)_12rem]']">
        <div :class="['flex', 'flex-col', 'gap-2']">
          <div :class="['text-xs', 'font-medium', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tDiagnosis('packs.label', 'Benchmark Pack') }}
          </div>
          <SelectTab
            :model-value="packId"
            size="sm"
            :options="packOptions"
            @update:model-value="updatePackId"
          />
        </div>
        <FieldInput
          v-model="sampleLimitText"
          :label="tDiagnosis('sample_limit.label', 'Sample Limit')"
          :description="tDiagnosis('sample_limit.description', 'Used by sampled/backlog packs.')"
          type="number"
        />
      </div>
    </div>

    <MindReplayBenchmarkReport
      :report="report"
      :loading="loading"
      :supported="supported"
    />

    <div
      v-if="report"
      :class="['mt-4', 'grid', 'gap-4', 'xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]']"
    >
      <div :class="['flex', 'flex-col', 'gap-4']">
        <section
          :class="[
            'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'p-4',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
          ]"
        >
          <div :class="['mb-3', 'text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ tDiagnosis('human_rating.title', 'Human Rating Rubric') }}
          </div>
          <div
            v-if="humanRatingRows.length === 0"
            :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']"
          >
            {{ tDiagnosis('human_rating.empty', 'No human rating rubric is attached to the latest benchmark report.') }}
          </div>
          <div
            v-else
            :class="['grid', 'gap-2']"
          >
            <div
              v-for="row in humanRatingRows"
              :key="row.key"
              :class="[
                'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
                'bg-white/70', 'px-3', 'py-3',
                'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
              ]"
            >
              <div :class="['flex', 'items-center', 'justify-between', 'gap-2']">
                <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                  {{ row.key }}
                </div>
                <div :class="['text-[11px]', 'text-neutral-500', 'dark:text-neutral-400']">
                  {{ row.scale }}
                </div>
              </div>
              <div :class="['mt-1', 'text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
                {{ row.label }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-neutral-600', 'dark:text-neutral-300']">
                {{ row.prompt }}
              </div>
            </div>
          </div>
        </section>

        <section
          :class="[
            'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'p-4',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
          ]"
        >
          <div :class="['mb-3', 'text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ tDiagnosis('ship_gate.title', 'Ship Gate') }}
          </div>
          <div :class="['mb-3', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tDiagnosis('ship_gate.learning_hint', 'Learning-domain rows track whether relationship/self/world learning stayed disciplined instead of silently over-internalizing.') }}
          </div>
          <div :class="['grid', 'gap-2']">
            <div
              v-for="row in shipGateRows"
              :key="row.key"
              :class="[
                'rounded-xl', 'border', 'border-solid', 'px-3', 'py-3',
                ...(row.status === 'pass'
                  ? ['border-emerald-200/80', 'bg-emerald-50/70', 'dark:border-emerald-900/70', 'dark:bg-emerald-950/20']
                  : ['border-amber-200/80', 'bg-amber-50/70', 'dark:border-amber-900/70', 'dark:bg-amber-950/20']),
              ]"
            >
              <div :class="['flex', 'items-center', 'justify-between', 'gap-2']">
                <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                  {{ row.key }}
                </div>
                <div :class="['text-[11px]', 'font-medium', row.status === 'pass' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300']">
                  {{ row.status }}
                </div>
              </div>
              <div :class="['mt-1', 'text-xs', 'text-neutral-600', 'dark:text-neutral-300']">
                {{ row.detail }}
              </div>
            </div>
          </div>
        </section>

        <section
          :class="[
            'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'p-4',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
          ]"
        >
          <div :class="['mb-3', 'text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ tDiagnosis('dimensions.title', 'Failing Dimension Groups') }}
          </div>
          <div :class="['mb-3']">
            <SelectTab
              :model-value="selectedDimension"
              size="sm"
              :options="dimensionOptions"
              @update:model-value="updateSelectedDimension"
            />
          </div>
          <div :class="['grid', 'gap-2', 'md:grid-cols-2']">
            <div
              v-for="group in dimensionGroups"
              :key="group.key"
              :class="[
                'rounded-xl', 'border', 'border-solid', 'px-3', 'py-3',
                ...pickDimensionTone(group.status),
              ]"
            >
              <div :class="['flex', 'items-center', 'justify-between', 'gap-2']">
                <div :class="['font-mono', 'text-xs']">
                  {{ group.key }}
                </div>
                <div :class="['text-[11px]', 'font-medium']">
                  {{ group.status }}
                </div>
              </div>
              <div :class="['mt-2', 'text-[11px]']">
                {{ tDiagnosis('dimensions.summary', '{passed}/{applicable} passed, {failing} failing', {
                  passed: group.passedCount,
                  applicable: group.applicableCount,
                  failing: group.failingTurnCount,
                }) }}
              </div>
            </div>
          </div>
        </section>

        <section
          :class="[
            'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'p-4',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
          ]"
        >
          <div :class="['mb-3', 'text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ tDiagnosis('turns.title', 'Failing Turns') }}
          </div>
          <div
            v-if="failingTurns.length === 0"
            :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']"
          >
            {{ tDiagnosis('turns.empty', 'No failing turns for the current diagnosis filter.') }}
          </div>
          <div
            v-else
            :class="['flex', 'flex-col', 'gap-2']"
          >
            <button
              v-for="turn in failingTurns"
              :key="turn.turnId"
              type="button"
              :class="[
                'rounded-xl', 'border', 'border-solid', 'p-3', 'text-left',
                selectedTurnId === turn.turnId
                  ? 'border-cyan-400 bg-cyan-50/70 dark:border-cyan-700/80 dark:bg-cyan-950/20'
                  : 'border-neutral-200/80 bg-white/70 dark:border-neutral-800/70 dark:bg-neutral-950/40',
              ]"
              @click="emit('update:selectedTurnId', turn.turnId)"
            >
              <div :class="['flex', 'items-start', 'justify-between', 'gap-3']">
                <div :class="['min-w-0', 'flex-1']">
                  <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                    {{ turn.turnId }}
                  </div>
                  <div :class="['mt-1', 'text-xs', 'text-neutral-600', 'dark:text-neutral-300']">
                    {{ turn.userText }}
                  </div>
                  <div :class="['mt-2', 'font-mono', 'text-[11px]', 'text-neutral-500', 'dark:text-neutral-400']">
                    {{ turnTraceLabel(turn) }}
                  </div>
                </div>
                <Button
                  :label="tDiagnosis('turns.inspect', 'Inspect')"
                  icon="i-solar:eye-bold-duotone"
                  size="sm"
                  variant="secondary"
                  @click.stop="emit('inspectTurn', turn.turnId)"
                />
              </div>
              <div :class="['mt-2', 'flex', 'flex-wrap', 'gap-1.5']">
                <span
                  v-for="dimension in turn.failingDimensions"
                  :key="`${turn.turnId}:${dimension}`"
                  :class="[
                    'rounded-full', 'border', 'border-solid',
                    'border-amber-300', 'px-2', 'py-0.5',
                    'font-mono', 'text-[11px]', 'text-amber-800',
                    'dark:border-amber-800/70', 'dark:text-amber-200',
                  ]"
                >
                  {{ dimension }}
                </span>
                <span
                  v-for="category in turn.sampledCategories"
                  :key="`${turn.turnId}:${category}`"
                  :class="[
                    'rounded-full', 'border', 'border-solid',
                    'border-cyan-300', 'px-2', 'py-0.5',
                    'font-mono', 'text-[11px]', 'text-cyan-800',
                    'dark:border-cyan-800/70', 'dark:text-cyan-200',
                  ]"
                >
                  {{ category }}
                </span>
              </div>
              <div
                v-if="turn.diagnosisSummary"
                :class="['mt-2', 'rounded-xl', 'border', 'border-dashed', 'border-neutral-200/80', 'bg-neutral-50/70', 'px-3', 'py-2', 'text-[11px]', 'text-neutral-700', 'dark:border-neutral-800/70', 'dark:bg-neutral-950/30', 'dark:text-neutral-200']"
              >
                {{ turn.diagnosisSummary }}
              </div>
              <div
                v-if="turn.learningEvidenceSummary"
                :class="['mt-2', 'grid', 'gap-1.5', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']"
              >
                <div>
                  learning={{ turn.learningEvidenceSummary.action || 'n/a' }} · domain={{ turn.learningEvidenceSummary.domain || 'n/a' }}
                </div>
                <div>
                  result={{ turn.learningEvidenceSummary.resultSummary || 'n/a' }}
                </div>
                <div v-if="turn.learningEvidenceSummary.focuses.length > 0">
                  focuses={{ turn.learningEvidenceSummary.focuses.join(' | ') }}
                </div>
              </div>
              <div
                v-if="turn.learningExecutionStateSummary"
                :class="['mt-2', 'grid', 'gap-1.5', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']"
              >
                <div>
                  learning_state={{ turn.learningExecutionStateSummary.currentStatus || 'n/a' }} · action={{ turn.learningExecutionStateSummary.nextLearningAction || 'n/a' }}
                </div>
                <div>
                  attempts={{ turn.learningExecutionStateSummary.currentAttemptCount }}/{{ turn.learningExecutionStateSummary.currentMaxAttempts }} · queued={{ turn.learningExecutionStateSummary.queuedTaskCount }} · running={{ turn.learningExecutionStateSummary.runningTaskCount }} · blocked={{ turn.learningExecutionStateSummary.blockedTaskCount }}
                </div>
                <div v-if="turn.learningExecutionStateSummary.currentFailureKind || turn.learningExecutionStateSummary.currentBlockedReason">
                  failure={{ turn.learningExecutionStateSummary.currentFailureKind || 'n/a' }} · blocked_reason={{ turn.learningExecutionStateSummary.currentBlockedReason || 'n/a' }}
                </div>
                <div v-if="turn.learningExecutionStateSummary.currentNextRetryAt">
                  next_retry_at={{ turn.learningExecutionStateSummary.currentNextRetryAt }}
                </div>
                <div v-if="turn.learningExecutionStateSummary.activeLearningFocuses.length > 0">
                  active_focuses={{ turn.learningExecutionStateSummary.activeLearningFocuses.join(' | ') }}
                </div>
                <div v-if="turn.learningExecutionStateSummary.lastCompletedSummary || turn.learningExecutionStateSummary.lastFailureReason">
                  last_completed={{ turn.learningExecutionStateSummary.lastCompletedSummary || 'n/a' }} · last_failure={{ turn.learningExecutionStateSummary.lastFailureReason || 'n/a' }}
                </div>
              </div>
              <div
                v-if="turn.replyMemoryCoherenceSummary"
                :class="['mt-2', 'grid', 'gap-1.5', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']"
              >
                <div>
                  coherence={{ turn.replyMemoryCoherenceSummary.coherenceState || 'n/a' }}
                </div>
                <div v-if="turn.replyMemoryCoherenceSummary.whyWithheld">
                  why_withheld={{ turn.replyMemoryCoherenceSummary.whyWithheld }}
                </div>
                <div v-if="turn.replyMemoryCoherenceSummary.followUpSummary">
                  follow_up={{ turn.replyMemoryCoherenceSummary.followUpSummary }}
                </div>
                <div
                  v-if="turn.replyMemoryCoherenceSummary.followUpPreferredTiming || turn.replyMemoryCoherenceSummary.followUpIntrusionRisk"
                >
                  timing={{ turn.replyMemoryCoherenceSummary.followUpPreferredTiming || 'n/a' }} · intrusion={{ turn.replyMemoryCoherenceSummary.followUpIntrusionRisk || 'n/a' }}
                </div>
              </div>
              <div
                v-if="turn.resolutionLedgerSummary"
                :class="['mt-2', 'grid', 'gap-1.5', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']"
              >
                <div>
                  dominant={{ turn.resolutionLedgerSummary.dominantClusterSummary || 'n/a' }}
                </div>
                <div>
                  competing={{ turn.resolutionLedgerSummary.competingClusterSummary || 'n/a' }}
                </div>
                <div>
                  surface={{ turn.resolutionLedgerSummary.finalSurfacePolicy || 'n/a' }} · inward={{ turn.resolutionLedgerSummary.shouldStayInward ? 'yes' : 'no' }} · afterPayoff={{ turn.resolutionLedgerSummary.shouldDelayUntilAfterPayoff ? 'yes' : 'no' }}
                </div>
                <div>
                  rejected={{ turn.resolutionLedgerSummary.rejectedCandidateCount }}
                </div>
              </div>
              <div
                v-if="turn.memorySituationCandidateSummary"
                :class="['mt-2', 'grid', 'gap-1.5', 'rounded-xl', 'border', 'border-dashed', 'border-sky-200/80', 'px-3', 'py-2', 'text-[11px]', 'text-neutral-600', 'dark:border-sky-900/70', 'dark:text-neutral-300']"
              >
                <div :class="['font-medium', 'text-neutral-700', 'dark:text-neutral-200']">
                  memory_situation_candidates
                </div>
                <div>
                  selected={{ turn.memorySituationCandidateSummary.selected.join(' | ') || 'n/a' }}
                </div>
                <div>
                  rejected={{ turn.memorySituationCandidateSummary.rejected.join(' | ') || 'n/a' }}
                </div>
                <div>
                  delayed={{ turn.memorySituationCandidateSummary.delayed.join(' | ') || 'n/a' }} · unresolved={{ turn.memorySituationCandidateSummary.unresolved.join(' | ') || 'n/a' }}
                </div>
              </div>
              <div
                v-if="turn.paritySummary"
                :class="['mt-2', 'grid', 'gap-1.5', 'rounded-xl', 'border', 'border-dashed', turn.paritySummary.passed ? 'border-emerald-200/80 dark:border-emerald-900/70' : 'border-amber-200/80 dark:border-amber-900/70', 'px-3', 'py-2', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']"
              >
                <div>
                  parity={{ turn.paritySummary.passed ? 'pass' : 'fail' }} · compared={{ turn.paritySummary.comparedFieldCount }} · divergent={{ turn.paritySummary.divergentFieldCount }}
                </div>
                <div v-if="turn.paritySummary.firstDivergentLayer">
                  first_divergent_layer={{ turn.paritySummary.firstDivergentLayer }} · layers={{ turn.paritySummary.divergentLayers.join(' | ') || 'n/a' }}
                </div>
                <div>
                  {{ turn.paritySummary.summary }}
                </div>
                <div
                  v-for="field in turn.paritySummary.divergentFields.slice(0, 4)"
                  :key="`${turn.turnId}:${field.field}`"
                  :class="['font-mono']"
                >
                  {{ field.field }}: main={{ field.mainValue || 'n/a' }} / browser={{ field.browserValue || 'n/a' }}
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>

      <section
        :class="[
          'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
          'bg-neutral-50/70', 'p-4',
          'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
        ]"
      >
        <div :class="['mb-4']">
          <div :class="['text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ tDiagnosis('triage.title', 'Regression Triage') }}
          </div>
          <div
            v-if="regressionTriageRows.length === 0"
            :class="['mt-2', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']"
          >
            {{ tDiagnosis('triage.empty', 'No failing dimensions to route yet.') }}
          </div>
          <div
            v-else
            :class="['mt-2', 'grid', 'gap-2']"
          >
            <div
              v-for="row in regressionTriageRows"
              :key="`${row.dimension}:${row.owner}`"
              :class="[
                'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
                'bg-white/70', 'px-3', 'py-3',
                'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
              ]"
            >
              <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                {{ row.dimension }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-neutral-600', 'dark:text-neutral-300']">
                {{ tDiagnosis('triage.route', 'Route to: {owner}', { owner: row.owner }) }}
              </div>
              <div :class="['mt-1', 'text-[11px]', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ row.firstCheck }}
              </div>
            </div>
          </div>
        </div>

        <div :class="['mb-3', 'text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
          {{ tDiagnosis('health.title', 'Memory Health Before / After') }}
        </div>
        <div :class="['grid', 'gap-2']">
          <div
            v-for="row in memoryHealthRows"
            :key="row.key"
            :class="[
              'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
              'bg-white/70', 'px-3', 'py-3',
              'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
            ]"
          >
            <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
              {{ row.key }}
            </div>
            <div :class="['mt-2', 'grid', 'grid-cols-3', 'gap-2', 'text-[11px]', 'text-neutral-500', 'dark:text-neutral-400']">
              <div>
                <div>{{ tDiagnosis('health.before', 'before') }}</div>
                <div :class="['mt-1', 'font-mono', 'text-neutral-700', 'dark:text-neutral-200']">
                  {{ row.before ?? 'n/a' }}
                </div>
              </div>
              <div>
                <div>{{ tDiagnosis('health.after', 'after') }}</div>
                <div :class="['mt-1', 'font-mono', 'text-neutral-700', 'dark:text-neutral-200']">
                  {{ row.after ?? 'n/a' }}
                </div>
              </div>
              <div>
                <div>{{ tDiagnosis('health.patch', 'patch') }}</div>
                <div :class="['mt-1', 'font-mono', 'text-neutral-700', 'dark:text-neutral-200']">
                  {{ row.patch ?? 'n/a' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
