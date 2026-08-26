<script setup lang="ts">
import type { AlicizationMemoryQualityTrialReportRecordSurface } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { Button } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

defineProps<{
  reports: AlicizationMemoryQualityTrialReportRecordSurface[]
  selectedReportId: string | null
  loading: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  select: [reportId: string]
  loadMore: []
}>()

const { locale, t } = useI18n()

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function formatMode(mode: AlicizationMemoryQualityTrialReportRecordSurface['mode']) {
  return t(mode === 'live-provider'
    ? 'settings.pages.memory.workbench.quality.live_provider'
    : 'settings.pages.memory.workbench.quality.historical_replay')
}
</script>

<template>
  <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
    <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
      <div :class="['text-sm', 'font-semibold']">
        {{ t('settings.pages.memory.workbench.quality.quality_history') }}
      </div>
      <div :class="['text-xs', 'text-neutral-500']">
        {{ reports.length }}
      </div>
    </div>

    <div
      v-if="reports.length === 0"
      :class="['mt-3', 'border', 'border-dashed', 'border-neutral-300', 'p-3', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']"
    >
      {{ t('settings.pages.memory.workbench.quality.empty_quality_history') }}
    </div>

    <div v-else :class="['mt-3', 'flex', 'flex-col', 'gap-2']">
      <button
        v-for="item in reports"
        :key="item.id"
        type="button"
        :class="[
          'border', 'p-3', 'text-left',
          item.id === selectedReportId
            ? 'border-neutral-950 dark:border-neutral-100'
            : 'border-neutral-200 dark:border-neutral-800',
        ]"
        @click="emit('select', item.id)"
      >
        <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
          <span :class="['text-sm', 'font-medium']">
            {{ item.report.passed
              ? t('settings.pages.memory.workbench.states.quality_passed')
              : t('settings.pages.memory.workbench.states.quality_failed') }}
          </span>
          <span :class="['text-xs', 'text-neutral-500']">
            {{ formatTimestamp(item.createdAt) }}
          </span>
        </div>
        <div :class="['mt-2', 'grid', 'gap-1', 'text-xs', 'text-neutral-500']">
          <span>{{ t('settings.pages.memory.workbench.quality.quality_run_mode') }}: {{ formatMode(item.mode) }}</span>
          <span>{{ t('settings.pages.memory.workbench.quality.quality_session') }}: {{ item.sessionId ?? '-' }}</span>
          <span :class="['break-all']">{{ t('settings.pages.memory.workbench.quality.quality_report_hash') }}: {{ item.reportHash }}</span>
        </div>
      </button>
    </div>

    <Button
      v-if="hasMore"
      :label="t('settings.pages.memory.workbench.actions.load_more')"
      icon="i-solar:alt-arrow-down-bold-duotone"
      size="sm"
      variant="secondary"
      :loading="loading"
      class="mt-3"
      @click="emit('loadMore')"
    />
  </section>
</template>
