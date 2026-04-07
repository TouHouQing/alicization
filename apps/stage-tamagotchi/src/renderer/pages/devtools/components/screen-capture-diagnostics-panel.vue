<script setup lang="ts">
import type { ScreenCaptureDiagnosticsSnapshot } from '@proj-alicization/electron-screen-capture'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  diagnostics: ScreenCaptureDiagnosticsSnapshot | null
  error: string | null
  refreshing?: boolean
}>()

const { t } = useI18n()

const diagnosticsUpdatedLabel = computed(() => formatTimestamp(props.diagnostics?.updatedAt ?? null))

function formatTimestamp(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return t('screen-capture.devtools.diagnostics.values.none')

  return new Date(value).toLocaleString()
}

function formatDuration(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return t('screen-capture.devtools.diagnostics.values.none')

  return `${Math.max(0, Math.round(value))} ms`
}

function formatText(value: string | number | null | undefined) {
  if (value == null || value === '')
    return t('screen-capture.devtools.diagnostics.values.none')
  return String(value)
}

function formatTypes(types: string[] | undefined) {
  if (!types?.length)
    return t('screen-capture.devtools.diagnostics.values.none')
  return types.join(', ')
}
</script>

<template>
  <div
    :class="[
      'flex', 'w-full', 'flex-col', 'gap-3',
      'rounded-3xl', 'border', 'border-solid', 'border-neutral-200/70',
      'bg-white/70', 'p-4', 'backdrop-blur-sm',
      'dark:border-neutral-800/60', 'dark:bg-neutral-950/40',
    ]"
  >
    <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
      <div :class="['flex', 'items-center', 'gap-2', 'text-sm', 'text-neutral-700', 'dark:text-neutral-200']">
        <div class="i-solar:monitor-smartphone-line-duotone text-lg" />
        <span class="font-medium">{{ t('screen-capture.devtools.diagnostics.title') }}</span>
      </div>
      <div :class="['flex', 'items-center', 'gap-2', 'text-xs', 'text-neutral-400']">
        <div
          v-if="refreshing"
          class="i-svg-spinners:ring-resize text-sm"
        />
        <span>{{ t('screen-capture.devtools.diagnostics.updated_at') }} {{ diagnosticsUpdatedLabel }}</span>
      </div>
    </div>

    <div
      v-if="error"
      :class="[
        'rounded-2xl', 'border', 'border-solid', 'border-danger-300/60',
        'bg-danger-50/80', 'px-3', 'py-2', 'text-sm', 'text-danger-700',
        'dark:border-danger-600/40', 'dark:bg-danger-950/20', 'dark:text-danger-200',
      ]"
    >
      {{ error }}
    </div>

    <div
      v-else-if="!diagnostics"
      :class="[
        'rounded-2xl', 'border', 'border-dashed', 'border-neutral-200/70',
        'px-4', 'py-6', 'text-sm', 'text-neutral-500',
        'dark:border-neutral-800/40',
      ]"
    >
      {{ t('screen-capture.devtools.diagnostics.loading') }}
    </div>

    <div
      v-else
      :class="[
        'grid', 'gap-3',
        'grid-cols-1', 'xl:grid-cols-3',
      ]"
    >
      <section
        :class="[
          'flex', 'flex-col', 'gap-2',
          'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/70',
          'bg-neutral-50/80', 'p-3',
          'dark:border-neutral-800/50', 'dark:bg-neutral-900/40',
        ]"
      >
        <div :class="['text-sm', 'font-medium', 'text-neutral-700', 'dark:text-neutral-100']">
          {{ t('screen-capture.devtools.diagnostics.sections.renderer') }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.permission') }} {{ formatText(diagnostics.permissionStatus) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.phase') }} {{ formatText(diagnostics.renderer.sessionState?.phase) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.reason') }} {{ formatText(diagnostics.renderer.sessionState?.reason) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.selected_source') }} {{ formatText(diagnostics.renderer.sessionState?.selectedSourceId) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.current_source') }} {{ formatText(diagnostics.renderer.sessionState?.currentSourceId) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.source_preference') }} {{ formatText(diagnostics.renderer.sessionState?.sourcePreference) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.last_used_at') }} {{ formatTimestamp(diagnostics.renderer.sessionState?.lastUsedAt) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500', 'break-all']">
          {{ t('screen-capture.devtools.diagnostics.fields.last_error') }} {{ formatText(diagnostics.renderer.sessionState?.lastError) }}
        </div>
      </section>

      <section
        :class="[
          'flex', 'flex-col', 'gap-2',
          'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/70',
          'bg-neutral-50/80', 'p-3',
          'dark:border-neutral-800/50', 'dark:bg-neutral-900/40',
        ]"
      >
        <div :class="['text-sm', 'font-medium', 'text-neutral-700', 'dark:text-neutral-100']">
          {{ t('screen-capture.devtools.diagnostics.sections.main_probe') }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.window') }} {{ formatText(diagnostics.window.title) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.probe_status') }} {{ diagnostics.main.getSources.inFlight ? t('screen-capture.devtools.diagnostics.values.probing') : t('screen-capture.devtools.diagnostics.values.idle') }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.probe_types') }} {{ formatTypes(diagnostics.main.getSources.options?.types) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.source_count') }} {{ formatText(diagnostics.main.getSources.sourceCount) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.requested_at') }} {{ formatTimestamp(diagnostics.main.getSources.requestedAt) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.completed_at') }} {{ formatTimestamp(diagnostics.main.getSources.completedAt) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.duration') }} {{ formatDuration(diagnostics.main.getSources.durationMs) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500', 'break-all']">
          {{ t('screen-capture.devtools.diagnostics.fields.last_error') }} {{ formatText(diagnostics.main.getSources.error) }}
        </div>
      </section>

      <section
        :class="[
          'flex', 'flex-col', 'gap-2',
          'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/70',
          'bg-neutral-50/80', 'p-3',
          'dark:border-neutral-800/50', 'dark:bg-neutral-900/40',
        ]"
      >
        <div :class="['text-sm', 'font-medium', 'text-neutral-700', 'dark:text-neutral-100']">
          {{ t('screen-capture.devtools.diagnostics.sections.lease') }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.lease_status') }} {{ formatText(diagnostics.main.lease.status) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.lease_handle') }} {{ formatText(diagnostics.main.lease.handle) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.lease_source') }} {{ formatText(diagnostics.main.lease.sourceId) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.lease_owner') }} {{ formatText(diagnostics.main.lease.ownerWindowId) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.lease_types') }} {{ formatTypes(diagnostics.main.lease.options?.types) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.acquired_at') }} {{ formatTimestamp(diagnostics.main.lease.acquiredAt) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.expires_at') }} {{ formatTimestamp(diagnostics.main.lease.expiresAt) }}
        </div>
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('screen-capture.devtools.diagnostics.fields.release_reason') }} {{ formatText(diagnostics.main.lease.releaseReason) }}
        </div>
      </section>
    </div>
  </div>
</template>
