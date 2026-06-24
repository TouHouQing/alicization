<script setup lang="ts">
import type {
  AlicizationReplayBenchmarkPackId,
  AlicizationRunReplayBenchmarkResult,
} from '@proj-alicization/stage-ui/stores/alicization-bridge'
import type {
  AlicizationMindReplayBenchmarkDimensionGroup,
  AlicizationMindReplayBenchmarkTurnDiagnosis,
  AlicizationMindReplayHumanRatingDimensionRow,
  AlicizationMindReplayMemoryHealthComparisonRow,
  AlicizationMindReplayMetricRow,
  AlicizationMindReplayRegressionTriageRow,
  AlicizationMindReplaySameHerRepairTargetRow,
  AlicizationMindReplayShipGateRow,
} from '@proj-alicization/stage-ui/stores/alicization-mind-replay'

import { Button, FieldInput, SelectTab } from '@proj-alicization/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import MindReplayBenchmarkReport from './mind-replay-benchmark-report.vue'

const props = defineProps<{
  report: AlicizationRunReplayBenchmarkResult | null
  loading: boolean
  supported: boolean
  packId: AlicizationReplayBenchmarkPackId
  sampleLimit: number
  dimensionGroups: AlicizationMindReplayBenchmarkDimensionGroup[]
  humanRatingRows: AlicizationMindReplayHumanRatingDimensionRow[]
  shipGateRows: AlicizationMindReplayShipGateRow[]
  regressionTriageRows: AlicizationMindReplayRegressionTriageRow[]
  selectedDimension: string
  failingTurns: AlicizationMindReplayBenchmarkTurnDiagnosis[]
  selectedTurnId: string | null
  memoryHealthRows: AlicizationMindReplayMemoryHealthComparisonRow[]
  presenceQualityRows: AlicizationMindReplayMemoryHealthComparisonRow[]
  projectStateRows: AlicizationMindReplayMetricRow[]
  runtimeSamplingEvidenceRows: AlicizationMindReplayMetricRow[]
  sameHerSessionRows: AlicizationMindReplayMetricRow[]
  sameHerLaneGapRows: AlicizationMindReplayMetricRow[]
  sameHerTransitionRows: AlicizationMindReplayMetricRow[]
  sameHerRepairTargetRows: AlicizationMindReplaySameHerRepairTargetRow[]
  projectStateAuditRows: AlicizationMindReplayMetricRow[]
  selfAuthorityRows: AlicizationMindReplayMetricRow[]
}>()

const emit = defineEmits<{
  (event: 'update:packId', value: AlicizationReplayBenchmarkPackId): void
  (event: 'update:sampleLimit', value: number): void
  (event: 'update:selectedDimension', value: string): void
  (event: 'update:selectedTurnId', value: string | null): void
  (event: 'run'): void
  (event: 'runSameHerSessionProof'): void
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
    label: tDiagnosis('packs.final', 'Final'),
    value: 'final-humanlike-memory-v1',
  },
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
  {
    label: tDiagnosis('packs.adversarial', 'Adversarial'),
    value: 'adversarial-humanlike-memory-v2',
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

function projectStateRowHeadline(key: string) {
  if (key === 'project_state_compared_turn_count')
    return 'Living thread coverage'
  if (key === 'project_state_identity_hit_rate')
    return 'Project identity carry'
  if (key === 'project_state_phase_hit_rate')
    return 'Phase 1 route carry'
  if (key === 'project_state_open_loop_hit_rate')
    return 'Unresolved closure carry'
  if (key === 'project_state_continuity_hit_rate')
    return 'Same-her continuity carry'
  return key
}

function selfAuthorityRowHeadline(key: string) {
  if (key === 'self_authority_compared_turn_count')
    return 'Same-her self audit coverage'
  if (key === 'self_authority_summary_rate')
    return 'Explicit self line carry'
  if (key === 'self_authority_closeness_posture_rate')
    return 'Closeness posture carry'
  if (key === 'self_authority_preserved_rate')
    return 'Rewrite preserve carry'
  if (key === 'self_authority_rewrite_applied_rate')
    return 'Final rewrite carry'
  if (key === 'self_authority_fully_carried_rate')
    return 'Same-her self continuity carry'
  return key
}

function projectStateAuditRowHeadline(key: string) {
  if (key === 'project_state_audit_compared_turn_count')
    return 'Same-her project audit coverage'
  if (key === 'project_state_audit_same_her_summary_rate')
    return 'Same-her project brief carry'
  if (key === 'project_state_audit_preserved_rate')
    return 'Project brief preserve carry'
  if (key === 'project_state_audit_rewrite_applied_rate')
    return 'Project brief rewrite carry'
  if (key === 'project_state_audit_fully_carried_rate')
    return 'Same-her project-status continuity carry'
  return key
}

function sameHerSessionRowTone(row: AlicizationMindReplayMetricRow) {
  if (row.key === 'same_her_session_closure_rate')
    return row.value === 1 ? 'closed' : 'open'
  if (row.key.startsWith('same_her_session:'))
    return row.detail.startsWith('closed') ? 'closed' : 'open'
  return 'closed'
}

function updatePackId(value: unknown) {
  if (
    value === 'final-humanlike-memory-v1'
    || value === 'sampled-humanlike-memory-v1'
    || value === 'backlog-humanlike-memory-v1'
    || value === 'default-humanlike-memory-v1'
    || value === 'growth-humanlike-memory-v1'
    || value === 'adversarial-humanlike-memory-v2'
  ) {
    emit('update:packId', value)
  }
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
        <Button
          :label="tDiagnosis('actions.run_same_her_session_proof', 'Run Same-her Proof')"
          icon="i-solar:heart-pulse-bold-duotone"
          size="sm"
          variant="secondary"
          :disabled="loading || !supported"
          @click="emit('runSameHerSessionProof')"
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
        <div
          v-if="projectStateRows.length > 0"
          :class="['mb-4', 'grid', 'gap-2']"
        >
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tDiagnosis('project_state.description', 'Project-state continuity tracks whether Alicization still carries project identity, the Phase 1 local-digital-life route, and unresolved closure work on the same living thread into replayed turns.') }}
          </div>
          <div :class="['text-[11px]', 'font-medium', 'uppercase', 'tracking-[0.18em]', 'text-indigo-600/80', 'dark:text-indigo-300/80']">
            {{ tDiagnosis('project_state.same_living_thread', 'Same living thread: identity, phase, and unresolved closure carry') }}
          </div>
          <div
            v-for="row in projectStateRows"
            :key="`project-state:${row.key}`"
            :class="[
              'rounded-xl', 'border', 'border-solid', 'border-indigo-200/80',
              'bg-indigo-50/60', 'px-3', 'py-3',
              'dark:border-indigo-900/70', 'dark:bg-indigo-950/20',
            ]"
          >
            <div :class="['font-mono', 'text-xs', 'text-indigo-800', 'dark:text-indigo-200']">
              {{ row.key }}
            </div>
            <div :class="['mt-1', 'text-sm', 'font-medium', 'text-indigo-900', 'dark:text-indigo-100']">
              {{ projectStateRowHeadline(row.key) }}
            </div>
            <div :class="['mt-2', 'grid', 'grid-cols-[auto_1fr]', 'gap-2', 'text-[11px]', 'text-indigo-700/80', 'dark:text-indigo-200/80']">
              <div>{{ tDiagnosis('health.patch', 'patch') }}</div>
              <div :class="['font-mono', 'text-indigo-900', 'dark:text-indigo-100']">
                {{ row.value ?? 'n/a' }}
              </div>
            </div>
            <div :class="['mt-2', 'text-[11px]', 'text-indigo-700/80', 'dark:text-indigo-200/80']">
              {{ row.detail }}
            </div>
          </div>
        </div>
        <div
          v-if="sameHerSessionRows.length > 0"
          :class="['mb-4', 'grid', 'gap-2']"
        >
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tDiagnosis('same_her_sessions.description', 'Long-run same-her session proof checks whether memory, initiative or execution callback, emotion, and embodiment close together across multiple real sampled turns in the same desktop session.') }}
          </div>
          <div :class="['text-[11px]', 'font-medium', 'uppercase', 'tracking-[0.18em]', 'text-emerald-600/80', 'dark:text-emerald-300/80']">
            {{ tDiagnosis('same_her_sessions.title', 'Long-run same-her sessions: memory, initiative, emotion, and embodiment close together') }}
          </div>
          <div
            v-if="runtimeSamplingEvidenceRows.length > 0"
            :class="[
              'rounded-xl', 'border', 'border-solid', 'px-3', 'py-3',
              runtimeSamplingEvidenceRows[0]?.detail.includes('status=closed')
                ? 'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20'
                : 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20',
            ]"
          >
            <div :class="['text-[11px]', 'font-medium', 'uppercase', 'tracking-[0.16em]', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ tDiagnosis('same_her_sessions.runtime_evidence', 'Runtime sampling evidence') }}
            </div>
            <div
              v-for="row in runtimeSamplingEvidenceRows"
              :key="`runtime-sampling-evidence:${row.key}`"
              :class="['mt-2', 'grid', 'gap-2']"
            >
              <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                {{ row.key }}
              </div>
              <div :class="['grid', 'grid-cols-[auto_1fr]', 'gap-2', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']">
                <div>{{ tDiagnosis('health.patch', 'patch') }}</div>
                <div :class="['font-mono', 'text-neutral-800', 'dark:text-neutral-100']">
                  {{ row.value ?? 'n/a' }}
                </div>
              </div>
              <div :class="['text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']">
                {{ row.detail }}
              </div>
            </div>
          </div>
          <div
            v-if="sameHerLaneGapRows.length > 0"
            :class="[
              'rounded-xl', 'border', 'border-solid', 'border-amber-200/80',
              'bg-amber-50/70', 'px-3', 'py-3',
              'dark:border-amber-900/70', 'dark:bg-amber-950/20',
            ]"
          >
            <div :class="['text-[11px]', 'font-medium', 'uppercase', 'tracking-[0.16em]', 'text-amber-700', 'dark:text-amber-300']">
              {{ tDiagnosis('same_her_sessions.lane_gaps', 'Open lane gaps') }}
            </div>
            <div :class="['mt-2', 'grid', 'gap-2']">
              <div
                v-for="row in sameHerLaneGapRows"
                :key="`same-her-lane-gap:${row.key}`"
                :class="['text-[11px]', 'text-amber-900', 'dark:text-amber-100']"
              >
                <span :class="['font-mono']">{{ row.key }}</span>
                <span> · {{ row.detail }}</span>
              </div>
            </div>
          </div>
          <div
            v-if="sameHerRepairTargetRows.length > 0"
            :class="['grid', 'gap-2']"
          >
            <div :class="['text-[11px]', 'font-medium', 'uppercase', 'tracking-[0.16em]', 'text-amber-700', 'dark:text-amber-300']">
              {{ tDiagnosis('same_her_sessions.repair_targets', 'Repair targets') }}
            </div>
            <div
              v-for="target in sameHerRepairTargetRows"
              :key="`same-her-repair-target:${target.lane}:${target.turnId}`"
              :class="[
                'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
                'bg-white/70', 'px-3', 'py-3',
                'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
              ]"
            >
              <div :class="['flex', 'items-start', 'justify-between', 'gap-3']">
                <div :class="['min-w-0', 'flex-1']">
                  <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                    {{ target.lane }} · {{ target.turnId }}
                  </div>
                  <div :class="['mt-1', 'font-mono', 'text-[11px]', 'text-neutral-500', 'dark:text-neutral-400']">
                    session={{ target.sessionId }} · missing={{ target.missingLanes.join(' + ') }}
                  </div>
                  <div :class="['mt-2', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']">
                    {{ target.firstCheck }}
                  </div>
                  <ul
                    v-if="target.reasons.length > 0"
                    :class="['mt-2', 'grid', 'gap-1', 'pl-4', 'text-[11px]', 'text-amber-700', 'dark:text-amber-300']"
                  >
                    <li
                      v-for="reason in target.reasons"
                      :key="`same-her-repair-target-reason:${target.lane}:${target.turnId}:${reason}`"
                      :class="['list-disc']"
                    >
                      {{ reason }}
                    </li>
                  </ul>
                </div>
                <Button
                  :label="tDiagnosis('turns.inspect', 'Inspect')"
                  icon="i-solar:eye-bold-duotone"
                  size="sm"
                  variant="secondary"
                  @click="emit('inspectTurn', target.turnId)"
                />
              </div>
            </div>
          </div>
          <div
            v-if="sameHerTransitionRows.length > 0"
            :class="['grid', 'gap-2']"
          >
            <div :class="['text-[11px]', 'font-medium', 'uppercase', 'tracking-[0.16em]', 'text-sky-700', 'dark:text-sky-300']">
              {{ tDiagnosis('same_her_sessions.transitions', 'Cross-turn influence') }}
            </div>
            <div
              v-for="row in sameHerTransitionRows"
              :key="`same-her-transition:${row.key}`"
              :class="[
                'rounded-xl', 'border', 'border-solid', 'px-3', 'py-3',
                row.value === 1
                  ? 'border-sky-200/80 bg-sky-50/70 dark:border-sky-900/70 dark:bg-sky-950/20'
                  : 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20',
              ]"
            >
              <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                {{ row.key }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-[auto_1fr]', 'gap-2', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']">
                <div>{{ tDiagnosis('health.patch', 'patch') }}</div>
                <div :class="['font-mono', 'text-neutral-800', 'dark:text-neutral-100']">
                  {{ row.value ?? 'n/a' }}
                </div>
              </div>
              <div :class="['mt-2', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']">
                {{ row.detail }}
              </div>
            </div>
          </div>
          <div
            v-for="row in sameHerSessionRows"
            :key="`same-her-session:${row.key}`"
            :class="[
              'rounded-xl', 'border', 'border-solid', 'px-3', 'py-3',
              sameHerSessionRowTone(row) === 'open'
                ? 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20'
                : 'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20',
            ]"
          >
            <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
              {{ row.key }}
            </div>
            <div :class="['mt-2', 'grid', 'grid-cols-[auto_1fr]', 'gap-2', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']">
              <div>{{ tDiagnosis('health.patch', 'patch') }}</div>
              <div :class="['font-mono', 'text-neutral-800', 'dark:text-neutral-100']">
                {{ row.value ?? 'n/a' }}
              </div>
            </div>
            <div :class="['mt-2', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ row.detail }}
            </div>
          </div>
        </div>
        <div
          v-if="selfAuthorityRows.length > 0"
          :class="['mb-4', 'grid', 'gap-2']"
        >
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tDiagnosis('self_authority.description', 'Same-her self authority tracks whether Alicization keeps one explicit self line and the matching relational posture visible all the way into rewrite, so the project thread and the speaking self do not drift apart.') }}
          </div>
          <div :class="['text-[11px]', 'font-medium', 'uppercase', 'tracking-[0.18em]', 'text-fuchsia-600/80', 'dark:text-fuchsia-300/80']">
            {{ tDiagnosis('self_authority.same_living_self_thread', 'Same living self thread: explicit self line, relational posture, and rewrite carry') }}
          </div>
          <div
            v-for="row in selfAuthorityRows"
            :key="`self-authority:${row.key}`"
            :class="[
              'rounded-xl', 'border', 'border-solid', 'border-fuchsia-200/80',
              'bg-fuchsia-50/60', 'px-3', 'py-3',
              'dark:border-fuchsia-900/70', 'dark:bg-fuchsia-950/20',
            ]"
          >
            <div :class="['font-mono', 'text-xs', 'text-fuchsia-800', 'dark:text-fuchsia-200']">
              {{ row.key }}
            </div>
            <div :class="['mt-1', 'text-sm', 'font-medium', 'text-fuchsia-900', 'dark:text-fuchsia-100']">
              {{ selfAuthorityRowHeadline(row.key) }}
            </div>
            <div :class="['mt-2', 'grid', 'grid-cols-[auto_1fr]', 'gap-2', 'text-[11px]', 'text-fuchsia-700/80', 'dark:text-fuchsia-200/80']">
              <div>{{ tDiagnosis('health.patch', 'patch') }}</div>
              <div :class="['font-mono', 'text-fuchsia-900', 'dark:text-fuchsia-100']">
                {{ row.value ?? 'n/a' }}
              </div>
            </div>
            <div :class="['mt-2', 'text-[11px]', 'text-fuchsia-700/80', 'dark:text-fuchsia-200/80']">
              {{ row.detail }}
            </div>
          </div>
        </div>
        <div
          v-if="projectStateAuditRows.length > 0"
          :class="['mb-4', 'grid', 'gap-2']"
        >
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tDiagnosis('project_state_audit.description', 'Same-her project-state audit tracks whether Alicization answers project-status questions as one living self who is still carrying project identity, the Phase 1 route, and unfinished closure work through rewrite.') }}
          </div>
          <div :class="['text-[11px]', 'font-medium', 'uppercase', 'tracking-[0.18em]', 'text-violet-600/80', 'dark:text-violet-300/80']">
            {{ tDiagnosis('project_state_audit.same_her_project_thread', 'Same-her project thread: one living self, one project brief, one unfinished closure line') }}
          </div>
          <div
            v-for="row in projectStateAuditRows"
            :key="`project-state-audit:${row.key}`"
            :class="[
              'rounded-xl', 'border', 'border-solid', 'border-violet-200/80',
              'bg-violet-50/60', 'px-3', 'py-3',
              'dark:border-violet-900/70', 'dark:bg-violet-950/20',
            ]"
          >
            <div :class="['font-mono', 'text-xs', 'text-violet-800', 'dark:text-violet-200']">
              {{ row.key }}
            </div>
            <div :class="['mt-1', 'text-sm', 'font-medium', 'text-violet-900', 'dark:text-violet-100']">
              {{ projectStateAuditRowHeadline(row.key) }}
            </div>
            <div :class="['mt-2', 'grid', 'grid-cols-[auto_1fr]', 'gap-2', 'text-[11px]', 'text-violet-700/80', 'dark:text-violet-200/80']">
              <div>{{ tDiagnosis('health.patch', 'patch') }}</div>
              <div :class="['font-mono', 'text-violet-900', 'dark:text-violet-100']">
                {{ row.value ?? 'n/a' }}
              </div>
            </div>
            <div :class="['mt-2', 'text-[11px]', 'text-violet-700/80', 'dark:text-violet-200/80']">
              {{ row.detail }}
            </div>
          </div>
        </div>
        <div
          v-if="presenceQualityRows.length > 0"
          :class="['mb-4', 'grid', 'gap-2']"
        >
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tDiagnosis('presence_quality.description', 'Presence QA tracks quiet companionship coverage, silent-presence nuisance, and continuity mind carry through the replay loop.') }}
          </div>
          <div
            v-for="row in presenceQualityRows"
            :key="`presence:${row.key}`"
            :class="[
              'rounded-xl', 'border', 'border-solid', 'border-cyan-200/80',
              'bg-cyan-50/60', 'px-3', 'py-3',
              'dark:border-cyan-900/70', 'dark:bg-cyan-950/20',
            ]"
          >
            <div :class="['font-mono', 'text-xs', 'text-cyan-800', 'dark:text-cyan-200']">
              {{ row.key }}
            </div>
            <div :class="['mt-2', 'grid', 'grid-cols-3', 'gap-2', 'text-[11px]', 'text-cyan-700/80', 'dark:text-cyan-200/80']">
              <div>
                <div>{{ tDiagnosis('health.before', 'before') }}</div>
                <div :class="['mt-1', 'font-mono', 'text-cyan-900', 'dark:text-cyan-100']">
                  {{ row.before ?? 'n/a' }}
                </div>
              </div>
              <div>
                <div>{{ tDiagnosis('health.after', 'after') }}</div>
                <div :class="['mt-1', 'font-mono', 'text-cyan-900', 'dark:text-cyan-100']">
                  {{ row.after ?? 'n/a' }}
                </div>
              </div>
              <div>
                <div>{{ tDiagnosis('health.patch', 'patch') }}</div>
                <div :class="['mt-1', 'font-mono', 'text-cyan-900', 'dark:text-cyan-100']">
                  {{ row.patch ?? 'n/a' }}
                </div>
              </div>
            </div>
          </div>
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
