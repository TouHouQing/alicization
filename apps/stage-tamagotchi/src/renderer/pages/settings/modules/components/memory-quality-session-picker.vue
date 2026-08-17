<script setup lang="ts">
import type { AlicizationMemoryReplaySessionSummary } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { Button } from '@proj-alicization/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  sessions: AlicizationMemoryReplaySessionSummary[]
  selectedSessionId: string
  mode: 'historical-replay' | 'live-provider'
  loading: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  'update:selectedSessionId': [sessionId: string]
  'update:mode': [mode: 'historical-replay' | 'live-provider']
  'loadMore': []
}>()

const { locale, t } = useI18n()

const selectedSession = computed(() => {
  return props.sessions.find(session => session.sessionId === props.selectedSessionId) ?? null
})

function formatTimestamp(timestamp: number | null) {
  if (!timestamp)
    return '-'
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function formatSessionOption(session: AlicizationMemoryReplaySessionSummary) {
  return `${session.title} · ${t('settings.pages.memory.workbench.quality.session_user_turns', { count: session.userTurnCount })} · ${formatTimestamp(session.activityUpdatedAt)}`
}

function updateSelectedSession(event: Event) {
  emit('update:selectedSessionId', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div :class="['mt-3', 'grid', 'gap-3']">
    <div>
      <div :class="['text-xs', 'font-medium', 'text-neutral-700', 'dark:text-neutral-300']">
        {{ t('settings.pages.memory.workbench.quality.trial_mode') }}
      </div>
      <div :class="['mt-1', 'grid', 'grid-cols-2', 'border', 'border-neutral-300', 'dark:border-neutral-700']">
        <button
          type="button"
          :class="[
            'min-h-9',
            'px-3',
            'text-sm',
            mode === 'historical-replay'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950'
              : 'bg-white text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300',
          ]"
          @click="emit('update:mode', 'historical-replay')"
        >
          {{ t('settings.pages.memory.workbench.quality.historical_replay') }}
        </button>
        <button
          type="button"
          :class="[
            'min-h-9',
            'border-l',
            'border-neutral-300',
            'px-3',
            'text-sm',
            'dark:border-neutral-700',
            mode === 'live-provider'
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950'
              : 'bg-white text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300',
          ]"
          @click="emit('update:mode', 'live-provider')"
        >
          {{ t('settings.pages.memory.workbench.quality.live_provider') }}
        </button>
      </div>
    </div>

    <label :class="['grid', 'gap-1']">
      <span :class="['text-xs', 'font-medium', 'text-neutral-700', 'dark:text-neutral-300']">
        {{ t('settings.pages.memory.workbench.quality.session_title') }}
      </span>
      <select
        :value="selectedSessionId"
        :disabled="loading || sessions.length === 0"
        :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        @change="updateSelectedSession"
      >
        <option v-if="sessions.length === 0" value="">
          {{ t('settings.pages.memory.workbench.quality.empty_sessions') }}
        </option>
        <option v-for="session in sessions" :key="session.sessionId" :value="session.sessionId">
          {{ formatSessionOption(session) }}
        </option>
      </select>
    </label>

    <div v-if="selectedSession" :class="['grid', 'grid-cols-2', 'gap-2', 'text-xs', 'text-neutral-500']">
      <span>{{ t('settings.pages.memory.workbench.quality.session_user_turns', { count: selectedSession.userTurnCount }) }}</span>
      <span>{{ t('settings.pages.memory.workbench.quality.session_assistant_turns', { count: selectedSession.assistantTurnCount }) }}</span>
      <span :class="['col-span-2']">
        {{ t('settings.pages.memory.workbench.quality.session_recent') }}:
        {{ formatTimestamp(selectedSession.activityUpdatedAt) }}
      </span>
    </div>

    <Button
      v-if="hasMore"
      :label="t('settings.pages.memory.workbench.actions.load_more')"
      icon="i-solar:alt-arrow-down-bold-duotone"
      size="sm"
      variant="secondary"
      :loading="loading"
      @click="emit('loadMore')"
    />

    <p
      v-if="mode === 'live-provider'"
      :class="['border', 'border-amber-200', 'bg-amber-50', 'p-2', 'text-xs', 'text-amber-800', 'dark:border-amber-900', 'dark:bg-amber-950/30', 'dark:text-amber-200']"
    >
      {{ t('settings.pages.memory.workbench.quality.live_provider_notice') }}
    </p>
  </div>
</template>
