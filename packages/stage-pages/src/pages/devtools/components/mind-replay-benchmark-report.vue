<script setup lang="ts">
import type { AlicizationRunReplayBenchmarkResult } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  report: AlicizationRunReplayBenchmarkResult | null
  loading: boolean
  supported: boolean
}>()

const { t, te } = useI18n()
const i18nPageKey = 'settings.pages.system.sections.section.developer.sections.section.mind-replay.page.benchmark'

function tBenchmark(path: string, fallback: string, params?: Record<string, unknown>) {
  const key = `${i18nPageKey}.${path}`
  if (!te(key))
    return fallback
  return String(t(key, params ?? {}))
}

function formatTimestamp(timestamp: number | null | undefined) {
  if (!Number.isFinite(timestamp))
    return tBenchmark('not_available', 'n/a')
  return new Date(Number(timestamp)).toLocaleString()
}

const gate = computed(() => props.report?.gate ?? null)
const failingKeysText = computed(() => gate.value?.failingKeys.join(', ') ?? '')
</script>

<template>
  <section
    :class="[
      'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
      'bg-white/70', 'p-4',
      'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
    ]"
  >
    <div :class="['mb-3']">
      <div :class="['text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tBenchmark('title', 'Replay Benchmark Gate') }}
      </div>
      <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
        {{ tBenchmark('description', 'Run the default humanlike memory benchmark pack and inspect gate dimensions before claiming large memory/runtime/reply changes are safe.') }}
      </div>
    </div>

    <div
      v-if="!supported"
      :class="[
        'rounded-xl', 'border', 'border-dashed', 'border-neutral-300/80',
        'px-4', 'py-6', 'text-sm', 'text-neutral-500',
        'dark:border-neutral-700/70', 'dark:text-neutral-400',
      ]"
    >
      {{ tBenchmark('unsupported', 'Replay benchmark execution is not available on this bridge.') }}
    </div>
    <div
      v-else-if="loading"
      :class="[
        'rounded-xl', 'border', 'border-dashed', 'border-neutral-300/80',
        'px-4', 'py-6', 'text-sm', 'text-neutral-500',
        'dark:border-neutral-700/70', 'dark:text-neutral-400',
      ]"
    >
      {{ tBenchmark('loading', 'Running replay benchmark gate...') }}
    </div>
    <div
      v-else-if="!report"
      :class="[
        'rounded-xl', 'border', 'border-dashed', 'border-neutral-300/80',
        'px-4', 'py-6', 'text-sm', 'text-neutral-500',
        'dark:border-neutral-700/70', 'dark:text-neutral-400',
      ]"
    >
      {{ tBenchmark('empty', 'No replay benchmark report yet.') }}
    </div>
    <div
      v-else
      :class="['flex', 'flex-col', 'gap-3']"
    >
      <div :class="['grid', 'gap-2', 'md:grid-cols-2', 'xl:grid-cols-4']">
        <div
          :class="[
            'rounded-xl', 'border', 'border-solid', 'px-3', 'py-2',
            gate?.passed
              ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800/70 dark:bg-emerald-950/20'
              : 'border-amber-300 bg-amber-50/70 dark:border-amber-800/70 dark:bg-amber-950/20',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tBenchmark('summary.gate', 'Gate') }}
          </div>
          <div :class="['mt-1', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ gate?.passed ? tBenchmark('summary.pass', 'pass') : tBenchmark('summary.fail', 'fail') }}
          </div>
        </div>

        <div
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'px-3', 'py-2',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tBenchmark('summary.pack', 'Pack') }}
          </div>
          <div :class="['mt-1', 'font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
            {{ report.packId }}
          </div>
        </div>

        <div
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'px-3', 'py-2',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tBenchmark('summary.turn_count', 'Turn Count') }}
          </div>
          <div :class="['mt-1', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ report.turnCount }}
          </div>
        </div>

        <div
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'px-3', 'py-2',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ tBenchmark('summary.ran_at', 'Ran At') }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
            {{ formatTimestamp(report.ranAt) }}
          </div>
        </div>
      </div>

      <div
        v-if="failingKeysText"
        :class="[
          'rounded-xl', 'border', 'border-solid', 'border-amber-300/80',
          'bg-amber-50/70', 'px-3', 'py-3',
          'dark:border-amber-800/70', 'dark:bg-amber-950/20',
        ]"
      >
        <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-amber-700', 'dark:text-amber-300']">
          {{ tBenchmark('summary.failing_keys', 'Failing Keys') }}
        </div>
        <div :class="['mt-1', 'text-xs', 'text-amber-900', 'dark:text-amber-100']">
          {{ failingKeysText }}
        </div>
      </div>

      <div :class="['grid', 'gap-3', 'xl:grid-cols-2']">
        <div
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'px-3', 'py-3',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
          ]"
        >
          <div :class="['text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ tBenchmark('dimensions.title', 'Gate Dimensions') }}
          </div>
          <div :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
            <div
              v-for="dimension in gate?.dimensions ?? []"
              :key="dimension.key"
              :class="[
                'rounded-lg', 'border', 'border-solid', 'px-3', 'py-2',
                dimension.status === 'pass'
                  ? 'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20'
                  : 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20',
              ]"
            >
              <div :class="['flex', 'items-center', 'justify-between', 'gap-2']">
                <div :class="['font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                  {{ dimension.key }}
                </div>
                <div :class="['text-[11px]', 'font-medium', dimension.status === 'pass' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300']">
                  {{ dimension.status }}
                </div>
              </div>
              <div :class="['mt-1', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']">
                {{ tBenchmark('dimensions.ratio', 'passed {passed}/{applicable} ({ratio}), gate {minimum}', {
                  passed: dimension.passedCount,
                  applicable: dimension.applicableCount,
                  ratio: dimension.passedRatio,
                  minimum: dimension.minimumPassingRatio,
                }) }}
              </div>
              <div
                v-if="dimension.failingTurnIds.length > 0"
                :class="['mt-1', 'font-mono', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']"
              >
                {{ dimension.failingTurnIds.join(', ') }}
              </div>
            </div>
          </div>
        </div>

        <div
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'px-3', 'py-3',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
          ]"
        >
          <div :class="['text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ tBenchmark('telemetry.title', 'Telemetry Patch') }}
          </div>
          <div :class="['mt-2', 'grid', 'gap-2']">
            <div
              :class="[
                'rounded-lg', 'border', 'border-solid', 'border-neutral-200/80',
                'bg-white/70', 'px-3', 'py-2',
                'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
              ]"
            >
              <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ tBenchmark('telemetry.persisted', 'Persisted') }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                {{ report.telemetryPersisted ? 'true' : 'false' }}
              </div>
            </div>
            <div
              :class="[
                'rounded-lg', 'border', 'border-solid', 'border-neutral-200/80',
                'bg-white/70', 'px-3', 'py-2',
                'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
              ]"
            >
              <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ tBenchmark('telemetry.template_leakage', 'Template Leakage Fail Count') }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
                {{ report.telemetryPatch.retrievalHealth.templateLeakageFailCount }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <details>
        <summary :class="['cursor-pointer', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ tBenchmark('quality.label', 'Turn-level quality rows') }}
        </summary>
        <div :class="['mt-2', 'overflow-auto']">
          <table :class="['min-w-full', 'text-left', 'text-xs']">
            <thead>
              <tr :class="['border-b', 'border-neutral-200/80', 'dark:border-neutral-800/70']">
                <th :class="['px-2', 'py-1', 'font-medium']">turnId</th>
                <th :class="['px-2', 'py-1', 'font-medium']">era</th>
                <th :class="['px-2', 'py-1', 'font-medium']">procedure</th>
                <th :class="['px-2', 'py-1', 'font-medium']">thread</th>
                <th :class="['px-2', 'py-1', 'font-medium']">coherence</th>
                <th :class="['px-2', 'py-1', 'font-medium']">implicit</th>
                <th :class="['px-2', 'py-1', 'font-medium']">time</th>
                <th :class="['px-2', 'py-1', 'font-medium']">restraint</th>
                <th :class="['px-2', 'py-1', 'font-medium']">repair</th>
                <th :class="['px-2', 'py-1', 'font-medium']">template</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in report.quality"
                :key="row.turnId"
                :class="['border-b', 'border-neutral-200/60', 'dark:border-neutral-800/50']"
              >
                <td :class="['px-2', 'py-1', 'font-mono']">{{ row.turnId }}</td>
                <td :class="['px-2', 'py-1']">{{ row.eraFirst }}</td>
                <td :class="['px-2', 'py-1']">{{ row.procedureCarryQuality }}</td>
                <td :class="['px-2', 'py-1']">{{ row.wrongThreadSuppression }}</td>
                <td :class="['px-2', 'py-1']">{{ row.replyMemoryCoherence }}</td>
                <td :class="['px-2', 'py-1']">{{ row.implicitRecallQuality }}</td>
                <td :class="['px-2', 'py-1']">{{ row.temporalScopeFlexibility }}</td>
                <td :class="['px-2', 'py-1']">{{ row.surfaceRestraint }}</td>
                <td :class="['px-2', 'py-1']">{{ row.relationshipRepairAdaptation }}</td>
                <td :class="['px-2', 'py-1']">{{ row.templateLeakage }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </section>
</template>
