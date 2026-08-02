<script setup lang="ts">
import type { AlicizationMindTurnEventRecord } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { useAlicizationMindReplayStore } from '@proj-alicization/stage-ui/stores/alicization-mind-replay'
import { Button, Input } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import MindReplayDiagnosisPanel from './components/mind-replay-diagnosis-panel.vue'
import MindReplayHumanlikeMemoryAuditPanel from './components/mind-replay-humanlike-memory-audit-panel.vue'
import MindReplayMemoryTraceCard from './components/mind-replay-memory-trace-card.vue'

const store = useAlicizationMindReplayStore()
const { t, te } = useI18n()
const {
  events,
  traceRecords,
  loading,
  benchmarkLoading,
  benchmarkSupported,
  benchmarkReport,
  selectedBenchmarkPackId,
  selectedBenchmarkSampleLimit,
  selectedDiagnosisDimension,
  selectedDiagnosisTurnId,
  benchmarkDimensionGroups,
  benchmarkHumanRatingRows,
  benchmarkShipGateRows,
  benchmarkRegressionTriageRows,
  benchmarkPresenceQualityRows,
  benchmarkRuntimeSamplingEvidenceRows,
  benchmarkContinuityLaneGapRows,
  benchmarkContinuityRepairTargetRows,
  benchmarkContinuitySessionRows,
  benchmarkContinuityTransitionRows,
  filteredBenchmarkFailingTurns,
  memoryHealthComparisonRows,
  lastError,
  replayCoverage,
  replaySummary,
} = storeToRefs(store)

const i18nPageKey = 'settings.pages.system.sections.section.developer.sections.section.mind-replay.page'

const decisionTraceId = ref('')
const turnId = ref('')
const limitInput = ref('200')

const normalizedLimit = computed(() => {
  const parsed = Number.parseInt(limitInput.value, 10)
  if (!Number.isFinite(parsed))
    return 200
  return Math.max(1, Math.min(500, parsed))
})

const hasEvents = computed(() => events.value.length > 0)
const hasTraceRecords = computed(() => traceRecords.value.length > 0)
const traceCountText = computed(() => {
  const key = `${i18nPageKey}.trace_lab.count`
  if (te(key))
    return String(t(key, { count: traceRecords.value.length }))
  return `${traceRecords.value.length} traces`
})
const summaryNotAvailableText = computed(() => tMind('summary.not_available', 'n/a'))
const optionalLabelDialogueEmitted = computed(() => tMind('optional.dialogue_emitted', 'dialogue-emitted'))
const optionalLabelTakeoverAudit = computed(() => tMind('optional.takeover_audit', 'takeover-audit'))
const optionalLabelMemoryFactsUpserted = computed(() => tMind('optional.memory_facts_upserted', 'memory-facts-upserted'))

const missingRequiredKinds = computed(() => {
  const missing: AlicizationMindTurnEventRecord['kind'][] = []
  if (!replayCoverage.value.hasGovernanceNormalized)
    missing.push('governance-normalized')
  if (!replayCoverage.value.hasPersistenceWritten)
    missing.push('persistence-written')
  return missing
})

const summaryRows = computed(() => [
  {
    label: tMind('summary.decision_trace', 'Decision Trace'),
    value: replaySummary.value.decisionTraceId ?? summaryNotAvailableText.value,
  },
  {
    label: tMind('summary.turn_id', 'Turn ID'),
    value: replaySummary.value.turnId ?? summaryNotAvailableText.value,
  },
  {
    label: tMind('summary.session_id', 'Session ID'),
    value: replaySummary.value.sessionId ?? summaryNotAvailableText.value,
  },
  {
    label: tMind('summary.event_count', 'Event Count'),
    value: String(replaySummary.value.eventCount),
  },
  {
    label: tMind('summary.memory_fact_inputs', 'Memory Fact Inputs'),
    value: String(replaySummary.value.memoryFactInputTotal),
  },
  {
    label: tMind('summary.trigger_set', 'Trigger Set'),
    value: replaySummary.value.memoryExtractionTriggerSet.length > 0
      ? replaySummary.value.memoryExtractionTriggerSet.join(', ')
      : tMind('summary.none', 'none'),
  },
])

function tMind(path: string, fallback: string, params?: Record<string, unknown>) {
  const key = `${i18nPageKey}.${path}`
  if (!te(key))
    return fallback
  return String(t(key, params ?? {}))
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

function payloadText(event: AlicizationMindTurnEventRecord) {
  return JSON.stringify(event.payload ?? {}, null, 2)
}

function eventKindLabel(kind: AlicizationMindTurnEventRecord['kind']) {
  if (kind === 'governance-normalized')
    return tMind('event.kind_labels.governance_normalized', 'governance-normalized')
  if (kind === 'persistence-written')
    return tMind('event.kind_labels.persistence_written', 'persistence-written')
  if (kind === 'dialogue-emitted')
    return tMind('event.kind_labels.dialogue_emitted', 'dialogue-emitted')
  if (kind === 'takeover-audit')
    return tMind('event.kind_labels.takeover_audit', 'takeover-audit')
  if (kind === 'memory-facts-upserted')
    return tMind('event.kind_labels.memory_facts_upserted', 'memory-facts-upserted')
  return kind
}

function eventOriginLabel(origin: AlicizationMindTurnEventRecord['origin']) {
  if (origin === 'user-turn')
    return tMind('event.origin_labels.user_turn', 'user-turn')
  if (origin === 'subconscious-proactive')
    return tMind('event.origin_labels.subconscious_proactive', 'subconscious-proactive')
  return tMind('event.origin_labels.system', 'system')
}

function eventKindClasses(kind: AlicizationMindTurnEventRecord['kind']) {
  if (kind === 'governance-normalized') {
    return [
      'bg-sky-100',
      'text-sky-700',
      'border-sky-300',
      'dark:bg-sky-950/60',
      'dark:text-sky-200',
      'dark:border-sky-800/70',
    ]
  }
  if (kind === 'persistence-written') {
    return [
      'bg-emerald-100',
      'text-emerald-700',
      'border-emerald-300',
      'dark:bg-emerald-950/60',
      'dark:text-emerald-200',
      'dark:border-emerald-800/70',
    ]
  }
  if (kind === 'memory-facts-upserted') {
    return [
      'bg-violet-100',
      'text-violet-700',
      'border-violet-300',
      'dark:bg-violet-950/60',
      'dark:text-violet-200',
      'dark:border-violet-800/70',
    ]
  }
  if (kind === 'takeover-audit') {
    return [
      'bg-amber-100',
      'text-amber-700',
      'border-amber-300',
      'dark:bg-amber-950/60',
      'dark:text-amber-200',
      'dark:border-amber-800/70',
    ]
  }

  return [
    'bg-neutral-100',
    'text-neutral-700',
    'border-neutral-300',
    'dark:bg-neutral-900/70',
    'dark:text-neutral-200',
    'dark:border-neutral-700/70',
  ]
}

async function queryByTrace() {
  const traceId = decisionTraceId.value.trim()
  if (!traceId)
    return
  await store.queryByDecisionTraceId(traceId, normalizedLimit.value)
}

async function queryByTurn() {
  const value = turnId.value.trim()
  if (!value)
    return
  await store.queryByTurnId(value, normalizedLimit.value)
}

async function queryAuto() {
  const traceId = decisionTraceId.value.trim()
  if (traceId) {
    await queryByTrace()
    return
  }

  const value = turnId.value.trim()
  if (value) {
    await queryByTurn()
    return
  }

  store.clearReplay()
}

function clearAll() {
  decisionTraceId.value = ''
  turnId.value = ''
  store.clearReplay()
  store.clearBenchmarkReport()
}

async function runBenchmark() {
  await store.runReplayBenchmark({
    packId: selectedBenchmarkPackId.value,
    sampleLimit: selectedBenchmarkSampleLimit.value,
    persistTelemetry: true,
  })
}

async function runContinuitySessionProof() {
  await store.runContinuitySessionProof()
}

async function inspectBenchmarkTurn(turnId: string | null) {
  await store.drillDownBenchmarkTurn(turnId)
}
</script>

<template>
  <div
    :class="[
      'flex', 'h-full', 'flex-col', 'gap-4', 'overflow-hidden', 'p-4',
    ]"
  >
    <section
      :class="[
        'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
        'bg-neutral-50/80', 'p-4',
        'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
      ]"
    >
      <div :class="['grid', 'gap-3', 'lg:grid-cols-3']">
        <Input
          v-model="decisionTraceId"
          :placeholder="tMind('placeholders.decision_trace', 'mind:xxxxxx:xxxxxxxxxxxx')"
          class="w-full"
        />
        <Input
          v-model="turnId"
          :placeholder="tMind('placeholders.turn_id', 'turn id')"
          class="w-full"
        />
        <Input
          v-model="limitInput"
          :placeholder="tMind('placeholders.limit', 'limit (1-500)')"
          class="w-full"
        />
      </div>

      <div :class="['mt-3', 'flex', 'flex-wrap', 'items-center', 'gap-2']">
        <Button
          :label="tMind('actions.query', 'Query')"
          icon="i-solar:minimalistic-magnifer-bold-duotone"
          size="sm"
          :disabled="loading"
          @click="queryAuto"
        />
        <Button
          :label="tMind('actions.by_trace', 'By Trace')"
          icon="i-solar:compass-bold-duotone"
          size="sm"
          variant="secondary"
          :disabled="loading || !decisionTraceId.trim()"
          @click="queryByTrace"
        />
        <Button
          :label="tMind('actions.by_turn', 'By Turn')"
          icon="i-solar:chat-round-line-bold-duotone"
          size="sm"
          variant="secondary"
          :disabled="loading || !turnId.trim()"
          @click="queryByTurn"
        />
        <Button
          :label="tMind('actions.clear', 'Clear')"
          icon="i-solar:trash-bin-trash-bold-duotone"
          size="sm"
          variant="ghost"
          @click="clearAll"
        />
      </div>

      <div
        v-if="lastError"
        :class="[
          'mt-3', 'rounded-xl', 'border', 'border-solid', 'border-rose-300/80',
          'bg-rose-50', 'px-3', 'py-2', 'text-sm', 'text-rose-700',
          'dark:border-rose-900/80', 'dark:bg-rose-950/40', 'dark:text-rose-200',
        ]"
      >
        {{ lastError }}
      </div>
    </section>

    <MindReplayDiagnosisPanel
      :report="benchmarkReport"
      :loading="benchmarkLoading"
      :supported="benchmarkSupported"
      :pack-id="selectedBenchmarkPackId"
      :sample-limit="selectedBenchmarkSampleLimit"
      :dimension-groups="benchmarkDimensionGroups"
      :human-rating-rows="benchmarkHumanRatingRows"
      :ship-gate-rows="benchmarkShipGateRows"
      :regression-triage-rows="benchmarkRegressionTriageRows"
      :selected-dimension="selectedDiagnosisDimension"
      :failing-turns="filteredBenchmarkFailingTurns"
      :selected-turn-id="selectedDiagnosisTurnId"
      :memory-health-rows="memoryHealthComparisonRows"
      :presence-quality-rows="benchmarkPresenceQualityRows"
      :runtime-sampling-evidence-rows="benchmarkRuntimeSamplingEvidenceRows"
      :continuity-session-rows="benchmarkContinuitySessionRows"
      :continuity-lane-gap-rows="benchmarkContinuityLaneGapRows"
      :continuity-transition-rows="benchmarkContinuityTransitionRows"
      :continuity-repair-target-rows="benchmarkContinuityRepairTargetRows"
      @run="runBenchmark"
      @run-continuity-session-proof="runContinuitySessionProof"
      @update:pack-id="store.setBenchmarkPackId($event)"
      @update:sample-limit="store.setBenchmarkSampleLimit($event)"
      @update:selected-dimension="store.setSelectedDiagnosisDimension($event)"
      @update:selected-turn-id="store.setSelectedDiagnosisTurnId($event)"
      @inspect-turn="inspectBenchmarkTurn"
    />

    <MindReplayHumanlikeMemoryAuditPanel
      :decision-trace-id="decisionTraceId.trim() || null"
      :turn-id="turnId.trim() || null"
      :limit="normalizedLimit"
    />

    <section
      :class="[
        'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
        'bg-white/70', 'p-4',
        'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
      ]"
    >
      <div :class="['mb-3', 'flex', 'flex-wrap', 'items-center', 'gap-2']">
        <span
          :class="[
            'rounded-full', 'border', 'border-solid', 'px-2.5', 'py-1', 'text-xs', 'font-medium',
            replayCoverage.requiredComplete
              ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800/80 dark:text-emerald-200'
              : 'border-amber-300 text-amber-700 dark:border-amber-800/80 dark:text-amber-200',
          ]"
        >
          {{ tMind('required.label', 'required') }}:
          {{ replayCoverage.requiredComplete ? tMind('required.complete', 'complete') : tMind('required.missing', 'missing') }}
        </span>
        <span
          v-for="kind in missingRequiredKinds"
          :key="kind"
          :class="[
            'rounded-full', 'border', 'border-solid',
            'border-amber-300', 'px-2.5', 'py-1', 'text-xs', 'text-amber-700',
            'dark:border-amber-800/80', 'dark:text-amber-200',
          ]"
        >
          {{ tMind('required.missing_kind', 'missing: {kind}', { kind: eventKindLabel(kind) }) }}
        </span>
        <span
          v-if="replayCoverage.hasDialogueEmitted"
          :class="[
            'rounded-full', 'border', 'border-solid',
            'border-sky-300', 'px-2.5', 'py-1', 'text-xs', 'text-sky-700',
            'dark:border-sky-800/80', 'dark:text-sky-200',
          ]"
        >
          {{ optionalLabelDialogueEmitted }}
        </span>
        <span
          v-if="replayCoverage.hasTakeoverAudit"
          :class="[
            'rounded-full', 'border', 'border-solid',
            'border-amber-300', 'px-2.5', 'py-1', 'text-xs', 'text-amber-700',
            'dark:border-amber-800/80', 'dark:text-amber-200',
          ]"
        >
          {{ optionalLabelTakeoverAudit }}
        </span>
        <span
          v-if="replayCoverage.hasMemoryFactsUpserted"
          :class="[
            'rounded-full', 'border', 'border-solid',
            'border-violet-300', 'px-2.5', 'py-1', 'text-xs', 'text-violet-700',
            'dark:border-violet-800/80', 'dark:text-violet-200',
          ]"
        >
          {{ optionalLabelMemoryFactsUpserted }}
        </span>
      </div>

      <div :class="['grid', 'gap-2', 'text-sm', 'md:grid-cols-2']">
        <div
          v-for="row in summaryRows"
          :key="row.label"
          :class="[
            'rounded-lg', 'border', 'border-solid', 'border-neutral-200/80',
            'px-3', 'py-2',
            'dark:border-neutral-800/70',
          ]"
        >
          <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ row.label }}
          </div>
          <div :class="['mt-1', 'break-all', 'font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
            {{ row.value }}
          </div>
        </div>
      </div>
    </section>

    <section
      :class="[
        'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
        'bg-white/70', 'p-4',
        'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
      ]"
    >
      <div :class="['mb-3', 'flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
        <div>
          <div :class="['text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ tMind('trace_lab.title', 'Structured Memory Trace Lab') }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tMind('trace_lab.description', 'Inspect intent, search trace, retrieval bundles, deliberation, surface controls, runtime carry, and final prompt-side authority.') }}
          </div>
        </div>
        <span
          :class="[
            'rounded-full', 'border', 'border-solid',
            'border-cyan-300', 'px-2.5', 'py-1',
            'text-xs', 'font-medium', 'text-cyan-700',
            'dark:border-cyan-800/80', 'dark:text-cyan-200',
          ]"
        >
          {{ traceCountText }}
        </span>
      </div>

      <div
        v-if="loading"
        :class="[
          'rounded-xl', 'border', 'border-dashed', 'border-neutral-300/80',
          'px-4', 'py-6', 'text-sm', 'text-neutral-500',
          'dark:border-neutral-700/70', 'dark:text-neutral-400',
        ]"
      >
        {{ tMind('trace_lab.loading', 'Loading structured memory traces...') }}
      </div>
      <div
        v-else-if="!hasTraceRecords"
        :class="[
          'rounded-xl', 'border', 'border-dashed', 'border-neutral-300/80',
          'px-4', 'py-6', 'text-sm', 'text-neutral-500',
          'dark:border-neutral-700/70', 'dark:text-neutral-400',
        ]"
      >
        {{ tMind('trace_lab.empty', 'No structured memory decision traces for the current query.') }}
      </div>
      <div
        v-else
        :class="['flex', 'flex-col', 'gap-3']"
      >
        <MindReplayMemoryTraceCard
          v-for="(trace, index) in traceRecords"
          :key="trace.decisionTraceId"
          :trace="trace"
          :index="index"
        />
      </div>
    </section>

    <section
      :class="[
        'min-h-0', 'flex-1', 'overflow-y-auto', 'rounded-2xl',
        'border', 'border-solid', 'border-neutral-200/80', 'bg-white/70', 'p-4',
        'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
      ]"
    >
      <div
        v-if="loading"
        :class="[
          'flex', 'h-full', 'items-center', 'justify-center', 'gap-2',
          'text-sm', 'text-neutral-500', 'dark:text-neutral-400',
        ]"
      >
        <div class="i-svg-spinners:ring-resize text-lg" />
        <span>{{ tMind('states.loading', 'Loading replay events...') }}</span>
      </div>
      <div
        v-else-if="!hasEvents"
        :class="[
          'flex', 'h-full', 'items-center', 'justify-center',
          'text-sm', 'text-neutral-500', 'dark:text-neutral-400',
        ]"
      >
        {{ tMind('states.empty', 'No replay events. Query by decisionTraceId or turnId.') }}
      </div>
      <div v-else :class="['flex', 'flex-col', 'gap-3']">
        <article
          v-for="event in events"
          :key="event.id"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'p-3',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/50',
          ]"
        >
          <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
            <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2']">
              <span
                :class="[
                  'rounded-full', 'border', 'border-solid', 'px-2.5', 'py-1',
                  'text-xs', 'font-medium',
                  ...eventKindClasses(event.kind),
                ]"
              >
                {{ eventKindLabel(event.kind) }}
              </span>
              <span
                :class="[
                  'rounded-full', 'border', 'border-solid', 'border-neutral-300/80',
                  'px-2', 'py-0.5', 'text-xs', 'text-neutral-600',
                  'dark:border-neutral-700/70', 'dark:text-neutral-300',
                ]"
              >
                {{ eventOriginLabel(event.origin) }}
              </span>
            </div>
            <span :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
              {{ formatTimestamp(event.createdAt) }}
            </span>
          </div>

          <div :class="['mt-2', 'grid', 'gap-2', 'text-xs', 'md:grid-cols-3']">
            <div :class="['font-mono', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ tMind('event.trace', 'trace') }}: {{ event.decisionTraceId }}
            </div>
            <div :class="['font-mono', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ tMind('event.turn', 'turn') }}: {{ event.turnId ?? summaryNotAvailableText }}
            </div>
            <div :class="['font-mono', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ tMind('event.session', 'session') }}: {{ event.sessionId ?? summaryNotAvailableText }}
            </div>
          </div>

          <details :class="['mt-2']">
            <summary :class="['cursor-pointer', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
              {{ tMind('event.payload', 'payload') }}
            </summary>
            <pre
              :class="[
                'mt-2', 'overflow-auto', 'rounded-lg', 'border', 'border-solid', 'border-neutral-200/80',
                'bg-white/70', 'p-2', 'font-mono', 'text-xs',
                'dark:border-neutral-800/70', 'dark:bg-neutral-950/50',
              ]"
            >{{ payloadText(event) }}</pre>
          </details>
        </article>
      </div>
    </section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.system.sections.section.developer.sections.section.mind-replay.title
  subtitleKey: tamagotchi.settings.devtools.title
</route>
